import type { FeatureKey } from '@openvidu-dashboard/typings';

export interface FeatureCopy {
	title: string;
	description: string;
}

/** Title and explanation of every PRO feature, shown by its lock. */
export const FEATURE_COPY: Readonly<Record<FeatureKey, FeatureCopy>> = {
	'room-detail': {
		title: 'Room detail',
		description: 'Participants, live charts, egress, ingress, events timeline and metadata of each room.'
	},
	'participant-detail': {
		title: 'Participant detail',
		description: 'Quality over time, published and subscribed tracks, sessions of the identity and events.'
	},
	'egress-detail': {
		title: 'Egress detail',
		description: 'Outputs, status timeline, the sanitised request and errors of each egress.'
	},
	'ingress-detail': {
		title: 'Ingress detail',
		description: 'Stream settings, publishing sessions and the sanitised definition of each ingress.'
	},
	'analytics-quality': {
		title: 'Quality analytics',
		description: 'Average quality score with the MOS bands, and poor and lost samples over time.'
	},
	'analytics-diagnostics': {
		title: 'Diagnostics',
		description: 'Disconnect and room end reasons, subscribe failures and the API calls by method.'
	},
	'analytics-top-rooms': {
		title: 'Top rooms',
		description: 'The rooms with the most unique identities, duration or data transferred in the range.'
	},
	'track-detail': {
		title: 'Track statistics',
		description: 'Bitrate, packet loss, jitter, round-trip time and layers of each track.'
	},
	'per-node-breakdown': {
		title: 'Per-node breakdown',
		description: 'Rooms, participants and egress per OpenVidu node.'
	},
	'license-info': {
		title: 'License',
		description: 'Validity and key of the OpenVidu PRO license.'
	}
};
