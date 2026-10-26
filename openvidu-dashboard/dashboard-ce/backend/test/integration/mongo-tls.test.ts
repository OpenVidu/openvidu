import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { startDashboard } from '../../src/lifecycle/startup.js';
import { freePort } from '../support/free-port.js';

const MONGO_IMAGE = process.env.DASHBOARD_TEST_MONGO_IMAGE ?? 'openvidu/mongodb:8.0.29-r1';

/** A private CA and a localhost server certificate signed by it, generated with openssl for this run. */
function certificates(): { dir: string; ca: string; serverPem: string } {
	const dir = mkdtempSync(join(tmpdir(), 'dashboard-tls-'));
	const run = (...args: string[]) => execFileSync('openssl', args, { cwd: dir, stdio: 'pipe' });
	run(
		'req',
		'-x509',
		'-newkey',
		'rsa:2048',
		'-nodes',
		'-keyout',
		'ca.key',
		'-out',
		'ca.pem',
		'-days',
		'2',
		'-subj',
		'/CN=dashboard-test-ca'
	);
	run(
		'req',
		'-newkey',
		'rsa:2048',
		'-nodes',
		'-keyout',
		'server.key',
		'-out',
		'server.csr',
		'-subj',
		'/CN=localhost'
	);
	writeFileSync(join(dir, 'san.cnf'), 'subjectAltName=DNS:localhost,IP:127.0.0.1\n');
	run(
		'x509',
		'-req',
		'-in',
		'server.csr',
		'-CA',
		'ca.pem',
		'-CAkey',
		'ca.key',
		'-CAcreateserial',
		'-out',
		'server.crt',
		'-days',
		'2',
		'-extfile',
		'san.cnf'
	);
	const serverPem = join(dir, 'server.pem');
	writeFileSync(
		serverPem,
		readFileSync(join(dir, 'server.crt'), 'utf8') + readFileSync(join(dir, 'server.key'), 'utf8')
	);

	return { dir, ca: join(dir, 'ca.pem'), serverPem };
}

// Runs with the other MongoDB suites; Docker availability is what mongoUri reports.
describe.skipIf(inject('mongoUri') === '')('MongoDB with a private CA', () => {
	let container: StartedTestContainer;
	let tls: ReturnType<typeof certificates>;
	let url: string;

	beforeAll(async () => {
		tls = certificates();
		container = await new GenericContainer(MONGO_IMAGE)
			.withEntrypoint(['/opt/bitnami/mongodb/bin/mongod'])
			.withCommand([
				'--bind_ip_all',
				'--port',
				'27017',
				'--dbpath',
				'/tmp',
				'--wiredTigerCacheSizeGB',
				'0.25',
				'--tlsMode',
				'requireTLS',
				'--tlsCertificateKeyFile',
				'/certs/server.pem',
				'--tlsCAFile',
				'/certs/ca.pem',
				'--tlsAllowConnectionsWithoutCertificates'
			])
			.withCopyFilesToContainer([
				{ source: tls.serverPem, target: '/certs/server.pem', mode: 0o644 },
				{ source: tls.ca, target: '/certs/ca.pem', mode: 0o644 }
			])
			.withExposedPorts(27017)
			.withResourcesQuota({ memory: 1 })
			.withWaitStrategy(Wait.forListeningPorts())
			.start();
		url = `mongodb://localhost:${String(container.getMappedPort(27017))}/?directConnection=true`;
	});

	afterAll(async () => {
		await container.stop();
	});

	async function start(env: NodeJS.ProcessEnv) {
		const exits: number[] = [];
		const running = await startDashboard({
			edition: 'ce',
			version: '3.10.0-test',
			appRoot: '/nonexistent',
			handleSignals: false,
			exit: (code) => exits.push(code),
			env: {
				ADMIN_USERNAME: 'admin',
				ADMIN_PASSWORD: 'secret',
				LOG_LEVEL: 'error',
				SERVER_PORT: String(await freePort()),
				DATABASE_URL: url,
				...env
			}
		});

		return { running, exits };
	}

	it('connects when DATABASE_TLS_CA_FILE trusts the server certificate', async () => {
		const { running, exits } = await start({ DATABASE_TLS_CA_FILE: tls.ca });
		expect(running).toBeDefined();
		await running?.shutdown.run(0);
		expect(exits).toEqual([0]);
	});

	it('does not connect without the CA file', async () => {
		const { running, exits } = await start({});
		expect(running).toBeUndefined();
		expect(exits).toEqual([1]);
	}, 30_000);

	it('exits with code 1 when the CA file cannot be read', async () => {
		const { running, exits } = await start({ DATABASE_TLS_CA_FILE: join(tls.dir, 'missing.pem') });
		expect(running).toBeUndefined();
		expect(exits).toEqual([1]);
	});
});
