import { get } from 'node:http';

import { loadConfigFile } from '../config/config-file.js';

const TIMEOUT_MS = 4_000;

/**
 * Container health check: 0 when `GET /api/healthcheck` on the local port answers 200, 1 otherwise. It uses
 * `node:http` because `fetch` refuses the ports the Fetch standard blocks, 6000 among them.
 */
export function runHealthcheck(env: NodeJS.ProcessEnv): Promise<number> {
	loadConfigFile(env);
	const port = Number(env.SERVER_PORT ?? 5000);

	if (!Number.isInteger(port) || port < 1 || port > 65_535) {
		return Promise.resolve(1);
	}

	return new Promise((resolve) => {
		const request = get({ host: '127.0.0.1', port, path: '/api/healthcheck', timeout: TIMEOUT_MS }, (response) => {
			response.resume();
			resolve(response.statusCode === 200 ? 0 : 1);
		});

		request.on('timeout', () => {
			request.destroy();
		});
		request.on('error', () => {
			resolve(1);
		});
	});
}
