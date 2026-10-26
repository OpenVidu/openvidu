import { Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import type { FeatureKey } from '@openvidu-dashboard/typings';

import { EXTERNAL_LINKS } from '../../core/links.js';
import { FEATURE_COPY } from './features.js';

/**
 * The lock of a PRO feature in CE: title, explanation and a link to OpenVidu PRO. The page variant covers a dimmed,
 * non-interactive silhouette of three tiles and one block; the card variant sizes to its message. It never calls the
 * locked endpoint.
 */
@Component({
	selector: 'ovd-pro-lock-overlay',
	imports: [MatIcon],
	host: { '[class.page]': "variant() === 'page'" },
	template: `
		@if (variant() === 'page') {
			<div class="backdrop" aria-hidden="true" inert>
				<div class="tiles">
					<div class="bar tile"></div>
					<div class="bar tile"></div>
					<div class="bar tile"></div>
				</div>
				<div class="bar block"></div>
			</div>
		}
		<div class="card">
			<mat-icon svgIcon="lock" aria-hidden="true" />
			<div class="text">
				<p class="title">{{ copy().title }} is available in OpenVidu PRO</p>
				<p>{{ copy().description }}</p>
				<div class="actions">
					<a [href]="proUrl" target="_blank" rel="noopener">
						Learn about OpenVidu PRO
						<mat-icon svgIcon="open_in_new" aria-hidden="true" />
						<span class="ovd-visually-hidden">(opens in a new tab)</span>
					</a>
					<ng-content select="[ovdLockAction]" />
				</div>
			</div>
		</div>
	`,
	styles: `
		:host {
			position: relative;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 16px;
			border: 1px dashed var(--mat-sys-outline);
			border-radius: 12px;
			background: var(--mat-sys-surface-container-low);
		}

		:host(.page) {
			align-items: flex-start;
			min-height: 420px;
			border: 0;
			background: none;
			padding: 0;
		}

		.backdrop {
			position: absolute;
			inset: 0;
			display: flex;
			flex-direction: column;
			gap: 16px;
			opacity: 0.4;
			pointer-events: none;
		}

		.bar {
			border-radius: 12px;
			background: var(--mat-sys-surface-container-high);
		}

		.tiles {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			gap: 16px;
		}

		.tile {
			height: 104px;
		}

		.block {
			flex: 1;
		}

		.card {
			position: relative;
			display: flex;
			gap: 16px;
			max-width: 640px;
			padding: 24px;
			border-radius: 12px;
			background: var(--mat-sys-surface-container);
		}

		:host(.page) .card {
			margin-top: 48px;
			border: 1px solid var(--mat-sys-outline-variant);
		}

		.text p {
			margin: 0 0 8px;
		}

		.title {
			font: var(--mat-sys-title-medium);
		}

		.actions {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 16px;
			margin-top: 8px;

			a mat-icon {
				width: 16px;
				height: 16px;
				vertical-align: text-bottom;
			}
		}
	`
})
export class ProLockOverlay {
	readonly feature = input.required<FeatureKey>();
	readonly variant = input<'page' | 'card'>('card');

	protected readonly proUrl = EXTERNAL_LINKS.pro;
	protected readonly copy = computed(() => FEATURE_COPY[this.feature()]);
}
