import type { StoredEventType } from '../data-model/enums.js';

export const SortOrder = {
	ASC: 'asc',
	DESC: 'desc'
} as const;
export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];

export type RelativeUnit = 'm' | 'h' | 'd';

/** Relative time: `now`, `now-<n>m|h|d`, or the start of the current day or month in `tz`. */
export type RelativeTime = 'now' | `now-${number}${RelativeUnit}` | 'now/d' | 'now/M';

/** `from` and `to` of a range: a relative time or an ISO 8601 instant. */
export type TimeExpression = RelativeTime | (string & {});

/** Range parameters shared by lists, time series and the UI picker. */
export interface RangeQuery {
	/** Default `now-24h`. */
	from?: TimeExpression;
	/** Default `now`. */
	to?: TimeExpression;
	/** IANA zone or `UTC` for relative snapping and display; the API defaults to `UTC`. */
	tz?: string;
}

/** Query parameters common to list endpoints; resources add their sort keys and filters. */
export interface ListQuery<TSort extends string = string> extends RangeQuery {
	/** 1–100, default 25. */
	limit?: number;
	cursor?: string;
	sort?: TSort;
	order?: SortOrder;
	/** Case-insensitive prefix over the resource's searchable fields. */
	q?: string;
}

/** Page sizes the UI offers; the API accepts any `limit` from 1 to 100. */
export const PAGE_SIZES = [10, 25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

/** Query parameters of an events timeline (`types` travels as a comma-separated list). */
export interface EventsQuery {
	types?: StoredEventType[];
	/** Participant SID the timeline is narrowed to. */
	participant?: string;
	order?: SortOrder;
	cursor?: string;
	limit?: PageSize;
}

/** Envelope of every list endpoint. */
export interface ListResponse<T> {
	items: T[];
	nextCursor: string | null;
	prevCursor: string | null;
	/** Present only when the resolved range is within `DASHBOARD_LIST_TOTAL_MAX_RANGE`. */
	total?: number;
}
