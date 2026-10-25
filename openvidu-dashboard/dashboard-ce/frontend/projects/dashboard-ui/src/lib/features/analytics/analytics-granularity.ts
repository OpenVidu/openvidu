import {
	ANALYTICS_GRANULARITIES,
	type AnalyticsBucketGranularity,
	type AnalyticsGranularity,
	DEFAULT_RETENTION_MS
} from '@openvidu-dashboard/typings';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MAX_BUCKETS = 1000;
/** 5-minute rollup retention assumed while the server has not reported one (the writer default). */
export const DEFAULT_ROLLUPS_5MIN_RETENTION_MS = DEFAULT_RETENTION_MS.rollups5Min ?? 7 * DAY_MS;

const BUCKET_MS: Readonly<Record<AnalyticsBucketGranularity, number>> = {
	'5m': 5 * MINUTE_MS,
	'15m': 15 * MINUTE_MS,
	'1h': HOUR_MS,
	'6h': 6 * HOUR_MS,
	'1d': DAY_MS
};

export const GRANULARITY_LABELS: Readonly<Record<AnalyticsBucketGranularity, string>> = {
	'5m': '5 min',
	'15m': '15 min',
	'1h': '1 h',
	'6h': '6 h',
	'1d': '1 d'
};

/** The resolved range of the page and what decides the granularities the API accepts for it. */
export interface GranularityContext {
	from: Date;
	to: Date;
	now: Date;
	rollups5MinRetentionMs: number;
}

/** Five and fifteen minutes need a range of at most a day inside the 5-minute rollup retention. */
export function subHourAllowed(context: GranularityContext): boolean {
	return (
		context.to.getTime() - context.from.getTime() <= DAY_MS &&
		context.from.getTime() >= context.now.getTime() - context.rollups5MinRetentionMs
	);
}

/** What the API resolves `auto` to: 5 min for a day, 1 h up to a week, 6 h up to 90 days, else 1 d. */
export function autoGranularity(context: GranularityContext): AnalyticsBucketGranularity {
	const span = context.to.getTime() - context.from.getTime();

	if (subHourAllowed(context)) {
		return '5m';
	}

	if (span <= 7 * DAY_MS) {
		return '1h';
	}

	return span <= 90 * DAY_MS ? '6h' : '1d';
}

/** The explicit granularities the API accepts for the range: sub-hour ones as above, none above 1 000 buckets. */
export function granularityOptions(context: GranularityContext): AnalyticsBucketGranularity[] {
	const span = context.to.getTime() - context.from.getTime();

	return ANALYTICS_GRANULARITIES.filter((granularity) => {
		if ((granularity === '5m' || granularity === '15m') && !subHourAllowed(context)) {
			return false;
		}

		// One more bucket than the span holds: the first one starts before `from`.
		return Math.ceil(span / BUCKET_MS[granularity]) + 1 <= MAX_BUCKETS;
	});
}

/** The granularity of the URL when the range accepts it, otherwise `auto`. */
export function validGranularity(value: string | null, context: GranularityContext): AnalyticsGranularity {
	return granularityOptions(context).includes(value as AnalyticsBucketGranularity)
		? (value as AnalyticsBucketGranularity)
		: 'auto';
}

export function effectiveGranularity(
	granularity: AnalyticsGranularity,
	context: GranularityContext
): AnalyticsBucketGranularity {
	return granularity === 'auto' ? autoGranularity(context) : granularity;
}

/** Granularity of the hourly-only metrics: one hour while the page shows finer buckets. */
export function hourlyGranularity(effective: AnalyticsBucketGranularity): AnalyticsBucketGranularity {
	return effective === '5m' || effective === '15m' ? '1h' : effective;
}
