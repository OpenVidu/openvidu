import { booleanAttribute, Component, computed, inject, input } from '@angular/core';

import { InfoService } from '../core/info.js';

/** The edition as openvidu.io tags it: COMMUNITY in grey or PRO in purple; `compact` reads CE or PRO. */
@Component({
	selector: 'ovd-edition-badge',
	template: `
		@if (edition(); as edition) {
			<span
				class="badge"
				[class.pro]="edition === 'pro'"
				[attr.aria-label]="'OpenVidu ' + label() + ' edition'"
				>{{ compact() ? edition.toUpperCase() : label() }}</span
			>
		}
	`,
	styles: `
		:host {
			display: inline-flex;
		}

		.badge {
			display: inline-block;
			padding: 0 5px;
			border-radius: 3px;
			// openvidu.io grey, darkened from #868686 to reach 4.5:1 with white text.
			background: #6b6b6b;
			color: #fff;
			font: var(--mat-sys-label-small);
			font-weight: 700;
			line-height: 1.8;
			letter-spacing: 0.02em;
		}

		.pro {
			background: #9c27b0;
		}
	`
})
export class EditionBadge {
	protected readonly edition = inject(InfoService).edition;

	readonly compact = input(false, { transform: booleanAttribute });

	protected readonly label = computed(() => (this.edition() === 'pro' ? 'PRO' : 'COMMUNITY'));
}
