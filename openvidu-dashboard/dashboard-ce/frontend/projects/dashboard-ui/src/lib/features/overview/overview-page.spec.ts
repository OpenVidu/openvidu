import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { OverviewResponse, StatusResponse } from '@openvidu-dashboard/typings';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { infoResponse, settle } from '../../../testing/fixtures.js';
import { routeElement } from '../../../testing/harness.js';
import { InfoService } from '../../core/info.js';
import { LiveCountersService } from '../../core/live-counters.js';
import { PreferencesService } from '../../core/preferences.js';
import { ServerStatusService } from '../../core/server-status.js';
import { OverviewPage } from './overview-page.js';

@Component({ selector: 'ovd-blank', template: '' })
class Blank {}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
/** Reference instant of every fixture: `generatedAt`, so server ages are exact. */
let reference = Date.now();
const ago = (ms: number) => new Date(reference - ms).toISOString();

/** Overrides of the overview; `undefined` removes a field. */
type Overrides = { [K in keyof OverviewResponse]?: OverviewResponse[K] | undefined };

function overview(overrides: Overrides = {}): OverviewResponse {
	return JSON.parse(
		JSON.stringify({
			generatedAt: new Date(reference).toISOString(),
			live: {
				rooms: 12,
				participants: 85,
				services: 7,
				participantsByKind: { STANDARD: 85, INGRESS: 0, EGRESS: 3, SIP: 2, AGENT: 2, CONNECTOR: 0, BRIDGE: 0 },
				publishers: 52,
				egresses: 3,
				ingressSessions: 1,
				stale: { rooms: 0, participants: 0, olderThanMs: 90_000 }
			},
			today: {
				tz: 'UTC',
				since: '2026-10-13T00:00:00.000Z',
				rooms: 143,
				participantSessions: 1204,
				participantMinutes: 18_340,
				egresses: 21,
				ingressSessions: 4,
				approximate: false
			},
			recentRooms: [
				{
					sid: 'RM_ab12cd',
					name: 'demo-room',
					status: 'active',
					createdAt: ago(42 * MINUTE),
					participants: { active: 5, sessions: 9, unique: 6 },
					nodeId: 'node-a',
					lastStatsAt: ago(5 * SECOND)
				},
				{
					sid: 'RM_stale1',
					name: 'stale-room',
					status: 'active',
					createdAt: ago(60 * MINUTE),
					participants: { active: 2, sessions: 2, unique: 2 },
					lastStatsAt: ago(3 * MINUTE),
					stale: true
				},
				{
					sid: 'RM_closed1',
					name: 'closed-room',
					status: 'closed',
					createdAt: ago(120 * MINUTE),
					endedAt: ago(90 * MINUTE),
					durationMs: 30 * MINUTE,
					closedBy: 'reconciler',
					participants: { active: 0, sessions: 14, unique: 9 }
				}
			],
			...overrides
		})
	) as OverviewResponse;
}

/** A status read at the reference instant, with the writer batch `writerAgeMs` old (never seen when `null`). */
function status(overrides: Partial<StatusResponse> = {}, writerAgeMs: number | null = 4 * SECOND): StatusResponse {
	return {
		generatedAt: new Date(reference).toISOString(),
		schema: { dashboard: 2, writer: 2, status: 'ok' },
		migration: { state: 'completed', progress: { processed: 10, total: 10 } },
		writer:
			writerAgeMs === null
				? { nodes: 0, aliveNodes: 0 }
				: { lastSeenAt: ago(writerAgeMs), nodes: 2, aliveNodes: 2 },
		...overrides
	};
}

async function loadStatus(http: HttpTestingController, body: StatusResponse): Promise<void> {
	const load = TestBed.inject(ServerStatusService).load();

	http.expectOne('api/v1/status').flush(body);
	await load;
}

async function open(
	body: OverviewResponse | 'fail' = overview(),
	features: string[] = [],
	server: StatusResponse | null = status()
) {
	TestBed.configureTestingModule({
		providers: [
			provideRouter([
				{ path: 'overview', component: OverviewPage },
				{ path: '**', component: Blank }
			]),
			provideHttpClient(),
			provideHttpClientTesting()
		]
	});

	const http = TestBed.inject(HttpTestingController);
	const load = TestBed.inject(InfoService).load();

	http.expectOne('api/v1/info').flush(infoResponse({ features: features as never[] }));
	await load;

	if (server !== null) {
		await loadStatus(http, server);
	}

	const harness = await RouterTestingHarness.create('/overview?tz=UTC');

	await answer(http, harness, body);

	return { http, harness, element: routeElement(harness) };
}

async function answer(
	http: HttpTestingController,
	harness: RouterTestingHarness,
	body: OverviewResponse | 'fail' | 304,
	etag = 'W/"one"'
) {
	await settle();

	for (const request of http.match((req) => req.url === 'api/v1/overview')) {
		if (body === 'fail') {
			request.flush(
				{ error: { code: 'INTERNAL_ERROR', message: 'boom' } },
				{ status: 500, statusText: 'Server Error', headers: { 'X-Request-Id': 'req-9' } }
			);
		} else if (body === 304) {
			request.flush(null, { status: 304, statusText: 'Not Modified', headers: { ETag: etag } });
		} else {
			request.flush(body, { headers: { ETag: etag } });
		}
	}

	await settle();
	await harness.fixture.whenStable();
}

function text(element: Element | null | undefined): string {
	return element?.textContent.replace(/\s+/g, ' ').trim() ?? '';
}

function section(element: HTMLElement, title: string): HTMLElement | undefined {
	return [...element.querySelectorAll<HTMLElement>('ovd-section-card')].find((card) =>
		text(card.querySelector('h2')).startsWith(title)
	);
}

describe('OverviewPage', () => {
	beforeEach(() => {
		reference = Date.now();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows the live tiles with their links and feeds the live counters', async () => {
		const { element, http } = await open();
		const values = [...element.querySelectorAll('.tiles ovd-kpi-tile .value')].map(text);
		const links = [...element.querySelectorAll<HTMLAnchorElement>('.tiles a')].map((link) =>
			link.getAttribute('href')
		);

		expect(values).toEqual(['12', '85', '52', '3', '1', '2']);
		expect([...element.querySelectorAll('.tiles ovd-kpi-tile .label')].map(text)).not.toContain('Services');
		expect(links).toEqual([
			'/rooms?status=active',
			'/participants?status=active',
			'/participants?status=active&publisher=true',
			'/egress?status=active',
			'/ingress?status=publishing',
			'/agents?status=active'
		]);
		expect(TestBed.inject(LiveCountersService).activeAgents()).toBe(2);
		expect(text(element.querySelector('.page-header ovd-live-chip'))).toBe('LIVE');
		expect(element.querySelector('ovd-notice')).toBeNull();
		http.verify();
	});

	it('shows a skeleton in the data pipeline card before the first status', async () => {
		const { element } = await open(overview(), [], null);
		const pipeline = section(element, 'Data pipeline');

		expect(pipeline?.querySelector('ovd-skeleton')).not.toBeNull();
		expect(pipeline?.querySelector('p.muted')).toBeNull();
	});

	it('keeps every value on a 304 and sends the validator', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });

		const { element, http, harness } = await open();
		const before = element.querySelector('.tiles')?.innerHTML;

		await vi.advanceTimersByTimeAsync(10_500);

		const poll = http.expectOne((req) => req.url === 'api/v1/overview');

		expect(poll.request.headers.get('If-None-Match')).toBe('W/"one"');
		poll.flush(null, { status: 304, statusText: 'Not Modified', headers: { ETag: 'W/"one"' } });
		await settle();
		await harness.fixture.whenStable();
		expect(element.querySelector('.tiles')?.innerHTML).toBe(before);
		expect(element.querySelector('.highlight')).toBeNull();
	});

	it('turns the chip and the writer line to stale from the last server status', async () => {
		const { element } = await open(overview(), [], {
			...status({}, 3 * MINUTE),
			writer: { lastSeenAt: ago(3 * MINUTE), nodes: 1, aliveNodes: 0 }
		});
		const chip = element.querySelector('.page-header ovd-live-chip');

		expect(text(chip)).toBe('stale');
		const pipeline = section(element, 'Data pipeline');
		const lines = [...(pipeline?.querySelectorAll('li.line') ?? [])];

		expect(text(lines[0])).toMatch(/^Last batch at \d\d:\d\d:\d\d/);
		expect(lines[0]?.querySelector('mat-icon.warn')).not.toBeNull();
		expect(text(lines[1])).toBe('0 of 1 node reporting');
		expect(lines[1]?.querySelector('mat-icon.warn')).not.toBeNull();
	});

	it('keeps LIVE and fresh rooms under a long interval, judged at the responses', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });

		const { element, harness } = await open();

		TestBed.inject(PreferencesService).setRefreshInterval('live', 300_000);

		await vi.advanceTimersByTimeAsync(4 * MINUTE);
		await harness.fixture.whenStable();

		const [active] = [...(section(element, 'Recent rooms')?.querySelectorAll('tbody tr') ?? [])];

		expect(text(element.querySelector('.page-header ovd-live-chip'))).toBe('LIVE');
		expect(active?.querySelector('ovd-status-badge mat-icon.stale')).toBeNull();
	});

	it('reads paused while the auto-refresh is off and still follows the server status', async () => {
		const { element, http, harness } = await open();

		TestBed.inject(PreferencesService).setRefreshInterval('live', 0);
		await harness.fixture.whenStable();
		expect(text(element.querySelector('.page-header ovd-live-chip'))).toBe('paused');

		const before = text(section(element, 'Data pipeline')?.querySelector('li.line'));

		reference += 60 * SECOND;
		await loadStatus(http, status());
		await harness.fixture.whenStable();
		expect(text(section(element, 'Data pipeline')?.querySelector('li.line'))).not.toBe(before);
	});

	it('explains node liveness on the By node heading in PRO', async () => {
		const { element } = await open(overview(), ['per-node-breakdown']);

		expect(
			section(element, 'By node')?.querySelector('header ovd-info-tip button')?.getAttribute('aria-label')
		).toBe('About By node');
	});

	it('marks an approximate today and an empty one', async () => {
		const { element } = await open(
			overview({ today: { ...overview().today, tz: 'Asia/Kolkata', approximate: true } })
		);
		const today = section(element, 'Today');

		expect(text(today?.querySelector('h2'))).toBe('Today (Asia/Kolkata, since 00:00)');
		expect(text(today?.querySelector('ovd-kpi-tile'))).toContain('≈ 143');
		expect(today?.querySelectorAll('ovd-kpi-tile .value .approximate')).toHaveLength(5);
	});

	it('explains the live tiles, the today tiles, the data pipeline and unique identities with info tips only', async () => {
		const { element } = await open();
		const tips = (root: Element | null | undefined): (string | null)[] =>
			[...(root?.querySelectorAll('ovd-info-tip button') ?? [])].map((button) =>
				button.getAttribute('aria-label')
			);

		expect(tips(element.querySelector('.tiles'))).toEqual([
			'About Participants',
			'About Publishers',
			'About Agents'
		]);
		expect(tips(section(element, 'Today'))).toEqual(['About Participants', 'About Minutes']);
		expect(tips(section(element, 'Data pipeline'))).toEqual(['About Data pipeline']);
		expect(tips(section(element, 'Recent rooms'))).toEqual(['About Unique identities']);
		expect(tips(section(element, 'By node'))).toEqual([]);
		expect(section(element, 'Today')?.querySelector('ovd-kpi-tile[mattooltip], ovd-kpi-tile[tabindex]')).toBeNull();
	});

	it('hints the stale entities after two responses in a row and renders the recent rooms', async () => {
		const staleLive = { ...overview().live, stale: { rooms: 1, participants: 4, olderThanMs: 90_000 } };
		const { element, http, harness } = await open(overview({ live: staleLive }));

		expect(element.querySelector('ovd-notice')).toBeNull();

		(harness.routeDebugElement?.componentInstance as { retry(): void }).retry();
		await answer(http, harness, 304);

		const hint = element.querySelector('ovd-notice');
		const [active, stale, closed] = [...(section(element, 'Recent rooms')?.querySelectorAll('tbody tr') ?? [])];

		expect(hint?.classList.contains('warning')).toBe(true);
		expect(text(hint)).toContain(
			'1 active room and 4 participants have had no stats for over 90 s and may be stale'
		);
		expect(hint?.querySelector('a')?.getAttribute('href')).toBe('/rooms?status=active');
		expect(active?.querySelector('a')?.getAttribute('href')).toBe('/rooms/RM_ab12cd');
		expect(text(active?.querySelector('a'))).toBe('RM_ab12cd');
		expect(active?.querySelectorAll('ovd-copy-chip')).toHaveLength(0);
		expect(
			[...(active?.querySelectorAll('ovd-copy-button button') ?? [])].map((b) => b.getAttribute('aria-label'))
		).toEqual(['Copy room SID', 'Copy room name']);
		expect(text(active?.querySelectorAll('td')[5])).toBe('6');
		expect(text(closed?.querySelectorAll('td')[5])).toBe('9');
		expect([...(section(element, 'Recent rooms')?.querySelectorAll('thead th') ?? [])].map(text)).toEqual([
			'SID',
			'Name',
			'Status',
			'Started',
			'Duration',
			'Unique identities'
		]);
		expect(active?.querySelector('ovd-live-chip')).toBeNull();
		expect(active?.querySelector('ovd-status-badge mat-icon.stale')).toBeNull();
		expect(stale?.querySelector('ovd-live-chip')).toBeNull();
		expect(stale?.querySelector('ovd-status-badge mat-icon.stale')).not.toBeNull();
		expect(stale?.querySelector('ovd-status-badge .badge')?.getAttribute('aria-label')).toContain('No stats since');
		expect(closed?.querySelector('ovd-status-badge .estimated')).not.toBeNull();
		expect(text(closed)).toContain('30 m 00 s');
		expect([...(section(element, 'Recent rooms')?.querySelectorAll('.links a') ?? [])].map(text)).toEqual([
			'View active rooms',
			'View all rooms'
		]);
	});

	it('hides the stale notice with the first response without stale entities', async () => {
		const staleLive = { ...overview().live, stale: { rooms: 2, participants: 0, olderThanMs: 135_000 } };
		const { element, http, harness } = await open(overview({ live: staleLive }));
		const page = harness.routeDebugElement?.componentInstance as { retry(): void };

		page.retry();
		await answer(http, harness, 304);
		expect(text(element.querySelector('ovd-notice'))).toContain(
			'2 active rooms and 0 participants have had no stats for over 135 s and may be stale'
		);

		page.retry();
		await answer(http, harness, overview(), 'W/"two"');
		expect(element.querySelector('ovd-notice')).toBeNull();
	});

	it('reads the data pipeline without versions or retention', async () => {
		const { element } = await open();
		const pipeline = section(element, 'Data pipeline');
		const status = text(pipeline);

		expect(status).toMatch(/Last batch at \d\d:\d\d:\d\d/);
		expect(status).toContain('2 of 2 nodes reporting');
		expect(pipeline?.querySelectorAll('mat-icon.ok')).toHaveLength(2);
		expect(pipeline?.querySelector('mat-progress-bar')).toBeNull();
		expect(status).not.toContain('schema');
		expect(status).not.toContain('openvidu-livekit');
		expect(status).not.toContain('retention:');
		expect(status).not.toContain('migration');
		expect(pipeline?.querySelector('a')?.getAttribute('href')).toBe('/settings?tab=about');
	});

	it('shows the migration progress only while it runs', async () => {
		const { element } = await open(
			overview(),
			[],
			status({ migration: { state: 'running', progress: { processed: 400_000, total: 1_200_000 } } })
		);
		const pipeline = section(element, 'Data pipeline');

		expect(text(pipeline)).toContain('400,000 / 1,200,000 (33 %)');
		expect(pipeline?.querySelector('mat-progress-bar')).not.toBeNull();
	});

	it('waits for the first events on a fresh deployment without an error', async () => {
		const empty = overview({
			live: {
				...overview().live,
				rooms: 0,
				participants: 0,
				services: 0,
				publishers: 0,
				egresses: 0,
				ingressSessions: 0,
				participantsByKind: { STANDARD: 0, INGRESS: 0, EGRESS: 0, SIP: 0, AGENT: 0, CONNECTOR: 0, BRIDGE: 0 }
			},
			today: {
				...overview().today,
				rooms: 0,
				participantSessions: 0,
				participantMinutes: 0,
				egresses: 0,
				ingressSessions: 0
			},
			recentRooms: []
		});
		const { element } = await open(
			empty,
			[],
			status({ schema: { dashboard: 2, status: 'uninitialized' }, migration: { state: 'none' } }, null)
		);

		expect(text(element.querySelector('ovd-empty-state'))).toContain('Waiting for the first events');
		expect(
			[...element.querySelectorAll('.tiles ovd-kpi-tile')].map((tile) => text(tile).split(' ').at(-1))
		).toEqual(['0', '0', '0', '0', '0', '0']);
		expect(text(section(element, 'Data pipeline'))).toContain('Last batch: never');
		expect(text(section(element, 'Data pipeline'))).toContain('no node has reported yet');
		expect(text(section(element, 'Today'))).toContain('No rooms today yet');
		expect(section(element, 'Recent rooms')?.querySelectorAll('.links a')).toHaveLength(0);
		expect(element.querySelector('ovd-error-banner')).toBeNull();
	});

	it('keeps the values and shows the error of a failed poll', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });

		const { element, http, harness } = await open();

		await vi.advanceTimersByTimeAsync(10_500);
		await answer(http, harness, 'fail');

		expect(text(element.querySelector('.tiles ovd-kpi-tile'))).toContain('12');
		expect(text(element.querySelector('ovd-error-banner'))).toContain('req-9');
	});

	it('locks the per-node card on CE with the request of the overview only', async () => {
		const { element, http } = await open();

		expect(text(section(element, 'By node'))).toContain('Per-node breakdown is available in OpenVidu PRO');
		http.verify();
	});
});
