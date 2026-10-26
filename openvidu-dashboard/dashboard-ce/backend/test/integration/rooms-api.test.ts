import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { type ListResponse, type RoomDocument, type RoomListItem } from '@openvidu-dashboard/typings';

import { openApiDocument } from '../../src/api/openapi.js';
import type { RouteRegistry } from '../../src/api/route-registry.js';
import { TOKENS } from '../../src/di/tokens.js';
import { bootClient, type Client, get, issue, json } from '../support/api-client.js';
import { activeRoom, closedRoom, globalHourly, minutesAgo, participant, reseed } from '../support/rooms-seed.js';

const mongoUri = inject('mongoUri');
const HOUR = 3_600_000;

const sids = (page: { items: { sid: string }[] }) => page.items.map((item) => item.sid);

describe.skipIf(mongoUri === '')('rooms API', () => {
	let ce: Client;

	beforeAll(async () => {
		ce = await bootClient(mongoUri);
	});

	afterAll(async () => {
		await ce.dashboard.stop();
	});

	it.each(['/rooms/summary', '/participants/summary', '/egresses/summary', '/ingresses/summary'])(
		'answers %s before the detail route it shares a prefix with',
		async (path) => {
			expect((await get(ce, path)).status).toBe(200);
		}
	);

	describe('list', () => {
		it('lists the latest rooms of the last 24 hours with total', async () => {
			const recent = Array.from({ length: 40 }, (_, i) =>
				closedRoom({ _id: `RM_recent${String(i).padStart(2, '0')}`, createdAt: minutesAgo((i + 1) * 30) })
			);
			const old = Array.from({ length: 5 }, (_, i) =>
				closedRoom({ _id: `RM_old${String(i)}`, createdAt: minutesAgo(30 * 60 + i * 60) })
			);

			await reseed(ce.dashboard.db, { rooms: [...old, ...recent] });

			const page = await json<ListResponse<RoomListItem>>(ce, '/rooms');

			expect(sids(page)).toEqual(recent.slice(0, 25).map((room) => room._id));
			expect(page.nextCursor).not.toBeNull();
			expect(page.prevCursor).toBeNull();
			expect(page.total).toBe(40);
			expect(page.items[0]).not.toHaveProperty('internal');
		});

		it('walks forward and back without gaps or duplicates, ties broken on the SID', async () => {
			const rooms = Array.from({ length: 60 }, (_, i) =>
				closedRoom({
					_id: `RM_walk${String(i).padStart(2, '0')}`,
					createdAt: minutesAgo((Math.floor(i / 2) + 1) * 10)
				})
			);
			const expected = [...rooms]
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a._id < b._id ? 1 : -1))
				.map((room) => room._id);

			await reseed(ce.dashboard.db, { rooms });

			const first = await json<ListResponse<RoomListItem>>(ce, '/rooms?limit=25');
			const second = await json<ListResponse<RoomListItem>>(
				ce,
				`/rooms?limit=25&cursor=${first.nextCursor ?? ''}`
			);
			const third = await json<ListResponse<RoomListItem>>(
				ce,
				`/rooms?limit=25&cursor=${second.nextCursor ?? ''}`
			);
			const back = await json<ListResponse<RoomListItem>>(ce, `/rooms?limit=25&cursor=${third.prevCursor ?? ''}`);

			expect(sids(first)).toEqual(expected.slice(0, 25));
			expect(sids(second)).toEqual(expected.slice(25, 50));
			expect(sids(third)).toEqual(expected.slice(50));
			expect(third.nextCursor).toBeNull();
			expect(sids(back)).toEqual(expected.slice(25, 50));
		});

		it('filters by status and ranks by end time within the creation range', async () => {
			await reseed(ce.dashboard.db, {
				rooms: [
					activeRoom({ _id: 'RM_live', createdAt: minutesAgo(60) }),
					closedRoom({ _id: 'RM_long', createdAt: minutesAgo(3 * 24 * 60), endedAt: minutesAgo(120) }),
					closedRoom({ _id: 'RM_short', createdAt: minutesAgo(90), endedAt: minutesAgo(30) }),
					closedRoom({ _id: 'RM_early', createdAt: minutesAgo(300), endedAt: minutesAgo(180) })
				]
			});

			expect(sids(await json(ce, '/rooms?status=active'))).toEqual(['RM_live']);
			expect(sids(await json(ce, '/rooms?status=closed'))).toEqual(['RM_short', 'RM_early']);
			expect(sids(await json(ce, '/rooms?status=closed&sort=endedAt'))).toEqual(['RM_short', 'RM_early']);
			expect(sids(await json(ce, '/rooms?sort=endedAt'))).toEqual(['RM_live', 'RM_short', 'RM_early']);
			expect(sids(await json(ce, '/rooms?sort=endedAt&order=asc'))).toEqual(['RM_early', 'RM_short', 'RM_live']);
		});

		it('ranks by duration, unique identities and active participants, running rooms at their live value', async () => {
			const counted = (room: RoomDocument, unique: number, active: number): RoomDocument => ({
				...room,
				participants: { ...room.participants, unique, active }
			});

			await reseed(ce.dashboard.db, {
				rooms: [
					counted(closedRoom({ _id: 'RM_40', createdAt: minutesAgo(100), endedAt: minutesAgo(60) }), 12, 0),
					counted(closedRoom({ _id: 'RM_10', createdAt: minutesAgo(50), endedAt: minutesAgo(40) }), 3, 0),
					counted(activeRoom({ _id: 'RM_run', createdAt: minutesAgo(25) }), 7, 5),
					counted(activeRoom({ _id: 'RM_run2', createdAt: minutesAgo(5) }), 2, 2)
				]
			});

			expect(sids(await json(ce, '/rooms?sort=duration'))).toEqual(['RM_40', 'RM_run', 'RM_10', 'RM_run2']);
			expect(sids(await json(ce, '/rooms?sort=uniqueIdentities'))).toEqual([
				'RM_40',
				'RM_run',
				'RM_10',
				'RM_run2'
			]);
			expect(sids(await json(ce, '/rooms?sort=active'))).toEqual(['RM_run', 'RM_run2', 'RM_40', 'RM_10']);

			const first = await json<ListResponse<RoomListItem>>(ce, '/rooms?sort=duration&limit=2');
			const second = await json<ListResponse<RoomListItem>>(
				ce,
				`/rooms?sort=duration&limit=2&cursor=${first.nextCursor ?? ''}`
			);
			const back = await json<ListResponse<RoomListItem>>(
				ce,
				`/rooms?sort=duration&limit=2&cursor=${second.prevCursor ?? ''}`
			);

			expect([sids(first), sids(second), sids(back)]).toEqual([
				['RM_40', 'RM_run'],
				['RM_10', 'RM_run2'],
				['RM_40', 'RM_run']
			]);
			expect([first.total, second.total, second.nextCursor]).toEqual([4, 4, null]);
		});

		it('refuses a ranked sort beyond the range limit, but never an exact SID', async () => {
			await reseed(ce.dashboard.db, { rooms: [closedRoom({ _id: 'RM_ab12cd', createdAt: minutesAgo(10) })] });

			expect(await issue(ce, '/rooms?sort=duration&from=now-30d&to=now')).toMatchObject({
				status: 400,
				code: 'SORT_RANGE_TOO_WIDE'
			});
			expect(sids(await json(ce, '/rooms?q=RM_ab12cd&sort=duration&from=now-30d&to=now'))).toEqual(['RM_ab12cd']);
			expect(sids(await json(ce, '/rooms?sort=createdAt&from=now-90d&to=now'))).toEqual(['RM_ab12cd']);
		});

		it('searches a name prefix and looks up an exact SID outside the range', async () => {
			await reseed(ce.dashboard.db, {
				rooms: [
					closedRoom({ _id: 'RM_d1', name: 'Demo-Room', createdAt: minutesAgo(30) }),
					closedRoom({ _id: 'RM_d2', name: 'demo-2', createdAt: minutesAgo(20) }),
					closedRoom({ _id: 'RM_d3', name: 'my-demo', createdAt: minutesAgo(10) }),
					closedRoom({ _id: 'RM_ab12cd', name: 'archived', createdAt: minutesAgo(40 * 24 * 60) })
				]
			});

			expect(sids(await json(ce, '/rooms?q=DE'))).toEqual(['RM_d2', 'RM_d1']);

			const exact = await json<ListResponse<RoomListItem>>(ce, '/rooms?q=RM_ab12cd&from=now-24h&status=active');

			expect(exact).toMatchObject({ nextCursor: null, prevCursor: null, total: 1 });
			expect(sids(exact)).toEqual(['RM_ab12cd']);
		});

		it('filters by features and node', async () => {
			const plain = { egress: false, ingress: false, agent: false, sip: false };

			await reseed(ce.dashboard.db, {
				rooms: [
					closedRoom({ _id: 'RM_eg', createdAt: minutesAgo(30), features: { ...plain, egress: true } }),
					closedRoom({ _id: 'RM_in', createdAt: minutesAgo(20), features: { ...plain, ingress: true } }),
					closedRoom({ _id: 'RM_plain', createdAt: minutesAgo(10), features: plain }),
					activeRoom({ _id: 'RM_nodeA', createdAt: minutesAgo(5), nodeId: 'node-a', features: plain }),
					activeRoom({ _id: 'RM_nodeB', createdAt: minutesAgo(4), nodeId: 'node-b', features: plain })
				]
			});

			expect(sids(await json(ce, '/rooms?features=egress,ingress'))).toEqual(['RM_in', 'RM_eg']);
			expect(sids(await json(ce, '/rooms?nodeId=node-a&status=active'))).toEqual(['RM_nodeA']);
			expect(sids(await json(ce, '/rooms?q=rm_node&nodeId=node-a'))).toEqual(['RM_nodeA']);
		});

		it('omits total beyond the exact-count range', async () => {
			await reseed(ce.dashboard.db, { rooms: [closedRoom({ _id: 'RM_one', createdAt: minutesAgo(10) })] });

			const page = await json<ListResponse<RoomListItem>>(ce, '/rooms?from=now-30d');

			expect(sids(page)).toEqual(['RM_one']);
			expect(page).not.toHaveProperty('total');
		});

		it('rejects invalid parameters with the issue on the parameter', async () => {
			expect(await issue(ce, '/rooms?status=open')).toMatchObject({
				status: 400,
				code: 'VALIDATION_ERROR',
				first: { path: ['status'] }
			});
			expect((await issue(ce, '/rooms?sort=name')).first?.path).toEqual(['sort']);
			expect((await issue(ce, '/rooms?q=d')).first).toEqual({
				path: ['q'],
				message: 'must have at least two characters'
			});
			expect((await issue(ce, '/rooms?features=egress,webhook')).first?.path).toEqual(['features']);
			expect((await issue(ce, '/rooms?cursor=bogus')).first?.path).toEqual(['cursor']);
		});
	});

	describe('summary', () => {
		it('counts exactly within the threshold', async () => {
			const rooms = Array.from({ length: 120 }, (_, i) =>
				i < 7
					? activeRoom({ _id: `RM_s${String(i)}`, createdAt: minutesAgo(i + 1) })
					: closedRoom({ _id: `RM_s${String(i)}`, createdAt: minutesAgo(i * 10) })
			);
			const older = closedRoom({ _id: 'RM_older', createdAt: minutesAgo(3 * 24 * 60) });
			const sessions = Array.from({ length: 900 }, (_, i) =>
				participant({
					_id: `PA_s${String(i)}`,
					identity: `user${String(i)}`,
					roomSid: 'RM_s0',
					joinedAt: minutesAgo(i + 1),
					...(i < 31 ? {} : { leftAt: minutesAgo(i) })
				})
			);
			const dependent = ['EGRESS', 'AGENT'].map((kind, i) =>
				participant({
					_id: `PA_dep${String(i)}`,
					identity: `dep${String(i)}`,
					roomSid: 'RM_s0',
					joinedAt: minutesAgo(25 * 60),
					kind: kind as 'EGRESS' | 'AGENT'
				})
			);
			// Services joined in the range, some still active: neither sessions nor active participants.
			const services = Array.from({ length: 40 }, (_, i) =>
				participant({
					_id: `PA_svc${String(i)}`,
					identity: `EG_${String(i)}`,
					roomSid: 'RM_s0',
					joinedAt: minutesAgo(i + 1),
					kind: i % 2 === 0 ? 'EGRESS' : 'INGRESS',
					...(i < 5 ? {} : { leftAt: minutesAgo(i) })
				})
			);

			await reseed(ce.dashboard.db, {
				rooms: [...rooms, older],
				participants: [...sessions, ...dependent, ...services]
			});

			expect(await json(ce, '/rooms/summary?from=now-24h&to=now')).toEqual({
				activeRooms: 7,
				roomsInRange: 120,
				participantSessions: 900,
				activeParticipants: 31,
				approximate: false
			});
		});

		it('sums the global hourly rollups beyond the threshold', async () => {
			const hour = Math.floor(Date.now() / HOUR) * HOUR;
			const at = (hoursAgo: number) => new Date(hour - hoursAgo * HOUR);

			await reseed(ce.dashboard.db, {
				hourly: [
					globalHourly(at(1), 10, 50),
					globalHourly(at(24 * 10), 5, 20),
					globalHourly(at(24 * 29), 1, 2),
					globalHourly(at(24 * 31), 100, 1000),
					globalHourly(at(1), 999, 999, 'node:ND_a')
				]
			});

			expect(await json(ce, '/rooms/summary?from=now-30d&to=now')).toMatchObject({
				roomsInRange: 16,
				participantSessions: 72,
				approximate: true
			});
		});
	});

	describe('CE edition', () => {
		it.each([
			'/rooms/RM_x',
			'/rooms/RM_x/participants',
			'/rooms/RM_x/egresses',
			'/rooms/RM_x/ingress-sessions',
			'/rooms/RM_x/events',
			'/rooms/RM_x/series'
		])('answers PRO_FEATURE on %s', async (path) => {
			const response = await get(ce, path);

			expect(response.status).toBe(403);
			expect(await response.json()).toMatchObject({
				error: { code: 'PRO_FEATURE', details: { feature: 'room-detail' } }
			});
		});

		it('documents the list and the summary, and none of the locked routes', () => {
			const registry = ce.dashboard.running.container.get<RouteRegistry>(TOKENS.RouteRegistry);
			const paths = Object.keys(openApiDocument(registry, 'test').paths ?? {});

			expect(paths).toEqual(expect.arrayContaining(['/api/v1/rooms', '/api/v1/rooms/summary']));
			expect(paths.filter((path) => path.startsWith('/api/v1/rooms/{sid}'))).toEqual([]);
		});
	});
});
