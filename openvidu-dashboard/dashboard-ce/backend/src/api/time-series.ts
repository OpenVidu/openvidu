import { TZDate } from '@date-fns/tz';
// Per-function entry points: the date-fns barrel takes most of a second to load and delays startup.
import { addDays } from 'date-fns/addDays';
import { startOfDay } from 'date-fns/startOfDay';
import { startOfHour } from 'date-fns/startOfHour';
import { startOfMinute } from 'date-fns/startOfMinute';

import {
	type BucketGranularity,
	type Granularity,
	SERIES_GRANULARITIES,
	type TimeSeriesPoint
} from '@openvidu-dashboard/typings';

export const MAX_BUCKETS = 1_000;

const GRANULARITY_MS: Readonly<Record<BucketGranularity, number>> = {
	'30s': 30_000,
	'1m': 60_000,
	'5m': 300_000,
	'15m': 900_000,
	'1h': 3_600_000,
	'6h': 21_600_000,
	'1d': 86_400_000
};

function bucketCount(from: Date, to: Date, granularity: BucketGranularity): number {
	return Math.ceil((to.getTime() - from.getTime()) / GRANULARITY_MS[granularity]);
}

/**
 * The granularity to apply: `auto` gives the finest of `ladder` with at most 1 000 buckets; a value outside the ladder
 * or giving more buckets is an error.
 */
export function resolveGranularity(
	requested: Granularity,
	from: Date,
	to: Date,
	ladder: readonly BucketGranularity[] = SERIES_GRANULARITIES
): BucketGranularity | { error: string } {
	if (requested !== 'auto') {
		if (!ladder.includes(requested)) {
			return { error: `must be auto or one of ${ladder.join(', ')}` };
		}

		return bucketCount(from, to, requested) <= MAX_BUCKETS
			? requested
			: { error: `gives more than ${String(MAX_BUCKETS)} buckets for this range; choose a coarser granularity` };
	}

	return ladder.find((granularity) => bucketCount(from, to, granularity) <= MAX_BUCKETS) ?? ladder.at(-1) ?? '1d';
}

/** Start of the bucket containing `instant`, aligned on wall-clock boundaries of `zone`. */
export function bucketStart(instant: Date, granularity: BucketGranularity, zone: string): Date {
	const local = new TZDate(instant.getTime(), zone);
	let start: TZDate;

	switch (granularity) {
		case '30s':
			start = startOfMinute(local);
			start.setSeconds(local.getSeconds() < 30 ? 0 : 30);
			break;
		case '1m':
			start = startOfMinute(local);
			break;
		case '5m':
		case '15m': {
			const minutes = granularity === '5m' ? 5 : 15;

			start = startOfMinute(local);
			start.setMinutes(start.getMinutes() - (start.getMinutes() % minutes));
			break;
		}
		case '1h':
			start = startOfHour(local);
			break;
		case '6h':
			start = startOfHour(local);
			start.setHours(start.getHours() - (start.getHours() % 6));
			break;
		case '1d':
			start = startOfDay(local);
			break;
	}

	return new Date(start.getTime());
}

function nextBucket(start: Date, granularity: BucketGranularity, zone: string): Date {
	if (granularity === '1d' || granularity === '6h') {
		const local = new TZDate(start.getTime(), zone);
		// Wall-clock hours: on the day the clocks go back, 6 elapsed hours from midnight end inside the first bucket.
		const next = granularity === '1d' ? addDays(local, 1).getTime() : local.setHours(local.getHours() + 6);

		return bucketStart(new Date(next), granularity, zone);
	}

	return new Date(start.getTime() + GRANULARITY_MS[granularity]);
}

/** Starts of every bucket overlapping `[from, to)`, local midnight and wall-clock hours included across DST. */
export function bucketStarts(from: Date, to: Date, granularity: BucketGranularity, zone: string): Date[] {
	const starts: Date[] = [];
	let start = bucketStart(from, granularity, zone);

	while (start < to) {
		const next = nextBucket(start, granularity, zone);

		if (next <= start) {
			throw new Error(`${granularity} buckets of ${zone} do not advance past ${start.toISOString()}`);
		}

		starts.push(start);
		start = next;
	}

	return starts;
}

/** Dense points over `buckets`: a bucket without a value holds `0` for counters and `null` for averages. */
export function densePoints(
	buckets: readonly Date[],
	values: ReadonlyMap<number, number>,
	missing: 0 | null
): TimeSeriesPoint[] {
	return buckets.map((bucket) => [bucket.toISOString(), values.get(bucket.getTime()) ?? missing]);
}
