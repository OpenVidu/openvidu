import type { SchemaMetaDashboard } from '@openvidu-dashboard/typings';

/** Newest completion the dashboard document records: of a class, or of the latest job (Legacy has no class). */
function newestCompletion(dashboard: SchemaMetaDashboard | undefined): number {
	let newest = 0;

	for (const record of Object.values(dashboard?.deletions ?? {})) {
		newest = Math.max(newest, record.completed?.finishedAt.getTime() ?? 0);
	}

	const job = dashboard?.deletion;

	if (job?.state === 'completed' && job.finishedAt !== undefined) {
		newest = Math.max(newest, job.finishedAt.getTime());
	}

	return newest;
}

/**
 * The caches of figures a deletion makes stale (storage, Analytics folds): every instance clears them at its first
 * status or info read that finds a completion newer than the last it saw. An extending edition registers its own.
 */
export class FigureCaches {
	private seen = 0;
	private readonly clears: (() => void)[] = [];

	/** `finishedAt` (epoch ms) of the newest completion seen; 0 before any. */
	get newestCompletion(): number {
		return this.seen;
	}

	/** Registers the clear of a cache. */
	register(clear: () => void): void {
		this.clears.push(clear);
	}

	/** Clears every registered cache when `dashboard` records a completion newer than the last one seen. */
	observe(dashboard: SchemaMetaDashboard | undefined): void {
		const newest = newestCompletion(dashboard);

		if (newest > this.seen) {
			this.seen = newest;

			for (const clear of this.clears) {
				clear();
			}
		}
	}
}
