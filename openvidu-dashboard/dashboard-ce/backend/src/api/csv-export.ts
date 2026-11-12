import * as z from 'zod';

import {
	CSV_CONTENT_TYPE,
	type Edition,
	EXPORT_TRUNCATED_HEADER,
	type FeatureKey,
	LIST_EXPORT_MAX_ROWS,
	type ListResponse
} from '@openvidu-dashboard/typings';

import { columnsCsv, type CsvColumn } from './csv.js';
import type { ListOptions } from './responses.js';
import type { RouteRegistry, RouteResponse } from './route-registry.js';

/** The rows of an export and whether the row cap cut them. */
export interface CsvRows<T> {
	items: readonly T[];
	truncated: boolean;
}

/** Path parameters and query of an export request. */
export interface CsvExportInput<P, Q> {
	params: P;
	query: Q;
}

export interface CsvExportRoute<P, Q, T> {
	/** Path under `/api/v1` in OpenAPI form, ending in `/export.csv`. */
	path: string;
	operationId: string;
	summary: string;
	tags: string[];
	edition: Edition;
	feature?: FeatureKey;
	request: { params?: z.ZodType<P>; query: z.ZodType<Q> };
	/** Responses other than the `200`, such as a `404`. */
	responses?: Record<number, RouteResponse>;
	columns: (input: CsvExportInput<P, Q>) => readonly CsvColumn<T>[];
	rows: (input: CsvExportInput<P, Q>) => Promise<CsvRows<T>>;
	fileName: (input: CsvExportInput<P, Q>) => string;
}

const csvBody = z.string().meta({ description: 'RFC 4180 with CRLF line ends and a header row' });

const truncatedHeader = z.object({
	[EXPORT_TRUNCATED_HEADER]: z
		.literal('true')
		.optional()
		.meta({
			description: `Present when the list holds more than the ${String(LIST_EXPORT_MAX_ROWS)} rows exported`
		})
});

/**
 * Items of every page of a list, the first `LIST_EXPORT_MAX_ROWS` in its order, read with one call whose page size is
 * the cap; `truncated` when the list holds more.
 */
export async function listRows<P, T>(
	list: (params: P & { cursor: undefined; limit: number }, options: ListOptions) => Promise<ListResponse<T>>,
	params: P
): Promise<CsvRows<T>> {
	const page = await list({ ...params, cursor: undefined, limit: LIST_EXPORT_MAX_ROWS }, { total: false });

	return { items: page.items, truncated: page.nextCursor !== null };
}

/** Registers a bearer `GET` that answers a CSV attachment, with `X-Export-Truncated: true` when the cap cut it. */
export function registerCsvExport<P, Q, T>(registry: RouteRegistry, route: CsvExportRoute<P, Q, T>): void {
	registry.register<P, Q, undefined>({
		method: 'get',
		path: route.path,
		operationId: route.operationId,
		edition: route.edition,
		...(route.feature === undefined ? {} : { feature: route.feature }),
		summary: route.summary,
		tags: route.tags,
		security: 'bearer',
		request: route.request,
		responses: {
			200: {
				description: 'CSV attachment',
				schema: csvBody,
				contentType: CSV_CONTENT_TYPE,
				headers: truncatedHeader
			},
			...route.responses
		},
		handler: async ({ params, query, res }) => {
			const input = { params, query };
			const rows = await route.rows(input);

			if (rows.truncated) {
				res.setHeader(EXPORT_TRUNCATED_HEADER, 'true');
			}

			res.status(200)
				.type(CSV_CONTENT_TYPE)
				.attachment(route.fileName(input))
				.send(columnsCsv(route.columns(input), rows.items));

			return undefined;
		}
	});
}
