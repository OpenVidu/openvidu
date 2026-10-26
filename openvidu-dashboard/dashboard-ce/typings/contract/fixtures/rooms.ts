import type { RoomDocument } from '../../src/index.js';
import {
	ACTIVE_ROOM,
	at,
	between,
	CLOSED_ROOM,
	EG,
	ENTITIES_RETENTION_MS,
	INGRESS_SESSION,
	NODE_ALPHA,
	NODE_BETA,
	P,
	plus,
	schemaVersion,
	T
} from './scenario.js';

const closedCreatedAt = at('09:00:00');
const closedEndedAt = at('09:45:00');

export const rooms: RoomDocument[] = [
	{
		_id: CLOSED_ROOM.sid,
		name: CLOSED_ROOM.name,
		nameLower: CLOSED_ROOM.name.toLowerCase(),
		status: 'closed',
		createdAt: closedCreatedAt,
		endedAt: closedEndedAt,
		durationMs: between(closedCreatedAt, closedEndedAt),
		endReason: 'API_DELETE',
		closedBy: 'event',
		nodeId: NODE_ALPHA,
		config: { maxParticipants: 20, emptyTimeoutMs: 300_000, departureTimeoutMs: 20_000 },
		participants: {
			sessions: 4,
			unique: 3,
			active: 0,
			peakActive: 2,
			aborted: 1,
			byKind: { STANDARD: 4, EGRESS: 1, AGENT: 1, SIP: 1 }
		},
		tracks: { published: 2, bySource: { CAMERA: 1, MICROPHONE: 1 } },
		egress: { total: 2, active: 0, byType: { room_composite: 1, track: 1 } },
		ingress: { sessions: 0, active: 0 },
		bytes: { up: 385_000_000, down: 888_000_000 },
		quality: { scoreSum: 1267, scoreCount: 320, minScore: 1.8, poor: 6, lost: 0 },
		features: { egress: true, ingress: false, agent: true, sip: true },
		lastEventAt: closedEndedAt,
		lastStatsAt: at('09:44:30'),
		internal: {
			participantSids: [P.alice, P.bob1, P.bob2, P.carol, P.egressRecorder, P.agent, P.sip],
			activeParticipantSids: [],
			identities: ['alice', 'bob', 'Carol'],
			trackSids: [T.aliceCamera, T.aliceMic],
			egressIds: [EG.recording, EG.trackFailed]
		},
		schemaVersion,
		expiresAt: plus(closedEndedAt, ENTITIES_RETENTION_MS)
	},
	{
		_id: ACTIVE_ROOM.sid,
		name: ACTIVE_ROOM.name,
		nameLower: ACTIVE_ROOM.name.toLowerCase(),
		status: 'active',
		createdAt: at('10:00:00'),
		nodeId: NODE_BETA,
		config: { maxParticipants: 0, emptyTimeoutMs: 300_000, departureTimeoutMs: 20_000 },
		participants: {
			sessions: 2,
			unique: 2,
			active: 1,
			peakActive: 1,
			aborted: 0,
			byKind: { STANDARD: 2, INGRESS: 2, EGRESS: 1 }
		},
		tracks: { published: 4, bySource: { CAMERA: 3, MICROPHONE: 1 } },
		egress: { total: 1, active: 1, byType: { room_composite: 1 } },
		ingress: { sessions: 2, active: 1 },
		bytes: { up: 98_800_000, down: 99_120_000 },
		quality: { scoreSum: 486, scoreCount: 120, minScore: 3.6, poor: 0, lost: 0 },
		features: { egress: true, ingress: true, agent: false, sip: false },
		lastEventAt: at('10:31:00'),
		lastStatsAt: at('10:35:00'),
		internal: {
			participantSids: [P.dave, P.ingress1, P.egressStreamer, P.ingress2, P.erin],
			activeParticipantSids: [P.dave],
			identities: ['dave', 'erin'],
			trackSids: [T.daveCamera, T.daveMic, T.ingressVideo1, T.ingressVideo2],
			egressIds: [EG.streaming],
			activeEgressIds: [EG.streaming],
			ingressSessionIds: [INGRESS_SESSION.first, INGRESS_SESSION.second],
			activeIngressSessionIds: [INGRESS_SESSION.second]
		},
		schemaVersion,
		expiresAt: null
	}
];
