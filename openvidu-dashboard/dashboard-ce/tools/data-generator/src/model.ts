import { AGENT_NAME_ATTRIBUTE, OPENVIDU_AGENT_ATTRIBUTE } from '@openvidu-dashboard/typings';
import { Long } from 'mongodb';
import { hashRng, type Rng } from './random.js';
import type { FlushTraffic } from './samples.js';
import { SCHEMA_VERSION } from './schema.js';

export type ScenarioName = 'S' | 'M' | 'L';

export interface Scenario {
	name: ScenarioName;
	roomsPerDay: number;
	sessionsPerDay: number;
	avgRoomSize: number;
}

export const SCENARIOS: Readonly<Record<ScenarioName, Scenario>> = {
	S: { name: 'S', roomsPerDay: 200, sessionsPerDay: 1000, avgRoomSize: 4 },
	M: { name: 'M', roomsPerDay: 2000, sessionsPerDay: 20000, avgRoomSize: 6 },
	L: { name: 'L', roomsPerDay: 5000, sessionsPerDay: 50000, avgRoomSize: 8 }
};

export type ParticipantKind = 'STANDARD' | 'EGRESS' | 'INGRESS' | 'SIP' | 'AGENT';
export type RoomTopology =
	'empty' | 'single_participant' | 'no_publishers' | 'one_to_one' | 'one_to_many' | 'many_to_many';
export type TrackSource = 'CAMERA' | 'MICROPHONE' | 'SCREEN_SHARE' | 'SCREEN_SHARE_AUDIO';
export type EgressType = 'room_composite' | 'web' | 'participant' | 'track_composite' | 'track';
export type EgressStatus = 'starting' | 'active' | 'ending' | 'complete' | 'failed' | 'aborted' | 'limit_reached';

export interface RoomDoc {
	_id: string;
	name: string;
	nameLower: string;
	status: 'active' | 'closed';
	createdAt: Date;
	endedAt: Date | null;
	durationMs: number | null;
	endReason: string | null;
	closedBy: 'event' | 'reconciler' | null;
	nodeId: string;
	mediaNode?: string;
	config: { maxParticipants: number; emptyTimeoutMs: number; departureTimeoutMs: number };
	participantSids: string[];
	activeParticipantSids: string[];
	identities: string[];
	participants: {
		sessions: number;
		unique: number;
		active: number;
		peakActive: number;
		peakPublishers: number;
		aborted: number;
		byKind: Record<ParticipantKind, number>;
	};
	topology: RoomTopology;
	trackSids: string[];
	tracks: { published: number; bySource: Partial<Record<TrackSource, number>> };
	egressIds: string[];
	egress: { total: number; byType: Partial<Record<EgressType, number>>; active: number };
	ingressSessionIds: string[];
	ingress: { sessions: number; active: number };
	bytes: { up: Long; down: Long };
	quality: { scoreSum: number; scoreCount: number; minScore: number | null; poor: number; lost: number };
	features: { egress: boolean; ingress: boolean; agent: boolean; sip: boolean; recording: boolean };
	lastEventAt: Date;
	lastStatsAt: Date | null;
	/** Model only: why the reconciler closed the room and its sessions, as its synthetic events say. */
	reconcilerReason: string | null;
	/** Only `false`, on the rooms of a node without media statistics. */
	mediaStats?: false;
	schemaVersion: number;
	expiresAt: Date | null;
}

export interface ClientInfo {
	sdk: string;
	version: string;
	os: string;
	osVersion: string;
	/** Like every client field the writer keeps, absent when the client leaves it empty. */
	browser?: string;
	browserVersion?: string;
	deviceModel?: string;
	network?: string;
}

export interface ParticipantDoc {
	_id: string;
	identity: string;
	identityLower: string;
	name: string;
	roomSid: string;
	roomName: string;
	kind: ParticipantKind;
	/** Absent without details, as the writer leaves it. */
	kindDetails?: string[];
	status: 'joining' | 'active' | 'left' | 'aborted';
	joinedAt: Date;
	activeAt: Date | null;
	leftAt: Date | null;
	durationMs: number | null;
	disconnectReason: string | null;
	closedBy: 'event' | 'reconciler' | null;
	connectTimeMs: number | null;
	connectionType: string | null;
	/** Absent without a region, as on a self-hosted server. */
	region?: string;
	nodeId: string;
	mediaNode?: string;
	resumes: number;
	client: ClientInfo;
	permission: { canPublish: boolean; canSubscribe: boolean; canPublishData: boolean; hidden: boolean };
	isPublisher: boolean;
	/** Only on `AGENT` sessions: the attributes the writer keeps without `store_metadata`. */
	attributes?: Record<string, string>;
	trackSids: string[];
	tracks: {
		published: number;
		bySource: Partial<Record<TrackSource, number>>;
		subscribed: number;
		subscribeFailures: number;
	};
	/** Only `false`, on the sessions of a node without media statistics. */
	mediaStats?: false;
	bytes: { up: Long; down: Long };
	quality: {
		scoreSum: number;
		scoreCount: number;
		minScore: number | null;
		poor: number;
		lost: number;
		lastScore: number | null;
		lastScoreAt: Date | null;
	};
	lastEventAt: Date;
	lastStatsAt: Date | null;
	/** Model only: the instants of its `PARTICIPANT_RESUMED` events, one per resume. */
	resumedAt: Date[];
	schemaVersion: number;
	expiresAt: Date | null;
}

export interface TrackLayer {
	quality: 'LOW' | 'MEDIUM' | 'HIGH';
	width: number;
	height: number;
	bitrate: number;
}

export interface RtpStats {
	bytes: Long;
	packets: number;
	packetsLost: number;
	packetLossPct: number;
	nacks: number;
	plis: number;
	firs: number;
	jitterMaxMs: number;
	rttMaxMs: number;
	durationMs: number;
	layers: { layer: number; bytes: Long; packets: number }[];
}

export interface TrackDoc {
	_id: string;
	roomSid: string;
	participantSid: string;
	identity: string;
	type: 'AUDIO' | 'VIDEO' | 'DATA';
	source: TrackSource;
	name: string;
	mimeType: string;
	status: 'published' | 'unpublished';
	publishedAt: Date;
	unpublishedAt: Date | null;
	durationMs: number | null;
	closedBy: 'event' | 'reconciler' | null;
	muted: boolean;
	/** Model only: the `TRACK_MUTED` and `TRACK_UNMUTED` of the track, in order; the last one leaves `muted`. */
	muteChanges: { muted: boolean; at: Date }[];
	width: number;
	height: number;
	simulcast: boolean;
	codecs: { mimeType: string; layers: TrackLayer[] }[];
	encryption: 'NONE' | 'GCM';
	subscribers: { current: number; total: number; failed: number };
	publishStats: RtpStats | null;
	schemaVersion: number;
	expiresAt: Date | null;
}

export interface SubscriptionDoc {
	_id: string;
	trackSid: string;
	roomSid: string;
	subscriberSid: string;
	subscriberIdentity: string;
	publisherSid: string;
	publisherIdentity: string;
	source: TrackSource;
	status: 'requested' | 'subscribed' | 'unsubscribed' | 'failed';
	error: string | null;
	subscribedAt: Date;
	unsubscribedAt: Date | null;
	durationMs: number | null;
	closedBy: 'event' | 'reconciler' | null;
	maxVideoQuality: 'LOW' | 'MEDIUM' | 'HIGH' | 'OFF' | null;
	subscribeStats: Omit<RtpStats, 'layers'> | null;
	schemaVersion: number;
	expiresAt: Date | null;
}

export interface EgressDoc {
	_id: string;
	/** Absent on a web egress, which records a URL and has no room. */
	roomSid: string | null;
	roomName: string | null;
	roomNameLower: string | null;
	type: EgressType;
	sourceType: 'web' | 'sdk';
	status: EgressStatus;
	closedBy: 'event' | 'reconciler' | null;
	startedAt: Date;
	updatedAt: Date;
	endedAt: Date | null;
	durationMs: number | null;
	error: string | null;
	errorCode: number | null;
	request: Record<string, unknown>;
	/** The results of the egress as the writer stores them: only the fields each kind of result carries. */
	outputs: EgressOutput[];
	statusHistory: { status: EgressStatus; at: Date }[];
	retryCount: number;
	backupStorageUsed: boolean;
	schemaVersion: number;
	expiresAt: Date | null;
}

export interface EgressOutput {
	kind: 'file' | 'stream' | 'segments' | 'images';
	filename?: string;
	url?: string;
	playlistName?: string;
	filenamePrefix?: string;
	location?: string;
	size?: Long;
	durationMs?: number;
	/** Streams only. */
	status?: 'ACTIVE' | 'FINISHED' | 'FAILED';
	error?: string;
	startedAt?: Date;
	endedAt?: Date;
}

export interface IngressDoc {
	_id: string;
	name: string;
	nameLower: string;
	inputType: 'rtmp' | 'whip' | 'url';
	url: string;
	roomName: string;
	participantIdentity: string;
	participantName: string;
	reusable: boolean;
	enabled: boolean;
	enableTranscoding: boolean;
	createdAt: Date;
	deletedAt: Date | null;
	status: 'inactive' | 'buffering' | 'publishing' | 'error' | 'complete' | 'deleted';
	lastError: string | null;
	sessions: number;
	totalDurationMs: number;
	lastSessionAt: Date | null;
	schemaVersion: number;
	expiresAt: Date | null;
}

export interface IngressSessionDoc {
	_id: string;
	ingressId: string;
	ingressName: string;
	inputType: IngressDoc['inputType'];
	/** Absent while buffering: the state carries no room until it publishes. */
	roomSid: string | null;
	roomName: string;
	participantIdentity: string;
	status: 'buffering' | 'publishing' | 'inactive' | 'error' | 'complete';
	error: string | null;
	closedBy: 'event' | 'reconciler' | null;
	startedAt: Date;
	/** Model only: the end of its buffering, when it started publishing; null when it never did. */
	publishedAt: Date | null;
	endedAt: Date | null;
	durationMs: number | null;
	/** Absent while buffering: the state reports the negotiated media once it publishes. */
	video: { mimeType: string; averageBitrate: number; width: number; height: number; framerate: number } | null;
	audio: { mimeType: string; averageBitrate: number; channels: number; sampleRate: number } | null;
	schemaVersion: number;
	expiresAt: Date | null;
}

/** Everything generated for one room, mutually consistent. */
export interface RoomBundle {
	room: RoomDoc;
	participants: ParticipantDoc[];
	tracks: TrackDoc[];
	subscriptions: SubscriptionDoc[];
	egresses: EgressDoc[];
	ingresses: IngressDoc[];
	ingressSessions: IngressSessionDoc[];
	/** Mean MOS of each participant session, used by the stats and rollup derivation. */
	meanScores: Map<string, number>;
	/** Server API calls about the room, counted in the hourly and daily rollups; the writer never stores them raw. */
	apiCalls: ApiCall[];
	/** What each participant flushed, period by period, once the stats are applied (`applyStats`). */
	traffic?: Map<string, FlushTraffic[]>;
	/**
	 * When the reconciler's closure of the room is written, 3 to 4 minutes after the last signal it is dated at, in a
	 * live room; absent when the closure is written at that signal.
	 */
	closureAt?: number;
	/**
	 * Model only, never stored: the length drawn for each STANDARD session, by id, before the stretch that keeps a room
	 * in progress at the generation instant; the session lasts less when it aborts or its room ends first.
	 */
	drawnLengths?: Map<string, number>;
}

export interface ApiCall {
	at: Date;
	/** `<Service>_<Method>`, the key of the rollup counters. */
	method: string;
	error: boolean;
}

export interface GeneratorContext {
	rng: Rng;
	/** Draws of the room shapes (empty rooms, media senders), apart from `rng` so that they leave the rest unchanged. */
	shapeRng: Rng;
	/** Draws of the ingress sessions, statuses and deletions, apart from `rng` so that they leave the rest unchanged. */
	ingressRng: Rng;
	/** Draws of the egress variety (statuses, second egresses, outputs), apart from `rng`. */
	egressRng: Rng;
	/** Draws of screen shares, encryption, mutes, resumes and joining sessions, apart from `rng`. */
	mediaRng: Rng;
	/** Draws of the server API calls, apart from `rng`. */
	apiRng: Rng;
	scenario: Scenario;
	/** Generation instant (ms): the rooms planned active are in progress at it, the others ended before it. */
	now: number;
	/** Start of the generated range (ms): no API call is counted before it. */
	windowStart: number;
	retentionEntitiesMs: number;
	/** Retention of tracks and subscriptions (`retention.tracks`). */
	retentionTracksMs: number;
	/** Nodes that report no media statistics: their sessions carry no bytes, quality or `track_stats`. */
	withoutMediaStats: ReadonlySet<string>;
}

/** A server that can host a room: its node id, its media node label and how it ends. */
export interface RoomHost {
	nodeId: string;
	/** Media node label; absent in a single-node deployment. */
	mediaNode?: string;
	/** The graceful stop (`stopped`) or the last heartbeat of a lost server; absent while it runs. */
	end?: { at: number; stopped: boolean };
}

export interface RoomPlan {
	index: number;
	createdAt: number;
	active: boolean;
	/** The servers taking rooms at `createdAt`, at most one per machine; the room draws its host among them. */
	hosts: readonly RoomHost[];
	/** Kept open until its server ends: the room of a lost server that the reconciler closes. */
	heldOpen?: boolean;
	/** A room the live writer creates after the generation instant (`live.ts`). */
	live?: LiveRoomPlan;
}

/**
 * What sets a room the live writer creates apart: its egress and ingress shares, and the short-lived states of a live
 * room (slow connections, egresses 20 to 60 s starting and ending, ingress sessions buffering 1 to 2 minutes, every
 * reconciler closure dated at a last signal and written 3 to 4 minutes after it). A `stale` room stops reporting 5 to
 * 25 minutes after its creation and is closed by the reconciler.
 */
export interface LiveRoomPlan {
	egressShare: number;
	ingressShare: number;
	stale: boolean;
}

const MINUTE = 60_000;
const DEPARTURE_TIMEOUT_MS = 20_000;
const EMPTY_TIMEOUT_MS = 300_000;
const FLUSH_MS = 30_000;
/** Score thresholds of the poor and lost quality samples (data model contract). */
const POOR_SCORE = 2.06;
const LOST_SCORE = 1.25;
const AUDIO_BITRATE = 32_000;
/**
 * Share of the STANDARD sessions of a live room that connect slowly, 60 to 180 s, so that about one room in seven in
 * progress holds a session still connecting.
 */
const SLOW_CONNECTIONS = 0.5;
/** End and disconnect reason of a reconciler closure. */
const RECONCILED = 'RECONCILED';

const FIRST_NAMES = [
	'alice',
	'bob',
	'carol',
	'dave',
	'erin',
	'frank',
	'grace',
	'heidi',
	'ivan',
	'judy',
	'mallory',
	'oscar'
];

const LAST_NAMES = ['Moreno', 'Garcia', 'Smith', 'Rossi', 'Novak', 'Silva', 'Tanaka', 'Weber', 'Dubois', 'Kowalski'];

/**
 * The display name a client would set for `identity`, derived from the identity alone so the random sequence and the
 * scenario figures stay unchanged: "Alice Rossi" for `alice-01234`, "Transcriber agent", "Ingress camera 0042"; other
 * kinds keep the identity.
 */
export function displayName(kind: ParticipantKind, identity: string): string {
	const [head = identity, tail = ''] = identity.split('-');
	const title = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

	switch (kind) {
		case 'STANDARD':
			return `${title(head)} ${LAST_NAMES[Number.parseInt(tail, 10) % LAST_NAMES.length] ?? 'Moreno'}`;
		case 'AGENT':
			return `${title(tail)} agent`;
		case 'INGRESS':
			return `Ingress camera ${tail}`;
		default:
			return identity;
	}
}

const VIDEO_PRESETS: readonly (readonly [{ width: number; height: number; bitrate: number }, number])[] = [
	[{ width: 1280, height: 720, bitrate: 1_500_000 }, 60],
	[{ width: 640, height: 360, bitrate: 500_000 }, 25],
	[{ width: 1920, height: 1080, bitrate: 2_800_000 }, 15]
];

const VIDEO_CODECS: readonly (readonly [string, number])[] = [
	['video/VP8', 60],
	['video/H264', 20],
	['video/VP9', 10],
	['video/AV1', 10]
];

const SDKS: readonly (readonly [string, number])[] = [
	['JS', 60],
	['SWIFT', 10],
	['ANDROID', 10],
	['FLUTTER', 8],
	['REACT_NATIVE', 7],
	['UNITY', 5]
];

const BROWSERS: readonly (readonly [[string, string], number])[] = [
	[['Chrome', '141.0'], 65],
	[['Safari', '18.6'], 15],
	[['Firefox', '144.0'], 12],
	[['Edge', '141.0'], 8]
];

const DESKTOP_OS: readonly (readonly [[string, string], number])[] = [
	[['windows', '11'], 50],
	[['macos', '15.6'], 30],
	[['linux', '6.12'], 20]
];

const CONNECTION_TYPES: readonly (readonly [string, number])[] = [
	['udp', 85],
	['tcp', 10],
	['turn', 5]
];

const LEAVE_REASONS: readonly (readonly [string, number])[] = [
	['CLIENT_INITIATED', 80],
	['SIGNAL_CLOSE', 8],
	['STATE_MISMATCH', 4],
	['PARTICIPANT_REMOVED', 4],
	['MIGRATION', 2],
	['CONNECTION_TIMEOUT', 2]
];

interface Session {
	doc: ParticipantDoc;
	activeAt: number;
	leftAt: number;
	tracks: TrackDoc[];
	upBytes: number;
	downBytes: number;
	meanScore: number;
}

/**
 * Draws the whole life of a room, from its creation to its end, with every entity closed; `cutRoom()` gives its state
 * at any instant. A room planned active is in progress at the generation instant and goes on for 10 to 30 minutes
 * after it, unless its server ends it earlier, with the short-lived states of a room in progress around that instant:
 * a participant connecting, an egress starting or ending, an ingress buffering.
 */
export function generateRoom(ctx: GeneratorContext, plan: RoomPlan): RoomBundle {
	const { rng, now } = ctx;
	const roomSid = rng.id('RM_');
	const name = `room-${String(plan.index + 1).padStart(6, '0')}`;
	const host = rng.pick(plan.hosts);
	const { nodeId, mediaNode } = host;
	// Rooms created and never joined, as an application that prepares its rooms ahead does.
	const { live } = plan;
	const empty = !plan.active && ctx.shapeRng.chance(0.03) && plan.heldOpen !== true && live?.stale !== true;
	const hasEgress = rng.chance(live?.egressShare ?? 0.3) && !empty;
	const hasIngress = rng.chance(live?.ingressShare ?? 0.02) && !empty;
	const hasAgent = rng.chance(0.05) && !empty;
	const hasSip = rng.chance(0.01) && !empty;
	// A room in progress ends on its own, the departure timeout after its last participant leaves.
	let endReason = plan.active ? 'IDLE_TIMEOUT' : pickEndReason(rng);

	if (live?.stale === true) {
		endReason = RECONCILED;
	}

	let closedBy: 'event' | 'reconciler' = endReason === RECONCILED ? 'reconciler' : 'event';
	// A room the reconciler closes while its server runs is no longer listed by it; one of a lost server, dead.
	let reconcilerReason = closedBy === 'reconciler' ? 'absent-live' : null;
	// Until when what is open at the generation instant goes on: 10 to 30 minutes more in a room in progress, about what
	// the history's rooms last.
	const openUntil = plan.active ? now + rng.int(10 * MINUTE, 30 * MINUTE) : now;

	const base: RoomBase = { roomSid, roomName: name, nodeId, mediaNode, createdAt: plan.createdAt };
	const sessions: Session[] = [];
	const drawnLengths = new Map<string, number>();
	const drawnIdentities = Math.min(60, Math.max(1, rng.poisson(ctx.scenario.avgRoomSize)));
	const identityCount = empty ? 0 : drawnIdentities;
	const reconnects = rng.poisson(
		Math.max(0, ctx.scenario.sessionsPerDay / ctx.scenario.roomsPerDay - ctx.scenario.avgRoomSize)
	);
	const reconnectsByIdentity = new Map<number, number>();

	for (let i = 0; i < reconnects && identityCount > 0; i += 1) {
		const target = rng.int(0, identityCount - 1);
		reconnectsByIdentity.set(target, (reconnectsByIdentity.get(target) ?? 0) + 1);
	}

	for (let i = 0; i < identityCount; i += 1) {
		const identity = `${rng.pick(FIRST_NAMES)}-${String(rng.int(1, 99_999)).padStart(5, '0')}`;
		const offset = i === 0 ? rng.int(2_000, 10_000) : rng.clampedGaussian(120_000, 90_000, 1_000, 600_000);
		let joinedAt = plan.createdAt + Math.round(offset);
		let remaining = sessionDuration(rng);
		const chain = reconnectsByIdentity.get(i) ?? 0;

		for (let hop = 0; hop <= chain; hop += 1) {
			const last = hop === chain;
			let length = last ? remaining : Math.round(remaining * rng.float(0.2, 0.8));
			const drawn = length;

			// A room in progress keeps its last participant until it ends, a held one its first until its server ends.
			if (plan.active && last && i === identityCount - 1) {
				length = Math.max(length, openUntil - joinedAt);
			} else if (plan.heldOpen === true && hop === 0 && i === 0) {
				length = Math.max(length, (host.end?.at ?? now) - joinedAt + 5 * MINUTE);
			}

			remaining = last ? 0 : remaining - length + rng.int(0, 5 * MINUTE);
			const slow =
				live !== undefined && rng.chance(SLOW_CONNECTIONS)
					? { connectMs: rng.int(MINUTE, 179_000), aborts: rng.chance(1 / 3) }
					: undefined;
			const session = standardSession(
				ctx,
				base,
				identity,
				joinedAt,
				length,
				last ? null : 'DUPLICATE_IDENTITY',
				slow
			);
			sessions.push(session);
			drawnLengths.set(session.doc._id, drawn);
			joinedAt = session.leftAt + rng.int(1_000, 3_000);
		}
	}

	const mediaCtx: GeneratorContext = { ...ctx, rng: ctx.mediaRng };

	// A participant of a room in progress who started connecting less than a minute before the generation instant.
	if (plan.active && identityCount > 0 && ctx.mediaRng.chance(0.15)) {
		const joiner = slowJoiner(mediaCtx, base);
		sessions.push(joiner.session);
		drawnLengths.set(joiner.session.doc._id, joiner.length);
	}

	// Most applications keep the server's timeouts; some set their own.
	const emptyTimeoutMs = ctx.mediaRng.weighted<number>([
		[EMPTY_TIMEOUT_MS, 70],
		[60_000, 10],
		[600_000, 10],
		[1_200_000, 10]
	]);
	const departureTimeoutMs = ctx.mediaRng.weighted<number>([
		[DEPARTURE_TIMEOUT_MS, 70],
		[10_000, 15],
		[60_000, 15]
	]);
	let egresses: EgressDoc[] = [];
	const ingresses: IngressDoc[] = [];
	const ingressSessions: IngressSessionDoc[] = [];

	if (hasAgent) {
		sessions.push(
			serviceSession(
				ctx,
				base,
				'AGENT',
				`agent-${rng.pick(['transcriber', 'assistant', 'recorder'])}`,
				plan.createdAt + rng.int(5_000, 60_000),
				sessionDuration(rng),
				true
			)
		);
	}

	if (hasSip) {
		sessions.push(
			serviceSession(
				ctx,
				base,
				'SIP',
				`sip_+3460${String(rng.int(0, 9_999_999)).padStart(7, '0')}`,
				plan.createdAt + rng.int(10_000, 300_000),
				sessionDuration(rng),
				true
			)
		);
	}

	const ingressPlan = hasIngress ? planIngress(ctx, base, plan.active, live !== undefined) : undefined;
	const ingressParticipants: Session[] = [];

	for (const [index, planned] of (ingressPlan?.sessions ?? []).entries()) {
		// Its INGRESS participant joins as it publishes, once it has buffered.
		const joinedAt = planned.startedAt + planned.bufferMs + 500;
		const participant = serviceSession(
			// The first session draws from the room's stream, as it always did; the later ones from the ingress stream.
			index === 0 ? ctx : { ...ctx, rng: ctx.ingressRng },
			base,
			'INGRESS',
			ingressPlan?.identity ?? '',
			joinedAt,
			(planned.endedAt ?? openUntil) - joinedAt,
			true
		);
		ingressParticipants.push(participant);
		sessions.push(participant);
	}

	// Natural end: the last participant leaves, or the empty timeout of a room nobody joined; API deletions and
	// reconciliation move it.
	const naturalEnd =
		sessions.length === 0 ? plan.createdAt + emptyTimeoutMs : Math.max(...sessions.map((s) => s.leftAt));
	let endedAt: number;

	if (plan.active) {
		// Its last participant stays until `openUntil`, unless it aborted: the room then empties at the instant.
		endedAt = Math.max(naturalEnd, now) + departureTimeoutMs;
	} else {
		endedAt = naturalEnd + departureTimeoutMs;

		if (endReason === 'API_DELETE') {
			endedAt = plan.createdAt + Math.round((naturalEnd - plan.createdAt) * rng.float(0.5, 1));
		} else if (endReason === 'RECONCILED') {
			// The room and the sessions still in it stopped reporting without their closing events, and the server no
			// longer lists them: the reconciler closes them at their last signal.
			endedAt = plan.createdAt + Math.round((naturalEnd - plan.createdAt) * ctx.mediaRng.float(0.5, 0.95));

			if (live !== undefined) {
				const stop = live.stale
					? Math.min(naturalEnd, plan.createdAt + rng.int(5 * MINUTE, 25 * MINUTE))
					: endedAt;
				endedAt = lastSignal(plan.createdAt, sessions, stop);
			}
		}

		endedAt = Math.min(endedAt, now - MINUTE);
	}

	const serverEnd = host.end;
	// The closures the live writer writes, of rooms in progress at the generation instant or created after it.
	const writtenLive = live !== undefined || plan.active;

	// A room still open when its server ends ends with it: at a stop with the shutdown, at a silence by the
	// reconciler, at the server's last heartbeat or, written live, at the room's last signal before it.
	if (serverEnd !== undefined && (plan.heldOpen === true || endedAt > serverEnd.at)) {
		endedAt = writtenLive && !serverEnd.stopped ? lastSignal(plan.createdAt, sessions, serverEnd.at) : serverEnd.at;
		endReason = serverEnd.stopped ? 'SERVER_SHUTDOWN' : RECONCILED;
		closedBy = serverEnd.stopped ? 'event' : 'reconciler';
		reconcilerReason = serverEnd.stopped ? null : 'node-dead';
	}

	const roomEnd = endedAt;
	const closeReason = endReason === 'API_DELETE' ? 'ROOM_DELETED' : 'ROOM_CLOSED';

	// Nobody joins a room once it has ended, a deleted one included: those sessions never happen.
	for (const late of sessions.filter((s) => s.doc.joinedAt.getTime() >= roomEnd - 1_000)) {
		sessions.splice(sessions.indexOf(late), 1);
	}

	closeSessions(ctx, sessions, roomEnd, closeReason, closedBy);

	if (ingressPlan !== undefined) {
		const kept = ingressParticipants.map((p) => (sessions.includes(p) ? p : undefined));
		const built = finishIngress(ctx, base, ingressPlan, kept);
		ingresses.push(built.ingress);
		ingressSessions.push(...built.sessions);
	}

	const extra = extraIngresses(ctx, base, plan.active, roomEnd, closeReason, closedBy, live !== undefined);
	ingresses.push(...extra.ingresses);
	ingressSessions.push(...extra.sessions);
	sessions.push(...extra.participants);

	if (hasEgress) {
		const egressCtx: GeneratorContext = { ...ctx, rng: ctx.egressRng };
		egresses = [buildEgress(ctx, base, plan.active, roomEnd, closedBy, sessions, live !== undefined)];

		// A second egress beside the first, a recording and a stream or the other way round.
		if (ctx.egressRng.chance(0.15)) {
			egresses.push(buildEgress(egressCtx, base, plan.active, roomEnd, closedBy, sessions, live !== undefined));
		}

		// An egress requested once the room had ended never starts; in a live room, one requested too late to record
		// and stop before the room ends.
		const latest = roomEnd - (live === undefined ? 10_000 : 2 * MINUTE);
		egresses = egresses.filter((e) => e.startedAt.getTime() < latest);

		for (const [index, egress] of egresses.entries()) {
			const participant = egressParticipant(index === 0 ? ctx : egressCtx, base, egress);

			if (participant !== undefined) {
				sessions.push(participant);
				closeSessions(ctx, [participant], roomEnd, closeReason, closedBy);
			}
		}
	}

	pickSenders(ctx, sessions);
	const encrypted = ctx.mediaRng.chance(0.03);
	addScreenShares(mediaCtx, base, sessions);

	for (const session of sessions) {
		if (encrypted && session.doc.kind === 'STANDARD') {
			for (const track of session.tracks) {
				track.encryption = 'GCM';
			}
		}

		addMuteChanges(mediaCtx, session);
		addResumes(mediaCtx, session);
	}

	const tracks = sessions.flatMap((s) => s.tracks);
	const closers = reconcilerClosures(sessions);

	for (const track of tracks) {
		track.closedBy = closedByOf(track.unpublishedAt, closers.get(track.participantSid));
	}

	const subscriptions = buildSubscriptions(ctx, roomSid, sessions, closers);
	finalizeSessions(ctx, sessions);

	const participants = sessions.map((s) => s.doc);
	// A share of the rooms caps its participants, above the most it ever held at once.
	const capped = ctx.mediaRng.chance(0.3);
	const maxParticipants = capped ? ([10, 25, 50, 100].find((n) => n >= sessions.length) ?? 0) : 0;
	const room = deriveRoom(
		{
			_id: roomSid,
			name,
			nameLower: name,
			status: 'closed',
			createdAt: new Date(plan.createdAt),
			endedAt: new Date(roomEnd),
			durationMs: roomEnd - plan.createdAt,
			endReason,
			closedBy,
			nodeId,
			...(mediaNode === undefined ? {} : { mediaNode }),
			config: { maxParticipants, emptyTimeoutMs, departureTimeoutMs },
			reconcilerReason,
			...(ctx.withoutMediaStats.has(nodeId) ? { mediaStats: false as const } : {}),
			schemaVersion: SCHEMA_VERSION,
			expiresAt: expiresAt(ctx, roomEnd)
		},
		{ participants, tracks, egresses, ingressSessions }
	);
	const bundle: RoomBundle = {
		room,
		participants,
		tracks,
		subscriptions,
		egresses,
		ingresses,
		ingressSessions,
		meanScores: new Map(sessions.map((s) => [s.doc._id, s.meanScore])),
		apiCalls: [],
		drawnLengths
	};
	bundle.apiCalls = apiCalls(ctx, bundle);

	// The reconciler finds a room silent after 90 s, confirms it on its next run and writes the closure.
	if (writtenLive && closedBy === 'reconciler') {
		bundle.closureAt = roomEnd + hashRng(`${roomSid}|closure`).int(3 * MINUTE, 4 * MINUTE);
	}

	return bundle;
}

/**
 * The last signal of a room at or before `at`, where the reconciler dates its closure when it stops reporting then:
 * its creation, a stats flush of a session connected then, or a session leaving.
 */
function lastSignal(createdAt: number, sessions: readonly Session[], at: number): number {
	const signals = sessions.flatMap((s) => {
		const until = Math.min(at, s.leftAt);
		const flush =
			!neverActive(s) && s.activeAt + FLUSH_MS <= until
				? [s.activeAt + Math.floor((until - s.activeAt) / FLUSH_MS) * FLUSH_MS]
				: [];

		return s.leftAt <= at ? [...flush, s.leftAt] : flush;
	});

	return Math.max(createdAt, ...signals);
}

/** The fields of a room that `deriveRoom()` computes from the entities in it. */
type DerivedRoomField =
	| 'participantSids'
	| 'activeParticipantSids'
	| 'identities'
	| 'participants'
	| 'topology'
	| 'trackSids'
	| 'tracks'
	| 'egressIds'
	| 'egress'
	| 'ingressSessionIds'
	| 'ingress'
	| 'bytes'
	| 'quality'
	| 'features'
	| 'lastEventAt'
	| 'lastStatsAt';

/**
 * A room with the fields the writer derives from its entities: the id arrays, the participant, track, egress and
 * ingress counters, the peaks and the topology, the features, `lastEventAt`, and the bytes, quality and `lastStatsAt`
 * its participants add up (`applyStats()` replaces the bytes and quality with those of the stats it flushed).
 * Participant counters count STANDARD sessions only; `byKind` counts every kind.
 */
export function deriveRoom(
	room: Omit<RoomDoc, DerivedRoomField>,
	parts: Pick<RoomBundle, 'participants' | 'tracks' | 'egresses' | 'ingressSessions'>
): RoomDoc {
	const { participants, tracks } = parts;
	const standard = participants.filter((p) => p.kind === 'STANDARD');
	const activeStandard = standard.filter((p) => p.status === 'active');
	const byKind: Record<ParticipantKind, number> = { STANDARD: 0, EGRESS: 0, INGRESS: 0, SIP: 0, AGENT: 0 };
	const bySource: Partial<Record<TrackSource, number>> = {};
	const byType: Partial<Record<EgressType, number>> = {};
	// A web egress records a URL: it belongs to no room.
	const roomEgresses = parts.egresses.filter((e) => e.roomSid !== null);
	// A buffering ingress session names no room yet.
	const roomIngressSessions = parts.ingressSessions.filter((s) => s.roomSid !== null);
	let scoreSum = 0;
	let scoreCount = 0;
	let minScore: number | null = null;
	let poor = 0;
	let lost = 0;
	let up = 0;
	let down = 0;

	for (const p of participants) {
		byKind[p.kind] += 1;
		scoreSum += p.quality.scoreSum;
		scoreCount += p.quality.scoreCount;
		minScore = p.quality.minScore === null ? minScore : Math.min(minScore ?? 5, p.quality.minScore);
		poor += p.quality.poor;
		lost += p.quality.lost;
		up += p.bytes.up.toNumber();
		down += p.bytes.down.toNumber();
	}

	for (const t of tracks) {
		bySource[t.source] = (bySource[t.source] ?? 0) + 1;
	}

	for (const e of roomEgresses) {
		byType[e.type] = (byType[e.type] ?? 0) + 1;
	}

	const connected = standard.filter((p) => p.activeAt !== null && p.status !== 'aborted' && p.status !== 'joining');
	const peakActive = peakOf(
		connected.map((p): [number, number] => [
			p.activeAt?.getTime() ?? 0,
			p.leftAt?.getTime() ?? Number.MAX_SAFE_INTEGER
		])
	);
	const peakPublishers = peakOf(senderSpans(connected, tracks));
	const lastEventAt = Math.max(
		room.endedAt?.getTime() ?? room.createdAt.getTime(),
		...participants.map((p) => (p.leftAt ?? p.joinedAt).getTime())
	);
	const statsAts = participants.flatMap((p) => (p.lastStatsAt === null ? [] : [p.lastStatsAt.getTime()]));
	const lastStatsAt = statsAts.length === 0 ? null : Math.max(...statsAts);

	return {
		_id: room._id,
		name: room.name,
		nameLower: room.nameLower,
		status: room.status,
		createdAt: room.createdAt,
		endedAt: room.endedAt,
		durationMs: room.durationMs,
		endReason: room.endReason,
		closedBy: room.closedBy,
		nodeId: room.nodeId,
		...(room.mediaNode === undefined ? {} : { mediaNode: room.mediaNode }),
		config: room.config,
		participantSids: participants.map((p) => p._id),
		activeParticipantSids: activeStandard.map((p) => p._id),
		identities: [...new Set(standard.map((p) => p.identity))],
		participants: {
			sessions: standard.length,
			unique: new Set(standard.map((p) => p.identity)).size,
			active: activeStandard.length,
			peakActive,
			peakPublishers,
			aborted: standard.filter((p) => p.status === 'aborted').length,
			byKind
		},
		topology: roomTopology(peakActive, peakPublishers),
		trackSids: tracks.map((t) => t._id),
		tracks: { published: tracks.length, bySource },
		egressIds: roomEgresses.map((e) => e._id),
		egress: {
			total: roomEgresses.length,
			byType,
			active: roomEgresses.filter((e) => isEgressActive(e.status)).length
		},
		ingressSessionIds: roomIngressSessions.map((s) => s._id),
		ingress: {
			sessions: roomIngressSessions.length,
			active: roomIngressSessions.filter((s) => s.endedAt === null).length
		},
		bytes: { up: int64(up), down: int64(down) },
		quality: { scoreSum: round2(scoreSum), scoreCount, minScore, poor, lost },
		features: {
			egress: roomEgresses.length > 0 || byKind.EGRESS > 0,
			ingress: roomIngressSessions.length > 0 || byKind.INGRESS > 0,
			agent: byKind.AGENT > 0,
			sip: byKind.SIP > 0,
			recording: roomEgresses.some(isRecording)
		},
		lastEventAt: new Date(lastEventAt),
		lastStatsAt: lastStatsAt === null ? null : new Date(lastStatsAt),
		reconcilerReason: room.reconcilerReason,
		...(room.mediaStats === false ? { mediaStats: false as const } : {}),
		schemaVersion: room.schemaVersion,
		expiresAt: room.expiresAt
	};
}

/**
 * The spans in which connected STANDARD sessions send media, from their first track published unmuted until they
 * leave: a sender publishes unmuted tracks (`pickSenders()`), any other session only tracks muted from their
 * publication.
 */
function senderSpans(sessions: readonly ParticipantDoc[], tracks: readonly TrackDoc[]): [number, number][] {
	const firstUnmuted = new Map<string, number>();

	for (const t of tracks) {
		// Mute toggles only happen on tracks published unmuted.
		if (t.muteChanges.length > 0 || !t.muted) {
			const at = t.publishedAt.getTime();
			firstUnmuted.set(t.participantSid, Math.min(at, firstUnmuted.get(t.participantSid) ?? at));
		}
	}

	return sessions.flatMap((p): [number, number][] => {
		const from = firstUnmuted.get(p._id);

		return from === undefined ? [] : [[from, p.leftAt?.getTime() ?? Number.MAX_SAFE_INTEGER]];
	});
}

/** Class of a room from its most STANDARD sessions active at once and the most of them sending media at once. */
export function roomTopology(peakActive: number, peakPublishers: number): RoomTopology {
	if (peakActive === 0) {
		return 'empty';
	}

	if (peakActive === 1) {
		return 'single_participant';
	}

	if (peakPublishers === 0) {
		return 'no_publishers';
	}

	if (peakActive === 2) {
		return 'one_to_one';
	}

	return peakPublishers === 1 ? 'one_to_many' : 'many_to_many';
}

/** Size range of a classified room, from its most STANDARD sessions active at once. */
export function roomSizeRange(peakActive: number): string {
	const ranges: readonly (readonly [number, string])[] = [
		[5, '0-5'],
		[10, '6-10'],
		[25, '11-25'],
		[50, '26-50'],
		[100, '51-100']
	];

	return ranges.find(([max]) => peakActive <= max)?.[1] ?? '101+';
}

/** An egress whose request has a file or segments output and that went active, as the writer reads a recording. */
function isRecording(egress: EgressDoc): boolean {
	const kinds = (egress.request.outputs ?? []) as readonly string[];

	return (
		(kinds.includes('file') || kinds.includes('segments')) &&
		egress.statusHistory.some((entry) => entry.status === 'active')
	);
}

/**
 * Picks which STANDARD participants send media, by the shape the room's size allows, as the writer reads them: a
 * sender publishes at least one unmuted track, any other publishes nothing or tracks muted for good, as OpenVidu Meet
 * does with the devices turned off.
 */
function pickSenders(ctx: GeneratorContext, sessions: readonly Session[]): void {
	const { shapeRng } = ctx;
	const standard = sessions.filter((s) => s.doc.kind === 'STANDARD' && !neverActive(s));
	const publishing = [...new Set(standard.filter((s) => s.tracks.length > 0).map((s) => s.doc.identity))];
	const [host, ...others] = publishing;
	const size = peakConcurrency(standard);
	const senders = new Set<string>();
	const shape = shapeRng.next();

	if (host !== undefined && (size <= 1 ? shape < 0.85 : shape >= 0.05)) {
		senders.add(host);

		// 1:1 rooms with two senders, and N:M rooms beside the 1:N ones.
		if (size === 2 || shape >= 0.12) {
			for (const identity of others) {
				if (shapeRng.chance(0.7)) {
					senders.add(identity);
				}
			}
		}
	}

	for (const session of standard) {
		const sends = senders.has(session.doc.identity);

		for (const [index, track] of session.tracks.entries()) {
			track.muted = sends ? index > 0 && track.muted : true;
		}
	}
}

/** Most intervals open at once. */
function peakOf(intervals: readonly [number, number][]): number {
	const edges = intervals.flatMap(([start, end]): [number, number][] => [
		[start, 1],
		[end, -1]
	]);

	edges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
	let current = 0;
	let peak = 0;

	for (const [, delta] of edges) {
		current += delta;
		peak = Math.max(peak, current);
	}

	return peak;
}

export function isEgressActive(status: EgressStatus): boolean {
	return status === 'starting' || status === 'active' || status === 'ending';
}

export function int64(value: number): Long {
	return Long.fromNumber(Math.round(value));
}

/** Bitrate of a track as published (sum of its layers). */
export function trackBitrate(track: TrackDoc): number {
	return track.type === 'AUDIO'
		? AUDIO_BITRATE
		: (track.codecs[0]?.layers.reduce((sum, l) => sum + l.bitrate, 0) ?? 0);
}

/** Bitrate received by a subscription given its negotiated quality. */
export function subscriptionBitrate(
	source: TrackSource,
	maxVideoQuality: SubscriptionDoc['maxVideoQuality'],
	publishBitrate: number
): number {
	if (source === 'MICROPHONE' || source === 'SCREEN_SHARE_AUDIO') {
		return AUDIO_BITRATE;
	}

	switch (maxVideoQuality) {
		case 'HIGH':
			return publishBitrate * 0.7;
		case 'MEDIUM':
			return publishBitrate * 0.2;
		case 'LOW':
			return publishBitrate * 0.07;
		default:
			return 0;
	}
}

interface RoomBase {
	roomSid: string;
	roomName: string;
	nodeId: string;
	mediaNode: string | undefined;
	createdAt: number;
}

function pickEndReason(rng: Rng): string {
	return rng.weighted<string>([
		['IDLE_TIMEOUT', 75],
		['API_DELETE', 20],
		['SERVER_SHUTDOWN', 2],
		['RECONCILED', 3]
	]);
}

function sessionDuration(rng: Rng): number {
	return Math.round(rng.clampedGaussian(20 * MINUTE, 8 * MINUTE, 30_000, 90 * MINUTE));
}

function expiresAt(ctx: GeneratorContext, closedAt: number | null): Date | null {
	return closedAt === null ? null : new Date(closedAt + ctx.retentionEntitiesMs);
}

function tracksExpiresAt(ctx: GeneratorContext, closedAt: number | null): Date | null {
	return closedAt === null ? null : new Date(closedAt + ctx.retentionTracksMs);
}

function standardSession(
	ctx: GeneratorContext,
	base: RoomBase,
	identity: string,
	joinedAt: number,
	length: number,
	forcedReason: string | null,
	slow?: { connectMs: number; aborts: boolean }
): Session {
	const { rng } = ctx;
	const aborted = slow === undefined ? forcedReason === null && rng.chance(0.03) : slow.aborts;
	const session = newSession(
		ctx,
		base,
		'STANDARD',
		identity,
		joinedAt,
		aborted ? (slow?.connectMs ?? rng.int(5_000, 30_000)) : length,
		clientInfo(rng),
		aborted,
		slow?.connectMs
	);

	if (aborted) {
		session.doc.disconnectReason = rng.pick(['JOIN_FAILURE', 'CONNECTION_TIMEOUT']);

		return session;
	}

	session.doc.disconnectReason = forcedReason ?? rng.weighted(LEAVE_REASONS);

	session.tracks = publishTracks(ctx, base, session, ['CAMERA', 'MICROPHONE']);

	return session;
}

/**
 * The attributes of a generated agent, derived from its identity alone so the random sequence and the scenario figures
 * stay unchanged: the transcriber is an OpenVidu agent with a registered name, the recorder one in automatic dispatch
 * (empty name) and the assistant a third-party agent.
 */
function agentAttributes(identity: string): Record<string, string> {
	switch (identity) {
		case 'agent-transcriber':
			return { [AGENT_NAME_ATTRIBUTE]: 'speech-processing', [OPENVIDU_AGENT_ATTRIBUTE]: 'speech-processing' };
		case 'agent-recorder':
			return { [AGENT_NAME_ATTRIBUTE]: '', [OPENVIDU_AGENT_ATTRIBUTE]: 'speech-processing' };
		default:
			return { [AGENT_NAME_ATTRIBUTE]: identity.replace(/^agent-/, '') };
	}
}

function serviceSession(
	ctx: GeneratorContext,
	base: RoomBase,
	kind: ParticipantKind,
	identity: string,
	joinedAt: number,
	length: number,
	publishes: boolean
): Session {
	const client: ClientInfo = {
		sdk: kind === 'AGENT' ? 'PYTHON' : 'GO',
		version: kind === 'AGENT' ? '1.2.0' : '2.4.1',
		os: 'linux',
		osVersion: '6.12'
	};
	const session = newSession(ctx, base, kind, identity, joinedAt, Math.max(5_000, length), client, false);

	if (kind === 'AGENT') {
		session.doc.attributes = agentAttributes(identity);
	}

	session.doc.disconnectReason = 'CLIENT_INITIATED';

	if (publishes) {
		session.tracks = publishTracks(
			ctx,
			base,
			session,
			kind === 'INGRESS' ? ['CAMERA', 'MICROPHONE'] : ['MICROPHONE']
		);
	}

	return session;
}

function newSession(
	ctx: GeneratorContext,
	base: RoomBase,
	kind: ParticipantKind,
	identity: string,
	plannedJoinedAt: number,
	length: number,
	client: ClientInfo,
	aborted: boolean,
	connectMs?: number
): Session {
	const { rng } = ctx;
	// A draw that only keeps the random sequence of the generated rooms.
	rng.int(5_000, 60_000);
	const joinedAt = plannedJoinedAt;
	const connectTimeMs = connectMs ?? Math.round(rng.clampedGaussian(800, 300, 50, 5_000));
	const activeAt = joinedAt + connectTimeMs;
	const leftAt = Math.max(joinedAt + length, activeAt + 1_000);
	const doc: ParticipantDoc = {
		_id: rng.id('PA_'),
		identity,
		identityLower: identity.toLowerCase(),
		name: displayName(kind, identity),
		roomSid: base.roomSid,
		roomName: base.roomName,
		kind,
		status: aborted ? 'aborted' : 'left',
		joinedAt: new Date(joinedAt),
		activeAt: aborted ? null : new Date(activeAt),
		leftAt: new Date(leftAt),
		durationMs: leftAt - joinedAt,
		disconnectReason: null,
		closedBy: 'event',
		connectTimeMs: aborted ? null : connectTimeMs,
		connectionType: aborted ? null : rng.weighted(CONNECTION_TYPES),
		nodeId: base.nodeId,
		...(base.mediaNode === undefined ? {} : { mediaNode: base.mediaNode }),
		resumes: aborted ? 0 : rng.poisson(0.2),
		client,
		permission: {
			canPublish: kind !== 'EGRESS',
			canSubscribe: kind !== 'INGRESS',
			canPublishData: true,
			hidden: kind === 'EGRESS'
		},
		isPublisher: false,
		trackSids: [],
		tracks: { published: 0, bySource: {}, subscribed: 0, subscribeFailures: 0 },
		bytes: { up: int64(0), down: int64(0) },
		quality: { scoreSum: 0, scoreCount: 0, minScore: null, poor: 0, lost: 0, lastScore: null, lastScoreAt: null },
		lastEventAt: new Date(leftAt),
		lastStatsAt: null,
		resumedAt: [],
		schemaVersion: SCHEMA_VERSION,
		expiresAt: expiresAt(ctx, leftAt)
	};

	return {
		doc,
		activeAt,
		leftAt,
		tracks: [],
		upBytes: 0,
		downBytes: 0,
		meanScore: rng.clampedGaussian(4.2, 0.35, 1, 4.5)
	};
}

function clientInfo(rng: Rng): ClientInfo {
	const sdk = rng.weighted(SDKS);

	if (sdk === 'JS') {
		const mobile = rng.chance(0.2);
		const [os, osVersion] = mobile
			? rng.pick([
					['android', '15'],
					['ios', '18.6']
				] as const)
			: rng.weighted(DESKTOP_OS);
		const [browser, browserVersion] = rng.weighted(BROWSERS);

		return {
			sdk,
			version: '2.15.7',
			os,
			osVersion,
			browser,
			browserVersion,
			...(mobile ? { deviceModel: rng.pick(['Pixel 9', 'iPhone16,2', 'SM-S938B']) } : {}),
			network: rng.pick(['wifi', 'wifi', 'ethernet', 'cellular'])
		};
	}

	const [os, osVersion] =
		sdk === 'SWIFT'
			? ['ios', '18.6']
			: sdk === 'ANDROID'
				? ['android', '15']
				: rng.pick([
						['ios', '18.6'],
						['android', '15']
					]);

	return {
		sdk,
		version: '2.9.0',
		os,
		osVersion,
		deviceModel: os === 'ios' ? 'iPhone16,2' : 'SM-S938B',
		network: rng.pick(['wifi', 'cellular'])
	};
}

function publishTracks(
	ctx: GeneratorContext,
	base: RoomBase,
	session: Session,
	sources: readonly TrackSource[]
): TrackDoc[] {
	const { rng } = ctx;
	const tracks: TrackDoc[] = [];

	for (const source of sources) {
		const publishedAt = session.activeAt + rng.int(300, 1_500);

		if (publishedAt >= session.leftAt) {
			continue;
		}

		const video = source === 'CAMERA' || source === 'SCREEN_SHARE';
		const preset = video ? rng.weighted(VIDEO_PRESETS) : { width: 0, height: 0, bitrate: AUDIO_BITRATE };
		const mimeType = video ? rng.weighted(VIDEO_CODECS) : 'audio/opus';
		const layers: TrackLayer[] = video
			? [
					{ quality: 'LOW', width: preset.width / 4, height: preset.height / 4, bitrate: preset.bitrate / 9 },
					{
						quality: 'MEDIUM',
						width: preset.width / 2,
						height: preset.height / 2,
						bitrate: preset.bitrate / 3
					},
					{ quality: 'HIGH', width: preset.width, height: preset.height, bitrate: preset.bitrate }
				]
			: [];
		const unpublishedAt = session.leftAt;
		const durationMs = unpublishedAt - publishedAt;
		const bitrate = video ? layers.reduce((sum, l) => sum + l.bitrate, 0) : AUDIO_BITRATE;
		const track: TrackDoc = {
			_id: rng.id('TR_'),
			roomSid: base.roomSid,
			participantSid: session.doc._id,
			identity: session.doc.identity,
			type: video ? 'VIDEO' : 'AUDIO',
			source,
			name: video ? 'camera' : 'microphone',
			mimeType,
			status: 'unpublished',
			publishedAt: new Date(publishedAt),
			unpublishedAt: new Date(unpublishedAt),
			durationMs,
			closedBy: null,
			muted: rng.chance(0.1),
			muteChanges: [],
			width: preset.width,
			height: preset.height,
			simulcast: video,
			codecs: [{ mimeType, layers }],
			encryption: 'NONE',
			subscribers: { current: 0, total: 0, failed: 0 },
			publishStats: ctx.withoutMediaStats.has(session.doc.nodeId)
				? null
				: rtpStats(rng, bitrate, durationMs, layers.length),
			schemaVersion: SCHEMA_VERSION,
			expiresAt: tracksExpiresAt(ctx, unpublishedAt)
		};
		tracks.push(track);
		session.upBytes += (bitrate / 8) * (durationMs / 1000);
	}

	session.doc.trackSids = tracks.map((t) => t._id);
	session.doc.tracks.published = tracks.length;
	session.doc.isPublisher = tracks.length > 0;

	for (const t of tracks) {
		session.doc.tracks.bySource[t.source] = (session.doc.tracks.bySource[t.source] ?? 0) + 1;
	}

	return tracks;
}

function rtpStats(rng: Rng, bitrate: number, durationMs: number, layerCount: number): RtpStats {
	const bytes = (bitrate / 8) * (durationMs / 1000);
	const packets = Math.round(bytes / 1_100);
	const lossPct = rng.clampedGaussian(0.5, 0.6, 0, 8);
	const layers = [];

	for (let i = 0; i < layerCount; i += 1) {
		layers.push({
			layer: i,
			bytes: int64(bytes / layerCount),
			packets: Math.round(packets / layerCount)
		});
	}

	return {
		bytes: int64(bytes),
		packets,
		packetsLost: Math.round((packets * lossPct) / 100),
		packetLossPct: round2(lossPct),
		nacks: rng.int(0, Math.max(0, Math.round(packets / 500))),
		plis: rng.int(0, Math.max(0, Math.round(durationMs / 60_000))),
		firs: rng.int(0, 2),
		jitterMaxMs: Math.round(rng.clampedGaussian(12, 8, 1, 120)),
		rttMaxMs: Math.round(rng.clampedGaussian(90, 50, 5, 800)),
		durationMs,
		layers
	};
}

function closeSessions(
	ctx: GeneratorContext,
	sessions: Session[],
	endedAt: number,
	reason: string,
	closedBy: 'event' | 'reconciler'
): void {
	for (const s of sessions) {
		if (s.leftAt <= endedAt) {
			continue;
		}

		// A session still connecting when the room ends aborts; nothing leaves after the room's end.
		const connected = s.doc.status !== 'aborted' && s.activeAt < endedAt;
		s.leftAt = endedAt;
		s.doc.leftAt = new Date(endedAt);
		s.doc.lastEventAt = s.doc.leftAt;
		s.doc.durationMs = endedAt - s.doc.joinedAt.getTime();
		s.doc.status = connected ? 'left' : 'aborted';
		s.doc.disconnectReason = closedBy === 'reconciler' ? RECONCILED : reason;
		s.doc.closedBy = closedBy;
		s.doc.expiresAt = expiresAt(ctx, endedAt);

		if (!connected) {
			s.doc.activeAt = null;
			s.doc.connectTimeMs = null;
			s.doc.connectionType = null;
			s.doc.resumes = 0;
		}

		// A track published at or after the end never was.
		s.tracks = s.tracks.filter((t) => t.publishedAt.getTime() < endedAt);
		s.doc.trackSids = s.tracks.map((t) => t._id);
		s.doc.tracks.published = s.tracks.length;
		s.doc.tracks.bySource = {};
		s.doc.isPublisher = s.tracks.length > 0;

		for (const t of s.tracks) {
			s.doc.tracks.bySource[t.source] = (s.doc.tracks.bySource[t.source] ?? 0) + 1;

			if (t.unpublishedAt === null || t.unpublishedAt.getTime() > endedAt) {
				t.unpublishedAt = new Date(endedAt);
				t.durationMs = endedAt - t.publishedAt.getTime();
				t.status = 'unpublished';
				t.expiresAt = tracksExpiresAt(ctx, endedAt);
			}
		}
	}
}

function buildSubscriptions(
	ctx: GeneratorContext,
	roomSid: string,
	sessions: Session[],
	closers: ReadonlyMap<string, number>
): SubscriptionDoc[] {
	const { rng } = ctx;
	const subscriptions: SubscriptionDoc[] = [];

	for (const subscriber of sessions) {
		if (neverActive(subscriber) || subscriber.doc.kind === 'INGRESS') {
			continue;
		}

		const subStart = subscriber.activeAt;
		const subEnd = subscriber.leftAt;

		for (const publisher of sessions) {
			if (publisher === subscriber || publisher.doc.identity === subscriber.doc.identity) {
				continue;
			}

			for (const track of publisher.tracks) {
				const pubStart = track.publishedAt.getTime();
				// Every track of a life ends, at the latest as its publisher leaves.
				const pubEnd = track.unpublishedAt?.getTime() ?? publisher.leftAt;
				const subscribedAt = Math.max(pubStart, subStart) + rng.int(200, 800);
				const unsubscribedAt = Math.min(pubEnd, subEnd);

				if (subscribedAt >= unsubscribedAt) {
					continue;
				}

				const failed = rng.chance(0.01);
				const video = track.type === 'VIDEO';
				const maxVideoQuality = video
					? rng.weighted<SubscriptionDoc['maxVideoQuality']>([
							['HIGH', 50],
							['MEDIUM', 35],
							['LOW', 12],
							['OFF', 3]
						])
					: null;
				const durationMs = unsubscribedAt - subscribedAt;
				const bitrate = subscriptionBitrate(track.source, maxVideoQuality, trackBitrate(track));
				const doc: SubscriptionDoc = {
					_id: `${track._id}:${subscriber.doc._id}`,
					trackSid: track._id,
					roomSid,
					subscriberSid: subscriber.doc._id,
					subscriberIdentity: subscriber.doc.identity,
					publisherSid: publisher.doc._id,
					publisherIdentity: publisher.doc.identity,
					source: track.source,
					status: failed ? 'failed' : 'unsubscribed',
					error: failed ? 'subscription failed: track not found' : null,
					subscribedAt: new Date(subscribedAt),
					unsubscribedAt: failed ? null : new Date(unsubscribedAt),
					durationMs: failed ? null : durationMs,
					closedBy: failed
						? null
						: closedByOf(
								new Date(unsubscribedAt),
								closers.get(publisher.doc._id),
								closers.get(subscriber.doc._id)
							),
					maxVideoQuality,
					subscribeStats:
						failed || ctx.withoutMediaStats.has(publisher.doc.nodeId)
							? null
							: withoutLayers(rtpStats(rng, bitrate, durationMs, video ? 1 : 0)),
					schemaVersion: SCHEMA_VERSION,
					expiresAt: tracksExpiresAt(ctx, failed ? subscribedAt : unsubscribedAt)
				};
				subscriptions.push(doc);
				track.subscribers.total += 1;
				track.subscribers.failed += failed ? 1 : 0;
				subscriber.doc.tracks.subscribed += failed ? 0 : 1;
				subscriber.doc.tracks.subscribeFailures += failed ? 1 : 0;

				if (!failed) {
					subscriber.downBytes += (bitrate / 8) * (durationMs / 1000);
				}
			}
		}
	}

	return subscriptions;
}

function finalizeSessions(ctx: GeneratorContext, sessions: Session[]): void {
	const { rng } = ctx;

	for (const s of sessions) {
		const flushes = neverActive(s) ? 0 : Math.max(0, Math.floor((s.leftAt - s.activeAt) / FLUSH_MS));

		if (ctx.withoutMediaStats.has(s.doc.nodeId)) {
			// Signal statistics keep flowing, without bytes or quality.
			s.doc.lastStatsAt = flushes > 0 ? new Date(s.activeAt + flushes * FLUSH_MS) : null;
			s.upBytes = 0;
			s.downBytes = 0;
			s.doc.mediaStats = false;
			s.doc.bytes = { up: int64(0), down: int64(0) };
			s.doc.quality = {
				scoreSum: 0,
				scoreCount: 0,
				minScore: null,
				poor: 0,
				lost: 0,
				lastScore: null,
				lastScoreAt: null
			};
			continue;
		}

		if (neverActive(s)) {
			continue;
		}

		const directions = (s.tracks.length > 0 ? 1 : 0) + (s.doc.tracks.subscribed > 0 ? 1 : 0);
		const scoreCount = flushes * directions;
		const minScore = scoreCount === 0 ? null : round2(Math.max(1, s.meanScore - rng.float(0.2, 1.2)));
		const lastScoreAt = scoreCount === 0 ? null : s.activeAt + flushes * FLUSH_MS;
		s.doc.bytes = { up: int64(s.upBytes), down: int64(s.downBytes) };
		s.doc.quality = {
			scoreSum: round2(s.meanScore * scoreCount),
			scoreCount,
			minScore,
			poor: Math.round(scoreCount * (s.meanScore < POOR_SCORE ? 0.6 : 0.02)),
			lost: Math.round(scoreCount * (s.meanScore < LOST_SCORE ? 0.5 : 0.004)),
			lastScore: scoreCount === 0 ? null : round2(s.meanScore),
			lastScoreAt: lastScoreAt === null ? null : new Date(lastScoreAt)
		};
		s.doc.lastStatsAt = lastScoreAt === null ? null : new Date(lastScoreAt);
	}
}

function peakConcurrency(sessions: Session[]): number {
	const edges: [number, number][] = [];

	for (const s of sessions) {
		if (neverActive(s)) {
			continue;
		}

		edges.push([s.activeAt, 1], [s.leftAt, -1]);
	}

	edges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
	let current = 0;
	let peak = 0;

	for (const [, delta] of edges) {
		current += delta;
		peak = Math.max(peak, current);
	}

	return peak;
}

/**
 * What the request of a participant or track egress names: a STANDARD participant identity or its tracks, taken from
 * a session that published before the egress started.
 */
function egressSource(
	type: EgressType,
	sessions: readonly Session[],
	startedAt: number,
	passthrough: boolean
): Record<string, unknown> {
	const publisher = sessions.find(
		(s) => s.doc.kind === 'STANDARD' && s.tracks.some((t) => t.publishedAt.getTime() <= startedAt)
	);

	if (publisher === undefined) {
		return {};
	}

	const video = publisher.tracks.find((t) => t.type === 'VIDEO');
	const audio = publisher.tracks.find((t) => t.type === 'AUDIO');

	const track = video ?? audio;

	switch (type) {
		case 'participant':
			return { participantIdentity: publisher.doc.identity, ...(passthrough ? { preset: 'PASSTHROUGH' } : {}) };
		case 'track':
			return track === undefined ? {} : { trackId: track._id };
		case 'track_composite':
			return {
				...(video === undefined ? {} : { videoTrackId: video._id }),
				...(audio === undefined ? {} : { audioTrackId: audio._id })
			};
		default:
			return {};
	}
}

/** Error the reconciler gives an egress lost with its node. */
const LOST_EGRESS_ERROR = 'egress lost (reconciled)';
/** Error the reconciler gives an ingress session lost with its node. */
const LOST_INGRESS_ERROR = 'ingress lost (reconciled)';

const EGRESS_START_METHODS: Record<EgressType, string> = {
	room_composite: 'EgressService_StartRoomCompositeEgress',
	web: 'EgressService_StartWebEgress',
	participant: 'EgressService_StartParticipantEgress',
	track_composite: 'EgressService_StartTrackCompositeEgress',
	track: 'EgressService_StartTrackEgress'
};

function buildEgress(
	ctx: GeneratorContext,
	base: RoomBase,
	roomActive: boolean,
	roomEndedAt: number,
	roomClosedBy: 'event' | 'reconciler',
	sessions: readonly Session[],
	live = false
): EgressDoc {
	const { rng, now } = ctx;
	const variety = ctx.egressRng;
	const type = rng.weighted<EgressType>([
		['room_composite', 80],
		['participant', 8],
		['track_composite', 6],
		['web', 4],
		['track', 2]
	]);
	let startedAt = base.createdAt + rng.int(30_000, 120_000);
	const outputKind = rng.weighted<'file' | 'stream' | 'segments'>([
		['file', 70],
		['stream', 20],
		['segments', 10]
	]);
	// Unless it is stopped or fails, it records until its room ends.
	let status: EgressStatus = 'complete';
	let endedAt = roomEndedAt;
	let error: string | null = null;
	let closedBy: 'event' | 'reconciler' = 'event';

	if (!roomActive) {
		status = rng.weighted<EgressStatus>([
			['complete', 90],
			['failed', 7],
			['aborted', 3]
		]);
		endedAt =
			status === 'complete'
				? roomEndedAt
				: Math.round(startedAt + (roomEndedAt - startedAt) * rng.float(0.05, 0.9));
		endedAt = Math.max(startedAt + 1_000, Math.min(endedAt, now - MINUTE));
		// It never outlives its room.
		endedAt = Math.min(endedAt, roomEndedAt);
		error =
			status === 'failed'
				? rng.pick([
						'ffmpeg exited with status 1',
						'upload failed: context deadline exceeded',
						'stream connection reset'
					])
				: null;
	}

	// A live egress takes 20 to 60 s to start recording, and as long to finish once stopped.
	let activeAt = startedAt + (live ? rng.int(20_000, 60_000) : rng.int(2_000, 6_000));
	const endingMs = live ? rng.int(20_000, 60_000) : 1_000;

	if (live && (status === 'failed' || status === 'aborted')) {
		// It fails or is aborted once it records.
		endedAt = Math.min(roomEndedAt, Math.max(endedAt, activeAt + 5_000));
	}

	const id = rng.id('EG_');
	const source = egressSource(type, sessions, startedAt, rng.chance(0.3));
	let endingAt: number | null;

	if (!roomActive) {
		if (status === 'complete' && roomClosedBy === 'reconciler') {
			// Still recording when its node died: the reconciler fails it at the room's end.
			status = 'failed';
			error = LOST_EGRESS_ERROR;
			closedBy = 'reconciler';
		} else if (status === 'complete' && variety.chance(0.05)) {
			status = 'limit_reached';
			endedAt = Math.max(
				activeAt + endingMs,
				Math.round(startedAt + (endedAt - startedAt) * variety.float(0.5, 0.9))
			);
		}

		endingAt = status === 'complete' || status === 'limit_reached' ? endedAt - endingMs : null;
	} else {
		const draw = variety.next();
		const stopAt = Math.round(activeAt + (now - MINUTE - activeAt) * variety.float(0.2, 0.9));
		const endingFrom = now - variety.int(5_000, 30_000);
		endingAt = endedAt - 1_000;

		if (draw < 0.05) {
			// Requested seconds before the generation instant: it records 20 to 60 s after the request.
			startedAt = Math.max(base.createdAt + 1_000, now - variety.int(2_000, 8_000));
			activeAt = startedAt + variety.int(20_000, 60_000);
		} else if (draw < 0.09 && endingFrom > activeAt + MINUTE) {
			// Stopped seconds before the generation instant, it finishes its upload seconds after it.
			endingAt = endingFrom;
			endedAt = now + variety.int(5_000, 30_000);
		} else if (draw < 0.31 && stopAt > activeAt + MINUTE) {
			// Stopped by the application while the room goes on.
			endedAt = stopAt;
			endingAt = stopAt - 1_000;
		}

		if (endedAt === roomEndedAt && roomClosedBy === 'reconciler') {
			status = 'failed';
			error = LOST_EGRESS_ERROR;
			closedBy = 'reconciler';
			endingAt = null;
		}
	}

	const kinds: EgressOutput['kind'][] = [outputKind];

	if ((type === 'room_composite' || type === 'web') && outputKind === 'file' && variety.chance(0.1)) {
		kinds.push('stream');
	}

	if ((type === 'room_composite' || type === 'web') && variety.chance(0.03)) {
		kinds.push('images');
	}

	const retryCount = status === 'failed' && variety.chance(0.3) ? 1 : 0;
	const backupStorageUsed = kinds.includes('file') && status === 'complete' && variety.chance(0.02);
	const history: { status: EgressStatus; at: Date }[] = [
		{ status: 'starting', at: new Date(startedAt) },
		{ status: 'active', at: new Date(activeAt) }
	];

	if (endingAt !== null) {
		history.push({ status: 'ending', at: new Date(endingAt) });
	}

	history.push({ status, at: new Date(endedAt) });

	const durationMs = endedAt - startedAt;
	const web = type === 'web';
	const roomName = web ? null : base.roomName;
	const folder = roomName ?? 'web';
	const size = (2_000_000 / 8) * (durationMs / 1000);
	const recorded = status !== 'failed';
	const times: Pick<EgressOutput, 'startedAt' | 'endedAt' | 'durationMs'> = {
		startedAt: new Date(activeAt),
		endedAt: new Date(endedAt),
		durationMs: endedAt - activeAt
	};
	const outputs = kinds.map((kind): EgressOutput => {
		switch (kind) {
			case 'file':
				return {
					kind,
					filename: `${folder}-${id}.mp4`,
					location: `s3://recordings/${folder}/${folder}-${id}.mp4`,
					...(recorded ? { size: int64(size) } : {}),
					...times
				};
			case 'stream':
				return {
					kind,
					url: 'rtmps://stream.example.com/live/***',
					status: status === 'failed' ? 'FAILED' : 'FINISHED',
					...(status === 'failed' && error !== null ? { error } : {}),
					...times
				};
			case 'segments':
				return {
					kind,
					playlistName: `${id}.m3u8`,
					location: `s3://recordings/${folder}/${id}.m3u8`,
					...(recorded ? { size: int64(size) } : {}),
					...times
				};
			case 'images':
				return {
					kind,
					filenamePrefix: `${folder}/${id}/thumbnail`,
					startedAt: new Date(activeAt),
					endedAt: new Date(endedAt)
				};
		}
	});

	return {
		_id: id,
		roomSid: web ? null : base.roomSid,
		roomName,
		roomNameLower: roomName === null ? null : roomName.toLowerCase(),
		type,
		sourceType: web ? 'web' : 'sdk',
		status,
		closedBy,
		startedAt: new Date(startedAt),
		updatedAt: new Date(endedAt),
		endedAt: new Date(endedAt),
		durationMs,
		error,
		errorCode: status === 'failed' && closedBy === 'event' ? 1 : null,
		request: egressRequest(type, source, kinds),
		outputs,
		statusHistory: history,
		retryCount,
		backupStorageUsed,
		schemaVersion: SCHEMA_VERSION,
		expiresAt: expiresAt(ctx, endedAt)
	};
}

/** The sanitized request summary the writer keeps: the fields of the request type that are set, and the outputs. */
function egressRequest(
	type: EgressType,
	source: Record<string, unknown>,
	kinds: readonly EgressOutput['kind'][]
): Record<string, unknown> {
	const preset = typeof source.preset === 'string' ? source.preset : 'H264_720P_30';

	switch (type) {
		case 'room_composite':
			return { layout: 'grid', preset, outputs: kinds };
		case 'web':
			return { url: 'https://app.example.com/***', preset, outputs: kinds };
		case 'participant':
			return { ...pick(source, 'participantIdentity'), preset, outputs: kinds };
		case 'track_composite':
			return { ...pick(source, 'audioTrackId'), ...pick(source, 'videoTrackId'), preset, outputs: kinds };
		case 'track':
			return { ...pick(source, 'trackId'), outputs: kinds };
	}
}

function pick(source: Record<string, unknown>, key: string): Record<string, unknown> {
	return source[key] === undefined ? {} : { [key]: source[key] };
}

/** The EGRESS participant of an egress with a room, joined once it records and gone once it stops. */
function egressParticipant(ctx: GeneratorContext, base: RoomBase, egress: EgressDoc): Session | undefined {
	const activeAt = egress.statusHistory.find((h) => h.status === 'active')?.at.getTime();

	if (egress.roomSid === null || activeAt === undefined) {
		return undefined;
	}

	const endingAt = egress.statusHistory.find((h) => h.status === 'ending')?.at.getTime();
	const endedAt = (egress.endedAt ?? egress.updatedAt).getTime();
	// It leaves as the egress stops recording: at its end, or as it starts ending when its upload outlasts a second.
	const leftAt = endingAt !== undefined && endedAt - endingAt > 1_000 ? endingAt : endedAt;
	// It joins a second after the request, or in the 5 s before it records when it takes longer to start.
	const joinedAt = Math.max(egress.startedAt.getTime() + 1_000, activeAt - 5_000);
	const session = serviceSession(ctx, base, 'EGRESS', egress._id, joinedAt, leftAt - joinedAt, false);

	if (egress.closedBy === 'reconciler') {
		session.doc.closedBy = 'reconciler';
		session.doc.disconnectReason = RECONCILED;
	}

	return session;
}

/**
 * Prefix of the `resource_id` of an ingress session: the server's `RT_` for RTMP and `UR_` for URL inputs; no WHIP
 * session was observed, so WHIP keeps a prefix of its own.
 */
const INGRESS_SESSION_PREFIXES: Record<IngressDoc['inputType'], string> = { rtmp: 'RT_', whip: 'IR_', url: 'UR_' };

interface IngressPlan {
	id: string;
	firstSessionId: string;
	inputType: IngressDoc['inputType'];
	createdAt: number;
	identity: string;
	name: string;
	roomName: string;
	sessions: { startedAt: number; endedAt: number | null; failed: boolean; bufferMs: number }[];
}

/**
 * The ingress of a room and the sessions it publishes: one, or for a reusable ingress up to three in a row, as a
 * publisher that stops and starts again does. The first session takes the room's draws.
 */
function planIngress(ctx: GeneratorContext, base: RoomBase, roomActive: boolean, live: boolean): IngressPlan {
	const { rng, now } = ctx;
	const more = ctx.ingressRng;
	const id = rng.id('IN_');
	const inputType = rng.weighted<IngressDoc['inputType']>([
		['rtmp', 60],
		['whip', 30],
		['url', 10]
	]);
	const ahead = rng.int(60_000, 600_000);
	// A live room's application creates the ingress with the room, so that nothing of it is dated before the room.
	const createdAt = live ? base.createdAt : base.createdAt - ahead;
	const startedAt = base.createdAt + rng.int(5_000, 60_000);
	const failed = !roomActive && rng.chance(0.05);
	let endedAt = roomActive ? null : Math.min(now - MINUTE, startedAt + sessionDuration(rng));
	const identity = `ingress-${String(rng.int(1, 9_999)).padStart(4, '0')}`;
	const firstSessionId = rng.id(INGRESS_SESSION_PREFIXES[inputType]);
	const extra = inputType !== 'url' && more.chance(0.35) ? (more.chance(0.3) ? 2 : 1) : 0;
	const firstLength = sessionDuration(more);

	if (roomActive && extra > 0 && startedAt + firstLength < now - 2 * MINUTE) {
		endedAt = startedAt + firstLength;
	}

	// A live ingress session buffers 1 to 2 minutes before it publishes, any other for half a second.
	const bufferMs = () => (live ? more.int(MINUTE, 2 * MINUTE) : 500);
	const sessions: IngressPlan['sessions'] = [{ startedAt, endedAt, failed, bufferMs: bufferMs() }];

	for (let i = 0; i < extra; i += 1) {
		const previous = sessions[sessions.length - 1];
		const gap = more.int(MINUTE, 15 * MINUTE);
		const length = sessionDuration(more);
		const sessionFailed = more.chance(0.05);

		if (previous === undefined || previous.endedAt === null || previous.endedAt + gap >= now - 2 * MINUTE) {
			break;
		}

		const start = previous.endedAt + gap;
		const end = start + length >= now - MINUTE ? (roomActive ? null : now - MINUTE) : start + length;
		sessions.push({ startedAt: start, endedAt: end, failed: end !== null && sessionFailed, bufferMs: bufferMs() });
	}

	return {
		id,
		firstSessionId,
		inputType,
		createdAt,
		identity,
		name: `ingress-${base.roomName}`,
		roomName: base.roomName,
		sessions
	};
}

/** The ingress and its sessions as the room ended them: each session lasts what its INGRESS participant did. */
function finishIngress(
	ctx: GeneratorContext,
	base: RoomBase,
	plan: IngressPlan,
	participants: readonly (Session | undefined)[]
): { ingress: IngressDoc; sessions: IngressSessionDoc[] } {
	const sessions: IngressSessionDoc[] = [];

	for (const [index, planned] of plan.sessions.entries()) {
		const participant = participants[index];

		if (participant === undefined) {
			continue;
		}

		const startedAt = Math.min(planned.startedAt, participant.doc.joinedAt.getTime() - 1_000);
		sessions.push(
			ingressSession(
				ctx,
				base,
				plan,
				index === 0 ? plan.firstSessionId : ctx.ingressRng.id(INGRESS_SESSION_PREFIXES[plan.inputType]),
				{ startedAt, publishedAt: startedAt + planned.bufferMs, participant },
				planned.failed
			)
		);
	}

	const last = sessions.at(-1);
	const deletedAt = ingressDeletion(ctx, last === undefined ? null : (last.endedAt?.getTime() ?? null));

	return {
		ingress: ingressDefinition(ctx, plan, sessions, deletedAt, true),
		sessions
	};
}

/**
 * An ingress session from the start of its buffering to its end, which publishes from `publishedAt` through its INGRESS
 * participant until it leaves. It ends as the room ends it, `inactive` when an RTMP or WHIP publisher stops,
 * `complete` when a URL input ends, `error` when it fails or the reconciler closes it.
 */
function ingressSession(
	ctx: GeneratorContext,
	base: RoomBase,
	plan: IngressPlan,
	id: string,
	life: { startedAt: number; publishedAt: number; participant: Session },
	failed: boolean
): IngressSessionDoc {
	const { startedAt, publishedAt, participant } = life;
	const endedAt = participant.leftAt;
	const reconciled = participant.doc.closedBy === 'reconciler';
	const status: IngressSessionDoc['status'] =
		reconciled || failed ? 'error' : plan.inputType === 'url' ? 'complete' : 'inactive';

	return {
		_id: id,
		ingressId: plan.id,
		ingressName: plan.name,
		inputType: plan.inputType,
		roomSid: base.roomSid,
		roomName: base.roomName,
		participantIdentity: plan.identity,
		status,
		error: reconciled ? LOST_INGRESS_ERROR : status === 'error' ? 'input disconnected' : null,
		closedBy: reconciled ? 'reconciler' : 'event',
		startedAt: new Date(startedAt),
		publishedAt: new Date(publishedAt),
		endedAt: new Date(endedAt),
		durationMs: endedAt - startedAt,
		video: { mimeType: 'video/H264', averageBitrate: 2_500_000, width: 1280, height: 720, framerate: 30 },
		audio: { mimeType: 'audio/opus', averageBitrate: 128_000, channels: 2, sampleRate: 48_000 },
		schemaVersion: SCHEMA_VERSION,
		expiresAt: expiresAt(ctx, endedAt)
	};
}

/** An ingress document as the writer derives it from its sessions, its last state and its deletion. */
function ingressDefinition(
	ctx: GeneratorContext,
	plan: IngressPlan,
	sessions: readonly IngressSessionDoc[],
	deletedAt: number | null,
	enabled: boolean
): IngressDoc {
	const last = sessions.at(-1);
	const lastError = sessions.reduce<string | null>((error, s) => s.error ?? error, null);

	return {
		_id: plan.id,
		name: plan.name,
		nameLower: plan.name.toLowerCase(),
		inputType: plan.inputType,
		url:
			plan.inputType === 'rtmp'
				? 'rtmps://ingress.example.com/x'
				: plan.inputType === 'whip'
					? 'https://ingress.example.com/w'
					: 'https://media.example.com/source.mp4',
		roomName: plan.roomName,
		participantIdentity: plan.identity,
		participantName: displayName('INGRESS', plan.identity),
		reusable: plan.inputType !== 'url',
		enabled,
		enableTranscoding: plan.inputType !== 'whip',
		createdAt: new Date(plan.createdAt),
		deletedAt: deletedAt === null ? null : new Date(deletedAt),
		status: deletedAt !== null ? 'deleted' : (last?.status ?? 'inactive'),
		lastError,
		sessions: sessions.length,
		totalDurationMs: sessions.reduce((sum, s) => sum + (s.durationMs ?? 0), 0),
		lastSessionAt: last?.startedAt ?? null,
		schemaVersion: SCHEMA_VERSION,
		// An ingress definition expires only once deleted, whatever its sessions.
		expiresAt: expiresAt(ctx, deletedAt)
	};
}

/**
 * Ingresses created for the room that never published into it: one left unused, enabled or not and sometimes
 * deleted, and, in a room in progress, one whose session buffers from seconds before the generation instant until a
 * minute or two later, then publishes until the room ends.
 */
function extraIngresses(
	ctx: GeneratorContext,
	base: RoomBase,
	roomActive: boolean,
	roomEnd: number,
	closeReason: string,
	closedBy: 'event' | 'reconciler',
	live: boolean
): { ingresses: IngressDoc[]; sessions: IngressSessionDoc[]; participants: Session[] } {
	const { now } = ctx;
	const rng = ctx.ingressRng;
	const unused = rng.chance(0.004);
	const buffering = roomActive && rng.chance(0.03);
	const ingresses: IngressDoc[] = [];
	const sessions: IngressSessionDoc[] = [];
	const participants: Session[] = [];

	if (unused) {
		const ahead = rng.int(10 * MINUTE, 3 * 24 * 60 * MINUTE);
		// Created with the room in a live room, so that nothing of it is dated before the room.
		const createdAt = live ? base.createdAt : Math.max(ctx.windowStart, base.createdAt - ahead);
		const plan: IngressPlan = {
			id: rng.id('IN_'),
			firstSessionId: '',
			inputType: rng.weighted<IngressDoc['inputType']>([
				['rtmp', 60],
				['whip', 40]
			]),
			createdAt,
			identity: `ingress-${String(rng.int(1, 9_999)).padStart(4, '0')}`,
			name: `ingress-${base.roomName}-standby`,
			roomName: base.roomName,
			sessions: []
		};
		const enabled = rng.chance(0.7);
		const deleteAt = createdAt + rng.int(10 * MINUTE, 2 * 24 * 60 * MINUTE);
		const deletedAt = rng.chance(0.25) && deleteAt < now - MINUTE ? deleteAt : null;
		ingresses.push(ingressDefinition(ctx, plan, [], deletedAt, enabled));
	}

	if (buffering) {
		const plan: IngressPlan = {
			id: rng.id('IN_'),
			firstSessionId: rng.id(INGRESS_SESSION_PREFIXES.rtmp),
			inputType: 'rtmp',
			createdAt: base.createdAt - rng.int(MINUTE, 10 * MINUTE),
			identity: `ingress-${String(rng.int(1, 9_999)).padStart(4, '0')}`,
			name: `ingress-${base.roomName}-backup`,
			roomName: base.roomName,
			sessions: []
		};
		const startedAt = Math.max(base.createdAt + 1_000, now - rng.int(10_000, 40_000));
		const publishedAt = startedAt + rng.int(MINUTE, 2 * MINUTE);
		const participant = serviceSession(
			{ ...ctx, rng },
			base,
			'INGRESS',
			plan.identity,
			publishedAt + 500,
			roomEnd - publishedAt,
			true
		);
		closeSessions(ctx, [participant], roomEnd, closeReason, closedBy);
		participants.push(participant);
		const session = ingressSession(
			ctx,
			base,
			plan,
			plan.firstSessionId,
			{ startedAt, publishedAt, participant },
			false
		);
		sessions.push(session);
		ingresses.push(ingressDefinition(ctx, plan, [session], null, true));
	}

	return { ingresses, sessions, participants };
}

/**
 * Deletion instant of an ingress whose session ended, or null while it still exists: one in ten is deleted, most
 * within half an hour of their session and the rest up to three days later, never after the end of the data.
 */
function ingressDeletion(ctx: GeneratorContext, sessionEndedAt: number | null): number | null {
	const { ingressRng: rng, now } = ctx;
	const deleted = rng.chance(0.1);
	const delay = rng.chance(0.6) ? rng.int(MINUTE, 30 * MINUTE) : rng.int(60 * MINUTE, 3 * 24 * 60 * MINUTE);

	if (!deleted || sessionEndedAt === null || sessionEndedAt + delay >= now - MINUTE) {
		return null;
	}

	return sessionEndedAt + delay;
}

/**
 * A STANDARD participant of a room in progress who started connecting less than a minute before the generation
 * instant, over a slow connection: 60 to 180 s after joining it becomes active, or one time in three aborts.
 */
function slowJoiner(ctx: GeneratorContext, base: RoomBase): { session: Session; length: number } {
	const { rng, now } = ctx;
	const identity = `${rng.pick(FIRST_NAMES)}-${String(rng.int(1, 99_999)).padStart(5, '0')}`;
	const joinedAt = now - rng.int(5_000, 59_000);
	const connectMs = rng.int(60_000, 179_000);
	const aborts = rng.chance(1 / 3);
	const length = connectMs + sessionDuration(rng);

	return { session: standardSession(ctx, base, identity, joinedAt, length, null, { connectMs, aborts }), length };
}

/** Never active: aborted before connecting, or still connecting. */
function neverActive(session: Session): boolean {
	return session.doc.status === 'aborted' || session.doc.status === 'joining';
}

/** Some media senders share their screen for a while, a few with its audio. */
function addScreenShares(ctx: GeneratorContext, base: RoomBase, sessions: readonly Session[]): void {
	const { rng } = ctx;

	for (const session of sessions) {
		const shares = rng.chance(0.06);
		const withAudio = rng.chance(0.35);
		const position = rng.float(0.1, 0.6);
		const length = rng.int(2 * MINUTE, 15 * MINUTE);
		const end = session.leftAt;
		const sends = session.tracks.some((t) => !t.muted);

		if (!shares || session.doc.kind !== 'STANDARD' || neverActive(session) || !sends) {
			continue;
		}

		if (end - session.activeAt < 4 * MINUTE) {
			continue;
		}

		const publishedAt = Math.round(session.activeAt + (end - session.activeAt) * position);
		const stop = publishedAt + length;
		const unpublishedAt = Math.min(stop, end);
		const added = [screenTrack(ctx, base, session, 'SCREEN_SHARE', publishedAt, unpublishedAt)];

		if (withAudio) {
			added.push(screenTrack(ctx, base, session, 'SCREEN_SHARE_AUDIO', publishedAt + 200, unpublishedAt));
		}

		session.tracks.push(...added);
		session.doc.trackSids = session.tracks.map((t) => t._id);
		session.doc.tracks.published = session.tracks.length;

		for (const t of added) {
			session.doc.tracks.bySource[t.source] = (session.doc.tracks.bySource[t.source] ?? 0) + 1;
		}
	}
}

function screenTrack(
	ctx: GeneratorContext,
	base: RoomBase,
	session: Session,
	source: 'SCREEN_SHARE' | 'SCREEN_SHARE_AUDIO',
	publishedAt: number,
	unpublishedAt: number
): TrackDoc {
	const { rng } = ctx;
	const video = source === 'SCREEN_SHARE';
	const layers: TrackLayer[] = video ? [{ quality: 'HIGH', width: 1920, height: 1080, bitrate: 2_000_000 }] : [];
	const mimeType = video ? 'video/VP8' : 'audio/opus';
	const bitrate = video ? 2_000_000 : AUDIO_BITRATE;
	const durationMs = unpublishedAt - publishedAt;
	session.upBytes += (bitrate / 8) * (durationMs / 1000);

	return {
		_id: rng.id('TR_'),
		roomSid: base.roomSid,
		participantSid: session.doc._id,
		identity: session.doc.identity,
		type: video ? 'VIDEO' : 'AUDIO',
		source,
		name: video ? 'screen_share' : 'screen_share_audio',
		mimeType,
		status: 'unpublished',
		publishedAt: new Date(publishedAt),
		unpublishedAt: new Date(unpublishedAt),
		durationMs,
		closedBy: null,
		muted: false,
		muteChanges: [],
		width: video ? 1920 : 0,
		height: video ? 1080 : 0,
		simulcast: false,
		codecs: [{ mimeType, layers }],
		encryption: 'NONE',
		subscribers: { current: 0, total: 0, failed: 0 },
		publishStats: ctx.withoutMediaStats.has(session.doc.nodeId)
			? null
			: rtpStats(rng, bitrate, durationMs, layers.length),
		schemaVersion: SCHEMA_VERSION,
		expiresAt: tracksExpiresAt(ctx, unpublishedAt)
	};
}

/** Senders that mute and unmute their microphone, or less often their camera, and end as they were. */
function addMuteChanges(ctx: GeneratorContext, session: Session): void {
	const { rng } = ctx;

	for (const track of session.tracks) {
		const toggles = rng.chance(track.source === 'MICROPHONE' ? 0.35 : track.source === 'CAMERA' ? 0.1 : 0);
		const pairs = rng.int(1, 3);
		const from = track.publishedAt.getTime() + 5_000;
		const to = (track.unpublishedAt?.getTime() ?? session.leftAt) - 5_000;

		if (!toggles || track.muted || session.doc.kind !== 'STANDARD' || to - from < pairs * 2 * 20_000) {
			continue;
		}

		const instants = Array.from({ length: pairs * 2 }, () => rng.int(from, to)).sort((a, b) => a - b);
		track.muteChanges = instants.map((at, index) => ({ muted: index % 2 === 0, at: new Date(at) }));
	}
}

/** The instant of each resume of a session, while it was connected. */
function addResumes(ctx: GeneratorContext, session: Session): void {
	const { rng } = ctx;
	const from = session.activeAt + 1_000;
	const to = session.leftAt - 1_000;

	if (neverActive(session) || session.doc.resumes === 0) {
		return;
	}

	if (to <= from) {
		session.doc.resumes = 0;

		return;
	}

	session.doc.resumedAt = Array.from({ length: session.doc.resumes }, () => rng.int(from, to))
		.sort((a, b) => a - b)
		.map((at) => new Date(at));
}

/** The close instant of each session the reconciler closed: what was still open in it closes with it. */
function reconcilerClosures(sessions: readonly Session[]): Map<string, number> {
	return new Map(sessions.flatMap((s) => (s.doc.closedBy === 'reconciler' ? [[s.doc._id, s.leftAt]] : [])));
}

/** `closedBy` of a track or subscription closed at `closedAt`: by the reconciler's cascade at its close, else by its event. */
function closedByOf(closedAt: Date | null, ...reconcilerAt: (number | undefined)[]): 'event' | 'reconciler' | null {
	if (closedAt === null) {
		return null;
	}

	return reconcilerAt.includes(closedAt.getTime()) ? 'reconciler' : 'event';
}

/**
 * The server API calls an application makes about a room over its life, as the writer counts them from `API_CALL`
 * events.
 */
function apiCalls(ctx: GeneratorContext, bundle: RoomBundle): ApiCall[] {
	const rng = ctx.apiRng;
	const { room } = bundle;
	const calls: ApiCall[] = [];
	const add = (at: number, method: string, failed = false): void => {
		const error = failed || rng.chance(0.01);

		if (at >= ctx.windowStart) {
			calls.push({ at: new Date(at), method, error });
		}
	};
	const createdAt = room.createdAt.getTime();
	const end = (room.endedAt ?? room.createdAt).getTime();

	if (rng.chance(0.55)) {
		add(createdAt - 30, 'RoomService_CreateRoom');
	}

	if (room.endReason === 'API_DELETE' && room.endedAt !== null) {
		add(end - 20, 'RoomService_DeleteRoom');

		// The application deletes it again: the room no longer exists.
		if (rng.chance(0.05)) {
			add(end + rng.int(1_000, 60_000), 'RoomService_DeleteRoom', true);
		}
	}

	for (const e of bundle.egresses) {
		add(e.startedAt.getTime() - 50, EGRESS_START_METHODS[e.type]);
		const endingAt = e.statusHistory.find((h) => h.status === 'ending')?.at.getTime();
		const stopped =
			e.status === 'ending' ||
			(e.status === 'complete' && e.endedAt !== null && (room.endedAt === null || e.endedAt < room.endedAt));

		if (stopped && endingAt !== undefined) {
			add(endingAt - 20, 'EgressService_StopEgress');
		}
	}

	for (const i of bundle.ingresses) {
		add(i.createdAt.getTime(), 'IngressService_CreateIngress');

		if (i.deletedAt !== null) {
			add(i.deletedAt.getTime() - 20, 'IngressService_DeleteIngress');
		}
	}

	for (const p of bundle.participants) {
		if (p.disconnectReason === 'PARTICIPANT_REMOVED' && p.leftAt !== null) {
			add(p.leftAt.getTime() - 30, 'RoomService_RemoveParticipant');
		}
	}

	for (const t of bundle.tracks) {
		for (const change of t.muteChanges) {
			if (change.muted && rng.chance(0.2)) {
				add(change.at.getTime() - 20, 'RoomService_MutePublishedTrack');
			}
		}
	}

	for (let i = rng.poisson(2); i > 0; i -= 1) {
		add(rng.int(createdAt, end), 'RoomService_ListParticipants');
	}

	return calls.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Subscriber-side RTP stats carry no simulcast layers. */
function withoutLayers({ layers: _layers, ...stats }: RtpStats): Omit<RtpStats, 'layers'> {
	return stats;
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}
