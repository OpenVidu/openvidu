/** PRO features; CE reports none and shows them locked. Changes that add a PRO feature add its key here. */
export const FeatureKey = {
	ROOM_DETAIL: 'room-detail',
	PARTICIPANT_DETAIL: 'participant-detail',
	EGRESS_DETAIL: 'egress-detail',
	INGRESS_DETAIL: 'ingress-detail',
	ANALYTICS_QUALITY: 'analytics-quality',
	ANALYTICS_DIAGNOSTICS: 'analytics-diagnostics',
	ANALYTICS_TOP_ROOMS: 'analytics-top-rooms',
	TRACK_DETAIL: 'track-detail',
	PER_NODE_BREAKDOWN: 'per-node-breakdown',
	LICENSE_INFO: 'license-info'
} as const;
export type FeatureKey = (typeof FeatureKey)[keyof typeof FeatureKey];
