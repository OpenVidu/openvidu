import * as z from 'zod';

import { ClientSdk, ParticipantKind, ParticipantStatus, TrackSource } from '@openvidu-dashboard/typings';

import { isoDate, listResponse, staleField } from '../api/responses.js';
import { enumValues } from '../util/enum-values.js';

const count = z.number().int();
const connectionType = z.enum(['udp', 'tcp', 'turn']);
/** Client fields of a list item, which the PRO session detail extends. */
export const participantClientSummary = z.object({
	sdk: z.enum(enumValues(ClientSdk)).optional(),
	version: z.string().optional(),
	os: z.string().optional(),
	osVersion: z.string().optional(),
	browser: z.string().optional(),
	browserVersion: z.string().optional()
});

/** Fields of a participant list item, which the PRO session detail extends. */
export const participantListFields = {
	sid: z.string(),
	identity: z.string(),
	name: z.string().optional(),
	kind: z.enum(enumValues(ParticipantKind)),
	status: z.enum(enumValues(ParticipantStatus)),
	roomSid: z.string(),
	roomName: z.string(),
	joinedAt: isoDate,
	leftAt: isoDate.optional(),
	durationMs: count.optional(),
	connectionType: connectionType.optional(),
	nodeId: z.string().optional(),
	isPublisher: z.boolean(),
	publishedSources: z
		.array(z.enum(enumValues(TrackSource)))
		.meta({ description: 'Track sources with at least one publication' }),
	stale: staleField
};

export const participantListItem = z
	.object({ ...participantListFields, client: participantClientSummary.optional() })
	.meta({ id: 'ParticipantListItem' });

export const participantsListResponse = listResponse(participantListItem, 'ParticipantsList');

const countByKind = z.object(
	Object.fromEntries(enumValues(ParticipantKind).map((kind) => [kind, count])) as Record<
		ParticipantKind,
		typeof count
	>
);

export const participantsSummary = z
	.object({
		active: z.object({
			participants: count.meta({ description: 'Active STANDARD sessions' }),
			services: count.meta({ description: 'Active sessions of every kind but STANDARD' }),
			byKind: countByKind
		}),
		sessions: z.object({
			participants: count.meta({ description: 'STANDARD sessions joined in the range' }),
			byKind: countByKind
		}),
		approximate: z.boolean()
	})
	.meta({ id: 'ParticipantsSummary' });
