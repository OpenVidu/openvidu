import analytics5min from '@openvidu-dashboard/typings/schema/analytics_5min.schema.json' with { type: 'json' };
import analyticsDaily from '@openvidu-dashboard/typings/schema/analytics_daily.schema.json' with { type: 'json' };
import analyticsHourly from '@openvidu-dashboard/typings/schema/analytics_hourly.schema.json' with { type: 'json' };
import egresses from '@openvidu-dashboard/typings/schema/egresses.schema.json' with { type: 'json' };
import events from '@openvidu-dashboard/typings/schema/events.schema.json' with { type: 'json' };
import ingressSessions from '@openvidu-dashboard/typings/schema/ingress_sessions.schema.json' with { type: 'json' };
import ingresses from '@openvidu-dashboard/typings/schema/ingresses.schema.json' with { type: 'json' };
import nodes from '@openvidu-dashboard/typings/schema/nodes.schema.json' with { type: 'json' };
import participants from '@openvidu-dashboard/typings/schema/participants.schema.json' with { type: 'json' };
import rooms from '@openvidu-dashboard/typings/schema/rooms.schema.json' with { type: 'json' };
import schemaMeta from '@openvidu-dashboard/typings/schema/schema_meta.schema.json' with { type: 'json' };
import trackStats from '@openvidu-dashboard/typings/schema/track_stats.schema.json' with { type: 'json' };
import trackSubscriptions from '@openvidu-dashboard/typings/schema/track_subscriptions.schema.json' with { type: 'json' };
import tracks from '@openvidu-dashboard/typings/schema/tracks.schema.json' with { type: 'json' };
import { Double, Long, type Document } from 'mongodb';
import type { CollectionName } from './schema.js';

/** The subset of `$jsonSchema` the contract uses. */
export interface JsonSchema {
	bsonType?: string | string[];
	properties?: Record<string, JsonSchema>;
	additionalProperties?: boolean | JsonSchema;
	items?: JsonSchema;
	oneOf?: JsonSchema[];
	enum?: unknown[];
}

/** The `$jsonSchema` validator of every collection of the contract. */
export const CONTRACT_SCHEMAS: Readonly<Record<CollectionName, JsonSchema>> = {
	rooms,
	participants,
	tracks,
	track_subscriptions: trackSubscriptions,
	egresses,
	ingresses,
	ingress_sessions: ingressSessions,
	events,
	track_stats: trackStats,
	analytics_5min: analytics5min,
	analytics_hourly: analyticsHourly,
	analytics_daily: analyticsDaily,
	nodes,
	schema_meta: schemaMeta
};

/** Bookkeeping of the model that the events, stats and rollups derive from, and the writer never stores. */
const MODEL_ONLY: Partial<Record<CollectionName, readonly string[]>> = {
	rooms: ['participantSids', 'activeParticipantSids', 'identities', 'trackSids', 'egressIds', 'ingressSessionIds'],
	participants: ['trackSids'],
	track_subscriptions: ['maxVideoQuality']
};

const INT32_MAX = 2 ** 31 - 1;
const INT32_MIN = -(2 ** 31);
const OMIT = Symbol('omit');

/**
 * Copies a model document into the stored shape of its collection: without the model's bookkeeping, without the
 * `null` values the contract does not allow (an absent field is omitted), and with every number in the BSON type its
 * schema declares (`double`, or `int`/`long` by magnitude), as the writer stores them. The model document is left as
 * it is.
 * @param collection target collection
 * @param doc model document
 * @returns the document to insert
 */
export function toStored(collection: CollectionName, doc: Document): Document {
	const modelOnly = MODEL_ONLY[collection] ?? [];
	const source = Object.fromEntries(Object.entries(doc).filter(([key]) => !modelOnly.includes(key)));

	return conform(source, CONTRACT_SCHEMAS[collection]) as Document;
}

function conform(value: unknown, schema: JsonSchema | undefined): unknown {
	if (value === null) {
		return schema === undefined || types(schema).includes('null') ? null : OMIT;
	}

	if (typeof value === 'number') {
		return schema === undefined ? value : number(value, types(schema));
	}

	if (Array.isArray(value)) {
		return value.map((item) => conform(item, schema?.items)).filter((item) => item !== OMIT);
	}

	if (typeof value !== 'object' || value instanceof Date || '_bsontype' in value) {
		return value;
	}

	const branch = schema === undefined ? undefined : resolve(schema, value);
	const out: Document = {};

	for (const [key, item] of Object.entries(value)) {
		const additional = branch?.additionalProperties;
		const conformed = conform(
			item,
			branch?.properties?.[key] ?? (typeof additional === 'object' ? additional : undefined)
		);

		if (conformed !== OMIT && conformed !== undefined) {
			out[key] = conformed;
		}
	}

	return out;
}

/** The `oneOf` branch a document belongs to, chosen by the `_id` its branch enumerates. */
function resolve(schema: JsonSchema, doc: Document): JsonSchema {
	return schema.oneOf?.find((branch) => branch.properties?._id?.enum?.includes(doc._id)) ?? schema;
}

function types(schema: JsonSchema): string[] {
	return schema.bsonType === undefined ? [] : [schema.bsonType].flat();
}

function number(value: number, bsonTypes: string[]): unknown {
	const integer = bsonTypes.includes('int') || bsonTypes.includes('long');

	if (bsonTypes.includes('double') && (!integer || !Number.isInteger(value))) {
		return new Double(value);
	}

	if (!integer) {
		return value;
	}

	// `+ 0` turns -0, which BSON stores as a double, into 0.
	const rounded = Math.round(value) + 0;

	return bsonTypes.includes('int') && rounded >= INT32_MIN && rounded <= INT32_MAX
		? rounded
		: Long.fromNumber(rounded);
}
