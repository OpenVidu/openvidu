import type { RouteRegistry } from '../api/route-registry.js';
import { compact } from '../util/compact.js';
import { deletionJob, startDeletionRequest } from './deletion-schemas.js';
import type { DeletionService } from './deletion-service.js';

/** `POST /deletions`: starts a background deletion job; there is no cancel. */
export function registerDeletionRoutes(registry: RouteRegistry, deletions: () => DeletionService): void {
	registry.tag('Deletions', 'Deletion of stored analytics data');
	registry.register({
		method: 'post',
		path: '/deletions',
		operationId: 'startDeletion',
		edition: 'ce',
		summary: 'Start deleting stored analytics data of one class or all of it',
		tags: ['Deletions'],
		security: 'bearer',
		request: { body: startDeletionRequest },
		responses: {
			202: { description: 'The deletion job started', schema: deletionJob },
			409: {
				description:
					'The migration of the data before 3.10 is running, a deletion is already running, or the data before 3.10 is not kept for rollback (CONFLICT)'
			}
		},
		handler: async ({ body, req, res }) => {
			res.status(202).json(await deletions().start(compact(body), req.id));

			return undefined;
		}
	});
}
