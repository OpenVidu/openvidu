import { Component, computed, input } from '@angular/core';

import { EGRESS_TYPE_LABELS, enumLabel, INGRESS_INPUT_LABELS, PARTICIPANT_KIND_LABELS } from '../format/labels.js';

/** Labels of the three vocabularies, whose values never collide. */
const KIND_LABELS: Readonly<Record<string, string>> = {
	...PARTICIPANT_KIND_LABELS,
	...EGRESS_TYPE_LABELS,
	...INGRESS_INPUT_LABELS
};

/** Participant kind, egress type or ingress input type as a neutral outlined chip with its label, else the raw value. */
@Component({
	selector: 'ovd-kind-badge',
	template: `<span class="kind">{{ label() }}</span>`,
	styles: `
		.kind {
			display: inline-block;
			padding: 1px 8px;
			border: 1px solid var(--mat-sys-outline);
			border-radius: 8px;
			color: var(--mat-sys-on-surface-variant);
			font: var(--mat-sys-label-medium);
			white-space: nowrap;
		}
	`
})
export class KindBadge {
	readonly kind = input.required<string>();

	protected readonly label = computed(() => enumLabel(KIND_LABELS, this.kind()));
}
