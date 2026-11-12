import { describe, expect, it } from 'vitest';

import {
	breakdownSheet,
	seriesKind,
	wallClock,
	workbookBlob,
	workbookData,
	workbookFileName
} from './analytics-workbook.js';

describe('analytics workbook', () => {
	it('writes the bucket starts as the wall-clock time of their zone', () => {
		expect(wallClock('2026-11-10T23:00:00.000Z', 'Europe/Madrid')).toEqual(new Date(Date.UTC(2026, 10, 11, 0, 0)));
		expect(wallClock('2026-11-10T23:00:00.000Z', 'UTC')).toEqual(new Date(Date.UTC(2026, 10, 10, 23, 0)));
	});

	it('types every cell: dates, numbers with their format, text never evaluated, gaps empty', () => {
		const [sheet] = workbookData(
			[
				{
					name: '5 min',
					columns: [
						{ header: 'Bucket start (Europe/Madrid)', kind: 'date' },
						{ header: 'Active rooms', kind: 'count' },
						{ header: 'Recorded rooms', kind: 'percent' },
						{ header: 'Average quality', kind: 'score' },
						{ header: 'Browser', kind: 'text' }
					],
					rows: [
						['2026-11-10T23:00:00.000Z', 1234, 0.4, 4.12, "=cmd|' /C calc'!A0"],
						['2026-11-10T23:05:00.000Z', null, null, null, null]
					]
				}
			],
			'Europe/Madrid'
		);

		expect(sheet?.sheet).toBe('5 min');
		expect(sheet?.stickyRowsCount).toBe(1);
		expect(sheet?.data[0]?.[1]).toEqual({ value: 'Active rooms', fontWeight: 'bold' });
		expect(sheet?.data[1]).toEqual([
			{ value: new Date(Date.UTC(2026, 10, 11, 0, 0)), type: Date, format: 'yyyy-mm-dd hh:mm' },
			{ value: 1234, type: Number, format: '#,##0' },
			{ value: 0.4, type: Number, format: '0.0%' },
			{ value: 4.12, type: Number, format: '0.00' },
			{ value: "=cmd|' /C calc'!A0", type: String }
		]);
		expect(sheet?.data[2]?.slice(1)).toEqual([null, null, null, null]);
	});

	it('writes durations as a fraction of a day shown in hours, minutes and seconds', () => {
		const [sheet] = workbookData(
			[{ name: 'Top rooms', columns: [{ header: 'Duration', kind: 'duration' }], rows: [[5_400_000]] }],
			'UTC'
		);

		expect(sheet?.data[1]?.[0]).toEqual({ value: 0.0625, type: Number, format: '[h]:mm:ss' });
	});

	it('takes the zone a sheet names over the page zone', () => {
		const [sheet] = workbookData(
			[
				{
					name: '1 d (UTC)',
					zone: 'UTC',
					columns: [{ header: 'Bucket start (UTC)', kind: 'date' }],
					rows: [['2026-11-10T00:00:00.000Z']]
				}
			],
			'Europe/Madrid'
		);

		expect(sheet?.data[1]?.[0]).toMatchObject({ value: new Date(Date.UTC(2026, 10, 10, 0, 0)) });
	});

	it('names the sheets uniquely within the spreadsheet limits', () => {
		const names = workbookData(
			[
				{ name: 'Data up / down', columns: [], rows: [] },
				{ name: 'A very long breakdown heading beyond thirty-one', columns: [], rows: [] },
				{ name: 'SDK', columns: [], rows: [] },
				{ name: 'sdk', columns: [], rows: [] }
			],
			'UTC'
		).map((sheet) => sheet.sheet);

		expect(names).toEqual(['Data up - down', 'A very long breakdown heading b', 'SDK', 'sdk (2)']);
	});

	it('lists a breakdown by count, or in its order with the keys at 0, with the share of the sum', () => {
		const entries = [
			{ name: '1:1', value: 10 },
			{ name: 'N:M', value: 30 },
			{ name: 'Empty', value: 0 }
		];

		expect(breakdownSheet('Room topology', entries).rows).toEqual([
			['N:M', 30, 0.75],
			['1:1', 10, 0.25],
			['Empty', 0, 0]
		]);
		expect(breakdownSheet('Room topology', entries, true).rows.map((row) => row[0])).toEqual([
			'1:1',
			'N:M',
			'Empty'
		]);
		expect(breakdownSheet('Room size', []).columns.map((column) => column.header)).toEqual([
			'Room size',
			'Count',
			'Share'
		]);
	});

	it('maps the unit of a metric to the kind of its column', () => {
		expect(seriesKind({ unit: 'percent', empty: null })).toBe('percent');
		expect(seriesKind({ unit: 'bytes', empty: 0 })).toBe('bytes');
		expect(seriesKind({ unit: 'mos', empty: null })).toBe('score');
		expect(seriesKind({ unit: 'count', empty: 0 })).toBe('count');
		expect(seriesKind(undefined)).toBe('count');
	});

	it('names the file after the section and the range, without colons', () => {
		expect(workbookFileName('rooms', '2026-11-10T00:00:00.000Z', '2026-11-11T00:00:00.000Z')).toBe(
			'analytics-rooms-2026-11-10T000000.000Z-2026-11-11T000000.000Z.xlsx'
		);
	});

	it('writes a real .xlsx with the spreadsheet writer', async () => {
		const blob = await workbookBlob(
			[{ name: 'Info', columns: [{ header: 'Field', kind: 'text' }], rows: [['Section']] }],
			'UTC'
		);
		const signature = new Uint8Array(await blob.arrayBuffer()).slice(0, 2);

		expect(blob.size).toBeGreaterThan(0);
		expect(String.fromCharCode(...signature)).toBe('PK');
	});
});
