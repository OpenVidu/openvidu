import type { Db, Document } from 'mongodb';
import { describe, expect, it } from 'vitest';

import { Collection, type DashboardDeletionJob } from '@openvidu-dashboard/typings';

import { jobRecordedClasses, planSteps, stepCount } from '../../src/deletions/deletion-plan.js';
import { judgeJob, toDeletionRecords } from '../../src/deletions/deletion-records.js';
import { BATCH_PAUSE_MS, BATCH_SIZE, DeletionRunner } from '../../src/deletions/deletion-runner.js';
import { silentLogger } from '../support/silent-logger.js';

const CUTOFF = new Date('2026-11-19T10:07:00Z');

function job(overrides: Partial<DashboardDeletionJob> = {}): DashboardDeletionJob {
	return {
		id: 'job-1',
		class: 'events',
		includeLegacy: false,
		state: 'running',
		cutoff: CUTOFF,
		startedAt: CUTOFF,
		heartbeatAt: CUTOFF,
		instance: 'host@2026-11-19T09:00:00.000Z',
		currentClass: 'events',
		collection: { index: 1, total: 1 },
		deleted: 0,
		deletedBy: {},
		requestId: 'request-1',
		...overrides
	};
}

/** A database whose `events` hold `count` deletable documents; every other collection is empty. */
function eventsDb(count: number, clock: { now: number }) {
	let remaining = Array.from({ length: count }, (_, i) => `AE_${String(i)}`);
	const deletes: { at: number; size: number }[] = [];
	const cursor = (documents: Document[]) => {
		let limit = Number.POSITIVE_INFINITY;
		const self = {
			hint: () => self,
			sort: () => self,
			skip: () => self,
			limit: (n: number) => {
				limit = n;

				return self;
			},
			toArray: () => Promise.resolve(documents.slice(0, limit))
		};

		return self;
	};
	const collection = (name: string) => ({
		findOne: () => Promise.resolve(null),
		find: () => cursor(name === Collection.EVENTS ? remaining.map((_id) => ({ _id })) : []),
		deleteMany: (filter: { _id: { $in: string[] } }) => {
			const ids = new Set(filter._id.$in);

			deletes.push({ at: clock.now, size: ids.size });
			remaining = remaining.filter((id) => !ids.has(id));

			return Promise.resolve({ deletedCount: ids.size });
		}
	});
	const db = { collection, listCollections: () => ({ toArray: () => Promise.resolve([]) }) } as unknown as Db;

	return { db, deletes, remaining: () => remaining.length };
}

const records = {
	read: () => Promise.resolve(undefined),
	heartbeat: () => Promise.resolve(true),
	progress: () => Promise.resolve(true),
	complete: () => Promise.resolve(true),
	finish: () => Promise.resolve(true)
};

describe('deletion runner', () => {
	it('Batches of a large collection', async () => {
		const clock = { now: 0 };
		const { db, deletes, remaining } = eventsDb(12_000, clock);
		const runner = new DeletionRunner({
			db,
			records,
			logger: silentLogger(),
			sleep: (ms) => {
				clock.now += ms;

				return Promise.resolve();
			}
		});

		await runner.run(job());

		expect(remaining()).toBe(0);
		expect(deletes).toHaveLength(3);
		expect(deletes.every((batch) => batch.size <= BATCH_SIZE)).toBe(true);
		expect(deletes.map((batch) => batch.size)).toEqual([5_000, 5_000, 2_000]);

		for (let i = 1; i < deletes.length; i++) {
			expect((deletes[i]?.at ?? 0) - (deletes[i - 1]?.at ?? 0)).toBeGreaterThanOrEqual(BATCH_PAUSE_MS);
		}
	});

	it('retries a record write that fails once, like a batch', async () => {
		const clock = { now: 0 };
		const { db, deletes, remaining } = eventsDb(12_000, clock);
		const finished: unknown[] = [];
		let progressWrites = 0;
		const runner = new DeletionRunner({
			db,
			records: {
				...records,
				progress: () => {
					progressWrites++;

					return progressWrites === 2
						? Promise.reject(new Error('write concern timeout'))
						: Promise.resolve(true);
				},
				finish: (_id, outcome) => {
					finished.push(outcome);

					return Promise.resolve(true);
				}
			},
			logger: silentLogger(),
			sleep: (ms) => {
				clock.now += ms;

				return Promise.resolve();
			}
		});

		await runner.run(job());

		expect(remaining()).toBe(0);
		expect(deletes).toHaveLength(3);
		expect(finished).toEqual([{ state: 'completed' }]);
	});

	it('logs a completion whose finish applied though its reply was lost, and a takeover only when there is one', async () => {
		for (const [recorded, expected] of [
			[{ id: 'job-1', state: 'completed' }, 'info: Deletion completed'],
			[{ id: 'job-2', state: 'running' }, 'another instance took over its record']
		] as const) {
			const clock = { now: 0 };
			const { db } = eventsDb(10, clock);
			const logger = silentLogger();
			let finishes = 0;
			const runner = new DeletionRunner({
				db,
				records: {
					...records,
					// The first finish applies but its reply is lost; the retry finds the job no longer running.
					finish: () =>
						++finishes === 1 ? Promise.reject(new Error('connection reset')) : Promise.resolve(false),
					read: () => Promise.resolve({ _id: 'dashboard', deletion: { ...job(), ...recorded } })
				},
				logger,
				sleep: () => Promise.resolve()
			});

			await runner.run(job());

			expect(
				logger.lines.some((line) => line.includes(expected)),
				expected
			).toBe(true);
			expect(logger.lines.filter((line) => line.includes('took over')).length, expected).toBe(
				recorded.id === 'job-1' ? 0 : 1
			);
		}
	});

	it('stops when its record is no longer its running job', async () => {
		const clock = { now: 0 };
		const { db, deletes } = eventsDb(12_000, clock);
		const logger = silentLogger();
		let writes = 0;
		const runner = new DeletionRunner({
			db,
			records: { ...records, progress: () => Promise.resolve(++writes < 3) },
			logger,
			sleep: () => Promise.resolve()
		});

		await runner.run(job());

		expect(deletes).toHaveLength(2);
		expect(logger.lines.some((line) => line.includes('another instance took over its record'))).toBe(true);
	});
});

describe('deletion plan', () => {
	const context = {
		cutoff: CUTOFF,
		kept: { rooms: [], egresses: [], ingresses: [] },
		tracksRetentionMs: 7 * 86_400_000,
		trackStatsTimeseries: true
	};

	it('counts every collection step of each class', () => {
		expect(stepCount('events', false)).toBe(1);
		expect(stepCount('stats', false)).toBe(1);
		expect(stepCount('tracks', false)).toBe(3);
		expect(stepCount('entities', false)).toBe(9);
		expect(stepCount('rollups-5min', false)).toBe(1);
		expect(stepCount('legacy', false)).toBe(2);
		expect(stepCount('all', false)).toBe(17);
		expect(stepCount('all', true)).toBe(19);
		expect(planSteps('all', true, context)).toHaveLength(19);
	});

	it('runs the detail classes before the entities and the rollups after them, the legacy drops last', () => {
		expect([...new Set(planSteps('all', true, context).map((step) => step.step))]).toEqual([
			'events',
			'stats',
			'tracks',
			'entities',
			'rollups-5min',
			'rollups-hourly',
			'rollups-daily',
			'legacy'
		]);
	});

	it('deletes time-series stats by time and plain ones by id through ts_ttl', () => {
		const [timeseries] = planSteps('stats', false, context);
		const [plain] = planSteps('stats', false, { ...context, trackStatsTimeseries: false });

		expect(timeseries).toMatchObject({ kind: 'batches', byTime: true });
		expect(timeseries).not.toHaveProperty('hint');
		expect(plain).toMatchObject({ kind: 'batches', hint: 'ts_ttl' });
	});

	it('records the four classes of an Entities job', () => {
		expect(jobRecordedClasses('entities', false)).toEqual(['entities', 'events', 'stats', 'tracks']);
		expect(jobRecordedClasses('legacy', false)).toEqual([]);
		expect(jobRecordedClasses('all', true)).toHaveLength(7);
	});
});

describe('deletion records', () => {
	it('judges a running job without a heartbeat for 60 s interrupted at its last heartbeat', () => {
		const heartbeatAt = new Date('2026-11-19T10:20:00Z');
		const running = job({ heartbeatAt });

		expect(judgeJob(running, new Date(heartbeatAt.getTime() + 60_000)).state).toBe('running');
		expect(judgeJob(running, new Date(heartbeatAt.getTime() + 60_001))).toMatchObject({
			state: 'interrupted',
			finishedAt: heartbeatAt
		});
	});

	it('reports the classes of a stale job not completed as interrupted', () => {
		const heartbeatAt = new Date('2026-11-19T10:20:00Z');
		const completed = { cutoff: CUTOFF, endedBefore: new Date('2026-11-19T10:02:00Z'), finishedAt: heartbeatAt };
		const records = toDeletionRecords(
			{
				_id: 'dashboard',
				deletion: job({ class: 'all', heartbeatAt }),
				deletions: { events: { completed }, stats: { completed } }
			},
			new Date(heartbeatAt.getTime() + 75_000)
		);

		expect(records.events).toEqual({
			completed: {
				cutoff: '2026-11-19T10:07:00.000Z',
				endedBefore: '2026-11-19T10:02:00.000Z',
				finishedAt: '2026-11-19T10:20:00.000Z'
			}
		});
		expect(records.tracks).toEqual({ incomplete: { state: 'interrupted', at: '2026-11-19T10:20:00.000Z' } });
		expect(Object.keys(records).sort()).toEqual(
			['entities', 'events', 'rollups-5min', 'rollups-daily', 'rollups-hourly', 'stats', 'tracks'].sort()
		);
	});
});
