import type { ByteTotals } from '../data-model/common.js';
import type { ClosedBy, RoomStatus } from '../data-model/enums.js';
import type { ListQuery } from './lists.js';

/** Status filter of the rooms list; `all` is the default. */
export const RoomStatusFilter = {
	ACTIVE: 'active',
	CLOSED: 'closed',
	ALL: 'all'
} as const;
export type RoomStatusFilter = (typeof RoomStatusFilter)[keyof typeof RoomStatusFilter];

/** Room features the list filters on, each backed by a flag of the room document. */
export const RoomFeature = {
	EGRESS: 'egress',
	INGRESS: 'ingress',
	AGENT: 'agent',
	SIP: 'sip'
} as const;
export type RoomFeature = (typeof RoomFeature)[keyof typeof RoomFeature];

/** Sort keys of the rooms list: `createdAt` in index order, the others ranked over the range. */
export const RoomSort = {
	CREATED_AT: 'createdAt',
	ENDED_AT: 'endedAt',
	DURATION: 'duration',
	UNIQUE_IDENTITIES: 'uniqueIdentities',
	ACTIVE: 'active'
} as const;
export type RoomSort = (typeof RoomSort)[keyof typeof RoomSort];

/** A room session as the rooms list shows it; dates are ISO 8601. */
export interface RoomListItem {
	sid: string;
	name: string;
	status: RoomStatus;
	createdAt: string;
	endedAt?: string;
	durationMs?: number;
	/** `reconciler` marks an estimated end. */
	closedBy?: ClosedBy;
	nodeId?: string;
	participants: { sessions: number; unique: number; active: number; peakActive: number };
	egress: { total: number; active: number };
	ingress: { sessions: number; active: number };
	bytes: ByteTotals;
	features: Record<RoomFeature, boolean>;
	/** Last stats flush. */
	lastStatsAt?: string;
	/** `true` for an active entity whose last stats flush is older than the stale window; absent otherwise. */
	stale?: true;
}

/** Numbers above the rooms table. */
export interface RoomSummary {
	activeRooms: number;
	roomsInRange: number;
	participantSessions: number;
	activeParticipants: number;
	/** The range counts are hour-aligned rollup sums because the range exceeds the exact-count limit. */
	approximate: boolean;
}

export interface RoomsListQuery extends ListQuery<RoomSort> {
	status?: RoomStatusFilter;
	features?: RoomFeature[];
	nodeId?: string;
}
