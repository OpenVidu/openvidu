import type { EventDocument } from '../../src/index.js';
import {
	ACTIVE_ROOM,
	at,
	CLOSED_ROOM,
	EG,
	f64,
	i32,
	i64,
	IN,
	INGRESS_SESSION,
	NODE_ALPHA,
	NODE_BETA,
	P,
	REGION,
	T,
	unixMs,
	unixNs,
	unixSeconds
} from './scenario.js';
import { recordingRequest } from './egress-ingress.js';

/**
 * One stored raw event of every type of the default `events.store_types`. Payloads follow protojson naming, nest the set
 * member of a oneof under the oneof name (`request: { room_composite }`, `options: { preset }`) and omit proto3 zero
 * values (`STANDARD`, `JOINING`, `AUDIO`, `EGRESS_STARTING`, `ENDPOINT_INACTIVE`, `false`, `0`), as the
 * writer's codec does; nothing outside the allow-list (TURN password, credentials, stream keys, metadata) appears.
 */

const closedRoomMin = { sid: CLOSED_ROOM.sid, name: CLOSED_ROOM.name };
const activeRoomMin = { sid: ACTIVE_ROOM.sid, name: ACTIVE_ROOM.name };

const closedRoomFull = {
	...closedRoomMin,
	empty_timeout: i32(300),
	departure_timeout: i32(20),
	max_participants: i32(20),
	creation_time: unixSeconds(at('09:00:00')),
	creation_time_ms: unixMs(at('09:00:00')),
	enabled_codecs: [{ mime: 'audio/opus' }, { mime: 'video/VP8' }, { mime: 'video/H264' }]
};

const permission = { can_subscribe: true, can_publish: true, can_publish_data: true };

function participantInfo(sid: string, identity: string, name: string, joinedAt: Date): Record<string, unknown> {
	return {
		sid,
		identity,
		...(name ? { name } : {}),
		joined_at: unixSeconds(joinedAt),
		joined_at_ms: unixMs(joinedAt),
		permission,
		region: REGION
	};
}

const aliceInfo = participantInfo(P.alice, 'alice', 'Alice', at('09:00:05'));
const daveInfo = participantInfo(P.dave, 'dave', 'Dave', at('10:00:03'));

const aliceCameraLayers = [
	{ width: i32(320), height: i32(180), bitrate: i32(150_000) },
	{ quality: 'MEDIUM', width: i32(640), height: i32(360), bitrate: i32(500_000) },
	{ quality: 'HIGH', width: i32(1280), height: i32(720), bitrate: i32(1_700_000) }
];

const aliceCameraInfo = {
	sid: T.aliceCamera,
	type: 'VIDEO',
	name: 'camera',
	width: i32(1280),
	height: i32(720),
	simulcast: true,
	source: 'CAMERA',
	mime_type: 'video/VP8',
	layers: aliceCameraLayers,
	codecs: [{ mime_type: 'video/VP8', mid: '1', cid: 'camera-vp8', layers: aliceCameraLayers }],
	stream: 'camera'
};

function rtpStats(start: Date, end: Date, packets: number, bytes: number, lost: number): Record<string, unknown> {
	const seconds = (end.getTime() - start.getTime()) / 1000;

	return {
		start_time: start,
		end_time: end,
		duration: f64(seconds),
		packets: i32(packets),
		packet_rate: f64(Math.round((packets / seconds) * 100) / 100),
		bytes: i64(bytes),
		bitrate: f64(Math.round(((bytes * 8) / seconds) * 100) / 100),
		packets_lost: i32(lost),
		packet_loss_rate: f64(Math.round((lost / seconds) * 1000) / 1000),
		packet_loss_percentage: f64(Math.round((lost / packets) * 10_000) / 100),
		frames: i32(Math.round(seconds * 30)),
		jitter_current: f64(4_200),
		jitter_max: f64(12_500),
		nacks: i32(Math.round(lost / 3)),
		plis: i32(2),
		rtt_current: i32(40),
		rtt_max: i32(85)
	};
}

const recordingEgress = {
	egress_id: EG.recording,
	room_id: CLOSED_ROOM.sid,
	room_name: CLOSED_ROOM.name,
	started_at: unixNs(at('09:02:00')),
	request: recordingRequest
};

const rtmpIngress = {
	ingress_id: IN.rtmp,
	name: 'OBS Studio',
	url: 'rtmp://ingress.example.com/x',
	room_name: ACTIVE_ROOM.name,
	participant_identity: 'obs-studio',
	participant_name: 'OBS',
	reusable: true,
	enabled: true,
	enable_transcoding: true
};

const ingressVideo = {
	mime_type: 'video/h264',
	average_bitrate: i32(4_200_000),
	width: i32(1920),
	height: i32(1080),
	framerate: f64(30)
};
const ingressAudio = {
	mime_type: 'audio/opus',
	average_bitrate: i32(128_000),
	channels: i32(2),
	sample_rate: i32(48_000)
};

type ClosedRoomRefs = Pick<EventDocument, 'roomSid' | 'roomName' | 'nodeId' | 'synthetic'>;

const closedRoom: ClosedRoomRefs = {
	roomSid: CLOSED_ROOM.sid,
	roomName: CLOSED_ROOM.name,
	nodeId: NODE_ALPHA,
	synthetic: false
};
const activeRoom: ClosedRoomRefs = {
	roomSid: ACTIVE_ROOM.sid,
	roomName: ACTIVE_ROOM.name,
	nodeId: NODE_BETA,
	synthetic: false
};

export const events: EventDocument[] = [
	{
		_id: 'AE_rmCreated0001',
		type: 'ROOM_CREATED',
		ts: at('09:00:00'),
		...closedRoom,
		payload: { room: closedRoomFull }
	},
	{
		_id: 'AE_paJoined00001',
		type: 'PARTICIPANT_JOINED',
		ts: at('09:00:05'),
		...closedRoom,
		participantSid: P.alice,
		identity: 'alice',
		payload: {
			room: closedRoomMin,
			participant: aliceInfo,
			client_info: {
				sdk: 'JS',
				version: '2.15.7',
				protocol: i32(16),
				os: 'Windows',
				os_version: '11',
				browser: 'Chrome',
				browser_version: '130.0.0.0',
				address: '203.0.113.10',
				network: 'wifi'
			},
			client_meta: { region: REGION, node: NODE_ALPHA }
		}
	},
	{
		_id: 'AE_paActive00001',
		type: 'PARTICIPANT_ACTIVE',
		ts: at('09:00:06.200'),
		...closedRoom,
		participantSid: P.alice,
		identity: 'alice',
		payload: {
			room: closedRoomMin,
			participant: { ...aliceInfo, state: 'ACTIVE' },
			client_meta: { client_connect_time: i32(1200), connection_type: 'udp' }
		}
	},
	{
		_id: 'AE_trPubReq00001',
		type: 'TRACK_PUBLISH_REQUESTED',
		ts: at('09:00:07'),
		...closedRoom,
		participantSid: P.alice,
		identity: 'alice',
		trackSid: T.aliceCamera,
		payload: {
			room: closedRoomMin,
			participant: { sid: P.alice, identity: 'alice' },
			track: {
				sid: T.aliceCamera,
				type: 'VIDEO',
				name: 'camera',
				width: i32(1280),
				height: i32(720),
				simulcast: true,
				source: 'CAMERA'
			}
		}
	},
	{
		_id: 'AE_trPublish0001',
		type: 'TRACK_PUBLISHED',
		ts: at('09:00:08'),
		...closedRoom,
		participantSid: P.alice,
		identity: 'alice',
		trackSid: T.aliceCamera,
		payload: { room: closedRoomMin, participant: { sid: P.alice, identity: 'alice' }, track: aliceCameraInfo }
	},
	{
		_id: 'AE_trSubscribe01',
		type: 'TRACK_SUBSCRIBED',
		ts: at('09:01:05'),
		...closedRoom,
		participantSid: P.bob1,
		identity: 'bob',
		trackSid: T.aliceCamera,
		payload: {
			room: closedRoomMin,
			participant: { sid: P.bob1 },
			track: aliceCameraInfo,
			publisher: { sid: P.alice, identity: 'alice' }
		}
	},
	{
		_id: 'AE_egStarted0001',
		type: 'EGRESS_STARTED',
		ts: at('09:02:00'),
		...closedRoom,
		egressId: EG.recording,
		payload: { egress: { ...recordingEgress, updated_at: unixNs(at('09:02:00')) } }
	},
	{
		_id: 'AE_egUpdated0001',
		type: 'EGRESS_UPDATED',
		ts: at('09:02:04'),
		...closedRoom,
		egressId: EG.recording,
		payload: { egress: { ...recordingEgress, status: 'EGRESS_ACTIVE', updated_at: unixNs(at('09:02:04')) } }
	},
	{
		_id: 'AE_paAborted0001',
		type: 'PARTICIPANT_CONNECTION_ABORTED',
		ts: at('09:05:20'),
		...closedRoom,
		participantSid: P.carol,
		identity: 'Carol',
		payload: {
			room: closedRoomMin,
			participant: {
				...participantInfo(P.carol, 'Carol', '', at('09:05:00')),
				state: 'DISCONNECTED',
				disconnect_reason: 'CONNECTION_TIMEOUT'
			}
		}
	},
	{
		_id: 'AE_trUnsubscr001',
		type: 'TRACK_UNSUBSCRIBED',
		ts: at('09:10:00'),
		...closedRoom,
		participantSid: P.bob1,
		identity: 'bob',
		trackSid: T.aliceCamera,
		payload: { room: closedRoomMin, participant: { sid: P.bob1 }, track: { sid: T.aliceCamera, type: 'VIDEO' } }
	},
	{
		_id: 'AE_trSubStats001',
		type: 'TRACK_SUBSCRIBE_STATS',
		ts: at('09:10:00'),
		...closedRoom,
		participantSid: P.bob1,
		identity: 'bob',
		trackSid: T.aliceCamera,
		payload: {
			room: closedRoomMin,
			mime: 'video/VP8',
			rtp_stats: rtpStats(at('09:01:05'), at('09:10:00'), 95_000, 110_000_000, 60)
		}
	},
	{
		_id: 'AE_trSubFail0001',
		type: 'TRACK_SUBSCRIBE_FAILED',
		ts: at('09:10:06'),
		...closedRoom,
		participantSid: P.bob2,
		identity: 'bob',
		trackSid: T.aliceMic,
		payload: {
			room: closedRoomMin,
			participant: { sid: P.bob2 },
			track: { sid: T.aliceMic },
			error: 'could not find published track'
		}
	},
	{
		_id: 'AE_trUnmuted0001',
		type: 'TRACK_UNMUTED',
		ts: at('09:13:00'),
		...closedRoom,
		participantSid: P.alice,
		identity: 'alice',
		trackSid: T.aliceMic,
		payload: {
			room: closedRoomMin,
			participant: { sid: P.alice },
			track: { sid: T.aliceMic, name: 'microphone', source: 'MICROPHONE', mime_type: 'audio/opus' }
		}
	},
	{
		_id: 'AE_trUnpublish01',
		type: 'TRACK_UNPUBLISHED',
		ts: at('09:40:00'),
		...closedRoom,
		participantSid: P.alice,
		identity: 'alice',
		trackSid: T.aliceCamera,
		payload: { room: closedRoomMin, participant: { sid: P.alice }, track: aliceCameraInfo }
	},
	{
		_id: 'AE_trPubStats001',
		type: 'TRACK_PUBLISH_STATS',
		ts: at('09:40:00'),
		...closedRoom,
		participantSid: P.alice,
		identity: 'alice',
		trackSid: T.aliceCamera,
		payload: {
			room: closedRoomMin,
			mime: 'video/VP8',
			video_layer: i32(2),
			rtp_stats: rtpStats(at('09:00:08'), at('09:40:00'), 160_000, 220_000_000, 50)
		}
	},
	{
		_id: 'AE_paLeft0000001',
		type: 'PARTICIPANT_LEFT',
		ts: at('09:40:00'),
		...closedRoom,
		participantSid: P.alice,
		identity: 'alice',
		payload: {
			room: closedRoomMin,
			participant: {
				...aliceInfo,
				state: 'DISCONNECTED',
				is_publisher: true,
				disconnect_reason: 'CLIENT_INITIATED'
			}
		}
	},
	{
		_id: 'AE_SYN_PA_ag3ntAssist1',
		type: 'PARTICIPANT_LEFT',
		ts: at('09:44:30'),
		...closedRoom,
		synthetic: true,
		participantSid: P.agent,
		identity: 'agent-assistant',
		payload: {
			room: closedRoomMin,
			participant: { sid: P.agent, identity: 'agent-assistant', disconnect_reason: 'RECONCILED' },
			reconciler: { reason: 'absent-live' }
		}
	},
	{
		_id: 'AE_egEnded000001',
		type: 'EGRESS_ENDED',
		ts: at('09:40:20'),
		...closedRoom,
		egressId: EG.recording,
		payload: {
			egress: {
				...recordingEgress,
				status: 'EGRESS_COMPLETE',
				ended_at: unixNs(at('09:40:20')),
				updated_at: unixNs(at('09:40:20')),
				file_results: [
					{
						filename: 'recordings/daily-standup-2026-10-12.mp4',
						started_at: unixNs(at('09:02:04')),
						ended_at: unixNs(at('09:40:18')),
						duration: i64(2_294_000).multiply(1_000_000),
						size: i64(512_000_000),
						location: 'https://storage.example.com/recordings/daily-standup-2026-10-12.mp4'
					}
				]
			}
		}
	},
	{
		_id: 'AE_rmEnded000001',
		type: 'ROOM_ENDED',
		ts: at('09:45:00'),
		...closedRoom,
		payload: { room: closedRoomFull, room_end_reason: 'ROOM_END_API_DELETE' }
	},
	{
		_id: 'AE_inCreated0001',
		type: 'INGRESS_CREATED',
		ts: at('09:55:00'),
		roomName: ACTIVE_ROOM.name,
		ingressId: IN.rtmp,
		nodeId: NODE_BETA,
		synthetic: false,
		payload: { ingress: { ...rtmpIngress, state: {} } }
	},
	{
		_id: 'AE_inDeleted0001',
		type: 'INGRESS_DELETED',
		ts: at('09:58:00'),
		roomName: ACTIVE_ROOM.name,
		ingressId: IN.whipDeleted,
		nodeId: NODE_BETA,
		synthetic: false,
		payload: {
			ingress: {
				ingress_id: IN.whipDeleted,
				name: 'Browser WHIP',
				url: 'https://ingress.example.com/w',
				input_type: 'WHIP_INPUT',
				room_name: ACTIVE_ROOM.name,
				participant_identity: 'whip-publisher',
				enabled: true,
				state: {}
			}
		}
	},
	{
		_id: 'AE_trMuted000001',
		type: 'TRACK_MUTED',
		ts: at('10:10:00'),
		...activeRoom,
		participantSid: P.dave,
		identity: 'dave',
		trackSid: T.daveMic,
		payload: {
			room: activeRoomMin,
			participant: { sid: P.dave },
			track: { sid: T.daveMic, name: 'microphone', muted: true, source: 'MICROPHONE', mime_type: 'audio/opus' }
		}
	},
	{
		_id: 'AE_paResumed0001',
		type: 'PARTICIPANT_RESUMED',
		ts: at('10:15:00'),
		...activeRoom,
		participantSid: P.dave,
		identity: 'dave',
		payload: {
			room: activeRoomMin,
			participant: { ...daveInfo, state: 'ACTIVE', is_publisher: true },
			client_meta: { node: NODE_BETA, reconnect_reason: 'RR_SIGNAL_DISCONNECTED' }
		}
	},
	{
		_id: 'AE_inEnded000001',
		type: 'INGRESS_ENDED',
		ts: at('10:20:00'),
		...activeRoom,
		ingressId: IN.rtmp,
		ingressSessionId: INGRESS_SESSION.first,
		payload: {
			ingress: {
				...rtmpIngress,
				state: {
					room_id: ACTIVE_ROOM.sid,
					started_at: unixNs(at('10:00:10')),
					ended_at: unixNs(at('10:20:00')),
					updated_at: unixNs(at('10:20:00')),
					resource_id: INGRESS_SESSION.first
				}
			}
		}
	},
	{
		_id: 'AE_inUpdated0001',
		type: 'INGRESS_UPDATED',
		ts: at('10:29:58'),
		...activeRoom,
		ingressId: IN.rtmp,
		ingressSessionId: INGRESS_SESSION.second,
		payload: {
			ingress: {
				...rtmpIngress,
				state: {
					status: 'ENDPOINT_BUFFERING',
					room_id: ACTIVE_ROOM.sid,
					started_at: unixNs(at('10:29:58')),
					updated_at: unixNs(at('10:29:58')),
					resource_id: INGRESS_SESSION.second
				}
			}
		}
	},
	{
		_id: 'AE_inStarted0001',
		type: 'INGRESS_STARTED',
		ts: at('10:30:00'),
		...activeRoom,
		ingressId: IN.rtmp,
		ingressSessionId: INGRESS_SESSION.second,
		payload: {
			ingress: {
				...rtmpIngress,
				state: {
					status: 'ENDPOINT_PUBLISHING',
					video: ingressVideo,
					audio: ingressAudio,
					room_id: ACTIVE_ROOM.sid,
					started_at: unixNs(at('10:29:58')),
					updated_at: unixNs(at('10:30:00')),
					resource_id: INGRESS_SESSION.second
				}
			}
		}
	}
];
