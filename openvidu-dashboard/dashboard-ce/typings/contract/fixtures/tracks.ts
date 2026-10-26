import type { RtpFinalStats, TrackDocument, TrackSubscriptionDocument } from '../../src/index.js';
import { ACTIVE_ROOM, at, between, CLOSED_ROOM, P, plus, schemaVersion, T, TRACKS_RETENTION_MS } from './scenario.js';

const closedRoomSid = CLOSED_ROOM.sid;
const activeRoomSid = ACTIVE_ROOM.sid;

function unpublished(
	publishedAt: Date,
	unpublishedAt: Date
): Pick<TrackDocument, 'status' | 'publishedAt' | 'unpublishedAt' | 'durationMs' | 'closedBy' | 'expiresAt'> {
	return {
		status: 'unpublished',
		publishedAt,
		unpublishedAt,
		durationMs: between(publishedAt, unpublishedAt),
		closedBy: 'event',
		expiresAt: plus(unpublishedAt, TRACKS_RETENTION_MS)
	};
}

function finalStats(durationMs: number, bytes: number, packets: number, packetsLost: number): RtpFinalStats {
	return {
		bytes,
		packets,
		packetsLost,
		packetLossPct: Math.round((packetsLost / packets) * 10_000) / 100,
		nacks: Math.round(packetsLost / 3),
		plis: 2,
		firs: 0,
		rttMaxMs: 85,
		jitterMaxMs: 12.5,
		durationMs
	};
}

export const tracks: TrackDocument[] = [
	{
		_id: T.aliceCamera,
		roomSid: closedRoomSid,
		participantSid: P.alice,
		identity: 'alice',
		type: 'VIDEO',
		source: 'CAMERA',
		mimeType: 'video/VP8',
		name: 'camera',
		...unpublished(at('09:00:08'), at('09:40:00')),
		muted: false,
		width: 1280,
		height: 720,
		simulcast: true,
		codecs: [
			{
				mimeType: 'video/VP8',
				layers: [
					{ quality: 'LOW', width: 320, height: 180, bitrate: 150_000 },
					{ quality: 'MEDIUM', width: 640, height: 360, bitrate: 500_000 },
					{ quality: 'HIGH', width: 1280, height: 720, bitrate: 1_700_000 }
				]
			}
		],
		encryption: 'NONE',
		subscribers: { current: 0, total: 2, failed: 0 },
		publishStats: {
			...finalStats(2_392_000, 365_000_000, 310_000, 120),
			layers: [
				{ layer: 0, bytes: 45_000_000, packets: 52_000, frames: 35_880 },
				{ layer: 1, bytes: 100_000_000, packets: 98_000, frames: 71_760 },
				{ layer: 2, bytes: 220_000_000, packets: 160_000, frames: 71_760 }
			]
		},
		schemaVersion
	},
	{
		_id: T.aliceMic,
		roomSid: closedRoomSid,
		participantSid: P.alice,
		identity: 'alice',
		type: 'AUDIO',
		source: 'MICROPHONE',
		mimeType: 'audio/opus',
		name: 'microphone',
		...unpublished(at('09:00:08'), at('09:40:00')),
		muted: false,
		codecs: [{ mimeType: 'audio/opus' }],
		encryption: 'NONE',
		subscribers: { current: 0, total: 0, failed: 1 },
		publishStats: { ...finalStats(2_392_000, 9_600_000, 119_600, 30), layers: [] },
		schemaVersion
	},
	{
		_id: T.daveCamera,
		roomSid: activeRoomSid,
		participantSid: P.dave,
		identity: 'dave',
		type: 'VIDEO',
		source: 'CAMERA',
		mimeType: 'video/H264',
		name: 'camera',
		status: 'published',
		publishedAt: at('10:00:06'),
		muted: false,
		width: 640,
		height: 480,
		simulcast: false,
		codecs: [{ mimeType: 'video/H264', layers: [{ quality: 'HIGH', width: 640, height: 480, bitrate: 800_000 }] }],
		encryption: 'NONE',
		subscribers: { current: 0, total: 0, failed: 0 },
		schemaVersion,
		expiresAt: null
	},
	{
		_id: T.daveMic,
		roomSid: activeRoomSid,
		participantSid: P.dave,
		identity: 'dave',
		type: 'AUDIO',
		source: 'MICROPHONE',
		mimeType: 'audio/opus',
		name: 'microphone',
		status: 'published',
		publishedAt: at('10:00:06'),
		muted: true,
		codecs: [{ mimeType: 'audio/opus' }],
		encryption: 'NONE',
		subscribers: { current: 0, total: 0, failed: 0 },
		schemaVersion,
		expiresAt: null
	},
	{
		_id: T.ingressVideo1,
		roomSid: activeRoomSid,
		participantSid: P.ingress1,
		identity: 'obs-studio',
		type: 'VIDEO',
		source: 'CAMERA',
		mimeType: 'video/H264',
		...unpublished(at('10:00:12'), at('10:20:00')),
		muted: false,
		width: 1920,
		height: 1080,
		simulcast: false,
		codecs: [
			{ mimeType: 'video/H264', layers: [{ quality: 'HIGH', width: 1920, height: 1080, bitrate: 4_500_000 }] }
		],
		encryption: 'NONE',
		subscribers: { current: 0, total: 1, failed: 0 },
		publishStats: {
			...finalStats(1_188_000, 668_000_000, 480_000, 40),
			layers: [{ layer: 0, bytes: 668_000_000, packets: 480_000, frames: 35_640 }]
		},
		schemaVersion
	},
	{
		_id: T.ingressVideo2,
		roomSid: activeRoomSid,
		participantSid: P.ingress2,
		identity: 'obs-studio',
		type: 'VIDEO',
		source: 'CAMERA',
		mimeType: 'video/H264',
		status: 'published',
		publishedAt: at('10:30:02'),
		muted: false,
		width: 1920,
		height: 1080,
		simulcast: false,
		codecs: [
			{ mimeType: 'video/H264', layers: [{ quality: 'HIGH', width: 1920, height: 1080, bitrate: 4_500_000 }] }
		],
		encryption: 'NONE',
		subscribers: { current: 1, total: 1, failed: 0 },
		internal: { subscriberSids: [P.dave] },
		schemaVersion,
		expiresAt: null
	}
];

function subscriptionId(trackSid: string, subscriberSid: string): string {
	return `${trackSid}:${subscriberSid}`;
}

export const trackSubscriptions: TrackSubscriptionDocument[] = [
	{
		_id: subscriptionId(T.aliceCamera, P.bob1),
		trackSid: T.aliceCamera,
		roomSid: closedRoomSid,
		subscriberSid: P.bob1,
		subscriberIdentity: 'bob',
		publisherSid: P.alice,
		publisherIdentity: 'alice',
		source: 'CAMERA',
		status: 'unsubscribed',
		subscribedAt: at('09:01:05'),
		unsubscribedAt: at('09:10:00'),
		durationMs: between(at('09:01:05'), at('09:10:00')),
		closedBy: 'event',
		subscribeStats: finalStats(535_000, 110_000_000, 95_000, 60),
		schemaVersion,
		expiresAt: plus(at('09:10:00'), TRACKS_RETENTION_MS)
	},
	{
		_id: subscriptionId(T.aliceCamera, P.bob2),
		trackSid: T.aliceCamera,
		roomSid: closedRoomSid,
		subscriberSid: P.bob2,
		subscriberIdentity: 'bob',
		publisherSid: P.alice,
		publisherIdentity: 'alice',
		source: 'CAMERA',
		status: 'unsubscribed',
		subscribedAt: at('09:10:05'),
		unsubscribedAt: at('09:40:00'),
		durationMs: between(at('09:10:05'), at('09:40:00')),
		closedBy: 'event',
		subscribeStats: finalStats(1_795_000, 180_000_000, 170_000, 900),
		schemaVersion,
		expiresAt: plus(at('09:40:00'), TRACKS_RETENTION_MS)
	},
	{
		_id: subscriptionId(T.aliceMic, P.bob2),
		trackSid: T.aliceMic,
		roomSid: closedRoomSid,
		subscriberSid: P.bob2,
		subscriberIdentity: 'bob',
		publisherSid: P.alice,
		publisherIdentity: 'alice',
		source: 'MICROPHONE',
		status: 'failed',
		error: 'could not find published track',
		schemaVersion,
		expiresAt: plus(at('09:10:06'), TRACKS_RETENTION_MS)
	},
	{
		_id: subscriptionId(T.daveCamera, P.erin),
		trackSid: T.daveCamera,
		roomSid: activeRoomSid,
		subscriberSid: P.erin,
		subscriberIdentity: 'erin',
		publisherSid: P.dave,
		publisherIdentity: 'dave',
		source: 'CAMERA',
		status: 'requested',
		schemaVersion,
		expiresAt: null
	},
	{
		_id: subscriptionId(T.ingressVideo1, P.dave),
		trackSid: T.ingressVideo1,
		roomSid: activeRoomSid,
		subscriberSid: P.dave,
		subscriberIdentity: 'dave',
		publisherSid: P.ingress1,
		publisherIdentity: 'obs-studio',
		source: 'CAMERA',
		status: 'unsubscribed',
		subscribedAt: at('10:00:15'),
		unsubscribedAt: at('10:20:00'),
		durationMs: between(at('10:00:15'), at('10:20:00')),
		closedBy: 'event',
		subscribeStats: finalStats(1_185_000, 660_000_000, 470_000, 15),
		schemaVersion,
		expiresAt: plus(at('10:20:00'), TRACKS_RETENTION_MS)
	},
	{
		_id: subscriptionId(T.ingressVideo2, P.dave),
		trackSid: T.ingressVideo2,
		roomSid: activeRoomSid,
		subscriberSid: P.dave,
		subscriberIdentity: 'dave',
		publisherSid: P.ingress2,
		publisherIdentity: 'obs-studio',
		source: 'CAMERA',
		status: 'subscribed',
		subscribedAt: at('10:30:05'),
		schemaVersion,
		expiresAt: null
	}
];
