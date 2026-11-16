#!/usr/bin/env node
// Lists the tests of every scenario of a change's delta specs and fails when one has none. A test covers a scenario
// when its title is the scenario name, alone or followed by ": <detail>".
// Usage: tools/scenario-coverage.mjs [--root <dir>] <change> [<other checkout>]
//   --root <dir>      folder that holds the openspec/ root, relative to the current directory (default: .)
//   <other checkout>  repository whose tests also count, such as the openvidu-livekit checkout of the writer
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const TEST_FILE = /(\.(test|spec)\.(ts|mjs)|_test\.go)$/;

/**
 * Lists the scenarios of a spec, leaving out those a delta spec removes.
 * @param {string} spec Path of the spec, kept in each scenario.
 * @param {string} text Content of a main spec or a delta spec.
 * @returns {{ spec: string, name: string }[]}
 */
export function findScenarios(spec, text) {
	const scenarios = [];
	let removed = false;

	for (const line of text.split('\n')) {
		const section = /^## (.+)$/.exec(line)?.[1];
		const name = /^#### Scenario: (.+)$/.exec(line)?.[1];

		if (section !== undefined) {
			removed = section.startsWith('REMOVED');
		} else if (name !== undefined && !removed) {
			scenarios.push({ spec, name: name.trim() });
		}
	}

	return scenarios;
}

/**
 * Finds the tests of each scenario by title.
 * @param {{ spec: string, name: string }[]} scenarios Scenarios to look for.
 * @param {{ path: string, text: string }[]} tests Test files with their content.
 * @returns {{ spec: string, name: string, tests: string[] }[]} Each scenario with the `file:line` of its tests.
 */
export function coverScenarios(scenarios, tests) {
	return scenarios.map((scenario) => {
		const escaped = scenario.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const title = new RegExp(`['"\`]${escaped}(['"\`]|: )`);
		const found = [];

		for (const { path, text } of tests) {
			text.split('\n').forEach((line, index) => {
				if (title.test(line)) {
					found.push(`${path}:${String(index + 1)}`);
				}
			});
		}

		return { ...scenario, tests: found };
	});
}

/**
 * Formats the coverage as one line per scenario, grouped by spec, ending with the uncovered count.
 * @param {{ spec: string, name: string, tests: string[] }[]} coverage Result of `coverScenarios`.
 * @returns {string}
 */
export function formatCoverage(coverage) {
	const lines = [];
	let spec = '';

	for (const scenario of coverage) {
		if (scenario.spec !== spec) {
			spec = scenario.spec;
			lines.push(spec);
		}

		lines.push(`  ${scenario.name}: ${scenario.tests.length > 0 ? scenario.tests.join(', ') : 'NO TEST'}`);
	}

	const uncovered = coverage.filter((scenario) => scenario.tests.length === 0).length;
	lines.push(`${String(coverage.length)} scenarios, ${String(uncovered)} without a test`);

	return lines.join('\n');
}

/**
 * Lists the tracked and untracked, not ignored, files of a checkout.
 * @param {string} dir Folder of the checkout.
 * @returns {string[]} Paths that start with `dir`.
 */
function listFiles(dir) {
	return execFileSync('git', ['-C', dir, 'ls-files', '--cached', '--others', '--exclude-standard'], {
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024
	})
		.split('\n')
		.filter((path) => path !== '')
		.map((path) => join(dir, path))
		.filter((path) => existsSync(path));
}

function fail(message) {
	console.error(message);
	process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	const args = process.argv.slice(2);
	const root = args[0] === '--root' ? (args.splice(0, 2)[1] ?? '.') : '.';
	const [change, otherCheckout, ...rest] = args;

	if (change === undefined || !/^[a-z0-9][a-z0-9-]*$/.test(change) || rest.length > 0) {
		fail('Usage: scenarios <change> [<path to another checkout whose tests also count>]');
	}

	const files = listFiles('.');
	const prefix = join(root, 'openspec', 'changes', change, 'specs', '/');
	const specs = files.filter((path) => path.startsWith(prefix) && path.endsWith('/spec.md'));

	if (specs.length === 0) {
		fail(`No delta specs found for the change "${change}".`);
	}

	if (otherCheckout !== undefined && !existsSync(otherCheckout)) {
		fail(`${otherCheckout} not found.`);
	}

	const scenarios = specs.flatMap((path) => findScenarios(path, readFileSync(path, 'utf8')));
	const tests = [...files, ...(otherCheckout === undefined ? [] : listFiles(otherCheckout))]
		.filter((path) => TEST_FILE.test(path))
		.map((path) => ({ path, text: readFileSync(path, 'utf8') }));
	const coverage = coverScenarios(scenarios, tests);

	console.log(formatCoverage(coverage));
	process.exit(coverage.some((scenario) => scenario.tests.length === 0) ? 1 : 0);
}
