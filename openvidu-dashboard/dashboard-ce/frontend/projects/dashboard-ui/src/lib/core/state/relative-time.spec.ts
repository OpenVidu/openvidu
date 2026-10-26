import { describe, expect, it } from 'vitest';

import { isTimeExpression, isTimeZone, resolveRange, resolveTime } from './relative-time.js';

const NOW = new Date('2026-10-13T12:40:00.000Z');

describe('relative time', () => {
	it.each([
		['now', '2026-10-13T12:40:00.000Z'],
		['now-15m', '2026-10-13T12:25:00.000Z'],
		['now-24h', '2026-10-12T12:40:00.000Z'],
		['now-7d', '2026-10-06T12:40:00.000Z'],
		['2026-10-01T00:00:00Z', '2026-10-01T00:00:00.000Z'],
		['2026-10-01T02:00+02:00', '2026-10-01T00:00:00.000Z']
	])('resolves %s', (expression, expected) => {
		expect(resolveTime(expression, NOW, 'UTC')?.toISOString()).toBe(expected);
	});

	it.each([
		'',
		'yesterday',
		'now-1w',
		'now-h',
		'now+1h',
		'now/y',
		'2026-10-01',
		'2026-10-01T00:00',
		'2026-13-01T00:00Z'
	])('rejects %j', (expression) => {
		expect(isTimeExpression(expression)).toBe(false);
		expect(resolveTime(expression, NOW, 'UTC')).toBeUndefined();
	});

	it('snaps now/M to the first day of the month in the zone', () => {
		expect(resolveTime('now/M', NOW, 'Europe/Madrid')?.toISOString()).toBe('2026-09-30T22:00:00.000Z');
		expect(resolveTime('now/M', NOW, 'UTC')?.toISOString()).toBe('2026-10-01T00:00:00.000Z');
	});

	it('snaps across a DST transition with the offset of the day it lands on', () => {
		const afterSpringForward = new Date('2026-03-29T12:00:00.000Z');
		const afterFallBack = new Date('2026-11-02T08:00:00.000Z');

		expect(resolveTime('now/d', afterSpringForward, 'Europe/Madrid')?.toISOString()).toBe(
			'2026-03-28T23:00:00.000Z'
		);
		expect(resolveTime('now/M', afterFallBack, 'Europe/Madrid')?.toISOString()).toBe('2026-10-31T23:00:00.000Z');
		expect(resolveTime('now-24h', afterSpringForward, 'Europe/Madrid')?.toISOString()).toBe(
			'2026-03-28T12:00:00.000Z'
		);
	});

	it('validates zones', () => {
		expect(isTimeZone('UTC')).toBe(true);
		expect(isTimeZone('Europe/Madrid')).toBe(true);
		expect(isTimeZone('Mars/Olympus')).toBe(false);
		expect(isTimeZone('+02:00')).toBe(false);
		expect(isTimeZone('')).toBe(false);
	});

	it('resolves a range only when from is before to', () => {
		expect(resolveRange({ from: 'now-1h', to: 'now', tz: 'UTC' }, NOW)).toEqual({
			from: new Date('2026-10-13T11:40:00.000Z'),
			to: NOW
		});
		expect(resolveRange({ from: 'now', to: 'now-1h', tz: 'UTC' }, NOW)).toBeUndefined();
		expect(resolveRange({ from: 'bogus', to: 'now', tz: 'UTC' }, NOW)).toBeUndefined();
	});
});
