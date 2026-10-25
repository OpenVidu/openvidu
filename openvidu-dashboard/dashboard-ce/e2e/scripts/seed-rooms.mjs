#!/usr/bin/env node
// Seeds the rooms data of the end-to-end suites from the contract fixtures of @openvidu-dashboard/typings: the
// collections and indexes of the contract, the fixture documents with their dates moved so the active room is live, a
// copy of the active room without stats for 100 s, a copy of the closed room as closed by the reconciler, two server
// nodes and the hourly rollup of the current hour, metadata on the active room, and egresses closed by the
// reconciler, without room and with credentials a leaking writer could have stored (the sentinel never reaches a
// response).
// Usage: node scripts/seed-rooms.mjs --uri <mongodb uri> --db <database>
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';

import { BSON, MongoClient } from 'mongodb';

const require = createRequire(import.meta.url);
const YEAR_SECONDS = 365 * 86_400;
const SEEDED = ['rooms', 'participants', 'egresses', 'ingresses', 'ingress_sessions', 'events', 'track_stats'];

export const ACTIVE_ROOM = 'RM_bQ7tVnW2cErT';
export const CLOSED_ROOM = 'RM_aLkq3ZpD9wXy';
export const RECONCILED_ROOM = 'RM_rec0nciled01';
export const RECONCILED_EGRESS = 'EG_rec0nciled01';
export const WEB_EGRESS = 'EG_webN0Room01';
export const LEAKING_EGRESS = 'EG_leak1ng0001';
export const SENTINEL = 'E2E_SENTINEL_9f3c';
export const IDLE_INGRESS = 'IN_wh1pIdle0001';
export const FAILED_INGRESS = 'IN_ur1Failed001';
export const LEAKING_INGRESS = 'IN_leak1ng00001';
export const INGRESS_USER_INFO = 'e2euser:e2epass';
export const STALE_ROOM = 'RM_st4leRoom001';

function contract(file) {
	return BSON.EJSON.parse(readFileSync(require.resolve(`@openvidu-dashboard/typings/${file}`), 'utf8'), {
		relaxed: true
	});
}

function shift(value, delta) {
	if (value instanceof Date) {
		return new Date(value.getTime() + delta);
	}

	if (Array.isArray(value)) {
		return value.map((item) => shift(item, delta));
	}

	if (value !== null && typeof value === 'object') {
		return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shift(item, delta)]));
	}

	return value;
}

async function createContractCollections(db) {
	const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((info) => info.name));

	for (const definition of contract('schema/collections.json')) {
		if (existing.has(definition.name)) {
			continue;
		}

		const { timeseries } = definition;

		await db.createCollection(
			definition.name,
			timeseries === undefined
				? {}
				: {
						timeseries: {
							timeField: timeseries.timeField,
							metaField: timeseries.metaField,
							granularity: timeseries.granularity
						},
						expireAfterSeconds: YEAR_SECONDS
					}
		);
	}

	for (const index of contract('schema/indexes.json')) {
		if (index.timeseriesFallbackOnly === true) {
			continue;
		}

		const ttl = index.retentionClass === undefined ? index.options.expireAfterSeconds : YEAR_SECONDS;

		await db.collection(index.collection).createIndex(Object.fromEntries(index.key), {
			name: index.name,
			...(index.options.unique === true ? { unique: true } : {}),
			...(index.options.partialFilterExpression === undefined
				? {}
				: { partialFilterExpression: index.options.partialFilterExpression }),
			...(ttl === undefined ? {} : { expireAfterSeconds: ttl })
		});
	}
}

/** Replaces the rooms collections of `db` with the seeded documents. */
export async function seedRooms(db, now = new Date()) {
	await createContractCollections(db);

	const rooms = contract('fixtures/rooms.json');
	const active = rooms.find((room) => room._id === ACTIVE_ROOM);
	const delta = now.getTime() - 60_000 - active.lastEventAt.getTime();
	const documents = Object.fromEntries(
		SEEDED.map((collection) => [collection, shift(contract(`fixtures/${collection}.json`), delta)])
	);
	const seededActive = documents.rooms.find((room) => room._id === ACTIVE_ROOM);
	const closed = documents.rooms.find((room) => room._id === CLOSED_ROOM);

	seededActive.lastStatsAt = new Date(now.getTime() - 10_000);
	seededActive.config = { ...seededActive.config, metadata: JSON.stringify({ customer: 'acme', plan: 'pro' }) };
	documents.rooms.push({
		...seededActive,
		_id: STALE_ROOM,
		name: 'Stale-Room',
		nameLower: 'stale-room',
		createdAt: new Date(now.getTime() - 50 * 60_000),
		lastStatsAt: new Date(now.getTime() - 100_000)
	});
	documents.rooms.push({
		...closed,
		_id: RECONCILED_ROOM,
		name: 'Crashed-Node-Room',
		nameLower: 'crashed-node-room',
		endReason: 'RECONCILED',
		closedBy: 'reconciler'
	});

	const complete = documents.egresses.find((egress) => egress.status === 'complete');
	const roomless = { ...complete };

	delete roomless.roomSid;
	delete roomless.roomName;

	documents.egresses.push(
		{
			...complete,
			_id: RECONCILED_EGRESS,
			status: 'failed',
			closedBy: 'reconciler',
			error: 'egress lost (reconciled)'
		},
		{
			...roomless,
			_id: WEB_EGRESS,
			type: 'web',
			sourceType: 'web',
			request: { url: 'https://app.example.com/***' }
		},
		{
			...complete,
			_id: LEAKING_EGRESS,
			request: {
				...complete.request,
				s3: { accessKey: SENTINEL, secret: SENTINEL },
				token: SENTINEL,
				webhooks: [{ signingKey: SENTINEL }]
			}
		}
	);

	const publishing = documents.ingresses.find((ingress) => ingress.status === 'publishing');
	const idle = { ...publishing, _id: IDLE_INGRESS, name: 'whip-desk', nameLower: 'whip-desk', inputType: 'whip' };

	delete idle.lastSessionAt;
	documents.ingresses.push(
		{ ...idle, status: 'inactive', reusable: false, sessions: 0, totalDurationMs: 0 },
		{
			...publishing,
			_id: FAILED_INGRESS,
			name: 'mirror',
			nameLower: 'mirror',
			inputType: 'url',
			url: 'https://src.example.com/live.m3u8',
			status: 'error',
			reusable: false,
			sessions: 1,
			lastError: 'could not connect to source'
		},
		{
			...publishing,
			_id: LEAKING_INGRESS,
			name: 'leaky-cam',
			nameLower: 'leaky-cam',
			status: 'inactive',
			url: `rtmp://${INGRESS_USER_INFO}@ingress.example.com/live?token=${SENTINEL}`
		}
	);
	documents.ingress_sessions.push({
		...documents.ingress_sessions[0],
		_id: 'url_f41led000001',
		ingressId: FAILED_INGRESS,
		inputType: 'url',
		status: 'error',
		error: 'could not connect to source'
	});
	documents.events.push(
		...[FAILED_INGRESS, LEAKING_INGRESS].map((ingressId, index) => ({
			_id: `AE_ingress_e2e_${String(index)}`,
			type: 'INGRESS_CREATED',
			ts: new Date(now.getTime() - 30 * 60_000),
			ingressId,
			nodeId: 'ND_e2e',
			synthetic: false,
			payload: { ingress: { stream_key: SENTINEL, url: `rtmp://${INGRESS_USER_INFO}@ingress.example.com/live` } }
		}))
	);

	for (const collection of SEEDED) {
		await db.collection(collection).deleteMany({});
		await db.collection(collection).insertMany(documents[collection]);
	}

	await seedWriter(db, now);
}

/** Two server nodes, one seen 5 s ago and one 50 s ago, and the global hourly rollup of the current hour. */
async function seedWriter(db, now) {
	const [alpha, beta] = contract('fixtures/nodes.json');
	const hour = new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000);

	await db.collection('nodes').deleteMany({});
	await db.collection('nodes').insertMany([
		{ ...alpha, lastSeenAt: new Date(now.getTime() - 5_000) },
		{ ...beta, lastSeenAt: new Date(now.getTime() - 50_000) }
	]);
	await db.collection('analytics_hourly').deleteMany({});
	await db.collection('analytics_hourly').insertOne({
		_id: `global:${hour.toISOString().replace('.000Z', 'Z')}`,
		scope: 'global',
		bucket: hour,
		rooms: { created: 3 },
		participants: { joined: 12, minutes: 40 },
		egress: { started: 1 },
		ingress: { sessionsStarted: 1 }
	});
}

/**
 * Moves the liveness signals of the seeded data to `now`, as a running writer would: node `alpha` seen 5 s ago and
 * `beta` 50 s ago, the active room with stats 10 s old and the stale room 100 s old.
 */
export async function refreshLiveness(db, now = new Date()) {
	const [alpha, beta] = contract('fixtures/nodes.json');
	const ago = (ms) => new Date(now.getTime() - ms);

	await db.collection('nodes').updateOne({ _id: alpha._id }, { $set: { lastSeenAt: ago(5_000) } });
	await db.collection('nodes').updateOne({ _id: beta._id }, { $set: { lastSeenAt: ago(50_000) } });
	await db.collection('rooms').updateOne({ _id: ACTIVE_ROOM }, { $set: { lastStatsAt: ago(10_000) } });
	await db.collection('rooms').updateOne({ _id: STALE_ROOM }, { $set: { lastStatsAt: ago(100_000) } });
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const { values } = parseArgs({ options: { uri: { type: 'string' }, db: { type: 'string' } } });

	if (values.uri === undefined || values.db === undefined) {
		console.error('Usage: node scripts/seed-rooms.mjs --uri <mongodb uri> --db <database>');
		process.exit(1);
	}

	const client = await MongoClient.connect(values.uri);

	await seedRooms(client.db(values.db));
	await client.close();
	console.log(`Seeded the rooms data into ${values.db}`);
}
