import { randomUUID } from 'node:crypto';

import { type Db, type Document, MongoClient } from 'mongodb';
import { afterAll, afterEach, beforeAll, describe, expect, inject, it } from 'vitest';

import { Collection } from '@openvidu-dashboard/typings';

import {
	insertWorld,
	merge,
	remaining,
	retentionDocument,
	room,
	runJob,
	sizes,
	type World,
	WORLD_RETENTION_MS
} from '../support/deletion-world.js';
import { createContractCollections } from '../support/rooms-seed.js';

const mongoUri = inject('mongoUri');
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const ago = (cutoff: Date, ms: number) => new Date(cutoff.getTime() - ms);
const after = (cutoff: Date, ms: number) => new Date(cutoff.getTime() + ms);
const none = (world: World) => Object.fromEntries(Object.keys(sizes(world)).map((collection) => [collection, 0]));

describe.skipIf(mongoUri === '')('what a deletion deletes and keeps', () => {
	let client: MongoClient;
	let db: Db;

	beforeAll(async () => {
		client = await MongoClient.connect(mongoUri);
	});

	afterAll(async () => {
		await client.close();
	});

	/** A fresh database with the contract collections, `track_stats` a time series, and a year of retention. */
	async function fresh(world: World): Promise<Db> {
		db = client.db(`deletions_rules_${randomUUID().slice(0, 8)}`);
		await createContractCollections(db);
		await db.collection(Collection.SCHEMA_META).insertOne(retentionDocument());
		await insertWorld(db, world);

		return db;
	}

	afterEach(async () => {
		await db.dropDatabase();
	});

	it('Room in progress kept whole', async () => {
		const cutoff = new Date();
		const live = room('RM_live', {
			createdAt: ago(cutoff, 2 * HOUR),
			sessions: 1,
			activeSessions: 1,
			tracks: 4,
			subscriptions: 4,
			events: 10,
			stats: 20,
			participantStats: 10,
			egress: 'ended',
			recordedAt: ago(cutoff, HOUR)
		});
		const old = room('RM_old', { endedAt: ago(cutoff, DAY), sessions: 2, tracks: 2, events: 5, stats: 5 });

		await fresh(merge(live, old));
		await runJob(db, 'entities', cutoff);

		expect(await remaining(db, live)).toEqual(sizes(live));
		expect(await remaining(db, old)).toEqual(none(old));
	});

	it('Recent data kept', async () => {
		const cutoff = new Date();
		const recent = room('RM_recent', { endedAt: ago(cutoff, 3 * MINUTE), sessions: 2, tracks: 2, events: 4 });
		const other = room('RM_other', { endedAt: ago(cutoff, HOUR), events: 1 });
		const lateEvent = {
			_id: 'AE_late',
			type: 'ROOM_FINISHED',
			ts: ago(cutoff, 4 * MINUTE),
			roomSid: 'RM_other',
			nodeId: 'ND_test',
			synthetic: false,
			payload: {}
		};
		const gone = room('RM_gone', { endedAt: ago(cutoff, 6 * MINUTE), sessions: 1, events: 2 });

		await fresh(merge(recent, other, gone, { [Collection.EVENTS]: [lateEvent] }));
		await runJob(db, 'entities', cutoff);

		expect(await remaining(db, recent)).toEqual(sizes(recent));
		expect(await db.collection(Collection.EVENTS).countDocuments({ _id: 'AE_late' } as Document)).toBe(1);
		expect(await remaining(db, gone)).toEqual(none(gone));
	});

	it('Open entities without a room kept', async () => {
		const cutoff = new Date();
		const longAgo = ago(cutoff, 200 * DAY);
		const world: World = {
			[Collection.EGRESSES]: [
				{
					_id: 'EG_web',
					status: 'active',
					startedAt: ago(cutoff, DAY),
					updatedAt: ago(cutoff, DAY),
					expiresAt: null
				}
			],
			[Collection.INGRESS_SESSIONS]: [
				{
					_id: 'IS_live',
					ingressId: 'IN_live',
					status: 'publishing',
					startedAt: ago(cutoff, DAY),
					expiresAt: null
				}
			],
			[Collection.INGRESSES]: [
				{ _id: 'IN_live', status: 'publishing', createdAt: ago(cutoff, 300 * DAY), expiresAt: null },
				{ _id: 'IN_reusable', status: 'inactive', createdAt: ago(cutoff, 300 * DAY), expiresAt: null }
			],
			[Collection.EVENTS]: [
				{
					_id: 'AE_web',
					type: 'EGRESS_STARTED',
					ts: ago(cutoff, DAY),
					egressId: 'EG_web',
					nodeId: 'n',
					synthetic: false,
					payload: {}
				},
				{
					_id: 'AE_live',
					type: 'INGRESS_STARTED',
					ts: ago(cutoff, DAY),
					ingressId: 'IN_live',
					nodeId: 'n',
					synthetic: false,
					payload: {}
				},
				{
					_id: 'AE_reusable',
					type: 'INGRESS_ENDED',
					ts: longAgo,
					ingressId: 'IN_reusable',
					nodeId: 'n',
					synthetic: false,
					payload: {}
				}
			]
		};

		await fresh(world);
		await runJob(db, 'entities', cutoff);

		expect(await remaining(db, world)).toEqual(sizes(world));
	});

	it('Nodes never deleted', async () => {
		const cutoff = new Date();
		const nodes: World = {
			[Collection.NODES]: [
				{
					_id: 'ND_stopped',
					firstSeenAt: ago(cutoff, DAY),
					lastSeenAt: ago(cutoff, HOUR),
					stoppedAt: ago(cutoff, HOUR)
				},
				{ _id: 'ND_silent', firstSeenAt: ago(cutoff, 60 * DAY), lastSeenAt: ago(cutoff, 30 * DAY) }
			]
		};

		await fresh(merge(nodes, room('RM_old', { endedAt: ago(cutoff, DAY), events: 2 })));
		await runJob(db, 'all', cutoff);

		expect(await remaining(db, nodes)).toEqual(sizes(nodes));
	});

	it('Room ending during the job', async () => {
		const cutoff = new Date();
		const live = room('RM_live', { createdAt: ago(cutoff, HOUR), sessions: 1, activeSessions: 1, events: 2 });
		const old = room('RM_old', { endedAt: ago(cutoff, DAY), events: 3 });
		let ended = false;

		await fresh(merge(live, old));
		await runJob(db, 'entities', cutoff, {
			// After the first batch, the room and its last session end.
			sleep: async () => {
				if (!ended) {
					ended = true;
					const endedAt = new Date();

					await db.collection(Collection.ROOMS).updateOne({ _id: 'RM_live' } as Document, {
						$set: { status: 'closed', endedAt, expiresAt: after(endedAt, WORLD_RETENTION_MS) }
					});
					await db
						.collection(Collection.PARTICIPANTS)
						.updateMany(
							{ roomSid: 'RM_live' },
							{ $set: { status: 'left', leftAt: endedAt, expiresAt: after(endedAt, WORLD_RETENTION_MS) } }
						);
				}
			}
		});

		expect(ended).toBe(true);
		expect(await remaining(db, live)).toEqual(sizes(live));
	});

	it('Data after the cutoff untouched', async () => {
		const cutoff = new Date(Date.now() - 10 * 1000);
		const old = room('RM_old', { endedAt: ago(cutoff, DAY), events: 3 });
		const late = room('RM_late', { createdAt: after(cutoff, 1000), endedAt: after(cutoff, 5000), events: 4 });
		let started = false;

		await fresh(old);
		await runJob(db, 'events', cutoff, {
			sleep: async () => {
				if (!started) {
					started = true;
					await insertWorld(db, late);
				}
			}
		});

		expect(started).toBe(true);
		expect(await remaining(db, { [Collection.EVENTS]: late[Collection.EVENTS] })).toEqual({
			[Collection.EVENTS]: 4
		});
		expect(await remaining(db, { [Collection.EVENTS]: old[Collection.EVENTS] })).toEqual({
			[Collection.EVENTS]: 0
		});
	});

	it('Data after the cutoff untouched: the tracks and subscriptions of a room that ends during a Tracks deletion', async () => {
		const cutoff = new Date(Date.now() - 10 * 1000);
		const old = room('RM_old', { endedAt: ago(cutoff, DAY), tracks: 2, subscriptions: 2, stats: 2 });
		const late = room('RM_late', {
			createdAt: after(cutoff, 1000),
			endedAt: after(cutoff, 5000),
			tracks: 2,
			subscriptions: 2
		});
		const failed = {
			_id: 'TR_late_0:failed',
			trackSid: 'TR_late_0',
			roomSid: 'RM_late',
			subscriberSid: 'PA_x',
			status: 'failed',
			expiresAt: after(cutoff, 5000 + WORLD_RETENTION_MS)
		};
		let started = false;

		await fresh(old);
		await runJob(db, 'tracks', cutoff, {
			sleep: async () => {
				if (!started) {
					started = true;
					await insertWorld(db, merge(late, { [Collection.TRACK_SUBSCRIPTIONS]: [failed] }));
				}
			}
		});

		expect(started).toBe(true);
		expect(await db.collection(Collection.TRACKS).countDocuments({ roomSid: 'RM_late' })).toBe(2);
		expect(await db.collection(Collection.TRACK_SUBSCRIPTIONS).countDocuments({ roomSid: 'RM_late' })).toBe(3);
		expect(await db.collection(Collection.TRACKS).countDocuments({ roomSid: 'RM_old' })).toBe(0);
	});

	it('Events deletion leaves entities', async () => {
		const cutoff = new Date();
		const ended = room('RM_ended', { endedAt: ago(cutoff, DAY), sessions: 3, tracks: 6, events: 40, stats: 120 });

		await fresh(ended);
		await runJob(db, 'events', cutoff);

		expect(await remaining(db, ended)).toEqual({ ...sizes(ended), [Collection.EVENTS]: 0 });
	});

	it('Per-track stats go with the tracks', async () => {
		const cutoff = new Date();
		const ended = room('RM_ended', {
			endedAt: ago(cutoff, DAY),
			sessions: 2,
			tracks: 4,
			subscriptions: 6,
			stats: 80,
			participantStats: 30
		});

		await fresh(ended);
		await runJob(db, 'tracks', cutoff);

		expect(await remaining(db, ended)).toMatchObject({
			[Collection.ROOMS]: 1,
			[Collection.PARTICIPANTS]: 2,
			[Collection.TRACKS]: 0,
			[Collection.TRACK_SUBSCRIPTIONS]: 0,
			[Collection.TRACK_STATS]: 30
		});
		expect(
			await db.collection(Collection.TRACK_STATS).countDocuments({ 'meta.trackSid': { $exists: false } })
		).toBe(30);
	});

	it('Per-track stats go with the tracks: on a plain track_stats collection', async () => {
		const cutoff = new Date();
		const ended = room('RM_ended', { endedAt: ago(cutoff, DAY), tracks: 4, stats: 80, participantStats: 30 });

		db = client.db(`deletions_rules_${randomUUID().slice(0, 8)}`);
		await db.createCollection(Collection.TRACK_STATS);
		await db
			.collection(Collection.TRACK_STATS)
			.createIndexes([{ key: { ts: 1 }, name: 'ts_ttl', expireAfterSeconds: 31_536_000 }]);
		await createContractCollections(db);
		await db.collection(Collection.SCHEMA_META).insertOne(retentionDocument());
		await insertWorld(db, ended);

		await runJob(db, 'tracks', cutoff);

		expect(await db.collection(Collection.TRACK_STATS).countDocuments({})).toBe(30);
	});

	it('Entities with their data', async () => {
		const cutoff = new Date();
		const ended = room('RM_ended', {
			endedAt: ago(cutoff, DAY),
			sessions: 3,
			tracks: 5,
			subscriptions: 9,
			events: 60,
			stats: 200,
			egress: 'ended'
		});
		const deletedAt = ago(cutoff, 10 * DAY);
		const ingress: World = {
			[Collection.INGRESSES]: [
				{
					_id: 'IN_deleted',
					status: 'deleted',
					createdAt: ago(cutoff, 20 * DAY),
					deletedAt,
					expiresAt: after(deletedAt, WORLD_RETENTION_MS)
				}
			],
			[Collection.INGRESS_SESSIONS]: [
				{
					_id: 'IS_deleted',
					ingressId: 'IN_deleted',
					status: 'inactive',
					startedAt: ago(cutoff, 15 * DAY),
					endedAt: ago(cutoff, 14 * DAY),
					expiresAt: after(ago(cutoff, 14 * DAY), WORLD_RETENTION_MS)
				}
			]
		};

		await fresh(merge(ended, ingress));
		await runJob(db, 'entities', cutoff);

		expect(await remaining(db, merge(ended, ingress))).toEqual(none(merge(ended, ingress)));
	});

	it('Entities deletion run again', async () => {
		const cutoff = new Date();
		const ended = room('RM_ended', {
			endedAt: ago(cutoff, DAY),
			sessions: 2,
			tracks: 3,
			subscriptions: 3,
			events: 10,
			stats: 10
		});
		const live = room('RM_live', {
			createdAt: ago(cutoff, HOUR),
			activeSessions: 1,
			tracks: 2,
			events: 3,
			stats: 3
		});

		await fresh(merge(ended, live));
		// The interrupted job deleted the events and the stats of the ended rooms.
		await runJob(db, 'events', cutoff);
		await runJob(db, 'stats', cutoff);
		await runJob(db, 'entities', new Date());

		expect(await remaining(db, ended)).toEqual(none(ended));
		expect(await remaining(db, live)).toEqual(sizes(live));
	});

	it('Rollup buckets kept at 10:07', async () => {
		const cutoff = new Date('2026-11-19T10:07:00Z');
		const rollups = (size: number, from: Date) =>
			['global', 'node:ND_a'].flatMap((scope) =>
				Array.from({ length: Math.floor((cutoff.getTime() - from.getTime()) / size) + 1 }, (_, i) => {
					const bucket = new Date(from.getTime() + i * size);

					return { _id: `${scope}:${bucket.toISOString()}`, scope, bucket };
				}).filter((document) => document.bucket <= cutoff)
			);
		const threeDaysAgo = new Date('2026-11-17T00:00:00Z');

		await fresh({
			[Collection.ANALYTICS_5MIN]: rollups(5 * MINUTE, threeDaysAgo),
			[Collection.ANALYTICS_HOURLY]: rollups(HOUR, threeDaysAgo),
			[Collection.ANALYTICS_DAILY]: rollups(DAY, threeDaysAgo)
		});
		await runJob(db, 'rollups-5min', cutoff);
		await runJob(db, 'rollups-hourly', cutoff);
		await runJob(db, 'rollups-daily', cutoff);

		const kept = async (collection: string) =>
			(await db.collection(collection).find({}).sort({ _id: 1 }).toArray()).map((document) =>
				String(document._id)
			);

		expect(await kept(Collection.ANALYTICS_5MIN)).toEqual([
			'global:2026-11-19T10:00:00.000Z',
			'global:2026-11-19T10:05:00.000Z',
			'node:ND_a:2026-11-19T10:00:00.000Z',
			'node:ND_a:2026-11-19T10:05:00.000Z'
		]);
		expect(await kept(Collection.ANALYTICS_HOURLY)).toEqual([
			'global:2026-11-19T09:00:00.000Z',
			'global:2026-11-19T10:00:00.000Z',
			'node:ND_a:2026-11-19T09:00:00.000Z',
			'node:ND_a:2026-11-19T10:00:00.000Z'
		]);
		expect(await kept(Collection.ANALYTICS_DAILY)).toEqual([
			'global:2026-11-18T00:00:00.000Z',
			'global:2026-11-19T00:00:00.000Z',
			'node:ND_a:2026-11-18T00:00:00.000Z',
			'node:ND_a:2026-11-19T00:00:00.000Z'
		]);
	});

	it('Entities deletion keeps rollups', async () => {
		const cutoff = new Date();
		const hourly = Array.from({ length: 30 * 24 }, (_, i) => {
			const bucket = new Date(Math.floor(cutoff.getTime() / HOUR) * HOUR - i * HOUR);

			return { _id: `global:${bucket.toISOString()}`, scope: 'global', bucket };
		});

		await fresh(
			merge({ [Collection.ANALYTICS_HOURLY]: hourly }, room('RM_old', { endedAt: ago(cutoff, DAY), events: 2 }))
		);
		await runJob(db, 'entities', cutoff);

		expect(await db.collection(Collection.ANALYTICS_HOURLY).countDocuments({})).toBe(hourly.length);
	});
});
