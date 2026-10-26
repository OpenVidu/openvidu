import * as z from 'zod';

import { FeatureKey, MigrationState, WriterSchemaStatus } from '@openvidu-dashboard/typings';

import type { RouteRegistry } from '../api/route-registry.js';
import type { InfoService } from './info-service.js';

const versions = z.object({ dashboard: z.string(), server: z.string().optional() });

/** Schema status, migration and retention: shared by `/info` and the overview health facts. */
export const healthFactsShape = {
	schema: z.object({
		dashboard: z.number().int(),
		writer: z.number().int().optional(),
		status: z.enum(WriterSchemaStatus)
	}),
	migration: z.object({
		state: z.enum([...Object.values(MigrationState), 'none']),
		progress: z
			.object({
				processed: z.number(),
				total: z.number(),
				startedAt: z.iso.datetime().optional(),
				finishedAt: z.iso.datetime().optional()
			})
			.optional(),
		error: z.string().optional()
	}),
	retention: z
		.object({
			eventsMs: z.number(),
			statsMs: z.number(),
			tracksMs: z.number(),
			entitiesMs: z.number(),
			rollups5MinMs: z.number(),
			rollupsHourlyMs: z.number(),
			rollupsDailyMs: z.number().nullable()
		})
		.optional()
};

const infoResponse = z
	.object({
		edition: z.enum(['ce', 'pro']),
		versions,
		...healthFactsShape,
		database: z.object({ version: z.string(), timeseriesSupported: z.boolean() }),
		storage: z.record(
			z.string(),
			z.object({
				documents: z.number(),
				storageBytes: z.number(),
				indexBytes: z.number(),
				oldest: z.iso.datetime().optional()
			})
		),
		features: z.array(z.enum(FeatureKey)),
		limits: z.object({
			rankedSortMaxRangeMs: z.number().int().meta({ description: 'Rooms, egresses and ingresses' }),
			participantRankedSortMaxRangeMs: z
				.number()
				.int()
				.meta({ description: 'Participants and agents without a room filter' })
		}),
		license: z.object({ validUntil: z.iso.date().optional(), maskedKey: z.string() }).optional(),
		openapiDocsEnabled: z.boolean()
	})
	.meta({
		id: 'InfoResponse',
		description: 'Full document with a bearer token; edition and version only without one'
	});

/** `GET /info`: public subset without `Authorization`, full document with a valid bearer token. */
export function registerInfoRoute(registry: RouteRegistry, info: () => InfoService): void {
	registry.register({
		method: 'get',
		path: '/info',
		edition: 'ce',
		summary: 'Edition, versions, writer schema, migration, retention, storage and features',
		tags: ['info'],
		security: 'optional-bearer',
		responses: { 200: { description: 'Info document', schema: infoResponse } },
		handler: ({ req }) => (req.auth === undefined ? info().publicInfo() : info().fullInfo())
	});
}
