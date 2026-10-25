import type { Db, Document, Filter, Sort } from 'mongodb';

import {
	Collection,
	EGRESS_IN_FLIGHT_STATUSES,
	type EgressDocument,
	type EgressStatus,
	type EgressType,
	type HourlyRollupDocument
} from '@openvidu-dashboard/typings';

import { EGRESS_LIST_PROJECTION } from './egress-mappers.js';

export type EgressListDocument = Pick<
	EgressDocument,
	| '_id'
	| 'roomSid'
	| 'roomName'
	| 'type'
	| 'sourceType'
	| 'status'
	| 'closedBy'
	| 'startedAt'
	| 'endedAt'
	| 'durationMs'
	| 'error'
	| 'errorCode'
	| 'outputs'
>;

export interface EgressRangeFigures {
	startedInRange: number;
	byType: Partial<Record<EgressType, number>>;
	byEndStatus: Partial<Record<EgressStatus, number>>;
	totalDurationMs: number;
}

const TERMINAL: readonly EgressStatus[] = ['complete', 'failed', 'aborted', 'limit_reached'];

/** Egress reads: the list on the index of its plan and the summary. */
export class EgressRepository {
	constructor(private readonly db: Db) {}

	get egresses() {
		return this.db.collection<EgressDocument>(Collection.EGRESSES);
	}

	find(filter: Document, sort: Sort, limit: number, hint?: string): Promise<EgressListDocument[]> {
		return this.egresses
			.find(filter as Filter<EgressDocument>, {
				projection: EGRESS_LIST_PROJECTION,
				...(hint === undefined ? {} : { hint })
			})
			.sort(sort)
			.limit(limit)
			.toArray();
	}

	count(filter: Document, hint: string): Promise<number> {
		return this.egresses.countDocuments(filter, { hint });
	}

	countInFlight(): Promise<number> {
		return this.egresses.countDocuments({ status: { $in: [...EGRESS_IN_FLIGHT_STATUSES] } });
	}

	/** Figures of the egresses started in `[from, to)`, grouped on `{ startedAt, _id }`. */
	async rangeFigures(from: Date, to: Date): Promise<EgressRangeFigures> {
		const [row] = await this.egresses
			.aggregate<{
				startedInRange: { n: number }[];
				byType: { _id: EgressType; n: number }[];
				byEndStatus: { _id: EgressStatus; n: number }[];
				duration: { ms: number }[];
			}>(
				[
					{ $match: { startedAt: { $gte: from, $lt: to } } },
					{ $project: { _id: 0, type: 1, status: 1, durationMs: 1 } },
					{
						$facet: {
							startedInRange: [{ $count: 'n' }],
							byType: [{ $group: { _id: '$type', n: { $sum: 1 } } }],
							byEndStatus: [
								{ $match: { status: { $in: [...TERMINAL] } } },
								{ $group: { _id: '$status', n: { $sum: 1 } } }
							],
							duration: [
								{ $match: { status: { $in: [...TERMINAL] } } },
								{ $group: { _id: null, ms: { $sum: { $ifNull: ['$durationMs', 0] } } } }
							]
						}
					}
				],
				{ hint: 'startedAt_id' }
			)
			.toArray();

		return {
			startedInRange: row?.startedInRange[0]?.n ?? 0,
			byType: Object.fromEntries((row?.byType ?? []).map((entry) => [entry._id, entry.n])),
			byEndStatus: Object.fromEntries((row?.byEndStatus ?? []).map((entry) => [entry._id, entry.n])),
			totalDurationMs: row?.duration[0]?.ms ?? 0
		};
	}

	/** Sums of the egress counters of the global hourly rollups whose `_id` lies in `[first, last]`. */
	async rollupFigures(first: string, last: string): Promise<EgressRangeFigures> {
		const docs = await this.db
			.collection<HourlyRollupDocument>(Collection.ANALYTICS_HOURLY)
			.find({ _id: { $gte: first, $lte: last } }, { projection: { egress: 1 } })
			.toArray();
		const figures: EgressRangeFigures = { startedInRange: 0, byType: {}, byEndStatus: {}, totalDurationMs: 0 };
		const add = <K extends string>(target: Partial<Record<K, number>>, counts: Partial<Record<K, number>> = {}) => {
			for (const [key, value] of Object.entries(counts) as [K, number | undefined][]) {
				target[key] = (target[key] ?? 0) + (value ?? 0);
			}
		};

		for (const doc of docs) {
			figures.startedInRange += doc.egress?.started ?? 0;
			figures.totalDurationMs += doc.egress?.durationMs ?? 0;
			add(figures.byType, doc.egress?.byType);
			add(figures.byEndStatus, doc.egress?.endedByStatus);
		}

		return figures;
	}
}
