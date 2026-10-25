import {
	type AnalyticsBucketGranularity,
	type AnalyticsGranularity,
	type AnalyticsMetric,
	type AnalyticsMetricInfo,
	Collection,
	formatRetentionLength
} from '@openvidu-dashboard/typings';

import { bucketStart, bucketStarts, MAX_BUCKETS } from '../api/time-series.js';
import { ApiError } from '../http/api-error.js';
import type { RetentionMs } from '../schema/retention.js';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Size of the UTC-aligned granularities. */
const UTC_BUCKET_MS = { '5m': 5 * MINUTE_MS, '15m': 15 * MINUTE_MS, '1h': HOUR_MS } as const;

/** Longest range of the sub-hour granularities. */
export const SUB_HOUR_MAX_RANGE_MS = DAY_MS;

export type RollupCollection =
	typeof Collection.ANALYTICS_5MIN | typeof Collection.ANALYTICS_HOURLY | typeof Collection.ANALYTICS_DAILY;

/** Bucket grid of a series and where to read it. */
export interface BucketGrid {
	collection: RollupCollection;
	/** Bucket starts, ascending. */
	starts: Date[];
}

export interface SeriesPlan extends BucketGrid {
	granularity: AnalyticsBucketGranularity;
	/** Grid of `uniqueIdentities`: UTC days of `analytics_daily`, whatever `tz`. */
	utcDays?: BucketGrid;
}

export interface SeriesPlanInput {
	from: Date;
	to: Date;
	tz: string;
	granularity: AnalyticsGranularity;
	metrics: readonly AnalyticsMetric[];
	now: Date;
	retention: RetentionMs;
	/** Granularity rules of the metrics, from the analytics catalogue. */
	info: Readonly<Partial<Record<AnalyticsMetric, AnalyticsMetricInfo>>>;
}

function invalid(path: string, message: string): ApiError {
	return ApiError.validation([{ path: [path], message }]);
}

/** Buckets of `[from, to)`; local days and quarter days are counted without the zone, which only moves their edges. */
function bucketTotal(from: Date, to: Date, granularity: AnalyticsBucketGranularity): number {
	const span = to.getTime() - from.getTime();

	switch (granularity) {
		case '1d':
			return Math.ceil(span / DAY_MS) + 1;
		case '6h':
			return Math.ceil(span / (6 * HOUR_MS)) + 1;
		default: {
			const size = UTC_BUCKET_MS[granularity];

			return Math.ceil((to.getTime() - Math.floor(from.getTime() / size) * size) / size);
		}
	}
}

function subHourAllowed(input: SeriesPlanInput): boolean {
	return (
		input.to.getTime() - input.from.getTime() <= SUB_HOUR_MAX_RANGE_MS &&
		input.from.getTime() >= input.now.getTime() - input.retention.rollups5MinMs
	);
}

/** `auto`: five minutes for a day inside the 5-minute rollup retention, then hours up to a week, quarter days to 90 days. */
export function resolveAnalyticsGranularity(input: SeriesPlanInput): AnalyticsBucketGranularity {
	if (input.granularity !== 'auto') {
		return input.granularity;
	}

	const span = input.to.getTime() - input.from.getTime();

	if (subHourAllowed(input)) {
		return '5m';
	}

	if (span <= 7 * DAY_MS) {
		return '1h';
	}

	return span <= 90 * DAY_MS ? '6h' : '1d';
}

/** Starts of the buckets overlapping `[from, to)`: UTC boundaries below a quarter day, local ones of `zone` above. */
export function gridStarts(from: Date, to: Date, granularity: AnalyticsBucketGranularity, zone: string): Date[] {
	if (granularity === '6h' || granularity === '1d') {
		return bucketStarts(from, to, granularity, zone);
	}

	const size = UTC_BUCKET_MS[granularity];
	const starts: Date[] = [];

	for (let start = Math.floor(from.getTime() / size) * size; start < to.getTime(); start += size) {
		starts.push(new Date(start));
	}

	return starts;
}

/**
 * Granularity, source collection and bucket grid of a series request; a granularity the range or the metrics do not
 * allow is a `VALIDATION_ERROR` naming the rule.
 */
export function planSeries(input: SeriesPlanInput): SeriesPlan {
	const granularity = resolveAnalyticsGranularity(input);
	const subHour = granularity === '5m' || granularity === '15m';

	if (subHour && input.to.getTime() - input.from.getTime() > SUB_HOUR_MAX_RANGE_MS) {
		throw invalid('granularity', '5m and 15m require a range of at most 24 hours');
	}

	if (subHour && !subHourAllowed(input)) {
		const retention = formatRetentionLength(input.retention.rollups5MinMs);

		throw invalid('granularity', `5m and 15m require a range inside the 5-minute rollup retention (${retention})`);
	}

	if (bucketTotal(input.from, input.to, granularity) > MAX_BUCKETS) {
		throw invalid(
			'granularity',
			`${granularity} gives more than the limit of ${String(MAX_BUCKETS)} buckets for this range; choose a coarser granularity`
		);
	}

	for (const metric of input.metrics) {
		if (input.info[metric]?.dailyOnly === true && granularity !== '1d') {
			throw invalid('metrics', `${metric} requires granularity=1d`);
		}

		if (input.info[metric]?.hourlyOnly === true && subHour) {
			throw invalid('metrics', `${metric} requires a granularity of at least 1h, not ${granularity}`);
		}
	}

	const plan = sourceGrid(input, granularity);

	return input.metrics.includes('uniqueIdentities')
		? {
				...plan,
				utcDays: {
					collection: Collection.ANALYTICS_DAILY,
					starts: gridStarts(input.from, input.to, '1d', 'UTC')
				}
			}
		: plan;
}

function sourceGrid(input: SeriesPlanInput, granularity: AnalyticsBucketGranularity): SeriesPlan {
	const { from, to, tz } = input;

	switch (granularity) {
		case '5m':
		case '15m':
			return {
				granularity,
				collection: Collection.ANALYTICS_5MIN,
				starts: gridStarts(from, to, granularity, tz)
			};
		case '1h':
		case '6h':
			return {
				granularity,
				collection: Collection.ANALYTICS_HOURLY,
				starts: gridStarts(from, to, granularity, tz)
			};
		case '1d': {
			// Daily documents are UTC days: another zone sums hourly documents per local day while they are retained.
			const local = tz !== 'UTC' && from.getTime() >= input.now.getTime() - input.retention.rollupsHourlyMs;

			return local
				? { granularity, collection: Collection.ANALYTICS_HOURLY, starts: gridStarts(from, to, '1d', tz) }
				: { granularity, collection: Collection.ANALYTICS_DAILY, starts: gridStarts(from, to, '1d', 'UTC') };
		}
	}
}

/** Snapped range of the breakdowns and the summary: whole hours up to 90 days, whole UTC days beyond. */
export interface SnappedRange {
	collection: typeof Collection.ANALYTICS_HOURLY | typeof Collection.ANALYTICS_DAILY;
	from: Date;
	to: Date;
}

export const HOURLY_SNAP_MAX_RANGE_MS = 90 * DAY_MS;

export function snapRange(from: Date, to: Date): SnappedRange {
	const hourly = to.getTime() - from.getTime() <= HOURLY_SNAP_MAX_RANGE_MS;
	const size = hourly ? HOUR_MS : DAY_MS;

	return {
		collection: hourly ? Collection.ANALYTICS_HOURLY : Collection.ANALYTICS_DAILY,
		from: new Date(Math.floor(from.getTime() / size) * size),
		to: new Date(Math.ceil(to.getTime() / size) * size)
	};
}

/** UTC days overlapping `[from, to)`. */
export function utcDaysOf(from: Date, to: Date): { from: Date; to: Date } {
	return { from: bucketStart(from, '1d', 'UTC'), to: new Date(Math.ceil(to.getTime() / DAY_MS) * DAY_MS) };
}

/** Start of the rollup document of `collection` containing `instant`: documents before it are complete. */
export function openDocumentStart(collection: RollupCollection, instant: Date): Date {
	const size =
		collection === Collection.ANALYTICS_5MIN
			? UTC_BUCKET_MS['5m']
			: collection === Collection.ANALYTICS_HOURLY
				? HOUR_MS
				: DAY_MS;

	return new Date(Math.floor(instant.getTime() / size) * size);
}
