import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Router } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

import { createHttpApp } from '../../src/http/app.js';
import { silentLogger } from '../support/silent-logger.js';

const INDEX = '<!doctype html><html><head><base href="/dashboard/"></head><body>dashboard</body></html>';

describe('HTTP contract', () => {
	let app: ReturnType<typeof createHttpApp>;
	const logger = silentLogger();

	beforeAll(() => {
		const appRoot = mkdtempSync(join(tmpdir(), 'dashboard-spa-'));
		writeFileSync(join(appRoot, 'index.html'), INDEX);
		writeFileSync(join(appRoot, 'main.js'), 'console.log("app")');
		const failing = Router();
		failing.get('/boom', () => {
			throw new Error('repository exploded');
		});
		app = createHttpApp({ logger, appRoot, trustProxy: false, apiRouter: failing });
	});

	it('answers the legacy health check without authentication', async () => {
		const response = await request(app).get('/api/healthcheck');
		expect(response.status).toBe(200);
		expect(response.body).toEqual({ status: 'ok' });
	});

	it('answers HEAD / with the SPA', async () => {
		const response = await request(app).head('/');
		expect(response.status).toBe(200);
		expect(response.headers['content-type']).toContain('text/html');
	});

	it.each(['/', '/rooms/RM_abc', '/dashboard/api/healthcheck', '/login?redirect=%2Frooms'])(
		'serves index.html for %s',
		async (path) => {
			const response = await request(app).get(path);
			expect(response.status).toBe(200);
			expect(response.text).toBe(INDEX);
		}
	);

	it('serves static assets', async () => {
		const response = await request(app).get('/main.js');
		expect(response.status).toBe(200);
		expect(response.text).toBe('console.log("app")');
	});

	it.each(['/api/v1/does-not-exist', '/api/anything', '/api'])('answers %s with a JSON 404', async (path) => {
		const response = await request(app).get(path);
		expect(response.status).toBe(404);
		expect(response.headers['content-type']).toContain('application/json');
		expect((response.body as { error: { code: string; message: string } }).error).toEqual({
			code: 'NOT_FOUND',
			message: `No API route for GET ${path}`
		});
	});

	it('hides unexpected errors behind INTERNAL_ERROR', async () => {
		const response = await request(app).get('/api/v1/boom');
		expect(response.status).toBe(500);
		expect(response.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
		expect(JSON.stringify(response.body)).not.toContain('exploded');
		expect(logger.lines.some((line) => line.includes('GET /api/v1/boom'))).toBe(true);
	});
});
