import { CONTRACT_SCHEMAS } from '@openvidu-dashboard/data-generator/contract';
import { generate } from '@openvidu-dashboard/data-generator/generator';
import { COLLECTION_NAMES, keepLive } from '@openvidu-dashboard/data-generator/schema';
import type {
	EgressDocument,
	EventDocument,
	HourlyRollupDocument,
	IngressSessionDocument,
	NodeDocument
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

			// Rollups carry the media statistics marks of the nodes of the rooms they count.
			const label = nodes.find((node) => node._id === unmarked[0]) as { mediaNode?: string } | undefined;
			const hourly = db.collection('analytics_hourly');

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
					scope: `node:${String(label?.mediaNode)}`,
					$or: [{ 'mediaStats.reported': true }, { 'mediaStats.missing': { $ne: true } }]
				})
			).toBe(0);
			expect(
				await hourly.countDocuments({
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
				expect(
					await rollups.countDocuments({
						$or: [{ 'mediaStats.missing': true }, { 'mediaStats.reported': { $ne: true } }]
					})
				).toBe(0);
			}
		} finally {
			await db.dropDatabase();
		}
	});
});

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
