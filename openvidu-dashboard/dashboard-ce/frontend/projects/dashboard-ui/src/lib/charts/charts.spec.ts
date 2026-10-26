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
	brushRange,
	chartMarkers,
	chartSlots,
	chartSummary,
	entityColor,
	entitySlot,
	foldBreakdown,
	MAX_MARKERS,
	OTHER,
	timeSeriesOption
} from './chart-options.js';
import { bindChartOptions } from './echarts-provider.js';
import { TimeSeriesChart } from './time-series-chart.js';

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

describe('BreakdownChart', () => {
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
