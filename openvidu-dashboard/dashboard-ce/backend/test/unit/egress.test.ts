import type * as z from 'zod';
import { describe, expect, it } from 'vitest';

import { type EgressDocument } from '@openvidu-dashboard/typings';

import { outputsSummary, toEgressListItem } from '../../src/egress/egress-mappers.js';
import { egressesListPlan } from '../../src/egress/egress-query.js';
import { egressListItem } from '../../src/egress/egress-responses.js';
import { egressesListQuery } from '../../src/egress/egress-schemas.js';
import { loadFixture } from '../support/fixtures.js';

const NOW = new Date('2026-10-13T12:00:00Z');
const list = egressesListQuery(() => NOW);
const egresses = loadFixture<EgressDocument>('egresses');

function fixture(id: string): EgressDocument {
	const doc = egresses.find((candidate) => candidate._id === id);

	if (doc === undefined) {
		throw new Error(`the fixtures need ${id}`);
	}

	return structuredClone(doc);
}

function firstIssue(schema: z.ZodType, value: unknown) {
	const result = schema.safeParse(value);

	return result.success
		? undefined
		: { path: result.error.issues[0]?.path, message: result.error.issues[0]?.message };
}

/** Every credential path of the request oneof, in the raw protocol shapes a leaking writer would store. */
describe('egress mappers', () => {
	it('lists the public fields with an outputs summary and an error flag', () => {
		const failed = toEgressListItem(fixture('EG_trackF4iled9'));
		const active = toEgressListItem(fixture('EG_streamHls7Wz'));

		expect(failed).toMatchObject({
			status: 'failed',
			hasError: true,
			errorCode: 403,
			outputs: { kinds: ['file'], count: 1 }
		});
		expect(failed).not.toHaveProperty('error');
		expect(active).toMatchObject({
			status: 'active',
			hasError: false,
			outputs: { kinds: ['stream', 'segments'], count: 2 }
		});
		expect(active).not.toHaveProperty('endedAt');
		expect(active).not.toHaveProperty('closedBy');
		expect(outputsSummary([{ kind: 'file' }, { kind: 'stream' }, { kind: 'file' }])).toEqual({
			kinds: ['file', 'stream'],
			count: 3
		});

		for (const doc of egresses) {
			const item = toEgressListItem(doc);

			expect(egressListItem.strict().parse(item)).toEqual(item);
		}
	});
});

describe('egress schemas and list plan', () => {
	it('rejects the invalid parameters on their own path', () => {
		expect(firstIssue(list, { sort: 'durationMs' })?.path).toEqual(['sort']);
		expect(firstIssue(list, { status: 'running' })?.path).toEqual(['status']);
		expect(firstIssue(list, { type: 'audio' })?.path).toEqual(['type']);
		expect(firstIssue(list, { room: 'demo-room' })?.path).toEqual(['room']);
		expect(firstIssue(list, { q: 'd' })).toEqual({ path: ['q'], message: 'must have at least two characters' });
	});

	it('picks the index of every filter', () => {
		const plan = (query: Record<string, string>) => egressesListPlan(list.parse(query));

		expect(plan({})).toEqual({ kind: 'page', filter: {}, hint: 'startedAt_id' });
		expect(plan({ type: 'web' })).toEqual({
			kind: 'page',
			filter: { type: { $in: ['web'] } },
			hint: 'startedAt_id'
		});
		expect(plan({ status: 'starting,active,ending' })).toEqual({
			kind: 'page',
			filter: { status: { $in: ['starting', 'active', 'ending'] } },
			hint: 'status_startedAt'
		});
		expect(plan({ room: 'RM_abc', status: 'failed', type: 'track' })).toEqual({
			kind: 'page',
			filter: { roomSid: 'RM_abc', status: { $in: ['failed'] }, type: { $in: ['track'] } },
			hint: 'roomSid_startedAt'
		});
		expect(plan({ q: 'EG_ab12cd', status: 'active', room: 'RM_x' })).toEqual({
			kind: 'id',
			filter: { _id: 'EG_ab12cd' }
		});
		expect(plan({ q: 'Demo', status: 'failed' })).toEqual({
			kind: 'page',
			filter: { roomNameLower: { $regex: '^demo' }, status: { $in: ['failed'] } },
			hint: 'roomNameLower_startedAt'
		});
		expect(plan({ q: 'demo', room: 'RM_abc' })).toEqual({
			kind: 'page',
			filter: { roomSid: 'RM_abc', roomNameLower: { $regex: '^demo' } },
			hint: 'roomSid_startedAt'
		});
	});

	it('ranks by end time and duration over the start range, egresses in flight at asOf', () => {
		const ranked = egressesListPlan(list.parse({ sort: 'duration', status: 'complete' }));
		const asOf = new Date('2026-10-13T12:00:00.000Z');

		expect(ranked).toMatchObject({
			kind: 'ranked',
			filter: { status: { $in: ['complete'] } },
			hint: 'status_startedAt'
		});
		expect(ranked.kind === 'ranked' ? ranked.rank(asOf) : undefined).toEqual({
			$ifNull: ['$durationMs', { $subtract: [asOf, '$startedAt'] }]
		});

		const ended = egressesListPlan(list.parse({ sort: 'endedAt' }));

		expect(ended.kind === 'ranked' ? ended.rank(asOf) : undefined).toEqual({ $ifNull: ['$endedAt', asOf] });
		expect(() => list.parse({ sort: 'durationMs' })).toThrow();
	});
});
