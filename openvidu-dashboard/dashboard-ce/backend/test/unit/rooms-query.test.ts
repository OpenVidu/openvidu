import { describe, expect, it } from 'vitest';

import { encodeCursor, decodeCursor, type CursorPayload } from '../../src/api/cursor.js';
import { escapeRegex } from '../../src/api/search.js';
import { roomsListPlan } from '../../src/rooms/rooms-query.js';
import { roomsListQuery, type RoomsListParams } from '../../src/rooms/rooms-schemas.js';

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

	it('name prefix within one node: the node stays a residual filter', () => {
		expect(plan({ q: 'demo', nodeId: 'node-a' }).filter).toEqual({
			nameLower: { $regex: '^demo' },
			nodeId: 'node-a',
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
		expect(roomsListPlan(params({ q: 'RM_ab12cd', status: 'active', features: 'sip', nodeId: 'n' }))).toEqual({
			kind: 'sid',
			filter: { _id: 'RM_ab12cd' }
		});
	});

	it('node: { nodeId, status, createdAt, _id } with status all as $in', () => {
		expect(plan({ nodeId: 'node-a' }).filter).toEqual({ nodeId: 'node-a', status: ANY, createdAt: range });
		expect(plan({ nodeId: 'node-a', status: 'active', features: 'egress' }).filter).toEqual({
			nodeId: 'node-a',
			status: 'active',
			createdAt: range,
			'features.egress': true
		});
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
