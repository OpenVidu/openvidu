import type { Collection, Document, Filter } from 'mongodb';

import type { SortOrder } from '@openvidu-dashboard/typings';

import { buildPage, type CursorPayload, type FieldRange, pageQuery, type SortValue } from './cursor.js';

export interface Page<T> {
	items: T[];
	nextCursor: string | null;
	prevCursor: string | null;
}

/** Order of two sort values: equal, `null` first, then by value. */
export function compareValues(a: SortValue, b: SortValue): number {
	if (a === b) {
		return 0;
	}

	if (a === null) {
		return -1;
	}

	if (b === null) {
		return 1;
	}

	const left = a instanceof Date ? a.getTime() : a;
	const right = b instanceof Date ? b.getTime() : b;

	return left < right ? -1 : left > right ? 1 : 0;
}

export function compareIds(a: string, b: string): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

export interface IndexOrderedPageRequest<T extends { _id: string }> {
	collection: Collection<T>;
	/** Scope and residual filters, without the keyset condition. */
	filter: Document;
	/** Sort field; the index orders by it but not by `_id`. */
	field: keyof T & string;
	order: SortOrder;
	cursor: CursorPayload | undefined;
	limit: number;
	range?: FieldRange;
	hint?: string;
	projection?: Document;
}

/**
 * A keyset page in `(field, _id)` order over an index that orders by `field` only, such as `{ participantSid, ts }`:
 * the page is read in index order and the documents that share the `field` value of its last item are read with a
 * point query and ordered on `_id` in memory, so the page never needs an in-memory sort of the whole scope.
 */
export async function indexOrderedPage<T extends { _id: string }>(
	request: IndexOrderedPageRequest<T>
): Promise<Page<T>> {
	const { collection, field, limit } = request;
	const page = pageQuery(field, request.order, request.cursor, request.range);
	const direction = page.sort[field as keyof typeof page.sort] === -1 ? -1 : 1;
	const options = {
		...(request.hint === undefined ? {} : { hint: request.hint }),
		...(request.projection === undefined ? {} : { projection: request.projection })
	};
	const value = (doc: T) => doc[field] as SortValue;
	const indexOrdered = (await collection
		.find({ ...request.filter, ...page.filter } as Filter<T>, options)
		.sort({ [field]: direction })
		.limit(limit + 1)
		.toArray()) as T[];
	const last = indexOrdered[indexOrdered.length - 1];
	let ordered = indexOrdered;

	if (last !== undefined) {
		const boundary = value(last);
		const tied = (await collection
			.find({ ...request.filter, [field]: boundary, ...page.ties } as Filter<T>, options)
			.toArray()) as T[];

		ordered = [...indexOrdered.filter((doc) => compareValues(value(doc), boundary) !== 0), ...tied].sort(
			(a, b) => (compareValues(value(a), value(b)) || compareIds(a._id, b._id)) * direction
		);
	}

	return buildPage(
		ordered.slice(0, limit + 1),
		limit,
		page,
		request.cursor !== undefined,
		(doc) => ({ value: value(doc), id: doc._id }),
		{ sort: field, order: request.order }
	);
}
