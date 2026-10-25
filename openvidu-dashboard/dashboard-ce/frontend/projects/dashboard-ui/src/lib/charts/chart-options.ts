import { TZDate } from '@date-fns/tz';
import type { TimeSeriesPoint } from '@openvidu-dashboard/typings';
import { format } from 'date-fns';
import type { EChartsCoreOption } from 'echarts/core';

import {
	formatBitrate,
	formatBytes,
	formatDuration,
	formatNumber,
	formatPercent,
	formatTimestamp
} from '../format/formatters.js';
import { CHART_SLOTS, type ChartColors } from './chart-colors.js';

export type ValueFormat = 'number' | 'bytes' | 'bitrate' | 'duration' | 'percent' | 'mos';
export type SeriesKind = 'line' | 'area' | 'bar' | 'step';

export const MAX_MARKERS = 50;
export const MAX_BREAKDOWN_ENTRIES = 8;
export const OTHER = 'Other';
/** Group that links the tooltips of every chart on a page. */
export const CHART_GROUP = 'ovd-page';

export interface ChartSeries {
	name: string;
	points: readonly TimeSeriesPoint[];
	/** Entity whose fixed colour the series takes; defaults to the name. */
	entity?: string;
}

export interface ChartMarker {
	ts: string;
	label: string;
	kind?: 'join' | 'leave' | 'egress' | 'aborted';
}

export interface TimeSeriesOptions {
	series: readonly ChartSeries[];
	from: string;
	to: string;
	tz: string;
	format: ValueFormat;
	kind: SeriesKind;
	stacked?: boolean;
	markers?: readonly ChartMarker[];
	brush?: boolean;
	colors: ChartColors;
	animation: boolean;
	yRange?: { min: number; max: number };
	bands?: readonly QualityBand[];
}

export interface QualityBand {
	name: string;
	from: number;
	to: number;
	color: string;
}

/** Fixed colour slot (1–8) of known entities; a colour follows the entity, never its rank. */
const ENTITY_SLOTS: Readonly<Record<string, number>> = {
	upstream: 1,
	publish: 1,
	up: 1,
	rooms: 1,
	sessions: 1,
	js: 1,
	udp: 1,
	room_composite: 1,
	downstream: 2,
	subscribe: 2,
	down: 2,
	unique: 2,
	swift: 2,
	tcp: 2,
	track_composite: 2,
	android: 3,
	turn: 3,
	track: 3,
	flutter: 4,
	web: 4,
	go: 5,
	participant: 5,
	unity: 6,
	'react-native': 7,
	aborted: 8,
	failed: 8,
	python: 8,
	// Participant kinds share one chart, so each gets its own slot.
	standard: 1,
	egress: 2,
	ingress: 3,
	agent: 7,
	// Egress end statuses (`egress_<status>`) share one chart: complete green, aborted yellow, limit reached violet,
	// failed red.
	egress_complete: 3,
	egress_aborted: 4,
	egress_limit_reached: 7,
	egress_failed: 8,
	// Ingress input types.
	rtmp: 1,
	whip: 2,
	url: 3
};

/** Colour slot of an entity: its fixed slot, or a stable hash of its name. */
export function entitySlot(entity: string): number {
	const key = entity.toLowerCase();
	const fixed = ENTITY_SLOTS[key];

	if (fixed !== undefined) {
		return fixed;
	}

	let hash = 0;

	for (const char of key) {
		hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	}

	return (hash % CHART_SLOTS) + 1;
}

export function entityColor(entity: string, colors: ChartColors): string {
	return entity === OTHER ? colors.other : (colors.slots[entitySlot(entity) - 1] ?? colors.other);
}

/**
 * Slots of the entities of one chart: known entities keep their fixed slot and the others, in name order, move from
 * their hashed slot to the next free one, so no two share a colour while a slot is free.
 */
export function chartSlots(entities: readonly string[]): Map<string, number> {
	const slots = new Map<string, number>();
	const taken = new Set<number>();
	const hashed: string[] = [];

	for (const entity of new Set(entities)) {
		const fixed = ENTITY_SLOTS[entity.toLowerCase()];

		if (entity === OTHER) {
			continue;
		}

		if (fixed === undefined) {
			hashed.push(entity);
		} else {
			slots.set(entity, fixed);
			taken.add(fixed);
		}
	}

	for (const entity of hashed.sort()) {
		let slot = entitySlot(entity);

		for (let step = 0; step < CHART_SLOTS && taken.has(slot); step += 1) {
			slot = (slot % CHART_SLOTS) + 1;
		}

		slots.set(entity, slot);
		taken.add(slot);
	}

	return slots;
}

/** Colours of the entities of one chart, from {@link chartSlots}. */
function chartColors(entities: readonly string[], colors: ChartColors): (entity: string) => string {
	const slots = chartSlots(entities);

	return (entity) =>
		entity === OTHER ? colors.other : (colors.slots[(slots.get(entity) ?? entitySlot(entity)) - 1] ?? colors.other);
}

export function formatValue(value: number, kind: ValueFormat): string {
	switch (kind) {
		case 'bytes':
			return formatBytes(value);
		case 'bitrate':
			return formatBitrate(value);
		case 'duration':
			return formatDuration(value);
		case 'percent':
			return formatPercent(value);
		case 'mos':
			return value.toFixed(1);
		default:
			return formatNumber(value);
	}
}

/** Markers drawn on a chart: at most 50, otherwise none and the count. */
export function chartMarkers(markers: readonly ChartMarker[]): {
	shown: readonly ChartMarker[];
	overflow: number | null;
} {
	return markers.length > MAX_MARKERS ? { shown: [], overflow: markers.length } : { shown: markers, overflow: null };
}

/** One slice or bar of a breakdown: its label, its value and the entity its colour follows (the label by default). */
export interface BreakdownEntry {
	name: string;
	value: number;
	entity?: string;
}

/** The first eight entries by value, the rest folded into "Other". */
export function foldBreakdown(entries: readonly BreakdownEntry[]): BreakdownEntry[] {
	const sorted = [...entries].sort((a, b) => b.value - a.value);

	if (sorted.length <= MAX_BREAKDOWN_ENTRIES) {
		return sorted;
	}

	const kept = sorted.slice(0, MAX_BREAKDOWN_ENTRIES);
	const rest = sorted.slice(MAX_BREAKDOWN_ENTRIES).reduce((sum, entry) => sum + entry.value, 0);

	return [...kept, { name: OTHER, value: rest }];
}

/** Absolute `from` and `to` (ISO 8601 to the second, with the zone offset) of a brushed x range. */
export function brushRange(coordRange: readonly [number, number], tz: string): { from: string; to: string } {
	const iso = (ms: number): string => format(new TZDate(Math.round(ms), tz), "yyyy-MM-dd'T'HH:mm:ssXXX");
	const [start, end] = coordRange[0] <= coordRange[1] ? coordRange : [coordRange[1], coordRange[0]];

	return { from: iso(start), to: iso(end) };
}

/** Screen-reader summary: range, zone and min, max and last of each series. */
export function chartSummary(
	title: string,
	options: Pick<TimeSeriesOptions, 'series' | 'from' | 'to' | 'tz' | 'format'>
): string {
	const range = `${formatTimestamp(options.from, { tz: options.tz })} to ${formatTimestamp(options.to, { tz: options.tz })}`;
	const parts = options.series.map((series) => {
		const values = series.points.map(([, value]) => value).filter((value): value is number => value !== null);

		if (values.length === 0) {
			return `${series.name}: no data`;
		}

		const last = values.at(-1) ?? 0;

		return `${series.name}: min ${formatValue(Math.min(...values), options.format)}, max ${formatValue(Math.max(...values), options.format)}, last ${formatValue(last, options.format)}`;
	});

	return `${title}, ${range} (${options.tz}). ${parts.join('; ')}.`;
}

function axisLabel(value: number, tz: string, spanMs: number): string {
	const date = new TZDate(value, tz);

	return format(date, spanMs <= 86_400_000 ? 'HH:mm' : spanMs <= 7 * 86_400_000 ? 'MM-dd HH:mm' : 'MM-dd');
}

/** ECharts option of a time series fixed to `from`–`to`, with gaps for missing buckets and no zoom. */
export function timeSeriesOption(options: TimeSeriesOptions): EChartsCoreOption {
	const from = new Date(options.from).getTime();
	const to = new Date(options.to).getTime();
	const { colors } = options;
	const markers = chartMarkers(options.markers ?? []);
	const seriesColor = chartColors(
		options.series.map((series) => series.entity ?? series.name),
		colors
	);

	return {
		animation: options.animation,
		aria: { enabled: false },
		grid: { left: 8, right: 16, top: 32, bottom: 8, containLabel: true },
		legend: { top: 0, left: 0, textStyle: { color: colors.text }, icon: 'roundRect', itemHeight: 4 },
		tooltip: {
			trigger: 'axis',
			valueFormatter: (value: unknown) => (typeof value === 'number' ? formatValue(value, options.format) : '—')
		},
		xAxis: {
			type: 'time',
			min: from,
			max: to,
			axisLabel: {
				color: colors.text,
				formatter: (value: number) => axisLabel(value, options.tz, to - from),
				hideOverlap: true
			},
			axisLine: { lineStyle: { color: colors.grid } },
			splitLine: { show: false }
		},
		yAxis: {
			type: 'value',
			...(options.yRange ?? {}),
			axisLabel: { color: colors.text, formatter: (value: number) => formatValue(value, options.format) },
			splitLine: { lineStyle: { color: colors.grid } }
		},
		...(options.brush === true
			? { brush: { xAxisIndex: 0, brushType: 'lineX', brushMode: 'single', throttleType: 'debounce' } }
			: {}),
		...(markers.overflow === null
			? {}
			: {
					graphic: {
						type: 'text',
						right: 16,
						top: 4,
						style: { text: `${formatNumber(markers.overflow)} events in range`, fill: colors.text }
					}
				}),
		series: options.series.map((series, index) => {
			const color = seriesColor(series.entity ?? series.name);

			return {
				name: series.name,
				type: options.kind === 'bar' ? 'bar' : 'line',
				data: series.points.map(([ts, value]) => [new Date(ts).getTime(), value]),
				connectNulls: false,
				showSymbol: false,
				symbolSize: 8,
				step: options.kind === 'step' ? 'end' : false,
				...(options.stacked === true ? { stack: 'total' } : {}),
				lineStyle: { width: 2, color },
				itemStyle: { color, borderColor: colors.surface, borderWidth: options.stacked === true ? 2 : 0 },
				...(options.kind === 'area' ? { areaStyle: { opacity: 0.2, color } } : {}),
				...(index === 0 && markers.shown.length > 0
					? {
							markLine: {
								symbol: 'none',
								// Labels of close markers overlap: each shows only while its line is hovered.
								label: { show: false },
								emphasis: {
									label: {
										show: true,
										formatter: (params: { name?: string }) => params.name ?? '',
										color: colors.text
									}
								},
								lineStyle: { color: colors.other, type: 'dashed' },
								data: markers.shown.map((marker) => ({
									name: marker.label,
									xAxis: new Date(marker.ts).getTime(),
									lineStyle: marker.kind === 'aborted' ? { color: colors.slots[7] } : {}
								}))
							}
						}
					: {}),
				...(index === 0 && options.bands !== undefined
					? {
							markArea: {
								silent: true,
								data: options.bands.map((band) => [
									{
										yAxis: band.from,
										name: band.name,
										itemStyle: { color: band.color, opacity: 0.12 },
										label: { position: 'insideRight', color: colors.text }
									},
									{ yAxis: band.to }
								])
							}
						}
					: {})
			};
		})
	};
}

export interface BreakdownOptions {
	entries: readonly BreakdownEntry[];
	variant: 'donut' | 'bar';
	format: ValueFormat;
	colors: ChartColors;
	animation: boolean;
}

/** Donut or horizontal bar of a breakdown with direct labels (value and share) and a fixed colour per entity. */
export function breakdownOption(options: BreakdownOptions): EChartsCoreOption {
	const entries = foldBreakdown(options.entries);
	const total = entries.reduce((sum, entry) => sum + entry.value, 0);
	const { colors } = options;
	const entity = (entry: BreakdownEntry): string => entry.entity ?? entry.name;
	const color = chartColors(entries.map(entity), colors);

	if (options.variant === 'bar') {
		return {
			animation: options.animation,
			grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
			tooltip: {
				trigger: 'item',
				valueFormatter: (value: unknown) => formatValue(Number(value), options.format)
			},
			xAxis: { type: 'value', show: false },
			yAxis: {
				type: 'category',
				inverse: true,
				data: entries.map((entry) => entry.name),
				axisLabel: { color: colors.text }
			},
			series: [
				{
					type: 'bar',
					data: entries.map((entry) => ({ value: entry.value, itemStyle: { color: color(entity(entry)) } })),
					label: {
						show: true,
						position: 'right',
						color: colors.text,
						formatter: (params: { value: number }) =>
							`${formatValue(params.value, options.format)} (${formatPercent(total > 0 ? params.value / total : 0)})`
					}
				}
			]
		};
	}

	return {
		animation: options.animation,
		tooltip: { trigger: 'item', valueFormatter: (value: unknown) => formatValue(Number(value), options.format) },
		legend: { bottom: 0, textStyle: { color: colors.text } },
		series: [
			{
				type: 'pie',
				radius: ['50%', '75%'],
				center: ['50%', '45%'],
				itemStyle: { borderColor: colors.surface, borderWidth: 2 },
				label: {
					show: true,
					color: colors.text,
					formatter: (params: { name: string; value: number }) =>
						`${params.name}: ${formatPercent(total > 0 ? params.value / total : 0)}`
				},
				data: entries.map((entry) => ({
					name: entry.name,
					value: entry.value,
					itemStyle: { color: color(entity(entry)) }
				}))
			}
		]
	};
}
