import { type HttpParams, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, type TestRequest } from '@angular/common/http/testing';
import { Component, type Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { AnalyticsSummary, InfoRetention } from '@openvidu-dashboard/typings';
import { NGX_ECHARTS_CONFIG } from 'ngx-echarts';

import { BreakdownChart } from '../lib/charts/breakdown-chart.js';
import { TimeSeriesChart } from '../lib/charts/time-series-chart/time-series-chart.js';
import { InfoService } from '../lib/core/info.js';
import { AnalyticsPage } from '../lib/features/analytics/analytics-page.js';
import { infoResponse, settle } from './fixtures.js';
import { routeElement } from './harness.js';

@Component({ selector: 'ovd-blank', template: '' })
class Blank {}

const NEVER_LOADED = { provide: NGX_ECHARTS_CONFIG, useValue: { echarts: () => new Promise(() => undefined) } };
const DAY = 86_400_000;

export const ANALYTICS_RETENTION: InfoRetention = {
	eventsMs: 7 * DAY,
	statsMs: 7 * DAY,
	tracksMs: 7 * DAY,
	entitiesMs: 90 * DAY,
	rollups5MinMs: 7 * DAY,
	rollupsHourlyMs: 400 * DAY,
	rollupsDailyMs: null
};

export const ANALYTICS_SUMMARY: AnalyticsSummary = {
	from: '2026-10-06T12:00:00.000Z',
	to: '2026-10-13T12:00:00.000Z',
	scope: 'global',
	roomsCreated: 1203,
	roomsEnded: 1100,
	participantSessions: 9000,
	uniqueIdentities: { value: 4120, basis: 'utcDays', days: 7 },
	connectionSuccessRate: 97.8,
	avgRoomSize: 4.4,
	avgRoomDurationMs: 360_000,
	bytesUp: 1_200_000_000_000,
	bytesDown: 300_000_000_000,
	egressStarted: 12,
	egressDurationMs: 7_200_000,
	ingressSessions: 30,
	ingressDurationMs: 5_400_000,
	apiCalls: 5000,
	apiErrorRate: 1
};

export interface AnalyticsAnswers {
	summary?: AnalyticsSummary;
	/** Paths under `analytics/` that answer `500` with a request id. */
	fail?: string[];
	/** Every series and breakdown answers without points or items. */
	empty?: boolean;
	/** Bodies of the other paths under `analytics/`, such as the PRO ones. */
	routes?: Record<string, (params: HttpParams) => unknown>;
}

function seriesBody(params: HttpParams) {
	const metrics = (params.get('metrics') ?? '').split(',');
	const points: [string, number][] = [
		['2026-10-13T10:00:00.000Z', 3],
		['2026-10-13T11:00:00.000Z', 5]
	];

	return {
		granularity: params.get('granularity') === 'auto' ? '1h' : params.get('granularity'),
		from: params.get('from'),
		to: params.get('to'),
		scope: params.get('scope') ?? 'global',
		series: metrics.flatMap((name) =>
			name === 'egressEnded'
				? [
						{ name: 'egressEnded.complete', points },
						{ name: 'egressEnded.failed', points }
					]
				: [{ name, points }]
		)
	};
}

function breakdownsBody(params: HttpParams) {
	return {
		from: params.get('from'),
		to: params.get('to'),
		scope: 'global',
		breakdowns: (params.get('dimensions') ?? '').split(',').map((dimension) => ({
			dimension,
			total: 750,
			items:
				dimension === 'kind'
					? [
							{ key: 'STANDARD', count: 700, percent: 93.3 },
							{ key: 'EGRESS', count: 40, percent: 5.3 },
							{ key: 'SIP', count: 10, percent: 1.3 }
						]
					: [
							{ key: 'CLIENT_INITIATED', count: 700, percent: 93.3, errors: 7 },
							{ key: 'SIGNAL_CLOSE', count: 50, percent: 6.7, errors: 0 }
						]
		}))
	};
}

/** Answers every pending analytics request but the CSV export. */
export function answerAnalytics(http: HttpTestingController, answers: AnalyticsAnswers = {}): TestRequest[] {
	const requests = http.match((req) => req.url.startsWith('api/v1/analytics/') && !req.url.endsWith('export.csv'));

	for (const request of requests) {
		const path = request.request.url.slice('api/v1/analytics/'.length);
		const params = request.request.params;

		if (answers.fail?.includes(path)) {
			request.flush(
				{ error: { code: 'INTERNAL_ERROR', message: 'boom' } },
				{ status: 500, statusText: 'Server Error', headers: { 'X-Request-Id': 'req-42' } }
			);
			continue;
		}

		switch (path) {
			case 'summary':
				request.flush(answers.summary ?? ANALYTICS_SUMMARY);
				break;
			case 'series': {
				const body = seriesBody(params);

				request.flush(
					answers.empty ? { ...body, series: body.series.map((series) => ({ ...series, points: [] })) } : body
				);
				break;
			}
			case 'breakdowns': {
				const body = breakdownsBody(params);

				request.flush(
					answers.empty
						? {
								...body,
								breakdowns: body.breakdowns.map((breakdown) => ({ ...breakdown, total: 0, items: [] }))
							}
						: body
				);
				break;
			}
			default: {
				const route = answers.routes?.[path];

				if (route === undefined) {
					throw new Error(`No answer for analytics/${path}`);
				}

				request.flush(route(params) as object);
			}
		}
	}

	return requests;
}

/** Lets the pending requests start, answers them and renders the result. */
export async function refreshAnalytics(
	http: HttpTestingController,
	harness: RouterTestingHarness,
	answers: AnalyticsAnswers = {}
): Promise<TestRequest[]> {
	await settle();

	const requests = answerAnalytics(http, answers);

	await settle();
	await harness.fixture.whenStable();

	return requests;
}

/** Opens the Analytics page at `url` with `features`, after `providers`, and answers its first refresh. */
export async function openAnalytics(
	url: string,
	options: {
		features?: string[];
		answers?: AnalyticsAnswers;
		retention?: InfoRetention;
		providers?: Provider[];
	} = {}
) {
	TestBed.configureTestingModule({
		providers: [
			provideRouter([
				{ path: 'analytics', component: AnalyticsPage },
				{ path: 'rooms/:roomSid', component: Blank }
			]),
			provideHttpClient(),
			provideHttpClientTesting(),
			...(options.providers ?? [])
		]
	});
	TestBed.overrideComponent(TimeSeriesChart, { set: { providers: [NEVER_LOADED] } });
	TestBed.overrideComponent(BreakdownChart, { set: { providers: [NEVER_LOADED] } });

	const http = TestBed.inject(HttpTestingController);
	const load = TestBed.inject(InfoService).load();

	http.expectOne('api/v1/info').flush(
		infoResponse({
			features: (options.features ?? []) as never[],
			retention: options.retention ?? ANALYTICS_RETENTION
		})
	);
	await load;

	const harness = await RouterTestingHarness.create(url);
	const requests = await refreshAnalytics(http, harness, options.answers);

	return { http, harness, requests, element: routeElement(harness) };
}

export function analyticsText(element: Element | null | undefined): string {
	return element?.textContent.replace(/\s+/g, ' ').trim() ?? '';
}

/** The analytics card whose heading is `title`. */
export function analyticsCard(element: HTMLElement, title: string): HTMLElement | undefined {
	return [...element.querySelectorAll<HTMLElement>('ovd-analytics-card')].find(
		(candidate) => analyticsText(candidate.querySelector('h2')) === title
	);
}

/** Metrics and granularity of every series request. */
export function seriesRequests(requests: TestRequest[]) {
	return requests
		.filter((request) => request.request.url === 'api/v1/analytics/series')
		.map((request) => ({
			metrics: request.request.params.get('metrics')?.split(',') ?? [],
			granularity: request.request.params.get('granularity')
		}));
}
