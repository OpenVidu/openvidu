import { Component, computed, DOCUMENT, inject, input, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { NgxEchartsDirective } from 'ngx-echarts';

import { InfoTip } from '../components/info-tip/info-tip.js';
import { formatPercent } from '../format/formatters.js';
import { ChartColorsService } from './chart-colors.js';
import { type BreakdownEntry, breakdownOption, formatValue, type ValueFormat } from './chart-options.js';
import { bindChartOptions, injectEchartsReady, provideLazyEcharts } from './echarts-provider.js';

/** A donut or horizontal bar with direct labels and a fixed colour per entity; more than eight fold into "Other". */
@Component({
	selector: 'ovd-breakdown-chart',
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
		@if (showTable()) {
			<div class="table-wrap" [style.max-height.px]="height()">
				<table>
					<caption class="ovd-visually-hidden">
						{{
							heading()
						}}
					</caption>
					<thead>
						<tr>
							<th scope="col">Name</th>
							<th scope="col">Value</th>
							<th scope="col">Share</th>
						</tr>
					</thead>
					<tbody>
						@for (entry of rows(); track entry.name) {
							<tr>
								<th scope="row">{{ entry.name }}</th>
								<td class="ovd-tabular">{{ entry.value }}</td>
								<td class="ovd-tabular">{{ entry.share }}</td>
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
		<button matButton type="button" class="toggle" (click)="toggleTable()">
			{{ showTable() ? 'Show chart' : 'Show table' }}
		</button>
	`,
	styleUrl: './chart.scss'
})
export class BreakdownChart {
	private readonly palette = inject(ChartColorsService);
	private readonly reducedMotion =
		inject(DOCUMENT).defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? false;

	readonly heading = input.required<string>();
	/** Explanation of the heading, shown by an info tip after it. */
	readonly info = input<string>();
	readonly entries = input.required<readonly BreakdownEntry[]>();
	readonly variant = input<'donut' | 'bar'>('donut');
	readonly format = input<ValueFormat>('number');
	readonly height = input(240);
	/** Shown under the heading, e.g. the unit or the bucket. */
	readonly note = input<string>();

	protected readonly ready = injectEchartsReady();
	protected readonly showTable = signal(false);
	protected readonly option = computed(() =>
		breakdownOption({
			entries: this.entries(),
			variant: this.variant(),
			format: this.format(),
			colors: this.palette.colors(),
			animation: !this.reducedMotion
		})
	);
	protected readonly chartOptions = bindChartOptions(this.option);
	/** Every entry, unfolded, for the table. */
	protected readonly rows = computed(() => {
		const total = this.entries().reduce((sum, entry) => sum + entry.value, 0);

		return [...this.entries()]
			.sort((a, b) => b.value - a.value)
			.map((entry) => ({
				name: entry.name,
				value: formatValue(entry.value, this.format()),
				share: formatPercent(total > 0 ? entry.value / total : 0)
			}));
	});
	protected readonly summary = computed(
		() =>
			`${this.heading()}: ${this.rows()
				.map((row) => `${row.name} ${row.value}`)
				.join(', ')}.`
	);

	protected toggleTable(): void {
		this.chartOptions.detach();
		this.showTable.update((shown) => !shown);
	}
}
