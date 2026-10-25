import { describe, expect, it } from 'vitest';

import type { EgressDocument, RoomDocument } from '@openvidu-dashboard/typings';

import { toEgressListItem } from '../../src/egress/egress-mappers.js';
import { egressListItem } from '../../src/egress/egress-responses.js';
import { toRoomListItem } from '../../src/rooms/rooms-mappers.js';
import { roomListItem } from '../../src/rooms/rooms-responses.js';
import { loadFixture } from '../support/fixtures.js';

const rooms = loadFixture<RoomDocument>('rooms');
const closed = rooms.find((room) => room.status === 'closed');
const active = rooms.find((room) => room.status === 'active');

if (closed === undefined || active === undefined) {
	throw new Error('the fixtures need an active and a closed room');
}

describe('room mappers', () => {
	it('lists the public fields only, matching the documented schema', () => {
		const item = toRoomListItem(closed);

		expect(roomListItem.strict().parse(item)).toEqual(item);
		expect(item).toMatchObject({
			sid: closed._id,
			status: 'closed',
			createdAt: closed.createdAt.toISOString(),
			closedBy: 'event',
			participants: { sessions: 4, unique: 3, active: 0, peakActive: 2 },
			egress: { total: 2, active: 0 },
			features: { egress: true, ingress: false, agent: true, sip: true }
		});
		expect(Object.keys(item)).not.toContain('internal');
		expect(Object.keys(item.participants)).not.toContain('byKind');
	});

	it('leaves the end fields absent for an active room', () => {
		const item = toRoomListItem(active);

		expect(item.status).toBe('active');
		expect(item).not.toHaveProperty('endedAt');
		expect(item).not.toHaveProperty('durationMs');
		expect(item).not.toHaveProperty('closedBy');
	});

	it('maps egresses to their documented schema', () => {
		for (const doc of loadFixture<EgressDocument>('egresses')) {
			const item = toEgressListItem(doc);

			expect(egressListItem.strict().parse(item)).toEqual(item);
		}
	});
});
