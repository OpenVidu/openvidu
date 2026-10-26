import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { InfoResponse, PageMeta } from '@openvidu-dashboard/typings';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { infoResponse, signIn, statusResponse } from '../../testing/fixtures.js';
import { routeElement } from '../../testing/harness.js';
import { iconNames } from '../../testing/icons.js';
import { AuthService } from '../core/auth.js';
import { BreakpointService, type ScreenSize } from '../core/breakpoints.js';
import { ConnectivityService } from '../core/connectivity.js';
import { InfoService } from '../core/info.js';
import { PreferencesService } from '../core/preferences.js';
import { ServerStatusService } from '../core/server-status.js';
import { composeRoutes } from '../routing/compose-routes.js';
import { DASHBOARD_ROUTES } from '../routes.js';
import { BannerSlot } from './banner-slot.js';
import { sidenavLayout } from './layout.js';

describe('route metadata', () => {
	it('marks every page that shows times as timed, and Settings as not timed', () => {
		const timed = new Map<string, boolean | undefined>();
		const walk = (routes: typeof DASHBOARD_ROUTES, prefix: string): void => {
			for (const route of routes) {
				const path = [prefix, route.path].filter((part) => part !== undefined && part !== '').join('/');
				const data = route.data as { navigation?: { timed?: boolean }; page?: { timed?: boolean } } | undefined;
				const meta = data?.navigation ?? data?.page;

				if (meta !== undefined) {
					timed.set(path, meta.timed);
				}

				walk(route.children ?? [], path);
			}
		};

		walk(DASHBOARD_ROUTES, '');

		expect(Object.fromEntries(timed)).toEqual({
			overview: true,
			analytics: true,
			rooms: true,
			'rooms/:roomSid': true,
			participants: true,
			'participants/:participantSid': true,
			agents: true,
			egress: true,
			'egress/:egressId': true,
			ingress: true,
			'ingress/:ingressId': true,
			settings: false
		});
	});

	it('names the retention of the data of every range-scoped page', () => {
		const retention = new Map<string, string | undefined>();

		for (const route of DASHBOARD_ROUTES.flatMap((parent) => parent.children ?? [])) {
			const meta = (route.data as { navigation?: PageMeta } | undefined)?.navigation;

			if (meta?.rangeScoped === true) {
				retention.set(route.path ?? '', meta.retention);
			}
		}

		expect(Object.fromEntries(retention)).toEqual({
			analytics: 'rollupsDailyMs',
			rooms: 'entitiesMs',
			participants: 'entitiesMs',
			agents: 'entitiesMs',
			egress: 'entitiesMs',
			ingress: 'entitiesMs'
		});
	});
});

describe('sidenavLayout', () => {
	it.each([
		['xlarge', false, false, { mode: 'side', opened: true, rail: false }],
		['large', false, false, { mode: 'side', opened: true, rail: false }],
		['large', true, false, { mode: 'side', opened: true, rail: true }],
		['medium', false, false, { mode: 'side', opened: true, rail: true }],
		['medium', false, true, { mode: 'side', opened: true, rail: false }],
		['small', false, false, { mode: 'over', opened: false, rail: false }],
		['small', true, true, { mode: 'over', opened: true, rail: false }],
		['xsmall', false, false, { mode: 'over', opened: false, rail: false }]
	] as const)('maps %s (pinned %s, expanded %s) to %j', (size, pinned, expanded, layout) => {
		expect(sidenavLayout(size, pinned, expanded)).toEqual(layout);
	});
});

async function loadInfo(info: InfoResponse): Promise<void> {
	const load = TestBed.inject(InfoService).load();

	TestBed.inject(HttpTestingController).expectOne('api/v1/info').flush(info);
	await load;
}

describe('BannerSlot', () => {
	it('shows the migration progress until dismissed and the schema mismatch without a dismiss button', async () => {
		TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
		await loadInfo(
			infoResponse({
				schema: { dashboard: 2, writer: 3, status: 'newer' },
				migration: { state: 'running', progress: { processed: 300_000, total: 1_200_000 } }
			})
		);

		const fixture = TestBed.createComponent(BannerSlot);
		const element = fixture.nativeElement as HTMLElement;

		await fixture.whenStable();

		const warning = element.querySelector('.warning');

		expect(warning?.textContent).toContain('v3');
		expect(warning?.textContent).toContain('v2');
		expect(warning?.querySelector('button')).toBeNull();
		expect(element.querySelector('.info')?.textContent).toContain(
			'Migration in progress: 300,000 / 1,200,000 records'
		);

		element.querySelector<HTMLButtonElement>('.info button')?.click();
		await fixture.whenStable();
		expect(element.querySelector('.info')).toBeNull();
		expect(element.querySelector('.warning')).not.toBeNull();
	});

	async function loadStatus(body: object): Promise<void> {
		const load = TestBed.inject(ServerStatusService).load();

		TestBed.inject(HttpTestingController).expectOne('api/v1/status').flush(body);
		await load;
	}

	it('prefers the server status for the schema and migration banners', async () => {
		TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
		await loadInfo(infoResponse({ migration: { state: 'running', progress: { processed: 1, total: 4 } } }));
		await loadStatus(statusResponse());

		const fixture = TestBed.createComponent(BannerSlot);

		await fixture.whenStable();
		expect((fixture.nativeElement as HTMLElement).querySelector('.info')).toBeNull();
	});

	it('warns about a silent writer after two silent statuses until dismissed, and again after it recovers', async () => {
		TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
		await loadStatus(statusResponse({}, 3 * 60_000));

		const fixture = TestBed.createComponent(BannerSlot);
		const element = fixture.nativeElement as HTMLElement;
		const warning = () => element.querySelector('.warning')?.textContent.trim();

		await fixture.whenStable();
		expect(warning()).toBeUndefined();

		await loadStatus(statusResponse({}, 3 * 60_000));
		await fixture.whenStable();
		expect(warning()).toBe('No analytics data received for 3 min');

		element.querySelector<HTMLButtonElement>('.warning button')?.click();
		await fixture.whenStable();
		expect(warning()).toBeUndefined();

		await loadStatus(statusResponse({}, 3 * 60_000 + 30_000));
		await fixture.whenStable();
		expect(warning()).toBeUndefined();

		await loadStatus(statusResponse({}, 5_000));
		await fixture.whenStable();
		await loadStatus(statusResponse({}, null));
		await fixture.whenStable();
		expect(warning()).toBeUndefined();
		await loadStatus(statusResponse({}, null));
		await fixture.whenStable();
		expect(warning()).toBe('No analytics data received from the OpenVidu server');
	});

	it('shows no writer banner while a migration runs or the schema is uninitialized', async () => {
		TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
		await loadStatus(
			statusResponse({ migration: { state: 'running', progress: { processed: 1, total: 4 } } }, null)
		);

		const fixture = TestBed.createComponent(BannerSlot);
		const element = fixture.nativeElement as HTMLElement;

		await fixture.whenStable();
		expect(element.querySelector('.warning')).toBeNull();
		expect(element.querySelector('.info')?.textContent).toContain('Migration in progress');

		await loadStatus(statusResponse({ schema: { dashboard: 2, status: 'uninitialized' } }, null));
		await fixture.whenStable();
		expect(element.querySelectorAll('.warning')).toHaveLength(1);
		expect(element.querySelector('.warning')?.textContent).toContain('not initialized');
	});

	it('reports a lost connection after two unreachable requests, with a retry, and clears it on the next answer', async () => {
		TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });

		const connectivity = TestBed.inject(ConnectivityService);
		const fixture = TestBed.createComponent(BannerSlot);
		const element = fixture.nativeElement as HTMLElement;

		connectivity.report(false);
		await fixture.whenStable();
		expect(element.querySelector('.error')).toBeNull();

		connectivity.report(true);
		connectivity.report(false);
		await fixture.whenStable();
		expect(element.querySelector('.error')).toBeNull();

		connectivity.report(false);
		await fixture.whenStable();
		expect(element.querySelector('.error')?.textContent).toContain('unreachable');
		element.querySelector<HTMLButtonElement>('.error button')?.click();
		TestBed.inject(HttpTestingController).expectOne('api/v1/info');

		connectivity.report(true);
		await fixture.whenStable();
		expect(element.querySelector('.error')).toBeNull();
	});
});

describe('DashboardShell', () => {
	const size = signal<ScreenSize>('large');

	afterEach(() => {
		vi.useRealTimers();
	});

	async function shell(
		url: string,
		features: InfoResponse['features'] = [],
		info: Partial<InfoResponse> = {}
	): Promise<RouterTestingHarness> {
		TestBed.configureTestingModule({
			providers: [
				provideRouter(composeRoutes(DASHBOARD_ROUTES)),
				provideHttpClient(),
				provideHttpClientTesting(),
				{
					provide: BreakpointService,
					useValue: {
						size,
						handset: () => size() === 'xsmall',
						desktop: () => ['large', 'xlarge'].includes(size())
					}
				}
			]
		});

		await signIn(TestBed.inject(AuthService), TestBed.inject(HttpTestingController));
		await loadInfo(infoResponse({ features, ...info }));

		return RouterTestingHarness.create(url);
	}

	const DAY_MS = 86_400_000;
	const RETENTION: NonNullable<InfoResponse['retention']> = {
		eventsMs: 7 * DAY_MS,
		statsMs: 7 * DAY_MS,
		tracksMs: 7 * DAY_MS,
		entitiesMs: 90 * DAY_MS,
		rollups5MinMs: 7 * DAY_MS,
		rollupsHourlyMs: 400 * DAY_MS,
		rollupsDailyMs: null
	};

	/** Opens the header range picker of `row` and returns its retention warning, if any. */
	async function pickerWarning(harness: RouterTestingHarness, row: string): Promise<string | undefined> {
		const element = harness.fixture.nativeElement as HTMLElement;

		element.querySelector<HTMLButtonElement>(`ovd-header ${row} ovd-date-time-range-picker .trigger`)?.click();
		await harness.fixture.whenStable();
		expect(document.querySelector('.custom')).not.toBeNull();

		return document.querySelector('.warning')?.textContent.trim();
	}

	it('lists the sidenav entries in order, none of them locked, and the version line', async () => {
		size.set('large');

		const harness = await shell('/settings');
		const element = harness.fixture.nativeElement as HTMLElement;
		const labels = [...element.querySelectorAll('ovd-navigation-list li a')].map((link) => link.textContent.trim());

		expect(labels).toEqual([
			'Overview',
			'Analytics',
			'Rooms',
			'Participants',
			'Agents',
			'Egress',
			'Ingress',
			'Settings'
		]);
		expect(element.querySelector('ovd-navigation-list a[aria-current="page"]')?.textContent.trim()).toBe(
			'Settings'
		);
		const footer = element.querySelector('ovd-navigation-list ovd-sidenav-footer');

		expect(footer?.querySelector('.version a')?.textContent.trim()).toBe('OpenVidu 3.10.0');
		expect(footer?.querySelector('ovd-edition-badge')?.textContent.trim()).toBe('COMMUNITY');
		expect(
			[...(footer?.querySelectorAll('ovd-external-link') ?? [])].map((link) =>
				link.textContent.replace('(opens in a new tab)', '').trim()
			)
		).toEqual(['Documentation']);
		expect(footer?.textContent).not.toContain('schema');
		expect(footer?.textContent).not.toContain('server');

		expect(element.querySelector('ovd-navigation-list li a .lock')).toBeNull();
	});

	it('keeps the short edition badge and a documentation icon in the rail', async () => {
		size.set('medium');

		const harness = await shell('/settings', ['license-info']);
		const footer = (harness.fixture.nativeElement as HTMLElement).querySelector(
			'ovd-navigation-list ovd-sidenav-footer'
		);

		expect(footer?.querySelector('ovd-edition-badge')?.textContent.trim()).toBe('CE');
		expect(footer?.querySelector('a.icon-link')?.getAttribute('aria-label')).toBe(
			'Documentation (opens in a new tab)'
		);
	});

	it('exposes one banner, navigation and main landmark and a skip link', async () => {
		size.set('large');

		const harness = await shell('/overview');
		const element = harness.fixture.nativeElement as HTMLElement;

		// A header inside main, such as a section card's, is not a banner landmark.
		expect(element.querySelectorAll('header:not(main header)')).toHaveLength(1);
		expect(element.querySelectorAll('nav[aria-label="Main"]')).toHaveLength(1);
		expect(element.querySelectorAll('main')).toHaveLength(1);
		expect(element.querySelectorAll('footer')).toHaveLength(0);
		expect(element.querySelectorAll('h1')).toHaveLength(1);
		expect(element.querySelector('.skip-link')?.getAttribute('href')).toBe('#ovd-main');
	});

	it('polls the server status on any page, auto-refresh off included, and warns about a silent writer', async () => {
		size.set('large');

		const harness = await shell('/rooms');

		TestBed.inject(PreferencesService).setRefreshInterval('live', 0);
		TestBed.inject(HttpTestingController)
			.expectOne('api/v1/status')
			.flush(statusResponse({}, 3 * 60_000));

		const second = TestBed.inject(ServerStatusService).load();

		TestBed.inject(HttpTestingController)
			.expectOne('api/v1/status')
			.flush(statusResponse({}, 3 * 60_000));
		await second;
		await harness.fixture.whenStable();

		expect(
			(harness.fixture.nativeElement as HTMLElement).querySelector('ovd-banner-slot .warning')?.textContent
		).toContain('No analytics data received for 3 min');
	});

	it('shows the range picker and the refresh control only where the route metadata asks for them', async () => {
		size.set('xlarge');

		const harness = await shell('/rooms?from=now-1h&to=now&tz=UTC');
		const element = harness.fixture.nativeElement as HTMLElement;

		expect(element.querySelector('ovd-header ovd-date-time-range-picker')).not.toBeNull();
		expect(element.querySelector('ovd-header ovd-refresh-control button.interval')).not.toBeNull();

		size.set('large');
		await harness.fixture.whenStable();
		expect(element.querySelector('ovd-header ovd-refresh-control button.interval-icon')).not.toBeNull();
		expect(element.querySelector('ovd-header ovd-edition-badge')).toBeNull();

		await harness.navigateByUrl('/settings');
		expect(element.querySelector('ovd-header ovd-date-time-range-picker')).toBeNull();
		expect(element.querySelector('ovd-header ovd-refresh-control')).toBeNull();
		expect(element.querySelector('ovd-header ovd-theme-toggle')).not.toBeNull();

		await harness.navigateByUrl('/participants');
		expect(element.querySelector('ovd-header ovd-date-time-range-picker')).not.toBeNull();
		expect(element.querySelector('ovd-header ovd-refresh-control')).not.toBeNull();

		// The CE participant detail is a locked page, which registers no scheduler.
		await harness.navigateByUrl('/participants/PA_x1y2');
		expect(element.querySelector('ovd-header ovd-date-time-range-picker')).toBeNull();
		expect(element.querySelector('ovd-header ovd-refresh-control')).toBeNull();
		expect(element.querySelector('ovd-header ovd-zone-chip')).toBeNull();
	});

	it('shows the zone chip on timed pages without the picker, unless they are locked', async () => {
		size.set('large');

		const harness = await shell('/overview?tz=UTC', ['participant-detail']);
		const element = harness.fixture.nativeElement as HTMLElement;
		const chip = () => element.querySelector('ovd-header ovd-zone-chip');

		await harness.fixture.whenStable();
		expect(chip()?.textContent.trim()).toBe('UTC');
		expect(element.querySelector('ovd-header ovd-date-time-range-picker')).toBeNull();

		await harness.navigateByUrl('/rooms?from=now-1h&to=now&tz=UTC');
		expect(chip()).toBeNull();

		await harness.navigateByUrl('/settings');
		expect(chip()).toBeNull();

		await harness.navigateByUrl('/participants/PA_x1y2');
		await harness.fixture.whenStable();
		expect(chip()?.textContent.trim()).toBe('UTC');

		await harness.navigateByUrl('/rooms/RM_ab12cd');
		await harness.fixture.whenStable();
		expect(chip()).toBeNull();

		size.set('xsmall');
		await harness.navigateByUrl('/overview');
		await harness.fixture.whenStable();
		expect(element.querySelector('ovd-header .range-row ovd-zone-chip')).not.toBeNull();
	});

	it('collapses the header into a brand row with an overflow menu and a range row below 600 px', async () => {
		size.set('xsmall');

		const harness = await shell('/rooms?from=now-1h&to=now&tz=UTC');
		const element = harness.fixture.nativeElement as HTMLElement;

		expect(element.querySelector('ovd-header .brand-row ovd-theme-toggle')).toBeNull();
		expect(element.querySelector('ovd-header button[aria-label="More actions"]')).not.toBeNull();
		expect(element.querySelector('ovd-header .range-row ovd-date-time-range-picker')).not.toBeNull();
		expect(element.querySelector('ovd-header .range-row ovd-refresh-control button.interval-icon')).not.toBeNull();
		expect(element.querySelector('ovd-header .brand-row ovd-global-search')).toBeNull();
	});

	it('gives the range picker of a list the entity retention', async () => {
		size.set('large');

		const harness = await shell('/rooms?from=now-120d&to=now&tz=UTC', [], { retention: RETENTION });

		expect(await pickerWarning(harness, '.brand-row')).toBe('Data older than 90 days is not retained.');
	});

	it('gives the range picker of the phone range row the same retention', async () => {
		size.set('xsmall');

		const harness = await shell('/rooms?from=now-120d&to=now&tz=UTC', [], { retention: RETENTION });

		expect(await pickerWarning(harness, '.range-row')).toBe('Data older than 90 days is not retained.');
	});

	it('gives the range picker of Analytics the daily rollup retention, unlimited by default', async () => {
		size.set('large');

		const harness = await shell('/analytics?from=now-500d&to=now&tz=UTC', [], { retention: RETENTION });

		expect(await pickerWarning(harness, '.brand-row')).toBeUndefined();
	});

	it('warns on Analytics before a limited daily rollup retention', async () => {
		size.set('large');

		const harness = await shell('/analytics?from=now-1095d&to=now&tz=UTC', [], {
			retention: { ...RETENTION, rollupsDailyMs: 730 * DAY_MS }
		});

		expect(await pickerWarning(harness, '.brand-row')).toBe('Data older than 730 days is not retained.');
	});

	it('renders the full-page lock for a PRO detail route without requesting the detail', async () => {
		size.set('large');

		const harness = await shell('/rooms/RM_ab12cd');
		const http = TestBed.inject(HttpTestingController);

		expect(routeElement(harness).textContent).toContain('Room detail is available in OpenVidu PRO');
		expect(iconNames(harness.fixture.debugElement)).toContain('lock');
		expect(
			(harness.fixture.nativeElement as HTMLElement)
				.querySelector('ovd-navigation-list a[aria-current="page"]')
				?.textContent.trim()
		).toBe('Rooms');
		http.expectOne((req) => req.url === 'api/v1/rooms' && req.params.get('q') === 'RM_ab12cd').flush({
			items: [],
			nextCursor: null,
			prevCursor: null
		});
		http.expectOne('api/v1/status').flush(statusResponse());
		http.verify();
	});
});
