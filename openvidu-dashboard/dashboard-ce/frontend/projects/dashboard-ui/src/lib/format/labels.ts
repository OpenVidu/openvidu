import type {
	ClientSdk,
	ConnectionType,
	EgressStatus,
	EgressType,
	IngressInputType,
	IngressStatus,
	OsFamily,
	ParticipantKind
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

/** Labels of the egress types, in the order breakdowns list them. */
export const EGRESS_TYPE_LABELS: Readonly<Record<EgressType, string>> = {
	room_composite: 'Room composite',
	web: 'Web',
	participant: 'Participant',
	track_composite: 'Track composite',
	track: 'Track'
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

export const CONNECTION_TYPE_LABELS: Readonly<Record<ConnectionType, string>> = {
	udp: 'UDP',
	tcp: 'TCP',
	turn: 'TURN',
	other: 'Other'
};

/** The one explanation of a value estimated by the reconciler. */
export const RECONCILER_ESTIMATE = 'Closed by the reconciler: the end time is estimated';
