import type { Db, Document } from 'mongodb';

import {
	Collection,
	EGRESS_IN_FLIGHT_STATUSES,
	IngressSessionStatus,
	type NodeDocument,
	ParticipantKind,
	ParticipantStatus,
	type RoomDocument,
	RoomStatus
} from '@openvidu-dashboard/typings';

import type { Counters } from '../analytics/analytics-catalogue.js';
import { foldRows, totalCounters } from '../analytics/analytics-counters.js';
import { AnalyticsRepository } from '../analytics/analytics-repository.js';
import { RoomsRepository } from '../rooms/rooms-repository.js';

export const RECENT_ROOMS = 10;
export const TODAY_FIELDS = [
	'rooms.created',
	'participants.joined',
	'participants.minutes',
	'egress.started',
	'ingress.sessionsStarted'
] as const;

/** Active rooms of a node. */
export interface RoomGroup {
	_id: string | null;
	rooms: number;
	stale: number;
}

/** Active participants of one kind on a node. */
export interface ParticipantGroup {
	_id: { nodeId: string | null; kind: ParticipantKind };
	count: number;
	publishers: number;
	stale: number;
}

/** `1` when the document has stats older than `threshold`; documents without `lastStatsAt` never count. */
function staleCount(threshold: Date): Document {
	return {
		$sum: {
			$cond: [{ $and: [{ $gt: ['$lastStatsAt', null] }, { $lt: ['$lastStatsAt', threshold] }] }, 1, 0]
		}
	};
}

export function activeRoomsPipeline(threshold: Date): Document[] {
	return [
		{ $match: { status: RoomStatus.ACTIVE } },
		{ $group: { _id: '$nodeId', rooms: { $sum: 1 }, stale: staleCount(threshold) } }
	];
}

/** Every kind in the filter, so both `{ status, kind }` and `{ kind, status, joinedAt, _id }` can serve it. */
export function activeParticipantsPipeline(threshold: Date): Document[] {
	return [
		{ $match: { kind: { $in: Object.values(ParticipantKind) }, status: ParticipantStatus.ACTIVE } },
		{
			$group: {
				_id: { nodeId: '$nodeId', kind: '$kind' },
				count: { $sum: 1 },
				publishers: { $sum: { $cond: ['$isPublisher', 1, 0] } },
				stale: staleCount(threshold)
			}
		}
	];
}

export const IN_FLIGHT_EGRESS = { status: { $in: [...EGRESS_IN_FLIGHT_STATUSES] } };
export const PUBLISHING_INGRESS = { status: IngressSessionStatus.PUBLISHING };

/** The reads of the overview: active groups, in-flight counts, recent rooms, today's rollups and the nodes. */
export class OverviewRepository {
	private readonly rooms: RoomsRepository;
	private readonly rollups: AnalyticsRepository;

	constructor(private readonly db: Db) {
		this.rooms = new RoomsRepository(db);
		this.rollups = new AnalyticsRepository(db);
	}

	/** The MongoDB server clock, so freshness never depends on the dashboard host clock. */
	async now(fallback: Date): Promise<Date> {
		const hello = await this.db.command({ hello: 1 });

		return hello.localTime instanceof Date ? hello.localTime : fallback;
	}

	roomGroups(threshold: Date): Promise<RoomGroup[]> {
		return this.db
			.collection(Collection.ROOMS)
			.aggregate<RoomGroup>(activeRoomsPipeline(threshold), { hint: 'status_createdAt_id' })
			.toArray();
	}

	participantGroups(threshold: Date): Promise<ParticipantGroup[]> {
		return this.db
			.collection(Collection.PARTICIPANTS)
			.aggregate<ParticipantGroup>(activeParticipantsPipeline(threshold))
			.toArray();
	}

	inFlightEgresses(): Promise<number> {
		return this.db.collection(Collection.EGRESSES).countDocuments(IN_FLIGHT_EGRESS);
	}

	publishingIngressSessions(): Promise<number> {
		return this.db.collection(Collection.INGRESS_SESSIONS).countDocuments(PUBLISHING_INGRESS);
	}

	/** The newest rooms of any status, through the rooms list query. */
	recentRooms(): Promise<RoomDocument[]> {
		return this.rooms.list(
			{ status: { $in: [RoomStatus.ACTIVE, RoomStatus.CLOSED] } },
			{ createdAt: -1, _id: -1 },
			RECENT_ROOMS
		);
	}

	/** Sum of the global hourly rollups whose bucket starts in `[from, to]`. */
	async today(from: Date, to: Date): Promise<Counters> {
		const end = new Date(to.getTime() + 1);

		return totalCounters(
			await foldRows(this.rollups.rollups(Collection.ANALYTICS_HOURLY, 'global', from, end, TODAY_FIELDS), [from])
		);
	}

	nodes(): Promise<NodeDocument[]> {
		return this.db.collection<NodeDocument>(Collection.NODES).find({}).sort({ _id: 1 }).toArray();
	}
}
