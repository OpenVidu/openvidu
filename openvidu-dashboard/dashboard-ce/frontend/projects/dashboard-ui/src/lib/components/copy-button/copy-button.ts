import { Component, type ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

import { ClipboardService } from '../../core/ui/clipboard.js';
import { ToastService } from '../../core/ui/toast.js';

export const COPIED_ICON_MS = 1_000;

/**
 * A copy button for a value already shown next to it (a link, a title, a breadcrumb): never follows the link around
 * it, toasts "Copied" or, without a clipboard, selects the value and toasts "Press Ctrl+C".
 */
@Component({
	selector: 'ovd-copy-button',
	imports: [MatIconButton, MatIcon, MatTooltip],
	template: `
		<span #full class="ovd-visually-hidden" aria-hidden="true">{{ value() }}</span>
		<button
			matIconButton
			type="button"
			class="copy"
			[attr.aria-label]="'Copy ' + (label() ?? value())"
			[matTooltip]="copied() ? 'Copied' : 'Copy'"
			(click)="copy($event)"
		>
			<mat-icon [svgIcon]="copied() ? 'check' : 'content_copy'" />
		</button>
	`,
	styles: `
		:host {
			display: inline-flex;
			flex: none;
			vertical-align: middle;
		}

		.copy {
			--mat-icon-button-state-layer-size: 32px;
			--mat-icon-button-icon-size: 18px;

			padding: 7px;
			width: 32px;
			height: 32px;

			mat-icon {
				width: 18px;
				height: 18px;
			}
		}
	`
})
export class CopyButton {
	private readonly clipboard = inject(ClipboardService);
	private readonly toast = inject(ToastService);
	private readonly full = viewChild.required<ElementRef<HTMLElement>>('full');
	private resetTimer: ReturnType<typeof setTimeout> | undefined;

	readonly value = input.required<string>();
	/** Accessible name of the value, e.g. "room SID"; defaults to the value. */
	readonly label = input<string>();

	protected readonly copied = signal(false);

	protected async copy(event: Event): Promise<void> {
		event.preventDefault();
		event.stopPropagation();

		if ((await this.clipboard.copy(this.value(), this.full().nativeElement)) === 'copied') {
			this.toast.show('Copied');
			this.copied.set(true);
			clearTimeout(this.resetTimer);
			this.resetTimer = setTimeout(() => {
				this.copied.set(false);
			}, COPIED_ICON_MS);
		} else {
			this.toast.show('Press Ctrl+C');
		}
	}
}
