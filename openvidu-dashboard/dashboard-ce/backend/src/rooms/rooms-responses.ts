import * as z from 'zod';

import { ClosedBy, RoomStatus } from '@openvidu-dashboard/typings';

import { isoDate, listResponse, staleField } from '../api/responses.js';
import { enumValues } from '../util/enum-values.js';

const count = z.number().int();
const bytes = z.object({ up: z.number(), down: z.number() });

/** Fields of a room list item, which the PRO room detail extends. */
export const roomListFields = {
	sid: z.string(),
	name: z.string(),
	status: z.enum(enumValues(RoomStatus)),
	createdAt: isoDate,
	endedAt: isoDate.optional(),
	durationMs: count.optional(),
	closedBy: z.enum(enumValues(ClosedBy)).optional(),
	nodeId: z.string().optional(),
	participants: z.object({ sessions: count, unique: count, active: count, peakActive: count }),
	egress: z.object({ total: count, active: count }),
	ingress: z.object({ sessions: count, active: count }),
	bytes,
	features: z.object({ egress: z.boolean(), ingress: z.boolean(), agent: z.boolean(), sip: z.boolean() }),
	lastStatsAt: isoDate.optional(),
	stale: staleField
};

export const roomListItem = z.object(roomListFields).meta({ id: 'RoomListItem' });

export const roomsListResponse = listResponse(roomListItem, 'RoomsList');

export const roomSummary = z
	.object({
		activeRooms: count,
		roomsInRange: count,
		participantSessions: count,
		activeParticipants: count,
		approximate: z.boolean()
	})
	.meta({ id: 'RoomSummary' });
