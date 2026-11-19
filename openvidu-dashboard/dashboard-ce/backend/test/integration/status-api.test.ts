import { type CommandStartedEvent, type Db, type Document, MongoClient } from 'mongodb';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { Collection, type NodeDocument, SCHEMA_VERSION, type StatusResponse } from '@openvidu-dashboard/typings';

import { openApiDocument } from '../../src/api/openapi.js';
import { rankedSortLimits } from '../../src/api/ranked-limits.js';
import type { RouteRegistry } from '../../src/api/route-registry.js';
import { TOKENS } from '../../src/di/tokens.js';
import { InfoService } from '../../src/info/info-service.js';
import { statusResponse } from '../../src/status/status-routes.js';
import { StatusService } from '../../src/status/status-service.js';
import { bootClient, type Client, get, json } from '../support/api-client.js';

const mongoUri = inject('mongoUri');
const SECOND = 1000;
const HOUR = 3600 * SECOND;

const ago = (ms: number) => new Date(Date.now() - ms);

function node(id: string, seenAgo: number, batchIntervalMs?: number): NodeDocument {
	return {
		_id: id,
		firstSeenAt: ago(HOUR),
		lastSeenAt: ago(seenAgo),
		serverVersion: '3.10.0',
		...(batchIntervalMs === undefined ? {} : { batchIntervalMs })
	};
}

async function replace(db: Db, collection: Collection, documents: Document[]): Promise<void> {
	await db.collection(collection).deleteMany({});

	if (documents.length > 0) {
		await db.collection(collection).insertMany(documents);
	}
}

describe.skipIf(mongoUri === '')('status API', () => {
	let ce: Client;

	beforeAll(async () => {
		ce = await bootClient(mongoUri);
	});

	afterAll(async () => {
		await ce.dashboard.stop();
	});

	it('reports a writer never seen on an uninitialized schema, without caching', async () => {
		await replace(ce.dashboard.db, Collection.NODES, []);
		await replace(ce.dashboard.db, Collection.SCHEMA_META, []);

		const response = await get(ce, '/status');
		const body = (await response.json()) as StatusResponse;

		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(statusResponse.parse(body)).toEqual(body);
		expect(body).toEqual({
			generatedAt: expect.any(String) as string,
			schema: { dashboard: SCHEMA_VERSION, status: 'uninitialized' },
			migration: { state: 'none' },
			writer: {}
		});
		expect(Math.abs(Date.parse(body.generatedAt) - Date.now())).toBeLessThan(SECOND);
	});

	it('reports the newest batch and a running migration', async () => {
		const newest = node('node-a', 4 * SECOND);

		await replace(ce.dashboard.db, Collection.NODES, [
			newest,
			node('node-b', 12 * SECOND),
			node('node-c', 50 * SECOND)
		]);
		await replace(ce.dashboard.db, Collection.SCHEMA_META, [
			{ _id: 'schema', version: SCHEMA_VERSION, writerVersion: '3.10.0', updatedAt: new Date() },
			{
				_id: 'migration',
				state: 'running',
				processed: 400_000,
				total: 1_200_000,
				startedAt: ago(HOUR),
				writerVersion: '3.10.0',
				fromSchemaVersion: 0
			}
		]);

		const body = await json<StatusResponse>(ce, '/status');

		expect(body.writer).toEqual({ lastSeenAt: newest.lastSeenAt.toISOString() });
		expect(body.schema.status).toBe('ok');
		expect(body.migration).toMatchObject({
			state: 'running',
			progress: { processed: 400_000, total: 1_200_000, startedAt: expect.any(String) as string }
		});
		expect(Object.keys(body)).not.toContain('retention');
	});

	it('Legacy retention date in the status', async () => {
		await replace(ce.dashboard.db, Collection.SCHEMA_META, [
			{ _id: 'schema', version: SCHEMA_VERSION, writerVersion: '3.10.0', updatedAt: new Date() },
			{
				_id: 'migration',
				state: 'completed',
				processed: 1_200,
				total: 1_200,
				startedAt: ago(2 * HOUR),
				finishedAt: ago(HOUR),
				writerVersion: '3.10.0',
				fromSchemaVersion: 0,
				legacyRetainedUntil: new Date('2026-12-15T08:00:00Z')
			}
		]);

		const body = await json<StatusResponse>(ce, '/status');

		expect(body.migration).toMatchObject({ state: 'completed', legacyRetainedUntil: '2026-12-15T08:00:00.000Z' });
		expect(statusResponse.parse(body)).toEqual(body);
	});

	it('reports the largest batch interval of the last hour', async () => {
		await replace(ce.dashboard.db, Collection.NODES, [
			node('node-a', 80 * SECOND, 60_000),
			node('node-b', 40 * SECOND, 10_000),
			node('node-c', 2 * HOUR, 120_000)
		]);

		const body = await json<StatusResponse>(ce, '/status');

		expect(body.writer).toMatchObject({ batchIntervalMs: 60_000 });
		expect(body.writer).not.toHaveProperty('stoppedAt');
		expect(statusResponse.parse(body)).toEqual(body);
	});

	it('reports a server stopped gracefully until another node reports', async () => {
		const stoppedAt = ago(6 * SECOND);

		await replace(ce.dashboard.db, Collection.NODES, [
			{ ...node('node-a', 6 * SECOND), lastSeenAt: stoppedAt, stoppedAt },
			node('node-old', 2 * HOUR)
		]);
		expect((await json<StatusResponse>(ce, '/status')).writer).toEqual({
			lastSeenAt: stoppedAt.toISOString(),
			stoppedAt: stoppedAt.toISOString()
		});

		await replace(ce.dashboard.db, Collection.NODES, [
			{ ...node('node-a', 60 * SECOND), stoppedAt: ago(60 * SECOND) },
			node('node-b', 3 * SECOND)
		]);
		expect((await json<StatusResponse>(ce, '/status')).writer).not.toHaveProperty('stoppedAt');
	});

	/** A dashboard document whose deletion job, of `class`, had its last heartbeat `heartbeatAgo` before now. */
	function deletionMeta(deletionClass: string, heartbeatAgo: number): Document {
		return {
			_id: 'dashboard',
			deletion: {
				id: 'job-status',
				class: deletionClass,
				includeLegacy: false,
				state: 'running',
				cutoff: ago(HOUR),
				startedAt: ago(HOUR),
				heartbeatAt: ago(heartbeatAgo),
				instance: 'elsewhere@2026-11-19T09:00:00.000Z',
				currentClass: deletionClass,
				collection: { index: 1, total: 1 },
				deleted: 12,
				deletedBy: { track_stats: 12 },
				requestId: 'request-1'
			}
		};
	}

	it('Running deletion in the status', async () => {
		await replace(ce.dashboard.db, Collection.SCHEMA_META, [deletionMeta('stats', 8 * SECOND)]);

		const client = new MongoClient(mongoUri, { monitorCommands: true });
		const commands: CommandStartedEvent[] = [];

		client.on('commandStarted', (event) => {
			commands.push(event);
		});

		try {
			const db = client.db(ce.dashboard.db.databaseName);
			const body = await new StatusService(db, {
				info: new InfoService(db, {
					edition: 'ce',
					version: 'test',
					features: () => [],
					limits: rankedSortLimits(7 * 86_400_000),
					openapiDocsEnabled: false
				}),
				now: () => new Date()
			}).status();

			expect(body.deletion).toMatchObject({ class: 'stats', state: 'running', deleted: 12 });
			expect(body.deletion).not.toHaveProperty('instance');
			expect(statusResponse.parse(body)).toEqual(body);
			expect(
				commands
					.filter((event) => event.commandName === 'find')
					.map((event) => (event.command as Record<string, unknown>).find)
					.sort()
			).toEqual([Collection.NODES, Collection.SCHEMA_META]);
		} finally {
			await client.close();
		}

		expect((await json<StatusResponse>(ce, '/status')).deletion?.state).toBe('running');
	});

	it('Stale deletion in the status', async () => {
		await replace(ce.dashboard.db, Collection.SCHEMA_META, [deletionMeta('stats', 75 * SECOND)]);

		const body = await json<StatusResponse>(ce, '/status');

		expect(body.deletion?.state).toBe('interrupted');
		expect(Date.parse(body.deletion?.finishedAt ?? '')).toBeLessThan(Date.parse(body.generatedAt) - 60 * SECOND);
		expect(statusResponse.parse(body)).toEqual(body);
		await replace(ce.dashboard.db, Collection.SCHEMA_META, []);
	});

	it('documents the route', () => {
		const document = openApiDocument(ce.dashboard.running.container.get<RouteRegistry>(TOKENS.RouteRegistry), {
			version: 'test'
		});

		expect(Object.keys(document.paths ?? {})).toContain('/api/v1/status');
		expect(Object.keys(document.components?.schemas ?? {})).toContain('StatusResponse');
	});

	it('rejects a request without a token', async () => {
		const response = await fetch(`${ce.dashboard.url}/api/v1/status`);

		expect(response.status).toBe(401);
		expect(((await response.json()) as { error: { code: string } }).error.code).toBe('UNAUTHORIZED');
	});

	it('reads only schema_meta, nodes and the clock', async () => {
		const client = new MongoClient(mongoUri, { monitorCommands: true });
		const commands: CommandStartedEvent[] = [];

		client.on('commandStarted', (event) => {
			commands.push(event);
		});

		try {
			const db = client.db(ce.dashboard.db.databaseName);
			const service = new StatusService(db, {
				info: new InfoService(db, {
					edition: 'ce',
					version: 'test',
					features: () => [],
					limits: rankedSortLimits(7 * 86_400_000),
					openapiDocsEnabled: false
				}),
				now: () => new Date()
			});

			await service.status();

			const sent = commands.map((event) => ({
				name: event.commandName,
				collection: (event.command as Record<string, unknown>)[event.commandName]
			}));

			expect(
				sent
					.filter((command) => command.name === 'find')
					.map((command) => command.collection)
					.sort()
			).toEqual([Collection.NODES, Collection.SCHEMA_META]);
			expect(sent.map((command) => command.name).sort()).toEqual(['find', 'find', 'hello']);
		} finally {
			await client.close();
		}
	});
});
