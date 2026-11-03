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
	type SchemaMetaCapabilities,
	type SchemaMetaConfig,
	type SchemaMetaMigration,
	type SchemaMetaRetention,
	type SchemaMetaSchema
} from '@openvidu-dashboard/typings';

import { schemaStatus } from '../schema/schema-status.js';
import type { StatsModeReader } from '../stats/stats-mode.js';

export const STORAGE_CACHE_MS = 60_000;

/**
 * Field that dates each collection, read through an index that leads with it (the `global` scope for the daily rollups);
 * `nodes` holds one document per node. Tracks and subscriptions have no such index, and the earliest stats sample
 * would scan the buckets of the time series.
 */
const OLDEST: Partial<Record<string, { field: string; filter?: Document }>> = {
	[Collection.ROOMS]: { field: 'createdAt' },
	[Collection.PARTICIPANTS]: { field: 'joinedAt' },
	[Collection.EGRESSES]: { field: 'startedAt' },
	[Collection.INGRESSES]: { field: 'createdAt' },
	[Collection.INGRESS_SESSIONS]: { field: 'startedAt' },
	[Collection.EVENTS]: { field: 'ts' },
	[Collection.ANALYTICS_5MIN]: { field: 'bucket' },
	[Collection.ANALYTICS_HOURLY]: { field: 'bucket' },
	[Collection.ANALYTICS_DAILY]: { field: 'bucket', filter: { scope: 'global' } },
	[Collection.NODES]: { field: 'firstSeenAt' }
};

/** The query of the oldest document of a collection and its date field, or `null` for a collection without one. */
export function oldestQuery(db: Db, name: string): { cursor: FindCursor<Document>; field: string } | null {
	const oldest = OLDEST[name];

	if (oldest === undefined) {
		return null;
	}

	const cursor = db
		.collection(name)
		.find({ ...oldest.filter, [oldest.field]: { $type: 'date' } }, { projection: { _id: 0, [oldest.field]: 1 } })
		.sort({ [oldest.field]: 1 })
		.limit(1);

	return { cursor, field: oldest.field };
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
			storage: await this.storageInfo(),
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

	private async storageInfo(): Promise<Record<string, InfoStorageEntry>> {
		if (this.storage !== undefined && this.now() - this.storage.at < STORAGE_CACHE_MS) {
			return this.storage.value;
		}

		const existing = new Set(
			(await this.db.listCollections({}, { nameOnly: true }).toArray()).map((collection) => collection.name)
		);
		const value: Record<string, InfoStorageEntry> = {};

		for (const name of Object.values(Collection)) {
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
			const value: unknown = oldest?.[query.field];

			if (value instanceof Date) {
				entry.oldest = value.toISOString();
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
		...(migration.error === undefined ? {} : { error: migration.error })
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
