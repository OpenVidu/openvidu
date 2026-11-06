import type { AggregateOptions, Db, Document } from 'mongodb';

import type { RollupRow } from './analytics-counters.js';
import type { RollupCollection } from './analytics-planner.js';

export const ROLLUP_INDEX = 'scope_bucket';

/** The media statistics marks found in a set of rollup documents. */
export interface MediaStatsMarks {
	reported: boolean;
	missing: boolean;
}

/** The aggregation behind `mediaStatsMarks`, on the `scope_bucket` index. */
export function mediaStatsMarksQuery(
	collection: RollupCollection,
	scope: string,
	from: Date,
	to: Date
): { collection: RollupCollection; pipeline: Document[]; options: AggregateOptions } {
	return {
		collection,
		pipeline: [
			{ $match: { scope, bucket: { $gte: from, $lt: to } } },
			{
				$group: {
					_id: null,
					reported: { $max: '$mediaStats.reported' },
					missing: { $max: '$mediaStats.missing' }
				}
			}
		],
		options: { hint: ROLLUP_INDEX }
	};
}

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
	 * Whether the rollup documents of `scope` whose bucket starts in `[from, to)` were written by a server that reports
	 * media statistics (`reported`) and by one that does not (`missing`).
	 */
	async mediaStatsMarks(collection: RollupCollection, scope: string, from: Date, to: Date): Promise<MediaStatsMarks> {
		const query = mediaStatsMarksQuery(collection, scope, from, to);
		const [marks] = await this.db
			.collection(query.collection)
			.aggregate<{ reported: boolean | null; missing: boolean | null }>(query.pipeline, query.options)
			.toArray();

		return { reported: marks?.reported === true, missing: marks?.missing === true };
	}
}
