import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { filter, firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { PreferencesService } from '../preferences/preferences.js';
import { ListStateService } from './list-state.js';
import { QueryStateService } from './query-state.js';
import { SessionZoneService } from './session-zone.js';

@Component({ template: 'page' })
class Page {}

const ROUTES = [
	{
		path: 'rooms',
		component: Page,
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
	},
	{ path: 'rooms/:roomSid', component: Page, data: { page: { liveCapable: true, rangeScoped: false, timed: true } } },
	{ path: 'overview', component: Page, data: { page: { liveCapable: true, rangeScoped: false, timed: true } } },
	{ path: 'settings', component: Page, data: { page: { liveCapable: false, rangeScoped: false } } }
];

describe('QueryStateService', () => {
	let harness: RouterTestingHarness;
	let query: QueryStateService;

	beforeEach(async () => {
		TestBed.configureTestingModule({ providers: [provideRouter(ROUTES), provideLocationMocks()] });
		harness = await RouterTestingHarness.create();
		query = TestBed.inject(QueryStateService);
	});

	function url(): string {
		return TestBed.inject(Router).url;
	}

	it('reproduces a view from its link', async () => {
		await harness.navigateByUrl(
			'/rooms?from=now-7d&to=now&tz=UTC&status=active&sort=participants&order=desc&limit=50'
		);

		expect(query.urlRange()).toEqual({ from: 'now-7d', to: 'now', tz: 'UTC' });
		expect(query.oneOf('status', ['active', 'closed', 'all'], 'all')).toBe('active');
		expect(query.oneOf('sort', ['name', 'participants'], 'name')).toBe('participants');
		expect(query.order()).toBe('desc');
		expect(query.limit()).toBe(50);
	});

	it.each([
		['?limit=7&order=sideways', 25, 'desc'],
		['?limit=100&order=asc', 100, 'asc'],
		['?limit=abc', 25, 'desc'],
		['?limit=0', 25, 'desc']
	] as const)('falls back silently for %s', async (search, limit, order) => {
		await harness.navigateByUrl(`/settings${search}`);

		expect(query.limit()).toBe(limit);
		expect(query.order()).toBe(order);
	});

	it('uses the stored page size when the URL has none', async () => {
		TestBed.inject(PreferencesService).update({ pageSize: 50 });
		await harness.navigateByUrl('/settings');

		expect(query.limit()).toBe(50);
	});

	it.each([
		['Mars/Olympus', 'UTC'],
		['+02:00', 'UTC'],
		['Europe/Madrid', 'Europe/Madrid']
	])('validates tz=%s', async (tz, expected) => {
		TestBed.inject(PreferencesService).update({ timeZone: 'UTC' });
		await harness.navigateByUrl(`/settings?tz=${encodeURIComponent(tz)}`);

		expect(query.tz()).toBe(expected);
	});

	it('takes the zone from the URL, else the session, else the default zone of Settings', async () => {
		TestBed.inject(PreferencesService).update({ timeZone: 'America/New_York' });
		await harness.navigateByUrl('/settings');
		expect(query.tz()).toBe('America/New_York');

		TestBed.inject(SessionZoneService).set('Asia/Tokyo');
		expect(query.tz()).toBe('Asia/Tokyo');

		await harness.navigateByUrl('/settings?tz=UTC');
		expect(query.tz()).toBe('UTC');

		await harness.navigateByUrl('/settings?tz=Mars%2FBase');
		expect(query.tz()).toBe('Asia/Tokyo');
	});

	it('reads CSV filters in URL order, without unknown values or duplicates', async () => {
		await harness.navigateByUrl('/settings?types=PARTICIPANT_LEFT,BOGUS,PARTICIPANT_JOINED,PARTICIPANT_LEFT');

		expect(query.csv('types', ['PARTICIPANT_JOINED', 'PARTICIPANT_LEFT'])).toEqual([
			'PARTICIPANT_LEFT',
			'PARTICIPANT_JOINED'
		]);
	});

	it.each([
		[{ status: 'closed' }, '/settings?status=closed&limit=25'],
		[{ sort: 'name', order: 'asc' }, '/settings?status=active&limit=25&sort=name&order=asc'],
		[{ from: 'now-6h', to: 'now' }, '/settings?status=active&limit=25&from=now-6h&to=now'],
		[{ tz: 'UTC' }, '/settings?status=active&limit=25&tz=UTC'],
		[{ limit: 100 }, '/settings?status=active&limit=100'],
		[
			{ types: ['PARTICIPANT_JOINED', 'PARTICIPANT_LEFT'] },
			'/settings?status=active&limit=25&types=PARTICIPANT_JOINED,PARTICIPANT_LEFT'
		],
		[{ status: null }, '/settings?limit=25'],
		[{ cursor: 'def' }, '/settings?status=active&cursor=def&limit=25']
	] as const)('merges %j and drops the cursor unless only the cursor moves', async (patch, expected) => {
		await harness.navigateByUrl('/settings?status=active&cursor=abc&limit=25');
		await query.navigate(patch);

		expect(url()).toBe(expected);
	});

	it('adds a history entry so Back returns to the previous page', async () => {
		TestBed.inject(Router).initialNavigation();
		await harness.navigateByUrl('/settings?status=active&cursor=abc');
		await query.navigate({ status: 'closed' });

		const back = firstValueFrom(
			TestBed.inject(Router).events.pipe(filter((event) => event instanceof NavigationEnd))
		);

		TestBed.inject(Location).back();
		await back;

		expect(url()).toBe('/settings?status=active&cursor=abc');
	});
});

describe('ListStateService', () => {
	let harness: RouterTestingHarness;

	beforeEach(async () => {
		TestBed.configureTestingModule({ providers: [provideRouter(ROUTES)] });
		TestBed.inject(ListStateService);
		harness = await RouterTestingHarness.create();
	});

	async function open(path: string): Promise<void> {
		await harness.navigateByUrl(path);
		await harness.fixture.whenStable();
	}

	function url(): string {
		return TestBed.inject(Router).url;
	}

	it('gives a range-scoped route without range the default preset in the preferred zone', async () => {
		TestBed.inject(PreferencesService).update({ timeZone: 'UTC' });
		await harness.navigateByUrl('/rooms');
		await harness.fixture.whenStable();

		expect(url()).toBe('/rooms?from=now-24h&to=now&tz=UTC');
	});

	it('carries the last range to the next range-scoped route', async () => {
		await harness.navigateByUrl('/rooms?from=now-7d&to=now&tz=Europe%2FMadrid');
		await harness.navigateByUrl('/settings');
		await harness.navigateByUrl('/rooms');
		await harness.fixture.whenStable();

		expect(url()).toBe('/rooms?from=now-7d&to=now&tz=Europe%2FMadrid');
		expect(TestBed.inject(ListStateService).withRange({ status: 'active' })).toEqual({
			from: 'now-7d',
			to: 'now',
			tz: 'Europe/Madrid',
			status: 'active'
		});
	});

	it('uses the stored default preset', async () => {
		TestBed.inject(PreferencesService).update({ defaultPreset: '7d', timeZone: 'UTC' });
		await harness.navigateByUrl('/rooms');
		await harness.fixture.whenStable();

		expect(url()).toBe('/rooms?from=now-7d&to=now&tz=UTC');
	});

	it('replaces invalid page parameters without a history entry', async () => {
		await harness.navigateByUrl('/rooms?from=now-1h&to=now&tz=UTC&limit=7&order=sideways&status=active');
		await harness.fixture.whenStable();

		expect(url()).toBe('/rooms?from=now-1h&to=now&tz=UTC&status=active');
	});

	it('leaves routes that are not range-scoped alone', async () => {
		await harness.navigateByUrl('/settings?tab=about');
		await harness.fixture.whenStable();

		expect(url()).toBe('/settings?tab=about');
	});

	it('gives a detail opened from a list without tz the session zone', async () => {
		await open('/rooms?from=now-7d&to=now&tz=UTC');
		await open('/rooms/RM_1');

		expect(url()).toBe('/rooms/RM_1?tz=UTC');
		expect(TestBed.inject(QueryStateService).tz()).toBe('UTC');
	});

	it('keeps the zone of a reloaded detail for the next list', async () => {
		await open('/rooms/RM_1?tz=Asia%2FTokyo');
		await open('/rooms');

		expect(url()).toBe('/rooms?from=now-24h&to=now&tz=Asia%2FTokyo');
	});

	it('carries the zone to Overview and leaves it out of Settings', async () => {
		await open('/rooms?from=now-7d&to=now&tz=UTC');
		await open('/settings');

		expect(url()).toBe('/settings');
		expect(TestBed.inject(QueryStateService).tz()).toBe('UTC');

		await open('/overview');

		expect(url()).toBe('/overview?tz=UTC');
	});

	it('replaces an invalid zone with the session zone', async () => {
		await open('/overview?tz=UTC');
		await open('/overview?tz=Mars%2FBase');

		expect(url()).toBe('/overview?tz=UTC');
	});

	it('restores the zone of the earlier view on Back', async () => {
		TestBed.inject(Router).initialNavigation();
		await open('/rooms?from=now-7d&to=now&tz=UTC');
		await open('/rooms/RM_1');
		await open('/rooms/RM_1?tz=Europe%2FMadrid');
		expect(TestBed.inject(QueryStateService).tz()).toBe('Europe/Madrid');

		const back = firstValueFrom(
			TestBed.inject(Router).events.pipe(filter((event) => event instanceof NavigationEnd))
		);

		TestBed.inject(Location).back();
		await back;
		await harness.fixture.whenStable();

		expect(url()).toBe('/rooms/RM_1?tz=UTC');
		await open('/overview');
		expect(url()).toBe('/overview?tz=UTC');
	});
});
