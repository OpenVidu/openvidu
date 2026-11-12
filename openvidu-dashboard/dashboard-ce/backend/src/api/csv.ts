/** A CSV cell before encoding: `null` and `undefined` are empty, an array is one cell. */
export type CsvCell = string | number | boolean | null | undefined | readonly string[];

/** One CSV column of an item: its header and the cell it takes from the item. */
export interface CsvColumn<T> {
	header: string;
	value: (item: T) => CsvCell;
}

const CRLF = '\r\n';
/** Leading characters that make a spreadsheet read a text cell as a formula. */
const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * Encodes one cell: booleans as `true`/`false`, arrays joined by `;`, text that a spreadsheet would read as a formula
 * prefixed with `'`, and quotes around a value holding a quote, a comma or a line break. Numbers keep their sign.
 */
export function csvCell(value: CsvCell): string {
	if (value === null || value === undefined) {
		return '';
	}

	if (typeof value === 'number') {
		return String(value);
	}

	if (typeof value === 'boolean') {
		return value ? 'true' : 'false';
	}

	const text = typeof value === 'string' ? value : value.join(';');
	const safe = FORMULA_START.test(text) ? `'${text}` : text;

	return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** RFC 4180 text: a header row, then the rows, every line ended by CRLF. */
export function toCsv(header: readonly string[], rows: readonly (readonly CsvCell[])[]): string {
	return [header, ...rows].map((row) => row.map(csvCell).join(',') + CRLF).join('');
}

/** The CSV of `items`, one row each, with the headers and cells of `columns`. */
export function columnsCsv<T>(columns: readonly CsvColumn<T>[], items: readonly T[]): string {
	return toCsv(
		columns.map((column) => column.header),
		items.map((item) => columns.map((column) => column.value(item)))
	);
}
