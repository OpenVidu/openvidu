import type { Db, Document } from 'mongodb';
import { afterAll, afterEach, beforeAll, describe, expect, inject, it } from 'vitest';

import {
	Collection,
	type DeletionJob,
	type InfoResponse,
	LegacyCollection,
	type StatusResponse
} from '@openvidu-dashboard/typings';

import { deletionJob } from '../../src/deletions/deletion-schemas.js';
import { bootClient, type Client, json } from '../support/api-client.js';
import {
	insertWorld,
	merge,
	remaining,
	retentionDocument,
	room,
	sizes,
	postDeletion,
	settledDeletion,
	type World
} from '../support/deletion-world.js';

const mongoUri = inject('mongoUri');
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const ago = (ms: number) => new Date(Date.now() - ms);

const migrationFields = {
	writerVersion: '3.10.0',
	fromSchemaVersion: 0,
	counts: { events: 0, stats: 0, synthetic: 0, skipped: 0 },
	processed: 10,
	total: 10
};

async function reset(db: Db, documents: Document[] = []): Promise<void> {
	for (const collection of [
		Collection.SCHEMA_META,
		Collection.ROOMS,
		Collection.PARTICIPANTS,
		Collection.TRACKS,
		Collection.TRACK_SUBSCRIPTIONS,
		Collection.EVENTS,
		Collection.TRACK_STATS,
		Collection.EGRESSES,
		Collection.ANALYTICS_5MIN,
		Collection.ANALYTICS_HOURLY,
		Collection.ANALYTICS_DAILY
	]) {
		await db.collection(collection).deleteMany({});
	}

	await db.collection(Collection.SCHEMA_META).insertMany([retentionDocument(), ...documents]);
}

function rollups(): World {
	const old = ago(10 * DAY);
	const rollup = (bucket: Date) => ({ _id: `global:${bucket.toISOString()}`, scope: 'global', bucket });

	return {
		[Collection.ANALYTICS_5MIN]: [rollup(old)],
		[Collection.ANALYTICS_HOURLY]: [rollup(old)],
		[Collection.ANALYTICS_DAILY]: [rollup(new Date(Math.floor(old.getTime() / DAY) * DAY))]
	};
}

/** Two legacy collections of 3 and 2 documents. */
async function seedLegacy(db: Db): Promise<void> {
	await db.collection(LegacyCollection.EVENTS).insertMany([{ a: 1 }, { a: 2 }, { a: 3 }]);
	await db.collection(LegacyCollection.STATS).insertMany([{ b: 1 }, { b: 2 }]);
}

async function collectionNames(db: Db): Promise<string[]> {
	return (await db.listCollections({}, { nameOnly: true }).toArray()).map((collection) => collection.name);
}

describe.skipIf(mongoUri === '')('deletions API', () => {
	let ce: Client;
	let db: Db;

	beforeAll(async () => {
		ce = await bootClient(mongoUri);
		db = ce.dashboard.db;
	});

	afterAll(async () => {
		await ce.dashboard.stop();
	});

	afterEach(async () => {
		// No test leaves a job running into the next one.
		const deletion = (await json<StatusResponse>(ce, '/status')).deletion;

		if (deletion?.state === 'running') {
			await settledDeletion(ce);
		}
	});

	it('Events deletion accepted', async () => {
		const ended = room('RM_ended', { endedAt: ago(DAY), events: 30 });

		await reset(db);
		await insertWorld(db, ended);

		const before = Date.now();
		const response = await postDeletion(ce, { class: 'events' });
		const job = (await response.json()) as DeletionJob;

		expect(response.status).toBe(202);
		expect(deletionJob.parse(job)).toEqual(job);
		expect(job).toMatchObject({
			class: 'events',
			includeLegacy: false,
			state: 'running',
			deleted: 0,
			currentClass: 'events',
			collection: { index: 1, total: 1 }
		});
		expect(job.startedAt).toBe(job.cutoff);
		expect(Math.abs(Date.parse(job.cutoff) - before)).toBeLessThan(5_000);

		const done = await settledDeletion(ce);

		expect(done).toMatchObject({ id: job.id, state: 'completed', deleted: 30 });
		expect(await remaining(db, ended)).toEqual({ ...sizes(ended), [Collection.EVENTS]: 0 });
	});

	it('Legacy flag outside Total', async () => {
		await reset(db);

		const response = await postDeletion(ce, { class: 'events', includeLegacy: true });
		const body = (await response.json()) as { error: { code: string; details: { issues: { path: string[] }[] } } };

		expect(response.status).toBe(400);
		expect(body.error.code).toBe('VALIDATION_ERROR');
		expect(body.error.details.issues).toEqual([
			{ path: ['includeLegacy'], message: 'is only accepted with class all' }
		]);
		expect((await json<StatusResponse>(ce, '/status')).deletion).toBeUndefined();
	});

	it('Legacy flag outside Total: false is refused too, and unknown properties and classes', async () => {
		await reset(db);

		for (const body of [
			{ class: 'stats', includeLegacy: false },
			{ class: 'events', extra: 1 },
			{ class: 'nodes' },
			{}
		]) {
			expect((await postDeletion(ce, body)).status, JSON.stringify(body)).toBe(400);
		}

		expect((await json<StatusResponse>(ce, '/status')).deletion).toBeUndefined();
	});

	it('Deletion without a token', async () => {
		await reset(db);

		const response = await fetch(`${ce.dashboard.url}/api/v1/deletions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ class: 'events' })
		});

		expect(response.status).toBe(401);
		expect(((await response.json()) as { error: { code: string } }).error.code).toBe('UNAUTHORIZED');
		expect((await json<StatusResponse>(ce, '/status')).deletion).toBeUndefined();
	});

	it('Second deletion refused', async () => {
		await reset(db, [
			{
				_id: 'dashboard',
				deletion: {
					id: 'job-running',
					class: 'events',
					includeLegacy: false,
					state: 'running',
					cutoff: ago(MINUTE),
					startedAt: ago(MINUTE),
					heartbeatAt: new Date(),
					instance: 'elsewhere@2026-11-19T09:00:00.000Z',
					currentClass: 'events',
					collection: { index: 1, total: 1 },
					deleted: 5_000,
					deletedBy: { events: 5_000 },
					requestId: 'other'
				}
			}
		]);

		const response = await postDeletion(ce, { class: 'stats' });
		const body = (await response.json()) as {
			error: { code: string; message: string; details: { job: DeletionJob } };
		};

		expect(response.status).toBe(409);
		expect(body.error).toMatchObject({
			code: 'CONFLICT',
			message: 'A deletion is already running',
			details: { job: { id: 'job-running', class: 'events', state: 'running', deleted: 5_000 } }
		});
		expect(body.error.details.job).not.toHaveProperty('instance');
		expect(deletionJob.parse(body.error.details.job)).toEqual(body.error.details.job);
		await db.collection(Collection.SCHEMA_META).deleteOne({ _id: 'dashboard' } as Document);
	});

	it('Refused on another instance', async () => {
		const second = await bootClient(mongoUri, { DATABASE_NAME: db.databaseName });

		try {
			await reset(db);
			await db.collection<{ _id: string }>(Collection.EVENTS).insertMany(
				Array.from({ length: 30_000 }, (_, i) => ({
					_id: `AE_${String(i)}`,
					type: 'ROOM_STARTED',
					ts: ago(DAY)
				}))
			);

			const started = await postDeletion(ce, { class: 'entities' });
			const refused = await postDeletion(second, { class: 'all' });
			const body = (await refused.json()) as { error: { code: string; details: { job: DeletionJob } } };

			expect(started.status).toBe(202);
			expect(refused.status).toBe(409);
			expect(body.error.code).toBe('CONFLICT');
			expect(body.error.details.job.class).toBe('entities');

			const done = await settledDeletion(second);

			expect(done).toMatchObject({ class: 'entities', state: 'completed', deleted: 30_000 });
		} finally {
			await second.dashboard.stop();
		}
	});

	it('Legacy dropped during the rollback window', async () => {
		const ended = room('RM_ended', { endedAt: ago(DAY), events: 3 });

		await reset(db, [
			{
				_id: 'migration',
				state: 'completed',
				...migrationFields,
				legacyRetainedUntil: new Date(Date.now() + DAY)
			}
		]);
		await insertWorld(db, ended);
		await seedLegacy(db);

		const response = await postDeletion(ce, { class: 'legacy' });
		const job = (await response.json()) as DeletionJob;

		expect(response.status).toBe(202);
		expect(job).toMatchObject({ class: 'legacy', currentClass: 'legacy', collection: { index: 1, total: 2 } });
		expect(await settledDeletion(ce)).toMatchObject({
			state: 'completed',
			deleted: 5,
			collection: { index: 2, total: 2 }
		});

		const names = await collectionNames(db);
		const storage = (await json<InfoResponse>(ce, '/info')).storage;

		expect(names).not.toContain(LegacyCollection.EVENTS);
		expect(names).not.toContain(LegacyCollection.STATS);
		expect(storage).not.toHaveProperty(LegacyCollection.EVENTS);
		expect(storage).not.toHaveProperty(LegacyCollection.STATS);
		expect(await remaining(db, ended)).toEqual(sizes(ended));
	});

	it('Legacy refused while the migration runs', async () => {
		await reset(db, [{ _id: 'migration', state: 'running', ...migrationFields }]);
		await seedLegacy(db);

		for (const body of [{ class: 'legacy' }, { class: 'all', includeLegacy: true }]) {
			const response = await postDeletion(ce, body);
			const error = ((await response.json()) as { error: { code: string; message: string } }).error;

			expect(response.status).toBe(409);
			expect(error).toEqual({ code: 'CONFLICT', message: 'The data before 3.10 is not kept for rollback' });
		}

		expect(await collectionNames(db)).toEqual(
			expect.arrayContaining([LegacyCollection.EVENTS, LegacyCollection.STATS])
		);
		expect((await json<StatusResponse>(ce, '/status')).deletion).toBeUndefined();
		await db.collection(LegacyCollection.EVENTS).drop();
		await db.collection(LegacyCollection.STATS).drop();
	});

	it('Legacy refused after its window', async () => {
		await reset(db, [{ _id: 'migration', state: 'completed', ...migrationFields, legacyRetainedUntil: ago(HOUR) }]);

		const response = await postDeletion(ce, { class: 'legacy' });

		expect(response.status).toBe(409);
		expect(((await response.json()) as { error: { message: string } }).error.message).toBe(
			'The data before 3.10 is not kept for rollback'
		);
	});

	const everyClass = () =>
		merge(
			room('RM_ended', {
				endedAt: ago(DAY),
				sessions: 2,
				tracks: 2,
				subscriptions: 2,
				events: 5,
				stats: 5,
				participantStats: 5,
				egress: 'ended'
			}),
			rollups()
		);

	it('Total without legacy', async () => {
		const world = everyClass();

		await reset(db, [
			{
				_id: 'migration',
				state: 'completed',
				...migrationFields,
				legacyRetainedUntil: new Date(Date.now() + DAY)
			}
		]);
		await insertWorld(db, world);
		await seedLegacy(db);

		expect((await postDeletion(ce, { class: 'all' })).status).toBe(202);
		expect(await settledDeletion(ce)).toMatchObject({ state: 'completed', collection: { index: 17, total: 17 } });
		expect(Object.values(await remaining(db, world)).every((count) => count === 0)).toBe(true);
		expect(await db.collection(LegacyCollection.EVENTS).countDocuments()).toBe(3);
		expect(await db.collection(LegacyCollection.STATS).countDocuments()).toBe(2);
		await db.collection(LegacyCollection.EVENTS).drop();
		await db.collection(LegacyCollection.STATS).drop();
	});

	it('Total with legacy', async () => {
		const world = everyClass();

		await reset(db, [
			{
				_id: 'migration',
				state: 'completed',
				...migrationFields,
				legacyRetainedUntil: new Date(Date.now() + DAY)
			}
		]);
		await insertWorld(db, world);
		await seedLegacy(db);

		expect((await postDeletion(ce, { class: 'all', includeLegacy: true })).status).toBe(202);

		const done = await settledDeletion(ce);

		expect(done).toMatchObject({ state: 'completed', includeLegacy: true, collection: { index: 19, total: 19 } });
		expect(Object.values(await remaining(db, world)).every((count) => count === 0)).toBe(true);
		expect(await collectionNames(db)).not.toEqual(expect.arrayContaining([LegacyCollection.EVENTS]));
		expect(await collectionNames(db)).not.toEqual(expect.arrayContaining([LegacyCollection.STATS]));
	});
});
