import type { Db } from 'mongodb';
import * as z from 'zod';

import { type ReadyChecks, WriterSchemaStatus } from '@openvidu-dashboard/typings';

import { ApiError } from '../http/api-error.js';
import { readSchemaStatus } from '../schema/schema-status.js';
import type { RouteRegistry } from './route-registry.js';

export const READY_PING_TIMEOUT_MS = 2_000;

const healthSchema = z.object({ status: z.literal('ok'), version: z.string() }).meta({ id: 'HealthResponse' });
const readySchema = z
	.object({
		status: z.literal('ready'),
		checks: z.object({ mongo: z.enum(['ok', 'error']), schema: z.enum(WriterSchemaStatus).optional() })
	})
	.meta({ id: 'ReadyResponse' });

/** MongoDB answers a ping within 2 s and the writer schema is not older than this dashboard reads. */
export async function readiness(db: Db): Promise<{ ready: boolean; checks: ReadyChecks }> {
	try {
		await db.command({ ping: 1 }, { timeoutMS: READY_PING_TIMEOUT_MS });
	} catch {
		return { ready: false, checks: { mongo: 'error' } };
	}

	const { status } = await readSchemaStatus(db);

	return { ready: status !== WriterSchemaStatus.OLDER, checks: { mongo: 'ok', schema: status } };
}

/** `GET /health` (liveness, no MongoDB) and `GET /ready` (readiness). */
export function registerProbes(registry: RouteRegistry, version: string, db: Db): void {
	registry.tag('Probes', 'Liveness and readiness of the dashboard, for orchestrators and load balancers');
	registry.register({
		method: 'get',
		path: '/health',
		operationId: 'getHealth',
		edition: 'ce',
		summary: 'Liveness: the process answers; MongoDB is not checked',
		tags: ['Probes'],
		security: 'public',
		responses: { 200: { description: 'Alive', schema: healthSchema } },
		handler: () => ({ status: 'ok', version })
	});
	registry.register({
		method: 'get',
		path: '/ready',
		operationId: 'getReadiness',
		edition: 'ce',
		summary: 'Readiness: MongoDB answers and the writer schema is supported',
		tags: ['Probes'],
		security: 'public',
		responses: {
			200: { description: 'Ready', schema: readySchema },
			503: { description: 'Not ready; details.checks says why' }
		},
		handler: async () => {
			const { ready, checks } = await readiness(db);

			if (!ready) {
				throw new ApiError('NOT_READY', 'The dashboard is not ready', { checks });
			}

			return { status: 'ready', checks };
		}
	});
}
