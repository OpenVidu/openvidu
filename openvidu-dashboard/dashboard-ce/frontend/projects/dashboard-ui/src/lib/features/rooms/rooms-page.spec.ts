import { HttpHeaders, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, type TestRequest } from '@angular/common/http/testing';
import { Component, type Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { ListResponse, RoomListItem, RoomSummary } from '@openvidu-dashboard/typings';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { infoResponse, settle } from '../../../testing/fixtures.js';
import { routeElement } from '../../../testing/harness.js';
import { RangePickerService } from '../../components/date-time-range-picker.js';
import { LIST_SEARCH_DEBOUNCE_MS } from '../../components/list-search.js';
import { EntityPreviewService } from '../../core/entity-preview.js';
import { InfoService } from '../../core/info.js';
import { PreferencesService } from '../../core/preferences.js';
import { RoomLockedPage } from './room-locked-page.js';
import { ROOMS_NODE_FILTER } from './rooms-data.js';
import { RoomsPage } from './rooms-page.js';

@Component({ selector: 'ovd-blank', template: '' })
class Blank {}

@Component({ selector: 'ovd-node-filter-stub', template: '' })
class NodeFilterStub {}

const SUMMARY: RoomSummary = {
	activeRooms: 7,
	roomsInRange: 120,
	participantSessions: 900,
	activeParticipants: 31,
	approximate: false
};

function room(overrides: Partial<RoomListItem> = {}): RoomListItem {
	return {
		sid: 'RM_ab12cd',
		name: 'demo-room',
		status: 'active',
		createdAt: new Date(Date.now() - 42 * 60_000).toISOString(),
		nodeId: 'node-a',
		participants: { sessions: 7, unique: 6, active: 5, peakActive: 6 },
		egress: { total: 1, active: 1 },
		ingress: { sessions: 0, active: 0 },
		bytes: { up: 12_000_000, down: 48_000_000 },
		features: { egress: true, ingress: false, agent: true, sip: false },
		lastStatsAt: new Date().toISOString(),
		...overrides
	};
}

function page(items: RoomListItem[], extra: Partial<ListResponse<RoomListItem>> = {}): ListResponse<RoomListItem> {
	return { items, nextCursor: null, prevCursor: null, ...extra };
}

function setup(providers: Provider[] = []): HttpTestingController {
	TestBed.configureTestingModule({
		providers: [
			provideRouter([
				{ path: 'rooms', component: RoomsPage },
				{ path: 'rooms/:roomSid', component: Blank }
			]),
			provideHttpClient(),
			provideHttpClientTesting(),
			...providers
		]
	});

	return TestBed.inject(HttpTestingController);
}

function listRequest(http: HttpTestingController): TestRequest {
	return http.expectOne((req) => req.url === 'api/v1/rooms');
}

async function load(
	http: HttpTestingController,
	harness: RouterTestingHarness,
	body: ListResponse<RoomListItem>,
	summary: RoomSummary = SUMMARY
): Promise<TestRequest['request']> {
	await settle();

	const list = listRequest(http);

	list.flush(body);
	http.expectOne((req) => req.url === 'api/v1/rooms/summary').flush(summary);
	await settle();
	await harness.fixture.whenStable();

	return list.request;
}

/** Loads the info document, whose features and ranked sort limits the page reads. */
async function withInfo(http: HttpTestingController, features: string[] = []): Promise<void> {
	const loading = TestBed.inject(InfoService).load();

	http.expectOne('api/v1/info').flush(infoResponse({ features: features as never[] }));
	await loading;
}

async function open(url: string, body = page([room()])) {
	const http = setup();

	await withInfo(http);

	const harness = await RouterTestingHarness.create(url);
	const request = await load(http, harness, body);

	return { http, harness, request, element: routeElement(harness) };
}

function query(): URLSearchParams {
	return new URLSearchParams(TestBed.inject(Router).url.split('?')[1] ?? '');
}

function text(element: Element | null | undefined): string {
	return element?.textContent.replace(/\s+/g, ' ').trim() ?? '';
}

describe('RoomsPage', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders the summary tiles and the row of an active room', async () => {
		// The duration of an active room counts from now: a fixed clock keeps it exact on a slow runner.
		vi.useFakeTimers({ toFake: ['Date'] });
		const { element, http } = await open('/rooms');
		const tiles = [...element.querySelectorAll('ovd-kpi-tile .value')].map(text);

		expect(tiles).toEqual(['7', '120', '900', '31']);

		const row = element.querySelector('tbody tr');
		const cells = [...(row?.querySelectorAll('td') ?? [])].map(text);

		expect([...element.querySelectorAll('th')].map(text)).toEqual([
			'SID',
			'Name',
			'Status',
			'Started',
			'Ended',
			'Duration',
			'Unique identities',
			'Active',
			'Data up / down',
			'Features'
		]);
		expect(row?.querySelector('a')?.getAttribute('href')).toBe('/rooms/RM_ab12cd');
		expect(text(row?.querySelector('a'))).toBe('RM_ab12cd');
		expect(row?.querySelectorAll('ovd-copy-chip')).toHaveLength(0);
		expect(
			[...(row?.querySelectorAll('ovd-copy-button button') ?? [])].map((b) => b.getAttribute('aria-label'))
		).toEqual(['Copy room SID', 'Copy room name']);
		expect(text(row?.querySelector('ovd-status-badge'))).toContain('active');
		expect(row?.querySelector('ovd-live-chip')).toBeNull();
		expect(cells.slice(4, 9)).toEqual(['—', '42 m 00 s', '6', '5', '↑ 12 MB ↓ 48 MB']);
		expect([...(row?.querySelectorAll('.feature') ?? [])].map(text)).toEqual(['E', 'A']);
		expect(TestBed.inject(EntityPreviewService).get('room', 'RM_ab12cd')).toMatchObject({ name: 'demo-room' });
		http.verify();
	});

	it('reproduces the view of a deep link in the request and the controls', async () => {
		const { element, request } = await open(
			'/rooms?status=closed&q=demo&features=egress,agent&from=now-7d&to=now&tz=UTC&sort=endedAt&order=asc&limit=50'
		);

		expect(request.params.get('status')).toBe('closed');
		expect(request.params.get('q')).toBe('demo');
		expect(request.params.get('features')).toBe('egress,agent');
		expect(request.params.get('sort')).toBe('endedAt');
		expect(request.params.get('order')).toBe('asc');
		expect(request.params.get('limit')).toBe('50');
		expect(request.params.get('tz')).toBe('UTC');
		expect(text(element.querySelector('mat-button-toggle.mat-button-toggle-checked'))).toBe('Closed');
		expect(element.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe('demo');
		expect([...element.querySelectorAll('mat-chip-option.mat-mdc-chip-selected')].map(text)).toEqual([
			'Egress',
			'Agent'
		]);
		expect(element.querySelector('th[aria-sort="ascending"]')?.textContent).toContain('Ended');
	});

	it('falls back silently on invalid values', async () => {
		const { request } = await open('/rooms?status=open&sort=bogus&q=d&features=webhook');

		expect(request.params.get('status')).toBe('all');
		expect(request.params.get('sort')).toBe('createdAt');
		expect(request.params.has('q')).toBe(false);
		expect(request.params.has('features')).toBe(false);
	});

	it('drops the cursor when the status changes', async () => {
		const { element, harness, http } = await open('/rooms?cursor=abc');

		element.querySelector<HTMLButtonElement>('mat-button-toggle[value="active"] button')?.click();
		await harness.fixture.whenStable();

		expect(query().get('status')).toBe('active');
		expect(query().has('cursor')).toBe(false);
		await load(http, harness, page([room()]));
	});

	it('writes the search after the debounce, only with two characters, and shows the hints', async () => {
		const { element, harness, http } = await open('/rooms');
		const input = element.querySelector<HTMLInputElement>('input[type="search"]');
		const debounce = () => new Promise((resolve) => setTimeout(resolve, LIST_SEARCH_DEBOUNCE_MS + 50));

		if (input === null) {
			throw new Error('no search box');
		}

		input.value = 'd';
		input.dispatchEvent(new Event('input'));
		await debounce();
		await harness.fixture.whenStable();

		expect(query().has('q')).toBe(false);
		expect(text(element.querySelector('mat-hint'))).toBe('Type at least 2 characters');

		input.value = 'RM_ab12cd';
		input.dispatchEvent(new Event('input'));
		await debounce();
		await harness.fixture.whenStable();

		expect(query().get('q')).toBe('RM_ab12cd');
		await load(http, harness, page([room()], { total: 1 }));
		expect(text(element.querySelector('mat-hint'))).toBe('Exact ID: range and filters ignored · Enter opens it');
		expect(element.querySelector('.sid-hint')).toBeNull();
		expect(element.querySelector('mat-label')?.textContent).toBe('Room name or SID');
	});

	it('reads "Room <SID> was not found" with Clear search when an exact SID matches nothing', async () => {
		const { element, harness, http } = await open('/rooms?q=RM_missing', page([]));

		expect(text(element.querySelector('ovd-empty-state .title'))).toBe('Room RM_missing was not found');
		element.querySelector<HTMLButtonElement>('ovd-empty-state button')?.click();
		await harness.fixture.whenStable();
		expect(query().has('q')).toBe(false);
		await load(http, harness, page([]));
	});

	it('writes the selected features', async () => {
		const { harness, http } = await open('/rooms');
		const page$ = harness.routeDebugElement?.componentInstance as { setFeatures(value: string[]): void };

		page$.setFeatures(['egress', 'agent']);
		await harness.fixture.whenStable();

		expect(query().get('features')).toBe('egress,agent');
		expect((await load(http, harness, page([]))).params.get('features')).toBe('egress,agent');
	});

	it('offers no SIP feature and shows no SIP badge', async () => {
		const { element } = await open(
			'/rooms',
			page([room({ features: { egress: false, ingress: false, agent: false, sip: true } })])
		);

		expect([...element.querySelectorAll('mat-chip-option')].map(text)).toEqual(['Egress', 'Ingress', 'Agent']);
		expect(element.querySelectorAll('tbody tr .feature')).toHaveLength(0);
	});

	it('sorts by the ranked columns with any status inside the range limit', async () => {
		const { element, harness, http } = await open('/rooms?status=all');
		const header = (name: string) =>
			[...element.querySelectorAll('th')].find((th) => th.textContent.trim() === name) ?? null;

		header('Ended')?.querySelector('button')?.click();
		await harness.fixture.whenStable();
		expect(query().get('sort')).toBe('endedAt');
		expect(query().get('order')).toBe('desc');
		expect((await load(http, harness, page([]))).params.get('sort')).toBe('endedAt');

		header('Unique identities')?.querySelector('button')?.click();
		await harness.fixture.whenStable();
		expect(query().get('sort')).toBe('uniqueIdentities');
		await load(http, harness, page([]));
	});

	it('disables the ranked headers beyond the range limit and falls back to Started for a deep link', async () => {
		const { element, request } = await open('/rooms?sort=active&from=now-30d&to=now');
		const header = (name: string) =>
			[...element.querySelectorAll('th')].find((th) => th.textContent.trim() === name) ?? null;

		expect(request.params.get('sort')).toBe('createdAt');
		expect(request.params.get('order')).toBe('desc');

		for (const name of ['Ended', 'Duration', 'Unique identities', 'Active']) {
			expect(header(name)?.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
		}

		expect(header('Started')?.querySelector<HTMLButtonElement>('button')?.disabled).toBe(false);
		header('Duration')?.querySelector('.sort.disabled')?.dispatchEvent(new MouseEvent('mouseenter'));
		await settle();
		expect(text(document.querySelector('.mat-mdc-tooltip'))).toBe('Narrow the range to 7 days to sort by Duration');
	});

	it('locks the Node select in CE, ignores nodeId and asks for no scopes', async () => {
		const { element, request, http } = await open('/rooms?nodeId=a');
		const node = element.querySelector('.node');

		expect(request.params.has('nodeId')).toBe(false);
		expect(node?.querySelector('mat-select')?.getAttribute('aria-disabled')).toBe('true');
		expect(text(node?.querySelector('.mat-mdc-select-value'))).toBe('All nodes');
		expect(node?.querySelector('.lock')?.getAttribute('aria-label')).toBe(
			'Filtering by node is available in OpenVidu PRO'
		);
		http.expectNone((req) => req.url === 'api/v1/analytics/scopes');
	});

	it('renders the ROOMS_NODE_FILTER select with per-node breakdown and filters by the URL node', async () => {
		const http = setup([{ provide: ROOMS_NODE_FILTER, useValue: () => Promise.resolve(NodeFilterStub) }]);

		await withInfo(http, ['per-node-breakdown']);

		const harness = await RouterTestingHarness.create('/rooms?nodeId=a&q=demo');
		const request = await load(http, harness, page([room()]));

		await harness.fixture.whenStable();
		expect(request.params.get('nodeId')).toBe('a');
		expect(request.params.get('q')).toBe('demo');
		expect(routeElement(harness).querySelector('ovd-node-filter-stub')).not.toBeNull();
		expect(routeElement(harness).querySelector('.node .lock')).toBeNull();
	});

	it('marks a reconciler-closed room as estimated and an active room the API marks stale', async () => {
		const ended = new Date().toISOString();
		const { element } = await open(
			'/rooms',
			page([
				room({ sid: 'RM_rec', status: 'closed', closedBy: 'reconciler', endedAt: ended, durationMs: 60_000 }),
				room({ sid: 'RM_old', stale: true, lastStatsAt: new Date(Date.now() - 3 * 60_000).toISOString() }),
				// An old lastStatsAt without the flag: the browser never judges staleness itself.
				room({ sid: 'RM_ok', lastStatsAt: new Date(Date.now() - 10 * 60_000).toISOString() })
			])
		);
		const [reconciled, stale, fresh] = [...element.querySelectorAll('tbody tr')];

		expect(fresh?.querySelector('ovd-status-badge mat-icon.stale')).toBeNull();

		expect(reconciled?.querySelector('ovd-status-badge .estimated')).not.toBeNull();
		expect(reconciled?.querySelector('time.estimated')).not.toBeNull();
		expect(stale?.querySelector('ovd-status-badge mat-icon.stale')).not.toBeNull();
		expect(stale?.querySelector('ovd-status-badge .badge')?.getAttribute('aria-label')).toContain('No stats since');
	});

	it('keeps a fresh room unmarked under a long interval, judged at the last response', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });

		const { element, harness } = await open(
			'/rooms',
			page([room({ sid: 'RM_fresh', lastStatsAt: new Date(Date.now() - 5_000).toISOString() })])
		);

		TestBed.inject(PreferencesService).setRefreshInterval('live', 300_000);
		await vi.advanceTimersByTimeAsync(4 * 60_000);
		await harness.fixture.whenStable();

		expect(element.querySelector('tbody tr ovd-status-badge mat-icon.stale')).toBeNull();
	});

	it('shows the approximation of long ranges', async () => {
		const http = setup();

		await withInfo(http);

		const harness = await RouterTestingHarness.create('/rooms?from=now-30d&to=now');

		await load(http, harness, page([room()]), { ...SUMMARY, approximate: true });

		const tiles = [...routeElement(harness).querySelectorAll('ovd-kpi-tile .value')].map(text);

		expect(tiles).toEqual(['7', '≈ 120', '≈ 900', '31']);
	});

	it('explains participant sessions, unique identities, active and features with info tips only', async () => {
		const { element } = await open('/rooms', page([room()]));
		const tip = (root: Element | undefined | null): string | null | undefined =>
			root?.querySelector('ovd-info-tip button')?.getAttribute('aria-label');
		const header = (name: string): Element | undefined =>
			[...element.querySelectorAll('th')].find((th) => text(th).startsWith(name));

		expect([...element.querySelectorAll('.tiles ovd-kpi-tile')].map((tile) => tip(tile) ?? null)).toEqual([
			null,
			null,
			'About Participant sessions',
			null
		]);
		expect(tip(header('Unique identities'))).toBe('About Unique identities');
		expect(tip(header('Active'))).toBe('About Active');
		expect(tip(header('Features'))).toBe('About Features');

		for (const name of ['SID', 'Name', 'Status', 'Started', 'Ended', 'Duration']) {
			expect(tip(header(name))).toBeUndefined();
		}
	});

	it('pages with the cursors and shows the total', async () => {
		const items = Array.from({ length: 25 }, (_, i) => room({ sid: `RM_${String(i)}`, name: `r${String(i)}` }));
		const { element, harness, http } = await open('/rooms', page(items, { nextCursor: 'abc', total: 40 }));

		expect(text(element.querySelector('ovd-cursor-paginator .range'))).toBe('Showing 1–25 of 40');

		const next = [...element.querySelectorAll<HTMLButtonElement>('ovd-cursor-paginator button')].find((button) =>
			button.textContent.includes('Next')
		);

		next?.click();
		await harness.fixture.whenStable();

		expect(query().get('cursor')).toBe('abc');
		expect(query().get('page')).toBe('2');
		await load(http, harness, page(items.slice(0, 15), { prevCursor: 'back', total: 40 }));
		expect(text(element.querySelector('ovd-cursor-paginator .range'))).toBe('Showing 26–40 of 40');
	});

	it('numbers the rows of a page reopened from the URL, as after Back from a detail', async () => {
		const items = Array.from({ length: 25 }, (_, i) => room({ sid: `RM_${String(i)}`, name: `r${String(i)}` }));
		const { element } = await open('/rooms?cursor=c3&page=3', page(items, { prevCursor: 'c2', total: 90 }));

		expect(text(element.querySelector('ovd-cursor-paginator .range'))).toBe('Showing 51–75 of 90');
	});

	it('shows skeleton rows first, then the empty state with its actions', async () => {
		const http = setup();

		await withInfo(http);

		const harness = await RouterTestingHarness.create('/rooms?status=active&q=zzz');
		const element = routeElement(harness);
		const picker = TestBed.inject(RangePickerService);

		harness.fixture.detectChanges();
		expect(element.querySelectorAll('.skeleton-row').length).toBeGreaterThan(0);

		await load(http, harness, page([]));

		expect(text(element.querySelector('ovd-empty-state .title'))).toBe('No rooms match');

		const [clear, widen] = [...element.querySelectorAll<HTMLButtonElement>('ovd-empty-state button')];

		widen?.click();
		expect(picker.requests()).toBe(1);

		clear?.click();
		await harness.fixture.whenStable();

		expect(query().has('status')).toBe(false);
		expect(query().has('q')).toBe(false);
		await load(http, harness, page([]));
	});

	it('keeps the rows under the error banner when a refresh fails', async () => {
		const { element, harness, http } = await open('/rooms');
		const page$ = harness.routeDebugElement?.componentInstance as { retry(): void };

		page$.retry();
		await settle();
		listRequest(http).flush(
			{ error: { code: 'INTERNAL_ERROR', message: 'boom' } },
			{ status: 500, statusText: 'Error', headers: new HttpHeaders({ 'X-Request-Id': 'req-42' }) }
		);
		http.expectOne((req) => req.url === 'api/v1/rooms/summary').flush(SUMMARY);
		await settle();
		await harness.fixture.whenStable();

		expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
		expect(text(element.querySelector('ovd-error-banner'))).toContain('req-42');
	});

	it('refreshes in place at the live interval', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });

		const { element, harness, http } = await open('/rooms');

		await vi.advanceTimersByTimeAsync(10_000);
		await load(http, harness, page([room({ participants: { sessions: 9, unique: 8, active: 6, peakActive: 6 } })]));

		expect(element.querySelectorAll('.skeleton-row')).toHaveLength(0);
		expect([...element.querySelectorAll('tbody td')].map(text)).toContain('8');
	});
});

describe('RoomLockedPage', () => {
	function setupLocked(): HttpTestingController {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([
					{
						path: 'rooms/:roomSid',
						component: RoomLockedPage,
						data: { entity: { kind: 'room', param: 'roomSid' } }
					}
				]),
				provideHttpClient(),
				provideHttpClientTesting()
			]
		});

		return TestBed.inject(HttpTestingController);
	}

	it('fills the header of a deep link from the list endpoint and never requests the detail', async () => {
		const http = setupLocked();
		const harness = await RouterTestingHarness.create('/rooms/RM_ab12cd');

		await settle();

		const lookup = http.expectOne((req) => req.url === 'api/v1/rooms');

		expect(lookup.request.params.get('q')).toBe('RM_ab12cd');
		lookup.flush(page([room()]));
		await settle();
		await harness.fixture.whenStable();

		expect(text(routeElement(harness).querySelector('h1'))).toBe('demo-room');
		http.expectNone('api/v1/rooms/RM_ab12cd');
		http.verify();
	});

	it('uses the list cache without any request', async () => {
		const http = setupLocked();

		TestBed.inject(EntityPreviewService).set('room', 'RM_ab12cd', { name: 'cached-room', status: 'closed' });

		const harness = await RouterTestingHarness.create('/rooms/RM_ab12cd');

		await settle();

		expect(text(routeElement(harness).querySelector('h1'))).toBe('cached-room');
		http.verify();
	});
});
