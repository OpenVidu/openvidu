import type { DeletionClass, DeletionClassKey, DeletionState, DeletionStep } from '../api/deletions.js';
import type { MigrationState, RtcEngine, StatsDetail } from './enums.js';

/** `nodes`: one document per server process, refreshed on every writer batch. `_id` is the node id of the process. */
export interface NodeDocument {
	_id: string;
	firstSeenAt: Date;
	lastSeenAt: Date;
	serverVersion: string;
	/** Configured batch interval of the node; absent on documents written before it existed (read as 10 s). */
	batchIntervalMs?: number;
	/** Whether the node reports media statistics; absent on documents written before it existed (read as true). */
	mediaStats?: boolean;
	/** RTC engine of the server; absent on documents written before it existed (read as `pion`). */
	rtcEngine?: RtcEngine;
	/** Media node label of the server: a name of the machine that stays the same across restarts; absent without one. */
	mediaNode?: string;
	/** IP of the machine named by `mediaNode`; only with a label. */
	ip?: string;
	/** First heartbeat while LiveKit drained the server. */
	drainingAt?: Date;
	/** Set by a graceful stop, after the final batch. */
	stoppedAt?: Date;
	/** Rooms this server hosted, and those of them the reconciler closed; absent counters read as 0. */
	rooms?: { hosted?: number; reconciled?: number };
}

/** `schema_meta` `_id: "schema"`: contract version implemented by the writer. */
export interface SchemaMetaSchema {
	_id: 'schema';
	version: number;
	writerVersion: string;
	updatedAt: Date;
}

/** `schema_meta` `_id: "retention"`: effective retention per class in milliseconds; `null` keeps documents forever. */
export interface SchemaMetaRetention {
	_id: 'retention';
	eventsMs: number;
	statsMs: number;
	tracksMs: number;
	entitiesMs: number;
	rollups5MinMs: number;
	rollupsHourlyMs: number;
	rollupsDailyMs: number | null;
	updatedAt: Date;
}

/** `schema_meta` `_id: "capabilities"`: features detected on the MongoDB server at initialization. */
export interface SchemaMetaCapabilities {
	_id: 'capabilities';
	timeseries: boolean;
	transactions: boolean;
	serverVersion: string;
	detectedAt: Date;
}

/** `schema_meta` `_id: "config"`: writer settings that change how documents are shaped. */
export interface SchemaMetaConfig {
	_id: 'config';
	statsDetail: StatsDetail;
	recordedAt: Date;
}

/** Documents handled by the legacy data migration. */
export interface MigrationCounts {
	/** Legacy events replayed. */
	events: number;
	/** Legacy stats replayed. */
	stats: number;
	/** Fixer close events turned into reconciler closures. */
	synthetic: number;
	/** Legacy documents that could not be decoded or whose type the model does not handle. */
	skipped: number;
}

/** `schema_meta` `_id: "migration"`: progress of the legacy data migration. */
export interface SchemaMetaMigration {
	_id: 'migration';
	state: MigrationState;
	/** Resume point; its shape belongs to the migration. */
	checkpoint?: Record<string, unknown>;
	processed: number;
	total: number;
	startedAt?: Date;
	finishedAt?: Date;
	error?: string;
	/** Writer version that created the migration. */
	writerVersion: string;
	/** Schema version of the data migrated from; 0 is the legacy writer. */
	fromSchemaVersion: number;
	counts: MigrationCounts;
	nodeId?: string;
	/** When the legacy collections have expired by their own TTL. */
	legacyRetainedUntil?: Date;
}

/** Counts of a reconciler run per entity type. */
export interface ReconcilerCounts {
	room: number;
	participant: number;
	egress: number;
	ingressSession: number;
}

/** Closures of a reconciler run per entity type, cascaded tracks and subscriptions included. */
export interface ReconcilerClosures extends ReconcilerCounts {
	track: number;
	subscription: number;
}

/** `schema_meta` `_id: "reconciler"`: the last run of the writer's reconciler, which closes entities whose end event never arrived. */
export interface SchemaMetaReconciler {
	_id: 'reconciler';
	lastRunAt: Date;
	lastRunDurationMs: number;
	/** Node that held the reconciler lock for the run. */
	nodeId: string;
	candidates: ReconcilerCounts;
	closed: ReconcilerClosures;
	/** The run stopped at its closure limit or time budget; a follow-up run continues it. */
	partial: boolean;
	/** Present when the run failed. */
	lastError?: string;
}

/** The latest deletion job, written only by the dashboard instance that runs it. Times are the MongoDB clock. */
export interface DashboardDeletionJob {
	/** UUID. */
	id: string;
	class: DeletionClass;
	includeLegacy: boolean;
	state: DeletionState;
	cutoff: Date;
	startedAt: Date;
	/** Written every 10 s while the job runs; a running job without one for 60 s reads interrupted. */
	heartbeatAt: Date;
	finishedAt?: Date;
	/** Host name and process start of the instance running it, to recognise its own job after a restart. */
	instance: string;
	currentClass?: DeletionStep;
	collection: { index: number; total: number };
	/** Documents deleted by the whole job. */
	deleted: number;
	/** Documents deleted per collection, for the log. */
	deletedBy: Record<string, number>;
	/** `X-Request-Id` of the request that started it. */
	requestId: string;
	error?: string;
}

/** The last outcome of a deletion class. */
export interface DashboardDeletionRecord {
	completed?: { cutoff: Date; endedBefore: Date; finishedAt: Date };
	incomplete?: { state: 'interrupted' | 'failed'; at: Date };
}

/**
 * `schema_meta` `_id: "dashboard"`: reserved for non-secret facts written by the dashboard; the writer never reads or
 * writes it, and its validator accepts any field.
 */
export interface SchemaMetaDashboard {
	_id: 'dashboard';
	deletion?: DashboardDeletionJob;
	deletions?: Partial<Record<DeletionClassKey, DashboardDeletionRecord>>;
	[key: string]: unknown;
}

export type SchemaMetaDocument =
	| SchemaMetaSchema
	| SchemaMetaRetention
	| SchemaMetaCapabilities
	| SchemaMetaConfig
	| SchemaMetaMigration
	| SchemaMetaReconciler
	| SchemaMetaDashboard;
