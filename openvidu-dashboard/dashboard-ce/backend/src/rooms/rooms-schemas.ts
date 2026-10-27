import * as z from 'zod';

import { ENTITY_ID_PATTERNS, RoomFeature, RoomSort, RoomStatusFilter } from '@openvidu-dashboard/typings';

import { csvParam, cursorParam, limitParam, orderParam, qParam, rangedQuery } from '../api/query.js';
import { enumValues } from '../util/enum-values.js';

export const ROOM_SID = ENTITY_ID_PATTERNS.room;

/** Search text of two characters or more; a room SID is accepted whatever its length. */
const roomSearch = qParam
	.refine((value) => value === undefined || ROOM_SID.test(value) || value.length >= 2, {
		error: 'must have at least two characters'
	})
	.meta({
		description:
			'Case-insensitive prefix of the room name (two characters or more), or an exact room SID that ignores the ' +
			'range and the other filters'
	});

export function roomsListQuery(now: () => Date) {
	return rangedQuery(now, {
		status: z
			.enum(enumValues(RoomStatusFilter), { error: 'must be active, closed or all' })
			.default(RoomStatusFilter.ALL)
			.meta({ description: 'Rooms active now, closed, or both' }),
		q: roomSearch,
		features: csvParam(enumValues(RoomFeature))
			.optional()
			.meta({ description: 'Rooms that used any of these features' }),
		nodeId: z.string().min(1).max(128).optional().meta({ description: 'Rooms hosted by this node' }),
		sort: z
			.enum(enumValues(RoomSort), { error: 'must be createdAt, endedAt, duration, uniqueIdentities or active' })
			.default(RoomSort.CREATED_AT)
			.meta({
				description:
					'Sort key: createdAt in index order, the others ranked within the range limit of GET /api/v1/info'
			}),
		order: orderParam.default('desc'),
		cursor: cursorParam,
		limit: limitParam
	});
}

export type RoomsListParams = z.output<ReturnType<typeof roomsListQuery>>;

export function roomsSummaryQuery(now: () => Date) {
	return rangedQuery(now, {});
}
