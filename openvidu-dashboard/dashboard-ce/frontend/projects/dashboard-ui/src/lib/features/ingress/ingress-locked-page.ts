import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { LockedPage } from '../../components/lock/locked-page.js';
import { EntityPreviewService } from '../../core/state/entity-preview.js';
import { ListStateService } from '../../core/state/list-state.js';
import { IngressDataService } from './ingress-data.js';
import { ingressPreview, isIngressId } from './ingress-display.js';

/**
 * The ingress detail in CE: the lock with the ingress header, taken from the ingress list cache or, on a deep link, from
 * the CE list endpoint (`GET /ingresses?q=<id>`); no PRO endpoint is requested.
 */
@Component({
	selector: 'ovd-ingress-locked-page',
	imports: [LockedPage],
	template: '<ovd-locked-page />'
})
export class IngressLockedPage {
	constructor() {
		const id = inject(ActivatedRoute).snapshot.paramMap.get('ingressId');
		const previews = inject(EntityPreviewService);

		if (id === null || !isIngressId(id) || previews.get('ingress', id) !== undefined) {
			return;
		}

		inject(IngressDataService)
			.list({
				range: inject(ListStateService).range(),
				status: null,
				inputType: null,
				q: id,
				sort: 'createdAt',
				order: 'desc',
				cursor: null,
				limit: 1
			})
			.then((page) => {
				const item = page.items[0];

				if (item !== undefined) {
					previews.set('ingress', item.ingressId, ingressPreview(item));
				}
			})
			.catch(() => undefined);
	}
}
