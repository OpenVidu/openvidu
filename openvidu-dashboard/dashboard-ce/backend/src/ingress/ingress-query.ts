import type { Document } from 'mongodb';

import { type IngressSort, IngressStatus } from '@openvidu-dashboard/typings';

import { prefixRegex } from '../api/search.js';
import { INGRESS_ID, type IngressesListParams } from './ingress-schemas.js';

export type IngressesListPlan =
	| { kind: 'id'; filter: Document }
	| {
			kind: 'ranked';
			/** Activity range, scope and residual filters. */
			match: Document;
			rank: (asOf: Date) => Document | string;
	  };

/** Rank of each sort key at `asOf`: a publishing ingress adds its running session to its total. */
const INGRESS_RANKS: Readonly<Record<IngressSort, (asOf: Date) => Document | string>> = {
	createdAt: () => '$createdAt',
	totalDuration: (asOf) => ({
		$add: [
			{ $ifNull: ['$totalDurationMs', 0] },
			{
				$cond: [
					{ $eq: ['$status', IngressStatus.PUBLISHING] },
					{ $subtract: [asOf, { $ifNull: ['$lastSessionAt', asOf] }] },
					0
				]
			}
		]
	}),
	sessions: () => ({ $ifNull: ['$sessions', 0] }),
	lastSession: () => ({ $ifNull: ['$lastSessionAt', new Date(0)] })
};

/**
 * The ingresses active in `[from, to)`: created in it (`createdAt_id`), with a session started in it
 * (`lastSessionAt_id`), or publishing now and created before `to` (`status_createdAt`).
 */
export function activityRange(from: Date, to: Date): Document {
	return {
		$or: [
			{ createdAt: { $gte: from, $lt: to } },
			{ lastSessionAt: { $gte: from, $lt: to } },
			{ status: IngressStatus.PUBLISHING, createdAt: { $lt: to } }
		]
	};
}

/**
 * Plan of an ingresses list request: an ingress id is a point lookup; otherwise the activity range with the status,
 * input type and name prefix filters, ranked in memory by the sort key (the union of three index-backed branches has
 * no single index order).
 */
export function ingressesListPlan(params: IngressesListParams): IngressesListPlan {
	if (params.q !== undefined && INGRESS_ID.test(params.q)) {
		return { kind: 'id', filter: { _id: params.q } };
	}

	return {
		kind: 'ranked',
		match: {
			...activityRange(params.from, params.to),
			...(params.q === undefined ? {} : { nameLower: prefixRegex(params.q) }),
			...(params.status === 'all' ? {} : { status: params.status }),
			...(params.inputType === undefined ? {} : { inputType: params.inputType })
		},
		rank: INGRESS_RANKS[params.sort]
	};
}
