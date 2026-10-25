import { type Db, MongoClient } from 'mongodb';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { SCHEMA_VERSION, type SchemaMetaDocument } from '@openvidu-dashboard/typings';

import type { RouteRegistry } from '../../src/api/route-registry.js';
import { AuthService } from '../../src/auth/auth-service.js';
import { SessionRepository } from '../../src/auth/session-repository.js';
import { provisionSigningKey } from '../../src/auth/signing-key.js';
import { TOKENS } from '../../src/di/tokens.js';
import { silentLogger } from '../support/silent-logger.js';
import { boot, type BootedDashboard, refreshCookie } from '../support/boot.js';

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
	it('reports a running writer', async () => {
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
					await db.collection('rooms').createIndex({ createdAt: -1 });
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
				features: [],
				limits: { rankedSortMaxRangeMs: 604_800_000, participantRankedSortMaxRangeMs: 86_400_000 },
				openapiDocsEnabled: false
			});
			expect(info.storage).toMatchObject({ rooms: { documents: 12, oldest: '2026-10-01T00:00:00.000Z' } });
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

	it('reports a writer that has not started, a running migration and a failed one', async () => {
		const empty = await boot(mongoUri);
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
			const emptyInfo = await (
				await fetch(`${empty.url}/api/v1/info`, {
					headers: { Authorization: `Bearer ${await token(await login(empty))}` }
				})
			).json();
			const migratingInfo = (await (
				await fetch(`${migrating.url}/api/v1/info`, {
					headers: { Authorization: `Bearer ${await token(await login(migrating))}` }
				})
			).json()) as { migration: unknown };

			expect(emptyInfo).toMatchObject({
				versions: { dashboard: '3.10.0-test' },
				schema: { status: 'uninitialized' },
				migration: { state: 'none' }
			});
			expect(emptyInfo).not.toHaveProperty('retention');
			expect(emptyInfo).not.toHaveProperty('versions.server');
			expect(migratingInfo.migration).toEqual({
				state: 'running',
				progress: { processed: 400_000, total: 1_200_000, startedAt: '2026-10-13T08:00:00.000Z' }
			});

			const failedInfo = (await (
				await fetch(`${failed.url}/api/v1/info`, {
					headers: { Authorization: `Bearer ${await token(await login(failed))}` }
				})
			).json()) as { migration: unknown };

			expect(failedInfo.migration).toEqual({
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
			await empty.stop();
			await migrating.stop();
			await failed.stop();
		}
	});
});

describe.skipIf(mongoUri === '')('readiness', () => {
	it.each([
		['uninitialized', undefined, 200],
		['newer', SCHEMA_VERSION + 1, 200]
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
