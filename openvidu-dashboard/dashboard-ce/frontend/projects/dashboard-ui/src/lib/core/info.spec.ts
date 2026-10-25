import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { infoResponse } from '../../testing/fixtures.js';
import { HttpService } from './http.js';
import { FeatureService, InfoService, proFeatureInterceptor } from './info.js';

describe('InfoService', () => {
	let info: InfoService;
	let controller: HttpTestingController;

	beforeEach(() => {
		vi.useFakeTimers();
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				provideHttpClient(withInterceptors([proFeatureInterceptor])),
				provideHttpClientTesting()
			]
		});
		info = TestBed.inject(InfoService);
		controller = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	async function answer(body: object): Promise<void> {
		const load = info.load();

		controller.expectOne('api/v1/info').flush(body);
		await load;
	}

	it('exposes the public subset before sign-in', async () => {
		await answer({ edition: 'ce', versions: { dashboard: '3.10.0' } });

		expect(info.edition()).toBe('ce');
		expect(info.dashboardVersion()).toBe('3.10.0');
		expect(info.info()).toBeNull();
	});

	it('never polls, even while the migration runs or the schema is uninitialized', async () => {
		await answer(infoResponse({ migration: { state: 'running', progress: { processed: 1, total: 4 } } }));
		await vi.advanceTimersByTimeAsync(60_000);
		controller.expectNone('api/v1/info');

		await answer(infoResponse({ schema: { dashboard: 1, status: 'uninitialized' } }));
		await vi.advanceTimersByTimeAsync(60_000);
		controller.expectNone('api/v1/info');
	});

	it('keeps the last document and records the error when a read fails', async () => {
		await answer(infoResponse({ features: ['room-detail'] }));

		const load = info.load();

		controller.expectOne('api/v1/info').flush(null, { status: 503, statusText: 'Unavailable' });
		await load;

		expect(info.error()?.status).toBe(503);
		expect(TestBed.inject(FeatureService).enabled('room-detail')).toBe(true);
	});

	it('locks every feature the document does not list', async () => {
		await answer(infoResponse({ edition: 'pro', features: ['room-detail', 'participant-detail'] }));

		const features = TestBed.inject(FeatureService);

		expect(features.enabled('room-detail')).toBe(true);
		expect(features.enabledSignal('participant-detail')()).toBe(true);
		expect(features.enabled('license-info')).toBe(false);
	});

	it('re-reads the info document when a request answers 403 PRO_FEATURE', async () => {
		await answer(infoResponse({ features: ['room-detail'] }));

		const detail = TestBed.inject(HttpService).get('rooms/RM_1');

		controller
			.expectOne('api/v1/rooms/RM_1')
			.flush(
				{ error: { code: 'PRO_FEATURE', message: 'PRO', details: { feature: 'room-detail' } } },
				{ status: 403, statusText: 'Forbidden' }
			);
		await expect(detail).rejects.toMatchObject({ code: 'PRO_FEATURE' });

		controller.expectOne('api/v1/info').flush(infoResponse());
		await vi.advanceTimersByTimeAsync(0);

		expect(TestBed.inject(FeatureService).enabled('room-detail')).toBe(false);
	});

	it('ignores other 403 errors', async () => {
		const detail = TestBed.inject(HttpService).get('rooms/RM_1');

		controller
			.expectOne('api/v1/rooms/RM_1')
			.flush({ error: { code: 'FORBIDDEN', message: 'no' } }, { status: 403, statusText: 'Forbidden' });
		await expect(detail).rejects.toMatchObject({ code: 'FORBIDDEN' });
		controller.expectNone('api/v1/info');
	});
});
