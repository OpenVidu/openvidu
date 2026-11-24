import { hostname } from 'node:os';

import { type Db, type Document, MongoServerError } from 'mongodb';

import {
	Collection,
	type DashboardDeletionJob,
	type DashboardDeletionRecord,
	type DeletionClass,
	type DeletionClassKey,
	type DeletionJob,
	type DeletionRecord,
	type DeletionRecords,
	type DeletionStep,
	type SchemaMetaDashboard
} from '@openvidu-dashboard/typings';

import { compact } from '../util/compact.js';
import { GRACE_MS, jobRecordedClasses } from './deletion-plan.js';

/** A running job without a heartbeat for this long reads interrupted and frees the lock. */
export const STALE_AFTER_MS = 60_000;

const DASHBOARD_ID = 'dashboard';

type DashboardDocument = Omit<SchemaMetaDashboard, '_id'> & { _id: string };

/** Host name and process start of this process: a restart keeps the host name and changes the start. */
export const INSTANCE = `${hostname()}@${new Date(Math.round(performance.timeOrigin)).toISOString()}`;

function instanceHost(instance: string): string {
	return instance.slice(0, Math.max(0, instance.lastIndexOf('@')));
}

/** The job as it reads at `now`: a running job without a heartbeat for 60 s is interrupted at its last heartbeat. */
export function judgeJob(job: DashboardDeletionJob, now: Date): DashboardDeletionJob {
	if (job.state === 'running' && job.heartbeatAt.getTime() < now.getTime() - STALE_AFTER_MS) {
		return { ...job, state: 'interrupted', finishedAt: job.heartbeatAt };
	}

	return job;
}

/** The job as the API reports it, without the instance, heartbeat, per-collection counts and request id. */
export function toDeletionJob(job: DashboardDeletionJob): DeletionJob {
	return compact<DeletionJob>({
		id: job.id,
		class: job.class,
		includeLegacy: job.includeLegacy,
		state: job.state,
		cutoff: job.cutoff.toISOString(),
		startedAt: job.startedAt.toISOString(),
		finishedAt: job.finishedAt?.toISOString(),
		currentClass: job.currentClass,
		collection: { index: job.collection.index, total: job.collection.total },
		deleted: job.deleted,
		error: job.error
	});
}

/** Classes of a job it has not completed: those whose `completed` entry is not of its cutoff. */
export function incompleteClasses(
	job: Pick<DashboardDeletionJob, 'class' | 'includeLegacy' | 'cutoff'>,
	deletions: SchemaMetaDashboard['deletions']
): DeletionClassKey[] {
	return jobRecordedClasses(job.class, job.includeLegacy).filter(
		(key) => deletions?.[key]?.completed?.cutoff.getTime() !== job.cutoff.getTime()
	);
}

/**
 * The last outcome of each class, as `GET /info` reports it. A job judged interrupted at `now` but not yet recorded so
 * reads as if it were.
 */
export function toDeletionRecords(dashboard: SchemaMetaDashboard | undefined, now: Date): DeletionRecords {
	const records: Partial<Record<DeletionClassKey, DashboardDeletionRecord>> = { ...dashboard?.deletions };
	const job = dashboard?.deletion === undefined ? undefined : judgeJob(dashboard.deletion, now);

	if (job !== undefined && dashboard?.deletion?.state === 'running' && job.state === 'interrupted') {
		for (const key of incompleteClasses(job, records)) {
			records[key] = { ...records[key], incomplete: { state: 'interrupted', at: job.heartbeatAt } };
		}
	}

	const result: DeletionRecords = {};

	for (const [key, record] of Object.entries(records) as [DeletionClassKey, DashboardDeletionRecord][]) {
		result[key] = compact<DeletionRecord>({
			completed:
				record.completed === undefined
					? undefined
					: {
							cutoff: record.completed.cutoff.toISOString(),
							endedBefore: record.completed.endedBefore.toISOString(),
							finishedAt: record.completed.finishedAt.toISOString()
						},
			incomplete:
				record.incomplete === undefined
					? undefined
					: { state: record.incomplete.state, at: record.incomplete.at.toISOString() }
		});
	}

	return result;
}

/** Pipeline `$set` of the `incomplete` entries of `classes`, at `at` (an expression). */
function incompleteSet(classes: readonly DeletionClassKey[], state: 'interrupted' | 'failed', at: unknown): Document {
	return Object.fromEntries(classes.map((key) => [`deletions.${key}.incomplete`, { state, at }]));
}

export interface NewDeletion {
	id: string;
	class: DeletionClass;
	includeLegacy: boolean;
	currentClass: DeletionStep;
	total: number;
	requestId: string;
	instance?: string;
}

export type Acquisition = { job: DashboardDeletionJob } | { running: DashboardDeletionJob };

/**
 * The deletion records of `schema_meta` `_id: "dashboard"`: the latest job, its lock and the last outcome of each class.
 * Every time is the MongoDB clock (`$$NOW`), so the clocks of the dashboard instances do not matter.
 */
export class DeletionRecordsStore {
	constructor(private readonly db: Db) {}

	private get collection() {
		return this.db.collection<DashboardDocument>(Collection.SCHEMA_META);
	}

	async read(): Promise<SchemaMetaDashboard | undefined> {
		return ((await this.collection.findOne({ _id: DASHBOARD_ID })) ?? undefined) as SchemaMetaDashboard | undefined;
	}

	/**
	 * Takes the lock and records a new running job, unless another one runs. A running job without a heartbeat for 60 s
	 * is first recorded interrupted, with its classes not completed.
	 */
	async acquire(deletion: NewDeletion): Promise<Acquisition> {
		const current = await this.read();

		if (current?.deletion?.state === 'running') {
			await this.markStale(current);
		}

		const job: Document = {
			id: { $literal: deletion.id },
			class: { $literal: deletion.class },
			includeLegacy: { $literal: deletion.includeLegacy },
			state: 'running',
			cutoff: '$$NOW',
			startedAt: '$$NOW',
			heartbeatAt: '$$NOW',
			instance: { $literal: deletion.instance ?? INSTANCE },
			currentClass: { $literal: deletion.currentClass },
			collection: { index: { $literal: 1 }, total: { $literal: deletion.total } },
			deleted: { $literal: 0 },
			deletedBy: { $literal: {} },
			requestId: { $literal: deletion.requestId }
		};

		try {
			const updated = await this.collection.findOneAndUpdate(
				{
					_id: DASHBOARD_ID,
					$or: [{ deletion: { $exists: false } }, { 'deletion.state': { $ne: 'running' } }]
				},
				[{ $set: { deletion: job } }],
				{ upsert: true, returnDocument: 'after' }
			);
			const recorded = (updated as SchemaMetaDashboard | null)?.deletion;

			if (recorded === undefined) {
				throw new Error('The deletion record was not written');
			}

			return { job: recorded };
		} catch (error) {
			// The filter did not match a document that exists: a job runs, so the upsert collided with it.
			if (error instanceof MongoServerError && error.code === 11000) {
				const running = (await this.read())?.deletion;

				if (running !== undefined) {
					return { running };
				}
			}

			throw error;
		}
	}

	/** Records interrupted, at its last heartbeat, a running job without a heartbeat for 60 s. */
	private async markStale(current: SchemaMetaDashboard): Promise<void> {
		const job = current.deletion;

		if (job === undefined) {
			return;
		}

		await this.collection.updateOne(
			{
				_id: DASHBOARD_ID,
				'deletion.id': job.id,
				'deletion.state': 'running',
				$expr: { $lt: ['$deletion.heartbeatAt', { $subtract: ['$$NOW', STALE_AFTER_MS] }] }
			},
			[{ $set: this.interruptedSet(job, current.deletions) }]
		);
	}

	private interruptedSet(job: DashboardDeletionJob, deletions: SchemaMetaDashboard['deletions']): Document {
		return {
			'deletion.state': 'interrupted',
			'deletion.finishedAt': '$deletion.heartbeatAt',
			...incompleteSet(incompleteClasses(job, deletions), 'interrupted', '$deletion.heartbeatAt')
		};
	}

	/**
	 * At startup: records interrupted the running job of an earlier process of this host, which a restart stopped.
	 * @returns the job so recorded, if any
	 */
	async markRestarted(instance = INSTANCE): Promise<DashboardDeletionJob | undefined> {
		const current = await this.read();
		const job = current?.deletion;

		if (
			job?.state !== 'running' ||
			instanceHost(job.instance) !== instanceHost(instance) ||
			job.instance === instance
		) {
			return undefined;
		}

		const result = await this.collection.updateOne(
			{ _id: DASHBOARD_ID, 'deletion.id': job.id, 'deletion.state': 'running' },
			[{ $set: this.interruptedSet(job, current?.deletions) }]
		);

		return result.modifiedCount > 0 ? job : undefined;
	}

	/** @returns false when the record is no longer this running job, which the runner then stops */
	async heartbeat(id: string): Promise<boolean> {
		return this.update(id, [{ $set: { 'deletion.heartbeatAt': '$$NOW' } }]);
	}

	/** Progress of the job: current class and collection, documents deleted. */
	async progress(
		id: string,
		progress: Partial<Pick<DashboardDeletionJob, 'currentClass' | 'collection' | 'deleted' | 'deletedBy'>>
	): Promise<boolean> {
		return this.update(id, {
			$set: Object.fromEntries(Object.entries(progress).map(([k, v]) => [`deletion.${k}`, v]))
		});
	}

	/** Records `classes` completed by the job of `cutoff`, now. */
	async complete(id: string, classes: readonly DeletionClassKey[], cutoff: Date): Promise<boolean> {
		const completed = {
			cutoff: { $literal: cutoff },
			endedBefore: { $literal: new Date(cutoff.getTime() - GRACE_MS) },
			finishedAt: '$$NOW'
		};

		return this.update(id, [
			{ $set: Object.fromEntries(classes.map((key) => [`deletions.${key}.completed`, completed])) },
			{ $unset: classes.map((key) => `deletions.${key}.incomplete`) }
		]);
	}

	/** Ends the job, completed or failed; a failed one records its classes not completed incomplete. */
	async finish(
		id: string,
		outcome: { state: 'completed' } | { state: 'failed'; error: string; incomplete: readonly DeletionClassKey[] }
	): Promise<boolean> {
		return this.update(id, [
			{
				$set: {
					'deletion.state': outcome.state,
					'deletion.finishedAt': '$$NOW',
					...(outcome.state === 'failed'
						? {
								'deletion.error': { $literal: outcome.error },
								...incompleteSet(outcome.incomplete, 'failed', '$$NOW')
							}
						: {})
				}
			}
		]);
	}

	private async update(id: string, update: Document | Document[]): Promise<boolean> {
		const result = await this.collection.updateOne(
			{ _id: DASHBOARD_ID, 'deletion.id': id, 'deletion.state': 'running' },
			update
		);

		return result.matchedCount > 0;
	}
}
