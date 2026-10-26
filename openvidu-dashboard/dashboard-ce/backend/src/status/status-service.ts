import type { Db } from 'mongodb';

import { Collection, type NodeDocument, type StatusResponse, type StatusWriter } from '@openvidu-dashboard/typings';

import type { InfoService } from '../info/info-service.js';
import { compact } from '../util/compact.js';
import { type NodeHeartbeat, nodeAlive, writerBatchInterval } from './freshness.js';

export interface StatusServiceOptions {
	info: InfoService;
	/** Dashboard clock, used only when MongoDB does not report its own. */
	now: () => Date;
}

/** The newest batch of the nodes, their count, the alive ones and the writer's batch interval at `now`. */
export function foldWriter(nodes: readonly NodeHeartbeat[], now: Date): StatusWriter {
	const lastSeen = nodes.reduce<Date | undefined>(
		(newest, node) => (newest === undefined || node.lastSeenAt > newest ? node.lastSeenAt : newest),
		undefined
	);

	return compact<StatusWriter>({
		lastSeenAt: lastSeen?.toISOString(),
		nodes: nodes.length,
		aliveNodes: nodes.filter((node) => nodeAlive(node, now)).length,
		batchIntervalMs: writerBatchInterval(nodes, now)
	});
}

/** The server status: schema, migration and writer from `schema_meta`, `nodes` and the MongoDB clock. */
export class StatusService {
	constructor(
		private readonly db: Db,
		private readonly options: StatusServiceOptions
	) {}

	async status(): Promise<StatusResponse> {
		const [now, nodes, health] = await Promise.all([
			this.clock(),
			this.db
				.collection<NodeDocument>(Collection.NODES)
				.find({}, { projection: { lastSeenAt: 1, batchIntervalMs: 1 } })
				.toArray(),
			this.options.info.health()
		]);

		return {
			generatedAt: now.toISOString(),
			schema: health.schema,
			migration: health.migration,
			writer: foldWriter(nodes, now)
		};
	}

	private async clock(): Promise<Date> {
		const hello = await this.db.command({ hello: 1 });

		return hello.localTime instanceof Date ? hello.localTime : this.options.now();
	}
}
