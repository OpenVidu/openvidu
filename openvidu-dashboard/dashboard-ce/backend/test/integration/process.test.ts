import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, inject, it } from 'vitest';

import { freePort } from '../support/free-port.js';

const mongoUri = inject('mongoUri');
const backend = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const entry = join(backend, 'dist', 'server.js');

interface Exited {
	code: number | null;
	ms: number;
	output: string;
}

function launch(env: NodeJS.ProcessEnv, args: string[] = []) {
	let output = '';
	const child = spawn(process.execPath, [entry, ...args], {
		env: { PATH: process.env.PATH, ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'secret', ...env },
		stdio: ['ignore', 'pipe', 'pipe']
	});
	child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
	child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()));

	return { child, output: () => output };
}

function exited(child: ChildProcess, output: () => string, since = Date.now()): Promise<Exited> {
	return new Promise((resolve) => {
		child.on('exit', (code) => {
			resolve({ code, ms: Date.now() - since, output: output() });
		});
	});
}

async function waitFor(output: () => string, text: string, timeoutMs = 30_000): Promise<void> {
	const deadline = Date.now() + timeoutMs;

	while (!output().includes(text)) {
		if (Date.now() > deadline) {
			throw new Error(`"${text}" not logged; output:\n${output()}`);
		}

		await new Promise((resolve) => setTimeout(resolve, 50));
	}
}

function healthcheck(port: number): number {
	try {
		execFileSync(process.execPath, [entry, 'healthcheck'], { env: { SERVER_PORT: String(port) }, stdio: 'pipe' });

		return 0;
	} catch (error) {
		return (error as { status: number }).status;
	}
}

describe.skipIf(mongoUri === '')('built backend process', () => {
	beforeAll(() => {
		execFileSync('pnpm', ['--filter', '@openvidu-dashboard/backend...', 'build'], {
			cwd: join(backend, '..', '..'),
			stdio: 'pipe'
		});
	}, 180_000);

	it('serves, passes the healthcheck argument and stops on SIGTERM with code 0 in under 5 s', async () => {
		const port = await freePort();
		const { child, output } = launch({
			DATABASE_URL: mongoUri,
			DATABASE_NAME: 'process_test',
			SERVER_PORT: String(port)
		});
		await waitFor(output, `listening on port ${String(port)}`);
		expect(healthcheck(port)).toBe(0);

		const keepAlive = await fetch(`http://127.0.0.1:${String(port)}/api/healthcheck`, { keepalive: true });
		expect(keepAlive.status).toBe(200);

		const stopped = exited(child, output);
		child.kill('SIGTERM');
		const result = await stopped;
		expect(result.code).toBe(0);
		expect(result.ms).toBeLessThan(5_000);
		expect(healthcheck(port)).toBe(1);
	});

	it('stops promptly with code 0 when SIGTERM arrives during startup', async () => {
		const port = await freePort();
		const { child, output } = launch({
			DATABASE_URL: 'mongodb://127.0.0.1:1/?directConnection=true',
			SERVER_PORT: String(port)
		});
		await waitFor(output, 'Connecting to MongoDB');
		const stopped = exited(child, output);
		child.kill('SIGTERM');
		const result = await stopped;
		expect(result.code).toBe(0);
		expect(result.ms).toBeLessThan(5_000);
		expect(result.output).not.toContain('listening on port');
	});

	it('exits with code 0 and says so when MongoDB is disabled', async () => {
		const { child, output } = launch({ MONGO_ENABLED: 'false' });
		const result = await exited(child, output);
		expect(result.code).toBe(0);
		expect(result.output).toContain('MongoDB is disabled. Stopping application.');
	});
});
