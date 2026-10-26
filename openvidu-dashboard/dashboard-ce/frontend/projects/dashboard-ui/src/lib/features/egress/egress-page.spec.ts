import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, type TestRequest } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { EgressListItem, EgressSummary, ListResponse } from '@openvidu-dashboard/typings';
import { describe, expect, it } from 'vitest';

import { infoResponse, settle } from '../../../testing/fixtures.js';
import { routeElement } from '../../../testing/harness.js';
import { LIST_SEARCH_DEBOUNCE_MS } from '../../components/list-search.js';
import { EntityPreviewService } from '../../core/entity-preview.js';
import { InfoService } from '../../core/info.js';
import { EgressLockedPage } from './egress-locked-page.js';
import { EgressPage } from './egress-page.js';

@Component({ selector: 'ovd-blank', template: '' })
class Blank {}

function item(overrides: Partial<EgressListItem> = {}): EgressListItem {
	return {
		egressId: 'EG_a1b2',
		roomSid: 'RM_ab12cd',
		roomName: 'demo-room',
		type: 'room_composite',
		sourceType: 'sdk',
		status: 'active',
		startedAt: new Date(Date.now() - 40 * 60_000).toISOString(),
		outputs: { kinds: ['file'], count: 1 },
		hasError: false,
		...overrides
	};
}

function page(items: EgressListItem[], extra: Partial<ListResponse<EgressListItem>> = {}) {
	return { items, nextCursor: null, prevCursor: null, ...extra };
}

const SUMMARY: EgressSummary = {
	active: 3,
	startedInRange: 120,
	byType: { track: 20, room_composite: 100 },
	byEndStatus: { complete: 110, failed: 7, aborted: 2 },
	totalDurationMs: 36_000_000,
	approximate: false
};

function setup(): HttpTestingController {
	TestBed.configureTestingModule({
		providers: [
			provideRouter([
				{ path: 'egress', component: EgressPage },
				{ path: 'egress/:egressId', component: Blank },
				{ path: 'rooms/:roomSid', component: Blank }
			]),
			provideHttpClient(),
			provideHttpClientTesting()
		]
	});

	return TestBed.inject(HttpTestingController);
}

async function load(
	http: HttpTestingController,
	harness: RouterTestingHarness,
	body: ListResponse<EgressListItem>,
	summary: EgressSummary | null = SUMMARY
): Promise<TestRequest['request']> {
	await settle();

	const request = http.expectOne((req) => req.url === 'api/v1/egresses');
	const summaryRequest = http.expectOne((req) => req.url === 'api/v1/egresses/summary');

	request.flush(body);

	if (summary === null) {
		summaryRequest.flush({ error: { code: 'INTERNAL_ERROR', message: 'x' } }, { status: 500, statusText: 'Error' });
	} else {
		summaryRequest.flush(summary);
	}

	await settle();
	await harness.fixture.whenStable();

	return request.request;
}

async function open(url: string, body = page([item()]), summary: EgressSummary | null = SUMMARY) {
	const http = setup();
	const info = TestBed.inject(InfoService).load();

	http.expectOne('api/v1/info').flush(infoResponse());
	await info;

	const harness = await RouterTestingHarness.create(url);
	const request = await load(http, harness, body, summary);

	return { http, harness, request, element: routeElement(harness) };
}

function query(): URLSearchParams {
	return new URLSearchParams(TestBed.inject(Router).url.split('?')[1] ?? '');
}

function text(element: Element | null | undefined): string {
	return element?.textContent.replace(/\s+/g, ' ').trim() ?? '';
}

const debounce = () => new Promise((resolve) => setTimeout(resolve, LIST_SEARCH_DEBOUNCE_MS + 50));

describe('EgressPage', () => {
	it('reproduces a deep link in the controls and the request', async () => {
		const { element, request } = await open(
			'/egress?status=failed,aborted&type=room_composite&q=demo&from=now-7d&to=now&tz=UTC&order=asc&limit=50'
		);
		const selects = [...element.querySelectorAll('.select .mat-mdc-select-value')].map(text);

		expect(request.params.get('status')).toBe('failed,aborted');
		expect(request.params.get('type')).toBe('room_composite');
		expect(request.params.get('q')).toBe('demo');
		expect(request.params.get('order')).toBe('asc');
		expect(request.params.get('limit')).toBe('50');
		expect(selects).toEqual(['Room composite', 'Failed, Aborted']);
		expect(element.querySelector('ovd-list-search mat-label')?.textContent).toBe('Room name or egress ID');
		expect(element.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe('demo');
	});

	it('shows the summary tiles with their hints', async () => {
		const { element } = await open('/egress');
		const tiles = [...element.querySelectorAll('ovd-kpi-tile')].map(text);

		expect(tiles[0]).toContain('3');
		expect(tiles[1]).toContain('120');
		expect(tiles[1]).toContain('Room composite 100 · Track 20');
		expect(tiles[2]).toContain('7');
		expect(tiles[2]).toContain('Aborted 2');
		expect(tiles[3]).toContain('10 h 00 m');
	});

	it('renders an active row, a failed row, a complete row with an error marker and a reconciler-closed row', async () => {
		const { element } = await open(
			'/egress',
			page([
				item(),
				item({
					egressId: 'EG_fail',
					type: 'track',
					status: 'failed',
					hasError: true,
					errorCode: 403,
					durationMs: 60_000
				}),
				item({
					egressId: 'EG_rec',
					status: 'failed',
					closedBy: 'reconciler',
					hasError: true,
					outputs: { kinds: ['file', 'stream'], count: 3 }
				}),
				item({ egressId: 'EG_part', status: 'complete', hasError: true, errorCode: 403, durationMs: 60_000 })
			])
		);
		const [active, failed, reconciled, partial] = [...element.querySelectorAll('tbody tr')];
		const links = [...(active?.querySelectorAll('a') ?? [])].map((a) => a.getAttribute('href'));

		expect(links).toEqual(['/egress/EG_a1b2', '/rooms/RM_ab12cd']);
		expect(text(active?.querySelector('ovd-kind-badge'))).toBe('Room composite');
		expect(text(active?.querySelector('ovd-status-badge'))).toContain('active');
		expect(text(active)).toContain('40 m');
		expect(active?.querySelectorAll('ovd-egress-outputs mat-icon')).toHaveLength(1);
		expect(active?.querySelector('.count')).toBeNull();
		expect(text(failed?.querySelector('ovd-status-badge'))).toContain('failed');
		expect(failed?.querySelector('.error-marker')).toBeNull();
		expect(reconciled?.querySelector('.error-marker')).toBeNull();
		expect(partial?.querySelector('.error-marker')?.getAttribute('aria-label')).toBe(
			'Egress failed (code 403) — open the detail for the error'
		);
		expect(reconciled?.querySelector('ovd-status-badge .estimated')).not.toBeNull();
		expect(reconciled?.querySelector('ovd-status-badge .badge')?.getAttribute('aria-label')).toBe(
			'failed, Closed by the reconciler: the end time is estimated'
		);
		expect(text(reconciled?.querySelector('.count'))).toBe('3');
		expect(element.querySelector('ovd-live-chip')).toBeNull();
		expect(TestBed.inject(EntityPreviewService).get('egress', 'EG_a1b2')).toMatchObject({
			kind: 'room_composite',
			room: { sid: 'RM_ab12cd', name: 'demo-room' }
		});
	});

	it('writes the Active status set and drops the cursor', async () => {
		const { harness, http } = await open('/egress?cursor=abc');
		const component = harness.routeDebugElement?.componentInstance as { setStatusOptions(keys: string[]): void };

		component.setStatusOptions(['in-flight']);
		await harness.fixture.whenStable();
		expect(query().get('status')).toBe('starting,active,ending');
		expect(query().has('cursor')).toBe(false);
		await load(http, harness, page([]));
	});

	it('hints short searches and exact ids and sends a search only when valid', async () => {
		const { element, harness, http } = await open('/egress');
		const input = element.querySelector<HTMLInputElement>('input[type="search"]');

		if (input === null) {
			throw new Error('no search box');
		}

		input.value = 'd';
		input.dispatchEvent(new Event('input'));
		await debounce();
		await harness.fixture.whenStable();
		expect(text(element.querySelector('mat-hint'))).toBe('Type at least 2 characters');
		http.expectNone((req) => req.url === 'api/v1/egresses');

		input.value = 'EG_ab12cd';
		input.dispatchEvent(new Event('input'));
		await debounce();
		await harness.fixture.whenStable();
		expect(text(element.querySelector('mat-hint'))).toBe('Exact ID: range and filters ignored · Enter opens it');
		expect((await load(http, harness, page([item({ egressId: 'EG_ab12cd' })]))).params.get('q')).toBe('EG_ab12cd');

		input.value = 'demo';
		input.dispatchEvent(new Event('input'));
		await debounce();
		await harness.fixture.whenStable();
		expect(element.querySelector('mat-hint')).toBeNull();
		await load(http, harness, page([]));
	});

	it('reads "Egress <ID> was not found" when an exact ID matches nothing', async () => {
		const { element } = await open('/egress?q=EG_missing', page([]));

		expect(text(element.querySelector('ovd-empty-state .title'))).toBe('Egress EG_missing was not found');
		expect(text(element.querySelector('ovd-empty-state button'))).toBe('Clear search');
		expect(element.querySelector('ovd-cursor-paginator')?.hasAttribute('hidden')).toBe(true);
	});

	it('sorts by the ranked columns and disables them beyond the range limit', async () => {
		const ranked = await open('/egress?sort=duration&order=asc&from=now-24h&to=now');

		expect(ranked.request.params.get('sort')).toBe('duration');
		expect(ranked.element.querySelector('th[aria-sort="ascending"]')?.textContent).toContain('Duration');

		await ranked.harness.navigateByUrl('/egress?sort=duration&from=now-30d&to=now');

		const wide = await load(ranked.http, ranked.harness, page([]));
		const duration = [...ranked.element.querySelectorAll('th')].find((th) => th.textContent.trim() === 'Duration');

		expect(wide.params.get('sort')).toBe('startedAt');
		expect(duration?.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
	});

	it('shows a room chip whose removal drops the room, and an empty state that clears the filters', async () => {
		const { element, harness, http } = await open('/egress?room=RM_ab12cd&status=failed&type=web', page([]));

		expect(text(element.querySelector('ovd-room-chip'))).toContain('Room: RM_ab12cd');
		expect(element.querySelector('ovd-room-chip a')?.getAttribute('href')).toBe('/rooms/RM_ab12cd');
		expect(text(element.querySelector('ovd-empty-state .title'))).toBe('No egress match');

		element.querySelector<HTMLButtonElement>('ovd-empty-state button')?.click();
		await harness.fixture.whenStable();

		for (const name of ['status', 'type', 'room', 'q']) {
			expect(query().has(name)).toBe(false);
		}

		await load(http, harness, page([]));
	});

	it('keeps the rows under the error banner when a refresh fails', async () => {
		const { element, harness, http } = await open('/egress');
		const component = harness.routeDebugElement?.componentInstance as { retry(): void };

		component.retry();
		await settle();
		http.expectOne((req) => req.url === 'api/v1/egresses').flush(
			{ error: { code: 'INTERNAL_ERROR', message: 'x' } },
			{ status: 500, statusText: 'Error', headers: { 'X-Request-Id': 'req-1' } }
		);
		http.match((req) => req.url === 'api/v1/egresses/summary').forEach((request) => {
			request.flush(SUMMARY);
		});
		await settle();
		await harness.fixture.whenStable();

		expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
		expect(element.querySelector('ovd-error-banner')).not.toBeNull();
	});
});

describe('EgressLockedPage', () => {
	it('fills the header of a deep link from the list endpoint and never requests the detail', async () => {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([
					{
						path: 'egress/:egressId',
						component: EgressLockedPage,
						data: { entity: { kind: 'egress', param: 'egressId' } }
					},
					{ path: 'rooms/:roomSid', component: Blank }
				]),
				provideHttpClient(),
				provideHttpClientTesting()
			]
		});

		const http = TestBed.inject(HttpTestingController);
		const harness = await RouterTestingHarness.create('/egress/EG_a1b2');

		await settle();

		const lookup = http.expectOne((req) => req.url === 'api/v1/egresses');

		expect(lookup.request.params.get('q')).toBe('EG_a1b2');
		lookup.flush(page([item()]));
		await settle();
		await harness.fixture.whenStable();

		const element = routeElement(harness);

		expect(text(element.querySelector('h1'))).toBe('EG_a1b2');
		expect(element.querySelector('.title ovd-copy-button button')?.getAttribute('aria-label')).toBe(
			'Copy egress ID'
		);
		expect(text(element.querySelector('.title ovd-status-badge'))).toContain('active');
		expect(element.querySelector('ovd-kind-badge')).toBeNull();
		expect(element.querySelector('ovd-entity-facts')).toBeNull();
		http.expectNone('api/v1/egresses/EG_a1b2');
		http.verify();
	});
});
