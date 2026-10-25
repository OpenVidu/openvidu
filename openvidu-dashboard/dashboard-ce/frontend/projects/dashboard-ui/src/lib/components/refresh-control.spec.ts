import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { RefreshRegistry, type RefreshScheduler } from '../core/refresh.js';
import { RefreshControl } from './refresh-control.js';

describe('RefreshControl', () => {
	it('disables the manual refresh while a request is in flight and shows the last update', async () => {
		TestBed.configureTestingModule({ providers: [provideRouter([])] });

		const inFlight = signal(true);
		const lastUpdated = signal<Date | null>(null);
		const refresh = vi.fn(() => Promise.resolve());
		const setInterval = vi.fn();
		const scheduler = {
			inFlight,
			lastUpdated,
			interval: () => 10_000,
			manual: false,
			pausedReason: () => null,
			refresh,
			setInterval
		} as unknown as RefreshScheduler;

		TestBed.inject(RefreshRegistry).register(scheduler);

		const fixture = TestBed.createComponent(RefreshControl);
		const element = fixture.nativeElement as HTMLElement;
		const button = (): HTMLButtonElement | null => element.querySelector('button[aria-label="Refresh now"]');

		await fixture.whenStable();
		expect(button()?.disabled).toBe(true);
		button()?.click();
		expect(refresh).not.toHaveBeenCalled();

		inFlight.set(false);
		lastUpdated.set(new Date('2026-10-13T12:40:05Z'));
		await fixture.whenStable();
		expect(button()?.disabled).toBe(false);
		expect(element.querySelector('.updated')?.textContent).toMatch(/^updated \d{2}:\d{2}:\d{2}/);
		expect(element.querySelector('.updated')?.getAttribute('aria-live')).toBe('polite');

		button()?.click();
		expect(refresh).toHaveBeenCalledTimes(1);
	});

	it('offers the intervals and the last update from an icon when compact', async () => {
		TestBed.configureTestingModule({ providers: [provideRouter([])] });

		const setInterval = vi.fn();
		const scheduler = {
			inFlight: signal(false),
			lastUpdated: signal(new Date('2026-10-13T12:40:05Z')),
			interval: () => 30_000,
			manual: false,
			pausedReason: () => null,
			refresh: vi.fn(() => Promise.resolve()),
			setInterval
		} as unknown as RefreshScheduler;

		TestBed.inject(RefreshRegistry).register(scheduler);

		const fixture = TestBed.createComponent(RefreshControl);

		fixture.componentRef.setInput('compact', true);
		await fixture.whenStable();

		const element = fixture.nativeElement as HTMLElement;
		const trigger = element.querySelector<HTMLButtonElement>('button.interval-icon');

		expect(trigger?.getAttribute('aria-label')).toBe('Auto-refresh: 30 s');
		expect(element.querySelector('.updated')?.classList.contains('ovd-visually-hidden')).toBe(true);

		trigger?.click();
		await fixture.whenStable();

		const menu = document.querySelector('.mat-mdc-menu-panel');
		const items = [...(menu?.querySelectorAll('[role="menuitemradio"]') ?? [])];

		expect(menu?.querySelector('.menu-updated')?.textContent).toMatch(/^updated \d{2}:\d{2}:\d{2}/);
		expect(items.map((item) => item.textContent.trim())).toEqual(['Off', '10 s', '30 s', '1 min', '5 min']);
		expect(items.find((item) => item.getAttribute('aria-checked') === 'true')?.textContent.trim()).toBe('30 s');

		(items[3] as HTMLButtonElement | undefined)?.click();
		expect(setInterval).toHaveBeenCalledWith(60_000);
	});

	it('shows only the refresh button and the update time for a manual scheduler', async () => {
		TestBed.configureTestingModule({ providers: [provideRouter([])] });

		const scheduler = {
			inFlight: signal(false),
			lastUpdated: signal(new Date('2026-10-13T12:40:05Z')),
			interval: () => 0,
			manual: true,
			pausedReason: () => null,
			refresh: vi.fn(() => Promise.resolve()),
			setInterval: vi.fn()
		} as unknown as RefreshScheduler;

		TestBed.inject(RefreshRegistry).register(scheduler);

		const fixture = TestBed.createComponent(RefreshControl);

		fixture.componentRef.setInput('compact', true);
		await fixture.whenStable();

		const element = fixture.nativeElement as HTMLElement;

		expect([...element.querySelectorAll('button')].map((button) => button.getAttribute('aria-label'))).toEqual([
			'Refresh now'
		]);
		expect(element.querySelector('.updated')?.classList.contains('ovd-visually-hidden')).toBe(false);
		expect(element.querySelector('.updated')?.textContent).toMatch(/^updated \d{2}:\d{2}:\d{2}/);
	});

	it('disables the interval with the pause reason and keeps the refresh button', async () => {
		TestBed.configureTestingModule({ providers: [provideRouter([])] });

		const refresh = vi.fn(() => Promise.resolve());
		const scheduler = {
			inFlight: signal(false),
			lastUpdated: signal(null),
			interval: () => 10_000,
			manual: false,
			pausedReason: () => 'Room has ended',
			refresh,
			setInterval: vi.fn()
		} as unknown as RefreshScheduler;

		TestBed.inject(RefreshRegistry).register(scheduler);

		const fixture = TestBed.createComponent(RefreshControl);

		await fixture.whenStable();

		const element = fixture.nativeElement as HTMLElement;
		const interval = element.querySelector<HTMLButtonElement>('button.interval');
		const host = element.querySelector('.interval-host');

		expect(interval?.disabled).toBe(true);
		host?.dispatchEvent(new MouseEvent('mouseenter'));
		await fixture.whenStable();
		expect(document.querySelector('.mat-mdc-tooltip')?.textContent.trim()).toBe('Room has ended');

		element.querySelector<HTMLButtonElement>('button[aria-label="Refresh now"]')?.click();
		expect(refresh).toHaveBeenCalledTimes(1);
	});

	it('is disabled when the page has no scheduler', async () => {
		TestBed.configureTestingModule({ providers: [provideRouter([])] });

		const fixture = TestBed.createComponent(RefreshControl);

		await fixture.whenStable();
		expect((fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
	});
});
