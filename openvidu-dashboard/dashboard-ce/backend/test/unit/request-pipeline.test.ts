import { Router } from 'express';
import { errors as joseErrors } from 'jose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import type { Response } from 'supertest';

import type { ApiError as ApiErrorBody } from '@openvidu-dashboard/typings';
import * as z from 'zod';

import { ApiError } from '../../src/http/api-error.js';
import { createHttpApp } from '../../src/http/app.js';
import { silentLogger } from '../support/silent-logger.js';

/** The error of an API error response, with `details` loosely typed for assertions. */
function errorOf(response: Response) {
	return (response.body as ApiErrorBody).error as ApiErrorBody['error'] & {
		details: { issues: { path: string[] }[] } & Record<string, unknown>;
	};
}

function app() {
	const logger = silentLogger();
	const router = Router();

	router.get('/api-error', () => {
		throw new ApiError('CONFLICT', 'Already there', { id: 'RM_1' });
	});
	router.get('/zod', () => {
		z.object({ limit: z.number() }).parse({ limit: 'x' });
	});
	router.get('/expired', () => {
		throw new joseErrors.JWTExpired('expired', {});
	});
	router.get('/bad-signature', () => {
		throw new joseErrors.JWSSignatureVerificationFailed();
	});
	router.post('/echo', (req, res) => {
		req.log.info('echo served');
		res.json(req.body);
	});
	router.get('/crash', () => {
		throw new Error('secret internals');
	});

	return { app: createHttpApp({ logger, appRoot: '/nonexistent', trustProxy: false, apiRouter: router }), logger };
}

describe('request id', () => {
	it('generates a UUID when the request has none', async () => {
		const response = await request(app().app).get('/api/v1/api-error');

		expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
	});

	it('propagates a well-formed incoming id, also on errors, and logs it', async () => {
		const { app: server, logger } = app();
		const ok = await request(server).post('/api/v1/echo').set('X-Request-Id', 'caddy-7f3a').send({ a: 1 });
		const failed = await request(server).get('/api/v1/crash').set('X-Request-Id', 'caddy-7f3b');

		expect(ok.headers['x-request-id']).toBe('caddy-7f3a');
		expect(failed.headers['x-request-id']).toBe('caddy-7f3b');
		expect(logger.lines.join('\n')).toContain('echo served');
	});

	it('replaces an id with forbidden characters', async () => {
		const response = await request(app().app).get('/api/v1/api-error').set('X-Request-Id', 'bad id;');

		expect(response.headers['x-request-id']).not.toBe('bad id;');
	});
});

describe('error envelope', () => {
	it('sends API errors with their code, status and details', async () => {
		const response = await request(app().app).get('/api/v1/api-error');

		expect(response.status).toBe(409);
		expect(response.body).toEqual({
			error: { code: 'CONFLICT', message: 'Already there', details: { id: 'RM_1' } }
		});
	});

	it('maps validation errors to 400 with the issues', async () => {
		const response = await request(app().app).get('/api/v1/zod');

		expect(response.status).toBe(400);
		expect(errorOf(response).code).toBe('VALIDATION_ERROR');
		expect(errorOf(response).details.issues[0]?.path).toEqual(['limit']);
	});

	it('maps token errors to 401 with the reason', async () => {
		const expired = await request(app().app).get('/api/v1/expired');
		const invalid = await request(app().app).get('/api/v1/bad-signature');

		expect(expired.status).toBe(401);
		expect(errorOf(expired).details).toEqual({ reason: 'expired' });
		expect(expired.headers['www-authenticate']).toBe('Bearer');
		expect(errorOf(invalid).details).toEqual({ reason: 'invalid' });
	});

	it('maps malformed and oversized JSON bodies to 400', async () => {
		const malformed = await request(app().app)
			.post('/api/v1/echo')
			.set('Content-Type', 'application/json')
			.send('{"a":');
		const oversized = await request(app().app)
			.post('/api/v1/echo')
			.set('Content-Type', 'application/json')
			.send(JSON.stringify({ text: 'x'.repeat(1_100_000) }));

		expect(malformed.status).toBe(400);
		expect(errorOf(malformed).code).toBe('VALIDATION_ERROR');
		expect(oversized.status).toBe(400);
		expect(errorOf(oversized).message).toContain('1 MB');
	});

	it('hides unexpected errors behind code and message only', async () => {
		const response = await request(app().app).get('/api/v1/crash');

		expect(response.status).toBe(500);
		expect(response.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
	});
});
