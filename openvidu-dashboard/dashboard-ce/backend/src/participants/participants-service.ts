import type { Db, Document, Filter, Sort } from 'mongodb';

import {
	Collection,
	type ListResponse,
	type HourlyRollupDocument,
	type ParticipantDocument,
	ParticipantKind,
	type ParticipantListItem,
	ParticipantStatus,
	type ParticipantsSummary
} from '@openvidu-dashboard/typings';

import { buildPage, cursorOrThrow } from '../api/cursor.js';
import { assertRankedRange, rankedPage } from '../api/ranked.js';
import { rankedSortLimits } from '../api/ranked-limits.js';
import { markStale, type WriterFreshness } from '../status/freshness.js';
import { toParticipantListItem } from './participants-mappers.js';
import { PARTICIPANT_LIST_PROJECTION, type ParticipantsFilter, participantsListPlan } from './participants-query.js';
import type { AgentsListParams, ParticipantsListParams, ParticipantsSummaryParams } from './participants-schemas.js';

export interface ParticipantsServiceOptions {
	/** Longest range, in milliseconds, whose list `total` is exact (`DASHBOARD_LIST_TOTAL_MAX_RANGE`). */
	totalMaxRangeMs: number;
	/** The stale window of the writer's batch interval. */
	freshness: WriterFreshness;
	now: () => Date;
}

const JOINED_AT = 'joinedAt';

const HOUR_MS = 3_600_000;
const KINDS = Object.values(ParticipantKind);

type CountByKind = Record<ParticipantKind, number>;

/** Every kind at 0, plus the given counts; a kind newer than this dashboard is left out. */
function byKind(counts: readonly { _id: string; n: number }[]): CountByKind {
	const result = Object.fromEntries(KINDS.map((kind) => [kind, 0])) as CountByKind;

	for (const { _id, n } of counts) {
		if (Object.hasOwn(result, _id)) {
			result[_id as ParticipantKind] = n;
		}
	}

	return result;
}

/** `_id` of the global hourly rollup of `bucket`: RFC 3339 UTC without fractional seconds. */
function globalHourlyId(bucket: number): string {
	return `global:${new Date(bucket).toISOString().replace('.000Z', 'Z')}`;
}

/** Participants and agents lists and their summary. */
export class ParticipantsService {
	constructor(
		private readonly db: Db,
		private readonly options: ParticipantsServiceOptions
	) {}

	private get participants() {
		return this.db.collection<ParticipantDocument>(Collection.PARTICIPANTS);
	}

	private exactRange(from: Date, to: Date): boolean {
		return to.getTime() - from.getTime() <= this.options.totalMaxRangeMs;
	}

	/** STANDARD participants and, apart, the other kinds: active now and joined in the range. */
	async summary(params: ParticipantsSummaryParams): Promise<ParticipantsSummary> {
		const exact = this.exactRange(params.from, params.to);
		const [active, sessions] = await Promise.all([
			this.countByKind({ status: ParticipantStatus.ACTIVE, kind: { $in: KINDS } }),
			exact
				? this.countByKind({ joinedAt: { $gte: params.from, $lt: params.to } })
				: this.rollupSessions(params.from, params.to)
		]);
		const activeTotal = active.reduce((sum, { n }) => sum + n, 0);
		const activeByKind = byKind(active);
		const sessionsByKind = byKind(sessions);

		return {
			active: {
				participants: activeByKind.STANDARD,
				services: activeTotal - activeByKind.STANDARD,
				byKind: activeByKind
			},
			sessions: { participants: sessionsByKind.STANDARD, byKind: sessionsByKind },
			approximate: !exact
		};
	}

	/** Sessions per kind matching `match`. */
	private countByKind(match: Filter<ParticipantDocument>): Promise<{ _id: string; n: number }[]> {
		return this.participants
			.aggregate<{ _id: string; n: number }>([{ $match: match }, { $group: { _id: '$kind', n: { $sum: 1 } } }])
			.toArray();
	}

	/** Sessions per kind joined in the global hourly buckets that start inside `[from, to)`. */
	private async rollupSessions(from: Date, to: Date): Promise<{ _id: string; n: number }[]> {
		const first = Math.ceil(from.getTime() / HOUR_MS) * HOUR_MS;
		const last = Math.ceil(to.getTime() / HOUR_MS) * HOUR_MS - HOUR_MS;

		if (last < first) {
			return [];
		}

		const [sums] = await this.db
			.collection<HourlyRollupDocument>(Collection.ANALYTICS_HOURLY)
			.aggregate<Record<string, number>>([
				{ $match: { _id: { $gte: globalHourlyId(first), $lte: globalHourlyId(last) } } },
				{
					$group: {
						_id: null,
						...Object.fromEntries(KINDS.map((kind) => [kind, { $sum: `$participants.byKind.${kind}` }]))
					}
				}
			])
			.toArray();

		return KINDS.map((kind) => ({ _id: kind, n: sums?.[kind] ?? 0 }));
	}

	list(params: ParticipantsListParams): Promise<ListResponse<ParticipantListItem>> {
		return this.page(params, params);
	}

	/** The participants list of kind `AGENT`. */
	agents(params: AgentsListParams): Promise<ListResponse<ParticipantListItem>> {
		return this.page(params, { ...params, kind: [ParticipantKind.AGENT] });
	}

	private async page(
		params: { cursor?: string | undefined; limit: number; from: Date; to: Date; order: 'asc' | 'desc' },
		filter: ParticipantsFilter
	): Promise<ListResponse<ParticipantListItem>> {
		const cursor = cursorOrThrow(params.cursor, filter.sort, params.order);
		const plan = participantsListPlan(filter, cursor);

		if (plan.kind === 'sid') {
			const [docs, context] = await Promise.all([
				this.find(plan.filter, { _id: 1 }, 1),
				this.options.freshness.staleContext()
			]);

			return {
				items: docs.map((doc) => markStale(toParticipantListItem(doc), doc, context)),
				nextCursor: null,
				prevCursor: null,
				total: docs.length
			};
		}

		const hint = plan.hint === undefined ? {} : { hint: plan.hint };

		if (plan.kind === 'ranked') {
			if (filter.room === undefined) {
				assertRankedRange(
					params,
					rankedSortLimits(this.options.totalMaxRangeMs).participantRankedSortMaxRangeMs,
					filter.sort
				);
			}

			const [ranked, total, context] = await Promise.all([
				rankedPage<ParticipantDocument>(this.participants, {
					match: plan.match,
					rank: plan.rank,
					projection: PARTICIPANT_LIST_PROJECTION,
					...hint,
					sort: filter.sort,
					order: params.order,
					cursor,
					limit: params.limit,
					now: this.options.now()
				}),
				this.exactRange(params.from, params.to)
					? this.participants.countDocuments(plan.countFilter as Filter<ParticipantDocument>, hint)
					: undefined,
				this.options.freshness.staleContext()
			]);

			return {
				...ranked,
				items: ranked.items.map((doc) => markStale(toParticipantListItem(doc), doc, context)),
				...(total === undefined ? {} : { total })
			};
		}

		const [fetched, total, context] = await Promise.all([
			this.find(plan.filter, plan.sort, params.limit + 1, plan.hint),
			this.exactRange(params.from, params.to)
				? this.participants.countDocuments(plan.countFilter as Filter<ParticipantDocument>, hint)
				: undefined,
			this.options.freshness.staleContext()
		]);
		const page = buildPage(
			fetched,
			params.limit,
			plan.page,
			cursor !== undefined,
			(doc) => ({ value: doc.joinedAt, id: doc._id }),
			{ sort: JOINED_AT, order: params.order }
		);

		return {
			...page,
			items: page.items.map((doc) => markStale(toParticipantListItem(doc), doc, context)),
			...(total === undefined ? {} : { total })
		};
	}

	private find(filter: Document, sort: Sort, limit: number, hint?: string): Promise<ParticipantDocument[]> {
		return this.participants
			.find(filter as Filter<ParticipantDocument>, {
				projection: PARTICIPANT_LIST_PROJECTION,
				...(hint === undefined ? {} : { hint })
			})
			.sort(sort)
			.limit(limit)
			.toArray();
	}
}
