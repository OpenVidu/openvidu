import type { Db, Document, Filter, Sort } from 'mongodb';

import {
	Collection,
	type HourlyRollupDocument,
	ParticipantKind,
	type ParticipantDocument,
	ParticipantStatus,
	type RoomDocument,
	RoomStatus
} from '@openvidu-dashboard/typings';

import { rankedPage, type RankedPage, type RankedPageRequest } from '../api/ranked.js';
import { ROOM_LIST_PROJECTION } from './rooms-query.js';

/**
 * STANDARD sessions in any status: the four point intervals of `kind_status_joinedAt_id` bound a `joinedAt` range
 * tightly, where an absent `status` would scan every STANDARD key.
 */
export const STANDARD_SESSIONS = {
	kind: ParticipantKind.STANDARD,
	status: { $in: Object.values(ParticipantStatus) }
} as const;

/** MongoDB access of the rooms queries; every query names its index. */
export class RoomsRepository {
	constructor(private readonly db: Db) {}

	private get rooms() {
		return this.db.collection<RoomDocument>(Collection.ROOMS);
	}

	private get participants() {
		return this.db.collection<ParticipantDocument>(Collection.PARTICIPANTS);
	}

	list(filter: Document, sort: Sort, limit: number): Promise<RoomDocument[]> {
		return this.rooms
			.find(filter as Filter<RoomDocument>, { projection: ROOM_LIST_PROJECTION })
			.sort(sort)
			.limit(limit)
			.toArray();
	}

	count(filter: Document): Promise<number> {
		return this.rooms.countDocuments(filter);
	}

	/** One page of a ranked sort over the rooms matching `request.match`. */
	ranked(request: Omit<RankedPageRequest, 'projection'>): Promise<RankedPage<RoomDocument>> {
		return rankedPage<RoomDocument>(this.rooms, {
			...request,
			projection: ROOM_LIST_PROJECTION
		});
	}

	countActiveRooms(): Promise<number> {
		return this.rooms.countDocuments({ status: RoomStatus.ACTIVE });
	}

	countActiveParticipants(): Promise<number> {
		return this.participants.countDocuments({ status: ParticipantStatus.ACTIVE, kind: ParticipantKind.STANDARD });
	}

	countRoomsCreated(from: Date, to: Date): Promise<number> {
		return this.rooms.countDocuments({ createdAt: { $gte: from, $lt: to } });
	}

	countParticipantSessions(from: Date, to: Date): Promise<number> {
		return this.participants.countDocuments({ ...STANDARD_SESSIONS, joinedAt: { $gte: from, $lt: to } });
	}

	/** Sums of `rooms.created` and `participants.joined` of the global hourly rollups with `_id` in `[first, last]`. */
	async sumGlobalHourly(first: string, last: string): Promise<{ rooms: number; participants: number }> {
		const [sums] = await this.db
			.collection<HourlyRollupDocument>(Collection.ANALYTICS_HOURLY)
			.aggregate<{ rooms: number; participants: number }>([
				{ $match: { _id: { $gte: first, $lte: last } } },
				{
					$group: {
						_id: null,
						rooms: { $sum: '$rooms.created' },
						participants: { $sum: '$participants.joined' }
					}
				}
			])
			.toArray();

		return { rooms: sums?.rooms ?? 0, participants: sums?.participants ?? 0 };
	}
}
