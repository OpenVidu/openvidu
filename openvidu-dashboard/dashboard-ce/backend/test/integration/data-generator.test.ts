import { CONTRACT_SCHEMAS } from '@openvidu-dashboard/data-generator/contract';
import { generate } from '@openvidu-dashboard/data-generator/generator';
import { COLLECTION_NAMES } from '@openvidu-dashboard/data-generator/schema';
import type {
	EgressDocument,
	EventDocument,
	HourlyRollupDocument,
	IngressSessionDocument
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
