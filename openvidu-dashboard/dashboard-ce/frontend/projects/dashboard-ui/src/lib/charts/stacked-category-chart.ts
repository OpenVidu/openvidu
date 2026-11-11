import { Component, computed, DOCUMENT, inject, input, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { NgxEchartsDirective } from 'ngx-echarts';

import { InfoTip } from '../components/info-tip/info-tip.js';
import { ChartColorsService } from './chart-colors.js';
import { type CategorySeries, formatValue, stackedCategoryOption, type ValueFormat } from './chart-options.js';
import { bindChartOptions, injectEchartsReady, provideLazyEcharts } from './echarts-provider.js';

/**
 * One vertical bar per key, every key shown in its order even without data, stacked by series in their fixed colours,
 * with a legend, a tooltip that adds up the bar and a table toggle; "No data in this range" when every value is 0.
 */
@Component({
	selector: 'ovd-stacked-category-chart',
	imports: [InfoTip, MatButton, NgxEchartsDirective],
	providers: [provideLazyEcharts()],
	template: `
		<div class="chart-heading">
			<h3 class="chart-title">{{ heading() }}</h3>
			@if (info(); as info) {
				<ovd-info-tip [text]="info" [subject]="heading()" />
			}
		</div>
		@if (note()) {
			<p class="chart-note">{{ note() }}</p>
		}
		@if (empty()) {
			<p class="chart-empty" [style.height.px]="height()">No data in this range</p>
		} @else if (showTable()) {
			<div class="table-wrap" [style.max-height.px]="height()">
				<table>
					<caption class="ovd-visually-hidden">
						{{
							heading()
						}}
					</caption>
					<thead>
						<tr>
							<th scope="col">{{ keyHeading() }}</th>
							@for (item of series(); track item.name) {
								<th scope="col">{{ item.name }}</th>
							}
							<th scope="col">Total</th>
						</tr>
					</thead>
					<tbody>
						@for (row of rows(); track row.key) {
							<tr>
								<th scope="row">{{ row.key }}</th>
								@for (value of row.values; track $index) {
									<td class="ovd-tabular">{{ value }}</td>
								}
								<td class="ovd-tabular">{{ row.total }}</td>
							</tr>
						}
					</tbody>
				</table>
			</div>
		} @else if (ready()) {
			<div
				class="chart"
				role="img"
				tabindex="0"
				[attr.aria-label]="summary()"
				echarts
				[options]="chartOptions.value()"
				[style.height.px]="height()"
				(chartInit)="chartOptions.attach($event)"
			></div>
		} @else {
			<div class="chart" role="img" tabindex="0" [attr.aria-label]="summary()" [style.height.px]="height()"></div>
		}
		@if (!empty()) {
			<button matButton type="button" class="toggle" (click)="toggleTable()">
				{{ showTable() ? 'Show chart' : 'Show table' }}
			</button>
		}
	`,
	styleUrl: './chart.scss',
	styles: `
		.chart-empty {
			display: flex;
			align-items: center;
			justify-content: center;
			margin: 0;
			color: var(--mat-sys-on-surface-variant);
			font: var(--mat-sys-body-medium);
		}
	`
})
export class StackedCategoryChart {
	private readonly palette = inject(ChartColorsService);
	private readonly reducedMotion =
		inject(DOCUMENT).defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? false;

	readonly heading = input.required<string>();
	/** Explanation of the heading, shown by an info tip after it. */
	readonly info = input<string>();
	/** The categories of the x axis, in order. */
	readonly keys = input.required<readonly string[]>();
	/** Name of the categories in the table header. */
	readonly keyHeading = input('Category');
	readonly series = input.required<readonly CategorySeries[]>();
	readonly format = input<ValueFormat>('number');
	readonly height = input(280);
	/** Shown under the heading, e.g. the unit or the bucket. */
	readonly note = input<string>();

	protected readonly ready = injectEchartsReady();
	protected readonly showTable = signal(false);
	protected readonly empty = computed(() =>
		this.series().every((series) => series.values.every((value) => value === 0))
	);
	protected readonly option = computed(() =>
		stackedCategoryOption({
			keys: this.keys(),
			series: this.series(),
			format: this.format(),
			colors: this.palette.colors(),
			animation: !this.reducedMotion
		})
	);
	protected readonly chartOptions = bindChartOptions(this.option);
	protected readonly rows = computed(() =>
		this.keys().map((key, index) => {
			const values = this.series().map((series) => series.values[index] ?? 0);

			return {
				key,
				values: values.map((value) => formatValue(value, this.format())),
				total: formatValue(
					values.reduce((sum, value) => sum + value, 0),
					this.format()
				)
			};
		})
	);
	protected readonly summary = computed(
		() =>
			`${this.heading()}: ${this.rows()
				.map((row) => `${row.key} ${row.total}`)
				.join(', ')}.`
	);

	protected toggleTable(): void {
		this.chartOptions.detach();
		this.showTable.update((shown) => !shown);
	}
}
