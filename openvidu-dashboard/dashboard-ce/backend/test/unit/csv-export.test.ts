import request from 'supertest';
import { describe, expect, it } from 'vitest';
import * as z from 'zod';

import { LIST_EXPORT_MAX_ROWS, type ListResponse } from '@openvidu-dashboard/typings';

import { listRows, registerCsvExport } from '../../src/api/csv-export.js';
import { docsRouter, openApiDocument } from '../../src/api/openapi.js';
import type { ListOptions } from '../../src/api/responses.js';
import { type Authenticator, RouteRegistry } from '../../src/api/route-registry.js';
import { createHttpApp } from '../../src/http/app.js';
import { silentLogger } from '../support/silent-logger.js';

interface Item {
	sid: string;
}

/** A list of `count` items that records the parameters and options it was called with. */
function stubList(count: number) {
	const calls: { params: { q?: string | undefined; cursor: undefined; limit: number }; options: ListOptions }[] = [];
	const list = (params: { q?: string | undefined; cursor: undefined; limit: number }, options: ListOptions) => {
		calls.push({ params, options });

		const items = Array.from({ length: Math.min(count, params.limit) }, (_, index) => ({
			sid: `RM_${String(index)}`
		}));

		return Promise.resolve<ListResponse<Item>>({
			items,
			nextCursor: count > params.limit ? 'next' : null,
			prevCursor: null
		});
	};

	return { list, calls };
}

const authenticate: Authenticator = (req) => {
	req.auth = { username: 'admin', edition: 'ce', expiresAt: new Date() };

	return Promise.resolve();
};

function app(count: number) {
	const routes = new RouteRegistry('ce');
	const { list } = stubList(count);

	routes.tag('Rooms', 'Room sessions');
	registerCsvExport(routes, {
		path: '/rooms/export.csv',
		operationId: 'exportRoomsCsv',
		summary: 'Rooms as CSV',
		tags: ['Rooms'],
		edition: 'ce',
		request: { query: z.object({ q: z.string().optional() }) },
		columns: () => [{ header: 'sid', value: (item: Item) => item.sid }],
		rows: ({ query }) => listRows(list, query),
		fileName: () => 'rooms-a-b.csv'
	});

	return {
		routes,
		server: createHttpApp({
			logger: silentLogger(),
			appRoot: '/nonexistent',
			trustProxy: false,
			apiRouter: routes.router(authenticate),
			docsRouter: docsRouter(() => openApiDocument(routes, { version: '3.10.0' }))
		})
	};
}

describe('list CSV export', () => {
	it('reads the list once with the cap as its page size and no total', async () => {
		const { list, calls } = stubList(3);
		const rows = await listRows(list, { q: 'sales' });

		expect(rows).toEqual({ items: [{ sid: 'RM_0' }, { sid: 'RM_1' }, { sid: 'RM_2' }], truncated: false });
		expect(calls).toEqual([
			{ params: { q: 'sales', cursor: undefined, limit: LIST_EXPORT_MAX_ROWS }, options: { total: false } }
		]);
	});

	it('is cut at the cap when the list holds more', async () => {
		const { list } = stubList(LIST_EXPORT_MAX_ROWS + 5);
		const rows = await listRows(list, {});

		expect(rows.items).toHaveLength(LIST_EXPORT_MAX_ROWS);
		expect(rows.truncated).toBe(true);
	});

	it('answers a CSV attachment, with the truncation header only when cut', async () => {
		const whole = await request(app(2).server).get('/api/v1/rooms/export.csv');

		expect(whole.status).toBe(200);
		expect(whole.headers['content-type']).toBe('text/csv; charset=utf-8');
		expect(whole.headers['content-disposition']).toBe('attachment; filename=rooms-a-b.csv');
		expect(whole.headers['x-export-truncated']).toBeUndefined();
		expect(whole.text).toBe('sid\r\nRM_0\r\nRM_1\r\n');

		const cut = await request(app(LIST_EXPORT_MAX_ROWS + 1).server).get('/api/v1/rooms/export.csv');

		expect(cut.headers['x-export-truncated']).toBe('true');
		expect(cut.text.split('\r\n')).toHaveLength(LIST_EXPORT_MAX_ROWS + 2);
	});

	it('documents the CSV response and its truncation header', () => {
		const document = openApiDocument(app(0).routes, { version: '3.10.0' }) as {
			paths: Record<string, { get: { responses: Record<string, { content?: object; headers?: object }> } }>;
		};
		const ok = document.paths['/api/v1/rooms/export.csv']?.get.responses['200'];

		expect(Object.keys(ok?.content ?? {})).toEqual(['text/csv; charset=utf-8']);
		expect(Object.keys(ok?.headers ?? {})).toEqual(['X-Export-Truncated']);
		expect(Object.keys(document.paths['/api/v1/rooms/export.csv']?.get.responses ?? {})).toEqual([
			'200',
			'400',
			'401'
		]);
	});
});
