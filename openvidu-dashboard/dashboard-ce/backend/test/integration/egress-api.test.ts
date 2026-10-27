import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import {
	type EgressDocument,
	type EgressListItem,
	type EgressStatus,
	type EgressSummary,
	type EgressType,
	type HourlyRollupDocument,
	type ListResponse
} from '@openvidu-dashboard/typings';

import { openApiDocument } from '../../src/api/openapi.js';
import type { RouteRegistry } from '../../src/api/route-registry.js';
import { TOKENS } from '../../src/di/tokens.js';
import { bootClient, type Client, issue, json } from '../support/api-client.js';
import { activeRoom, egress, minutesAgo, reseed } from '../support/rooms-seed.js';

const mongoUri = inject('mongoUri');
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const ids = (page: { items: EgressListItem[] }) => page.items.map((item) => item.egressId);

/** An egress of `roomSid` started `minutes` ago: complete after 30 minutes unless another status is given. */
function recording(
	id: string,
	roomSid: string | undefined,
	startedAt: Date,
	input: Partial<EgressDocument> = {}
): EgressDocument {
	const status: EgressStatus = input.status ?? 'complete';
	const ended = !['starting', 'active', 'ending'].includes(status);
	const {
		roomSid: _roomSid,
		roomName: _roomName,
		roomNameLower: _roomNameLower,
		endedAt: _endedAt,
		durationMs: _durationMs,
		closedBy: _closedBy,
		error: _error,
		errorCode: _errorCode,
		...base
	} = egress({ _id: id, roomSid: 'RM_unused', startedAt });

	const roomName = input.roomName ?? roomSid?.toLowerCase();

	return {
		...base,
		...(roomSid === undefined || roomName === undefined
			? {}
			: { roomSid, roomName, roomNameLower: roomName.toLowerCase() }),
		status,
		updatedAt: startedAt,
		...(ended
			? {
					endedAt: new Date(startedAt.getTime() + 30 * MINUTE),
					durationMs: 30 * MINUTE,
					closedBy: 'event',
					expiresAt: new Date(Date.now() + 90 * 24 * HOUR)
				}
			: { expiresAt: null }),
		...input
	};
}

function hourly(bucket: Date, figures: NonNullable<HourlyRollupDocument['egress']>): HourlyRollupDocument {
	return { _id: `global:${bucket.toISOString().replace('.000Z', 'Z')}`, scope: 'global', bucket, egress: figures };
}

describe.skipIf(mongoUri === '')('egress API', () => {
	let ce: Client;

	beforeAll(async () => {
		ce = await bootClient(mongoUri);
	});

	afterAll(async () => {
		await ce.dashboard.stop();
	});

	describe('list', () => {
		it('lists the egresses started in the last 24 hours with total and walks the cursor', async () => {
			const recent = Array.from({ length: 60 }, (_, i) =>
				recording(`EG_r${String(i).padStart(2, '0')}`, 'RM_a', minutesAgo((i + 1) * 20))
			);
			const old = Array.from({ length: 5 }, (_, i) =>
				recording(`EG_o${String(i)}`, 'RM_a', minutesAgo(3 * 24 * 60 + i))
			);

			await reseed(ce.dashboard.db, { egresses: [...old, ...recent] });

			const inDay = recent
				.filter((doc) => doc.startedAt.getTime() > Date.now() - 24 * HOUR)
				.map((doc) => doc._id);
			const first = await json<ListResponse<EgressListItem>>(ce, '/egresses');

			expect(ids(first)).toEqual(inDay.slice(0, 25));
			expect(first).toMatchObject({ prevCursor: null, total: inDay.length });

			const all = recent.map((doc) => doc._id);
			const walk = async (cursor: string | null) =>
				json<ListResponse<EgressListItem>>(
					ce,
					`/egresses?from=now-2d&limit=25${cursor ? `&cursor=${cursor}` : ''}`
				);
			const one = await walk(null);
			const two = await walk(one.nextCursor);
			const three = await walk(two.nextCursor);
			const back = await walk(three.prevCursor);

			expect([ids(one), ids(two), ids(three), ids(back)]).toEqual([
				all.slice(0, 25),
				all.slice(25, 50),
				all.slice(50, 60),
				all.slice(25, 50)
			]);
			expect((await issue(ce, '/egresses?sort=durationMs')).first?.path).toEqual(['sort']);
		});

		it('filters by a status set, types and a room, and rejects unknown values', async () => {
			const at = (i: number) => minutesAgo(10 + i);

			await reseed(ce.dashboard.db, {
				egresses: [
					recording('EG_act', 'RM_abc', at(1), { status: 'active' }),
					recording('EG_sta', 'RM_x', at(2), { status: 'starting' }),
					recording('EG_end', 'RM_x', at(3), { status: 'ending' }),
					recording('EG_ok', 'RM_abc', at(4)),
					recording('EG_f1', 'RM_x', at(5), { status: 'failed', error: 'boom', type: 'participant' }),
					recording('EG_f2', 'RM_x', at(6), { status: 'failed', error: 'boom', type: 'web' }),
					recording('EG_f3', 'RM_x', at(7), { status: 'failed', error: 'boom', type: 'room_composite' })
				]
			});

			expect(ids(await json(ce, '/egresses?status=starting,active,ending'))).toEqual([
				'EG_act',
				'EG_sta',
				'EG_end'
			]);
			expect(ids(await json(ce, '/egresses?status=failed&type=room_composite,participant'))).toEqual([
				'EG_f1',
				'EG_f3'
			]);
			expect(ids(await json(ce, '/egresses?room=RM_abc'))).toEqual(['EG_act', 'EG_ok']);
			expect(await issue(ce, '/egresses?status=running')).toMatchObject({
				status: 400,
				code: 'VALIDATION_ERROR',
				first: { path: ['status'] }
			});
			expect((await issue(ce, '/egresses?room=demo-room')).first?.path).toEqual(['room']);
		});

		it('searches a room name prefix through the rooms and looks up an exact id outside the range', async () => {
			const rooms = [
				activeRoom({ _id: 'RM_demo1', name: 'Demo-Room', createdAt: minutesAgo(100) }),
				activeRoom({ _id: 'RM_demo2', name: 'demo-2', createdAt: minutesAgo(90) }),
				activeRoom({ _id: 'RM_mydemo', name: 'my-demo', createdAt: minutesAgo(80) })
			];

			await reseed(ce.dashboard.db, {
				rooms,
				egresses: [
					recording('EG_d1', 'RM_demo1', minutesAgo(50), { roomName: 'Demo-Room' }),
					recording('EG_d2', 'RM_demo2', minutesAgo(40), { roomName: 'demo-2' }),
					recording('EG_my', 'RM_mydemo', minutesAgo(30), { roomName: 'my-demo' }),
					recording('EG_ab12cd', 'RM_demo1', minutesAgo(40 * 24 * 60), { roomName: 'Demo-Room' }),
					recording('EG_long', 'RM_demo2', minutesAgo(3 * 24 * 60), { status: 'active', roomName: 'demo-2' })
				]
			});

			expect(ids(await json(ce, '/egresses?q=DE'))).toEqual(['EG_d2', 'EG_d1']);
			expect(await issue(ce, '/egresses?q=d')).toMatchObject({
				status: 400,
				first: { path: ['q'], message: 'must have at least two characters' }
			});
			expect(await json(ce, '/egresses?q=EG_ab12cd&from=now-24h&status=active')).toMatchObject({
				items: [{ egressId: 'EG_ab12cd' }],
				total: 1,
				nextCursor: null,
				prevCursor: null
			});
			expect(ids(await json(ce, '/egresses?status=active&from=now-24h&to=now'))).toEqual([]);
			expect(ids(await json(ce, '/egresses?q=EG_long'))).toEqual(['EG_long']);
		});

		it('matches every egress of a room name prefix, with no room cap, also once the room expired', async () => {
			const egresses = Array.from({ length: 150 }, (_, i) =>
				recording(`EG_load${String(i).padStart(3, '0')}`, `RM_load${String(i)}`, minutesAgo(200 - i), {
					roomName: `load-${String(i)}`
				})
			);

			await reseed(ce.dashboard.db, { egresses });

			const first = await json<ListResponse<EgressListItem>>(ce, '/egresses?q=load-&limit=100');
			const second = await json<ListResponse<EgressListItem>>(
				ce,
				`/egresses?q=load-&limit=100&cursor=${first.nextCursor ?? ''}`
			);

			expect([...ids(first), ...ids(second)]).toEqual(egresses.map((doc) => doc._id).reverse());
			expect([first.total, second.total, second.nextCursor]).toEqual([150, 150, null]);
		});

		it('ranks by end time and duration, egresses in flight at their live value', async () => {
			await reseed(ce.dashboard.db, {
				egresses: [
					recording('EG_2h', 'RM_a', minutesAgo(180), {
						endedAt: minutesAgo(60),
						durationMs: 120 * MINUTE
					}),
					recording('EG_10m', 'RM_a', minutesAgo(20), { endedAt: minutesAgo(10), durationMs: 10 * MINUTE }),
					recording('EG_live', 'RM_a', minutesAgo(45), { status: 'active' })
				]
			});

			expect(ids(await json(ce, '/egresses?sort=duration'))).toEqual(['EG_2h', 'EG_live', 'EG_10m']);
			expect(ids(await json(ce, '/egresses?sort=endedAt'))).toEqual(['EG_live', 'EG_10m', 'EG_2h']);
			expect(await issue(ce, '/egresses?sort=duration&from=now-30d&to=now')).toMatchObject({
				status: 400,
				code: 'SORT_RANGE_TOO_WIDE'
			});
		});

		it('summarizes the egresses of a short range exactly and of a long one from the rollups', async () => {
			const egresses = [
				...Array.from({ length: 3 }, (_, i) =>
					recording(`EG_a${String(i)}`, 'RM_a', minutesAgo(10 + i), { status: 'active' })
				),
				...Array.from({ length: 8 }, (_, i) =>
					recording(`EG_c${String(i)}`, 'RM_a', minutesAgo(100 + i), {
						type: (i < 6 ? 'room_composite' : 'track') as EgressType
					})
				),
				recording('EG_fail', 'RM_a', minutesAgo(200), { status: 'failed', error: 'x', type: 'track' }),
				recording('EG_old', 'RM_a', minutesAgo(10 * 24 * 60))
			];
			const bucket = new Date(Math.floor((Date.now() - 20 * 24 * HOUR) / HOUR) * HOUR);

			await reseed(ce.dashboard.db, {
				egresses,
				hourly: [
					hourly(bucket, {
						started: 4,
						byType: { web: 4 },
						endedByStatus: { complete: 3, aborted: 1 },
						durationMs: 1_000
					}),
					hourly(new Date(bucket.getTime() + HOUR), { started: 2, byType: { track: 2 }, durationMs: 500 })
				]
			});

			expect(await json<EgressSummary>(ce, '/egresses/summary?from=now-24h&to=now')).toEqual({
				active: 3,
				startedInRange: 12,
				byType: { room_composite: 9, track: 3 },
				byEndStatus: { complete: 8, failed: 1 },
				totalDurationMs: 9 * 30 * MINUTE,
				approximate: false
			});
			expect(await json<EgressSummary>(ce, '/egresses/summary?from=now-30d&to=now-15d')).toEqual({
				active: 3,
				startedInRange: 6,
				byType: { web: 4, track: 2 },
				byEndStatus: { complete: 3, aborted: 1 },
				totalDurationMs: 1_500,
				approximate: true
			});
		});
	});

	describe('CE edition', () => {
		it.each(['/egresses/EG_ab12cd', '/egresses/EG_ab12cd/events'])('answers PRO_FEATURE on %s', async (path) => {
			expect(await issue(ce, path)).toMatchObject({ status: 403, code: 'PRO_FEATURE', feature: 'egress-detail' });
		});

		it('documents the list and the summary, and none of the locked routes', () => {
			const registry = ce.dashboard.running.container.get<RouteRegistry>(TOKENS.RouteRegistry);
			const paths = Object.keys(openApiDocument(registry, { version: 'test' }).paths ?? {});

			expect(paths).toEqual(expect.arrayContaining(['/api/v1/egresses', '/api/v1/egresses/summary']));
			expect(paths.filter((path) => path.startsWith('/api/v1/egresses/{id}'))).toEqual([]);
		});
	});
});
