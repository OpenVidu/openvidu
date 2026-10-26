import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { EntityPreviewService } from '../../core/entity-preview.js';
import { ListStateService } from '../../core/list-state.js';
import { LockedPage } from '../../pages/locked-page.js';
import { EgressDataService } from './egress-data.js';
import { egressPreview, isEgressId } from './egress-display.js';

/**
 * The egress detail in CE: the lock with the egress header, taken from the egress list cache or, on a deep link, from
 * the CE list endpoint (`GET /egresses?q=<id>`); no PRO endpoint is requested.
 */
@Component({
	selector: 'ovd-egress-locked-page',
	imports: [LockedPage],
	template: '<ovd-locked-page />'
})
export class EgressLockedPage {
	constructor() {
		const id = inject(ActivatedRoute).snapshot.paramMap.get('egressId');
		const previews = inject(EntityPreviewService);

		if (id === null || !isEgressId(id) || previews.get('egress', id) !== undefined) {
			return;
		}

		inject(EgressDataService)
			.list({
				range: inject(ListStateService).range(),
				status: [],
				type: [],
				room: null,
				q: id,
				sort: 'startedAt',
				order: 'desc',
				cursor: null,
				limit: 1
			})
			.then((page) => {
				const item = page.items[0];

				if (item !== undefined) {
					previews.set('egress', item.egressId, egressPreview(item));
				}
			})
			.catch(() => undefined);
	}
}
