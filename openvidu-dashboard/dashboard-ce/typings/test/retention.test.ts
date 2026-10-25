import { describe, expect, it } from 'vitest';

import { formatRetentionLength, retentionLength } from '../src/index.js';

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('retention length wording', () => {
	it.each([
		[7 * DAY, { count: 7, unit: 'day' }, '7 days', '7-day'],
		[DAY, { count: 1, unit: 'day' }, '1 day', '1-day'],
		[36 * HOUR, { count: 36, unit: 'hour' }, '36 hours', '36-hour'],
		[90 * MINUTE, { count: 90, unit: 'minute' }, '90 minutes', '90-minute'],
		[HOUR + SECOND, { count: 3_601, unit: 'second' }, '3601 seconds', '3601-second']
	])('names %i ms in its largest exact unit', (ms, length, plain, adjective) => {
		expect(retentionLength(ms)).toEqual(length);
		expect(formatRetentionLength(ms)).toBe(plain);
		expect(formatRetentionLength(ms, { adjective: true })).toBe(adjective);
	});

	it('never rounds to whole days', () => {
		expect(formatRetentionLength(HOUR)).toBe('1 hour');
		expect(formatRetentionLength(DAY + 12 * HOUR)).toBe('36 hours');
	});

	it('formats the count with the given formatter', () => {
		expect(formatRetentionLength(1_825 * DAY, { formatCount: (count) => count.toLocaleString('en-US') })).toBe(
			'1,825 days'
		);
	});
});
