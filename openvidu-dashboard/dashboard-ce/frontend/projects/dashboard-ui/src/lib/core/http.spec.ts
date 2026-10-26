import { HttpHeaders, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiRequestError } from './api-error.js';
import { dispositionFileName, HttpService, REQUEST_TIMEOUT_MS } from './http.js';

describe('HttpService', () => {
	let http: HttpService;
	let controller: HttpTestingController;

	afterEach(() => {
		vi.useRealTimers();
	});

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
		http = TestBed.inject(HttpService);
		controller = TestBed.inject(HttpTestingController);
	});

	it('requests API paths relative to the document base with CSV and empty-free parameters', async () => {
		const result = http.get<{ items: [] }>('rooms', {
			params: { status: ['active', 'closed'], q: '', limit: 25, cursor: undefined }
		});
		const request = controller.expectOne((req) => req.url === 'api/v1/rooms');

		expect(request.request.urlWithParams).toBe('api/v1/rooms?status=active,closed&limit=25');
		request.flush({ items: [] });
		expect(await result).toEqual({ items: [] });
	});

	it.each([
		[400, 'VALIDATION_ERROR'],
		[403, 'PRO_FEATURE'],
		[404, 'NOT_FOUND'],
		[500, 'INTERNAL_ERROR'],
		[503, 'NOT_READY']
	] as const)('maps a %i envelope to ApiRequestError with its code and request id', async (status, code) => {
		const result = http.get('rooms');

		controller
			.expectOne('api/v1/rooms')
			.flush(
				{ error: { code, message: 'nope', details: { feature: 'room-detail' } } },
				{ status, statusText: 'Error', headers: new HttpHeaders({ 'X-Request-Id': 'req-1' }) }
			);

		const error = await result.catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(ApiRequestError);
		expect(error).toMatchObject({
			status,
			code,
			message: 'nope',
			details: { feature: 'room-detail' },
			requestId: 'req-1'
		});
	});

	it('reads Retry-After of a 429', async () => {
		const result = http.post('auth/login', { username: 'a', password: 'b' });

		controller
			.expectOne('api/v1/auth/login')
			.flush(
				{ error: { code: 'RATE_LIMITED', message: 'slow down' } },
				{ status: 429, statusText: 'Too Many Requests', headers: new HttpHeaders({ 'Retry-After': '42' }) }
			);

		await expect(result).rejects.toMatchObject({ code: 'RATE_LIMITED', retryAfter: 42 });
	});

	it('maps bodies without an envelope and network failures', async () => {
		const html = http.get('info');

		controller.expectOne('api/v1/info').flush('<html>', { status: 502, statusText: 'Bad Gateway' });
		await expect(html).rejects.toMatchObject({ status: 502, code: 'UNKNOWN_ERROR' });

		const offline = http.get('info');

		controller.expectOne('api/v1/info').error(new ProgressEvent('error'), { status: 0 });
		await expect(offline).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
	});

	it('cancels a read that does not answer in time and reports a timeout', async () => {
		vi.useFakeTimers();

		const hung = http.get('rooms');
		const request = controller.expectOne('api/v1/rooms');
		const failure = expect(hung).rejects.toMatchObject({ status: 0, code: 'TIMEOUT' });

		await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
		await failure;
		expect(request.cancelled).toBe(true);
	});

	it('sends a conditional GET and resolves a 304 with the validator', async () => {
		const fresh = http.getConditional<{ sid: string }>('rooms/RM_a', null);
		const first = controller.expectOne('api/v1/rooms/RM_a');

		expect(first.request.headers.has('If-None-Match')).toBe(false);
		first.flush({ sid: 'RM_a' }, { headers: new HttpHeaders({ ETag: 'W/"1-2"' }) });
		expect(await fresh).toEqual({ status: 200, body: { sid: 'RM_a' }, etag: 'W/"1-2"' });

		const unchanged = http.getConditional('rooms/RM_a', 'W/"1-2"', { headers: { 'X-Test': '1' } });
		const second = controller.expectOne('api/v1/rooms/RM_a');

		expect(second.request.headers.get('If-None-Match')).toBe('W/"1-2"');
		expect(second.request.headers.get('X-Test')).toBe('1');
		second.flush(null, { status: 304, statusText: 'Not Modified' });
		expect(await unchanged).toEqual({ status: 304, etag: 'W/"1-2"' });

		const missing = http.getConditional('rooms/RM_b', 'W/"1-2"');

		controller
			.expectOne('api/v1/rooms/RM_b')
			.flush(
				{ error: { code: 'NOT_FOUND', message: 'Room not found' } },
				{ status: 404, statusText: 'Not Found' }
			);
		await expect(missing).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
	});

	it('downloads a file with the name of its Content-Disposition, quoted or not', async () => {
		const download = http.download('analytics/export.csv', { params: { kind: 'series' } });

		controller
			.expectOne('api/v1/analytics/export.csv?kind=series')
			.flush(new Blob(['a,b\r\n']), { headers: { 'Content-Disposition': 'attachment; filename=x-1.csv' } });

		expect((await download).fileName).toBe('x-1.csv');
		expect(dispositionFileName('attachment; filename="report 2.csv"')).toBe('report 2.csv');
		expect(dispositionFileName(null)).toBeNull();
	});
});
