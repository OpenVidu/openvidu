import type { ByteTotals, EntityBase, QualityTotals, WriterInternal } from './common.js';
import type {
	ClientSdk,
	ClosedBy,
	ConnectionType,
	DisconnectReason,
	EgressOutputKind,
	EgressSourceType,
	EgressStatus,
	EgressStreamStatus,
	EgressType,
	EncryptionType,
	IngressInputType,
	IngressSessionStatus,
	IngressStatus,
	ParticipantKind,
	ParticipantKindDetail,
	ParticipantStatus,
	RoomEndReason,
	RoomStatus,
	SubscriptionStatus,
	TrackSource,
	TrackStatus,
	TrackType,
	VideoQuality
} from './enums.js';

export type CountByParticipantKind = Partial<Record<ParticipantKind, number>>;
export type CountByTrackSource = Partial<Record<TrackSource, number>>;
export type CountByEgressType = Partial<Record<EgressType, number>>;

export interface RoomConfig {
	maxParticipants?: number;
	emptyTimeoutMs?: number;
	departureTimeoutMs?: number;
	/** Stored only when the writer's `store_metadata` is enabled. */
	metadata?: string;
}

/** Counters of STANDARD sessions; `byKind` counts the sessions of every kind. */
export interface RoomParticipantCounters {
	sessions: number;
	/** Distinct identities. */
	unique: number;
	/** Sessions currently active. */
	active: number;
	/** Maximum of `active` over the room's life. */
	peakActive: number;
	aborted: number;
	byKind: CountByParticipantKind;
}

export interface RoomTrackCounters {
	published: number;
	bySource: CountByTrackSource;
}

export interface RoomEgressCounters {
	total: number;
	active: number;
	byType: CountByEgressType;
}

export interface RoomIngressCounters {
	sessions: number;
	active: number;
}

export interface RoomFeatures {
	egress: boolean;
	ingress: boolean;
	agent: boolean;
	sip: boolean;
}

/** `rooms`: one document per room session. `_id` is the room SID (`RM_…`). */
export interface RoomDocument extends EntityBase {
	_id: string;
	name: string;
	nameLower: string;
	status: RoomStatus;
	createdAt: Date;
	endedAt?: Date;
	durationMs?: number;
	endReason?: RoomEndReason;
	closedBy?: ClosedBy;
	nodeId: string;
	config?: RoomConfig;
	participants: RoomParticipantCounters;
	tracks: RoomTrackCounters;
	egress: RoomEgressCounters;
	ingress: RoomIngressCounters;
	bytes: ByteTotals;
	quality: QualityTotals;
	features: RoomFeatures;
	lastEventAt: Date;
	lastStatsAt?: Date;
	internal?: WriterInternal;
}

export interface ParticipantClient {
	sdk?: ClientSdk;
	version?: string;
	os?: string;
	osVersion?: string;
	browser?: string;
	browserVersion?: string;
	deviceModel?: string;
	network?: string;
	/** Client IP address; absent when the writer's `anonymize_ip` is enabled. */
	address?: string;
}

export interface ParticipantPermission {
	canSubscribe?: boolean;
	canPublish?: boolean;
	canPublishData?: boolean;
	canPublishSources?: TrackSource[];
	hidden?: boolean;
	canUpdateMetadata?: boolean;
	canSubscribeMetrics?: boolean;
}

export interface ParticipantTrackCounters {
	published: number;
	bySource: CountByTrackSource;
	subscribed: number;
	subscribeFailures: number;
}

export interface ParticipantQuality extends QualityTotals {
	lastScore?: number;
	lastScoreAt?: Date;
}

/** `participants`: one document per participant session. `_id` is the participant SID (`PA_…`). */
export interface ParticipantDocument extends EntityBase {
	_id: string;
	identity: string;
	identityLower: string;
	name?: string;
	roomSid: string;
	roomName: string;
	kind: ParticipantKind;
	kindDetails?: ParticipantKindDetail[];
	status: ParticipantStatus;
	joinedAt: Date;
	activeAt?: Date;
	leftAt?: Date;
	durationMs?: number;
	disconnectReason?: DisconnectReason;
	closedBy?: ClosedBy;
	connectTimeMs?: number;
	connectionType?: Exclude<ConnectionType, 'other'>;
	region?: string;
	nodeId: string;
	resumes: number;
	client?: ParticipantClient;
	permission?: ParticipantPermission;
	isPublisher: boolean;
	/** Stored only when the writer's `store_metadata` is enabled. */
	metadata?: string;
	/** Stored only when the writer's `store_metadata` is enabled. */
	attributes?: Record<string, string>;
	tracks: ParticipantTrackCounters;
	bytes: ByteTotals;
	quality: ParticipantQuality;
	lastEventAt: Date;
	lastStatsAt?: Date;
	internal?: WriterInternal;
}

export interface TrackCodecLayer {
	quality: VideoQuality;
	width?: number;
	height?: number;
	bitrate?: number;
}

export interface TrackCodec {
	mimeType: string;
	layers?: TrackCodecLayer[];
}

export interface RtpLayerStats {
	layer: number;
	bytes: number;
	packets: number;
	frames: number;
}

/** Final RTP statistics of a closed publication or subscription (`TRACK_PUBLISH_STATS` / `TRACK_SUBSCRIBE_STATS`). */
export interface RtpFinalStats {
	bytes: number;
	packets: number;
	packetsLost: number;
	packetLossPct: number;
	nacks: number;
	plis: number;
	firs: number;
	rttMaxMs: number;
	jitterMaxMs: number;
	durationMs: number;
}

export interface TrackPublishStats extends RtpFinalStats {
	/** One entry per spatial layer; empty for audio. */
	layers: RtpLayerStats[];
}

export interface TrackSubscriberCounters {
	current: number;
	total: number;
	failed: number;
}

/** `tracks`: one document per published track. `_id` is the track SID (`TR_…`). */
export interface TrackDocument extends EntityBase {
	_id: string;
	roomSid: string;
	participantSid: string;
	identity?: string;
	type: TrackType;
	source: TrackSource;
	mimeType?: string;
	name?: string;
	status: TrackStatus;
	publishedAt: Date;
	unpublishedAt?: Date;
	durationMs?: number;
	closedBy?: ClosedBy;
	muted: boolean;
	width?: number;
	height?: number;
	simulcast?: boolean;
	codecs?: TrackCodec[];
	encryption?: EncryptionType;
	subscribers: TrackSubscriberCounters;
	publishStats?: TrackPublishStats;
	internal?: WriterInternal;
}

/** `track_subscriptions`: one document per (track, subscriber). `_id` is `<trackSid>:<subscriberSid>`. */
export interface TrackSubscriptionDocument extends EntityBase {
	_id: string;
	trackSid: string;
	roomSid: string;
	subscriberSid: string;
	subscriberIdentity?: string;
	publisherSid?: string;
	publisherIdentity?: string;
	source?: TrackSource;
	status: SubscriptionStatus;
	error?: string;
	subscribedAt?: Date;
	unsubscribedAt?: Date;
	durationMs?: number;
	closedBy?: ClosedBy;
	subscribeStats?: RtpFinalStats;
}

/** Egress request without credentials or stream keys; URLs are redacted. */
export interface EgressRequestSummary {
	layout?: string;
	customBaseUrl?: string;
	url?: string;
	audioOnly?: boolean;
	videoOnly?: boolean;
	participantIdentity?: string;
	screenShare?: boolean;
	trackId?: string;
	audioTrackId?: string;
	videoTrackId?: string;
	/** Encoding preset name (`EncodingOptionsPreset`), when a preset was used. */
	preset?: string;
	/** Advanced encoding options (codecs, bitrates, resolution) when no preset was used. */
	advanced?: Record<string, unknown>;
	outputs?: EgressOutputKind[];
}

export interface EgressOutput {
	kind: EgressOutputKind;
	filename?: string;
	/** Stream URL with userinfo, query string and last path segment redacted. */
	url?: string;
	playlistName?: string;
	filenamePrefix?: string;
	location?: string;
	size?: number;
	durationMs?: number;
	status?: EgressStreamStatus;
	error?: string;
	startedAt?: Date;
	endedAt?: Date;
}

export interface EgressStatusChange {
	status: EgressStatus;
	at: Date;
}

/** `egresses`: one document per egress. `_id` is the egress id (`EG_…`). */
export interface EgressDocument extends EntityBase {
	_id: string;
	/** Absent for web egress, which has no room. */
	roomSid?: string;
	roomName?: string;
	/** Lower-cased `roomName`, for the room name prefix search. */
	roomNameLower?: string;
	type: EgressType;
	sourceType: EgressSourceType;
	status: EgressStatus;
	closedBy?: ClosedBy;
	startedAt: Date;
	updatedAt: Date;
	endedAt?: Date;
	durationMs?: number;
	error?: string;
	errorCode?: number;
	request: EgressRequestSummary;
	outputs: EgressOutput[];
	/** Status transitions in order; at most 50 entries. */
	statusHistory: EgressStatusChange[];
	retryCount: number;
	backupStorageUsed: boolean;
}

/** `ingresses`: one document per ingress definition. `_id` is the ingress id (`IN_…`). */
export interface IngressDocument extends EntityBase {
	_id: string;
	name?: string;
	nameLower?: string;
	inputType: IngressInputType;
	/** Ingest URL without stream key or credentials. */
	url?: string;
	roomName: string;
	participantIdentity: string;
	participantName?: string;
	/** Stored only when the writer's `store_metadata` is enabled. */
	participantMetadata?: string;
	reusable: boolean;
	enabled: boolean;
	enableTranscoding?: boolean;
	createdAt: Date;
	deletedAt?: Date;
	status: IngressStatus;
	lastError?: string;
	sessions: number;
	totalDurationMs: number;
	lastSessionAt?: Date;
	internal?: WriterInternal;
}

export interface IngressVideoInfo {
	mimeType?: string;
	averageBitrate?: number;
	width?: number;
	height?: number;
	framerate?: number;
}

export interface IngressAudioInfo {
	mimeType?: string;
	averageBitrate?: number;
	channels?: number;
	sampleRate?: number;
}

/** `ingress_sessions`: one document per publishing session. `_id` is `ingress.state.resource_id`. */
export interface IngressSessionDocument extends EntityBase {
	_id: string;
	ingressId: string;
	ingressName?: string;
	inputType: IngressInputType;
	roomSid?: string;
	roomName?: string;
	participantIdentity?: string;
	status: IngressSessionStatus;
	error?: string;
	closedBy?: ClosedBy;
	startedAt: Date;
	endedAt?: Date;
	durationMs?: number;
	video?: IngressVideoInfo;
	audio?: IngressAudioInfo;
}
