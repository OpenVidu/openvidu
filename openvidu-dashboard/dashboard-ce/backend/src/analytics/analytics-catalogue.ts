import {
	ANALYTICS_METRIC_INFO,
	type AnalyticsDimension,
	type AnalyticsMetric,
	type AnalyticsMetricInfo
} from '@openvidu-dashboard/typings';

/** Rollup counters of one bucket flattened to dotted paths (`rooms.created`, `egress.byType.ROOM_COMPOSITE`). */
export type Counters = ReadonlyMap<string, number>;

/** Number of rollup documents folded into a {@link Counters}. */
export const DOCUMENTS = '#documents';

/** Map counter of the `egressEnded` expansion: one series per stored end status. */
export const EGRESS_ENDED_PATH = 'egress.endedByStatus';

export interface MetricDefinition {
	/** Paths to project from the rollup documents; never the parent of another projected path. */
	fields: readonly string[];
	/** Value of a bucket; `counters` is undefined when the bucket has no document. */
	value: (counters: Counters | undefined) => number | null;
}

export function round1(value: number): number {
	return Math.round(value * 10) / 10;
}

/** A counter summed over the bucket's documents, `0` without one. */
export function sum(path: string): MetricDefinition {
	return { fields: [path], value: (counters) => counters?.get(path) ?? 0 };
}

/** `numerator / denominator × scale` with one decimal, `null` without a denominator. */
export function ratio(
	numerator: string,
	denominator: string,
	scale: number,
	cap = Number.POSITIVE_INFINITY
): MetricDefinition {
	return {
		fields: [numerator, denominator],
		value: (counters) => {
			const total = counters?.get(denominator) ?? 0;

			return total > 0 ? Math.min(cap, round1(((counters?.get(numerator) ?? 0) / total) * scale)) : null;
		}
	};
}

/** Map counters of a dimension, and those of its errors when it has them. */
export interface DimensionDefinition {
	path: string;
	errors?: string;
}

/** The metrics and dimensions the analytics endpoints compute; the PRO edition adds its own to the CE ones. */
export interface AnalyticsCatalogue {
	metrics: Readonly<Partial<Record<Exclude<AnalyticsMetric, 'egressEnded'>, MetricDefinition>>>;
	dimensions: Readonly<Partial<Record<AnalyticsDimension, DimensionDefinition>>>;
	/** Unit, empty value and granularity rules of the metrics, `egressEnded` included. */
	info: Readonly<Partial<Record<AnalyticsMetric, AnalyticsMetricInfo>>>;
}

const CE_METRICS = {
	roomsCreated: sum('rooms.created'),
	roomsEnded: sum('rooms.ended'),
	participantsJoined: sum('participants.joined'),
	participantsActive: sum('participants.active'),
	participantsAborted: sum('participants.aborted'),
	// A participant that joins at the end of a bucket becomes active in the next one: the share never exceeds 100.
	connectionSuccessRate: ratio('participants.active', 'participants.joined', 100, 100),
	uniqueIdentities: {
		fields: ['uniqueIdentities'],
		// The reconciler writes the value once the UTC day has closed: a day with documents but no value has none yet.
		value: (counters) => (counters === undefined ? 0 : (counters.get('uniqueIdentities') ?? null))
	},
	participantMinutes: {
		fields: ['participants.minutes'],
		value: (counters) => round1(counters?.get('participants.minutes') ?? 0)
	},
	tracksPublished: sum('tracks.published'),
	egressStarted: sum('egress.started'),
	egressDurationMs: sum('egress.durationMs'),
	ingressSessions: sum('ingress.sessionsStarted'),
	ingressDurationMs: sum('ingress.durationMs'),
	bytesUp: sum('bytes.up'),
	bytesDown: sum('bytes.down'),
	apiCalls: sum('apiCalls.total'),
	apiErrors: sum('apiErrors.total')
} satisfies AnalyticsCatalogue['metrics'];

const CE_DIMENSIONS = {
	sdk: { path: 'participants.bySdk' },
	os: { path: 'participants.byOs' },
	browser: { path: 'participants.byBrowser' },
	connectionType: { path: 'participants.byConnectionType' },
	kind: { path: 'participants.byKind' },
	egressType: { path: 'egress.byType' },
	egressStatus: { path: 'egress.endedByStatus' },
	ingressInputType: { path: 'ingress.byInputType' }
} satisfies AnalyticsCatalogue['dimensions'];

/** The CE catalogue; the gate rejects the PRO metrics and dimensions before it is read. */
export const CE_ANALYTICS_CATALOGUE: AnalyticsCatalogue = {
	metrics: CE_METRICS,
	dimensions: CE_DIMENSIONS,
	info: ANALYTICS_METRIC_INFO
};

/** Counters of the summary. */
export const SUMMARY_FIELDS = [
	'rooms.created',
	'rooms.ended',
	'rooms.participantsSum',
	'rooms.durationMsSum',
	'participants.joined',
	'participants.active',
	'bytes.up',
	'bytes.down',
	'egress.started',
	'egress.durationMs',
	'ingress.sessionsStarted',
	'ingress.durationMs',
	'apiCalls.total',
	'apiErrors.total'
] as const;

/** The definition of `metric` in `catalogue`. */
export function metricDefinition(
	catalogue: AnalyticsCatalogue,
	metric: Exclude<AnalyticsMetric, 'egressEnded'>
): MetricDefinition {
	const definition = catalogue.metrics[metric];

	if (definition === undefined) {
		throw new Error(`The analytics catalogue has no metric ${metric}`);
	}

	return definition;
}

/** The definition of `dimension` in `catalogue`. */
export function dimensionDefinition(catalogue: AnalyticsCatalogue, dimension: AnalyticsDimension): DimensionDefinition {
	const definition = catalogue.dimensions[dimension];

	if (definition === undefined) {
		throw new Error(`The analytics catalogue has no dimension ${dimension}`);
	}

	return definition;
}

/** Projected paths of `metrics`. */
export function metricFields(catalogue: AnalyticsCatalogue, metrics: readonly AnalyticsMetric[]): string[] {
	const fields = metrics.flatMap((metric) =>
		metric === 'egressEnded' ? [EGRESS_ENDED_PATH] : metricDefinition(catalogue, metric).fields
	);

	return [...new Set(fields)];
}
