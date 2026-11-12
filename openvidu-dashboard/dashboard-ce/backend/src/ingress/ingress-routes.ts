import { FeatureKey, listCsvFileName } from '@openvidu-dashboard/typings';

import { listRows, registerCsvExport } from '../api/csv-export.js';
import type { RouteRegistry } from '../api/route-registry.js';
import { INGRESS_CSV_COLUMNS } from './ingress-csv.js';
import { ingressesListResponse, ingressSummary } from './ingress-responses.js';
import { ingressesExportQuery, ingressesListQuery, ingressesSummaryQuery } from './ingress-schemas.js';
import type { IngressService } from './ingress-service.js';

const TAGS = ['Ingress'];

/**
 * Ingress routes: the list, its CSV export and the summary, and the locks of the `ingress-detail` routes (the detail, its sessions and
 * its events). `now` is read per request.
 */
export function registerIngressRoutes(registry: RouteRegistry, ingress: () => IngressService, now: () => Date): void {
	registry.tag('Ingress', 'Ingresses and their publishing sessions');
	registry.register({
		method: 'get',
		path: '/ingresses',
		operationId: 'listIngresses',
		edition: 'ce',
		summary: 'Ingresses created in a range',
		tags: TAGS,
		security: 'bearer',
		request: { query: ingressesListQuery(now) },
		responses: { 200: { description: 'One page of ingresses', schema: ingressesListResponse } },
		handler: ({ query }) => ingress().list(query)
	});
	// Registered before /ingresses/{id} so the literal segment wins.
	registerCsvExport(registry, {
		path: '/ingresses/export.csv',
		operationId: 'exportIngressesCsv',
		edition: 'ce',
		summary: 'Every ingress of the list as CSV',
		tags: TAGS,
		request: { query: ingressesExportQuery(now) },
		columns: () => INGRESS_CSV_COLUMNS,
		rows: ({ query }) => listRows((params, options) => ingress().list(params, options), query),
		fileName: ({ query }) => listCsvFileName('ingresses', query.from.toISOString(), query.to.toISOString())
	});
	// Registered before /ingresses/{id} so the literal segment wins.
	registry.register({
		method: 'get',
		path: '/ingresses/summary',
		operationId: 'getIngressesSummary',
		edition: 'ce',
		summary: 'Ingress counts of a range',
		tags: TAGS,
		security: 'bearer',
		request: { query: ingressesSummaryQuery(now) },
		responses: { 200: { description: 'Figures above the ingress table', schema: ingressSummary } },
		handler: ({ query }) => ingress().summary(query)
	});

	for (const path of ['', '/sessions', '/events']) {
		registry.lock({ method: 'get', path: `/ingresses/{id}${path}`, feature: FeatureKey.INGRESS_DETAIL });
	}
}
