import type { Document } from 'mongodb';

import { EgressSort } from '@openvidu-dashboard/typings';

import { prefixRegex } from '../api/search.js';
import { EGRESS_ID, type EgressesListParams } from './egress-schemas.js';

/** Index of a plan; `startedAt_id` and `roomNameLower_startedAt` are read with a sort on `{ startedAt, _id }`. */
export type EgressesIndex = 'startedAt_id' | 'status_startedAt' | 'roomSid_startedAt' | 'roomNameLower_startedAt';

export type EgressesListPlan =
	| { kind: 'id'; filter: Document }
	| {
			kind: 'page';
			/** Scope and residual filters, without the range or the keyset condition. */
			filter: Document;
			hint: EgressesIndex;
	  }
	| {
			kind: 'ranked';
			filter: Document;
			hint: EgressesIndex;
			rank: (asOf: Date) => Document;
	  };

type RankedEgressSort = Exclude<EgressSort, 'startedAt'>;

/** Rank of each ranked sort key at `asOf`: an egress in flight ends, and lasts until, `asOf`. */
const EGRESS_RANKS: Readonly<Record<RankedEgressSort, (asOf: Date) => Document>> = {
	endedAt: (asOf) => ({ $ifNull: ['$endedAt', asOf] }),
	duration: (asOf) => ({ $ifNull: ['$durationMs', { $subtract: [asOf, '$startedAt'] }] })
};

/** Residual filters that never pick the index: `type`, and `status` when another field drives the plan. */
function residual(params: EgressesListParams, withStatus: boolean): Document {
	return {
		...(withStatus && params.status !== 'all' ? { status: { $in: params.status } } : {}),
		...(params.type === undefined || params.type.length === 0 ? {} : { type: { $in: params.type } })
	};
}

/**
 * Plan of an egresses list request after the filter-to-index table of the design: an egress id is a point lookup; a
 * room drives `{ roomSid, startedAt }` (a room name prefix residual); a room name prefix drives `{ roomNameLower,
 * startedAt }`; a status set drives `{ status, startedAt }` (an `$in` explode merged in `startedAt` order); otherwise
 * `{ startedAt, _id }`. The range is always on `startedAt`; a ranked sort key scans it whole and ranks in memory.
 */
export function egressesListPlan(params: EgressesListParams): EgressesListPlan {
	if (params.q !== undefined && EGRESS_ID.test(params.q)) {
		return { kind: 'id', filter: { _id: params.q } };
	}

	const prefix = params.q === undefined ? {} : { roomNameLower: prefixRegex(params.q) };
	let scope: { filter: Document; hint: EgressesIndex };

	if (params.room !== undefined) {
		scope = { filter: { roomSid: params.room, ...prefix, ...residual(params, true) }, hint: 'roomSid_startedAt' };
	} else if (params.q !== undefined) {
		scope = { filter: { ...prefix, ...residual(params, true) }, hint: 'roomNameLower_startedAt' };
	} else if (params.status !== 'all') {
		scope = { filter: residual(params, true), hint: 'status_startedAt' };
	} else {
		scope = { filter: residual(params, false), hint: 'startedAt_id' };
	}

	return params.sort === EgressSort.STARTED_AT
		? { kind: 'page', ...scope }
		: { kind: 'ranked', ...scope, rank: EGRESS_RANKS[params.sort] };
}
