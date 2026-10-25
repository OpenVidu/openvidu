import { describe, expect, it } from 'vitest';

import { decodeCursor, encodeCursor } from '../../src/api/cursor.js';
import {
	assertRankedRange,
	type Ranked,
	rankedPipeline,
	type RankedPageRequest,
	rankedResult
} from '../../src/api/ranked.js';

const AS_OF = new Date('2026-10-13T12:00:00.000Z');
const MINUTE = 60_000;

interface Room {
	_id: string;
	createdAt: Date;
	durationMs?: number;
}

/** Duration rank of a room at `asOf`: the stored duration, or the time since creation while it runs. */
function durationAt(room: Room, asOf: Date): number {
	return room.durationMs ?? asOf.getTime() - room.createdAt.getTime();
}

/** Runs the pipeline of {@link rankedPipeline} in memory, as MongoDB would. */
function run(rooms: readonly Room[], request: RankedPageRequest, asOf: Date): Ranked<Room>[] {
	const pipeline = rankedPipeline(request, asOf);
	const sort = pipeline.find((stage) => '$sort' in stage)?.$sort as { rank: 1 | -1 };
	const limit = pipeline.find((stage) => '$limit' in stage)?.$limit as number;
	const boundary = request.cursor;
	const ranked = rooms.map((room) => ({ ...room, rank: durationAt(room, asOf) }));
	const beyond = (item: Room & { rank: number }) => {
		if (boundary === undefined) {
			return true;
		}

		const value = boundary.value as number;
		const after = item.rank === value ? item._id.localeCompare(boundary.id) : item.rank - value;

		return sort.rank === 1 ? after > 0 : after < 0;
	};

	return ranked
		.filter(beyond)
		.sort((a, b) => (a.rank === b.rank ? a._id.localeCompare(b._id) : a.rank - b.rank) * sort.rank)
		.slice(0, limit);
}

function request(cursor: string | null, now: Date, limit = 2): RankedPageRequest {
	const decoded = cursor === null ? undefined : decodeCursor(cursor, 'duration', 'desc');

	if (typeof decoded === 'string') {
		throw new Error(decoded);
	}

	return {
		match: {},
		rank: () => ({}),
		projection: {},
		sort: 'duration',
		order: 'desc',
		cursor: decoded,
		limit,
		now
	};
}

function page(rooms: readonly Room[], cursor: string | null, now: Date) {
	const req = request(cursor, now);
	const asOf = req.cursor?.asOf ?? now;

	return rankedResult(run(rooms, req, asOf), req, asOf);
}

describe('ranked cursors', () => {
	it('round-trips asOf and keeps the five-field cursors of the index-backed sorts', () => {
		const ranked = encodeCursor({
			value: 42,
			id: 'RM_a',
			sort: 'duration',
			order: 'desc',
			direction: 'next',
			asOf: AS_OF
		});
		const plain = encodeCursor({ value: AS_OF, id: 'RM_a', sort: 'createdAt', order: 'desc', direction: 'next' });

		expect(decodeCursor(ranked, 'duration', 'desc')).toEqual({
			value: 42,
			id: 'RM_a',
			sort: 'duration',
			order: 'desc',
			direction: 'next',
			asOf: AS_OF
		});
		expect(decodeCursor(plain, 'createdAt', 'desc')).not.toHaveProperty('asOf');
	});

	it('rejects an invalid asOf', () => {
		const broken = Buffer.from(JSON.stringify([1, 'RM_a', 'duration', 'desc', 'next', 'yesterday'])).toString(
			'base64url'
		);

		expect(decodeCursor(broken, 'duration', 'desc')).toBe('is not a valid cursor');
	});
});

describe('ranked pages', () => {
	const rooms: Room[] = [
		{ _id: 'RM_a', createdAt: new Date(AS_OF.getTime() - 60 * MINUTE), durationMs: 40 * MINUTE },
		{ _id: 'RM_b', createdAt: new Date(AS_OF.getTime() - 50 * MINUTE), durationMs: 10 * MINUTE },
		{ _id: 'RM_c', createdAt: new Date(AS_OF.getTime() - 25 * MINUTE) },
		{ _id: 'RM_d', createdAt: new Date(AS_OF.getTime() - 90 * MINUTE), durationMs: 10 * MINUTE }
	];

	it('orders by rank with _id breaking ties in the same direction', () => {
		const first = page(rooms, null, AS_OF);
		const second = page(rooms, first.nextCursor, AS_OF);

		expect(first.items.map((room) => room._id)).toEqual(['RM_a', 'RM_c']);
		expect(second.items.map((room) => room._id)).toEqual(['RM_d', 'RM_b']);
		expect(second.nextCursor).toBeNull();
		expect(page(rooms, second.prevCursor, AS_OF).items.map((room) => room._id)).toEqual(['RM_a', 'RM_c']);
	});

	it('keeps a running room at its rank of the first page', () => {
		const first = page(rooms, null, AS_OF);
		// Twenty minutes later the running room has run 45 minutes, more than RM_a, but the cursor keeps its asOf.
		const second = page(rooms, first.nextCursor, new Date(AS_OF.getTime() + 20 * MINUTE));

		expect([...first.items, ...second.items].map((room) => room._id)).toEqual(['RM_a', 'RM_c', 'RM_d', 'RM_b']);
		expect(decodeCursor(first.nextCursor ?? '', 'duration', 'desc')).toMatchObject({ asOf: AS_OF });
	});

	it('scans the range first and limits the sorted documents to one page and one more', () => {
		const pipeline = rankedPipeline(
			{
				...request(null, AS_OF, 25),
				match: { createdAt: { $gte: AS_OF } },
				rank: (asOf) => ({ $literal: asOf })
			},
			AS_OF
		);

		expect(pipeline[0]).toEqual({ $match: { createdAt: { $gte: AS_OF } } });
		expect(pipeline.at(-2)).toEqual({ $sort: { rank: -1, _id: -1 } });
		expect(pipeline.at(-1)).toEqual({ $limit: 26 });
	});
});

describe('ranked range limit', () => {
	it('refuses a range wider than the limit with SORT_RANGE_TOO_WIDE', () => {
		const to = AS_OF;

		expect(() => {
			assertRankedRange({ from: new Date(to.getTime() - 8 * 86_400_000), to }, 7 * 86_400_000, 'duration');
		}).toThrow(expect.objectContaining({ code: 'SORT_RANGE_TOO_WIDE' }));
		expect(() => {
			assertRankedRange({ from: new Date(to.getTime() - 7 * 86_400_000), to }, 7 * 86_400_000, 'duration');
		}).not.toThrow();
	});
});
