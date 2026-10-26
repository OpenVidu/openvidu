import type * as z from 'zod';
import { describe, expect, it } from 'vitest';

import { roomsListQuery } from '../../src/rooms/rooms-schemas.js';

const NOW = new Date('2026-10-13T12:00:00Z');
const list = roomsListQuery(() => NOW);

function firstIssue(schema: z.ZodType, value: unknown) {
	const result = schema.safeParse(value);

	return result.success
		? undefined
		: { path: result.error.issues[0]?.path, message: result.error.issues[0]?.message };
}

describe('rooms list query', () => {
	it('applies the defaults', () => {
		expect(list.parse({})).toEqual({
			from: new Date('2026-10-12T12:00:00Z'),
			to: NOW,
			tz: 'UTC',
			status: 'all',
			sort: 'createdAt',
			order: 'desc',
			limit: 25
		});
	});

	it('rejects an unknown status on status', () => {
		expect(firstIssue(list, { status: 'open' })?.path).toEqual(['status']);
	});

	it('accepts the ranked sort keys with any status and refuses unknown keys', () => {
		for (const sort of ['endedAt', 'duration', 'uniqueIdentities', 'active']) {
			expect(list.parse({ sort, status: 'all' }).sort).toBe(sort);
		}

		expect(firstIssue(list, { sort: 'name' })?.path).toEqual(['sort']);
	});

	it('rejects a one-character search with the two-character minimum and accepts a SID', () => {
		expect(firstIssue(list, { q: 'd' })).toEqual({ path: ['q'], message: 'must have at least two characters' });
		expect(list.parse({ q: ' de ' }).q).toBe('de');
		expect(list.parse({ q: 'RM_a' }).q).toBe('RM_a');
		expect(list.parse({ q: '  ' }).q).toBeUndefined();
	});

	it('rejects an unknown feature on features', () => {
		expect(firstIssue(list, { features: 'egress,webhook' })?.path).toEqual(['features']);
		expect(list.parse({ features: 'egress, ingress' }).features).toEqual(['egress', 'ingress']);
	});

	it('bounds the node id and the page size', () => {
		expect(firstIssue(list, { nodeId: '' })?.path).toEqual(['nodeId']);
		expect(firstIssue(list, { nodeId: 'n'.repeat(129) })?.path).toEqual(['nodeId']);
		expect(firstIssue(list, { limit: '101' })?.path).toEqual(['limit']);
	});
});
