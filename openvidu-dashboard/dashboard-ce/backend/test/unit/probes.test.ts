import type { Db } from 'mongodb';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { registerProbes } from '../../src/api/probes.js';
import { RouteRegistry } from '../../src/api/route-registry.js';
import { createHttpApp } from '../../src/http/app.js';
import { silentLogger } from '../support/silent-logger.js';

const unreachable = {
	command: () => Promise.reject(new Error('connection timed out'))
} as unknown as Db;

describe('probes without MongoDB', () => {
	const registry = new RouteRegistry('ce');

	registerProbes(registry, '3.10.0', unreachable);

	const app = createHttpApp({
		logger: silentLogger(),
		appRoot: '/nonexistent',
		trustProxy: false,
		apiRouter: registry.router(() => Promise.resolve())
	});

	it('reports not ready when the ping fails', async () => {
		const response = await request(app).get('/api/v1/ready');

		expect(response.status).toBe(503);
		expect(response.body).toEqual({
			error: { code: 'NOT_READY', message: 'The dashboard is not ready', details: { checks: { mongo: 'error' } } }
		});
	});

	it('keeps liveness and the legacy health check up', async () => {
		expect((await request(app).get('/api/v1/health')).body).toEqual({ status: 'ok', version: '3.10.0' });
		expect((await request(app).get('/api/healthcheck')).status).toBe(200);
	});
});
