import * as z from 'zod';
import { describe, expect, it } from 'vitest';

import { csvParam, limitParam, orderParam, qParam, timeRangeQuery, tzParam } from '../../src/api/query.js';
import { isTimeZone, resolveTimeExpression } from '../../src/api/time-expression.js';

const NOW = new Date('2026-10-13T12:00:00Z');
const range = timeRangeQuery(() => NOW);

function issues(schema: z.ZodType, value: unknown) {
	const result = schema.safeParse(value);

	return result.success ? [] : result.error.issues.map((issue) => ({ path: issue.path, message: issue.message }));
}

describe('time expressions', () => {
	it('resolves relative expressions at request time', () => {
		expect(range.parse({ from: 'now-24h', to: 'now' })).toEqual({
			from: new Date('2026-10-12T12:00:00Z'),
			to: NOW,
			tz: 'UTC'
		});
		expect(range.parse({})).toEqual({ from: new Date('2026-10-12T12:00:00Z'), to: NOW, tz: 'UTC' });
		expect(resolveTimeExpression('now-90m', NOW, 'UTC')).toEqual(new Date('2026-10-13T10:30:00Z'));
		expect(resolveTimeExpression('now-7d', NOW, 'UTC')).toEqual(new Date('2026-10-06T12:00:00Z'));
	});

	it('snaps to the start of the month and day in the caller zone', () => {
		expect(range.parse({ from: 'now/M', tz: 'Europe/Madrid' }).from).toEqual(new Date('2026-09-30T22:00:00Z'));
		expect(resolveTimeExpression('now/d', NOW, 'America/New_York')).toEqual(new Date('2026-10-13T04:00:00Z'));
		expect(resolveTimeExpression('now/d', NOW, 'UTC')).toEqual(new Date('2026-10-13T00:00:00Z'));
	});

	it('accepts ISO 8601 with an offset or Z only', () => {
		expect(resolveTimeExpression('2026-10-13T10:00:00.250Z', NOW, 'UTC')).toEqual(
			new Date('2026-10-13T10:00:00.250Z')
		);
		expect(resolveTimeExpression('2026-10-13T12:00:00+02:00', NOW, 'UTC')).toEqual(
			new Date('2026-10-13T10:00:00Z')
		);
		expect(resolveTimeExpression('2026-10-13T10:00:00', NOW, 'UTC')).toBeUndefined();
		expect(resolveTimeExpression('yesterday', NOW, 'UTC')).toBeUndefined();
		expect(resolveTimeExpression('now-5w', NOW, 'UTC')).toBeUndefined();
	});

	it('rejects an inverted or empty range on from', () => {
		expect(issues(range, { from: '2026-10-13T00:00:00Z', to: '2026-10-12T00:00:00Z' })).toEqual([
			{ path: ['from'], message: 'must be before to' }
		]);
		expect(issues(range, { from: 'now', to: 'now' })[0]?.path).toEqual(['from']);
		expect(issues(range, { from: 'later' })[0]?.path).toEqual(['from']);
	});

	it('validates the time zone', () => {
		expect(issues(range, { tz: 'Mars/Olympus' })[0]?.path).toEqual(['tz']);
		expect(tzParam.parse(undefined)).toBe('UTC');
		expect(isTimeZone('Europe/Madrid')).toBe(true);
		expect(isTimeZone('Japan')).toBe(true);
		expect(isTimeZone('+02:00')).toBe(false);
	});
});

describe('list parameters', () => {
	it('bounds the page size', () => {
		expect(limitParam.parse(undefined)).toBe(25);
		expect(limitParam.parse('100')).toBe(100);

		for (const value of ['101', '0', 'abc', '2.5']) {
			expect(limitParam.safeParse(value).success, value).toBe(false);
		}
	});

	it('reports every invalid parameter at once', () => {
		const schema = z.object({ limit: limitParam, order: orderParam.default('desc') });

		expect(issues(schema, { limit: '500', order: 'sideways' }).map((issue) => issue.path)).toEqual([
			['limit'],
			['order']
		]);
	});

	it('trims and bounds the search text', () => {
		expect(qParam.parse('  DEMO ')).toBe('DEMO');
		expect(qParam.parse('   ')).toBeUndefined();
		expect(qParam.safeParse('x'.repeat(101)).success).toBe(false);
	});

	it('splits comma-separated enumeration values', () => {
		const kind = csvParam(['STANDARD', 'EGRESS', 'AGENT']);

		expect(kind.parse('EGRESS, AGENT')).toEqual(['EGRESS', 'AGENT']);
		expect(kind.safeParse('EGRESS,ROBOT').success).toBe(false);
	});
});
