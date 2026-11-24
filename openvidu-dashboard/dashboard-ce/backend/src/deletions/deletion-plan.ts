import type { Document } from 'mongodb';

import {
	Collection,
	DELETION_CLASS_KEYS,
	type DeletionClass,
	type DeletionClassKey,
	type DeletionStep,
	LegacyCollection
} from '@openvidu-dashboard/typings';

/** What ended or was recorded in the 5 minutes before the cutoff is kept, so the writer's late writes recreate nothing. */
export const GRACE_MS = 5 * 60_000;

const FIVE_MINUTES_MS = 5 * 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** Ids of what a deletion keeps, read once when the job starts. */
export interface KeptSets {
	/** Rooms in progress at the cutoff and rooms that ended in the grace window. */
	rooms: string[];
	/** Open egresses and egresses that ended in the grace window. */
	egresses: string[];
	/** Ingress definitions not deleted and the ingresses of the open ingress sessions. */
	ingresses: string[];
}

export interface PlanContext {
	cutoff: Date;
	kept: KeptSets;
	/** Current retention of the tracks class, which dates the closed subscriptions without `unsubscribedAt`. */
	tracksRetentionMs: number;
	/** `track_stats` is a time-series collection: it is deleted in batches by time instead of by `_id`. */
	trackStatsTimeseries: boolean;
}

/** One collection of a job: batches of deletable documents, or the drop of a legacy collection. */
export type CollectionStep =
	| {
			kind: 'batches';
			step: DeletionStep;
			collection: string;
			filter: Document;
			/** Index of the batch query; none for a time-series collection, read through its clustered buckets. */
			hint?: string;
			/** Batches bounded by the time of the 5,000th deletable document instead of by `_id`. */
			byTime?: boolean;
	  }
	| { kind: 'drop'; step: 'legacy'; collection: string };

/** The classes a job runs, in order, and whether it drops the legacy collections last. */
export function jobClasses(deletionClass: DeletionClass, includeLegacy: boolean): DeletionStep[] {
	if (deletionClass === 'all') {
		return [...DELETION_CLASS_KEYS, ...(includeLegacy ? (['legacy'] as const) : [])];
	}

	return [deletionClass];
}

/** The classes a completed class records: an Entities deletion also completes Events, Stats and Tracks. */
export function recordedClasses(step: DeletionStep): DeletionClassKey[] {
	if (step === 'legacy') {
		return [];
	}

	return step === 'entities' ? ['entities', 'events', 'stats', 'tracks'] : [step];
}

/** Every class whose `deletions` entry a job writes. */
export function jobRecordedClasses(deletionClass: DeletionClass, includeLegacy: boolean): DeletionClassKey[] {
	return [...new Set(jobClasses(deletionClass, includeLegacy).flatMap(recordedClasses))];
}

const STEP_COLLECTIONS: Readonly<Record<DeletionStep, readonly string[]>> = {
	events: [Collection.EVENTS],
	stats: [Collection.TRACK_STATS],
	tracks: [Collection.TRACK_STATS, Collection.TRACK_SUBSCRIPTIONS, Collection.TRACKS],
	entities: [
		Collection.EVENTS,
		Collection.TRACK_STATS,
		Collection.TRACK_SUBSCRIPTIONS,
		Collection.TRACKS,
		Collection.INGRESS_SESSIONS,
		Collection.EGRESSES,
		Collection.PARTICIPANTS,
		Collection.INGRESSES,
		Collection.ROOMS
	],
	'rollups-5min': [Collection.ANALYTICS_5MIN],
	'rollups-hourly': [Collection.ANALYTICS_HOURLY],
	'rollups-daily': [Collection.ANALYTICS_DAILY],
	legacy: [LegacyCollection.EVENTS, LegacyCollection.STATS]
};

/** Collection steps of a job, for its `collection.total` before the job reads anything. */
export function stepCount(deletionClass: DeletionClass, includeLegacy: boolean): number {
	return jobClasses(deletionClass, includeLegacy).reduce((sum, step) => sum + STEP_COLLECTIONS[step].length, 0);
}

/** Every collection step of a job, in order, with its filter. */
export function planSteps(
	deletionClass: DeletionClass,
	includeLegacy: boolean,
	context: PlanContext
): CollectionStep[] {
	return jobClasses(deletionClass, includeLegacy).flatMap((step) => classSteps(step, context));
}

function classSteps(step: DeletionStep, context: PlanContext): CollectionStep[] {
	const f = filters(context);

	switch (step) {
		case 'events':
			return [batches(step, Collection.EVENTS, f.events, 'ts_ttl')];
		case 'stats':
			return [stats(step, f.stats, context)];
		case 'tracks':
			return [
				stats(step, { ...f.stats, 'meta.trackSid': { $exists: true } }, context),
				batches(step, Collection.TRACK_SUBSCRIPTIONS, f.subscriptions, 'expiresAt_ttl'),
				batches(step, Collection.TRACKS, f.tracks, 'expiresAt_ttl')
			];
		case 'entities':
			return [
				batches(step, Collection.EVENTS, f.events, 'ts_ttl'),
				stats(step, f.stats, context),
				batches(step, Collection.TRACK_SUBSCRIPTIONS, f.subscriptions, 'expiresAt_ttl'),
				batches(step, Collection.TRACKS, f.tracks, 'expiresAt_ttl'),
				batches(step, Collection.INGRESS_SESSIONS, f.ingressSessions, 'expiresAt_ttl'),
				batches(step, Collection.EGRESSES, f.egresses, 'expiresAt_ttl'),
				batches(step, Collection.PARTICIPANTS, f.participants, 'expiresAt_ttl'),
				batches(step, Collection.INGRESSES, f.ingresses, 'expiresAt_ttl'),
				batches(step, Collection.ROOMS, f.rooms, 'expiresAt_ttl')
			];
		case 'rollups-5min':
			return [batches(step, Collection.ANALYTICS_5MIN, f.rollups5Min, 'bucket_ttl')];
		case 'rollups-hourly':
			return [batches(step, Collection.ANALYTICS_HOURLY, f.rollupsHourly, 'bucket_ttl')];
		case 'rollups-daily':
			// Daily rollups kept forever have no TTL index.
			return [batches(step, Collection.ANALYTICS_DAILY, f.rollupsDaily, 'scope_bucket')];
		case 'legacy':
			return STEP_COLLECTIONS.legacy.map((collection) => ({ kind: 'drop', step: 'legacy', collection }));
	}
}

function batches(step: DeletionStep, collection: string, filter: Document, hint: string): CollectionStep {
	return { kind: 'batches', step, collection, filter, hint };
}

function stats(step: DeletionStep, filter: Document, context: PlanContext): CollectionStep {
	return context.trackStatsTimeseries
		? { kind: 'batches', step, collection: Collection.TRACK_STATS, filter, byTime: true }
		: batches(step, Collection.TRACK_STATS, filter, 'ts_ttl');
}

/** Filter of the deletable documents of each collection: recorded or ended before the grace window, not kept. */
export function filters(context: PlanContext) {
	const { cutoff, kept } = context;
	const endedBefore = new Date(cutoff.getTime() - GRACE_MS);
	const before = { $lt: endedBefore };
	const closed = { $type: 'date' };
	const notKeptRoom = { $nin: kept.rooms };

	return {
		events: {
			ts: before,
			roomSid: notKeptRoom,
			egressId: { $nin: kept.egresses },
			ingressId: { $nin: kept.ingresses }
		},
		stats: { ts: before, 'meta.roomSid': notKeptRoom },
		subscriptions: {
			expiresAt: closed,
			roomSid: notKeptRoom,
			$or: [
				{ unsubscribedAt: before },
				// A failed subscription has no end time: its expiry under the current retention dates it.
				{
					unsubscribedAt: { $exists: false },
					expiresAt: { $lt: new Date(endedBefore.getTime() + context.tracksRetentionMs) }
				}
			]
		},
		tracks: { expiresAt: closed, unpublishedAt: before, roomSid: notKeptRoom },
		ingressSessions: {
			expiresAt: closed,
			roomSid: notKeptRoom,
			$or: [{ endedAt: before }, { endedAt: { $exists: false }, startedAt: before }]
		},
		egresses: {
			expiresAt: closed,
			_id: { $nin: kept.egresses },
			roomSid: notKeptRoom,
			$or: [{ endedAt: before }, { endedAt: { $exists: false }, updatedAt: before }]
		},
		participants: { expiresAt: closed, leftAt: before, roomSid: notKeptRoom },
		ingresses: { expiresAt: closed, deletedAt: before, _id: { $nin: kept.ingresses } },
		rooms: { expiresAt: closed, endedAt: before, _id: notKeptRoom },
		rollups5Min: { bucket: { $lt: new Date(floor(cutoff, FIVE_MINUTES_MS) - FIVE_MINUTES_MS) } },
		rollupsHourly: { bucket: { $lt: new Date(floor(cutoff, HOUR_MS) - HOUR_MS) } },
		rollupsDaily: { bucket: { $lt: new Date(floor(cutoff, DAY_MS) - DAY_MS) } }
	};
}

/** Start of the bucket of `size` that holds `date`; UTC days, hours and 5-minute buckets alike. */
function floor(date: Date, size: number): number {
	return Math.floor(date.getTime() / size) * size;
}
