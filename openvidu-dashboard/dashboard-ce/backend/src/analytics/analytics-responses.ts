import * as z from 'zod';

import { ANALYTICS_GRANULARITIES, AnalyticsDimension } from '@openvidu-dashboard/typings';

import { isoDate } from '../api/responses.js';
import { enumValues } from '../util/enum-values.js';

const count = z.number();
const scope = z.string().meta({ description: '`global` or `node:<id>`' });

export const analyticsSeriesResponse = z
	.object({
		granularity: z.enum(ANALYTICS_GRANULARITIES),
		from: isoDate,
		to: isoDate,
		scope,
		series: z.array(
			z.object({
				name: z.string().meta({
					description: 'The metric, or `egressEnded.<status>` with a stored egress status such as `complete`'
				}),
				points: z.array(z.tuple([isoDate, z.number().nullable()])),
				basis: z.literal('utcDay').optional().meta({ description: 'One value per UTC day whatever `tz`' })
			})
		)
	})
	.meta({ id: 'AnalyticsSeries', description: 'Dense series: one point per bucket of the range' });

export const analyticsBreakdownsResponse = z
	.object({
		from: isoDate,
		to: isoDate,
		scope,
		breakdowns: z.array(
			z.object({
				dimension: z.enum(enumValues(AnalyticsDimension)),
				total: count,
				items: z.array(
					z.object({
						key: z.string(),
						count,
						percent: z.number(),
						errors: count.optional()
					})
				)
			})
		)
	})
	.meta({ id: 'AnalyticsBreakdowns', description: 'Counts per key over the range snapped to hours or UTC days' });

export const analyticsSummaryResponse = z
	.object({
		from: isoDate,
		to: isoDate,
		scope,
		roomsCreated: count,
		roomsEnded: count,
		participantSessions: count,
		uniqueIdentities: z
			.object({ value: count, basis: z.literal('utcDays'), days: count })
			.optional()
			.meta({ description: 'Sum of the daily values of the UTC days overlapping the range' }),
		connectionSuccessRate: z.number().optional(),
		avgRoomSize: z.number().optional(),
		avgRoomDurationMs: count.optional(),
		bytesUp: count,
		bytesDown: count,
		egressStarted: count,
		egressDurationMs: count,
		ingressSessions: count.meta({ description: 'Ingress sessions started in the range' }),
		ingressDurationMs: count.meta({ description: 'Duration of the ingress sessions ended in the range' }),
		apiCalls: count,
		apiErrorRate: z.number().optional()
	})
	.meta({ id: 'AnalyticsSummary', description: 'A value the stored documents cannot derive is absent' });

export const analyticsCsv = z.string().meta({ description: 'RFC 4180 with CRLF line ends and a header row' });
