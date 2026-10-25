import * as z from 'zod';

import {
	ANALYTICS_GRANULARITIES,
	ANALYTICS_SCOPE_PATTERN,
	AnalyticsDimension,
	type AnalyticsGranularity,
	AnalyticsMetric,
	type AnalyticsScope
} from '@openvidu-dashboard/typings';

import { csvParam, rangedQuery } from '../api/query.js';
import { enumValues } from '../util/enum-values.js';

const GRANULARITIES = ['auto', ...ANALYTICS_GRANULARITIES] as const satisfies readonly AnalyticsGranularity[];

const granularityParam = z
	.enum(GRANULARITIES, {
		error: (issue) =>
			issue.input === '1m' || issue.input === '30s'
				? 'the finest analytics granularity is 5m'
				: `must be one of ${GRANULARITIES.join(', ')}`
	})
	.default('auto');

// A transformed schema keeps no examples in its input JSON Schema, so these go on the parameter.
const scopeParam = z
	.string()
	.regex(ANALYTICS_SCOPE_PATTERN, { error: 'must be global or node:<id>' })
	.transform((value) => value as AnalyticsScope)
	.default('global')
	.meta({ description: '`global` or `node:<id>` (PRO)', param: { example: 'global' } });

const metricsParam = csvParam(enumValues(AnalyticsMetric), { strict: true }).meta({
	description: 'Comma-separated metrics, each at most once',
	param: { example: 'roomsCreated,bytesUp' }
});

const dimensionsParam = csvParam(enumValues(AnalyticsDimension), { strict: true }).meta({
	description: 'Comma-separated dimensions, each at most once',
	param: { example: 'sdk,os' }
});

export function analyticsSeriesQuery(now: () => Date) {
	return rangedQuery(now, { metrics: metricsParam, granularity: granularityParam, scope: scopeParam });
}

export type AnalyticsSeriesParams = z.output<ReturnType<typeof analyticsSeriesQuery>>;

export function analyticsBreakdownsQuery(now: () => Date) {
	return rangedQuery(now, { dimensions: dimensionsParam, scope: scopeParam });
}

export type AnalyticsBreakdownsParams = z.output<ReturnType<typeof analyticsBreakdownsQuery>>;

export function analyticsSummaryQuery(now: () => Date) {
	return rangedQuery(now, { scope: scopeParam });
}

export type AnalyticsSummaryParams = z.output<ReturnType<typeof analyticsSummaryQuery>>;

export type AnalyticsExportParams =
	({ kind: 'series' } & AnalyticsSeriesParams) | ({ kind: 'breakdowns' } & AnalyticsBreakdownsParams);

/** `kind` and the parameters of the series or the breakdowns endpoint, validated by that endpoint's schema. */
export function analyticsExportQuery(now: () => Date) {
	const series = analyticsSeriesQuery(now);
	const breakdowns = analyticsBreakdownsQuery(now);

	return z
		.object({
			kind: z.enum(['series', 'breakdowns'], { error: 'must be series or breakdowns' }),
			metrics: z.string().optional().meta({ description: 'Metrics of `kind=series`' }),
			dimensions: z.string().optional().meta({ description: 'Dimensions of `kind=breakdowns`' }),
			granularity: z.string().optional().meta({ description: 'Granularity of `kind=series`' }),
			scope: z.string().optional(),
			from: z.string().optional(),
			to: z.string().optional(),
			tz: z.string().optional()
		})
		.transform((value, context): AnalyticsExportParams => {
			const { kind, ...rest } = value;
			const parameters = Object.fromEntries(Object.entries(rest).filter(([, item]) => item !== undefined));
			const parsed = kind === 'series' ? series.safeParse(parameters) : breakdowns.safeParse(parameters);

			if (!parsed.success) {
				for (const issue of parsed.error.issues) {
					context.addIssue({ code: 'custom', path: issue.path, message: issue.message });
				}

				return z.NEVER;
			}

			return { kind, ...parsed.data } as AnalyticsExportParams;
		});
}
