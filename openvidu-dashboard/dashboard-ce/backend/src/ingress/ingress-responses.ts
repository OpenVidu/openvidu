import * as z from 'zod';

import { IngressInputType, IngressStatus } from '@openvidu-dashboard/typings';

import { isoDate, listResponse } from '../api/responses.js';
import { enumValues } from '../util/enum-values.js';

const count = z.number().int();
const inputType = z.enum(enumValues(IngressInputType));

/** Fields of an ingress list item, which the PRO ingress detail extends. */
export const ingressListFields = {
	ingressId: z.string(),
	name: z.string().optional(),
	inputType,
	roomName: z.string(),
	participantIdentity: z.string(),
	status: z.enum(enumValues(IngressStatus)),
	enabled: z.boolean(),
	reusable: z.boolean(),
	createdAt: isoDate,
	deletedAt: isoDate.optional(),
	sessions: count,
	totalDurationMs: z.number(),
	lastSessionAt: isoDate.optional(),
	hasError: z.boolean()
};

export const ingressListItem = z.object(ingressListFields).meta({ id: 'IngressListItem' });

export const ingressesListResponse = listResponse(ingressListItem, 'IngressList');

export const ingressSummary = z
	.object({
		publishingNow: count,
		ingressesInRange: count,
		byInputType: z.object({ rtmp: count, whip: count, url: count }),
		sessionsInRange: count,
		totalDurationMs: z.number(),
		approximate: z.boolean()
	})
	.meta({ id: 'IngressSummary' });
