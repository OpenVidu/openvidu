import { type Db, type Document, type FindCursor, MongoServerError } from 'mongodb';

import {
	Collection,
	type DashboardDeletionJob,
	DEFAULT_RETENTION_MS,
	type DeletionClassKey,
	type SchemaMetaRetention
} from '@openvidu-dashboard/typings';

import type { Logger } from '../logging/logger.js';
import {
	type CollectionStep,
	GRACE_MS,
	jobRecordedClasses,
	type KeptSets,
	type PlanContext,
	planSteps,
	recordedClasses
} from './deletion-plan.js';
import type { DeletionRecordsStore } from './deletion-records.js';

export const BATCH_SIZE = 5_000;
export const BATCH_PAUSE_MS = 100;
export const HEARTBEAT_MS = 10_000;
export const BATCH_RETRIES = 3;
export const RETRY_DELAY_MS = 1_000;

/** `error` of a failed job; the cause goes to the log only. */
export const DeletionFailure = {
	NO_DELETE_RIGHTS: 'The database user cannot delete data',
	DATABASE_ERROR: 'A database error stopped it'
} as const;

/** MongoDB `Unauthorized`: the database user may not run the command. */
const UNAUTHORIZED = 13;
const NAMESPACE_NOT_FOUND = 26;

type BatchStep = Extract<CollectionStep, { kind: 'batches' }>;

/** The record is no longer this running job (another instance took it over), or the dashboard is shutting down. */
class Stop extends Error {
	constructor(readonly reason: 'lost' | 'shutdown') {
		super(reason);
	}
}

/**
 * The query of one batch of a collection step: the ids of up to 5,000 deletable documents, or, on a time-series
 * collection, the time of the 5,000th deletable document in time order.
 */
export function batchQuery(db: Db, step: BatchStep): FindCursor<Document> {
	const collection = db.collection(step.collection);

	if (step.byTime === true) {
		return collection
			.find(step.filter, { projection: { _id: 0, ts: 1 } })
			.sort({ ts: 1 })
			.skip(BATCH_SIZE - 1)
			.limit(1);
	}

	const cursor = collection.find(step.filter, { projection: { _id: 1 } });

	return (step.hint === undefined ? cursor : cursor.hint(step.hint)).limit(BATCH_SIZE);
}

/** One read of a kept set: the ids (or the `field`) of the matching documents of `collection`, on `expiresAt_ttl`. */
export interface KeptSetQuery {
	set: keyof KeptSets;
	collection: string;
	filter: Document;
	field: string;
}

/**
 * The reads of the kept sets of a cutoff, all on `expiresAt_ttl`. Open entities have `expiresAt: null`. Nothing indexes
 * the end time of rooms and egresses, so those that ended in the grace window are read among the largest expiries under
 * the current entities retention, and their end time is checked on those candidates: an expiry set under a longer
 * earlier retention does not keep an entity that ended before the window.
 */
export function keptSetQueries(cutoff: Date, entitiesMs: number): KeptSetQuery[] {
	const endedBefore = new Date(cutoff.getTime() - GRACE_MS);
	const candidates = { $gte: new Date(endedBefore.getTime() + entitiesMs) };
	const since = { $gte: endedBefore };

	return [
		{ set: 'rooms', collection: Collection.ROOMS, filter: { expiresAt: null }, field: '_id' },
		{ set: 'rooms', collection: Collection.ROOMS, filter: { expiresAt: candidates, endedAt: since }, field: '_id' },
		{ set: 'egresses', collection: Collection.EGRESSES, filter: { expiresAt: null }, field: '_id' },
		{
			set: 'egresses',
			collection: Collection.EGRESSES,
			filter: {
				expiresAt: candidates,
				$or: [{ endedAt: since }, { endedAt: { $exists: false }, updatedAt: since }]
			},
			field: '_id'
		},
		{ set: 'ingresses', collection: Collection.INGRESSES, filter: { expiresAt: null }, field: '_id' },
		{ set: 'ingresses', collection: Collection.INGRESS_SESSIONS, filter: { expiresAt: null }, field: 'ingressId' }
	];
}

/** The cursor of a kept-set read. */
export function keptSetCursor(db: Db, query: KeptSetQuery): FindCursor<Document> {
	return db
		.collection(query.collection)
		.find(query.filter, { projection: { [query.field]: 1 } })
		.hint('expiresAt_ttl');
}

/** Reads the kept sets of a cutoff and how `track_stats` is stored, once when a job starts. */
export async function planContext(db: Db, cutoff: Date): Promise<PlanContext> {
	const retention = await db
		.collection<SchemaMetaRetention>(Collection.SCHEMA_META)
		.findOne({ _id: 'retention' }, { projection: { entitiesMs: 1, tracksMs: 1 } });
	const entitiesMs = retention?.entitiesMs ?? DEFAULT_RETENTION_MS.entities ?? 0;
	const tracksMs = retention?.tracksMs ?? DEFAULT_RETENTION_MS.tracks ?? 0;
	const kept: Record<keyof KeptSets, Set<string>> = { rooms: new Set(), egresses: new Set(), ingresses: new Set() };

	for (const query of keptSetQueries(cutoff, entitiesMs)) {
		for (const document of await keptSetCursor(db, query).toArray()) {
			const id: unknown = document[query.field];

			if (typeof id === 'string') {
				kept[query.set].add(id);
			}
		}
	}

	const [trackStats] = await db.listCollections({ name: Collection.TRACK_STATS }, { nameOnly: false }).toArray();

	return {
		cutoff,
		kept: { rooms: [...kept.rooms], egresses: [...kept.egresses], ingresses: [...kept.ingresses] },
		tracksRetentionMs: tracksMs,
		trackStatsTimeseries: trackStats?.type === 'timeseries'
	};
}

export interface DeletionRunnerOptions {
	db: Db;
	records: Pick<DeletionRecordsStore, 'heartbeat' | 'progress' | 'complete' | 'finish'>;
	logger: Logger;
	/** Replaced in tests by a fake clock. */
	sleep?: (ms: number) => Promise<void>;
}

/** Runs deletion jobs in the background of the instance that accepted them, one collection and batch at a time. */
export class DeletionRunner {
	private stopping = false;
	private current: Promise<void> | undefined;
	private readonly sleep: (ms: number) => Promise<void>;

	constructor(private readonly options: DeletionRunnerOptions) {
		this.sleep =
			options.sleep ??
			((ms) =>
				new Promise((resolve) => {
					setTimeout(resolve, ms);
				}));
	}

	/** Starts a job outside the request; it runs until it ends whatever the client does. */
	start(job: DashboardDeletionJob): void {
		const run = this.run(job).finally(() => {
			if (this.current === run) {
				this.current = undefined;
			}
		});

		this.current = run;
	}

	/** Stops the running job at its next batch, leaving it running in the records: it then reads interrupted. */
	async stop(): Promise<void> {
		this.stopping = true;
		await this.current;
	}

	async run(job: DashboardDeletionJob): Promise<void> {
		const { records, logger } = this.options;
		const line = {
			class: job.class,
			includeLegacy: job.includeLegacy,
			cutoff: job.cutoff.toISOString(),
			requestId: job.requestId
		};
		const deletedBy: Record<string, number> = {};
		const completed = new Set<DeletionClassKey>();
		let deleted = 0;
		let lost = false;

		const write = async (written: Promise<boolean>) => {
			if (!(await written)) {
				lost = true;
				throw new Stop('lost');
			}
		};
		const check = () => {
			if (lost) {
				throw new Stop('lost');
			}

			if (this.stopping) {
				throw new Stop('shutdown');
			}
		};
		const heartbeat = setInterval(() => {
			records.heartbeat(job.id).then(
				(alive) => {
					lost ||= !alive;
				},
				() => undefined
			);
		}, HEARTBEAT_MS);

		heartbeat.unref();
		logger.info('Deletion started', line);

		try {
			const context = await this.retry(() => planContext(this.options.db, job.cutoff), check);
			const steps = planSteps(job.class, job.includeLegacy, context);

			for (const [index, step] of steps.entries()) {
				check();
				await write(
					records.progress(job.id, {
						currentClass: step.step,
						collection: { index: index + 1, total: steps.length }
					})
				);

				for (;;) {
					check();

					const count =
						step.kind === 'drop'
							? await this.retry(() => this.drop(step.collection), check)
							: await this.retry(() => this.batch(step), check);

					if (count === null) {
						break;
					}

					deleted += count;
					deletedBy[step.collection] = (deletedBy[step.collection] ?? 0) + count;
					await write(records.progress(job.id, { deleted, deletedBy }));

					if (step.kind === 'drop') {
						break;
					}

					await this.sleep(BATCH_PAUSE_MS);
				}

				if (steps[index + 1]?.step !== step.step) {
					const classes = recordedClasses(step.step);

					if (classes.length > 0) {
						await write(records.complete(job.id, classes, job.cutoff));
						classes.forEach((key) => completed.add(key));
					}
				}
			}

			await write(records.finish(job.id, { state: 'completed' }));
			logger.info('Deletion completed', { ...line, state: 'completed', deletedBy });
		} catch (error) {
			if (error instanceof Stop) {
				if (error.reason === 'lost') {
					logger.warn(`Deletion ${job.id} stopped: another instance took over its record`, line);
				}

				return;
			}

			const message = isUnauthorized(error) ? DeletionFailure.NO_DELETE_RIGHTS : DeletionFailure.DATABASE_ERROR;
			const incomplete = jobRecordedClasses(job.class, job.includeLegacy).filter((key) => !completed.has(key));

			logger.error('Deletion failed', {
				...line,
				state: 'failed',
				deletedBy,
				cause: error instanceof Error ? error.message : String(error)
			});

			try {
				await records.finish(job.id, { state: 'failed', error: message, incomplete });
			} catch (recordError) {
				logger.error('Cannot record the failed deletion', {
					...line,
					cause: recordError instanceof Error ? recordError.message : String(recordError)
				});
			}
		} finally {
			clearInterval(heartbeat);
		}
	}

	/** One batch of a step: the documents it deleted, or null when no deletable document is left. */
	private async batch(step: BatchStep): Promise<number | null> {
		const collection = this.options.db.collection(step.collection);

		if (step.byTime === true) {
			const [bound] = await batchQuery(this.options.db, step).toArray();
			const filter =
				bound === undefined
					? step.filter
					: { ...step.filter, ts: { ...(step.filter.ts as Document), $lte: bound.ts as Date } };
			const { deletedCount } = await collection.deleteMany(filter);

			return deletedCount > 0 ? deletedCount : null;
		}

		const ids = (await batchQuery(this.options.db, step).toArray()).map((document): unknown => document._id);

		if (ids.length === 0) {
			return null;
		}

		return (await collection.deleteMany({ _id: { $in: ids } } as Document)).deletedCount;
	}

	/** Drops a legacy collection: the documents it held, read before the drop. */
	private async drop(name: string): Promise<number> {
		const collection = this.options.db.collection(name);
		const documents = await collection.estimatedDocumentCount();

		try {
			await collection.drop();
		} catch (error) {
			if (!(error instanceof MongoServerError && error.code === NAMESPACE_NOT_FOUND)) {
				throw error;
			}
		}

		return documents;
	}

	/** Runs `attempt`, retried three times one second apart unless the database user lacks the rights. */
	private async retry<T>(attempt: () => Promise<T>, check: () => void): Promise<T> {
		for (let tries = 0; ; tries++) {
			try {
				return await attempt();
			} catch (error) {
				if (isUnauthorized(error) || tries >= BATCH_RETRIES) {
					throw error;
				}
			}

			await this.sleep(RETRY_DELAY_MS);
			check();
		}
	}
}

function isUnauthorized(error: unknown): boolean {
	return error instanceof MongoServerError && error.code === UNAUTHORIZED;
}
