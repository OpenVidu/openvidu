import { booleanAttribute, Component, computed, DOCUMENT, inject, input, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import type { ECharts } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';

import { QueryStateService } from '../../core/state/query-state.js';
import { formatTimestamp } from '../../format/formatters.js';
import { ChartColorsService } from '../chart-colors.js';
import {
	brushRange,
	CHART_GROUP,
	type ChartMarker,
	type ChartSeries,
	chartSummary,
	formatValue,
	type QualityBand,
	type SeriesKind,
	timeSeriesOption,
	type ValueFormat
} from '../chart-options.js';
import { InfoTip } from '../../components/info-tip/info-tip.js';
import { bindChartOptions, injectEchartsReady, provideLazyEcharts } from '../echarts-provider.js';

interface BrushEndEvent {
	areas?: { coordRange?: [number, number] }[];
}

/**
 * A time series fixed to the range: x axis from `from` to `to` in the zone, gaps for missing buckets, no zoom, a tooltip
 * shared with the other charts of the page, at most 50 markers and an optional brush that writes an absolute range to
 * the URL. It exposes a text summary and a data table for assistive technology.
 */
@Component({
	selector: 'ovd-time-series-chart',
	imports: [InfoTip, MatButton, MatIcon, NgxEchartsDirective],
	providers: [provideLazyEcharts()],
	templateUrl: './time-series-chart.html',
	styleUrl: '../chart.scss'
})
export class TimeSeriesChart {
	private readonly query = inject(QueryStateService);
	private readonly palette = inject(ChartColorsService);
	private readonly reducedMotion =
		inject(DOCUMENT).defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? false;

	readonly heading = input.required<string>();
	/** Explanation of the heading, shown by an info tip after it. */
	readonly info = input<string>();
	readonly series = input.required<readonly ChartSeries[]>();
	readonly from = input.required<string>();
	readonly to = input.required<string>();
	readonly tz = input.required<string>();
	readonly format = input<ValueFormat>('number');
	readonly kind = input<SeriesKind>('line');
	readonly stacked = input(false, { transform: booleanAttribute });
	readonly markers = input<readonly ChartMarker[]>([]);
	/** Lets the user drag over the chart to narrow the page range. */
	readonly brush = input(false, { transform: booleanAttribute });
	readonly height = input(280);
	readonly yRange = input<{ min: number; max: number }>();
	readonly bands = input<readonly QualityBand[]>();
	/** Shown under the heading, e.g. the bucket ("Hourly") or the unit ("per UTC day"). */
	readonly note = input<string>();

	protected readonly ready = injectEchartsReady();
	protected readonly showTable = signal(false);
	protected readonly previousRange = signal<{ from: string | null; to: string | null } | null>(null);
	protected readonly option = computed(() => {
		const yRange = this.yRange();
		const bands = this.bands();

		return timeSeriesOption({
			series: this.series(),
			from: this.from(),
			to: this.to(),
			tz: this.tz(),
			format: this.format(),
			kind: this.kind(),
			stacked: this.stacked(),
			markers: this.markers(),
			brush: this.brush(),
			colors: this.palette.colors(),
			animation: !this.reducedMotion,
			...(yRange === undefined ? {} : { yRange }),
			...(bands === undefined ? {} : { bands })
		});
	});
	protected readonly chartOptions = bindChartOptions(this.option);
	protected readonly summary = computed(() =>
		chartSummary(this.heading(), {
			series: this.series(),
			from: this.from(),
			to: this.to(),
			tz: this.tz(),
			format: this.format()
		})
	);
	protected readonly table = computed(() => {
		const buckets = [...new Set(this.series().flatMap((series) => series.points.map(([ts]) => ts)))].sort();

		return buckets.map((ts) => ({
			ts,
			label: formatTimestamp(ts, { tz: this.tz() }),
			values: this.series().map((series) => {
				const value = series.points.find(([point]) => point === ts)?.[1] ?? null;

				return value === null ? '—' : formatValue(value, this.format());
			})
		}));
	});

	protected toggleTable(): void {
		this.chartOptions.detach();
		this.showTable.update((shown) => !shown);
	}

	protected async onInit(chart: ECharts): Promise<void> {
		this.chartOptions.attach(chart);
		chart.group = CHART_GROUP;

		const { echarts } = await import('../echarts-setup.js');

		echarts.connect(CHART_GROUP);

		if (this.brush()) {
			chart.dispatchAction({
				type: 'takeGlobalCursor',
				key: 'brush',
				brushOption: { brushType: 'lineX', brushMode: 'single' }
			});
		}
	}

	protected onBrushEnd(event: unknown): void {
		const coordRange = (event as BrushEndEvent).areas?.[0]?.coordRange;

		if (coordRange === undefined) {
			return;
		}

		this.previousRange.update(
			(previous) => previous ?? { from: this.query.value('from'), to: this.query.value('to') }
		);
		void this.query.navigate(brushRange(coordRange, this.tz()));
	}

	protected resetRange(): void {
		const previous = this.previousRange();

		if (previous !== null) {
			this.previousRange.set(null);
			void this.query.navigate(previous);
		}
	}
}
