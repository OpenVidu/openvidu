import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { hostname } from 'node:os';
import { Writable } from 'node:stream';

import { createCollections } from '@openvidu-dashboard/data-generator/schema';
import type { Container } from 'inversify';
import { BSON, type Db, type Document, MongoClient, MongoServerError } from 'mongodb';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { createLogger, format, transports } from 'winston';

import {
	Collection,
	type DashboardDeletionJob,
	type InfoResponse,
	type StatusResponse
} from '@openvidu-dashboard/typings';

import { TOKENS } from '../../src/di/tokens.js';
import { DeletionRecordsStore } from '../../src/deletions/deletion-records.js';
import { DeletionRunner } from '../../src/deletions/deletion-runner.js';
import { bootClient, type Client, json } from '../support/api-client.js';
import { insertWorld, postDeletion, retentionDocument, room, settledDeletion } from '../support/deletion-world.js';
import { createContractCollections } from '../support/rooms-seed.js';
import { silentLogger } from '../support/silent-logger.js';

const mongoUri = inject('mongoUri');
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const DAY = 86_400_000;

const ago = (ms: number) => new Date(Date.now() - ms);

function runningJob(overrides: Partial<DashboardDeletionJob> = {}): DashboardDeletionJob {
	return {
		id: 'job-1',
		class: 'events',
		includeLegacy: false,
		state: 'running',
		cutoff: ago(10 * MINUTE),
		startedAt: ago(10 * MINUTE),
		heartbeatAt: new Date(),
		instance: 'elsewhere@2026-11-19T09:00:00.000Z',
		currentClass: 'events',
		collection: { index: 1, total: 1 },
		deleted: 0,
		deletedBy: {},
		requestId: 'request-1',
		...overrides
	};
}

async function setDashboard(db: Db, dashboard: Document | undefined): Promise<void> {
	await db.collection(Collection.SCHEMA_META).deleteOne({ _id: 'dashboard' } as Document);

	if (dashboard !== undefined) {
		await db.collection<{ _id: string }>(Collection.SCHEMA_META).insertOne({ _id: 'dashboard', ...dashboard });
	}
}

/** A dashboard on a fresh database with the contract collections and a year of retention. */
function bootWorld(env: NodeJS.ProcessEnv = {}, options: Parameters<typeof bootClient>[2] = {}): Promise<Client> {
	return bootClient(mongoUri, env, {
		seed: async (db) => {
			await createContractCollections(db);
			await db.collection(Collection.SCHEMA_META).insertOne(retentionDocument());
		},
		...options
	});
}

describe.skipIf(mongoUri === '')('deletion jobs', () => {
	let ce: Client;
	let db: Db;

	beforeAll(async () => {
		ce = await bootWorld();
		db = ce.dashboard.db;
	});

	afterAll(async () => {
		await ce.dashboard.stop();
	});

	it('Records accepted by the validator', async () => {
		const client = await MongoClient.connect(mongoUri);
		const validated = client.db(`deletions_validator_${String(Date.now())}`);

		try {
			await createCollections(validated, { timeseries: true, retention: {}, validationAction: 'error' });

			// Strict Extended JSON keeps the number types the validators check.
			const fixture = createRequire(import.meta.url).resolve(
				'@openvidu-dashboard/typings/fixtures/schema_meta.json'
			);
			const writer = (BSON.EJSON.parse(readFileSync(fixture, 'utf8'), { relaxed: false }) as Document[]).filter(
				(document) => document._id !== 'dashboard'
			);

			await validated.collection(Collection.SCHEMA_META).insertMany(writer);

			const records = new DeletionRecordsStore(validated);
			const acquired = await records.acquire({
				id: 'job-validated',
				class: 'events',
				includeLegacy: false,
				currentClass: 'events',
				total: 1,
				requestId: 'request-1'
			});

			expect(acquired).toHaveProperty('job');
			expect(await records.complete('job-validated', ['events'], new Date())).toBe(true);
			expect(await records.finish('job-validated', { state: 'completed' })).toBe(true);

			const dashboard = await records.read();

			expect(dashboard?.deletion?.state).toBe('completed');
			expect(dashboard?.deletions?.events?.completed).toBeDefined();
			const stored = await validated
				.collection(Collection.SCHEMA_META)
				.find({ _id: { $ne: 'dashboard' } } as Document, { promoteValues: false })
				.sort({ _id: 1 })
				.toArray();
			const strict = (documents: Document[]) => BSON.EJSON.stringify(documents, { relaxed: false });

			expect(strict(stored)).toBe(strict([...writer].sort((a, b) => String(a._id).localeCompare(String(b._id)))));
		} finally {
			await validated.dropDatabase();
			await client.close();
		}
	});

	it('Status of a running job', async () => {
		await setDashboard(db, {
			deletion: runningJob({
				class: 'entities',
				currentClass: 'events',
				deleted: 1_234_000,
				collection: { index: 2, total: 5 }
			})
		});

		const status = await json<StatusResponse>(ce, '/status');

		expect(status.deletion).toMatchObject({
			class: 'entities',
			state: 'running',
			deleted: 1_234_000,
			collection: { index: 2, total: 5 }
		});
	});

	it('Status without any job', async () => {
		await setDashboard(db, undefined);

		expect(await json<StatusResponse>(ce, '/status')).not.toHaveProperty('deletion');
	});

	it('Instance gone mid-job', async () => {
		const heartbeatAt = ago(61 * SECOND);

		await setDashboard(db, { deletion: runningJob({ heartbeatAt, deleted: 400_000 }) });

		const status = await json<StatusResponse>(ce, '/status');

		expect(status.deletion).toMatchObject({
			state: 'interrupted',
			deleted: 400_000,
			finishedAt: heartbeatAt.toISOString()
		});
		expect((await postDeletion(ce, { class: 'stats' })).status).toBe(202);

		const dashboard = await new DeletionRecordsStore(db).read();

		expect(dashboard?.deletions?.events?.incomplete).toEqual({ state: 'interrupted', at: heartbeatAt });
		await settledDeletion(ce);
	});

	it('Instance restarted mid-job', async () => {
		const restarted = await bootWorld(
			{},
			{
				seed: async (seeded) => {
					await createContractCollections(seeded);
					await seeded.collection(Collection.SCHEMA_META).insertMany([
						retentionDocument(),
						{
							_id: 'dashboard',
							deletion: runningJob({
								class: 'stats',
								currentClass: 'stats',
								instance: `${hostname()}@2020-01-01T00:00:00.000Z`
							})
						}
					]);
				}
			}
		);

		try {
			const status = await json<StatusResponse>(restarted, '/status');

			expect(status.deletion).toMatchObject({ class: 'stats', state: 'interrupted' });
			expect(
				(await new DeletionRecordsStore(restarted.dashboard.db).read())?.deletions?.stats?.incomplete?.state
			).toBe('interrupted');
		} finally {
			await restarted.dashboard.stop();
		}
	});

	it('Instance restarted mid-job: a job of another host is left running', async () => {
		const other = await bootWorld(
			{},
			{
				seed: async (seeded) => {
					await createContractCollections(seeded);
					await seeded
						.collection<{ _id: string; deletion: DashboardDeletionJob }>(Collection.SCHEMA_META)
						.insertOne({ _id: 'dashboard', deletion: runningJob({ class: 'stats' }) });
				}
			}
		);

		try {
			expect((await json<StatusResponse>(other, '/status')).deletion?.state).toBe('running');
		} finally {
			await other.dashboard.stop();
		}
	});

	it('Database user without delete rights', async () => {
		await setDashboard(db, { deletion: runningJob() });
		await db.collection(Collection.EVENTS).deleteMany({});
		await insertWorld(db, room('RM_rights', { endedAt: ago(DAY), events: 5 }));

		const refusing = new Proxy(db, {
			get(target, property, receiver) {
				if (property !== 'collection') {
					return Reflect.get(target, property, receiver) as unknown;
				}

				return (name: string) => {
					const collection = target.collection(name);

					return new Proxy(collection, {
						get(inner, key, innerReceiver) {
							if (key === 'deleteMany') {
								return () =>
									Promise.reject(
										new MongoServerError({
											code: 13,
											errmsg: 'not authorized on test to execute command'
										})
									);
							}

							const value = Reflect.get(inner, key, innerReceiver) as unknown;

							return typeof value === 'function'
								? (value as (...args: unknown[]) => unknown).bind(inner)
								: value;
						}
					});
				};
			}
		});
		const logger = silentLogger();

		await new DeletionRunner({
			db: refusing,
			records: new DeletionRecordsStore(db),
			logger,
			sleep: () => Promise.resolve()
		}).run(runningJob({ cutoff: new Date(), startedAt: new Date() }));

		const status = await json<StatusResponse>(ce, '/status');

		expect(status.deletion).toMatchObject({
			state: 'failed',
			error: 'The database user cannot delete data',
			deleted: 0
		});
		expect(logger.lines.some((line) => line.startsWith('error: Deletion failed'))).toBe(true);
		expect(await db.collection(Collection.EVENTS).countDocuments({ roomSid: 'RM_rights' })).toBe(5);
		expect((await json<InfoResponse>(ce, '/info')).deletions.events?.incomplete?.state).toBe('failed');
	});

	it('Completed Events deletion in info', async () => {
		const cutoff = new Date('2026-11-19T10:07:00Z');
		const finishedAt = new Date('2026-11-19T10:31:12Z');

		await setDashboard(db, {
			deletion: runningJob({ cutoff, startedAt: cutoff, state: 'completed', finishedAt }),
			deletions: {
				events: { completed: { cutoff, endedBefore: new Date('2026-11-19T10:02:00Z'), finishedAt } }
			}
		});

		const info = await json<InfoResponse>(ce, '/info');

		expect(info.deletions).toEqual({
			events: {
				completed: {
					cutoff: '2026-11-19T10:07:00.000Z',
					endedBefore: '2026-11-19T10:02:00.000Z',
					finishedAt: '2026-11-19T10:31:12.000Z'
				}
			}
		});
	});

	it('Interrupted Total in info', async () => {
		const cutoff = ago(30 * MINUTE);
		const heartbeatAt = ago(10 * MINUTE);
		const completed = {
			cutoff,
			endedBefore: new Date(cutoff.getTime() - 5 * MINUTE),
			finishedAt: ago(20 * MINUTE)
		};

		await setDashboard(db, {
			deletion: runningJob({ class: 'all', cutoff, startedAt: cutoff, heartbeatAt, currentClass: 'tracks' }),
			deletions: { events: { completed }, stats: { completed } }
		});

		const { deletions } = await json<InfoResponse>(ce, '/info');
		const interrupted = { incomplete: { state: 'interrupted', at: heartbeatAt.toISOString() } };

		expect(deletions.events?.completed).toBeDefined();
		expect(deletions.stats?.completed).toBeDefined();
		expect(deletions.events).not.toHaveProperty('incomplete');

		for (const key of ['tracks', 'entities', 'rollups-5min', 'rollups-hourly', 'rollups-daily'] as const) {
			expect(deletions[key], key).toEqual(interrupted);
		}
	});

	it('Entities records its details', async () => {
		await setDashboard(db, undefined);
		await insertWorld(db, room('RM_details', { endedAt: ago(DAY), tracks: 1, events: 2, stats: 2 }));

		expect((await postDeletion(ce, { class: 'entities' })).status).toBe(202);
		expect((await settledDeletion(ce)).state).toBe('completed');

		const { deletions } = await json<InfoResponse>(ce, '/info');

		expect(Object.keys(deletions).sort()).toEqual(['entities', 'events', 'stats', 'tracks']);
		expect(deletions.events).toEqual(deletions.entities);
		expect(deletions.stats).toEqual(deletions.entities);
		expect(deletions.tracks).toEqual(deletions.entities);
	});

	it('Storage refreshed on another instance', async () => {
		const second = await bootClient(mongoUri, { DATABASE_NAME: db.databaseName });

		try {
			await setDashboard(db, undefined);
			await db.collection(Collection.EVENTS).deleteMany({});
			await insertWorld(db, room('RM_storage', { endedAt: ago(DAY), events: 25 }));

			expect((await json<InfoResponse>(second, '/info')).storage.events?.documents).toBe(25);
			expect((await postDeletion(ce, { class: 'events' })).status).toBe(202);
			expect((await settledDeletion(ce)).state).toBe('completed');
			expect((await json<InfoResponse>(second, '/info')).storage.events?.documents).toBe(0);
		} finally {
			await second.dashboard.stop();
		}
	});
});

describe.skipIf(mongoUri === '')('deletion log', () => {
	it('Log lines of a deletion', async () => {
		const lines: Record<string, unknown>[] = [];
		const logger = createLogger({
			level: 'info',
			format: format.json(),
			transports: [
				new transports.Stream({
					stream: new Writable({
						write(chunk: Buffer, _encoding, callback) {
							lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
							callback();
						}
					})
				})
			]
		});
		const client = await bootWorld(
			{},
			{
				configure: (container: Container) => {
					container.rebind(TOKENS.Logger).toConstantValue(logger);
				}
			}
		);

		try {
			await insertWorld(client.dashboard.db, room('RM_log', { endedAt: ago(DAY), events: 12 }));
			expect((await postDeletion(client, { class: 'events' }, { 'X-Request-Id': 'caddy-7f3a' })).status).toBe(
				202
			);
			expect((await settledDeletion(client)).state).toBe('completed');

			const deletionLines = () => lines.filter((line) => line.logger === 'deletions');

			// The end line follows the record of the outcome, which the status may report first.
			await expect.poll(() => deletionLines().length).toBe(2);

			const [start, end] = deletionLines();

			expect(start).toMatchObject({
				message: 'Deletion started',
				class: 'events',
				includeLegacy: false,
				requestId: 'caddy-7f3a',
				cutoff: expect.any(String) as string
			});
			expect(end).toMatchObject({
				message: 'Deletion completed',
				class: 'events',
				requestId: 'caddy-7f3a',
				state: 'completed',
				deletedBy: { events: 12 }
			});
		} finally {
			await client.dashboard.stop();
		}
	});
});
