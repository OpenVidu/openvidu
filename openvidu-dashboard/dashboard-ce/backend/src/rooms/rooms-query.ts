import type { Document, Sort } from 'mongodb';

import { type RoomFeature, RoomSort, RoomStatus, RoomStatusFilter } from '@openvidu-dashboard/typings';

import { type CursorPayload, pageQuery, type PageQuery } from '../api/cursor.js';
import { prefixRegex } from '../api/search.js';
import { ROOM_SID, type RoomsListParams } from './rooms-schemas.js';

/** Fields of a room document the list item needs. */
export const ROOM_LIST_PROJECTION: Readonly<Document> = {
	name: 1,
	status: 1,
	createdAt: 1,
	endedAt: 1,
	durationMs: 1,
	closedBy: 1,
	nodeId: 1,
	'participants.sessions': 1,
	'participants.unique': 1,
	'participants.active': 1,
	'participants.peakActive': 1,
	'egress.total': 1,
	'egress.active': 1,
	ingress: 1,
	bytes: 1,
	features: 1,
	lastStatsAt: 1
};

/**
 * `status=all` on a `status`-prefixed index: both values, so the planner explodes the `$in` and merges the sorted
 * branches instead of falling back to another index.
 */
const ANY_STATUS = { $in: [RoomStatus.ACTIVE, RoomStatus.CLOSED] };

export type RoomsListPlan =
	| { kind: 'sid'; filter: Document }
	| {
			kind: 'page';
			filter: Document;
			/** The list filter without the cursor condition, for `total`. */
			countFilter: Document;
			sort: Sort;
			page: PageQuery;
	  }
	| {
			kind: 'ranked';
			/** The list filter over the creation range, ranked in memory. */
			match: Document;
			countFilter: Document;
			rank: (asOf: Date) => Document;
	  };

type RankedRoomSort = Exclude<RoomSort, 'createdAt'>;

/** Rank of each ranked sort key at `asOf`: a running room ends, and lasts, at `asOf`. */
const ROOM_RANKS: Readonly<Record<RankedRoomSort, (asOf: Date) => Document>> = {
	endedAt: (asOf) => ({ $ifNull: ['$endedAt', asOf] }),
	duration: (asOf) => ({ $ifNull: ['$durationMs', { $subtract: [asOf, '$createdAt'] }] }),
	uniqueIdentities: () => ({ $ifNull: ['$participants.unique', 0] }),
	active: () => ({ $ifNull: ['$participants.active', 0] })
};

export function isRankedRoomSort(sort: RoomSort): sort is RankedRoomSort {
	return sort !== RoomSort.CREATED_AT;
}

function featureFlags(features: readonly RoomFeature[]): Document[] {
	return [...new Set(features)].map((feature) => ({ [`features.${feature}`]: true }));
}

/** Residual `$or` of feature flags, for queries driven by another index. */
function anyFeature(flags: Document[]): Document {
	if (flags.length === 0) {
		return {};
	}

	return flags.length === 1 ? (flags[0] ?? {}) : { $or: flags };
}

/**
 * Filter, sort and keyset condition of a rooms list request, following the filter-to-index table of the design: a
 * SID is a point lookup; a name prefix drives `{ nameLower, createdAt }` (node, status and features residual); a node
 * drives `{ nodeId, status, createdAt, _id }`; features are an `$or` of branches, one per partial index; otherwise
 * the `status` picks `{ status, createdAt, _id }` or `{ createdAt, _id }`. The range is always on `createdAt`; a
 * ranked sort key scans it whole and ranks in memory.
 */
export function roomsListPlan(params: RoomsListParams, cursor?: CursorPayload): RoomsListPlan {
	if (params.q !== undefined && ROOM_SID.test(params.q)) {
		return { kind: 'sid', filter: { _id: params.q } };
	}

	const field = 'createdAt';
	const range = { from: params.from, to: params.to };
	const bounds = pageQuery(field, params.order, undefined, range).fieldFilter ?? {};
	const status = params.status === RoomStatusFilter.ALL ? undefined : params.status;
	const flags = featureFlags(params.features ?? []);

	const build = (fieldFilter: Document): Document => {
		if (params.q !== undefined) {
			return {
				nameLower: prefixRegex(params.q),
				...(status ? { status } : {}),
				...(params.nodeId === undefined ? {} : { nodeId: params.nodeId }),
				[field]: fieldFilter,
				...anyFeature(flags)
			};
		}

		if (params.nodeId !== undefined) {
			return { nodeId: params.nodeId, status: status ?? ANY_STATUS, [field]: fieldFilter, ...anyFeature(flags) };
		}

		if (flags.length > 0) {
			const branches = flags.map((flag) => ({ ...flag, status: status ?? ANY_STATUS, createdAt: fieldFilter }));

			return branches.length === 1 ? (branches[0] ?? {}) : { $or: branches };
		}

		return { ...(status ? { status } : {}), [field]: fieldFilter, ...anyFeature(flags) };
	};

	if (isRankedRoomSort(params.sort)) {
		return { kind: 'ranked', match: build(bounds), countFilter: build(bounds), rank: ROOM_RANKS[params.sort] };
	}

	const page = pageQuery(field, params.order, cursor, range);

	return {
		kind: 'page',
		filter: { ...build(page.fieldFilter ?? {}), ...page.ties },
		countFilter: build(bounds),
		sort: page.sort,
		page
	};
}
