import type { AnalyticsBreakdownsResponse, AnalyticsSeriesResponse } from '@openvidu-dashboard/typings';

type Cell = string | number | null | undefined;

const CRLF = '\r\n';

function cell(value: Cell): string {
	if (value === null || value === undefined) {
		return '';
	}

	const text = String(value);

	return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** RFC 4180 text: a header row, then the rows, every line ended by CRLF; `null` is an empty cell. */
export function toCsv(header: readonly string[], rows: readonly (readonly Cell[])[]): string {
	return [header, ...rows].map((row) => row.map(cell).join(',') + CRLF).join('');
}

/** One row per bucket start of any series, one column per series. */
export function seriesCsv(response: AnalyticsSeriesResponse): string {
	const columns = response.series.map((series) => new Map(series.points));
	const buckets = [...new Set(response.series.flatMap((series) => series.points.map(([bucket]) => bucket)))].sort();

	return toCsv(
		['bucket', ...response.series.map((series) => series.name)],
		buckets.map((bucket) => [bucket, ...columns.map((points) => points.get(bucket))])
	);
}

/** One row per key, dimension after dimension; `errors` only when a breakdown carries it. */
export function breakdownsCsv(response: AnalyticsBreakdownsResponse): string {
	const withErrors = response.breakdowns.some((breakdown) =>
		breakdown.items.some((item) => item.errors !== undefined)
	);

	return toCsv(
		['dimension', 'key', 'count', 'percent', ...(withErrors ? ['errors'] : [])],
		response.breakdowns.flatMap((breakdown) =>
			breakdown.items.map((item) => [
				breakdown.dimension,
				item.key,
				item.count,
				item.percent,
				...(withErrors ? [item.errors] : [])
			])
		)
	);
}
