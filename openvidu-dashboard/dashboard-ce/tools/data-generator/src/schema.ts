import { type CollectionDefinition, type IndexDefinition, type RetentionClass } from '@openvidu-dashboard/typings';
import collectionsJson from '@openvidu-dashboard/typings/schema/collections.json' with { type: 'json' };
import indexesJson from '@openvidu-dashboard/typings/schema/indexes.json' with { type: 'json' };
import type { Db, IndexDescription } from 'mongodb';
import { CONTRACT_SCHEMAS } from './contract.js';

export { SCHEMA_VERSION } from '@openvidu-dashboard/typings';

/** Collections of the data model, keyed for the generator. Names, indexes and TTLs come from the typings contract. */
/** Batch interval of the generated node heartbeats: the writer's default. */
export const BATCH_INTERVAL_MS = 10_000;

export const COLLECTIONS = {
	rooms: 'rooms',
	participants: 'participants',
	tracks: 'tracks',
	trackSubscriptions: 'track_subscriptions',
	egresses: 'egresses',
	ingresses: 'ingresses',
	ingressSessions: 'ingress_sessions',
	events: 'events',
	trackStats: 'track_stats',
	analytics5min: 'analytics_5min',
	analyticsHourly: 'analytics_hourly',
	analyticsDaily: 'analytics_daily',
	nodes: 'nodes',
	schemaMeta: 'schema_meta'
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

const COLLECTION_DEFINITIONS = collectionsJson as unknown as CollectionDefinition[];
const INDEX_DEFINITIONS = indexesJson as unknown as IndexDefinition[];

export const COLLECTION_NAMES: readonly CollectionName[] = COLLECTION_DEFINITIONS.map((definition) => definition.name);

/** Retention per class in seconds; a missing class keeps documents forever. */
export type RetentionSeconds = Partial<Record<RetentionClass, number>>;

const DAY_SECONDS = 86_400;

export const DEFAULT_RETENTION: RetentionSeconds = {
	events: 7 * DAY_SECONDS,
	stats: 7 * DAY_SECONDS,
	tracks: 7 * DAY_SECONDS,
	entities: 90 * DAY_SECONDS,
	rollups5Min: 7 * DAY_SECONDS,
	rollupsHourly: 400 * DAY_SECONDS
};

export interface CreateCollectionsOptions {
	/** Try to create track_stats as a time-series collection; falls back to a plain collection if rejected. */
	timeseries: boolean;
	retention: RetentionSeconds;
	/** Gives new plain collections the contract validator with this action, as the writer does; none when absent. */
	validationAction?: 'error' | 'warn';
}

export interface CreateCollectionsResult {
	/** Whether track_stats ended up as a time-series collection. */
	timeseries: boolean;
}

/**
 * Creates every collection of the contract with its indexes and TTLs; existing collections are kept. Time-series
 * collections take no validator.
 */
export async function createCollections(db: Db, options: CreateCollectionsOptions): Promise<CreateCollectionsResult> {
	const existing = new Map<string, string | undefined>();

	for (const info of await db.listCollections({}, { nameOnly: false }).toArray()) {
		existing.set(info.name, info.type);
	}

	let timeseries = false;

	for (const definition of COLLECTION_DEFINITIONS) {
		if (definition.timeseries !== undefined) {
			timeseries = existing.has(definition.name)
				? existing.get(definition.name) === 'timeseries'
				: await createTimeseries(db, definition, options);
		} else if (!existing.has(definition.name)) {
			await db.createCollection(definition.name, validatorOptions(definition, options));
		}
	}

	for (const definition of COLLECTION_DEFINITIONS) {
		// As the writer does, the TTL index of a retention class kept forever is not created.
		const indexes = INDEX_DEFINITIONS.filter(
			(index) =>
				index.collection === definition.name &&
				!(timeseries && index.timeseriesFallbackOnly === true) &&
				(index.retentionClass === undefined || options.retention[index.retentionClass] !== undefined)
		);

		if (indexes.length > 0) {
			await db
				.collection(definition.name)
				.createIndexes(indexes.map((index) => toIndexDescription(index, options.retention)));
		}
	}

	return { timeseries };
}

async function createTimeseries(
	db: Db,
	definition: CollectionDefinition,
	options: CreateCollectionsOptions
): Promise<boolean> {
	const timeseriesOptions = definition.timeseries;

	if (options.timeseries && timeseriesOptions !== undefined) {
		const expireAfterSeconds = options.retention[timeseriesOptions.retentionClass];

		try {
			await db.createCollection(definition.name, {
				timeseries: {
					timeField: timeseriesOptions.timeField,
					metaField: timeseriesOptions.metaField,
					granularity: timeseriesOptions.granularity
				},
				...(expireAfterSeconds === undefined ? {} : { expireAfterSeconds })
			});

			return true;
		} catch (error) {
			console.warn(
				`${definition.name}: time-series collection rejected, using a plain collection (${describe(error)})`
			);
		}
	}

	await db.createCollection(definition.name, validatorOptions(definition, options));

	return false;
}

function validatorOptions(definition: CollectionDefinition, options: CreateCollectionsOptions) {
	return options.validationAction === undefined
		? {}
		: {
				validator: { $jsonSchema: CONTRACT_SCHEMAS[definition.name] },
				validationLevel: 'strict' as const,
				validationAction: options.validationAction
			};
}

function toIndexDescription(index: IndexDefinition, retention: RetentionSeconds): IndexDescription {
	const ttl = index.retentionClass === undefined ? index.options.expireAfterSeconds : retention[index.retentionClass];

	return {
		key: Object.fromEntries(index.key),
		name: index.name,
		...(index.options.unique === true ? { unique: true } : {}),
		...(index.options.partialFilterExpression === undefined
			? {}
			: { partialFilterExpression: index.options.partialFilterExpression }),
		...(ttl === undefined ? {} : { expireAfterSeconds: ttl })
	};
}

function describe(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
