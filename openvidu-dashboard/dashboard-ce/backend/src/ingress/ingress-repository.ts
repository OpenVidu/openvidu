import type { Db, Document, Filter, Sort } from 'mongodb';

import {
	Collection,
	type HourlyRollupDocument,
	type IngressDocument,
	type IngressInputType,
	IngressStatus
} from '@openvidu-dashboard/typings';

import { INGRESS_LIST_PROJECTION } from './ingress-mappers.js';
import { activityRange } from './ingress-query.js';

export type IngressListDocument = Pick<
	IngressDocument,
	| '_id'
	| 'name'
	| 'inputType'
	| 'roomName'
	| 'participantIdentity'
	| 'status'
	| 'enabled'
	| 'reusable'
	| 'createdAt'
	| 'deletedAt'
	| 'sessions'
	| 'totalDurationMs'
	| 'lastSessionAt'
	| 'lastError'
>;

/** Ingress reads: definitions on the index of the list plan and the summary. */
export class IngressRepository {
	constructor(private readonly db: Db) {}

	get ingresses() {
		return this.db.collection<IngressDocument>(Collection.INGRESSES);
	}

	find(filter: Document, sort: Sort, limit: number, hint?: string): Promise<IngressListDocument[]> {
		return this.ingresses
			.find(filter as Filter<IngressDocument>, {
				projection: INGRESS_LIST_PROJECTION,
				...(hint === undefined ? {} : { hint })
			})
			.sort(sort)
			.limit(limit)
			.toArray();
	}

	count(filter: Document, hint?: string): Promise<number> {
		return this.ingresses.countDocuments(filter, hint === undefined ? {} : { hint });
	}

	countPublishing(): Promise<number> {
		return this.ingresses.countDocuments({ status: IngressStatus.PUBLISHING });
	}

	/** Ingresses created in `[from, to)` by input type, on `{ createdAt, _id }`. */
	/** The ingresses of the activity range of `[from, to)` per input type, as the list selects them. */
	async activeByInputType(from: Date, to: Date): Promise<Partial<Record<IngressInputType, number>>> {
		const groups = await this.ingresses
			.aggregate<{ _id: IngressInputType; n: number }>([
				{ $match: activityRange(from, to) },
				{ $group: { _id: '$inputType', n: { $sum: 1 } } }
			])
			.toArray();

		return Object.fromEntries(groups.map((group) => [group._id, group.n]));
	}

	/** Sums of the ingress counters of the global hourly rollups whose `_id` lies in `[first, last]`. */
	async rollupSessions(first: string, last: string): Promise<{ sessions: number; durationMs: number }> {
		const [sums] = await this.db
			.collection<HourlyRollupDocument>(Collection.ANALYTICS_HOURLY)
			.aggregate<{ sessions: number; durationMs: number }>([
				{ $match: { _id: { $gte: first, $lte: last } } },
				{
					$group: {
						_id: null,
						sessions: { $sum: '$ingress.sessionsStarted' },
						durationMs: { $sum: '$ingress.durationMs' }
					}
				}
			])
			.toArray();

		return { sessions: sums?.sessions ?? 0, durationMs: sums?.durationMs ?? 0 };
	}
}
