import type {
	AgentOrigin,
	BrowserFamily,
	ClientSdk,
	ConnectionType,
	EgressStatus,
	EgressType,
	IngressInputType,
	IngressStatus,
	OsFamily,
	ParticipantKind,
	RoomTopology
} from '@openvidu-dashboard/typings';

/**
 * Sentence-case labels of the enum vocabularies shown outside status badges (kind badges, facts, chart categories,
 * filters). A value without a label shows as it is.
 */

/** The label of `value` in `labels`, the raw value when it has none, `—` when absent. */
export function enumLabel(labels: Readonly<Record<string, string>>, value: string | null | undefined): string {
	if (value === null || value === undefined || value === '') {
		return '—';
	}

	return labels[value] ?? value;
}

export const PARTICIPANT_KIND_LABELS: Readonly<Record<ParticipantKind, string>> = {
	STANDARD: 'Standard',
	INGRESS: 'Ingress',
	EGRESS: 'Egress',
	SIP: 'SIP',
	AGENT: 'Agent',
	CONNECTOR: 'Connector',
	BRIDGE: 'Bridge'
};

export const AGENT_ORIGIN_LABELS: Readonly<Record<AgentOrigin, string>> = {
	openvidu: 'OpenVidu',
	'third-party': 'Third-party'
};

/** Labels of the egress types, in the order breakdowns list them. */
export const EGRESS_TYPE_LABELS: Readonly<Record<EgressType, string>> = {
	room_composite: 'Room composite',
	web: 'Web',
	participant: 'Participant',
	track_composite: 'Track composite',
	track: 'Track'
};

/** Room topologies, from the emptiest to the most participative. */
export const ROOM_TOPOLOGY_LABELS: Readonly<Record<RoomTopology, string>> = {
	empty: 'Empty',
	single_participant: 'Single participant',
	no_publishers: 'No publishers',
	one_to_one: '1:1',
	one_to_many: '1:N',
	many_to_many: 'N:M'
};

/** Egress statuses outside the status badge, such as the status history. */
export const EGRESS_STATUS_LABELS: Readonly<Record<EgressStatus, string>> = {
	starting: 'Starting',
	active: 'Active',
	ending: 'Ending',
	complete: 'Complete',
	failed: 'Failed',
	aborted: 'Aborted',
	limit_reached: 'Limit reached'
};

export const INGRESS_STATUS_LABELS: Readonly<Record<IngressStatus, string>> = {
	inactive: 'Idle',
	buffering: 'Buffering',
	publishing: 'Publishing',
	error: 'Error',
	complete: 'Complete',
	deleted: 'Deleted'
};

export const INGRESS_INPUT_LABELS: Readonly<Record<IngressInputType, string>> = {
	rtmp: 'RTMP',
	whip: 'WHIP',
	url: 'URL'
};

export const SDK_LABELS: Readonly<Record<ClientSdk, string>> = {
	UNKNOWN: 'Unknown',
	JS: 'JavaScript',
	SWIFT: 'Swift',
	ANDROID: 'Android',
	FLUTTER: 'Flutter',
	GO: 'Go',
	UNITY: 'Unity',
	REACT_NATIVE: 'React Native',
	RUST: 'Rust',
	PYTHON: 'Python',
	CPP: 'C++',
	UNITY_WEB: 'Unity Web',
	NODE: 'Node.js',
	UNREAL: 'Unreal',
	ESP32: 'ESP32'
};

export const OS_LABELS: Readonly<Record<OsFamily, string>> = {
	windows: 'Windows',
	macos: 'macOS',
	linux: 'Linux',
	android: 'Android',
	ios: 'iOS',
	other: 'Other'
};

/** Family names a client may report as its OS, matched whole and case-insensitively, and their family. */
const REPORTED_OS: Readonly<Record<string, OsFamily>> = {
	windows: 'windows',
	macos: 'macos',
	'mac os': 'macos',
	linux: 'linux',
	android: 'android',
	ios: 'ios'
};

/** The OS a client reported, as its family label when it names one (`linux` reads "Linux"), else as reported. */
export function clientOsLabel(os: string | null | undefined): string {
	if (os === null || os === undefined || os.trim() === '') {
		return '—';
	}

	const family = REPORTED_OS[os.trim().toLowerCase()];

	return family === undefined ? os : OS_LABELS[family];
}

export const BROWSER_LABELS: Readonly<Record<BrowserFamily, string>> = {
	chrome: 'Chrome',
	firefox: 'Firefox',
	safari: 'Safari',
	edge: 'Edge',
	none: 'No browser',
	other: 'Other'
};

export const CONNECTION_TYPE_LABELS: Readonly<Record<ConnectionType, string>> = {
	udp: 'UDP',
	tcp: 'TCP',
	turn: 'TURN',
	other: 'Other'
};

/** The one explanation of a value estimated by the reconciler. */
export const RECONCILER_ESTIMATE = 'Closed by the reconciler: the end time is estimated';

/** An entity whose page warns when it has no media statistics. */
export type MediaStatsEntity = 'room' | 'participant' | 'track';

/**
 * Warnings of media statistics with no data: of one room, participant or track (`entity`), of a range none of whose
 * servers reported them (`rangeNone`), and of a table column with rows that have none (`column`).
 */
export const MEDIA_STATS_TEXTS = {
	entity: (entity: MediaStatsEntity): string => `No media statistics were recorded for this ${entity}.`,
	rangeNone: 'There is no data for the requested timeframe.',
	column: 'Rooms with no data for the requested timeframe show no value.'
} as const;

/** Why egress and ingress figures are missing in a node scope: they are counted for the whole deployment only. */
export const NODE_SCOPE_TEXTS = {
	egressIngress: 'Egress and ingress are not attributed to media nodes. Select All nodes in Scope to see them.'
} as const;
