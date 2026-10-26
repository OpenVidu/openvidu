import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { routeElement } from '../../../testing/harness.js';
import { browserTimeZone, PreferencesService } from '../../core/preferences/preferences.js';
import { ListStateService } from '../../core/state/list-state.js';
import { SessionZoneService } from '../../core/state/session-zone.js';
import { ZoneChip } from './zone-chip.js';

@Component({ imports: [ZoneChip], template: '<ovd-zone-chip />' })
class Page {}

const ROUTES = [
	{ path: 'rooms/:roomSid', component: Page, data: { page: { liveCapable: true, rangeScoped: false, timed: true } } }
];

describe('ZoneChip', () => {
	let harness: RouterTestingHarness;

	beforeEach(async () => {
		TestBed.configureTestingModule({ providers: [provideRouter(ROUTES)] });
		TestBed.inject(ListStateService);
		harness = await RouterTestingHarness.create('/rooms/RM_1?tz=Europe%2FMadrid&order=asc&cursor=abc');
		await harness.fixture.whenStable();
	});

	function chip(): HTMLButtonElement | null {
		return routeElement(harness).querySelector<HTMLButtonElement>('ovd-zone-chip button');
	}

	async function openMenu(): Promise<void> {
		chip()?.click();
		await harness.fixture.whenStable();
	}

	function items(): HTMLButtonElement[] {
		return [...document.querySelectorAll<HTMLButtonElement>('.ovd-zone-menu [role="menuitemradio"]')];
	}

	it('names the session zone and offers UTC and the browser zone', async () => {
		expect(chip()?.textContent.trim()).toBe('Europe/Madrid');
		expect(chip()?.getAttribute('aria-label')).toBe('Time zone: Europe/Madrid');

		await openMenu();

		const browser = browserTimeZone();

		expect(items().map((item) => item.textContent.trim())).toEqual(
			browser === 'UTC' ? ['UTC'] : ['UTC', `Browser (${browser})`]
		);
		expect(document.querySelector('.ovd-zone-menu ovd-zone-select input')).not.toBeNull();
	});

	it('switches to UTC keeping the cursor and the other parameters, and leaves the default zone alone', async () => {
		await openMenu();
		items()
			.find((item) => item.textContent.trim() === 'UTC')
			?.click();
		await harness.fixture.whenStable();

		expect(TestBed.inject(Router).url).toBe('/rooms/RM_1?tz=UTC&order=asc&cursor=abc');
		expect(chip()?.textContent.trim()).toBe('UTC');
		expect(TestBed.inject(SessionZoneService).zone()).toBe('UTC');
		expect(TestBed.inject(PreferencesService).preferences().timeZone).toBe('browser');

		await openMenu();
		expect(
			items()
				.find((item) => item.textContent.trim() === 'UTC')
				?.getAttribute('aria-checked')
		).toBe('true');
	});

	it('switches to any other zone from its search', async () => {
		await openMenu();

		const search = document.querySelector<HTMLInputElement>('.ovd-zone-menu ovd-zone-select input');

		search?.focus();
		search?.dispatchEvent(new Event('focusin'));

		if (search) {
			search.value = 'tok';
		}

		search?.dispatchEvent(new Event('input'));
		await harness.fixture.whenStable();
		[...document.querySelectorAll<HTMLElement>('mat-option')]
			.find((option) => option.textContent.trim() === 'Asia/Tokyo')
			?.click();
		await harness.fixture.whenStable();

		expect(TestBed.inject(Router).url).toBe('/rooms/RM_1?tz=Asia%2FTokyo&order=asc&cursor=abc');
		expect(chip()?.textContent.trim()).toBe('Asia/Tokyo');
	});
});
