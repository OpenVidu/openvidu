import { DestroyRef, Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { RefreshIntervalMs } from '@openvidu-dashboard/typings';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PreferencesService } from '../preferences/preferences.js';
import { injectRefreshScheduler, RefreshRegistry, RefreshScheduler } from './refresh.js';

class FakeDocument {
	hidden = false;
}

describe('RefreshScheduler', () => {
	let preferences: PreferencesService;
	let document: FakeDocument;
	let load: ReturnType<typeof vi.fn<() => Promise<unknown>>>;

	beforeEach(() => {
		vi.useFakeTimers();
		TestBed.configureTestingModule({});
		preferences = TestBed.inject(PreferencesService);
		document = new FakeDocument();
		load = vi.fn<() => Promise<unknown>>(() => Promise.resolve());
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	function create(): RefreshScheduler {
		const scheduler = new RefreshScheduler({ load }, preferences, document as Document);

		scheduler.configure(true, preferences.refreshInterval('live'));

		return scheduler;
	}

	it('refreshes on the live interval of the preferences', async () => {
		create();

		await vi.advanceTimersByTimeAsync(9_999);
		expect(load).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(load).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(10_000);
		expect(load).toHaveBeenCalledTimes(2);
	});

	it('never starts a request while one is in flight', async () => {
		let finish: () => void = () => undefined;

		load.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					finish = resolve;
				})
		);

		const scheduler = create();

		await vi.advanceTimersByTimeAsync(10_000);
		expect(scheduler.inFlight()).toBe(true);
		await scheduler.refresh();
		await vi.advanceTimersByTimeAsync(15_000);
		expect(load).toHaveBeenCalledTimes(1);

		finish();
		await vi.advanceTimersByTimeAsync(0);
		expect(scheduler.inFlight()).toBe(false);
		await vi.advanceTimersByTimeAsync(10_000);
		expect(load).toHaveBeenCalledTimes(2);
	});

	it('backs off 10 → 20 → 40 s up to 5 min, reports the error once and resets on success', async () => {
		const failure = new Error('down');

		load.mockRejectedValue(failure);

		const scheduler = create();
		const calls: number[] = [];

		load.mockImplementation(() => {
			calls.push(Date.now());

			return Promise.reject(failure);
		});

		const start = Date.now();

		await vi.advanceTimersByTimeAsync(10_000 + 10_000 + 20_000 + 40_000 + 80_000 + 160_000 + 300_000 + 300_000);

		expect(calls.map((at) => (at - start) / 1000)).toEqual([10, 20, 40, 80, 160, 320, 620, 920]);
		expect(scheduler.error()).toBe(failure);

		load.mockResolvedValue(undefined);
		await vi.advanceTimersByTimeAsync(300_000);
		expect(scheduler.error()).toBeNull();
		expect(scheduler.lastUpdated()).not.toBeNull();

		const before = load.mock.calls.length;

		await vi.advanceTimersByTimeAsync(10_000);
		expect(load.mock.calls.length).toBe(before + 1);
	});

	it('pauses while hidden and fetches at once when visible again', async () => {
		const scheduler = create();

		document.hidden = true;
		scheduler.visibilityChanged();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(load).not.toHaveBeenCalled();

		document.hidden = false;
		scheduler.visibilityChanged();
		await vi.advanceTimersByTimeAsync(0);
		expect(load).toHaveBeenCalledTimes(1);
	});

	it('stops when the entity is no longer live, when the interval is off and when destroyed', async () => {
		const scheduler = create();

		scheduler.configure(false, 10_000);
		await vi.advanceTimersByTimeAsync(60_000);
		expect(load).not.toHaveBeenCalled();

		scheduler.configure(true, 0);
		await vi.advanceTimersByTimeAsync(60_000);
		expect(load).not.toHaveBeenCalled();

		scheduler.configure(true, 30_000);
		scheduler.destroy();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(load).not.toHaveBeenCalled();
	});

	it('stores the interval for every live view', () => {
		const scheduler = create();

		scheduler.setInterval(30_000);

		expect(preferences.refreshInterval('live')).toBe(30_000);
	});

	it('never polls when manual, whatever the preference', async () => {
		const scheduler = new RefreshScheduler({ load, manual: true }, preferences, document as Document);

		scheduler.configure(true, scheduler.interval());

		expect(scheduler.interval()).toBe(0);
		await vi.advanceTimersByTimeAsync(60_000);
		expect(load).not.toHaveBeenCalled();
		await scheduler.refresh();
		expect(load).toHaveBeenCalledTimes(1);
	});
});

describe('injectRefreshScheduler', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('loads once, stops while paused and unregisters on destroy', async () => {
		vi.useFakeTimers();
		TestBed.configureTestingModule({});

		const load = vi.fn(() => Promise.resolve());
		const paused = signal<string | null>(null);
		const injector = Injector.create({ providers: [], parent: TestBed.inject(Injector) });
		const scheduler = runInInjectionContext(injector, () => injectRefreshScheduler({ load, paused }));
		const registry = TestBed.inject(RefreshRegistry);

		TestBed.tick();
		await vi.advanceTimersByTimeAsync(0);
		expect(load).toHaveBeenCalledTimes(1);
		expect(registry.active()).toBe(scheduler);

		await vi.advanceTimersByTimeAsync(10_000);
		expect(load).toHaveBeenCalledTimes(2);

		paused.set('Room has ended');
		TestBed.tick();
		await vi.advanceTimersByTimeAsync(30_000);
		expect(load).toHaveBeenCalledTimes(2);
		expect(scheduler.pausedReason()).toBe('Room has ended');
		expect(scheduler.interval()).toBe(10_000);

		(injector.get(DestroyRef) as DestroyRef & { destroy(): void }).destroy();
		expect(registry.active()).toBeNull();
	});

	it('follows a fixed interval instead of the preference and leaves the header control alone', async () => {
		vi.useFakeTimers();
		TestBed.configureTestingModule({});
		TestBed.inject(PreferencesService).setRefreshInterval('live', 0);

		const load = vi.fn(() => Promise.resolve());
		const interval = signal<RefreshIntervalMs>(30_000);
		const injector = Injector.create({ providers: [], parent: TestBed.inject(Injector) });
		const scheduler = runInInjectionContext(injector, () =>
			injectRefreshScheduler({ load, register: false, interval })
		);

		TestBed.tick();
		await vi.advanceTimersByTimeAsync(0);
		expect(load).toHaveBeenCalledTimes(1);
		expect(scheduler.interval()).toBe(30_000);
		expect(TestBed.inject(RefreshRegistry).active()).toBeNull();

		await vi.advanceTimersByTimeAsync(30_000);
		expect(load).toHaveBeenCalledTimes(2);

		interval.set(10_000);
		TestBed.tick();
		await vi.advanceTimersByTimeAsync(10_000);
		expect(load).toHaveBeenCalledTimes(3);

		(injector.get(DestroyRef) as DestroyRef & { destroy(): void }).destroy();
		await vi.advanceTimersByTimeAsync(30_000);
		expect(load).toHaveBeenCalledTimes(3);
	});
});
