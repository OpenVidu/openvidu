import type { Collection, Document } from 'mongodb';

import type { SortOrder } from '@openvidu-dashboard/typings';

import { ApiError } from '../http/api-error.js';
import { type CursorDirection, type CursorPayload, encodeCursor, type SortValue } from './cursor.js';

/** A ranked list item: the projected document with the rank its cursor records. */
export type Ranked<T> = T & { rank: SortValue };

export interface RankedPageRequest {
	/** Range and filters, served by the list's range index. */
	match: Document;
	/** Aggregation expression (or field path) of the rank at `asOf`; it never evaluates to `null`. */
	rank: (asOf: Date) => Document | string;
	/** Fields of the documents the list item needs. */
	projection: Document;
	/** Index of the range scan. */
	hint?: string;
	/** Sort key of the API, recorded in the cursors. */
	sort: string;
	order: SortOrder;
	cursor: CursorPayload | undefined;
	limit: number;
	/** `asOf` of a first page. */
	now: Date;
}

export interface RankedPage<T> {
	items: Ranked<T>[];
	nextCursor: string | null;
	prevCursor: string | null;
}

/** The rank, then `_id`, beyond the cursor's boundary in the direction the page is read. */
function boundaryMatch(cursor: CursorPayload, forward: boolean): Document {
	const operator = forward ? '$gt' : '$lt';

	return { $or: [{ rank: { [operator]: cursor.value } }, { rank: cursor.value, _id: { [operator]: cursor.id } }] };
}

/**
 * The aggregation of one ranked page: the documents of the range ranked at `asOf` in memory (a top-k sort over the
 * range scan), from the cursor's boundary on, `limit + 1` of them to tell whether more exist.
 */
export function rankedPipeline(request: RankedPageRequest, asOf: Date): Document[] {
	const reversed = request.cursor?.direction === 'prev';
	const forward = (request.order === 'asc') !== reversed;
	const direction = forward ? 1 : -1;

	return [
		{ $match: request.match },
		{ $project: { ...request.projection, rank: request.rank(asOf) } },
		...(request.cursor === undefined ? [] : [{ $match: boundaryMatch(request.cursor, forward) }]),
		{ $sort: { rank: direction, _id: direction } },
		{ $limit: request.limit + 1 }
	];
}

/** Turns the `limit + 1` fetched items of {@link rankedPipeline} into a page whose cursors carry `asOf`. */
export function rankedResult<T extends { _id: string }>(
	fetched: Ranked<T>[],
	request: Pick<RankedPageRequest, 'cursor' | 'limit' | 'sort' | 'order'>,
	asOf: Date
): RankedPage<T> {
	const reversed = request.cursor?.direction === 'prev';
	const hasMore = fetched.length > request.limit;
	const page = fetched.slice(0, request.limit);
	const items = reversed ? page.reverse() : page;
	const fromCursor = request.cursor !== undefined;
	const hasNext = reversed ? fromCursor : hasMore;
	const hasPrev = reversed ? hasMore : fromCursor;
	const cursorFor = (item: Ranked<T> | undefined, direction: CursorDirection) =>
		item === undefined
			? null
			: encodeCursor({
					value: item.rank,
					id: item._id,
					sort: request.sort,
					order: request.order,
					direction,
					asOf
				});

	return {
		items,
		nextCursor: hasNext ? cursorFor(items[items.length - 1], 'next') : null,
		prevCursor: hasPrev ? cursorFor(items[0], 'prev') : null
	};
}

/**
 * One page of a ranked sort: every document of the range ranked at the cursor's `asOf` (the request time on a first
 * page), so a running entity keeps one rank across pages; documents examined never exceed those in the range.
 */
export async function rankedPage<T extends { _id: string }>(
	collection: Pick<Collection, 'aggregate'>,
	request: RankedPageRequest
): Promise<RankedPage<T>> {
	const asOf = request.cursor?.asOf ?? request.now;
	const fetched = await collection
		.aggregate<Ranked<T>>(rankedPipeline(request, asOf), request.hint === undefined ? {} : { hint: request.hint })
		.toArray();

	return rankedResult(fetched, request, asOf);
}

/** Refuses a ranked sort on a resolved range wider than its limit with `SORT_RANGE_TOO_WIDE`. */
export function assertRankedRange(range: { from: Date; to: Date }, limitMs: number, sort: string): void {
	if (range.to.getTime() - range.from.getTime() > limitMs) {
		throw new ApiError(
			'SORT_RANGE_TOO_WIDE',
			`Sorting by ${sort} needs a range of at most ${String(Math.round(limitMs / 3_600_000))} h`,
			{ sort, maxRangeMs: limitMs }
		);
	}
}
