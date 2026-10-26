import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, type TestRequest } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { ListResponse, ParticipantListItem, ParticipantsSummary } from '@openvidu-dashboard/typings';
import { describe, expect, it, vi } from 'vitest';

import { infoResponse, settle } from '../../../testing/fixtures.js';
import { routeElement } from '../../../testing/harness.js';
import { LIST_SEARCH_DEBOUNCE_MS } from '../../components/search/list-search.js';
import { InfoService } from '../../core/info.js';
import { EntityPreviewService } from '../../core/state/entity-preview.js';
import { ParticipantLockedPage } from './participant-locked-page.js';
import { ParticipantsPage } from './participants-page.js';

@Component({ selector: 'ovd-blank', template: '' })
class Blank {}

function item(overrides: Partial<ParticipantListItem> = {}): ParticipantListItem {
	return {
		sid: 'PA_x1y2',
		identity: 'alice',
		kind: 'STANDARD',
		status: 'left',
		roomSid: 'RM_abc',
		roomName: 'demo-room',
		joinedAt: '2026-10-13T10:00:00.000Z',
		leftAt: '2026-10-13T10:42:00.000Z',
		durationMs: 42 * 60_000,
		connectionType: 'udp',
		nodeId: 'node-a',
		isPublisher: true,
		publishedSources: ['CAMERA', 'MICROPHONE'],
		client: { sdk: 'JS', version: '2.6.1', browser: 'Chrome', browserVersion: '130', os: 'macOS', osVersion: '14' },
		...overrides
	};
}

const NONE = { STANDARD: 0, INGRESS: 0, EGRESS: 0, SIP: 0, AGENT: 0, CONNECTOR: 0, BRIDGE: 0 };

function summary(overrides: Partial<ParticipantsSummary> = {}): ParticipantsSummary {
	return {
		active: { participants: 31, services: 5, byKind: { ...NONE, STANDARD: 31, EGRESS: 3, AGENT: 2 } },
		sessions: { participants: 900, byKind: { ...NONE, STANDARD: 900, EGRESS: 40, AGENT: 12 } },
		approximate: false,
		...overrides
	};
}

function page(items: ParticipantListItem[], extra: Partial<ListResponse<ParticipantListItem>> = {}) {
	return { items, nextCursor: null, prevCursor: null, ...extra };
}

function setup(): HttpTestingController {
	TestBed.configureTestingModule({
		providers: [
			provideRouter([
				{ path: 'participants', component: ParticipantsPage },
				{ path: 'participants/:participantSid', component: Blank },
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
	body: ListResponse<ParticipantListItem>,
	counts = summary()
): Promise<TestRequest['request']> {
	await settle();

	const request = http.expectOne((req) => req.url === 'api/v1/participants');

	request.flush(body);

	for (const pending of http.match((req) => req.url === 'api/v1/participants/summary')) {
		pending.flush(counts);
	}

	await settle();
	await harness.fixture.whenStable();

	return request.request;
}

async function open(url: string, body = page([item()]), counts = summary()) {
	const http = setup();
	const info = TestBed.inject(InfoService).load();

	http.expectOne('api/v1/info').flush(infoResponse());
	await info;

	const harness = await RouterTestingHarness.create(url);
	const request = await load(http, harness, body, counts);

	return { http, harness, request, element: routeElement(harness) };
}

function url(): string {
	return TestBed.inject(Router).url;
}

function query(): URLSearchParams {
	return new URLSearchParams(url().split('?')[1] ?? '');
}

function text(element: Element | null | undefined): string {
	return element?.textContent.replace(/\s+/g, ' ').trim() ?? '';
}

const debounce = () => new Promise((resolve) => setTimeout(resolve, LIST_SEARCH_DEBOUNCE_MS + 50));

describe('ParticipantsPage', () => {
	it('reproduces the URL state in the controls and the request', async () => {
		const { element, request } = await open(
			'/participants?from=now-7d&to=now&tz=UTC&q=ali&kind=STANDARD,EGRESS&status=left&limit=50'
		);

		expect(request.params.get('q')).toBe('ali');
		expect(request.params.get('kind')).toBe('STANDARD,EGRESS');
		expect(request.params.get('status')).toBe('left');
		expect(request.params.get('limit')).toBe('50');
		expect(element.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe('ali');
		expect(text(element.querySelector('.kind .mat-mdc-select-value'))).toBe('Standard, Egress');
		expect(text(element.querySelector('.status .mat-mdc-select-value'))).toBe('Left');
	});

	it('lists STANDARD participants without a kind and every kind with kind=all', async () => {
		const standard = await open('/participants');

		expect(standard.request.params.get('kind')).toBe('STANDARD');
		expect(text(standard.element.querySelector('.kind .mat-mdc-select-value'))).toBe('Standard');

		await standard.harness.navigateByUrl('/participants?kind=all');
		const every = await load(standard.http, standard.harness, page([item()]));

		expect(every.params.has('kind')).toBe(false);
		expect(text(standard.element.querySelector('.kind .mat-mdc-select-value'))).toBe('All kinds');
	});

	it('shows active participants, sessions in range and active services', async () => {
		const { element } = await open('/participants');
		const tiles = [...element.querySelectorAll('ovd-kpi-tile')].map((tile) => text(tile));

		expect(tiles).toEqual(['Active now 31', 'Sessions in range 900', 'Services now 5 Egress 3 · Agent 2']);
		expect(
			[...element.querySelectorAll('.tiles ovd-kpi-tile')].map(
				(tile) => tile.querySelector('ovd-info-tip button')?.getAttribute('aria-label') ?? null
			)
		).toEqual([null, 'About Sessions in range', 'About Services now']);
	});

	it('marks the sessions as approximate beyond the exact-count limit', async () => {
		const { element } = await open(
			'/participants?from=now-30d&to=now',
			page([item()]),
			summary({ approximate: true })
		);

		expect(text(element.querySelectorAll('ovd-kpi-tile')[1])).toBe('Sessions in range ≈ 900');
	});

	it('renders a row with links, badges, the live duration and the published sources', async () => {
		const { client: _client, ...bare$ } = item({ sid: 'PA_bare', publishedSources: [] });
		const { element } = await open('/participants', page([item(), bare$]));
		const [row, bare] = [...element.querySelectorAll('tbody tr')];
		const links = [...(row?.querySelectorAll('a') ?? [])].map((a) => a.getAttribute('href'));

		expect([...element.querySelectorAll('th')].map(text)).toEqual([
			'SID',
			'Identity',
			'Name',
			'Room',
			'Kind',
			'Status',
			'Joined',
			'Left',
			'Duration',
			'Published'
		]);
		expect(links).toEqual(['/participants/PA_x1y2', '/rooms/RM_abc']);
		expect(text(row?.querySelector('a'))).toBe('PA_x1y2');
		expect(
			[...(row?.querySelectorAll('ovd-copy-button button') ?? [])].map((b) => b.getAttribute('aria-label'))
		).toEqual(['Copy participant SID', 'Copy identity']);
		expect(text(row?.querySelector('ovd-kind-badge'))).toBe('Standard');
		expect(text(row?.querySelector('ovd-status-badge'))).toContain('left');
		expect(text(row)).toContain('42 m 00 s');
		expect(text(row)).not.toContain('UDP');
		expect(row?.querySelectorAll('ovd-source-icon')).toHaveLength(2);
		expect([...(bare?.querySelectorAll('td') ?? [])].map(text).at(-1)).toBe('—');
		expect(TestBed.inject(EntityPreviewService).get('participant', 'PA_x1y2')).toMatchObject({
			name: 'alice',
			room: { sid: 'RM_abc', name: 'demo-room' }
		});
	});

	it('writes the search only with two characters and opens an exact SID on Enter', async () => {
		const { element, harness, http } = await open('/participants?from=now-6h&to=now&tz=UTC');
		const input = element.querySelector<HTMLInputElement>('input[type="search"]');

		if (input === null) {
			throw new Error('no search box');
		}

		input.value = 'a';
		input.dispatchEvent(new Event('input'));
		await debounce();
		await harness.fixture.whenStable();

		expect(query().has('q')).toBe(false);
		expect(text(element.querySelector('mat-hint'))).toBe('Type at least 2 characters');
		http.expectNone((req) => req.url === 'api/v1/participants');

		input.value = 'PA_x1y2';
		input.dispatchEvent(new Event('input'));
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
		await harness.fixture.whenStable();

		expect(url()).toBe('/participants/PA_x1y2?from=now-6h&to=now&tz=UTC');
	});

	it('reads "Participant <SID> was not found" when an exact SID matches nothing', async () => {
		const { element } = await open('/participants?q=PA_missing', page([]));

		expect(text(element.querySelector('ovd-empty-state .title'))).toBe('Participant PA_missing was not found');
		expect(text(element.querySelector('ovd-empty-state button'))).toBe('Clear search');
	});

	it('requests publishers and the sort of the URL, and removes the Publishers chip', async () => {
		const { element, harness, http, request } = await open(
			'/participants?status=active&publisher=true&sort=leftAt&order=asc'
		);

		expect(request.params.get('publisher')).toBe('true');
		expect(request.params.get('sort')).toBe('leftAt');
		expect(request.params.get('order')).toBe('asc');
		expect(element.querySelector('th[aria-sort="ascending"]')?.textContent).toContain('Left');

		element.querySelector<HTMLButtonElement>('.publisher-chip button')?.click();
		await harness.fixture.whenStable();
		expect(query().has('publisher')).toBe(false);
		expect((await load(http, harness, page([]))).params.has('publisher')).toBe(false);
	});

	it('limits the ranked sorts to 24 hours unless a room is set', async () => {
		const wide = await open('/participants?sort=duration&from=now-7d&to=now');
		const duration = () =>
			[...wide.element.querySelectorAll('th')].find((th) => th.textContent.trim() === 'Duration') ?? null;

		expect(wide.request.params.get('sort')).toBe('joinedAt');
		expect(duration()?.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);

		await wide.harness.navigateByUrl('/participants?sort=leftAt&from=now-30d&to=now&room=RM_abc');

		const inRoom = await load(wide.http, wide.harness, page([item()]));

		expect(inRoom.params.get('sort')).toBe('leftAt');
		expect(inRoom.params.get('room')).toBe('RM_abc');
		expect(duration()?.querySelector<HTMLButtonElement>('button')?.disabled).toBe(false);
	});

	it('drops the cursor on a filter change and toggles the joined order', async () => {
		const { harness, http } = await open('/participants?cursor=abc');
		const page$ = harness.routeDebugElement?.componentInstance as { sessions: { setStatus(value: string): void } };

		page$.sessions.setStatus('active');
		await harness.fixture.whenStable();
		expect(query().get('status')).toBe('active');
		expect(query().has('cursor')).toBe(false);
		await load(http, harness, page([item()]));

		routeElement(harness).querySelector<HTMLButtonElement>('th button')?.click();
		await harness.fixture.whenStable();
		expect(query().get('sort')).toBe('joinedAt');
		expect(query().get('order')).toBe('asc');
		await load(http, harness, page([item()]));
	});

	it('shows a room chip whose removal drops the room', async () => {
		const { element, harness, request, http } = await open(
			'/participants?room=RM_abc',
			page([item({ roomName: 'demo-room' })])
		);

		expect(request.params.get('room')).toBe('RM_abc');
		expect(text(element.querySelector('ovd-room-chip'))).toContain('Room: demo-room');
		expect(element.querySelector('ovd-room-chip a')?.getAttribute('href')).toBe('/rooms/RM_abc');

		element.querySelector<HTMLButtonElement>('ovd-room-chip button')?.click();
		await harness.fixture.whenStable();
		expect(query().has('room')).toBe(false);
		expect((await load(http, harness, page([]))).params.has('room')).toBe(false);
	});

	it('offers to clear the filters when nothing matches', async () => {
		const { element, harness, http } = await open(
			'/participants?q=zzz&kind=AGENT&status=left&room=RM_abc&publisher=true',
			page([])
		);

		expect(text(element.querySelector('ovd-empty-state .title'))).toBe('No participants match');
		element.querySelector<HTMLButtonElement>('ovd-empty-state button')?.click();
		await harness.fixture.whenStable();

		for (const name of ['q', 'kind', 'status', 'room', 'publisher']) {
			expect(query().has(name)).toBe(false);
		}

		await load(http, harness, page([]));
	});

	it('refreshes in place at the live interval', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });

		try {
			const { element, harness, http } = await open('/participants', page([item({ status: 'active' })]));

			await vi.advanceTimersByTimeAsync(10_000);
			await load(http, harness, page([item({ status: 'left' })]));

			expect(element.querySelectorAll('.skeleton-row')).toHaveLength(0);
			expect(text(element.querySelector('tbody ovd-status-badge'))).toBe('left');
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('ParticipantLockedPage', () => {
	function setupLocked(): HttpTestingController {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([
					{
						path: 'participants/:participantSid',
						component: ParticipantLockedPage,
						data: { entity: { kind: 'participant', param: 'participantSid' } }
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
		const harness = await RouterTestingHarness.create('/participants/PA_x1y2');

		await settle();

		const lookup = http.expectOne((req) => req.url === 'api/v1/participants');

		expect(lookup.request.params.get('q')).toBe('PA_x1y2');
		lookup.flush(page([item()]));
		await settle();
		await harness.fixture.whenStable();

		expect(text(routeElement(harness).querySelector('h1'))).toBe('alice');
		http.expectNone('api/v1/participants/PA_x1y2');
		http.verify();
	});
});
