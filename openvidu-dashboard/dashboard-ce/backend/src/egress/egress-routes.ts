import { FeatureKey, listCsvFileName } from '@openvidu-dashboard/typings';

import { listRows, registerCsvExport } from '../api/csv-export.js';
import type { RouteRegistry } from '../api/route-registry.js';
import { EGRESS_CSV_COLUMNS } from './egress-csv.js';
import { egressesListResponse, egressSummary } from './egress-responses.js';
import { egressesExportQuery, egressesListQuery, egressesSummaryQuery } from './egress-schemas.js';
import type { EgressService } from './egress-service.js';

const TAGS = ['Egress'];

/**
 * Egress routes: the list, its CSV export and the summary, and the locks of the `egress-detail` routes (the detail and its events).
 * `now` is read per request.
 */
export function registerEgressRoutes(registry: RouteRegistry, egress: () => EgressService, now: () => Date): void {
	registry.tag('Egress', 'Recordings and streams');
	registry.register({
		method: 'get',
		path: '/egresses',
		operationId: 'listEgresses',
		edition: 'ce',
		summary: 'Egresses started in a range',
		tags: TAGS,
		security: 'bearer',
		request: { query: egressesListQuery(now) },
		responses: { 200: { description: 'One page of egresses', schema: egressesListResponse } },
		handler: ({ query }) => egress().list(query)
	});
	// Registered before /egresses/{id} so the literal segment wins.
	registerCsvExport(registry, {
		path: '/egresses/export.csv',
		operationId: 'exportEgressesCsv',
		edition: 'ce',
		summary: 'Every egress of the list as CSV',
		tags: TAGS,
		request: { query: egressesExportQuery(now) },
		columns: () => EGRESS_CSV_COLUMNS,
		rows: ({ query }) => listRows((params, options) => egress().list(params, options), query),
		fileName: ({ query }) => listCsvFileName('egresses', query.from.toISOString(), query.to.toISOString())
	});
	// Registered before /egresses/{id} so the literal segment wins.
	registry.register({
		method: 'get',
		path: '/egresses/summary',
		operationId: 'getEgressesSummary',
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
