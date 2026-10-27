import * as z from 'zod';

import { EgressSort, EgressStatus, EgressType, ENTITY_ID_PATTERNS } from '@openvidu-dashboard/typings';

import { csvParam, cursorParam, limitParam, orderParam, qParam, rangedQuery } from '../api/query.js';
import { ROOM_SID } from '../rooms/rooms-schemas.js';
import { enumValues } from '../util/enum-values.js';

export const EGRESS_ID = ENTITY_ID_PATTERNS.egress;

const STATUSES = enumValues(EgressStatus);
/** Room name prefix of two characters or more; an egress id is accepted whatever its length. */
const egressSearch = qParam
	.refine((value) => value === undefined || EGRESS_ID.test(value) || value.length >= 2, {
		error: 'must have at least two characters'
	})
	.meta({
		description:
			'Case-insensitive prefix of the room name (two characters or more), or an exact egress ID that ignores the ' +
			'range and the other filters'
	});

/** `all`, or a comma-separated subset of the egress statuses. */
const statusParam = z
	.string()
	.meta({ override: { type: 'array', items: { type: 'string', enum: ['all', ...STATUSES] }, default: ['all'] } })
	.transform((value, context): 'all' | EgressStatus[] => {
		if (value.trim() === 'all') {
			return 'all';
		}

		const items = value
			.split(',')
			.map((item) => item.trim())
			.filter((item) => item !== '');

		if (
			items.length === 0 ||
			!items.every((item): item is EgressStatus => STATUSES.includes(item as EgressStatus))
		) {
			context.addIssue({
				code: 'custom',
				message: `must be all or a comma-separated list of ${STATUSES.join(', ')}`
			});

			return z.NEVER;
		}

		return [...new Set(items)];
	})
	.default('all')
	.meta({ description: '`all`, or the egress statuses to keep' });

export function egressesListQuery(now: () => Date) {
	return rangedQuery(now, {
		status: statusParam,
		type: csvParam(enumValues(EgressType))
			.optional()
			.meta({ description: 'Egress types to keep; absent means every type' }),
		room: z
			.string()
			.regex(ROOM_SID, { error: 'must be a room SID (RM_…)' })
			.optional()
			.meta({ description: 'Egresses of this room (exact room SID)' }),
		q: egressSearch,
		sort: z
			.enum(enumValues(EgressSort), { error: 'must be startedAt, endedAt or duration' })
			.default(EgressSort.STARTED_AT)
			.meta({
				description:
					'Sort key: startedAt in index order, the others ranked within the range limit of GET /api/v1/info'
			}),
		order: orderParam.default('desc'),
		cursor: cursorParam,
		limit: limitParam
	});
}

export type EgressesListParams = z.output<ReturnType<typeof egressesListQuery>>;

export function egressesSummaryQuery(now: () => Date) {
	return rangedQuery(now, {});
}
