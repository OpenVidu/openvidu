import { booleanAttribute, Component, computed, input, output } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

export type NoticeVariant = 'error' | 'warning' | 'info';

const ICONS: Readonly<Record<NoticeVariant, string>> = { error: 'error', warning: 'warning', info: 'info' };

/** An in-page message: icon, projected text, an optional action and an optional dismiss button, coloured by variant. */
@Component({
	selector: 'ovd-notice',
	imports: [MatButton, MatIcon, MatIconButton],
	host: {
		'[attr.role]': "variant() === 'info' ? 'status' : 'alert'",
		'[class]': 'variant()',
		'[class.page]': "placement() === 'page'"
	},
	template: `
		<mat-icon [svgIcon]="icon()" aria-hidden="true" />
		<div class="text"><ng-content /></div>
		@if (actionLabel()) {
			<button matButton type="button" (click)="action.emit()">{{ actionLabel() }}</button>
		}
		@if (dismissible()) {
			<button matIconButton type="button" class="dismiss" aria-label="Dismiss" (click)="dismiss.emit()">
				<mat-icon svgIcon="close" />
			</button>
		}
	`,
	styles: `
		:host {
			display: flex;
			align-items: center;
			gap: 12px;
			min-height: 40px;
			padding: 8px 16px;
			border-radius: 8px;
			color: var(--ovd-notice-fg);
		}

		:host(.page) {
			margin-bottom: 16px;
		}

		:host(.error) {
			--ovd-notice-fg: var(--mat-sys-on-error-container);
			background: var(--mat-sys-error-container);
		}

		:host(.warning) {
			--ovd-notice-fg: var(--ovd-status-warning-fg);
			background: var(--ovd-status-warning-bg);
		}

		:host(.info) {
			--ovd-notice-fg: var(--ovd-status-info-fg);
			background: var(--ovd-status-info-bg);
		}

		mat-icon {
			flex: none;
		}

		.text {
			display: flex;
			flex: 1;
			flex-wrap: wrap;
			gap: 4px 12px;
			min-width: 0;
			overflow-wrap: anywhere;
		}

		button {
			flex: none;
			margin-inline-end: -8px;
			--mat-button-text-label-text-color: var(--ovd-notice-fg);
			--mat-icon-button-icon-color: var(--ovd-notice-fg);
		}
	`
})
export class Notice {
	readonly variant = input<NoticeVariant>('info');
	/** Inline in a card or section (default), or at page level with space below. */
	readonly placement = input<'inline' | 'page'>('inline');
	/** Label of the action button; no button without it. */
	readonly actionLabel = input<string>();
	readonly action = output();
	/** Shows a close button that emits `dismiss`. */
	readonly dismissible = input(false, { transform: booleanAttribute });
	readonly dismiss = output();

	protected readonly icon = computed(() => ICONS[this.variant()]);
}
