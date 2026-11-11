import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatTooltip } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { describe, expect, it, vi } from 'vitest';

import { routeElement } from '../../testing/harness.js';
import { BreakdownChart } from './breakdown-chart.js';
import type { ChartColors } from './chart-colors.js';
import {
	breakdownOption,
	brushRange,
	chartMarkers,
	chartSlots,
	chartSummary,
	entityColor,
	entitySlot,
	fittedPercentRange,
	foldBreakdown,
	MAX_MARKERS,
	OTHER,
	timeSeriesOption
} from './chart-options.js';
import { bindChartOptions } from './echarts-provider.js';
import { TimeSeriesChart } from './time-series-chart/time-series-chart.js';

const COLORS: ChartColors = {
	slots: ['#0088aa', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#2f4b7c', '#6250d6', '#e34948'],
	other: '#70787c',
	text: '#40484c',
	grid: '#bfc8cc',
	surface: '#f8fafb'
};

const NEVER_LOADED = { provide: NGX_ECHARTS_CONFIG, useValue: { echarts: () => new Promise(() => undefined) } };

describe('chart options', () => {
	const series = [
		{
			name: 'Upload',
			entity: 'upstream',
			points: [
				['2026-10-13T10:00:00.000Z', 1_000_000],
				['2026-10-13T11:00:00.000Z', null],
				['2026-10-13T12:00:00.000Z', 3_000_000]
			] as [string, number | null][]
		}
	];

	it('fixes the x axis to the range, keeps gaps and registers no zoom', () => {
		const option = timeSeriesOption({
			series,
			from: '2026-10-13T00:00:00.000Z',
			to: '2026-10-14T00:00:00.000Z',
			tz: 'UTC',
			format: 'bytes',
			kind: 'line',
			colors: COLORS,
			animation: false
		}) as {
			xAxis: { min: number; max: number };
			yAxis: Record<string, unknown>;
			series: { connectNulls: boolean; lineStyle: { width: number; color: string } }[];
			dataZoom?: unknown;
		};

		expect(option.xAxis.min).toBe(Date.parse('2026-10-13T00:00:00.000Z'));
		expect(option.xAxis.max).toBe(Date.parse('2026-10-14T00:00:00.000Z'));
		expect(option.xAxis).not.toHaveProperty('name');
		expect(option.series[0]?.connectNulls).toBe(false);
		expect(option.series[0]?.lineStyle).toEqual({ width: 2, color: '#0088aa' });
		expect(option.dataZoom).toBeUndefined();
		expect(option.yAxis).not.toHaveProperty('name');
	});

	describe('axes and steps', () => {
		const counts = (
			points: [string, number | null][],
			kind: 'step' | 'line' = 'step',
			from = '2026-10-13T10:06:00.000Z',
			to = '2026-10-13T10:09:50.000Z'
		) =>
			timeSeriesOption({
				series: [{ name: 'Active participants', points }],
				from,
				to,
				tz: 'UTC',
				format: 'number',
				kind,
				colors: COLORS,
				animation: false
			}) as {
				xAxis: { minInterval: number };
				yAxis: { minInterval?: number };
				series: { data: [number, number | null][] }[];
			};
		const minutes: [string, number | null][] = [
			['2026-10-13T10:06:00.000Z', 3],
			['2026-10-13T10:07:00.000Z', 3],
			['2026-10-13T10:08:00.000Z', 2],
			['2026-10-13T10:09:00.000Z', 1]
		];

		it('never ticks the x axis closer than the unit of its labels', () => {
			expect(counts(minutes, 'step', '2026-10-13T10:06:20.000Z').xAxis.minInterval).toBe(60_000);
			expect(
				counts(minutes, 'line', '2026-10-01T00:00:00.000Z', '2026-10-13T10:09:50.000Z').xAxis.minInterval
			).toBe(86_400_000);
		});

		it('ticks the y axis at whole numbers only when every value is an integer', () => {
			expect(counts(minutes).yAxis.minInterval).toBe(1);
			expect(counts([...minutes, ['2026-10-13T10:09:30.000Z', 0.5]]).yAxis).not.toHaveProperty('minInterval');
		});

		it('holds the last value of a step series until the end of the range', () => {
			expect(counts(minutes).series[0]?.data.at(-1)).toEqual([Date.parse('2026-10-13T10:09:50.000Z'), 1]);
			expect(counts(minutes, 'line').series[0]?.data).toHaveLength(4);
			expect(counts([...minutes.slice(0, 3), ['2026-10-13T10:09:00.000Z', null]]).series[0]?.data.at(-1)).toEqual(
				[Date.parse('2026-10-13T10:09:00.000Z'), null]
			);
		});
	});

	it('draws at most 50 markers and otherwise reports the count', () => {
		const markers = (count: number) =>
			Array.from({ length: count }, (_, i) => ({
				ts: `2026-10-13T10:${String(i % 60).padStart(2, '0')}:00Z`,
				label: 'join'
			}));

		expect(chartMarkers(markers(MAX_MARKERS)).shown).toHaveLength(50);
		expect(chartMarkers(markers(120))).toEqual({ shown: [], overflow: 120 });

		const option = timeSeriesOption({
			series,
			from: '2026-10-13T00:00:00.000Z',
			to: '2026-10-14T00:00:00.000Z',
			tz: 'UTC',
			format: 'number',
			kind: 'line',
			markers: markers(120),
			colors: COLORS,
			animation: false
		}) as { graphic?: { style: { text: string } }; series: { markLine?: unknown }[] };

		expect(option.graphic?.style.text).toBe('120 events in range');
		expect(option.series[0]?.markLine).toBeUndefined();

		const few = timeSeriesOption({
			series,
			from: '2026-10-13T00:00:00.000Z',
			to: '2026-10-14T00:00:00.000Z',
			tz: 'UTC',
			format: 'number',
			kind: 'line',
			markers: markers(3),
			colors: COLORS,
			animation: false
		}) as { series: { markLine?: { label: { show: boolean }; emphasis: { label: { show: boolean } } } }[] };

		expect(few.series[0]?.markLine?.label.show).toBe(false);
		expect(few.series[0]?.markLine?.emphasis.label.show).toBe(true);
	});

	it('summarises range, zone and min, max and last of each series', () => {
		expect(
			chartSummary('Bandwidth', {
				series,
				from: '2026-10-13T00:00:00Z',
				to: '2026-10-14T00:00:00Z',
				tz: 'UTC',
				format: 'bytes'
			})
		).toBe(
			'Bandwidth, 2026-10-13 00:00:00 UTC to 2026-10-14 00:00:00 UTC (UTC). Upload: min 1 MB, max 3 MB, last 3 MB.'
		);
	});

	it('turns a brushed x range into absolute ISO bounds in the zone', () => {
		expect(
			brushRange([Date.parse('2026-10-13T12:00:00Z'), Date.parse('2026-10-13T10:00:00Z')], 'Europe/Madrid')
		).toEqual({
			from: '2026-10-13T12:00:00+02:00',
			to: '2026-10-13T14:00:00+02:00'
		});
	});

	it('folds more than eight entries into Other and colours by entity, never by rank', () => {
		const sdks = ['js', 'swift', 'android', 'flutter', 'go', 'unity', 'react-native', 'python', 'rust'].map(
			(name, i) => ({ name, value: 100 - i })
		);
		const folded = foldBreakdown(sdks);

		expect(folded.map((entry) => entry.name)).toEqual([...sdks.slice(0, 8).map((entry) => entry.name), OTHER]);
		expect(folded.at(-1)?.value).toBe(92);
		expect(entityColor('js', COLORS)).toBe('#0088aa');
		expect(entityColor('swift', COLORS)).toBe('#eb6834');
		expect(entityColor(OTHER, COLORS)).toBe('#70787c');
		expect(entityColor('rust', COLORS)).toBe(entityColor('RUST', COLORS));
		expect(new Set(['Standard', 'Egress', 'Ingress', 'Agent'].map((kind) => entityColor(kind, COLORS))).size).toBe(
			4
		);
	});

	it('gives the egress end statuses four slots, failed in red, in every chart', () => {
		const statuses = ['egress_complete', 'egress_aborted', 'egress_limit_reached', 'egress_failed'];
		const option = timeSeriesOption({
			series: statuses.map((entity) => ({ name: entity.slice('egress_'.length), entity, points: [] })),
			from: '2026-10-13T00:00:00.000Z',
			to: '2026-10-14T00:00:00.000Z',
			tz: 'UTC',
			format: 'number',
			kind: 'bar',
			stacked: true,
			colors: COLORS,
			animation: false
		}) as { series: { itemStyle: { color: string } }[] };
		const colors = option.series.map((series) => series.itemStyle.color);

		expect([...chartSlots(statuses).values()]).toEqual([3, 4, 7, 8]);
		expect(new Set(colors).size).toBe(4);
		expect(colors.at(-1)).toBe('#e34948');
		// A border in the surface colour would cover the narrow bars of many buckets.
		expect(
			(option as { series: { itemStyle: { borderWidth?: number } }[] }).series.every(
				(series) => (series.itemStyle.borderWidth ?? 0) === 0
			)
		).toBe(true);
	});

	it('gives the room topologies six slots, N:M in the Rooms colour and none in red', () => {
		const topologies = [
			'topology_empty',
			'topology_single_participant',
			'topology_no_publishers',
			'topology_one_to_one',
			'topology_one_to_many',
			'topology_many_to_many'
		];

		expect([...chartSlots(topologies).values()]).toEqual([2, 5, 4, 7, 6, 1]);
		expect(entitySlot('topology_many_to_many')).toBe(entitySlot('rooms'));
		expect(topologies.map(entitySlot)).not.toContain(entitySlot('failed'));
	});

	it('gives the Analytics sections their slots and their main kinds the same ones', () => {
		expect(['rooms', 'participants', 'egress', 'ingress', 'success'].map(entitySlot)).toEqual([1, 7, 2, 6, 3]);
		expect(['STANDARD', 'EGRESS', 'INGRESS'].map(entitySlot)).toEqual([7, 2, 6]);
		expect(['room_composite', 'rtmp'].map(entitySlot)).toEqual([2, 6]);
	});

	it('keeps the kinds, egress types and input types of one chart distinct', () => {
		const kinds = chartSlots(['STANDARD', 'EGRESS', 'INGRESS', 'AGENT']);
		const types = chartSlots(['room_composite', 'web', 'participant', 'track_composite', 'track']);
		const inputs = chartSlots(['rtmp', 'whip', 'url']);

		expect(new Set(kinds.values()).size).toBe(4);
		expect([7, 2, 6]).not.toContain(kinds.get('AGENT'));
		expect(new Set(types.values()).size).toBe(5);
		expect(new Set(inputs.values()).size).toBe(3);
	});

	it('fits a percentage axis to its lowest value, by tens, up to 100 %', () => {
		const rates = (...values: (number | null)[]) => [
			{
				name: 'Connection success',
				points: values.map((value, i): [string, number | null] => [String(i), value])
			}
		];

		expect(fittedPercentRange(rates(0.962, 0.99, null))).toEqual({ min: 0.9, max: 1 });
		expect(fittedPercentRange(rates(0.62, 0.98))).toEqual({ min: 0.5, max: 1 });
		expect(fittedPercentRange(rates(0.03))).toEqual({ min: 0, max: 1 });
		expect(fittedPercentRange(rates(null, null))).toEqual({ min: 0, max: 1 });
		expect(fittedPercentRange(rates(0.95))).toEqual({ min: 0.9, max: 1 });

		const option = timeSeriesOption({
			series: rates(0.962),
			from: '2026-10-13T00:00:00.000Z',
			to: '2026-10-14T00:00:00.000Z',
			tz: 'UTC',
			format: 'percent',
			kind: 'line',
			fitted: true,
			colors: COLORS,
			animation: false
		}) as { yAxis: { min: number; max: number } };

		expect([option.yAxis.min, option.yAxis.max]).toEqual([0.9, 1]);
	});

	it('draws an unavailable breakdown as an empty ring without labels or legend', () => {
		const option = breakdownOption({
			entries: [{ name: 'room_composite', value: 5 }],
			variant: 'donut',
			format: 'number',
			colors: COLORS,
			animation: false,
			unavailable: true
		}) as { legend?: unknown; series: { label: { show: boolean }; data: { value: number }[]; silent: boolean }[] };

		expect(option.legend).toBeUndefined();
		expect(option.series[0]?.label.show).toBe(false);
		expect(option.series[0]?.silent).toBe(true);
		expect(option.series[0]?.data).toEqual([{ name: '', value: 1 }]);
	});

	it('moves an entity whose hashed slot is taken in its chart to the next free one', () => {
		const clash = Array.from({ length: 200 }, (_, i) => `entity-${String(i)}`).find(
			(name) => entitySlot(name) === 1
		);

		expect(clash).toBeDefined();
		expect(chartSlots(['js', clash ?? '']).get(clash ?? '')).toBe(2);
		expect(chartSlots([clash ?? '']).get(clash ?? '')).toBe(1);
		expect(chartSlots(['js', 'swift']).get('swift')).toBe(entitySlot('swift'));
	});
});

@Component({
	selector: 'ovd-unavailable-chart-host',
	imports: [TimeSeriesChart],
	template: `<ovd-time-series-chart
		heading="Bitrate up / down"
		[series]="series"
		from="2026-10-13T10:01:25Z"
		to="2026-10-13T10:06:55Z"
		tz="UTC"
		warning="This data is not available when using mediasoup as RTC engine. It will be available soon."
		unavailable
	/>`
})
class UnavailableChartHost {
	readonly series = [{ name: 'Up', points: [['2026-10-13T10:02:00Z', 5] as [string, number]] }];
}

@Component({
	selector: 'ovd-chart-host',
	imports: [TimeSeriesChart],
	template: `<ovd-time-series-chart
		heading="Rooms created"
		[series]="series"
		from="2026-10-13T08:00:00Z"
		to="2026-10-13T16:00:00Z"
		tz="UTC"
		note="Hourly"
		brush
	/>`
})
class ChartHost {
	readonly series = [{ name: 'Rooms', points: [['2026-10-13T10:00:00.000Z', 3]] as [string, number | null][] }];
}

describe('TimeSeriesChart', () => {
	it('writes a brushed range to the URL and restores the previous one from the reset chip', async () => {
		TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'analytics', component: ChartHost }])] });
		TestBed.overrideComponent(TimeSeriesChart, { set: { providers: [NEVER_LOADED] } });

		const harness = await RouterTestingHarness.create('/analytics?from=now-24h&to=now&tz=UTC');
		const chart = harness.fixture.debugElement.query(By.directive(TimeSeriesChart));
		const canvas = (chart.nativeElement as HTMLElement).querySelector('.chart');

		expect(canvas?.getAttribute('role')).toBe('img');
		expect(canvas?.getAttribute('aria-label')).toContain('Rooms: min 3, max 3, last 3');

		(chart.componentInstance as { onBrushEnd(event: unknown): void }).onBrushEnd({
			areas: [{ coordRange: [Date.parse('2026-10-13T10:00:00Z'), Date.parse('2026-10-13T12:00:00Z')] }]
		});
		await harness.fixture.whenStable();
		expect(TestBed.inject(Router).url).toBe('/analytics?from=2026-10-13T10:00:00Z&to=2026-10-13T12:00:00Z&tz=UTC');

		routeElement(harness).querySelector<HTMLButtonElement>('.reset')?.click();
		await harness.fixture.whenStable();
		expect(TestBed.inject(Router).url).toBe('/analytics?from=now-24h&to=now&tz=UTC');
	});

	it('shows its title and note above the chart and keeps the accessible summary', async () => {
		TestBed.configureTestingModule({ providers: [provideRouter([])] });
		TestBed.overrideComponent(TimeSeriesChart, { set: { providers: [NEVER_LOADED] } });

		const fixture = TestBed.createComponent(ChartHost);

		await fixture.whenStable();

		const element = fixture.nativeElement as HTMLElement;

		expect(element.querySelector('h3.chart-title')?.textContent.trim()).toBe('Rooms created');
		expect(element.querySelector('.chart-heading + .chart-note')?.textContent.trim()).toBe('Hourly');
		expect(element.querySelector('ovd-time-series-chart')?.hasAttribute('title')).toBe(false);
		expect(element.querySelector('.chart')?.getAttribute('role')).toBe('img');
		expect(element.querySelector('.chart')?.getAttribute('aria-label')).toContain('Rooms: min 3, max 3, last 3');
	});

	it('keeps an unavailable chart with its warning, dimmed and without series, legend, tooltip or table', async () => {
		TestBed.configureTestingModule({ providers: [provideRouter([])] });
		TestBed.overrideComponent(TimeSeriesChart, { set: { providers: [NEVER_LOADED] } });

		const fixture = TestBed.createComponent(UnavailableChartHost);

		await fixture.whenStable();

		const element = fixture.nativeElement as HTMLElement;
		const chart = fixture.debugElement.query(By.directive(TimeSeriesChart)).componentInstance as TimeSeriesChart;
		const option = (chart as unknown as { option: () => Record<string, unknown> }).option();

		expect(element.querySelector('.chart-heading ovd-media-stats-warning')).not.toBeNull();
		expect(element.querySelector('ovd-time-series-chart')?.classList.contains('dimmed')).toBe(true);
		expect(element.querySelector('.chart.unavailable')?.getAttribute('aria-label')).toBe(
			'Bitrate up / down: not available'
		);
		expect(element.querySelector('.toggle')).toBeNull();
		expect((option['series'] as { data: unknown[] }[]).map((series) => series.data)).toEqual([[]]);
		expect(option['tooltip']).toEqual({ show: false });
		expect(option['legend']).toEqual({ show: false });
	});

	it('toggles to a data table', async () => {
		TestBed.configureTestingModule({ providers: [provideRouter([])] });
		TestBed.overrideComponent(TimeSeriesChart, { set: { providers: [NEVER_LOADED] } });

		const fixture = TestBed.createComponent(ChartHost);

		await fixture.whenStable();
		(fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.toggle')?.click();
		await fixture.whenStable();

		expect((fixture.nativeElement as HTMLElement).querySelector('table td')?.textContent).toBe('3');
	});
});

@Component({
	selector: 'ovd-breakdown-host',
	imports: [BreakdownChart],
	template: `<ovd-breakdown-chart
		heading="SDKs"
		info="Software development kit the client connected with."
		[entries]="entries"
	/>`
})
class BreakdownHost {
	readonly entries = ['js', 'swift', 'android', 'flutter', 'go', 'unity', 'react-native', 'python', 'rust'].map(
		(name, i) => ({ name, value: 10 - i })
	);
}

@Component({
	selector: 'ovd-unavailable-breakdown-host',
	imports: [BreakdownChart],
	template: `<ovd-breakdown-chart heading="Egress type" [entries]="entries" unavailable />`
})
class UnavailableBreakdownHost {
	readonly entries = [{ name: 'Room composite', value: 5, entity: 'room_composite' }];
}

describe('BreakdownChart', () => {
	it('keeps an unavailable breakdown dimmed, without table toggle and with a not available summary', async () => {
		TestBed.overrideComponent(BreakdownChart, { set: { providers: [NEVER_LOADED] } });

		const fixture = TestBed.createComponent(UnavailableBreakdownHost);

		await fixture.whenStable();

		const element = fixture.nativeElement as HTMLElement;

		expect(element.querySelector('ovd-breakdown-chart')?.classList).toContain('dimmed');
		expect(element.querySelector('.chart.unavailable')?.getAttribute('aria-label')).toBe(
			'Egress type: not available'
		);
		expect(element.querySelector('.toggle')).toBeNull();
	});

	it('lists every entry in the table toggle, unfolded', async () => {
		TestBed.overrideComponent(BreakdownChart, { set: { providers: [NEVER_LOADED] } });

		const fixture = TestBed.createComponent(BreakdownHost);

		await fixture.whenStable();
		(fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.toggle')?.click();
		await fixture.whenStable();

		expect((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')).toHaveLength(9);
	});

	it('explains its heading with an info tip', async () => {
		TestBed.overrideComponent(BreakdownChart, { set: { providers: [NEVER_LOADED] } });

		const fixture = TestBed.createComponent(BreakdownHost);

		await fixture.whenStable();

		const heading = (fixture.nativeElement as HTMLElement).querySelector('.chart-heading');
		const tip = fixture.debugElement.query(By.directive(MatTooltip)).injector.get(MatTooltip);

		expect(heading?.querySelector('.chart-title')?.textContent.trim()).toBe('SDKs');
		expect(heading?.querySelector('.chart-title ovd-info-tip')).toBeNull();
		expect(heading?.querySelector('ovd-info-tip button')?.getAttribute('aria-label')).toBe('About SDKs');
		expect(tip.message).toBe('Software development kit the client connected with.');
	});
});

@Component({
	selector: 'ovd-ordered-breakdown-host',
	imports: [BreakdownChart],
	template: `<ovd-breakdown-chart heading="Room size" variant="bar" ordered [entries]="entries()" />`
})
class OrderedBreakdownHost {
	readonly entries = signal([
		{ name: '0-5', value: 40, entity: 'rooms' },
		{ name: '6-10', value: 0, entity: 'rooms' },
		{ name: '11-25', value: 8, entity: 'rooms' }
	]);
}

describe('ordered BreakdownChart', () => {
	it('keeps the order, shows the entries at 0 and labels each bar with its count and share', () => {
		const option = breakdownOption({
			entries: [
				{ name: '0-5', value: 40, entity: 'rooms' },
				{ name: '6-10', value: 0, entity: 'rooms' },
				{ name: '11-25', value: 8, entity: 'rooms' }
			],
			variant: 'bar',
			format: 'number',
			colors: COLORS,
			animation: false,
			ordered: true
		}) as {
			grid: { right: number };
			yAxis: { data: string[] };
			series: {
				data: { value: number; itemStyle: { color: string } }[];
				label: { formatter: (params: { value: number }) => string };
			}[];
		};
		const [series] = option.series;

		expect(option.yAxis.data).toEqual(['0-5', '6-10', '11-25']);
		// "40 (83.3 %)" is 11 characters: the plot stops short of it.
		expect(option.grid.right).toBe(85);
		expect(series?.data.map((item) => item.itemStyle.color)).toEqual(['#0088aa', '#0088aa', '#0088aa']);
		expect(series?.data.map((item) => series.label.formatter({ value: item.value }))).toEqual([
			'40 (83.3 %)',
			'0 (0.0 %)',
			'8 (16.7 %)'
		]);
	});

	it('never folds more than eight ordered entries into Other', () => {
		const option = breakdownOption({
			entries: Array.from({ length: 10 }, (_, i) => ({ name: `k${String(i)}`, value: i })),
			variant: 'bar',
			format: 'number',
			colors: COLORS,
			animation: false,
			ordered: true
		}) as { yAxis: { data: string[] } };

		expect(option.yAxis.data).toEqual(['k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8', 'k9']);
	});

	it('lists the rows of the table in order', async () => {
		TestBed.overrideComponent(BreakdownChart, { set: { providers: [NEVER_LOADED] } });

		const fixture = TestBed.createComponent(OrderedBreakdownHost);

		await fixture.whenStable();

		const element = fixture.nativeElement as HTMLElement;

		element.querySelector<HTMLButtonElement>('.toggle')?.click();
		await fixture.whenStable();

		expect(
			[...element.querySelectorAll('tbody tr')].map((row) =>
				[...row.querySelectorAll('th, td')].map((cell) => cell.textContent.trim())
			)
		).toEqual([
			['0-5', '40', '83.3 %'],
			['6-10', '0', '0.0 %'],
			['11-25', '8', '16.7 %']
		]);
	});

	it('reads "No data in this range" when every value is 0', async () => {
		TestBed.overrideComponent(BreakdownChart, { set: { providers: [NEVER_LOADED] } });

		const fixture = TestBed.createComponent(OrderedBreakdownHost);

		fixture.componentInstance.entries.set([
			{ name: '0-5', value: 0, entity: 'rooms' },
			{ name: '6-10', value: 0, entity: 'rooms' }
		]);
		await fixture.whenStable();

		const element = fixture.nativeElement as HTMLElement;

		expect(element.querySelector('.chart-empty')?.textContent.trim()).toBe('No data in this range');
		expect(element.querySelector('.chart')).toBeNull();
		expect(element.querySelector('.toggle')).toBeNull();
	});
});

describe('bindChartOptions', () => {
	it('keeps the options of the element and merges later ones into the instance without animation', () => {
		const option = signal({ series: [1] });
		const binding = TestBed.runInInjectionContext(() => bindChartOptions(option));
		const chart = { setOption: vi.fn() };

		expect(binding.value()).toEqual({ series: [1] });
		option.set({ series: [2] });
		TestBed.tick();
		expect(binding.value()).toEqual({ series: [1] });

		binding.attach(chart);
		TestBed.tick();
		expect(chart.setOption).toHaveBeenCalledExactlyOnceWith(
			{ series: [2], animation: false },
			{ replaceMerge: ['series'] }
		);

		option.set({ series: [3] });
		TestBed.tick();
		expect(binding.value()).toEqual({ series: [1] });
		expect(chart.setOption).toHaveBeenLastCalledWith(
			{ series: [3], animation: false },
			{ replaceMerge: ['series'] }
		);

		binding.detach();
		option.set({ series: [4] });
		TestBed.tick();
		expect(binding.value()).toEqual({ series: [4] });
		expect(chart.setOption).toHaveBeenCalledTimes(2);
	});
});
