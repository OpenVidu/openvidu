import type { ParticipantClient } from '../data-model/entities.js';
import type { ConnectionType, ParticipantKind, ParticipantStatus, TrackSource } from '../data-model/enums.js';
import type { RangeQuery, SortOrder } from './lists.js';

/** Sort keys of the participants and agents lists: `joinedAt` in index order, the others ranked over the range. */
export const ParticipantSort = {
	JOINED_AT: 'joinedAt',
	LEFT_AT: 'leftAt',
	DURATION: 'duration'
} as const;
export type ParticipantSort = (typeof ParticipantSort)[keyof typeof ParticipantSort];

/** The client fields a list row shows; address and device stay in the detail. */
export type ParticipantClientSummary = Pick<
	ParticipantClient,
	'sdk' | 'version' | 'os' | 'osVersion' | 'browser' | 'browserVersion'
>;

/** A participant session as the participants and agents lists show it; dates are ISO 8601. */
export interface ParticipantListItem {
	sid: string;
	identity: string;
	name?: string;
	kind: ParticipantKind;
	status: ParticipantStatus;
	roomSid: string;
	roomName: string;
	joinedAt: string;
	leftAt?: string;
	durationMs?: number;
	connectionType?: Exclude<ConnectionType, 'other'>;
	nodeId?: string;
	isPublisher: boolean;
	/** Track sources with at least one publication, in `TrackSource` order. */
	publishedSources: TrackSource[];
	client?: ParticipantClientSummary;
	/** `true` for an active entity whose last stats flush is older than the stale window; absent otherwise. */
	stale?: true;
}

export interface ParticipantsListQuery extends RangeQuery {
	/** Identity prefix (two characters or more) or an exact `PA_` SID. */
	q?: string;
	kind?: ParticipantKind[];
	status?: ParticipantStatus;
	room?: string;
	/** `true` keeps only the sessions that published a track. */
	publisher?: true;
	sort?: ParticipantSort;
	order?: SortOrder;
	cursor?: string;
	limit?: number;
}

export type AgentsListQuery = Omit<ParticipantsListQuery, 'kind' | 'publisher'>;

export type ParticipantsSummaryQuery = RangeQuery;

/** Numbers above the participants table: STANDARD participants and, apart, every other kind. */
export interface ParticipantsSummary {
	active: {
		/** Active STANDARD sessions. */
		participants: number;
		/** Active sessions of every other kind. */
		services: number;
		byKind: Record<ParticipantKind, number>;
	};
	/** Sessions joined in the range. */
	sessions: {
		/** STANDARD sessions. */
		participants: number;
		byKind: Record<ParticipantKind, number>;
	};
	/** The range counts are hour-aligned rollup sums because the range exceeds the exact-count limit. */
	approximate: boolean;
}
