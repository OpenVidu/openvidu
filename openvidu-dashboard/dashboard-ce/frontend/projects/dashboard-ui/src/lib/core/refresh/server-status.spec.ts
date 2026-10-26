import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DestroyRef, Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { infoResponse, statusResponse } from '../../../testing/fixtures.js';
import { InfoService } from '../info.js';
import { PreferencesService } from '../preferences/preferences.js';
import { injectServerStatusPoll, ServerStatusService } from './server-status.js';

describe('ServerStatusService', () => {
	let controller: HttpTestingController;
	let status: ServerStatusService;

	beforeEach(() => {
		vi.useFakeTimers();
		TestBed.configureTestingModule({
			providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
		});
		controller = TestBed.inject(HttpTestingController);
		status = TestBed.inject(ServerStatusService);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	async function answer(body: object): Promise<void> {
		const load = status.load();

		controller.expectOne('api/v1/status').flush(body);
		await load;
	}

	it('judges the writer at the instant of the response', async () => {
		expect(status.writerFresh()).toBe(true);
		expect(status.writerSilent()).toBe(false);

		await answer(statusResponse({}, 25_000));
		expect(status.writerAgeMs()).toBe(25_000);
		expect(status.writerFresh()).toBe(true);

		await vi.advanceTimersByTimeAsync(10 * 60_000);
		expect(status.writerFresh()).toBe(true);
		expect(status.writerSilent()).toBe(false);

		await answer(statusResponse({}, 45_000));
		expect(status.writerFresh()).toBe(false);
		expect(status.writerSilent()).toBe(false);

		await answer(statusResponse({}, 3 * 60_000));
		expect(status.writerSilent()).toBe(false);
		await answer(statusResponse({}, 3 * 60_000));
		expect(status.writerSilent()).toBe(true);

		await answer(statusResponse({}, 5_000));
		expect(status.writerSilent()).toBe(false);
	});

	it('shows the silent banner only after two silent statuses in a row', async () => {
		await answer(statusResponse({}, 3 * 60_000));
		await answer(statusResponse({}, 5_000));
		await answer(statusResponse({}, 3 * 60_000));
		expect(status.writerSilent()).toBe(false);
	});

	it('widens the windows for a slow writer and keeps 30 and 60 s for a fast one', async () => {
		const slow = (age: number) =>
			statusResponse(
				{
					writer: {
						lastSeenAt: new Date(Date.parse('2026-10-13T12:00:00.000Z') - age).toISOString(),
						nodes: 1,
						aliveNodes: 1,
						batchIntervalMs: 60_000
					}
				},
				age
			);

		await answer(slow(80_000));
		expect(status.windows()).toMatchObject({ freshMs: 95_000, silentMs: 135_000 });
		expect(status.writerFresh()).toBe(true);
		await answer(slow(100_000));
		await answer(slow(100_000));
		expect(status.writerFresh()).toBe(false);
		expect(status.writerSilent()).toBe(false);

		await answer(statusResponse({ writer: { nodes: 1, aliveNodes: 1, batchIntervalMs: 1_000 } }, 4_000));
		expect(status.windows()).toMatchObject({ freshMs: 30_000, silentMs: 60_000 });
	});

	it('reports a writer never seen as silent once the schema exists, never during a migration', async () => {
		await answer(statusResponse({ schema: { dashboard: 2, status: 'uninitialized' } }, null));
		expect(status.writerFresh()).toBe(false);
		expect(status.writerSilent()).toBe(false);

		await answer(statusResponse({}, null));
		await answer(statusResponse({}, null));
		expect(status.writerSilent()).toBe(true);

		await answer(
			statusResponse({ migration: { state: 'running', progress: { processed: 1, total: 4 } } }, 5 * 60_000)
		);
		expect(status.writerSilent()).toBe(false);
	});
});

describe('injectServerStatusPoll', () => {
	let controller: HttpTestingController;
	let injector: Injector;

	beforeEach(() => {
		vi.useFakeTimers();
		TestBed.configureTestingModule({
			providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
		});
		controller = TestBed.inject(HttpTestingController);
		TestBed.inject(PreferencesService).setRefreshInterval('live', 0);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	async function start(info = infoResponse()): Promise<void> {
		const load = TestBed.inject(InfoService).load();

		controller.expectOne('api/v1/info').flush(info);
		await load;
		injector = Injector.create({ providers: [], parent: TestBed.inject(Injector) });
		runInInjectionContext(injector, () => injectServerStatusPoll());
		TestBed.tick();
	}

	async function poll(body: object): Promise<void> {
		controller.expectOne('api/v1/status').flush(body);
		await vi.advanceTimersByTimeAsync(0);
		TestBed.tick();
	}

	it('polls every 30 s whatever the auto-refresh, every 10 s while migrating, and stops with the frame', async () => {
		await start();
		await poll(statusResponse());

		await vi.advanceTimersByTimeAsync(29_999);
		controller.expectNone('api/v1/status');
		await vi.advanceTimersByTimeAsync(1);
		await poll(statusResponse({ migration: { state: 'running', progress: { processed: 1, total: 4 } } }));
		controller.expectOne('api/v1/info').flush(infoResponse());

		await vi.advanceTimersByTimeAsync(10_000);
		await poll(statusResponse({ migration: { state: 'running', progress: { processed: 2, total: 4 } } }));
		await vi.advanceTimersByTimeAsync(10_000);
		await poll(statusResponse());
		controller.expectNone('api/v1/info');

		await vi.advanceTimersByTimeAsync(10_000);
		controller.expectNone('api/v1/status');
		await vi.advanceTimersByTimeAsync(20_000);
		await poll(statusResponse());

		(injector.get(DestroyRef) as DestroyRef & { destroy(): void }).destroy();
		await vi.advanceTimersByTimeAsync(60_000);
		controller.expectNone('api/v1/status');
	});

	it('re-reads the info document once when the migration ends, never while the server is steady', async () => {
		await start(infoResponse({ migration: { state: 'running', progress: { processed: 1, total: 4 } } }));
		await poll(statusResponse({ migration: { state: 'running', progress: { processed: 2, total: 4 } } }));
		controller.expectNone('api/v1/info');

		await vi.advanceTimersByTimeAsync(10_000);
		await poll(statusResponse());

		const reread = controller.expectOne('api/v1/info');

		reread.flush(infoResponse({ versions: { dashboard: '3.10.0', server: '3.10.1' } }));
		await vi.advanceTimersByTimeAsync(0);
		expect(TestBed.inject(InfoService).info()?.versions.server).toBe('3.10.1');

		for (let tick = 0; tick < 20; tick++) {
			await vi.advanceTimersByTimeAsync(30_000);
			await poll(statusResponse());
		}

		controller.expectNone('api/v1/info');
	});
});
