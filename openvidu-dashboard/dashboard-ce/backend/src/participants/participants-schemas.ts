import * as z from 'zod';

import { ENTITY_ID_PATTERNS, ParticipantKind, ParticipantSort, ParticipantStatus } from '@openvidu-dashboard/typings';

import { csvParam, limitParam, orderParam, qParam, rangedQuery } from '../api/query.js';
import { ROOM_SID } from '../rooms/rooms-schemas.js';
import { enumValues } from '../util/enum-values.js';

export const PARTICIPANT_SID = ENTITY_ID_PATTERNS.participant;

/** Identity prefix of two characters or more; a participant SID is accepted whatever its length. */
const participantSearch = qParam.refine(
	(value) => value === undefined || PARTICIPANT_SID.test(value) || value.length >= 2,
	{ error: 'must have at least two characters' }
);

const cursorParam = z.string().min(1).optional();

const listShape = {
	status: z.enum(enumValues(ParticipantStatus), { error: 'must be joining, active, left or aborted' }).optional(),
	room: z.string().regex(ROOM_SID, { error: 'must be a room SID (RM_…)' }).optional(),
	sort: z
		.enum(enumValues(ParticipantSort), { error: 'must be joinedAt, leftAt or duration' })
		.default(ParticipantSort.JOINED_AT),
	order: orderParam.default('desc'),
	cursor: cursorParam,
	limit: limitParam
};

export function participantsListQuery(now: () => Date) {
	return rangedQuery(now, {
		...listShape,
		q: participantSearch,
		kind: csvParam(enumValues(ParticipantKind)).optional(),
		publisher: z
			.literal('true', { error: 'must be true' })
			.transform(() => true as const)
			.optional()
			.meta({ description: 'true keeps only the sessions that published a track' })
	});
}

export type ParticipantsListParams = z.output<ReturnType<typeof participantsListQuery>>;

export function participantsSummaryQuery(now: () => Date) {
	return rangedQuery(now, {});
}

export type ParticipantsSummaryParams = z.output<ReturnType<typeof participantsSummaryQuery>>;

export function agentsListQuery(now: () => Date) {
	return rangedQuery(now, { ...listShape, q: participantSearch });
}

export type AgentsListParams = z.output<ReturnType<typeof agentsListQuery>>;
