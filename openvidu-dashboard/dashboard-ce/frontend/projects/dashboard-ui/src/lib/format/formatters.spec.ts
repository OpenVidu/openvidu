import { describe, expect, it } from 'vitest';

import {
	formatBitrate,
	formatBytes,
	formatDuration,
	formatNumber,
	formatPercent,
	formatTimestamp
} from './formatters.js';

describe('formatters', () => {
	it.each([
		[1203, '1,203'],
		[0, '0'],
		[1234567.5, '1,234,567.5']
	])('formats the number %d', (value, expected) => {
		expect(formatNumber(value)).toBe(expected);
	});

	it.each([
		[0.986, '98.6 %'],
		[1, '100.0 %'],
		[0, '0.0 %']
	])('formats the ratio %d as a percentage', (value, expected) => {
		expect(formatPercent(value)).toBe(expected);
	});

	it.each([
		[0, '0 B'],
		[850, '850 B'],
		[1000, '1 kB'],
		[1536, '1.54 kB'],
		[12_345_678, '12.3 MB'],
		[999_999, '1 MB'],
		[1_200_000_000_000, '1.2 TB'],
		[48_000_000, '48 MB']
	])('formats %d bytes', (value, expected) => {
		expect(formatBytes(value)).toBe(expected);
	});

	it.each([
		[850_000, '850 kbps'],
		[2_500_000, '2.5 Mbps'],
		[1500, '1.5 kbps'],
		[0, '0 kbps']
	])('formats %d bps', (value, expected) => {
		expect(formatBitrate(value)).toBe(expected);
	});

	it.each([
		[850, '850 ms'],
		[42_000, '42 s'],
		[725_000, '12 m 05 s'],
		[3_725_000, '1 h 02 m'],
		[273_600_000, '3 d 4 h'],
		[-5, '0 ms']
	])('formats %d ms', (value, expected) => {
		expect(formatDuration(value)).toBe(expected);
	});

	it('formats timestamps in the zone with a UTC suffix', () => {
		const at = '2026-10-13T10:31:05.120Z';

		expect(formatTimestamp(at, { tz: 'Europe/Madrid' })).toBe('2026-10-13 12:31:05');
		expect(formatTimestamp(at, { tz: 'UTC' })).toBe('2026-10-13 10:31:05 UTC');
		expect(formatTimestamp(at, { tz: 'UTC', milliseconds: true })).toBe('2026-10-13 10:31:05.120 UTC');
	});

	it('omits the date inside the current day of a 24 h range', () => {
		const now = new Date('2026-10-13T20:00:00Z');
		const day = 86_400_000;

		expect(formatTimestamp('2026-10-13T10:31:05Z', { tz: 'Europe/Madrid', now, rangeMs: day })).toBe('12:31:05');
		expect(formatTimestamp('2026-10-12T21:31:05Z', { tz: 'Europe/Madrid', now, rangeMs: day })).toBe(
			'2026-10-12 23:31:05'
		);
		expect(formatTimestamp('2026-10-12T22:31:05Z', { tz: 'Europe/Madrid', now, rangeMs: day })).toBe('00:31:05');
		expect(formatTimestamp('2026-10-12T21:31:05Z', { tz: 'UTC', now, rangeMs: day })).toBe(
			'2026-10-12 21:31:05 UTC'
		);
		expect(formatTimestamp('2026-10-13T10:31:05Z', { tz: 'UTC', now, rangeMs: 7 * day })).toBe(
			'2026-10-13 10:31:05 UTC'
		);
	});

	it('reads a ratio of 0.9643 and a slice of 0.25 as percentages', () => {
		expect([0.9643, 0.25].map(formatPercent)).toEqual(['96.4 %', '25.0 %']);
	});
});
