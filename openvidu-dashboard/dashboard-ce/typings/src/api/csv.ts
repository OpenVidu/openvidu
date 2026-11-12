/** Content type of every CSV the API serves. */
export const CSV_CONTENT_TYPE = 'text/csv; charset=utf-8';

/** Most data rows a list CSV export holds; the first ones in the list's order. */
export const LIST_EXPORT_MAX_ROWS = 10_000;

/** Response header set to `true` on a list CSV export that the row cap cut. */
export const EXPORT_TRUNCATED_HEADER = 'X-Export-Truncated';

/** The lists with a CSV export, as they name their files. */
export type CsvList = 'rooms' | 'participants' | 'agents' | 'egresses' | 'ingresses';

/** `<list>-<from>-<to>.csv` with the colons of the ISO instants removed. */
export function listCsvFileName(list: CsvList, from: string, to: string): string {
	return `${list}-${from}-${to}.csv`.replaceAll(':', '');
}
