import type { ValueOf } from './value-of.js';

/**
 * Enumerations of the analytics data model. Values taken from the LiveKit protocol keep the protocol name
 * without its prefix (`ROOM_END_API_DELETE` → `API_DELETE`); lifecycle statuses owned by the model are
 * lower case.
 */

export const RoomStatus = {
	ACTIVE: 'active',
	CLOSED: 'closed'
} as const;
export type RoomStatus = ValueOf<typeof RoomStatus>;

export const RoomEndReason = {
	UNKNOWN: 'UNKNOWN',
	API_DELETE: 'API_DELETE',
	IDLE_TIMEOUT: 'IDLE_TIMEOUT',
	SERVER_SHUTDOWN: 'SERVER_SHUTDOWN',
	SUPERSEDED: 'SUPERSEDED',
	OPEN_FAILED: 'OPEN_FAILED',
	RECONCILED: 'RECONCILED'
} as const;
export type RoomEndReason = ValueOf<typeof RoomEndReason>;

/** Who closed an entity: its own end event or the writer's reconciler (estimated end time). */
export const ClosedBy = {
	EVENT: 'event',
	RECONCILER: 'reconciler'
} as const;
export type ClosedBy = ValueOf<typeof ClosedBy>;

export const ParticipantStatus = {
	JOINING: 'joining',
	ACTIVE: 'active',
	LEFT: 'left',
	ABORTED: 'aborted'
} as const;
export type ParticipantStatus = ValueOf<typeof ParticipantStatus>;

export const ParticipantKind = {
	STANDARD: 'STANDARD',
	INGRESS: 'INGRESS',
	EGRESS: 'EGRESS',
	SIP: 'SIP',
	AGENT: 'AGENT',
	CONNECTOR: 'CONNECTOR',
	BRIDGE: 'BRIDGE'
} as const;
export type ParticipantKind = ValueOf<typeof ParticipantKind>;

/** Kinds that depend on other participants and do not keep a room open. */
export const DEPENDENT_PARTICIPANT_KINDS: readonly ParticipantKind[] = [ParticipantKind.EGRESS, ParticipantKind.AGENT];

/** Every kind but STANDARD: services, reported apart from the participant counters. */
export const SERVICE_PARTICIPANT_KINDS: readonly ParticipantKind[] = Object.values(ParticipantKind).filter(
	(kind) => kind !== ParticipantKind.STANDARD
);

/** Kinds the UI offers in filters and breakdowns; SIP, CONNECTOR and BRIDGE are not used by OpenVidu yet. */
export const VISIBLE_PARTICIPANT_KINDS: readonly ParticipantKind[] = [
	ParticipantKind.STANDARD,
	ParticipantKind.INGRESS,
	ParticipantKind.EGRESS,
	ParticipantKind.AGENT
];

export const ParticipantKindDetail = {
	CLOUD_AGENT: 'CLOUD_AGENT',
	FORWARDED: 'FORWARDED',
	CONNECTOR_WHATSAPP: 'CONNECTOR_WHATSAPP',
	CONNECTOR_TWILIO: 'CONNECTOR_TWILIO',
	BRIDGE_RTSP: 'BRIDGE_RTSP',
	SIMULATION: 'SIMULATION'
} as const;
export type ParticipantKindDetail = ValueOf<typeof ParticipantKindDetail>;

export const DisconnectReason = {
	UNKNOWN_REASON: 'UNKNOWN_REASON',
	CLIENT_INITIATED: 'CLIENT_INITIATED',
	DUPLICATE_IDENTITY: 'DUPLICATE_IDENTITY',
	SERVER_SHUTDOWN: 'SERVER_SHUTDOWN',
	PARTICIPANT_REMOVED: 'PARTICIPANT_REMOVED',
	ROOM_DELETED: 'ROOM_DELETED',
	STATE_MISMATCH: 'STATE_MISMATCH',
	JOIN_FAILURE: 'JOIN_FAILURE',
	MIGRATION: 'MIGRATION',
	SIGNAL_CLOSE: 'SIGNAL_CLOSE',
	ROOM_CLOSED: 'ROOM_CLOSED',
	USER_UNAVAILABLE: 'USER_UNAVAILABLE',
	USER_REJECTED: 'USER_REJECTED',
	SIP_TRUNK_FAILURE: 'SIP_TRUNK_FAILURE',
	CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
	MEDIA_FAILURE: 'MEDIA_FAILURE',
	AGENT_ERROR: 'AGENT_ERROR',
	RECONCILED: 'RECONCILED'
} as const;
export type DisconnectReason = ValueOf<typeof DisconnectReason>;

export const ClientSdk = {
	UNKNOWN: 'UNKNOWN',
	JS: 'JS',
	SWIFT: 'SWIFT',
	ANDROID: 'ANDROID',
	FLUTTER: 'FLUTTER',
	GO: 'GO',
	UNITY: 'UNITY',
	REACT_NATIVE: 'REACT_NATIVE',
	RUST: 'RUST',
	PYTHON: 'PYTHON',
	CPP: 'CPP',
	UNITY_WEB: 'UNITY_WEB',
	NODE: 'NODE',
	UNREAL: 'UNREAL',
	ESP32: 'ESP32'
} as const;
export type ClientSdk = ValueOf<typeof ClientSdk>;

/** Fixed vocabulary of rollup operating-system keys; values outside it are counted as `other`. */
export const OsFamily = {
	WINDOWS: 'windows',
	MACOS: 'macos',
	LINUX: 'linux',
	ANDROID: 'android',
	IOS: 'ios',
	OTHER: 'other'
} as const;
export type OsFamily = ValueOf<typeof OsFamily>;

/** Fixed vocabulary of rollup browser keys; values outside it are counted as `other`. */
export const BrowserFamily = {
	CHROME: 'chrome',
	FIREFOX: 'firefox',
	SAFARI: 'safari',
	EDGE: 'edge',
	OTHER: 'other'
} as const;
export type BrowserFamily = ValueOf<typeof BrowserFamily>;

/** ICE connection type reported by the server (`client_meta.connection_type`); empty or unknown values become `other`. */
export const ConnectionType = {
	UDP: 'udp',
	TCP: 'tcp',
	TURN: 'turn',
	OTHER: 'other'
} as const;
export type ConnectionType = ValueOf<typeof ConnectionType>;

export const TrackType = {
	AUDIO: 'AUDIO',
	VIDEO: 'VIDEO',
	DATA: 'DATA'
} as const;
export type TrackType = ValueOf<typeof TrackType>;

export const TrackSource = {
	UNKNOWN: 'UNKNOWN',
	CAMERA: 'CAMERA',
	MICROPHONE: 'MICROPHONE',
	SCREEN_SHARE: 'SCREEN_SHARE',
	SCREEN_SHARE_AUDIO: 'SCREEN_SHARE_AUDIO'
} as const;
export type TrackSource = ValueOf<typeof TrackSource>;

export const TrackStatus = {
	PUBLISHED: 'published',
	UNPUBLISHED: 'unpublished'
} as const;
export type TrackStatus = ValueOf<typeof TrackStatus>;

export const VideoQuality = {
	LOW: 'LOW',
	MEDIUM: 'MEDIUM',
	HIGH: 'HIGH',
	OFF: 'OFF'
} as const;
export type VideoQuality = ValueOf<typeof VideoQuality>;

export const EncryptionType = {
	NONE: 'NONE',
	GCM: 'GCM',
	CUSTOM: 'CUSTOM'
} as const;
export type EncryptionType = ValueOf<typeof EncryptionType>;

export const SubscriptionStatus = {
	REQUESTED: 'requested',
	SUBSCRIBED: 'subscribed',
	UNSUBSCRIBED: 'unsubscribed',
	FAILED: 'failed'
} as const;
export type SubscriptionStatus = ValueOf<typeof SubscriptionStatus>;

export const EgressType = {
	ROOM_COMPOSITE: 'room_composite',
	WEB: 'web',
	PARTICIPANT: 'participant',
	TRACK_COMPOSITE: 'track_composite',
	TRACK: 'track'
} as const;
export type EgressType = ValueOf<typeof EgressType>;

export const EgressSourceType = {
	WEB: 'web',
	SDK: 'sdk'
} as const;
export type EgressSourceType = ValueOf<typeof EgressSourceType>;

export const EgressStatus = {
	STARTING: 'starting',
	ACTIVE: 'active',
	ENDING: 'ending',
	COMPLETE: 'complete',
	FAILED: 'failed',
	ABORTED: 'aborted',
	LIMIT_REACHED: 'limit_reached'
} as const;
export type EgressStatus = ValueOf<typeof EgressStatus>;

export const EgressOutputKind = {
	FILE: 'file',
	STREAM: 'stream',
	SEGMENTS: 'segments',
	IMAGES: 'images'
} as const;
export type EgressOutputKind = ValueOf<typeof EgressOutputKind>;

/** Status of a stream output (`StreamInfo.Status`). */
export const EgressStreamStatus = {
	ACTIVE: 'ACTIVE',
	FINISHED: 'FINISHED',
	FAILED: 'FAILED'
} as const;
export type EgressStreamStatus = ValueOf<typeof EgressStreamStatus>;

export const IngressInputType = {
	RTMP: 'rtmp',
	WHIP: 'whip',
	URL: 'url'
} as const;
export type IngressInputType = ValueOf<typeof IngressInputType>;

/** Status of an ingress definition: the state of its latest session, or `deleted`. */
export const IngressStatus = {
	INACTIVE: 'inactive',
	BUFFERING: 'buffering',
	PUBLISHING: 'publishing',
	ERROR: 'error',
	COMPLETE: 'complete',
	DELETED: 'deleted'
} as const;
export type IngressStatus = ValueOf<typeof IngressStatus>;

/** Status of one ingress publishing session; `buffering` and `publishing` are open. */
export const IngressSessionStatus = {
	BUFFERING: 'buffering',
	PUBLISHING: 'publishing',
	INACTIVE: 'inactive',
	ERROR: 'error',
	COMPLETE: 'complete'
} as const;
export type IngressSessionStatus = ValueOf<typeof IngressSessionStatus>;

export const StatsDirection = {
	UP: 'up',
	DOWN: 'down'
} as const;
export type StatsDirection = ValueOf<typeof StatsDirection>;

/** How the writer stores `track_stats`: one document per participant and direction, or per track and direction. */
export const StatsDetail = {
	PARTICIPANT: 'participant',
	TRACK: 'track'
} as const;
export type StatsDetail = ValueOf<typeof StatsDetail>;

export const MigrationState = {
	PENDING: 'pending',
	RUNNING: 'running',
	COMPLETED: 'completed',
	FAILED: 'failed'
} as const;
export type MigrationState = ValueOf<typeof MigrationState>;

/** Analytics event types that may be stored in `events`. `API_CALL` is never stored raw. */
export const StoredEventType = {
	ROOM_CREATED: 'ROOM_CREATED',
	ROOM_ENDED: 'ROOM_ENDED',
	PARTICIPANT_JOINED: 'PARTICIPANT_JOINED',
	PARTICIPANT_ACTIVE: 'PARTICIPANT_ACTIVE',
	PARTICIPANT_RESUMED: 'PARTICIPANT_RESUMED',
	PARTICIPANT_LEFT: 'PARTICIPANT_LEFT',
	PARTICIPANT_CONNECTION_ABORTED: 'PARTICIPANT_CONNECTION_ABORTED',
	TRACK_PUBLISH_REQUESTED: 'TRACK_PUBLISH_REQUESTED',
	TRACK_PUBLISHED: 'TRACK_PUBLISHED',
	TRACK_PUBLISHED_UPDATE: 'TRACK_PUBLISHED_UPDATE',
	TRACK_MUTED: 'TRACK_MUTED',
	TRACK_UNMUTED: 'TRACK_UNMUTED',
	TRACK_UNPUBLISHED: 'TRACK_UNPUBLISHED',
	TRACK_SUBSCRIBE_REQUESTED: 'TRACK_SUBSCRIBE_REQUESTED',
	TRACK_SUBSCRIBED: 'TRACK_SUBSCRIBED',
	TRACK_SUBSCRIBE_FAILED: 'TRACK_SUBSCRIBE_FAILED',
	TRACK_UNSUBSCRIBED: 'TRACK_UNSUBSCRIBED',
	TRACK_MAX_SUBSCRIBED_VIDEO_QUALITY: 'TRACK_MAX_SUBSCRIBED_VIDEO_QUALITY',
	TRACK_PUBLISH_STATS: 'TRACK_PUBLISH_STATS',
	TRACK_SUBSCRIBE_STATS: 'TRACK_SUBSCRIBE_STATS',
	EGRESS_STARTED: 'EGRESS_STARTED',
	EGRESS_UPDATED: 'EGRESS_UPDATED',
	EGRESS_ENDED: 'EGRESS_ENDED',
	INGRESS_CREATED: 'INGRESS_CREATED',
	INGRESS_STARTED: 'INGRESS_STARTED',
	INGRESS_UPDATED: 'INGRESS_UPDATED',
	INGRESS_ENDED: 'INGRESS_ENDED',
	INGRESS_DELETED: 'INGRESS_DELETED'
} as const;
export type StoredEventType = ValueOf<typeof StoredEventType>;

/** Types the writer projects but does not store raw unless `events.store_types` lists them. */
export const DEFAULT_UNSTORED_EVENT_TYPES: readonly StoredEventType[] = [
	StoredEventType.TRACK_PUBLISHED_UPDATE,
	StoredEventType.TRACK_MAX_SUBSCRIBED_VIDEO_QUALITY,
	StoredEventType.TRACK_SUBSCRIBE_REQUESTED
];
