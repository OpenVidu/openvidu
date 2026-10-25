import { Long } from 'mongodb';
import type { Rng } from './random.js';
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
	config: { maxParticipants: number; emptyTimeoutMs: number; departureTimeoutMs: number };
	participantSids: string[];
	activeParticipantSids: string[];
	identities: string[];
	participants: {
		sessions: number;
		unique: number;
		active: number;
		peakActive: number;
		aborted: number;
		byKind: Record<ParticipantKind, number>;
	};
	trackSids: string[];
	tracks: { published: number; bySource: Partial<Record<TrackSource, number>> };
	egressIds: string[];
	egress: { total: number; byType: Partial<Record<EgressType, number>>; active: number };
	ingressSessionIds: string[];
	ingress: { sessions: number; active: number };
	bytes: { up: Long; down: Long };
	quality: { scoreSum: number; scoreCount: number; minScore: number | null; poor: number; lost: number };
	features: { egress: boolean; ingress: boolean; agent: boolean; sip: boolean };
	lastEventAt: Date;
	lastStatsAt: Date | null;
	schemaVersion: number;
	expiresAt: Date | null;
}

export interface ClientInfo {
	sdk: string;
	version: string;
	os: string;
	osVersion: string;
	browser: string;
	browserVersion: string;
	deviceModel: string;
	network: string;
}

export interface ParticipantDoc {
	_id: string;
	identity: string;
	identityLower: string;
	name: string;
	roomSid: string;
	roomName: string;
	kind: ParticipantKind;
	kindDetails: string[];
	status: 'joining' | 'active' | 'left' | 'aborted';
	joinedAt: Date;
	activeAt: Date | null;
	leftAt: Date | null;
	durationMs: number | null;
	disconnectReason: string | null;
	closedBy: 'event' | 'reconciler' | null;
	connectTimeMs: number | null;
	connectionType: string | null;
	region: string;
	nodeId: string;
	resumes: number;
	client: ClientInfo;
	permission: { canPublish: boolean; canSubscribe: boolean; canPublishData: boolean; hidden: boolean };
	isPublisher: boolean;
	trackSids: string[];
	tracks: {
		published: number;
		bySource: Partial<Record<TrackSource, number>>;
		subscribed: number;
		subscribeFailures: number;
	};
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
	layers: { layer: number; bytes: Long; packets: number; frames: number }[];
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
	muted: boolean;
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
	maxVideoQuality: 'LOW' | 'MEDIUM' | 'HIGH' | 'OFF' | null;
	subscribeStats: Omit<RtpStats, 'layers'> | null;
	schemaVersion: number;
	expiresAt: Date | null;
}

export interface EgressDoc {
	_id: string;
	roomSid: string;
	roomName: string;
	roomNameLower: string;
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
	outputs: {
		kind: 'file' | 'stream' | 'segments' | 'images';
		filename?: string;
		url?: string;
		playlistName?: string;
		location: string;
		size: Long;
		durationMs: number;
		status: string;
		error: string | null;
		startedAt: Date;
		endedAt: Date | null;
	}[];
	statusHistory: { status: EgressStatus; at: Date }[];
	retryCount: number;
	backupStorageUsed: boolean;
	schemaVersion: number;
	expiresAt: Date | null;
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
	lastSessionAt: Date;
	schemaVersion: number;
	expiresAt: Date | null;
}

export interface IngressSessionDoc {
	_id: string;
	ingressId: string;
	ingressName: string;
	inputType: IngressDoc['inputType'];
	roomSid: string;
	roomName: string;
	participantIdentity: string;
	status: 'buffering' | 'publishing' | 'error' | 'complete';
	error: string | null;
	closedBy: 'event' | 'reconciler' | null;
	startedAt: Date;
	endedAt: Date | null;
	durationMs: number | null;
	video: { mimeType: string; averageBitrate: number; width: number; height: number; framerate: number };
	audio: { mimeType: string; averageBitrate: number; channels: number; sampleRate: number };
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
}

export interface GeneratorContext {
	rng: Rng;
	scenario: Scenario;
	/** Generation instant (ms); nothing is dated after it. */
	now: number;
	nodeIds: readonly string[];
	retentionEntitiesMs: number;
	/** Retention of tracks and subscriptions (`retention.tracks`). */
	retentionTracksMs: number;
}

export interface RoomPlan {
	index: number;
	createdAt: number;
	active: boolean;
}

const MINUTE = 60_000;
const DEPARTURE_TIMEOUT_MS = 20_000;
const FLUSH_MS = 30_000;
/** Score thresholds of the poor and lost quality samples (data model contract). */
const POOR_SCORE = 2.06;
const LOST_SCORE = 1.25;
const AUDIO_BITRATE = 32_000;

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
	leftAt: number | null;
	tracks: TrackDoc[];
	upBytes: number;
	downBytes: number;
	meanScore: number;
}

export function generateRoom(ctx: GeneratorContext, plan: RoomPlan): RoomBundle {
	const { rng, now } = ctx;
	const roomSid = rng.id('RM_');
	const name = `room-${String(plan.index + 1).padStart(6, '0')}`;
	const nodeId = rng.pick(ctx.nodeIds);
	const hasEgress = rng.chance(0.1);
	const hasIngress = rng.chance(0.02);
	const hasAgent = rng.chance(0.05);
	const hasSip = rng.chance(0.01);
	const endReason = plan.active ? null : pickEndReason(rng);
	const closedBy: 'event' | 'reconciler' | null = plan.active
		? null
		: endReason === 'RECONCILED'
			? 'reconciler'
			: 'event';

	const base = { roomSid, roomName: name, nodeId, createdAt: plan.createdAt };
	const sessions: Session[] = [];
	const identityCount = Math.min(60, Math.max(1, rng.poisson(ctx.scenario.avgRoomSize)));
	const reconnects = rng.poisson(
		Math.max(0, ctx.scenario.sessionsPerDay / ctx.scenario.roomsPerDay - ctx.scenario.avgRoomSize)
	);
	const reconnectsByIdentity = new Map<number, number>();

	for (let i = 0; i < reconnects; i += 1) {
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

			// An active room keeps at least its last participant connected.
			if (plan.active && last && i === identityCount - 1) {
				length = Math.max(length, now - Math.min(joinedAt, now) + 5 * MINUTE);
			}

			remaining = last ? 0 : remaining - length + rng.int(0, 5 * MINUTE);
			const session = standardSession(ctx, base, identity, joinedAt, length, last ? null : 'DUPLICATE_IDENTITY');
			sessions.push(session);

			// Still connected: the identity has not reconnected yet.
			if (session.leftAt === null) {
				break;
			}

			joinedAt = session.leftAt + rng.int(1_000, 3_000);
		}
	}

	let egresses: EgressDoc[] = [];
	let ingresses: IngressDoc[] = [];
	let ingressSessions: IngressSessionDoc[] = [];

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

	if (hasIngress) {
		const built = buildIngress(ctx, base, plan.active);
		ingresses = [built.ingress];
		ingressSessions = [built.session];
		sessions.push(
			serviceSession(
				ctx,
				base,
				'INGRESS',
				built.ingress.participantIdentity,
				built.session.startedAt.getTime() + 1_000,
				(built.session.endedAt?.getTime() ?? now + 10 * MINUTE) - built.session.startedAt.getTime() - 1_000,
				true
			)
		);
	}

	// Natural end: the last participant leaves; API deletions and reconciliation move it.
	const naturalEnd = Math.max(...sessions.map((s) => s.leftAt ?? now));
	let endedAt: number | null = null;

	if (!plan.active) {
		endedAt = naturalEnd + DEPARTURE_TIMEOUT_MS;

		if (endReason === 'API_DELETE') {
			endedAt = plan.createdAt + Math.round((naturalEnd - plan.createdAt) * rng.float(0.5, 1));
		} else if (endReason === 'RECONCILED') {
			endedAt = naturalEnd + 5 * MINUTE;
		}

		endedAt = Math.min(endedAt, now - MINUTE);
		closeSessions(ctx, sessions, endedAt, endReason === 'API_DELETE' ? 'ROOM_DELETED' : 'ROOM_CLOSED', closedBy);
	}

	if (hasEgress) {
		const egress = buildEgress(ctx, base, plan.active, endedAt, sessions);
		egresses = [egress];
		sessions.push(
			serviceSession(
				ctx,
				base,
				'EGRESS',
				egress._id,
				egress.startedAt.getTime() + 1_000,
				(egress.endedAt?.getTime() ?? now + 10 * MINUTE) - egress.startedAt.getTime() - 1_000,
				false
			)
		);
	}

	const tracks = sessions.flatMap((s) => s.tracks);
	const subscriptions = buildSubscriptions(ctx, roomSid, sessions);
	finalizeSessions(ctx, sessions);

	const participants = sessions.map((s) => s.doc);
	const activeSessions = sessions.filter((s) => s.doc.status === 'active' || s.doc.status === 'joining');
	// Participant counters count STANDARD sessions only; byKind counts every kind.
	const standard = participants.filter((p) => p.kind === 'STANDARD');
	const activeStandard = activeSessions.filter((s) => s.doc.kind === 'STANDARD');
	const byKind: Record<ParticipantKind, number> = { STANDARD: 0, EGRESS: 0, INGRESS: 0, SIP: 0, AGENT: 0 };
	const bySource: Partial<Record<TrackSource, number>> = {};
	const byType: Partial<Record<EgressType, number>> = {};
	let scoreSum = 0;
	let scoreCount = 0;
	let minScore: number | null = null;
	let poor = 0;
	let lost = 0;
	let up = 0;
	let down = 0;

	for (const s of sessions) {
		byKind[s.doc.kind] += 1;
		scoreSum += s.doc.quality.scoreSum;
		scoreCount += s.doc.quality.scoreCount;
		minScore = s.doc.quality.minScore === null ? minScore : Math.min(minScore ?? 5, s.doc.quality.minScore);
		poor += s.doc.quality.poor;
		lost += s.doc.quality.lost;
		up += s.upBytes;
		down += s.downBytes;
	}

	for (const t of tracks) {
		bySource[t.source] = (bySource[t.source] ?? 0) + 1;
	}

	for (const e of egresses) {
		byType[e.type] = (byType[e.type] ?? 0) + 1;
	}

	const lastEventAt = Math.max(endedAt ?? 0, ...sessions.map((s) => s.leftAt ?? s.doc.joinedAt.getTime()));
	const lastStatsAt = scoreCount > 0 ? Math.min(now, Math.max(...sessions.map((s) => s.leftAt ?? now))) : null;
	const room: RoomDoc = {
		_id: roomSid,
		name,
		nameLower: name,
		status: plan.active ? 'active' : 'closed',
		createdAt: new Date(plan.createdAt),
		endedAt: endedAt === null ? null : new Date(endedAt),
		durationMs: endedAt === null ? null : endedAt - plan.createdAt,
		endReason,
		closedBy,
		nodeId,
		config: { maxParticipants: 0, emptyTimeoutMs: 300_000, departureTimeoutMs: DEPARTURE_TIMEOUT_MS },
		participantSids: participants.map((p) => p._id),
		activeParticipantSids: activeStandard.map((s) => s.doc._id),
		identities: [...new Set(standard.map((p) => p.identity))],
		participants: {
			sessions: standard.length,
			unique: new Set(standard.map((p) => p.identity)).size,
			active: activeStandard.length,
			peakActive: peakConcurrency(sessions.filter((s) => s.doc.kind === 'STANDARD')),
			aborted: standard.filter((p) => p.status === 'aborted').length,
			byKind
		},
		trackSids: tracks.map((t) => t._id),
		tracks: { published: tracks.length, bySource },
		egressIds: egresses.map((e) => e._id),
		egress: { total: egresses.length, byType, active: egresses.filter((e) => isEgressActive(e.status)).length },
		ingressSessionIds: ingressSessions.map((s) => s._id),
		ingress: { sessions: ingressSessions.length, active: ingressSessions.filter((s) => s.endedAt === null).length },
		bytes: { up: int64(up), down: int64(down) },
		quality: { scoreSum: round2(scoreSum), scoreCount, minScore, poor, lost },
		features: { egress: hasEgress, ingress: hasIngress, agent: hasAgent, sip: hasSip },
		lastEventAt: new Date(lastEventAt),
		lastStatsAt: lastStatsAt === null ? null : new Date(lastStatsAt),
		schemaVersion: SCHEMA_VERSION,
		expiresAt: expiresAt(ctx, endedAt)
	};

	return {
		room,
		participants,
		tracks,
		subscriptions,
		egresses,
		ingresses,
		ingressSessions,
		meanScores: new Map(sessions.map((s) => [s.doc._id, s.meanScore]))
	};
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
	forcedReason: string | null
): Session {
	const { rng } = ctx;
	const aborted = forcedReason === null && rng.chance(0.03);
	const session = newSession(
		ctx,
		base,
		'STANDARD',
		identity,
		joinedAt,
		aborted ? rng.int(5_000, 30_000) : length,
		clientInfo(rng),
		aborted
	);

	if (aborted) {
		session.doc.disconnectReason = rng.pick(['JOIN_FAILURE', 'CONNECTION_TIMEOUT']);

		return session;
	}

	if (session.leftAt !== null) {
		session.doc.disconnectReason = forcedReason ?? rng.weighted(LEAVE_REASONS);
	}

	session.tracks = publishTracks(ctx, base, session, ['CAMERA', 'MICROPHONE']);

	return session;
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
		osVersion: '6.12',
		browser: '',
		browserVersion: '',
		deviceModel: '',
		network: ''
	};
	const session = newSession(ctx, base, kind, identity, joinedAt, Math.max(5_000, length), client, false);

	if (session.leftAt !== null) {
		session.doc.disconnectReason = 'CLIENT_INITIATED';
	}

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
	aborted: boolean
): Session {
	const { rng, now } = ctx;
	// A join planned after now (a room created minutes ago) has just happened.
	const joinedAt = Math.min(plannedJoinedAt, now - rng.int(5_000, 60_000));
	const connectTimeMs = Math.round(rng.clampedGaussian(800, 300, 50, 5_000));
	const activeAt = joinedAt + connectTimeMs;
	const naturalLeft = Math.max(joinedAt + length, activeAt + 1_000);
	const leftAt = naturalLeft >= now ? null : naturalLeft;
	const status: ParticipantDoc['status'] = aborted ? 'aborted' : leftAt === null ? 'active' : 'left';
	const doc: ParticipantDoc = {
		_id: rng.id('PA_'),
		identity,
		identityLower: identity.toLowerCase(),
		name: displayName(kind, identity),
		roomSid: base.roomSid,
		roomName: base.roomName,
		kind,
		kindDetails: [],
		status,
		joinedAt: new Date(joinedAt),
		activeAt: aborted ? null : new Date(activeAt),
		leftAt: leftAt === null ? null : new Date(leftAt),
		durationMs: leftAt === null ? null : leftAt - joinedAt,
		disconnectReason: null,
		closedBy: leftAt === null ? null : 'event',
		connectTimeMs: aborted ? null : connectTimeMs,
		connectionType: aborted ? null : rng.weighted(CONNECTION_TYPES),
		region: '',
		nodeId: base.nodeId,
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
		lastEventAt: new Date(leftAt ?? (aborted ? joinedAt : activeAt)),
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
			deviceModel: mobile ? rng.pick(['Pixel 9', 'iPhone16,2', 'SM-S938B']) : '',
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
		browser: '',
		browserVersion: '',
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
	const { rng, now } = ctx;
	const tracks: TrackDoc[] = [];

	for (const source of sources) {
		const publishedAt = session.activeAt + rng.int(300, 1_500);

		if (publishedAt >= (session.leftAt ?? now)) {
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
		const durationMs = (unpublishedAt ?? now) - publishedAt;
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
			status: unpublishedAt === null ? 'published' : 'unpublished',
			publishedAt: new Date(publishedAt),
			unpublishedAt: unpublishedAt === null ? null : new Date(unpublishedAt),
			durationMs: unpublishedAt === null ? null : durationMs,
			muted: rng.chance(0.1),
			width: preset.width,
			height: preset.height,
			simulcast: video,
			codecs: [{ mimeType, layers }],
			encryption: 'NONE',
			subscribers: { current: 0, total: 0, failed: 0 },
			publishStats: unpublishedAt === null ? null : rtpStats(rng, bitrate, durationMs, layers.length),
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
			packets: Math.round(packets / layerCount),
			frames: Math.round((durationMs / 1000) * 30)
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
	closedBy: 'event' | 'reconciler' | null
): void {
	for (const s of sessions) {
		if (s.leftAt !== null && s.leftAt <= endedAt) {
			continue;
		}

		// A session never leaves before it is active.
		s.leftAt = Math.max((s.doc.activeAt ?? s.doc.joinedAt).getTime() + 1_000, endedAt);
		s.doc.leftAt = new Date(s.leftAt);
		s.doc.lastEventAt = s.doc.leftAt;
		s.doc.durationMs = s.leftAt - s.doc.joinedAt.getTime();
		s.doc.status = s.doc.status === 'aborted' ? 'aborted' : 'left';
		s.doc.disconnectReason = closedBy === 'reconciler' ? 'RECONCILED' : reason;
		s.doc.closedBy = closedBy;
		s.doc.expiresAt = s.doc.expiresAt ?? expiresAt(ctx, s.leftAt);

		for (const t of s.tracks) {
			if (t.unpublishedAt === null || t.unpublishedAt.getTime() > s.leftAt) {
				const unpublishedAt = Math.max(t.publishedAt.getTime(), s.leftAt);
				t.unpublishedAt = new Date(unpublishedAt);
				t.durationMs = unpublishedAt - t.publishedAt.getTime();
				t.status = 'unpublished';
				t.expiresAt = t.expiresAt ?? tracksExpiresAt(ctx, unpublishedAt);
			}
		}
	}
}

function buildSubscriptions(ctx: GeneratorContext, roomSid: string, sessions: Session[]): SubscriptionDoc[] {
	const { rng, now } = ctx;
	const subscriptions: SubscriptionDoc[] = [];

	for (const subscriber of sessions) {
		if (subscriber.doc.status === 'aborted' || subscriber.doc.kind === 'INGRESS') {
			continue;
		}

		const subStart = subscriber.activeAt;
		const subEnd = subscriber.leftAt ?? now;

		for (const publisher of sessions) {
			if (publisher === subscriber || publisher.doc.identity === subscriber.doc.identity) {
				continue;
			}

			for (const track of publisher.tracks) {
				const pubStart = track.publishedAt.getTime();
				const pubEnd = track.unpublishedAt?.getTime() ?? now;
				const subscribedAt = Math.max(pubStart, subStart) + rng.int(200, 800);

				if (subscribedAt >= Math.min(pubEnd, subEnd)) {
					continue;
				}

				const stillOpen = track.unpublishedAt === null && subscriber.leftAt === null;
				const unsubscribedAt = stillOpen ? null : Math.min(pubEnd, subEnd);
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
				const durationMs = unsubscribedAt === null ? null : unsubscribedAt - subscribedAt;
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
					status: failed ? 'failed' : unsubscribedAt === null ? 'subscribed' : 'unsubscribed',
					error: failed ? 'subscription failed: track not found' : null,
					subscribedAt: new Date(subscribedAt),
					unsubscribedAt: failed ? null : unsubscribedAt === null ? null : new Date(unsubscribedAt),
					durationMs: failed ? null : durationMs,
					maxVideoQuality,
					subscribeStats:
						failed || durationMs === null
							? null
							: withoutLayers(rtpStats(rng, bitrate, durationMs, video ? 1 : 0)),
					schemaVersion: SCHEMA_VERSION,
					expiresAt: tracksExpiresAt(ctx, failed ? subscribedAt : unsubscribedAt)
				};
				subscriptions.push(doc);
				track.subscribers.total += 1;
				track.subscribers.failed += failed ? 1 : 0;
				track.subscribers.current += doc.status === 'subscribed' ? 1 : 0;
				subscriber.doc.tracks.subscribed += failed ? 0 : 1;
				subscriber.doc.tracks.subscribeFailures += failed ? 1 : 0;

				if (!failed) {
					subscriber.downBytes += (bitrate / 8) * ((durationMs ?? now - subscribedAt) / 1000);
				}
			}
		}
	}

	return subscriptions;
}

function finalizeSessions(ctx: GeneratorContext, sessions: Session[]): void {
	const { rng, now } = ctx;

	for (const s of sessions) {
		if (s.doc.status === 'aborted') {
			continue;
		}

		const end = s.leftAt ?? now;
		const flushes = Math.max(0, Math.floor((end - s.activeAt) / FLUSH_MS));
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
	}
}

function peakConcurrency(sessions: Session[]): number {
	const edges: [number, number][] = [];

	for (const s of sessions) {
		if (s.doc.status === 'aborted') {
			continue;
		}

		edges.push([s.activeAt, 1], [s.leftAt ?? Number.MAX_SAFE_INTEGER, -1]);
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

function buildEgress(
	ctx: GeneratorContext,
	base: RoomBase,
	roomActive: boolean,
	roomEndedAt: number | null,
	sessions: readonly Session[]
): EgressDoc {
	const { rng, now } = ctx;
	const type = rng.weighted<EgressType>([
		['room_composite', 80],
		['participant', 8],
		['track_composite', 6],
		['web', 4],
		['track', 2]
	]);
	const startedAt = base.createdAt + rng.int(30_000, 120_000);
	const outputKind = rng.weighted<'file' | 'stream' | 'segments'>([
		['file', 70],
		['stream', 20],
		['segments', 10]
	]);
	let status: EgressStatus = 'active';
	let endedAt: number | null = null;
	let error: string | null = null;

	if (!roomActive) {
		status = rng.weighted<EgressStatus>([
			['complete', 90],
			['failed', 7],
			['aborted', 3]
		]);
		const naturalEnd = roomEndedAt ?? now;
		endedAt =
			status === 'complete'
				? naturalEnd
				: Math.round(startedAt + (naturalEnd - startedAt) * rng.float(0.05, 0.9));
		endedAt = Math.max(startedAt + 1_000, Math.min(endedAt, now - MINUTE));
		error =
			status === 'failed'
				? rng.pick([
						'ffmpeg exited with status 1',
						'upload failed: context deadline exceeded',
						'stream connection reset'
					])
				: null;
	}

	const durationMs = endedAt === null ? null : endedAt - startedAt;
	const history: { status: EgressStatus; at: Date }[] = [
		{ status: 'starting', at: new Date(startedAt) },
		{ status: 'active', at: new Date(startedAt + rng.int(2_000, 6_000)) }
	];

	if (endedAt !== null) {
		history.push({ status: 'ending', at: new Date(endedAt - 1_000) }, { status, at: new Date(endedAt) });
	}

	const id = rng.id('EG_');
	const size = (2_000_000 / 8) * ((durationMs ?? now - startedAt) / 1000);

	return {
		_id: id,
		roomSid: base.roomSid,
		roomName: base.roomName,
		roomNameLower: base.roomName.toLowerCase(),
		type,
		sourceType: type === 'web' ? 'web' : 'sdk',
		status,
		closedBy: endedAt === null ? null : 'event',
		startedAt: new Date(startedAt),
		updatedAt: new Date(endedAt ?? history.at(-1)?.at.getTime() ?? startedAt),
		endedAt: endedAt === null ? null : new Date(endedAt),
		durationMs,
		error,
		errorCode: status === 'failed' ? 1 : null,
		request: {
			layout: 'grid',
			preset: 'H264_720P_30',
			audioOnly: false,
			videoOnly: false,
			outputs: [outputKind],
			...egressSource(type, sessions, startedAt, rng.chance(0.3))
		},
		outputs: [
			{
				kind: outputKind,
				...(outputKind === 'file'
					? { filename: `${base.roomName}-${id}.mp4` }
					: outputKind === 'stream'
						? { url: 'rtmps://stream.example.com/live/[redacted]' }
						: { playlistName: `${id}.m3u8` }),
				location:
					outputKind === 'stream' ? 'rtmps://stream.example.com/live' : `s3://recordings/${base.roomName}/`,
				size: int64(outputKind === 'stream' ? 0 : size),
				durationMs: durationMs ?? 0,
				status: status === 'complete' ? 'FINISHED' : status === 'active' ? 'ACTIVE' : 'FAILED',
				error,
				startedAt: new Date(startedAt),
				endedAt: endedAt === null ? null : new Date(endedAt)
			}
		],
		statusHistory: history,
		retryCount: 0,
		backupStorageUsed: false,
		schemaVersion: SCHEMA_VERSION,
		expiresAt: expiresAt(ctx, endedAt)
	};
}

function buildIngress(
	ctx: GeneratorContext,
	base: RoomBase,
	roomActive: boolean
): { ingress: IngressDoc; session: IngressSessionDoc } {
	const { rng, now } = ctx;
	const id = rng.id('IN_');
	const inputType = rng.weighted<IngressDoc['inputType']>([
		['rtmp', 60],
		['whip', 30],
		['url', 10]
	]);
	const createdAt = base.createdAt - rng.int(60_000, 600_000);
	const startedAt = base.createdAt + rng.int(5_000, 60_000);
	const failed = !roomActive && rng.chance(0.05);
	const endedAt = roomActive ? null : Math.min(now - MINUTE, startedAt + sessionDuration(rng));
	const durationMs = endedAt === null ? null : endedAt - startedAt;
	const identity = `ingress-${String(rng.int(1, 9_999)).padStart(4, '0')}`;
	const sessionStatus: IngressSessionDoc['status'] = endedAt === null ? 'publishing' : failed ? 'error' : 'complete';
	const name = `ingress-${base.roomName}`;

	return {
		ingress: {
			_id: id,
			name,
			nameLower: name.toLowerCase(),
			inputType,
			url:
				inputType === 'rtmp'
					? 'rtmps://ingress.example.com/x'
					: inputType === 'whip'
						? 'https://ingress.example.com/w'
						: 'https://media.example.com/source.mp4',
			roomName: base.roomName,
			participantIdentity: identity,
			participantName: displayName('INGRESS', identity),
			reusable: inputType !== 'url',
			enabled: true,
			enableTranscoding: inputType !== 'whip',
			createdAt: new Date(createdAt),
			deletedAt: null,
			status: sessionStatus === 'publishing' ? 'publishing' : sessionStatus === 'error' ? 'error' : 'inactive',
			lastError: failed ? 'input disconnected' : null,
			sessions: 1,
			totalDurationMs: durationMs ?? 0,
			lastSessionAt: new Date(startedAt),
			schemaVersion: SCHEMA_VERSION,
			expiresAt: expiresAt(ctx, endedAt)
		},
		session: {
			_id: rng.id('IR_'),
			ingressId: id,
			ingressName: name,
			inputType,
			roomSid: base.roomSid,
			roomName: base.roomName,
			participantIdentity: identity,
			status: sessionStatus,
			error: failed ? 'input disconnected' : null,
			closedBy: endedAt === null ? null : 'event',
			startedAt: new Date(startedAt),
			endedAt: endedAt === null ? null : new Date(endedAt),
			durationMs,
			video: { mimeType: 'video/H264', averageBitrate: 2_500_000, width: 1280, height: 720, framerate: 30 },
			audio: { mimeType: 'audio/opus', averageBitrate: 128_000, channels: 2, sampleRate: 48_000 },
			schemaVersion: SCHEMA_VERSION,
			expiresAt: expiresAt(ctx, endedAt)
		}
	};
}

/** Subscriber-side RTP stats carry no simulcast layers. */
function withoutLayers({ layers: _layers, ...stats }: RtpStats): Omit<RtpStats, 'layers'> {
	return stats;
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}
