import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, type TestRequest } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { ListResponse, ParticipantListItem } from '@openvidu-dashboard/typings';
import { describe, expect, it } from 'vitest';

import { infoResponse, settle } from '../../../testing/fixtures.js';
import { routeElement } from '../../../testing/harness.js';
import { InfoService } from '../../core/info.js';
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

function setup(): HttpTestingController {
	TestBed.configureTestingModule({
		providers: [
			provideRouter([
				{ path: 'agents', component: AgentsPage },
				{ path: 'participants', component: Blank },
				{ path: 'participants/:participantSid', component: Blank },
				{ path: 'rooms/:roomSid', component: Blank }
			]),
			provideHttpClient(),
			provideHttpClientTesting()
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

describe('AgentsPage', () => {
	it('renders an agent row with its links, live duration and published sources, and no SDK or Kind', async () => {
		const http = setup();
		const harness = await RouterTestingHarness.create('/agents');

		await load(http, harness, page([agent({ name: 'Support bot', publishedSources: ['MICROPHONE'] })]));

		const element = routeElement(harness);
		const row = element.querySelector('tbody tr');
		const links = [...(row?.querySelectorAll('a') ?? [])].map((a) => a.getAttribute('href'));

		expect([...element.querySelectorAll('th')].map(text)).toEqual([
			'SID',
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
		expect(text(row?.querySelector('a'))).toBe('PA_z9');
		expect(text(row)).toContain('Support bot');
		expect(text(row?.querySelector('ovd-status-badge'))).toContain('active');
		expect(text(row)).not.toContain('GO 1.2');
		expect(text(row)).toMatch(/5 m 0\d s/);
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

	it('shows the empty state and writes the status filter without the cursor', async () => {
		const http = setup();
		const harness = await RouterTestingHarness.create('/agents?cursor=abc');

		await load(http, harness, page([]));
		expect(text(routeElement(harness).querySelector('ovd-empty-state .title'))).toBe('No agents match');
		expect(text(routeElement(harness).querySelector('ovd-empty-state'))).toContain(
			'Change the filters or widen the time range.'
		);

		(harness.routeDebugElement?.componentInstance as { setStatus(value: string): void }).setStatus('active');
		await harness.fixture.whenStable();

		const url = TestBed.inject(Router).url;

		expect(url).toContain('status=active');
		expect(url).not.toContain('cursor');
		expect((await load(http, harness, page([]))).params.get('status')).toBe('active');
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
