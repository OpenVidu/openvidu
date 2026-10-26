import type * as z from 'zod';
import { describe, expect, it } from 'vitest';

import type { ParticipantDocument } from '@openvidu-dashboard/typings';

import { toParticipantListItem } from '../../src/participants/participants-mappers.js';
import { participantsListPlan } from '../../src/participants/participants-query.js';
import { participantListItem } from '../../src/participants/participants-responses.js';
import { agentsListQuery, participantsListQuery } from '../../src/participants/participants-schemas.js';
import { loadFixture } from '../support/fixtures.js';

const NOW = new Date('2026-10-13T12:00:00Z');
const FROM = new Date('2026-10-12T12:00:00Z');
const range = { $gte: FROM, $lt: NOW };
const list = participantsListQuery(() => NOW);

function firstIssue(schema: z.ZodType, value: unknown) {
	const result = schema.safeParse(value);

	return result.success
		? undefined
		: { path: result.error.issues[0]?.path, message: result.error.issues[0]?.message };
}

function plan(query: Record<string, string>) {
	const result = participantsListPlan(list.parse(query));

	if (result.kind !== 'page') {
		throw new Error('expected a page plan');
	}

	return result;
}

const participants = loadFixture<ParticipantDocument>('participants');
const alice = participants.find((doc) => doc.identity === 'alice');

if (alice === undefined) {
	throw new Error('the fixtures need alice');
}

describe('participants query schemas', () => {
	it('rejects the invalid parameters on their own path', () => {
		expect(firstIssue(list, { q: 'a' })).toEqual({ path: ['q'], message: 'must have at least two characters' });
		expect(firstIssue(list, { kind: 'AGENT,ROBOT' })?.path).toEqual(['kind']);
		expect(firstIssue(list, { sort: 'identity' })?.path).toEqual(['sort']);
		expect(firstIssue(list, { status: 'gone' })?.path).toEqual(['status']);
		expect(firstIssue(list, { room: 'abc' })?.path).toEqual(['room']);
	});

	it('accepts a participant SID of any length, searches agents and has no kind or publisher on the agents list', () => {
		expect(list.parse({ q: 'PA_x' }).q).toBe('PA_x');

		const agents = agentsListQuery(() => NOW).parse({ q: 'ab', kind: 'AGENT', publisher: 'true' });

		expect(agents.q).toBe('ab');
		expect(Object.keys(agents)).not.toContain('kind');
		expect(Object.keys(agents)).not.toContain('publisher');
	});
});

describe('participants list plan', () => {
	it('ranks by left time and duration over the join range, open sessions at asOf', () => {
		const ranked = participantsListPlan(list.parse({ status: 'active', sort: 'duration' }));

		expect(ranked).toMatchObject({
			kind: 'ranked',
			match: { kind: { $in: expect.any(Array) as unknown[] }, status: 'active', joinedAt: range },
			hint: 'kind_status_joinedAt_id'
		});
		expect(ranked.kind === 'ranked' ? ranked.rank(NOW) : undefined).toEqual({
			$ifNull: ['$durationMs', { $subtract: [{ $ifNull: ['$leftAt', NOW] }, '$joinedAt'] }]
		});

		const left = participantsListPlan(list.parse({ sort: 'leftAt' }));

		expect(left.kind === 'ranked' ? left.rank(NOW) : undefined).toEqual({ $ifNull: ['$leftAt', NOW] });
	});

	it('keeps publishers as a residual filter of every branch', () => {
		expect(plan({ publisher: 'true' }).filter).toEqual({ joinedAt: range, isPublisher: true });
		expect(plan({ status: 'active', publisher: 'true' }).filter).toMatchObject({
			status: 'active',
			isPublisher: true
		});
		expect(plan({ room: 'RM_abc', publisher: 'true' }).filter).toMatchObject({
			roomSid: 'RM_abc',
			isPublisher: true
		});
		expect(() => list.parse({ publisher: 'yes' })).toThrow();
	});

	it('uses joinedAt, a room, an identity prefix or kind and status', () => {
		expect(plan({}).filter).toEqual({ joinedAt: range });
		expect(plan({ room: 'RM_abc', status: 'active' }).filter).toEqual({
			roomSid: 'RM_abc',
			joinedAt: range,
			status: 'active'
		});
		expect(plan({ q: 'Al' }).filter).toEqual({ identityLower: { $regex: '^al' }, joinedAt: range });
		expect(plan({ q: 'ali', room: 'RM_a' }).filter).toEqual({
			roomSid: 'RM_a',
			identityLower: { $regex: '^ali' },
			joinedAt: range
		});
		expect(plan({ kind: 'AGENT,EGRESS' }).filter).toEqual({
			kind: { $in: ['AGENT', 'EGRESS'] },
			status: { $in: ['joining', 'active', 'left', 'aborted'] },
			joinedAt: range
		});
		expect(plan({ status: 'active' }).filter.kind).toEqual({
			$in: ['STANDARD', 'INGRESS', 'EGRESS', 'SIP', 'AGENT', 'CONNECTOR', 'BRIDGE']
		});
		expect(participantsListPlan(list.parse({ q: 'PA_x1y2', status: 'left' }))).toEqual({
			kind: 'sid',
			filter: { _id: 'PA_x1y2' }
		});
	});
});

describe('participant mappers', () => {
	it('lists the summary fields and the client subset', () => {
		const item = toParticipantListItem(alice);

		expect(participantListItem.strict().parse(item)).toEqual(item);
		expect(item).toMatchObject({
			sid: alice._id,
			status: 'left',
			connectionType: 'udp',
			client: { sdk: 'JS', version: '2.15.7', browser: 'Chrome', os: 'Windows', osVersion: '11' }
		});
		expect(item.client).not.toHaveProperty('address');
	});

	it('lists the sources the session published, in track source order', () => {
		const sources = (bySource: ParticipantDocument['tracks']['bySource']) =>
			toParticipantListItem({ ...alice, tracks: { ...alice.tracks, bySource } }).publishedSources;

		expect(sources({ MICROPHONE: 1, CAMERA: 2 })).toEqual(['CAMERA', 'MICROPHONE']);
		expect(sources({ CAMERA: 0 })).toEqual([]);
		expect(sources({})).toEqual([]);
	});

	it('omits the client and the connection type when the session reported none', () => {
		const { client: _client, connectionType: _type, ...bare } = alice;

		expect(toParticipantListItem(bare as ParticipantDocument)).not.toHaveProperty('client');
		expect(toParticipantListItem(bare as ParticipantDocument)).not.toHaveProperty('connectionType');
	});
});
