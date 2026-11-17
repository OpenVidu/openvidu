import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, type TestRequest } from '@angular/common/http/testing';
import { Component, type Provider, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { ListResponse, ParticipantListItem } from '@openvidu-dashboard/typings';
import { describe, expect, it, vi } from 'vitest';

import { infoResponse, settle } from '../../../testing/fixtures.js';
import { exportCsv, routeElement } from '../../../testing/harness.js';
import { RangePickerService } from '../../components/date-time-range-picker/date-time-range-picker.js';
import { InfoService } from '../../core/info.js';
import { BreakpointService, type ScreenSize } from '../../core/ui/breakpoints.js';
import { LiveCountersService } from '../../core/refresh/live-counters.js';
import { AgentsPage } from './agents-page.js';

@Component({ selector: 'ovd-blank', template: '' })
class Blank {}

function agent(overrides: Partial<ParticipantListItem> = {}): ParticipantListItem {
	return {
		sid: 'PA_z9',
		identity: 'agent-1',
		kind: 'AGENT',
		status: 'active',
		roomSid: 'RM_abc',
		roomName: 'demo-room',
		joinedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
		nodeId: 'node-a',
		isPublisher: true,
		publishedSources: ['CAMERA', 'MICROPHONE'],
		client: { sdk: 'GO', version: '1.2' },
		...overrides
	};
}

function page(items: ParticipantListItem[]): ListResponse<ParticipantListItem> {
	return { items, nextCursor: null, prevCursor: null };
}

function setup(providers: Provider[] = []): HttpTestingController {
	TestBed.configureTestingModule({
		providers: [
			provideRouter([
				{ path: 'agents', component: AgentsPage },
				{ path: 'participants', component: Blank },
				{ path: 'participants/:participantSid', component: Blank },
				{ path: 'rooms/:roomSid', component: Blank }
			]),
			provideHttpClient(),
			provideHttpClientTesting(),
			...providers
		]
	});

	return TestBed.inject(HttpTestingController);
}

const NONE = { STANDARD: 0, INGRESS: 0, EGRESS: 0, SIP: 0, AGENT: 0, CONNECTOR: 0, BRIDGE: 0 };

async function load(
	http: HttpTestingController,
	harness: RouterTestingHarness,
	body: ListResponse<ParticipantListItem>,
	agentSessions = 12,
	approximate = false
): Promise<TestRequest['request']> {
	await settle();

	const request = http.expectOne((req) => req.url === 'api/v1/agents');

	request.flush(body);

	for (const summary of http.match((req) => req.url === 'api/v1/participants/summary')) {
		summary.flush({
			active: { participants: 0, services: 1, byKind: { ...NONE, AGENT: 1 } },
			sessions: { participants: 0, byKind: { ...NONE, AGENT: agentSessions } },
			approximate
		});
	}

	await settle();
	await harness.fixture.whenStable();

	return request.request;
}

function text(element: Element | null | undefined): string {
	return element?.textContent.replace(/\s+/g, ' ').trim() ?? '';
}

/** The text a viewer sees: without the hidden copy of the value each copy button keeps for the clipboard. */
function visibleText(element: Element | null | undefined): string {
	const clone = element?.cloneNode(true) as Element | undefined;

	for (const hidden of clone?.querySelectorAll('ovd-copy-button') ?? []) {
		hidden.remove();
	}

	return text(clone);
}

/** The items of the last list response the page rendered. */
function rows(harness: RouterTestingHarness): ParticipantListItem[] {
	return (harness.routeDebugElement?.componentInstance as { rows(): ParticipantListItem[] }).rows();
}

function query(): URLSearchParams {
	return new URL(TestBed.inject(Router).url, 'http://localhost').searchParams;
}

/** The Agent cell of the first row, by the position of its header. */
async function agentCell(item: ParticipantListItem): Promise<Element | undefined> {
	const http = setup();
	const harness = await RouterTestingHarness.create('/agents');

	await load(http, harness, page([item]));

	const element = routeElement(harness);
	const index = [...element.querySelectorAll('thead th')].findIndex((th) => text(th) === 'Agent');

	return element.querySelectorAll('tbody tr td')[index];
}

describe('AgentsPage', () => {
	it('Origin in the CSV export', async () => {
		const http = setup();
		const info = TestBed.inject(InfoService).load();

		http.expectOne('api/v1/info').flush(infoResponse());
		await info;

		const harness = await RouterTestingHarness.create('/agents?origin=openvidu&status=active&sort=duration');

		await load(http, harness, page([agent()]));

		const { params } = await exportCsv(http, routeElement(harness), 'agents/export.csv');

		expect(params.get('origin')).toBe('openvidu');
		expect(params.get('status')).toBe('active');
		expect(params.get('sort')).toBe('duration');
		expect(params.has('cursor') || params.has('limit')).toBe(false);
	});

	it('Agent row: its cells in order, links, live duration and published sources, and no SDK, Kind or Node', async () => {
		const http = setup();
		const info = TestBed.inject(InfoService).load();

		http.expectOne('api/v1/info').flush(infoResponse({ features: [] }));
		await info;

		const harness = await RouterTestingHarness.create('/agents');

		await load(
			http,
			harness,
			page([agent({ name: 'Support bot', publishedSources: ['MICROPHONE'], agent: { name: 'support' } })])
		);

		const element = routeElement(harness);
		const row = element.querySelector('tbody tr');
		const links = [...(row?.querySelectorAll('a') ?? [])].map((a) => a.getAttribute('href'));
		const cells = [...(row?.querySelectorAll('td') ?? [])];

		expect([...element.querySelectorAll('th')].map(text)).toEqual([
			'SID',
			'Agent',
			'Identity',
			'Name',
			'Room',
			'Status',
			'Joined',
			'Left',
			'Duration',
			'Published'
		]);
		expect(links).toEqual(['/participants/PA_z9', '/rooms/RM_abc']);
		expect(cells.slice(0, 6).map(visibleText)).toEqual([
			'PA_z9',
			'support',
			'agent-1',
			'Support bot',
			'demo-room',
			'active'
		]);
		expect(visibleText(row).match(/PA_z9/g)).toHaveLength(1);
		expect(cells[0]?.querySelector('ovd-copy-button')).not.toBeNull();
		expect(cells[2]?.querySelector('ovd-copy-button')).not.toBeNull();
		expect(text(row?.querySelector('a'))).toBe('PA_z9');
		expect(text(row)).toContain('Support bot');
		expect(text(row?.querySelector('ovd-status-badge'))).toContain('active');
		expect(text(row)).not.toContain('GO 1.2');
		expect(text(row)).toMatch(/5 m 0\d s/);
		const joinedAt = rows(harness)[0]?.joinedAt ?? '';
		const { sessions } = harness.routeDebugElement?.componentInstance as {
			sessions: { time(value: string): string };
		};

		expect(cells[6]?.querySelector('time')?.getAttribute('datetime')).toBe(joinedAt);
		expect(text(cells[6])).toBe(sessions.time(joinedAt));
		expect(row?.querySelector('[aria-label="Not left"]')).not.toBeNull();
		expect(row?.querySelectorAll('ovd-source-icon')).toHaveLength(1);
		expect(text(row)).not.toContain('node-a');
		expect(element.querySelector('ovd-list-search mat-label')?.textContent).toBe('Identity or SID');
	});

	it('searches by identity and limits the ranked sorts to 24 hours unless a room is set', async () => {
		const http = setup();
		const info = TestBed.inject(InfoService).load();

		http.expectOne('api/v1/info').flush(infoResponse());
		await info;

		const harness = await RouterTestingHarness.create('/agents?q=agent-&sort=duration&from=now-7d&to=now');
		const request = await load(http, harness, page([agent()]));

		expect(request.params.get('q')).toBe('agent-');
		expect(request.params.get('sort')).toBe('joinedAt');

		await harness.navigateByUrl('/agents?sort=leftAt&from=now-7d&to=now&room=RM_abc');

		const inRoom = await load(http, harness, page([agent()]));

		expect(inRoom.params.get('sort')).toBe('leftAt');
		expect(inRoom.params.get('room')).toBe('RM_abc');
		expect(text(routeElement(harness).querySelector('ovd-room-chip'))).toContain('Room: demo-room');
	});

	it('No agents', async () => {
		const http = setup();
		const harness = await RouterTestingHarness.create('/agents?status=active&origin=openvidu&q=zzz&room=RM_abc');
		const element = routeElement(harness);
		const picker = TestBed.inject(RangePickerService);

		await load(http, harness, page([]));
		expect(text(element.querySelector('ovd-empty-state .title'))).toBe('No agents match');
		expect(text(element.querySelector('ovd-empty-state'))).toContain('Change the filters or widen the time range.');

		const [clear, widen] = [...element.querySelectorAll<HTMLButtonElement>('ovd-empty-state button')];

		expect([clear, widen].map(text)).toEqual(['Clear filters', 'Widen range']);
		widen?.click();
		expect(picker.requests()).toBe(1);

		clear?.click();
		await harness.fixture.whenStable();

		for (const name of ['q', 'status', 'origin', 'room']) {
			expect(query().has(name), name).toBe(false);
		}

		await load(http, harness, page([]));
	});

	it('writes the status filter without the cursor', async () => {
		const http = setup();
		const harness = await RouterTestingHarness.create('/agents?cursor=abc');

		await load(http, harness, page([]));

		(
			harness.routeDebugElement?.componentInstance as { sessions: { setStatus(value: string): void } }
		).sessions.setStatus('active');
		await harness.fixture.whenStable();

		const url = TestBed.inject(Router).url;

		expect(url).toContain('status=active');
		expect(url).not.toContain('cursor');
		expect((await load(http, harness, page([]))).params.get('status')).toBe('active');
	});

	it('Dates as on the other lists', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date('2026-10-18T12:00:00Z') });

		try {
			const http = setup();
			const harness = await RouterTestingHarness.create('/agents?tz=Europe/Madrid');

			await load(
				http,
				harness,
				page([
					agent({ joinedAt: '2026-10-18T10:31:05Z' }),
					agent({ sid: 'PA_y1', joinedAt: '2026-10-17T07:00:00Z', leftAt: '2026-10-17T07:30:00Z' })
				])
			);

			const element = routeElement(harness);
			const headers = [...element.querySelectorAll('thead th')].map(text);
			const joined = headers.indexOf('Joined');

			expect(
				[...element.querySelectorAll('tbody tr')].map((row) => text(row.querySelectorAll('td')[joined]))
			).toEqual(['12:31:05', '2026-10-17 09:00:00']);

			const { sessions } = harness.routeDebugElement?.componentInstance as {
				sessions: { columns(): { key: string; headerHint?: string }[] };
			};

			expect(
				sessions
					.columns()
					.filter((column) => ['joinedAt', 'leftAt'].includes(column.key))
					.map((column) => column.headerHint)
			).toEqual(['Europe/Madrid', 'Europe/Madrid']);
		} finally {
			vi.useRealTimers();
		}
	});

	it('Stale agent', async () => {
		const http = setup();
		const harness = await RouterTestingHarness.create('/agents');

		await load(
			http,
			harness,
			page([
				agent({ stale: true }),
				// An old join without the flag: the browser never judges staleness itself.
				agent({ sid: 'PA_old', joinedAt: new Date(Date.now() - 86_400_000).toISOString() })
			])
		);

		const [stale, fresh] = [...routeElement(harness).querySelectorAll('tbody tr')];

		expect(stale?.querySelector('ovd-status-badge mat-icon.stale')).not.toBeNull();
		expect(fresh?.querySelector('ovd-status-badge mat-icon.stale')).toBeNull();
	});

	it('OpenVidu agent with a name', async () => {
		const cell = await agentCell(
			agent({ agent: { name: 'speech-processing-dev', openvidu: 'speech-processing' } })
		);
		const tag = cell?.querySelector('.origin');
		const status = cell?.closest('tr')?.querySelector('ovd-status-badge .ovd-tag');

		expect(text(cell)).toBe('speech-processing-dev OpenVidu');
		expect(text(tag)).toBe('OpenVidu');
		// The shared 24 px tag box of the status badge of the row.
		expect(tag?.classList.contains('ovd-tag')).toBe(true);
		expect(status).not.toBeNull();
		expect(tag?.classList.contains('mat-mdc-tooltip-trigger')).toBe(false);
		expect(tag?.hasAttribute('tabindex')).toBe(false);
	});

	it('Third-party agent', async () => {
		const cell = await agentCell(agent({ agent: { name: 'dummy-agent' } }));

		expect(text(cell)).toBe('dummy-agent');
		expect(cell?.closest('tr')?.querySelector('.origin')).toBeNull();
	});

	it('OpenVidu agent without a name', async () => {
		const cell = await agentCell(agent({ agent: { openvidu: 'speech-processing' } }));

		expect(text(cell)).toBe('speech-processing OpenVidu');
		expect(text(cell?.querySelector('.origin'))).toBe('OpenVidu');
	});

	it('Agent without agent facts', async () => {
		const cell = await agentCell(agent());

		expect(text(cell)).toBe('—');
		expect(cell?.closest('tr')?.querySelector('.origin')).toBeNull();
	});

	it('Agent column not sortable: the column shows in the More area of the card layout', async () => {
		const http = setup([{ provide: BreakpointService, useValue: { size: signal<ScreenSize>('xsmall') } }]);
		const harness = await RouterTestingHarness.create('/agents');

		await load(
			http,
			harness,
			page([agent({ agent: { name: 'speech-processing', openvidu: 'speech-processing' } })])
		);

		const element = routeElement(harness);
		const card = element.querySelector('.card');

		expect(card).not.toBeNull();
		card?.querySelector<HTMLButtonElement>('button.more')?.click();
		await harness.fixture.whenStable();

		const agentFact = [...(card?.querySelectorAll('.metrics > div') ?? [])].find((fact) =>
			text(fact.querySelector('dt')).startsWith('Agent')
		);

		expect(agentFact?.querySelector('dt ovd-info-tip')).not.toBeNull();
		expect(text(agentFact?.querySelector('dd'))).toBe('speech-processing OpenVidu');
	});

	it('Agent column not sortable', async () => {
		const http = setup();
		const harness = await RouterTestingHarness.create('/agents');

		await load(http, harness, page([agent()]));

		const element = routeElement(harness);
		const header = [...element.querySelectorAll('thead th')].find((th) => text(th) === 'Agent');

		expect(header?.querySelector('button.sort')).toBeNull();
		expect(header?.hasAttribute('aria-sort')).toBe(false);

		[...element.querySelectorAll<HTMLButtonElement>('button')]
			.find((button) => text(button) === 'Columns')
			?.click();
		await harness.fixture.whenStable();

		expect(
			[...document.querySelectorAll('[role="menuitemcheckbox"]')].map((item) => text(item)).filter(Boolean)
		).toContain('Agent');
	});

	it('OpenVidu origin selected', async () => {
		const http = setup();
		const harness = await RouterTestingHarness.create('/agents?cursor=abc');
		const element = routeElement(harness);

		await load(http, harness, page([agent()]));

		element.querySelector<HTMLElement>('.origin .mat-mdc-select-trigger')?.click();
		await harness.fixture.whenStable();
		[...document.querySelectorAll<HTMLElement>('mat-option')]
			.find((option) => text(option) === 'OpenVidu')
			?.click();
		await harness.fixture.whenStable();

		expect(query().get('origin')).toBe('openvidu');
		expect(query().has('cursor')).toBe(false);
		expect((await load(http, harness, page([agent()]))).params.get('origin')).toBe('openvidu');

		element.querySelector<HTMLElement>('.origin .mat-mdc-select-trigger')?.click();
		await harness.fixture.whenStable();
		[...document.querySelectorAll<HTMLElement>('mat-option')].find((option) => text(option) === 'All')?.click();
		await harness.fixture.whenStable();

		expect(query().has('origin')).toBe(false);
		expect((await load(http, harness, page([agent()]))).params.has('origin')).toBe(false);
	});

	it('Third-party origin from the URL', async () => {
		const http = setup();
		const harness = await RouterTestingHarness.create('/agents?origin=third-party&status=left');
		const request = await load(http, harness, page([agent()]));
		const element = routeElement(harness);

		expect(text(element.querySelector('.origin .mat-mdc-select-value'))).toBe('Third-party');
		expect(text(element.querySelector('.status .mat-mdc-select-value'))).toBe('Left');
		expect(request.params.get('origin')).toBe('third-party');
		expect(request.params.get('status')).toBe('left');
	});

	it('Invalid origin in the URL', async () => {
		const http = setup();
		const harness = await RouterTestingHarness.create('/agents?origin=livekit');
		const request = await load(http, harness, page([agent()]));
		const element = routeElement(harness);

		expect(text(element.querySelector('.origin .mat-mdc-select-value'))).toBe('All');
		expect(request.params.has('origin')).toBe(false);
		expect(element.querySelector('ovd-error-banner')).toBeNull();
		expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
	});

	it('shows the live counter and reloads the table when it changes', async () => {
		const http = setup();
		const counters = TestBed.inject(LiveCountersService);

		counters.setActiveAgents(3);

		const harness = await RouterTestingHarness.create('/agents');

		await load(http, harness, page([agent()]));
		expect(text(routeElement(harness).querySelector('ovd-kpi-tile .value'))).toBe('3');

		counters.setActiveAgents(4);
		await harness.fixture.whenStable();
		await load(http, harness, page([agent(), agent({ sid: 'PA_z10', identity: 'agent-2' })]));

		expect(text(routeElement(harness).querySelector('ovd-kpi-tile .value'))).toBe('4');
		expect(routeElement(harness).querySelectorAll('tbody tr')).toHaveLength(2);
	});

	it('polls the overview for the counter without taking the refresh control', async () => {
		const http = setup();
		const harness = await RouterTestingHarness.create('/agents');

		await load(http, harness, page([agent()]));
		http.expectOne((req) => req.url === 'api/v1/overview').flush({
			live: { participantsByKind: { AGENT: 7 } }
		});
		await settle();
		await harness.fixture.whenStable();

		expect(text(routeElement(harness).querySelector('ovd-kpi-tile .value'))).toBe('7');
		await load(http, harness, page([agent()]));
	});

	it('shows the agent sessions of the range, approximate beyond the exact-count limit', async () => {
		const http = setup();
		const harness = await RouterTestingHarness.create('/agents?from=now-30d&to=now');

		await load(http, harness, page([agent()]), 12, true);

		const tiles = [...routeElement(harness).querySelectorAll('ovd-kpi-tile')].map(text);

		expect(tiles[0]).toMatch(/^Active now/);
		expect(tiles[1]).toBe('Agent sessions in range ≈ 12');
	});

	it('links the notice to the participants of kind AGENT keeping the range', async () => {
		const http = setup();
		const harness = await RouterTestingHarness.create('/agents?from=now-6h&to=now&tz=UTC');

		await load(http, harness, page([]));

		expect(routeElement(harness).querySelector('.notice a')?.getAttribute('href')).toBe(
			'/participants?from=now-6h&to=now&tz=UTC&kind=AGENT'
		);

		expect(routeElement(harness).querySelector('.notice')?.classList.contains('info')).toBe(true);
		routeElement(harness).querySelector<HTMLButtonElement>('.notice button[aria-label="Dismiss"]')?.click();
		await harness.fixture.whenStable();
		expect(routeElement(harness).querySelector('.notice')).toBeNull();
	});
});
