import * as z from 'zod';

import { ClosedBy, ParticipantKind, RoomStatus } from '@openvidu-dashboard/typings';

import { isoDate, staleField } from '../api/responses.js';
import { enumValues } from '../util/enum-values.js';

const count = z.number().int();

const live = z.object({
	rooms: count,
	participants: count.meta({ description: 'Active STANDARD sessions' }),
	services: count.meta({ description: 'Active sessions of every kind but STANDARD' }),
	participantsByKind: z.object(
		Object.fromEntries(enumValues(ParticipantKind).map((kind) => [kind, count])) as Record<
			ParticipantKind,
			typeof count
		>
	),
	publishers: count.meta({ description: 'Active STANDARD sessions that publish' }),
	egresses: count,
	ingressSessions: count,
	stale: z.object({ rooms: count, participants: count, olderThanMs: count })
});

const today = z.object({
	tz: z.string(),
	since: isoDate,
	rooms: count,
	participantSessions: count,
	participantMinutes: count,
	egresses: count,
	ingressSessions: count,
	approximate: z.boolean()
});

const recentRoom = z.object({
	sid: z.string(),
	name: z.string(),
	status: z.enum(enumValues(RoomStatus)),
	createdAt: isoDate,
	endedAt: isoDate.optional(),
	durationMs: count.optional(),
	closedBy: z.enum(enumValues(ClosedBy)).optional(),
	participants: z.object({ active: count, sessions: count, unique: count }),
	nodeId: z.string().optional(),
	lastStatsAt: isoDate.optional(),
	stale: staleField
});

const fields = {
	generatedAt: isoDate,
	live,
	today,
	recentRooms: z.array(recentRoom)
};

export const overviewResponse = z
	.object(fields)
	.meta({ id: 'OverviewResponse', description: 'Live counters, today and recent rooms' });
