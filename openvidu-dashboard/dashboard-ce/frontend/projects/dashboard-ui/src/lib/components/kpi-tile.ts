import {
	booleanAttribute,
	Component,
	computed,
	DestroyRef,
	DOCUMENT,
	effect,
	inject,
	input,
	signal,
	untracked
} from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';
import { type Params, RouterLink } from '@angular/router';

import { APPROXIMATE_TEXT } from '../format/info-texts.js';
import { InfoTip } from './info-tip.js';

export const HIGHLIGHT_MS = 600;
/** Values that change more often than this (a duration ticking every second) are never highlighted. */
export const TICKING_MS = 5_000;

/**
 * One figure with label, unit, delta and hint. It keeps the last value while a refresh runs, shows a skeleton only on
 * the first load and highlights a changed value for 600 ms unless reduced motion is requested. An info tip explains the
 * label, a "≈" mark explains an approximate value, and a link makes the whole tile open a list.
 */
@Component({
	selector: 'ovd-kpi-tile',
	imports: [InfoTip, MatTooltip, RouterLink],
	host: { '[class.linked]': 'link() !== undefined' },
	template: `
		<div class="label">
			@if (link(); as link) {
				<a class="link" [routerLink]="link" [queryParams]="queryParams()">{{ label() }}</a>
			} @else {
				{{ label() }}
			}
			@if (info(); as info) {
				<ovd-info-tip [text]="info" [subject]="label()" />
			}
		</div>
		@if (shown() === null) {
			@if (loading()) {
				<div class="skeleton" aria-hidden="true"></div>
				<span class="ovd-visually-hidden">Loading {{ label() }}</span>
			} @else {
				<div class="value">—</div>
			}
		} @else {
			<div class="value ovd-tabular" [class.highlight]="highlight()">
				@if (accent()) {
					<span class="accent" [style.background]="accent()" aria-hidden="true"></span>
				}
				@if (approximate()) {
					<span
						class="approximate"
						role="img"
						aria-label="Approximate"
						tabindex="0"
						[matTooltip]="approximateText()"
						>≈</span
					>
				}
				@if (lines(); as lines) {
					@for (line of lines; track $index) {
						<span class="line">{{ line }}</span>
					}
				} @else {
					{{ shown() }}
				}
				@if (unit()) {
					<span class="unit">{{ unit() }}</span>
				}
			</div>
		}
		@if (delta()) {
			<div class="delta">{{ delta() }}</div>
		}
		@if (hint()) {
			<div class="hint">{{ hint() }}</div>
		}
	`,
	styles: `
		:host {
			position: relative;
			display: block;
			padding: 16px;
			border: 1px solid var(--mat-sys-outline-variant);
			border-radius: 12px;
			background: var(--mat-sys-surface-container-lowest);
			min-width: 0;
		}

		:host(.linked:hover) {
			border-color: var(--mat-sys-primary);
		}

		/* Inline, so the info tip follows the last word of a label that wraps. */
		.label {
			color: var(--mat-sys-on-surface-variant);
			font: var(--mat-sys-label-large);

			ovd-info-tip {
				margin-block: -2px;
			}
		}

		/* The label is the link; its pseudo element stretches it over the tile, under the info tip. */
		.link {
			color: inherit;
			text-decoration: none;

			&::after {
				content: '';
				position: absolute;
				inset: 0;
				border-radius: 12px;
			}

			&:focus-visible {
				outline: none;

				&::after {
					outline: 2px solid var(--mat-sys-primary);
					outline-offset: 2px;
				}
			}
		}

		.approximate {
			position: relative;
			z-index: 1;
			margin-right: 4px;
			border-radius: 4px;
			cursor: help;

			&:focus-visible {
				outline: 2px solid var(--mat-sys-primary);
			}
		}

		.value {
			margin-top: 4px;
			font: var(--mat-sys-headline-medium);
			font-weight: 600;
			border-radius: 4px;
			transition: background-color 200ms;
		}

		.line {
			display: block;
			font: var(--mat-sys-title-large);
			font-weight: 600;
			white-space: nowrap;
		}

		.highlight {
			background: var(--mat-sys-primary-container);
		}

		.accent {
			display: inline-block;
			width: 12px;
			height: 12px;
			margin-right: 6px;
			border-radius: 50%;
			vertical-align: middle;
		}

		.unit {
			font: var(--mat-sys-title-medium);
			color: var(--mat-sys-on-surface-variant);
		}

		.skeleton {
			margin-top: 8px;
			width: 60%;
			height: 28px;
			border-radius: 4px;
			background: var(--mat-sys-surface-container-high);
		}

		.delta,
		.hint {
			margin-top: 4px;
			color: var(--mat-sys-on-surface-variant);
			font: var(--mat-sys-body-small);
		}
	`
})
export class KpiTile {
	private readonly reducedMotion =
		inject(DOCUMENT).defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? false;
	private timer: ReturnType<typeof setTimeout> | undefined;

	readonly label = input.required<string>();
	/** Explanation of the label, shown by an info tip after it. */
	readonly info = input<string>();
	/** Prefixes the value with "≈", whose tooltip is {@link approximateText}. */
	readonly approximate = input(false, { transform: booleanAttribute });
	readonly approximateText = input(APPROXIMATE_TEXT);
	/** Router link the whole tile opens, e.g. a list filtered to the counted entities. */
	readonly link = input<string>();
	readonly queryParams = input<Params>();
	/** Formatted value, or one line per part (bandwidth up and down); `null` while unknown. */
	readonly value = input<string | number | readonly string[] | null>(null);
	readonly unit = input<string>();
	readonly delta = input<string>();
	readonly hint = input<string>();
	/** Colour of a marker before the value, e.g. the quality band; the value text keeps its contrast. */
	readonly accent = input<string>();
	readonly loading = input(false, { transform: booleanAttribute });

	protected readonly shown = signal<string | number | readonly string[] | null>(null);
	protected readonly lines = computed(() => {
		const shown = this.shown();

		return Array.isArray(shown) ? (shown as readonly string[]) : null;
	});
	protected readonly highlight = signal(false);
	/** Time of the last value change: a value that changes faster than {@link TICKING_MS} is a ticker. */
	private lastChange = 0;

	constructor() {
		effect(() => {
			const value = this.value();

			untracked(() => {
				const previous = this.shown();

				if (value === null) {
					return;
				}

				const now = Date.now();
				const ticking = now - this.lastChange < TICKING_MS;
				const changed = previous !== null && String(previous) !== String(value);

				this.shown.set(value);

				if (previous === null || changed) {
					this.lastChange = now;
				}

				if (changed && !ticking && !this.reducedMotion) {
					this.highlight.set(true);
					clearTimeout(this.timer);
					this.timer = setTimeout(() => {
						this.highlight.set(false);
					}, HIGHLIGHT_MS);
				}
			});
		});
		inject(DestroyRef).onDestroy(() => {
			clearTimeout(this.timer);
		});
	}
}
