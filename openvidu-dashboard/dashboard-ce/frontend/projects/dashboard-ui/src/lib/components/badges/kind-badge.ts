import { Component, computed, inject, input } from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';

import { ChartColorsService } from '../../charts/chart-colors.js';
import { entityColor } from '../../charts/chart-options.js';
import { EGRESS_TYPE_LABELS, enumLabel, INGRESS_INPUT_LABELS, PARTICIPANT_KIND_LABELS } from '../../format/labels.js';

/** Labels of the three vocabularies, whose values never collide. */
const KIND_LABELS: Readonly<Record<string, string>> = {
	...PARTICIPANT_KIND_LABELS,
	...EGRESS_TYPE_LABELS,
	...INGRESS_INPUT_LABELS
};

/**
 * Participant kind, egress type or ingress input type as a tag: a dot in the value's Analytics colour and its label, else
 * the raw value; a page may give a more precise `label` and a `tooltip` naming what it shows.
 */
@Component({
	selector: 'ovd-kind-badge',
	imports: [MatTooltip],
	template: `<span
		class="kind ovd-tag"
		[matTooltip]="tooltip() ?? ''"
		[matTooltipDisabled]="tooltip() === undefined"
		[attr.tabindex]="tooltip() === undefined ? null : 0"
		[attr.aria-label]="tooltip() === undefined ? null : text() + ', ' + tooltip()"
		><span class="dot" aria-hidden="true" [style.background]="color()"></span>{{ text() }}</span
	>`,
	styles: `
		:host {
			display: inline-flex;
		}

		.kind {
			gap: 6px;
			background: var(--mat-sys-surface-container-high);
			color: var(--mat-sys-on-surface);
		}

		.dot {
			flex: none;
			width: 8px;
			height: 8px;
			border-radius: 50%;
		}
	`
})
export class KindBadge {
	private readonly colors = inject(ChartColorsService).colors;

	readonly kind = input.required<string>();
	/** A more precise label of the same value, such as "URL (RTSP)". */
	readonly label = input<string>();
	/** What the badge shows, such as "Participant kind"; lists give none. */
	readonly tooltip = input<string>();

	protected readonly text = computed(() => this.label() ?? enumLabel(KIND_LABELS, this.kind()));
	protected readonly color = computed(() => entityColor(this.kind(), this.colors()));
}
