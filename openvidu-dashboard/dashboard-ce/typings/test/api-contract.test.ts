import { describe, expect, expectTypeOf, it } from 'vitest';

import {
	ANALYTICS_CE_DIMENSIONS,
	ANALYTICS_CE_METRICS,
	ANALYTICS_METRIC_INFO,
	ANALYTICS_PRO_DIMENSIONS,
	ANALYTICS_PRO_METRICS,
	AnalyticsDimension,
	analyticsCsvFileName,
	AnalyticsMetric,
	analyticsMetricFeature,
	freshnessWindows,
	type OverviewRecentRoom,
	type OverviewResponse,
	type EgressListItem,
	type ParticipantListItem,
	type RoomListItem,
	STATS_GRANULARITIES,
	type StatusResponse
} from '../src/index.js';

/** Keys of T whose value is an array, at any depth. */
type ArrayPaths<T> = {
	[K in keyof T]-?: NonNullable<T[K]> extends readonly unknown[]
		? K
		: NonNullable<T[K]> extends object
			? ArrayPaths<NonNullable<T[K]>> extends never
				? never
				: K
			: never;
}[keyof T];

describe('API contract', () => {
	it('keeps id arrays out of room list items', () => {
		expectTypeOf<ArrayPaths<RoomListItem>>().toBeNever();
	});

	it('keeps arrays out of participant list items but the bounded published sources', () => {
		expectTypeOf<ArrayPaths<ParticipantListItem>>().toEqualTypeOf<'publishedSources'>();
	});

	it('lists the stats granularities', () => {
		expect(STATS_GRANULARITIES).toEqual(['30s', '1m', '5m', '15m', '1h', '6h', '1d']);
	});

	it('keeps the request, locations and status history out of egress list items', () => {
		expectTypeOf<Extract<keyof EgressListItem, 'request' | 'statusHistory' | 'location' | 'error'>>().toBeNever();
	});

	it('puts every analytics metric and dimension in exactly one of the CE set or a PRO set', () => {
		const metrics = [...ANALYTICS_CE_METRICS, ...Object.values(ANALYTICS_PRO_METRICS).flat()];
		const dimensions = [...ANALYTICS_CE_DIMENSIONS, ...Object.values(ANALYTICS_PRO_DIMENSIONS).flat()];

		expect([...metrics].sort()).toEqual(Object.values(AnalyticsMetric).sort());
		expect([...dimensions].sort()).toEqual(Object.values(AnalyticsDimension).sort());
		expect(Object.keys(ANALYTICS_METRIC_INFO).sort()).toEqual([...ANALYTICS_CE_METRICS].sort());
		expect(analyticsMetricFeature('scoreAvg')).toBe('analytics-quality');
		expect(analyticsMetricFeature('roomsCreated')).toBeUndefined();

		for (const info of Object.values(ANALYTICS_METRIC_INFO)) {
			expect(info.empty).toBe(['percent', 'mos'].includes(info.unit) ? null : 0);
		}
	});

	it('names analytics CSV files without colons', () => {
		expect(analyticsCsvFileName('series', '2026-10-12T12:00:00.000Z', '2026-10-13T12:00:00.000Z')).toBe(
			'analytics-series-2026-10-12T120000.000Z-2026-10-13T120000.000Z.csv'
		);
	});

	it('keeps arrays out of the recent rooms of the overview', () => {
		expectTypeOf<ArrayPaths<OverviewRecentRoom>>().toBeNever();
	});

	it('derives the freshness windows from the writer batch interval', () => {
		expect(freshnessWindows()).toEqual({ freshMs: 30_000, silentMs: 60_000, staleMs: 90_000 });
		expect(freshnessWindows(10_000)).toEqual(freshnessWindows());
		expect(freshnessWindows(60_000)).toEqual({ freshMs: 95_000, silentMs: 135_000, staleMs: 135_000 });
		expect(freshnessWindows(1_000)).toEqual({ freshMs: 30_000, silentMs: 60_000, staleMs: 90_000 });
	});

	it('serves the server status apart from the overview', () => {
		expectTypeOf<keyof StatusResponse>().toEqualTypeOf<'generatedAt' | 'schema' | 'migration' | 'writer'>();
		expectTypeOf<OverviewResponse>().not.toHaveProperty('health');
	});
});
