import type { ClosedBy, EgressOutputKind, EgressSourceType, EgressStatus, EgressType } from '../data-model/enums.js';
import type { ListQuery } from './lists.js';

/** Kinds of output of an egress, in order of first appearance, and how many outputs it has. */
export interface EgressOutputsSummary {
	kinds: EgressOutputKind[];
	count: number;
}

/** An egress as lists show it: no request, output locations or URLs, status history or error message. */
export interface EgressListItem {
	egressId: string;
	/** Absent for a web egress without room. */
	roomSid?: string;
	roomName?: string;
	type: EgressType;
	sourceType: EgressSourceType;
	status: EgressStatus;
	closedBy?: ClosedBy;
	/** ISO 8601. */
	startedAt: string;
	endedAt?: string;
	durationMs?: number;
	outputs: EgressOutputsSummary;
	/** `error` set or an output with an error. */
	hasError: boolean;
	/** Protocol error code (`EgressInfo.error_code`) when set. */
	errorCode?: number;
}

/** Statuses of an egress still running; the summary's `active` counts them. */
export const EGRESS_IN_FLIGHT_STATUSES: readonly EgressStatus[] = ['starting', 'active', 'ending'];

/** Range figures of the egresses above the list; hour-aligned rollup sums when `approximate`. */
export interface EgressSummary {
	/** Egresses running now, whatever the range. */
	active: number;
	startedInRange: number;
	byType: Partial<Record<EgressType, number>>;
	/** Ended egresses by terminal status. */
	byEndStatus: Partial<Record<EgressStatus, number>>;
	totalDurationMs: number;
	approximate: boolean;
}

/** `status`: `all` or a subset of the statuses. */
export type EgressStatusFilter = 'all' | EgressStatus[];

/** Sort keys of the egresses list: `startedAt` in index order, the others ranked over the range. */
export const EgressSort = {
	STARTED_AT: 'startedAt',
	ENDED_AT: 'endedAt',
	DURATION: 'duration'
} as const;
export type EgressSort = (typeof EgressSort)[keyof typeof EgressSort];

export interface EgressesListQuery extends ListQuery<EgressSort> {
	status?: EgressStatusFilter;
	type?: EgressType[];
	/** Exact room SID. */
	room?: string;
}
