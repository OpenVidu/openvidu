import { GenericContainer, Wait } from 'testcontainers';

/**
 * MongoDB image of OpenVidu deployments. The official mongo:8.0 image refuses to start on Linux kernels 6.19 and newer
 * (SERVER-121912). Override with DASHBOARD_TEST_MONGO_IMAGE.
 */
const MONGO_IMAGE = process.env.DASHBOARD_TEST_MONGO_IMAGE ?? 'openvidu/mongodb:8.0.29-r1';
const MONGOD = '/opt/bitnami/mongodb/bin/mongod';
const MONGOSH = '/opt/bitnami/mongodb/bin/mongosh';

const INITIATE_REPLICA_SET = [
	'rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "localhost:27017" }] });',
	'let i = 0; while (!db.hello().isWritablePrimary && i < 100) { sleep(100); i++; }',
	'if (!db.hello().isWritablePrimary) { quit(1); }'
].join(' ');

export interface MongoHandle {
	uri: string;
	stop(): Promise<void>;
}

/** Starts a single-node MongoDB replica set (transactions and change streams need one). */
export async function startMongo(): Promise<MongoHandle> {
	const container = await new GenericContainer(MONGO_IMAGE)
		.withEntrypoint([MONGOD])
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
		// The data generations of the query plan suites share it in parallel.
		.withResourcesQuota({ memory: 2 })
		// WiredTiger keeps one file per collection and index; the default limit of open files runs out after a few
		// dozen test databases and mongod aborts.
		.withUlimits({ nofile: { soft: 64000, hard: 64000 } })
		.withWaitStrategy(Wait.forListeningPorts())
		.start();

	const result = await container.exec([MONGOSH, '--quiet', '--eval', INITIATE_REPLICA_SET]);

	if (result.exitCode !== 0) {
		await container.stop();
		throw new Error(`MongoDB replica set did not initiate: ${result.output}`);
	}

	return {
		// The member advertises localhost:27017, unreachable from the host, so the client connects directly.
		uri: `mongodb://${container.getHost()}:${String(container.getMappedPort(27017))}/?directConnection=true`,
		stop: async () => {
			await container.stop();
		}
	};
}
