import type { Db } from 'mongodb';

import type { DashboardOptions } from '../../src/lifecycle/startup.js';
import { boot, type BootedDashboard } from './boot.js';
import { createContractCollections } from './rooms-seed.js';

/** A booted dashboard with the access token of the admin. */
export interface Client {
	dashboard: BootedDashboard;
	token: string;
}

export async function signIn(dashboard: BootedDashboard): Promise<Client> {
	const response = await fetch(`${dashboard.url}/api/v1/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username: 'admin', password: 'secret' })
	});

	return { dashboard, token: ((await response.json()) as { accessToken: string }).accessToken };
}

export function get(client: Client, path: string, headers: Record<string, string> = {}): Promise<Response> {
	return fetch(`${client.dashboard.url}/api/v1${path}`, {
		headers: { Authorization: `Bearer ${client.token}`, ...headers }
	});
}

/** The JSON body of a `200`; any other status fails the test with the body. */
export async function json<T>(client: Client, path: string): Promise<T> {
	const response = await get(client, path);

	if (response.status !== 200) {
		throw new Error(`${path}: ${String(response.status)} ${await response.text()}`);
	}

	return (await response.json()) as T;
}

/** Status, code and first validation issue of an error answer. */
export async function issue(client: Client, path: string) {
	const response = await get(client, path);
	const body = (await response.json()) as {
		error: { code: string; details?: { issues?: { path: string[]; message: string }[]; feature?: string } };
	};

	return {
		status: response.status,
		code: body.error.code,
		feature: body.error.details?.feature,
		first: body.error.details?.issues?.[0]
	};
}

/** A dashboard on a fresh database with the contract collections, signed in; CE unless `options` say otherwise. */
export async function bootClient(
	mongoUri: string,
	env: NodeJS.ProcessEnv = {},
	options: Partial<DashboardOptions> & { seed?: (db: Db) => Promise<void> } = {}
): Promise<Client> {
	return signIn(await boot(mongoUri, env, { seed: createContractCollections, ...options }));
}
