import type { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { RouterTestingHarness } from '@angular/router/testing';
import { FeatureKey, type InfoRetention } from '@openvidu-dashboard/typings';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	ANALYTICS_RETENTION,
	ANALYTICS_SUMMARY as SUMMARY,
	type AnalyticsAnswers,
	analyticsCard as card,
	analyticsText as text,
	answerAnalytics as answer,
	openAnalytics,
	refreshAnalytics,
	seriesRequests
} from '../../../testing/analytics.js';
import { settle } from '../../../testing/fixtures.js';
import { PreferencesService } from '../../core/preferences.js';
import { RefreshRegistry } from '../../core/refresh.js';
import { ToastService } from '../../core/toast.js';
import { analyticsPlan } from './analytics-data.js';
import { autoGranularity, granularityOptions } from './analytics-granularity.js';
import { dimensionLabel } from './analytics-page.js';

const DAY = 86_400_000;
const RETENTION = ANALYTICS_RETENTION;
const ALL_FEATURES = Object.values(FeatureKey);

function open(
	url: string,
	features: string[] = [],
	answers: AnalyticsAnswers = {},
	retention: InfoRetention = RETENTION
) {
	return openAnalytics(url, { features, answers, retention });
}

function refresh(http: HttpTestingController, harness: RouterTestingHarness, answers: AnalyticsAnswers = {}) {
	return refreshAnalytics(http, harness, answers);
}

describe('analytics granularity', () => {
	const now = new Date('2026-10-13T12:00:00Z');
	const context = (from: number, to: number) => ({
		from: new Date(now.getTime() - from),
		to: new Date(now.getTime() - to),
		now,
		rollups5MinRetentionMs: 7 * DAY
	});

	it('offers what the API accepts for a seven-day range and for an old day', () => {
		expect(granularityOptions(context(7 * DAY, 0))).toEqual(['1h', '6h', '1d']);
		expect(granularityOptions(context(31 * DAY, 30 * DAY))).toEqual(['1h', '6h', '1d']);
		expect(granularityOptions(context(DAY, 0))).toEqual(['5m', '15m', '1h', '6h', '1d']);
		expect(granularityOptions(context(90 * DAY, 0))).toEqual(['6h', '1d']);
	});

	it('offers sub-hour values only inside the 5-minute rollup retention', () => {
		const shortRollups = { ...context(4 * DAY, 3 * DAY), rollups5MinRetentionMs: 2 * DAY };

		expect(autoGranularity(shortRollups)).toBe('1h');
		expect(granularityOptions(shortRollups)).toEqual(['1h', '6h', '1d']);
	});
});

describe('analytics plan', () => {
	const state = {
		range: { from: 'now-24h', to: 'now', tz: 'UTC' },
		granularity: 'auto' as const,
		effective: '5m' as const,
		scope: 'global' as const
	};

	it('leaves the PRO items out on CE and splits the hourly-only metrics below an hour', () => {
		const plan = analyticsPlan(state, new Set());

		expect(plan.series).toEqual([
			{
				metrics: [
					'roomsCreated',
					'roomsEnded',
					'participantsJoined',
					'participantsAborted',
					'connectionSuccessRate',
					'bytesUp',
					'bytesDown',
					'egressStarted'
				],
				granularity: 'auto'
			},
			{ metrics: ['egressEnded', 'ingressSessions'], granularity: '1h' }
		]);
		expect(plan.dimensions).toEqual([
			'kind',
			'sdk',
			'os',
			'browser',
			'connectionType',
			'egressType',
			'ingressInputType'
		]);
	});

	it('adds the items of the PRO cards while their feature is enabled, unique identities at one day', () => {
		const cards = [
			{
				loadComponent: () => Promise.reject(new Error('unused')),
				metrics: ['scoreAvg', 'tracksSubscribeFailed']
			},
			{ loadComponent: () => Promise.reject(new Error('unused')), dimensions: ['apiMethod'] }
		] as const;
		const daily = { ...state, granularity: '1d', effective: '1d' } as const;
		const enabled = analyticsPlan(daily, new Set(ALL_FEATURES), cards);
		const locked = analyticsPlan(daily, new Set(), cards);

		expect(enabled.series).toHaveLength(1);
		expect(enabled.series[0]?.metrics).toEqual(
			expect.arrayContaining(['uniqueIdentities', 'scoreAvg', 'tracksSubscribeFailed', 'ingressSessions'])
		);
		expect(enabled.dimensions).toContain('apiMethod');
		expect(locked.series[0]?.metrics).not.toContain('scoreAvg');
		expect(locked.dimensions).not.toContain('apiMethod');
	});
});

describe('AnalyticsPage', () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('reproduces a deep link in every request and in the granularity selector', async () => {
		const { requests, element } = await open('/analytics?from=now-7d&to=now&tz=UTC&granularity=1h');
		const paths = requests.map((request) => request.request.url).sort();

		expect(paths).toEqual(['api/v1/analytics/breakdowns', 'api/v1/analytics/series', 'api/v1/analytics/summary']);

		for (const request of requests) {
			expect(request.request.params.get('tz')).toBe('UTC');
			expect(
				Date.parse(request.request.params.get('to') ?? '') -
					Date.parse(request.request.params.get('from') ?? '')
			).toBe(7 * DAY);
		}

		expect(seriesRequests(requests)[0]?.granularity).toBe('1h');
		expect(text(element.querySelector('.granularity-select .mat-mdc-select-value'))).toBe('1 h');
	});

	it('explains the summary tiles and the participant charts with info tips', async () => {
		const { element } = await open('/analytics?from=now-7d&to=now&tz=UTC&granularity=1d');
		const tips = (root: Element | null | undefined): (string | null)[] =>
			[...(root?.querySelectorAll('ovd-info-tip button') ?? [])].map((button) =>
				button.getAttribute('aria-label')
			);

		expect(tips(element.querySelector('.tiles'))).toEqual([
			'About Participant sessions',
			expect.stringMatching(/^About Unique identities/),
			'About Data up / down',
			'About Connection success'
		]);
		expect(tips(card(element, 'Participants'))).toEqual(['About Participant sessions', 'About Participant kind']);
		expect(tips(card(element, 'Client breakdowns'))).toEqual(['About SDK']);
	});

	it('shows an empty card only as tall as its message', async () => {
		const { element } = await open('/analytics?from=now-7d&to=now&tz=UTC', [], { empty: true });
		const empty = card(element, 'Egress')?.querySelector<HTMLElement>('ovd-empty-state');

		expect(text(empty)).toContain('No data in this range');
		expect(empty?.style.minHeight).toBe('');
		expect(card(element, 'Egress')?.querySelector('ovd-time-series-chart')).toBeNull();
	});

	it('drops a node scope on CE and asks for the global scope', async () => {
		const { requests } = await open('/analytics?scope=node:n1&from=now-24h&to=now&tz=UTC');

		await settle();
		expect(TestBed.inject(Router).url).not.toContain('scope');
		expect(requests.every((request) => !request.request.params.has('scope'))).toBe(true);
	});

	it('reads the 5-minute rollup retention, not the stats one, to resolve auto', async () => {
		const from = new Date(Date.now() - 4 * DAY).toISOString();
		const to = new Date(Date.now() - 3 * DAY).toISOString();
		const { element } = await open(
			`/analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&tz=UTC`,
			[],
			{},
			{ ...RETENTION, statsMs: 7 * DAY, rollups5MinMs: 2 * DAY }
		);

		expect(text(element.querySelector('.granularity-select .mat-mdc-select-value'))).toBe('auto (1 h)');
	});

	it('labels auto with its effective value and asks for hourly-only metrics at one hour', async () => {
		const { requests, element } = await open('/analytics?from=now-24h&to=now&tz=UTC');

		expect(text(element.querySelector('.granularity-select .mat-mdc-select-value'))).toBe('auto (5 min)');
		expect(seriesRequests(requests)).toEqual([
			expect.objectContaining({ granularity: 'auto' }),
			{ metrics: ['egressEnded', 'ingressSessions'], granularity: '1h' }
		]);
		expect(seriesRequests(requests)[0]?.metrics).not.toContain('egressEnded');
		const notes = [...(card(element, 'Egress')?.querySelectorAll('.chart-heading + .chart-note') ?? [])].map(text);

		expect(notes).toEqual(['Five-minute buckets · UTC', 'Hourly · UTC']);
		expect(card(element, 'Egress')?.querySelector('p.note')).toBeNull();
		expect(text(card(element, 'Rooms')?.querySelector('.chart-note'))).toBe('Five-minute buckets · UTC');
		expect([...(card(element, 'Egress')?.querySelectorAll('.chart-title') ?? [])].map(text)).not.toContain(
			'Egress duration'
		);
	});

	it('keeps naming what auto resolves to while an explicit value is selected', async () => {
		const { element } = await open('/analytics?from=now-7d&to=now&tz=UTC&granularity=1d');

		expect(text(element.querySelector('.granularity-select .mat-mdc-select-value'))).toBe('1 d');
		element.querySelector<HTMLElement>('.granularity-select .mat-mdc-select-trigger')?.click();
		await settle();
		expect(text(document.querySelector('mat-option'))).toBe('auto (1 h)');
	});

	it('fills the tiles from the summary and marks what the server does not provide', async () => {
		const { element } = await open('/analytics?from=now-7d&to=now&tz=UTC');
		const tiles = [...element.querySelectorAll('.tiles ovd-kpi-tile')].map(text);
		const labels = [...element.querySelectorAll('.tiles ovd-kpi-tile .label')].map(text);

		expect(labels.map((label) => label.split(' (')[0])).toEqual([
			'Rooms created',
			'Participant sessions',
			'Unique identities',
			'Data up / down',
			'Connection success',
			'Egress',
			'Ingress'
		]);
		expect(tiles[0]).toContain('1,203');
		expect(tiles[2]).toContain('Unique identities (sum of 7 UTC days)');
		expect(tiles[2]).toContain('4,120');
		expect(tiles[3]).toContain('↑ 1.2 TB');
		expect(tiles[5]).toContain('2 h 00 m in total');
		expect(tiles[6]).toContain('30');
		expect(tiles[6]).toContain('1 h 30 m in total');
		expect(tiles.join(' ')).not.toContain('API error rate');
		expect(text(card(element, 'Rooms'))).toContain('4 participants');
		expect(text(card(element, 'Rooms'))).not.toContain('4.4');
		expect(text(card(element, 'Rooms'))).toContain('6 m 00 s');
		expect([...(card(element, 'Egress')?.querySelectorAll('ovd-kpi-tile') ?? [])].map(text)).toEqual([
			'Total egress 12',
			'Total duration 2 h 00 m'
		]);
		expect([...(card(element, 'Ingress')?.querySelectorAll('ovd-kpi-tile') ?? [])].map(text)).toEqual([
			'Total sessions 30',
			'Total duration 1 h 30 m'
		]);
	});

	it('gives each egress end status its own colour slot, apart from aborted participants', async () => {
		const { harness } = await open('/analytics?from=now-24h&to=now&tz=UTC');
		const page = harness.routeDebugElement?.componentInstance as {
			chart(metrics: string[]): { name: string; entity?: string }[];
		};

		expect(page.chart(['egressEnded']).map(({ name, entity }) => [name, entity])).toEqual([
			['complete', 'egress_complete'],
			['failed', 'egress_failed']
		]);
	});

	it('labels the participant kinds and leaves the unused ones out', async () => {
		const { harness } = await open('/analytics?from=now-7d&to=now&tz=UTC');
		const page = harness.routeDebugElement?.componentInstance as {
			entries(dimension: string): { name: string; value: number }[];
		};

		expect(page.entries('kind')).toEqual([
			{ name: 'Standard', value: 700, entity: 'STANDARD' },
			{ name: 'Egress', value: 40, entity: 'EGRESS' }
		]);
	});

	it('labels the dimension keys case-insensitively and keeps unknown keys as stored', () => {
		expect(dimensionLabel('sdk', 'js')).toBe('JavaScript');
		expect(dimensionLabel('connectionType', 'turn')).toBe('TURN');
		expect(dimensionLabel('connectionType', 'quic')).toBe('quic');
		expect(dimensionLabel('ingressInputType', 'whip')).toBe('WHIP');
		expect(dimensionLabel('browser', 'chrome')).toBe('chrome');
	});

	it('shows the Ingress section in CE, after Egress and right before the Quality card, with no divider', async () => {
		const { element, requests } = await open('/analytics?from=now-7d&to=now&tz=UTC');
		const headings = [...element.querySelectorAll('.sections > ovd-analytics-card h2')].map((node) =>
			text(node).replace(/\s*\(.*\)$/, '')
		);

		expect(headings.slice(headings.indexOf('Egress'), headings.indexOf('Egress') + 3)).toEqual([
			'Egress',
			'Ingress',
			'Quality'
		]);
		expect(element.querySelector('[role="separator"]')).toBeNull();
		expect(card(element, 'Ingress')?.querySelector('ovd-pro-lock-overlay')).toBeNull();
		expect(seriesRequests(requests).flatMap((request) => request.metrics)).toContain('ingressSessions');
		expect(
			requests
				.find((request) => request.request.url === 'api/v1/analytics/breakdowns')
				?.request.params.get('dimensions')
		).toContain('ingressInputType');
	});

	it('keeps the content of a card under the error notice when its refresh fails', async () => {
		const { element, http, harness } = await open('/analytics?from=now-7d&to=now&tz=UTC');

		void TestBed.inject(RefreshRegistry).active()?.refresh();
		await refresh(http, harness, { fail: ['series'] });

		const rooms = card(element, 'Rooms');

		expect(rooms?.querySelector('ovd-error-banner')).not.toBeNull();
		expect(rooms?.querySelector('ovd-time-series-chart')).not.toBeNull();
		expect(rooms?.querySelector('ovd-skeleton')).toBeNull();
	});

	it('reads n/a with a hint for a value the summary omits', async () => {
		const { avgRoomSize: _size, ...withoutSize } = SUMMARY;
		const { element } = await open('/analytics?from=now-7d&to=now&tz=UTC', [], { summary: withoutSize });
		const size = [...(card(element, 'Rooms')?.querySelectorAll('ovd-kpi-tile') ?? [])].map(text)[0];

		expect(size).toContain('n/a');
		expect(size).toContain('Not provided by this server version');
	});

	it('hides unique identities below a day and shows them per UTC day at one day', async () => {
		const weekly = await open('/analytics?from=now-7d&to=now&tz=UTC');

		expect(seriesRequests(weekly.requests).flatMap((request) => request.metrics)).not.toContain('uniqueIdentities');
		expect(text(card(weekly.element, 'Participants'))).toContain(
			'Unique identities are available at daily granularity'
		);
		expect(text(card(weekly.element, 'Participants'))).toContain('Switch to 1 d');

		weekly.element.querySelector<HTMLButtonElement>('.identities-hint button')?.click();
		await settle();
		expect(TestBed.inject(Router).url).toContain('granularity=1d');

		const daily = await refresh(weekly.http, weekly.harness);

		expect(seriesRequests(daily)[0]?.metrics).toContain('uniqueIdentities');

		const identities = [
			...(card(weekly.element, 'Participants')?.querySelectorAll('ovd-time-series-chart') ?? [])
		].find((chart) => text(chart.querySelector('.chart-title')) === 'Unique identities');

		expect(text(identities?.querySelector('.chart-heading + .chart-note'))).toBe('per UTC day');
	});

	it('locks the PRO strip on CE without any PRO request', async () => {
		const { requests, element, http } = await open('/analytics?from=now-24h&to=now&tz=UTC');
		const locks = [...element.querySelectorAll('ovd-pro-lock-overlay')].map(text);

		expect(locks).toHaveLength(3);
		expect(locks.map((lock) => lock.split(' is available')[0])).toEqual([
			'Quality analytics',
			'Diagnostics',
			'Top rooms'
		]);
		expect(requests.map((request) => request.request.url)).not.toContain('api/v1/analytics/top');
		expect(requests.map((request) => request.request.url)).not.toContain('api/v1/analytics/scopes');
		expect(seriesRequests(requests).flatMap((request) => request.metrics)).not.toContain('scoreAvg');
		expect(element.querySelector('.scope-select mat-select')?.getAttribute('aria-disabled')).toBe('true');
		expect(text(element.querySelector('.scope-select .mat-mdc-select-value'))).toBe('All nodes');
		expect(element.querySelector('.scope-select .lock')?.getAttribute('aria-label')).toBe(
			'Per-node analytics is available in OpenVidu PRO'
		);
		expect(card(element, 'By node')).toBeUndefined();
		http.verify();
	});

	it('shows the error of a failed request in its cards only', async () => {
		const { element } = await open('/analytics?from=now-24h&to=now&tz=UTC', [], { fail: ['breakdowns'] });
		const clients = card(element, 'Client breakdowns');

		expect(clients?.querySelector('ovd-error-banner')).not.toBeNull();
		expect(text(clients)).toContain('Retry');
		expect(text(clients)).toContain('req-42');
		expect(card(element, 'Rooms')?.querySelector('ovd-error-banner')).toBeNull();
		expect(card(element, 'Rooms')?.querySelector('ovd-time-series-chart')).not.toBeNull();
	});

	it('downloads the CSV of a card under the server name and toasts a failure', async () => {
		const { element, http } = await open('/analytics?from=now-7d&to=now&tz=UTC');
		const saved: string[] = [];

		URL.createObjectURL = vi.fn(() => 'blob:csv');
		URL.revokeObjectURL = vi.fn();
		vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
			saved.push(this.download);
		});

		const exportButton = () =>
			[...(card(element, 'Data transferred')?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find(
				(button) => text(button).includes('Export CSV')
			);

		exportButton()?.click();

		const download = http.expectOne((req) => req.url === 'api/v1/analytics/export.csv');

		expect(download.request.params.get('kind')).toBe('series');
		expect(download.request.params.get('metrics')).toBe('bytesUp,bytesDown');
		download.flush(new Blob(['bucket\r\n']), {
			headers: { 'Content-Disposition': 'attachment; filename=analytics-series-a-b.csv' }
		});
		await settle();
		expect(saved).toEqual(['analytics-series-a-b.csv']);

		const toast = vi.spyOn(TestBed.inject(ToastService), 'show');

		exportButton()?.click();
		http.expectOne((req) => req.url === 'api/v1/analytics/export.csv').flush(
			new Blob([JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'boom' } })]),
			{ status: 500, statusText: 'Server Error', headers: { 'X-Request-Id': 'req-7' } }
		);
		await settle();
		await settle();
		expect(toast).toHaveBeenCalledWith(expect.stringContaining('req-7'));
		expect(exportButton()?.disabled).toBe(false);
	});

	it('never refreshes by itself and reloads on the manual refresh', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });

		const relative = await open('/analytics?from=now-24h&to=now&tz=UTC');
		const scheduler = TestBed.inject(RefreshRegistry).active();

		TestBed.inject(PreferencesService).setRefreshInterval('live', 10_000);
		await vi.advanceTimersByTimeAsync(25_000);
		expect(answer(relative.http)).toHaveLength(0);
		expect(scheduler?.manual).toBe(true);
		expect(scheduler?.interval()).toBe(0);

		void scheduler?.refresh();
		expect((await refresh(relative.http, relative.harness)).length).toBeGreaterThan(0);
	});
});
