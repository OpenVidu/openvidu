import {
	ANALYTICS_METRIC_INFO,
	type AnalyticsDimension,
	type AnalyticsMetric,
	type AnalyticsMetricInfo,
	ROOM_SIZE_DIMENSIONS,
	RoomTopology
} from '@openvidu-dashboard/typings';

/** Rollup counters of one bucket flattened to dotted paths (`rooms.created`, `egress.byType.ROOM_COMPOSITE`). */
export type Counters = ReadonlyMap<string, number>;

/** Number of rollup documents folded into a {@link Counters}. */
export const DOCUMENTS = '#documents';

/** Metrics that expand into one series per key of a map counter, named `<metric>.<key>`. */
export const EXPANDED_METRICS = {
	egressEnded: 'egress.endedByStatus',
	roomsByTopology: 'rooms.byTopology'
} as const satisfies Partial<Record<AnalyticsMetric, string>>;
export type ExpandedMetric = keyof typeof EXPANDED_METRICS;

export function isExpandedMetric(metric: AnalyticsMetric): metric is ExpandedMetric {
	return Object.hasOwn(EXPANDED_METRICS, metric);
}

/** Counters of the rooms ended with a topology, one per class: their sum is the number of classified rooms. */
const TOPOLOGY_PATHS = Object.values(RoomTopology).map((topology) => `${EXPANDED_METRICS.roomsByTopology}.${topology}`);

/** Rooms ended in the counters with a topology; rooms of an earlier writer have none. */
export function classifiedRooms(counters: Counters | undefined): number {
	return TOPOLOGY_PATHS.reduce((total, path) => total + (counters?.get(path) ?? 0), 0);
}

export interface MetricDefinition {
	/** Paths to project from the rollup documents; never the parent of another projected path. */
	fields: readonly string[];
	/** The fields combine across rollup documents by their maximum instead of their sum. */
	maximum?: true;
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

/** The largest value of the bucket's documents, `null` when none of them has one. */
export function peak(path: string): MetricDefinition {
	return { fields: [path], maximum: true, value: (counters) => counters?.get(path) ?? null };
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
	metrics: Readonly<Partial<Record<Exclude<AnalyticsMetric, ExpandedMetric>, MetricDefinition>>>;
	dimensions: Readonly<Partial<Record<AnalyticsDimension, DimensionDefinition>>>;
	/** Unit, empty value and granularity rules of the metrics, the expanded ones included. */
	info: Readonly<Partial<Record<AnalyticsMetric, AnalyticsMetricInfo>>>;
}

const CE_METRICS = {
	roomsCreated: sum('rooms.created'),
	roomsEnded: sum('rooms.ended'),
	roomsPeakActive: peak('rooms.peakActive'),
	participantsJoined: sum('participants.joined'),
	participantsActive: sum('participants.active'),
	participantsAborted: sum('participants.aborted'),
	participantsPeakActive: peak('participants.peakActive'),
	// A participant that joins at the end of a bucket becomes active in the next one: the share never exceeds 100.
	connectionSuccessRate: ratio('participants.active', 'participants.joined', 100, 100),
	uniqueIdentities: {
		fields: ['uniqueIdentities'],
		// The server's aggregator writes the value once the UTC day has closed: a day with documents but no value has none
		// yet.
		value: (counters) => (counters === undefined ? 0 : (counters.get('uniqueIdentities') ?? null))
	},
	participantMinutes: {
		fields: ['participants.minutes'],
		value: (counters) => round1(counters?.get('participants.minutes') ?? 0)
	},
	tracksPublished: sum('tracks.published'),
	egressStarted: sum('egress.started'),
	egressDurationMs: sum('egress.durationMs'),
	egressPeakActive: peak('egress.peakActive'),
	ingressSessions: sum('ingress.sessionsStarted'),
	ingressDurationMs: sum('ingress.durationMs'),
	ingressPeakActive: peak('ingress.peakActive'),
	recordedRoomsRate: {
		fields: ['rooms.recorded', ...TOPOLOGY_PATHS],
		value: (counters) => {
			const classified = classifiedRooms(counters);

			return classified > 0 ? round1(((counters?.get('rooms.recorded') ?? 0) / classified) * 100) : null;
		}
	},
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
	ingressInputType: { path: 'ingress.byInputType' },
	[ROOM_SIZE_DIMENSIONS.no_publishers]: { path: 'rooms.sizeByTopology.no_publishers' },
	[ROOM_SIZE_DIMENSIONS.one_to_many]: { path: 'rooms.sizeByTopology.one_to_many' },
	[ROOM_SIZE_DIMENSIONS.many_to_many]: { path: 'rooms.sizeByTopology.many_to_many' }
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
	'rooms.recorded',
	...TOPOLOGY_PATHS,
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
];

/** The definition of `metric` in `catalogue`. */
export function metricDefinition(
	catalogue: AnalyticsCatalogue,
	metric: Exclude<AnalyticsMetric, ExpandedMetric>
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

/** Paths of the catalogue that combine across rollup documents by their maximum. */
export function maximumPaths(catalogue: AnalyticsCatalogue): ReadonlySet<string> {
	return new Set(
		Object.values(catalogue.metrics).flatMap((definition) => (definition.maximum === true ? definition.fields : []))
	);
}

/**
 * Projected paths of `metrics`, without the paths whose parent is projected too: MongoDB rejects that projection, and
 * the parent brings the children.
 */
export function metricFields(catalogue: AnalyticsCatalogue, metrics: readonly AnalyticsMetric[]): string[] {
	const fields = new Set(
		metrics.flatMap((metric) =>
			isExpandedMetric(metric) ? [EXPANDED_METRICS[metric]] : metricDefinition(catalogue, metric).fields
		)
	);

	return [...fields].filter((path) => ![...fields].some((parent) => path.startsWith(`${parent}.`)));
}
