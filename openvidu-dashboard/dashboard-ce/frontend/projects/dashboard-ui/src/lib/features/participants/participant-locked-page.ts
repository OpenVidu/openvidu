import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { EntityPreviewService } from '../../core/entity-preview.js';
import { ListStateService } from '../../core/list-state.js';
import { LockedPage } from '../../pages/locked-page.js';
import { isParticipantSid, participantPreview } from './participant-display.js';
import { ParticipantsDataService } from './participants-data.js';

/**
 * The participant detail in CE: the lock with the session header, taken from the participants list cache or, on a
 * deep link, from the CE list endpoint (`GET /participants?q=<sid>`); no PRO endpoint is requested.
 */
@Component({
	selector: 'ovd-participant-locked-page',
	imports: [LockedPage],
	template: '<ovd-locked-page />'
})
export class ParticipantLockedPage {
	constructor() {
		const sid = inject(ActivatedRoute).snapshot.paramMap.get('participantSid');
		const previews = inject(EntityPreviewService);

		if (sid === null || !isParticipantSid(sid) || previews.get('participant', sid) !== undefined) {
			return;
		}

		inject(ParticipantsDataService)
			.list({
				range: inject(ListStateService).range(),
				q: sid,
				kind: [],
				status: null,
				room: null,
				publisher: false,
				sort: 'joinedAt',
				order: 'desc',
				cursor: null,
				limit: 1
			})
			.then((page) => {
				const item = page.items[0];

				if (item !== undefined) {
					previews.set('participant', item.sid, participantPreview(item));
				}
			})
			.catch(() => undefined);
	}
}
