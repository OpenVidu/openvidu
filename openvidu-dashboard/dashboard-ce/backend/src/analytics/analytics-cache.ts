import type { BucketCounters } from './analytics-counters.js';

export const ANALYTICS_CACHE_ENTRIES = 256;

/**
 * Folds of completed rollup documents, keyed by the resolved read, for `ttlMs`; least recently used entries go first.
 * A TTL of zero disables it.
 */
export class AnalyticsCache {
	private readonly entries = new Map<string, { at: number; value: BucketCounters }>();

	constructor(
		private readonly ttlMs: number,
		private readonly now: () => Date,
		private readonly capacity = ANALYTICS_CACHE_ENTRIES
	) {}

	get enabled(): boolean {
		return this.ttlMs > 0;
	}

	get(key: string): BucketCounters | undefined {
		const entry = this.entries.get(key);

		if (entry === undefined) {
			return undefined;
		}

		this.entries.delete(key);

		if (this.now().getTime() - entry.at >= this.ttlMs) {
			return undefined;
		}

		this.entries.set(key, entry);

		return entry.value;
	}

	set(key: string, value: BucketCounters): void {
		if (!this.enabled) {
			return;
		}

		this.entries.delete(key);
		this.entries.set(key, { at: this.now().getTime(), value });

		for (const oldest of this.entries.keys()) {
			if (this.entries.size <= this.capacity) {
				break;
			}

			this.entries.delete(oldest);
		}
	}
}
