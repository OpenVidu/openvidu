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
// and the long-running scripts (the live writer, the keep-alive) wait to be stopped.
writeFileSync(
	join(stubs, 'pnpm'),
	`#!/usr/bin/env bash
echo "pnpm $*" >>"${calls}"
case " $* " in
	*" --live "*) echo '  total 1'; echo 'Writing live every 10 s'; exec sleep 30 ;;
	*" run live "* | *" run keep-alive "*) exec sleep 30 ;;
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
