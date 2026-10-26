import type {
	AnalyticsBreakdownsResponse,
	AnalyticsDimension,
	AnalyticsSeriesResponse,
	AnalyticsSummary
} from '@openvidu-dashboard/typings';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const SIZES: Record<string, number> = { '5m': 5 * MINUTE, '15m': 15 * MINUTE, '1h': HOUR, '6h': 6 * HOUR, '1d': DAY };

export const ANALYTICS_SUMMARY: AnalyticsSummary = {
	from: '2026-10-12T12:00:00.000Z',
	to: '2026-10-13T12:00:00.000Z',
	scope: 'global',
	roomsCreated: 1203,
	roomsEnded: 1100,
	participantSessions: 9000,
	uniqueIdentities: { value: 4120, basis: 'utcDays', days: 7 },
	connectionSuccessRate: 97.8,
	avgRoomSize: 4,
	avgRoomDurationMs: 360_000,
	bytesUp: 1_200_000_000_000,
	bytesDown: 300_000_000_000,
	egressStarted: 12,
	egressDurationMs: 7_200_000,
	ingressSessions: 30,
	ingressDurationMs: 5_400_000,
	apiCalls: 5000,
	apiErrorRate: 1
};

/** A breakdown key with its count and, for a dimension that has them, its errors. */
export type BreakdownKey = [key: string, count: number, errors?: number];

/** Series values and breakdown keys a suite adds to the CE ones, such as those of the PRO metrics and dimensions. */
export interface AnalyticsFixtures {
	series?: Record<string, (index: number) => number | null>;
	breakdowns?: Partial<Record<AnalyticsDimension, BreakdownKey[]>>;
}

const BREAKDOWN_KEYS: Partial<Record<AnalyticsDimension, BreakdownKey[]>> = {
	sdk: [
		['JS', 600],
		['SWIFT', 300],
		['ANDROID', 100]
	],
	os: [
		['windows', 500],
		['macos', 300],
		['android', 200]
	],
	browser: [
		['chrome', 700],
		['safari', 200],
		['firefox', 100]
	],
	connectionType: [
		['udp', 900],
		['tcp', 80],
		['turn', 20]
	],
	kind: [
		['STANDARD', 950],
		['EGRESS', 30],
		['AGENT', 20]
	],
	egressType: [
		['room_composite', 10],
		['track', 2]
	],
	egressStatus: [['EGRESS_COMPLETE', 12]],
	ingressInputType: [
		['rtmp', 20],
		['whip', 8],
		['url', 2]
	]
};

/** What the API resolves `auto` to for a range. */
function resolveGranularity(granularity: string, span: number): string {
	if (granularity !== 'auto') {
		return granularity;
	}

	return span <= DAY ? '5m' : span <= 7 * DAY ? '1h' : span <= 90 * DAY ? '6h' : '1d';
}

/** Dense series of `metrics` over the range, with values that never leave a card empty. */
export function analyticsSeries(params: URLSearchParams, fixtures: AnalyticsFixtures = {}): AnalyticsSeriesResponse {
	const from = Date.parse(params.get('from') ?? '');
	const to = Date.parse(params.get('to') ?? '');
	const granularity = resolveGranularity(params.get('granularity') ?? 'auto', to - from);
	const size = SIZES[granularity] ?? HOUR;
	const starts: number[] = [];

	for (let start = Math.floor(from / size) * size; start < to; start += size) {
		starts.push(start);
	}

	const points = (value: (index: number) => number | null) =>
		starts.map((start, index): [string, number | null] => [new Date(start).toISOString(), value(index)]);
	const series = (params.get('metrics') ?? '').split(',').flatMap((name) => {
		const values = fixtures.series?.[name];

		if (values !== undefined) {
			return [{ name, points: points(values) }];
		}

		switch (name) {
			case 'egressEnded':
				return [
					{ name: 'egressEnded.complete', points: points((index) => (index % 3) + 1) },
					{ name: 'egressEnded.failed', points: points((index) => index % 2) }
				];
			case 'connectionSuccessRate':
				return [{ name, points: points((index) => 95 + (index % 5)) }];
			case 'bytesUp':
			case 'bytesDown':
				return [{ name, points: points((index) => ((index % 6) + 1) * 1_000_000) }];
			case 'uniqueIdentities':
				return [{ name, points: points((index) => 500 + index * 10), basis: 'utcDay' as const }];
			case 'egressDurationMs':
			case 'ingressDurationMs':
				return [{ name, points: points((index) => ((index % 4) + 1) * 600_000) }];
			default:
				return [{ name, points: points((index) => (index % 7) + 1) }];
		}
	});

	return {
		granularity: granularity as AnalyticsSeriesResponse['granularity'],
		from: new Date(from).toISOString(),
		to: new Date(to).toISOString(),
		scope: (params.get('scope') ?? 'global') as AnalyticsSeriesResponse['scope'],
		series
	};
}

export function analyticsBreakdowns(
	params: URLSearchParams,
	fixtures: AnalyticsFixtures = {}
): AnalyticsBreakdownsResponse {
	const dimensions = (params.get('dimensions') ?? '').split(',') as AnalyticsDimension[];

	return {
		from: params.get('from') ?? '',
		to: params.get('to') ?? '',
		scope: (params.get('scope') ?? 'global') as AnalyticsBreakdownsResponse['scope'],
		breakdowns: dimensions.map((dimension) => {
			const keys = fixtures.breakdowns?.[dimension] ?? BREAKDOWN_KEYS[dimension] ?? [];
			const total = keys.reduce((sum, [, count]) => sum + count, 0);

			return {
				dimension,
				total,
				items: keys.map(([key, count, errors]) => ({
					key,
					count,
					percent: Math.round((count / total) * 1000) / 10,
					...(errors === undefined ? {} : { errors })
				}))
			};
		})
	};
}

/** CSV of an export and the attachment name the server gives it. */
export function analyticsCsv(params: URLSearchParams): { body: string; fileName: string } {
	const kind = params.get('kind') ?? 'series';

	return {
		body:
			kind === 'series'
				? 'bucket,bytesUp\r\n2026-10-13T10:00:00.000Z,1000\r\n'
				: 'dimension,key,count,percent\r\n',
		fileName: `analytics-${kind}-${params.get('from') ?? ''}-${params.get('to') ?? ''}.csv`.replaceAll(':', '')
	};
}
