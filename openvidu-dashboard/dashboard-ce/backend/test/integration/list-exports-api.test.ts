import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { Collection, EXPORT_TRUNCATED_HEADER, type IngressDocument } from '@openvidu-dashboard/typings';

import { openApiDocument } from '../../src/api/openapi.js';
import type { RouteRegistry } from '../../src/api/route-registry.js';
import { TOKENS } from '../../src/di/tokens.js';
import { bootClient, type Client, get, issue } from '../support/api-client.js';
import { loadFixture } from '../support/fixtures.js';
import { activeRoom, closedRoom, egress, minutesAgo, participant, reseed } from '../support/rooms-seed.js';

const mongoUri = inject('mongoUri');
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Status, headers and the lines of a CSV answer, the header row first. */
async function csv(client: Client, path: string) {
	const response = await get(client, path);
	const text = await response.text();

	if (response.status !== 200) {
		throw new Error(`${path}: ${String(response.status)} ${text}`);
	}

	return { headers: response.headers, lines: text.split('\r\n').slice(0, -1) };
}

/** The first cell of every data row. */
function firstCells(lines: string[]): string[] {
	return lines.slice(1).map((line) => line.split(',')[0] ?? '');
}

const ingressTemplate = loadFixture<IngressDocument>(Collection.INGRESSES).find((doc) => doc.status === 'publishing');

function ingress(id: string, createdAt: Date, input: Partial<IngressDocument> = {}): IngressDocument {
	if (ingressTemplate === undefined) {
		throw new Error('the fixtures need a publishing ingress');
	}

	return {
		...structuredClone(ingressTemplate),
		_id: id,
		name: id,
		nameLower: id.toLowerCase(),
		createdAt,
		status: 'inactive',
		expiresAt: null,
		...input
	};
}

describe.skipIf(mongoUri === '')('list CSV exports', () => {
	let ce: Client;

	beforeAll(async () => {
		ce = await bootClient(mongoUri);
	});

	afterAll(async () => {
		await ce.dashboard.stop();
	});

	describe('rooms', () => {
		it('exports the rooms of the list with its filters and order', async () => {
			const features = { egress: true, ingress: false, agent: false, sip: false };

			await reseed(ce.dashboard.db, {
				rooms: [
					closedRoom({ _id: 'RM_sales1', name: 'sales-a', createdAt: minutesAgo(60), features }),
					closedRoom({ _id: 'RM_sales2', name: 'sales-b', createdAt: minutesAgo(120), features }),
					closedRoom({
						_id: 'RM_sales3',
						name: 'sales-c',
						createdAt: minutesAgo(90),
						features: { ...features, egress: false }
					}),
					closedRoom({ _id: 'RM_other', name: 'other', createdAt: minutesAgo(30), features }),
					activeRoom({ _id: 'RM_live', name: 'sales-live', createdAt: minutesAgo(10), features })
				]
			});

			const { headers, lines } = await csv(
				ce,
				'/rooms/export.csv?status=closed&features=egress&q=sales&from=now-7d&to=now'
			);

			expect(headers.get('content-type')).toBe('text/csv; charset=utf-8');
			expect(headers.get('content-disposition')).toMatch(/^attachment; filename="?rooms-.+Z-.+Z\.csv"?$/);
			expect(headers.get(EXPORT_TRUNCATED_HEADER)).toBeNull();
			expect(lines[0]?.startsWith('sid,name,status,createdAt,')).toBe(true);
			expect(firstCells(lines)).toEqual(['RM_sales1', 'RM_sales2']);
		});

		it('exports every page of a ranked list in one file', async () => {
			const rooms = Array.from({ length: 60 }, (_, index) =>
				closedRoom({
					_id: `RM_rank${String(index).padStart(2, '0')}`,
					createdAt: minutesAgo(600),
					endedAt: minutesAgo(600 - (index + 1))
				})
			);

			await reseed(ce.dashboard.db, { rooms });

			const { lines } = await csv(ce, '/rooms/export.csv?sort=duration&from=now-24h&to=now');

			expect(firstCells(lines)).toEqual(rooms.map((room) => room._id).reverse());
		});

		it('finds an exact ID whatever the range, and answers the header alone when nothing matches', async () => {
			await reseed(ce.dashboard.db, {
				rooms: [closedRoom({ _id: 'RM_abc', createdAt: minutesAgo(3 * 24 * 60) })]
			});

			expect(firstCells((await csv(ce, '/rooms/export.csv?q=RM_abc&from=now-1h&to=now')).lines)).toEqual([
				'RM_abc'
			]);
			expect((await csv(ce, '/rooms/export.csv?from=now-1h&to=now')).lines).toHaveLength(1);
		});

		it('refuses a ranked sort beyond its range limit as JSON', async () => {
			expect(await issue(ce, '/rooms/export.csv?sort=uniqueIdentities&from=now-30d&to=now')).toMatchObject({
				status: 400,
				code: 'SORT_RANGE_TOO_WIDE'
			});
		});
	});

	describe('participants and agents', () => {
		const sessions = (count: number) =>
			Array.from({ length: count }, (_, index) =>
				participant({
					_id: `PA_${String(index).padStart(5, '0')}`,
					identity: `user-${String(index)}`,
					roomSid: 'RM_big',
					joinedAt: new Date(Date.now() - (index + 1) * 1000)
				})
			);

		it('cuts the export at 10,000 rows, the most recent first, and says so', async () => {
			await reseed(ce.dashboard.db, { participants: sessions(12_000) });

			const { headers, lines } = await csv(ce, '/participants/export.csv?kind=STANDARD');

			expect(headers.get(EXPORT_TRUNCATED_HEADER)).toBe('true');
			expect(lines).toHaveLength(10_001);
			expect(firstCells(lines).slice(0, 2)).toEqual(['PA_00000', 'PA_00001']);
		});

		it('exports 10,000 rows whole without the header', async () => {
			await reseed(ce.dashboard.db, { participants: sessions(10_000) });

			const { headers, lines } = await csv(ce, '/participants/export.csv?kind=STANDARD');

			expect(headers.get(EXPORT_TRUNCATED_HEADER)).toBeNull();
			expect(lines).toHaveLength(10_001);
		});

		it('ranks the sessions of one room by duration over 90 days', async () => {
			await reseed(ce.dashboard.db, {
				participants: [
					participant({
						_id: 'PA_short',
						identity: 'bob',
						roomSid: 'RM_abc',
						joinedAt: minutesAgo(60 * 24 * 40),
						leftAt: minutesAgo(60 * 24 * 40 - 5)
					}),
					participant({
						_id: 'PA_long',
						identity: 'alice',
						roomSid: 'RM_abc',
						joinedAt: minutesAgo(60 * 24 * 50),
						leftAt: minutesAgo(60 * 24 * 50 - 50)
					}),
					participant({ _id: 'PA_other', identity: 'carol', roomSid: 'RM_xyz', joinedAt: minutesAgo(30) })
				]
			});

			const { lines } = await csv(
				ce,
				'/participants/export.csv?room=RM_abc&kind=STANDARD&sort=duration&from=now-90d&to=now'
			);

			expect(firstCells(lines)).toEqual(['PA_long', 'PA_short']);
		});

		it('exports the agents of the list with the participants header', async () => {
			await reseed(ce.dashboard.db, {
				participants: [
					participant({
						_id: 'PA_agent',
						identity: 'assistant',
						roomSid: 'RM_abc',
						joinedAt: minutesAgo(10),
						kind: 'AGENT'
					}),
					participant({ _id: 'PA_person', identity: 'alice', roomSid: 'RM_abc', joinedAt: minutesAgo(5) })
				]
			});

			const agents = await csv(ce, '/agents/export.csv?status=active');
			const people = await csv(ce, '/participants/export.csv');

			expect(firstCells(agents.lines)).toEqual(['PA_agent']);
			expect(agents.lines[1]?.split(',')[3]).toBe('AGENT');
			expect(agents.lines[0]).toBe(people.lines[0]);
		});
	});

	it('exports the failed egresses of a room by start time', async () => {
		await reseed(ce.dashboard.db, {
			egresses: [
				egress({
					_id: 'EG_failed1',
					roomSid: 'RM_abc',
					startedAt: minutesAgo(60),
					status: 'failed',
					error: 'boom',
					errorCode: 13
				}),
				egress({
					_id: 'EG_failed2',
					roomSid: 'RM_abc',
					startedAt: minutesAgo(30),
					status: 'failed',
					error: 'x'
				}),
				egress({ _id: 'EG_done', roomSid: 'RM_abc', startedAt: minutesAgo(20), status: 'complete' }),
				egress({
					_id: 'EG_elsewhere',
					roomSid: 'RM_xyz',
					startedAt: minutesAgo(10),
					status: 'failed',
					error: 'y'
				})
			]
		});

		const { lines } = await csv(ce, '/egresses/export.csv?status=failed&room=RM_abc&from=now-7d&to=now');
		const header = lines[0]?.split(',') ?? [];
		const first = lines[1]?.split(',') ?? [];

		expect(firstCells(lines)).toEqual(['EG_failed2', 'EG_failed1']);
		expect(first[header.indexOf('hasError')]).toBe('true');
		expect(lines[2]?.split(',')[header.indexOf('errorCode')]).toBe('13');
	});

	it('exports the ingresses of an input type ranked by total duration', async () => {
		await ce.dashboard.db.collection(Collection.INGRESSES).deleteMany({});
		await ce.dashboard.db
			.collection<IngressDocument>(Collection.INGRESSES)
			.insertMany([
				ingress('IN_short', minutesAgo(300), { totalDurationMs: 20 * MINUTE, sessions: 1 }),
				ingress('IN_long', minutesAgo(200), { totalDurationMs: 3 * HOUR, sessions: 4 }),
				ingress('IN_whip', minutesAgo(100), { inputType: 'whip', totalDurationMs: 5 * HOUR, sessions: 2 })
			]);

		const { lines } = await csv(ce, '/ingresses/export.csv?inputType=rtmp&sort=totalDuration&from=now-7d&to=now');

		expect(firstCells(lines)).toEqual(['IN_long', 'IN_short']);
		expect(lines[0]).not.toMatch(/url|streamKey|participantName/);
	});

	it.each(['/rooms', '/participants', '/agents', '/egresses', '/ingresses'])(
		'answers %s/export.csv before the detail route it shares a prefix with',
		async (list) => {
			const response = await get(ce, `${list}/export.csv`);

			expect(response.status).toBe(200);
			expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8');
		}
	);

	it('documents the five exports', () => {
		const registry = ce.dashboard.running.container.get<RouteRegistry>(TOKENS.RouteRegistry);
		const paths = openApiDocument(registry, { version: 'test' }).paths ?? {};
		const operation = (path: string) =>
			(paths[path] as { get?: { operationId?: string; parameters?: { name: string }[] } } | undefined)?.get;

		expect(
			['/rooms', '/participants', '/agents', '/egresses', '/ingresses'].map(
				(list) => operation(`/api/v1${list}/export.csv`)?.operationId
			)
		).toEqual([
			'exportRoomsCsv',
			'exportParticipantsCsv',
			'exportAgentsCsv',
			'exportEgressesCsv',
			'exportIngressesCsv'
		]);
		expect(operation('/api/v1/rooms/export.csv')?.parameters?.map((parameter) => parameter.name)).not.toEqual(
			expect.arrayContaining(['cursor'])
		);
	});
});
