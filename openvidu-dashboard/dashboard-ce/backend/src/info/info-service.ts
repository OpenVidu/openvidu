import type { Db, Document } from 'mongodb';

import {
	Collection,
	DEFAULT_RETENTION_MS,
	type Edition,
	type FeatureKey,
	type InfoLicense,
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

/** Field whose earliest value dates a collection, when an index starts with it. */
const OLDEST_FIELDS = ['ts', 'bucket', 'createdAt'] as const;

type SchemaMetaDocument =
	SchemaMetaSchema | SchemaMetaMigration | SchemaMetaRetention | SchemaMetaCapabilities | SchemaMetaConfig;

/** Schema status, migration and retention, as `GET /info` and the overview report them. */
export type HealthFacts = Pick<InfoResponse, 'schema' | 'migration' | 'retention'>;

export interface InfoServiceOptions {
	edition: Edition;
	version: string;
	features: () => FeatureKey[];
	limits: InfoLimits;
	/** The license of a PRO deployment. */
	license?: () => InfoLicense | undefined;
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
		const license = this.options.license?.();

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
			...(license === undefined ? {} : { license }),
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
		const indexes = (await collection.listIndexes().toArray()) as { key: Document }[];
		const field = OLDEST_FIELDS.find((candidate) =>
			indexes.some((index) => Object.keys(index.key)[0] === candidate)
		);

		if (field !== undefined) {
			const [oldest] = await collection
				.find({ [field]: { $type: 'date' } }, { projection: { [field]: 1 } })
				.sort({ [field]: 1 })
				.limit(1)
				.toArray();
			const value: unknown = oldest?.[field];

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
