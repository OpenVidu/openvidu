import { randomUUID } from 'node:crypto';

import type { Db } from 'mongodb';

import {
	Collection,
	type DeletionJob,
	type SchemaMetaMigration,
	type StartDeletionRequest
} from '@openvidu-dashboard/typings';

import { ApiError } from '../http/api-error.js';
import { stepCount, jobClasses } from './deletion-plan.js';
import { type DeletionRecordsStore, toDeletionJob } from './deletion-records.js';
import type { DeletionRunner } from './deletion-runner.js';

export const ALREADY_RUNNING = 'A deletion is already running';
export const LEGACY_NOT_KEPT = 'The data before 3.10 is not kept for rollback';

export interface DeletionServiceOptions {
	records: DeletionRecordsStore;
	runner: DeletionRunner;
	/** Dashboard clock, for the rollback window of the legacy data. */
	now: () => Date;
}

/** Starts deletion jobs: one at a time across the instances, the legacy data only while kept for rollback. */
export class DeletionService {
	constructor(
		private readonly db: Db,
		private readonly options: DeletionServiceOptions
	) {}

	async start(request: StartDeletionRequest, requestId: string): Promise<DeletionJob> {
		const includeLegacy = request.includeLegacy === true;

		if ((request.class === 'legacy' || includeLegacy) && !(await this.legacyKept())) {
			throw new ApiError('CONFLICT', LEGACY_NOT_KEPT);
		}

		const acquisition = await this.options.records.acquire({
			id: randomUUID(),
			class: request.class,
			includeLegacy,
			currentClass: jobClasses(request.class, includeLegacy)[0] ?? 'events',
			total: stepCount(request.class, includeLegacy),
			requestId
		});

		if ('running' in acquisition) {
			throw new ApiError('CONFLICT', ALREADY_RUNNING, { job: toDeletionJob(acquisition.running) });
		}

		this.options.runner.start(acquisition.job);

		return toDeletionJob(acquisition.job);
	}

	/** The migration has completed and keeps the legacy collections for a rollback until a later time. */
	private async legacyKept(): Promise<boolean> {
		const migration = await this.db
			.collection<SchemaMetaMigration>(Collection.SCHEMA_META)
			.findOne({ _id: 'migration' }, { projection: { state: 1, legacyRetainedUntil: 1 } });

		return (
			migration?.state === 'completed' &&
			migration.legacyRetainedUntil instanceof Date &&
			migration.legacyRetainedUntil.getTime() > this.options.now().getTime()
		);
	}
}
