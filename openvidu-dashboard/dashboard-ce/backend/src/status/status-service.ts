import type { Db } from 'mongodb';

import { Collection, type NodeDocument, type StatusResponse, type StatusWriter } from '@openvidu-dashboard/typings';

import { judgeJob, toDeletionJob } from '../deletions/deletion-records.js';
import type { InfoService } from '../info/info-service.js';
import { compact } from '../util/compact.js';
import { type NodeHeartbeat, nodeAlive, writerBatchInterval } from './freshness.js';

export interface StatusServiceOptions {
	info: InfoService;
	/** Dashboard clock, used only when MongoDB does not report its own. */
	now: () => Date;
}

/**
 * The newest batch of the nodes, the writer's batch interval and, when no node is alive at `now` and the newest one
 * stopped gracefully, its stop.
 */
export function foldWriter(nodes: readonly NodeHeartbeat[], now: Date): StatusWriter {
	const newest = nodes.reduce<NodeHeartbeat | undefined>(
		(found, node) => (found === undefined || node.lastSeenAt > found.lastSeenAt ? node : found),
		undefined
	);
	const stopped = newest?.stoppedAt !== undefined && !nodes.some((node) => nodeAlive(node, now));

	return compact<StatusWriter>({
		lastSeenAt: newest?.lastSeenAt.toISOString(),
		stoppedAt: stopped ? newest.stoppedAt?.toISOString() : undefined,
		batchIntervalMs: writerBatchInterval(nodes, now)
	});
}

/**
 * The server status: schema, migration, writer and the latest deletion job from `schema_meta`, `nodes` and the MongoDB
 * clock, which judges a running job without a heartbeat for 60 s interrupted.
 */
export class StatusService {
	constructor(
		private readonly db: Db,
		private readonly options: StatusServiceOptions
	) {}

	async status(): Promise<StatusResponse> {
		const [now, nodes, facts] = await Promise.all([
			this.clock(),
			this.db
				.collection<NodeDocument>(Collection.NODES)
				.find({}, { projection: { lastSeenAt: 1, batchIntervalMs: 1, stoppedAt: 1 } })
				.toArray(),
			this.options.info.statusFacts()
		]);
		const { health, dashboard } = facts;

		return {
			generatedAt: now.toISOString(),
			schema: health.schema,
			migration: health.migration,
			writer: foldWriter(nodes, now),
			...(dashboard?.deletion === undefined ? {} : { deletion: toDeletionJob(judgeJob(dashboard.deletion, now)) })
		};
	}

	private async clock(): Promise<Date> {
		const hello = await this.db.command({ hello: 1 });

		return hello.localTime instanceof Date ? hello.localTime : this.options.now();
	}
}
