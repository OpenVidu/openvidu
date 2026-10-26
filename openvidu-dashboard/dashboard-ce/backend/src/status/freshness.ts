import type { Db } from 'mongodb';

import { Collection, type FreshnessWindows, freshnessWindows, type NodeDocument } from '@openvidu-dashboard/typings';

/** Nodes seen within this time set the writer's batch interval. */
const INTERVAL_WINDOW_MS = 3_600_000;

/** How long the windows read from `nodes` are reused. */
const WINDOWS_CACHE_MS = 10_000;

export type NodeHeartbeat = Pick<NodeDocument, 'lastSeenAt' | 'batchIntervalMs'>;

/** The largest batch interval among the nodes seen within the last hour of `now`; undefined when none reports one. */
export function writerBatchInterval(nodes: readonly NodeHeartbeat[], now: Date): number | undefined {
	let largest: number | undefined;

	for (const node of nodes) {
		if (node.batchIntervalMs !== undefined && now.getTime() - node.lastSeenAt.getTime() <= INTERVAL_WINDOW_MS) {
			largest = Math.max(largest ?? 0, node.batchIntervalMs);
		}
	}

	return largest;
}

/** A node is alive while its last batch is within the fresh window of its own batch interval. */
export function nodeAlive(node: NodeHeartbeat, now: Date): boolean {
	return now.getTime() - node.lastSeenAt.getTime() <= freshnessWindows(node.batchIntervalMs).freshMs;
}

/** The stale window and the server clock of one response. */
export interface StaleContext {
	staleMs: number;
	now: Date;
}

/** `true` for an active entity whose last stats flush is older than `staleMs` at `now`, else undefined (no field). */
export function staleFlag(status: string, lastStatsAt: Date | undefined, staleMs: number, now: Date): true | undefined {
	return status === 'active' && lastStatsAt !== undefined && now.getTime() - lastStatsAt.getTime() > staleMs
		? true
		: undefined;
}

/** The item with `stale: true` when its entity is active and its last stats flush is older than the stale window. */
export function markStale<T extends object>(
	item: T,
	entity: { status: string; lastStatsAt?: Date },
	context: StaleContext
): T {
	return staleFlag(entity.status, entity.lastStatsAt, context.staleMs, context.now) === true
		? { ...item, stale: true }
		: item;
}

/** The freshness windows of the writer's batch interval, read from `nodes` and reused for a few seconds. */
export class WriterFreshness {
	private cached: { windows: FreshnessWindows; at: number } | undefined;

	constructor(
		private readonly db: Db,
		private readonly now: () => Date
	) {}

	async windows(): Promise<FreshnessWindows> {
		const now = this.now();

		if (this.cached !== undefined && now.getTime() - this.cached.at < WINDOWS_CACHE_MS) {
			return this.cached.windows;
		}

		const nodes = await this.db
			.collection<NodeDocument>(Collection.NODES)
			.find({}, { projection: { _id: 0, lastSeenAt: 1, batchIntervalMs: 1 } })
			.toArray();
		const windows = freshnessWindows(writerBatchInterval(nodes, now));

		this.cached = { windows, at: now.getTime() };

		return windows;
	}

	/** The stale window and the server clock to judge the entities of one response. */
	async staleContext(): Promise<StaleContext> {
		return { staleMs: (await this.windows()).staleMs, now: this.now() };
	}
}
