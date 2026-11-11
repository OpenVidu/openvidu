import { booleanAttribute, Component, computed, DOCUMENT, inject, input, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { NgxEchartsDirective } from 'ngx-echarts';

import { InfoTip } from '../components/info-tip/info-tip.js';
import { formatPercent } from '../format/formatters.js';
import { ChartColorsService } from './chart-colors.js';
import { type BreakdownEntry, breakdownOption, formatValue, type ValueFormat } from './chart-options.js';
import { bindChartOptions, injectEchartsReady, provideLazyEcharts } from './echarts-provider.js';

/**
 * A donut or horizontal bar with direct labels and a fixed colour per entity; more than eight fold into "Other". An
 * ordered breakdown keeps its entries in order, every one shown and none folded, and reads "No data in this range" when
 * every value is 0. An unavailable breakdown keeps its heading, dims it and draws an empty ring or plot over hatching,
 * without slices, labels, legend, tooltip or table.
 */
@Component({
	selector: 'ovd-breakdown-chart',
	imports: [InfoTip, MatButton, NgxEchartsDirective],
	providers: [provideLazyEcharts()],
	host: { '[class.dimmed]': 'unavailable()' },
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
		} @else if (showTable() && !unavailable()) {
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
				[class.unavailable]="unavailable()"
				role="img"
				tabindex="0"
				[attr.aria-label]="summary()"
				echarts
				[options]="chartOptions.value()"
				[style.height.px]="height()"
				(chartInit)="chartOptions.attach($event)"
			></div>
		} @else {
			<div
				class="chart"
				[class.unavailable]="unavailable()"
				role="img"
				tabindex="0"
				[attr.aria-label]="summary()"
				[style.height.px]="height()"
			></div>
		}
		@if (!unavailable() && !empty()) {
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
	/** The breakdown reflects no data: dimmed, an empty ring or plot, no labels, legend, tooltip or table. */
	readonly unavailable = input(false, { transform: booleanAttribute });
	/** Keep the entries in their order, every one shown, none folded into "Other"; empty when every value is 0. */
	readonly ordered = input(false, { transform: booleanAttribute });

	protected readonly ready = injectEchartsReady();
	protected readonly showTable = signal(false);
	protected readonly empty = computed(
		() => this.ordered() && !this.unavailable() && this.entries().every((entry) => entry.value === 0)
	);
	protected readonly option = computed(() =>
		breakdownOption({
			entries: this.entries(),
			variant: this.variant(),
			format: this.format(),
			colors: this.palette.colors(),
			animation: !this.reducedMotion,
			unavailable: this.unavailable(),
			ordered: this.ordered()
		})
	);
	protected readonly chartOptions = bindChartOptions(this.option);
	/** Every entry, unfolded, for the table. */
	protected readonly rows = computed(() => {
		const total = this.entries().reduce((sum, entry) => sum + entry.value, 0);

		const entries = this.ordered() ? [...this.entries()] : [...this.entries()].sort((a, b) => b.value - a.value);

		return entries.map((entry) => ({
			name: entry.name,
			value: formatValue(entry.value, this.format()),
			share: formatPercent(total > 0 ? entry.value / total : 0)
		}));
	});
	protected readonly summary = computed(() =>
		this.unavailable()
			? `${this.heading()}: not available`
			: `${this.heading()}: ${this.rows()
					.map((row) => `${row.name} ${row.value}`)
					.join(', ')}.`
	);

	protected toggleTable(): void {
		this.chartOptions.detach();
		this.showTable.update((shown) => !shown);
	}
}
