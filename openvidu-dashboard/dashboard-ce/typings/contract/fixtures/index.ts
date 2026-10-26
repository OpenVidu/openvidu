import { Collection } from '../../src/index.js';
import { egresses, ingresses, ingressSessions } from './egress-ingress.js';
import { events } from './events.js';
import { participants } from './participants.js';
import { rooms } from './rooms.js';
import { analytics5min, analyticsDaily, analyticsHourly, trackStats } from './stats-and-rollups.js';
import { nodes, schemaMeta } from './system.js';
import { tracks, trackSubscriptions } from './tracks.js';

/** Canonical documents of every collection, written to `fixtures/<collection>.json`. */
export const FIXTURES: Readonly<Record<Collection, readonly object[]>> = {
	[Collection.ROOMS]: rooms,
	[Collection.PARTICIPANTS]: participants,
	[Collection.TRACKS]: tracks,
	[Collection.TRACK_SUBSCRIPTIONS]: trackSubscriptions,
	[Collection.EGRESSES]: egresses,
	[Collection.INGRESSES]: ingresses,
	[Collection.INGRESS_SESSIONS]: ingressSessions,
	[Collection.EVENTS]: events,
	[Collection.TRACK_STATS]: trackStats,
	[Collection.ANALYTICS_5MIN]: analytics5min,
	[Collection.ANALYTICS_HOURLY]: analyticsHourly,
	[Collection.ANALYTICS_DAILY]: analyticsDaily,
	[Collection.NODES]: nodes,
	[Collection.SCHEMA_META]: schemaMeta
};
