import { computed, effect, inject, type Provider, type Signal, signal, untracked } from '@angular/core';
import { NGX_ECHARTS_CONFIG, provideEchartsCore } from 'ngx-echarts';

/** ECharts loaded on first use from its own chunk, with only the registered components. */
export function provideLazyEcharts(): Provider {
	return provideEchartsCore({ echarts: () => import('./echarts-setup.js').then((module) => module.echarts) });
}

/**
 * True once the ECharts module of the provider has loaded. A chart gets its options only then: ngx-echarts creates an
 * instance per options change while the module is still loading, and two `init()` on one element leak the first.
 */
export function injectEchartsReady(): Signal<boolean> {
	const ready = signal(false);
	const echarts: unknown = inject(NGX_ECHARTS_CONFIG).echarts;
	const loaded = typeof echarts === 'function' ? (echarts as () => Promise<unknown>)() : Promise.resolve(echarts);

	void loaded.then(() => {
		ready.set(true);
	});

	return ready.asReadonly();
}

/** The part of an ECharts instance a binding updates. */
export interface ChartInstance {
	setOption(option: object, options: { replaceMerge: string[] }): void;
}

/** The options bound to the `echarts` directive of one chart element. */
export interface ChartOptionsBinding<T> {
	/** Options of the directive: fixed from the element's creation, so ngx-echarts never rebuilds the chart. */
	readonly value: Signal<T>;
	/** Call from `(chartInit)`: later options are merged into the instance from then on. */
	attach(chart: ChartInstance): void;
	/** Call when the chart element is removed (table view), so the next element starts from the current options. */
	detach(): void;
}

/**
 * Options of one chart element. The directive receives the options of the element's creation only: ngx-echarts calls
 * `setOption(options, true)` on every change, which rebuilds the chart and replays its entry animation, and runs a
 * second `init()` when they change while it is still creating the instance. Later options are merged into the instance,
 * replacing the series and without animation, so a refresh redraws in place.
 */
export function bindChartOptions<T extends object>(option: Signal<T>): ChartOptionsBinding<T> {
	/** Bumped when the element goes away, so the next one reads the options of its own creation. */
	const element = signal(0);
	// Read on first use, once the inputs of the chart are set, then fixed for the element.
	const initial = computed(() => {
		element();

		return untracked(option);
	});
	const instance = signal<ChartInstance | null>(null);
	let applied: T | undefined;

	effect(() => {
		const chart = instance();
		const next = option();

		if (chart === null || next === applied) {
			return;
		}

		applied = next;
		chart.setOption({ ...next, animation: false }, { replaceMerge: ['series'] });
	});

	return {
		value: initial,
		attach: (chart) => {
			applied = untracked(initial);
			instance.set(chart);
		},
		detach: () => {
			instance.set(null);
			element.update((count) => count + 1);
		}
	};
}
