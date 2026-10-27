import type { Db, Document } from 'mongodb';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import {
	Collection,
	type NodeDocument,
	type OverviewResponse,
	type ParticipantDocument
} from '@openvidu-dashboard/typings';

import { openApiDocument } from '../../src/api/openapi.js';
import type { RouteRegistry } from '../../src/api/route-registry.js';
import { TOKENS } from '../../src/di/tokens.js';
import { todayWindow } from '../../src/overview/overview-window.js';
import { overviewResponse } from '../../src/overview/overview-responses.js';
import { bootClient, type Client, get, issue, json } from '../support/api-client.js';
import { activeRoom, closedRoom, egress, ingressSession, participant, reseed } from '../support/rooms-seed.js';

const mongoUri = inject('mongoUri');
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

const ago = (ms: number) => new Date(Date.now() - ms);

function member(id: string, roomSid: string, input: Partial<ParticipantDocument> = {}): ParticipantDocument {
	return participant({
		_id: id,
		identity: id,
		roomSid,
		joinedAt: ago(10 * MINUTE),
		lastStatsAt: ago(SECOND),
		nodeId: 'node-a',
		...input
	});
}

function node(id: string, seenAgo: number): NodeDocument {
	return {
		_id: id,
		firstSeenAt: ago(HOUR),
		lastSeenAt: ago(seenAgo),
		serverVersion: '3.10.0',
		region: 'eu-west-1'
	};
}

async function replace(db: Db, collection: Collection, documents: Document[]): Promise<void> {
	await db.collection(collection).deleteMany({});

	if (documents.length > 0) {
		await db.collection(collection).insertMany(documents);
	}
}

/** Empties every collection the overview reads. */
async function empty(db: Db): Promise<void> {
	await reseed(db, {});

	for (const collection of [Collection.NODES, Collection.SCHEMA_META, Collection.ANALYTICS_HOURLY]) {
		await replace(db, collection, []);
	}
}

describe.skipIf(mongoUri === '')('overview API', () => {
	let ce: Client;

	beforeAll(async () => {
		ce = await bootClient(mongoUri);
	});

	afterAll(async () => {
		await ce.dashboard.stop();
	});

	it('answers the overview without nodes on CE and rejects an unknown zone', async () => {
		await empty(ce.dashboard.db);

		const body = await json<OverviewResponse>(ce, '/overview');

		expect(overviewResponse.parse(body)).toEqual(body);
		expect(Object.keys(body).sort()).toEqual(['generatedAt', 'live', 'recentRooms', 'today']);
		expect(Math.abs(Date.parse(body.generatedAt) - Date.now())).toBeLessThan(SECOND);
		expect(await issue(ce, '/overview?tz=Mars/Olympus')).toMatchObject({
			status: 400,
			code: 'VALIDATION_ERROR',
			first: { path: ['tz'] }
		});
	});

	it('counts the live entities by kind and leaves joining participants out', async () => {
		const rooms = Array.from({ length: 12 }, (_, index) =>
			activeRoom({
				_id: `RM_live${String(index)}`,
				createdAt: ago((index + 1) * MINUTE),
				lastStatsAt: ago(SECOND)
			})
		);
		const kinds = [
			...Array.from({ length: 85 }, (_, index) => ({ kind: 'STANDARD' as const, isPublisher: index < 52 })),
			{ kind: 'SIP' as const, isPublisher: true },
			{ kind: 'SIP' as const, isPublisher: true },
			{ kind: 'EGRESS' as const, isPublisher: false },
			{ kind: 'EGRESS' as const, isPublisher: false },
			{ kind: 'EGRESS' as const, isPublisher: false },
			{ kind: 'AGENT' as const, isPublisher: false },
			{ kind: 'AGENT' as const, isPublisher: false }
		];

		await reseed(ce.dashboard.db, {
			rooms,
			participants: [
				...kinds.map((input, index) => member(`PA_m${String(index)}`, 'RM_live0', input)),
				member('PA_joining', 'RM_live0', { status: 'joining' })
			],
			egresses: [
				egress({ _id: 'EG_a1', roomSid: 'RM_live0', status: 'active', startedAt: ago(MINUTE) }),
				egress({ _id: 'EG_a2', roomSid: 'RM_live0', status: 'active', startedAt: ago(MINUTE) }),
				egress({ _id: 'EG_a3', roomSid: 'RM_live0', status: 'active', startedAt: ago(MINUTE) }),
				egress({ _id: 'EG_e1', roomSid: 'RM_live0', status: 'ending', startedAt: ago(MINUTE) }),
				egress({ _id: 'EG_c1', roomSid: 'RM_live0', status: 'complete', startedAt: ago(HOUR) })
			],
			ingressSessions: [
				ingressSession({ _id: 'IS_p', roomSid: 'RM_live0', startedAt: ago(MINUTE), status: 'publishing' }),
				ingressSession({ _id: 'IS_c', roomSid: 'RM_live0', startedAt: ago(HOUR), status: 'complete' })
			]
		});

		const { live } = await json<OverviewResponse>(ce, '/overview');

		expect(live).toEqual({
			rooms: 12,
			participants: 85,
			services: 7,
			participantsByKind: { STANDARD: 85, INGRESS: 0, EGRESS: 3, SIP: 2, AGENT: 2, CONNECTOR: 0, BRIDGE: 0 },
			publishers: 52,
			egresses: 4,
			ingressSessions: 1,
			stale: { rooms: 0, participants: 0, olderThanMs: 90_000 }
		});
	});

	it('hints the active entities without stats for 90 s, never those without stats', async () => {
		const { lastStatsAt: _lastStatsAt, ...quiet } = member('PA_quiet', 'RM_fresh');

		await reseed(ce.dashboard.db, {
			rooms: [
				activeRoom({ _id: 'RM_stale', createdAt: ago(HOUR), lastStatsAt: ago(100 * SECOND) }),
				activeRoom({ _id: 'RM_fresh', createdAt: ago(HOUR), lastStatsAt: ago(5 * SECOND) })
			],
			participants: [
				member('PA_s1', 'RM_stale', { lastStatsAt: ago(100 * SECOND) }),
				member('PA_s2', 'RM_stale', { lastStatsAt: ago(100 * SECOND) }),
				quiet
			]
		});

		const { live, recentRooms } = await json<OverviewResponse>(ce, '/overview');

		expect(live.stale).toEqual({ rooms: 1, participants: 2, olderThanMs: 90_000 });
		expect(recentRooms.filter((room) => room.stale === true).map((room) => room.sid)).toEqual(['RM_stale']);
	});

	it('widens the stale window for a slow writer', async () => {
		await reseed(ce.dashboard.db, {
			rooms: [activeRoom({ _id: 'RM_slow', createdAt: ago(HOUR), lastStatsAt: ago(100 * SECOND) })],
			participants: [member('PA_slow', 'RM_slow', { lastStatsAt: ago(100 * SECOND) })]
		});
		await replace(ce.dashboard.db, Collection.NODES, [{ ...node('node-a', 2 * SECOND), batchIntervalMs: 60_000 }]);

		const { live, recentRooms } = await json<OverviewResponse>(ce, '/overview');

		expect(live.stale).toEqual({ rooms: 0, participants: 0, olderThanMs: 135_000 });
		expect(recentRooms[0]).not.toHaveProperty('stale');

		await replace(ce.dashboard.db, Collection.NODES, []);
	});

	it('sums today from the hourly rollups since local midnight', async () => {
		const madrid = todayWindow(new Date(), 'Europe/Madrid');
		const hours = Math.floor((Date.now() - madrid.from.getTime()) / HOUR) + 1;
		const rollups = Array.from({ length: hours }, (_, index) => {
			const bucket = new Date(madrid.from.getTime() + index * HOUR);

			return {
				_id: `global:${bucket.toISOString()}`,
				scope: 'global',
				bucket,
				rooms: { created: index === 0 ? 143 : 0 },
				participants: { joined: index === 0 ? 1204 : 0, minutes: index === 0 ? 18_340 : 0 },
				egress: { started: index === 0 ? 21 : 0 },
				ingress: { sessionsStarted: index === 0 ? 4 : 0 }
			};
		});

		await empty(ce.dashboard.db);
		await replace(ce.dashboard.db, Collection.ANALYTICS_HOURLY, [
			...rollups,
			{
				_id: `global:${new Date(madrid.from.getTime() - HOUR).toISOString()}`,
				scope: 'global',
				bucket: new Date(madrid.from.getTime() - HOUR),
				rooms: { created: 999 }
			},
			{
				_id: `node:x:${madrid.from.toISOString()}`,
				scope: 'node:x',
				bucket: madrid.from,
				rooms: { created: 999 }
			}
		]);

		const { today } = await json<OverviewResponse>(ce, '/overview?tz=Europe/Madrid');
		const kolkata = await json<OverviewResponse>(ce, '/overview?tz=Asia/Kolkata');

		expect(today).toEqual({
			tz: 'Europe/Madrid',
			since: madrid.since.toISOString(),
			rooms: 143,
			participantSessions: 1204,
			participantMinutes: 18_340,
			egresses: 21,
			ingressSessions: 4,
			approximate: false
		});
		expect(kolkata.today.since).toMatch(/T18:30:00\.000Z$/);
		expect(kolkata.today.approximate).toBe(true);

		await replace(ce.dashboard.db, Collection.ANALYTICS_HOURLY, []);
		expect((await json<OverviewResponse>(ce, '/overview')).today).toMatchObject({
			rooms: 0,
			participantSessions: 0,
			participantMinutes: 0,
			egresses: 0,
			ingressSessions: 0,
			approximate: false
		});
	});

	it('lists the ten newest rooms without internal fields', async () => {
		await reseed(ce.dashboard.db, {
			rooms: [
				...Array.from({ length: 10 }, (_, index) =>
					closedRoom({ _id: `RM_old${String(index)}`, createdAt: ago((index + 3) * HOUR) })
				),
				activeRoom({ _id: 'RM_new1', createdAt: ago(MINUTE) }),
				activeRoom({ _id: 'RM_new2', createdAt: ago(2 * MINUTE) })
			]
		});

		const { recentRooms } = await json<OverviewResponse>(ce, '/overview');

		expect(recentRooms).toHaveLength(10);
		expect(recentRooms.slice(0, 2).map((room) => room.sid)).toEqual(['RM_new1', 'RM_new2']);
		expect(Object.keys(recentRooms[0] ?? {})).not.toContain('participantSids');
		expect(recentRooms[0]).toMatchObject({
			status: 'active',
			participants: { active: expect.any(Number) as number, unique: expect.any(Number) as number }
		});
		expect(recentRooms[2]).toHaveProperty('endedAt');

		await reseed(ce.dashboard.db, {});
		expect((await json<OverviewResponse>(ce, '/overview')).recentRooms).toEqual([]);
	});

	it('documents the overview without nodes', () => {
		const document = openApiDocument(ce.dashboard.running.container.get<RouteRegistry>(TOKENS.RouteRegistry), {
			version: 'test'
		});
		const schema = document.components?.schemas?.OverviewResponse as { properties?: object } | undefined;

		expect(Object.keys(schema?.properties ?? {})).not.toContain('nodes');
		expect(Object.keys(document.paths ?? {})).toContain('/api/v1/overview');
	});

	it('answers 304 while nothing changed, also after a writer batch', async () => {
		await empty(ce.dashboard.db);
		await replace(ce.dashboard.db, Collection.NODES, [node('node-a', 2 * SECOND)]);

		const first = await get(ce, '/overview');
		const etag = first.headers.get('etag') ?? '';

		expect(first.headers.get('cache-control')).toBe('private, no-cache');
		expect(etag).toMatch(/^W\//);

		const quiet = await get(ce, '/overview', { 'If-None-Match': etag });

		expect(quiet.status).toBe(304);
		expect(quiet.headers.get('etag')).toBe(etag);
		expect(await quiet.text()).toBe('');

		await ce.dashboard.db
			.collection<NodeDocument>(Collection.NODES)
			.updateOne({ _id: 'node-a' }, { $set: { lastSeenAt: new Date() } });

		expect((await get(ce, '/overview', { 'If-None-Match': etag })).status).toBe(304);
	});
});
