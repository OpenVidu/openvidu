import type { Document } from 'mongodb';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import {
	type AnalyticsBreakdownsResponse,
	type AnalyticsSeriesResponse,
	type AnalyticsSummary,
	Collection
} from '@openvidu-dashboard/typings';

import {
	analyticsBreakdownsResponse,
	analyticsSeriesResponse,
	analyticsSummaryResponse
} from '../../src/analytics/analytics-responses.js';
import { openApiDocument } from '../../src/api/openapi.js';
import type { RouteRegistry } from '../../src/api/route-registry.js';
import { TOKENS } from '../../src/di/tokens.js';
import { bootClient, type Client, get, issue, json } from '../support/api-client.js';

const mongoUri = inject('mongoUri');
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

type Rollups = Partial<Record<'analytics_5min' | 'analytics_hourly' | 'analytics_daily', Document[]>>;

function rollup(bucket: number | Date, fields: Document, scope = 'global'): Document {
	const date = new Date(bucket);

	return { _id: `${scope}:${date.toISOString().replace('.000Z', 'Z')}`, scope, bucket: date, ...fields };
}

async function seedRollups(client: Client, rollups: Rollups): Promise<void> {
	for (const collection of [Collection.ANALYTICS_5MIN, Collection.ANALYTICS_HOURLY, Collection.ANALYTICS_DAILY]) {
		await client.dashboard.db.collection(collection).deleteMany({});

		const documents = rollups[collection];

		if (documents !== undefined && documents.length > 0) {
			await client.dashboard.db.collection(collection).insertMany(documents);
		}
	}
}

const iso = (time: number) => new Date(time).toISOString();
const values = (response: AnalyticsSeriesResponse, name: string) =>
	response.series.find((series) => series.name === name)?.points.map(([, value]) => value) ?? [];

describe.skipIf(mongoUri === '')('analytics API', () => {
	let ce: Client;
	/** Start of the current UTC hour. */
	let hour: number;

	beforeAll(async () => {
		ce = await bootClient(mongoUri, { DASHBOARD_ANALYTICS_CACHE_TTL: '0' });
		hour = Math.floor(Date.now() / HOUR) * HOUR;
	});

	afterAll(async () => {
		await ce.dashboard.stop();
	});

	describe('series', () => {
		it('answers dense five-minute series over a day', async () => {
			await seedRollups(ce, {
				analytics_5min: [
					rollup(hour - 2 * HOUR, { rooms: { created: 2 }, bytes: { up: 1000 } }),
					rollup(hour - 5 * MINUTE, { rooms: { created: 1 } })
				]
			});

			const response = await json<AnalyticsSeriesResponse>(
				ce,
				`/analytics/series?metrics=roomsCreated,bytesUp&from=${iso(hour - DAY)}&to=${iso(hour)}`
			);

			expect(analyticsSeriesResponse.parse(response)).toEqual(response);
			expect(response).toMatchObject({
				scope: 'global',
				granularity: '5m',
				from: iso(hour - DAY),
				to: iso(hour)
			});
			expect(response.series.map((series) => [series.name, series.points.length])).toEqual([
				['roomsCreated', 288],
				['bytesUp', 288]
			]);
			expect(values(response, 'roomsCreated').reduce((sum, value) => (sum ?? 0) + (value ?? 0), 0)).toBe(3);
			expect(values(response, 'roomsCreated').at(-1)).toBe(1);
		});

		it('reads the collection of the resolved granularity', async () => {
			await seedRollups(ce, {
				analytics_5min: [rollup(hour - HOUR, { rooms: { created: 5 } })],
				analytics_hourly: [rollup(hour - 2 * HOUR, { rooms: { created: 7 } })],
				analytics_daily: [rollup(Math.floor((hour - 3 * DAY) / DAY) * DAY, { rooms: { created: 9 } })]
			});

			const read = async (span: number) => {
				const response = await json<AnalyticsSeriesResponse>(
					ce,
					`/analytics/series?metrics=roomsCreated&from=${iso(hour - span)}&to=${iso(hour)}`
				);

				return { granularity: response.granularity, seen: values(response, 'roomsCreated').filter(Boolean) };
			};

			expect(await read(DAY)).toEqual({ granularity: '5m', seen: [5] });
			expect(await read(7 * DAY)).toEqual({ granularity: '1h', seen: [7] });
			expect(await read(30 * DAY)).toEqual({ granularity: '6h', seen: [7] });
			expect(await read(100 * DAY)).toEqual({ granularity: '1d', seen: [9] });
		});

		it('expands the egress end statuses present in the range', async () => {
			await seedRollups(ce, {
				analytics_hourly: [
					rollup(hour - 3 * HOUR, { egress: { endedByStatus: { EGRESS_COMPLETE: 4 } } }),
					rollup(hour - 2 * HOUR, { egress: { endedByStatus: { EGRESS_FAILED: 1, EGRESS_COMPLETE: 1 } } })
				]
			});

			const response = await json<AnalyticsSeriesResponse>(
				ce,
				`/analytics/series?metrics=egressEnded&granularity=1h&from=${iso(hour - DAY)}&to=${iso(hour)}`
			);

			expect(response.series.map((series) => series.name)).toEqual([
				'egressEnded.EGRESS_COMPLETE',
				'egressEnded.EGRESS_FAILED'
			]);
			expect(values(response, 'egressEnded.EGRESS_COMPLETE').slice(-3)).toEqual([4, 1, 0]);
		});

		it.each([
			['metrics=roomsCreated,roomsDeleted', ['metrics'], 'roomsDeleted is not one of'],
			['metrics=bytesUp&granularity=1m', ['granularity'], 'the finest analytics granularity is 5m'],
			['metrics=bytesUp&granularity=5m&from=now-48h', ['granularity'], 'at most 24 hours'],
			['metrics=bytesUp&granularity=1h&from=now-60d', ['granularity'], 'limit of 1000 buckets'],
			['metrics=uniqueIdentities', ['metrics'], 'uniqueIdentities requires granularity=1d'],
			['metrics=egressStarted,egressEnded', ['metrics'], 'egressEnded requires a granularity of at least 1h'],
			['metrics=bytesUp&scope=node:', ['scope'], 'must be global or node:<id>']
		])('rejects %s', async (query, path, message) => {
			expect(await issue(ce, `/analytics/series?${query}`)).toMatchObject({
				status: 400,
				code: 'VALIDATION_ERROR',
				first: { path, message: expect.stringContaining(message) as string }
			});
		});
	});

	describe('breakdowns and summary', () => {
		it('snaps a one-hour preset to whole hours and sorts the keys by count', async () => {
			await seedRollups(ce, {
				analytics_hourly: [
					rollup(hour - 2 * HOUR, { participants: { bySdk: { JS: 1000 } } }),
					rollup(hour - HOUR, { participants: { bySdk: { JS: 600, SWIFT: 300 } } }),
					rollup(hour, { participants: { bySdk: { ANDROID: 100 } } })
				]
			});

			const response = await json<AnalyticsBreakdownsResponse>(
				ce,
				'/analytics/breakdowns?dimensions=sdk,egressType&from=now-1h&to=now'
			);

			expect(analyticsBreakdownsResponse.parse(response)).toEqual(response);
			expect(response).toMatchObject({ from: iso(hour - HOUR), to: iso(hour + HOUR), scope: 'global' });
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

		it('derives the summary from hourly documents and the daily identities', async () => {
			const today = Math.floor(hour / DAY) * DAY;

			await seedRollups(ce, {
				analytics_hourly: [
					rollup(hour - 2 * HOUR, {
						rooms: { created: 120, ended: 110, participantsSum: 440, durationMsSum: 39_600_000 },
						participants: { joined: 900, active: 880 },
						ingress: {
							sessionsStarted: 12,
							durationMs: 21_600_000,
							byInputType: { rtmp: 8, whip: 3, url: 1 }
						},
						apiCalls: { total: 5000 },
						apiErrors: { total: 50 }
					})
				],
				analytics_daily: [
					rollup(today - 2 * DAY, { uniqueIdentities: 100 }),
					rollup(today - DAY, { uniqueIdentities: 120 }),
					rollup(today, { uniqueIdentities: 90 })
				]
			});

			const summary = await json<AnalyticsSummary>(ce, `/analytics/summary?from=${iso(today - 2 * DAY + HOUR)}`);

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
				uniqueIdentities: { value: 310, basis: 'utcDays', days: 3 },
				ingressSessions: 12,
				ingressDurationMs: 21_600_000
			});

			const breakdowns = await json<AnalyticsBreakdownsResponse>(
				ce,
				`/analytics/breakdowns?dimensions=ingressInputType&from=${iso(today - 2 * DAY + HOUR)}`
			);

			expect(breakdowns.breakdowns).toEqual([
				{
					dimension: 'ingressInputType',
					total: 12,
					items: [
						{ key: 'rtmp', count: 8, percent: 66.7 },
						{ key: 'whip', count: 3, percent: 25 },
						{ key: 'url', count: 1, percent: 8.3 }
					]
				}
			]);
			// Ingress analytics are CE.
			expect(
				(
					await get(
						ce,
						`/analytics/series?metrics=ingressSessions,ingressDurationMs&granularity=1h&from=${iso(hour - DAY)}&to=${iso(hour)}`
					)
				).status
			).toBe(200);
		});

		it('reads daily documents for long ranges and omits the averages without the room sums', async () => {
			const today = Math.floor(hour / DAY) * DAY;

			await seedRollups(ce, {
				analytics_hourly: [rollup(hour - 2 * HOUR, { rooms: { created: 1000, ended: 1000 } })],
				analytics_daily: [rollup(today - 10 * DAY, { rooms: { created: 3, ended: 2 } })]
			});

			const summary = await json<AnalyticsSummary>(ce, '/analytics/summary?from=now-120d');

			expect(summary).toMatchObject({ roomsCreated: 3, roomsEnded: 2, to: iso(today + DAY) });
			expect(summary.from).toMatch(/T00:00:00\.000Z$/);
			expect(summary).not.toHaveProperty('avgRoomSize');
			expect(summary).not.toHaveProperty('avgRoomDurationMs');
		});
	});

	describe('editions', () => {
		it.each([
			['/analytics/series?metrics=roomsCreated,scoreAvg', 'analytics-quality'],
			['/analytics/breakdowns?dimensions=sdk,disconnectReason', 'analytics-diagnostics'],
			['/analytics/summary?scope=node:n1', 'per-node-breakdown'],
			['/analytics/top?metric=uniqueIdentities', 'analytics-top-rooms'],
			['/analytics/scopes', 'per-node-breakdown'],
			['/analytics/export.csv?kind=series&metrics=scoreAvg', 'analytics-quality']
		])('answers PRO_FEATURE on CE for %s', async (path, feature) => {
			expect(await issue(ce, path)).toMatchObject({ status: 403, code: 'PRO_FEATURE', feature });
		});

		it('documents the CE analytics routes, and none of the locked ones', () => {
			const registry = ce.dashboard.running.container.get<RouteRegistry>(TOKENS.RouteRegistry);
			const paths = Object.keys(openApiDocument(registry, { version: 'test' }).paths ?? {});

			expect(paths).toEqual(
				expect.arrayContaining([
					'/api/v1/analytics/series',
					'/api/v1/analytics/breakdowns',
					'/api/v1/analytics/summary',
					'/api/v1/analytics/export.csv'
				])
			);
			expect(paths).not.toContain('/api/v1/analytics/top');
			expect(paths).not.toContain('/api/v1/analytics/scopes');
		});
	});

	describe('CSV export', () => {
		it('exports the series with the cells of the JSON response', async () => {
			await seedRollups(ce, {
				analytics_hourly: [
					rollup(hour - 3 * HOUR, { bytes: { up: 1200 }, rooms: { created: 2 } }),
					rollup(hour - 2 * HOUR, { bytes: { up: 300 } })
				]
			});

			const query = `metrics=bytesUp,roomsCreated&granularity=1h&from=${iso(hour - DAY)}&to=${iso(hour)}`;
			const response = await get(ce, `/analytics/export.csv?kind=series&${query}`);
			const body = await response.text();
			const lines = body.split('\r\n');
			const expected = await json<AnalyticsSeriesResponse>(ce, `/analytics/series?${query}`);

			expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8');
			expect(response.headers.get('content-disposition')).toBe(
				`attachment; filename=${`analytics-series-${iso(hour - DAY)}-${iso(hour)}.csv`.replaceAll(':', '')}`
			);
			expect(lines[0]).toBe('bucket,bytesUp,roomsCreated');
			expect(lines).toHaveLength(26);
			expect(lines.at(-1)).toBe('');
			expect(lines.slice(1, -1)).toEqual(
				expected.series[0]?.points.map(
					([bucket, bytes], index) =>
						`${bucket},${String(bytes)},${String(expected.series[1]?.points[index]?.[1] ?? '')}`
				)
			);
			expect(lines.at(-4)).toBe(`${iso(hour - 3 * HOUR)},1200,2`);
			expect(lines.at(-3)).toBe(`${iso(hour - 2 * HOUR)},300,0`);
		});

		it('exports the breakdowns dimension after dimension', async () => {
			await seedRollups(ce, {
				analytics_hourly: [
					rollup(hour - 2 * HOUR, { participants: { bySdk: { JS: 2, SWIFT: 5 }, byOs: { linux: 1 } } })
				]
			});

			const response = await get(ce, '/analytics/export.csv?kind=breakdowns&dimensions=sdk,os');

			expect(await response.text()).toBe(
				'dimension,key,count,percent\r\nsdk,SWIFT,5,71.4\r\nsdk,JS,2,28.6\r\nos,linux,1,100\r\n'
			);
		});
	});
});
