import { DOCUMENT, inject, Service } from '@angular/core';
import {
	ANALYTICS_GLOBAL_ONLY_DIMENSIONS,
	ANALYTICS_METRIC_INFO,
	type AnalyticsBreakdownsResponse,
	type AnalyticsBucketGranularity,
	type AnalyticsDimension,
	analyticsDimensionFeature,
	type AnalyticsExportKind,
	type AnalyticsGranularity,
	type AnalyticsMetric,
	analyticsMetricFeature,
	type AnalyticsMetricInfo,
	type AnalyticsScope,
	type AnalyticsSeriesResponse,
	type AnalyticsSummary,
	type FeatureKey
} from '@openvidu-dashboard/typings';

import { HttpService } from '../../core/http/http.js';
import type { RangeParams } from '../../core/state/query-state.js';
import { apiRange } from '../rooms/rooms-data.js';
import { hourlyGranularity } from './analytics-granularity.js';
import type { AnalyticsProCard } from './analytics-seams.js';

/** Metrics of the CE cards, asked for on every refresh. */
export const PAGE_METRICS: readonly AnalyticsMetric[] = [
	'roomsPeakActive',
	'roomsCreated',
	'participantsPeakActive',
	'participantsJoined',
	'connectionSuccessRate',
	'uniqueIdentities',
	'bytesUp',
	'bytesDown',
	'egressPeakActive',
	'egressStarted',
	'egressEnded',
	'ingressPeakActive',
	'ingressSessions'
];

export const PAGE_DIMENSIONS: readonly AnalyticsDimension[] = [
	'kind',
	'sdk',
	'os',
	'browser',
	'connectionType',
	'egressType',
	'ingressInputType'
];

/** The URL state of the page. */
export interface AnalyticsState {
	range: RangeParams;
	/** As requested: `auto` or an explicit value the range accepts. */
	granularity: AnalyticsGranularity;
	/** What `auto` resolves to for the range. */
	effective: AnalyticsBucketGranularity;
	scope: AnalyticsScope;
}

/** One series request: its metrics at one granularity. */
export interface SeriesRequest {
	metrics: AnalyticsMetric[];
	granularity: AnalyticsGranularity;
}

/** The combined requests of one refresh. */
export interface AnalyticsPlan {
	/**
	 * Metrics at the page granularity, then the hourly-only ones at one hour when the page is finer, and the unique
	 * identities at one day when the page is not daily.
	 */
	series: SeriesRequest[];
	dimensions: AnalyticsDimension[];
}

/** The info of `metric`: the CE one, or that of the PRO card that adds the metric. */
export function metricInfo(
	metric: AnalyticsMetric,
	cards: readonly AnalyticsProCard[] = []
): AnalyticsMetricInfo | undefined {
	return (
		ANALYTICS_METRIC_INFO[metric] ??
		cards.find((card) => card.metricInfo?.[metric] !== undefined)?.metricInfo?.[metric]
	);
}

function allowed(feature: FeatureKey | undefined, features: ReadonlySet<FeatureKey>): boolean {
	return feature === undefined || features.has(feature);
}

/**
 * The combined requests of a refresh: the CE metrics and dimensions plus those of the PRO cards, PRO items only when
 * their feature is enabled, hourly-only metrics in a second series request while the page granularity is below an hour,
 * unique identities in a daily one while it is not daily, and no egress or ingress item in a node scope, where they are
 * not counted.
 */
export function analyticsPlan(
	state: AnalyticsState,
	features: ReadonlySet<FeatureKey>,
	cards: readonly AnalyticsProCard[] = []
): AnalyticsPlan {
	const global = state.scope === 'global';
	const metrics = [...PAGE_METRICS, ...cards.flatMap((card) => card.metrics ?? [])].filter(
		(metric) =>
			allowed(analyticsMetricFeature(metric), features) &&
			(global || metricInfo(metric, cards)?.globalOnly !== true)
	);
	const daily = state.effective === '1d';
	const identities = !daily && metrics.includes('uniqueIdentities');
	const hourly = hourlyGranularity(state.effective);
	const split = hourly !== state.effective;
	const hourlyOnly = (metric: AnalyticsMetric) => metricInfo(metric, cards)?.hourlyOnly === true;
	const rest = metrics.filter((metric) => daily || metric !== 'uniqueIdentities');
	const main = split ? rest.filter((metric) => !hourlyOnly(metric)) : rest;
	const hourlyMetrics = split ? rest.filter(hourlyOnly) : [];

	return {
		series: [
			{ metrics: main, granularity: state.granularity },
			...(hourlyMetrics.length > 0 ? [{ metrics: hourlyMetrics, granularity: hourly }] : []),
			...(identities ? [{ metrics: ['uniqueIdentities' as const], granularity: '1d' as const }] : [])
		],
		dimensions: [...PAGE_DIMENSIONS, ...cards.flatMap((card) => card.dimensions ?? [])].filter(
			(dimension) =>
				allowed(analyticsDimensionFeature(dimension), features) &&
				(global || !ANALYTICS_GLOBAL_ONLY_DIMENSIONS.includes(dimension))
		)
	};
}

/** Parameters of an export or a series request: the range resolved at `now`, plus the scope when not global. */
function rangeParams(state: Pick<AnalyticsState, 'range' | 'scope'>): Record<string, string> {
	return { ...apiRange(state.range), ...(state.scope === 'global' ? {} : { scope: state.scope }) };
}

/** Requests of the analytics API and the CSV download. */
@Service()
export class AnalyticsDataService {
	private readonly http = inject(HttpService);
	private readonly document = inject(DOCUMENT);

	series(state: AnalyticsState, request: SeriesRequest): Promise<AnalyticsSeriesResponse> {
		return this.http.get('analytics/series', {
			params: { ...rangeParams(state), metrics: request.metrics, granularity: request.granularity }
		});
	}

	breakdowns(state: AnalyticsState, dimensions: readonly AnalyticsDimension[]): Promise<AnalyticsBreakdownsResponse> {
		return this.http.get('analytics/breakdowns', { params: { ...rangeParams(state), dimensions } });
	}

	summary(state: AnalyticsState): Promise<AnalyticsSummary> {
		return this.http.get('analytics/summary', { params: rangeParams(state) });
	}

	/** Downloads the CSV of a card and saves it under the server's file name. */
	async exportCsv(
		state: AnalyticsState,
		kind: AnalyticsExportKind,
		items: {
			metrics?: readonly AnalyticsMetric[];
			dimensions?: readonly AnalyticsDimension[];
			granularity?: AnalyticsGranularity;
		}
	): Promise<void> {
		const download = await this.http.download('analytics/export.csv', {
			params: {
				kind,
				...rangeParams(state),
				...(kind === 'series'
					? { metrics: items.metrics ?? [], granularity: items.granularity ?? state.granularity }
					: { dimensions: items.dimensions ?? [] })
			}
		});
		const url = URL.createObjectURL(download.blob);
		const link = this.document.createElement('a');

		link.href = url;
		link.download = download.fileName ?? `analytics-${kind}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	}
}
