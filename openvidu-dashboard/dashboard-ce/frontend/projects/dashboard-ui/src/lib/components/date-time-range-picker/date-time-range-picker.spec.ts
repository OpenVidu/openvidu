import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { RANGE_PRESET_FROM, type RangePreset } from '@openvidu-dashboard/typings';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { childComponent, routeElement } from '../../../testing/harness.js';
import { PreferencesService } from '../../core/preferences/preferences.js';
import { ListStateService } from '../../core/state/list-state.js';
import { SessionZoneService } from '../../core/state/session-zone.js';
import {
	DateTimeRangePicker,
	instantToWallClock,
	presetOf,
	RANGE_PRESET_LABELS,
	wallClockToIso
} from './date-time-range-picker.js';

@Component({ selector: 'ovd-host', imports: [DateTimeRangePicker], template: '<ovd-date-time-range-picker />' })
class Host {}

@Component({
	selector: 'ovd-retention-host',
	imports: [DateTimeRangePicker],
	template: '<ovd-date-time-range-picker [retentionMs]="retentionMs" />'
})
class RetentionHost {
	readonly retentionMs = 36 * 3_600_000;
}

const DAY_MS = 86_400_000;

@Component({
	selector: 'ovd-ninety-day-host',
	imports: [DateTimeRangePicker],
	template: '<ovd-date-time-range-picker [retentionMs]="retentionMs" />'
})
class NinetyDayHost {
	readonly retentionMs = 90 * DAY_MS;
}

@Component({
	selector: 'ovd-unlimited-host',
	imports: [DateTimeRangePicker],
	template: '<ovd-date-time-range-picker [retentionMs]="null" />'
})
class UnlimitedHost {}

const ROUTES = [
	{
		path: 'rooms',
		component: Host,
		data: {
			navigation: {
				label: 'Rooms',
				icon: 'meeting_room',
				path: '/rooms',
				order: 3,
				liveCapable: true,
				rangeScoped: true
			}
		}
	}
];

describe('DateTimeRangePicker helpers', () => {
	it.each(Object.entries(RANGE_PRESET_FROM))('recognises the %s preset', (preset, from) => {
		expect(presetOf({ from, to: 'now' })).toBe(preset);
	});

	it('treats anything else as a custom range', () => {
		expect(presetOf({ from: 'now-2h', to: 'now' })).toBeNull();
		expect(presetOf({ from: 'now-24h', to: '2026-10-13T00:00:00Z' })).toBeNull();
	});

	it('serialises a wall-clock time in the selected zone with its offset', () => {
		const day = new Date(2026, 9, 1);
		const midnight = new Date(2026, 9, 1, 0, 0);

		expect(wallClockToIso(day, midnight, 'Europe/Madrid')).toBe('2026-10-01T00:00+02:00');
		expect(wallClockToIso(day, midnight, 'UTC')).toBe('2026-10-01T00:00Z');
		expect(wallClockToIso(new Date(2026, 0, 15), new Date(2026, 0, 15, 9, 30), 'Europe/Madrid')).toBe(
			'2026-01-15T09:30+01:00'
		);
	});

	it('shows an instant as wall-clock time in a zone', () => {
		const wall = instantToWallClock(new Date('2026-10-01T22:00:00Z'), 'Europe/Madrid');

		expect([wall.getFullYear(), wall.getMonth(), wall.getDate(), wall.getHours(), wall.getMinutes()]).toEqual([
			2026, 9, 2, 0, 0
		]);
	});
});

describe('DateTimeRangePicker retention warning', () => {
	it('names a retention that is not a whole number of days in its exact unit', async () => {
		TestBed.configureTestingModule({ providers: [provideRouter([{ ...ROUTES[0], component: RetentionHost }])] });
		TestBed.inject(ListStateService);
		const harness = await RouterTestingHarness.create('/rooms?from=now-2d&to=now&tz=UTC');

		routeElement(harness).querySelector<HTMLButtonElement>('.trigger')?.click();
		await harness.fixture.whenStable();

		expect(document.querySelector('.warning')?.textContent.trim()).toBe(
			'Data older than 36 hours is not retained.'
		);
	});

	async function openOn(
		host: typeof NinetyDayHost | typeof UnlimitedHost,
		url: string
	): Promise<RouterTestingHarness> {
		TestBed.configureTestingModule({ providers: [provideRouter([{ ...ROUTES[0], component: host }])] });
		TestBed.inject(ListStateService);
		const harness = await RouterTestingHarness.create(url);

		routeElement(harness).querySelector<HTMLButtonElement>('.trigger')?.click();
		await harness.fixture.whenStable();

		return harness;
	}

	function warning(): string | undefined {
		return document.querySelector('.warning')?.textContent.trim();
	}

	afterEach(() => {
		vi.useRealTimers();
	});

	it('warns about an edited start before the retention before Apply, and stops when it moves back', async () => {
		const harness = await openOn(NinetyDayHost, '/rooms?from=now-24h&to=now&tz=UTC');
		const component = childComponent(harness, 'ovd-date-time-range-picker') as {
			fromDate: { set(value: Date): void };
			fromTime: { set(value: Date): void };
		};

		expect(warning()).toBeUndefined();

		const early = new Date(Date.now() - 100 * DAY_MS);

		component.fromDate.set(early);
		component.fromTime.set(early);
		await harness.fixture.whenStable();
		expect(warning()).toBe('Data older than 90 days is not retained.');

		const inside = new Date(Date.now() - 10 * DAY_MS);

		component.fromDate.set(inside);
		component.fromTime.set(inside);
		await harness.fixture.whenStable();
		expect(warning()).toBeUndefined();
	});

	it('does not warn about a preset as long as the retention, an hour after it was applied', async () => {
		vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
		TestBed.configureTestingModule({ providers: [provideRouter([{ ...ROUTES[0], component: NinetyDayHost }])] });
		TestBed.inject(ListStateService);
		const harness = await RouterTestingHarness.create('/rooms?from=now-90d&to=now&tz=UTC');

		vi.setSystemTime(Date.now() + 3_600_000);
		routeElement(harness).querySelector<HTMLButtonElement>('.trigger')?.click();
		await harness.fixture.whenStable();

		expect(document.querySelector('.custom')).not.toBeNull();
		expect(warning()).toBeUndefined();
	});

	it('never warns without a retention limit', async () => {
		await openOn(UnlimitedHost, '/rooms?from=2023-01-01T00:00Z&to=now&tz=UTC');

		expect(document.querySelector('.custom')).not.toBeNull();
		expect(warning()).toBeUndefined();
	});
});

describe('DateTimeRangePicker', () => {
	let harness: RouterTestingHarness;

	beforeEach(async () => {
		TestBed.configureTestingModule({ providers: [provideRouter(ROUTES)] });
		TestBed.inject(ListStateService);
		harness = await RouterTestingHarness.create('/rooms?from=now-24h&to=now&tz=UTC&cursor=abc&status=active');
	});

	function url(): string {
		return TestBed.inject(Router).url;
	}

	function picker(): HTMLElement {
		return routeElement(harness);
	}

	async function open(): Promise<void> {
		picker().querySelector<HTMLButtonElement>('.trigger')?.click();
		await harness.fixture.whenStable();
	}

	it('shows the preset, the absolute range and the zone', () => {
		const label = picker().querySelector('.trigger')?.textContent ?? '';

		expect(label).toContain('Last 24 hours');
		expect(label).toContain('→');
		expect(label).toContain('UTC');
	});

	it.each(Object.keys(RANGE_PRESET_FROM) as RangePreset[])(
		'writes the %s preset relative, keeping the zone and dropping the cursor',
		async (preset) => {
			await open();
			[...document.querySelectorAll<HTMLButtonElement>('.presets button')]
				.find((button) => button.textContent.trim() === RANGE_PRESET_LABELS[preset])
				?.click();
			await harness.fixture.whenStable();

			expect(url()).toBe(
				`/rooms?from=${encodeURIComponent(RANGE_PRESET_FROM[preset])}&to=now&tz=UTC&status=active`
			);
		}
	);

	it('refuses a custom range whose end is not after its start', async () => {
		await open();

		const component = childComponent(harness, 'ovd-date-time-range-picker') as {
			fromDate: { set(value: Date): void };
			fromTime: { set(value: Date): void };
			toDate: { set(value: Date): void };
			toTime: { set(value: Date): void };
		};

		component.fromDate.set(new Date(2026, 9, 2));
		component.fromTime.set(new Date(2026, 9, 2, 0, 0));
		component.toDate.set(new Date(2026, 9, 1));
		component.toTime.set(new Date(2026, 9, 1, 0, 0));
		await harness.fixture.whenStable();
		[...document.querySelectorAll<HTMLButtonElement>('.custom button')]
			.find((b) => b.textContent.trim() === 'Apply')
			?.click();
		await harness.fixture.whenStable();

		expect(document.querySelector('.error')?.textContent).toBe('End must be after start');
		expect(url()).toBe('/rooms?from=now-24h&to=now&tz=UTC&cursor=abc&status=active');

		component.toDate.set(new Date(2026, 9, 3));
		component.toTime.set(new Date(2026, 9, 3, 0, 0));
		await harness.fixture.whenStable();
		[...document.querySelectorAll<HTMLButtonElement>('.custom button')]
			.find((b) => b.textContent.trim() === 'Apply')
			?.click();
		await harness.fixture.whenStable();

		expect(url()).toBe('/rooms?from=2026-10-02T00:00Z&to=2026-10-03T00:00Z&tz=UTC&status=active');
	});

	it('changes the session zone from its zone select and leaves the default zone of Settings alone', async () => {
		await open();

		const select = document.querySelector<HTMLInputElement>('ovd-zone-select input');

		expect(select?.value).toBe('UTC');
		select?.focus();
		select?.dispatchEvent(new Event('focusin'));

		if (select) {
			select.value = 'tokyo';
		}

		select?.dispatchEvent(new Event('input'));
		await harness.fixture.whenStable();
		[...document.querySelectorAll<HTMLElement>('mat-option')]
			.find((option) => option.textContent.trim() === 'Asia/Tokyo')
			?.click();
		await harness.fixture.whenStable();

		expect(url()).toBe('/rooms?from=now-24h&to=now&tz=Asia%2FTokyo&status=active');
		expect(TestBed.inject(PreferencesService).preferences().timeZone).toBe('browser');
		expect(TestBed.inject(SessionZoneService).zone()).toBe('Asia/Tokyo');
	});
});
