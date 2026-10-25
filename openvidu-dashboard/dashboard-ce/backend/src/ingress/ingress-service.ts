import type { Db } from 'mongodb';

import {
	type IngressDocument,
	IngressInputType,
	type IngressListItem,
	IngressSort,
	type IngressSummary,
	type ListResponse
} from '@openvidu-dashboard/typings';

import { cursorOrThrow } from '../api/cursor.js';
import { assertRankedRange, rankedPage } from '../api/ranked.js';
import { INGRESS_LIST_PROJECTION, toIngressListItem } from './ingress-mappers.js';
import { ingressesListPlan } from './ingress-query.js';
import { IngressRepository } from './ingress-repository.js';
import type { IngressesListParams } from './ingress-schemas.js';

export interface IngressServiceOptions {
	/** Longest range, in milliseconds, whose list `total` is exact (`DASHBOARD_LIST_TOTAL_MAX_RANGE`). */
	totalMaxRangeMs: number;
	now: () => Date;
}

const HOUR_MS = 3_600_000;

/** `_id` of the global hourly rollup of `bucket`: RFC 3339 UTC without fractional seconds. */
function globalHourlyId(bucket: number): string {
	return `global:${new Date(bucket).toISOString().replace('.000Z', 'Z')}`;
}

/** Ingresses list and summary. */
export class IngressService {
	private readonly repository: IngressRepository;

	constructor(
		db: Db,
		private readonly options: IngressServiceOptions
	) {
		this.repository = new IngressRepository(db);
	}

	private exactRange(from: Date, to: Date): boolean {
		return to.getTime() - from.getTime() <= this.options.totalMaxRangeMs;
	}

	async list(params: IngressesListParams): Promise<ListResponse<IngressListItem>> {
		const plan = ingressesListPlan(params);

		if (plan.kind === 'id') {
			const docs = await this.repository.find(plan.filter, { _id: 1 }, 1);

			return { items: docs.map(toIngressListItem), nextCursor: null, prevCursor: null, total: docs.length };
		}

		if (params.sort !== IngressSort.CREATED_AT) {
			assertRankedRange(params, this.options.totalMaxRangeMs, params.sort);
		}

		const cursor = cursorOrThrow(params.cursor, params.sort, params.order);
		const [page, total] = await Promise.all([
			rankedPage<IngressDocument>(this.repository.ingresses, {
				match: plan.match,
				rank: plan.rank,
				projection: INGRESS_LIST_PROJECTION,
				sort: params.sort,
				order: params.order,
				cursor,
				limit: params.limit,
				now: this.options.now()
			}),
			this.exactRange(params.from, params.to) ? this.repository.count(plan.match) : undefined
		]);

		return { ...page, items: page.items.map(toIngressListItem), ...(total === undefined ? {} : { total }) };
	}

	async summary(range: { from: Date; to: Date }): Promise<IngressSummary> {
		const first = Math.ceil(range.from.getTime() / HOUR_MS) * HOUR_MS;
		const last = Math.ceil(range.to.getTime() / HOUR_MS) * HOUR_MS - HOUR_MS;
		const [publishingNow, byInputType, sessions] = await Promise.all([
			this.repository.countPublishing(),
			this.repository.activeByInputType(range.from, range.to),
			last < first
				? Promise.resolve({ sessions: 0, durationMs: 0 })
				: this.repository.rollupSessions(globalHourlyId(first), globalHourlyId(last))
		]);
		const counts = Object.fromEntries(
			Object.values(IngressInputType).map((type) => [type, byInputType[type] ?? 0])
		) as IngressSummary['byInputType'];

		return {
			publishingNow,
			ingressesInRange: Object.values(counts).reduce((sum, n) => sum + n, 0),
			byInputType: counts,
			sessionsInRange: sessions.sessions,
			totalDurationMs: sessions.durationMs,
			approximate: range.from.getTime() % HOUR_MS !== 0 || range.to.getTime() % HOUR_MS !== 0
		};
	}
}
