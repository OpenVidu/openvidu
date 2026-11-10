import { afterNextRender, Component, computed, DestroyRef, effect, ElementRef, inject, signal } from '@angular/core';

import { balancedColumns } from '../components/tiles/tile-row.js';

export const CHART_MIN_WIDTH_PX = 420;
export const CHART_GAP_PX = 16;

/**
 * Charts (projected children) in the fewest rows in which each is at least 420 px wide, spread evenly, the charts of a
 * shorter last row sharing its width. It measures itself after its first render, before the browser paints, and again
 * when its width or its charts change; until then the charts wrap at the minimum width. The width of each chart comes
 * from the `--ovd-chart-basis` rule of the library styles, as projected children take no styles of this component.
 */
@Component({
	selector: 'ovd-chart-grid',
	template: '<ng-content />',
	styles: `
		:host {
			display: flex;
			flex-wrap: wrap;
			gap: 16px;
		}
	`
})
export class ChartGrid {
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
	private readonly width = signal(0);
	private readonly count = signal(0);

	readonly columns = computed(() => balancedColumns(this.count(), this.width(), CHART_MIN_WIDTH_PX, CHART_GAP_PX));

	constructor() {
		const destroyRef = inject(DestroyRef);

		// Written directly: a host style binding would not refresh when only these signals change.
		effect(() => {
			const columns = this.columns();
			const style = this.host.nativeElement.style;

			if (this.width() === 0) {
				style.removeProperty('--ovd-chart-basis');

				return;
			}

			// Half a pixel under the exact share, so rounding never moves the last chart of a full row to the next one.
			style.setProperty(
				'--ovd-chart-basis',
				`calc((100% - ${String((columns - 1) * CHART_GAP_PX)}px) / ${String(columns)} - 0.5px)`
			);
		});

		afterNextRender(() => {
			const element = this.host.nativeElement;
			let frame = 0;

			this.count.set(element.childElementCount);
			this.width.set(element.clientWidth);

			const mutations = new MutationObserver(() => {
				this.count.set(element.childElementCount);
			});

			mutations.observe(element, { childList: true });
			destroyRef.onDestroy(() => {
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
