import { randomUUID } from 'node:crypto';

import type { Container } from 'inversify';
import { type Db, MongoClient } from 'mongodb';

import { TOKENS } from '../../src/di/tokens.js';
import { type DashboardOptions, type RunningDashboard, startDashboard } from '../../src/lifecycle/startup.js';
import { freePort } from './free-port.js';

export interface BootedDashboard {
	url: string;
	running: RunningDashboard;
	db: Db;
	exits: number[];
	/** Moves the dashboard clock; starts at the real time. */
	advance(ms: number): void;
	stop(): Promise<void>;
}

let counter = 0;

/** Starts the CE dashboard in-process against a fresh database, with a controllable clock. */
export async function boot(
	mongoUri: string,
	env: NodeJS.ProcessEnv = {},
	options: Partial<DashboardOptions> & { seed?: (db: Db) => Promise<void> } = {}
): Promise<BootedDashboard> {
	// Suites run in parallel workers, each with its own counter: the random part keeps their databases apart.
	const name = `api_${String(++counter)}_${randomUUID().slice(0, 8)}`;
	const client = await MongoClient.connect(mongoUri);
	const db = client.db(name);

	await options.seed?.(db);

	let offset = 0;
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
			NODE_ENV: 'production',
			SERVER_PORT: String(port),
			DATABASE_URL: mongoUri,
			DATABASE_NAME: name,
			...env
		},
		...options,
		configure: (container: Container) => {
			container.rebind<() => Date>(TOKENS.Clock).toConstantValue(() => new Date(Date.now() + offset));
			options.configure?.(container);
		}
	});

	if (!running) {
		await client.close();
		throw new Error(`the dashboard did not start (exit codes ${exits.join(', ')})`);
	}

	return {
		url: `http://127.0.0.1:${String(port)}`,
		running,
		db,
		exits,
		advance: (ms) => {
			offset += ms;
		},
		stop: async () => {
			await running.shutdown.run(0);
			await db.dropDatabase();
			await client.close();
		}
	};
}

/** The value of the refresh cookie in a response, or undefined when it was cleared or not set. */
export function refreshCookie(response: Response): { value: string | undefined; header: string } | undefined {
	const header = response.headers.getSetCookie().find((cookie) => cookie.startsWith('ov_dashboard_refresh='));

	if (header === undefined) {
		return undefined;
	}

	const value = /^ov_dashboard_refresh=([^;]*)/.exec(header)?.[1];

	return { value: value === '' ? undefined : value, header };
}
