import type { Db, Document } from 'mongodb';

import type { RollupRow } from './analytics-counters.js';
import type { RollupCollection } from './analytics-planner.js';

export const ROLLUP_INDEX = 'scope_bucket';
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
}
