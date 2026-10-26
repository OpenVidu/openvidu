import type { RoomListItem, RoomSummary } from '@openvidu-dashboard/typings';

const MINUTE = 60_000;

/** A room list item relative to now: active by default, with an egress and an agent. */
export function roomItem(overrides: Partial<RoomListItem> = {}): RoomListItem {
	return {
		sid: 'RM_ab12cd',
		name: 'demo-room',
		status: 'active',
		createdAt: new Date(Date.now() - 42 * MINUTE).toISOString(),
		nodeId: 'node-a',
		participants: { sessions: 7, unique: 6, active: 5, peakActive: 6 },
		egress: { total: 1, active: 1 },
		ingress: { sessions: 0, active: 0 },
		bytes: { up: 12_000_000, down: 48_000_000 },
		features: { egress: true, ingress: false, agent: true, sip: false },
		lastStatsAt: new Date().toISOString(),
		...overrides
	};
}

export function closedRoomItem(overrides: Partial<RoomListItem> = {}): RoomListItem {
	const createdAt = Date.now() - 120 * MINUTE;

	return roomItem({
		status: 'closed',
		createdAt: new Date(createdAt).toISOString(),
		endedAt: new Date(createdAt + 30 * MINUTE).toISOString(),
		durationMs: 30 * MINUTE,
		closedBy: 'event',
		participants: { sessions: 4, unique: 4, active: 0, peakActive: 4 },
		...overrides
	});
}

export const ROOM_SUMMARY: RoomSummary = {
	activeRooms: 7,
	roomsInRange: 120,
	participantSessions: 900,
	activeParticipants: 31,
	approximate: false
};

/** Rooms of the CE suite: active, closed, reconciler-closed with a stale stats time, ingress-only. */
export const ROOMS: RoomListItem[] = [
	roomItem(),
	roomItem({
		sid: 'RM_stale1',
		name: 'stale-room',
		lastStatsAt: new Date(Date.now() - 3 * MINUTE).toISOString(),
		features: { egress: false, ingress: false, agent: false, sip: false },
		stale: true
	}),
	closedRoomItem({ sid: 'RM_closed1', name: 'demo-2' }),
	closedRoomItem({
		sid: 'RM_recon1',
		name: 'crashed-room',
		closedBy: 'reconciler',
		features: { egress: false, ingress: true, agent: false, sip: false }
	})
];
