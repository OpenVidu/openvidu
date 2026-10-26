export const Granularity = {
	AUTO: 'auto',
	/** Native flush period of `track_stats`; offered by stats-backed series only. */
	THIRTY_SECONDS: '30s',
	MINUTE: '1m',
	FIVE_MINUTES: '5m',
	FIFTEEN_MINUTES: '15m',
	HOUR: '1h',
	SIX_HOURS: '6h',
	DAY: '1d'
} as const;
export type Granularity = (typeof Granularity)[keyof typeof Granularity];

/** A granularity applied to a series (`auto` resolved). */
export type BucketGranularity = Exclude<Granularity, 'auto'>;

/** Ladder of series over rollups and entities, finest first. */
export const SERIES_GRANULARITIES: readonly BucketGranularity[] = ['1m', '5m', '15m', '1h', '6h', '1d'];

/** Ladder of series over `track_stats`, finest first: it starts at the 30 s flush period. */
export const STATS_GRANULARITIES: readonly BucketGranularity[] = ['30s', ...SERIES_GRANULARITIES];

/** Query parameters common to time-series endpoints. */
export interface TimeSeriesQuery {
	from?: string;
	to?: string;
	tz?: string;
	/** Default `auto`: the finest granularity giving at most 1 000 buckets. */
	granularity?: Granularity;
}

/** `[bucket start (ISO 8601 UTC), value]`; `null` for averages of empty buckets. */
export type TimeSeriesPoint = [string, number | null];

/** Envelope of every time-series endpoint; series are dense over the range. */
export interface TimeSeriesResponse {
	granularity: BucketGranularity;
	from: string;
	to: string;
	/** A bound of the range moved to fit the stats retention; absent otherwise. */
	clamped?: true;
	series: { name: string; points: TimeSeriesPoint[] }[];
}
