import { type Counters, DOCUMENTS } from './analytics-catalogue.js';

/** Counters per bucket start (epoch milliseconds). */
export type BucketCounters = ReadonlyMap<number, Counters>;

/** A projected rollup document: `bucket` and the requested counters. */
export interface RollupRow {
	bucket: Date;
	[field: string]: unknown;
}

function addLeaves(target: Map<string, number>, value: unknown, path: string): void {
	if (typeof value === 'number') {
		target.set(path, (target.get(path) ?? 0) + value);
	} else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
		for (const [key, child] of Object.entries(value)) {
			addLeaves(target, child, path === '' ? key : `${path}.${key}`);
		}
	}
}

/** Index of the bucket of `starts` (ascending) containing `time`, or -1 before the first one. */
function bucketIndex(starts: readonly number[], time: number): number {
	let low = 0;
	let high = starts.length - 1;
	let found = -1;

	while (low <= high) {
		const middle = (low + high) >> 1;

		if ((starts[middle] ?? 0) <= time) {
			found = middle;
			low = middle + 1;
		} else {
			high = middle - 1;
		}
	}

	return found;
}

/** Sums the numeric leaves of each row into the bucket of `starts` containing its `bucket`. */
export async function foldRows(rows: AsyncIterable<RollupRow>, starts: readonly Date[]): Promise<BucketCounters> {
	const times = starts.map((start) => start.getTime());
	const buckets = new Map<number, Map<string, number>>();

	for await (const { bucket, ...fields } of rows) {
		const start = times[bucketIndex(times, bucket.getTime())];

		if (start === undefined) {
			continue;
		}

		let counters = buckets.get(start);

		if (counters === undefined) {
			counters = new Map();
			buckets.set(start, counters);
		}

		counters.set(DOCUMENTS, (counters.get(DOCUMENTS) ?? 0) + 1);
		addLeaves(counters, fields, '');
	}

	return buckets;
}

/** Bucket-wise sum of two folds. */
export function mergeCounters(base: BucketCounters, extra: BucketCounters): BucketCounters {
	if (extra.size === 0) {
		return base;
	}

	const merged = new Map(base);

	for (const [start, counters] of extra) {
		const existing = merged.get(start);

		if (existing === undefined) {
			merged.set(start, counters);
			continue;
		}

		const sum = new Map(existing);

		for (const [path, value] of counters) {
			sum.set(path, (sum.get(path) ?? 0) + value);
		}

		merged.set(start, sum);
	}

	return merged;
}

/** Every bucket folded into one. */
export function totalCounters(buckets: BucketCounters): Counters {
	const total = new Map<string, number>();

	for (const counters of buckets.values()) {
		for (const [path, value] of counters) {
			total.set(path, (total.get(path) ?? 0) + value);
		}
	}

	return total;
}

/** Entries of the map counter at `path`: `{ key: count }` from the `path.<key>` leaves. */
export function mapEntries(counters: Counters, path: string): Map<string, number> {
	const prefix = `${path}.`;
	const entries = new Map<string, number>();

	for (const [key, value] of counters) {
		if (key.startsWith(prefix)) {
			entries.set(key.slice(prefix.length), value);
		}
	}

	return entries;
}
