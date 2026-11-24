import { CdkConnectedOverlay, CdkOverlayOrigin, type ConnectedPosition } from '@angular/cdk/overlay';
import { Component, computed, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

import { ExternalLink } from '../external-link/external-link.js';

let nextId = 0;

/** Below the icon, else above it, aligned to its start or, near the edge, to its end. */
const PANEL_POSITIONS: ConnectedPosition[] = [
	{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
	{ originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
	{ originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
	{ originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 }
];

/**
 * An info icon after a label or heading that explains it, or with `variant="warning"` a warning icon that tells what is
 * missing. The text shows on hover and keyboard focus like any tooltip; touch screens have no hover, so a tap toggles
 * it and a tap elsewhere hides it. Activating the icon never reaches the element around it (a sortable header, a linked
 * tile).
 *
 * With `href` and `linkText` (words of `text`), the text holds a link a tooltip could not reach: the icon toggles a
 * non-modal panel instead (`aria-expanded`). Tab moves from the icon to the link and on past the icon; Escape, a click
 * outside or a second activation closes the panel and returns focus to the icon.
 */
@Component({
	selector: 'ovd-info-tip',
	imports: [CdkConnectedOverlay, CdkOverlayOrigin, ExternalLink, MatIcon, MatTooltip],
	host: { '(document:pointerdown)': 'hideOutside($event)' },
	template: `
		<button
			type="button"
			class="tip"
			[class.warning]="variant() === 'warning'"
			cdkOverlayOrigin
			#origin="cdkOverlayOrigin"
			[attr.aria-label]="accessibleName()"
			[attr.aria-expanded]="link() === null ? null : open()"
			[attr.aria-controls]="open() ? panelId : null"
			[matTooltip]="text()"
			[matTooltipDisabled]="link() !== null"
			matTooltipTouchGestures="off"
			(pointerdown)="pointer = $event.pointerType"
			(click)="activate($event)"
			(keydown)="iconKeydown($event)"
		>
			<mat-icon [svgIcon]="variant()" aria-hidden="true" />
		</button>
		@if (link(); as link) {
			<ng-template
				cdkConnectedOverlay
				[cdkConnectedOverlayOrigin]="origin"
				[cdkConnectedOverlayOpen]="open()"
				[cdkConnectedOverlayPositions]="positions"
				[cdkConnectedOverlayViewportMargin]="16"
				(overlayOutsideClick)="outsideClick($event)"
				(overlayKeydown)="panelKeydown($event)"
				(detach)="open.set(false)"
			>
				<div class="link-tip" [id]="panelId">
					{{ link.before }}<ovd-external-link [href]="href()">{{ linkText() }}</ovd-external-link
					>{{ link.after }}
				</div>
			</ng-template>
		}
	`,
	styles: `
		:host {
			position: relative;
			z-index: 1;
			display: inline-flex;
			flex: none;
			margin-inline-start: 4px;
			vertical-align: middle;
		}

		.tip {
			position: relative;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 24px;
			height: 24px;
			padding: 0;
			border: 0;
			border-radius: 50%;
			background: none;
			color: var(--mat-sys-on-surface-variant);
			cursor: help;

			&:hover {
				color: var(--mat-sys-primary);
			}

			&.warning,
			&.warning:hover {
				color: var(--ovd-status-warning-fg);
			}

			&:focus-visible {
				outline: 2px solid var(--mat-sys-primary);
				outline-offset: 1px;
			}

			/* Touch target of 44 px around the 24 px icon, without moving the label. */
			&::after {
				content: '';
				position: absolute;
				inset: -10px;
			}

			mat-icon {
				width: 18px;
				height: 18px;
			}
		}

		/* Looks like a tooltip, with room for a link. */
		.link-tip {
			box-sizing: border-box;
			max-width: min(280px, calc(100vw - 32px));
			padding: 8px 12px;
			border-radius: 4px;
			background: var(--mat-sys-inverse-surface);
			color: var(--mat-sys-inverse-on-surface);
			font: var(--mat-sys-body-small);
			white-space: normal;

			ovd-external-link ::ng-deep a {
				display: inline;
				color: var(--mat-sys-inverse-primary);
			}
		}
	`
})
export class InfoTip {
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
	private readonly tooltip = viewChild.required(MatTooltip);

	/** The explanation shown in the tooltip, or in the panel of a tip with a link. */
	readonly text = input.required<string>();
	/** Words of `text` that link to `href`, in a new tab; with both, the tip opens a panel instead of a tooltip. */
	readonly linkText = input('');
	readonly href = input('');
	/** What the icon explains, read as "About <subject>"; a warning is read as its text. */
	readonly subject = input('');
	readonly variant = input<'info' | 'warning'>('info');

	protected readonly accessibleName = computed(() =>
		this.variant() === 'warning' ? this.text() : `About ${this.subject()}`
	);

	/** The text around the link of a tip with one; `null` for a tooltip. */
	protected readonly link = computed(() => {
		const words = this.linkText();
		const at = words === '' || this.href() === '' ? -1 : this.text().lastIndexOf(words);

		return at < 0 ? null : { before: this.text().slice(0, at), after: this.text().slice(at + words.length) };
	});
	protected readonly open = signal(false);
	protected readonly panelId = `ovd-info-tip-${String(++nextId)}`;
	protected readonly positions = PANEL_POSITIONS;

	/** Pointer type of the last press on the icon: `touch` toggles, anything else (mouse, pen, keyboard) shows. */
	protected pointer = '';

	protected activate(event: Event): void {
		event.preventDefault();
		event.stopPropagation();

		if (this.link() !== null) {
			this.open.update((open) => !open);
		} else if (this.pointer === 'touch') {
			this.tooltip().toggle();
		} else {
			this.tooltip().show(0);
		}

		this.pointer = '';
	}

	protected hideOutside(event: Event): void {
		if (!(event.target instanceof Node) || !this.host.nativeElement.contains(event.target)) {
			this.tooltip().hide(0);
		}
	}

	/** Tab from the icon of an open panel reaches its link; Escape closes it. */
	protected iconKeydown(event: KeyboardEvent): void {
		if (!this.open()) {
			return;
		}

		if (event.key === 'Tab' && !event.shiftKey) {
			const link = document.getElementById(this.panelId)?.querySelector('a');

			if (link) {
				event.preventDefault();
				link.focus();
			}
		}
	}

	/** Escape closes the panel; Tab leaves the link for what follows the icon, Shift+Tab goes back to the icon. */
	protected panelKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.preventDefault();
			this.close();
		} else if (event.key === 'Tab' && event.target instanceof Element && event.target.closest(`#${this.panelId}`)) {
			if (event.shiftKey) {
				event.preventDefault();
				this.focusIcon();
			} else {
				// Focus moves from the icon, so the browser goes on to the element after it.
				this.open.set(false);
				this.focusIcon();
			}
		}
	}

	protected outsideClick(event: MouseEvent): void {
		if (event.target instanceof Node && this.host.nativeElement.contains(event.target)) {
			return;
		}

		this.close();
	}

	private close(): void {
		this.open.set(false);
		this.focusIcon();
	}

	private focusIcon(): void {
		this.host.nativeElement.querySelector<HTMLButtonElement>('button.tip')?.focus();
	}
}
