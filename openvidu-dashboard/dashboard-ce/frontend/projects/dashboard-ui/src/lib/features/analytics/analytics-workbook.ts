import { InjectionToken } from '@angular/core';
import { TZDate } from '@date-fns/tz';
import type { AnalyticsMetric, AnalyticsMetricInfo } from '@openvidu-dashboard/typings';

import type { BreakdownEntry } from '../../charts/chart-options.js';

/** How a workbook column writes its cells. */
export type WorkbookColumnKind = 'date' | 'count' | 'bytes' | 'percent' | 'score' | 'duration' | 'text';

export interface WorkbookColumn {
	header: string;
	kind: WorkbookColumnKind;
}

/**
 * A cell: a `date` column takes an instant, a `duration` column milliseconds, the other numeric kinds a number, `text` a
 * string; `null` is empty.
 */
export type WorkbookCell = string | number | Date | null;

export interface WorkbookSheet {
	name: string;
	columns: readonly WorkbookColumn[];
	rows: readonly (readonly WorkbookCell[])[];
	/** Zone of the instants of its `date` columns; the page's zone when absent. */
	zone?: string;
}

/** A column of a time-series sheet: the metric and the heading of the chart that draws it. */
export interface WorkbookSeriesColumn {
	metric: AnalyticsMetric;
	heading: string;
}

/** `analytics-<section>-<from>-<to>.xlsx` with the colons of the ISO instants removed. */
export function workbookFileName(section: string, from: string, to: string): string {
	return `analytics-${section}-${from}-${to}.xlsx`.replaceAll(':', '');
}

const FORMATS: Readonly<Record<Exclude<WorkbookColumnKind, 'text'>, string>> = {
	date: 'yyyy-mm-dd hh:mm',
	count: '#,##0',
	bytes: '#,##0',
	percent: '0.0%',
	score: '0.00',
	duration: '[h]:mm:ss'
};

const DAY_MS = 86_400_000;

const FORBIDDEN_IN_SHEET_NAMES = /[[\]:*?/\\]/g;
const MAX_SHEET_NAME = 31;

/** Kind of a series column from the unit of its metric. */
export function seriesKind(info: AnalyticsMetricInfo | undefined): WorkbookColumnKind {
	switch (info?.unit) {
		case 'percent':
			return 'percent';
		case 'bytes':
			return 'bytes';
		case 'mos':
			return 'score';
		default:
			return 'count';
	}
}

/**
 * A breakdown as the table of its chart lists it: every entry with its label, count and share of the sum, by count, or
 * in the given order with the keys at 0 when `ordered`.
 */
export function breakdownSheet(heading: string, entries: readonly BreakdownEntry[], ordered = false): WorkbookSheet {
	const total = entries.reduce((sum, entry) => sum + entry.value, 0);
	const rows = ordered ? [...entries] : [...entries].sort((a, b) => b.value - a.value);

	return {
		name: heading,
		columns: [
			{ header: heading, kind: 'text' },
			{ header: 'Count', kind: 'count' },
			{ header: 'Share', kind: 'percent' }
		],
		rows: rows.map((entry) => [entry.name, entry.value, total > 0 ? entry.value / total : 0])
	};
}

/** The wall-clock time of `instant` in `zone`, as the calendar time a spreadsheet date holds (it has no zone). */
export function wallClock(instant: Date | string, zone: string): Date {
	const zoned = new TZDate(new Date(instant).getTime(), zone);

	return new Date(
		Date.UTC(
			zoned.getFullYear(),
			zoned.getMonth(),
			zoned.getDate(),
			zoned.getHours(),
			zoned.getMinutes(),
			zoned.getSeconds()
		)
	);
}

/** Sheet names unique, at most 31 characters and without the characters spreadsheets refuse. */
function sheetNames(sheets: readonly WorkbookSheet[]): string[] {
	const used = new Set<string>();

	return sheets.map((sheet) => {
		const base = sheet.name.replace(FORBIDDEN_IN_SHEET_NAMES, '-').slice(0, MAX_SHEET_NAME) || 'Sheet';
		let name = base;

		for (let copy = 2; used.has(name.toLowerCase()); copy += 1) {
			const suffix = ` (${String(copy)})`;

			name = base.slice(0, MAX_SHEET_NAME - suffix.length) + suffix;
		}

		used.add(name.toLowerCase());

		return name;
	});
}

function cell(value: WorkbookCell, kind: WorkbookColumnKind, zone: string) {
	if (value === null) {
		return null;
	}

	if (kind === 'text') {
		return { value: String(value), type: String };
	}

	if (kind === 'date') {
		return {
			value: wallClock(value instanceof Date ? value : String(value), zone),
			type: Date,
			format: FORMATS.date
		};
	}

	if (typeof value !== 'number') {
		return null;
	}

	// A spreadsheet duration is a fraction of a day.
	return { value: kind === 'duration' ? value / DAY_MS : value, type: Number, format: FORMATS[kind] };
}

/** Characters of the widest cell of each column, for its width. */
function widths(sheet: WorkbookSheet): { width: number }[] {
	return sheet.columns.map((column, index) => {
		const longest = sheet.rows.reduce((max, row) => {
			const value = row[index];

			return Math.max(
				max,
				column.kind === 'date' ? 16 : value === null || value === undefined ? 0 : String(value).length
			);
		}, column.header.length);

		return { width: Math.min(Math.max(longest + 2, 10), 60) };
	});
}

/**
 * The sheets as the spreadsheet writer takes them: a bold header row kept visible while scrolling, dates as the
 * wall-clock time of their zone (the page's unless the sheet names one), numbers with their format and text as text,
 * which a spreadsheet never evaluates.
 */
export function workbookData(sheets: readonly WorkbookSheet[], zone: string) {
	const names = sheetNames(sheets);

	return sheets.map((sheet, index) => ({
		sheet: names[index] ?? `Sheet${String(index + 1)}`,
		data: [
			sheet.columns.map((column) => ({ value: column.header, fontWeight: 'bold' as const })),
			...sheet.rows.map((row) =>
				sheet.columns.map((column, position) => cell(row[position] ?? null, column.kind, sheet.zone ?? zone))
			)
		],
		columns: widths(sheet),
		stickyRowsCount: 1
	}));
}

/** The `.xlsx` of `sheets`, with the spreadsheet writer loaded on first use. */
export async function workbookBlob(sheets: readonly WorkbookSheet[], zone: string): Promise<Blob> {
	const { default: writeXlsxFile } = await import('write-excel-file/browser');

	return writeXlsxFile(workbookData(sheets, zone)).toBlob();
}

/** Writes the workbook of an export; tests replace it to read the sheets without the spreadsheet writer. */
export const WORKBOOK_WRITER = new InjectionToken<(sheets: readonly WorkbookSheet[], zone: string) => Promise<Blob>>(
	'WORKBOOK_WRITER',
	{ factory: () => workbookBlob }
);
