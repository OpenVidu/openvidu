import { MongoClient } from 'mongodb';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { SCHEMA_VERSION, type SchemaMetaSchema } from '@openvidu-dashboard/typings';

import { type DashboardOptions, startDashboard } from '../../src/lifecycle/startup.js';
import { freePort } from '../support/free-port.js';

const mongoUri = inject('mongoUri');

describe.skipIf(mongoUri === '')('startup orchestrator', () => {
	let client: MongoClient;
	let databases = 0;

	beforeAll(async () => {
		client = await MongoClient.connect(mongoUri);
	});

	afterAll(async () => {
		await client.close();
	});

	async function database(schemaVersion?: number): Promise<string> {
		const name = `startup_${String(++databases)}_${String(Date.now())}`;

		if (schemaVersion !== undefined) {
			await client
				.db(name)
				.collection<SchemaMetaSchema>('schema_meta')
				.insertOne({ _id: 'schema', version: schemaVersion, writerVersion: '3.10.0', updatedAt: new Date() });
		}

		return name;
	}

	async function start(env: NodeJS.ProcessEnv, extra: Partial<DashboardOptions> = {}) {
		const exits: number[] = [];
		const port = await freePort();
		const running = await startDashboard({
			edition: 'ce',
			version: '3.10.0-test',
			appRoot: '/nonexistent',
			handleSignals: false,
			exit: (code) => exits.push(code),
			env: {
				ADMIN_USERNAME: 'admin',
				ADMIN_PASSWORD: 'secret',
				LOG_LEVEL: 'error',
				SERVER_PORT: String(port),
				...env
			},
			...extra
		});

		return { running, exits, port };
	}

	/** Full info, read with an access token. */
	async function info(port: number): Promise<{ schema: { status: string; writer?: number; dashboard: number } }> {
		const login = await fetch(`http://127.0.0.1:${String(port)}/api/v1/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username: 'admin', password: 'secret' })
		});
		const { accessToken } = (await login.json()) as { accessToken: string };
		const response = await fetch(`http://127.0.0.1:${String(port)}/api/v1/info`, {
			headers: { Authorization: `Bearer ${accessToken}` }
		});

		return (await response.json()) as { schema: { status: string; writer?: number; dashboard: number } };
	}

	async function listening(port: number): Promise<boolean> {
		try {
			await fetch(`http://127.0.0.1:${String(port)}/api/healthcheck`, { signal: AbortSignal.timeout(1_000) });

			return true;
		} catch {
			return false;
		}
	}

	it.each([
		['ok', SCHEMA_VERSION],
		['newer', SCHEMA_VERSION + 1],
		['uninitialized', undefined]
	])('starts with a writer schema that is %s and reports it in info', async (status, version) => {
		const { running, exits, port } = await start({
			DATABASE_URL: mongoUri,
			DATABASE_NAME: await database(version)
		});
		expect(running).toBeDefined();
		const body = await info(port);
		expect(body.schema).toEqual({
			dashboard: SCHEMA_VERSION,
			status,
			...(version === undefined ? {} : { writer: version })
		});
		await running?.shutdown.run(0);
		expect(exits).toEqual([0]);
		expect(await listening(port)).toBe(false);
	});

	it('reads the writer schema again on every info request', async () => {
		const name = await database();
		const { running, port } = await start({ DATABASE_URL: mongoUri, DATABASE_NAME: name });
		await client
			.db(name)
			.collection<SchemaMetaSchema>('schema_meta')
			.insertOne({ _id: 'schema', version: SCHEMA_VERSION, writerVersion: '3.10.0', updatedAt: new Date() });
		const body = await info(port);
		expect(body.schema.status).toBe('ok');
		await running?.shutdown.run(0);
	});

	it('exits with code 3 without listening when the writer schema is too old', async () => {
		const { running, exits, port } = await start({ DATABASE_URL: mongoUri, DATABASE_NAME: await database(0) });
		expect(running).toBeUndefined();
		expect(exits).toEqual([3]);
		expect(await listening(port)).toBe(false);
	});

	it('runs the startup hooks after the schema gate and before listening', async () => {
		const seen: string[] = [];
		const port = await freePort();
		const { running } = await start(
			{ DATABASE_URL: mongoUri, DATABASE_NAME: await database(SCHEMA_VERSION), SERVER_PORT: String(port) },
			{
				startupHooks: [
					async ({ db }) => {
						seen.push(`hook:${db.databaseName.slice(0, 7)}:${String(await listening(port))}`);
					}
				]
			}
		);
		expect(seen).toEqual(['hook:startup:false']);
		await running?.shutdown.run(0);
	});

	it('exits with code 1 when a startup hook fails', async () => {
		const { running, exits } = await start(
			{ DATABASE_URL: mongoUri, DATABASE_NAME: await database(SCHEMA_VERSION) },
			{ startupHooks: [() => Promise.reject(new Error('startup hook failed'))] }
		);
		expect(running).toBeUndefined();
		expect(exits).toEqual([1]);
	});

	it('exits with code 1 without listening when the edition configuration fails', async () => {
		const { running, exits, port } = await start(
			{ DATABASE_URL: mongoUri, DATABASE_NAME: await database(SCHEMA_VERSION) },
			{
				configure: () => {
					throw new Error('Invalid configuration: DASHBOARD_EXAMPLE ("x") must be a number');
				}
			}
		);
		expect(running).toBeUndefined();
		expect(exits).toEqual([1]);
		expect(await listening(port)).toBe(false);
	});

	it('exits with code 1 without listening when the PRO edition leaves a locked route without a definition', async () => {
		const { running, exits, port } = await start(
			{ DATABASE_URL: mongoUri, DATABASE_NAME: await database(SCHEMA_VERSION) },
			{ edition: 'pro' }
		);
		expect(running).toBeUndefined();
		expect(exits).toEqual([1]);
		expect(await listening(port)).toBe(false);
	});

	it('exits with code 1 without listening when MongoDB is unreachable', async () => {
		const { running, exits, port } = await start({ DATABASE_URL: 'mongodb://127.0.0.1:1/?directConnection=true' });
		expect(running).toBeUndefined();
		expect(exits).toEqual([1]);
		expect(await listening(port)).toBe(false);
	}, 30_000);

	it('exits with code 1 when the MONGO_* composition is incomplete', async () => {
		const { running, exits } = await start({ MONGO_NODES: 'mongo1', MONGO_REPLICA_SET_NAME: 'rs0' });
		expect(running).toBeUndefined();
		expect(exits).toEqual([1]);
	});

	it('exits with code 0 when MongoDB is disabled', async () => {
		const { running, exits } = await start({ MONGO_ENABLED: 'false', ADMIN_PASSWORD: '' });
		expect(running).toBeUndefined();
		expect(exits).toEqual([0]);
	});
});
