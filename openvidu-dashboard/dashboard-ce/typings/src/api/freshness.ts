/** Batch interval assumed for a node that reports none: the writer's default. */
export const DEFAULT_BATCH_INTERVAL_MS = 10_000;

/** How old the last signal may be before the writer, a node or an active entity stops being judged fresh. */
export interface FreshnessWindows {
	/** The writer and a node are fresh (alive) while their last batch is at most this old. */
	freshMs: number;
	/** The writer is silent once its last batch is older than this. */
	silentMs: number;
	/** An active room or participant is stale once its last stats flush is older than this. */
	staleMs: number;
}

/**
 * The freshness windows of a writer batch interval: 30, 60 and 90 s at the default 10 s, growing with slower batches so
 * that a batch in progress is never read as a silent writer or a stale entity (stale covers two 30 s stats flushes, one
 * batch and a margin).
 */
export function freshnessWindows(batchIntervalMs: number = DEFAULT_BATCH_INTERVAL_MS): FreshnessWindows {
	return {
		freshMs: Math.max(30_000, 1.5 * batchIntervalMs + 5_000),
		silentMs: Math.max(60_000, 2 * batchIntervalMs + 15_000),
		staleMs: Math.max(90_000, 60_000 + batchIntervalMs + 15_000)
	};
}
