import type { StatsMode } from './derive.js';
import {
	deriveRoom,
	type EgressDoc,
	type EgressOutput,
	type IngressDoc,
	type IngressSessionDoc,
	type ParticipantDoc,
	type RoomBundle,
	type SubscriptionDoc,
	type TrackDoc,
	type TrackSource
} from './model.js';
import { applyStats, type Engine } from './samples.js';

/** The whole life of a room (`generateRoom()`), every entity closed, with the stats it flushes over it. */
export interface RoomLife {
	bundle: RoomBundle;
	/** How the room's server measures media. */
	engine: Engine;
	/** One `track_stats` document per participant and direction, or per track. */
	statsMode: StatsMode;
	/** The last instant anything of the room happens: an end, an API call, an ingress deletion, a closure written. */
	end: number;
}

/** The life of a generated room: its bundle with the stats of its whole life applied. */
export function roomLife(bundle: RoomBundle, engine: Engine, statsMode: StatsMode): RoomLife {
	applyStats(bundle, engine, Number.POSITIVE_INFINITY, statsMode);

	return { bundle, engine, statsMode, end: lastInstant(bundle) };
}

/**
 * The room as the writer has stored it at instant `t`, or undefined before its creation. What starts after `t` is
 * left out; what is open at `t` takes its open state: no end, duration, closer, final stats or expiry, the status of
 * that instant (a session `joining` until it is active, an egress status from its history, an ingress session
 * `buffering` until it publishes, an ingress the status of its latest session), only the mutes and resumes up to `t`,
 * and the bytes, quality and `lastStatsAt` of the stats flushed up to `t`. The room's derived fields come from the
 * entities cut. Until the reconciler writes its closure (`closureAt`), a room it closes is as it was at its last
 * signal: in progress, with what it closes still open and no stats after that signal. After the end of its life, a
 * room is its life.
 */
export function cutRoom(life: RoomLife, t: number): RoomBundle | undefined {
	const { bundle } = life;

	if (bundle.room.createdAt.getTime() > t) {
		return undefined;
	}

	if (t > life.end) {
		return bundle;
	}

	const reported = reportedUntil(life, t);

	// At the last signal, with what the reconciler closes at it still open.
	return reported < t ? cut(life, reported, true) : cut(life, t, false);
}

/**
 * The instant up to which a room has reported at `t`: `t`, or the last signal of a room the reconciler has found
 * silent and not closed yet.
 */
export function reportedUntil(life: RoomLife, t: number): number {
	const { closureAt, room } = life.bundle;
	const endedAt = room.endedAt?.getTime();

	return closureAt !== undefined && endedAt !== undefined && endedAt <= t && t < closureAt ? endedAt : t;
}

/** The entities as they are at `t`; `pending`, with the reconciler's closures not written yet. */
function cut(life: RoomLife, t: number, pending: boolean): RoomBundle {
	const { bundle } = life;
	const by = (at: Date | null): at is Date => at !== null && at.getTime() <= t;
	const ended: Ended = (at, closedBy) => by(at) && !(pending && closedBy === 'reconciler');
	const subscriptions = bundle.subscriptions.filter((s) => by(s.subscribedAt)).map((s) => cutSubscription(s, ended));
	const tracks = bundle.tracks.filter((tr) => by(tr.publishedAt)).map((tr) => cutTrack(tr, subscriptions, by, ended));
	const participants = bundle.participants
		.filter((p) => by(p.joinedAt))
		.map((p) => cutParticipant(p, tracks, subscriptions, by, ended));
	const egresses = bundle.egresses.filter((e) => by(e.startedAt)).map((e) => cutEgress(e, by, ended));
	const ingressSessions = bundle.ingressSessions
		.filter((s) => by(s.startedAt))
		.map((s) => cutIngressSession(s, by, ended));
	const ingresses = bundle.ingresses.filter((i) => by(i.createdAt)).map((i) => cutIngress(i, ingressSessions, by));
	const { room } = bundle;
	const open = !ended(room.endedAt, room.closedBy);
	const result: RoomBundle = {
		room: deriveRoom(
			open
				? {
						...room,
						status: 'active',
						endedAt: null,
						durationMs: null,
						endReason: null,
						closedBy: null,
						reconcilerReason: null,
						expiresAt: null
					}
				: room,
			{ participants, tracks, egresses, ingressSessions }
		),
		participants,
		tracks,
		subscriptions,
		egresses,
		ingresses,
		ingressSessions,
		meanScores: bundle.meanScores,
		apiCalls: bundle.apiCalls.filter((call) => by(call.at))
	};

	// The final stats of what has closed are those of its life, whatever the instant of the cut.
	const published = new Map(tracks.filter((tr) => tr.publishStats !== null).map((tr) => [tr, tr.publishStats]));
	const subscribed = new Map(
		subscriptions.filter((sub) => sub.subscribeStats !== null).map((sub) => [sub, sub.subscribeStats])
	);

	applyStats(result, life.engine, t, life.statsMode);

	for (const [tr, stats] of published) {
		tr.publishStats = stats;
	}

	for (const [sub, stats] of subscribed) {
		sub.subscribeStats = stats;
	}

	return result;
}

type Happened = (at: Date | null) => at is Date;
/** Whether an entity's end, by `closedBy`, is written by the instant of the cut. */
type Ended = (at: Date | null, closedBy: 'event' | 'reconciler' | null) => boolean;

function cutSubscription(s: SubscriptionDoc, ended: Ended): SubscriptionDoc {
	if (s.status === 'failed' || ended(s.unsubscribedAt, s.closedBy)) {
		return { ...s };
	}

	return {
		...s,
		status: 'subscribed',
		unsubscribedAt: null,
		durationMs: null,
		closedBy: null,
		subscribeStats: null,
		expiresAt: null
	};
}

function cutTrack(tr: TrackDoc, subscriptions: readonly SubscriptionDoc[], by: Happened, ended: Ended): TrackDoc {
	if (ended(tr.unpublishedAt, tr.closedBy)) {
		return { ...tr };
	}

	const own = subscriptions.filter((s) => s.trackSid === tr._id);
	const muteChanges = tr.muteChanges.filter((change) => by(change.at));
	const [first] = tr.muteChanges;

	return {
		...tr,
		status: 'published',
		unpublishedAt: null,
		durationMs: null,
		closedBy: null,
		muted: muteChanges.at(-1)?.muted ?? (first === undefined ? tr.muted : !first.muted),
		muteChanges,
		subscribers: {
			current: own.filter((s) => s.status === 'subscribed').length,
			total: own.length,
			failed: own.filter((s) => s.status === 'failed').length
		},
		publishStats: null,
		expiresAt: null
	};
}

function cutParticipant(
	p: ParticipantDoc,
	tracks: readonly TrackDoc[],
	subscriptions: readonly SubscriptionDoc[],
	by: Happened,
	ended: Ended
): ParticipantDoc {
	if (ended(p.leftAt, p.closedBy)) {
		return { ...p };
	}

	const published = new Map(tracks.filter((tr) => tr.participantSid === p._id).map((tr) => [tr._id, tr]));
	const trackSids = p.trackSids.filter((id) => published.has(id));
	const bySource: Partial<Record<TrackSource, number>> = {};
	const subscribed = subscriptions.filter((s) => s.subscriberSid === p._id);
	const resumedAt = p.resumedAt.filter((at) => by(at));
	const active = by(p.activeAt);

	for (const id of trackSids) {
		const source = published.get(id)?.source;

		if (source !== undefined) {
			bySource[source] = (bySource[source] ?? 0) + 1;
		}
	}

	return {
		...p,
		status: active ? 'active' : 'joining',
		activeAt: active ? p.activeAt : null,
		leftAt: null,
		durationMs: null,
		disconnectReason: null,
		closedBy: null,
		connectTimeMs: active ? p.connectTimeMs : null,
		connectionType: active ? p.connectionType : null,
		resumes: resumedAt.length,
		isPublisher: trackSids.length > 0,
		trackSids,
		tracks: {
			published: trackSids.length,
			bySource,
			subscribed: subscribed.filter((s) => s.status !== 'failed').length,
			subscribeFailures: subscribed.filter((s) => s.status === 'failed').length
		},
		lastEventAt: active ? (p.activeAt ?? p.joinedAt) : p.joinedAt,
		resumedAt,
		expiresAt: null
	};
}

function cutEgress(e: EgressDoc, by: Happened, ended: Ended): EgressDoc {
	if (ended(e.endedAt, e.closedBy)) {
		return { ...e };
	}

	// Its final status, at its end, is not written yet.
	const statusHistory = e.statusHistory.filter((h) => by(h.at) && h.at.getTime() !== e.endedAt?.getTime());
	const latest = statusHistory.at(-1);
	const recording = statusHistory.some((h) => h.status === 'active');

	return {
		...e,
		status: latest?.status ?? 'starting',
		closedBy: null,
		updatedAt: latest?.at ?? e.startedAt,
		endedAt: null,
		durationMs: null,
		error: null,
		errorCode: null,
		outputs: recording ? e.outputs.map(openOutput) : [],
		statusHistory,
		retryCount: 0,
		backupStorageUsed: false,
		expiresAt: null
	};
}

/** An output still being written: no end, size or error, and a stream still `ACTIVE`. */
function openOutput(output: EgressOutput): EgressOutput {
	const { size: _size, endedAt: _endedAt, durationMs: _durationMs, error: _error, ...open } = output;

	return output.kind === 'stream' ? { ...open, status: 'ACTIVE' } : open;
}

function cutIngressSession(s: IngressSessionDoc, by: Happened, ended: Ended): IngressSessionDoc {
	if (ended(s.endedAt, s.closedBy)) {
		return { ...s };
	}

	const publishing = by(s.publishedAt);

	return {
		...s,
		roomSid: publishing ? s.roomSid : null,
		status: publishing ? 'publishing' : 'buffering',
		error: null,
		closedBy: null,
		endedAt: null,
		durationMs: null,
		video: publishing ? s.video : null,
		audio: publishing ? s.audio : null,
		expiresAt: null
	};
}

/** An ingress as the writer derives it from its sessions started by then, its last state and its deletion. */
function cutIngress(i: IngressDoc, sessions: readonly IngressSessionDoc[], by: Happened): IngressDoc {
	const own = sessions.filter((s) => s.ingressId === i._id);
	const last = own.at(-1);
	const deleted = by(i.deletedAt);

	return {
		...i,
		deletedAt: deleted ? i.deletedAt : null,
		status: deleted ? 'deleted' : (last?.status ?? 'inactive'),
		lastError: own.reduce<string | null>((error, s) => s.error ?? error, null),
		sessions: own.length,
		totalDurationMs: own.reduce((sum, s) => sum + (s.durationMs ?? 0), 0),
		lastSessionAt: last?.startedAt ?? null,
		expiresAt: deleted ? i.expiresAt : null
	};
}

/** The latest instant of a room's life. */
function lastInstant(bundle: RoomBundle): number {
	const instants = [
		bundle.room.endedAt,
		...bundle.participants.map((p) => p.leftAt),
		...bundle.tracks.map((tr) => tr.unpublishedAt),
		...bundle.subscriptions.map((s) => s.unsubscribedAt ?? s.subscribedAt),
		...bundle.egresses.map((e) => e.endedAt),
		...bundle.ingressSessions.map((s) => s.endedAt),
		...bundle.ingresses.map((i) => i.deletedAt ?? i.createdAt),
		...bundle.apiCalls.map((call) => call.at)
	];

	return Math.max(
		bundle.closureAt ?? Number.NEGATIVE_INFINITY,
		...instants.map((at) => at?.getTime() ?? Number.POSITIVE_INFINITY)
	);
}
