import type { EgressDocument, IngressDocument, IngressSessionDocument } from '../../src/index.js';
import {
	ACTIVE_ROOM,
	at,
	between,
	CLOSED_ROOM,
	EG,
	ENTITIES_RETENTION_MS,
	i64,
	IN,
	INGRESS_SESSION,
	plus,
	schemaVersion
} from './scenario.js';

const recordingStart = at('09:02:00');
const recordingEnd = at('09:40:20');
const failedStart = at('09:30:00');
const failedEnd = at('09:30:40');

export const egresses: EgressDocument[] = [
	{
		_id: EG.recording,
		roomSid: CLOSED_ROOM.sid,
		roomName: CLOSED_ROOM.name,
		roomNameLower: CLOSED_ROOM.name.toLowerCase(),
		type: 'room_composite',
		sourceType: 'web',
		status: 'complete',
		closedBy: 'event',
		startedAt: recordingStart,
		updatedAt: recordingEnd,
		endedAt: recordingEnd,
		durationMs: between(recordingStart, recordingEnd),
		request: { layout: 'speaker', preset: 'H264_720P_30', outputs: ['file'] },
		outputs: [
			{
				kind: 'file',
				filename: 'recordings/daily-standup-2026-10-12.mp4',
				location: 'https://storage.example.com/recordings/daily-standup-2026-10-12.mp4',
				size: 512_000_000,
				durationMs: 2_294_000,
				startedAt: at('09:02:04'),
				endedAt: at('09:40:18')
			}
		],
		statusHistory: [
			{ status: 'starting', at: recordingStart },
			{ status: 'active', at: at('09:02:04') },
			{ status: 'ending', at: at('09:40:06') },
			{ status: 'complete', at: recordingEnd }
		],
		retryCount: 0,
		backupStorageUsed: false,
		schemaVersion,
		expiresAt: plus(recordingEnd, ENTITIES_RETENTION_MS)
	},
	{
		_id: EG.trackFailed,
		roomSid: CLOSED_ROOM.sid,
		roomName: CLOSED_ROOM.name,
		roomNameLower: CLOSED_ROOM.name.toLowerCase(),
		type: 'track',
		sourceType: 'sdk',
		status: 'failed',
		closedBy: 'event',
		startedAt: failedStart,
		updatedAt: failedEnd,
		endedAt: failedEnd,
		durationMs: between(failedStart, failedEnd),
		error: 'upload failed: access denied',
		errorCode: 403,
		request: { trackId: 'TR_aLiceMic0pus', outputs: ['file'] },
		outputs: [
			{ kind: 'file', filename: 'tracks/alice-microphone.ogg', startedAt: failedStart, endedAt: failedEnd }
		],
		statusHistory: [
			{ status: 'starting', at: failedStart },
			{ status: 'failed', at: failedEnd }
		],
		retryCount: 1,
		backupStorageUsed: false,
		schemaVersion,
		expiresAt: plus(failedEnd, ENTITIES_RETENTION_MS)
	},
	{
		_id: EG.streaming,
		roomSid: ACTIVE_ROOM.sid,
		roomName: ACTIVE_ROOM.name,
		roomNameLower: ACTIVE_ROOM.name.toLowerCase(),
		type: 'room_composite',
		sourceType: 'web',
		status: 'active',
		startedAt: at('10:05:00'),
		updatedAt: at('10:05:03'),
		request: { layout: 'grid', preset: 'H264_1080P_30', outputs: ['stream', 'segments'] },
		outputs: [
			{ kind: 'stream', url: 'rtmps://live.example.com/app/***', status: 'ACTIVE', startedAt: at('10:05:03') },
			{
				kind: 'segments',
				playlistName: 'webinar-q4/playlist.m3u8',
				location: 'https://storage.example.com/webinar-q4/playlist.m3u8',
				startedAt: at('10:05:03')
			}
		],
		statusHistory: [
			{ status: 'starting', at: at('10:05:00') },
			{ status: 'active', at: at('10:05:03') }
		],
		retryCount: 0,
		backupStorageUsed: false,
		schemaVersion,
		expiresAt: null
	}
];

const firstSessionStart = at('10:00:10');
const firstSessionEnd = at('10:20:00');
const whipDeletedAt = at('09:58:00');

export const ingresses: IngressDocument[] = [
	{
		_id: IN.rtmp,
		name: 'OBS Studio',
		nameLower: 'obs studio',
		inputType: 'rtmp',
		url: 'rtmp://ingress.example.com/x',
		roomName: ACTIVE_ROOM.name,
		participantIdentity: 'obs-studio',
		participantName: 'OBS',
		reusable: true,
		enabled: true,
		enableTranscoding: true,
		createdAt: at('09:55:00'),
		status: 'publishing',
		sessions: 2,
		totalDurationMs: between(firstSessionStart, firstSessionEnd),
		lastSessionAt: at('10:29:58'),
		internal: {
			endedSessionDurations: { [INGRESS_SESSION.first]: i64(between(firstSessionStart, firstSessionEnd)) }
		},
		schemaVersion,
		expiresAt: null
	},
	{
		_id: IN.whipDeleted,
		name: 'Browser WHIP',
		nameLower: 'browser whip',
		inputType: 'whip',
		url: 'https://ingress.example.com/w',
		roomName: ACTIVE_ROOM.name,
		participantIdentity: 'whip-publisher',
		reusable: false,
		enabled: true,
		createdAt: at('09:50:00'),
		deletedAt: whipDeletedAt,
		status: 'deleted',
		sessions: 0,
		totalDurationMs: 0,
		schemaVersion,
		expiresAt: plus(whipDeletedAt, ENTITIES_RETENTION_MS)
	}
];

const video = { mimeType: 'video/h264', averageBitrate: 4_500_000, width: 1920, height: 1080, framerate: 30 };
const audio = { mimeType: 'audio/opus', averageBitrate: 128_000, channels: 2, sampleRate: 48_000 };

export const ingressSessions: IngressSessionDocument[] = [
	{
		_id: INGRESS_SESSION.first,
		ingressId: IN.rtmp,
		ingressName: 'OBS Studio',
		inputType: 'rtmp',
		roomSid: ACTIVE_ROOM.sid,
		roomName: ACTIVE_ROOM.name,
		participantIdentity: 'obs-studio',
		status: 'inactive',
		closedBy: 'event',
		startedAt: firstSessionStart,
		endedAt: firstSessionEnd,
		durationMs: between(firstSessionStart, firstSessionEnd),
		video,
		audio,
		schemaVersion,
		expiresAt: plus(firstSessionEnd, ENTITIES_RETENTION_MS)
	},
	{
		_id: INGRESS_SESSION.second,
		ingressId: IN.rtmp,
		ingressName: 'OBS Studio',
		inputType: 'rtmp',
		roomSid: ACTIVE_ROOM.sid,
		roomName: ACTIVE_ROOM.name,
		participantIdentity: 'obs-studio',
		status: 'publishing',
		startedAt: at('10:29:58'),
		video: { ...video, averageBitrate: 4_200_000 },
		audio,
		schemaVersion,
		expiresAt: null
	}
];
