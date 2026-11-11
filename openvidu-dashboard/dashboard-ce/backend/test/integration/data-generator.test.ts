import { CONTRACT_SCHEMAS } from '@openvidu-dashboard/data-generator/contract';
import { generate } from '@openvidu-dashboard/data-generator/generator';
import { COLLECTION_NAMES, keepLive } from '@openvidu-dashboard/data-generator/schema';
import {
	type EgressDocument,
	type EventDocument,
	type HourlyRollupDocument,
	type IngressSessionDocument,
	type NodeDocument,
	type RoomDocument,
	RoomTopology
} from '@openvidu-dashboard/typings';
import { type Document, type Filter, MongoClient } from 'mongodb';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

/**
 * The data generator writes what the writer would: every document of every collection, `track_stats` included (a
 * time-series collection takes no validator), satisfies the contract validator in both stats modes.
 */

const mongoUri = inject('mongoUri');

describe.skipIf(mongoUri === '')('data generator', () => {
	let client: MongoClient;

	beforeAll(async () => {
		client = await MongoClient.connect(mongoUri);
	});

	afterAll(async () => {
		await client.close();
	});

	it.each(['participant', 'track'] as const)('writes documents of the contract in %s mode', async (statsMode) => {
		const db = client.db(`dashboard_test_generator_${statsMode}`);
		await db.dropDatabase();

		try {
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

			// Each ingress session has the INGRESS participant the ingress sessions API links to.
			for (const session of await db.collection<IngressSessionDocument>('ingress_sessions').find({}).toArray()) {
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

			// Each egress with a room has the EGRESS session the egress detail resolves: identity = egress id.
			for (const egress of await db
				.collection<EgressDocument>('egresses')
				.find({ roomSid: { $exists: true } })
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

			// Node heartbeats report the writer's default batch interval.
			expect(await db.collection('nodes').countDocuments({ batchIntervalMs: { $ne: 10_000 } })).toBe(0);

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
		} finally {
			await db.dropDatabase();
		}
	});

	it('generates five media nodes, one per state, with media nodes', async () => {
		const db = client.db('dashboard_test_generator_media_nodes');
		await db.dropDatabase();

		try {
			await generate(db, {
				scenario: 'S',
				days: 2,
				statsMode: 'participant',
				seed: 3,
				retentionDays: { events: 7, stats: 7, tracks: 7, entities: 90 },
				timeseries: true,
				rollups: { fiveMinute: true, nodes: true, roomSums: true },
				mediaNodes: true
			});

			const nodes = await db.collection<NodeDocument>('nodes').find().toArray();
			const first = nodes.filter((node) => node.mediaNode === 'media-node-10-0-0-1');
			const stopped = first.find((node) => node.stoppedAt !== undefined);
			const current = first.find((node) => node.stoppedAt === undefined);

			const label = (n: number) => nodes.find((node) => node.mediaNode === `media-node-10-0-0-${String(n)}`);
			const end = Math.max(...nodes.map((node) => node.lastSeenAt.getTime()));

			expect(nodes).toHaveLength(6);
			expect(new Set(nodes.map((node) => node.mediaNode))).toEqual(
				new Set([1, 2, 3, 4, 5].map((n) => `media-node-10-0-0-${String(n)}`))
			);
			expect(
				nodes.every((node) => node.ip === node.mediaNode?.replace('media-node-', '').replaceAll('-', '.'))
			).toBe(true);
			expect(nodes.every((node) => node.rtcEngine === 'pion')).toBe(true);
			expect(first).toHaveLength(2);
			expect(label(2)?.drainingAt).toBeUndefined();
			expect(end - (label(3)?.drainingAt?.getTime() ?? 0)).toBe(20 * 60_000);
			expect(label(4)?.stoppedAt).toBeUndefined();
			expect(end - (label(4)?.lastSeenAt.getTime() ?? 0)).toBe(3 * 3_600_000);
			expect(end - (label(5)?.stoppedAt?.getTime() ?? 0)).toBe(30 * 60_000);
			expect(end - (label(5)?.drainingAt?.getTime() ?? 0)).toBe(40 * 60_000);
			expect(stopped?.lastSeenAt.getTime()).toBeLessThan(current?.firstSeenAt.getTime() ?? 0);
			expect(await db.collection('rooms').countDocuments({ nodeId: stopped?._id })).toBeGreaterThan(0);

			for (const node of nodes) {
				const rooms = db.collection('rooms');

				expect(node.rooms?.hosted).toBe(await rooms.countDocuments({ nodeId: node._id }));
				expect(node.rooms?.reconciled).toBe(
					await rooms.countDocuments({ nodeId: node._id, closedBy: 'reconciler' })
				);
				expect(
					await db
						.collection('rooms')
						.countDocuments({ nodeId: node._id, mediaNode: { $ne: node.mediaNode } })
				).toBe(0);
				expect(
					await db
						.collection('participants')
						.countDocuments({ nodeId: node._id, mediaNode: { $ne: node.mediaNode } })
				).toBe(0);
			}

			const scopes = (await db.collection('analytics_hourly').distinct('scope')) as string[];

			expect(scopes.filter((scope) => scope !== 'global').sort()).toEqual(
				[1, 2, 3, 4, 5].map((n) => `node:media-node-10-0-0-${String(n)}`)
			);

			// Egress and ingress stay in the global rollups and carry no media node.
			for (const collection of ['analytics_5min', 'analytics_hourly', 'analytics_daily']) {
				expect(
					await db.collection(collection).countDocuments({
						scope: { $ne: 'global' },
						$or: [{ egress: { $exists: true } }, { ingress: { $exists: true } }]
					}),
					collection
				).toBe(0);
			}

			for (const collection of ['egresses', 'ingress_sessions']) {
				expect(
					await db.collection(collection).countDocuments({ mediaNode: { $exists: true } }),
					collection
				).toBe(0);
			}

			const globalEgress = await db
				.collection<HourlyRollupDocument>('analytics_hourly')
				.find({ scope: 'global' })
				.toArray();

			expect(globalEgress.reduce((sum, hour) => sum + (hour.egress?.started ?? 0), 0)).toBe(
				await db
					.collection('egresses')
					.countDocuments({ startedAt: { $gte: globalEgress[0]?.bucket ?? new Date(0) } })
			);

			// The media nodes gone before the end host only rooms that ended before they went silent or drained.
			for (const gone of [label(4), label(5)]) {
				const rooms = db.collection('rooms');

				expect(await rooms.countDocuments({ nodeId: gone?._id })).toBeGreaterThan(0);
				expect(
					await rooms.countDocuments({
						nodeId: gone?._id,
						$or: [{ endedAt: null }, { endedAt: { $gt: gone?.drainingAt ?? gone?.lastSeenAt } }]
					})
				).toBe(0);
			}

			expect(
				await db.collection('nodes').countDocuments({ $nor: [{ $jsonSchema: CONTRACT_SCHEMAS.nodes }] })
			).toBe(0);

			const later = new Date(Date.now() + 10 * 60_000);

			await keepLive(db, later);
			const kept = await db.collection<NodeDocument>('nodes').find().toArray();

			expect(
				kept
					.filter((node) => node.lastSeenAt.getTime() === later.getTime())
					.map((node) => node._id)
					.sort()
			).toEqual([current?._id, label(2)?._id, label(3)?._id].sort());
			expect(kept.find((node) => node._id === stopped?._id)?.lastSeenAt).toEqual(stopped?.lastSeenAt);
			expect(kept.find((node) => node._id === label(4)?._id)?.lastSeenAt).toEqual(label(4)?.lastSeenAt);
			expect(kept.find((node) => node._id === label(3)?._id)?.drainingAt).toEqual(label(3)?.drainingAt);
		} finally {
			await db.dropDatabase();
		}
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

	it('generates a node without media statistics on request', async () => {
		const db = client.db('dashboard_test_generator_media_stats');
		await db.dropDatabase();

		try {
			await generate(db, {
				scenario: 'S',
				days: 1,
				statsMode: 'track',
				seed: 7,
				retentionDays: { events: 7, stats: 7, tracks: 7, entities: 90 },
				timeseries: true,
				rollups: { fiveMinute: true, nodes: true, roomSums: true },
				mediaNodes: true,
				nodesWithoutMediaStats: 1
			});

			const nodes = await db
				.collection<{ _id: string; mediaStats: boolean; rtcEngine: string; mediaNode?: string }>('nodes')
				.find()
				.toArray();
			const unmarked = nodes.filter((node) => !node.mediaStats).map((node) => node._id);

			expect(nodes.every((node) => node.rtcEngine === (node.mediaStats ? 'pion' : 'mediasoup'))).toBe(true);
			expect(nodes.find((node) => !node.mediaStats)?.mediaNode).toBe('media-node-10-0-0-3');

			expect(nodes.filter((node) => node.mediaStats)).toHaveLength(nodes.length - 1);
			expect(unmarked).toHaveLength(1);

			const rooms = db.collection<{ mediaStats?: boolean; quality: { scoreCount: number } }>('rooms');
			const marked = await rooms.find({ nodeId: unmarked[0] }).toArray();

			expect(marked.length).toBeGreaterThan(0);
			expect(marked.every((room) => room.mediaStats === false && room.quality.scoreCount === 0)).toBe(true);
			expect(await rooms.countDocuments({ nodeId: unmarked[0], 'bytes.up': { $ne: 0 } })).toBe(0);
			expect(await rooms.countDocuments({ nodeId: { $ne: unmarked[0] }, mediaStats: { $exists: true } })).toBe(0);
			expect(
				await db.collection('participants').countDocuments({ nodeId: unmarked[0], mediaStats: { $ne: false } })
			).toBe(0);
			expect(await db.collection('track_stats').countDocuments({ 'meta.nodeId': unmarked[0] })).toBe(0);
			expect(await db.collection('track_stats').countDocuments({})).toBeGreaterThan(0);
			expect(
				await db.collection('rooms').countDocuments({ $nor: [{ $jsonSchema: CONTRACT_SCHEMAS.rooms }] })
			).toBe(0);

			// Rollups carry the media statistics marks of the nodes of the rooms they count; those holding only the
			// aggregator's samples carry none.
			const label = nodes.find((node) => node._id === unmarked[0]) as { mediaNode?: string } | undefined;
			const hourly = db.collection('analytics_hourly');
			const counted = { 'rooms.created': { $exists: true } };

			expect(
				await hourly.countDocuments({
					scope: 'global',
					'mediaStats.reported': true,
					'mediaStats.missing': true
				})
			).toBeGreaterThan(0);
			expect(await hourly.countDocuments({ scope: `node:${String(label?.mediaNode)}` })).toBeGreaterThan(0);
			expect(
				await hourly.countDocuments({
					...counted,
					scope: `node:${String(label?.mediaNode)}`,
					$or: [{ 'mediaStats.reported': true }, { 'mediaStats.missing': { $ne: true } }]
				})
			).toBe(0);
			expect(
				await hourly.countDocuments({
					...counted,
					scope: { $nin: ['global', `node:${String(label?.mediaNode)}`] },
					$or: [{ 'mediaStats.missing': true }, { 'mediaStats.reported': { $ne: true } }]
				})
			).toBe(0);

			for (const collection of ['analytics_5min', 'analytics_hourly', 'analytics_daily']) {
				expect(
					await db
						.collection(collection)
						.countDocuments({ $nor: [{ $jsonSchema: CONTRACT_SCHEMAS[collection as 'analytics_hourly'] }] })
				).toBe(0);
			}
		} finally {
			await db.dropDatabase();
		}
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

			// A room is recorded when one of its egresses has a file or segments output, all of which went active.
			const recordingRooms = new Set(
				(
					(await db
						.collection('egresses')
						.distinct('roomSid', { 'outputs.kind': { $in: ['file', 'segments'] } })) as string[]
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

	it('marks every rollup as reported when every node reports media statistics', async () => {
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
});

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
