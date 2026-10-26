import { describe, expect, it } from 'vitest';

import { bucketStarts, densePoints, resolveGranularity } from '../../src/api/time-series.js';

const day = 86_400_000;

describe('time series', () => {
	it('chooses the finest granularity with at most 1 000 buckets', () => {
		const to = new Date('2026-10-13T00:00:00Z');

		expect(resolveGranularity('auto', new Date(to.getTime() - 7 * day), to)).toBe('15m');
		expect(resolveGranularity('auto', new Date(to.getTime() - day), to)).toBe('5m');
		expect(resolveGranularity('auto', new Date(to.getTime() - 15 * 60_000), to)).toBe('1m');
		expect(resolveGranularity('auto', new Date(to.getTime() - 400 * day), to)).toBe('1d');
	});

	it('rejects an explicit granularity above the bucket limit', () => {
		const to = new Date('2026-10-13T00:00:00Z');

		expect(resolveGranularity('1m', new Date(to.getTime() - 30 * day), to)).toEqual({
			error: 'gives more than 1000 buckets for this range; choose a coarser granularity'
		});
		expect(resolveGranularity('1h', new Date(to.getTime() - 30 * day), to)).toBe('1h');
	});

	it('starts daily buckets at local midnight across a DST change', () => {
		const starts = bucketStarts(
			new Date('2026-10-31T12:00:00Z'),
			new Date('2026-11-03T12:00:00Z'),
			'1d',
			'America/New_York'
		);

		expect(starts.map((start) => start.toISOString())).toEqual([
			'2026-10-31T04:00:00.000Z',
			'2026-11-01T04:00:00.000Z',
			'2026-11-02T05:00:00.000Z',
			'2026-11-03T05:00:00.000Z'
		]);
	});

	it('aligns six-hour and quarter-hour buckets on the zone wall clock', () => {
		expect(
			bucketStarts(new Date('2026-10-13T00:10:00Z'), new Date('2026-10-13T13:00:00Z'), '6h', 'Asia/Kolkata').map(
				(d) => d.toISOString()
			)
		).toEqual([
			'2026-10-12T18:30:00.000Z',
			'2026-10-13T00:30:00.000Z',
			'2026-10-13T06:30:00.000Z',
			'2026-10-13T12:30:00.000Z'
		]);
		expect(
			bucketStarts(new Date('2026-10-13T10:07:00Z'), new Date('2026-10-13T10:40:00Z'), '15m', 'UTC').map((d) =>
				d.toISOString()
			)
		).toEqual(['2026-10-13T10:00:00.000Z', '2026-10-13T10:15:00.000Z', '2026-10-13T10:30:00.000Z']);
	});

	it('steps six-hour buckets on the wall clock across both DST changes', () => {
		const starts = (from: string, to: string) =>
			bucketStarts(new Date(from), new Date(to), '6h', 'Europe/Madrid').map((d) => d.toISOString());

		expect(starts('2026-10-24T22:00:00Z', '2026-10-25T23:00:00Z')).toEqual([
			'2026-10-24T22:00:00.000Z',
			'2026-10-25T05:00:00.000Z',
			'2026-10-25T11:00:00.000Z',
			'2026-10-25T17:00:00.000Z'
		]);
		expect(starts('2026-03-28T23:00:00Z', '2026-03-29T22:00:00Z')).toEqual([
			'2026-03-28T23:00:00.000Z',
			'2026-03-29T04:00:00.000Z',
			'2026-03-29T10:00:00.000Z',
			'2026-03-29T16:00:00.000Z'
		]);
	});

	it.each(['Europe/Madrid', 'America/New_York', 'America/Santiago', 'Australia/Lord_Howe', 'Asia/Kolkata'])(
		'advances through a year of local days and six-hour buckets in %s',
		(zone) => {
			const from = new Date('2026-01-01T12:00:00Z');
			const to = new Date('2027-01-01T12:00:00Z');

			for (const [granularity, perDay] of [
				['1d', 1],
				['6h', 4]
			] as const) {
				const starts = bucketStarts(from, to, granularity, zone).map((d) => d.getTime());

				expect(starts.every((start, index) => index === 0 || start > (starts[index - 1] ?? 0))).toBe(true);
				expect(Math.abs(starts.length - 365 * perDay)).toBeLessThanOrEqual(perDay);
			}
		}
	);

	it('fills empty buckets with 0 for counters and null for averages', () => {
		const buckets = bucketStarts(new Date('2026-10-13T00:00:00Z'), new Date('2026-10-14T00:00:00Z'), '1h', 'UTC');
		const values = new Map([[buckets[3]?.getTime() ?? 0, 7]]);

		expect(buckets).toHaveLength(24);
		expect(densePoints(buckets, values, 0).filter(([, value]) => value === 0)).toHaveLength(23);
		expect(densePoints(buckets, values, null)[3]).toEqual(['2026-10-13T03:00:00.000Z', 7]);
		expect(densePoints(buckets, values, null)[4]).toEqual(['2026-10-13T04:00:00.000Z', null]);
	});
});
