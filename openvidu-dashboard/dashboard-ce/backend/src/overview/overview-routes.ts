import * as z from 'zod';

import type { RouteDefinition, RouteRegistry } from '../api/route-registry.js';
import { ifNoneMatchMatches } from '../http/conditional.js';
import { overviewResponse } from './overview-responses.js';
import { overviewQuery, type OverviewParams } from './overview-schemas.js';
import type { OverviewService } from './overview-service.js';

/** `GET /overview` documented with `schema`; the PRO edition replaces the CE route with the schema of its extension. */
export function overviewRoute(
	overview: () => OverviewService,
	schema: z.ZodType
): RouteDefinition<unknown, OverviewParams> {
	return {
		method: 'get',
		path: '/overview',
		operationId: 'getOverview',
		edition: 'ce',
		summary: 'Live counters, today and recent rooms',
		tags: ['Overview'],
		security: 'bearer',
		request: { query: overviewQuery },
		responses: {
			200: {
				description: 'The overview',
				schema,
				headers: z.object({
					ETag: z.string().meta({ description: 'Weak validator of the body without generatedAt' })
				})
			},
			304: { description: 'Unchanged since the `If-None-Match` validator' }
		},
		handler: async ({ query, req, res }) => {
			const { body, etag } = await overview().overview(query.tz);

			res.setHeader('ETag', etag);
			res.setHeader('Cache-Control', 'private, no-cache');

			if (ifNoneMatchMatches(req.get('If-None-Match'), etag)) {
				res.status(304).end();

				return undefined;
			}

			return body;
		}
	};
}

export function registerOverviewRoutes(registry: RouteRegistry, overview: () => OverviewService): void {
	registry.tag('Overview', "Live counters, today's totals and the most recent rooms");
	registry.register(overviewRoute(overview, overviewResponse));
}
