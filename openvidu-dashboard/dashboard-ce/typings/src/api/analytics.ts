import { FeatureKey } from './features.js';
import type { BucketGranularity, TimeSeriesPoint, TimeSeriesResponse } from './time-series.js';

export const AnalyticsMetric = {
	ROOMS_CREATED: 'roomsCreated',
	ROOMS_ENDED: 'roomsEnded',
	PARTICIPANTS_JOINED: 'participantsJoined',
	PARTICIPANTS_ACTIVE: 'participantsActive',
	PARTICIPANTS_ABORTED: 'participantsAborted',
	CONNECTION_SUCCESS_RATE: 'connectionSuccessRate',
	UNIQUE_IDENTITIES: 'uniqueIdentities',
	PARTICIPANT_MINUTES: 'participantMinutes',
	TRACKS_PUBLISHED: 'tracksPublished',
	TRACKS_SUBSCRIBE_FAILED: 'tracksSubscribeFailed',
	EGRESS_STARTED: 'egressStarted',
	EGRESS_ENDED: 'egressEnded',
	EGRESS_DURATION_MS: 'egressDurationMs',
	INGRESS_SESSIONS: 'ingressSessions',
	INGRESS_DURATION_MS: 'ingressDurationMs',
	BYTES_UP: 'bytesUp',
	BYTES_DOWN: 'bytesDown',
	SCORE_AVG: 'scoreAvg',
	POOR_SAMPLES: 'poorSamples',
	LOST_SAMPLES: 'lostSamples',
	API_CALLS: 'apiCalls',
	API_ERRORS: 'apiErrors'
} as const;
export type AnalyticsMetric = (typeof AnalyticsMetric)[keyof typeof AnalyticsMetric];

export interface AnalyticsMetricInfo {
	unit: 'count' | 'percent' | 'bytes' | 'ms' | 'minutes' | 'mos';
	/** Value of a bucket without data: `0` for counters and sums, `null` for rates and averages. */
	empty: 0 | null;
	/** Served at `1h` or coarser: `analytics_5min` does not carry it. */
	hourlyOnly?: true;
	/** Served at `1d` only: written per UTC day. */
	dailyOnly?: true;
}

/** Unit, empty value and granularity rules of the CE metrics; the PRO edition adds those of its own. */
export const ANALYTICS_METRIC_INFO: Readonly<Partial<Record<AnalyticsMetric, AnalyticsMetricInfo>>> = {
	roomsCreated: { unit: 'count', empty: 0 },
	roomsEnded: { unit: 'count', empty: 0 },
	participantsJoined: { unit: 'count', empty: 0 },
	participantsActive: { unit: 'count', empty: 0 },
	participantsAborted: { unit: 'count', empty: 0 },
	connectionSuccessRate: { unit: 'percent', empty: null },
	uniqueIdentities: { unit: 'count', empty: 0, dailyOnly: true },
	participantMinutes: { unit: 'minutes', empty: 0, hourlyOnly: true },
	tracksPublished: { unit: 'count', empty: 0, hourlyOnly: true },
	egressStarted: { unit: 'count', empty: 0 },
	egressEnded: { unit: 'count', empty: 0, hourlyOnly: true },
	egressDurationMs: { unit: 'ms', empty: 0, hourlyOnly: true },
	ingressSessions: { unit: 'count', empty: 0, hourlyOnly: true },
	ingressDurationMs: { unit: 'ms', empty: 0, hourlyOnly: true },
	bytesUp: { unit: 'bytes', empty: 0 },
	bytesDown: { unit: 'bytes', empty: 0 },
	apiCalls: { unit: 'count', empty: 0, hourlyOnly: true },
	apiErrors: { unit: 'count', empty: 0, hourlyOnly: true }
};

export const AnalyticsDimension = {
	SDK: 'sdk',
	OS: 'os',
	BROWSER: 'browser',
	CONNECTION_TYPE: 'connectionType',
	KIND: 'kind',
	DISCONNECT_REASON: 'disconnectReason',
	ROOM_END_REASON: 'roomEndReason',
	EGRESS_TYPE: 'egressType',
	EGRESS_STATUS: 'egressStatus',
	INGRESS_INPUT_TYPE: 'ingressInputType',
	API_METHOD: 'apiMethod'
} as const;
export type AnalyticsDimension = (typeof AnalyticsDimension)[keyof typeof AnalyticsDimension];

export const ANALYTICS_CE_METRICS: readonly AnalyticsMetric[] = [
	'roomsCreated',
	'roomsEnded',
	'participantsJoined',
	'participantsActive',
	'participantsAborted',
	'connectionSuccessRate',
	'uniqueIdentities',
	'participantMinutes',
	'tracksPublished',
	'egressStarted',
	'egressEnded',
	'egressDurationMs',
	'ingressSessions',
	'ingressDurationMs',
	'bytesUp',
	'bytesDown',
	'apiCalls',
	'apiErrors'
];

/** PRO metrics by the feature that unlocks them. */
export const ANALYTICS_PRO_METRICS: Readonly<Partial<Record<FeatureKey, readonly AnalyticsMetric[]>>> = {
	[FeatureKey.ANALYTICS_QUALITY]: ['scoreAvg', 'poorSamples', 'lostSamples'],
	[FeatureKey.ANALYTICS_DIAGNOSTICS]: ['tracksSubscribeFailed']
};

export const ANALYTICS_CE_DIMENSIONS: readonly AnalyticsDimension[] = [
	'sdk',
	'os',
	'browser',
	'connectionType',
	'kind',
	'egressType',
	'egressStatus',
	'ingressInputType'
];

/** PRO dimensions by the feature that unlocks them. */
export const ANALYTICS_PRO_DIMENSIONS: Readonly<Partial<Record<FeatureKey, readonly AnalyticsDimension[]>>> = {
	[FeatureKey.ANALYTICS_DIAGNOSTICS]: ['disconnectReason', 'roomEndReason', 'apiMethod']
};

/** Feature that unlocks a node scope and the scopes endpoint. */
export const ANALYTICS_SCOPE_FEATURE = FeatureKey.PER_NODE_BREAKDOWN;

function featureOf<T extends string>(sets: Readonly<Partial<Record<FeatureKey, readonly T[]>>>, item: T) {
	return (Object.keys(sets) as FeatureKey[]).find((feature) => sets[feature]?.includes(item));
}

/** Feature a metric needs; undefined for CE metrics. */
export function analyticsMetricFeature(metric: AnalyticsMetric): FeatureKey | undefined {
	return featureOf(ANALYTICS_PRO_METRICS, metric);
}

/** Feature a dimension needs; undefined for CE dimensions. */
export function analyticsDimensionFeature(dimension: AnalyticsDimension): FeatureKey | undefined {
	return featureOf(ANALYTICS_PRO_DIMENSIONS, dimension);
}

/** Granularities of the analytics series, finest first: the finest rollup is five minutes. */
export const ANALYTICS_GRANULARITIES = ['5m', '15m', '1h', '6h', '1d'] as const satisfies readonly BucketGranularity[];
export type AnalyticsBucketGranularity = (typeof ANALYTICS_GRANULARITIES)[number];
export type AnalyticsGranularity = 'auto' | AnalyticsBucketGranularity;

/** `global` or `node:<nodeId>`. */
export type AnalyticsScope = 'global' | `node:${string}`;

export const ANALYTICS_GLOBAL_SCOPE = 'global';
export const ANALYTICS_SCOPE_PATTERN = /^(global|node:[A-Za-z0-9_.-]{1,128})$/;

/** Query parameters shared by the analytics endpoints. */
export interface AnalyticsRangeQuery {
	from?: string;
	to?: string;
	tz?: string;
	/** Default `global`. */
	scope?: AnalyticsScope;
}

export interface AnalyticsSeriesQuery extends AnalyticsRangeQuery {
	metrics: AnalyticsMetric[];
	/** Default `auto`: `5m` up to 24 h inside the 5-minute rollup retention, `1h` up to 7 d, `6h` up to 90 d, else `1d`. */
	granularity?: AnalyticsGranularity;
}

export interface AnalyticsSeries {
	/** The metric, or `egressEnded.<status>` with a stored egress status such as `complete`. */
	name: string;
	points: TimeSeriesPoint[];
	/** `utcDay`: one value per UTC day whatever `tz` (`uniqueIdentities`). */
	basis?: 'utcDay';
}

export interface AnalyticsSeriesResponse extends TimeSeriesResponse {
	granularity: AnalyticsBucketGranularity;
	scope: AnalyticsScope;
	series: AnalyticsSeries[];
}

export interface AnalyticsBreakdownsQuery extends AnalyticsRangeQuery {
	dimensions: AnalyticsDimension[];
}

export interface AnalyticsBreakdownItem {
	/** As stored: protocol enums in `UPPER_SNAKE`, dashboard vocabularies in lower case. */
	key: string;
	count: number;
	/** Share of the dimension total, one decimal. */
	percent: number;
	/** Errors of an `apiMethod` key, when the writer counts them. */
	errors?: number;
}

export interface AnalyticsBreakdown {
	dimension: AnalyticsDimension;
	total: number;
	/** Sorted by `count` descending. */
	items: AnalyticsBreakdownItem[];
}

/** Range snapped to whole hours (≤ 90 d) or whole UTC days. */
export interface AnalyticsBreakdownsResponse {
	from: string;
	to: string;
	scope: AnalyticsScope;
	breakdowns: AnalyticsBreakdown[];
}

export interface AnalyticsUniqueIdentities {
	/** Sum of the daily values: an identity active on two days counts twice. */
	value: number;
	basis: 'utcDays';
	/** UTC days with a value. */
	days: number;
}

/** KPI values over the snapped range; a value the stored documents cannot derive is absent. */
export interface AnalyticsSummary {
	from: string;
	to: string;
	scope: AnalyticsScope;
	roomsCreated: number;
	roomsEnded: number;
	participantSessions: number;
	uniqueIdentities?: AnalyticsUniqueIdentities;
	/** Percentage, one decimal. */
	connectionSuccessRate?: number;
	/** One decimal. */
	avgRoomSize?: number;
	avgRoomDurationMs?: number;
	bytesUp: number;
	bytesDown: number;
	egressStarted: number;
	egressDurationMs: number;
	/** Ingress sessions started in the range. */
	ingressSessions: number;
	/** Duration of the ingress sessions ended in the range. */
	ingressDurationMs: number;
	apiCalls: number;
	/** Percentage, one decimal. */
	apiErrorRate?: number;
}

export type AnalyticsExportKind = 'series' | 'breakdowns';

export type AnalyticsExportQuery =
	({ kind: 'series' } & AnalyticsSeriesQuery) | ({ kind: 'breakdowns' } & AnalyticsBreakdownsQuery);

export const ANALYTICS_CSV_CONTENT_TYPE = 'text/csv; charset=utf-8';

/** `analytics-<kind>-<from>-<to>.csv` with the colons of the ISO instants removed. */
export function analyticsCsvFileName(kind: AnalyticsExportKind, from: string, to: string): string {
	return `analytics-${kind}-${from}-${to}.csv`.replaceAll(':', '');
}
