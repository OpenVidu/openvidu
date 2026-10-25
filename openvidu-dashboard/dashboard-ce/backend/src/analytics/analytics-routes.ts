import { ANALYTICS_CSV_CONTENT_TYPE, FeatureKey } from '@openvidu-dashboard/typings';

import type { RouteRegistry } from '../api/route-registry.js';
import {
	analyticsBreakdownsResponse,
	analyticsCsv,
	analyticsSeriesResponse,
	analyticsSummaryResponse
} from './analytics-responses.js';
import {
	analyticsBreakdownsQuery,
	type AnalyticsExportParams,
	analyticsExportQuery,
	analyticsSeriesQuery,
	analyticsSummaryQuery
} from './analytics-schemas.js';
import type { AnalyticsService } from './analytics-service.js';

const TAGS = ['Analytics'];
const LOCKED_ITEM = { description: 'PRO metric, dimension or node scope on CE' };

/**
 * Analytics routes: series, breakdowns, summary and CSV export, with the PRO metrics, dimensions and scopes rejected on
 * CE, and the locks of top rooms (`analytics-top-rooms`) and scopes (`per-node-breakdown`). `now` is read per request.
 */
export function registerAnalyticsRoutes(
	registry: RouteRegistry,
	analytics: () => AnalyticsService,
	now: () => Date
): void {
	const ce = { edition: 'ce', tags: TAGS, security: 'bearer' } as const;

	registry.register({
		...ce,
		method: 'get',
		path: '/analytics/series',
		summary: 'Usage series from the rollups',
		request: { query: analyticsSeriesQuery(now) },
		responses: {
			200: { description: 'One dense series per metric', schema: analyticsSeriesResponse },
			403: LOCKED_ITEM
		},
		handler: ({ query }) => analytics().series(query)
	});
	registry.register({
		...ce,
		method: 'get',
		path: '/analytics/breakdowns',
		summary: 'Counts per key of each dimension',
		request: { query: analyticsBreakdownsQuery(now) },
		responses: {
			200: { description: 'One breakdown per dimension', schema: analyticsBreakdownsResponse },
			403: LOCKED_ITEM
		},
		handler: ({ query }) => analytics().breakdowns(query)
	});
	registry.register({
		...ce,
		method: 'get',
		path: '/analytics/summary',
		summary: 'KPI values of a range',
		request: { query: analyticsSummaryQuery(now) },
		responses: { 200: { description: 'The KPI values', schema: analyticsSummaryResponse }, 403: LOCKED_ITEM },
		handler: ({ query }) => analytics().summary(query)
	});
	registry.register<unknown, AnalyticsExportParams, unknown>({
		...ce,
		method: 'get',
		path: '/analytics/export.csv',
		summary: 'Series or breakdowns as CSV',
		request: { query: analyticsExportQuery(now) },
		responses: {
			200: { description: 'CSV attachment', schema: analyticsCsv, contentType: ANALYTICS_CSV_CONTENT_TYPE },
			403: LOCKED_ITEM
		},
		handler: async ({ query, res }) => {
			const csv = await analytics().export(query);

			res.status(200).type(ANALYTICS_CSV_CONTENT_TYPE).attachment(csv.fileName).send(csv.body);
		}
	});
	registry.lock({ method: 'get', path: '/analytics/top', feature: FeatureKey.ANALYTICS_TOP_ROOMS });
	registry.lock({ method: 'get', path: '/analytics/scopes', feature: FeatureKey.PER_NODE_BREAKDOWN });
}
