import { Component, computed, input } from '@angular/core';

export type SkeletonVariant = 'rows' | 'tiles' | 'chart' | 'text';

/** Placeholder with the height of what it replaces, so content never jumps when it arrives. */
@Component({
	selector: 'ovd-skeleton',
	template: `
		<div class="ovd-visually-hidden" role="status">Loading</div>
		@switch (variant()) {
			@case ('rows') {
				@for (row of items(); track row) {
					<div class="bar row"></div>
				}
			}
			@case ('tiles') {
				<div class="tiles">
					@for (tile of items(); track tile) {
						<div class="bar tile"></div>
					}
				</div>
			}
			@case ('chart') {
				<div class="bar" [style.height.px]="height()"></div>
			}
			@default {
				@for (line of items(); track line) {
					<div class="bar text"></div>
				}
			}
		}
	`,
	styles: `
		:host {
			display: block;
		}

		.bar {
			border-radius: 4px;
			background: var(--mat-sys-surface-container-high);
		}

		.row {
			height: 36px;
			margin: 4px 0;
		}

		.tiles {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
			gap: 16px;
		}

		.tile {
			height: 104px;
			border-radius: 12px;
		}

		.text {
			height: 14px;
			margin: 6px 0;
		}

		.text:last-child {
			width: 60%;
		}
	`
})
export class Skeleton {
	readonly variant = input<SkeletonVariant>('text');
	/** Rows, tiles or text lines. */
	readonly count = input(3);
	/** Height of the chart variant in pixels. */
	readonly height = input(280);

	protected readonly items = computed(() => Array.from({ length: this.count() }, (_, index) => index));
}
