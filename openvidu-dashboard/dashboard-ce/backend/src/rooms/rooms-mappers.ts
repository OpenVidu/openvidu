import type { RoomDocument, RoomListItem } from '@openvidu-dashboard/typings';

import { iso } from '../api/mapping.js';
import { compact } from '../util/compact.js';

export function toRoomListItem(doc: RoomDocument): RoomListItem {
	return compact<RoomListItem>({
		sid: doc._id,
		name: doc.name,
		status: doc.status,
		createdAt: iso(doc.createdAt),
		endedAt: iso(doc.endedAt),
		durationMs: doc.durationMs,
		closedBy: doc.closedBy,
		nodeId: doc.nodeId,
		participants: {
			sessions: doc.participants.sessions,
			unique: doc.participants.unique,
			active: doc.participants.active,
			peakActive: doc.participants.peakActive
		},
		egress: { total: doc.egress.total, active: doc.egress.active },
		ingress: { sessions: doc.ingress.sessions, active: doc.ingress.active },
		bytes: { up: doc.bytes.up, down: doc.bytes.down },
		features: {
			egress: doc.features.egress,
			ingress: doc.features.ingress,
			agent: doc.features.agent,
			sip: doc.features.sip
		},
		lastStatsAt: iso(doc.lastStatsAt)
	});
}
