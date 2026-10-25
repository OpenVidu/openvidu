import { FeatureKey } from '@openvidu-dashboard/typings';

import type { RouteRegistry } from '../api/route-registry.js';
import { egressesListResponse, egressSummary } from './egress-responses.js';
import { egressesListQuery, egressesSummaryQuery } from './egress-schemas.js';
import type { EgressService } from './egress-service.js';

const TAGS = ['Egress'];

/**
 * Egress routes: the list and the summary, and the locks of the `egress-detail` routes (the detail and its events).
 * `now` is read per request.
 */
export function registerEgressRoutes(registry: RouteRegistry, egress: () => EgressService, now: () => Date): void {
	registry.register({
		method: 'get',
		path: '/egresses',
		edition: 'ce',
		summary: 'Egresses started in a range',
		tags: TAGS,
		security: 'bearer',
		request: { query: egressesListQuery(now) },
		responses: { 200: { description: 'One page of egresses', schema: egressesListResponse } },
		handler: ({ query }) => egress().list(query)
	});
	// Registered before /egresses/{id} so the literal segment wins.
	registry.register({
		method: 'get',
		path: '/egresses/summary',
		edition: 'ce',
		summary: 'Egress counts of a range',
		tags: TAGS,
		security: 'bearer',
		request: { query: egressesSummaryQuery(now) },
		responses: { 200: { description: 'Figures above the egress table', schema: egressSummary } },
		handler: ({ query }) => egress().summary(query)
	});

	for (const path of ['', '/events']) {
		registry.lock({ method: 'get', path: `/egresses/{id}${path}`, feature: FeatureKey.EGRESS_DETAIL });
	}
}
