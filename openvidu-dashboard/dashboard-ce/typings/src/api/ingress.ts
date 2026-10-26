import type { IngressInputType, IngressStatus } from '../data-model/enums.js';
import type { ListQuery } from './lists.js';

/** An ingress definition as lists show it: no url, stream key or participant name. */
export interface IngressListItem {
	ingressId: string;
	name?: string;
	inputType: IngressInputType;
	roomName: string;
	participantIdentity: string;
	status: IngressStatus;
	enabled: boolean;
	reusable: boolean;
	/** ISO 8601. */
	createdAt: string;
	deletedAt?: string;
	/** Sessions published so far. */
	sessions: number;
	totalDurationMs: number;
	lastSessionAt?: string;
	/** The last session ended in error (`lastError` present). */
	hasError: boolean;
}

/** Range figures of the ingresses above the list; the session numbers are hour-aligned rollup sums. */
export interface IngressSummary {
	/** Ingresses publishing now, whatever the range. */
	publishingNow: number;
	ingressesInRange: number;
	byInputType: Record<IngressInputType, number>;
	sessionsInRange: number;
	totalDurationMs: number;
	/** A range bound is not on an hour boundary. */
	approximate: boolean;
}

/** `status`: `all` or one status. */
export type IngressStatusFilter = 'all' | IngressStatus;

/** Sort keys of the ingresses list, every one ranked over the activity range. */
export const IngressSort = {
	CREATED_AT: 'createdAt',
	TOTAL_DURATION: 'totalDuration',
	SESSIONS: 'sessions',
	LAST_SESSION: 'lastSession'
} as const;
export type IngressSort = (typeof IngressSort)[keyof typeof IngressSort];

export interface IngressesListQuery extends ListQuery<IngressSort> {
	status?: IngressStatusFilter;
	inputType?: IngressInputType;
}
