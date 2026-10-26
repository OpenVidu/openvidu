import type { Db } from 'mongodb';

import { type ListResponse, type RoomListItem, type RoomSummary } from '@openvidu-dashboard/typings';

import { buildPage, cursorOrThrow } from '../api/cursor.js';
import { assertRankedRange } from '../api/ranked.js';
import { markStale, type WriterFreshness } from '../status/freshness.js';
import { toRoomListItem } from './rooms-mappers.js';
import { roomsListPlan } from './rooms-query.js';
import { RoomsRepository } from './rooms-repository.js';
import type { RoomsListParams } from './rooms-schemas.js';

export interface RoomsServiceOptions {
	/** Longest range, in milliseconds, whose list `total` and summary counts are exact (`DASHBOARD_LIST_TOTAL_MAX_RANGE`). */
	totalMaxRangeMs: number;
	/** The stale window of the writer's batch interval. */
	freshness: WriterFreshness;
	now: () => Date;
}

const HOUR_MS = 3_600_000;

/** `_id` of the global hourly rollup of `bucket`: RFC 3339 UTC without fractional seconds. */
function globalHourlyId(bucket: number): string {
	return `global:${new Date(bucket).toISOString().replace('.000Z', 'Z')}`;
}

/** Rooms list and summary over the analytics collections. */
export class RoomsService {
	private readonly repository: RoomsRepository;

	constructor(
		db: Db,
		private readonly options: RoomsServiceOptions
	) {
		this.repository = new RoomsRepository(db);
	}

	private exactRange(from: Date, to: Date): boolean {
		return to.getTime() - from.getTime() <= this.options.totalMaxRangeMs;
	}

	async list(params: RoomsListParams): Promise<ListResponse<RoomListItem>> {
		const cursor = cursorOrThrow(params.cursor, params.sort, params.order);
		const plan = roomsListPlan(params, cursor);

		if (plan.kind === 'sid') {
			const [rooms, context] = await Promise.all([
				this.repository.list(plan.filter, { _id: 1 }, 1),
				this.options.freshness.staleContext()
			]);

			return {
				items: rooms.map((room) => markStale(toRoomListItem(room), room, context)),
				nextCursor: null,
				prevCursor: null,
				total: rooms.length
			};
		}

		if (plan.kind === 'ranked') {
			assertRankedRange(params, this.options.totalMaxRangeMs, params.sort);

			const [ranked, total, context] = await Promise.all([
				this.repository.ranked({
					match: plan.match,
					rank: plan.rank,
					sort: params.sort,
					order: params.order,
					cursor,
					limit: params.limit,
					now: this.options.now()
				}),
				this.exactRange(params.from, params.to) ? this.repository.count(plan.countFilter) : undefined,
				this.options.freshness.staleContext()
			]);

			return {
				...ranked,
				items: ranked.items.map((room) => markStale(toRoomListItem(room), room, context)),
				...(total === undefined ? {} : { total })
			};
		}

		const [fetched, total, context] = await Promise.all([
			this.repository.list(plan.filter, plan.sort, params.limit + 1),
			this.exactRange(params.from, params.to) ? this.repository.count(plan.countFilter) : undefined,
			this.options.freshness.staleContext()
		]);
		const page = buildPage(
			fetched,
			params.limit,
			plan.page,
			cursor !== undefined,
			(room) => ({ value: room.createdAt, id: room._id }),
			{ sort: params.sort, order: params.order }
		);

		return {
			...page,
			items: page.items.map((room) => markStale(toRoomListItem(room), room, context)),
			...(total === undefined ? {} : { total })
		};
	}

	async summary(range: { from: Date; to: Date }): Promise<RoomSummary> {
		const exact = this.exactRange(range.from, range.to);
		const counts = exact
			? Promise.all([
					this.repository.countRoomsCreated(range.from, range.to),
					this.repository.countParticipantSessions(range.from, range.to)
				])
			: this.rollupCounts(range.from, range.to);
		const [activeRooms, activeParticipants, [roomsInRange, participantSessions]] = await Promise.all([
			this.repository.countActiveRooms(),
			this.repository.countActiveParticipants(),
			counts
		]);

		return { activeRooms, roomsInRange, participantSessions, activeParticipants, approximate: !exact };
	}

	/** Rooms created and sessions joined in the hourly buckets that start inside `[from, to)`. */
	private async rollupCounts(from: Date, to: Date): Promise<[number, number]> {
		const first = Math.ceil(from.getTime() / HOUR_MS) * HOUR_MS;
		const last = Math.ceil(to.getTime() / HOUR_MS) * HOUR_MS - HOUR_MS;

		if (last < first) {
			return [0, 0];
		}

		const sums = await this.repository.sumGlobalHourly(globalHourlyId(first), globalHourlyId(last));

		return [sums.rooms, sums.participants];
	}
}
