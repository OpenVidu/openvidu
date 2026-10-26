import { bucketStart } from '../api/time-series.js';

const HOUR_MS = 3_600_000;

export interface TodayWindow {
	/** Local midnight of the zone. */
	since: Date;
	/** Start of the hourly bucket containing `since`: the first rollup document summed. */
	from: Date;
	/** `since` is not on an hour boundary, so the first bucket also holds the end of the previous day. */
	approximate: boolean;
}

/** "Today" in `tz` at `now`, aligned to the UTC hourly rollups. */
export function todayWindow(now: Date, tz: string): TodayWindow {
	const since = bucketStart(now, '1d', tz);
	const from = new Date(Math.floor(since.getTime() / HOUR_MS) * HOUR_MS);

	return { since, from, approximate: from.getTime() !== since.getTime() };
}
