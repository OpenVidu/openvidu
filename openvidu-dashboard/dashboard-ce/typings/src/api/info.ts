import type { MigrationState } from '../data-model/enums.js';
import type { FeatureKey } from './features.js';

/** Dashboard edition, fixed by the package that starts the server. */
export const Edition = {
	CE: 'ce',
	PRO: 'pro'
} as const;
export type Edition = (typeof Edition)[keyof typeof Edition];

/** Compatibility of the writer's schema version with this dashboard, as computed by the startup schema gate. */
export const WriterSchemaStatus = {
	/** The writer implements a version this dashboard reads. */
	OK: 'ok',
	/** The writer is newer than this dashboard: it starts and the UI shows a banner. */
	NEWER: 'newer',
	/** The writer is older than the minimum this dashboard reads: the dashboard refuses to start. */
	OLDER: 'older',
	/** The writer has not recorded its schema version yet. */
	UNINITIALIZED: 'uninitialized'
} as const;
export type WriterSchemaStatus = (typeof WriterSchemaStatus)[keyof typeof WriterSchemaStatus];

export interface InfoSchema {
	/** `SCHEMA_VERSION` of this dashboard. */
	dashboard: number;
	/** Version recorded by the writer in `schema_meta`, absent until it is. */
	writer?: number;
	status: WriterSchemaStatus;
}

/** Legacy migration state; `none` until the writer records one. */
export type InfoMigrationState = MigrationState | 'none';

export interface InfoMigration {
	state: InfoMigrationState;
	progress?: { processed: number; total: number; startedAt?: string; finishedAt?: string };
	/** Reason of a `failed` migration. */
	error?: string;
}

/** Retention the writer applies, in milliseconds; `rollupsDailyMs` is `null` when daily rollups are kept forever. */
export interface InfoRetention {
	eventsMs: number;
	statsMs: number;
	tracksMs: number;
	entitiesMs: number;
	rollups5MinMs: number;
	rollupsHourlyMs: number;
	rollupsDailyMs: number | null;
}

export interface InfoDatabase {
	version: string;
	timeseriesSupported: boolean;
}

export interface InfoStorageEntry {
	documents: number;
	storageBytes: number;
	indexBytes: number;
	/** Earliest `ts`, `bucket` or `createdAt` of the collection, when an index gives it cheaply. */
	oldest?: string;
}

/** Widest resolved ranges on which the lists accept a ranked (metric) sort. */
export interface InfoLimits {
	/** Rooms, egresses and ingresses: `DASHBOARD_LIST_TOTAL_MAX_RANGE`. */
	rankedSortMaxRangeMs: number;
	/** Participants and agents without a room filter: the smaller of 24 h and `rankedSortMaxRangeMs`. */
	participantRankedSortMaxRangeMs: number;
}

/** `GET /api/v1/info` without `Authorization`: what the login page shows. */
export interface InfoPublicResponse {
	edition: Edition;
	versions: { dashboard: string };
}

/** `GET /api/v1/info` with a valid bearer token. */
export interface InfoResponse {
	edition: Edition;
	versions: { dashboard: string; server?: string };
	schema: InfoSchema;
	migration: InfoMigration;
	retention?: InfoRetention;
	database: InfoDatabase;
	storage: Record<string, InfoStorageEntry>;
	features: FeatureKey[];
	limits: InfoLimits;
	openapiDocsEnabled: boolean;
}
