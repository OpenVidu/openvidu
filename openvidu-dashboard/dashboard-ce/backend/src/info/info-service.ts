import type { Db, Document, FindCursor } from 'mongodb';

import {
	Collection,
	DEFAULT_RETENTION_MS,
	type Edition,
	type FeatureKey,
	type InfoLimits,
	type InfoMigration,
	type InfoPublicResponse,
	type InfoResponse,
	type InfoRetention,
	type InfoStorageEntry,
	LegacyCollection,
	type SchemaMetaCapabilities,
	type SchemaMetaDashboard,
	type SchemaMetaConfig,
	type SchemaMetaMigration,
	type SchemaMetaRetention,
	type SchemaMetaSchema
} from '@openvidu-dashboard/typings';

import { toDeletionRecords } from '../deletions/deletion-records.js';
import type { FigureCaches } from '../deletions/figure-caches.js';
import { schemaStatus } from '../schema/schema-status.js';
import type { StatsModeReader } from '../stats/stats-mode.js';

export const STORAGE_CACHE_MS = 60_000;
/** WiredTiger releases the blocks a deletion freed at its next checkpoint, at most this long after the deletion. */
export const CHECKPOINT_MS = 60_000;

/** The BSON type the date field of a collection holds and how it becomes a date. */
interface DateConverter {
	bsonType: 'date' | 'number';
	convert: (value: unknown) => Date | undefined;
}

const fromDate: DateConverter = {
	bsonType: 'date',
	convert: (value) => (value instanceof Date ? value : undefined)
};

/** Seconds since the epoch, as the legacy writer stored its timestamps. */
const fromSeconds: DateConverter = {
	bsonType: 'number',
	convert: (value) => (typeof value === 'number' && Number.isFinite(value) ? new Date(value * 1000) : undefined)
};

/**
 * Field that dates each collection, read through an index that leads with it (the `global` scope for the daily rollups);
 * `nodes` holds one document per node. Tracks and subscriptions have no such index, and the earliest stats sample
 * would scan the buckets of the time series. The legacy collections are dated by their timestamps in seconds.
 */
const OLDEST: Partial<Record<string, { field: string; filter?: Document; toDate?: DateConverter }>> = {
	[Collection.ROOMS]: { field: 'createdAt' },
	[Collection.PARTICIPANTS]: { field: 'joinedAt' },
	[Collection.EGRESSES]: { field: 'startedAt' },
	[Collection.INGRESSES]: { field: 'createdAt' },
	[Collection.INGRESS_SESSIONS]: { field: 'startedAt' },
	[Collection.EVENTS]: { field: 'ts' },
	[Collection.ANALYTICS_5MIN]: { field: 'bucket' },
	[Collection.ANALYTICS_HOURLY]: { field: 'bucket' },
	[Collection.ANALYTICS_DAILY]: { field: 'bucket', filter: { scope: 'global' } },
	[Collection.NODES]: { field: 'firstSeenAt' },
	[LegacyCollection.EVENTS]: { field: 'timestamp.seconds', toDate: fromSeconds },
	[LegacyCollection.STATS]: { field: 'time_stamp.seconds', toDate: fromSeconds }
};

/** The query of the oldest document of a collection, its date field and the reader of the date of a result. */
export interface OldestQuery {
	cursor: FindCursor<Document>;
	field: string;
	/** The date of a document the cursor returned, `undefined` without one. */
	read: (document: Document | undefined) => Date | undefined;
}

/** The query of the oldest document of a collection, or `null` for a collection without one. */
export function oldestQuery(db: Db, name: string): OldestQuery | null {
	const oldest = OLDEST[name];

	if (oldest === undefined) {
		return null;
	}

	const toDate = oldest.toDate ?? fromDate;
	const cursor = db
		.collection(name)
		.find(
			{ ...oldest.filter, [oldest.field]: { $type: toDate.bsonType } },
			{ projection: { _id: 0, [oldest.field]: 1 } }
		)
		.sort({ [oldest.field]: 1 })
		.limit(1);

	return {
		cursor,
		field: oldest.field,
		read: (document) => {
			const date = toDate.convert(fieldValue(document, oldest.field));

			// A corrupt value beyond the range of a Date leaves the collection undated rather than failing the read.
			return date === undefined || Number.isNaN(date.getTime()) ? undefined : date;
		}
	};
}

/**
 * The value of a dotted field of a document: the projection of `a.b` returns `{ a: { b } }`.
 * @param document document read by the query of {@link oldestQuery}
 * @param field its date field
 * @returns the value, `undefined` when absent
 */
export function fieldValue(document: Document | undefined, field: string): unknown {
	let value: unknown = document;

	for (const key of field.split('.')) {
		value = typeof value === 'object' && value !== null ? (value as Document)[key] : undefined;
	}

	return value;
}

type SchemaMetaDocument =
	| SchemaMetaSchema
	| SchemaMetaMigration
	| SchemaMetaRetention
	| SchemaMetaCapabilities
	| SchemaMetaConfig
	| SchemaMetaDashboard;

/** Schema status, migration and retention, as `GET /info` and the overview report them. */
export type HealthFacts = Pick<InfoResponse, 'schema' | 'migration' | 'retention'>;

export interface InfoServiceOptions {
	edition: Edition;
	version: string;
	features: () => FeatureKey[];
	limits: InfoLimits;
	openapiDocsEnabled: boolean;
	/** Refreshed with the `config` document of every full read. */
	statsMode?: StatsModeReader;
	/** Cleared when a read finds a deletion completed since the last one; the storage cache registers itself. */
	caches?: FigureCaches;
	now?: () => number;
}

/** Schema status, migration and retention with the dashboard document, from one read of `schema_meta`. */
export interface StatusFacts {
	health: HealthFacts;
	dashboard?: SchemaMetaDashboard;
}

/** The info document: public subset before login, every fact after it; `schema_meta` is read on every call. */
export class InfoService {
	private storage: { at: number; value: Record<string, InfoStorageEntry> } | undefined;
	/** Incremented by every clear: a read that started before one does not store its figures. */
	private storageGeneration = 0;
	private readonly now: () => number;

	constructor(
		private readonly db: Db,
		private readonly options: InfoServiceOptions
	) {
		this.now = options.now ?? Date.now;
		options.caches?.register(() => {
			this.storage = undefined;
			this.storageGeneration++;
		});
	}

	publicInfo(): InfoPublicResponse {
		return { edition: this.options.edition, versions: { dashboard: this.options.version } };
	}

	async fullInfo(): Promise<InfoResponse> {
		const byId = await this.schemaMeta();
		const schema = byId.get('schema') as SchemaMetaSchema | undefined;
		const capabilities = byId.get('capabilities') as SchemaMetaCapabilities | undefined;
		const [build, hello] = await Promise.all([this.db.command({ buildInfo: 1 }), this.db.command({ hello: 1 })]);
		// Running deletion jobs are judged by the MongoDB clock, as their heartbeats are written.
		const now = hello.localTime instanceof Date ? hello.localTime : new Date(this.now());

		return {
			edition: this.options.edition,
			versions: {
				dashboard: this.options.version,
				...(schema?.writerVersion === undefined ? {} : { server: schema.writerVersion })
			},
			...healthFacts(byId),
			database: { version: String(build.version), timeseriesSupported: capabilities?.timeseries ?? false },
			storage: await this.storageInfo(byId.has('migration')),
			deletions: toDeletionRecords(byId.get('dashboard') as SchemaMetaDashboard | undefined, now),
			features: this.options.features(),
			limits: this.options.limits,
			openapiDocsEnabled: this.options.openapiDocsEnabled
		};
	}

	/** Schema status, migration and retention from one read of `schema_meta`. */
	async health(): Promise<HealthFacts> {
		return healthFacts(await this.schemaMeta());
	}

	/** The health facts and the dashboard document, with its deletion records, from one read of `schema_meta`. */
	async statusFacts(): Promise<StatusFacts> {
		const byId = await this.schemaMeta();
		const dashboard = byId.get('dashboard') as SchemaMetaDashboard | undefined;

		return { health: healthFacts(byId), ...(dashboard === undefined ? {} : { dashboard }) };
	}

	private async schemaMeta(): Promise<ReadonlyMap<string, unknown>> {
		const meta = await this.db.collection<SchemaMetaDocument>(Collection.SCHEMA_META).find({}).toArray();
		const byId = new Map(meta.map((document) => [document._id, document]));

		this.options.statsMode?.remember(byId.get('config') as SchemaMetaConfig | undefined);
		this.options.caches?.observe(byId.get('dashboard') as SchemaMetaDashboard | undefined);

		return byId;
	}

	/**
	 * Storage of the contract collections that exist, cached for {@link STORAGE_CACHE_MS}: until a deletion completes,
	 * and again until the checkpoint after it ({@link CHECKPOINT_MS}), which releases the space it freed.
	 * @param withLegacy also the legacy collections that exist, which only a migration document makes legacy
	 * @returns the entries by collection name
	 */
	private async storageInfo(withLegacy: boolean): Promise<Record<string, InfoStorageEntry>> {
		const now = this.now();
		// A value read before the checkpoint that follows the newest completed deletion is not served after it.
		const release = (this.options.caches?.newestCompletion ?? 0) + CHECKPOINT_MS;
		const released = this.storage !== undefined && this.storage.at < release && now >= release;

		if (this.storage !== undefined && now - this.storage.at < STORAGE_CACHE_MS && !released) {
			return this.storage.value;
		}

		const generation = this.storageGeneration;

		const existing = new Set(
			(await this.db.listCollections({}, { nameOnly: true }).toArray()).map((collection) => collection.name)
		);
		const value: Record<string, InfoStorageEntry> = {};

		const names: string[] = [...Object.values(Collection), ...(withLegacy ? Object.values(LegacyCollection) : [])];

		for (const name of names) {
			if (existing.has(name)) {
				value[name] = await this.collectionStorage(name);
			}
		}

		// Figures read while a completion cleared the cache may predate it: they answer this read only.
		if (generation === this.storageGeneration) {
			this.storage = { at: now, value };
		}

		return value;
	}

	private async collectionStorage(name: string): Promise<InfoStorageEntry> {
		const collection = this.db.collection(name);
		const [stats] = await collection
			.aggregate<{ storageStats?: Document }>([{ $collStats: { storageStats: {} } }])
			.toArray();
		const storageStats = stats?.storageStats ?? {};
		const count =
			typeof storageStats.count === 'number' ? storageStats.count : await collection.estimatedDocumentCount();
		const entry: InfoStorageEntry = {
			documents: count,
			storageBytes: Number(storageStats.storageSize ?? 0),
			indexBytes: Number(storageStats.totalIndexSize ?? 0),
			freeBytes: Number(storageStats.freeStorageSize ?? 0) + indexReusableBytes(storageStats.indexDetails)
		};
		const query = oldestQuery(this.db, name);

		if (query !== null) {
			const [oldest] = await query.cursor.toArray();
			const date = query.read(oldest);

			if (date !== undefined) {
				entry.oldest = date.toISOString();
			}
		}

		return entry;
	}
}

/**
 * The bytes the indexes of a collection keep for reuse: `$collStats` reports the free space of the data file only, and
 * that of each index in its block manager details; a missing figure counts as 0.
 */
export function indexReusableBytes(indexDetails: unknown): number {
	if (typeof indexDetails !== 'object' || indexDetails === null) {
		return 0;
	}

	return Object.values(indexDetails as Record<string, unknown>).reduce<number>((sum, details) => {
		const blockManager = (details as Document | null)?.['block-manager'] as Document | undefined;
		const reusable = Number(blockManager?.['file bytes available for reuse'] ?? 0);

		return sum + (Number.isFinite(reusable) ? reusable : 0);
	}, 0);
}

function healthFacts(byId: ReadonlyMap<string, unknown>): HealthFacts {
	const schema = byId.get('schema') as SchemaMetaSchema | undefined;
	const retention = byId.get('retention') as SchemaMetaRetention | undefined;

	return {
		schema: schemaStatus(typeof schema?.version === 'number' ? schema.version : undefined),
		migration: migrationInfo(byId.get('migration') as SchemaMetaMigration | undefined),
		...(retention === undefined ? {} : { retention: retentionInfo(retention) })
	};
}

function migrationInfo(migration: SchemaMetaMigration | undefined): InfoMigration {
	if (migration === undefined) {
		return { state: 'none' };
	}

	return {
		state: migration.state,
		progress: {
			processed: migration.processed,
			total: migration.total,
			...(migration.startedAt === undefined ? {} : { startedAt: migration.startedAt.toISOString() }),
			...(migration.finishedAt === undefined ? {} : { finishedAt: migration.finishedAt.toISOString() })
		},
		...(migration.error === undefined ? {} : { error: migration.error }),
		...(migration.legacyRetainedUntil === undefined
			? {}
			: { legacyRetainedUntil: migration.legacyRetainedUntil.toISOString() })
	};
}

function retentionInfo(retention: SchemaMetaRetention): InfoRetention {
	// Absent from documents written before the 5-minute rollups had their own retention.
	const recorded: unknown = retention.rollups5MinMs;
	const rollups5MinMs = typeof recorded === 'number' ? recorded : (DEFAULT_RETENTION_MS.rollups5Min ?? 0);

	return {
		eventsMs: retention.eventsMs,
		statsMs: retention.statsMs,
		tracksMs: retention.tracksMs,
		entitiesMs: retention.entitiesMs,
		rollups5MinMs,
		rollupsHourlyMs: retention.rollupsHourlyMs,
		rollupsDailyMs: retention.rollupsDailyMs
	};
}
