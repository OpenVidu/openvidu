import type { Db, Document, FindCursor } from 'mongodb';

import { Collection, type NodeDocument } from '@openvidu-dashboard/typings';

import type { RollupRow } from './analytics-counters.js';
import type { RollupCollection } from './analytics-planner.js';

export const ROLLUP_INDEX = 'scope_bucket';
const NODE_SCOPE_PREFIX = 'node:';
/** Rollup reads on `{ scope, bucket }`. */
export class AnalyticsRepository {
	constructor(private readonly db: Db) {}

	/** Projected rollup documents of `scope` whose bucket starts in `[from, to)`, ascending. */
	rollups(
		collection: RollupCollection,
		scope: string,
		from: Date,
		to: Date,
		fields: readonly string[]
	): AsyncIterable<RollupRow> {
		const projection: Document = { _id: 0, bucket: 1 };

		for (const field of fields) {
			projection[field] = 1;
		}

		return this.db
			.collection(collection)
			.find<RollupRow>({ scope, bucket: { $gte: from, $lt: to } }, { projection, hint: ROLLUP_INDEX })
			.sort({ bucket: 1 });
	}

	/**
	 * The `mediaStats` of the node documents of `scope` (every one for `global`, those with the media node label of a node
	 * scope) whose heartbeats span overlaps `[from, to]`, on `lastSeenAt`.
	 */
	nodesInRange(scope: string, from: Date, to: Date): FindCursor<Pick<NodeDocument, 'mediaStats'>> {
		const filter: Document = { lastSeenAt: { $gte: from }, firstSeenAt: { $lte: to } };

		if (scope.startsWith(NODE_SCOPE_PREFIX)) {
			filter.mediaNode = scope.slice(NODE_SCOPE_PREFIX.length);
		}

		return this.db
			.collection<NodeDocument>(Collection.NODES)
			.find<Pick<NodeDocument, 'mediaStats'>>(filter, { projection: { _id: 0, mediaStats: 1 } });
	}

	async nodesMediaStats(scope: string, from: Date, to: Date): Promise<(boolean | undefined)[]> {
		return (await this.nodesInRange(scope, from, to).toArray()).map((node) => node.mediaStats);
	}
}
