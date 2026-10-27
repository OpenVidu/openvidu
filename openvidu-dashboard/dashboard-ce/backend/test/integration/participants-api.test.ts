import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { type ListResponse, type ParticipantListItem } from '@openvidu-dashboard/typings';

import { openApiDocument } from '../../src/api/openapi.js';
import type { RouteRegistry } from '../../src/api/route-registry.js';
import { TOKENS } from '../../src/di/tokens.js';
import { bootClient, type Client, issue, json } from '../support/api-client.js';
import { minutesAgo, participant, reseed } from '../support/rooms-seed.js';

const mongoUri = inject('mongoUri');
const MINUTE = 60_000;

const sids = (page: { items: { sid: string }[] }) => page.items.map((item) => item.sid);

describe.skipIf(mongoUri === '')('participants API', () => {
	let ce: Client;

	beforeAll(async () => {
		ce = await bootClient(mongoUri);
	});

	afterAll(async () => {
		await ce.dashboard.stop();
	});

	describe('summary', () => {
		it('counts STANDARD participants and the services apart, exactly within the threshold', async () => {
			const sessions = (kind: 'STANDARD' | 'EGRESS' | 'AGENT', total: number, active: number) =>
				Array.from({ length: total }, (_, i) =>
					participant({
						_id: `PA_${kind}${String(i)}`,
						identity: `${kind}${String(i)}`,
						roomSid: 'RM_s',
						joinedAt: minutesAgo(i + 1),
						kind,
						...(i < active ? {} : { status: 'left' as const, leftAt: minutesAgo(i) })
					})
				);
			const older = participant({
				_id: 'PA_old',
				identity: 'old',
				roomSid: 'RM_s',
				joinedAt: minutesAgo(25 * 60),
				leftAt: minutesAgo(24 * 60 + 30)
			});

			await reseed(ce.dashboard.db, {
				participants: [
					...sessions('STANDARD', 900, 31),
					...sessions('EGRESS', 40, 3),
					...sessions('AGENT', 12, 2),
					older
				]
			});

			const none = { STANDARD: 0, INGRESS: 0, EGRESS: 0, SIP: 0, AGENT: 0, CONNECTOR: 0, BRIDGE: 0 };

			expect(await json(ce, '/participants/summary?from=now-24h&to=now')).toEqual({
				active: { participants: 31, services: 5, byKind: { ...none, STANDARD: 31, EGRESS: 3, AGENT: 2 } },
				sessions: { participants: 900, byKind: { ...none, STANDARD: 900, EGRESS: 40, AGENT: 12 } },
				approximate: false
			});
		});

		it('sums the global hourly rollups beyond the threshold', async () => {
			const HOUR = 60 * MINUTE;
			const hour = Math.floor(Date.now() / HOUR) * HOUR;
			const hourly = (hoursAgo: number, joined: number, egress: number, scope = 'global') => {
				const bucket = new Date(hour - hoursAgo * HOUR);

				return {
					_id: `${scope}:${bucket.toISOString().replace('.000Z', 'Z')}`,
					scope,
					bucket,
					participants: { joined, byKind: { STANDARD: joined, EGRESS: egress } }
				};
			};

			await reseed(ce.dashboard.db, {
				hourly: [
					hourly(1, 50, 4),
					hourly(24 * 10, 20, 1),
					hourly(24 * 31, 1000, 100),
					hourly(1, 999, 9, 'node:ND_a')
				]
			});

			expect(await json(ce, '/participants/summary?from=now-30d&to=now')).toMatchObject({
				sessions: { participants: 70, byKind: { STANDARD: 70, EGRESS: 5, AGENT: 0 } },
				approximate: true
			});
		});
	});

	describe('list', () => {
		it('lists the sessions joined in the last 24 hours with total', async () => {
			const recent = Array.from({ length: 40 }, (_, i) =>
				participant({
					_id: `PA_r${String(i).padStart(2, '0')}`,
					identity: `user${String(i)}`,
					roomSid: 'RM_a',
					joinedAt: minutesAgo((i + 1) * 30)
				})
			);
			const old = Array.from({ length: 5 }, (_, i) =>
				participant({
					_id: `PA_o${String(i)}`,
					identity: 'old',
					roomSid: 'RM_a',
					joinedAt: minutesAgo(3 * 24 * 60)
				})
			);

			await reseed(ce.dashboard.db, { participants: [...old, ...recent] });

			const page = await json<ListResponse<ParticipantListItem>>(ce, '/participants');

			expect(sids(page)).toEqual(recent.slice(0, 25).map((doc) => doc._id));
			expect(page).toMatchObject({ prevCursor: null, total: 40 });
			expect(page.nextCursor).not.toBeNull();
		});

		it('filters by room, status and kind, and rejects unknown values', async () => {
			const at = (i: number) => minutesAgo(10 + i);

			await reseed(ce.dashboard.db, {
				participants: [
					participant({ _id: 'PA_a1', identity: 'a1', roomSid: 'RM_abc', joinedAt: at(1) }),
					participant({ _id: 'PA_a2', identity: 'a2', roomSid: 'RM_abc', joinedAt: at(2) }),
					...[3, 4, 5].map((i) =>
						participant({
							_id: `PA_l${String(i)}`,
							identity: 'l',
							roomSid: 'RM_abc',
							joinedAt: at(i),
							leftAt: at(0)
						})
					),
					participant({ _id: 'PA_other', identity: 'o', roomSid: 'RM_x', joinedAt: at(6) }),
					participant({ _id: 'PA_ag', identity: 'agent', roomSid: 'RM_x', joinedAt: at(7), kind: 'AGENT' }),
					participant({ _id: 'PA_eg', identity: 'EG_1', roomSid: 'RM_x', joinedAt: at(8), kind: 'EGRESS' })
				]
			});

			expect(sids(await json(ce, '/participants?room=RM_abc&status=active'))).toEqual(['PA_a1', 'PA_a2']);
			expect(sids(await json(ce, '/participants?kind=AGENT,EGRESS'))).toEqual(['PA_ag', 'PA_eg']);
			expect(sids(await json(ce, '/participants?status=active&kind=STANDARD'))).toEqual([
				'PA_a1',
				'PA_a2',
				'PA_other'
			]);
			expect(await issue(ce, '/participants?kind=ROBOT')).toMatchObject({
				status: 400,
				code: 'VALIDATION_ERROR',
				first: { path: ['kind'] }
			});
			expect((await issue(ce, '/participants?sort=identity')).first?.path).toEqual(['sort']);
		});

		it('searches an identity prefix, also inside a room, and looks up an exact SID', async () => {
			await reseed(ce.dashboard.db, {
				participants: [
					participant({ _id: 'PA_al1', identity: 'Alice', roomSid: 'RM_a', joinedAt: minutesAgo(10) }),
					participant({ _id: 'PA_al2', identity: 'alice-2', roomSid: 'RM_b', joinedAt: minutesAgo(9) }),
					participant({ _id: 'PA_mal', identity: 'malice', roomSid: 'RM_a', joinedAt: minutesAgo(8) }),
					participant({ _id: 'PA_bob', identity: 'bob', roomSid: 'RM_a', joinedAt: minutesAgo(7) }),
					participant({
						_id: 'PA_x1y2',
						identity: 'old',
						roomSid: 'RM_a',
						joinedAt: minutesAgo(10 * 24 * 60)
					})
				]
			});

			expect(sids(await json(ce, '/participants?q=al'))).toEqual(['PA_al2', 'PA_al1']);
			expect(sids(await json(ce, '/participants?q=ali&room=RM_a'))).toEqual(['PA_al1']);
			expect((await issue(ce, '/participants?q=a')).first).toEqual({
				path: ['q'],
				message: 'must have at least two characters'
			});

			const exact = await json<ListResponse<ParticipantListItem>>(
				ce,
				'/participants?q=PA_x1y2&from=now-24h&to=now'
			);

			expect(exact).toMatchObject({ total: 1, nextCursor: null, prevCursor: null });
			expect(sids(exact)).toEqual(['PA_x1y2']);
			expect((await json<ListResponse<ParticipantListItem>>(ce, '/participants?q=PA_missing')).items).toEqual([]);
		});

		it('ranks by left time and duration, open sessions at their live value, within 24 hours or one room', async () => {
			await reseed(ce.dashboard.db, {
				participants: [
					participant({
						_id: 'PA_50',
						identity: 'fifty',
						roomSid: 'RM_a',
						joinedAt: minutesAgo(120),
						leftAt: minutesAgo(70)
					}),
					participant({
						_id: 'PA_5',
						identity: 'five',
						roomSid: 'RM_a',
						joinedAt: minutesAgo(15),
						leftAt: minutesAgo(10)
					}),
					participant({ _id: 'PA_open', identity: 'open', roomSid: 'RM_b', joinedAt: minutesAgo(20) })
				]
			});

			expect(sids(await json(ce, '/participants?sort=duration'))).toEqual(['PA_50', 'PA_open', 'PA_5']);
			expect(sids(await json(ce, '/participants?sort=leftAt'))).toEqual(['PA_open', 'PA_5', 'PA_50']);
			expect(sids(await json(ce, '/participants?sort=leftAt&order=asc'))).toEqual(['PA_50', 'PA_5', 'PA_open']);
			expect(await issue(ce, '/participants?sort=leftAt&from=now-48h&to=now')).toMatchObject({
				status: 400,
				code: 'SORT_RANGE_TOO_WIDE'
			});
			expect(sids(await json(ce, '/participants?sort=duration&room=RM_a&from=now-30d&to=now'))).toEqual([
				'PA_50',
				'PA_5'
			]);
		});

		it('keeps the publishers and lists the sources each session published', async () => {
			const published = (bySource: Record<string, number>) => ({
				isPublisher: Object.keys(bySource).length > 0,
				tracks: { published: 1, bySource, subscribed: 0, subscribeFailures: 0 }
			});

			await reseed(ce.dashboard.db, {
				participants: [
					participant({
						_id: 'PA_pub',
						identity: 'pub',
						roomSid: 'RM_a',
						joinedAt: minutesAgo(10),
						...published({ CAMERA: 1, MICROPHONE: 1 })
					}),
					participant({
						_id: 'PA_sub',
						identity: 'sub',
						roomSid: 'RM_a',
						joinedAt: minutesAgo(9),
						...published({})
					})
				]
			});

			const page = await json<ListResponse<ParticipantListItem>>(
				ce,
				'/participants?status=active&publisher=true'
			);

			expect(sids(page)).toEqual(['PA_pub']);
			expect(page.total).toBe(1);
			expect(page.items[0]?.publishedSources).toEqual(['CAMERA', 'MICROPHONE']);
			expect(
				(await json<ListResponse<ParticipantListItem>>(ce, '/participants?q=sub')).items[0]?.publishedSources
			).toEqual([]);
			expect((await issue(ce, '/participants?publisher=yes')).first?.path).toEqual(['publisher']);
		});

		it('walks forward and back without gaps or duplicates', async () => {
			const docs = Array.from({ length: 30 }, (_, i) =>
				participant({
					_id: `PA_w${String(i).padStart(2, '0')}`,
					identity: `walker${String(i)}`,
					roomSid: 'RM_w',
					joinedAt: minutesAgo(Math.floor(i / 2) + 1)
				})
			);
			const expected = [...docs]
				.sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime() || (a._id < b._id ? 1 : -1))
				.map((doc) => doc._id);

			await reseed(ce.dashboard.db, { participants: docs });

			const first = await json<ListResponse<ParticipantListItem>>(ce, '/participants?status=active&limit=10');
			const second = await json<ListResponse<ParticipantListItem>>(
				ce,
				`/participants?status=active&limit=10&cursor=${first.nextCursor ?? ''}`
			);
			const third = await json<ListResponse<ParticipantListItem>>(
				ce,
				`/participants?status=active&limit=10&cursor=${second.nextCursor ?? ''}`
			);
			const back = await json<ListResponse<ParticipantListItem>>(
				ce,
				`/participants?status=active&limit=10&cursor=${third.prevCursor ?? ''}`
			);

			expect([...sids(first), ...sids(second), ...sids(third)]).toEqual(expected);
			expect(sids(back)).toEqual(expected.slice(10, 20));
		});
	});

	describe('CE edition', () => {
		it.each([
			['/participants/PA_x1y2', 'participant-detail'],
			['/participants/PA_x1y2/sessions', 'participant-detail'],
			['/participants/PA_x1y2/tracks', 'participant-detail'],
			['/participants/PA_x1y2/subscriptions', 'participant-detail'],
			['/participants/PA_x1y2/events', 'participant-detail'],
			['/participants/PA_x1y2/series', 'participant-detail']
		])('answers PRO_FEATURE on %s and 401 without a token', async (path, feature) => {
			expect(await issue(ce, path)).toMatchObject({ status: 403, code: 'PRO_FEATURE', feature });
			expect((await fetch(`${ce.dashboard.url}/api/v1${path}`)).status).toBe(401);
		});

		it('documents the lists and the summary, and none of the locked routes', () => {
			const registry = ce.dashboard.running.container.get<RouteRegistry>(TOKENS.RouteRegistry);
			const paths = Object.keys(openApiDocument(registry, { version: 'test' }).paths ?? {});

			expect(paths).toEqual(
				expect.arrayContaining(['/api/v1/participants', '/api/v1/participants/summary', '/api/v1/agents'])
			);
			expect(paths.filter((path) => /^\/api\/v1\/(participants|tracks)\/\{sid\}/.test(path))).toEqual([]);
		});
	});

	describe('Agents', () => {
		it('lists the agent sessions only, on CE', async () => {
			await reseed(ce.dashboard.db, {
				participants: [
					participant({
						_id: 'PA_ag1',
						identity: 'agent-1',
						roomSid: 'RM_a',
						joinedAt: minutesAgo(5),
						kind: 'AGENT'
					}),
					participant({
						_id: 'PA_ag2',
						identity: 'agent-2',
						roomSid: 'RM_b',
						joinedAt: minutesAgo(6),
						kind: 'AGENT'
					}),
					participant({
						_id: 'PA_ag3',
						identity: 'agent-3',
						roomSid: 'RM_b',
						joinedAt: minutesAgo(7),
						leftAt: minutesAgo(2),
						kind: 'AGENT'
					}),
					...Array.from({ length: 10 }, (_, i) =>
						participant({
							_id: `PA_std${String(i)}`,
							identity: `s${String(i)}`,
							roomSid: 'RM_a',
							joinedAt: minutesAgo(i)
						})
					)
				]
			});

			const agents = await json<ListResponse<ParticipantListItem>>(ce, '/agents?status=active');

			expect(sids(agents)).toEqual(['PA_ag1', 'PA_ag2']);
			expect(agents.items.every((item) => item.kind === 'AGENT' && item.nodeId !== undefined)).toBe(true);
			expect(sids(await json(ce, '/agents?q=agent-2'))).toEqual(['PA_ag2']);
			expect(sids(await json(ce, '/agents?q=s1'))).toEqual([]);
			expect(sids(await json(ce, '/agents?kind=STANDARD'))).toEqual(['PA_ag1', 'PA_ag2', 'PA_ag3']);
			expect(sids(await json(ce, '/agents?sort=duration&from=now-6h&to=now'))).toEqual([
				'PA_ag2',
				'PA_ag1',
				'PA_ag3'
			]);
		});
	});
});
