import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runHealthcheck } from '../../src/lifecycle/healthcheck.js';

describe('healthcheck argument', () => {
	let server: Server;
	let port: number;

	beforeAll(async () => {
		server = createServer((req, res) => {
			res.statusCode = req.url === '/api/healthcheck' ? 200 : 404;
			res.end();
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		port = (server.address() as AddressInfo).port;
	});

	afterAll(async () => {
		await new Promise((resolve) => server.close(resolve));
	});

	it('exits 0 when the local health check answers 200', async () => {
		expect(await runHealthcheck({ SERVER_PORT: String(port) })).toBe(0);
	});

	it('reaches a port that fetch refuses', async (context) => {
		const x11 = createServer((_req, res) => {
			res.end();
		});
		const listening = await new Promise<boolean>((resolve) => {
			x11.once('error', () => {
				resolve(false);
			});
			x11.listen(6000, '127.0.0.1', () => {
				resolve(true);
			});
		});

		if (!listening) {
			context.skip('port 6000 is in use');
		}

		try {
			expect(await runHealthcheck({ SERVER_PORT: '6000' })).toBe(0);
		} finally {
			await new Promise((resolve) => x11.close(resolve));
		}
	});

	it('exits 1 when nothing listens or the port is invalid', async () => {
		const closed = createServer();
		await new Promise<void>((resolve) => closed.listen(0, '127.0.0.1', resolve));
		const free = (closed.address() as AddressInfo).port;
		await new Promise((resolve) => closed.close(resolve));
		expect(await runHealthcheck({ SERVER_PORT: String(free) })).toBe(1);
		expect(await runHealthcheck({ SERVER_PORT: 'http' })).toBe(1);
	});
});
