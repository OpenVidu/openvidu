import * as z from 'zod';

import { ClosedBy, EgressOutputKind, EgressSourceType, EgressStatus, EgressType } from '@openvidu-dashboard/typings';

import { isoDate, listResponse } from '../api/responses.js';
import { enumValues } from '../util/enum-values.js';

const count = z.number().int();
const outputKind = z.enum(enumValues(EgressOutputKind));
const status = z.enum(enumValues(EgressStatus));
const type = z.enum(enumValues(EgressType));

/** Fields of an egress list item, which the PRO egress detail extends. */
export const egressListFields = {
	egressId: z.string(),
	roomSid: z.string().optional(),
	roomName: z.string().optional(),
	type,
	sourceType: z.enum(enumValues(EgressSourceType)),
	status,
	closedBy: z.enum(enumValues(ClosedBy)).optional(),
	startedAt: isoDate,
	endedAt: isoDate.optional(),
	durationMs: count.optional(),
	hasError: z.boolean(),
	errorCode: count.optional()
};

export const egressListItem = z
	.object({ ...egressListFields, outputs: z.object({ kinds: z.array(outputKind), count }) })
	.meta({ id: 'EgressListItem' });

export const egressesListResponse = listResponse(egressListItem, 'EgressList');

export const egressSummary = z
	.object({
		active: count,
		startedInRange: count,
		byType: z.partialRecord(type, count),
		byEndStatus: z.partialRecord(status, count),
		totalDurationMs: z.number(),
		approximate: z.boolean()
	})
	.meta({ id: 'EgressSummary' });
