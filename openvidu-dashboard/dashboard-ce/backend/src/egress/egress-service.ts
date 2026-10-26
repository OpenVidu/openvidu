import type { Db } from 'mongodb';

import type { EgressDocument, EgressListItem, EgressSummary, ListResponse } from '@openvidu-dashboard/typings';

import { buildPage, type CursorPayload, cursorOrThrow, pageQuery } from '../api/cursor.js';
import { indexOrderedPage } from '../api/keyset.js';
import { assertRankedRange, rankedPage } from '../api/ranked.js';
import { EGRESS_LIST_PROJECTION, toEgressListItem } from './egress-mappers.js';
import { egressesListPlan } from './egress-query.js';
import { EgressRepository } from './egress-repository.js';
import type { EgressesListParams } from './egress-schemas.js';

export interface EgressServiceOptions {
	/** Longest range, in milliseconds, whose list `total` and summary figures are exact (`DASHBOARD_LIST_TOTAL_MAX_RANGE`). */
	totalMaxRangeMs: number;
	now: () => Date;
}

const STARTED_AT = 'startedAt';
const HOUR_MS = 3_600_000;

/** `_id` of the global hourly rollup of `bucket`: RFC 3339 UTC without fractional seconds. */
function globalHourlyId(bucket: number): string {
	return `global:${new Date(bucket).toISOString().replace('.000Z', 'Z')}`;
}

/** Egresses list and summary. */
export class EgressService {
	private readonly repository: EgressRepository;

	constructor(
		db: Db,
		private readonly options: EgressServiceOptions
	) {
		this.repository = new EgressRepository(db);
	}

	private exactRange(from: Date, to: Date): boolean {
		return to.getTime() - from.getTime() <= this.options.totalMaxRangeMs;
	}

	async list(params: EgressesListParams): Promise<ListResponse<EgressListItem>> {
		const plan = egressesListPlan(params);

		if (plan.kind === 'id') {
			const docs = await this.repository.find(plan.filter, { _id: 1 }, 1);

			return { items: docs.map(toEgressListItem), nextCursor: null, prevCursor: null, total: docs.length };
		}

		const cursor = cursorOrThrow(params.cursor, params.sort, params.order);
		const { filter, hint } = plan;
		const countFilter = { ...filter, startedAt: { $gte: params.from, $lt: params.to } };
		const total = this.exactRange(params.from, params.to) ? this.repository.count(countFilter, hint) : undefined;

		if (plan.kind === 'ranked') {
			assertRankedRange(params, this.options.totalMaxRangeMs, params.sort);

			const [ranked, counted] = await Promise.all([
				rankedPage<EgressDocument>(this.repository.egresses, {
					match: countFilter,
					rank: plan.rank,
					projection: EGRESS_LIST_PROJECTION,
					hint,
					sort: params.sort,
					order: params.order,
					cursor,
					limit: params.limit,
					now: this.options.now()
				}),
				total
			]);

			return {
				...ranked,
				items: ranked.items.map(toEgressListItem),
				...(counted === undefined ? {} : { total: counted })
			};
		}

		const [page, counted] = await Promise.all([
			hint === 'startedAt_id' || hint === 'roomNameLower_startedAt'
				? this.sortedPage(filter, hint, params, cursor)
				: this.indexOrdered(filter, hint, params, cursor),
			total
		]);

		return {
			...page,
			items: page.items.map(toEgressListItem),
			...(counted === undefined ? {} : { total: counted })
		};
	}

	/** A page sorted on `{ startedAt, _id }`: in index order on `startedAt_id`, in memory over a room name prefix. */
	private async sortedPage(
		filter: Record<string, unknown>,
		hint: string,
		params: EgressesListParams,
		cursor?: CursorPayload
	) {
		const query = pageQuery(STARTED_AT, params.order, cursor, { from: params.from, to: params.to });
		const fetched = await this.repository.find({ ...filter, ...query.filter }, query.sort, params.limit + 1, hint);

		return buildPage(
			fetched,
			params.limit,
			query,
			cursor !== undefined,
			(doc) => ({ value: doc.startedAt, id: doc._id }),
			{
				sort: STARTED_AT,
				order: params.order
			}
		);
	}

	/** A page on an index that orders by `startedAt` but not by `_id`; ties are read with a point query. */
	private indexOrdered(
		filter: Record<string, unknown>,
		hint: string,
		params: EgressesListParams,
		cursor?: CursorPayload
	) {
		return indexOrderedPage<EgressDocument>({
			collection: this.repository.egresses,
			filter,
			field: STARTED_AT,
			order: params.order,
			cursor,
			limit: params.limit,
			range: { from: params.from, to: params.to },
			hint,
			projection: EGRESS_LIST_PROJECTION
		});
	}

	async summary(range: { from: Date; to: Date }): Promise<EgressSummary> {
		const exact = this.exactRange(range.from, range.to);
		const [active, figures] = await Promise.all([
			this.repository.countInFlight(),
			exact ? this.repository.rangeFigures(range.from, range.to) : this.rollupFigures(range.from, range.to)
		]);

		return { active, ...figures, approximate: !exact };
	}

	/** Egress figures of the hourly buckets that start inside `[from, to)`. */
	private rollupFigures(from: Date, to: Date) {
		const first = Math.ceil(from.getTime() / HOUR_MS) * HOUR_MS;
		const last = Math.ceil(to.getTime() / HOUR_MS) * HOUR_MS - HOUR_MS;

		return last < first
			? Promise.resolve({ startedInRange: 0, byType: {}, byEndStatus: {}, totalDurationMs: 0 })
			: this.repository.rollupFigures(globalHourlyId(first), globalHourlyId(last));
	}
}
