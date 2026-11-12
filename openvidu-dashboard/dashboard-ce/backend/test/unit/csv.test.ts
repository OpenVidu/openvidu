import { describe, expect, it } from 'vitest';

import { columnsCsv, csvCell, toCsv } from '../../src/api/csv.js';

describe('CSV writer', () => {
	it('quotes cells with separators, quotes or line breaks and ends every line with CRLF', () => {
		expect(
			toCsv(
				['a', 'b'],
				[
					['x,y', 'say "hi"'],
					[null, 3]
				]
			)
		).toBe('a,b\r\n"x,y","say ""hi"""\r\n,3\r\n');
	});

	it('writes empty cells, booleans and several values in one cell', () => {
		expect(csvCell(undefined)).toBe('');
		expect(csvCell(null)).toBe('');
		expect(csvCell(true)).toBe('true');
		expect(csvCell(false)).toBe('false');
		expect(csvCell(['camera', 'microphone'])).toBe('camera;microphone');
		expect(csvCell([])).toBe('');
	});

	it('prefixes text a spreadsheet would read as a formula, before quoting it', () => {
		expect(csvCell('=HYPERLINK("http://example.com")')).toBe('"\'=HYPERLINK(""http://example.com"")"');
		expect(csvCell('+1')).toBe("'+1");
		expect(csvCell('-test')).toBe("'-test");
		expect(csvCell('@cmd')).toBe("'@cmd");
		expect(csvCell('\tx')).toBe("'\tx");
		expect(csvCell('\rx')).toBe('"\'\rx"');
		expect(csvCell('2026-10-13T10:00:00.000Z')).toBe('2026-10-13T10:00:00.000Z');
	});

	it('keeps numbers as they are, negative ones included', () => {
		expect(csvCell(-3)).toBe('-3');
		expect(csvCell(4.1)).toBe('4.1');
		expect(csvCell(0)).toBe('0');
	});

	it('writes one row per item with the cells of its columns', () => {
		const columns = [
			{ header: 'sid', value: (item: { sid: string; n?: number }) => item.sid },
			{ header: 'n', value: (item: { sid: string; n?: number }) => item.n }
		];

		expect(columnsCsv(columns, [{ sid: 'RM_a', n: 2 }, { sid: 'RM_b' }])).toBe('sid,n\r\nRM_a,2\r\nRM_b,\r\n');
		expect(columnsCsv(columns, [])).toBe('sid,n\r\n');
	});
});
