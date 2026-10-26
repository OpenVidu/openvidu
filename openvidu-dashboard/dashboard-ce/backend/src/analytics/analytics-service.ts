import type { Db } from 'mongodb';

import {
	type AnalyticsBreakdown,
	type AnalyticsBreakdownsResponse,
	type AnalyticsSeries,
	type AnalyticsSeriesResponse,
	type AnalyticsSummary,
	analyticsCsvFileName,
	Collection
} from '@openvidu-dashboard/typings';

import { readRetentionMs } from '../schema/retention.js';
import { compact } from '../util/compact.js';
import type { AnalyticsCache } from './analytics-cache.js';
import {
	type Counters,
	type AnalyticsCatalogue,
	dimensionDefinition,
	EGRESS_ENDED_PATH,
	metricDefinition,
	metricFields,
	round1,
	SUMMARY_FIELDS
} from './analytics-catalogue.js';
import { type BucketCounters, foldRows, mapEntries, mergeCounters, totalCounters } from './analytics-counters.js';
import { breakdownsCsv, seriesCsv } from './analytics-csv.js';
import type { AnalyticsFeatureGate } from './analytics-gate.js';
import {
	type BucketGrid,
	gridStarts,
	openDocumentStart,
	planSeries,
	snapRange,
	utcDaysOf
} from './analytics-planner.js';
import { AnalyticsRepository } from './analytics-repository.js';
import type {
	AnalyticsBreakdownsParams,
	AnalyticsExportParams,
	AnalyticsSeriesParams,
	AnalyticsSummaryParams
} from './analytics-schemas.js';

export interface AnalyticsServiceOptions {
	now: () => Date;
	cache: AnalyticsCache;
	gate: AnalyticsFeatureGate;
	catalogue: AnalyticsCatalogue;
}

export interface AnalyticsCsv {
	fileName: string;
	body: string;
}

/** A read of rollup documents grouped on a bucket grid. */
interface RollupRead extends BucketGrid {
	scope: string;
	/** Identity of the grid in cache keys: granularity and zone. */
	gridKey: string;
	to: Date;
	fields: readonly string[];
}

function value(counters: Counters, path: string): number {
	return counters.get(path) ?? 0;
}

/** `numerator / denominator × scale` with one decimal; absent without a denominator. */
function share(numerator: number, denominator: number, scale = 100): number | undefined {
	return denominator > 0 ? round1((numerator / denominator) * scale) : undefined;
}

/** Average over the rooms ended in range; absent when none ended or the writer stores no sum. */
function roomAverage(counters: Counters, path: string, digits: 'one' | 'integer'): number | undefined {
	const ended = value(counters, 'rooms.ended');

	if (ended === 0 || !counters.has(path)) {
		return undefined;
	}

	const average = value(counters, path) / ended;

	return digits === 'one' ? round1(average) : Math.round(average);
}

/** Analytics over the rollup collections. */
export class AnalyticsService {
	private readonly repository: AnalyticsRepository;

	constructor(
		private readonly db: Db,
		private readonly options: AnalyticsServiceOptions
	) {
		this.repository = new AnalyticsRepository(db);
	}

	async series(query: AnalyticsSeriesParams): Promise<AnalyticsSeriesResponse> {
		this.options.gate.check({ metrics: query.metrics, scope: query.scope });

		const now = this.options.now();
		const plan = planSeries({
			...query,
			now,
			retention: await readRetentionMs(this.db),
			info: this.options.catalogue.info
		});
		const gridKey = `${plan.granularity}|${plan.collection === Collection.ANALYTICS_DAILY ? 'UTC' : query.tz}`;
		const metrics = query.metrics.filter((metric) => metric !== 'uniqueIdentities');
		const main =
			metrics.length === 0
				? new Map<number, Counters>()
				: await this.read(
						{
							...plan,
							scope: query.scope,
							gridKey,
							to: query.to,
							fields: metricFields(this.options.catalogue, metrics)
						},
						now
					);
		const daily =
			plan.utcDays === undefined
				? undefined
				: await this.read(
						{
							...plan.utcDays,
							scope: query.scope,
							gridKey: '1d|UTC',
							to: query.to,
							fields: ['uniqueIdentities']
						},
						now
					);
		const series = query.metrics.flatMap((metric): AnalyticsSeries[] => {
			if (metric === 'uniqueIdentities' && plan.utcDays !== undefined && daily !== undefined) {
				return [
					{
						name: metric,
						...this.points(
							plan.utcDays.starts,
							daily,
							metricDefinition(this.options.catalogue, metric).value
						),
						basis: 'utcDay'
					}
				];
			}

			if (metric === 'egressEnded') {
				const statuses = new Set(
					[...main.values()].flatMap((counters) => [...mapEntries(counters, EGRESS_ENDED_PATH).keys()])
				);

				return [...statuses].sort().map((status) => ({
					name: `egressEnded.${status}`,
					...this.points(
						plan.starts,
						main,
						(counters) => counters?.get(`${EGRESS_ENDED_PATH}.${status}`) ?? 0
					)
				}));
			}

			return metric === 'uniqueIdentities'
				? []
				: [
						{
							name: metric,
							...this.points(plan.starts, main, metricDefinition(this.options.catalogue, metric).value)
						}
					];
		});

		return {
			granularity: plan.granularity,
			from: query.from.toISOString(),
			to: query.to.toISOString(),
			scope: query.scope,
			series
		};
	}

	async breakdowns(query: AnalyticsBreakdownsParams): Promise<AnalyticsBreakdownsResponse> {
		this.options.gate.check({ dimensions: query.dimensions, scope: query.scope });

		const range = snapRange(query.from, query.to);
		const fields = query.dimensions.flatMap((dimension) => {
			const { path, errors } = dimensionDefinition(this.options.catalogue, dimension);

			return errors === undefined ? [path] : [path, errors];
		});
		const counters = totalCounters(
			await this.read(
				{
					collection: range.collection,
					starts: [range.from],
					scope: query.scope,
					gridKey: 'total',
					to: range.to,
					fields: [...new Set(fields)]
				},
				this.options.now()
			)
		);

		return {
			from: range.from.toISOString(),
			to: range.to.toISOString(),
			scope: query.scope,
			breakdowns: query.dimensions.map((dimension): AnalyticsBreakdown => {
				const { path, errors } = dimensionDefinition(this.options.catalogue, dimension);
				const entries = [...mapEntries(counters, path)].filter(([, count]) => count > 0);
				const errorCounts = errors === undefined ? undefined : mapEntries(counters, errors);
				const total = entries.reduce((sum, [, count]) => sum + count, 0);

				return {
					dimension,
					total,
					items: entries
						.sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b))
						.map(([key, count]) =>
							compact({
								key,
								count,
								percent: share(count, total) ?? 0,
								errors: errorCounts === undefined ? undefined : (errorCounts.get(key) ?? 0)
							})
						)
				};
			})
		};
	}

	async summary(query: AnalyticsSummaryParams): Promise<AnalyticsSummary> {
		this.options.gate.check({ scope: query.scope });

		const now = this.options.now();
		const range = snapRange(query.from, query.to);
		const days = utcDaysOf(range.from, range.to);
		const [counters, daily] = await Promise.all([
			this.read(
				{
					collection: range.collection,
					starts: [range.from],
					scope: query.scope,
					gridKey: 'total',
					to: range.to,
					fields: SUMMARY_FIELDS
				},
				now
			).then(totalCounters),
			this.read(
				{
					collection: Collection.ANALYTICS_DAILY,
					starts: gridStarts(days.from, days.to, '1d', 'UTC'),
					scope: query.scope,
					gridKey: '1d|UTC',
					to: days.to,
					fields: ['uniqueIdentities']
				},
				now
			)
		]);
		const identities = [...daily.values()].flatMap((day) => {
			const count = day.get('uniqueIdentities');

			return count === undefined ? [] : [count];
		});
		const joined = value(counters, 'participants.joined');
		const calls = value(counters, 'apiCalls.total');

		return compact<AnalyticsSummary>({
			from: range.from.toISOString(),
			to: range.to.toISOString(),
			scope: query.scope,
			roomsCreated: value(counters, 'rooms.created'),
			roomsEnded: value(counters, 'rooms.ended'),
			participantSessions: joined,
			uniqueIdentities:
				identities.length === 0
					? undefined
					: {
							value: identities.reduce((sum, count) => sum + count, 0),
							basis: 'utcDays',
							days: identities.length
						},
			connectionSuccessRate:
				joined > 0 ? Math.min(100, share(value(counters, 'participants.active'), joined) ?? 0) : undefined,
			avgRoomSize: roomAverage(counters, 'rooms.participantsSum', 'one'),
			avgRoomDurationMs: roomAverage(counters, 'rooms.durationMsSum', 'integer'),
			bytesUp: value(counters, 'bytes.up'),
			bytesDown: value(counters, 'bytes.down'),
			egressStarted: value(counters, 'egress.started'),
			egressDurationMs: value(counters, 'egress.durationMs'),
			ingressSessions: value(counters, 'ingress.sessionsStarted'),
			ingressDurationMs: value(counters, 'ingress.durationMs'),
			apiCalls: calls,
			apiErrorRate: share(value(counters, 'apiErrors.total'), calls)
		});
	}

	/** The CSV of the series or the breakdowns of `query`, with its attachment name. */
	async export(query: AnalyticsExportParams): Promise<AnalyticsCsv> {
		if (query.kind === 'series') {
			const response = await this.series(query);

			return { fileName: analyticsCsvFileName('series', response.from, response.to), body: seriesCsv(response) };
		}

		const response = await this.breakdowns(query);

		return {
			fileName: analyticsCsvFileName('breakdowns', response.from, response.to),
			body: breakdownsCsv(response)
		};
	}

	private points(
		starts: readonly Date[],
		buckets: BucketCounters,
		valueOf: (counters: Counters | undefined) => number | null
	): Omit<AnalyticsSeries, 'name'> {
		return { points: starts.map((start) => [start.toISOString(), valueOf(buckets.get(start.getTime()))]) };
	}

	/**
	 * Rollup documents of `read` folded on its grid: the completed documents from the cache when present, the open one
	 * (whose bucket contains `now`) always from the database.
	 */
	private async read(read: RollupRead, now: Date): Promise<BucketCounters> {
		const from = read.starts[0];

		if (from === undefined || from.getTime() >= read.to.getTime()) {
			return new Map();
		}

		const fold = (start: Date, end: Date) =>
			foldRows(this.repository.rollups(read.collection, read.scope, start, end, read.fields), read.starts);
		const open = openDocumentStart(read.collection, now);

		if (!this.options.cache.enabled) {
			return fold(from, read.to);
		}

		const completedTo = new Date(Math.min(read.to.getTime(), open.getTime()));
		let completed: BucketCounters = new Map();

		if (completedTo.getTime() > from.getTime()) {
			const key = JSON.stringify([
				read.collection,
				read.scope,
				read.gridKey,
				[...read.fields].sort(),
				from.getTime(),
				completedTo.getTime()
			]);
			const cached = this.options.cache.get(key);

			completed = cached ?? (await fold(from, completedTo));

			if (cached === undefined) {
				this.options.cache.set(key, completed);
			}
		}

		return read.to.getTime() > completedTo.getTime()
			? mergeCounters(completed, await fold(new Date(Math.max(from.getTime(), completedTo.getTime())), read.to))
			: completed;
	}
}
