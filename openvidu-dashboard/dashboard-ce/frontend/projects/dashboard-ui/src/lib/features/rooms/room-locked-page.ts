import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RoomSort, RoomStatusFilter } from '@openvidu-dashboard/typings';

import { EntityPreviewService } from '../../core/entity-preview.js';
import { ListStateService } from '../../core/list-state.js';
import { LockedPage } from '../../pages/locked-page.js';
import { isRoomSid, roomPreview } from './room-display.js';
import { RoomsDataService } from './rooms-data.js';

/**
 * The room detail in CE: the lock with the room header, taken from the rooms list cache or, on a deep link, from the
 * CE list endpoint (`GET /rooms?q=<sid>`); no PRO endpoint is requested.
 */
@Component({
	selector: 'ovd-room-locked-page',
	imports: [LockedPage],
	template: '<ovd-locked-page />'
})
export class RoomLockedPage {
	constructor() {
		const sid = inject(ActivatedRoute).snapshot.paramMap.get('roomSid');
		const previews = inject(EntityPreviewService);

		if (sid === null || !isRoomSid(sid) || previews.get('room', sid) !== undefined) {
			return;
		}

		inject(RoomsDataService)
			.list({
				range: inject(ListStateService).range(),
				status: RoomStatusFilter.ALL,
				q: sid,
				features: [],
				nodeId: null,
				sort: RoomSort.CREATED_AT,
				order: 'desc',
				cursor: null,
				limit: 1
			})
			.then((page) => {
				const room = page.items[0];

				if (room !== undefined) {
					previews.set('room', room.sid, roomPreview(room));
				}
			})
			.catch(() => undefined);
	}
}
