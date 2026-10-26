#!/usr/bin/env node
// The real CE dashboard for the backend end-to-end tests: MongoDB (DASHBOARD_TEST_MONGO_URI or a container), the
// writer's schema_meta seeded, and the backend serving the production build of the application.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { startDashboard } from '@openvidu-dashboard/backend';
import { SCHEMA_VERSION } from '@openvidu-dashboard/typings';
import { MongoClient } from 'mongodb';
import { GenericContainer, Wait } from 'testcontainers';

import { refreshLiveness, seedRooms } from './seed-rooms.mjs';

const PORT = Number(process.env.E2E_BACKEND_PORT ?? 4320);
const DATABASE = 'openvidu_dashboard_e2e';
const DAY_MS = 86_400_000;
const appRoot = join(dirname(fileURLToPath(import.meta.url)), '../../frontend/dist/frontend/browser');

// Same image and flags as the backend integration tests (dashboard-ce/backend/test/support/mongo-container.ts).
async function startMongo() {
	const container = await new GenericContainer(process.env.DASHBOARD_TEST_MONGO_IMAGE ?? 'openvidu/mongodb:8.0.29-r1')
		.withEntrypoint(['/opt/bitnami/mongodb/bin/mongod'])
		.withCommand([
			'--replSet',
			'rs0',
			'--bind_ip_all',
			'--port',
			'27017',
			'--dbpath',
			'/tmp',
			'--wiredTigerCacheSizeGB',
			'0.25'
		])
		.withExposedPorts(27017)
		.withWaitStrategy(Wait.forListeningPorts())
		.start();
	const initiate =
		'rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "localhost:27017" }] }); ' +
		'let i = 0; while (!db.hello().isWritablePrimary && i < 100) { sleep(100); i++; }';

	await container.exec(['/opt/bitnami/mongodb/bin/mongosh', '--quiet', '--eval', initiate]);

	return `mongodb://${container.getHost()}:${String(container.getMappedPort(27017))}/?directConnection=true`;
}

const uri = process.env.DASHBOARD_TEST_MONGO_URI || (await startMongo());
const client = new MongoClient(uri);
const meta = client.db(DATABASE).collection('schema_meta');
const now = new Date();

await client.db(DATABASE).dropDatabase();
await meta.insertMany([
	{ _id: 'schema', version: SCHEMA_VERSION, writerVersion: '3.10.0', updatedAt: now },
	{
		_id: 'retention',
		eventsMs: 7 * DAY_MS,
		statsMs: 7 * DAY_MS,
		tracksMs: 7 * DAY_MS,
		entitiesMs: 90 * DAY_MS,
		rollups5MinMs: 7 * DAY_MS,
		rollupsHourlyMs: 400 * DAY_MS,
		rollupsDailyMs: null,
		updatedAt: now
	}
]);
await seedRooms(client.db(DATABASE), now);
// The seeded heartbeat would turn the LIVE chip stale 25 s after seeding; a slow runner reaches the overview later.
setInterval(() => {
	refreshLiveness(client.db(DATABASE)).catch((error) =>
		console.error('refreshing the seeded liveness failed', error)
	);
}, 5_000);

await startDashboard({
	edition: 'ce',
	version: '3.10.0',
	appRoot,
	env: {
		...process.env,
		NODE_ENV: 'production',
		LOG_LEVEL: 'warn',
		SERVER_PORT: String(PORT),
		DATABASE_URL: uri,
		DATABASE_NAME: DATABASE,
		ADMIN_USERNAME: 'admin',
		ADMIN_PASSWORD: 'e2e-admin-password'
	}
});
