import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatTooltip } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { InfoResponse, InfoRetention, InfoStorageEntry, StatusResponse } from '@openvidu-dashboard/typings';
import { describe, expect, it, vi } from 'vitest';

import { infoResponse, signIn, statusResponse } from '../../../testing/fixtures.js';
import { InfoTip } from '../../components/info-tip/info-tip.js';
import { AuthService } from '../../core/auth/auth.js';
import { InfoService } from '../../core/info.js';
import { browserTimeZone, PREFERENCES_KEY, PreferencesService } from '../../core/preferences/preferences.js';
import { ServerStatusService } from '../../core/refresh/server-status.js';
import { SessionZoneService } from '../../core/state/session-zone.js';
import { ToastService } from '../../core/ui/toast.js';
import { DASHBOARD_ROUTES } from '../../routes.js';
import { composeRoutes } from '../../routing/compose-routes.js';
import { migrationLine } from './data-tab.js';

const DAY = 86_400_000;
const DEFAULT_RETENTION: InfoRetention = {
	eventsMs: 7 * DAY,
	statsMs: 7 * DAY,
	tracksMs: 7 * DAY,
	entitiesMs: 90 * DAY,
	rollups5MinMs: 7 * DAY,
	rollupsHourlyMs: 400 * DAY,
	rollupsDailyMs: null
};

function setup(): HttpTestingController {
	TestBed.configureTestingModule({
		providers: [
			provideRouter(composeRoutes(DASHBOARD_ROUTES)),
			provideHttpClient(),
			provideHttpClientTesting(),
			{ provide: ToastService, useValue: { show: vi.fn() } }
		]
	});

	return TestBed.inject(HttpTestingController);
}

async function loadStatus(http: HttpTestingController, body: StatusResponse): Promise<void> {
	const load = TestBed.inject(ServerStatusService).load();

	http.expectOne('api/v1/status').flush(body);
	await load;
}

async function loadInfo(http: HttpTestingController, info: InfoResponse): Promise<void> {
	const load = TestBed.inject(InfoService).load();

	http.expectOne('api/v1/info').flush(info);
	await load;
}

function url(): string {
	return TestBed.inject(Router).url;
}

/** A storage entry of `bytes` (all storage) whose oldest document is `ageMs` before now; undated without `ageMs`. */
function entry(bytes: number, ageMs?: number, documents = 1): InfoStorageEntry {
	return {
		documents,
		storageBytes: bytes,
		indexBytes: 0,
		...(ageMs === undefined ? {} : { oldest: new Date(Date.now() - ageMs).toISOString() })
	};
}

function text(element: Element | null | undefined): string {
	return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function cells(row: Element | null | undefined): string[] {
	return [...(row?.querySelectorAll(':scope > th, :scope > td') ?? [])].map((cell) => text(cell));
}

function classRows(element: HTMLElement): HTMLTableRowElement[] {
	return [
		...element.querySelectorAll<HTMLTableRowElement>(
			'ovd-data-tab table.classes > tbody > tr:has(> th[scope="row"])'
		)
	];
}

function classRow(element: HTMLElement, label: string): HTMLTableRowElement | undefined {
	return classRows(element).find((row) => text(row.querySelector('th')) === label);
}

/** The accessible name and the text of the info tip of a class row; `null` without one. */
function tipOf(harness: RouterTestingHarness, label: string): { name: string | null; text: string } | null {
	const row = classRow(harness.fixture.nativeElement as HTMLElement, label);
	const tip = harness.fixture.debugElement
		.queryAll(By.directive(InfoTip))
		.find((candidate) => row?.contains(candidate.nativeElement as Node));

	return tip === undefined
		? null
		: {
				name: (tip.nativeElement as HTMLElement).querySelector('button')?.getAttribute('aria-label') ?? null,
				text: (tip.componentInstance as InfoTip).text()
			};
}

describe('migrationLine', () => {
	it.each([
		[{ state: 'none' }, null],
		[{ state: 'pending' }, null],
		[{ state: 'running', progress: { processed: 300_000, total: 1_200_000 } }, '300,000 / 1,200,000 records'],
		[
			{
				state: 'completed',
				progress: { processed: 1_200_000, total: 1_200_000, finishedAt: '2026-10-12T10:04:00Z' }
			},
			'Migration completed at 10:04:00'
		],
		[{ state: 'failed', error: 'legacy event without a room' }, 'Migration failed: legacy event without a room']
	] as const)('describes migration %j', (migration, line) => {
		expect(migrationLine(migration, 'UTC')).toBe(line);
	});
});

describe('SettingsPage', () => {
	async function settings(
		path: string,
		info: InfoResponse | null
	): Promise<{ harness: RouterTestingHarness; http: HttpTestingController; element: HTMLElement }> {
		const http = setup();

		await signIn(TestBed.inject(AuthService), http);

		if (info === null) {
			const load = TestBed.inject(InfoService).load();

			http.expectOne('api/v1/info').flush(null, { status: 503, statusText: 'Unavailable' });
			await load;
		} else {
			await loadInfo(http, info);
		}

		const harness = await RouterTestingHarness.create(path);

		return { harness, http, element: harness.fixture.nativeElement as HTMLElement };
	}

	function data(element: HTMLElement): HTMLElement | null {
		return element.querySelector('ovd-data-tab');
	}

	it('Deep link to Data', async () => {
		const { harness, element } = await settings('/settings?tab=data', infoResponse());

		await harness.fixture.whenStable();

		const tabs = [...element.querySelectorAll<HTMLElement>('[role="tab"]')];

		expect(text(element.querySelector('[role="tab"][aria-selected="true"]'))).toBe('Data');
		expect(text(document.activeElement)).toBe('Data');
		expect(tabs.map((tab) => text(tab))).toEqual(['Preferences', 'Data']);
		expect(url()).toBe('/settings?tab=data');
	});

	it('Former About value', async () => {
		const { harness, element } = await settings('/settings?tab=about', infoResponse());

		await harness.fixture.whenStable();
		expect(text(element.querySelector('[role="tab"][aria-selected="true"]'))).toBe('Preferences');
		expect(element.querySelector('ovd-preferences-tab')).not.toBeNull();
	});

	it('Migration running on the Data tab', async () => {
		const running = { state: 'running', progress: { processed: 300_000, total: 1_200_000 } } as const;
		const { harness, http, element } = await settings('/settings?tab=data', infoResponse({ migration: running }));

		http.expectOne('api/v1/status').flush(statusResponse({ migration: running }));
		await harness.fixture.whenStable();
		expect(data(element)?.querySelector('.migration mat-progress-bar')).not.toBeNull();
		expect(text(data(element)?.querySelector('.migration'))).toContain('300,000 / 1,200,000 records (25 %)');

		await loadStatus(
			http,
			statusResponse({ migration: { state: 'running', progress: { processed: 600_000, total: 1_200_000 } } })
		);
		await harness.fixture.whenStable();
		expect(text(data(element)?.querySelector('.migration'))).toContain('600,000 / 1,200,000 records (50 %)');
	});

	it('Completed before the page opened', async () => {
		const completed = {
			state: 'completed',
			progress: { processed: 10, total: 10, finishedAt: new Date(Date.now() - DAY).toISOString() }
		} as const;
		const { harness, http, element } = await settings('/settings?tab=data', infoResponse({ migration: completed }));

		http.expectOne('api/v1/status').flush(statusResponse({ migration: completed }));
		await harness.fixture.whenStable();
		expect(data(element)?.querySelector('table.classes')).not.toBeNull();
		expect(data(element)?.querySelector('.migration')).toBeNull();
	});

	it('Completed while watching', async () => {
		const running = { state: 'running', progress: { processed: 5, total: 10 } } as const;
		const { harness, http, element } = await settings('/settings?tab=data', infoResponse({ migration: running }));

		http.expectOne('api/v1/status').flush(statusResponse({ migration: running }));
		await harness.fixture.whenStable();
		expect(text(data(element)?.querySelector('.migration'))).toContain('(50 %)');

		await loadStatus(
			http,
			statusResponse({
				migration: {
					state: 'completed',
					progress: { processed: 10, total: 10, finishedAt: '2026-10-12T10:04:00Z' }
				}
			})
		);
		http.match('api/v1/info');
		await harness.fixture.whenStable();
		expect(text(data(element)?.querySelector('.migration'))).toMatch(/Migration completed at \d{2}:\d{2}:\d{2}/);
	});

	it('Backend down', async () => {
		const { harness, http, element } = await settings('/settings?tab=data', null);

		expect(element.querySelector('ovd-data-tab ovd-notice.error')?.textContent).toContain(
			'Server info unavailable'
		);
		element.querySelector<HTMLButtonElement>('ovd-data-tab ovd-notice button')?.click();
		http.expectOne('api/v1/info');

		const preferences = [...element.querySelectorAll<HTMLElement>('[role="tab"]')].find((tab) =>
			tab.textContent.includes('Preferences')
		);

		preferences?.click();
		await harness.fixture.whenStable();
		expect(url()).toBe('/settings?tab=preferences');
		expect(element.textContent).toContain('Rows per page');
		expect(
			[...element.querySelectorAll('ovd-preferences-tab mat-label')]
				.map((label) => label.textContent.trim())
				.filter((label) => label.includes('refresh'))
		).toEqual(['Auto-refresh of live views']);
	});

	async function inFlight(): Promise<{
		harness: RouterTestingHarness;
		http: HttpTestingController;
		load: Promise<void>;
	}> {
		const http = setup();

		await signIn(TestBed.inject(AuthService), http);

		const load = TestBed.inject(InfoService).load();
		const harness = await RouterTestingHarness.create('/settings?tab=data');

		return { harness, http, load };
	}

	it('Info in flight', async () => {
		const { harness } = await inFlight();
		const tab = data(harness.fixture.nativeElement as HTMLElement);

		expect(tab?.querySelector('ovd-skeleton')).not.toBeNull();
		expect(tab?.querySelector('table')).toBeNull();
		expect(tab?.textContent).not.toContain('Retention');
		expect(tab?.textContent).not.toContain('Server info unavailable');
	});

	it('Info arrives', async () => {
		const { harness, http, load } = await inFlight();
		const tab = () => data(harness.fixture.nativeElement as HTMLElement);

		for (const request of http.match('api/v1/info')) {
			request.flush(infoResponse({ retention: DEFAULT_RETENTION }));
		}

		await load;
		await harness.fixture.whenStable();

		expect(tab()?.querySelector('ovd-skeleton')).toBeNull();
		expect([...(tab()?.querySelectorAll('h2') ?? [])].map((heading) => text(heading))).toEqual(['Storage']);
		expect(tab()?.querySelector('table.classes')).not.toBeNull();
		expect(text(tab())).toContain('Retention is set in');
		expect(text(tab())).not.toMatch(/OpenVidu \d/);
		expect(tab()?.querySelector('ovd-edition-badge')).toBeNull();
	});

	it('Class rows', async () => {
		const { element } = await settings('/settings?tab=data', infoResponse({ retention: DEFAULT_RETENTION }));

		expect([...element.querySelectorAll('ovd-data-tab table.classes thead th')].map((cell) => text(cell))).toEqual([
			'Data',
			'Retention',
			'Documents',
			'Size'
		]);
		expect(classRows(element).map((row) => cells(row).slice(0, 2).join(' '))).toEqual([
			'Events 7 days',
			'Stats 7 days',
			'Tracks and subscriptions 7 days',
			'Entities 90 days',
			'5-minute rollups 7 days',
			'Hourly rollups 400 days',
			'Daily rollups Kept forever'
		]);
		expect(text(data(element))).not.toContain('Kept for ');
	});

	it('Retention that is not a whole number of days', async () => {
		const { element } = await settings(
			'/settings?tab=data',
			infoResponse({ retention: { ...DEFAULT_RETENTION, tracksMs: 36 * 3_600_000, rollupsDailyMs: 1_825 * DAY } })
		);

		expect(cells(classRow(element, 'Tracks and subscriptions'))[1]).toBe('36 hours');
		expect(cells(classRow(element, 'Daily rollups'))[1]).toBe('1,825 days');
	});

	it('Retention not reported', async () => {
		const { element } = await settings('/settings?tab=data', infoResponse());

		expect(classRows(element).map((row) => cells(row).slice(1))).toEqual(Array(7).fill(['—', '0', '0 B']));
		expect(data(element)?.querySelector('table.classes ovd-info-tip')).toBeNull();
		expect(text(data(element))).toContain('Retention not reported by the server yet');
	});

	it('Storage total without schema_meta', async () => {
		const { element } = await settings(
			'/settings?tab=data',
			infoResponse({
				retention: DEFAULT_RETENTION,
				storage: {
					rooms: { documents: 4, storageBytes: 36_864, indexBytes: 344_136 },
					events: { documents: 285, storageBytes: 65_536, indexBytes: 290_464 },
					schema_meta: { documents: 4, storageBytes: 20_480, indexBytes: 20_520 }
				}
			})
		);
		const rows = [...element.querySelectorAll('ovd-data-tab table.classes tr')];

		expect(cells(rows.at(-1))).toEqual(['Total', '', '289', '737 kB']);
		expect(data(element)?.textContent).not.toContain('schema_meta');
	});

	it('Class still filling', async () => {
		const { harness } = await settings(
			'/settings?tab=data',
			infoResponse({ retention: DEFAULT_RETENTION, storage: { rooms: entry(560_000_000, 12 * DAY) } })
		);

		expect(tipOf(harness, 'Entities')).toEqual({
			name: 'About Entities retention',
			text: '12 of 90 days so far · ≈ 4.2 GB at full retention (estimate)'
		});
	});

	it('Unlimited daily rollups', async () => {
		const { harness, element } = await settings(
			'/settings?tab=data',
			infoResponse({ retention: DEFAULT_RETENTION, storage: { analytics_daily: entry(260_000, 73 * DAY) } })
		);

		expect(cells(classRow(element, 'Daily rollups'))[1]).toBe('Kept forever');
		expect(tipOf(harness, 'Daily rollups')).toEqual({
			name: 'About Daily rollups retention',
			text: 'Grows without limit · ≈ 1.3 MB per year (estimate)'
		});
	});

	it('Total without an estimate', async () => {
		const { harness, element } = await settings(
			'/settings?tab=data',
			infoResponse({
				retention: DEFAULT_RETENTION,
				storage: { rooms: entry(560_000_000, 12 * DAY), analytics_daily: entry(260_000, 73 * DAY) }
			})
		);

		expect(tipOf(harness, 'Entities')).not.toBeNull();
		expect(element.querySelector('ovd-data-tab table.classes tfoot ovd-info-tip')).toBeNull();
	});

	it('Progress only in the tip', async () => {
		const { element } = await settings(
			'/settings?tab=data',
			infoResponse({ retention: DEFAULT_RETENTION, storage: { rooms: entry(560_000_000, 12 * DAY, 1_203) } })
		);
		const table = element.querySelector('ovd-data-tab table.classes');

		expect(cells(classRow(element, 'Entities'))).toEqual(['Entities', '90 days', '1,203', '560 MB']);
		expect(text(table)).not.toContain('so far');
		expect(text(table)).not.toContain('estimate');
	});

	it('Where the retention is set', async () => {
		const { element } = await settings('/settings?tab=data', infoResponse({ retention: DEFAULT_RETENTION }));
		const message = [
			...element.querySelectorAll('ovd-data-tab table.classes ~ p, ovd-data-tab .table-wrap ~ p')
		].find((paragraph) => text(paragraph).startsWith('Retention is set'));
		const link = message?.querySelector('ovd-external-link a');

		expect(text(message)).toContain(
			'Retention is set in openvidu.analytics.retention of the OpenVidu server configuration (livekit.yaml): events, stats, tracks, entities, rollups_5min, rollups_hourly and rollups_daily. It applies when the server restarts. Documentation'
		);
		expect(link?.getAttribute('href')).toBe(
			'https://openvidu.io/latest/docs/self-hosting/production-ready/observability/openvidu-dashboard/#retention'
		);
		expect(link?.getAttribute('target')).toBe('_blank');
	});

	it('What the estimates assume', async () => {
		const { element } = await settings('/settings?tab=data', infoResponse({ retention: DEFAULT_RETENTION }));

		expect(
			[...element.querySelectorAll('ovd-data-tab .table-wrap ~ p')].map((paragraph) => text(paragraph))
		).toContain(
			'The info icons mark the classes that have not reached their retention yet and estimate their size, assuming the activity so far continues.'
		);
	});

	function expandButton(element: HTMLElement, label: string): HTMLButtonElement | null | undefined {
		return classRow(element, label)?.querySelector<HTMLButtonElement>('button.expand');
	}

	const EVERY_COLLECTION = {
		events: entry(1_000, DAY),
		track_stats: entry(1_000),
		tracks: entry(1_000),
		track_subscriptions: entry(1_000),
		rooms: { documents: 1_203, storageBytes: 1_200_000, indexBytes: 270_000, oldest: '2026-09-01T00:00:00Z' },
		participants: entry(1_000, DAY),
		egresses: entry(1_000, DAY),
		ingresses: entry(1_000, DAY),
		ingress_sessions: entry(1_000, DAY),
		nodes: entry(1_000, DAY),
		analytics_5min: entry(1_000, DAY),
		analytics_hourly: entry(1_000, DAY),
		analytics_daily: entry(1_000, DAY)
	};

	it('Breakdown collapsed by default', async () => {
		const { element } = await settings(
			'/settings?tab=data',
			infoResponse({ retention: DEFAULT_RETENTION, storage: EVERY_COLLECTION })
		);

		for (const row of classRows(element)) {
			const button = row.querySelector('button.expand');

			expect(button?.getAttribute('aria-label')).toBe(`Show collections of ${text(row.querySelector('th'))}`);
			expect(button?.getAttribute('aria-expanded')).toBe('false');
		}

		expect(data(element)?.querySelector('ovd-collection-breakdown')).toBeNull();
		expect(text(data(element))).not.toContain('ingress_sessions');
	});

	it('Expand a class', async () => {
		const { harness, element } = await settings(
			'/settings?tab=data',
			infoResponse({ retention: DEFAULT_RETENTION, storage: EVERY_COLLECTION })
		);

		TestBed.inject(SessionZoneService).set('UTC');

		const before = url();

		expandButton(element, 'Entities')?.click();
		await harness.fixture.whenStable();

		const button = expandButton(element, 'Entities');
		const breakdown = element.querySelector(`#${button?.getAttribute('aria-controls') ?? 'none'}`);
		const rows = [...(breakdown?.querySelectorAll('ovd-collection-breakdown tbody tr') ?? [])];

		expect(classRow(element, 'Entities')?.nextElementSibling).toBe(breakdown);
		expect(rows.map((row) => text(row.querySelector('th')))).toEqual([
			'rooms',
			'participants',
			'egresses',
			'ingresses',
			'ingress_sessions',
			'nodes'
		]);
		expect(cells(rows[0])).toEqual(['rooms', '1,203', '1.47 MB', '2026-09-01 00:00:00 UTC']);
		expect(button?.getAttribute('aria-expanded')).toBe('true');
		expect(button?.getAttribute('aria-label')).toBe('Hide collections of Entities');
		expect(url()).toBe(before);
		expect(
			classRows(element)
				.filter((row) => text(row.querySelector('th')) !== 'Entities')
				.map((row) => row.querySelector('button.expand')?.getAttribute('aria-expanded'))
		).toEqual(Array(6).fill('false'));
		expect(element.querySelectorAll('ovd-collection-breakdown')).toHaveLength(1);
	});

	it('Collapse a class', async () => {
		const { harness, element } = await settings(
			'/settings?tab=data',
			infoResponse({ retention: DEFAULT_RETENTION, storage: EVERY_COLLECTION })
		);

		expandButton(element, 'Entities')?.click();
		await harness.fixture.whenStable();
		expect(element.querySelector('ovd-collection-breakdown')).not.toBeNull();

		expandButton(element, 'Entities')?.click();
		await harness.fixture.whenStable();
		expect(element.querySelector('ovd-collection-breakdown')).toBeNull();
		expect(text(data(element))).not.toContain('ingress_sessions');
		expect(expandButton(element, 'Entities')?.getAttribute('aria-expanded')).toBe('false');
	});

	it('Collection without an oldest date', async () => {
		const { harness, element } = await settings(
			'/settings?tab=data',
			infoResponse({ retention: DEFAULT_RETENTION, storage: EVERY_COLLECTION })
		);

		expandButton(element, 'Tracks and subscriptions')?.click();
		await harness.fixture.whenStable();

		const tracks = [...element.querySelectorAll('ovd-collection-breakdown tbody tr')].find(
			(row) => text(row.querySelector('th')) === 'tracks'
		);
		const oldest = tracks?.querySelector('td:last-child span');
		const tooltip = harness.fixture.debugElement
			.queryAll(By.directive(MatTooltip))
			.find((candidate) => candidate.nativeElement === oldest);

		expect(cells(tracks)[3]).toBe('—');
		expect(tooltip?.injector.get(MatTooltip).message).toBe(
			"Not shown: no index starts with this collection's time field"
		);
	});

	it('saves any default zone, applies it to the session and resets to the browser zone', async () => {
		const { harness } = await settings('/settings?tab=preferences', infoResponse());
		const element = harness.fixture.nativeElement as HTMLElement;
		const radio = (label: string) =>
			[...element.querySelectorAll<HTMLElement>('ovd-preferences-tab mat-radio-button')]
				.find((button) => button.textContent.includes(label))
				?.querySelector<HTMLInputElement>('input');

		await harness.fixture.whenStable();
		expect(radio(`Browser (${browserTimeZone()})`)?.checked).toBe(true);
		expect(element.querySelector('ovd-preferences-tab ovd-zone-select')).toBeNull();

		radio('Another zone')?.click();
		await harness.fixture.whenStable();
		expect(TestBed.inject(PreferencesService).preferences().timeZone).toBe('UTC');

		const select = element.querySelector<HTMLInputElement>('ovd-preferences-tab ovd-zone-select input');

		expect(select?.value).toBe('UTC');
		select?.focus();
		select?.dispatchEvent(new Event('focusin'));

		if (select) {
			select.value = 'new_york';
		}

		select?.dispatchEvent(new Event('input'));
		await harness.fixture.whenStable();
		[...document.querySelectorAll<HTMLElement>('mat-option')]
			.find((option) => option.textContent.trim() === 'America/New_York')
			?.click();
		await harness.fixture.whenStable();

		expect(TestBed.inject(PreferencesService).preferences().timeZone).toBe('America/New_York');
		expect(TestBed.inject(SessionZoneService).zone()).toBe('America/New_York');
		expect((JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? '{}') as { timeZone?: string }).timeZone).toBe(
			'America/New_York'
		);

		await harness.navigateByUrl('/overview');
		await harness.fixture.whenStable();
		expect(url()).toBe('/overview?tz=America%2FNew_York');

		await harness.navigateByUrl('/settings?tab=preferences');
		await harness.fixture.whenStable();
		[...element.querySelectorAll<HTMLButtonElement>('ovd-preferences-tab button')]
			.find((button) => button.textContent.trim() === 'Reset to defaults')
			?.click();
		await harness.fixture.whenStable();
		expect(TestBed.inject(SessionZoneService).zone()).toBe(browserTimeZone());
	});

	it('shows a stored utc of an earlier build as UTC', async () => {
		localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ version: 1, timeZone: 'utc' }));

		const { harness } = await settings('/settings?tab=preferences', infoResponse());
		const element = harness.fixture.nativeElement as HTMLElement;

		await harness.fixture.whenStable();
		expect(element.querySelector<HTMLInputElement>('ovd-preferences-tab ovd-zone-select input')?.value).toBe('UTC');
		localStorage.removeItem(PREFERENCES_KEY);
	});
});
