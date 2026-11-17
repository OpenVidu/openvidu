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
	type SchemaMetaConfig,
	type SchemaMetaMigration,
	type SchemaMetaRetention,
	type SchemaMetaSchema
} from '@openvidu-dashboard/typings';

import { schemaStatus } from '../schema/schema-status.js';
import type { StatsModeReader } from '../stats/stats-mode.js';

export const STORAGE_CACHE_MS = 60_000;

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
	SchemaMetaSchema | SchemaMetaMigration | SchemaMetaRetention | SchemaMetaCapabilities | SchemaMetaConfig;

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
	now?: () => number;
}

/** The info document: public subset before login, every fact after it; `schema_meta` is read on every call. */
export class InfoService {
	private storage: { at: number; value: Record<string, InfoStorageEntry> } | undefined;
	private readonly now: () => number;

	constructor(
		private readonly db: Db,
		private readonly options: InfoServiceOptions
	) {
		this.now = options.now ?? Date.now;
	}

	publicInfo(): InfoPublicResponse {
		return { edition: this.options.edition, versions: { dashboard: this.options.version } };
	}

	async fullInfo(): Promise<InfoResponse> {
		const byId = await this.schemaMeta();
		const schema = byId.get('schema') as SchemaMetaSchema | undefined;
		const capabilities = byId.get('capabilities') as SchemaMetaCapabilities | undefined;
		const build = await this.db.command({ buildInfo: 1 });

		return {
			edition: this.options.edition,
			versions: {
				dashboard: this.options.version,
				...(schema?.writerVersion === undefined ? {} : { server: schema.writerVersion })
			},
			...healthFacts(byId),
			database: { version: String(build.version), timeseriesSupported: capabilities?.timeseries ?? false },
			storage: await this.storageInfo(byId.has('migration')),
			features: this.options.features(),
			limits: this.options.limits,
			openapiDocsEnabled: this.options.openapiDocsEnabled
		};
	}

	/** Schema status, migration and retention from one read of `schema_meta`. */
	async health(): Promise<HealthFacts> {
		return healthFacts(await this.schemaMeta());
	}

	private async schemaMeta(): Promise<ReadonlyMap<string, unknown>> {
		const meta = await this.db.collection<SchemaMetaDocument>(Collection.SCHEMA_META).find({}).toArray();
		const byId = new Map(meta.map((document) => [document._id, document]));

		this.options.statsMode?.remember(byId.get('config') as SchemaMetaConfig | undefined);

		return byId;
	}

	/**
	 * Storage of the contract collections that exist, cached for {@link STORAGE_CACHE_MS}.
	 * @param withLegacy also the legacy collections that exist, which only a migration document makes legacy
	 * @returns the entries by collection name
	 */
	private async storageInfo(withLegacy: boolean): Promise<Record<string, InfoStorageEntry>> {
		if (this.storage !== undefined && this.now() - this.storage.at < STORAGE_CACHE_MS) {
			return this.storage.value;
		}

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

		this.storage = { at: this.now(), value };

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
			indexBytes: Number(storageStats.totalIndexSize ?? 0)
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
