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
import { type Document, type Filter, MongoClient } from 'mongodb';
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest';

/**
 * The data generator writes what the writer would: every document of every collection, `track_stats` included (a
 * time-series collection takes no validator), satisfies the contract validator in both stats modes.
 */

const mongoUri = inject('mongoUri');
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
			expect(
				nodes.every(
					(node) => node.rtcEngine === (node.mediaNode === 'media-node-10-0-0-2' ? 'mediasoup' : 'pion')
				)
			).toBe(true);
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

			expect(nodes.find((node) => !node.mediaStats)?.mediaNode).toBe('media-node-10-0-0-3');
			// Engines of the generated nodes: the engine follows the media node, not the media statistics.
			expect(nodes.filter((node) => !node.mediaStats).every((node) => node.rtcEngine === 'pion')).toBe(true);
			expect(
				nodes
					.filter((node) => node.mediaNode === 'media-node-10-0-0-2')
					.map((node) => [node.rtcEngine, node.mediaStats])
			).toEqual([['mediasoup', true]]);

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

			const reconciled = await docs<IngressSessionDocument>('ingress_sessions', { closedBy: 'reconciler' });

			expect(reconciled.length).toBeGreaterThan(0);

			for (const session of reconciled) {
				expect([session.status, session.error], session._id).toEqual(['error', 'ingress lost (reconciled)']);
			}

			const synthetic = await docs<EventDocument>('events', {
				type: 'INGRESS_ENDED',
				synthetic: true,
				ingressSessionId: { $in: reconciled.map((s) => s._id) }
			});

			expect(synthetic.length).toBeGreaterThan(0);
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

			// Every toggle ends as it started: a track unmuted at publish ends unmuted.
			const muted = await countBy('events', 'trackSid', { type: 'TRACK_MUTED' });
			const unmuted = await countBy('events', 'trackSid', { type: 'TRACK_UNMUTED' });

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

				for (const p of participants.filter((s) => s.quality.scoreCount > 0)) {
					expect(p.lastStatsAt, p._id).toEqual(p.quality.lastScoreAt);
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
