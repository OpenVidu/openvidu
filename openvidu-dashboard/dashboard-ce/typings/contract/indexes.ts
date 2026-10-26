import {
	Collection,
	type CollectionDefinition,
	ENTITY_RETENTION_CLASS,
	type IndexDefinition,
	NODE_RETENTION_MS,
	ParticipantStatus,
	RetentionClass,
	RoomStatus
} from '../src/index.js';

type Key = IndexDefinition['key'];

function index(
	collection: Collection,
	name: string,
	key: Key,
	extra: Partial<Omit<IndexDefinition, 'collection' | 'name' | 'key'>> = {}
): IndexDefinition {
	return { collection, name, key, options: extra.options ?? {}, ...omitOptions(extra) };
}

function omitOptions(extra: Partial<IndexDefinition>): Partial<IndexDefinition> {
	const { options: _options, ...rest } = extra;

	return rest;
}

function entityTtl(collection: Collection): IndexDefinition {
	return index(collection, 'expiresAt_ttl', [['expiresAt', 1]], { options: { expireAfterSeconds: 0 } });
}

const ROOM_FEATURES = ['egress', 'ingress', 'agent', 'sip'] as const;

/** Every index the writer creates. Names are stable: the writer compares them to update TTL values with `collMod`. */
export const INDEXES: readonly IndexDefinition[] = [
	index(Collection.ROOMS, 'status_createdAt_id', [
		['status', 1],
		['createdAt', -1],
		['_id', -1]
	]),
	index(Collection.ROOMS, 'createdAt_id', [
		['createdAt', -1],
		['_id', -1]
	]),
	index(Collection.ROOMS, 'status_endedAt_id', [
		['status', 1],
		['endedAt', -1],
		['_id', -1]
	]),
	index(Collection.ROOMS, 'nameLower_createdAt', [
		['nameLower', 1],
		['createdAt', -1]
	]),
	index(Collection.ROOMS, 'nodeId_status_createdAt_id', [
		['nodeId', 1],
		['status', 1],
		['createdAt', -1],
		['_id', -1]
	]),
	index(
		Collection.ROOMS,
		'status_lastEventAt_active',
		[
			['status', 1],
			['lastEventAt', 1]
		],
		{ options: { partialFilterExpression: { status: RoomStatus.ACTIVE } } }
	),
	...ROOM_FEATURES.map((feature) =>
		index(
			Collection.ROOMS,
			`status_createdAt_id_${feature}`,
			[
				['status', 1],
				['createdAt', -1],
				['_id', -1]
			],
			{ options: { partialFilterExpression: { [`features.${feature}`]: true } } }
		)
	),
	entityTtl(Collection.ROOMS),

	index(Collection.PARTICIPANTS, 'roomSid_joinedAt_id', [
		['roomSid', 1],
		['joinedAt', -1],
		['_id', -1]
	]),
	index(Collection.PARTICIPANTS, 'roomSid_identityLower_joinedAt', [
		['roomSid', 1],
		['identityLower', 1],
		['joinedAt', -1]
	]),
	index(Collection.PARTICIPANTS, 'identityLower_joinedAt', [
		['identityLower', 1],
		['joinedAt', -1]
	]),
	index(Collection.PARTICIPANTS, 'status_kind', [
		['status', 1],
		['kind', 1]
	]),
	index(Collection.PARTICIPANTS, 'kind_status_joinedAt_id', [
		['kind', 1],
		['status', 1],
		['joinedAt', -1],
		['_id', -1]
	]),
	index(Collection.PARTICIPANTS, 'joinedAt_id', [
		['joinedAt', -1],
		['_id', -1]
	]),
	index(
		Collection.PARTICIPANTS,
		'status_lastStatsAt_open',
		[
			['status', 1],
			['lastStatsAt', 1]
		],
		{
			options: {
				partialFilterExpression: { status: { $in: [ParticipantStatus.ACTIVE, ParticipantStatus.JOINING] } }
			}
		}
	),
	entityTtl(Collection.PARTICIPANTS),

	index(Collection.TRACKS, 'participantSid_publishedAt', [
		['participantSid', 1],
		['publishedAt', 1]
	]),
	index(Collection.TRACKS, 'roomSid_publishedAt', [
		['roomSid', 1],
		['publishedAt', 1]
	]),
	entityTtl(Collection.TRACKS),

	index(Collection.TRACK_SUBSCRIPTIONS, 'subscriberSid_subscribedAt', [
		['subscriberSid', 1],
		['subscribedAt', 1]
	]),
	index(Collection.TRACK_SUBSCRIPTIONS, 'trackSid_subscribedAt', [
		['trackSid', 1],
		['subscribedAt', 1]
	]),
	entityTtl(Collection.TRACK_SUBSCRIPTIONS),

	index(Collection.EGRESSES, 'startedAt_id', [
		['startedAt', -1],
		['_id', -1]
	]),
	index(Collection.EGRESSES, 'roomSid_startedAt', [
		['roomSid', 1],
		['startedAt', -1]
	]),
	index(Collection.EGRESSES, 'status_startedAt', [
		['status', 1],
		['startedAt', -1]
	]),
	index(
		Collection.EGRESSES,
		'roomNameLower_startedAt',
		[
			['roomNameLower', 1],
			['startedAt', -1]
		],
		{ options: { partialFilterExpression: { roomNameLower: { $exists: true } } } }
	),
	entityTtl(Collection.EGRESSES),

	index(Collection.INGRESSES, 'createdAt_id', [
		['createdAt', -1],
		['_id', -1]
	]),
	index(Collection.INGRESSES, 'status_createdAt', [
		['status', 1],
		['createdAt', -1]
	]),
	index(Collection.INGRESSES, 'nameLower_createdAt', [
		['nameLower', 1],
		['createdAt', -1]
	]),
	index(
		Collection.INGRESSES,
		'lastSessionAt_id',
		[
			['lastSessionAt', -1],
			['_id', -1]
		],
		{ options: { partialFilterExpression: { lastSessionAt: { $exists: true } } } }
	),
	entityTtl(Collection.INGRESSES),

	index(Collection.INGRESS_SESSIONS, 'ingressId_startedAt', [
		['ingressId', 1],
		['startedAt', -1]
	]),
	index(Collection.INGRESS_SESSIONS, 'roomSid_startedAt', [
		['roomSid', 1],
		['startedAt', -1]
	]),
	index(Collection.INGRESS_SESSIONS, 'status', [['status', 1]]),
	index(Collection.INGRESS_SESSIONS, 'startedAt_id', [
		['startedAt', -1],
		['_id', -1]
	]),
	entityTtl(Collection.INGRESS_SESSIONS),

	index(Collection.EVENTS, 'roomSid_ts', [
		['roomSid', 1],
		['ts', 1]
	]),
	index(Collection.EVENTS, 'participantSid_ts', [
		['participantSid', 1],
		['ts', 1]
	]),
	index(
		Collection.EVENTS,
		'egressId_ts',
		[
			['egressId', 1],
			['ts', 1]
		],
		{ options: { partialFilterExpression: { egressId: { $exists: true } } } }
	),
	index(
		Collection.EVENTS,
		'ingressId_ts',
		[
			['ingressId', 1],
			['ts', 1]
		],
		{ options: { partialFilterExpression: { ingressId: { $exists: true } } } }
	),
	index(Collection.EVENTS, 'ts_ttl', [['ts', 1]], { retentionClass: RetentionClass.EVENTS }),

	index(Collection.TRACK_STATS, 'meta.participantSid_ts', [
		['meta.participantSid', 1],
		['ts', 1]
	]),
	index(Collection.TRACK_STATS, 'meta.roomSid_ts', [
		['meta.roomSid', 1],
		['ts', 1]
	]),
	index(Collection.TRACK_STATS, 'ts_ttl', [['ts', 1]], {
		retentionClass: RetentionClass.STATS,
		timeseriesFallbackOnly: true
	}),

	index(
		Collection.ANALYTICS_5MIN,
		'scope_bucket',
		[
			['scope', 1],
			['bucket', 1]
		],
		{ options: { unique: true } }
	),
	index(Collection.ANALYTICS_5MIN, 'bucket_ttl', [['bucket', 1]], { retentionClass: RetentionClass.ROLLUPS_5MIN }),
	index(
		Collection.ANALYTICS_HOURLY,
		'scope_bucket',
		[
			['scope', 1],
			['bucket', 1]
		],
		{ options: { unique: true } }
	),
	index(Collection.ANALYTICS_HOURLY, 'bucket_ttl', [['bucket', 1]], {
		retentionClass: RetentionClass.ROLLUPS_HOURLY
	}),
	index(
		Collection.ANALYTICS_DAILY,
		'scope_bucket',
		[
			['scope', 1],
			['bucket', 1]
		],
		{ options: { unique: true } }
	),
	index(Collection.ANALYTICS_DAILY, 'bucket_ttl', [['bucket', 1]], {
		retentionClass: RetentionClass.ROLLUPS_DAILY
	}),

	index(Collection.NODES, 'lastSeenAt_ttl', [['lastSeenAt', 1]], {
		options: { expireAfterSeconds: NODE_RETENTION_MS / 1000 }
	})
];

/** Every collection of the model in creation order, with its validator file and retention. */
export const COLLECTION_DEFINITIONS: readonly CollectionDefinition[] = Object.values(Collection).map((name) => {
	const definition: CollectionDefinition = { name, schema: `${name}.schema.json` };
	const retentionClass = (ENTITY_RETENTION_CLASS as Partial<Record<Collection, RetentionClass>>)[name];

	if (retentionClass !== undefined) {
		definition.retentionClass = retentionClass;
	}

	if (name === Collection.TRACK_STATS) {
		definition.timeseries = {
			timeField: 'ts',
			metaField: 'meta',
			granularity: 'seconds',
			retentionClass: RetentionClass.STATS
		};
	}

	return definition;
});
