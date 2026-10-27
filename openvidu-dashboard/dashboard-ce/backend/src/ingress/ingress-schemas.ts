import * as z from 'zod';

import { ENTITY_ID_PATTERNS, IngressInputType, IngressSort, IngressStatus } from '@openvidu-dashboard/typings';

import { cursorParam, limitParam, orderParam, qParam, rangedQuery } from '../api/query.js';
import { enumValues } from '../util/enum-values.js';

export const INGRESS_ID = ENTITY_ID_PATTERNS.ingress;

/** Name prefix of two characters or more; an ingress id is accepted whatever its length. */
const ingressSearch = qParam
	.refine((value) => value === undefined || INGRESS_ID.test(value) || value.length >= 2, {
		error: 'must have at least two characters'
	})
	.meta({
		description:
			'Case-insensitive prefix of the ingress name (two characters or more), or an exact ingress ID that ignores ' +
			'the range and the other filters'
	});

export function ingressesListQuery(now: () => Date) {
	return rangedQuery(now, {
		status: z
			.enum(['all', ...enumValues(IngressStatus)], {
				error: `must be all or one of ${enumValues(IngressStatus).join(', ')}`
			})
			.default('all')
			.meta({ description: 'Ingresses in this status, or all' }),
		inputType: z
			.enum(enumValues(IngressInputType), { error: `must be one of ${enumValues(IngressInputType).join(', ')}` })
			.optional()
			.meta({ description: 'Ingresses of this input type' }),
		q: ingressSearch,
		sort: z
			.enum(enumValues(IngressSort), { error: 'must be createdAt, totalDuration, sessions or lastSession' })
			.default(IngressSort.CREATED_AT)
			.meta({ description: 'Sort key' }),
		order: orderParam.default('desc'),
		cursor: cursorParam,
		limit: limitParam
	});
}

export type IngressesListParams = z.output<ReturnType<typeof ingressesListQuery>>;

export function ingressesSummaryQuery(now: () => Date) {
	return rangedQuery(now, {});
}
