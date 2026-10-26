import type { ParticipantKind } from '../data-model/enums.js';
import type { RoomListItem } from './rooms.js';

export interface OverviewQuery {
	/** IANA zone of "today"; default `UTC`. */
	tz?: string;
}

export interface OverviewStale {
	rooms: number;
	participants: number;
	olderThanMs: number;
}

export interface OverviewLive {
	rooms: number;
	/** Active STANDARD sessions. */
	participants: number;
	/** Active sessions of every other kind. */
	services: number;
	participantsByKind: Record<ParticipantKind, number>;
	/** Active STANDARD sessions that publish. */
	publishers: number;
	/** Egresses in flight. */
	egresses: number;
	ingressSessions: number;
	stale: OverviewStale;
}

/** Sums of the global hourly rollups since local midnight of `tz`. */
export interface OverviewToday {
	tz: string;
	/** Local midnight of `tz`, ISO 8601 UTC. */
	since: string;
	rooms: number;
	participantSessions: number;
	/** Minutes of the sessions that ended today. */
	participantMinutes: number;
	egresses: number;
	ingressSessions: number;
	/** `since` is not on an hour boundary: the first hourly bucket starts before it. */
	approximate: boolean;
}

export type OverviewRecentRoom = Pick<
	RoomListItem,
	'sid' | 'name' | 'status' | 'createdAt' | 'endedAt' | 'durationMs' | 'closedBy' | 'nodeId' | 'lastStatsAt' | 'stale'
> & { participants: Pick<RoomListItem['participants'], 'active' | 'sessions' | 'unique'> };

/** `GET /api/v1/overview`. */
export interface OverviewResponse {
	/** Time of the MongoDB read the counters come from. */
	generatedAt: string;
	live: OverviewLive;
	today: OverviewToday;
	/** At most 10 rooms of any status, newest first. */
	recentRooms: OverviewRecentRoom[];
}
