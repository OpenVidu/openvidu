import type { RoomListItem } from '@openvidu-dashboard/typings';

import type { CsvColumn } from '../api/csv.js';

/** Bytes of a room, empty when its node reports no media statistics rather than a misleading `0`. */
function bytes(room: RoomListItem, side: 'up' | 'down'): number | undefined {
	return room.mediaStats === false ? undefined : room.bytes[side];
}

const ROOM_CSV_COLUMNS: readonly CsvColumn<RoomListItem>[] = [
	{ header: 'sid', value: (room) => room.sid },
	{ header: 'name', value: (room) => room.name },
	{ header: 'status', value: (room) => room.status },
	{ header: 'createdAt', value: (room) => room.createdAt },
	{ header: 'endedAt', value: (room) => room.endedAt },
	{ header: 'durationMs', value: (room) => room.durationMs },
	{ header: 'closedBy', value: (room) => room.closedBy },
	{ header: 'participants.sessions', value: (room) => room.participants.sessions },
	{ header: 'participants.unique', value: (room) => room.participants.unique },
	{ header: 'participants.active', value: (room) => room.participants.active },
	{ header: 'participants.peakActive', value: (room) => room.participants.peakActive },
	{ header: 'egress.total', value: (room) => room.egress.total },
	{ header: 'egress.active', value: (room) => room.egress.active },
	{ header: 'ingress.sessions', value: (room) => room.ingress.sessions },
	{ header: 'ingress.active', value: (room) => room.ingress.active },
	{ header: 'bytes.up', value: (room) => bytes(room, 'up') },
	{ header: 'bytes.down', value: (room) => bytes(room, 'down') },
	{ header: 'features.egress', value: (room) => room.features.egress },
	{ header: 'features.ingress', value: (room) => room.features.ingress },
	{ header: 'features.agent', value: (room) => room.features.agent },
	{ header: 'features.sip', value: (room) => room.features.sip }
];

/** Columns of the rooms export; the media node label comes last with `per-node-breakdown`, as the Node column. */
export function roomCsvColumns(perNode: boolean): readonly CsvColumn<RoomListItem>[] {
	return perNode ? [...ROOM_CSV_COLUMNS, { header: 'mediaNode', value: (room) => room.mediaNode }] : ROOM_CSV_COLUMNS;
}
