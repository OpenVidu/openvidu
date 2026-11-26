import { generate, type GenerateOptions } from '@openvidu-dashboard/data-generator/generator';
import { LiveWriter } from '@openvidu-dashboard/data-generator/live';
import { restartLive } from '@openvidu-dashboard/data-generator/restart';
import { COLLECTION_NAMES, keepLive } from '@openvidu-dashboard/data-generator/schema';
import type {
	DashboardDeletionJob,
	EgressDocument,
	EventDocument,
	HourlyRollupDocument,
	IngressSessionDocument,
	NodeDocument,
	ParticipantDocument,
	RoomDocument
} from '@openvidu-dashboard/typings';
import { BSON, type Db, type Document, type Filter, MongoClient } from 'mongodb';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { DeletionRecordsStore } from '../../src/deletions/deletion-records.js';
import { DeletionRunner } from '../../src/deletions/deletion-runner.js';
import { silentLogger } from '../support/silent-logger.js';

/**
 * The live writer of the data generator (`LiveWriter`), ticked over generated worlds of scenario S at explicit
 * instants: what it writes, as the OpenVidu writer, aggregator and reconciler would.
 */

const mongoUri = inject('mongoUri');
const SECOND = 1_000;
const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
/** 10:00 UTC two days ago: a day of live writing crosses 14:00, 02:00 and a day close, and stays in the past. */
const T = Math.floor(Date.now() / DAY) * DAY - 2 * DAY + 10 * HOUR;

/** A generated document: every entity is keyed by a string identifier. */
interface Keyed extends Document {
	_id: string;
}

function options(overrides: Partial<GenerateOptions> = {}): GenerateOptions {
	return {
		scenario: 'S',
		days: 2,
		statsMode: 'track',
		seed: 5,
		now: T,
		retentionDays: { events: 7, stats: 7, tracks: 7, entities: 90 },
		timeseries: true,
		rollups: { fiveMinute: true, nodes: true, roomSums: true },
		mediaNodes: true,
		activeWindowMinutes: 60,
		minActiveRooms: 10,
		...overrides
	};
}

/** Generates a world at T and returns its live writer. */
async function live(db: Db, overrides: Partial<GenerateOptions> = {}): Promise<LiveWriter> {
	await db.dropDatabase();
	const summary = await generate(db, options(overrides));

	return new LiveWriter(db, summary.world);
}

/** Ticks every `step` from after T until `until`, running `each` after every tick. */
async function tickUntil(
	writer: LiveWriter,
	from: number,
	until: number,
	step: number,
	each: (at: number) => Promise<void> = () => Promise.resolve()
): Promise<number[]> {
	const elapsed: number[] = [];

	for (let at = from + step; at <= until; at += step) {
		elapsed.push((await writer.tick(at)).elapsedMs);
		await each(at);
	}

	return elapsed;
}

const time = (at: Date | null | undefined) => at?.getTime() ?? Number.NaN;
const docs = <T>(db: Db, name: string, filter: Filter<Keyed> = {}) =>
	db.collection<Keyed>(name).find(filter).toArray() as unknown as Promise<T[]>;
const mean = (values: readonly number[]) => values.reduce((sum, v) => sum + v, 0) / Math.max(1, values.length);

describe.skipIf(mongoUri === '')('live data generator', () => {
	let client: MongoClient;

	beforeAll(async () => {
		client = await MongoClient.connect(mongoUri);
	});

	afterAll(async () => {
		await client.close();
	});

	/** A day of live writing at 60 s ticks over two days of scenario S on media nodes, in track mode. */
	describe('a day of live writing', () => {
		const db = () => client.db('dashboard_test_live_day');
		/** Per minute: rooms `active`, active STANDARD sessions, and rooms holding a `joining` session. */
		const minutes = new Map<number, { rooms: number; sessions: number; joining: number }>();
		/** The rooms seen in progress with stats older than 90 s, from the ticks of the hour after 11:00 UTC. */
		const stale = new Map<string, { staleTicks: number; lastSignal: number; closedAt?: number }>();
		const inProgressAtT: string[] = [];
		const check = T + 5 * HOUR;
		let ahead: Record<string, number> = {};
		let storedAtCheck = new Set<string>();
		let atSixHours: { open: number; sessions: number } = { open: -1, sessions: -1 };
		let elapsed: number[] = [];

		beforeAll(async () => {
			const writer = await live(db());

			inProgressAtT.push(...(await db().collection<Keyed>('rooms').distinct('_id', { status: 'active' })));
			elapsed = await tickUntil(writer, T, T + DAY, MINUTE, async (at) => {
				const rooms = db().collection<Keyed>('rooms');
				const participants = db().collection<Keyed>('participants');

				minutes.set(at, {
					rooms: await rooms.countDocuments({ status: 'active' }),
					sessions: await participants.countDocuments({ status: 'active', kind: 'STANDARD' }),
					joining:
						at <= T + 2 * HOUR ? (await participants.distinct('roomSid', { status: 'joining' })).length : 0
				});

				if (at > T + HOUR && at <= T + 2 * HOUR + 10 * MINUTE) {
					for (const room of await docs<RoomDocument>(db(), 'rooms', {
						$or: [
							{ status: 'active', lastStatsAt: { $lt: new Date(at - 90 * SECOND) } },
							{ _id: { $in: [...stale.keys()] } }
						]
					})) {
						const seen = stale.get(room._id);
						const silent = time(room.lastStatsAt) < at - 90 * SECOND;

						if (room.status === 'active' && (seen !== undefined || at <= T + 2 * HOUR)) {
							stale.set(room._id, {
								staleTicks: (seen?.staleTicks ?? 0) + (silent ? 1 : 0),
								lastSignal: Math.max(time(room.lastStatsAt), time(room.lastEventAt))
							});
						} else if (room.status === 'closed' && seen !== undefined) {
							seen.closedAt ??= at;
						}
					}
				}

				if (at === check) {
					ahead = await datedAfter(db(), check);
					storedAtCheck = new Set(
						await db()
							.collection<Keyed>('events')
							.distinct('_id', { ts: { $lte: new Date(check) } })
					);
				}

				if (at === T + 6 * HOUR) {
					atSixHours = {
						open: await rooms.countDocuments({ _id: { $in: inProgressAtT }, status: 'active' }),
						sessions: await participants.countDocuments({
							roomSid: { $in: inProgressAtT },
							leftAt: { $exists: false }
						})
					};
				}
			});
			const sorted = [...elapsed].sort((a, b) => a - b);
			console.log(
				`live day: ${String(elapsed.length)} ticks, median ${(sorted[Math.floor(sorted.length / 2)] ?? 0).toFixed(0)} ms, ` +
					`max ${(sorted.at(-1) ?? 0).toFixed(0)} ms per tick`
			);
		}, 900_000);

		afterAll(async () => {
			await db().dropDatabase();
		});

		it('Live room lifecycle', async () => {
			const created = await docs<RoomDocument>(db(), 'rooms', {
				createdAt: { $gt: new Date(T), $lte: new Date(T + 3 * HOUR) }
			});
			const closed = created.filter((room) => room.status === 'closed');

			expect(created.length).toBeGreaterThan(20);
			expect(closed.length).toBeGreaterThan(10);

			for (const room of closed) {
				expect([room.durationMs, room.endReason, room.expiresAt?.getTime()], room._id).toEqual([
					time(room.endedAt) - time(room.createdAt),
					expect.any(String),
					time(room.endedAt) + 90 * DAY
				]);

				const events = await docs<EventDocument>(db(), 'events', { roomSid: room._id });
				const at = (type: string, participantSid?: string) =>
					events
						.filter(
							(e) =>
								e.type === type && (participantSid === undefined || e.participantSid === participantSid)
						)
						.map((e) => time(e.ts));

				expect(at('ROOM_CREATED'), room._id).toEqual([time(room.createdAt)]);
				expect(at('ROOM_ENDED'), room._id).toEqual([time(room.endedAt)]);

				for (const p of await docs<ParticipantDocument>(db(), 'participants', { roomSid: room._id })) {
					expect(time(p.joinedAt), p._id).toBeGreaterThanOrEqual(time(room.createdAt));
					expect(time(p.leftAt), p._id).toBeLessThanOrEqual(time(room.endedAt));
					expect(at('PARTICIPANT_JOINED', p._id), p._id).toEqual([time(p.joinedAt)]);

					if (p.status === 'left') {
						expect(at('PARTICIPANT_LEFT', p._id), p._id).toEqual([time(p.leftAt)]);
					}
				}
			}

			expect(
				await db()
					.collection('rooms')
					.aggregate([
						{
							$lookup: {
								from: 'participants',
								let: { sid: '$_id' },
								pipeline: [
									{
										$match: {
											$expr: { $eq: ['$roomSid', '$$sid'] },
											status: 'active',
											kind: 'STANDARD'
										}
									}
								],
								as: 'active'
							}
						},
						{ $match: { $expr: { $ne: ['$participants.active', { $size: '$active' }] } } }
					])
					.toArray()
			).toEqual([]);
		});

		it('Rooms in progress at generation end', async () => {
			expect(inProgressAtT.length).toBeGreaterThanOrEqual(10);
			expect(atSixHours).toEqual({ open: 0, sessions: 0 });

			const late = await db()
				.collection('participants')
				.aggregate([
					{ $match: { roomSid: { $in: inProgressAtT } } },
					{ $lookup: { from: 'rooms', localField: 'roomSid', foreignField: '_id', as: 'room' } },
					{ $unwind: '$room' },
					{ $match: { $expr: { $gte: ['$joinedAt', '$room.endedAt'] } } }
				])
				.toArray();

			expect(late).toEqual([]);
		});

		it('Nothing written ahead of time', async () => {
			expect(ahead).toEqual(Object.fromEntries(Object.keys(ahead).map((key) => [key, 0])));

			// What the day stored dated up to the check and the check had not stored: closures not due yet.
			const missing = (await docs<EventDocument>(db(), 'events', { ts: { $lte: new Date(check) } })).filter(
				(event) => !storedAtCheck.has(event._id)
			);

			expect(missing.filter((event) => !event.synthetic || time(event.ts) < check - 4 * MINUTE)).toEqual([]);
		});

		it('Live room floor: with media nodes', () => {
			const below = [...minutes].filter(([, sample]) => sample.rooms < 10);

			expect(minutes.size).toBe(24 * 60);
			expect(below).toEqual([]);
		});

		it('Live daily curve', () => {
			const at = (from: number, to: number) =>
				[...minutes]
					.filter(([minute]) => new Date(minute).getUTCHours() >= from && new Date(minute).getUTCHours() < to)
					.map(([, sample]) => sample.rooms);

			expect(mean(at(13, 15))).toBeGreaterThan(mean(at(1, 3)));
		});

		it('Live egress and ingress shares', async () => {
			const shares = async (filter: Filter<Keyed>) => {
				const rooms = await docs<RoomDocument>(db(), 'rooms', filter);

				return {
					egress: rooms.filter((room) => room.features.egress).length / rooms.length,
					ingress: rooms.filter((room) => room.features.ingress).length / rooms.length
				};
			};
			const before = await shares({ createdAt: { $lt: new Date(T) } });
			const after = await shares({ createdAt: { $gt: new Date(T) } });

			expect(before.egress).toBeGreaterThanOrEqual(0.25);
			expect(before.egress).toBeLessThanOrEqual(0.35);
			expect(before.ingress).toBeGreaterThanOrEqual(0.01);
			expect(before.ingress).toBeLessThanOrEqual(0.03);
			expect(after.egress).toBeGreaterThanOrEqual(0.45);
			expect(after.egress).toBeLessThanOrEqual(0.55);
			expect(after.ingress).toBeGreaterThanOrEqual(0.07);
			expect(after.ingress).toBeLessThanOrEqual(0.13);
		});

		it('Live rollups match the entities', async () => {
			for (let hour = Math.floor(T / HOUR) * HOUR; hour <= T + 2 * HOUR; hour += HOUR) {
				const range = { $gte: new Date(hour), $lt: new Date(hour + HOUR) };
				const doc = async (scope: string) =>
					(await db()
						.collection<Keyed>('analytics_hourly')
						.findOne({ scope, bucket: new Date(hour) })) as HourlyRollupDocument | null;
				const global = await doc('global');
				const stats = await db()
					.collection('track_stats')
					.aggregate<{ bytes: number }>([
						{ $match: { ts: range, 'meta.kind': 'up' } },
						{ $group: { _id: null, bytes: { $sum: '$bytes' } } }
					])
					.toArray();
				const label = new Date(hour).toISOString();

				expect(global?.rooms?.created, label).toBe(
					await db().collection('rooms').countDocuments({ createdAt: range })
				);
				expect(global?.rooms?.ended, label).toBe(
					await db().collection('rooms').countDocuments({ endedAt: range })
				);
				expect(global?.participants?.joined, label).toBe(
					await db().collection('participants').countDocuments({ kind: 'STANDARD', joinedAt: range })
				);
				expect(Number(global?.bytes?.up), label).toBe(stats[0]?.bytes ?? 0);

				for (const mediaNode of await db()
					.collection<Keyed>('rooms')
					.distinct('mediaNode', { createdAt: range })) {
					const node = await doc(`node:${String(mediaNode)}`);

					expect(node?.rooms?.created, `${label} ${String(mediaNode)}`).toBe(
						await db().collection('rooms').countDocuments({ mediaNode, createdAt: range })
					);
					expect(node?.participants?.joined ?? 0, `${label} ${String(mediaNode)}`).toBe(
						await db()
							.collection('participants')
							.countDocuments({ mediaNode, kind: 'STANDARD', joinedAt: range })
					);
				}
			}
		});

		it('Live active peaks', async () => {
			const buckets = await docs<
				{ bucket: Date; rooms: { peakActive?: number }; participants: { peakActive?: number } } & Keyed
			>(db(), 'analytics_5min', {
				scope: 'global',
				bucket: { $gt: new Date(T), $lte: new Date(T + DAY - 5 * MINUTE) }
			});

			expect(buckets.length).toBe(24 * 12 - 1);

			for (const bucket of buckets) {
				const samples = [...minutes].filter(
					([minute]) => minute >= time(bucket.bucket) && minute < time(bucket.bucket) + 5 * MINUTE
				);

				expect([bucket.rooms.peakActive, bucket.participants.peakActive], bucket._id).toEqual([
					Math.max(...samples.map(([, s]) => s.rooms)),
					Math.max(...samples.map(([, s]) => s.sessions))
				]);
			}
		});

		it('Live unique identities at day close', async () => {
			const day = Math.floor(T / DAY) * DAY;
			const daily = await db()
				.collection<Keyed>('analytics_daily')
				.findOne({ scope: 'global', bucket: new Date(day) });
			const identities = await db()
				.collection('participants')
				.distinct('identity', {
					kind: 'STANDARD',
					joinedAt: { $gte: new Date(day), $lt: new Date(day + DAY) }
				});

			expect(daily?.uniqueIdentities).toBe(identities.length);
		});

		it('Live connecting participants', async () => {
			const sessions = await docs<ParticipantDocument>(db(), 'participants', {
				kind: 'STANDARD',
				joinedAt: { $gt: new Date(T), $lte: new Date(T + 2 * HOUR) }
			});
			const slow = sessions.filter(
				(p) => (p.activeAt === undefined ? time(p.leftAt) : time(p.activeAt)) - time(p.joinedAt) > MINUTE
			);
			const window = [...minutes].filter(([minute]) => minute <= T + 2 * HOUR);

			expect(slow.length).toBeGreaterThan(10);

			for (const p of slow) {
				const connecting = (p.activeAt === undefined ? time(p.leftAt) : time(p.activeAt)) - time(p.joinedAt);

				expect(connecting, p._id).toBeLessThanOrEqual(3 * MINUTE);
				expect(p.status, p._id).toMatch(/^(active|left|aborted)$/);
			}

			expect(window.filter(([, s]) => s.joining > 0).length).toBeGreaterThanOrEqual(window.length / 2);
		});

		it('Live egress and ingress transitions', async () => {
			const liveRooms = await db()
				.collection<Keyed>('rooms')
				.distinct('_id', { createdAt: { $gt: new Date(T), $lte: new Date(T + 2 * HOUR) } });
			const egresses = await docs<EgressDocument>(db(), 'egresses', { roomSid: { $in: liveRooms } });
			const liveNames = await db()
				.collection<Keyed>('rooms')
				.distinct('name', { createdAt: { $gt: new Date(T), $lte: new Date(T + 2 * HOUR) } });
			const sessions = await docs<IngressSessionDocument>(db(), 'ingress_sessions', {
				roomName: { $in: liveNames }
			});
			const at = (e: EgressDocument, status: string) =>
				time(e.statusHistory.find((h) => h.status === status)?.at);

			expect(egresses.length).toBeGreaterThan(5);
			expect(sessions.length).toBeGreaterThan(0);

			for (const egress of egresses) {
				expect(at(egress, 'active') - time(egress.startedAt), egress._id).toBeGreaterThanOrEqual(20 * SECOND);
				expect(at(egress, 'active') - time(egress.startedAt), egress._id).toBeLessThanOrEqual(60 * SECOND);

				if (egress.statusHistory.some((h) => h.status === 'ending')) {
					const ending = time(egress.endedAt ?? egress.updatedAt) - at(egress, 'ending');

					expect(ending, egress._id).toBeGreaterThanOrEqual(20 * SECOND);
					expect(ending, egress._id).toBeLessThanOrEqual(60 * SECOND);
				}
			}

			for (const session of sessions) {
				const started = await db()
					.collection<Keyed>('events')
					.findOne({ type: 'INGRESS_STARTED', ingressSessionId: session._id });
				const buffering =
					(time(started?.ts as Date | undefined) || time(session.endedAt)) - time(session.startedAt);

				expect(buffering, session._id).toBeGreaterThanOrEqual(MINUTE);
				expect(buffering, session._id).toBeLessThanOrEqual(2 * MINUTE);
			}
		});

		it('Live stale room', async () => {
			const reconciled = new Set(
				await db()
					.collection<Keyed>('rooms')
					.distinct('_id', { _id: { $in: [...stale.keys()] }, closedBy: 'reconciler' })
			);
			const closed = [...stale].filter(
				// Two silent minute ticks: stale for at least a minute.
				([id, seen]) => reconciled.has(id) && seen.staleTicks >= 2 && seen.closedAt !== undefined
			);

			expect(closed.length).toBeGreaterThan(0);

			for (const [id, seen] of closed) {
				const room = (await db().collection<Keyed>('rooms').findOne({ _id: id })) as RoomDocument | null;

				expect(time(room?.endedAt), id).toBe(seen.lastSignal);
				// The closure is first seen at the minute tick after it is written, 3 to 4 minutes after the signal.
				expect((seen.closedAt ?? 0) - time(room?.endedAt), id).toBeGreaterThanOrEqual(3 * MINUTE);
				expect((seen.closedAt ?? 0) - time(room?.endedAt), id).toBeLessThanOrEqual(5 * MINUTE);
			}
		});

		it('Live rolling restart', async () => {
			const turn = Math.floor(T / DAY) * DAY + DAY + 2 * HOUR;
			const nodes = await docs<NodeDocument>(db(), 'nodes', {});
			const drained = nodes.find((node) => time(node.drainingAt) === turn);
			const next = nodes.find(
				(node) => node.mediaNode === drained?.mediaNode && time(node.firstSeenAt) === turn + 30 * MINUTE
			);

			expect(time(drained?.stoppedAt)).toBe(turn + 20 * MINUTE);
			expect(next?.stoppedAt === undefined || time(next.stoppedAt) > turn + 40 * MINUTE).toBe(true);

			// The rooms of the node in turn, at 02:00 and at every other turn of the day: whether one is still open at
			// its stop depends on the draws, so the rule is checked over all of them.
			let openAtStops = 0;

			for (const node of nodes.filter(
				(n) => time(n.drainingAt) > T && time(n.drainingAt) + 20 * MINUTE <= T + DAY
			)) {
				const stop = time(node.drainingAt) + 20 * MINUTE;
				const rooms = await docs<RoomDocument>(db(), 'rooms', { nodeId: node._id });
				const atStop = rooms.filter((room) => time(room.endedAt) === stop);

				expect(time(node.stoppedAt), node._id).toBe(stop);
				expect(rooms.filter((room) => time(room.createdAt) >= time(node.drainingAt))).toEqual([]);
				expect(rooms.filter((room) => room.endedAt === undefined || time(room.endedAt) > stop)).toEqual([]);
				expect(atStop.filter((room) => room.endReason !== 'SERVER_SHUTDOWN')).toEqual([]);
				openAtStops += atStop.length;
			}

			expect(openAtStops).toBeGreaterThan(0);
			expect(time(next?.lastSeenAt)).toBeGreaterThanOrEqual(turn + 40 * MINUTE);
		});

		it('Live lost server', async () => {
			const loss = Math.floor(T / DAY) * DAY + 15 * HOUR;
			const nodes = await docs<NodeDocument>(db(), 'nodes', {});
			const lost = nodes.find((node) => time(node.lastSeenAt) === loss && node.stoppedAt === undefined);
			const next = nodes.find(
				(node) => node.mediaNode === lost?.mediaNode && time(node.firstSeenAt) === loss + 6 * HOUR
			);
			const rooms = await docs<RoomDocument>(db(), 'rooms', { nodeId: lost?._id ?? '' });
			const reasons = new Map(
				(
					await docs<EventDocument>(db(), 'events', {
						type: 'ROOM_ENDED',
						synthetic: true,
						roomSid: { $in: rooms.map((room) => room._id) }
					})
				).map((event) => [
					event.roomSid,
					(event.payload as { reconciler?: { reason?: string } }).reconciler?.reason
				])
			);
			// The rooms open at the loss; a room that stopped reporting before it was closed as absent.
			const nodeDead = rooms.filter((room) => reasons.get(room._id) === 'node-dead');

			expect(lost).toBeDefined();
			expect(next).toBeDefined();
			expect(rooms.filter((room) => room.endedAt === undefined || time(room.endedAt) > loss)).toEqual([]);
			expect(nodeDead.length).toBeGreaterThan(0);
			expect(rooms.filter((room) => room.closedBy === 'reconciler' && !reasons.has(room._id))).toEqual([]);

			for (const room of nodeDead) {
				const sessions = await docs<ParticipantDocument>(db(), 'participants', { roomSid: room._id });
				const left = sessions.filter((p) => p.closedBy === 'event').map((p) => time(p.leftAt));

				expect(room.closedBy, room._id).toBe('reconciler');
				// Dated at its last signal: a stats flush, a session leaving or its creation.
				expect(time(room.endedAt), room._id).toBe(
					Math.max(time(room.createdAt), time(room.lastStatsAt) || 0, ...left)
				);
			}
		});

		it('Live servers of the generation instant', async () => {
			const nodes = await docs<NodeDocument>(db(), 'nodes', {});
			const of = (n: number) =>
				nodes
					.filter((node) => node.mediaNode === `media-node-10-0-0-${String(n)}`)
					.sort((a, b) => time(a.firstSeenAt) - time(b.firstSeenAt));
			const draining = of(3).find((node) => time(node.drainingAt) === T - 20 * MINUTE);

			expect(time(draining?.stoppedAt)).toBe(T + 20 * MINUTE);
			expect(of(3).some((node) => time(node.firstSeenAt) === T + 30 * MINUTE)).toBe(true);
			expect(of(4).some((node) => time(node.firstSeenAt) === T + 3 * HOUR)).toBe(true);
			expect(of(7).map((node) => time(node.lastSeenAt))).toEqual([T - 3 * DAY]);
		});

		it('No live stats while muted or after leaving', async () => {
			const toggled = await docs<EventDocument>(db(), 'events', {
				type: 'TRACK_MUTED',
				ts: { $gt: new Date(T) },
				'payload.track.source': 'CAMERA'
			});
			let checked = 0;
			let bounded = 0;

			for (const muted of toggled) {
				const unmuted = await db()
					.collection<Keyed>('events')
					.findOne(
						{ type: 'TRACK_UNMUTED', trackSid: muted.trackSid, ts: { $gt: muted.ts } },
						{ sort: { ts: 1 } }
					);
				const session = (await db()
					.collection<Keyed>('participants')
					.findOne({ _id: muted.participantSid ?? '' })) as ParticipantDocument | null;

				if (unmuted === null || session?.leftAt === undefined) {
					continue;
				}

				const stats = db().collection('track_stats');

				expect(
					await stats.countDocuments({
						'meta.trackSid': muted.trackSid,
						'meta.kind': 'up',
						ts: { $gt: new Date(time(muted.ts) + 30 * SECOND), $lte: unmuted.ts as Date }
					}),
					muted._id
				).toBe(0);

				// The first flush after M, while still muted, carries only what the camera sent before M: upstream bytes
				// are the track's constant bitrate over the time sent, times 0.85 to 1.15, so at most the previous full
				// flush's bytes scaled to the time between that flush and M. Checked where the previous flush covered
				// 30 s of sending; a flush dated after U also carries what was sent after the unmute.
				const up = { 'meta.trackSid': muted.trackSid, 'meta.kind': 'up' };
				const first = await stats.findOne(
					{
						...up,
						ts: {
							$gt: muted.ts,
							$lte: new Date(Math.min(time(muted.ts) + 30 * SECOND, time(unmuted.ts as Date)))
						}
					},
					{ sort: { ts: 1 } }
				);
				const [previous, beforePrevious] = await stats
					.find({ ...up, ts: { $lte: muted.ts } })
					.sort({ ts: -1 })
					.limit(2)
					.toArray();
				const sendingSince = await db()
					.collection<Keyed>('events')
					.findOne(
						{
							type: { $in: ['TRACK_PUBLISHED', 'TRACK_UNMUTED'] },
							trackSid: muted.trackSid,
							ts: { $lt: muted.ts }
						},
						{ sort: { ts: -1 } }
					);
				const at = (doc: Document | undefined | null) => time(doc?.ts as Date | undefined);

				if (
					first !== null &&
					previous !== undefined &&
					beforePrevious !== undefined &&
					at(previous) - at(beforePrevious) === 30 * SECOND &&
					at(sendingSince) <= at(beforePrevious)
				) {
					const sentBeforeMute = (time(muted.ts) - at(previous)) / (30 * SECOND);

					expect(Number(first.bytes), muted._id).toBeLessThanOrEqual(
						Number(previous.bytes) * sentBeforeMute * (1.15 / 0.85) + 1
					);
					bounded += 1;
				}

				expect(
					await stats.countDocuments({ 'meta.participantSid': session._id, ts: { $gt: session.leftAt } }),
					session._id
				).toBe(0);
				expect(time(session.lastStatsAt), session._id).toBeLessThanOrEqual(time(session.leftAt));
				checked += 1;
			}

			expect(checked).toBeGreaterThan(0);
			expect(bounded).toBeGreaterThan(0);
		});
	});

	describe('a day of live writing on a single node', () => {
		const db = () => client.db('dashboard_test_live_single');
		/** 04:00 UTC of the day after T: the single node's restart. */
		const restart = Math.floor(T / DAY) * DAY + DAY + 4 * HOUR;
		const below: number[] = [];

		beforeAll(async () => {
			const writer = await live(db(), {
				mediaNodes: false,
				rollups: { fiveMinute: false, nodes: false, roomSums: false }
			});

			await tickUntil(writer, T, T + DAY, MINUTE, async (at) => {
				if ((await db().collection('rooms').countDocuments({ status: 'active' })) < 10) {
					below.push(at);
				}
			});
		}, 900_000);

		afterAll(async () => {
			await db().dropDatabase();
		});

		it('Live room floor: without media nodes, outside the 10 minutes after the restart', () => {
			// From the drain, no room is created until the new server starts at 04:03, then the floor builds up.
			expect(below.filter((at) => at < restart || at >= restart + 13 * MINUTE)).toEqual([]);
		});

		it('Live single node restart', async () => {
			const nodes = await docs<NodeDocument>(db(), 'nodes', {});
			const drained = nodes.find((node) => time(node.drainingAt) === restart);
			const next = nodes.find((node) => time(node.firstSeenAt) === restart + 3 * MINUTE);
			const rooms = await docs<RoomDocument>(db(), 'rooms', { nodeId: drained?._id ?? '' });

			expect(time(drained?.stoppedAt)).toBe(restart + 2 * MINUTE);
			expect(next).toBeDefined();
			expect(rooms.filter((room) => time(room.createdAt) >= restart)).toEqual([]);
			expect(
				rooms.filter((room) => room.endedAt === undefined || time(room.endedAt) > restart + 2 * MINUTE)
			).toEqual([]);

			const atStop = rooms.filter((room) => time(room.endedAt) === restart + 2 * MINUTE);

			expect(atStop.length).toBeGreaterThan(0);
			expect(atStop.filter((room) => room.endReason !== 'SERVER_SHUTDOWN')).toEqual([]);
			expect(
				await db()
					.collection('rooms')
					.countDocuments({ createdAt: { $gte: new Date(restart), $lt: new Date(restart + 3 * MINUTE) } })
			).toBe(0);
		});
	});

	describe.each(['track', 'participant'] as const)('two minutes of live writing in %s mode', (statsMode) => {
		const db = () => client.db(`dashboard_test_live_stats_${statsMode}`);

		afterAll(async () => {
			await db().dropDatabase();
		});

		it('Live stats per mode', async () => {
			const writer = await live(db(), { statsMode, days: 1 });
			const end = T + 2 * MINUTE;
			const before = new Map(
				(await docs<ParticipantDocument>(db(), 'participants', { status: 'active', kind: 'STANDARD' })).map(
					(p) => [p._id, p]
				)
			);
			const roomsBefore = new Map(
				(await docs<RoomDocument>(db(), 'rooms', { status: 'active' })).map((r) => [r._id, r])
			);

			await tickUntil(writer, T, end, 10 * SECOND);

			const sending = [];

			for (const p of await docs<ParticipantDocument>(db(), 'participants', {
				_id: { $in: [...before.keys()] },
				status: 'active'
			})) {
				const tracks = await docs<Keyed & { source: string; muted: boolean; status: string }>(db(), 'tracks', {
					participantSid: p._id
				});
				const toggled = await db()
					.collection('events')
					.countDocuments({
						participantSid: p._id,
						type: { $in: ['TRACK_MUTED', 'TRACK_UNMUTED'] },
						ts: { $gt: new Date(T - MINUTE) }
					});
				const sends = (source: string) =>
					tracks.some((t) => t.source === source && !t.muted && t.status === 'published');

				if (sends('CAMERA') && sends('MICROPHONE') && toggled === 0) {
					sending.push({
						p,
						tracks: tracks.filter((t) => t.source === 'CAMERA' || t.source === 'MICROPHONE')
					});
				}
			}

			expect(sending.length).toBeGreaterThan(0);
			const [{ p, tracks }] = sending as [(typeof sending)[number]];
			const window = { $gt: new Date(T), $lte: new Date(end) };
			const up = await db()
				.collection('track_stats')
				.find({ 'meta.participantSid': p._id, 'meta.kind': 'up', ts: window })
				.sort({ ts: 1 })
				.toArray();
			const flushes = [...new Set(up.map((doc) => time(doc.ts as Date)))];

			expect(flushes).toHaveLength(4);
			expect(flushes.slice(1).map((ts, i) => ts - (flushes[i] ?? 0))).toEqual([
				30 * SECOND,
				30 * SECOND,
				30 * SECOND
			]);

			if (statsMode === 'track') {
				for (const track of tracks) {
					const own = up.filter((doc) => (doc.meta as { trackSid?: string }).trackSid === track._id);

					expect(own, track._id).toHaveLength(4);
					expect(
						own.every((doc) => typeof doc.mimeType === 'string'),
						track._id
					).toBe(true);
				}
			} else {
				expect(up).toHaveLength(4);
				expect(
					up.filter(
						(doc) =>
							(doc.meta as { trackSid?: string }).trackSid !== undefined || doc.mimeType !== undefined
					)
				).toEqual([]);
			}

			const after = (await db()
				.collection<Keyed>('participants')
				.findOne({ _id: p._id })) as ParticipantDocument | null;
			const room = (await db().collection<Keyed>('rooms').findOne({ _id: p.roomSid })) as RoomDocument | null;
			const roomUp = await db()
				.collection('track_stats')
				.aggregate<{ bytes: number }>([
					{ $match: { 'meta.roomSid': p.roomSid, 'meta.kind': 'up', ts: window } },
					{ $group: { _id: null, bytes: { $sum: '$bytes' } } }
				])
				.toArray();
			const bytes = up.reduce((sum, doc) => sum + Number(doc.bytes), 0);

			// A participant also counts the bytes its signal channel sends each period (300).
			expect(Number(after?.bytes.up) - Number(before.get(p._id)?.bytes.up)).toBe(bytes + 4 * 300);
			expect(Number(room?.bytes.up) - Number(roomsBefore.get(p.roomSid)?.bytes.up)).toBe(roomUp[0]?.bytes);
			expect(time(after?.lastStatsAt)).toBe(flushes.at(-1));
			expect(time(room?.lastStatsAt)).toBeGreaterThanOrEqual(flushes.at(-1) ?? 0);
		}, 300_000);
	});

	describe('an hour of live writing at two tick intervals', () => {
		const dbs = [10 * SECOND, MINUTE].map(
			(step) => [step, () => client.db(`dashboard_test_live_cadence_${String(step)}`)] as const
		);

		afterAll(async () => {
			for (const [, db] of dbs) {
				await db().dropDatabase();
			}
		});

		it('Same live data at any tick cadence', async () => {
			for (const [step, db] of dbs) {
				await tickUntil(await live(db(), { days: 1, seed: 9 }), T, T + HOUR, step);
			}

			const [[, ten], [, sixty]] = dbs as unknown as [[number, () => Db], [number, () => Db]];

			for (const name of [
				'rooms',
				'participants',
				'tracks',
				'track_subscriptions',
				'egresses',
				'ingresses',
				'ingress_sessions',
				'events',
				'nodes',
				'analytics_5min',
				'analytics_hourly',
				'analytics_daily'
			]) {
				expect(await canonical(sixty(), name), name).toEqual(await canonical(ten(), name));
			}

			expect(await canonical(sixty(), 'track_stats')).toEqual(await canonical(ten(), 'track_stats'));
		}, 600_000);
	});

	describe('live writing after a Total deletion', () => {
		const db = () => client.db('dashboard_test_live_deletion');

		afterAll(async () => {
			await db().dropDatabase();
		});

		it('Live writing after a deletion', async () => {
			const writer = await live(db(), { days: 1, seed: 13 });
			const cutoff = T + 67 * MINUTE;

			await tickUntil(writer, T, cutoff, MINUTE);

			const inProgress = await db().collection<Keyed>('rooms').distinct('_id', { status: 'active' });
			const keptSessions = await db()
				.collection<Keyed>('participants')
				.distinct('_id', { roomSid: { $in: inProgress } });
			const keptEvents = await db()
				.collection<Keyed>('events')
				.countDocuments({ roomSid: { $in: inProgress } });
			const removable = await db()
				.collection<Keyed>('rooms')
				.distinct('_id', { status: 'closed', endedAt: { $lt: new Date(cutoff - 5 * MINUTE) } });
			const job = totalDeletion(new Date(cutoff));

			// The deletion API records the job before the runner takes it.
			await db()
				.collection<Keyed>('schema_meta')
				.updateOne({ _id: 'dashboard' }, { $set: { deletion: job } }, { upsert: true });
			const removableSessions = await db()
				.collection<Keyed>('participants')
				.distinct('_id', { roomSid: { $in: removable } });

			await new DeletionRunner({
				db: db(),
				records: new DeletionRecordsStore(db()),
				logger: silentLogger(),
				sleep: () => Promise.resolve()
			}).run(job);

			// The rollups up to the cutoff go too, the current hour's included.
			for (const name of ['analytics_5min', 'analytics_hourly', 'analytics_daily']) {
				await db()
					.collection(name)
					.deleteMany({ bucket: { $lte: new Date(cutoff) } });
			}

			expect(removable.length).toBeGreaterThan(0);
			expect(
				await db()
					.collection<Keyed>('rooms')
					.countDocuments({ _id: { $in: removable } })
			).toBe(0);

			const end = cutoff + 30 * MINUTE;
			await tickUntil(writer, cutoff, end, MINUTE);

			expect(
				await db()
					.collection<Keyed>('rooms')
					.countDocuments({ _id: { $in: removable } })
			).toBe(0);
			expect(
				await db()
					.collection<Keyed>('participants')
					.countDocuments({ _id: { $in: removableSessions } })
			).toBe(0);
			expect(
				await db()
					.collection<Keyed>('participants')
					.countDocuments({ _id: { $in: keptSessions } })
			).toBe(keptSessions.length);
			expect(
				await db()
					.collection<Keyed>('events')
					.countDocuments({ roomSid: { $in: inProgress } })
			).toBeGreaterThanOrEqual(keptEvents);

			const hour = Math.floor(cutoff / HOUR) * HOUR;
			const current = (await db()
				.collection<Keyed>('analytics_hourly')
				.findOne({ scope: 'global', bucket: new Date(hour) })) as HourlyRollupDocument | null;
			const since = { $gt: new Date(cutoff), $lte: new Date(end) };

			expect(current?.rooms?.created).toBe(await db().collection('rooms').countDocuments({ createdAt: since }));
			expect(current?.participants?.joined).toBe(
				await db().collection('participants').countDocuments({ kind: 'STANDARD', joinedAt: since })
			);
		}, 600_000);
	});
	describe.each(['live', 'frozen'] as const)('a live start on kept data after a %s run', (previous) => {
		const db = () => client.db(`dashboard_test_live_restart_${previous}`);

		afterAll(async () => {
			await db().dropDatabase();
		});

		it(`Live restart after a stop: after a ${previous} run`, async () => {
			const generation = options({ days: 1, seed: 21, minActiveRooms: 20 });

			await db().dropDatabase();
			const summary = await generate(db(), generation);
			const heartbeat = previous === 'live' ? T + 2 * HOUR : T + 30 * MINUTE;

			if (previous === 'live') {
				await tickUntil(new LiveWriter(db(), summary.world), T, heartbeat, MINUTE);
			} else {
				for (let at = T + 15 * SECOND; at <= heartbeat; at += 15 * SECOND) {
					await keepLive(db(), new Date(at));
				}
			}

			const restart = heartbeat + 2 * HOUR;
			const rooms = await db().collection<Keyed>('rooms').distinct('_id', { status: 'active' });
			const sessions = await db()
				.collection<Keyed>('participants')
				.distinct('_id', { leftAt: { $exists: false } });
			const egresses = await db()
				.collection<Keyed>('egresses')
				.distinct('_id', { status: { $in: ['starting', 'active', 'ending'] } });
			const alive = await docs<NodeDocument>(db(), 'nodes', {
				stoppedAt: { $exists: false },
				lastSeenAt: { $gte: new Date(heartbeat - MINUTE) }
			});

			expect([rooms.length > 0, sessions.length > 0, egresses.length > 0, alive.length > 0]).toEqual([
				true,
				true,
				true,
				true
			]);

			const writer = new LiveWriter(db(), await restartLive(db(), generation, restart));
			let inProgress = 0;

			await tickUntil(writer, restart, restart + 10 * MINUTE, MINUTE, async (at) => {
				if (at === restart + 10 * MINUTE) {
					inProgress = await db().collection('rooms').countDocuments({ status: 'active' });
				}
			});

			for (const room of await docs<RoomDocument>(db(), 'rooms', { _id: { $in: rooms } })) {
				const ended = (await db()
					.collection<Keyed>('events')
					.findOne({ type: 'ROOM_ENDED', roomSid: room._id })) as EventDocument | null;

				expect([room.closedBy, time(room.endedAt) <= heartbeat], room._id).toEqual(['reconciler', true]);
				expect(
					[ended?.synthetic, (ended?.payload as { reconciler?: { reason?: string } }).reconciler?.reason],
					room._id
				).toEqual([true, 'node-dead']);
			}

			for (const p of await docs<ParticipantDocument>(db(), 'participants', { _id: { $in: sessions } })) {
				expect([p.closedBy, time(p.leftAt) <= heartbeat], p._id).toEqual(['reconciler', true]);
			}

			for (const e of await docs<EgressDocument>(db(), 'egresses', { _id: { $in: egresses } })) {
				expect([e.status, e.closedBy, time(e.endedAt) <= heartbeat], e._id).toEqual([
					'failed',
					'reconciler',
					true
				]);
			}

			const nodes = await docs<NodeDocument>(db(), 'nodes', {});

			for (const node of alive) {
				const now = nodes.find((n) => n._id === node._id);

				expect([time(now?.lastSeenAt), now?.stoppedAt], node._id).toEqual([time(node.lastSeenAt), undefined]);
				expect(
					nodes.some((n) => n.mediaNode === node.mediaNode && time(n.firstSeenAt) === restart),
					node._id
				).toBe(true);
			}

			const gap = await datedAfter(db(), heartbeat, restart);

			expect(gap).toEqual(Object.fromEntries(Object.keys(gap).map((key) => [key, 0])));
			expect(inProgress).toBeGreaterThanOrEqual(10);
		}, 600_000);
	});

	describe('the rooms in progress at the generation instant', () => {
		const db = () => client.db('dashboard_test_live_generated_rooms');

		afterAll(async () => {
			await db().dropDatabase();
		});

		it('Generated rooms in progress stretched 30 minutes at most', async () => {
			await db().dropDatabase();
			const summary = await generate(db(), options({ days: 1 }));
			const drawn = new Map(summary.world.lives.flatMap((life) => [...(life.bundle.drawnLengths ?? [])]));
			const inProgress = await docs<RoomDocument>(db(), 'rooms', { status: 'active' });

			expect(inProgress.length).toBeGreaterThanOrEqual(10);

			await tickUntil(new LiveWriter(db(), summary.world), T, T + 100 * MINUTE, MINUTE);

			for (const before of inProgress) {
				const room = (await db()
					.collection<Keyed>('rooms')
					.findOne({ _id: before._id })) as RoomDocument | null;
				const sessions = await docs<ParticipantDocument>(db(), 'participants', { roomSid: before._id });

				for (const p of sessions.filter((s) => s.kind === 'STANDARD' && time(s.joinedAt) < T)) {
					const length = drawn.get(p._id);
					const bound = Math.max(T + 30 * MINUTE, time(p.joinedAt) + (length ?? Number.NaN));

					expect([length !== undefined, time(p.leftAt) <= bound], p._id).toEqual([true, true]);
				}

				const lastLeave = Math.max(
					T,
					...sessions.filter((s) => s.kind !== 'EGRESS').map((s) => time(s.leftAt))
				);

				expect(
					[room?.status, time(room?.endedAt) <= lastLeave + (before.config?.departureTimeoutMs ?? 0)],
					before.name
				).toEqual(['closed', true]);
			}
		}, 600_000);
	});

	describe('a live start on kept data at the edges of the server timeline', () => {
		const db = () => client.db('dashboard_test_live_restart_edges');
		const ingressCounters = async (bucket: number) => {
			const hourly = (await db()
				.collection<Keyed>('analytics_hourly')
				.findOne({ scope: 'global', bucket: new Date(bucket) })) as HourlyRollupDocument | null;
			const ingress = hourly?.ingress as
				{ sessionsStarted?: number; sessionsEnded?: number; byInputType?: Record<string, number> } | undefined;

			return {
				started: ingress?.sessionsStarted ?? 0,
				ended: ingress?.sessionsEnded ?? 0,
				byInputType: ingress?.byInputType ?? {}
			};
		};

		afterAll(async () => {
			await db().dropDatabase();
		});

		it('Live restart after a stop: a media node lost before the stop returns at a restart over 6 hours after its loss', async () => {
			const generation = options({ days: 1, seed: 21 });
			const day = Math.floor(T / DAY) * DAY;
			const loss = day + 15 * HOUR;
			const heartbeat = day + 18 * HOUR;
			const restart = day + DAY + 8 * HOUR;

			await db().dropDatabase();
			const summary = await generate(db(), generation);
			await tickUntil(new LiveWriter(db(), summary.world), T, heartbeat, MINUTE);

			const lost = await docs<NodeDocument>(db(), 'nodes', {
				lastSeenAt: new Date(loss),
				stoppedAt: { $exists: false }
			});

			expect(lost).toHaveLength(1);

			const writer = new LiveWriter(db(), await restartLive(db(), generation, restart));
			await tickUntil(writer, restart, restart + 10 * MINUTE, MINUTE);
			const label = { mediaNode: lost[0]?.mediaNode };
			const returned = await docs<NodeDocument>(db(), 'nodes', { ...label, firstSeenAt: new Date(restart) });

			expect(returned).toHaveLength(1);
			expect(time(returned[0]?.lastSeenAt)).toBeGreaterThanOrEqual(restart + 9 * MINUTE);
			expect(returned[0]?.stoppedAt).toBeUndefined();
		}, 600_000);

		it('Live restart after a stop: a restart in the minute of the last heartbeat starts after it, and a session closed while buffering is not counted as started', async () => {
			const generation = options({ days: 1, seed: 21 });
			const heartbeat = T + 30 * MINUTE + 40 * SECOND;

			await db().dropDatabase();
			await generate(db(), generation);
			await keepLive(db(), new Date(heartbeat));

			// An ingress session of a room in progress that started buffering 30 s before the heartbeat.
			const room = (await db().collection<Keyed>('rooms').findOne({ status: 'active' })) as RoomDocument | null;
			const model = await db().collection<Keyed>('ingress_sessions').findOne({});

			if (room === null || model === null) {
				throw new Error('No room in progress or no ingress session to copy');
			}

			const {
				endedAt: _e,
				durationMs: _d,
				error: _r,
				closedBy: _c,
				roomSid: _s,
				video: _v,
				audio: _a,
				...rest
			} = model;
			const buffering = {
				...rest,
				_id: 'IS_buffering01',
				roomName: room.name,
				status: 'buffering',
				startedAt: new Date(heartbeat - 30 * SECOND),
				expiresAt: null
			};
			await db().collection<Keyed>('ingress_sessions').insertOne(buffering);

			const bucket = Math.floor(heartbeat / HOUR) * HOUR;
			const before = await ingressCounters(bucket);
			const open = await db()
				.collection<Keyed>('ingress_sessions')
				.distinct('_id', { status: { $in: ['buffering', 'publishing'] } });
			const rooms = await db().collection<Keyed>('rooms').distinct('_id');
			const world = await restartLive(db(), generation, Math.floor(heartbeat / MINUTE) * MINUTE);
			const writer = new LiveWriter(db(), world);
			await tickUntil(writer, world.start, world.start + 10 * MINUTE, MINUTE);

			expect(world.start).toBe(T + 31 * MINUTE);

			const fresh = await docs<NodeDocument>(db(), 'nodes', { firstSeenAt: { $gt: new Date(T) } });

			expect(fresh.length).toBeGreaterThan(0);
			expect(fresh.every((node) => time(node.firstSeenAt) > heartbeat)).toBe(true);
			expect(
				await db()
					.collection<Keyed>('rooms')
					.countDocuments({ _id: { $nin: rooms }, createdAt: { $lte: new Date(heartbeat) } })
			).toBe(0);

			const closed = (await db()
				.collection<Keyed>('ingress_sessions')
				.findOne({ _id: 'IS_buffering01' })) as IngressSessionDocument | null;
			const after = await ingressCounters(bucket);

			expect([closed?.status, closed?.closedBy]).toEqual(['error', 'reconciler']);
			expect(
				await db()
					.collection<Keyed>('events')
					.countDocuments({ type: 'INGRESS_STARTED', ingressSessionId: 'IS_buffering01' })
			).toBe(0);
			const endedInBucket = await db()
				.collection<Keyed>('ingress_sessions')
				.countDocuments({
					_id: { $in: open },
					endedAt: { $gte: new Date(bucket), $lt: new Date(bucket + HOUR) }
				});

			expect(endedInBucket).toBeGreaterThan(0);
			expect(after).toEqual({ ...before, ended: before.ended + endedInBucket });
		}, 600_000);

		it('Live restart after a stop: a single node stopped in its daily restart has a new server at the restart', async () => {
			const fourOClock = Math.floor(Date.now() / DAY) * DAY - DAY + 4 * HOUR;
			const generation = options({
				days: 1,
				seed: 21,
				mediaNodes: false,
				rollups: { fiveMinute: true, nodes: false, roomSums: true },
				now: fourOClock - MINUTE
			});
			const restart = fourOClock + 2 * HOUR;

			await db().dropDatabase();
			const summary = await generate(db(), generation);
			await tickUntil(
				new LiveWriter(db(), summary.world),
				fourOClock - MINUTE,
				fourOClock + 150 * SECOND,
				30 * SECOND
			);

			// Every server was stopped or lost by then: the last one stopped at 04:02.
			expect(
				await db()
					.collection('nodes')
					.countDocuments({ stoppedAt: { $exists: false }, lastSeenAt: { $gte: new Date(fourOClock) } })
			).toBe(0);
			expect(
				await db()
					.collection('nodes')
					.countDocuments({ stoppedAt: new Date(fourOClock + 2 * MINUTE) })
			).toBe(1);

			const writer = new LiveWriter(db(), await restartLive(db(), generation, restart));
			await tickUntil(writer, restart, restart + 15 * MINUTE, MINUTE);
			const started = await docs<NodeDocument>(db(), 'nodes', { firstSeenAt: new Date(restart) });

			expect(started).toHaveLength(1);
			expect(time(started[0]?.lastSeenAt)).toBeGreaterThanOrEqual(restart + 14 * MINUTE);
			expect(
				await db().collection('rooms').countDocuments({ status: 'active', nodeId: started[0]?._id })
			).toBeGreaterThan(0);
		}, 600_000);
	});

	describe('the frozen mode', () => {
		const db = () => client.db('dashboard_test_live_frozen');
		/** Every collection, with the heartbeats and stats times aside. */
		const snapshot = async (): Promise<Record<string, string[]>> =>
			Object.fromEntries(
				await Promise.all(
					COLLECTION_NAMES.map(async (name): Promise<[string, string[]]> => [
						name,
						await canonical(db(), name, ['lastSeenAt', 'lastStatsAt'])
					])
				)
			);

		afterAll(async () => {
			await db().dropDatabase();
		});

		it('Frozen keep-alive writes nothing new', async () => {
			await db().dropDatabase();
			await generate(db(), options({ days: 1 }));

			const before = await snapshot();
			const alive = await db()
				.collection<Keyed>('nodes')
				.distinct('_id', { stoppedAt: { $exists: false }, lastSeenAt: { $gte: new Date(T - MINUTE) } });
			const active = await db().collection<Keyed>('rooms').distinct('_id', { status: 'active' });
			const end = T + 10 * MINUTE;

			for (let at = T + 15 * SECOND; at <= end; at += 15 * SECOND) {
				await keepLive(db(), new Date(at));
			}

			expect(await snapshot()).toEqual(before);
			expect(
				await db()
					.collection<Keyed>('nodes')
					.distinct('_id', { lastSeenAt: new Date(end) })
			).toEqual(expect.arrayContaining(alive));
			expect(
				await db()
					.collection('nodes')
					.countDocuments({ lastSeenAt: new Date(end) })
			).toBe(alive.length);
			expect(
				await db()
					.collection<Keyed>('rooms')
					.distinct('_id', { lastStatsAt: new Date(end) })
			).toEqual(expect.arrayContaining(active));
			expect(
				await db()
					.collection('rooms')
					.countDocuments({ lastStatsAt: new Date(end) })
			).toBe(active.length);
			expect(
				await db()
					.collection('participants')
					.countDocuments({ lastStatsAt: new Date(end), status: { $ne: 'active' } })
			).toBe(0);
		}, 300_000);

		it('Frozen restart on kept live data', async () => {
			await db().dropDatabase();
			const summary = await generate(db(), options({ days: 1 }));
			const stop = T + 2 * HOUR + 5 * MINUTE;

			await tickUntil(new LiveWriter(db(), summary.world), T, stop, MINUTE);

			const draining = await docs<NodeDocument>(db(), 'nodes', {
				drainingAt: { $exists: true },
				stoppedAt: { $exists: false },
				lastSeenAt: new Date(stop)
			});
			const active = await db().collection<Keyed>('rooms').distinct('_id', { status: 'active' });
			const before = await snapshot();
			const restart = stop + 2 * HOUR;
			const end = restart + 5 * MINUTE;

			expect(draining.length).toBeGreaterThan(0);
			expect(active.length).toBeGreaterThan(0);

			for (let at = restart; at <= end; at += 15 * SECOND) {
				await keepLive(db(), new Date(at));
			}

			expect(await snapshot()).toEqual(before);
			expect(await db().collection<Keyed>('rooms').distinct('_id', { status: 'active' })).toEqual(active);

			for (const node of draining) {
				const now = (await db().collection<Keyed>('nodes').findOne({ _id: node._id })) as NodeDocument | null;

				expect([time(now?.drainingAt), now?.stoppedAt, time(now?.lastSeenAt)], node._id).toEqual([
					time(node.drainingAt),
					undefined,
					end
				]);
			}
		}, 300_000);
	});
});

/** A Total deletion with its cutoff, as the deletion API starts it. */
function totalDeletion(cutoff: Date): DashboardDeletionJob {
	return {
		id: 'live-deletion',
		class: 'all',
		includeLegacy: false,
		state: 'running',
		cutoff,
		startedAt: cutoff,
		heartbeatAt: cutoff,
		instance: 'live-test',
		currentClass: 'events',
		collection: { index: 1, total: 1 },
		deleted: 0,
		deletedBy: {},
		requestId: 'live-test'
	};
}

/** The documents dated after `at` (and up to `until`), by collection and field: none should exist. */
async function datedAfter(db: Db, at: number, until?: number): Promise<Record<string, number>> {
	const fields: Record<string, string[]> = {
		rooms: ['createdAt', 'endedAt', 'lastStatsAt', 'lastEventAt'],
		participants: ['joinedAt', 'activeAt', 'leftAt', 'lastStatsAt'],
		tracks: ['publishedAt', 'unpublishedAt'],
		track_subscriptions: ['subscribedAt', 'unsubscribedAt'],
		egresses: ['startedAt', 'updatedAt', 'endedAt'],
		ingress_sessions: ['startedAt', 'endedAt'],
		events: ['ts'],
		track_stats: ['ts']
	};
	const counts: Record<string, number> = {};

	for (const [name, list] of Object.entries(fields)) {
		for (const field of list) {
			counts[`${name}.${field}`] = await db.collection(name).countDocuments({
				[field]: { $gt: new Date(at), ...(until === undefined ? {} : { $lt: new Date(until) }) }
			});
		}
	}

	return counts;
}

/**
 * A collection's documents in a comparable form: sorted, with their fields in key order (a field added by a later
 * update comes last in the stored document) and numbers rounded past the doubles' last digits.
 */
async function canonical(db: Db, name: string, omit: readonly string[] = []): Promise<string[]> {
	const round = (_key: string, value: unknown) => {
		if (typeof value === 'number' && !Number.isInteger(value)) {
			return Math.round(value * 1e6) / 1e6;
		}

		return typeof value === 'object' && value !== null && !Array.isArray(value)
			? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
			: value;
	};

	return (await db.collection(name).find().toArray())
		.map((doc) => {
			const { _id, ...rest } = doc;
			const keyed = Object.fromEntries(
				Object.entries(name === 'track_stats' ? rest : doc).filter(([key]) => !omit.includes(key))
			);

			return JSON.stringify(BSON.EJSON.serialize(keyed, { relaxed: true }), round);
		})
		.sort();
}
