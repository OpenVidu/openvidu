import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Reads the package folders listed in pnpm-workspace.yaml.
 * @returns {string[]} Their paths, relative to the workspace root.
 */
function workspacePackages() {
	const yaml = readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8');
	const block = yaml.match(/^packages:\n((?: {2}- .+\n)+)/m);

	assert.ok(block, 'pnpm-workspace.yaml lists its packages');
	return block[1].split('\n').flatMap((line) => line.match(/^ {2}- (.+)$/)?.slice(1) ?? []);
}

test('tsx scripts of packages that depend on workspace packages resolve them from source', () => {
	const offending = [];

	for (const dir of workspacePackages()) {
		const pkg = JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf8'));
		const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };

		if (!Object.values(dependencies).some((version) => String(version).startsWith('workspace:'))) {
			continue;
		}

		for (const [name, script] of Object.entries(pkg.scripts ?? {})) {
			if (/\btsx\b/.test(script) && !script.includes('--conditions=source')) {
				offending.push(`${dir}: ${name}`);
			}
		}
	}

	assert.deepEqual(offending, []);
});
