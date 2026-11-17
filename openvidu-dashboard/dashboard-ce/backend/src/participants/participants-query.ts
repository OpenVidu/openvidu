import type { Document, Sort } from 'mongodb';

import {
	AGENT_NAME_ATTRIBUTE,
	AgentOrigin,
	OPENVIDU_AGENT_ATTRIBUTE,
	ParticipantKind,
	ParticipantSort,
	ParticipantStatus
} from '@openvidu-dashboard/typings';

import { type CursorPayload, pageQuery, type PageQuery } from '../api/cursor.js';
import { prefixRegex } from '../api/search.js';
import { PARTICIPANT_SID } from './participants-schemas.js';

/** The attribute `key` of the document, removed from the projection when absent. */
function attribute(key: string): Document {
	return { $ifNull: [{ $getField: { field: key, input: '$attributes' } }, '$$REMOVE'] };
}

/**
 * Fields of a participant document the list item needs. Of `attributes`, only the two the agent facts read: their keys
 * contain dots, so they are copied with `$getField` and `$setField` rather than projected by path.
 */
export const PARTICIPANT_LIST_PROJECTION: Readonly<Document> = {
	identity: 1,
	name: 1,
	kind: 1,
	status: 1,
	roomSid: 1,
	roomName: 1,
	joinedAt: 1,
	leftAt: 1,
	durationMs: 1,
	connectionType: 1,
	nodeId: 1,
	mediaNode: 1,
	isPublisher: 1,
	attributes: {
		$setField: {
			field: OPENVIDU_AGENT_ATTRIBUTE,
			input: { $setField: { field: AGENT_NAME_ATTRIBUTE, input: {}, value: attribute(AGENT_NAME_ATTRIBUTE) } },
			value: attribute(OPENVIDU_AGENT_ATTRIBUTE)
		}
	},
	lastStatsAt: 1,
	'tracks.bySource': 1,
	'client.sdk': 1,
	'client.version': 1,
	'client.os': 1,
	'client.osVersion': 1,
	'client.browser': 1,
	'client.browserVersion': 1
};

const ALL_KINDS = Object.values(ParticipantKind);
const ALL_STATUSES = Object.values(ParticipantStatus);

export interface ParticipantsFilter {
	q?: string | undefined;
	kind?: readonly ParticipantKind[] | undefined;
	status?: ParticipantStatus | undefined;
	room?: string | undefined;
	publisher?: true | undefined;
	origin?: AgentOrigin | undefined;
	from: Date;
	to: Date;
	sort: ParticipantSort;
	order: 'asc' | 'desc';
}

export type ParticipantsListPlan =
	| { kind: 'sid'; filter: Document }
	| {
			kind: 'page';
			filter: Document;
			/** The list filter without the cursor condition, for `total`. */
			countFilter: Document;
			sort: Sort;
			page: PageQuery;
			/** Index of the kind and status branch: without it the planner may prefer `{ status, kind }` and sort in memory. */
			hint?: string;
	  }
	| {
			kind: 'ranked';
			/** The list filter over the join range, ranked in memory. */
			match: Document;
			countFilter: Document;
			rank: (asOf: Date) => Document;
			hint?: string;
	  };

type RankedParticipantSort = Exclude<ParticipantSort, 'joinedAt'>;

/** Rank of each ranked sort key at `asOf`: an open session leaves, and lasts until, `asOf`. */
const PARTICIPANT_RANKS: Readonly<Record<RankedParticipantSort, (asOf: Date) => Document>> = {
	leftAt: (asOf) => ({ $ifNull: ['$leftAt', asOf] }),
	duration: (asOf) => ({
		$ifNull: ['$durationMs', { $subtract: [{ $ifNull: ['$leftAt', asOf] }, '$joinedAt'] }]
	})
};

/**
 * Residual filter of an agent origin: an OpenVidu agent has a non-empty `openvidu.agent` attribute. The key contains a
 * dot, so it is read with `$getField`; a missing `attributes`, a missing key and an empty value read as third-party.
 */
function originFilter(origin: AgentOrigin | undefined): Document {
	if (origin === undefined) {
		return {};
	}

	const mark = { $ifNull: [{ $getField: { field: OPENVIDU_AGENT_ATTRIBUTE, input: '$attributes' } }, ''] };

	return { $expr: { [origin === AgentOrigin.OPENVIDU ? '$gt' : '$eq']: [mark, ''] } };
}

/**
 * Filter, sort and keyset condition of a participants or agents list: a SID is a point lookup; an identity prefix
 * drives `{ identityLower, joinedAt }` (or `{ roomSid, identityLower, joinedAt }` with a room); a room drives
 * `{ roomSid, joinedAt, _id }`; kinds or a status drive `{ kind, status, joinedAt, _id }` with absent filters as `$in`
 * over every value so the sorted branches merge; otherwise `{ joinedAt, _id }`. `publisher` and `origin` are residual
 * on each. The range is always on `joinedAt`; a ranked sort key scans it whole and ranks in memory.
 */
export function participantsListPlan(filter: ParticipantsFilter, cursor?: CursorPayload): ParticipantsListPlan {
	if (filter.q !== undefined && PARTICIPANT_SID.test(filter.q)) {
		return { kind: 'sid', filter: { _id: filter.q } };
	}

	const range = { from: filter.from, to: filter.to };
	const bounds = pageQuery('joinedAt', filter.order, undefined, range).fieldFilter ?? {};
	const kinds = filter.kind === undefined || filter.kind.length === 0 ? undefined : [...new Set(filter.kind)];
	const extra: Document = {
		...(filter.publisher === true ? { isPublisher: true } : {}),
		...originFilter(filter.origin)
	};
	const residual: Document = {
		...(kinds === undefined ? {} : { kind: kinds.length === 1 ? kinds[0] : { $in: kinds } }),
		...(filter.status === undefined ? {} : { status: filter.status }),
		...extra
	};

	const build = (joinedAt: Document): Document => {
		if (filter.q !== undefined) {
			return {
				...(filter.room === undefined ? {} : { roomSid: filter.room }),
				identityLower: prefixRegex(filter.q),
				joinedAt,
				...residual
			};
		}

		if (filter.room !== undefined) {
			return { roomSid: filter.room, joinedAt, ...residual };
		}

		if (kinds !== undefined || filter.status !== undefined) {
			return {
				kind: kinds === undefined ? { $in: ALL_KINDS } : kinds.length === 1 ? kinds[0] : { $in: kinds },
				status: filter.status ?? { $in: ALL_STATUSES },
				joinedAt,
				...extra
			};
		}

		return { joinedAt, ...extra };
	};

	const byKindAndStatus =
		filter.q === undefined && filter.room === undefined && (kinds !== undefined || filter.status !== undefined);

	const hint = byKindAndStatus ? { hint: 'kind_status_joinedAt_id' } : {};

	if (filter.sort !== ParticipantSort.JOINED_AT) {
		return {
			kind: 'ranked',
			match: build(bounds),
			countFilter: build(bounds),
			rank: PARTICIPANT_RANKS[filter.sort],
			...hint
		};
	}

	const page = pageQuery('joinedAt', filter.order, cursor, range);

	return {
		kind: 'page',
		filter: { ...build(page.fieldFilter ?? {}), ...page.ties },
		countFilter: build(bounds),
		sort: page.sort,
		page,
		...hint
	};
}
