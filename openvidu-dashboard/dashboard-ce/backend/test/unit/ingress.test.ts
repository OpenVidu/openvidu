import type * as z from 'zod';
import { describe, expect, it } from 'vitest';

import type { IngressDocument } from '@openvidu-dashboard/typings';

import { toIngressListItem } from '../../src/ingress/ingress-mappers.js';
import { activityRange, ingressesListPlan } from '../../src/ingress/ingress-query.js';
import { ingressListItem } from '../../src/ingress/ingress-responses.js';
import { ingressesListQuery } from '../../src/ingress/ingress-schemas.js';
import { loadFixture } from '../support/fixtures.js';

const NOW = new Date('2026-10-13T12:00:00Z');
const list = ingressesListQuery(() => NOW);
const ingresses = loadFixture<IngressDocument>('ingresses');
function fixture(id: string): IngressDocument {
	const doc = ingresses.find((candidate) => candidate._id === id);

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

describe('ingress mappers', () => {
	it('lists the public fields of a definition with its error flag', () => {
		const item = toIngressListItem({ ...fixture('IN_0bsRtmpReu5e'), status: 'inactive', lastError: 'boom' });

		expect(item).toMatchObject({ ingressId: 'IN_0bsRtmpReu5e', status: 'inactive', hasError: true });

		for (const key of ['url', 'streamKey', 'participantName', 'schemaVersion', 'expiresAt', 'lastError']) {
			expect(item).not.toHaveProperty(key);
		}

		for (const doc of ingresses) {
			const mapped = toIngressListItem(doc);

			expect(ingressListItem.strict().parse(mapped)).toEqual(mapped);
		}
	});
});

describe('ingress schemas and list plan', () => {
	it('rejects the invalid parameters on their own path', () => {
		expect(firstIssue(list, { status: 'active' })?.path).toEqual(['status']);
		expect(firstIssue(list, { inputType: 'srt' })?.path).toEqual(['inputType']);
		expect(firstIssue(list, { sort: 'lastSessionAt' })?.path).toEqual(['sort']);
		expect(firstIssue(list, { q: 'c' })).toEqual({ path: ['q'], message: 'must have at least two characters' });
	});

	it('selects the activity range with the filters and ranks every sort key', () => {
		const params = (query: Record<string, string>) => list.parse(query);
		const plan = (query: Record<string, string>) => ingressesListPlan(params(query));
		const range = (query: Record<string, string>) => activityRange(params(query).from, params(query).to);

		expect(plan({})).toMatchObject({ kind: 'ranked', match: range({}) });
		expect(plan({ q: 'Ca', status: 'error', inputType: 'whip' })).toMatchObject({
			kind: 'ranked',
			match: { ...range({}), nameLower: { $regex: '^ca' }, status: 'error', inputType: 'whip' }
		});
		expect(plan({ q: 'IN_ab12cd', status: 'publishing' })).toEqual({ kind: 'id', filter: { _id: 'IN_ab12cd' } });
		expect(range({}).$or).toHaveLength(3);

		const asOf = new Date('2026-10-13T12:00:00.000Z');
		const rank = (sort: string) => {
			const result = plan({ sort });

			return result.kind === 'ranked' ? result.rank(asOf) : undefined;
		};

		expect(rank('createdAt')).toBe('$createdAt');
		expect(rank('sessions')).toEqual({ $ifNull: ['$sessions', 0] });
		expect(rank('lastSession')).toEqual({ $ifNull: ['$lastSessionAt', new Date(0)] });
		expect(rank('totalDuration')).toMatchObject({
			$add: [
				{ $ifNull: ['$totalDurationMs', 0] },
				{
					$cond: [
						{ $eq: ['$status', 'publishing'] },
						{ $subtract: [asOf, { $ifNull: ['$lastSessionAt', asOf] }] },
						0
					]
				}
			]
		});
		expect(() => list.parse({ sort: 'lastSessionAt' })).toThrow();
	});
});
