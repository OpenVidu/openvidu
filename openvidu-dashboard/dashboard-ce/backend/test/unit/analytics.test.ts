import type { Db } from 'mongodb';
import type * as z from 'zod';
import { describe, expect, it } from 'vitest';

import {
	ANALYTICS_CE_DIMENSIONS,
	ANALYTICS_CE_METRICS,
	ANALYTICS_CSV_CONTENT_TYPE,
	type AnalyticsMetric
} from '@openvidu-dashboard/typings';

import { AnalyticsCache } from '../../src/analytics/analytics-cache.js';
import { CE_ANALYTICS_CATALOGUE } from '../../src/analytics/analytics-catalogue.js';
import { breakdownsCsv, seriesCsv, toCsv } from '../../src/analytics/analytics-csv.js';
import { AnalyticsFeatureGate } from '../../src/analytics/analytics-gate.js';
import { planSeries, type SeriesPlanInput, snapRange } from '../../src/analytics/analytics-planner.js';
import {
	analyticsBreakdownsResponse,
	analyticsSeriesResponse,
	analyticsSummaryResponse
} from '../../src/analytics/analytics-responses.js';
import {
	analyticsBreakdownsQuery,
	analyticsExportQuery,
	analyticsSeriesQuery,
	analyticsSummaryQuery
} from '../../src/analytics/analytics-schemas.js';
import { AnalyticsService } from '../../src/analytics/analytics-service.js';
import { ApiError } from '../../src/http/api-error.js';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const NOW = new Date('2026-10-13T12:00:00Z');
const RETENTION = { statsMs: 7 * DAY, entitiesMs: 90 * DAY, rollups5MinMs: 7 * DAY, rollupsHourlyMs: 400 * DAY };

interface Doc {
	scope: string;
	bucket: Date;
	[field: string]: unknown;
}

interface Read {
	collection: string;
	from: Date;
	to: Date;
}

/** A database holding rollup documents per collection; `schema_meta` is empty, so the retention is the default. */
function fakeDb(collections: Record<string, Doc[]>, reads: Read[] = []): Db {
	return {
		collection: (name: string) => ({
			find: (filter: { scope: string; bucket: { $gte: Date; $lt: Date } }) => ({
				sort: () => {
					reads.push({ collection: name, from: filter.bucket.$gte, to: filter.bucket.$lt });

					const rows = (collections[name] ?? [])
						.filter(
							(doc) =>
								doc.scope === filter.scope &&
								doc.bucket >= filter.bucket.$gte &&
								doc.bucket < filter.bucket.$lt
						)
						.sort((a, b) => a.bucket.getTime() - b.bucket.getTime())
						.map(({ scope: _scope, ...row }) => structuredClone(row));

					// `for await` reads an array as well as the driver's cursor.
					return rows;
				}
			}),
			findOne: () => Promise.resolve(null)
		})
	} as unknown as Db;
}

function service(db: Db, options: { now?: () => Date; ttlMs?: number } = {}): AnalyticsService {
	const now = options.now ?? (() => NOW);

	return new AnalyticsService(db, {
		now,
		cache: new AnalyticsCache(options.ttlMs ?? 0, now),
		gate: new AnalyticsFeatureGate(() => []),
		catalogue: CE_ANALYTICS_CATALOGUE
	});
}

const seriesQuery = analyticsSeriesQuery(() => NOW);

function series(query: Record<string, string>) {
	return seriesQuery.parse(query);
}

function plan(input: Partial<SeriesPlanInput> & { from: Date }): ReturnType<typeof planSeries> {
	return planSeries({
		to: NOW,
		tz: 'UTC',
		granularity: 'auto',
		metrics: ['roomsCreated'],
		now: NOW,
		retention: RETENTION,
		info: CE_ANALYTICS_CATALOGUE.info,
		...input
	});
}

function issueOf(run: () => unknown): { path: unknown; message: string } | undefined {
	try {
		run();
	} catch (error) {
		if (error instanceof ApiError) {
			const issues = error.details?.issues as { path: unknown; message: string }[] | undefined;

			return issues?.[0];
		}

		throw error;
	}

	return undefined;
}

function firstIssue(schema: z.ZodType, value: unknown) {
	const result = schema.safeParse(value);

	return result.success
		? undefined
		: { path: result.error.issues[0]?.path, message: result.error.issues[0]?.message };
}

const at = (iso: string) => new Date(iso);

describe('analytics planner', () => {
	it.each([
		[DAY, '5m', 'analytics_5min', 288],
		[7 * DAY, '1h', 'analytics_hourly', 168],
		[30 * DAY, '6h', 'analytics_hourly', 120],
		[100 * DAY, '1d', 'analytics_daily', 101]
	])('resolves auto for a range of %d ms to %s on %s', (span, granularity, collection, buckets) => {
		const result = plan({ from: new Date(NOW.getTime() - span) });

		expect(result.granularity).toBe(granularity);
		expect(result.collection).toBe(collection);
		expect(result.starts).toHaveLength(buckets);
	});

	it('rejects sub-hour granularities on long or expired ranges and serves old days hourly', () => {
		expect(issueOf(() => plan({ from: new Date(NOW.getTime() - 2 * DAY), granularity: '5m' }))).toEqual({
			path: ['granularity'],
			message: '5m and 15m require a range of at most 24 hours'
		});

		const old = { from: new Date(NOW.getTime() - 31 * DAY), to: new Date(NOW.getTime() - 30 * DAY) };

		expect(plan(old)).toMatchObject({ granularity: '1h', collection: 'analytics_hourly' });
		expect(issueOf(() => plan({ ...old, granularity: '5m' }))?.message).toBe(
			'5m and 15m require a range inside the 5-minute rollup retention (7 days)'
		);
	});

	it('gates sub-hour granularities on the 5-minute rollup retention, not the stats one', () => {
		const shortRollups = { ...RETENTION, statsMs: 7 * DAY, rollups5MinMs: 2 * DAY };
		const threeDaysAgo = { from: new Date(NOW.getTime() - 4 * DAY), to: new Date(NOW.getTime() - 3 * DAY) };

		expect(plan({ ...threeDaysAgo, retention: shortRollups })).toMatchObject({ granularity: '1h' });
		expect(plan({ from: new Date(NOW.getTime() - DAY), retention: shortRollups })).toMatchObject({
			granularity: '5m',
			collection: 'analytics_5min'
		});

		const twoDaysAgo = { from: new Date(NOW.getTime() - 3 * DAY), to: new Date(NOW.getTime() - 2 * DAY) };

		expect(
			issueOf(() =>
				plan({ ...twoDaysAgo, granularity: '5m', retention: { ...RETENTION, rollups5MinMs: 36 * HOUR } })
			)?.message
		).toBe('5m and 15m require a range inside the 5-minute rollup retention (36 hours)');
	});

	it('states the bucket limit and the daily and hourly metric rules', () => {
		expect(issueOf(() => plan({ from: new Date(NOW.getTime() - 60 * DAY), granularity: '1h' }))?.message).toContain(
			'limit of 1000 buckets'
		);
		expect(issueOf(() => plan({ from: new Date(NOW.getTime() - DAY), metrics: ['uniqueIdentities'] }))).toEqual({
			path: ['metrics'],
			message: 'uniqueIdentities requires granularity=1d'
		});
		expect(
			issueOf(() => plan({ from: new Date(NOW.getTime() - DAY), metrics: ['egressStarted', 'egressEnded'] }))
				?.message
		).toBe('egressEnded requires a granularity of at least 1h, not 5m');
		expect(
			plan({ from: new Date(NOW.getTime() - DAY), metrics: ['egressStarted', 'egressEnded'], granularity: '1h' })
				.starts
		).toHaveLength(24);
	});

	it('cuts local days of another zone from hourly documents while they are retained, UTC days beyond', () => {
		const week = plan({
			from: at('2026-10-29T04:00:00Z'),
			to: at('2026-11-05T05:00:00Z'),
			tz: 'America/New_York',
			granularity: '1d'
		});

		expect(week.collection).toBe('analytics_hourly');
		expect(week.starts.map((start) => start.toISOString().slice(10))).toEqual([
			'T04:00:00.000Z',
			'T04:00:00.000Z',
			'T04:00:00.000Z',
			'T04:00:00.000Z',
			'T05:00:00.000Z',
			'T05:00:00.000Z',
			'T05:00:00.000Z'
		]);

		const old = plan({
			from: new Date(NOW.getTime() - 500 * DAY),
			to: new Date(NOW.getTime() - 480 * DAY),
			tz: 'America/New_York',
			granularity: '1d'
		});

		expect(old.collection).toBe('analytics_daily');
		expect(old.starts[0]?.toISOString()).toMatch(/T00:00:00\.000Z$/);
	});

	it('snaps breakdown ranges to hours up to 90 days and to UTC days beyond', () => {
		expect(snapRange(at('2026-10-13T11:40:00Z'), at('2026-10-13T12:40:00Z'))).toEqual({
			collection: 'analytics_hourly',
			from: at('2026-10-13T11:00:00Z'),
			to: at('2026-10-13T13:00:00Z')
		});
		expect(snapRange(new Date(NOW.getTime() - 120 * DAY), NOW)).toMatchObject({
			collection: 'analytics_daily',
			from: at('2026-06-15T00:00:00Z'),
			to: at('2026-10-14T00:00:00Z')
		});
	});
});

describe('analytics schemas', () => {
	it.each([
		[{ metrics: 'roomsCreated,roomsDeleted' }, ['metrics'], 'roomsDeleted is not one of'],
		[{ metrics: 'bytesUp,bytesUp' }, ['metrics'], 'lists bytesUp more than once'],
		[{ metrics: '' }, ['metrics'], 'must list at least one value'],
		[{ metrics: 'bytesUp', granularity: '1m' }, ['granularity'], 'the finest analytics granularity is 5m'],
		[{ metrics: 'bytesUp', scope: 'node:' }, ['scope'], 'must be global or node:<id>']
	])('rejects %j', (query, path, message) => {
		expect(firstIssue(seriesQuery, query)).toEqual({ path, message: expect.stringContaining(message) as string });
	});

	it('defaults the series query and validates the export query', () => {
		expect(series({ metrics: 'roomsCreated,bytesUp' })).toMatchObject({
			metrics: ['roomsCreated', 'bytesUp'],
			granularity: 'auto',
			scope: 'global',
			from: at('2026-10-12T12:00:00Z'),
			to: NOW
		});
		expect(
			firstIssue(
				analyticsExportQuery(() => NOW),
				{ kind: 'series', metrics: 'nope' }
			)?.path
		).toEqual(['metrics']);
		expect(
			firstIssue(
				analyticsExportQuery(() => NOW),
				{ metrics: 'bytesUp' }
			)?.path
		).toEqual(['kind']);
		expect(analyticsExportQuery(() => NOW).parse({ kind: 'breakdowns', dimensions: 'sdk' })).toMatchObject({
			kind: 'breakdowns',
			dimensions: ['sdk']
		});
		expect(analyticsSummaryQuery(() => NOW).parse({ scope: 'node:n1' }).scope).toBe('node:n1');
	});
});

describe('analytics catalogue', () => {
	it('defines every CE metric and dimension', () => {
		expect(Object.keys(CE_ANALYTICS_CATALOGUE.metrics).sort()).toEqual(
			ANALYTICS_CE_METRICS.filter((metric) => metric !== 'egressEnded').sort()
		);
		expect(Object.keys(CE_ANALYTICS_CATALOGUE.dimensions).sort()).toEqual([...ANALYTICS_CE_DIMENSIONS].sort());
	});
});

describe('analytics feature gate', () => {
	const ce = new AnalyticsFeatureGate(() => []);

	it('rejects a request with any locked item, naming the first one', () => {
		expect(() => {
			ce.check({ metrics: ['roomsCreated', 'scoreAvg'] });
		}).toThrow(
			expect.objectContaining({ code: 'PRO_FEATURE', details: { feature: 'analytics-quality' } }) as Error
		);
		expect(() => {
			ce.check({ dimensions: ['sdk', 'apiMethod'] });
		}).toThrow(expect.objectContaining({ details: { feature: 'analytics-diagnostics' } }) as Error);
		expect(() => {
			ce.check({ scope: 'node:n1' });
		}).toThrow(expect.objectContaining({ details: { feature: 'per-node-breakdown' } }) as Error);
		expect(() => {
			ce.check({ metrics: ['roomsCreated'], dimensions: ['sdk'], scope: 'global' });
		}).not.toThrow();
	});

	it('allows the items of the enabled features', () => {
		const pro = new AnalyticsFeatureGate(() => ['analytics-quality', 'per-node-breakdown']);

		expect(() => {
			pro.check({ metrics: ['scoreAvg', 'ingressSessions'], scope: 'node:n1' });
		}).not.toThrow();
	});
});

describe('analytics series', () => {
	it('fills a day of five-minute buckets from three documents', async () => {
		const docs = ['2026-10-13T08:00:00Z', '2026-10-13T08:05:00Z', '2026-10-13T11:55:00Z'].map((bucket) => ({
			scope: 'global',
			bucket: at(bucket),
			rooms: { created: 2 }
		}));
		const response = await service(fakeDb({ analytics_5min: docs })).series(
			series({ metrics: 'roomsCreated,connectionSuccessRate' })
		);
		const [rooms, rate] = response.series;

		expect(analyticsSeriesResponse.parse(response)).toEqual(response);
		expect(response).toMatchObject({
			granularity: '5m',
			scope: 'global',
			from: '2026-10-12T12:00:00.000Z',
			to: '2026-10-13T12:00:00.000Z'
		});
		expect(rooms?.points).toHaveLength(288);
		expect(rooms?.points.filter(([, value]) => value === 2)).toHaveLength(3);
		expect(rooms?.points.filter(([, value]) => value === 0)).toHaveLength(285);
		expect(rate?.points.every(([, value]) => value === null)).toBe(true);
	});

	it('aggregates fifteen minutes from summed numerators and denominators', async () => {
		const docs = [
			{ joined: 2, active: 1 },
			{ joined: 4, active: 4 },
			{ joined: 4, active: 3 }
		].map((participants, index) => ({
			scope: 'global',
			bucket: new Date(at('2026-10-13T10:00:00Z').getTime() + index * 5 * MINUTE),
			participants
		}));
		const response = await service(fakeDb({ analytics_5min: docs })).series(
			series({ metrics: 'connectionSuccessRate,participantsJoined', granularity: '15m' })
		);
		const bucket = (name: string) =>
			response.series
				.find((item) => item.name === name)
				?.points.find(([ts]) => ts === '2026-10-13T10:00:00.000Z');

		expect(bucket('connectionSuccessRate')).toEqual(['2026-10-13T10:00:00.000Z', 80]);
		expect(bucket('participantsJoined')).toEqual(['2026-10-13T10:00:00.000Z', 10]);
	});

	it('computes the connection success rate and the participant minutes', async () => {
		const db = fakeDb({
			analytics_5min: [
				{ scope: 'global', bucket: at('2026-10-13T10:00:00Z'), participants: { joined: 40, active: 38 } }
			],
			analytics_hourly: [{ scope: 'global', bucket: at('2026-10-13T10:00:00Z'), participants: { minutes: 1234 } }]
		});
		const rate = await service(db).series(series({ metrics: 'connectionSuccessRate' }));
		const minutes = await service(db).series(series({ metrics: 'participantMinutes', granularity: '1h' }));

		expect(rate.series[0]?.points.find(([ts]) => ts === '2026-10-13T10:00:00.000Z')?.[1]).toBe(95);
		expect(rate.series[0]?.points[0]?.[1]).toBeNull();
		expect(minutes.series[0]?.points.find(([ts]) => ts === '2026-10-13T10:00:00.000Z')?.[1]).toBe(1234);
		expect(minutes.series[0]?.points[0]?.[1]).toBe(0);
	});

	it('expands egressEnded into the statuses present in the range', async () => {
		const db = fakeDb({
			analytics_hourly: [
				{
					scope: 'global',
					bucket: at('2026-10-13T09:00:00Z'),
					egress: { endedByStatus: { EGRESS_COMPLETE: 3 } }
				},
				{ scope: 'global', bucket: at('2026-10-13T10:00:00Z'), egress: { endedByStatus: { EGRESS_FAILED: 1 } } }
			]
		});
		const response = await service(db).series(series({ metrics: 'egressEnded', granularity: '1h' }));

		expect(response.series.map((item) => item.name)).toEqual([
			'egressEnded.EGRESS_COMPLETE',
			'egressEnded.EGRESS_FAILED'
		]);
		expect(response.series[1]?.points.at(-2)).toEqual(['2026-10-13T10:00:00.000Z', 1]);
	});

	it('sums hourly documents per local day and keeps unique identities on UTC days', async () => {
		const from = at('2026-10-28T04:00:00Z');
		const to = at('2026-11-04T05:00:00Z');
		const hourly: Doc[] = [];

		for (let time = from.getTime(); time < to.getTime(); time += HOUR) {
			hourly.push({ scope: 'global', bucket: new Date(time), rooms: { created: 1 } });
		}

		const daily: Doc[] = [0, 1, 2, 3, 4, 5, 6, 7].map((day) => ({
			scope: 'global',
			bucket: new Date(at('2026-10-28T00:00:00Z').getTime() + day * DAY),
			uniqueIdentities: 10 + day
		}));
		const now = () => at('2026-11-10T00:00:00Z');
		const query = analyticsSeriesQuery(now).parse({
			metrics: 'uniqueIdentities,roomsCreated',
			from: from.toISOString(),
			to: to.toISOString(),
			tz: 'America/New_York',
			granularity: '1d'
		});
		const response = await service(fakeDb({ analytics_hourly: hourly, analytics_daily: daily }), { now }).series(
			query
		);
		const [identities, rooms] = response.series;

		expect(identities).toMatchObject({ name: 'uniqueIdentities', basis: 'utcDay' });
		expect(identities?.points.every(([ts]) => ts.endsWith('T00:00:00.000Z'))).toBe(true);
		expect(rooms?.basis).toBeUndefined();
		expect(rooms?.points.map(([, value]) => value)).toEqual([24, 24, 24, 24, 25, 24, 24]);
		expect(rooms?.points[5]?.[0]).toBe('2026-11-02T05:00:00.000Z');
	});
});

describe('analytics cache', () => {
	it('reads only the open bucket again within the TTL, and everything with a TTL of zero', async () => {
		const docs = [0, 1, 2].map((index) => ({
			scope: 'global',
			bucket: new Date(at('2026-10-13T11:45:00Z').getTime() + index * 5 * MINUTE),
			bytes: { up: 100 }
		}));
		const reads: Read[] = [];
		const now = () => at('2026-10-13T11:57:00Z');
		const query = analyticsSeriesQuery(now).parse({ metrics: 'bytesUp' });
		const cached = service(fakeDb({ analytics_5min: docs }, reads), { now, ttlMs: 60_000 });

		await cached.series(query);
		reads.length = 0;

		const second = await cached.series(query);

		expect(reads).toEqual([
			{ collection: 'analytics_5min', from: at('2026-10-13T11:55:00Z'), to: at('2026-10-13T11:57:00Z') }
		]);
		expect(second.series[0]?.points.slice(-3).map(([, value]) => value)).toEqual([100, 100, 100]);

		reads.length = 0;
		await service(fakeDb({ analytics_5min: docs }, reads), { now }).series(query);
		await service(fakeDb({ analytics_5min: docs }, reads), { now }).series(query);
		expect(reads.map((read) => read.from.toISOString())).toEqual([
			'2026-10-12T11:55:00.000Z',
			'2026-10-12T11:55:00.000Z'
		]);
	});

	it('expires entries after the TTL and evicts the least recently used', () => {
		let time = 0;
		const cache = new AnalyticsCache(1000, () => new Date(time), 2);

		cache.set('a', new Map());
		cache.set('b', new Map());
		cache.get('a');
		cache.set('c', new Map());
		expect(cache.get('b')).toBeUndefined();
		expect(cache.get('a')).toBeDefined();
		time = 1000;
		expect(cache.get('a')).toBeUndefined();
	});
});

describe('analytics summary and breakdowns', () => {
	const summaryQuery = analyticsSummaryQuery(() => NOW);

	it('derives the summary values from the hourly documents and the daily identities', async () => {
		const db = fakeDb({
			analytics_hourly: [
				{
					scope: 'global',
					bucket: at('2026-10-13T09:00:00Z'),
					rooms: { created: 120, ended: 110, participantsSum: 440, durationMsSum: 39_600_000 },
					participants: { joined: 900, active: 880 },
					apiCalls: { total: 5000 },
					apiErrors: { total: 50 }
				}
			],
			analytics_daily: [
				{ scope: 'global', bucket: at('2026-10-10T00:00:00Z'), uniqueIdentities: 100 },
				{ scope: 'global', bucket: at('2026-10-11T00:00:00Z'), uniqueIdentities: 120 },
				{ scope: 'global', bucket: at('2026-10-12T00:00:00Z'), uniqueIdentities: 90 },
				{ scope: 'global', bucket: at('2026-10-13T00:00:00Z') }
			]
		});
		const summary = await service(db).summary(summaryQuery.parse({ from: '2026-10-10T06:00:00Z' }));

		expect(analyticsSummaryResponse.parse(summary)).toEqual(summary);
		expect(summary).toMatchObject({
			roomsCreated: 120,
			roomsEnded: 110,
			participantSessions: 900,
			connectionSuccessRate: 97.8,
			apiCalls: 5000,
			apiErrorRate: 1,
			avgRoomSize: 4,
			avgRoomDurationMs: 360_000,
			uniqueIdentities: { value: 310, basis: 'utcDays', days: 3 }
		});
	});

	it('omits the averages written without the room sums', async () => {
		const db = fakeDb({
			analytics_hourly: [{ scope: 'global', bucket: at('2026-10-13T09:00:00Z'), rooms: { created: 3, ended: 2 } }]
		});
		const summary = await service(db).summary(summaryQuery.parse({}));

		expect(summary).not.toHaveProperty('avgRoomSize');
		expect(summary).not.toHaveProperty('avgRoomDurationMs');
		expect(summary).not.toHaveProperty('uniqueIdentities');
		expect(summary).toMatchObject({ roomsCreated: 3, roomsEnded: 2, bytesUp: 0 });
	});

	it('sorts breakdown keys by count with percentages of the dimension total', async () => {
		const db = fakeDb({
			analytics_hourly: [
				{
					scope: 'global',
					bucket: at('2026-10-13T09:00:00Z'),
					participants: { bySdk: { JS: 400, SWIFT: 300 } }
				},
				{
					scope: 'global',
					bucket: at('2026-10-13T10:00:00Z'),
					participants: { bySdk: { JS: 200, ANDROID: 100 } }
				}
			]
		});
		const response = await service(db).breakdowns(
			analyticsBreakdownsQuery(() => NOW).parse({ dimensions: 'sdk,egressType', from: 'now-3h' })
		);

		expect(analyticsBreakdownsResponse.parse(response)).toEqual(response);
		expect(response.from).toBe('2026-10-13T09:00:00.000Z');
		expect(response.breakdowns).toEqual([
			{
				dimension: 'sdk',
				total: 1000,
				items: [
					{ key: 'JS', count: 600, percent: 60 },
					{ key: 'SWIFT', count: 300, percent: 30 },
					{ key: 'ANDROID', count: 100, percent: 10 }
				]
			},
			{ dimension: 'egressType', total: 0, items: [] }
		]);
	});
});

describe('analytics CSV', () => {
	it('quotes cells with separators, quotes or line breaks and ends every line with CRLF', () => {
		expect(
			toCsv(
				['a', 'b'],
				[
					['x,y', 'say "hi"'],
					[null, 3]
				]
			)
		).toBe('a,b\r\n"x,y","say ""hi"""\r\n,3\r\n');
	});

	it('writes one row per bucket and one per breakdown key', () => {
		const metrics: AnalyticsMetric[] = ['bytesUp', 'connectionSuccessRate'];

		expect(
			seriesCsv({
				granularity: '1h',
				from: '2026-10-13T10:00:00.000Z',
				to: '2026-10-13T12:00:00.000Z',
				scope: 'global',
				series: metrics.map((name, index) => ({
					name,
					points: [
						['2026-10-13T10:00:00.000Z', index === 0 ? 1200 : null],
						['2026-10-13T11:00:00.000Z', index === 0 ? 0 : 4.1]
					]
				}))
			})
		).toBe(
			'bucket,bytesUp,connectionSuccessRate\r\n2026-10-13T10:00:00.000Z,1200,\r\n2026-10-13T11:00:00.000Z,0,4.1\r\n'
		);
		expect(
			breakdownsCsv({
				from: '2026-10-13T10:00:00.000Z',
				to: '2026-10-13T12:00:00.000Z',
				scope: 'global',
				breakdowns: [
					{ dimension: 'sdk', total: 3, items: [{ key: 'JS', count: 3, percent: 100 }] },
					{ dimension: 'os', total: 1, items: [{ key: 'linux', count: 1, percent: 100 }] }
				]
			})
		).toBe('dimension,key,count,percent\r\nsdk,JS,3,100\r\nos,linux,1,100\r\n');
		expect(ANALYTICS_CSV_CONTENT_TYPE).toBe('text/csv; charset=utf-8');
	});
});
