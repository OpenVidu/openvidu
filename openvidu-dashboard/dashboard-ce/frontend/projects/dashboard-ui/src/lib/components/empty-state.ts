import { Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

/** Icon, title, hint and up to two projected actions (`[ovdEmptyAction]`), e.g. "Clear filters" and "Widen range". */
@Component({
	selector: 'ovd-empty-state',
	imports: [MatIcon],
	template: `
		<mat-icon [svgIcon]="icon()" aria-hidden="true" />
		<p class="title">{{ heading() }}</p>
		@if (hint()) {
			<p class="hint">{{ hint() }}</p>
		}
		<div class="actions"><ng-content select="[ovdEmptyAction]" /></div>
	`,
	styles: `
		:host {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 4px;
			padding: 32px 16px;
			text-align: center;
			color: var(--mat-sys-on-surface-variant);
		}

		mat-icon {
			width: 40px;
			height: 40px;
		}

		.title {
			margin: 8px 0 0;
			color: var(--mat-sys-on-surface);
			font: var(--mat-sys-title-medium);
		}

		.hint {
			margin: 0;
		}

		.actions {
			display: flex;
			flex-wrap: wrap;
			justify-content: center;
			gap: 8px;
			margin-top: 12px;
		}
	`
})
export class EmptyState {
	readonly icon = input('search_off');
	readonly heading = input.required<string>();
	readonly hint = input<string>();
}
