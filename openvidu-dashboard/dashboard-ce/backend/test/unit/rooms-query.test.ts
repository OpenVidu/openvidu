import { describe, expect, it } from 'vitest';

import { encodeCursor, decodeCursor, type CursorPayload } from '../../src/api/cursor.js';
import { escapeRegex } from '../../src/api/search.js';
import { roomsListPlan } from '../../src/rooms/rooms-query.js';
import { roomsListQuery, type RoomsListParams } from '../../src/rooms/rooms-schemas.js';
import { RoomsService } from '../../src/rooms/rooms-service.js';
import type { WriterFreshness } from '../../src/status/freshness.js';
import { recordingDb } from '../support/recording-db.js';

const NOW = new Date('2026-10-13T12:00:00Z');
const FROM = new Date('2026-10-12T12:00:00Z');
const range = { $gte: FROM, $lt: NOW };
const ANY = { $in: ['active', 'closed'] };

function params(query: Record<string, string> = {}): RoomsListParams {
	return roomsListQuery(() => NOW).parse(query);
}

function plan(query: Record<string, string> = {}, cursor?: CursorPayload) {
	const result = roomsListPlan(params(query), cursor);

	if (result.kind !== 'page') {
		throw new Error('expected a page plan');
	}

	return result;
}

describe('rooms list plan', () => {
	it('status set, sort createdAt: { status, createdAt, _id }', () => {
		expect(plan({ status: 'active' })).toMatchObject({
			filter: { status: 'active', createdAt: range },
			countFilter: { status: 'active', createdAt: range },
			sort: { createdAt: -1, _id: -1 }
		});
	});

	it('status all, sort createdAt: { createdAt, _id } without a status condition', () => {
		expect(plan()).toMatchObject({ filter: { createdAt: range }, sort: { createdAt: -1, _id: -1 } });
		expect(plan({ order: 'asc' }).sort).toEqual({ createdAt: 1, _id: 1 });
	});

	it.each(['endedAt', 'duration', 'uniqueIdentities', 'active'])(
		'ranked by %s: the creation range of the filters, ranked in memory',
		(sort) => {
			const result = roomsListPlan(params({ status: 'closed', sort }));

			expect(result).toMatchObject({ kind: 'ranked', match: { status: 'closed', createdAt: range } });
			expect(result.kind === 'ranked' ? result.countFilter : undefined).toEqual({
				status: 'closed',
				createdAt: range
			});
		}
	);

	it('ranks a running room at asOf', () => {
		const ranks = (sort: string) => {
			const result = roomsListPlan(params({ sort }));

			return result.kind === 'ranked' ? result.rank(NOW) : undefined;
		};

		expect(ranks('endedAt')).toEqual({ $ifNull: ['$endedAt', NOW] });
		expect(ranks('duration')).toEqual({ $ifNull: ['$durationMs', { $subtract: [NOW, '$createdAt'] }] });
		expect(ranks('uniqueIdentities')).toEqual({ $ifNull: ['$participants.unique', 0] });
		expect(ranks('active')).toEqual({ $ifNull: ['$participants.active', 0] });
	});

	it('one feature: the flag with status and range, served by its partial index', () => {
		expect(plan({ features: 'egress', status: 'closed' }).filter).toEqual({
			'features.egress': true,
			status: 'closed',
			createdAt: range
		});
	});

	it('several features: one $or branch per partial index, status all as $in, duplicates dropped', () => {
		expect(plan({ features: 'egress,ingress,egress' }).filter).toEqual({
			$or: [
				{ 'features.egress': true, status: ANY, createdAt: range },
				{ 'features.ingress': true, status: ANY, createdAt: range }
			]
		});
	});

	it('features with a ranked sort keep one branch per partial index', () => {
		expect(roomsListPlan(params({ features: 'agent,sip', status: 'closed', sort: 'endedAt' }))).toMatchObject({
			kind: 'ranked',
			match: {
				$or: [
					{ 'features.agent': true, status: 'closed', createdAt: range },
					{ 'features.sip': true, status: 'closed', createdAt: range }
				]
			}
		});
	});

	it('name prefix within one media node: the label stays a residual filter', () => {
		expect(plan({ q: 'demo', mediaNode: 'mn-a' }).filter).toEqual({
			nameLower: { $regex: '^demo' },
			mediaNode: 'mn-a',
			createdAt: range
		});
	});

	it('name prefix: escaped, lower-cased anchored regex with residual status, range and flags', () => {
		expect(plan({ q: 'De.mo', status: 'active', features: 'egress' }).filter).toEqual({
			nameLower: { $regex: '^de\\.mo' },
			status: 'active',
			createdAt: range,
			'features.egress': true
		});
		expect(plan({ q: 'demo' }).filter).toEqual({ nameLower: { $regex: '^demo' }, createdAt: range });
		expect(escapeRegex('a+b(c)[d]^$|?*\\')).toBe('a\\+b\\(c\\)\\[d\\]\\^\\$\\|\\?\\*\\\\');
	});

	it('SID: point lookup ignoring every other filter', () => {
		expect(roomsListPlan(params({ q: 'RM_ab12cd', status: 'active', features: 'sip', mediaNode: 'n' }))).toEqual({
			kind: 'sid',
			filter: { _id: 'RM_ab12cd' }
		});
	});

	it('media node: { mediaNode, status, createdAt, _id } with status all as $in', () => {
		expect(plan({ mediaNode: 'mn-a' }).filter).toEqual({ mediaNode: 'mn-a', status: ANY, createdAt: range });
		expect(plan({ mediaNode: 'mn-a', status: 'active', features: 'egress' }).filter).toEqual({
			mediaNode: 'mn-a',
			status: 'active',
			createdAt: range,
			'features.egress': true
		});
	});

	it('Hinted room filters: status, media node and one feature pin their index for page, ranked and total', () => {
		const cases: [Record<string, string>, string][] = [
			[{ status: 'closed' }, 'status_createdAt_id'],
			[{ status: 'active' }, 'status_createdAt_id'],
			[{ mediaNode: 'mn-a' }, 'mediaNode_status_createdAt_id'],
			[{ mediaNode: 'mn-a', status: 'closed', features: 'egress,agent' }, 'mediaNode_status_createdAt_id'],
			[{ features: 'egress' }, 'status_createdAt_id_egress'],
			[{ features: 'sip,sip', status: 'closed' }, 'status_createdAt_id_sip']
		];

		for (const [query, index] of cases) {
			expect(plan(query), JSON.stringify(query)).toMatchObject({ hint: index, countHint: index });

			for (const sort of ['endedAt', 'duration', 'uniqueIdentities', 'active']) {
				expect(roomsListPlan(params({ ...query, sort })), JSON.stringify({ ...query, sort })).toMatchObject({
					kind: 'ranked',
					hint: index
				});
			}
		}

		const unfiltered = plan();

		expect(unfiltered).not.toHaveProperty('hint');
		expect(unfiltered).not.toHaveProperty('countHint');
		expect(roomsListPlan(params({ sort: 'endedAt' }))).not.toHaveProperty('hint');
	});

	it('Several features: no hint on the $or of partial indexes', () => {
		for (const query of [{ features: 'egress,agent' }, { features: 'egress,ingress,sip', status: 'closed' }]) {
			const page = plan(query);

			expect(page.filter, JSON.stringify(query)).toHaveProperty('$or');
			expect(page).not.toHaveProperty('hint');
			expect(page).not.toHaveProperty('countHint');

			for (const sort of ['endedAt', 'duration', 'uniqueIdentities', 'active']) {
				expect(roomsListPlan(params({ ...query, sort })), sort).not.toHaveProperty('hint');
			}
		}
	});

	it('Broad room name prefix: with a status the ranked match and total pin the status index, the page has no hint', () => {
		const cases: [Record<string, string>, string][] = [
			[{ q: 'room', status: 'closed' }, 'status_createdAt_id'],
			[{ q: 'room', status: 'active', features: 'egress' }, 'status_createdAt_id'],
			[{ q: 'room', status: 'closed', mediaNode: 'mn-a' }, 'mediaNode_status_createdAt_id']
		];

		for (const [query, index] of cases) {
			const page = plan(query);

			expect(page, JSON.stringify(query)).not.toHaveProperty('hint');
			expect(page.countHint).toBe(index);

			for (const sort of ['endedAt', 'duration', 'uniqueIdentities', 'active']) {
				expect(roomsListPlan(params({ ...query, sort })), JSON.stringify({ ...query, sort })).toMatchObject({
					kind: 'ranked',
					hint: index
				});
			}
		}

		for (const query of [{ q: 'room' }, { q: 'room', mediaNode: 'mn-a' }, { q: 'room', features: 'egress' }]) {
			const page = plan(query);

			expect(page, JSON.stringify(query)).not.toHaveProperty('hint');
			expect(page).not.toHaveProperty('countHint');
			expect(roomsListPlan(params({ ...query, sort: 'duration' }))).not.toHaveProperty('hint');
		}
	});

	it('cursor: narrows the sort field and adds the tie filter, in every branch and only there', () => {
		const value = new Date('2026-10-13T10:00:00Z');
		const decoded = decodeCursor(
			encodeCursor({ value, id: 'RM_x', sort: 'createdAt', order: 'desc', direction: 'next' }),
			'createdAt',
			'desc'
		);

		if (typeof decoded === 'string') {
			throw new Error(decoded);
		}

		const narrowed = { $gte: FROM, $lt: NOW, $lte: value };
		const ties = [{ createdAt: value, _id: { $gte: 'RM_x' } }];

		expect(plan({ features: 'egress,sip' }, decoded)).toMatchObject({
			filter: {
				$or: [
					{ 'features.egress': true, status: ANY, createdAt: narrowed },
					{ 'features.sip': true, status: ANY, createdAt: narrowed }
				],
				$nor: ties
			},
			countFilter: {
				$or: [
					{ 'features.egress': true, status: ANY, createdAt: range },
					{ 'features.sip': true, status: ANY, createdAt: range }
				]
			}
		});
		expect(plan({}, decoded).filter).toEqual({ createdAt: narrowed, $nor: ties });
	});
});

describe('rooms service hints', () => {
	const freshness = { staleContext: () => Promise.resolve({ staleMs: 0, now: NOW }) } as unknown as WriterFreshness;

	/** The hint of each driver call the service makes for `query`, by operation. */
	async function hints(query: Record<string, string>) {
		const { db, calls } = recordingDb();

		await new RoomsService(db, { totalMaxRangeMs: 7 * 86_400_000, freshness, now: () => NOW }).list(params(query));

		expect(calls.every((call) => call.collection === 'rooms')).toBe(true);
		expect(calls).toHaveLength(2);

		return Object.fromEntries(calls.map((call) => [call.operation, call.hint]));
	}

	it('Hinted room filters: the service passes the hint to the page, ranked and count queries', async () => {
		expect(await hints({ status: 'closed' })).toStrictEqual({
			find: 'status_createdAt_id',
			countDocuments: 'status_createdAt_id'
		});
		expect(await hints({ mediaNode: 'mn-a', sort: 'duration' })).toStrictEqual({
			aggregate: 'mediaNode_status_createdAt_id',
			countDocuments: 'mediaNode_status_createdAt_id'
		});
		expect(await hints({ features: 'egress', sort: 'endedAt' })).toStrictEqual({
			aggregate: 'status_createdAt_id_egress',
			countDocuments: 'status_createdAt_id_egress'
		});
	});

	it('Broad room name prefix: the service counts and ranks on the status index and pages without a hint', async () => {
		expect(await hints({ q: 'room', status: 'closed' })).toStrictEqual({
			find: undefined,
			countDocuments: 'status_createdAt_id'
		});
		expect(await hints({ q: 'room', status: 'closed', sort: 'endedAt' })).toStrictEqual({
			aggregate: 'status_createdAt_id',
			countDocuments: 'status_createdAt_id'
		});
		expect(await hints({ q: 'room' })).toStrictEqual({ find: undefined, countDocuments: undefined });
	});

	it('Several features: the service sends no hint', async () => {
		expect(await hints({ features: 'egress,agent' })).toStrictEqual({ find: undefined, countDocuments: undefined });
		expect(await hints({ features: 'egress,agent', sort: 'active' })).toStrictEqual({
			aggregate: undefined,
			countDocuments: undefined
		});
	});
});
