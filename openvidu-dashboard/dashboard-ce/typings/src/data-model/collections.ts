import type { ValueOf } from './value-of.js';

/** Names of the collections of the analytics data model. */
export const Collection = {
	ROOMS: 'rooms',
	PARTICIPANTS: 'participants',
	TRACKS: 'tracks',
	TRACK_SUBSCRIPTIONS: 'track_subscriptions',
	EGRESSES: 'egresses',
	INGRESSES: 'ingresses',
	INGRESS_SESSIONS: 'ingress_sessions',
	EVENTS: 'events',
	TRACK_STATS: 'track_stats',
	ANALYTICS_5MIN: 'analytics_5min',
	ANALYTICS_HOURLY: 'analytics_hourly',
	ANALYTICS_DAILY: 'analytics_daily',
	NODES: 'nodes',
	SCHEMA_META: 'schema_meta'
} as const;
export type Collection = ValueOf<typeof Collection>;

export const COLLECTIONS: readonly Collection[] = Object.values(Collection);

/** Retention classes configured in the writer (`openvidu.analytics.retention.*`). */
export const RetentionClass = {
	EVENTS: 'events',
	STATS: 'stats',
	TRACKS: 'tracks',
	ENTITIES: 'entities',
	ROLLUPS_5MIN: 'rollups5Min',
	ROLLUPS_HOURLY: 'rollupsHourly',
	ROLLUPS_DAILY: 'rollupsDaily'
} as const;
export type RetentionClass = ValueOf<typeof RetentionClass>;

const DAY_MS = 86_400_000;

/** Default retention per class in milliseconds; `null` keeps documents forever. */
export const DEFAULT_RETENTION_MS: Readonly<Record<RetentionClass, number | null>> = {
	events: 7 * DAY_MS,
	stats: 7 * DAY_MS,
	tracks: 7 * DAY_MS,
	entities: 90 * DAY_MS,
	rollups5Min: 7 * DAY_MS,
	rollupsHourly: 400 * DAY_MS,
	rollupsDaily: null
};

/** Retention of `nodes` documents after their last heartbeat. Not configurable. */
export const NODE_RETENTION_MS = 30 * DAY_MS;

/**
 * Retention class that sets `expiresAt` (`closedAt + retention`) on closed entity documents. Other collections
 * expire through TTL indexes on their own timestamp (see `schema/indexes.json`).
 */
export const ENTITY_RETENTION_CLASS = {
	rooms: RetentionClass.ENTITIES,
	participants: RetentionClass.ENTITIES,
	egresses: RetentionClass.ENTITIES,
	ingresses: RetentionClass.ENTITIES,
	ingress_sessions: RetentionClass.ENTITIES,
	tracks: RetentionClass.TRACKS,
	track_subscriptions: RetentionClass.TRACKS
} as const satisfies Partial<Record<Collection, RetentionClass>>;
