import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatTooltip } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type {
	DeletionJob,
	InfoResponse,
	InfoRetention,
	InfoStorageEntry,
	StatusResponse
} from '@openvidu-dashboard/typings';
import { describe, expect, it, vi } from 'vitest';

import { deletionJob, infoResponse, settle, signIn, statusResponse } from '../../../testing/fixtures.js';
import { InfoTip } from '../../components/info-tip/info-tip.js';
import { AuthService } from '../../core/auth/auth.js';
import { InfoService } from '../../core/info.js';
import { browserTimeZone, PREFERENCES_KEY, PreferencesService } from '../../core/preferences/preferences.js';
import { ServerStatusService } from '../../core/refresh/server-status.js';
import { SessionZoneService } from '../../core/state/session-zone.js';
import { ToastService } from '../../core/ui/toast.js';
import { DASHBOARD_ROUTES } from '../../routes.js';
import { composeRoutes } from '../../routing/compose-routes.js';
import { migrationLine, SECOND_READ_MS } from './data-tab.js';

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
		freeBytes: 0,
		...(ageMs === undefined ? {} : { oldest: new Date(Date.now() - ageMs).toISOString() })
	};
}

function text(element: Element | null | undefined): string {
	return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** The text of a cell without its second lines (last deletion, free space). */
function main(cell: Element | null | undefined): string {
	if (cell === null || cell === undefined) {
		return '';
	}

	const copy = cell.cloneNode(true) as Element;

	copy.querySelectorAll('.sub').forEach((sub) => {
		sub.remove();
	});

	return text(copy);
}

/** The texts of the cells of a row, without the delete column and the second lines. */
function cells(row: Element | null | undefined): string[] {
	return [...(row?.querySelectorAll(':scope > th, :scope > td:not(.action)') ?? [])].map((cell) => main(cell));
}

function classRows(element: HTMLElement): HTMLTableRowElement[] {
	return [
		...element.querySelectorAll<HTMLTableRowElement>(
			'ovd-data-tab table.classes > tbody > tr:has(> th[scope="row"])'
		)
	];
}

function classRow(element: HTMLElement, label: string): HTMLTableRowElement | undefined {
	return classRows(element).find((row) => main(row.querySelector('th')) === label);
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

		// Opening the Data tab reads the info document again: it answers the same.
		for (const read of http.match('api/v1/info')) {
			if (info === null) {
				read.flush(null, { status: 503, statusText: 'Unavailable' });
			} else {
				read.flush(info);
			}
		}

		await settle();

		return { harness, http, element: harness.fixture.nativeElement as HTMLElement };
	}

	function data(element: HTMLElement): HTMLElement | null {
		return element.querySelector('ovd-data-tab');
	}

	it('Migration ends', async () => {
		const running = { state: 'running', progress: { processed: 5, total: 10 } } as const;
		const { harness, http, element } = await settings('/settings?tab=data', infoResponse({ migration: running }));

		http.expectOne('api/v1/status').flush(statusResponse({ migration: running }));
		await harness.fixture.whenStable();
		http.expectNone('api/v1/info');
		expect(cells(classRow(element, 'Entities'))).toEqual(['Entities', '—', '0', '0 B']);

		await loadStatus(http, statusResponse());
		await harness.fixture.whenStable();

		const reread = http.match('api/v1/info');

		expect(reread).toHaveLength(1);
		reread[0]?.flush(
			infoResponse({
				retention: DEFAULT_RETENTION,
				storage: { rooms: { documents: 4, storageBytes: 36_864, indexBytes: 344_136, freeBytes: 0 } }
			})
		);
		await settle();
		await harness.fixture.whenStable();
		expect(cells(classRow(element, 'Entities'))).toEqual(['Entities', '90 days', '4', '381 kB']);
	});

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

		expect(
			[...element.querySelectorAll('ovd-data-tab table.classes thead th:not(.action)')].map((cell) => text(cell))
		).toEqual(['Data', 'Retention', 'Documents', 'Size']);
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
					rooms: { documents: 4, storageBytes: 36_864, indexBytes: 344_136, freeBytes: 0 },
					events: { documents: 285, storageBytes: 65_536, indexBytes: 290_464, freeBytes: 0 },
					schema_meta: { documents: 4, storageBytes: 20_480, indexBytes: 20_520, freeBytes: 0 }
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

	it('Span ends at the read', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });

		try {
			const http = setup();

			await signIn(TestBed.inject(AuthService), http);
			await loadInfo(
				http,
				infoResponse({ retention: DEFAULT_RETENTION, storage: { rooms: entry(560_000_000, 12 * DAY) } })
			);
			vi.setSystemTime(Date.now() + 2 * DAY);

			const harness = await RouterTestingHarness.create('/settings?tab=data');

			expect(tipOf(harness, 'Entities')?.text).toMatch(/^12 of 90 days so far/);
		} finally {
			vi.useRealTimers();
		}
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
		const notice = element.querySelector('ovd-data-tab .table-wrap ~ ovd-notice');
		const link = notice?.querySelector('ovd-external-link a');
		const under = [...element.querySelectorAll('ovd-data-tab .table-wrap ~ *')].map((node) => text(node)).join(' ');

		expect(notice?.getAttribute('role')).toBe('status');
		expect(text(notice?.querySelector('.text > span'))).toBe(
			'Retention is set in openvidu.analytics.retention of the OpenVidu Server configuration (livekit.yaml) and applies when the server restarts.'
		);
		expect(text(link)).toContain('Configuration reference');
		expect(link?.getAttribute('href')).toBe(
			'https://openvidu.io/latest/docs/self-hosting/configuration/reference/#analytics-settings'
		);
		expect(link?.getAttribute('target')).toBe('_blank');
		expect(under).not.toMatch(/info icon|estimate/i);
	});

	function expandButton(element: HTMLElement, label: string): HTMLButtonElement | null | undefined {
		return classRow(element, label)?.querySelector<HTMLButtonElement>('button.expand');
	}

	const EVERY_COLLECTION = {
		events: entry(1_000, DAY),
		track_stats: entry(1_000),
		tracks: entry(1_000),
		track_subscriptions: entry(1_000),
		rooms: {
			documents: 1_203,
			storageBytes: 1_200_000,
			indexBytes: 270_000,
			freeBytes: 0,
			oldest: '2026-09-01T00:00:00Z'
		},
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
		expect(breakdown?.querySelector('ovd-collection-breakdown table > caption')?.textContent).toBe(
			'Collections of Entities'
		);
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

	const LEGACY_LABEL = 'Legacy data (before 3.10)';
	const LEGACY_STORAGE = {
		rooms: { documents: 4, storageBytes: 36_864, indexBytes: 344_136, freeBytes: 0 },
		legacy_events: {
			documents: 120_000,
			storageBytes: 30_000_000,
			indexBytes: 10_000_000,
			freeBytes: 0,
			oldest: '2026-10-13T09:25:55Z'
		},
		stats: {
			documents: 300_000,
			storageBytes: 80_000_000,
			indexBytes: 10_000_000,
			freeBytes: 0,
			oldest: '2026-10-13T09:26:09Z'
		}
	};
	/** A date after any read of the test, so that the row keeps the data for rollback. */
	const RETAINED_UNTIL = new Date(Date.now() + 30 * DAY).toISOString();
	const keptUntil = (until: string) => `Kept until ${until.slice(0, 10)} for rollback`;

	it('Legacy row kept for rollback: no info icon', async () => {
		const completed = { state: 'completed', legacyRetainedUntil: RETAINED_UNTIL } as const;
		const { harness, http, element } = await settings(
			'/settings?tab=data',
			infoResponse({ retention: DEFAULT_RETENTION, storage: LEGACY_STORAGE, migration: completed })
		);

		http.expectOne('api/v1/status').flush(statusResponse({ migration: completed }));
		TestBed.inject(SessionZoneService).set('UTC');
		await harness.fixture.whenStable();

		expect(
			classRows(element)
				.map((row) => text(row.querySelector('th')))
				.slice(-2)
		).toEqual(['Daily rollups', LEGACY_LABEL]);
		expect(cells(classRow(element, LEGACY_LABEL))).toEqual([
			LEGACY_LABEL,
			keptUntil(RETAINED_UNTIL),
			'420,000',
			'130 MB'
		]);
		expect(tipOf(harness, LEGACY_LABEL)).toBeNull();
		expect(cells(element.querySelector('ovd-data-tab table.classes tfoot tr'))).toEqual([
			'Total',
			'',
			'420,004',
			'130 MB'
		]);
	});

	it('Collections of Legacy data', async () => {
		const { harness, element } = await settings(
			'/settings?tab=data',
			infoResponse({
				retention: DEFAULT_RETENTION,
				storage: LEGACY_STORAGE,
				migration: { state: 'completed', legacyRetainedUntil: RETAINED_UNTIL }
			})
		);

		TestBed.inject(SessionZoneService).set('UTC');
		await harness.fixture.whenStable();

		const button = expandButton(element, LEGACY_LABEL);

		expect(button?.getAttribute('aria-label')).toBe(`Show collections of ${LEGACY_LABEL}`);
		button?.click();
		await harness.fixture.whenStable();

		const breakdown = element.querySelector(`#${button?.getAttribute('aria-controls') ?? 'none'}`);
		const rows = [...(breakdown?.querySelectorAll('ovd-collection-breakdown tbody tr') ?? [])];

		expect(breakdown?.querySelector('ovd-collection-breakdown table > caption')?.textContent).toBe(
			`Collections of ${LEGACY_LABEL}`
		);
		expect(rows.map((row) => text(row.querySelector('th')))).toEqual(['legacy_events', 'stats']);
		expect(cells(rows[0])).toEqual(['legacy_events', '120,000', '40 MB', '2026-10-13 09:25:55 UTC']);
	});

	it('Legacy row follows the status', async () => {
		const running = { state: 'running', progress: { processed: 5, total: 10 } } as const;
		const { harness, http, element } = await settings(
			'/settings?tab=data',
			infoResponse({ retention: DEFAULT_RETENTION, storage: LEGACY_STORAGE, migration: running })
		);

		http.expectOne('api/v1/status').flush(statusResponse({ migration: running }));
		TestBed.inject(SessionZoneService).set('UTC');
		await harness.fixture.whenStable();
		expect(cells(classRow(element, LEGACY_LABEL))[1]).toBe('In use by the migration');

		await loadStatus(
			http,
			statusResponse({
				migration: {
					state: 'completed',
					progress: { processed: 10, total: 10 },
					legacyRetainedUntil: RETAINED_UNTIL
				}
			})
		);
		await harness.fixture.whenStable();

		// The status poll re-reads the info document once on a new migration state; the row changes before it answers.
		expect(http.match('api/v1/info')).toHaveLength(1);
		expect(cells(classRow(element, LEGACY_LABEL))[1]).toBe(keptUntil(RETAINED_UNTIL));
		expect(cells(classRow(element, LEGACY_LABEL)).slice(2)).toEqual(['420,000', '130 MB']);
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

	describe('deletions', () => {
		const DISK =
			'MongoDB keeps the freed disk space for new data of the same collections and does not return it to the system.';
		const KEPT =
			'Data of rooms in progress and data that ended in the last 5 minutes are kept. This cannot be undone.';
		const DOCS_LINK =
			'https://openvidu.io/latest/docs/self-hosting/production-ready/observability/openvidu-dashboard/#freeing-disk-space';
		const kept = { state: 'completed', legacyRetainedUntil: RETAINED_UNTIL } as const;
		/** A completed deletion record: the classes that have one show their free space. */
		const COMPLETED = {
			completed: {
				cutoff: '2026-11-19T10:07:00Z',
				endedBefore: '2026-11-19T10:02:00Z',
				finishedAt: '2026-11-19T10:31:12Z'
			}
		};
		const DELETED = { events: COMPLETED, entities: COMPLETED };

		const job = deletionJob;

		/** The Data tab after the info document and the first status. */
		async function dataTab(info: Partial<InfoResponse> = {}, status: Partial<StatusResponse> = {}) {
			const opened = await settings(
				'/settings?tab=data',
				infoResponse({ retention: DEFAULT_RETENTION, storage: LEGACY_STORAGE, ...info })
			);

			opened.http.expectOne('api/v1/status').flush(statusResponse(status));
			TestBed.inject(SessionZoneService).set('UTC');
			await opened.harness.fixture.whenStable();

			return opened;
		}

		function deleteButton(element: HTMLElement, name: string): HTMLButtonElement {
			const button = element.querySelector<HTMLButtonElement>(`ovd-data-tab button[aria-label="${name}"]`);

			if (button === null) {
				throw new Error(`no button ${name}`);
			}

			return button;
		}

		function deleteButtons(element: HTMLElement): HTMLButtonElement[] {
			return [...element.querySelectorAll<HTMLButtonElement>('ovd-data-tab td.action button')];
		}

		function tooltipOf(harness: RouterTestingHarness, button: HTMLElement): string | undefined {
			return harness.routeDebugElement
				?.queryAll(By.directive(MatTooltip))
				.find((candidate) => candidate.nativeElement === button)
				?.injector.get(MatTooltip).message;
		}

		function dialog(): HTMLElement | null {
			return document.querySelector<HTMLElement>('mat-dialog-container');
		}

		async function open(harness: RouterTestingHarness, element: HTMLElement, name: string): Promise<HTMLElement> {
			deleteButton(element, name).click();
			await settle();
			await harness.fixture.whenStable();

			const opened = dialog();

			if (opened === null) {
				throw new Error(`${name} opened no dialog`);
			}

			return opened;
		}

		async function cancel(harness: RouterTestingHarness): Promise<void> {
			dialog()?.querySelector<HTMLButtonElement>('.ovd-confirm-cancel')?.click();
			await settle();
			await harness.fixture.whenStable();
		}

		async function confirmDialog(harness: RouterTestingHarness): Promise<void> {
			dialog()?.querySelector<HTMLButtonElement>('.confirm')?.click();
			await settle();
			await harness.fixture.whenStable();
		}

		function paragraphs(opened: HTMLElement): string[] {
			return [...opened.querySelectorAll('mat-dialog-content p')].map((paragraph) => text(paragraph));
		}

		it('Buttons of the table', async () => {
			const { element } = await dataTab({ migration: kept }, { migration: kept });

			expect(deleteButtons(element).map((button) => button.getAttribute('aria-label'))).toEqual([
				'Delete Events',
				'Delete Stats',
				'Delete Tracks and subscriptions',
				'Delete Entities',
				'Delete 5-minute rollups',
				'Delete Hourly rollups',
				'Delete Daily rollups',
				'Delete Legacy data (before 3.10)',
				'Delete all analytics data'
			]);
			expect(text(element.querySelector('ovd-data-tab thead th.action'))).toBe('Delete');
		});

		it('Legacy row without a button', async () => {
			for (const migration of [
				{ state: 'running', progress: { processed: 1, total: 4 } },
				{ state: 'completed', legacyRetainedUntil: new Date(Date.now() - DAY).toISOString() },
				{ state: 'none' }
			] as const) {
				TestBed.resetTestingModule();

				const { element } = await dataTab({ migration }, { migration });
				const row = classRow(element, LEGACY_LABEL);

				expect(row, migration.state).toBeDefined();
				expect(row?.querySelector('td.action button'), migration.state).toBeNull();
				expect(deleteButtons(element)).toHaveLength(8);
			}
		});

		it('Buttons while a deletion runs', async () => {
			const { harness, element } = await dataTab(
				{},
				{ deletion: job({ class: 'stats', currentClass: 'stats' }) }
			);
			const events = deleteButton(element, 'Delete Events');

			events.focus();
			expect(document.activeElement).toBe(events);
			expect(events.getAttribute('aria-disabled')).toBe('true');
			expect(tooltipOf(harness, events)).toBe('A deletion is running');

			events.click();
			await settle();
			expect(dialog()).toBeNull();
		});

		it('Buttons while the migration runs', async () => {
			const running = { state: 'running', progress: { processed: 1, total: 4 } } as const;
			const { harness, element } = await dataTab({ migration: running }, { migration: running });

			for (const button of deleteButtons(element)) {
				expect(button.getAttribute('aria-disabled')).toBe('true');
				expect(tooltipOf(harness, button)).toBe('Available once the migration ends');
			}
		});

		it('Empty class deletable', async () => {
			const { harness, element } = await dataTab({
				storage: { track_stats: { documents: 0, storageBytes: 4_096, indexBytes: 4_096, freeBytes: 0 } }
			});
			const stats = deleteButton(element, 'Delete Stats');

			expect(stats.getAttribute('aria-disabled')).not.toBe('true');
			expect(tooltipOf(harness, stats)).toBe('Delete Stats');
		});

		it('Events dialog', async () => {
			const { harness, element } = await dataTab();
			const opened = await open(harness, element, 'Delete Events');
			const link = opened.querySelector<HTMLAnchorElement>('ovd-external-link a');

			expect(text(opened.querySelector('h2'))).toBe('Delete events?');
			expect(paragraphs(opened).slice(0, 2)).toEqual([
				'Deletes the stored events of rooms, participant sessions, egresses and ingresses that have ended. Their records stay, but their event timelines become empty.',
				`${KEPT} ${DISK}`
			]);
			expect(text(link)).toContain('How to free disk space');
			expect(link?.getAttribute('href')).toBe(DOCS_LINK);
			expect(link?.getAttribute('target')).toBe('_blank');
			expect([...opened.querySelectorAll('mat-dialog-actions button')].map((button) => text(button))).toEqual([
				'Cancel',
				'Delete'
			]);
			await cancel(harness);
		});

		it.each([
			[
				'Stats dialog',
				'Delete Stats',
				'Delete stats?',
				'Deletes the media statistics (quality, bitrate, packet loss) of sessions and tracks that have ended. Their charts become empty; Analytics keeps its figures.',
				`${KEPT} ${DISK}`
			],
			[
				'Tracks dialog',
				'Delete Tracks and subscriptions',
				'Delete tracks and subscriptions?',
				'Deletes the published tracks and subscriptions that have ended, with the statistics stored per track. Statistics stored per participant are kept.',
				`${KEPT} ${DISK}`
			],
			[
				'Entities dialog',
				'Delete Entities',
				'Delete entities?',
				'Deletes rooms, participant sessions, egresses and ingress sessions that have ended, with their events, stats, tracks and subscriptions. Ingresses that are not deleted and media node records are kept; Analytics keeps its figures.',
				`${KEPT} ${DISK}`
			],
			[
				'5-minute rollups dialog',
				'Delete 5-minute rollups',
				'Delete 5-minute rollups?',
				'Deletes the 5-minute rollups before the previous 5 minutes. Analytics charts of ranges up to one day become empty for that time.',
				`This cannot be undone. ${DISK}`
			],
			[
				'Hourly rollups dialog',
				'Delete Hourly rollups',
				'Delete hourly rollups?',
				'Deletes the hourly rollups before the previous hour. Overview figures of today, list summaries and Analytics of ranges up to 90 days become empty for that time.',
				`This cannot be undone. ${DISK}`
			],
			[
				'Daily rollups dialog',
				'Delete Daily rollups',
				'Delete daily rollups?',
				'Deletes the daily rollups before yesterday. Analytics of ranges over 90 days and unique identities become empty for that time.',
				`This cannot be undone. ${DISK}`
			]
		])('%s', async (_scenario, name, title, lead, rest) => {
			const { harness, element } = await dataTab();
			const opened = await open(harness, element, name);

			expect(text(opened.querySelector('h2'))).toBe(title);
			expect(paragraphs(opened).slice(0, 2)).toEqual([lead, rest]);
			expect(opened.querySelector('ovd-external-link a')?.getAttribute('href')).toBe(DOCS_LINK);
			await cancel(harness);
		});

		it('Total dialog', async () => {
			const { harness, element } = await dataTab({ storage: {} });
			const opened = await open(harness, element, 'Delete all analytics data');

			expect(text(opened.querySelector('h2'))).toBe('Delete all analytics data?');
			expect(paragraphs(opened).slice(0, 2)).toEqual([
				'Deletes events, stats, tracks and subscriptions, entities and the 5-minute, hourly and daily rollups: Analytics loses its history.',
				`Data of rooms in progress, data that ended in the last 5 minutes, the latest rollups, ingresses that are not deleted and media node records are kept. This cannot be undone. ${DISK}`
			]);
			expect(opened.querySelector('ovd-external-link a')?.getAttribute('href')).toBe(DOCS_LINK);
			expect(opened.querySelector('mat-checkbox')).toBeNull();
			await cancel(harness);
		});

		it('Total with the legacy checkbox', async () => {
			const { harness, http, element } = await dataTab({ migration: kept }, { migration: kept });
			const opened = await open(harness, element, 'Delete all analytics data');
			const checkbox = opened.querySelector<HTMLInputElement>('mat-checkbox input');
			const note =
				'The data before 3.10 is dropped and its disk space freed at once. A rollback to 3.9 will find no analytics data.';

			expect(text(opened.querySelector('mat-checkbox'))).toBe('Also delete the data before 3.10');
			expect(checkbox?.checked).toBe(false);
			expect(opened.textContent).not.toContain(note);

			checkbox?.click();
			await harness.fixture.whenStable();
			expect(text(opened)).toContain(note);

			await confirmDialog(harness);

			const request = http.expectOne('api/v1/deletions');

			expect(request.request.body).toEqual({ class: 'all', includeLegacy: true });
			request.flush(job({ class: 'all', includeLegacy: true }), { status: 202, statusText: 'Accepted' });
		});

		it('Total with the checkbox left unchecked', async () => {
			const { harness, http, element } = await dataTab({ migration: kept }, { migration: kept });

			await open(harness, element, 'Delete all analytics data');
			await confirmDialog(harness);

			const request = http.expectOne('api/v1/deletions');

			expect(request.request.body).toEqual({ class: 'all' });
			request.flush(job({ class: 'all' }), { status: 202, statusText: 'Accepted' });
		});

		it('Legacy dialog', async () => {
			const { harness, http, element } = await dataTab({ migration: kept }, { migration: kept });
			const opened = await open(harness, element, 'Delete Legacy data (before 3.10)');

			expect(text(opened.querySelector('h2'))).toBe('Delete data before 3.10?');
			expect(paragraphs(opened)).toEqual([
				'Deletes the analytics data of OpenVidu before 3.10. Its disk space is freed at once. A rollback to 3.9 will find no analytics data. This cannot be undone.'
			]);
			expect(opened.querySelector('ovd-external-link')).toBeNull();

			await confirmDialog(harness);
			expect(http.expectOne('api/v1/deletions').request.body).toEqual({ class: 'legacy' });
		});

		it('Deletion confirmed', async () => {
			const { harness, http, element } = await dataTab();

			await open(harness, element, 'Delete Events');
			await confirmDialog(harness);
			expect(dialog()).toBeNull();

			http.expectOne('api/v1/deletions').flush(job(), { status: 202, statusText: 'Accepted' });
			await settle();
			http.expectOne('api/v1/status').flush(statusResponse({ deletion: job({ deleted: 5_000 }) }));
			await settle();
			await harness.fixture.whenStable();

			expect(vi.mocked(TestBed.inject(ToastService)).show.mock.calls).toEqual([]);
			expect(text(element.querySelector('ovd-data-tab section.deletion p'))).toBe(
				'Deleting Events: 5,000 documents deleted · collection 1 of 1'
			);
		});

		it('Deletion refused', async () => {
			const { harness, http, element } = await dataTab();

			await open(harness, element, 'Delete Stats');
			await confirmDialog(harness);
			http.expectOne('api/v1/deletions').flush(
				{ error: { code: 'CONFLICT', message: 'A deletion is already running', details: { job: job() } } },
				{ status: 409, statusText: 'Conflict' }
			);
			await settle();
			http.expectOne('api/v1/status').flush(statusResponse({ deletion: job() }));
			await settle();
			await harness.fixture.whenStable();

			expect(text(element.querySelector('ovd-data-tab ovd-notice.deletion-notice'))).toBe(
				'A deletion is already running'
			);
			expect(deleteButtons(element).every((button) => button.getAttribute('aria-disabled') === 'true')).toBe(
				true
			);
		});

		it('Deletion not started', async () => {
			const { harness, http, element } = await dataTab();
			const notice = () => text(element.querySelector('ovd-data-tab ovd-notice.deletion-notice'));

			await open(harness, element, 'Delete Events');
			await confirmDialog(harness);
			http.expectOne('api/v1/deletions').flush(
				{ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
				{ status: 500, statusText: 'Server Error', headers: { 'X-Request-Id': 'caddy-7f3a' } }
			);
			await settle();
			http.expectOne('api/v1/status').flush(statusResponse());
			await settle();
			await harness.fixture.whenStable();

			expect(notice()).toBe(
				'The deletion did not start: Something went wrong while loading the data. Request caddy-7f3a'
			);
			expect(vi.mocked(TestBed.inject(ToastService)).show.mock.calls).toEqual([]);

			await open(harness, element, 'Delete Events');
			await confirmDialog(harness);
			// The next request clears the notice of the previous one.
			expect(element.querySelector('ovd-data-tab ovd-notice.deletion-notice')).toBeNull();
			http.expectOne('api/v1/deletions').error(new ProgressEvent('error'), {
				status: 0,
				statusText: 'Unknown Error'
			});
			await settle();
			http.expectOne('api/v1/status').flush(statusResponse());
			await settle();
			await harness.fixture.whenStable();

			expect(notice()).toBe('The deletion did not start: The server is unreachable.');

			element.querySelector<HTMLButtonElement>('ovd-data-tab ovd-notice.deletion-notice button')?.click();
			await harness.fixture.whenStable();
			expect(element.querySelector('ovd-data-tab ovd-notice.deletion-notice')).toBeNull();
		});

		it('Deletion cancelled in the dialog', async () => {
			const { harness, http, element } = await dataTab();

			await open(harness, element, 'Delete Entities');
			await cancel(harness);
			expect(dialog()).toBeNull();

			const opened = await open(harness, element, 'Delete Entities');
			const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });

			Object.defineProperty(escape, 'keyCode', { value: 27 });
			opened.dispatchEvent(escape);
			await settle();
			await harness.fixture.whenStable();

			expect(dialog()).toBeNull();
			http.expectNone('api/v1/deletions');
		});

		it('Progress of an Entities deletion', async () => {
			const { element } = await dataTab(
				{},
				{
					deletion: job({
						class: 'entities',
						currentClass: 'entities',
						deleted: 1_234_000,
						collection: { index: 2, total: 9 }
					})
				}
			);
			const section = element.querySelector('ovd-data-tab section.deletion');

			expect(text(section?.querySelector('h2'))).toBe('Deleting analytics data');
			expect(section?.querySelector('mat-progress-bar')?.getAttribute('mode')).toBe('indeterminate');
			expect(text(section?.querySelector('p'))).toBe(
				'Deleting Entities: 1,234,000 documents deleted · collection 2 of 9'
			);
		});

		it('Progress follows the status', async () => {
			const { harness, http, element } = await dataTab(
				{},
				{
					deletion: job({
						class: 'all',
						currentClass: 'events',
						deleted: 100,
						collection: { index: 1, total: 17 }
					})
				}
			);
			const line = () => text(element.querySelector('ovd-data-tab section.deletion p'));

			expect(line()).toBe('Deleting Events: 100 documents deleted · collection 1 of 17');

			await loadStatus(
				http,
				statusResponse({
					deletion: job({
						class: 'all',
						currentClass: 'stats',
						deleted: 9_100,
						collection: { index: 2, total: 17 }
					})
				})
			);
			await harness.fixture.whenStable();
			expect(line()).toBe('Deleting Stats: 9,100 documents deleted · collection 2 of 17');
		});

		it('Deletion completed while watching', async () => {
			const { harness, http, element } = await dataTab({}, { deletion: job({ deleted: 1_000_000 }) });

			await loadStatus(http, statusResponse({ deletion: job({ state: 'completed', deleted: 1_250_312 }) }));
			await harness.fixture.whenStable();

			expect(vi.mocked(TestBed.inject(ToastService)).show.mock.calls).toEqual([
				['Events deleted: 1,250,312 documents']
			]);

			const reread = http.match('api/v1/info');

			expect(reread).toHaveLength(1);
			reread[0]?.flush(
				infoResponse({
					retention: DEFAULT_RETENTION,
					storage: { events: { documents: 12, storageBytes: 2_000_000, indexBytes: 0, freeBytes: 1_500_000 } }
				})
			);
			await settle();
			await harness.fixture.whenStable();
			expect(cells(classRow(element, 'Events')).slice(2)).toEqual(['12', '2 MB']);
			expect(element.querySelector('ovd-data-tab section.deletion')).toBeNull();
		});

		it('Interrupted deletion notice', async () => {
			const today = new Date().toISOString().slice(0, 10);
			const interrupted = job({ state: 'interrupted', finishedAt: `${today}T10:20:00.000Z`, deleted: 400_000 });
			const expected =
				'Deleting Events was interrupted at 10:20: the dashboard stopped while running it. 400,000 documents were deleted. Start it again to finish.';

			for (let load = 0; load < 2; load++) {
				TestBed.resetTestingModule();

				const { element } = await dataTab({}, { deletion: interrupted });

				expect(text(element.querySelector('ovd-data-tab ovd-notice.deletion-notice'))).toBe(expected);
				expect(element.querySelector('ovd-data-tab ovd-notice.deletion-notice button')).toBeNull();
			}
		});

		it('Interrupted deletion notice: a job of another day names its date', async () => {
			const { element } = await dataTab(
				{},
				{ deletion: job({ state: 'interrupted', finishedAt: '2026-11-18T10:20:00.000Z', deleted: 1 }) }
			);

			expect(text(element.querySelector('ovd-data-tab ovd-notice.deletion-notice'))).toBe(
				'Deleting Events was interrupted at 2026-11-18 10:20: the dashboard stopped while running it. 1 document was deleted. Start it again to finish.'
			);
		});

		it('Failed deletion notice', async () => {
			const today = new Date().toISOString().slice(0, 10);
			const { element } = await dataTab(
				{},
				{
					deletion: job({
						class: 'all',
						state: 'failed',
						finishedAt: `${today}T10:20:00.000Z`,
						error: 'The database user cannot delete data'
					})
				}
			);

			expect(text(element.querySelector('ovd-data-tab ovd-notice.deletion-notice'))).toBe(
				'Deleting all analytics data failed at 10:20: The database user cannot delete data. 0 documents were deleted. Start it again to finish.'
			);
		});

		it('Class deleted', async () => {
			const { element } = await dataTab({
				deletions: {
					events: {
						completed: {
							cutoff: '2026-11-19T10:07:00Z',
							endedBefore: '2026-11-19T10:02:00Z',
							finishedAt: '2026-11-19T10:31:12Z'
						}
					}
				}
			});
			const line = classRow(element, 'Events')?.querySelector('th .sub');

			expect(text(line)).toBe('Deleted 2026-11-19 10:31');
			expect(line?.classList.contains('incomplete')).toBe(false);
		});

		it('Class left incomplete', async () => {
			const { element } = await dataTab({
				deletions: { entities: { incomplete: { state: 'interrupted', at: '2026-11-19T10:20:00Z' } } }
			});
			const line = classRow(element, 'Entities')?.querySelector('th .sub');

			expect(text(line)).toBe('Deletion interrupted 2026-11-19 10:20 (incomplete)');
			expect(line?.classList.contains('incomplete')).toBe(true);
			expect(element.querySelector('ovd-data-tab tfoot th .sub')).toBeNull();
			expect(classRow(element, LEGACY_LABEL)?.querySelector('th .sub')).toBeNull();
		});

		it('Free space after a deletion', async () => {
			const { element } = await dataTab({
				deletions: { events: COMPLETED },
				storage: {
					events: {
						documents: 1_200,
						storageBytes: 1_500_000_000,
						indexBytes: 500_000_000,
						freeBytes: 1_800_000_000
					},
					rooms: { documents: 4, storageBytes: 36_864, indexBytes: 344_136, freeBytes: 200_000_000 }
				}
			});
			const events = classRow(element, 'Events');

			expect(cells(events).slice(2)).toEqual(['1,200', '2 GB']);
			expect(text(events?.querySelector('td:nth-child(4) .sub'))).toBe('1.8 GB free for new data');
			expect(text(element.querySelector('ovd-data-tab tfoot .sub'))).toBe('1.8 GB free for new data');
		});

		it('Free space tip of a class', async () => {
			const { harness, element } = await dataTab({
				deletions: { events: COMPLETED },
				storage: {
					events: {
						documents: 1_200,
						storageBytes: 1_500_000_000,
						indexBytes: 500_000_000,
						freeBytes: 1_800_000_000
					}
				}
			});
			const icon = classRow(element, 'Events')?.querySelector<HTMLButtonElement>(
				'td:nth-child(4) .sub ovd-info-tip button'
			);

			expect(icon?.getAttribute('aria-label')).toBe('About free space of Events');
			icon?.click();
			await settle();
			await harness.fixture.whenStable();

			const panel = document.querySelector('.link-tip');
			const link = panel?.querySelector('a');

			expect(icon?.getAttribute('aria-expanded')).toBe('true');
			expect(text(panel).replace('(opens in a new tab)', '').replace(/\s+\./, '.')).toBe(
				'MongoDB reuses this space for new data. The rest of the space the deleted data used stays reserved until the collection is compacted; see Freeing disk space.'
			);
			expect(text(link)).toContain('Freeing disk space');
			expect(link?.getAttribute('href')).toBe(DOCS_LINK);
			expect(link?.getAttribute('target')).toBe('_blank');
		});

		it('Free space tip of the Total', async () => {
			const { element } = await dataTab({
				deletions: { events: COMPLETED },
				storage: {
					events: {
						documents: 1_200,
						storageBytes: 1_500_000_000,
						indexBytes: 500_000_000,
						freeBytes: 1_800_000_000
					}
				}
			});

			expect(
				element.querySelector('ovd-data-tab tfoot .sub ovd-info-tip button')?.getAttribute('aria-label')
			).toBe('About free space');
		});

		it('Data tab opened', async () => {
			const { harness, http } = await settings('/overview', infoResponse({ retention: DEFAULT_RETENTION }));
			const reads = async (url: string) => {
				await harness.navigateByUrl(url);

				// The tab group renders the selected tab's content once the switch has settled.
				for (let wait = 0; wait < 3; wait++) {
					await harness.fixture.whenStable();
					await settle();
				}

				const requests = http.match('api/v1/info');

				for (const request of requests) {
					request.flush(infoResponse({ retention: DEFAULT_RETENTION }));
				}

				await settle();

				return requests.length;
			};

			expect(await reads('/settings?tab=data')).toBe(1);
			expect(await reads('/settings?tab=preferences')).toBe(0);
			expect(await reads('/settings?tab=data')).toBe(1);
		});

		/** Fakes the timers, answers a status reporting the Events deletion completed and the shell's read after it. */
		async function completeWithFakeTimers(
			harness: RouterTestingHarness,
			http: HttpTestingController
		): Promise<void> {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

			const load = TestBed.inject(ServerStatusService).load();

			http.expectOne('api/v1/status').flush(
				statusResponse({ deletion: job({ state: 'completed', deleted: 10 }) })
			);
			await load;
			await vi.advanceTimersByTimeAsync(0);
			await harness.fixture.whenStable();

			const reread = http.match('api/v1/info');

			expect(reread).toHaveLength(1);
			reread[0]?.flush(
				infoResponse({
					retention: DEFAULT_RETENTION,
					deletions: DELETED,
					storage: { events: freeEvents(1_000_000) }
				})
			);
			await vi.advanceTimersByTimeAsync(0);
		}

		function freeEvents(freeBytes: number): InfoStorageEntry {
			return { documents: 12, storageBytes: 30_000_000, indexBytes: 0, freeBytes };
		}

		it('Second read after a deletion', async () => {
			const { harness, http, element } = await dataTab({}, { deletion: job() });

			try {
				await completeWithFakeTimers(harness, http);
				await vi.advanceTimersByTimeAsync(SECOND_READ_MS - 1);
				http.match('api/v1/status').forEach((request) => {
					request.flush(statusResponse({ deletion: job({ state: 'completed', deleted: 10 }) }));
				});
				http.expectNone('api/v1/info');

				await vi.advanceTimersByTimeAsync(1);
				http.expectOne('api/v1/info').flush(
					infoResponse({
						retention: DEFAULT_RETENTION,
						deletions: DELETED,
						storage: { events: freeEvents(16_000_000) }
					})
				);
				await vi.advanceTimersByTimeAsync(0);
				await harness.fixture.whenStable();

				expect(text(classRow(element, 'Events')?.querySelector('td:nth-child(4) .sub'))).toBe(
					'16 MB free for new data'
				);
			} finally {
				vi.useRealTimers();
			}
		});

		it('Second read after a deletion: closing the tab cancels it', async () => {
			const { harness, http } = await dataTab({}, { deletion: job() });

			try {
				await completeWithFakeTimers(harness, http);
				await harness.navigateByUrl('/settings?tab=preferences');
				await vi.advanceTimersByTimeAsync(SECOND_READ_MS);
				http.match('api/v1/status').forEach((request) => {
					request.flush(statusResponse({ deletion: job({ state: 'completed', deleted: 10 }) }));
				});
				http.expectNone('api/v1/info');
			} finally {
				vi.useRealTimers();
			}
		});

		it('No further reads', async () => {
			const { harness, http } = await dataTab({}, { deletion: job() });
			const completed = statusResponse({ deletion: job({ state: 'completed', deleted: 10 }) });

			try {
				await completeWithFakeTimers(harness, http);
				await vi.advanceTimersByTimeAsync(SECOND_READ_MS);
				http.match('api/v1/status').forEach((request) => {
					request.flush(completed);
				});
				http.expectOne('api/v1/info').flush(infoResponse({ retention: DEFAULT_RETENTION }));

				for (let tick = 0; tick < 20; tick++) {
					await vi.advanceTimersByTimeAsync(30_000);
					http.match('api/v1/status').forEach((request) => {
						request.flush(completed);
					});
				}

				http.expectNone('api/v1/info');
			} finally {
				vi.useRealTimers();
			}
		});

		const PENDING = 'Free space updates in about a minute';
		const pendingStorage = {
			events: freeEvents(2_000_000),
			rooms: { documents: 4, storageBytes: 36_864, indexBytes: 344_136, freeBytes: 3_000_000 }
		};
		const freeLine = (element: HTMLElement, label: string) =>
			text(classRow(element, label)?.querySelector('td:nth-child(4) .sub'));
		const totalLine = (element: HTMLElement) => text(element.querySelector('ovd-data-tab tfoot .sub'));

		/** Answers a status reporting `completed` and the shell's read after it, with `storage`. */
		async function reportCompleted(
			harness: RouterTestingHarness,
			http: HttpTestingController,
			completed: DeletionJob,
			storage: InfoResponse['storage']
		): Promise<void> {
			await loadStatus(http, statusResponse({ deletion: completed }));
			await harness.fixture.whenStable();
			http.match('api/v1/info').forEach((request) => {
				request.flush(infoResponse({ retention: DEFAULT_RETENTION, deletions: DELETED, storage }));
			});
			await settle();
			await harness.fixture.whenStable();
		}

		it('Free space pending after an Events deletion', async () => {
			const { harness, http, element } = await dataTab(
				{ deletions: DELETED, storage: pendingStorage },
				{ deletion: job() }
			);

			expect(freeLine(element, 'Events')).toBe('2 MB free for new data');
			await reportCompleted(harness, http, job({ state: 'completed', deleted: 10 }), pendingStorage);

			expect(freeLine(element, 'Events')).toBe(PENDING);
			expect(totalLine(element)).toBe(PENDING);
			expect(classRow(element, 'Events')?.querySelector('td:nth-child(4) ovd-info-tip')).toBeNull();
			expect(freeLine(element, 'Entities')).toBe('3 MB free for new data');
		});

		it('Free space after the second read', async () => {
			const { harness, http, element } = await dataTab(
				{ deletions: DELETED, storage: pendingStorage },
				{ deletion: job() }
			);

			try {
				await completeWithFakeTimers(harness, http);
				await harness.fixture.whenStable();
				expect(freeLine(element, 'Events')).toBe(PENDING);

				await vi.advanceTimersByTimeAsync(SECOND_READ_MS);
				http.match('api/v1/status').forEach((request) => {
					request.flush(statusResponse({ deletion: job({ state: 'completed', deleted: 10 }) }));
				});
				http.expectOne('api/v1/info').flush(
					infoResponse({
						retention: DEFAULT_RETENTION,
						deletions: DELETED,
						storage: { events: freeEvents(17_200_000) }
					})
				);
				await vi.advanceTimersByTimeAsync(0);
				await harness.fixture.whenStable();

				expect(freeLine(element, 'Events')).toBe('17.2 MB free for new data');
				expect(totalLine(element)).toBe('17.2 MB free for new data');
				expect(element.querySelector('ovd-data-tab')?.textContent).not.toContain(PENDING);
			} finally {
				vi.useRealTimers();
			}
		});

		it('Free space pending after a Total deletion', async () => {
			const { harness, http, element } = await dataTab({ storage: {} }, { deletion: job({ class: 'all' }) });

			await reportCompleted(harness, http, job({ class: 'all', state: 'completed', deleted: 10 }), {});

			const classes = [
				'Events',
				'Stats',
				'Tracks and subscriptions',
				'Entities',
				'5-minute rollups',
				'Hourly rollups',
				'Daily rollups'
			];

			expect(classes.map((label) => freeLine(element, label))).toEqual(classes.map(() => PENDING));
			expect(totalLine(element)).toBe(PENDING);
		});

		it('Free space pending after a Total deletion: a Legacy deletion completes no class and shows none', async () => {
			const { harness, http, element } = await dataTab(
				{ deletions: DELETED, storage: pendingStorage },
				{ deletion: job({ class: 'legacy', currentClass: 'legacy' }) }
			);

			await reportCompleted(
				harness,
				http,
				job({ class: 'legacy', currentClass: 'legacy', state: 'completed', deleted: 5 }),
				pendingStorage
			);

			expect(element.querySelector('ovd-data-tab')?.textContent).not.toContain(PENDING);
		});

		it('Free space pending dropped on return', async () => {
			const { harness, http, element } = await dataTab(
				{ deletions: DELETED, storage: pendingStorage },
				{ deletion: job() }
			);

			await reportCompleted(harness, http, job({ state: 'completed', deleted: 10 }), pendingStorage);
			expect(freeLine(element, 'Events')).toBe(PENDING);

			await harness.navigateByUrl('/settings?tab=preferences');
			await harness.fixture.whenStable();
			await harness.navigateByUrl('/settings?tab=data');

			for (let wait = 0; wait < 3; wait++) {
				await harness.fixture.whenStable();
				await settle();
			}

			http.expectOne('api/v1/info').flush(
				infoResponse({
					retention: DEFAULT_RETENTION,
					deletions: DELETED,
					storage: { events: freeEvents(5_000_000) }
				})
			);
			await settle();
			await harness.fixture.whenStable();

			expect(element.querySelector('ovd-data-tab')?.textContent).not.toContain(PENDING);
			expect(freeLine(element, 'Events')).toBe('5 MB free for new data');
		});

		it('No pending notice after a reload', async () => {
			const completed = job({ state: 'completed', deleted: 10, finishedAt: '2026-11-19T08:31:12.000Z' });
			const { harness, http, element } = await settings(
				'/settings?tab=data',
				infoResponse({ retention: DEFAULT_RETENTION, deletions: DELETED, storage: pendingStorage })
			);

			try {
				vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
				http.expectOne('api/v1/status').flush(statusResponse({ deletion: completed }));
				await vi.advanceTimersByTimeAsync(0);
				await harness.fixture.whenStable();

				expect(element.querySelector('ovd-data-tab')?.textContent).not.toContain(PENDING);
				expect(freeLine(element, 'Events')).toBe('2 MB free for new data');
				http.expectNone('api/v1/info');

				await vi.advanceTimersByTimeAsync(SECOND_READ_MS);
				http.match('api/v1/status').forEach((request) => {
					request.flush(statusResponse({ deletion: completed }));
				});
				http.expectNone('api/v1/info');
			} finally {
				vi.useRealTimers();
			}
		});

		it('No free line before any deletion', async () => {
			const { element } = await dataTab({
				deletions: {},
				storage: { events: freeEvents(14_100_000), track_stats: { ...freeEvents(40_000_000) } }
			});

			expect(element.querySelector('ovd-data-tab tbody .sub')).toBeNull();
			expect(element.querySelector('ovd-data-tab tfoot .sub')).toBeNull();
		});

		it('Total sums the rows with a free line', async () => {
			const { element } = await dataTab({
				deletions: { events: COMPLETED },
				storage: {
					events: {
						documents: 1_200,
						storageBytes: 1_500_000_000,
						indexBytes: 500_000_000,
						freeBytes: 1_800_000_000
					},
					track_stats: freeEvents(40_000_000)
				}
			});

			expect(freeLine(element, 'Stats')).toBe('');
			expect(totalLine(element)).toBe('1.8 GB free for new data');
		});

		it('Free line after an incomplete deletion', async () => {
			const interrupted = { incomplete: { state: 'interrupted', at: '2026-11-19T11:00:00Z' } } as const;
			const { element } = await dataTab({
				deletions: { events: { ...COMPLETED, ...interrupted }, stats: interrupted },
				storage: { events: freeEvents(50_000_000), track_stats: freeEvents(50_000_000) }
			});

			expect(freeLine(element, 'Events')).toBe('50 MB free for new data');
			expect(freeLine(element, 'Stats')).toBe('');
		});

		it('Legacy row without a free line', async () => {
			const { element } = await dataTab(
				{
					migration: kept,
					deletions: { events: COMPLETED },
					storage: {
						...LEGACY_STORAGE,
						legacy_events: { ...LEGACY_STORAGE.legacy_events, freeBytes: 1_000_000_000 },
						stats: { ...LEGACY_STORAGE.stats, freeBytes: 1_000_000_000 },
						events: freeEvents(3_000_000)
					}
				},
				{ migration: kept }
			);

			expect(classRow(element, LEGACY_LABEL)?.querySelector('.sub')).toBeNull();
			expect(totalLine(element)).toBe('3 MB free for new data');
		});

		it('Little free space', async () => {
			const { element } = await dataTab({
				deletions: DELETED,
				storage: {
					events: { documents: 1_200, storageBytes: 1_500_000, indexBytes: 500_000, freeBytes: 200_000 },
					rooms: { documents: 4, storageBytes: 36_864, indexBytes: 344_136, freeBytes: 100_000 }
				}
			});

			expect(element.querySelector('ovd-data-tab td .sub')).toBeNull();
			expect(element.querySelector('ovd-data-tab tfoot .sub')).toBeNull();
		});
	});
});
