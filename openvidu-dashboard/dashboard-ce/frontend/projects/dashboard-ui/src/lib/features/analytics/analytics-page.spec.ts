import type { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
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
import { TimeSeriesChart } from '../../charts/time-series-chart/time-series-chart.js';
import { PreferencesService } from '../../core/preferences/preferences.js';
import { RefreshRegistry } from '../../core/refresh/refresh.js';
import { ToastService } from '../../core/ui/toast.js';
import { MEDIA_STATS_TEXTS } from '../../format/labels.js';
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

	it('leaves the PRO items out on CE and splits the hourly-only metrics and unique identities off', () => {
		const plan = analyticsPlan(state, new Set());

		expect(plan.series).toEqual([
			{
				metrics: [
					'roomsPeakActive',
					'roomsCreated',
					'participantsPeakActive',
					'participantsJoined',
					'connectionSuccessRate',
					'bytesUp',
					'bytesDown',
					'egressPeakActive',
					'egressStarted'
				],
				granularity: 'auto'
			},
			{ metrics: ['egressEnded', 'ingressPeakActive', 'ingressSessions'], granularity: '1h' },
			{ metrics: ['uniqueIdentities'], granularity: '1d' }
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

	it('asks for unique identities at one day whatever the page granularity', () => {
		const weekly = analyticsPlan(
			{ ...state, range: { ...state.range, from: 'now-7d' }, effective: '1h' },
			new Set()
		);

		expect(weekly.series.at(-1)).toEqual({ metrics: ['uniqueIdentities'], granularity: '1d' });
		expect(weekly.series[0]?.metrics).not.toContain('uniqueIdentities');
	});

	it('leaves egress and ingress out of a node scope', () => {
		const plan = analyticsPlan({ ...state, scope: 'node:mn-a' }, new Set(ALL_FEATURES));
		const metrics = plan.series.flatMap((request) => request.metrics);

		expect(metrics.filter((metric) => /^(egress|ingress)/.test(metric))).toEqual([]);
		expect(metrics).toEqual(expect.arrayContaining(['roomsPeakActive', 'participantsJoined', 'uniqueIdentities']));
		expect(plan.dimensions).not.toEqual(expect.arrayContaining(['egressType']));
		expect(plan.dimensions.filter((dimension) => /^(egress|ingress)/.test(dimension))).toEqual([]);
		expect(plan.dimensions).toContain('kind');
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

		expect(paths).toEqual([
			'api/v1/analytics/breakdowns',
			'api/v1/analytics/series',
			'api/v1/analytics/series',
			'api/v1/analytics/summary'
		]);

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
		expect(tips(card(element, 'Rooms'))).toEqual(['About Active rooms']);
		expect(tips(card(element, 'Participants'))).toEqual([
			'About Active participants',
			'About Participant sessions',
			'About Participant kind'
		]);
		expect(tips(card(element, 'Client breakdowns'))).toEqual(['About SDK']);
		expect(tips(card(element, 'Egress'))).toEqual(['About Active egress']);
		expect(tips(card(element, 'Ingress'))).toEqual(['About Active ingress']);
	});

	it('draws each section with its peak as an area beside its volume as bars, in its section colour', async () => {
		const { element, harness, requests } = await open('/analytics?from=now-24h&to=now&tz=UTC');
		const metrics = seriesRequests(requests).flatMap((request) => request.metrics);
		const charts = (harness.routeDebugElement?.queryAll(By.directive(TimeSeriesChart)) ?? []).map(
			(chart) => chart.componentInstance as TimeSeriesChart
		);
		const chart = (heading: string) => charts.find((item) => item.heading() === heading);
		const drawn = (heading: string) => {
			const item = chart(heading);

			return [item?.kind(), item?.series().map(({ name, entity }) => [name, entity])];
		};
		const rooms = card(element, 'Rooms');

		expect(metrics).toEqual(
			expect.arrayContaining([
				'roomsPeakActive',
				'roomsCreated',
				'participantsPeakActive',
				'participantsJoined',
				'egressPeakActive',
				'egressStarted',
				'ingressPeakActive',
				'ingressSessions'
			])
		);
		expect(metrics.filter((metric) => ['roomsEnded', 'participantsAborted'].includes(metric))).toEqual([]);
		expect([...(rooms?.querySelectorAll('ovd-kpi-tile') ?? [])].map(text)).toEqual([
			'Average room size 4 participants',
			'Average room duration 6 m 00 s'
		]);
		expect(drawn('Active rooms')).toEqual(['area', [['Active rooms', 'rooms']]]);
		expect(drawn('Rooms created')).toEqual(['bar', [['Rooms created', 'rooms']]]);
		expect(drawn('Active participants')).toEqual(['area', [['Active participants', 'participants']]]);
		expect(drawn('Participant sessions')).toEqual(['bar', [['Participant sessions', 'participants']]]);
		expect(drawn('Unique identities')).toEqual(['bar', [['Unique identities', 'participants']]]);
		expect(drawn('Connection success')).toEqual(['line', [['Connection success', 'success']]]);
		expect(chart('Connection success')?.fitted()).toBe(true);
		expect(drawn('Active egress')).toEqual(['area', [['Active egress', 'egress']]]);
		expect(drawn('Egress started')).toEqual(['bar', [['Egress started', 'egress']]]);
		expect(drawn('Active ingress')).toEqual(['area', [['Active ingress', 'ingress']]]);
		expect(drawn('Ingress sessions')).toEqual(['bar', [['Ingress sessions', 'ingress']]]);
	});

	it('lays out each card in a chart grid that starts with its peak and volume pair', async () => {
		const { element } = await open('/analytics?from=now-24h&to=now&tz=UTC');
		const grid = (heading: string) =>
			[...(card(element, heading)?.querySelector('ovd-chart-grid')?.children ?? [])].map((chart) =>
				text(chart.querySelector('.chart-title'))
			);

		expect(grid('Rooms')).toEqual(['Active rooms', 'Rooms created']);
		expect(grid('Participants')).toEqual([
			'Active participants',
			'Participant sessions',
			'Connection success',
			'Participant kind',
			'Unique identities'
		]);
		expect(grid('Client breakdowns')).toEqual(['SDK', 'OS', 'Browser', 'Connection type']);
		expect(grid('Egress')).toEqual(['Active egress', 'Egress started', 'Egress ended by status', 'Egress type']);
		expect(grid('Ingress')).toEqual(['Active ingress', 'Ingress sessions', 'Ingress input type']);
		expect(element.querySelector('.identities-hint')).toBeNull();
	});

	it('keeps the Rooms card of a range sampled only in part, with a gap where no sample exists', async () => {
		const points: [string, number | null][] = [
			['2026-10-13T09:00:00.000Z', null],
			['2026-10-13T10:00:00.000Z', null],
			['2026-10-13T11:00:00.000Z', 0]
		];
		const { element, harness } = await open('/analytics?from=now-7d&to=now&tz=UTC', [], {
			points: { roomsPeakActive: points },
			summary: { ...SUMMARY, roomsCreated: 40 }
		});
		const rooms = card(element, 'Rooms');
		const page = harness.routeDebugElement?.componentInstance as {
			chart(metrics: string[]): { points: [string, number | null][] }[];
		};

		expect(rooms?.querySelector('ovd-empty-state')).toBeNull();
		expect(rooms?.querySelector('ovd-time-series-chart')).not.toBeNull();
		expect(rooms?.querySelectorAll('ovd-kpi-tile')).toHaveLength(2);
		expect(page.chart(['roomsPeakActive'])[0]?.points).toEqual(points);
	});

	it('shows the Rooms card empty only without active rooms and without rooms created', async () => {
		const { element } = await open('/analytics?from=now-7d&to=now&tz=UTC', [], {
			points: {
				roomsPeakActive: [
					['2026-10-13T10:00:00.000Z', null],
					['2026-10-13T11:00:00.000Z', 0]
				],
				roomsCreated: [
					['2026-10-13T10:00:00.000Z', 0],
					['2026-10-13T11:00:00.000Z', 0]
				]
			},
			summary: { ...SUMMARY, roomsCreated: 0 }
		});
		const rooms = card(element, 'Rooms');

		expect(text(rooms?.querySelector('ovd-empty-state'))).toContain('No data in this range');
		expect(text(rooms)).toContain('Widen range');
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
			{ metrics: ['egressEnded', 'ingressPeakActive', 'ingressSessions'], granularity: '1h' },
			{ metrics: ['uniqueIdentities'], granularity: '1d' }
		]);
		expect(seriesRequests(requests)[0]?.metrics).not.toContain('egressEnded');
		const notes = (heading: string) =>
			[...(card(element, heading)?.querySelectorAll('.chart-heading + .chart-note') ?? [])].map(text);

		expect(notes('Egress')).toEqual(['Five-minute buckets · UTC', 'Five-minute buckets · UTC', 'Hourly · UTC']);
		expect(notes('Ingress')).toEqual(['Hourly · UTC', 'Hourly · UTC']);
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
		expect(dimensionLabel('browser', 'chrome')).toBe('Chrome');
		expect(dimensionLabel('browser', 'none')).toBe('No browser');
		expect(dimensionLabel('browser', 'other')).toBe('Other');
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

	it('says no room ended in the range when the room averages are missing for that reason', async () => {
		const { avgRoomSize: _size, avgRoomDurationMs: _duration, ...withoutAverages } = SUMMARY;
		const { element } = await open('/analytics?from=now-7d&to=now&tz=UTC', [], {
			summary: { ...withoutAverages, roomsCreated: 2, roomsEnded: 0 }
		});
		const tiles = [...(card(element, 'Rooms')?.querySelectorAll('ovd-kpi-tile') ?? [])].map(text);

		expect(tiles).toHaveLength(2);

		for (const tile of tiles) {
			expect(tile).toContain('n/a');
			expect(tile).toContain('No room ended in this range');
		}
	});

	it('keeps the Data transferred section unavailable with a warning when no server reports media statistics', async () => {
		const { element } = await open('/analytics?from=now-7d&to=now&tz=UTC', [], {
			summary: { ...SUMMARY, mediaStats: 'none', bytesUp: 0, bytesDown: 0 }
		});
		const tile = element.querySelectorAll('.tiles ovd-kpi-tile')[3];
		const bandwidth = card(element, 'Data transferred');

		expect(tile?.querySelector('.value.unavailable')).not.toBeNull();
		expect(tile?.querySelector('ovd-media-stats-warning button')?.getAttribute('aria-label')).toBe(
			MEDIA_STATS_TEXTS.rangeNone
		);
		expect(bandwidth?.querySelector('.heading-row ovd-media-stats-warning')).not.toBeNull();
		expect(bandwidth?.querySelector('ovd-notice')).toBeNull();
		expect(bandwidth?.querySelectorAll('ovd-kpi-tile .value.unavailable')).toHaveLength(2);
		expect(bandwidth?.querySelector('ovd-time-series-chart .chart.unavailable')).not.toBeNull();
		expect(text(bandwidth?.querySelector('ovd-time-series-chart'))).not.toContain('Show table');
	});

	it('warns that the data covers only some servers when the others report no media statistics', async () => {
		const { element } = await open('/analytics?from=now-7d&to=now&tz=UTC', [], {
			summary: { ...SUMMARY, mediaStats: 'partial' }
		});
		const tile = element.querySelectorAll('.tiles ovd-kpi-tile')[3];
		const bandwidth = card(element, 'Data transferred');

		expect(text(tile)).toContain('↑ 1.2 TB');
		expect(tile?.querySelector('ovd-media-stats-warning button')?.getAttribute('aria-label')).toBe(
			MEDIA_STATS_TEXTS.rangePartial
		);
		expect(
			bandwidth?.querySelector('.heading-row ovd-media-stats-warning button')?.getAttribute('aria-label')
		).toBe(MEDIA_STATS_TEXTS.rangePartial);
		expect(bandwidth?.querySelector('.unavailable')).toBeNull();
		expect(bandwidth?.querySelector('ovd-time-series-chart')).not.toBeNull();
	});

	it('shows no media statistics warning when every server reports them', async () => {
		const { element } = await open('/analytics?from=now-7d&to=now&tz=UTC');
		const bandwidth = card(element, 'Data transferred');

		expect(element.querySelector('.tiles ovd-media-stats-warning')).toBeNull();
		expect(bandwidth?.querySelector('ovd-media-stats-warning')).toBeNull();
		expect(bandwidth?.querySelector('.unavailable')).toBeNull();
	});

	it('explains Total up, Total down and the Data up / down chart, not the Data transferred heading', async () => {
		const { element } = await open('/analytics?from=now-7d&to=now&tz=UTC');
		const bandwidth = card(element, 'Data transferred');
		const tip = (root: Element | null | undefined) =>
			root?.querySelector('ovd-info-tip button')?.getAttribute('aria-label') ?? null;

		expect([...(bandwidth?.querySelectorAll('ovd-kpi-tile') ?? [])].map(tip)).toEqual([
			'About Total up',
			'About Total down'
		]);
		expect(tip(bandwidth?.querySelector('ovd-time-series-chart'))).toBe('About Data up / down');
		expect(bandwidth?.querySelector('.heading-row ovd-info-tip')).toBeNull();
	});

	it('draws unique identities per UTC day at every granularity', async () => {
		const weekly = await open('/analytics?from=now-7d&to=now&tz=UTC');
		const requests = seriesRequests(weekly.requests);
		const identities = [
			...(card(weekly.element, 'Participants')?.querySelectorAll('ovd-time-series-chart') ?? [])
		].find((chart) => text(chart.querySelector('.chart-title')) === 'Unique identities');

		expect(requests[0]?.metrics).not.toContain('uniqueIdentities');
		expect(requests).toContainEqual({ metrics: ['uniqueIdentities'], granularity: '1d' });
		expect(text(identities?.querySelector('.chart-heading + .chart-note'))).toBe('per UTC day');
		expect(text(card(weekly.element, 'Participants'))).not.toContain('Switch to 1 d');

		await TestBed.inject(Router).navigateByUrl('/analytics?from=now-7d&to=now&tz=UTC&granularity=1d');

		const daily = seriesRequests(await refresh(weekly.http, weekly.harness));

		expect(daily[0]?.metrics).toContain('uniqueIdentities');
		expect(daily.filter((request) => request.granularity === '1d')).toHaveLength(1);
	});

	it('shows egress and ingress unavailable in a node scope, with a warning and without requests', async () => {
		const { element, requests, http, harness } = await open(
			'/analytics?from=now-24h&to=now&tz=UTC&scope=node:media-node-10-0-0-2',
			['per-node-breakdown']
		);
		const tile = (label: string) =>
			[...element.querySelectorAll('.tiles ovd-kpi-tile')].find((item) => text(item).startsWith(label));
		const metrics = seriesRequests(requests).flatMap((request) => request.metrics);
		const dimensions = requests
			.find((request) => request.request.url.endsWith('breakdowns'))
			?.request.params.get('dimensions');

		expect(metrics.filter((metric) => /^(egress|ingress)/.test(metric))).toEqual([]);
		expect(dimensions).not.toMatch(/egress|ingress/);

		for (const heading of ['Egress', 'Ingress']) {
			const section = card(element, heading);
			const exportButton = [...(section?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find((button) =>
				text(button).includes('Export CSV')
			);

			expect(section?.querySelector('ovd-empty-state')).toBeNull();
			expect(section?.querySelector('ovd-media-stats-warning')).not.toBeNull();
			expect(section?.querySelectorAll('.chart.unavailable').length).toBe(heading === 'Egress' ? 4 : 3);
			expect(
				section?.querySelectorAll('ovd-kpi-tile.unavailable, ovd-kpi-tile .unavailable').length
			).toBeGreaterThan(0);
			expect(exportButton?.disabled).toBe(true);
			expect(tile(heading)?.querySelector('ovd-media-stats-warning')).not.toBeNull();
		}

		const page = harness.routeDebugElement?.componentInstance as { entries(dimension: string): { name: string }[] };

		expect(page.entries('kind').map((entry) => entry.name)).toContain('Egress');
		expect(card(element, 'Participants')?.querySelector('.chart.unavailable')).toBeNull();

		await TestBed.inject(Router).navigateByUrl('/analytics?from=now-24h&to=now&tz=UTC');
		const global = await refresh(http, harness);

		expect(seriesRequests(global).flatMap((request) => request.metrics)).toEqual(
			expect.arrayContaining(['egressPeakActive', 'ingressSessions'])
		);
	});

	it('names a node scope in the title by its media node label', async () => {
		const { element } = await open('/analytics?from=now-24h&to=now&tz=UTC&scope=node:media-node-10-0-1-23', [
			'per-node-breakdown'
		]);

		expect(text(element.querySelector('h1'))).toBe('Analytics · media-node-10-0-1-23');
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
		// Nothing per node on CE: no scope selector, lock or text about nodes.
		expect(element.querySelector('.scope-select')).toBeNull();
		expect(text(element.querySelector('.page-header'))).not.toContain('All nodes');
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

	it('exports the series of the charts in the CSV of each entity card', async () => {
		const { element, http } = await open('/analytics?from=now-7d&to=now&tz=UTC&granularity=1d');

		URL.createObjectURL = vi.fn(() => 'blob:csv');
		URL.revokeObjectURL = vi.fn();
		vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

		const exported = async (heading: string) => {
			[...(card(element, heading)?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
				.find((button) => text(button).includes('Export CSV'))
				?.click();

			const download = http.expectOne((req) => req.url === 'api/v1/analytics/export.csv');
			const metrics = download.request.params.get('metrics');

			download.flush(new Blob(['bucket\r\n']));
			await settle();

			return metrics;
		};

		expect(await exported('Rooms')).toBe('roomsPeakActive,roomsCreated');
		expect(await exported('Participants')).toBe(
			'participantsPeakActive,participantsJoined,connectionSuccessRate,uniqueIdentities'
		);
		expect(await exported('Egress')).toBe('egressPeakActive,egressStarted,egressEnded');
		expect(await exported('Ingress')).toBe('ingressPeakActive,ingressSessions');
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
