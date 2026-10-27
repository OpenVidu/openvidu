import request from 'supertest';
import { describe, expect, it } from 'vitest';

import type { Response } from 'supertest';

import type { ApiError as ApiErrorBody } from '@openvidu-dashboard/typings';
import * as z from 'zod';

import { docsRouter, openApiDocument } from '../../src/api/openapi.js';
import { csvParam, limitParam } from '../../src/api/query.js';
import { type Authenticator, type RouteDefinition, RouteRegistry } from '../../src/api/route-registry.js';
import { ApiError } from '../../src/http/api-error.js';
import { createHttpApp } from '../../src/http/app.js';
import { silentLogger } from '../support/silent-logger.js';

/** The error of an API error response, with `details` loosely typed for assertions. */
function errorOf(response: Response) {
	return (response.body as ApiErrorBody).error as ApiErrorBody['error'] & {
		details: { issues: { path: string[] }[] } & Record<string, unknown>;
	};
}

const authenticate: Authenticator = (req, required) => {
	if (req.get('Authorization') === 'Bearer good') {
		req.auth = { username: 'admin', edition: 'ce', expiresAt: new Date() };
	} else if (required || req.get('Authorization') !== undefined) {
		return Promise.reject(new ApiError('UNAUTHORIZED', 'Missing access token', { reason: 'missing' }));
	}

	return Promise.resolve();
};

function registry(edition: 'ce' | 'pro') {
	const routes = new RouteRegistry(edition);

	routes.tag('Rooms', 'Room sessions');
	routes.register({
		method: 'get',
		path: '/rooms',
		edition: 'ce',
		operationId: 'listRooms',
		summary: 'List rooms',
		tags: ['Rooms'],
		security: 'bearer',
		request: { query: z.object({ limit: z.coerce.number().int().max(100).default(25) }) },
		responses: { 200: { description: 'Rooms', schema: z.object({ limit: z.number() }) } },
		handler: ({ query }) => query
	});
	routes.register({
		method: 'get',
		path: '/rooms/{sid}',
		edition: 'pro',
		feature: 'room-detail',
		operationId: 'getRoom',
		summary: 'Room detail',
		tags: ['Rooms'],
		security: 'bearer',
		request: { params: z.object({ sid: z.string() }) },
		responses: { 200: { description: 'Room' } }
	});

	return routes;
}

const SUMMARY: RouteDefinition = {
	method: 'get',
	path: '/rooms/summary',
	edition: 'ce',
	operationId: 'getRoomsSummary',
	summary: 'Rooms summary',
	tags: ['Rooms'],
	security: 'bearer',
	responses: { 200: { description: 'Summary' } },
	handler: () => ({ summary: true })
};

const ROOM_DETAIL: RouteDefinition = {
	method: 'get',
	path: '/rooms/{sid}',
	edition: 'pro',
	feature: 'room-detail',
	operationId: 'getRoom',
	summary: 'Room detail',
	tags: ['Rooms'],
	security: 'bearer',
	responses: { 200: { description: 'Room' } }
};

/** A literal route, the lock it must precede and a CE route after them. */
function locked(edition: 'ce' | 'pro') {
	const routes = new RouteRegistry(edition);

	routes.tag('Rooms', 'Room sessions');
	routes.register(SUMMARY);
	routes.lock({ method: 'get', path: '/rooms/{sid}', feature: 'room-detail' });
	routes.register({
		...SUMMARY,
		path: '/rooms/{sid}/events',
		operationId: 'listRoomEvents',
		handler: () => ({ events: [] })
	});

	return routes;
}

function app(routes: RouteRegistry, docs: boolean) {
	return createHttpApp({
		logger: silentLogger(),
		appRoot: '/nonexistent',
		trustProxy: false,
		apiRouter: routes.router(authenticate),
		...(docs ? { docsRouter: docsRouter(() => openApiDocument(routes, { version: '3.10.0' })) } : {})
	});
}

describe('route registry', () => {
	it('authenticates, validates and answers a CE route', async () => {
		const server = app(registry('ce'), false);

		expect((await request(server).get('/api/v1/rooms')).status).toBe(401);
		expect((await request(server).get('/api/v1/rooms?limit=500').set('Authorization', 'Bearer good')).status).toBe(
			400
		);
		expect((await request(server).get('/api/v1/rooms').set('Authorization', 'Bearer good')).body).toEqual({
			limit: 25
		});
	});

	it('answers PRO routes on CE with PRO_FEATURE after authentication', async () => {
		const server = app(registry('ce'), false);
		const anonymous = await request(server).get('/api/v1/rooms/RM_abc');
		const authenticated = await request(server).get('/api/v1/rooms/RM_abc').set('Authorization', 'Bearer good');

		expect(anonymous.status).toBe(401);
		expect(authenticated.status).toBe(403);
		expect(authenticated.body).toEqual({
			error: {
				code: 'PRO_FEATURE',
				message: 'This feature requires OpenVidu PRO',
				details: { feature: 'room-detail' }
			}
		});
	});

	it('refuses duplicate routes and PRO routes without a feature', () => {
		const routes = registry('ce');

		expect(() => {
			routes.register({
				method: 'get',
				path: '/rooms',
				edition: 'ce',
				operationId: 'listRoomsAgain',
				summary: '',
				tags: [],
				security: 'public',
				responses: {}
			});
		}).toThrow();
		expect(() => {
			routes.register({
				method: 'get',
				path: '/participants/{sid}',
				edition: 'pro',
				operationId: 'getParticipant',
				summary: '',
				tags: [],
				security: 'bearer',
				responses: {}
			});
		}).toThrow();
	});

	it('documents every registered route in OpenAPI 3.1', async () => {
		const routes = registry('ce');
		const response = await request(app(routes, true)).get('/api/v1/docs/openapi.json');
		const document = response.body as { openapi: string; paths: Record<string, Record<string, unknown>> };

		expect(response.status).toBe(200);
		expect(document.openapi).toBe('3.1.0');

		for (const route of routes.list()) {
			expect(
				document.paths[`/api/v1${route.path}`]?.[route.method],
				`${route.method} ${route.path}`
			).toBeDefined();
		}

		expect((await request(app(routes, true)).get('/api/v1/docs')).text).toContain('createApiReference');
	});

	it('answers a lock with PRO_FEATURE after authentication and leaves it out of the document', async () => {
		const routes = locked('ce');
		const server = app(routes, true);
		const authenticated = await request(server).get('/api/v1/rooms/RM_abc').set('Authorization', 'Bearer good');
		const document = (await request(server).get('/api/v1/docs/openapi.json')).body as {
			paths: Record<string, unknown>;
		};

		expect((await request(server).get('/api/v1/rooms/RM_abc')).status).toBe(401);
		expect(authenticated.status).toBe(403);
		expect(errorOf(authenticated)).toEqual({
			code: 'PRO_FEATURE',
			message: 'This feature requires OpenVidu PRO',
			details: { feature: 'room-detail' }
		});
		expect(Object.keys(document.paths)).toEqual(['/api/v1/rooms/summary', '/api/v1/rooms/{sid}/events']);
		expect(routes.unimplemented()).toEqual(['GET /rooms/{sid}']);
	});

	it('replaces a lock where it was declared', async () => {
		const routes = locked('pro');

		routes.register({
			...ROOM_DETAIL,
			request: { params: z.object({ sid: z.string() }) },
			handler: ({ params }) => params
		});

		const server = app(routes, false);

		expect(routes.list().map((route) => route.path)).toEqual([
			'/rooms/summary',
			'/rooms/{sid}',
			'/rooms/{sid}/events'
		]);
		expect(routes.unimplemented()).toEqual([]);
		expect((await request(server).get('/api/v1/rooms/summary').set('Authorization', 'Bearer good')).body).toEqual({
			summary: true
		});
		expect((await request(server).get('/api/v1/rooms/RM_abc').set('Authorization', 'Bearer good')).body).toEqual({
			sid: 'RM_abc'
		});
	});

	it('refuses to lock a registered route and to replace a lock with another feature', () => {
		const routes = locked('pro');

		expect(() => {
			routes.lock({ method: 'get', path: '/rooms/summary', feature: 'room-detail' });
		}).toThrow('already registered');
		expect(() => {
			routes.register({ ...ROOM_DETAIL, feature: 'participant-detail' });
		}).toThrow('locked for the feature room-detail');
		routes.register(ROOM_DETAIL);
		expect(() => {
			routes.register(ROOM_DETAIL);
		}).toThrow('already registered');
	});

	it('replaces a registered route in place and refuses unknown routes and locks', async () => {
		const routes = locked('pro');

		routes.replace({ ...SUMMARY, handler: () => ({ summary: 'extended' }) });

		expect(routes.list().map((route) => route.path)).toEqual(['/rooms/summary', '/rooms/{sid}/events']);
		expect(
			(await request(app(routes, false)).get('/api/v1/rooms/summary').set('Authorization', 'Bearer good')).body
		).toEqual({ summary: 'extended' });
		expect(() => {
			routes.replace({ ...SUMMARY, path: '/rooms/unknown', operationId: 'getUnknown' });
		}).toThrow('not registered');
		expect(() => {
			routes.replace(ROOM_DETAIL);
		}).toThrow('not registered');
	});

	it('serves no documentation in production', async () => {
		const server = app(registry('ce'), false);

		for (const path of ['/api/v1/docs', '/api/v1/docs/openapi.json']) {
			const response = await request(server).get(path);

			expect(response.status, path).toBe(404);
			expect(errorOf(response).code).toBe('NOT_FOUND');
		}
	});
});

describe('OpenAPI document', () => {
	interface Operation {
		operationId: string;
		tags: string[];
		security: Record<string, string[]>[];
		parameters?: {
			name: string;
			in: string;
			description?: string;
			style?: string;
			explode?: boolean;
			schema: { type?: string; items?: { enum?: string[] } };
		}[];
		responses: Record<string, { content?: Record<string, { schema: { $ref?: string } }>; headers?: object }>;
	}
	interface Document {
		info: { description: string; license: { name: string; identifier?: string } };
		servers: { url: string }[];
		tags: { name: string; description: string }[];
		paths: Record<string, Record<string, Operation>>;
		components: { securitySchemes: Record<string, { in?: string; name?: string }> };
	}

	function documentOf(routes: RouteRegistry, options: Partial<Parameters<typeof openApiDocument>[1]> = {}): Document {
		return openApiDocument(routes, { version: '3.10.0', ...options }) as unknown as Document;
	}

	it('refuses an undeclared tag and a repeated operationId', () => {
		const routes = registry('ce');

		expect(() => {
			routes.register({ ...SUMMARY, tags: ['Unknown'] });
		}).toThrow('undeclared tag Unknown');
		expect(() => {
			routes.register({ ...SUMMARY, operationId: 'listRooms' });
		}).toThrow('reuses the operationId listRooms');
		expect(() => {
			routes.tag('Rooms', 'Another description');
		}).toThrow('already declared');
	});

	it('carries the conventions, the license, the base path and the used tags', () => {
		const routes = registry('pro');

		routes.tag('Unused', 'No operation uses it');

		const document = documentOf(routes, { basePath: '/dashboard/' });

		expect(document.servers).toEqual([{ url: '/dashboard' }]);
		expect(document.info.license).toEqual({ name: 'Apache 2.0', identifier: 'Apache-2.0' });
		expect(document.info.description).toContain('If-None-Match');
		expect(document.tags).toEqual([{ name: 'Rooms', description: 'Room sessions' }]);
		expect(documentOf(routes).servers).toEqual([{ url: '/' }]);
		expect(documentOf(routes, { license: { name: 'Commercial' } }).info.license).toEqual({ name: 'Commercial' });
	});

	it('declares the errors each operation can answer, with the ApiError body', () => {
		const routes = registry('pro');

		routes.register({
			...SUMMARY,
			responses: {
				200: { description: 'Summary' },
				403: { description: 'Locked on CE', edition: 'ce' },
				429: { description: 'Too many requests' }
			}
		});

		const document = documentOf(routes);
		const list = document.paths['/api/v1/rooms']?.get;
		const detail = document.paths['/api/v1/rooms/{sid}']?.get;
		const summary = document.paths['/api/v1/rooms/summary']?.get;

		expect(list?.operationId).toBe('listRooms');
		expect(Object.keys(list?.responses ?? {})).toEqual(['200', '400', '401']);
		expect(Object.keys(detail?.responses ?? {})).toEqual(['200', '400', '401']);
		expect(Object.keys(summary?.responses ?? {})).toEqual(['200', '401', '429']);
		expect(summary?.responses['429']?.content?.['application/json']?.schema.$ref).toBe(
			'#/components/schemas/ApiError'
		);
		expect(
			Object.keys(documentOf(routesWithCeError('ce')).paths['/api/v1/rooms/summary']?.get?.responses ?? {})
		).toContain('403');
	});

	it('declares If-None-Match on conditional operations and the refresh cookie of the auth routes', () => {
		const routes = registry('ce');

		routes.register({
			...SUMMARY,
			security: 'public',
			refreshCookie: 'optional',
			responses: { 200: { description: 'Summary' }, 304: { description: 'Unchanged' } }
		});

		const document = documentOf(routes);
		const summary = document.paths['/api/v1/rooms/summary']?.get;

		expect(summary?.parameters?.map((parameter) => `${parameter.in}:${parameter.name}`)).toEqual([
			'header:If-None-Match'
		]);
		expect(summary?.security).toEqual([{}, { refreshCookie: [] }]);
		expect(document.components.securitySchemes.refreshCookie).toMatchObject({
			in: 'cookie',
			name: 'ov_dashboard_refresh'
		});
	});

	it('describes every parameter and renders comma-separated lists as arrays', () => {
		const routes = new RouteRegistry('ce');

		routes.tag('Rooms', 'Room sessions');
		routes.register({
			...SUMMARY,
			request: {
				query: z.object({
					kind: csvParam(['STANDARD', 'AGENT']).optional().meta({ description: 'Kinds to keep' }),
					limit: limitParam
				})
			}
		});

		const parameters = documentOf(routes).paths['/api/v1/rooms/summary']?.get?.parameters ?? [];

		expect(parameters.find((parameter) => parameter.name === 'kind')).toMatchObject({
			description: 'Kinds to keep',
			style: 'form',
			explode: false,
			schema: { type: 'array', items: { enum: ['STANDARD', 'AGENT'] } }
		});
		expect(parameters.find((parameter) => parameter.name === 'limit')?.description).toBe(
			'Page size, from 1 to 100'
		);
	});
});

/** A registry whose summary declares an error only CE answers. */
function routesWithCeError(edition: 'ce' | 'pro') {
	const routes = registry(edition);

	routes.register({
		...SUMMARY,
		responses: { 200: { description: 'Summary' }, 403: { description: 'Locked on CE', edition: 'ce' } }
	});

	return routes;
}
