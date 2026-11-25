import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const stubs = mkdtempSync(join(tmpdir(), 'demo-data-mode-'));
const calls = join(stubs, 'calls.log');

// pnpm and docker stand-ins that record their calls: Docker reports a running MongoDB, the generator writes its summary
// and the long-running scripts (the live writer, the keep-alive, the frontend) wait to be stopped. STUB_LIVE_FAILS makes the live
// writer fail at the generation or at its first tick.
writeFileSync(
	join(stubs, 'pnpm'),
	`#!/usr/bin/env bash
echo "pnpm $*" >>"${calls}"
fail_tick() {
	if [ "\${STUB_LIVE_FAILS:-}" = tick ]; then sleep 1; echo 'E11000 duplicate key error' >&2; exit 1; fi
}
case " $* " in
	*" --live "*)
		echo '  total 1'
		if [ "\${STUB_LIVE_FAILS:-}" = generation ]; then echo 'Document failed validation' >&2; exit 1; fi
		echo 'Writing live every 10 s'
		fail_tick
		exec sleep 30 ;;
	*" run live "*) fail_tick; exec sleep 30 ;;
	*" run keep-alive "* | *" run dev "*) exec sleep 30 ;;
	*) echo '  total 1'; echo 'Elapsed 1 s' ;;
esac
`
);
writeFileSync(
	join(stubs, 'docker'),
	`#!/usr/bin/env bash
echo "docker $*" >>"${calls}"
case "$1" in
	inspect) echo true ;;
	exec) echo 1 ;;
esac
`
);

for (const name of ['pnpm', 'docker']) {
	chmodSync(join(stubs, name), 0o755);
}

after(() => {
	rmSync(stubs, { recursive: true, force: true });
});

/**
 * Prepares the data of a demo as demo-lib.sh does, with the stand-ins, and returns their calls.
 * @param {string} statsMode The demo's STATS_MODE.
 * @param {string[]} generatorArgs The demo's GENERATOR_ARGS.
 * @param {Record<string, string>} env The demo variables set.
 * @returns {string[]} The calls of pnpm and docker.
 */
function prepare(statsMode, generatorArgs, env) {
	writeFileSync(calls, '');
	const script = [
		'set -euo pipefail',
		'DATABASE=demo_test',
		`STATS_MODE=${statsMode}`,
		`GENERATOR_ARGS=(${generatorArgs.join(' ')})`,
		'source dashboard-ce/tools/demo-lib.sh',
		'prepare_data'
	].join('\n');
	const result = spawnSync('bash', ['-c', script], {
		cwd: root,
		encoding: 'utf8',
		env: { ...process.env, PATH: `${stubs}:${process.env.PATH ?? ''}`, ...env }
	});

	assert.equal(result.status, 0, result.stderr);

	return readFileSync(calls, 'utf8').split('\n').filter(Boolean);
}

const demos = [
	['CE', 'participant', []],
	['PRO Elastic', 'track', ['--media-nodes', '--node-rollups', '--nodes-without-media-stats', '1']]
];

describe('demo data modes', () => {
	for (const [demo, statsMode, generatorArgs] of demos) {
		test(`Demo data mode selection: the ${demo} demo`, () => {
			const withOptions = (call) =>
				call.includes(`--stats-mode ${statsMode}`) && call.includes(generatorArgs.join(' '));
			const frozen = prepare(statsMode, generatorArgs, {});
			const live = prepare(statsMode, generatorArgs, { DASHBOARD_DEMO_DATA: 'live' });
			const kept = prepare(statsMode, generatorArgs, {
				DASHBOARD_DEMO_DATA: 'live',
				DASHBOARD_DEMO_KEEP_DATA: 'true'
			});
			const pnpm = (list) => list.filter((call) => call.startsWith('pnpm '));

			assert.equal(pnpm(frozen).length, 2);
			assert.ok(pnpm(frozen)[0].includes(' run generate ') && !pnpm(frozen)[0].includes('--live'));
			assert.ok(withOptions(pnpm(frozen)[0]));
			assert.ok(pnpm(frozen)[1].includes(' run keep-alive '));

			assert.equal(pnpm(live).length, 1);
			assert.ok(pnpm(live)[0].includes(' run generate ') && pnpm(live)[0].includes('--live'));
			assert.ok(withOptions(pnpm(live)[0]));

			assert.equal(pnpm(kept).length, 1);
			assert.ok(pnpm(kept)[0].includes(' run live '));
			assert.ok(withOptions(pnpm(kept)[0]));
			assert.ok(!pnpm(kept)[0].includes('--drop'));
		});
	}

	for (const [when, env, error] of [
		['at the generation', { STUB_LIVE_FAILS: 'generation' }, /Document failed validation/],
		['at a tick', { STUB_LIVE_FAILS: 'tick' }, /E11000 duplicate key error/],
		['at a tick on kept data', { STUB_LIVE_FAILS: 'tick', DASHBOARD_DEMO_KEEP_DATA: 'true' }, /E11000/]
	]) {
		test(`Demo data mode selection: a live writer that fails ${when} stops the demo with its error`, () => {
			// The frontend would serve for 30 s after the data is prepared.
			const script = [
				'set -euo pipefail',
				'DATABASE=demo_test',
				'STATS_MODE=participant',
				'source dashboard-ce/tools/demo-lib.sh',
				'prepare_data',
				'start_frontend dashboard-ce/frontend 4200 5000'
			].join('\n');
			const started = Date.now();
			const result = spawnSync('bash', ['-c', script], {
				cwd: root,
				encoding: 'utf8',
				timeout: 15_000,
				env: {
					...process.env,
					PATH: `${stubs}:${process.env.PATH ?? ''}`,
					DASHBOARD_DEMO_DATA: 'live',
					...env
				}
			});

			assert.equal(result.error, undefined, 'the demo went on after its live writer failed');
			assert.notEqual(result.status, 0);
			assert.ok(Date.now() - started < 10_000);
			assert.match(result.stderr, /live writer of the data generator failed \(exit code 1\)/);
			assert.match(result.stderr, error);
		});
	}

	test('Unknown demo data mode', () => {
		writeFileSync(calls, '');
		const result = spawnSync('./dashboard.sh', ['demo', 'ce', '--skip-install'], {
			cwd: root,
			encoding: 'utf8',
			env: { ...process.env, PATH: `${stubs}:${process.env.PATH ?? ''}`, DASHBOARD_DEMO_DATA: 'snapshot' }
		});
		const started = readFileSync(calls, 'utf8')
			.split('\n')
			.filter((call) => call.startsWith('docker run') || call.includes(' run dev'));

		assert.notEqual(result.status, 0);
		assert.match(result.stderr, /frozen/);
		assert.match(result.stderr, /live/);
		assert.deepEqual(started, []);
	});
});
