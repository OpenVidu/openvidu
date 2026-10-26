import { describe, expect, it } from 'vitest';

import type { OverviewResponse } from '@openvidu-dashboard/typings';

import type { ParticipantGroup } from '../../src/overview/overview-repository.js';
import { overviewQuery } from '../../src/overview/overview-schemas.js';
import { foldLive, overviewEtag } from '../../src/overview/overview-service.js';
import { todayWindow } from '../../src/overview/overview-window.js';

const at = (iso: string) => new Date(iso);

function group(kind: ParticipantGroup['_id']['kind'], count: number, extra: Partial<ParticipantGroup> = {}) {
	return { _id: { nodeId: 'node-a', kind }, count, publishers: 0, stale: 0, ...extra };
}

describe('overview today window', () => {
	it.each([
		['UTC', '2026-10-13T12:40:00Z', '2026-10-13T00:00:00.000Z', '2026-10-13T00:00:00.000Z', false],
		['Europe/Madrid', '2026-10-13T10:40:00Z', '2026-10-12T22:00:00.000Z', '2026-10-12T22:00:00.000Z', false],
		['Europe/Madrid', '2026-10-26T10:00:00Z', '2026-10-25T23:00:00.000Z', '2026-10-25T23:00:00.000Z', false],
		['Europe/Madrid', '2026-10-25T10:00:00Z', '2026-10-24T22:00:00.000Z', '2026-10-24T22:00:00.000Z', false],
		['Asia/Kolkata', '2026-10-13T10:00:00Z', '2026-10-12T18:30:00.000Z', '2026-10-12T18:00:00.000Z', true],
		['Asia/Kathmandu', '2026-10-13T10:00:00Z', '2026-10-12T18:15:00.000Z', '2026-10-12T18:00:00.000Z', true]
	])('starts today in %s at %s from local midnight, hour-aligned', (tz, now, since, from, approximate) => {
		expect(todayWindow(at(now), tz)).toEqual({ since: at(since), from: at(from), approximate });
	});
});

describe('overview folds', () => {
	it('counts STANDARD as participants, the other kinds as services and every kind on its own', () => {
		const live = foldLive(
			[
				{ _id: 'node-a', rooms: 8, stale: 1 },
				{ _id: 'node-b', rooms: 4, stale: 0 }
			],
			[
				group('STANDARD', 85, { publishers: 52, stale: 2 }),
				group('SIP', 2, { publishers: 2 }),
				group('EGRESS', 3),
				group('AGENT', 2)
			],
			4,
			1,
			90_000
		);

		expect(live).toEqual({
			rooms: 12,
			participants: 85,
			services: 7,
			participantsByKind: { STANDARD: 85, INGRESS: 0, EGRESS: 3, SIP: 2, AGENT: 2, CONNECTOR: 0, BRIDGE: 0 },
			publishers: 52,
			egresses: 4,
			ingressSessions: 1,
			stale: { rooms: 1, participants: 2, olderThanMs: 90_000 }
		});
	});
});

describe('overview validator and query', () => {
	it('ignores generatedAt and follows every other field', () => {
		const body = {
			generatedAt: '2026-10-13T12:00:00.000Z',
			live: { rooms: 1 }
		} as unknown as OverviewResponse;
		const later = { ...body, generatedAt: '2026-10-13T12:00:10.000Z' };
		const batch = { ...later, live: { rooms: 2 } } as unknown as OverviewResponse;

		expect(overviewEtag(later)).toBe(overviewEtag(body));
		expect(overviewEtag(batch)).not.toBe(overviewEtag(body));
		expect(overviewEtag(body)).toMatch(/^W\/"[A-Za-z0-9_-]+"$/);
	});

	it('defaults the zone to UTC and rejects an unknown one', () => {
		expect(overviewQuery.parse({})).toEqual({ tz: 'UTC' });

		const result = overviewQuery.safeParse({ tz: 'Mars/Olympus' });

		expect(result.success ? undefined : result.error.issues[0]?.path).toEqual(['tz']);
	});
});
