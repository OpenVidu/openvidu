import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, type TestRequest } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { IngressListItem, IngressSummary, ListResponse } from '@openvidu-dashboard/typings';
import { describe, expect, it } from 'vitest';

import { infoResponse, settle } from '../../../testing/fixtures.js';
import { routeElement } from '../../../testing/harness.js';
import { LIST_SEARCH_DEBOUNCE_MS } from '../../components/search/list-search.js';
import { InfoService } from '../../core/info.js';
import { IngressLockedPage } from './ingress-locked-page.js';
import { IngressPage } from './ingress-page.js';

@Component({ selector: 'ovd-blank', template: '' })
class Blank {}

/** Overrides; `undefined` removes a field. */
type Overrides = { [K in keyof IngressListItem]?: IngressListItem[K] | undefined };

function item(overrides: Overrides = {}): IngressListItem {
	return JSON.parse(
		JSON.stringify({
			ingressId: 'IN_c3d4',
			name: 'cam-1',
			inputType: 'rtmp',
			roomName: 'demo-room',
			participantIdentity: 'cam-1',
			status: 'publishing',
			enabled: true,
			reusable: true,
			createdAt: '2026-10-13T10:02:00.000Z',
			sessions: 3,
			totalDurationMs: 7_800_000,
			lastSessionAt: '2026-10-13T11:20:00.000Z',
			hasError: false,
			...overrides
		})
	) as IngressListItem;
}

function page(items: IngressListItem[], extra: Partial<ListResponse<IngressListItem>> = {}) {
	return { items, nextCursor: null, prevCursor: null, ...extra };
}

const SUMMARY: IngressSummary = {
	publishingNow: 2,
	ingressesInRange: 5,
	byInputType: { rtmp: 3, whip: 2, url: 0 },
	sessionsInRange: 12,
	totalDurationMs: 21_600_000,
	approximate: true
};

function setup(): HttpTestingController {
	TestBed.configureTestingModule({
		providers: [
			provideRouter([
				{ path: 'ingress', component: IngressPage },
				{ path: 'ingress/:ingressId', component: Blank },
				{ path: 'rooms', component: Blank }
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
	body: ListResponse<IngressListItem>
): Promise<TestRequest['request']> {
	await settle();

	const request = http.expectOne((req) => req.url === 'api/v1/ingresses');

	request.flush(body);
	http.match((req) => req.url === 'api/v1/ingresses/summary').forEach((summary) => {
		summary.flush(SUMMARY);
	});
	await settle();
	await harness.fixture.whenStable();

	return request.request;
}

async function open(url: string, body = page([item()])) {
	const http = setup();
	const info = TestBed.inject(InfoService).load();

	http.expectOne('api/v1/info').flush(infoResponse());
	await info;

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

describe('IngressPage', () => {
	it('reproduces a deep link in the controls and the request, and shows the tiles', async () => {
		const { element, request } = await open(
			'/ingress?status=publishing&inputType=rtmp&q=cam&from=now-7d&to=now&tz=UTC&order=asc&limit=50'
		);
		const tiles = [...element.querySelectorAll('ovd-kpi-tile')].map(text);

		expect(request.params.get('status')).toBe('publishing');
		expect(request.params.get('inputType')).toBe('rtmp');
		expect(request.params.get('q')).toBe('cam');
		expect(request.params.get('order')).toBe('asc');
		expect(text(element.querySelector('.status-select .mat-mdc-select-value'))).toBe('Publishing');
		expect(text(element.querySelector('.input-select .mat-mdc-select-value'))).toBe('RTMP');
		expect([...element.querySelectorAll('.ovd-filter-bar mat-label')].map(text)).toEqual([
			'Ingress name or ID',
			'Input',
			'Status'
		]);
		expect(tiles[1]).toMatch(/^Ingress in range 5/);
		expect(tiles[1]).toContain('RTMP 3 · WHIP 2 · URL 0');
		expect(tiles[2]).toContain('12');
		expect(
			[...element.querySelectorAll('ovd-kpi-tile')].map(
				(tile) => tile.querySelector('ovd-info-tip button')?.getAttribute('aria-label') ?? null
			)
		).toEqual([null, null, 'About Sessions in range', null]);
		expect(tiles[3]).toContain('6 h 00 m');
	});

	it('renders a publishing row, a deleted row, an idle row with an error and a never used one', async () => {
		const { element } = await open(
			'/ingress?from=now-24h&to=now&tz=UTC',
			page([
				item({ lastSessionAt: new Date(Date.now() - 10 * 60_000).toISOString() }),
				item({ ingressId: 'IN_del', status: 'deleted', deletedAt: '2026-10-13T11:00:00.000Z' }),
				item({ ingressId: 'IN_err', status: 'inactive', hasError: true, enabled: false }),
				item({
					ingressId: 'IN_new',
					status: 'inactive',
					sessions: 0,
					totalDurationMs: 0,
					lastSessionAt: undefined
				})
			])
		);
		const [publishing, deleted, failed, unused] = [...element.querySelectorAll('tbody tr')];

		expect([...element.querySelectorAll('th')].map(text)).toEqual([
			'Ingress ID',
			'Name',
			'Room',
			'Input',
			'Status',
			'Created',
			'Total duration',
			'Sessions',
			'Last session'
		]);
		expect(publishing?.querySelector('a')?.getAttribute('href')).toBe('/ingress/IN_c3d4');
		expect(
			[...(publishing?.querySelectorAll('ovd-copy-button button') ?? [])].map((b) => b.getAttribute('aria-label'))
		).toEqual(['Copy ingress ID', 'Copy ingress name']);
		expect(publishing?.querySelector('a[href^="/rooms"]')?.getAttribute('href')).toContain('q=demo-room');
		expect(text(publishing?.querySelector('ovd-kind-badge'))).toBe('RTMP');
		expect(publishing?.querySelector('ovd-live-chip')).toBeNull();
		// The stored 2 h 10 m plus the session publishing for 10 minutes.
		expect(text(publishing)).toContain('2 h 20 m');
		expect(text(deleted?.querySelector('ovd-status-badge'))).toBe('deleted');
		expect(deleted?.querySelector('ovd-status-badge .badge')?.getAttribute('aria-label')).toMatch(
			/^deleted, Deleted /
		);
		expect(text(failed?.querySelector('ovd-status-badge'))).toContain('idle');
		expect(failed?.querySelector('.error-marker')?.getAttribute('aria-label')).toBe(
			'Last session ended with an error'
		);
		expect(text(failed?.querySelectorAll('ovd-status-badge')[1])).toBe('disabled');
		expect([...(unused?.querySelectorAll('td') ?? [])].map(text).filter((cell) => cell === '—')).toHaveLength(2);
	});

	it('writes the status and the input type and drops the cursor', async () => {
		const { harness, http } = await open('/ingress?cursor=abc');
		const component = harness.routeDebugElement?.componentInstance as {
			setStatus(status: string): void;
			setInputType(type: string): void;
		};

		component.setStatus('inactive');
		await harness.fixture.whenStable();
		expect(query().get('status')).toBe('inactive');
		expect(query().has('cursor')).toBe(false);
		await load(http, harness, page([]));

		component.setInputType('whip');
		await harness.fixture.whenStable();
		expect(query().get('inputType')).toBe('whip');
		await load(http, harness, page([]));
	});

	it('hints short searches and exact ids and clears the filters from the empty state', async () => {
		const { element, harness, http } = await open('/ingress?status=error&q=zzz', page([]));
		const input = element.querySelector<HTMLInputElement>('input[type="search"]');

		if (input === null) {
			throw new Error('no search box');
		}

		input.value = 'c';
		input.dispatchEvent(new Event('input'));
		await new Promise((resolve) => setTimeout(resolve, LIST_SEARCH_DEBOUNCE_MS + 50));
		await harness.fixture.whenStable();
		expect(text(element.querySelector('mat-hint'))).toBe('Type at least 2 characters');
		expect(text(element.querySelector('ovd-empty-state .title'))).toBe('No ingress match');

		element.querySelector<HTMLButtonElement>('ovd-empty-state button')?.click();
		await harness.fixture.whenStable();

		for (const name of ['status', 'inputType', 'q']) {
			expect(query().has(name)).toBe(false);
		}

		await load(http, harness, page([]));
	});

	it('sorts by the metrics inside the range limit and falls back to Created beyond it', async () => {
		const ranked = await open('/ingress?sort=lastSession&from=now-24h&to=now');

		expect(ranked.request.params.get('sort')).toBe('lastSession');
		expect(ranked.element.querySelector('th[aria-sort="descending"]')?.textContent).toContain('Last session');

		await ranked.harness.navigateByUrl('/ingress?sort=sessions&from=now-30d&to=now');

		const wide = await load(ranked.http, ranked.harness, page([]));
		const sessions = [...ranked.element.querySelectorAll('th')].find((th) => th.textContent.trim() === 'Sessions');

		expect(wide.params.get('sort')).toBe('createdAt');
		expect(sessions?.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
	});

	it('reads "Ingress <ID> was not found" when an exact ID matches nothing', async () => {
		const { element } = await open('/ingress?q=IN_missing', page([]));

		expect(text(element.querySelector('ovd-empty-state .title'))).toBe('Ingress IN_missing was not found');
		expect(text(element.querySelector('ovd-empty-state button'))).toBe('Clear search');
	});
});

describe('IngressLockedPage', () => {
	it('fills the header of a deep link from the list endpoint and never requests the detail', async () => {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([
					{
						path: 'ingress/:ingressId',
						component: IngressLockedPage,
						data: { entity: { kind: 'ingress', param: 'ingressId' } }
					}
				]),
				provideHttpClient(),
				provideHttpClientTesting()
			]
		});

		const http = TestBed.inject(HttpTestingController);
		const harness = await RouterTestingHarness.create('/ingress/IN_c3d4');

		await settle();

		const lookup = http.expectOne((req) => req.url === 'api/v1/ingresses');

		expect(lookup.request.params.get('q')).toBe('IN_c3d4');
		lookup.flush(page([item()]));
		await settle();
		await harness.fixture.whenStable();

		const element = routeElement(harness);

		expect(text(element.querySelector('h1'))).toBe('cam-1');
		expect(element.querySelector('ovd-kind-badge')).toBeNull();
		http.expectNone('api/v1/ingresses/IN_c3d4');
		http.verify();
	});
});
