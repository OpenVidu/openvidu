import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { coverScenarios, findScenarios, formatCoverage } from '../tools/scenario-coverage.mjs';

const script = join(dirname(fileURLToPath(import.meta.url)), '../tools/scenario-coverage.mjs');

const DELTA = `## ADDED Requirements

### Requirement: Sync

#### Scenario: First run

- **WHEN** it runs

#### Scenario: Throttled (retry)

## REMOVED Requirements

### Requirement: Old

#### Scenario: Gone

## MODIFIED Requirements

#### Scenario: Changed
`;

/**
 * Creates a git checkout with the given files.
 * @param {Record<string, string>} files Content by path.
 * @returns {string} Its folder.
 */
function checkout(files) {
	const dir = mkdtempSync(join(tmpdir(), 'ovd-scenarios-'));

	execFileSync('git', ['init', '--quiet', dir]);

	for (const [path, text] of Object.entries(files)) {
		mkdirSync(dirname(join(dir, path)), { recursive: true });
		writeFileSync(join(dir, path), text);
	}

	return dir;
}

const run = (cwd, ...args) => spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' });

describe('scenario coverage', () => {
	const workspace = checkout({
		'openspec/changes/demo/specs/sync/spec.md': DELTA,
		'edition/openspec/changes/nested/specs/sync/spec.md': '#### Scenario: Nested\n',
		'backend/test/sync.test.ts': "it('First run: reads every collection', () => {});\nit('Changed', () => {});\n",
		'edition/e2e/nested.spec.ts': "test('Nested', () => {});\n",
		'.gitignore': 'node_modules/\n',
		'node_modules/pkg/x.test.ts': "it('Throttled (retry)', () => {});\n"
	});
	const writer = checkout({
		'analytics/sync_test.go': '\tt.Run("Throttled (retry): backs off", func(t *testing.T) {})\n'
	});

	after(() => {
		rmSync(workspace, { recursive: true, force: true });
		rmSync(writer, { recursive: true, force: true });
	});

	test('lists the scenarios of a spec, without those of removed requirements', () => {
		assert.deepEqual(
			findScenarios('specs/sync/spec.md', DELTA).map((scenario) => scenario.name),
			['First run', 'Throttled (retry)', 'Changed']
		);
	});

	test('a test covers a scenario when its title is the name, alone or followed by a detail', () => {
		const tests = [
			{
				path: 'a.test.ts',
				text: "test('First run: reads every table', () => {});\ntest('First runs', () => {});"
			},
			{ path: 'b.spec.ts', text: '\n\ttest.each(cases)(\n\t\t`Throttled (retry)`,\n\t\trun\n\t);' }
		];

		assert.deepEqual(
			coverScenarios(findScenarios('spec.md', DELTA), tests).map((scenario) => scenario.tests),
			[['a.test.ts:1'], ['b.spec.ts:3'], []]
		);
	});

	test('Scenario without a test: the report marks it NO TEST and counts it', () => {
		const report = formatCoverage([
			{ spec: 'a/spec.md', name: 'One', tests: ['a.test.ts:1', 'b.test.ts:2'] },
			{ spec: 'a/spec.md', name: 'Two', tests: [] }
		]);

		assert.equal(
			report,
			'a/spec.md\n  One: a.test.ts:1, b.test.ts:2\n  Two: NO TEST\n2 scenarios, 1 without a test'
		);
	});

	test('Scenario without a test: the command exits 1 and ignored files do not count', () => {
		const result = run(workspace, 'demo');

		assert.match(result.stdout, /First run: backend\/test\/sync\.test\.ts:1\n {2}Throttled \(retry\): NO TEST/);
		assert.match(result.stdout, /3 scenarios, 1 without a test$/m);
		assert.equal(result.status, 1);
	});

	test('Scenarios with tests: the tests of another checkout count and the command exits 0', () => {
		const result = run(workspace, 'demo', writer);

		assert.match(result.stdout, /Throttled \(retry\): .*analytics\/sync_test\.go:1/);
		assert.match(result.stdout, /3 scenarios, 0 without a test$/m);
		assert.equal(result.status, 0);
	});

	test('Nested OpenSpec root: --root names the folder that holds it', () => {
		const result = run(workspace, '--root', 'edition', 'nested');

		assert.match(result.stdout, /Nested: edition\/e2e\/nested\.spec\.ts:1\n1 scenarios, 0 without a test$/m);
		assert.equal(result.status, 0);
	});

	test('Change without delta specs: exits 1 naming the change', () => {
		const result = run(workspace, 'no-such-change');

		assert.equal(result.status, 1);
		assert.ok(result.stderr.includes('No delta specs found for the change "no-such-change"'));
	});

	for (const args of [[], ['../demo'], ['demo', writer, 'extra']]) {
		test(`No change or a malformed one: exits 1 with the usage (${args.join(' ')})`, () => {
			const result = run(workspace, ...args);

			assert.equal(result.status, 1);
			assert.ok(result.stderr.includes('Usage: scenarios <change>'));
		});
	}
});
