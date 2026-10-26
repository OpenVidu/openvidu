import { Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import type { EgressOutputsSummary } from '@openvidu-dashboard/typings';

import { EGRESS_OUTPUT_ICONS, outputLabel } from './egress-display.js';

/** One icon per output kind and a count badge when the egress has more than one output. */
@Component({
	selector: 'ovd-egress-outputs',
	imports: [MatIcon, MatTooltip],
	template: `
		@for (kind of outputs().kinds; track kind) {
			<span class="kind" role="img" [attr.aria-label]="label(kind)" [matTooltip]="label(kind)">
				<mat-icon [svgIcon]="icons[kind]" aria-hidden="true" />
			</span>
		} @empty {
			<span aria-label="No outputs">—</span>
		}
		@if (outputs().count > 1) {
			<span class="count ovd-tabular" [attr.aria-label]="countLabel()">{{ outputs().count }}</span>
		}
	`,
	styles: `
		:host {
			display: inline-flex;
			align-items: center;
			gap: 4px;
		}

		.kind {
			display: inline-flex;
		}

		mat-icon {
			width: 20px;
			height: 20px;
		}

		.count {
			min-width: 18px;
			padding: 0 4px;
			border-radius: 9px;
			background: var(--mat-sys-secondary-container);
			color: var(--mat-sys-on-secondary-container);
			font: var(--mat-sys-label-small);
			text-align: center;
		}
	`
})
export class EgressOutputs {
	readonly outputs = input.required<EgressOutputsSummary>();

	protected readonly icons = EGRESS_OUTPUT_ICONS;
	protected readonly countLabel = computed(() => `${String(this.outputs().count)} outputs`);

	protected label(kind: keyof typeof EGRESS_OUTPUT_ICONS): string {
		return outputLabel(kind);
	}
}
