import type { WriterInternal } from './common.js';
import type {
	BrowserFamily,
	ClientSdk,
	ConnectionType,
	DisconnectReason,
	EgressStatus,
	EgressType,
	IngressInputType,
	OsFamily,
	ParticipantKind,
	RoomEndReason
} from './enums.js';

type Counts<K extends string> = Partial<Record<K, number>>;

/**
 * Rollup counters are created lazily by `$inc`, so every counter is optional and an absent counter means zero.
 * `_id` is `<scope>:<bucket>` with the bucket in RFC 3339 UTC without fractional seconds
 * (`global:2026-10-13T10:00:00Z`, `node:ND_x:2026-10-13T10:00:00Z`).
 */
export interface RollupBase {
	_id: string;
	/** `global` or `node:<nodeId>`. */
	scope: string;
	/** Start of the UTC bucket. */
	bucket: Date;
}

export interface RollupBytes {
	up?: number;
	down?: number;
}

export interface RollupQuality {
	scoreSum?: number;
	scoreCount?: number;
	poor?: number;
	lost?: number;
}

export interface RollupRooms {
	created?: number;
	ended?: number;
	endedByReason?: Counts<RoomEndReason>;
	/** Sum of `durationMs` of the rooms ended in the bucket. */
	durationMsSum?: number;
	/** Sum of participant sessions, excluding dependent kinds, of the rooms ended in the bucket. */
	participantsSum?: number;
}

/** Counters of STANDARD sessions; `byKind` counts the sessions of every kind that joined. */
export interface RollupParticipants {
	joined?: number;
	/** `PARTICIPANT_ACTIVE` events. */
	active?: number;
	aborted?: number;
	left?: number;
	byKind?: Counts<ParticipantKind>;
	bySdk?: Counts<ClientSdk>;
	byOs?: Counts<OsFamily>;
	byBrowser?: Counts<BrowserFamily>;
	byConnectionType?: Counts<ConnectionType>;
	disconnectReasons?: Counts<DisconnectReason>;
	connectTimeSumMs?: number;
	connectTimeCount?: number;
	/** Connection minutes. */
	minutes?: number;
}

export interface RollupTracks {
	published?: number;
	subscribed?: number;
	subscribeFailed?: number;
}

export interface RollupEgress {
	started?: number;
	byType?: Counts<EgressType>;
	endedByStatus?: Counts<EgressStatus>;
	/** Sum of `durationMs` of the egresses ended in the bucket. */
	durationMs?: number;
}

export interface RollupIngress {
	sessionsStarted?: number;
	sessionsEnded?: number;
	/** Sessions started by input type. */
	byInputType?: Counts<IngressInputType>;
	/** Sum of `durationMs` of the sessions ended in the bucket. */
	durationMs?: number;
}

/** API calls per Twirp method; keys are `<Service>_<Method>` (`RoomService_CreateRoom`). */
export interface RollupApiCalls {
	total?: number;
	byMethod?: Record<string, number>;
}

/** `analytics_hourly`. */
export interface HourlyRollupDocument extends RollupBase {
	rooms?: RollupRooms;
	participants?: RollupParticipants;
	tracks?: RollupTracks;
	egress?: RollupEgress;
	ingress?: RollupIngress;
	bytes?: RollupBytes;
	quality?: RollupQuality;
	apiCalls?: RollupApiCalls;
	apiErrors?: RollupApiCalls;
}

/** `analytics_daily`. */
export interface DailyRollupDocument extends HourlyRollupDocument {
	/**
	 * Distinct STANDARD identities that joined during the UTC day; set by the server's reconciler once the day has
	 * closed.
	 */
	uniqueIdentities?: number;
}

/** Lifecycle counters of STANDARD sessions; `connected` counts every participant with stats. */
export interface FiveMinuteRollupParticipants {
	/** Distinct participants with stats flushed in the bucket. */
	connected?: number;
	joined?: number;
	/** `PARTICIPANT_ACTIVE` events. */
	active?: number;
	left?: number;
	aborted?: number;
}

/** `analytics_5min`: bandwidth, quality, presence and lifecycle counters for sub-day ranges. */
export interface FiveMinuteRollupDocument extends RollupBase {
	rooms?: { created?: number; ended?: number };
	participants?: FiveMinuteRollupParticipants;
	egress?: { started?: number; ended?: number };
	bytes?: RollupBytes;
	quality?: RollupQuality;
	internal?: WriterInternal;
}
