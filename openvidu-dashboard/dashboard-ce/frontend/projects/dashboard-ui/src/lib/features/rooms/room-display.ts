import { type ByteTotals, isEntityId, type RoomFeature, type RoomListItem } from '@openvidu-dashboard/typings';

import type { EntityPreview } from '../../core/entity-preview.js';
import { formatBytes } from '../../format/formatters.js';

/** Feature flags in display order, with the letter of their badge; SIP is not offered while OpenVidu does not use it. */
export const ROOM_FEATURES: readonly { key: RoomFeature; letter: string; label: string }[] = [
	{ key: 'egress', letter: 'E', label: 'Egress' },
	{ key: 'ingress', letter: 'I', label: 'Ingress' },
	{ key: 'agent', letter: 'A', label: 'Agent' }
];

export function isRoomSid(value: string): boolean {
	return isEntityId('room', value);
}

/** `12.3 MB / 48 MB`. */
/** `↑ 12.0 MB ↓ 48.0 MB`, for table cells. */
export function formatBandwidth(bytes: ByteTotals): string {
	return bandwidthLines(bytes).join(' ');
}

/** `↑ 12.0 MB` and `↓ 48.0 MB`, the two lines of a bandwidth tile. */
export function bandwidthLines(bytes: ByteTotals): [string, string] {
	return [`↑ ${formatBytes(bytes.up)}`, `↓ ${formatBytes(bytes.down)}`];
}

/** What detail headers and breadcrumbs show of a room before (or instead of) its detail. */
export function roomPreview(room: Pick<RoomListItem, 'name' | 'status' | 'createdAt' | 'closedBy'>): EntityPreview {
	return {
		name: room.name,
		status: room.status,
		startedAt: room.createdAt,
		estimated: room.closedBy === 'reconciler'
	};
}
