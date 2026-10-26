import type { Document, Filter, Sort } from 'mongodb';

import type { SortOrder } from '@openvidu-dashboard/typings';

import { ApiError } from '../http/api-error.js';

/** Page direction a cursor continues in: after the boundary item or before it. */
export type CursorDirection = 'next' | 'prev';

export type SortValue = string | number | boolean | Date | null;

export interface CursorPayload {
	value: SortValue;
	id: string;
	sort: string;
	order: SortOrder;
	direction: CursorDirection;
	/** Reference time of a ranked sort: when its first page was requested. */
	asOf?: Date;
}

const DATE_PREFIX = '\u0000date:';

/** Opaque cursor: base64url of `[sortValue, id, sort, order, direction]`, plus `asOf` for a ranked sort. */
export function encodeCursor(payload: CursorPayload): string {
	const value = payload.value instanceof Date ? `${DATE_PREFIX}${payload.value.toISOString()}` : payload.value;
	const fields = [value, payload.id, payload.sort, payload.order, payload.direction];

	return Buffer.from(
		JSON.stringify(payload.asOf === undefined ? fields : [...fields, payload.asOf.toISOString()])
	).toString('base64url');
}

/** Decodes a cursor and checks it was issued for the same sort; returns an error message otherwise. */
export function decodeCursor(cursor: string, sort: string, order: SortOrder): CursorPayload | string {
	let decoded: unknown;

	try {
		decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
	} catch {
		return 'is not a valid cursor';
	}

	if (!Array.isArray(decoded) || (decoded.length !== 5 && decoded.length !== 6)) {
		return 'is not a valid cursor';
	}

	const [rawValue, id, cursorSort, cursorOrder, direction, rawAsOf] = decoded as unknown[];
	const asOf = typeof rawAsOf === 'string' ? new Date(rawAsOf) : undefined;

	if (
		typeof id !== 'string' ||
		typeof cursorSort !== 'string' ||
		(direction !== 'next' && direction !== 'prev') ||
		!(rawValue === null || ['string', 'number', 'boolean'].includes(typeof rawValue)) ||
		(decoded.length === 6 && (asOf === undefined || Number.isNaN(asOf.getTime())))
	) {
		return 'is not a valid cursor';
	}

	if (cursorSort !== sort || cursorOrder !== order) {
		return 'was issued for another sort or order';
	}

	const value =
		typeof rawValue === 'string' && rawValue.startsWith(DATE_PREFIX)
			? new Date(rawValue.slice(DATE_PREFIX.length))
			: (rawValue as SortValue);

	return { value, id, sort, order, direction, ...(asOf === undefined ? {} : { asOf }) };
}

/** The decoded `cursor` of a request, or a `400` on the `cursor` parameter. */
export function cursorOrThrow(cursor: string | undefined, sort: string, order: SortOrder): CursorPayload | undefined {
	if (cursor === undefined) {
		return undefined;
	}

	const decoded = decodeCursor(cursor, sort, order);

	if (typeof decoded === 'string') {
		throw ApiError.validation([{ path: ['cursor'], message: decoded }]);
	}

	return decoded;
}

export interface PageQuery {
	/** Condition on the sort field: the requested range narrowed to the cursor value; undefined when neither applies. */
	fieldFilter?: Document;
	/** Residual `$nor` dropping the items tied with the cursor value on the wrong side of `_id`; empty for the first page. */
	ties: Filter<Document>;
	/** `{ [field]: fieldFilter, ...ties }`. */
	filter: Filter<Document>;
	/** Sort to run the query with; reversed for a page before the cursor. */
	sort: Sort;
	/** Items are fetched in reverse order and must be reversed back. */
	reversed: boolean;
}

/** Half-open range `[from, to)` on the sort field. */
export interface FieldRange {
	from?: Date;
	to?: Date;
}

function later(a: SortValue, b: SortValue): boolean {
	return a !== null && b !== null && (a instanceof Date && b instanceof Date ? a.getTime() > b.getTime() : a > b);
}

/**
 * Keyset query for a page: items strictly after (or before) the boundary `(sortValue, _id)` in the requested order,
 * with `_id` as tie-breaker so every page is deterministic. The cursor narrows the index bounds of the sort field and
 * only the items tied with the boundary value are filtered on `_id`.
 */
export function pageQuery(field: string, order: SortOrder, cursor?: CursorPayload, range: FieldRange = {}): PageQuery {
	const ascending = order === 'asc';
	const reversed = cursor?.direction === 'prev';
	const forward = ascending !== reversed;
	const direction = forward ? 1 : -1;
	const sort: Sort = { [field]: direction, _id: direction };
	const condition: Document = {};

	if (range.from !== undefined) {
		condition.$gte = range.from;
	}

	if (range.to !== undefined) {
		condition.$lt = range.to;
	}

	let ties: Filter<Document> = {};

	if (cursor !== undefined) {
		if (forward) {
			if (condition.$gte === undefined || later(cursor.value, condition.$gte as SortValue)) {
				condition.$gte = cursor.value;
			}
		} else {
			condition.$lte = cursor.value;
		}

		ties = { $nor: [{ [field]: cursor.value, _id: { [forward ? '$lte' : '$gte']: cursor.id } }] };
	}

	const fieldFilter = Object.keys(condition).length > 0 ? condition : undefined;

	return {
		...(fieldFilter ? { fieldFilter } : {}),
		ties,
		filter: { ...(fieldFilter ? { [field]: fieldFilter } : {}), ...ties },
		sort,
		reversed
	};
}

/**
 * Turns `limit + 1` fetched items into a page with its cursors: `hasMore` tells whether items exist beyond the page
 * in the fetch direction; the opposite direction has items whenever the page came from a cursor.
 */
export function buildPage<T>(
	fetched: T[],
	limit: number,
	query: PageQuery,
	fromCursor: boolean,
	boundary: (item: T) => { value: SortValue; id: string },
	sortKey: { sort: string; order: SortOrder }
): { items: T[]; nextCursor: string | null; prevCursor: string | null } {
	const hasMore = fetched.length > limit;
	const page = fetched.slice(0, limit);
	const items = query.reversed ? page.reverse() : page;
	const first = items[0];
	const last = items[items.length - 1];
	const hasNext = query.reversed ? fromCursor : hasMore;
	const hasPrev = query.reversed ? hasMore : fromCursor;

	const cursorFor = (item: T | undefined, direction: CursorDirection) =>
		item === undefined ? null : encodeCursor({ ...boundary(item), ...sortKey, direction });

	return {
		items,
		nextCursor: hasNext ? cursorFor(last, 'next') : null,
		prevCursor: hasPrev ? cursorFor(first, 'prev') : null
	};
}
