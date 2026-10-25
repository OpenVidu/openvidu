import {
	afterNextRender,
	Component,
	computed,
	DestroyRef,
	effect,
	ElementRef,
	inject,
	input,
	signal
} from '@angular/core';

export const TILE_GAP_PX = 12;
export const TILE_MIN_WIDTH_PX = 150;

/**
 * Columns that put `count` tiles of at least `minWidth` px in the fewest rows of `width` px and spread them evenly:
 * seven tiles with room for five take four columns (4 + 3), not five (5 + 2).
 */
export function balancedColumns(count: number, width: number, minWidth = TILE_MIN_WIDTH_PX, gap = TILE_GAP_PX): number {
	if (count <= 0) {
		return 1;
	}

	const fit = Math.max(1, Math.floor((width + gap) / (minWidth + gap)));
	const rows = Math.ceil(count / fit);

	return Math.ceil(count / rows);
}

function px(value: string): number {
	return Number.parseFloat(value) || 0;
}

/**
 * Width of the widest tile of `row` with its value on one line: each value is measured through a hidden unwrapped copy,
 * plus its tile's padding and border; 0 when nothing can be measured.
 */
export function oneLineTileWidth(row: HTMLElement): number {
	const values = [...row.querySelectorAll<HTMLElement>('ovd-kpi-tile .value')];
	const tile = values[0]?.closest('ovd-kpi-tile');

	if (tile === undefined || tile === null) {
		return 0;
	}

	// Every tile shares the same padding and border.
	const style = getComputedStyle(tile);
	const frame =
		px(style.paddingLeft) + px(style.paddingRight) + px(style.borderLeftWidth) + px(style.borderRightWidth);
	let widest = 0;

	for (const value of values) {
		const copy = value.cloneNode(true) as HTMLElement;

		copy.style.cssText = 'position: absolute; visibility: hidden; white-space: nowrap; width: max-content;';
		value.after(copy);
		widest = Math.max(widest, copy.getBoundingClientRect().width);
		copy.remove();
	}

	return widest === 0 ? 0 : Math.ceil(widest + frame);
}

/** Lengths of the tile values, which change far less often than the values themselves (a ticking duration). */
function valueLengths(row: HTMLElement): string {
	return [...row.querySelectorAll('ovd-kpi-tile .value')].map((value) => value.textContent.length).join(',');
}

/**
 * A row of KPI tiles (projected children) laid out in balanced columns, recomputed when its width, its tiles or their
 * values change. Tiles widen to keep each value on one line when the row can hold them, and wrap otherwise. It measures
 * itself after its first render, before the browser paints; until then the tiles wrap at the minimum width.
 */
@Component({
	selector: 'ovd-tile-row',
	template: '<ng-content />',
	host: { '[class.measured]': 'width() > 0' },
	styles: `
		:host {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(min(var(--ovd-tile-min, 150px), 100%), 1fr));
			gap: 12px;
			margin-bottom: 16px;
		}

		:host(.measured) {
			grid-template-columns: repeat(var(--ovd-tile-columns), minmax(0, 1fr));
		}
	`
})
export class TileRow {
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
	protected readonly width = signal(0);
	private readonly count = signal(0);
	/** Widest tile with its value on one line. */
	private readonly oneLine = signal(0);

	/** Narrowest tile, in pixels. */
	readonly minWidth = input(TILE_MIN_WIDTH_PX);

	readonly columns = computed(() =>
		balancedColumns(this.count(), this.width(), Math.max(this.minWidth(), this.oneLine()))
	);

	constructor() {
		const destroyRef = inject(DestroyRef);

		// Written directly: a host style binding would not refresh when only these signals change.
		effect(() => {
			const style = this.host.nativeElement.style;

			style.setProperty('--ovd-tile-min', `${String(this.minWidth())}px`);
			style.setProperty('--ovd-tile-columns', String(this.columns()));
		});

		afterNextRender(() => {
			const element = this.host.nativeElement;
			let frame = 0;
			let measuring = 0;
			let lengths = valueLengths(element);

			this.count.set(element.childElementCount);
			this.width.set(element.clientWidth);
			this.oneLine.set(oneLineTileWidth(element));

			// Values change on refreshes and ticking durations; their unwrapped width does not depend on the columns, so
			// they are measured again only when a value changes length.
			const mutations = new MutationObserver(() => {
				cancelAnimationFrame(measuring);
				measuring = requestAnimationFrame(() => {
					const next = valueLengths(element);

					this.count.set(element.childElementCount);

					if (next !== lengths) {
						lengths = next;
						this.oneLine.set(oneLineTileWidth(element));
						// Drops the records of the measuring copies, which would otherwise trigger another measure.
						mutations.takeRecords();
					}
				});
			});

			mutations.observe(element, { childList: true, subtree: true, characterData: true });
			destroyRef.onDestroy(() => {
				cancelAnimationFrame(measuring);
				mutations.disconnect();
			});

			if (typeof ResizeObserver === 'undefined') {
				return;
			}

			// Only the width is read, in an animation frame, so a change of columns never loops the observer.
			const resize = new ResizeObserver(([entry]) => {
				cancelAnimationFrame(frame);
				frame = requestAnimationFrame(() => {
					this.width.set(entry?.contentRect.width ?? 0);
				});
			});

			resize.observe(element);
			destroyRef.onDestroy(() => {
				cancelAnimationFrame(frame);
				resize.disconnect();
			});
		});
	}
}
