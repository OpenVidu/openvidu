import * as z from 'zod';

import { isoDate } from '../api/responses.js';
import type { RouteRegistry } from '../api/route-registry.js';
import { healthFactsShape } from '../info/info-routes.js';
import type { StatusService } from './status-service.js';

const count = z.number().int();

export const statusResponse = z
	.object({
		generatedAt: isoDate,
		schema: healthFactsShape.schema,
		migration: healthFactsShape.migration,
		writer: z.object({
			lastSeenAt: isoDate.optional(),
			nodes: count,
			aliveNodes: count.meta({
				description: 'Nodes whose last batch is within the fresh window of their own batch interval'
			}),
			batchIntervalMs: count.optional().meta({
				description: 'Largest batch interval of the nodes seen in the last hour; absent reads as 10 s'
			})
		})
	})
	.meta({ id: 'StatusResponse', description: 'Writer schema, migration and writer health' });

/** `GET /status`: what every page polls to follow the server, whatever its auto-refresh. */
export function registerStatusRoutes(registry: RouteRegistry, status: () => StatusService): void {
	registry.tag('Status', 'Writer schema status, legacy migration progress and writer health');
	registry.register({
		method: 'get',
		path: '/status',
		operationId: 'getStatus',
		edition: 'ce',
		summary: 'Writer schema status, migration progress and writer health',
		tags: ['Status'],
		security: 'bearer',
		responses: { 200: { description: 'The server status', schema: statusResponse } },
		handler: async ({ res }) => {
			res.setHeader('Cache-Control', 'private, no-store');

			return status().status();
		}
	});
}
