import { type Db, Double, MongoClient } from 'mongodb';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { MIN_SUPPORTED_SCHEMA_VERSION, SCHEMA_VERSION, type SchemaMetaDocument } from '@openvidu-dashboard/typings';

import { rankedSortLimits } from '../../src/api/ranked-limits.js';
import type { RouteRegistry } from '../../src/api/route-registry.js';
import { AuthService } from '../../src/auth/auth-service.js';
import { SessionRepository } from '../../src/auth/session-repository.js';
import { provisionSigningKey } from '../../src/auth/signing-key.js';
import { TOKENS } from '../../src/di/tokens.js';
import { InfoService } from '../../src/info/info-service.js';
import { silentLogger } from '../support/silent-logger.js';
import { boot, type BootedDashboard, refreshCookie } from '../support/boot.js';
import { createContractCollections } from '../support/rooms-seed.js';

const mongoUri = inject('mongoUri');

const migrationFields = {
	writerVersion: '3.10.0',
	fromSchemaVersion: 0,
	counts: { events: 0, stats: 0, synthetic: 0, skipped: 0 }
};

async function seedSchema(db: Db, version = SCHEMA_VERSION): Promise<void> {
	await db.collection<SchemaMetaDocument>('schema_meta').insertOne({
		_id: 'schema',
		version,
		writerVersion: '3.10.0',
		updatedAt: new Date()
	});
}

async function login(dashboard: BootedDashboard, headers: Record<string, string> = {}, password = 'secret') {
	return fetch(`${dashboard.url}/api/v1/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		body: JSON.stringify({ username: 'admin', password })
	});
}

async function refresh(dashboard: BootedDashboard, cookie: string | undefined) {
	return fetch(`${dashboard.url}/api/v1/auth/refresh`, {
		method: 'POST',
		headers: cookie === undefined ? {} : { Cookie: `ov_dashboard_refresh=${cookie}` }
	});
}

async function token(response: Response): Promise<string> {
	return ((await response.json()) as { accessToken: string }).accessToken;
}

/** `GET /info` with the token of a fresh login. */
async function info(dashboard: BootedDashboard): Promise<Record<string, unknown>> {
	const response = await fetch(`${dashboard.url}/api/v1/info`, {
		headers: { Authorization: `Bearer ${await token(await login(dashboard))}` }
	});

	return (await response.json()) as Record<string, unknown>;
}

/** A collection of the legacy writer with its indexes, one document per timestamp in seconds, live for 32 days. */
async function seedLegacy(db: Db, name: string, timestampKey: string, seconds: number[]): Promise<void> {
	await db
		.collection(name)
		.createIndexes([
			{ key: { [`${timestampKey}.seconds`]: 1 } },
			{ key: { openvidu_expire_at: 1 }, expireAfterSeconds: 0 }
		]);
	await db.collection(name).insertMany(
		seconds.map((second) => ({
			[timestampKey]: { seconds: new Double(second), nanos: new Double(0) },
			openvidu_expire_at: new Date(Date.now() + 32 * 86_400_000)
		}))
	);
}

describe.skipIf(mongoUri === '')('API and authentication', () => {
	let dashboard: BootedDashboard;

	beforeAll(async () => {
		dashboard = await boot(mongoUri, {}, { seed: (db) => seedSchema(db) });
	});

	afterAll(async () => {
		await dashboard.stop();
	});

	it('runs the full session lifecycle', async () => {
		const loggedIn = await login(dashboard);
		const body = (await loggedIn.clone().json()) as { accessToken: string; expiresAt: string };
		const cookie = refreshCookie(loggedIn);

		expect(loggedIn.status).toBe(200);
		expect(new Date(body.expiresAt).getTime() - Date.now()).toBeGreaterThan(14 * 60_000);
		expect(cookie?.header).toBe(
			`ov_dashboard_refresh=${cookie?.value ?? ''}; Path=/api/v1/auth; Max-Age=604800; HttpOnly; SameSite=Strict`
		);

		const me = await fetch(`${dashboard.url}/api/v1/auth/me`, {
			headers: { Authorization: `Bearer ${body.accessToken}` }
		});

		expect(await me.json()).toMatchObject({ username: 'admin', edition: 'ce', expiresAt: body.expiresAt });

		const rotated = await refresh(dashboard, cookie?.value);
		const next = refreshCookie(rotated);

		expect(rotated.status).toBe(200);
		expect(next?.value).toBeDefined();
		expect(next?.value).not.toBe(cookie?.value);

		const logout = await fetch(`${dashboard.url}/api/v1/auth/logout`, {
			method: 'POST',
			headers: { Cookie: `ov_dashboard_refresh=${next?.value ?? ''}` }
		});

		expect(logout.status).toBe(204);
		expect(refreshCookie(logout)?.header).toContain('Max-Age=0');
		expect((await refresh(dashboard, next?.value)).status).toBe(401);
		expect((await fetch(`${dashboard.url}/api/v1/auth/logout`, { method: 'POST' })).status).toBe(204);
	});

	it('rejects wrong credentials and malformed bodies', async () => {
		const wrong = await login(dashboard, {}, 'nope');
		const malformed = await fetch(`${dashboard.url}/api/v1/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ user: 'admin' })
		});
		const issues = ((await malformed.json()) as { error: { details: { issues: { path: string[] }[] } } }).error
			.details.issues;

		expect(wrong.status).toBe(401);
		expect(((await wrong.json()) as { error: { code: string } }).error.code).toBe('INVALID_CREDENTIALS');
		expect(malformed.status).toBe(400);
		expect(issues.map((issue) => issue.path)).toEqual(expect.arrayContaining([['username'], ['password']]));
	});

	it('sets Secure when a trusted proxy reports HTTPS', async () => {
		const response = await login(dashboard, { 'X-Forwarded-Proto': 'https' });

		expect(refreshCookie(response)?.header).toContain('; Secure;');
	});

	it('lets two tabs refresh with the same token at once', async () => {
		const cookie = refreshCookie(await login(dashboard))?.value;
		const [first, second] = await Promise.all([refresh(dashboard, cookie), refresh(dashboard, cookie)]);

		expect([first.status, second.status]).toEqual([200, 200]);
		expect((await refresh(dashboard, refreshCookie(first)?.value)).status).toBe(200);
		expect((await refresh(dashboard, refreshCookie(second)?.value)).status).toBe(200);
	});

	it('revokes the family when a rotated token is replayed later', async () => {
		const cookie = refreshCookie(await login(dashboard))?.value;
		const successor = refreshCookie(await refresh(dashboard, cookie))?.value;

		dashboard.advance(5 * 60_000);

		const replay = await refresh(dashboard, cookie);

		expect(replay.status).toBe(401);
		expect(refreshCookie(replay)?.header).toContain('Max-Age=0');
		expect((await refresh(dashboard, successor)).status).toBe(401);
		expect(
			(
				await dashboard.db
					.collection('dashboard_sessions')
					.find({ revokedAt: { $exists: true } })
					.toArray()
			).length
		).toBeGreaterThan(0);
	});

	it('protects routes and reports missing and expired tokens', async () => {
		const missing = await fetch(`${dashboard.url}/api/v1/auth/me`);
		const accessToken = await token(await login(dashboard));

		dashboard.advance(16 * 60_000);

		const expired = await fetch(`${dashboard.url}/api/v1/info`, {
			headers: { Authorization: `Bearer ${accessToken}` }
		});

		expect(missing.status).toBe(401);
		expect(missing.headers.get('www-authenticate')).toBe('Bearer');
		expect(((await missing.json()) as { error: { details: unknown } }).error.details).toEqual({
			reason: 'missing'
		});
		expect(expired.status).toBe(401);
		expect(((await expired.json()) as { error: { details: unknown } }).error.details).toEqual({
			reason: 'expired'
		});
	});

	it('answers the public subset of info without a token', async () => {
		const response = await fetch(`${dashboard.url}/api/v1/info`);

		expect(await response.json()).toEqual({ edition: 'ce', versions: { dashboard: '3.10.0-test' } });
	});

	it('answers ready, health and the legacy health check without a token', async () => {
		expect(await (await fetch(`${dashboard.url}/api/v1/ready`)).json()).toEqual({
			status: 'ready',
			checks: { mongo: 'ok', schema: 'ok' }
		});
		expect(await (await fetch(`${dashboard.url}/api/v1/health`)).json()).toEqual({
			status: 'ok',
			version: '3.10.0-test'
		});
		expect((await fetch(`${dashboard.url}/api/healthcheck`)).status).toBe(200);
		expect((await fetch(`${dashboard.url}/api/v1/docs`)).status).toBe(404);
	});
});

describe.skipIf(mongoUri === '')('info', () => {
	it('CE with a running writer', async () => {
		const dashboard = await boot(
			mongoUri,
			{},
			{
				seed: async (db) => {
					await seedSchema(db);
					await db.collection<SchemaMetaDocument>('schema_meta').insertMany([
						{
							_id: 'migration',
							state: 'completed',
							processed: 1_200,
							total: 1_200,
							startedAt: new Date('2026-10-13T08:00:00Z'),
							...migrationFields
						},
						{
							_id: 'retention',
							eventsMs: 604_800_000,
							statsMs: 604_800_000,
							tracksMs: 604_800_000,
							entitiesMs: 7_776_000_000,
							rollups5MinMs: 604_800_000,
							rollupsHourlyMs: 34_560_000_000,
							rollupsDailyMs: null,
							updatedAt: new Date()
						},
						{
							_id: 'capabilities',
							timeseries: true,
							transactions: true,
							serverVersion: '8.0.29',
							detectedAt: new Date()
						}
					]);
					await db.collection('rooms').insertMany(
						Array.from({ length: 12 }, (_, i) => ({
							_id: `RM_${String(i)}`,
							createdAt: new Date(Date.UTC(2026, 9, 1 + i))
						})) as never[]
					);
					await db.collection('rooms').createIndexes([{ key: { createdAt: -1 } }]);
				}
			}
		);

		try {
			const accessToken = await token(await login(dashboard));
			const info = (await (
				await fetch(`${dashboard.url}/api/v1/info`, { headers: { Authorization: `Bearer ${accessToken}` } })
			).json()) as Record<string, unknown>;

			expect(info).toMatchObject({
				edition: 'ce',
				versions: { dashboard: '3.10.0-test', server: '3.10.0' },
				schema: { dashboard: SCHEMA_VERSION, writer: SCHEMA_VERSION, status: 'ok' },
				migration: {
					state: 'completed',
					progress: { processed: 1_200, total: 1_200, startedAt: '2026-10-13T08:00:00.000Z' }
				},
				retention: {
					eventsMs: 604_800_000,
					statsMs: 604_800_000,
					tracksMs: 604_800_000,
					entitiesMs: 7_776_000_000,
					rollups5MinMs: 604_800_000,
					rollupsHourlyMs: 34_560_000_000,
					rollupsDailyMs: null
				},
				database: { timeseriesSupported: true },
				deletions: {},
				features: [],
				limits: { rankedSortMaxRangeMs: 604_800_000, participantRankedSortMaxRangeMs: 86_400_000 },
				openapiDocsEnabled: false
			});
			expect(Object.keys(info).sort()).toEqual(
				[
					'edition',
					'versions',
					'schema',
					'migration',
					'retention',
					'database',
					'storage',
					'deletions',
					'features',
					'limits',
					'openapiDocsEnabled'
				].sort()
			);
			expect(info.storage).toMatchObject({
				rooms: { documents: 12, oldest: '2026-10-01T00:00:00.000Z', freeBytes: expect.any(Number) as number }
			});
		} finally {
			await dashboard.stop();
		}
	});

	it('reports a daily rollup retention, and the default 5-minute retention when the writer recorded none', async () => {
		const dashboard = await boot(
			mongoUri,
			{},
			{
				seed: async (db) => {
					await seedSchema(db);
					await db.collection('schema_meta').insertOne({
						_id: 'retention',
						eventsMs: 604_800_000,
						statsMs: 172_800_000,
						tracksMs: 604_800_000,
						entitiesMs: 7_776_000_000,
						rollupsHourlyMs: 34_560_000_000,
						rollupsDailyMs: 157_680_000_000,
						updatedAt: new Date()
					} as never);
				}
			}
		);

		try {
			const info = (await (
				await fetch(`${dashboard.url}/api/v1/info`, {
					headers: { Authorization: `Bearer ${await token(await login(dashboard))}` }
				})
			).json()) as { retention: Record<string, unknown> };

			expect(info.retention).toMatchObject({ rollups5MinMs: 604_800_000, rollupsDailyMs: 157_680_000_000 });
		} finally {
			await dashboard.stop();
		}
	});

	it('Writer not started yet', async () => {
		const empty = await boot(mongoUri);

		try {
			const emptyInfo = await info(empty);

			expect(emptyInfo).toMatchObject({
				versions: { dashboard: '3.10.0-test' },
				schema: { status: 'uninitialized' },
				migration: { state: 'none' }
			});
			expect(emptyInfo).not.toHaveProperty('retention');
			expect(emptyInfo).not.toHaveProperty('versions.server');
		} finally {
			await empty.stop();
		}
	});

	it('Migration in progress: info reports its progress', async () => {
		const migrating = await boot(
			mongoUri,
			{},
			{
				seed: async (db) => {
					await seedSchema(db);
					await db.collection<SchemaMetaDocument>('schema_meta').insertOne({
						_id: 'migration',
						state: 'running',
						processed: 400_000,
						total: 1_200_000,
						startedAt: new Date('2026-10-13T08:00:00Z'),
						...migrationFields
					});
				}
			}
		);

		try {
			expect((await info(migrating)).migration).toEqual({
				state: 'running',
				progress: { processed: 400_000, total: 1_200_000, startedAt: '2026-10-13T08:00:00.000Z' }
			});
		} finally {
			await migrating.stop();
		}
	});

	it('Failed migration', async () => {
		const failed = await boot(
			mongoUri,
			{},
			{
				seed: async (db) => {
					await seedSchema(db);
					await db.collection<SchemaMetaDocument>('schema_meta').insertOne({
						_id: 'migration',
						state: 'failed',
						processed: 10,
						total: 20,
						startedAt: new Date('2026-10-13T08:00:00Z'),
						finishedAt: new Date('2026-10-13T08:05:00Z'),
						error: 'legacy event without a room',
						...migrationFields
					});
				}
			}
		);

		try {
			expect((await info(failed)).migration).toEqual({
				state: 'failed',
				progress: {
					processed: 10,
					total: 20,
					startedAt: '2026-10-13T08:00:00.000Z',
					finishedAt: '2026-10-13T08:05:00.000Z'
				},
				error: 'legacy event without a room'
			});
		} finally {
			await failed.stop();
		}
	});

	it('Nested keys', async () => {
		const dashboard = await boot(
			mongoUri,
			{},
			{
				seed: async (db) => {
					await seedSchema(db);
					await db.collection<SchemaMetaDocument>('schema_meta').insertOne({
						_id: 'migration',
						state: 'completed',
						processed: 20,
						total: 20,
						startedAt: new Date('2026-10-13T08:00:00Z'),
						finishedAt: new Date('2026-10-13T08:05:00Z'),
						legacyRetainedUntil: new Date('2026-12-15T08:00:00Z'),
						...migrationFields
					});
				}
			}
		);

		try {
			const body = await info(dashboard);
			const keys = (key: string) => Object.keys(body[key] as object).sort();

			expect(keys('versions')).toEqual(['dashboard', 'server']);
			expect(keys('schema')).toEqual(['dashboard', 'status', 'writer']);
			expect(keys('migration')).toEqual(['legacyRetainedUntil', 'progress', 'state']);
			expect(keys('limits')).toEqual(['participantRankedSortMaxRangeMs', 'rankedSortMaxRangeMs']);
		} finally {
			await dashboard.stop();
		}
	});

	it('Legacy collections in storage', async () => {
		const dashboard = await boot(
			mongoUri,
			{},
			{
				seed: async (db) => {
					await seedSchema(db);
					await db.collection<SchemaMetaDocument>('schema_meta').insertOne({
						_id: 'migration',
						state: 'completed',
						processed: 5,
						total: 5,
						startedAt: new Date('2026-11-14T08:00:00Z'),
						finishedAt: new Date('2026-11-14T08:01:00Z'),
						legacyRetainedUntil: new Date('2026-12-15T08:00:00Z'),
						...migrationFields
					});
					await seedLegacy(db, 'legacy_events', 'timestamp', [1791883600, 1791883555, 1791883700]);
					await seedLegacy(db, 'stats', 'time_stamp', [1791883569, 1791883599]);
				}
			}
		);

		try {
			const body = await info(dashboard);
			const storage = body.storage as Record<string, Record<string, unknown>>;

			expect(storage.legacy_events).toEqual({
				documents: 3,
				storageBytes: expect.any(Number) as number,
				indexBytes: expect.any(Number) as number,
				freeBytes: expect.any(Number) as number,
				oldest: '2026-10-13T09:25:55.000Z'
			});
			expect(storage.stats).toMatchObject({ documents: 2, oldest: '2026-10-13T09:26:09.000Z' });
			expect(body.migration).toMatchObject({ legacyRetainedUntil: '2026-12-15T08:00:00.000Z' });
		} finally {
			await dashboard.stop();
		}
	});

	it('Legacy collections in storage: a timestamp beyond the range of a date leaves the collection undated', async () => {
		const dashboard = await boot(
			mongoUri,
			{},
			{
				seed: async (db) => {
					await seedSchema(db);
					await db.collection<SchemaMetaDocument>('schema_meta').insertOne({
						_id: 'migration',
						state: 'completed',
						processed: 3,
						total: 3,
						legacyRetainedUntil: new Date('2026-12-15T08:00:00Z'),
						...migrationFields
					});
					await seedLegacy(db, 'legacy_events', 'timestamp', [-1e13, 1791883555]);
					await seedLegacy(db, 'stats', 'time_stamp', [1791883569]);
				}
			}
		);

		try {
			const response = await fetch(`${dashboard.url}/api/v1/info`, {
				headers: { Authorization: `Bearer ${await token(await login(dashboard))}` }
			});
			const body = (await response.json()) as { storage: Record<string, Record<string, unknown>> };

			expect(response.status).toBe(200);
			expect(body.storage.legacy_events).toMatchObject({ documents: 2 });
			expect(body.storage.legacy_events).not.toHaveProperty('oldest');
			expect(body.storage.stats).toMatchObject({ documents: 1, oldest: '2026-10-13T09:26:09.000Z' });
		} finally {
			await dashboard.stop();
		}
	});

	it('Stats without a migration in info', async () => {
		const dashboard = await boot(
			mongoUri,
			{},
			{
				seed: async (db) => {
					await seedSchema(db);
					await seedLegacy(db, 'stats', 'time_stamp', [1791883569, 1791883599]);
				}
			}
		);

		try {
			const body = await info(dashboard);

			expect(body.storage).not.toHaveProperty('stats');
			expect(body.migration).toEqual({ state: 'none' });
		} finally {
			await dashboard.stop();
		}
	});
});

describe.skipIf(mongoUri === '')('info storage and deletions', () => {
	const DAY = 86_400_000;
	const ago = (ms: number) => new Date(Date.now() - ms);

	async function bearer(dashboard: BootedDashboard): Promise<Record<string, string>> {
		return { Authorization: `Bearer ${await token(await login(dashboard))}` };
	}

	it('Deletions before any deletion', async () => {
		const dashboard = await boot(mongoUri, {}, { seed: (db) => seedSchema(db) });

		try {
			expect((await info(dashboard)).deletions).toEqual({});
		} finally {
			await dashboard.stop();
		}
	});

	it('Storage per collection', async () => {
		const dashboard = await boot(
			mongoUri,
			{},
			{
				seed: async (db) => {
					await seedSchema(db);
					await createContractCollections(db);
					await db.collection('rooms').insertMany(
						Array.from({ length: 1_200 }, (_, i) => ({
							_id: `RM_${String(i)}`,
							createdAt: ago(DAY)
						})) as never[]
					);
					await db.collection('events').insertMany(
						Array.from({ length: 20_000 }, (_, i) => ({
							_id: `AE_${String(i)}`,
							ts: ago(DAY)
						})) as never[]
					);
				}
			}
		);

		try {
			const body = await info(dashboard);
			const storage = body.storage as Record<string, Record<string, unknown>>;

			expect(storage.rooms?.documents).toBe(1_200);
			expect(storage.events?.documents).toBe(20_000);

			for (const [name, entry] of Object.entries(storage)) {
				expect(entry, name).toMatchObject({
					storageBytes: expect.any(Number) as number,
					indexBytes: expect.any(Number) as number,
					freeBytes: expect.any(Number) as number
				});
			}

			expect(typeof (body.database as { version: unknown }).version).toBe('string');
		} finally {
			await dashboard.stop();
		}
	});

	it('Oldest per collection', async () => {
		const oldest = new Date('2026-11-01T00:00:00.000Z');
		const later = new Date('2026-11-02T00:00:00.000Z');
		const dashboard = await boot(
			mongoUri,
			{},
			{
				seed: async (db) => {
					await seedSchema(db);
					await createContractCollections(db);

					const two = (field: string, extra: Record<string, unknown> = {}) =>
						[oldest, later].map((value, i) => ({ _id: `${field}_${String(i)}`, [field]: value, ...extra }));

					await db.collection('rooms').insertMany(two('createdAt') as never[]);
					await db.collection('ingresses').insertMany(two('createdAt') as never[]);
					await db.collection('participants').insertMany(two('joinedAt') as never[]);
					await db.collection('egresses').insertMany(two('startedAt') as never[]);
					await db.collection('ingress_sessions').insertMany(two('startedAt') as never[]);
					await db.collection('events').insertMany(two('ts') as never[]);
					await db.collection('analytics_5min').insertMany(two('bucket', { scope: 'global' }) as never[]);
					await db.collection('analytics_hourly').insertMany(two('bucket', { scope: 'global' }) as never[]);
					await db
						.collection('analytics_daily')
						.insertMany([
							{ _id: 'node', scope: 'node:ND_a', bucket: new Date('2026-10-01T00:00:00Z') },
							...two('bucket', { scope: 'global' })
						] as never[]);
					await db.collection('nodes').insertMany(two('firstSeenAt', { lastSeenAt: later }) as never[]);
					await db.collection('tracks').insertOne({ _id: 'TR_1', publishedAt: oldest } as never);
					await db
						.collection('track_subscriptions')
						.insertOne({ _id: 'TR_1:PA_1', subscribedAt: oldest } as never);
					await db.collection('track_stats').insertOne({
						ts: oldest,
						meta: { roomSid: 'RM_1', participantSid: 'PA_1', kind: 'publish', nodeId: 'n' }
					});
				}
			}
		);

		try {
			const storage = (await info(dashboard)).storage as Record<string, { oldest?: string }>;

			for (const name of [
				'rooms',
				'ingresses',
				'participants',
				'egresses',
				'ingress_sessions',
				'events',
				'analytics_5min',
				'analytics_hourly',
				'analytics_daily',
				'nodes'
			]) {
				expect(storage[name]?.oldest, name).toBe(oldest.toISOString());
			}

			for (const name of ['tracks', 'track_subscriptions', 'track_stats']) {
				expect(storage[name], name).toBeDefined();
				expect(storage[name], name).not.toHaveProperty('oldest');
			}
		} finally {
			await dashboard.stop();
		}
	});

	it('Free space of the indexes', async () => {
		const client = await MongoClient.connect(mongoUri);
		const db = client.db(`api_free_${String(Date.now())}`);
		const stats: Record<string, Record<string, unknown>> = {
			events: {
				count: 10,
				storageSize: 36_200_000,
				totalIndexSize: 35_400_000,
				freeStorageSize: 16_000_000,
				indexDetails: {
					_id_: { 'block-manager': { 'file bytes available for reuse': 8_000_000 } },
					ts_ttl: { 'block-manager': { 'file bytes available for reuse': 4_800_000 } }
				}
			},
			rooms: {
				count: 2,
				storageSize: 4_096,
				totalIndexSize: 4_096,
				freeStorageSize: 1_000_000,
				indexDetails: { _id_: {} }
			}
		};
		// `$collStats` of the two collections answers the figures above; every other call reaches MongoDB.
		const reporting = new Proxy(db, {
			get(target, property, receiver) {
				if (property !== 'collection') {
					return Reflect.get(target, property, receiver) as unknown;
				}

				return (name: string) => {
					const collection = target.collection(name);
					const storageStats = stats[name];

					return new Proxy(collection, {
						get(inner, key, innerReceiver) {
							if (key === 'aggregate' && storageStats !== undefined) {
								return () => ({ toArray: () => Promise.resolve([{ storageStats }]) });
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

		try {
			await db.createCollection('events');
			await db.createCollection('rooms');

			const info = await new InfoService(reporting, {
				edition: 'ce',
				version: 'test',
				features: () => [],
				limits: rankedSortLimits(7 * 86_400_000),
				openapiDocsEnabled: false
			}).fullInfo();

			expect(info.storage.events?.freeBytes).toBe(28_800_000);
			expect(info.storage.rooms?.freeBytes).toBe(1_000_000);
		} finally {
			await db.dropDatabase();
			await client.close();
		}
	});

	it('Free space after deleting documents', async () => {
		const dashboard = await boot(
			mongoUri,
			{},
			{
				seed: async (db) => {
					await seedSchema(db);
					await createContractCollections(db);
					await db.collection('events').insertMany(
						Array.from({ length: 50_000 }, (_, i) => ({
							_id: `AE_${String(i)}`,
							// 40,000 deletable events and 10,000 recorded in the last minute, which a deletion keeps.
							ts: i < 40_000 ? ago(DAY) : new Date(),
							payload: { padding: 'x'.repeat(200) }
						})) as never[]
					);
				}
			}
		);

		try {
			const headers = await bearer(dashboard);
			const events = async () => {
				// WiredTiger reports the free space of a collection at its next checkpoint.
				await dashboard.db.admin().command({ fsync: 1 });

				return (
					(await info(dashboard)).storage as Record<
						string,
						{ documents: number; storageBytes: number; freeBytes: number }
					>
				).events;
			};
			const before = await events();
			const started = await fetch(`${dashboard.url}/api/v1/deletions`, {
				method: 'POST',
				headers: { ...headers, 'Content-Type': 'application/json' },
				body: JSON.stringify({ class: 'events' })
			});

			expect(started.status).toBe(202);

			for (let state = 'running'; state === 'running';) {
				await new Promise((resolve) => setTimeout(resolve, 100));
				const status = (await (await fetch(`${dashboard.url}/api/v1/status`, { headers })).json()) as {
					deletion?: { state: string };
				};

				state = status.deletion?.state ?? 'running';
			}

			const after = await events();

			expect(after?.documents).toBe(10_000);
			expect(after?.storageBytes).toBeGreaterThanOrEqual(before?.storageBytes ?? 0);
			expect(after?.freeBytes).toBeGreaterThan(before?.freeBytes ?? 0);
		} finally {
			await dashboard.stop();
		}
	});

	it('Storage read again after the release', async () => {
		const finishedAt = ago(20_000);
		const dashboard = await boot(
			mongoUri,
			{},
			{
				seed: async (db) => {
					await seedSchema(db);
					await createContractCollections(db);
					await db.collection('events').insertMany([{ _id: 'AE_1', ts: ago(DAY) }] as never[]);
					await db.collection<SchemaMetaDocument>('schema_meta').insertOne({
						_id: 'dashboard',
						deletions: { events: { completed: { cutoff: ago(DAY), endedBefore: ago(DAY), finishedAt } } }
					});
				}
			}
		);
		const documents = async () =>
			((await info(dashboard)).storage as Record<string, { documents: number }>).events?.documents;

		try {
			// Read and cached 20 s after the deletion completed.
			expect(await documents()).toBe(1);
			await dashboard.db.collection('events').insertOne({ _id: 'AE_2', ts: ago(DAY) } as never);

			// 50 s after it: the value cached at 20 s is served.
			dashboard.advance(30_000);
			expect(await documents()).toBe(1);

			// 65 s after it, past the checkpoint: `$collStats` is read again.
			dashboard.advance(15_000);
			expect(await documents()).toBe(2);
		} finally {
			await dashboard.stop();
		}
	});

	it('Sub-resource path', async () => {
		const dashboard = await boot(mongoUri, {}, { seed: (db) => seedSchema(db) });

		try {
			const response = await fetch(`${dashboard.url}/api/v1/rooms/RM_abc/participants`, {
				headers: await bearer(dashboard)
			});

			// The CE answers the PRO route it locks at that path, not the 404 of an unknown path.
			expect(response.status).toBe(403);
			expect(((await response.json()) as { error: { code: string } }).error.code).toBe('PRO_FEATURE');
		} finally {
			await dashboard.stop();
		}
	});

	it('Unknown API path', async () => {
		const dashboard = await boot(mongoUri, {}, { seed: (db) => seedSchema(db) });

		try {
			for (const path of ['/api/v1/does-not-exist', '/api/anything']) {
				const response = await fetch(`${dashboard.url}${path}`, { headers: await bearer(dashboard) });

				expect(response.status, path).toBe(404);
				expect(response.headers.get('content-type'), path).toContain('application/json');
				expect(await response.json(), path).toEqual({
					error: { code: 'NOT_FOUND', message: `No API route for GET ${path}` }
				});
			}
		} finally {
			await dashboard.stop();
		}
	});
});

describe.skipIf(mongoUri === '')('readiness', () => {
	it.each([
		['uninitialized', undefined, 200],
		['newer', SCHEMA_VERSION + 1, 200],
		['ok', MIN_SUPPORTED_SCHEMA_VERSION, 200]
	])('is ready with a writer schema that is %s', async (status, version, code) => {
		const dashboard = await boot(
			mongoUri,
			{},
			{ seed: (db) => (version === undefined ? Promise.resolve() : seedSchema(db, version)) }
		);

		try {
			const response = await fetch(`${dashboard.url}/api/v1/ready`);

			expect(response.status).toBe(code);
			expect(await response.json()).toEqual({ status: 'ready', checks: { mongo: 'ok', schema: status } });
		} finally {
			await dashboard.stop();
		}
	});

	it('is not ready when the writer is downgraded below the minimum', async () => {
		const dashboard = await boot(mongoUri, {}, { seed: (db) => seedSchema(db) });

		try {
			await dashboard.db
				.collection<SchemaMetaDocument>('schema_meta')
				.updateOne({ _id: 'schema' }, { $set: { version: 0 } });

			const response = await fetch(`${dashboard.url}/api/v1/ready`);

			expect(response.status).toBe(503);
			expect(await response.json()).toMatchObject({
				error: { code: 'NOT_READY', details: { checks: { mongo: 'ok', schema: 'older' } } }
			});
		} finally {
			await dashboard.stop();
		}
	});
});

describe.skipIf(mongoUri === '')('login limiter and trusted proxies', () => {
	it('blocks the eleventh failed attempt, even with the right credentials', async () => {
		const dashboard = await boot(mongoUri, {}, { seed: (db) => seedSchema(db) });

		try {
			for (let i = 0; i < 10; i++) {
				expect((await login(dashboard, {}, 'nope')).status).toBe(401);
			}

			const blocked = await login(dashboard);

			expect(blocked.status).toBe(429);
			expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
			expect(((await blocked.json()) as { error: { code: string } }).error.code).toBe('RATE_LIMITED');
		} finally {
			await dashboard.stop();
		}
	});

	it('counts attempts per forwarded address from a trusted proxy', async () => {
		const dashboard = await boot(mongoUri, {}, { seed: (db) => seedSchema(db) });

		try {
			for (let i = 0; i < 10; i++) {
				await login(dashboard, { 'X-Forwarded-For': '203.0.113.9' }, 'nope');
			}

			expect((await login(dashboard, { 'X-Forwarded-For': '203.0.113.9' })).status).toBe(429);
			expect((await login(dashboard, { 'X-Forwarded-For': '203.0.113.10' })).status).toBe(200);
		} finally {
			await dashboard.stop();
		}
	});

	it('ignores forwarded headers from an untrusted address', async () => {
		const dashboard = await boot(
			mongoUri,
			{ DASHBOARD_TRUST_PROXY: '10.0.0.0/8' },
			{ seed: (db) => seedSchema(db) }
		);

		try {
			for (let i = 0; i < 10; i++) {
				await login(dashboard, { 'X-Forwarded-For': `10.0.0.${String(i)}` }, 'nope');
			}

			const response = await login(dashboard, { 'X-Forwarded-For': '10.0.0.99', 'X-Forwarded-Proto': 'https' });

			expect(response.status).toBe(429);
		} finally {
			await dashboard.stop();
		}
	});

	it('builds the cookie path from DASHBOARD_BASE_PATH and honours DASHBOARD_COOKIE_SECURE', async () => {
		const dashboard = await boot(
			mongoUri,
			{
				DASHBOARD_BASE_PATH: '/dashboard/',
				DASHBOARD_COOKIE_SECURE: 'true',
				DASHBOARD_REFRESH_TOKEN_TTL: '43200'
			},
			{ seed: (db) => seedSchema(db) }
		);

		try {
			const header = refreshCookie(await login(dashboard))?.header ?? '';
			const [session] = await dashboard.db
				.collection<{ createdAt: Date; expiresAt: Date }>('dashboard_sessions')
				.find()
				.toArray();

			expect(header).toContain('Path=/dashboard/api/v1/auth; Max-Age=43200; HttpOnly; Secure; SameSite=Strict');
			expect((session?.expiresAt.getTime() ?? 0) - (session?.createdAt.getTime() ?? 0)).toBe(43_200_000);
		} finally {
			await dashboard.stop();
		}
	});

	it('serves the OpenAPI document in development', async () => {
		const dashboard = await boot(mongoUri, { NODE_ENV: 'development' }, { seed: (db) => seedSchema(db) });

		try {
			const document = (await (await fetch(`${dashboard.url}/api/v1/docs/openapi.json`)).json()) as {
				openapi: string;
				paths: Record<string, unknown>;
			};

			const locked = dashboard.running.container
				.get<RouteRegistry>(TOKENS.RouteRegistry)
				.unimplemented()
				.map((route) => `/api/v1${route.split(' ')[1] ?? ''}`);

			expect(document.openapi).toBe('3.1.0');
			expect(locked.length).toBeGreaterThan(0);
			expect(Object.keys(document.paths).filter((path) => locked.includes(path))).toEqual([]);
			expect(Object.keys(document.paths)).toEqual(
				expect.arrayContaining([
					'/api/v1/auth/login',
					'/api/v1/auth/refresh',
					'/api/v1/auth/logout',
					'/api/v1/auth/me',
					'/api/v1/info',
					'/api/v1/health',
					'/api/v1/ready'
				])
			);
		} finally {
			await dashboard.stop();
		}
	});
});

describe.skipIf(mongoUri === '')('signing key and sessions', () => {
	let client: MongoClient;

	beforeAll(async () => {
		client = await MongoClient.connect(mongoUri);
	});

	afterAll(async () => {
		await client.close();
	});

	it('converges concurrent replicas on one key', async () => {
		const db = client.db(`keys_${String(Date.now())}`);

		try {
			const [first, second] = await Promise.all([
				provisionSigningKey(db, undefined),
				provisionSigningKey(db, undefined)
			]);
			const sessions = new SessionRepository(db);
			const service = (key: Uint8Array) =>
				new AuthService({
					username: 'admin',
					password: 'secret',
					edition: 'ce',
					key,
					refreshTokenTtlSeconds: 60,
					sessions,
					logger: silentLogger()
				});
			const { accessToken } = await service(first).issueAccessToken();

			expect(Buffer.from(first).equals(Buffer.from(second))).toBe(true);
			expect(await db.collection('dashboard_settings').countDocuments()).toBe(1);
			expect((await service(second).verifyAccessToken(accessToken)).username).toBe('admin');
			expect(Buffer.from(await provisionSigningKey(db, 'x'.repeat(48))).toString()).toBe('x'.repeat(48));
		} finally {
			await db.dropDatabase();
		}
	});

	it('indexes the sessions and backs both session queries with them', async () => {
		const db = client.db(`sessions_${String(Date.now())}`);
		const repository = new SessionRepository(db);

		try {
			await repository.ensureIndexes();
			await repository.ensureIndexes();

			const indexes = (await db.collection('dashboard_sessions').listIndexes().toArray()) as {
				name: string;
				expireAfterSeconds?: number;
			}[];
			const stages = (plan: unknown): string[] => {
				const found: string[] = [];
				const walk = (node: unknown) => {
					if (node && typeof node === 'object') {
						const record = node as Record<string, unknown>;

						if (typeof record.stage === 'string') {
							found.push(
								typeof record.indexName === 'string'
									? `${record.stage}:${record.indexName}`
									: record.stage
							);
						}

						Object.values(record).forEach(walk);
					}
				};

				walk(plan);

				return found;
			};
			const lookup = await db.collection('dashboard_sessions').find({ tokenHash: 'abc' }).explain('queryPlanner');
			const revoke = await db.command({
				explain: {
					update: 'dashboard_sessions',
					updates: [
						{
							q: { familyId: 'f', revokedAt: { $exists: false } },
							u: { $set: { revokedAt: new Date() } },
							multi: true
						}
					]
				},
				verbosity: 'queryPlanner'
			});

			expect(indexes.map((index) => index.name)).toEqual([
				'_id_',
				'tokenHash_unique',
				'familyId',
				'expiresAt_ttl'
			]);
			expect(indexes.find((index) => index.name === 'expiresAt_ttl')?.expireAfterSeconds).toBe(0);
			// MongoDB 8 answers a point lookup on a unique index with EXPRESS_IXSCAN, still an index scan.
			expect(stages(lookup.queryPlanner).some((stage) => stage.endsWith('IXSCAN:tokenHash_unique'))).toBe(true);
			expect(stages(revoke.queryPlanner).some((stage) => stage.endsWith('IXSCAN:familyId'))).toBe(true);
		} finally {
			await db.dropDatabase();
		}
	});
});
