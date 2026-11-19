/** Classes of stored data a deletion job can delete one by one; each has a row of the Storage table of Settings. */
export const DELETION_CLASS_KEYS = [
	'events',
	'stats',
	'tracks',
	'entities',
	'rollups-5min',
	'rollups-hourly',
	'rollups-daily'
] as const;
export type DeletionClassKey = (typeof DELETION_CLASS_KEYS)[number];

/** What `POST /api/v1/deletions` deletes: one class, every class (`all`) or the data before 3.10 (`legacy`). */
export const DELETION_CLASSES = [...DELETION_CLASS_KEYS, 'all', 'legacy'] as const;
export type DeletionClass = (typeof DELETION_CLASSES)[number];

export const DeletionState = {
	RUNNING: 'running',
	COMPLETED: 'completed',
	/** Its dashboard instance stopped while running it: no heartbeat for 60 s, or the instance restarted. */
	INTERRUPTED: 'interrupted',
	FAILED: 'failed'
} as const;
export type DeletionState = (typeof DeletionState)[keyof typeof DeletionState];

/** The class a job is deleting: one of the seven classes, or `legacy` while it drops the data before 3.10. */
export type DeletionStep = DeletionClassKey | 'legacy';

/** A deletion job, as `POST /deletions` answers it and `GET /status` reports the latest one. Dates are ISO 8601. */
export interface DeletionJob {
	id: string;
	class: DeletionClass;
	includeLegacy: boolean;
	state: DeletionState;
	/** MongoDB clock when the request was accepted; nothing that starts or ends after it is deleted. */
	cutoff: string;
	startedAt: string;
	/** End of the job; the last heartbeat of an interrupted one. */
	finishedAt?: string;
	currentClass?: DeletionStep;
	/** Collection being deleted, from 1, of every collection step of the job. */
	collection: { index: number; total: number };
	/** Documents deleted by the whole job. */
	deleted: number;
	/** Why a failed job stopped. */
	error?: string;
}

/** The last outcome of a class, in `GET /info` `deletions`. Dates are ISO 8601. */
export interface DeletionRecord {
	completed?: {
		cutoff: string;
		/** `cutoff` − 5 minutes: what ended before it was deleted. */
		endedBefore: string;
		finishedAt: string;
	};
	/** A later job of the class that did not complete it. */
	incomplete?: { state: 'interrupted' | 'failed'; at: string };
}

export type DeletionRecords = Partial<Record<DeletionClassKey, DeletionRecord>>;

/** Body of `POST /api/v1/deletions`; `includeLegacy` only with `class: "all"`. */
export interface StartDeletionRequest {
	class: DeletionClass;
	includeLegacy?: boolean;
}
