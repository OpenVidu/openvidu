import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import {
	Collection,
	type HourlyRollupDocument,
	type IngressDocument,
	type IngressListItem,
	type IngressSessionDocument,
	type IngressSummary,
	type ListResponse,
	type ParticipantDocument
} from '@openvidu-dashboard/typings';

import { openApiDocument } from '../../src/api/openapi.js';
import type { RouteRegistry } from '../../src/api/route-registry.js';
import { TOKENS } from '../../src/di/tokens.js';
import { bootClient, type Client, issue, json } from '../support/api-client.js';
import { loadFixture } from '../support/fixtures.js';
import { minutesAgo, reseed } from '../support/rooms-seed.js';

const mongoUri = inject('mongoUri');
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const ids = (page: { items: IngressListItem[] }) => page.items.map((item) => item.ingressId);
const template = loadFixture<IngressDocument>(Collection.INGRESSES).find((doc) => doc.status === 'publishing');
/** An idle RTMP ingress created at `createdAt` unless the overrides say otherwise. */
function ingress(id: string, createdAt: Date, input: Partial<IngressDocument> = {}): IngressDocument {
	if (template === undefined) {
		throw new Error('the fixtures need a publishing ingress');
	}

	return {
		...structuredClone(template),
		_id: id,
		name: id,
		nameLower: id.toLowerCase(),
		createdAt,
		status: 'inactive',
		expiresAt: null,
		...input
	};
}

function hourly(bucket: Date, sessionsStarted: number, durationMs: number): HourlyRollupDocument {
	return {
		_id: `global:${bucket.toISOString().replace('.000Z', 'Z')}`,
		scope: 'global',
		bucket,
		ingress: { sessionsStarted, durationMs }
	};
}

async function seed(
	db: Client['dashboard']['db'],
	documents: {
		ingresses?: IngressDocument[];
		sessions?: IngressSessionDocument[];
		participants?: ParticipantDocument[];
	}
) {
	await reseed(db, { participants: documents.participants ?? [] });
	await db.collection(Collection.INGRESSES).deleteMany({});

	if (documents.ingresses?.length) {
		await db.collection<IngressDocument>(Collection.INGRESSES).insertMany(documents.ingresses);
	}

	if (documents.sessions?.length) {
		await db.collection<IngressSessionDocument>(Collection.INGRESS_SESSIONS).insertMany(documents.sessions);
	}
}

describe.skipIf(mongoUri === '')('ingress API', () => {
	let ce: Client;

	beforeAll(async () => {
		ce = await bootClient(mongoUri);
	});

	afterAll(async () => {
		await ce.dashboard.stop();
	});

	describe('list', () => {
		it('lists the ingresses created in the last 24 hours with total and walks the cursor', async () => {
			const recent = Array.from({ length: 60 }, (_, i) =>
				ingress(`IN_r${String(i).padStart(2, '0')}`, minutesAgo((i + 1) * 20))
			);
			const old = Array.from({ length: 4 }, (_, i) => ingress(`IN_o${String(i)}`, minutesAgo(3 * 24 * 60 + i)));

			await seed(ce.dashboard.db, { ingresses: [...old, ...recent] });

			const inDay = recent
				.filter((doc) => doc.createdAt.getTime() > Date.now() - 24 * HOUR)
				.map((doc) => doc._id);
			const first = await json<ListResponse<IngressListItem>>(ce, '/ingresses');

			expect(ids(first)).toEqual(inDay.slice(0, 25));
			expect(first).toMatchObject({ prevCursor: null, total: inDay.length });
			expect(first.items[0]).not.toHaveProperty('url');

			const all = recent.map((doc) => doc._id);
			const walk = (cursor: string | null) =>
				json<ListResponse<IngressListItem>>(
					ce,
					`/ingresses?from=now-2d&limit=25${cursor ? `&cursor=${cursor}` : ''}`
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
			expect(ids(await json(ce, '/ingresses?from=now-2d&order=asc&limit=3'))).toEqual(all.slice(-3).reverse());
		});

		it('filters by status and input type, searches a name prefix and looks up an exact id', async () => {
			await seed(ce.dashboard.db, {
				ingresses: [
					ingress('IN_cam1', minutesAgo(10), { name: 'Cam-1', nameLower: 'cam-1', status: 'publishing' }),
					ingress('IN_cam2', minutesAgo(20), { name: 'cam-2', nameLower: 'cam-2', inputType: 'whip' }),
					ingress('IN_my', minutesAgo(30), {
						name: 'my-cam',
						nameLower: 'my-cam',
						inputType: 'url',
						lastError: 'x'
					}),
					ingress('IN_ab12cd', minutesAgo(40 * 24 * 60), { status: 'deleted', deletedAt: minutesAgo(60) })
				]
			});

			expect(ids(await json(ce, '/ingresses?status=publishing'))).toEqual(['IN_cam1']);
			expect(ids(await json(ce, '/ingresses?inputType=whip'))).toEqual(['IN_cam2']);
			expect(ids(await json(ce, '/ingresses?q=CA'))).toEqual(['IN_cam1', 'IN_cam2']);
			expect((await json<ListResponse<IngressListItem>>(ce, '/ingresses?q=my')).items[0]).toMatchObject({
				hasError: true
			});
			expect(await json(ce, '/ingresses?q=IN_ab12cd&from=now-24h&status=publishing')).toMatchObject({
				items: [{ ingressId: 'IN_ab12cd', status: 'deleted' }],
				total: 1,
				nextCursor: null,
				prevCursor: null
			});
			expect((await issue(ce, '/ingresses?status=active')).first?.path).toEqual(['status']);
			expect((await issue(ce, '/ingresses?inputType=srt')).first?.path).toEqual(['inputType']);
			expect((await issue(ce, '/ingresses?sort=lastSessionAt')).first?.path).toEqual(['sort']);
			expect(await issue(ce, '/ingresses?q=c')).toMatchObject({
				status: 400,
				first: { path: ['q'], message: 'must have at least two characters' }
			});
		});

		it('lists the ingresses created, used or publishing in the range, each once', async () => {
			await seed(ce.dashboard.db, {
				ingresses: [
					ingress('IN_reused', minutesAgo(20 * 24 * 60), { lastSessionAt: minutesAgo(120) }),
					ingress('IN_long', minutesAgo(30 * 24 * 60), {
						status: 'publishing',
						lastSessionAt: minutesAgo(3 * 24 * 60)
					}),
					ingress('IN_idle', minutesAgo(30 * 24 * 60), { lastSessionAt: minutesAgo(10 * 24 * 60) }),
					ingress('IN_new', minutesAgo(60), { status: 'publishing', lastSessionAt: minutesAgo(50) })
				]
			});

			const day = await json<ListResponse<IngressListItem>>(ce, '/ingresses?from=now-24h&to=now');

			expect(ids(day)).toEqual(['IN_new', 'IN_reused', 'IN_long']);
			expect(day.total).toBe(3);
			expect(ids(await json(ce, '/ingresses?from=now-1h&to=now'))).toEqual(['IN_new', 'IN_long']);
			expect(ids(await json(ce, '/ingresses?q=in_re&from=now-24h&to=now'))).toEqual(['IN_reused']);
		});

		it('ranks by total duration with the running session, sessions and last session, within the range limit', async () => {
			await seed(ce.dashboard.db, {
				ingresses: [
					ingress('IN_3h', minutesAgo(600), {
						totalDurationMs: 3 * HOUR,
						sessions: 12,
						lastSessionAt: minutesAgo(120)
					}),
					ingress('IN_20m', minutesAgo(500), {
						totalDurationMs: 20 * MINUTE,
						sessions: 1,
						lastSessionAt: minutesAgo(360)
					}),
					ingress('IN_live', minutesAgo(400), {
						status: 'publishing',
						totalDurationMs: HOUR,
						sessions: 5,
						lastSessionAt: minutesAgo(90)
					})
				]
			});

			expect(ids(await json(ce, '/ingresses?sort=totalDuration'))).toEqual(['IN_3h', 'IN_live', 'IN_20m']);
			expect(ids(await json(ce, '/ingresses?sort=sessions'))).toEqual(['IN_3h', 'IN_live', 'IN_20m']);
			expect(ids(await json(ce, '/ingresses?sort=lastSession'))).toEqual(['IN_live', 'IN_3h', 'IN_20m']);
			expect(await issue(ce, '/ingresses?sort=sessions&from=now-30d&to=now')).toMatchObject({
				status: 400,
				code: 'SORT_RANGE_TOO_WIDE'
			});
			expect(ids(await json(ce, '/ingresses?sort=createdAt&from=now-90d&to=now'))).toEqual([
				'IN_live',
				'IN_20m',
				'IN_3h'
			]);
		});

		it('summarizes publishing now, created by input type and the hourly session sums', async () => {
			const hour = Math.floor(Date.now() / HOUR) * HOUR;

			await seed(ce.dashboard.db, {
				ingresses: [
					ingress('IN_p1', minutesAgo(30 * 24 * 60), { status: 'publishing' }),
					ingress('IN_p2', minutesAgo(30), { status: 'publishing' }),
					ingress('IN_r2', minutesAgo(60)),
					ingress('IN_r3', minutesAgo(90)),
					ingress('IN_w1', minutesAgo(100), { inputType: 'whip' }),
					ingress('IN_w2', minutesAgo(110), { inputType: 'whip' })
				]
			});
			await ce.dashboard.db
				.collection<HourlyRollupDocument>(Collection.ANALYTICS_HOURLY)
				.insertMany([
					hourly(new Date(hour - 3 * HOUR), 8, 4 * HOUR),
					hourly(new Date(hour - 2 * HOUR), 4, 2 * HOUR)
				]);

			// IN_p1, created a month ago, is publishing now: the activity range lists it and the summary counts it.
			expect(await json<IngressSummary>(ce, '/ingresses/summary?from=now-24h&to=now')).toEqual({
				publishingNow: 2,
				ingressesInRange: 6,
				byInputType: { rtmp: 4, whip: 2, url: 0 },
				sessionsInRange: 12,
				totalDurationMs: 6 * HOUR,
				approximate: true
			});

			const from = new Date(hour - 3 * HOUR).toISOString();
			const to = new Date(hour - HOUR).toISOString();
			const aligned = await json<IngressSummary>(ce, `/ingresses/summary?from=${from}&to=${to}`);

			expect(aligned).toMatchObject({ sessionsInRange: 12, approximate: false });
			expect((await json<IngressSummary>(ce, '/ingresses/summary?from=now-1h')).publishingNow).toBe(2);
		});
	});

	describe('CE edition', () => {
		it.each(['/ingresses/IN_ab12cd', '/ingresses/IN_ab12cd/sessions', '/ingresses/IN_ab12cd/events'])(
			'answers PRO_FEATURE on %s',
			async (path) => {
				expect(await issue(ce, path)).toMatchObject({
					status: 403,
					code: 'PRO_FEATURE',
					feature: 'ingress-detail'
				});
			}
		);

		it('documents the list and the summary, and none of the locked routes', () => {
			const registry = ce.dashboard.running.container.get<RouteRegistry>(TOKENS.RouteRegistry);
			const paths = Object.keys(openApiDocument(registry, { version: 'test' }).paths ?? {});

			expect(paths).toEqual(expect.arrayContaining(['/api/v1/ingresses', '/api/v1/ingresses/summary']));
			expect(paths.filter((path) => path.startsWith('/api/v1/ingresses/{id}'))).toEqual([]);
		});
	});
});
