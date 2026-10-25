import type {
	DailyRollupDocument,
	FiveMinuteRollupDocument,
	HourlyRollupDocument,
	TrackStatsDocument
} from '../../src/index.js';
import { ACTIVE_ROOM, at, between, DAY, NODE_ALPHA, NODE_BETA, P, T } from './scenario.js';

const statsAt = at('10:35:00');
const daveUp = { roomSid: ACTIVE_ROOM.sid, participantSid: P.dave, kind: 'up', nodeId: NODE_BETA } as const;
const daveDown = { ...daveUp, kind: 'down' } as const;

const cameraUp = {
	score: 4.2,
	minScore: 4,
	medianScore: 4.2,
	bytes: 3_000_000,
	packets: 2_900,
	packetsLost: 2,
	rttMs: 45,
	jitterMs: 3.2,
	nacks: 1,
	plis: 0,
	firs: 0,
	frames: 900,
	layers: [{ layer: 0, bytes: 3_000_000, packets: 2_900, frames: 900 }]
};

const microphoneUp = {
	score: 4,
	minScore: 3.9,
	medianScore: 4,
	bytes: 150_000,
	packets: 500,
	packetsLost: 0,
	rttMs: 44,
	jitterMs: 1.1,
	nacks: 0,
	plis: 0,
	firs: 0,
	frames: 0,
	layers: []
};

const ingressDown = {
	score: 4.3,
	minScore: 4.3,
	medianScore: 4.3,
	bytes: 16_875_000,
	packets: 12_000,
	packetsLost: 0,
	rttMs: 45,
	jitterMs: 2.1,
	nacks: 0,
	plis: 0,
	firs: 0,
	frames: 900,
	layers: [{ layer: 0, bytes: 16_875_000, packets: 12_000, frames: 900 }]
};

/** The same flush in `participant` detail (first two documents) and in `track` detail (last three). */
export const trackStats: TrackStatsDocument[] = [
	{
		ts: statsAt,
		meta: daveUp,
		score: 4.1,
		minScore: 3.9,
		medianScore: 4.1,
		bytes: 3_150_000,
		packets: 3_400,
		packetsLost: 2,
		rttMs: 45,
		jitterMs: 3.2,
		nacks: 1,
		plis: 0,
		firs: 0,
		frames: 900,
		layers: [{ layer: 0, bytes: 3_000_000, packets: 2_900, frames: 900 }]
	},
	{ ts: statsAt, meta: daveDown, ...ingressDown },
	{ ts: statsAt, meta: { ...daveUp, trackSid: T.daveCamera }, ...cameraUp, mimeType: 'video/H264' },
	{ ts: statsAt, meta: { ...daveUp, trackSid: T.daveMic }, ...microphoneUp, mimeType: 'audio/opus' },
	{ ts: statsAt, meta: { ...daveDown, trackSid: T.ingressVideo2 }, ...ingressDown, mimeType: 'video/H264' }
];

function rollupId(scope: string, bucket: Date): string {
	return `${scope}:${bucket.toISOString().replace('.000Z', 'Z')}`;
}

const fiveMinBucket = at('10:30:00');
const fiveMinCounters: Omit<FiveMinuteRollupDocument, '_id' | 'scope' | 'bucket'> = {
	participants: { connected: 3, joined: 1 },
	bytes: { up: 13_986_950, down: 12_811_470 },
	quality: { scoreSum: 21.6, scoreCount: 5 }
};

export const analytics5min: FiveMinuteRollupDocument[] = [
	{
		_id: rollupId('global', fiveMinBucket),
		scope: 'global',
		bucket: fiveMinBucket,
		...fiveMinCounters,
		internal: { connectedSids: [P.dave, P.ingress2, P.egressStreamer] }
	},
	{
		_id: rollupId(`node:${NODE_BETA}`, fiveMinBucket),
		scope: `node:${NODE_BETA}`,
		bucket: fiveMinBucket,
		...fiveMinCounters,
		internal: { connectedSids: [P.dave, P.ingress2, P.egressStreamer] }
	}
];

/** Participant minutes of the STANDARD sessions that left: (leftAt − joinedAt) / 60 000 each, as the writer adds them. */
function minutes(sessions: [Date, Date][]): number {
	return sessions.reduce((sum, [joinedAt, leftAt]) => sum + between(joinedAt, leftAt) / 60_000, 0);
}

const closedRoomMinutes = minutes([
	[at('09:00:05'), at('09:40:00')],
	[at('09:01:00'), at('09:10:00')],
	[at('09:10:02'), at('09:45:00')]
]);

const hourBucket = at('09:00:00');
const closedRoomHour: Omit<HourlyRollupDocument, '_id' | 'scope' | 'bucket'> = {
	rooms: { created: 1, ended: 1, endedByReason: { API_DELETE: 1 }, durationMsSum: 2_700_000, participantsSum: 4 },
	participants: {
		joined: 4,
		active: 3,
		aborted: 1,
		left: 3,
		byKind: { STANDARD: 4, EGRESS: 1, AGENT: 1, SIP: 1 },
		bySdk: { JS: 4 },
		byOs: { windows: 1, macos: 2, linux: 1 },
		byBrowser: { chrome: 2, safari: 2 },
		byConnectionType: { udp: 2, tcp: 1 },
		disconnectReasons: {
			CLIENT_INITIATED: 1,
			DUPLICATE_IDENTITY: 1,
			ROOM_DELETED: 1,
			CONNECTION_TIMEOUT: 1
		},
		connectTimeSumMs: 3_700,
		connectTimeCount: 3,
		minutes: closedRoomMinutes
	},
	tracks: { published: 2, subscribed: 2, subscribeFailed: 1 },
	egress: {
		started: 2,
		byType: { room_composite: 1, track: 1 },
		endedByStatus: { complete: 1, failed: 1 },
		durationMs: 2_340_000
	},
	bytes: { up: 385_000_000, down: 888_000_000 },
	quality: { scoreSum: 1267, scoreCount: 320, poor: 6 },
	apiCalls: {
		total: 6,
		byMethod: {
			RoomService_CreateRoom: 1,
			RoomService_DeleteRoom: 1,
			RoomService_ListParticipants: 2,
			Egress_StartRoomCompositeEgress: 1,
			Egress_StartTrackEgress: 1
		}
	},
	apiErrors: { total: 1, byMethod: { RoomService_ListParticipants: 1 } }
};

export const analyticsHourly: HourlyRollupDocument[] = [
	{
		_id: rollupId('global', hourBucket),
		scope: 'global',
		bucket: hourBucket,
		...closedRoomHour,
		// The ingresses created at 09:50 and 09:55 on node beta.
		apiCalls: {
			total: 8,
			byMethod: { ...closedRoomHour.apiCalls?.byMethod, Ingress_CreateIngress: 2 }
		}
	},
	{
		_id: rollupId(`node:${NODE_ALPHA}`, hourBucket),
		scope: `node:${NODE_ALPHA}`,
		bucket: hourBucket,
		...closedRoomHour
	}
];

const dayBucket = new Date(`${DAY}T00:00:00Z`);

export const analyticsDaily: DailyRollupDocument[] = [
	{
		_id: rollupId('global', dayBucket),
		scope: 'global',
		bucket: dayBucket,
		rooms: { created: 2, ended: 1, endedByReason: { API_DELETE: 1 }, durationMsSum: 2_700_000, participantsSum: 4 },
		participants: {
			joined: 6,
			active: 4,
			aborted: 1,
			left: 3,
			byKind: { STANDARD: 6, INGRESS: 2, EGRESS: 2, SIP: 1, AGENT: 1 },
			bySdk: { JS: 5, ANDROID: 1 },
			byOs: { windows: 1, macos: 3, linux: 1, android: 1 },
			byBrowser: { chrome: 2, safari: 2, firefox: 1, other: 1 },
			byConnectionType: { udp: 2, tcp: 1, turn: 1 },
			disconnectReasons: {
				CLIENT_INITIATED: 1,
				DUPLICATE_IDENTITY: 1,
				ROOM_DELETED: 1,
				CONNECTION_TIMEOUT: 1
			},
			connectTimeSumMs: 4_600,
			connectTimeCount: 4,
			minutes: closedRoomMinutes
		},
		tracks: { published: 6, subscribed: 4, subscribeFailed: 1 },
		egress: {
			started: 3,
			byType: { room_composite: 2, track: 1 },
			endedByStatus: { complete: 1, failed: 1 },
			durationMs: 2_340_000
		},
		ingress: { sessionsStarted: 2, sessionsEnded: 1, byInputType: { rtmp: 2 }, durationMs: 1_190_000 },
		bytes: { up: 483_800_000, down: 987_120_000 },
		quality: { scoreSum: 1753, scoreCount: 440, poor: 6 },
		apiCalls: {
			total: 9,
			byMethod: {
				RoomService_CreateRoom: 1,
				RoomService_DeleteRoom: 1,
				RoomService_ListParticipants: 2,
				Egress_StartRoomCompositeEgress: 2,
				Egress_StartTrackEgress: 1,
				Ingress_CreateIngress: 2
			}
		},
		apiErrors: { total: 1, byMethod: { RoomService_ListParticipants: 1 } },
		uniqueIdentities: 5
	},
	{
		_id: rollupId(`node:${NODE_ALPHA}`, dayBucket),
		scope: `node:${NODE_ALPHA}`,
		bucket: dayBucket,
		...closedRoomHour,
		uniqueIdentities: 3
	}
];
