import { CONTRACT_SCHEMAS } from '@openvidu-dashboard/data-generator/contract';
import { generate } from '@openvidu-dashboard/data-generator/generator';
import { COLLECTION_NAMES, keepLive } from '@openvidu-dashboard/data-generator/schema';
import {
	AGENT_NAME_ATTRIBUTE,
	type EgressDocument,
	type EventDocument,
	type HourlyRollupDocument,
	type IngressDocument,
	type IngressSessionDocument,
	LegacyCollection,
	type NodeDocument,
	OPENVIDU_AGENT_ATTRIBUTE,
	type ParticipantDocument,
	type RoomDocument,
	RoomTopology
} from '@openvidu-dashboard/typings';
import { type Db, type Document, type Filter, MongoClient } from 'mongodb';
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest';

/**
 * The data generator writes what the writer would: every document of every collection, `track_stats` included (a
 * time-series collection takes no validator), satisfies the contract validator in both stats modes.
 */

const mongoUri = inject('mongoUri');
const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

/** A generated document: every entity is keyed by a string identifier. */
interface Keyed extends Document {
	_id: string;
}

describe.skipIf(mongoUri === '')('data generator', () => {
	let client: MongoClient;

	beforeAll(async () => {
		client = await MongoClient.connect(mongoUri);
	});

	afterAll(async () => {
		await client.close();
	});

	describe.each(['participant', 'track'] as const)('generated in %s mode', (statsMode) => {
		let db: Db;

		beforeAll(async () => {
			db = client.db(`dashboard_test_generator_${statsMode}`);
			await db.dropDatabase();
			await generate(db, {
				scenario: 'S',
				days: 2,
				statsMode,
				seed: 7,
				retentionDays: { events: 7, stats: 7, tracks: 7, entities: 90 },
				timeseries: true,
				rollups: { fiveMinute: true, nodes: true, roomSums: true },
				mediaNodes: true,
				activeWindowMinutes: 60,
				minActiveRooms: 10
			});
		}, 600_000);

		afterAll(async () => {
			await db.dropDatabase();
		});

		it('writes documents of the contract', async () => {
			const invalid: Record<string, number> = {};

			for (const name of COLLECTION_NAMES) {
				const collection = db.collection(name);

				expect(await collection.estimatedDocumentCount(), name).toBeGreaterThan(0);
				invalid[name] = await collection.countDocuments({ $nor: [{ $jsonSchema: CONTRACT_SCHEMAS[name] }] });
			}

			expect(invalid).toEqual(Object.fromEntries(COLLECTION_NAMES.map((name) => [name, 0])));

			// The validators check types, not ranges.
			const generatedAt = new Date();
			const outOfRange: Record<string, Filter<Document>> = {
				rooms: { $or: [{ 'bytes.up': { $lt: 0 } }, { 'bytes.down': { $lt: 0 } }, { durationMs: { $lt: 0 } }] },
				participants: {
					$or: [
						{ 'bytes.up': { $lt: 0 } },
						{ 'bytes.down': { $lt: 0 } },
						{ durationMs: { $lt: 0 } },
						{ joinedAt: { $gt: generatedAt } }
					]
				},
				tracks: {
					$or: [
						{ 'publishStats.bytes': { $lt: 0 } },
						{ durationMs: { $lt: 0 } },
						{ publishedAt: { $gt: generatedAt } }
					]
				},
				track_subscriptions: {
					$or: [
						{ 'subscribeStats.bytes': { $lt: 0 } },
						{ durationMs: { $lt: 0 } },
						{ subscribedAt: { $gt: generatedAt } }
					]
				}
			};
			const outOfRangeCounts: Record<string, number> = {};

			for (const [name, filter] of Object.entries(outOfRange)) {
				outOfRangeCounts[name] = await db.collection(name).countDocuments(filter);
			}

			expect(outOfRangeCounts).toEqual(Object.fromEntries(Object.keys(outOfRange).map((name) => [name, 0])));

			// Each ingress session that published has the INGRESS participant the ingress sessions API links to.
			for (const session of await db
				.collection<IngressSessionDocument>('ingress_sessions')
				.find({ roomSid: { $exists: true } })
				.toArray()) {
				const joined = await db.collection('participants').countDocuments({
					roomSid: session.roomSid,
					identityLower: session.participantIdentity?.toLowerCase(),
					kind: 'INGRESS',
					joinedAt: {
						$gte: new Date(session.startedAt.getTime() - 60_000),
						$lte: session.endedAt ?? new Date()
					}
				});

				expect(joined, session._id).toBeGreaterThan(0);
			}

			// Each egress with a room that went active has the EGRESS session the egress detail resolves: identity =
			// egress id.
			for (const egress of await db
				.collection<EgressDocument>('egresses')
				.find({ roomSid: { $exists: true }, 'statusHistory.status': 'active' })
				.toArray()) {
				const joined = await db.collection('participants').countDocuments({
					roomSid: egress.roomSid,
					identityLower: egress._id.toLowerCase(),
					kind: 'EGRESS'
				});

				expect(joined, egress._id).toBe(1);
			}

			// Display names differ from the identities, as clients set them.
			expect(
				await db.collection('participants').countDocuments({
					kind: 'STANDARD',
					$expr: { $eq: ['$name', '$identity'] }
				})
			).toBe(0);

			// Participant counters count STANDARD sessions only, as the writer does.
			expect(
				await db.collection('rooms').countDocuments({
					$expr: { $ne: ['$participants.sessions', { $ifNull: ['$participants.byKind.STANDARD', 0] }] }
				})
			).toBe(0);

			// Every ingress session started is counted once by input type.
			let started = 0;
			let byInputType = 0;

			for (const hourly of await db
				.collection<HourlyRollupDocument>('analytics_hourly')
				.find({ scope: 'global' })
				.toArray()) {
				started += hourly.ingress?.sessionsStarted ?? 0;
				byInputType += Object.values(hourly.ingress?.byInputType ?? {}).reduce((sum, count) => sum + count, 0);
			}

			expect(started).toBeGreaterThan(0);
			expect(byInputType).toBe(started);

			// Every rollup carries the peaks of the aggregator, and every hour of the range has a global document.
			for (const collection of ['analytics_5min', 'analytics_hourly', 'analytics_daily']) {
				expect(
					await db.collection(collection).countDocuments({
						$or: [
							{ 'rooms.peakActive': { $exists: false } },
							{ 'participants.peakActive': { $exists: false } },
							{ scope: 'global', 'egress.peakActive': { $exists: false } }
						]
					}),
					collection
				).toBe(0);
			}

			for (const collection of ['analytics_hourly', 'analytics_daily']) {
				expect(
					await db
						.collection(collection)
						.countDocuments({ scope: 'global', 'ingress.peakActive': { $exists: false } }),
					collection
				).toBe(0);
			}

			expect(await db.collection('analytics_5min').countDocuments({ ingress: { $exists: true } })).toBe(0);

			const hours = await db.collection('analytics_hourly').distinct('bucket', { scope: 'global' });

			expect(hours).toHaveLength(2 * 24 + 1);
			expect(
				await db
					.collection('analytics_hourly')
					.countDocuments({ scope: 'global', 'rooms.peakActive': { $gt: 0 } })
			).toBeGreaterThan(0);
		});

		it('Lower-cased search fields', async () => {
			// The search fields are the lower-cased names.
			expect(
				await db
					.collection('ingresses')
					.countDocuments({ $expr: { $ne: ['$nameLower', { $toLower: '$name' }] } })
			).toBe(0);
			expect(
				await db.collection('egresses').countDocuments({
					roomName: { $exists: true },
					$expr: { $ne: ['$roomNameLower', { $toLower: '$roomName' }] }
				})
			).toBe(0);
		});

		it('Generated event payload', async () => {
			// Event payloads follow the writer's protojson shape: snake_case names nested by entity.
			const camelCase = new Set<string>();

			for (const event of await db.collection<EventDocument>('events').find({}).toArray()) {
				for (const key of payloadKeys(event.payload)) {
					if (!/^[a-z0-9_]+$/.test(key)) {
						camelCase.add(`${event.type}.${key}`);
					}
				}
			}

			expect([...camelCase]).toEqual([]);
			const joined = (await db.collection<EventDocument>('events').findOne({ type: 'PARTICIPANT_JOINED' }))
				?.payload as
				| {
						room?: { sid?: unknown };
						participant?: { sid?: unknown; identity?: unknown };
						client_info?: { sdk?: unknown };
				  }
				| undefined;

			expect(
				[
					joined?.room?.sid,
					joined?.participant?.sid,
					joined?.participant?.identity,
					joined?.client_info?.sdk
				].map((value) => typeof value)
			).toEqual(['string', 'string', 'string', 'string']);
		});
	});

	/** Two days of scenario S on seven media nodes with the node scopes, read by the checks of the server timeline. */
	describe('generated multi-node deployment', () => {
		const dbName = 'dashboard_test_generator_media_nodes';
		const db = () => client.db(dbName);
		let generated: NodeDocument[] = [];
		let end = 0;

		beforeAll(async () => {
			await db().dropDatabase();
			await generate(db(), {
				scenario: 'S',
				days: 2,
				statsMode: 'participant',
				seed: 3,
				retentionDays: { events: 7, stats: 7, tracks: 7, entities: 90 },
				timeseries: true,
				rollups: { fiveMinute: true, nodes: true, roomSums: true },
				mediaNodes: true
			});
			generated = await db().collection<NodeDocument>('nodes').find().sort({ firstSeenAt: 1, _id: 1 }).toArray();
			end = Math.max(...generated.map((node) => node.lastSeenAt.getTime()));
		}, 600_000);

		afterAll(async () => {
			await db().dropDatabase();
		});

		/** The servers of media node `-<n>`, oldest first. */
		const servers = (n: number) => generated.filter((node) => node.mediaNode === `media-node-10-0-0-${String(n)}`);

		it('Generated media node servers', async () => {
			const { windowStart, middle, quarter } = rangeOf(end, 2);
			const times = (node: NodeDocument | undefined) => ({
				engine: node?.rtcEngine,
				firstSeenAt: node?.firstSeenAt.getTime(),
				lastSeenAt: node?.lastSeenAt.getTime(),
				drainingAt: node?.drainingAt?.getTime(),
				stoppedAt: node?.stoppedAt?.getTime()
			});
			const before = (node: NodeDocument | undefined) => node?.firstSeenAt.getTime() ?? 0;

			expect(generated).toHaveLength(10);
			expect(new Set(generated.map((node) => node.mediaNode))).toEqual(
				new Set([1, 2, 3, 4, 5, 6, 7].map((n) => `media-node-10-0-0-${String(n)}`))
			);
			expect(
				generated.every((node) => node.ip === node.mediaNode?.replace('media-node-', '').replaceAll('-', '.'))
			).toBe(true);

			for (const node of generated.filter((server) => server.firstSeenAt.getTime() < windowStart)) {
				expect(node.firstSeenAt.getTime(), node._id).toBeLessThan(node.lastSeenAt.getTime());
			}

			const [a1, b1, c1] = servers(1);
			const [a2, b2] = servers(2);

			expect(servers(1)).toHaveLength(3);
			expect(before(a1)).toBeLessThan(windowStart);
			expect(times(a1)).toEqual({
				engine: 'pion',
				firstSeenAt: before(a1),
				lastSeenAt: middle,
				drainingAt: middle - 10 * MINUTE,
				stoppedAt: middle
			});
			expect(times(b1)).toEqual({
				engine: 'mediasoup',
				firstSeenAt: middle + MINUTE,
				lastSeenAt: end - 5 * HOUR - 2 * MINUTE,
				drainingAt: undefined,
				stoppedAt: undefined
			});
			expect(times(c1)).toEqual({
				engine: 'mediasoup',
				firstSeenAt: end - 5 * HOUR,
				lastSeenAt: end,
				drainingAt: undefined,
				stoppedAt: undefined
			});
			expect(servers(2)).toHaveLength(2);
			expect(before(a2)).toBeLessThan(windowStart);
			expect(times(a2)).toEqual({
				engine: 'mediasoup',
				firstSeenAt: before(a2),
				lastSeenAt: middle + 30 * MINUTE,
				drainingAt: middle + 20 * MINUTE,
				stoppedAt: middle + 30 * MINUTE
			});
			expect(times(b2)).toEqual({
				engine: 'mediasoup',
				firstSeenAt: middle + 31 * MINUTE,
				lastSeenAt: end,
				drainingAt: undefined,
				stoppedAt: undefined
			});

			const single = (n: number) => {
				expect(servers(n), `-${String(n)}`).toHaveLength(1);

				return servers(n)[0];
			};

			expect(times(single(3))).toEqual({
				engine: 'pion',
				firstSeenAt: before(single(3)),
				lastSeenAt: end,
				drainingAt: end - 20 * MINUTE,
				stoppedAt: undefined
			});
			expect(times(single(4))).toEqual({
				engine: 'pion',
				firstSeenAt: before(single(4)),
				lastSeenAt: end - 3 * HOUR,
				drainingAt: end - 3 * HOUR - 10 * MINUTE,
				stoppedAt: undefined
			});
			expect(times(single(5))).toEqual({
				engine: 'pion',
				firstSeenAt: before(single(5)),
				lastSeenAt: end - 30 * MINUTE,
				drainingAt: end - 40 * MINUTE,
				stoppedAt: end - 30 * MINUTE
			});
			expect(times(single(6))).toEqual({
				engine: 'pion',
				firstSeenAt: quarter,
				lastSeenAt: end,
				drainingAt: undefined,
				stoppedAt: undefined
			});
			expect(times(single(7))).toEqual({
				engine: 'pion',
				firstSeenAt: before(single(7)),
				lastSeenAt: end - 3 * DAY,
				drainingAt: undefined,
				stoppedAt: undefined
			});

			for (const n of [3, 4, 5, 7]) {
				expect(before(single(n)), `-${String(n)}`).toBeLessThan(windowStart);
			}

			const scopes = (await db().collection('analytics_hourly').distinct('scope')) as string[];
			const hostingLabels = (await db()
				.collection('rooms')
				.distinct('mediaNode', { createdAt: { $gte: new Date(windowStart) } })) as string[];

			expect(scopes.filter((scope) => scope !== 'global').sort()).toEqual(
				hostingLabels.map((label) => `node:${label}`).sort()
			);
			expect(
				await db()
					.collection('nodes')
					.countDocuments({ $nor: [{ $jsonSchema: CONTRACT_SCHEMAS.nodes }] })
			).toBe(0);
		});

		it('Rooms of generated servers', async () => {
			const byId = new Map(generated.map((node) => [node._id, node]));
			const rooms = await db().collection<RoomDocument>('rooms').find().toArray();
			const roomsById = new Map(rooms.map((room) => [room._id, room]));
			const misplaced: string[] = [];

			for (const room of rooms) {
				const node = byId.get(room.nodeId);
				const created = room.createdAt.getTime();
				const serverEnd =
					node?.stoppedAt ?? (node?.lastSeenAt.getTime() === end ? undefined : node?.lastSeenAt);

				if (
					node === undefined ||
					room.mediaNode !== node.mediaNode ||
					created < node.firstSeenAt.getTime() ||
					created >= Math.min(node.drainingAt?.getTime() ?? end, node.lastSeenAt.getTime()) ||
					(serverEnd !== undefined && (room.endedAt ?? new Date(end)) > serverEnd)
				) {
					misplaced.push(room._id);
				}
			}

			expect(misplaced).toEqual([]);

			for (const session of await db().collection<ParticipantDocument>('participants').find().toArray()) {
				const room = roomsById.get(session.roomSid);
				const node = byId.get(session.nodeId);

				if (room === undefined) {
					continue;
				}

				expect(
					[session.nodeId, session.mediaNode, node?.mediaNode, session.joinedAt >= (node?.firstSeenAt ?? 0)],
					session._id
				).toEqual([room.nodeId, room.mediaNode, room.mediaNode, true]);
			}

			// A room still open at a stop ends with the shutdown; one open at a silence, closed by the reconciler.
			for (const node of generated.filter((server) => server.lastSeenAt.getTime() < end)) {
				const atEnd = rooms.filter(
					(room) => room.nodeId === node._id && room.endedAt?.getTime() === node.lastSeenAt.getTime()
				);

				for (const room of atEnd) {
					expect([room.endReason, room.closedBy], room._id).toEqual(
						node.stoppedAt === undefined ? ['RECONCILED', 'reconciler'] : ['SERVER_SHUTDOWN', 'event']
					);
				}
			}

			for (const lost of [servers(1)[1], servers(4)[0]]) {
				const reconciled = rooms.filter((room) => room.nodeId === lost?._id && room.closedBy === 'reconciler');
				const reasons = await db()
					.collection<EventDocument>('events')
					.find({ type: 'ROOM_ENDED', synthetic: true, roomSid: { $in: reconciled.map((room) => room._id) } })
					.toArray();

				expect(reconciled.length, lost?._id).toBeGreaterThan(0);
				expect(
					reasons.some(
						(event) =>
							(event.payload as { reconciler?: { reason?: string } }).reconciler?.reason === 'node-dead'
					),
					lost?._id
				).toBe(true);
			}

			for (const node of generated) {
				expect(node.rooms, node._id).toEqual({
					hosted: rooms.filter((room) => room.nodeId === node._id).length,
					reconciled: rooms.filter((room) => room.nodeId === node._id && room.closedBy === 'reconciler')
						.length
				});
			}
		});

		it('keeps egress and ingress in the global scope with media nodes', async () => {
			for (const collection of ['analytics_5min', 'analytics_hourly', 'analytics_daily']) {
				expect(
					await db()
						.collection(collection)
						.countDocuments({
							scope: { $ne: 'global' },
							$or: [{ egress: { $exists: true } }, { ingress: { $exists: true } }]
						}),
					collection
				).toBe(0);
			}

			for (const collection of ['egresses', 'ingress_sessions']) {
				expect(
					await db()
						.collection(collection)
						.countDocuments({ mediaNode: { $exists: true } }),
					collection
				).toBe(0);
			}

			const globalEgress = await db()
				.collection<HourlyRollupDocument>('analytics_hourly')
				.find({ scope: 'global' })
				.toArray();

			expect(globalEgress.reduce((sum, hour) => sum + (hour.egress?.started ?? 0), 0)).toBe(
				await db()
					.collection('egresses')
					.countDocuments({ startedAt: { $gte: globalEgress[0]?.bucket ?? new Date(0) } })
			);
		});

		it('Generated node heartbeats', async () => {
			const intervals = async () =>
				(await db().collection<NodeDocument>('nodes').find().sort({ firstSeenAt: 1, _id: 1 }).toArray()).map(
					(node) => [node._id, node.batchIntervalMs]
				);
			const expected = generated.map((node) => [
				node._id,
				node.mediaNode === 'media-node-10-0-0-6' ? 30_000 : 10_000
			]);

			expect(await intervals()).toEqual(expected);
			await keepLive(db(), new Date(end + 5 * MINUTE));
			await keepLive(db(), new Date(end + 5 * MINUTE + 15_000));
			expect(await intervals()).toEqual(expected);
		});

		it('Keep-alive of generated servers', async () => {
			const later = new Date(end + 10 * MINUTE);

			await keepLive(db(), later);
			await expectKeptAlive(db(), generated, later, [
				servers(1)[2]?._id,
				servers(2)[1]?._id,
				servers(3)[0]?._id,
				servers(6)[0]?._id
			]);
		});
	});

	/** Two days of scenario S on a single node, read by the checks of its servers. */
	describe('generated single node', () => {
		const dbName = 'dashboard_test_generator_single_node';
		const db = () => client.db(dbName);
		let generated: NodeDocument[] = [];
		let end = 0;

		beforeAll(async () => {
			await db().dropDatabase();
			await generate(db(), {
				scenario: 'S',
				days: 2,
				statsMode: 'participant',
				seed: 3,
				retentionDays: { events: 7, stats: 7, tracks: 7, entities: 90 },
				timeseries: true,
				rollups: { fiveMinute: true, nodes: false, roomSums: true }
			});
			generated = await db().collection<NodeDocument>('nodes').find().sort({ firstSeenAt: 1, _id: 1 }).toArray();
			end = Math.max(...generated.map((node) => node.lastSeenAt.getTime()));
		}, 600_000);

		afterAll(async () => {
			await db().dropDatabase();
		});

		it('Generated single node', async () => {
			const { windowStart, middle, quarter } = rangeOf(end, 2);
			const [first, second, third] = generated;

			expect(generated).toHaveLength(3);
			expect(
				generated.map((node) => [node.mediaNode, node.ip, node.rtcEngine, node.mediaStats, node.serverVersion])
			).toEqual([
				[undefined, undefined, 'pion', true, '3.10.0'],
				[undefined, undefined, 'pion', true, '3.10.1'],
				[undefined, undefined, 'pion', true, '3.10.1']
			]);
			expect(first?.firstSeenAt.getTime()).toBeLessThan(windowStart);
			expect([first?.drainingAt?.getTime(), first?.stoppedAt?.getTime(), first?.lastSeenAt.getTime()]).toEqual([
				middle - 2 * MINUTE,
				middle,
				middle
			]);
			expect([second?.firstSeenAt.getTime(), second?.lastSeenAt.getTime(), second?.stoppedAt]).toEqual([
				middle + MINUTE,
				quarter,
				undefined
			]);
			expect([third?.firstSeenAt.getTime(), third?.lastSeenAt.getTime(), third?.stoppedAt]).toEqual([
				quarter + 2 * MINUTE,
				end,
				undefined
			]);

			for (const collection of ['analytics_5min', 'analytics_hourly', 'analytics_daily']) {
				expect(await db().collection(collection).distinct('scope'), collection).toEqual(['global']);
			}

			expect(
				await db()
					.collection('nodes')
					.countDocuments({ $nor: [{ $jsonSchema: CONTRACT_SCHEMAS.nodes }] })
			).toBe(0);
		});

		it('Generated single node: no room in the restart gaps', async () => {
			const [first, second, third] = generated;
			const rooms = db().collection('rooms');

			expect(
				await rooms.countDocuments({ createdAt: { $gte: first?.drainingAt, $lt: second?.firstSeenAt } })
			).toBe(0);
			expect(
				await rooms.countDocuments({ createdAt: { $gte: second?.lastSeenAt, $lt: third?.firstSeenAt } })
			).toBe(0);
			expect(await rooms.countDocuments({ createdAt: { $lt: second?.firstSeenAt } })).toBeGreaterThan(0);
		});

		it('Rooms of generated servers: the single node', async () => {
			const [first, second, third] = generated;
			const rooms = await db().collection<RoomDocument>('rooms').find().toArray();
			const host = (room: RoomDocument) =>
				room.createdAt < (first?.drainingAt ?? 0)
					? first
					: room.createdAt < (second?.lastSeenAt ?? 0)
						? second
						: third;

			expect(rooms.filter((room) => room.nodeId !== host(room)?._id).map((room) => room._id)).toEqual([]);
			expect(rooms.filter((room) => room.status === 'active' && room.nodeId !== third?._id)).toEqual([]);
			expect(
				rooms.filter(
					(room) =>
						room.nodeId !== third?._id && (room.endedAt ?? new Date(end)) > (host(room)?.lastSeenAt ?? 0)
				)
			).toEqual([]);

			const lost = rooms.filter((room) => room.nodeId === second?._id && room.closedBy === 'reconciler');
			const deadReasons = await db()
				.collection<EventDocument>('events')
				.countDocuments({
					type: 'ROOM_ENDED',
					synthetic: true,
					roomSid: { $in: lost.map((room) => room._id) },
					'payload.reconciler.reason': 'node-dead'
				});

			expect(deadReasons).toBeGreaterThan(0);

			for (const node of generated) {
				expect(node.rooms, node._id).toEqual({
					hosted: rooms.filter((room) => room.nodeId === node._id).length,
					reconciled: rooms.filter((room) => room.nodeId === node._id && room.closedBy === 'reconciler')
						.length
				});
			}
		});

		it('Generated node heartbeats: without media nodes', async () => {
			const intervals = async () =>
				(await db().collection<NodeDocument>('nodes').find().toArray()).map((node) => node.batchIntervalMs);

			expect(await intervals()).toEqual([10_000, 10_000, 10_000]);
			await keepLive(db(), new Date(end + 5 * MINUTE));
			expect(await intervals()).toEqual([10_000, 10_000, 10_000]);
		});

		it('Keep-alive of generated servers: the single node', async () => {
			const later = new Date(end + 10 * MINUTE);

			await keepLive(db(), later);
			await expectKeptAlive(db(), generated, later, [generated[2]?._id]);
		});
	});

	it('Generated server versions: the single node runs mediasoup with the option', async () => {
		const db = client.db('dashboard_test_generator_single_node_media_stats');
		await db.dropDatabase();

		try {
			await generate(db, {
				scenario: 'S',
				days: 1,
				statsMode: 'track',
				seed: 7,
				retentionDays: { events: 7, stats: 7, tracks: 7, entities: 90 },
				timeseries: true,
				nodesWithoutMediaStats: 1
			});

			const nodes = await db.collection<NodeDocument>('nodes').find().sort({ firstSeenAt: 1, _id: 1 }).toArray();

			expect(nodes.map((node) => [node.rtcEngine, node.mediaStats, node.serverVersion])).toEqual([
				['mediasoup', false, '3.10.0'],
				['mediasoup', true, '3.10.1'],
				['mediasoup', true, '3.10.1']
			]);
			expect(await db.collection('schema_meta').findOne({ _id: 'schema' as never })).toMatchObject({
				writerVersion: '3.10.1'
			});
		} finally {
			await db.dropDatabase();
		}
	});

	it.each([false, true])('Generated server versions: 2 is rejected, media nodes %s', async (mediaNodes) => {
		const db = client.db('dashboard_test_generator_media_stats_rejected');

		await expect(
			generate(db, {
				scenario: 'S',
				days: 1,
				statsMode: 'participant',
				seed: 3,
				retentionDays: { events: 7, stats: 7, tracks: 7, entities: 90 },
				timeseries: true,
				mediaNodes,
				nodesWithoutMediaStats: 2
			})
		).rejects.toThrow('0 or 1');
		await db.dropDatabase();
	});

	it('rejects node rollups without media nodes', async () => {
		const db = client.db('dashboard_test_generator_node_rollups');

		await expect(
			generate(db, {
				scenario: 'S',
				days: 1,
				statsMode: 'participant',
				seed: 3,
				retentionDays: { events: 7, stats: 7, tracks: 7, entities: 90 },
				timeseries: true,
				rollups: { fiveMinute: false, nodes: true, roomSums: false }
			})
		).rejects.toThrow('mediaNodes');
		await db.dropDatabase();
	});

	it('generates every room topology and counts it at room end with the room sums', async () => {
		const db = client.db('dashboard_test_generator_topology');
		await db.dropDatabase();

		try {
			await generate(db, {
				scenario: 'S',
				days: 7,
				statsMode: 'participant',
				seed: 1,
				retentionDays: { events: 1, stats: 1, tracks: 7, entities: 90 },
				timeseries: true,
				rollups: { fiveMinute: false, nodes: true, roomSums: true },
				mediaNodes: true
			});

			const rooms = await db.collection<RoomDocument>('rooms').find({ status: 'closed' }).toArray();
			const byTopology = new Map<string, number>();

			for (const room of rooms) {
				const topology = room.topology ?? 'missing';
				byTopology.set(topology, (byTopology.get(topology) ?? 0) + 1);
				expect(topology, room._id).toBe(
					expectedTopology(room.participants.peakActive, room.participants.peakPublishers ?? -1)
				);
			}

			const ranked = [...byTopology.entries()].sort((a, b) => b[1] - a[1]).map(([topology]) => topology);

			expect([...byTopology.keys()].sort()).toEqual(Object.values(RoomTopology).sort());
			expect(ranked.slice(0, 2).sort()).toEqual(['many_to_many', 'one_to_one']);

			// A room is recorded when one of its egresses requested a file or segments output and went active.
			const recordingRooms = new Set(
				(
					(await db.collection('egresses').distinct('roomSid', {
						'request.outputs': { $in: ['file', 'segments'] },
						'statusHistory.status': 'active'
					})) as string[]
				).filter(Boolean)
			);
			const allRooms = await db.collection<RoomDocument>('rooms').find().toArray();

			for (const room of allRooms) {
				expect(room.features.recording, room._id).toBe(recordingRooms.has(room._id));
			}

			for (const scope of [
				'global',
				...new Set(rooms.flatMap((room) => (room.mediaNode ? [room.mediaNode] : [])))
			]) {
				const ended = scope === 'global' ? rooms : rooms.filter((room) => room.mediaNode === scope);
				const hours = await db
					.collection<HourlyRollupDocument>('analytics_hourly')
					.find({ scope: scope === 'global' ? 'global' : `node:${scope}` })
					.toArray();
				const counted = {
					byTopology: {} as Record<string, number>,
					recorded: 0,
					sizes: {} as Record<string, number>
				};

				for (const hour of hours) {
					for (const [topology, count] of Object.entries(hour.rooms?.byTopology ?? {})) {
						counted.byTopology[topology] = (counted.byTopology[topology] ?? 0) + count;
					}

					counted.recorded += hour.rooms?.recorded ?? 0;

					for (const [range, count] of Object.entries(hour.rooms?.bySize ?? {})) {
						counted.sizes[range] = (counted.sizes[range] ?? 0) + count;
					}
				}

				const expected = {
					byTopology: {} as Record<string, number>,
					recorded: 0,
					sizes: {} as Record<string, number>
				};

				for (const room of ended) {
					const topology = room.topology ?? 'missing';
					expected.byTopology[topology] = (expected.byTopology[topology] ?? 0) + 1;
					expected.recorded += room.features.recording === true ? 1 : 0;

					const range = sizeRange(room.participants.peakActive);
					expected.sizes[range] = (expected.sizes[range] ?? 0) + 1;
				}

				expect(counted, scope).toEqual(expected);
			}
		} finally {
			await db.dropDatabase();
		}
	});

	it('leaves the topology counters out of the rollups without the room sums', async () => {
		const db = client.db('dashboard_test_generator_no_room_sums');
		await db.dropDatabase();

		try {
			await generate(db, {
				scenario: 'S',
				days: 1,
				statsMode: 'participant',
				seed: 7,
				retentionDays: { events: 1, stats: 1, tracks: 7, entities: 90 },
				timeseries: true,
				rollups: { fiveMinute: false, nodes: false, roomSums: false }
			});

			for (const collection of ['analytics_hourly', 'analytics_daily']) {
				expect(
					await db.collection(collection).countDocuments({
						$or: [
							{ 'rooms.byTopology': { $exists: true } },
							{ 'rooms.recorded': { $exists: true } },
							{ 'rooms.bySize': { $exists: true } }
						]
					}),
					collection
				).toBe(0);
			}

			expect(await db.collection('rooms').countDocuments({ topology: { $exists: false } })).toBe(0);
		} finally {
			await db.dropDatabase();
		}
	});

	it('Generated agents of both origins', async () => {
		const db = client.db('dashboard_test_generator_agents');
		await db.dropDatabase();

		try {
			await generate(db, {
				scenario: 'S',
				days: 2,
				statsMode: 'participant',
				seed: 7,
				retentionDays: { events: 7, stats: 7, tracks: 7, entities: 90 },
				timeseries: true,
				rollups: { fiveMinute: false, nodes: false, roomSums: false }
			});

			const participants = db.collection<ParticipantDocument>('participants');
			const agents = await participants.find({ kind: 'AGENT' }).toArray();
			const allowed = new Set([AGENT_NAME_ATTRIBUTE, OPENVIDU_AGENT_ATTRIBUTE]);

			expect(agents.length).toBeGreaterThan(0);

			for (const agent of agents) {
				expect(agent.attributes, agent._id).toHaveProperty([AGENT_NAME_ATTRIBUTE]);
				expect(
					Object.keys(agent.attributes ?? {}).filter((key) => !allowed.has(key)),
					agent._id
				).toEqual([]);
			}

			const mark = (agent: ParticipantDocument) => agent.attributes?.[OPENVIDU_AGENT_ATTRIBUTE] ?? '';
			expect(agents.some((agent) => mark(agent) !== '')).toBe(true);
			expect(agents.some((agent) => mark(agent) === '')).toBe(true);
			expect(await participants.countDocuments({ kind: { $ne: 'AGENT' }, attributes: { $exists: true } })).toBe(
				0
			);
			expect(await participants.countDocuments({ $nor: [{ $jsonSchema: CONTRACT_SCHEMAS.participants }] })).toBe(
				0
			);
		} finally {
			await db.dropDatabase();
		}
	});

	it('generates a legacy history with a completed migration', async () => {
		const plain = client.db('dashboard_test_generator_without_legacy');
		const db = client.db('dashboard_test_generator_legacy');
		const options = {
			scenario: 'S',
			days: 1,
			statsMode: 'participant',
			seed: 7,
			retentionDays: { events: 7, stats: 7, tracks: 7, entities: 90 },
			timeseries: true
		} as const;
		await plain.dropDatabase();
		await db.dropDatabase();

		try {
			// The generated counts depend on the minute of `Date.now()`: both databases are generated at one instant.
			const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now());

			try {
				await generate(plain, options);
				await generate(db, { ...options, legacy: true });
			} finally {
				clock.mockRestore();
			}

			const events = db.collection(LegacyCollection.EVENTS);
			const stats = db.collection(LegacyCollection.STATS);

			expect(await events.countDocuments()).toBe(2_400);
			expect(await stats.countDocuments()).toBe(7_200);

			const indexes = async (name: string): Promise<Record<string, number | undefined>> =>
				Object.fromEntries(
					(await db.collection(name).indexes()).map((index) => [index.name ?? '', index.expireAfterSeconds])
				);

			expect(await indexes(LegacyCollection.EVENTS)).toEqual({
				_id_: undefined,
				'timestamp.seconds_1': undefined,
				openvidu_expire_at_1: 0
			});
			expect(await indexes(LegacyCollection.STATS)).toEqual({
				_id_: undefined,
				'time_stamp.seconds_1': undefined,
				openvidu_expire_at_1: 0
			});

			const [latest] = await db
				.collection(LegacyCollection.STATS)
				.aggregate<{ expireAt: Date }>([
					{ $unionWith: LegacyCollection.EVENTS },
					{ $group: { _id: null, expireAt: { $max: '$openvidu_expire_at' } } }
				])
				.toArray();
			const migration = await db.collection('schema_meta').findOne({ _id: 'migration' as never });

			expect(migration).toMatchObject({ state: 'completed', legacyRetainedUntil: latest?.expireAt });
			expect(
				await db.collection('schema_meta').countDocuments({
					_id: 'migration' as never,
					$nor: [{ $jsonSchema: CONTRACT_SCHEMAS.schema_meta }]
				})
			).toBe(0);

			const counts = async (target: typeof db) =>
				Object.fromEntries(
					await Promise.all(
						COLLECTION_NAMES.map(
							async (name) => [name, await target.collection(name).countDocuments()] as const
						)
					)
				);
			const expected = await counts(plain);

			// The only contract document the option adds is the migration document of schema_meta.
			expect(await counts(db)).toEqual({ ...expected, schema_meta: (expected.schema_meta ?? 0) + 1 });
		} finally {
			await plain.dropDatabase();
			await db.dropDatabase();
		}
	});

	it('Generated rollups of servers reporting media statistics', async () => {
		const db = client.db('dashboard_test_generator_media_stats_reported');
		await db.dropDatabase();

		try {
			await generate(db, {
				scenario: 'S',
				days: 1,
				statsMode: 'track',
				seed: 7,
				retentionDays: { events: 7, stats: 7, tracks: 7, entities: 90 },
				timeseries: true,
				rollups: { fiveMinute: true, nodes: false, roomSums: true }
			});

			for (const collection of ['analytics_5min', 'analytics_hourly', 'analytics_daily']) {
				const rollups = db.collection(collection);

				expect(await rollups.countDocuments({})).toBeGreaterThan(0);
				expect(await rollups.countDocuments({ 'mediaStats.missing': true })).toBe(0);
				// The documents without a mark hold only the aggregator's samples.
				expect(
					await rollups.countDocuments({
						'mediaStats.reported': { $ne: true },
						$or: [{ 'rooms.created': { $exists: true } }, { bytes: { $exists: true } }]
					})
				).toBe(0);
			}
		} finally {
			await db.dropDatabase();
		}
	});

	/**
	 * One month of scenario S with the events kept for the whole month and the entities for 20 days, read by the checks
	 * that the generated scenarios are the ones a deployment really stores.
	 */
	describe('generated scenarios', () => {
		const entitiesDays = 20;
		const dbName = 'dashboard_test_generator_scenarios';
		let generatedAt = 0;

		const docs = async <T>(name: string, filter: Filter<Keyed> = {}): Promise<T[]> =>
			(await client.db(dbName).collection<Keyed>(name).find(filter).toArray()) as unknown as T[];
		const count = (name: string, filter: Filter<Keyed> = {}) =>
			client.db(dbName).collection<Keyed>(name).countDocuments(filter);
		const countBy = async (name: string, field: string, filter: Filter<Keyed> = {}) =>
			Object.fromEntries(
				(
					await client
						.db(dbName)
						.collection<Keyed>(name)
						.aggregate<{ _id: unknown; n: number }>([
							{ $match: filter },
							{ $group: { _id: `$${field}`, n: { $sum: 1 } } }
						])
						.toArray()
				).map((row) => [String(row._id), row.n])
			);

		beforeAll(async () => {
			const db = client.db(dbName);
			await db.dropDatabase();
			// The generator dates everything up to the start of its minute, and leaves out what expired by then.
			generatedAt = Math.floor(Date.now() / 60_000) * 60_000;
			await generate(db, {
				scenario: 'S',
				days: 30,
				statsMode: 'participant',
				seed: 1,
				retentionDays: { events: 30, stats: 1, tracks: 7, entities: entitiesDays },
				timeseries: true,
				rollups: { fiveMinute: false, nodes: true, roomSums: false },
				mediaNodes: true
			});
		}, 600_000);

		afterAll(async () => {
			await client.db(dbName).dropDatabase();
		});

		it('Ingress definition: generated ingresses expire only once deleted', async () => {
			const week = generatedAt - 7 * DAY;
			const ingresses = await docs<IngressDocument>('ingresses');
			const existing = ingresses.filter((ingress) => ingress.status !== 'deleted');
			const deleted = ingresses.filter((ingress) => ingress.status === 'deleted');

			expect(existing.length).toBeGreaterThan(0);
			expect(
				existing.map((ingress) => [ingress._id, ingress.deletedAt ?? null, ingress.expiresAt ?? null])
			).toEqual(existing.map((ingress) => [ingress._id, null, null]));
			expect(
				await count('events', { type: 'INGRESS_DELETED', ingressId: { $in: existing.map((i) => i._id) } })
			).toBe(0);
			expect(deleted.some((ingress) => (ingress.deletedAt?.getTime() ?? generatedAt) < week)).toBe(true);
			expect(deleted.some((ingress) => (ingress.deletedAt?.getTime() ?? 0) > week)).toBe(true);

			for (const ingress of deleted) {
				const deletedAt = ingress.deletedAt ?? new Date(0);

				expect(ingress.expiresAt, ingress._id).toEqual(new Date(deletedAt.getTime() + entitiesDays * DAY));
				expect(ingress.expiresAt?.getTime() ?? 0, ingress._id).toBeGreaterThan(generatedAt);
				expect(
					await count('ingress_sessions', { ingressId: ingress._id, endedAt: { $not: { $lt: deletedAt } } }),
					ingress._id
				).toBe(0);
				expect(
					await count('events', { type: 'INGRESS_DELETED', ingressId: ingress._id, ts: deletedAt }),
					ingress._id
				).toBe(1);
			}

			// A definition deleted longer ago than the entities retention is gone, as the TTL monitor leaves it.
			const expired = await docs<EventDocument>('events', {
				type: 'INGRESS_DELETED',
				ts: { $lte: new Date(generatedAt - entitiesDays * DAY) }
			});

			expect(expired.length).toBeGreaterThan(0);
			const ids = expired.map((event) => event.ingressId ?? '');

			expect(await count('ingresses', { _id: { $in: ids } })).toBe(0);
		});

		it('Fields of ingress documents: sessions and ingresses take the statuses the writer stores for each stop', async () => {
			const sessions = await docs<IngressSessionDocument>('ingress_sessions');
			const ended = sessions.filter((s) => s.closedBy === 'event');

			expect(Object.keys(await countBy('ingress_sessions', 'status')).sort()).toEqual([
				'buffering',
				'complete',
				'error',
				'inactive',
				'publishing'
			]);

			for (const session of ended) {
				const expected =
					session.error === undefined ? (session.inputType === 'url' ? 'complete' : 'inactive') : 'error';

				expect(session.status, session._id).toBe(expected);
			}

			// The stored INGRESS_ENDED leaves out ENDPOINT_INACTIVE, the zero value of the state.
			const inactive = ended.find((s) => s.status === 'inactive');
			const event = (await client
				.db(dbName)
				.collection('events')
				.findOne({ type: 'INGRESS_ENDED', ingressSessionId: inactive?._id })) as EventDocument | null;

			expect(
				(event?.payload as { ingress?: { state?: { status?: string } } } | undefined)?.ingress?.state
			).toBeDefined();
			expect(
				(event?.payload as { ingress?: { state?: { status?: string } } } | undefined)?.ingress?.state?.status
			).toBeUndefined();

			// An ingress takes the status of its latest session until it is deleted.
			for (const ingress of await docs<IngressDocument>('ingresses', { status: { $ne: 'deleted' } })) {
				const last = sessions
					.filter((s) => s.ingressId === ingress._id)
					.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
					.at(-1);
				const all = sessions.filter((s) => s.ingressId === ingress._id);

				if (all.length === ingress.sessions) {
					expect(ingress.status, ingress._id).toBe(last?.status ?? 'inactive');
				}
			}
		});

		it('Reusable ingress with two sessions: generated ingresses have none, one or several sessions', async () => {
			const sessions = await docs<IngressSessionDocument>('ingress_sessions');
			const ingresses = await docs<IngressDocument>('ingresses');
			const several = ingresses.filter((ingress) => ingress.sessions >= 2);

			expect(several.length).toBeGreaterThan(0);

			for (const ingress of several) {
				const own = sessions.filter((s) => s.ingressId === ingress._id);

				if (own.length === ingress.sessions) {
					expect(ingress.totalDurationMs, ingress._id).toBe(
						own.reduce((sum, s) => sum + (s.durationMs ?? 0), 0)
					);
					expect(ingress.reusable, ingress._id).toBe(true);
				}
			}

			const unused = ingresses.filter((ingress) => ingress.sessions === 0);

			expect(unused.length).toBeGreaterThan(0);
			expect(unused.filter((ingress) => ingress.lastSessionAt !== undefined)).toEqual([]);
			expect(ingresses.some((ingress) => !ingress.enabled)).toBe(true);
		});

		it('Fields of ingress documents: buffering and reconciled sessions as the writer stores them', async () => {
			const buffering = await docs<IngressSessionDocument>('ingress_sessions', { status: 'buffering' });

			expect(buffering.length).toBeGreaterThan(0);

			for (const session of buffering) {
				expect(session.roomSid, session._id).toBeUndefined();
				expect(session.endedAt, session._id).toBeUndefined();
				expect(await count('events', { type: 'INGRESS_STARTED', ingressSessionId: session._id })).toBe(0);
			}

			expect(
				await count('events', {
					type: 'INGRESS_UPDATED',
					ingressSessionId: { $in: buffering.map((s) => s._id) }
				})
			).toBe(buffering.length);

			// A session still publishing when the reconciler closed its room is closed with it, as lost.
			const reconciledRooms = await docs<RoomDocument>('rooms', { closedBy: 'reconciler' });
			const open = await docs<IngressSessionDocument>('ingress_sessions', {
				$or: reconciledRooms.map((room) => ({ roomSid: room._id, endedAt: room.endedAt }))
			});
			const reconciled = await docs<IngressSessionDocument>('ingress_sessions', { closedBy: 'reconciler' });

			expect(reconciledRooms.length).toBeGreaterThan(0);
			expect(reconciled.map((s) => s._id).sort()).toEqual(open.map((s) => s._id).sort());

			for (const session of reconciled) {
				expect([session.status, session.error], session._id).toEqual(['error', 'ingress lost (reconciled)']);
			}

			const synthetic = await docs<EventDocument>('events', {
				type: 'INGRESS_ENDED',
				synthetic: true,
				ingressSessionId: { $in: reconciled.map((s) => s._id) }
			});

			expect(synthetic.length).toBe(reconciled.length);
			expect(synthetic.filter((event) => event._id !== `AE_SYN_${event.ingressSessionId ?? ''}`)).toEqual([]);
		});

		it("Generated data follows the writer's shape: ingress events carry no participant and no room until it publishes", async () => {
			expect(await count('events', { type: /^INGRESS_/, identity: { $exists: true } })).toBe(0);
			expect(
				await count('events', {
					type: { $in: ['INGRESS_CREATED', 'INGRESS_STARTED'] },
					roomSid: { $exists: true }
				})
			).toBe(0);
			expect(await count('events', { type: 'INGRESS_ENDED', synthetic: false })).toBeGreaterThan(0);
			expect(await count('events', { type: 'INGRESS_ENDED', roomSid: { $exists: false } })).toBe(0);
		});

		it('Expiry of closed entities: no ingress session outlives its room', async () => {
			const rooms = new Map(
				(await docs<RoomDocument>('rooms', { status: 'closed' })).map((room) => [room._id, room])
			);
			const late = (
				await docs<IngressSessionDocument>('ingress_sessions', { roomSid: { $exists: true } })
			).filter((session) => {
				const room = rooms.get(session.roomSid ?? '');

				return room?.endedAt !== undefined && (session.endedAt === undefined || session.endedAt > room.endedAt);
			});

			expect(late.map((session) => session._id)).toEqual([]);
		});

		it('Web egress without room: generated web egresses name no room and have no participant', async () => {
			const web = await docs<EgressDocument>('egresses', { type: 'web' });

			expect(web.length).toBeGreaterThan(0);
			expect(web.filter((egress) => egress.roomSid !== undefined || egress.roomName !== undefined)).toEqual([]);
			expect(
				await count('events', { egressId: { $in: web.map((e) => e._id) }, roomSid: { $exists: true } })
			).toBe(0);
			expect(
				await count('participants', {
					kind: 'EGRESS',
					identityLower: { $in: web.map((e) => e._id.toLowerCase()) }
				})
			).toBe(0);
			expect(await count('rooms', { egressIds: { $exists: true } })).toBe(0);
		});

		it('Fields of an egress document: generated egresses in every status, with several outputs and retries', async () => {
			expect(Object.keys(await countBy('egresses', 'status')).sort()).toEqual([
				'aborted',
				'active',
				'complete',
				'ending',
				'failed',
				'limit_reached',
				'starting'
			]);

			const reconciled = await docs<EgressDocument>('egresses', { closedBy: 'reconciler' });

			expect(reconciled.length).toBeGreaterThan(0);
			expect(reconciled.filter((e) => e.status !== 'failed' || e.error !== 'egress lost (reconciled)')).toEqual(
				[]
			);
			expect(await count('egresses', { 'outputs.1': { $exists: true } })).toBeGreaterThan(0);
			expect(await count('egresses', { 'outputs.kind': 'images' })).toBeGreaterThan(0);
			expect(await count('egresses', { retryCount: { $gt: 0 } })).toBeGreaterThan(0);
			expect(await count('egresses', { backupStorageUsed: true })).toBeGreaterThan(0);
			expect(await count('egresses', { status: 'starting', 'outputs.0': { $exists: true } })).toBe(0);
			// Only streams report a status of their own, and the summary lists every requested output once.
			expect(
				await count('egresses', {
					outputs: { $elemMatch: { kind: { $ne: 'stream' }, status: { $exists: true } } }
				})
			).toBe(0);
			expect(await count('egresses', { 'request.audioOnly': false })).toBe(0);
			expect(await count('rooms', { 'egress.total': { $gte: 2 } })).toBeGreaterThan(0);
		});

		it("Rollups: API calls and errors counted by method in the server's scopes", async () => {
			const hourly = await docs<HourlyRollupDocument>('analytics_hourly', { 'apiCalls.total': { $gt: 0 } });

			expect(hourly.some((doc) => doc.scope === 'global')).toBe(true);
			expect(hourly.some((doc) => doc.scope.startsWith('node:'))).toBe(true);
			expect(await count('analytics_hourly', { 'apiErrors.total': { $gt: 0 } })).toBeGreaterThan(0);

			for (const doc of hourly) {
				const calls = doc.apiCalls;
				const errors = doc.apiErrors;

				expect(
					Object.values(calls?.byMethod ?? {}).reduce((sum, n) => sum + n, 0),
					doc._id
				).toBe(calls?.total);
				expect(errors?.total ?? 0, doc._id).toBeLessThanOrEqual(calls?.total ?? 0);
			}

			expect(await count('analytics_5min', { apiCalls: { $exists: true } })).toBe(0);
		});

		it('Raw event documents: the events agree with the resume, mute and publish counters', async () => {
			const from = new Date(generatedAt - 29 * DAY);
			const resumed = await docs<ParticipantDocument>('participants', {
				joinedAt: { $gte: from },
				resumes: { $gt: 0 }
			});

			expect(resumed.length).toBeGreaterThan(0);
			expect(
				await count('events', {
					type: 'PARTICIPANT_RESUMED',
					participantSid: { $in: resumed.map((p) => p._id) }
				})
			).toBe(resumed.reduce((sum, p) => sum + p.resumes, 0));
			const steady = await docs<ParticipantDocument>('participants', { joinedAt: { $gte: from }, resumes: 0 });

			expect(
				await count('events', {
					type: 'PARTICIPANT_RESUMED',
					participantSid: { $in: steady.map((p) => p._id) }
				})
			).toBe(0);

			const published = await count('events', { type: 'TRACK_PUBLISHED', ts: { $gte: from } });
			const requested = await count('events', { type: 'TRACK_PUBLISH_REQUESTED', ts: { $gte: from } });

			expect(Math.abs(published - requested)).toBeLessThanOrEqual(1);

			// Every toggle ends as it started: a track unmuted at publish ends unmuted. The tracks published within the
			// window keep all their events while the TTL monitor removes those past the events retention.
			const recent = {
				$in: await client
					.db(dbName)
					.collection('events')
					.distinct('trackSid', { type: 'TRACK_PUBLISHED', ts: { $gte: from } })
			};
			const muted = await countBy('events', 'trackSid', { type: 'TRACK_MUTED', trackSid: recent });
			const unmuted = await countBy('events', 'trackSid', { type: 'TRACK_UNMUTED', trackSid: recent });

			expect(Object.keys(muted).length).toBeGreaterThan(0);
			expect(muted).toEqual(unmuted);
			expect(await count('events', { type: 'TRACK_SUBSCRIBE_REQUESTED' })).toBe(0);
		});

		it('Fields of a participant document: sessions with stats have lastStatsAt, and their room the latest', async () => {
			const rooms = await docs<RoomDocument>('rooms', {
				createdAt: { $gte: new Date(generatedAt - 2 * DAY) }
			});

			for (const room of rooms) {
				const participants = await docs<ParticipantDocument>('participants', { roomSid: room._id });
				const latest = Math.max(0, ...participants.map((p) => p.lastStatsAt?.getTime() ?? 0));

				expect(room.lastStatsAt?.getTime() ?? 0, room._id).toBe(latest);

				// Signal statistics flow every period: the last flush of a session, whatever its media.
				for (const p of participants.filter((s) => s.activeAt !== undefined && s.leftAt !== undefined)) {
					const activeAt = p.activeAt?.getTime() ?? 0;
					const end = p.leftAt?.getTime() ?? 0;
					const flushes = Math.floor((end - activeAt) / 30_000);
					const last = flushes > 0 ? activeAt + flushes * 30_000 : undefined;

					expect(p.lastStatsAt?.getTime(), p._id).toBe(last);
					expect(p.lastStatsAt?.getTime() ?? 0, p._id).toBeGreaterThanOrEqual(
						p.quality.lastScoreAt?.getTime() ?? 0
					);
				}
			}

			expect(await count('participants', { status: 'aborted', lastStatsAt: { $exists: true } })).toBe(0);
			expect(await count('participants', { lastStatsAt: { $exists: true } })).toBeGreaterThan(0);
		});

		it('Track closed by participant leave: closed tracks and subscriptions name what closed them', async () => {
			expect(await count('tracks', { status: 'unpublished', closedBy: { $exists: false } })).toBe(0);
			expect(await count('track_subscriptions', { status: 'unsubscribed', closedBy: { $exists: false } })).toBe(
				0
			);
			expect(await count('track_subscriptions', { status: 'failed', closedBy: { $exists: true } })).toBe(0);

			const cascaded = await docs<Keyed>('tracks', { closedBy: 'reconciler' });

			expect(cascaded.length).toBeGreaterThan(0);
			expect(await count('track_subscriptions', { closedBy: 'reconciler' })).toBeGreaterThan(0);
			expect(
				await count('events', { type: 'TRACK_UNPUBLISHED', trackSid: { $in: cascaded.map((t) => t._id) } })
			).toBe(0);
		});

		it('Fields of track and subscription documents: screen shares, encrypted rooms and joining sessions', async () => {
			expect(Object.keys(await countBy('tracks', 'source')).sort()).toEqual([
				'CAMERA',
				'MICROPHONE',
				'SCREEN_SHARE',
				'SCREEN_SHARE_AUDIO'
			]);
			expect(await count('tracks', { encryption: 'GCM' })).toBeGreaterThan(0);

			const joining = await docs<ParticipantDocument>('participants', { status: 'joining' });

			expect(joining.length).toBeGreaterThan(0);
			expect(joining.filter((p) => p.activeAt !== undefined || p.leftAt !== undefined)).toEqual([]);

			// A session still connecting is in the room but not active in it.
			for (const p of joining.slice(0, 20)) {
				const room = (await client
					.db(dbName)
					.collection('rooms')
					.findOne({ _id: p.roomSid as never })) as RoomDocument | null;
				const active = await count('participants', { roomSid: p.roomSid, kind: 'STANDARD', status: 'active' });

				expect(room?.participants.active, p._id).toBe(active);
			}
		});

		it('Room lifecycle: nobody joins, publishes or stays in a room after it ended', async () => {
			const afterEnd = (field: string, operator: '$gt' | '$gte') =>
				client
					.db(dbName)
					.collection(field === 'publishedAt' ? 'tracks' : 'participants')
					.aggregate<{ n: number }>([
						{ $lookup: { from: 'rooms', localField: 'roomSid', foreignField: '_id', as: 'room' } },
						{ $unwind: '$room' },
						{
							$match: {
								'room.endedAt': { $exists: true },
								$expr: { [operator]: [`$${field}`, '$room.endedAt'] }
							}
						},
						{ $count: 'n' }
					])
					.toArray();

			expect(await afterEnd('joinedAt', '$gte')).toEqual([]);
			expect(await afterEnd('leftAt', '$gt')).toEqual([]);
			expect(await afterEnd('publishedAt', '$gte')).toEqual([]);
			expect(await count('rooms', { endReason: 'API_DELETE' })).toBeGreaterThan(0);
		});

		it('Fields of ingress documents: session IDs take the prefix the server gives each input', async () => {
			const sessions = await docs<IngressSessionDocument>('ingress_sessions');
			const prefixes = new Set(sessions.map((s) => `${s.inputType}:${s._id.slice(0, 3)}`));

			expect(prefixes.has('rtmp:RT_')).toBe(true);
			expect(prefixes.has('url:UR_')).toBe(true);
			expect([...prefixes].filter((p) => p.startsWith('rtmp:') && p !== 'rtmp:RT_')).toEqual([]);
			expect([...prefixes].filter((p) => p.startsWith('url:') && p !== 'url:UR_')).toEqual([]);
		});

		it('Expiry of closed entities: no entity past its expiry is written, as the TTL monitor removes it', async () => {
			const now = new Date(generatedAt);

			for (const name of [
				'rooms',
				'participants',
				'tracks',
				'track_subscriptions',
				'egresses',
				'ingresses',
				'ingress_sessions'
			]) {
				expect(await count(name, { expiresAt: { $lte: now } }), name).toBe(0);
			}

			expect(await count('rooms', { endedAt: { $lt: new Date(generatedAt - (entitiesDays + 1) * DAY) } })).toBe(
				0
			);
			expect(
				await count('analytics_hourly', { scope: 'global', bucket: { $lt: new Date(generatedAt - 25 * DAY) } })
			).toBeGreaterThan(0);
		});
	});

	/** Two days of scenario S with per-track stats kept for the whole range, read by the checks of the stats. */
	describe('generated stats', () => {
		const dbName = 'dashboard_test_generator_stats';
		const db = () => client.db(dbName);

		beforeAll(async () => {
			await db().dropDatabase();
			await generate(db(), {
				scenario: 'S',
				days: 2,
				statsMode: 'track',
				seed: 3,
				retentionDays: { events: 7, stats: 7, tracks: 7, entities: 90 },
				timeseries: true,
				rollups: { fiveMinute: true, nodes: true, roomSums: false },
				mediaNodes: true,
				nodesWithoutMediaStats: 1
			});
		}, 600_000);

		afterAll(async () => {
			await db().dropDatabase();
		});

		it('Generated server versions', async () => {
			const nodes = await db()
				.collection<NodeDocument>('nodes')
				.find()
				.sort({ firstSeenAt: 1, _id: 1 })
				.toArray();
			const end = Math.max(...nodes.map((node) => node.lastSeenAt.getTime()));
			const { middle } = rangeOf(end, 2);
			const label = (n: number) => nodes.filter((node) => node.mediaNode === `media-node-10-0-0-${String(n)}`);
			const [unreported] = label(2);
			const unreportedId = unreported?._id ?? '';

			expect(
				nodes.filter(
					(node) => node.serverVersion !== (node.firstSeenAt.getTime() < middle ? '3.10.0' : '3.10.1')
				)
			).toEqual([]);
			expect(
				await db()
					.collection('schema_meta')
					.findOne({ _id: 'schema' as never })
			).toMatchObject({
				writerVersion: '3.10.1'
			});
			expect([unreported?.rtcEngine, unreported?.mediaStats]).toEqual(['mediasoup', false]);
			expect(nodes.filter((node) => node._id !== unreportedId && !node.mediaStats)).toEqual([]);
			expect(label(1).map((node) => node.rtcEngine)).toEqual(['pion', 'mediasoup', 'mediasoup']);

			const rooms = db().collection<RoomDocument>('rooms');
			const marked = await rooms.find({ nodeId: unreportedId }).toArray();

			expect(marked.length).toBeGreaterThan(0);
			expect(marked.every((room) => room.mediaStats === false && room.quality.scoreCount === 0)).toBe(true);
			expect(await rooms.countDocuments({ nodeId: unreportedId, 'bytes.up': { $ne: 0 } })).toBe(0);
			expect(await rooms.countDocuments({ nodeId: { $ne: unreportedId }, mediaStats: { $exists: true } })).toBe(
				0
			);

			const participants = db().collection('participants');

			expect(await participants.countDocuments({ nodeId: unreportedId, mediaStats: { $ne: false } })).toBe(0);
			expect(await participants.countDocuments({ nodeId: unreportedId, 'quality.scoreCount': { $gt: 0 } })).toBe(
				0
			);
			expect(await participants.countDocuments({ nodeId: { $ne: unreportedId }, mediaStats: false })).toBe(0);
			expect(await db().collection('track_stats').countDocuments({ 'meta.nodeId': unreportedId })).toBe(0);
			expect(await db().collection('track_stats').countDocuments({})).toBeGreaterThan(0);
		});

		it('Generated rollups of nodes without media statistics', async () => {
			const nodes = await db()
				.collection<NodeDocument>('nodes')
				.find()
				.sort({ firstSeenAt: 1, _id: 1 })
				.toArray();
			const [first, second] = nodes.filter((node) => node.mediaNode === 'media-node-10-0-0-2');
			const stoppedAt = first?.stoppedAt?.getTime() ?? 0;
			const hourly = db().collection<HourlyRollupDocument>('analytics_hourly');
			const counted = { 'rooms.created': { $exists: true } };
			const rooms = await db().collection<RoomDocument>('rooms').find().toArray();

			// A global bucket that counts the creation of a room of the first -2 server and of another has both marks.
			const mixed = (await hourly.find({ ...counted, scope: 'global' }).toArray()).filter((doc) => {
				const created = rooms.filter(
					(room) => room.createdAt >= doc.bucket && room.createdAt.getTime() < doc.bucket.getTime() + HOUR
				);

				return (
					created.some((room) => room.nodeId === first?._id) &&
					created.some((room) => room.nodeId !== first?._id)
				);
			});

			expect(mixed.length).toBeGreaterThan(0);

			for (const doc of mixed) {
				expect(doc.mediaStats, doc._id).toEqual({ reported: true, missing: true });
			}

			expect(
				await hourly.countDocuments({ bucket: { $gte: new Date(stoppedAt) }, 'mediaStats.missing': true })
			).toBe(0);

			const scope = 'node:media-node-10-0-0-2';
			const beforeStop = await hourly
				.find({ ...counted, scope, bucket: { $lte: new Date(stoppedAt - HOUR) } })
				.toArray();
			const afterStart = await hourly
				.find({ ...counted, scope, bucket: { $gte: second?.firstSeenAt ?? new Date() } })
				.toArray();

			expect(beforeStop.length).toBeGreaterThan(0);
			expect(afterStart.length).toBeGreaterThan(0);
			expect(
				beforeStop.filter((doc) => doc.mediaStats?.missing !== true || doc.mediaStats.reported === true)
			).toEqual([]);
			expect(
				afterStart.filter((doc) => doc.mediaStats?.reported !== true || doc.mediaStats.missing === true)
			).toEqual([]);
			expect(
				await hourly.countDocuments({
					...counted,
					scope: { $nin: ['global', scope] },
					$or: [{ 'mediaStats.missing': true }, { 'mediaStats.reported': { $ne: true } }]
				})
			).toBe(0);

			for (const collection of ['analytics_5min', 'analytics_hourly', 'analytics_daily'] as const) {
				expect(
					await db()
						.collection(collection)
						.countDocuments({ $nor: [{ $jsonSchema: CONTRACT_SCHEMAS[collection] }] }),
					collection
				).toBe(0);
			}
		});

		it('Quality counters: participants, rooms and rollups count every track_stats document, sample by sample', async () => {
			const stats = db().collection('track_stats');
			const participants = await db()
				.collection<ParticipantDocument>('participants')
				.find({ 'quality.scoreCount': { $gt: 0 } })
				.limit(300)
				.toArray();

			expect(participants.length).toBeGreaterThan(0);

			for (const p of participants) {
				const [own] = await stats
					.aggregate<{ n: number; min: number; poor: number; lost: number }>([
						{ $match: { 'meta.participantSid': p._id } },
						{
							$group: {
								_id: null,
								n: { $sum: 1 },
								min: { $min: '$score' },
								poor: { $sum: { $cond: [{ $lt: ['$score', 2.06] }, 1, 0] } },
								lost: { $sum: { $cond: [{ $lt: ['$score', 1.25] }, 1, 0] } }
							}
						}
					])
					.toArray();

				expect([own?.n, own?.min, own?.poor, own?.lost], p._id).toEqual([
					p.quality.scoreCount,
					p.quality.minScore,
					p.quality.poor,
					p.quality.lost
				]);
			}

			for (const room of await db()
				.collection<RoomDocument>('rooms')
				.find({ mediaStats: { $exists: false } })
				.limit(100)
				.toArray()) {
				const [sums] = await stats
					.aggregate<{ up: number; n: number }>([
						{ $match: { 'meta.roomSid': room._id } },
						{
							$group: {
								_id: null,
								up: { $sum: { $cond: [{ $eq: ['$meta.kind', 'up'] }, '$bytes', 0] } },
								n: { $sum: 1 }
							}
						}
					])
					.toArray();

				expect([sums?.up ?? 0, sums?.n ?? 0], room._id).toEqual([room.bytes.up, room.quality.scoreCount]);
			}

			const [hourly] = await db()
				.collection('analytics_hourly')
				.aggregate<{ n: number; poor: number; lost: number }>([
					{ $match: { scope: 'global' } },
					{
						$group: {
							_id: null,
							n: { $sum: '$quality.scoreCount' },
							poor: { $sum: '$quality.poor' },
							lost: { $sum: '$quality.lost' }
						}
					}
				])
				.toArray();

			expect([hourly?.n, hourly?.poor, hourly?.lost]).toEqual([
				await stats.countDocuments({}),
				await stats.countDocuments({ score: { $lt: 2.06 } }),
				await stats.countDocuments({ score: { $lt: 1.25 } })
			]);
			// Some sessions and rooms are on bad networks: poor and lost samples, not only good ones.
			expect((hourly?.poor ?? 0) / (hourly?.n ?? 1)).toBeGreaterThan(0.02);
			expect(hourly?.lost ?? 0).toBeGreaterThan(0);
		});

		it('Raw event documents: TRACK_PUBLISH_STATS and TRACK_SUBSCRIBE_STATS carry the final stats tracks and subscriptions keep', async () => {
			interface Final {
				_id: string;
				publishStats?: { bytes: number; packets: number; layers: unknown[] };
			}
			interface RtpPayload {
				rtp_stats: { bytes: number; packets?: number };
			}
			const events = db().collection<EventDocument>('events');
			const tracks = await db()
				.collection<Final>('tracks')
				.find({ publishStats: { $exists: true } })
				.limit(200)
				.toArray();

			expect(tracks.length).toBeGreaterThan(0);

			for (const t of tracks) {
				const own = await events.find({ type: 'TRACK_PUBLISH_STATS', trackSid: t._id }).toArray();
				const sums = own.map((e) => (e.payload as unknown as RtpPayload).rtp_stats);

				expect(own.length, t._id).toBe(Math.max(1, t.publishStats?.layers.length ?? 0));
				expect(
					[sums.reduce((n, s) => n + s.bytes, 0), sums.reduce((n, s) => n + (s.packets ?? 0), 0)],
					t._id
				).toEqual([t.publishStats?.bytes, t.publishStats?.packets]);
			}

			expect(
				await db()
					.collection('tracks')
					.countDocuments({ closedBy: 'reconciler', publishStats: { $exists: true } })
			).toBe(0);

			const subscriptions = await db()
				.collection<{
					_id: string;
					trackSid: string;
					subscriberSid: string;
					subscribeStats?: { bytes: number };
				}>('track_subscriptions')
				.find({ subscribeStats: { $exists: true } })
				.limit(200)
				.toArray();

			expect(subscriptions.length).toBeGreaterThan(0);

			for (const s of subscriptions) {
				const own = await events
					.find({ type: 'TRACK_SUBSCRIBE_STATS', trackSid: s.trackSid, participantSid: s.subscriberSid })
					.toArray();

				expect(
					own.map((e) => (e.payload as unknown as RtpPayload).rtp_stats.bytes),
					s._id
				).toEqual([s.subscribeStats?.bytes]);
			}
		});

		it('Muted tracks: no track_stats document of a track while it is muted', async () => {
			const toggled = new Set(
				(await db().collection('events').distinct('trackSid', { type: 'TRACK_MUTED' })) as string[]
			);
			const mutedForGood = (
				await db()
					.collection<{ _id: string }>('tracks')
					.find({ muted: true }, { projection: { _id: 1 } })
					.toArray()
			)
				.map((t) => t._id)
				.filter((sid) => !toggled.has(sid));

			expect(mutedForGood.length).toBeGreaterThan(0);
			expect(
				await db()
					.collection('track_stats')
					.countDocuments({ 'meta.trackSid': { $in: mutedForGood } })
			).toBe(0);

			// A track muted for a whole flush period has no document at its end.
			for (const sid of [...toggled].slice(0, 100)) {
				const changes = await db()
					.collection<EventDocument>('events')
					.find({ trackSid: sid, type: { $in: ['TRACK_MUTED', 'TRACK_UNMUTED'] } })
					.sort({ ts: 1 })
					.toArray();

				for (let i = 0; i + 1 < changes.length; i += 2) {
					const from = (changes[i]?.ts.getTime() ?? 0) + 30_000;
					const to = changes[i + 1]?.ts.getTime() ?? 0;

					expect(
						await db()
							.collection('track_stats')
							.countDocuments({
								'meta.trackSid': sid,
								'meta.kind': 'up',
								ts: { $gte: new Date(from), $lte: new Date(to) }
							}),
						sid
					).toBe(0);
				}
			}
		});

		it('Media statistics of mediasoup servers: no padding in the bytes of a video subscriber', async () => {
			const nodes = await db().collection<NodeDocument>('nodes').find().toArray();
			const roomsOf = async (engine: string, mediaNode?: string) =>
				db()
					.collection<Keyed>('rooms')
					.distinct('_id', {
						nodeId: {
							$in: nodes
								.filter(
									(node) =>
										node.rtcEngine === engine && (mediaNode ?? node.mediaNode) === node.mediaNode
								)
								.map((node) => node._id)
						}
					});
			// Video bytes per packet: about 1 100 for media alone, less with the small padding packets of Pion.
			const padded = (roomSids: string[]) =>
				db()
					.collection('track_stats')
					.countDocuments({
						'meta.roomSid': { $in: roomSids },
						'meta.kind': 'down',
						mimeType: /^video\//,
						packets: { $gt: 50 },
						$expr: { $lt: [{ $divide: ['$bytes', '$packets'] }, 1_000] }
					});

			const mediasoup = await roomsOf('mediasoup');

			expect(
				await db()
					.collection('track_stats')
					.countDocuments({ 'meta.roomSid': { $in: mediasoup }, 'meta.kind': 'down', mimeType: /^video\// })
			).toBeGreaterThan(0);
			expect(await padded(mediasoup)).toBe(0);
			expect(await padded(await roomsOf('pion', 'media-node-10-0-0-3'))).toBeGreaterThan(0);
		});

		it('Fields of a participant document: the client fields, region and kind details the writer leaves out when empty', async () => {
			const participants = db().collection('participants');

			expect(await participants.countDocuments({ region: { $exists: true } })).toBe(0);
			expect(await participants.countDocuments({ kindDetails: { $exists: true } })).toBe(0);

			for (const field of ['browser', 'browserVersion', 'deviceModel', 'network']) {
				expect(await participants.countDocuments({ [`client.${field}`]: '' }), field).toBe(0);
			}

			expect(await participants.countDocuments({ 'client.browser': { $exists: false } })).toBeGreaterThan(0);

			// Rooms keep the server's timeouts or set their own, and some cap their participants.
			const rooms = db().collection('rooms');

			expect((await rooms.distinct('config.emptyTimeoutMs')).length).toBeGreaterThan(1);
			expect((await rooms.distinct('config.departureTimeoutMs')).length).toBeGreaterThan(1);
			expect(await rooms.countDocuments({ 'config.maxParticipants': { $gt: 0 } })).toBeGreaterThan(0);
			expect(
				await rooms.countDocuments({
					'config.maxParticipants': { $gt: 0 },
					$expr: { $gt: ['$participants.peakActive', '$config.maxParticipants'] }
				})
			).toBe(0);
		});
	});
});

/** The range of a database generated over `days` ending at `end`, with its middle and three quarters, as the generator floors them. */
function rangeOf(end: number, days: number): { windowStart: number; middle: number; quarter: number } {
	const windowStart = end - days * DAY;
	const floor = (at: number) => Math.floor(at / MINUTE) * MINUTE;

	return {
		windowStart,
		middle: floor(windowStart + (end - windowStart) / 2),
		quarter: floor(windowStart + ((end - windowStart) * 3) / 4)
	};
}

/**
 * Checks a keep-alive tick at `later`: only the `alive` servers have it as their last heartbeat, each keeping its batch
 * interval and drain, and every other server keeps its last heartbeat, drain and stop.
 */
async function expectKeptAlive(
	db: Db,
	generated: readonly NodeDocument[],
	later: Date,
	alive: readonly (string | undefined)[]
): Promise<void> {
	const kept = new Map((await db.collection<NodeDocument>('nodes').find().toArray()).map((node) => [node._id, node]));

	expect(alive.every((id) => id !== undefined)).toBe(true);

	for (const node of generated) {
		const now = kept.get(node._id);
		const fresh = alive.includes(node._id);

		expect(
			{
				lastSeenAt: now?.lastSeenAt,
				batchIntervalMs: now?.batchIntervalMs,
				drainingAt: now?.drainingAt,
				stoppedAt: now?.stoppedAt
			},
			node._id
		).toEqual({
			lastSeenAt: fresh ? later : node.lastSeenAt,
			batchIntervalMs: node.batchIntervalMs,
			drainingAt: node.drainingAt,
			stoppedAt: node.stoppedAt
		});
	}
}

/** The topology the writer gives a room of these peaks. */
function expectedTopology(peakActive: number, peakPublishers: number): string {
	if (peakActive === 0) {
		return 'empty';
	}

	if (peakActive === 1) {
		return 'single_participant';
	}

	if (peakPublishers === 0) {
		return 'no_publishers';
	}

	if (peakActive === 2) {
		return 'one_to_one';
	}

	return peakPublishers === 1 ? 'one_to_many' : 'many_to_many';
}

/** The size range of a classified room. */
function sizeRange(peakActive: number): string {
	const bounds: [number, string][] = [
		[5, '0-5'],
		[10, '6-10'],
		[25, '11-25'],
		[50, '26-50'],
		[100, '51-100']
	];

	return bounds.find(([max]) => peakActive <= max)?.[1] ?? '101+';
}

/** Every key of a payload at any depth; BSON values such as `Long` are leaves. */
function payloadKeys(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.flatMap(payloadKeys);
	}

	if (value === null || typeof value !== 'object' || value instanceof Date || '_bsontype' in value) {
		return [];
	}

	return Object.entries(value).flatMap(([key, child]) => [key, ...payloadKeys(child)]);
}
