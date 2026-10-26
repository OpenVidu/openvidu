import { Component, ElementRef, inject, input, viewChild } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

/**
 * An info icon after a label or heading that explains it. The text shows on hover and keyboard focus like any tooltip;
 * touch screens have no hover, so a tap toggles it and a tap elsewhere hides it. Activating the icon never reaches the
 * element around it (a sortable header, a linked tile).
 */
@Component({
	selector: 'ovd-info-tip',
	imports: [MatIcon, MatTooltip],
	host: { '(document:pointerdown)': 'hideOutside($event)' },
	template: `
		<button
			type="button"
			class="tip"
			[attr.aria-label]="'About ' + subject()"
			[matTooltip]="text()"
			matTooltipTouchGestures="off"
			(pointerdown)="pointer = $event.pointerType"
			(click)="activate($event)"
		>
			<mat-icon svgIcon="info" aria-hidden="true" />
		</button>
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
	`
})
export class InfoTip {
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
	private readonly tooltip = viewChild.required(MatTooltip);

	/** The explanation shown in the tooltip. */
	readonly text = input.required<string>();
	/** What the icon explains, read as "About <subject>". */
	readonly subject = input.required<string>();

	/** Pointer type of the last press on the icon: `touch` toggles, anything else (mouse, pen, keyboard) shows. */
	protected pointer = '';

	protected activate(event: Event): void {
		event.preventDefault();
		event.stopPropagation();

		if (this.pointer === 'touch') {
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
}
