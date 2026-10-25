import type { Document } from 'mongodb';
import { describe, expect, it } from 'vitest';

import type { SortOrder } from '@openvidu-dashboard/typings';

import { buildPage, decodeCursor, encodeCursor, pageQuery } from '../../src/api/cursor.js';

interface Room {
	_id: string;
	createdAt: Date;
}

type Operator = '$gt' | '$gte' | '$lt' | '$lte';

function compareValues(a: Date | string, b: Date | string): number {
	return a instanceof Date && b instanceof Date ? a.getTime() - b.getTime() : String(a).localeCompare(String(b));
}

function satisfies(value: Date | string, condition: Document): boolean {
	const checks: Record<Operator, (diff: number) => boolean> = {
		$gt: (diff) => diff > 0,
		$gte: (diff) => diff >= 0,
		$lt: (diff) => diff < 0,
		$lte: (diff) => diff <= 0
	};

	return Object.entries(condition).every(([op, bound]) =>
		checks[op as Operator](compareValues(value, bound as Date | string))
	);
}

/** Evaluates the subset of the query language that `pageQuery` produces. */
function matches(room: Room, filter: Document): boolean {
	return Object.entries(filter).every(([key, condition]) => {
		if (key === '$nor') {
			return !(condition as Document[]).some((clause) => matches(room, clause));
		}

		const value = room[key as keyof Room];

		return condition instanceof Date || typeof condition === 'string'
			? compareValues(value, condition) === 0
			: satisfies(value, condition as Document);
	});
}

/** Applies a keyset page query to an array, the way MongoDB would with the same filter and sort. */
function run(rooms: Room[], order: SortOrder, limit: number, cursor?: string) {
	const decoded = cursor === undefined ? undefined : decodeCursor(cursor, 'createdAt', order);

	if (typeof decoded === 'string') {
		throw new Error(decoded);
	}

	const query = pageQuery('createdAt', order, decoded);
	const direction = (query.sort as Record<string, 1 | -1>).createdAt ?? 1;
	const compare = (a: Room, b: Room) =>
		(a.createdAt.getTime() - b.createdAt.getTime() || a._id.localeCompare(b._id)) * direction;
	const fetched = rooms
		.filter((room) => matches(room, query.filter))
		.sort(compare)
		.slice(0, limit + 1);

	return buildPage(
		fetched,
		limit,
		query,
		decoded !== undefined,
		(room) => ({ value: room.createdAt, id: room._id }),
		{ sort: 'createdAt', order }
	);
}

function rooms(count: number, offset = 0): Room[] {
	return Array.from({ length: count }, (_, i) => ({
		_id: `RM_${String(i + offset).padStart(3, '0')}`,
		createdAt: new Date(Date.UTC(2026, 9, 13, 10, 0, i + offset))
	}));
}

describe('cursor pagination', () => {
	it('walks forward and back without gaps or duplicates', () => {
		const all = rooms(60);
		const newestFirst = [...all].reverse().map((room) => room._id);
		const first = run(all, 'desc', 25);

		expect(first.items.map((room) => room._id)).toEqual(newestFirst.slice(0, 25));
		expect(first.prevCursor).toBeNull();

		const second = run(all, 'desc', 25, first.nextCursor ?? undefined);
		expect(second.items.map((room) => room._id)).toEqual(newestFirst.slice(25, 50));

		const back = run(all, 'desc', 25, second.prevCursor ?? undefined);
		expect(back.items.map((room) => room._id)).toEqual(newestFirst.slice(0, 25));
		expect(back.prevCursor).toBeNull();

		const third = run(all, 'desc', 25, second.nextCursor ?? undefined);
		expect(third.items.map((room) => room._id)).toEqual(newestFirst.slice(50));
		expect(third.nextCursor).toBeNull();
	});

	it('keeps the next page anchored when items are inserted', () => {
		const all = rooms(60);
		const first = run(all, 'asc', 25);
		const withNew = [...all, ...rooms(5, 100)];
		const second = run(withNew, 'asc', 25, first.nextCursor ?? undefined);

		expect(second.items[0]?._id).toBe('RM_025');
	});

	it('breaks ties on the identifier', () => {
		const tie = new Date('2026-10-13T10:00:00Z');
		const same = ['RM_a', 'RM_b', 'RM_c', 'RM_d'].map((_id) => ({ _id, createdAt: tie }));
		const first = run(same, 'asc', 2);
		const second = run(same, 'asc', 2, first.nextCursor ?? undefined);

		expect([...first.items, ...second.items].map((room) => room._id)).toEqual(['RM_a', 'RM_b', 'RM_c', 'RM_d']);
	});

	it('narrows the range to the cursor and filters only the ties on the identifier', () => {
		const value = new Date('2026-10-13T10:00:00Z');
		const from = new Date('2026-10-12T00:00:00Z');
		const to = new Date('2026-10-14T00:00:00Z');
		const cursor = { value, id: 'RM_5', sort: 'createdAt', order: 'desc' as const };

		expect(pageQuery('createdAt', 'desc', { ...cursor, direction: 'next' }, { from, to }).filter).toEqual({
			createdAt: { $gte: from, $lt: to, $lte: value },
			$nor: [{ createdAt: value, _id: { $gte: 'RM_5' } }]
		});
		expect(pageQuery('createdAt', 'desc', { ...cursor, direction: 'prev' }, { from, to })).toMatchObject({
			filter: { createdAt: { $gte: value, $lt: to }, $nor: [{ createdAt: value, _id: { $lte: 'RM_5' } }] },
			sort: { createdAt: 1, _id: 1 },
			reversed: true
		});
		expect(pageQuery('createdAt', 'asc', undefined, { from }).filter).toEqual({ createdAt: { $gte: from } });
		expect(pageQuery('startedAt', 'desc').filter).toEqual({});
	});

	it('rejects a malformed cursor or one issued for another sort', () => {
		const cursor = encodeCursor({
			value: new Date('2026-10-13T10:00:00Z'),
			id: 'RM_1',
			sort: 'createdAt',
			order: 'desc',
			direction: 'next'
		});
		const decoded = decodeCursor(cursor, 'createdAt', 'desc');

		expect(typeof decoded === 'object' && decoded.value).toEqual(new Date('2026-10-13T10:00:00Z'));
		expect(decodeCursor(cursor, 'name', 'desc')).toBe('was issued for another sort or order');
		expect(decodeCursor(cursor, 'createdAt', 'asc')).toBe('was issued for another sort or order');
		expect(decodeCursor('not-a-cursor', 'createdAt', 'desc')).toBe('is not a valid cursor');
		expect(decodeCursor(Buffer.from('[1,2]').toString('base64url'), 'createdAt', 'desc')).toBe(
			'is not a valid cursor'
		);
	});
});
