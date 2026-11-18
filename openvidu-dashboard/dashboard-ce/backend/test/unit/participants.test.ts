import type * as z from 'zod';
import { describe, expect, it } from 'vitest';

import type { ParticipantDocument } from '@openvidu-dashboard/typings';

import { toParticipantListItem } from '../../src/participants/participants-mappers.js';
import { participantsListPlan } from '../../src/participants/participants-query.js';
import { participantListItem } from '../../src/participants/participants-responses.js';
import {
	agentsExportQuery,
	agentsListQuery,
	participantsExportQuery,
	participantsListQuery
} from '../../src/participants/participants-schemas.js';
import { loadFixture } from '../support/fixtures.js';

const NOW = new Date('2026-10-13T12:00:00Z');
const FROM = new Date('2026-10-12T12:00:00Z');
const range = { $gte: FROM, $lt: NOW };
const list = participantsListQuery(() => NOW);
const agentsList = agentsListQuery(() => NOW);

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

/** The plan of the agents list, as `ParticipantsService.agents()` builds its filter. */
function agentsPlan(query: Record<string, string>) {
	return participantsListPlan({ ...agentsList.parse(query), kind: ['AGENT'] });
}

const OPENVIDU_RESIDUAL = {
	$expr: { $gt: [{ $ifNull: [{ $getField: { field: 'openvidu.agent', input: '$attributes' } }, ''] }, ''] }
};
const THIRD_PARTY_RESIDUAL = {
	$expr: { $eq: [{ $ifNull: [{ $getField: { field: 'openvidu.agent', input: '$attributes' } }, ''] }, ''] }
};

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

	it('parses the origin on the agents queries only', () => {
		expect(agentsList.parse({ origin: 'openvidu' }).origin).toBe('openvidu');
		expect(agentsExportQuery(() => NOW).parse({ origin: 'third-party' }).origin).toBe('third-party');
		expect(agentsList.parse({}).origin).toBeUndefined();
		expect(firstIssue(agentsList, { origin: 'livekit' })).toEqual({
			path: ['origin'],
			message: 'must be openvidu or third-party'
		});
		expect(Object.keys(list.parse({ origin: 'openvidu' }))).not.toContain('origin');
		expect(Object.keys(participantsExportQuery(() => NOW).parse({ origin: 'openvidu' }))).not.toContain('origin');
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

	it('keeps the origin as a residual filter of every branch', () => {
		const kindAndStatus = agentsPlan({ origin: 'openvidu', status: 'active' });

		expect(kindAndStatus).toMatchObject({
			kind: 'page',
			filter: { kind: 'AGENT', status: 'active', joinedAt: range, ...OPENVIDU_RESIDUAL },
			countFilter: { kind: 'AGENT', status: 'active', joinedAt: range, ...OPENVIDU_RESIDUAL },
			hint: 'kind_status_joinedAt_id'
		});
		expect(agentsPlan({ origin: 'third-party' })).toMatchObject({
			filter: { kind: 'AGENT', status: { $in: expect.any(Array) as unknown[] }, ...THIRD_PARTY_RESIDUAL },
			hint: 'kind_status_joinedAt_id'
		});
		expect(agentsPlan({ origin: 'openvidu', q: 'agent' })).toMatchObject({
			filter: { identityLower: { $regex: '^agent' }, kind: 'AGENT', ...OPENVIDU_RESIDUAL },
			countFilter: { identityLower: { $regex: '^agent' }, kind: 'AGENT', ...OPENVIDU_RESIDUAL }
		});
		expect(agentsPlan({ origin: 'openvidu', q: 'agent', room: 'RM_a' })).toMatchObject({
			filter: { roomSid: 'RM_a', identityLower: { $regex: '^agent' }, kind: 'AGENT', ...OPENVIDU_RESIDUAL }
		});
		expect(agentsPlan({ origin: 'third-party', room: 'RM_a' })).toMatchObject({
			filter: { roomSid: 'RM_a', kind: 'AGENT', ...THIRD_PARTY_RESIDUAL }
		});
		expect(agentsPlan({ origin: 'openvidu', status: 'left', sort: 'duration' })).toMatchObject({
			kind: 'ranked',
			match: { kind: 'AGENT', status: 'left', joinedAt: range, ...OPENVIDU_RESIDUAL },
			countFilter: { kind: 'AGENT', status: 'left', joinedAt: range, ...OPENVIDU_RESIDUAL },
			hint: 'kind_status_joinedAt_id'
		});
		expect(participantsListPlan({ ...list.parse({}), origin: 'openvidu' })).toMatchObject({
			filter: { joinedAt: range, ...OPENVIDU_RESIDUAL }
		});
		expect(agentsPlan({ origin: 'openvidu', q: 'PA_ag1' })).toEqual({ kind: 'sid', filter: { _id: 'PA_ag1' } });
		expect(agentsPlan({})).not.toHaveProperty(['filter', '$expr']);
	});

	it('Origin explain plans: each branch hints its index, page and ranked, whatever the residual filters', () => {
		const hints: [Record<string, string>, string][] = [
			[{}, 'kind_status_joinedAt_id'],
			[{ status: 'left' }, 'kind_status_joinedAt_id'],
			[{ q: 'agent' }, 'kind_status_joinedAt_id'],
			[{ q: 'agent', status: 'active' }, 'kind_status_joinedAt_id'],
			[{ q: 'agent', room: 'RM_a' }, 'roomSid_identityLower_joinedAt'],
			[{ room: 'RM_a' }, 'roomSid_joinedAt_id'],
			[{ room: 'RM_a', status: 'left' }, 'roomSid_joinedAt_id']
		];

		for (const [query, hint] of hints) {
			for (const sort of ['joinedAt', 'duration', 'leftAt']) {
				for (const origin of [undefined, 'openvidu', 'third-party']) {
					const result = agentsPlan({ ...query, sort, ...(origin === undefined ? {} : { origin }) });

					expect(result, JSON.stringify({ ...query, sort, origin })).toHaveProperty('hint', hint);
				}
			}
		}

		expect(plan({ q: 'ali' })).not.toHaveProperty('hint');
		expect(plan({ q: 'ali', publisher: 'true' })).not.toHaveProperty('hint');
		expect(plan({ room: 'RM_a', kind: 'AGENT' }).hint).toBe('roomSid_joinedAt_id');
		expect(plan({ publisher: 'true' }).hint).toBeUndefined();
		expect(agentsPlan({ q: 'PA_ag1' })).not.toHaveProperty('hint');
	});

	it('Agents identity prefix: the kind and status form with the prefix residual, page, ranked and total', () => {
		const statuses = { $in: ['joining', 'active', 'left', 'aborted'] };
		const query = { kind: 'AGENT', status: statuses, joinedAt: range, identityLower: { $regex: '^user' } };

		expect(agentsPlan({ q: 'User' })).toEqual({
			kind: 'page',
			filter: query,
			countFilter: query,
			sort: { joinedAt: -1, _id: -1 },
			page: expect.any(Object) as unknown,
			hint: 'kind_status_joinedAt_id'
		});

		for (const sort of ['duration', 'leftAt']) {
			expect(agentsPlan({ q: 'user', sort }), sort).toMatchObject({
				kind: 'ranked',
				match: query,
				countFilter: query,
				hint: 'kind_status_joinedAt_id'
			});
		}

		expect(agentsPlan({ q: 'user', status: 'active', origin: 'openvidu' })).toMatchObject({
			filter: { ...query, status: 'active', ...OPENVIDU_RESIDUAL },
			countFilter: { ...query, status: 'active', ...OPENVIDU_RESIDUAL },
			hint: 'kind_status_joinedAt_id'
		});
	});

	it('Identity prefix of a service kind: kinds without STANDARD take the agents plan, with STANDARD no hint', () => {
		expect(plan({ q: 'user', kind: 'AGENT' })).toMatchObject({
			filter: {
				kind: 'AGENT',
				status: { $in: expect.any(Array) as unknown[] },
				identityLower: { $regex: '^user' }
			},
			hint: 'kind_status_joinedAt_id'
		});
		expect(plan({ q: 'user', kind: 'AGENT,EGRESS', publisher: 'true' })).toMatchObject({
			filter: { kind: { $in: ['AGENT', 'EGRESS'] }, identityLower: { $regex: '^user' }, isPublisher: true },
			hint: 'kind_status_joinedAt_id'
		});

		const mixed = plan({ q: 'user-alice', kind: 'STANDARD,AGENT' });

		expect(mixed.filter).toEqual({
			identityLower: { $regex: '^user-alice' },
			joinedAt: range,
			kind: { $in: ['STANDARD', 'AGENT'] }
		});
		expect(mixed).not.toHaveProperty('hint');
		expect(plan({ q: 'user', kind: 'AGENT', room: 'RM_a' }).hint).toBe('roomSid_identityLower_joinedAt');
	});

	it('Selective identity prefix: the participants list leaves the index to the planner', () => {
		for (const query of [{ q: 'alice' }, { q: 'alice', status: 'active' }, { q: 'alice', publisher: 'true' }]) {
			const page = plan(query);

			expect(page, JSON.stringify(query)).not.toHaveProperty('hint');
			expect(page.countFilter).toMatchObject({ identityLower: { $regex: '^alice' }, joinedAt: range });
			expect(participantsListPlan(list.parse({ ...query, sort: 'duration' }))).not.toHaveProperty('hint');
		}
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

	const agentItem = (kind: ParticipantDocument['kind'], attributes?: Record<string, string>) => {
		const { attributes: _attributes, ...rest } = alice;
		const item = toParticipantListItem({ ...rest, kind, ...(attributes === undefined ? {} : { attributes }) });

		expect(participantListItem.strict().parse(item)).toEqual(item);

		return item;
	};

	it('Unmarked agent item', () => {
		const item = agentItem('AGENT', { 'lk.agent_name': 'dummy-agent' });

		expect(item.agent).toEqual({ name: 'dummy-agent' });
		expect(item.agent).not.toHaveProperty('openvidu');
	});

	it('Agent item without a name', () => {
		const item = agentItem('AGENT', { 'lk.agent_name': '', 'openvidu.agent': 'speech-processing' });

		expect(item.agent).toEqual({ openvidu: 'speech-processing' });
		expect(item.agent).not.toHaveProperty('name');
	});

	it('Agent item without attributes', () => {
		expect(agentItem('AGENT')).not.toHaveProperty('agent');
		expect(agentItem('AGENT', { 'lk.agent_name': '' })).not.toHaveProperty('agent');
	});

	it('Marked session of another kind', () => {
		expect(
			agentItem('STANDARD', { 'lk.agent_name': 'fake', 'openvidu.agent': 'speech-processing' })
		).not.toHaveProperty('agent');
	});

	it('omits the client and the connection type when the session reported none', () => {
		const { client: _client, connectionType: _type, ...bare } = alice;

		expect(toParticipantListItem(bare as ParticipantDocument)).not.toHaveProperty('client');
		expect(toParticipantListItem(bare as ParticipantDocument)).not.toHaveProperty('connectionType');
	});
});
