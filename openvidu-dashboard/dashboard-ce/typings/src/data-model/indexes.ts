import type { Collection, RetentionClass } from './collections.js';

/**
 * Shape of the entries of `schema/indexes.json`, the index list the writer creates. A TTL index either has a fixed
 * `options.expireAfterSeconds` or a `retentionClass` whose configured value becomes its `expireAfterSeconds`; the index
 * of a class configured without a limit is not created.
 */
export interface IndexDefinition {
	collection: Collection;
	name: string;
	/** Key fields in order with their direction. */
	key: [field: string, direction: 1 | -1][];
	options: {
		unique?: boolean;
		expireAfterSeconds?: number;
		partialFilterExpression?: Record<string, unknown>;
	};
	retentionClass?: RetentionClass;
	/** Created only when `track_stats` falls back to a plain collection (time-series collections expire by themselves). */
	timeseriesFallbackOnly?: boolean;
}

/** Shape of the entries of `schema/collections.json`. */
export interface CollectionDefinition {
	name: Collection;
	/** JSON Schema file under `schema/`, applied as the collection's `$jsonSchema` validator. */
	schema: string;
	/** Retention class that sets `expiresAt` on closed documents of an entity collection. */
	retentionClass?: RetentionClass;
	timeseries?: {
		timeField: string;
		metaField: string;
		granularity: 'seconds' | 'minutes' | 'hours';
		retentionClass: RetentionClass;
	};
}
