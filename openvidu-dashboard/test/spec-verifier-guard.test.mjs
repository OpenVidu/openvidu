import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const BLOCKED = 2;
const AGENTS = ['spec-verifier', 'code-reviewer'];
const agentFiles = AGENTS.map((agent) => readFileSync(join(repoRoot, `.claude/agents/${agent}.md`), 'utf8'));
const frontmatters = agentFiles.map((file) => file.split('---')[1] ?? '');
const hookCommand = /^ {10}command: '(.+)'$/m.exec(frontmatters[0] ?? '')?.[1] ?? '';

// A project with a change in its root OpenSpec root and another in a nested one, so the tests do not depend on the
// changes of this repository.
const sampleProject = mkdtempSync(join(tmpdir(), 'ovd-guard-project-'));
const otherProject = mkdtempSync(join(tmpdir(), 'ovd-guard-other-'));
// A checkout the project lists in agent-roots.json, with a change and its own dashboard.sh.
const listedProject = mkdtempSync(join(tmpdir(), 'ovd-guard-listed-'));
const listed = relative(sampleProject, listedProject);

for (const change of ['openspec/changes/demo', 'edition/openspec/changes/nested']) {
	mkdirSync(join(sampleProject, change), { recursive: true });
	writeFileSync(join(sampleProject, change, '.openspec.yaml'), 'schema: spec-driven\n');
}

mkdirSync(join(sampleProject, 'openspec/changes/no-metadata'), { recursive: true });
mkdirSync(join(sampleProject, 'plain'));
mkdirSync(join(otherProject, 'openspec'));
symlinkSync(otherProject, join(sampleProject, 'outside'));
mkdirSync(join(listedProject, 'openspec/changes/rooted'), { recursive: true });
writeFileSync(join(listedProject, 'openspec/changes/rooted/.openspec.yaml'), 'schema: spec-driven\n');
writeFileSync(join(listedProject, 'dashboard.sh'), '');
writeFileSync(join(sampleProject, 'agent-roots.json'), JSON.stringify([listed, 'missing-checkout']));
mkdirSync(join(sampleProject, '.claude/hooks'), { recursive: true });
symlinkSync(
	join(repoRoot, '.claude/hooks/spec-verifier-guard.mjs'),
	join(sampleProject, '.claude/hooks/spec-verifier-guard.mjs')
);

after(() => {
	rmSync(sampleProject, { recursive: true, force: true });
	rmSync(otherProject, { recursive: true, force: true });
	rmSync(listedProject, { recursive: true, force: true });
});

/**
 * Runs the subagent's hook command, as Claude Code does, with a tool call on stdin.
 * @param {string} toolName Tool being called.
 * @param {Record<string, string>} toolInput Input of the tool call.
 * @param {{ path?: string, projectDir?: string }} [options] PATH for the hook shell and project folder.
 */
function guard(toolName, toolInput, { path = process.env.PATH ?? '', projectDir = sampleProject } = {}) {
	return spawnSync('/bin/sh', ['-c', hookCommand], {
		cwd: projectDir,
		env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir, PATH: path },
		input: JSON.stringify({ tool_name: toolName, tool_input: toolInput, cwd: projectDir }),
		encoding: 'utf8'
	});
}

describe('Verifier tools', () => {
	for (const [index, name] of AGENTS.entries()) {
		test(`Subagent definition: ${name} has read and report tools only, with guarded Bash and Write`, () => {
			const frontmatter = frontmatters[index] ?? '';

			assert.match(frontmatter, /^tools: Read, Grep, Glob, Bash, Write$/m);
			assert.equal(frontmatter.match(/matcher:/g)?.length, 1);
			assert.match(frontmatter, /^ {4}- matcher: 'Bash\|Write'$/m);
			assert.ok(frontmatter.includes(`command: '${hookCommand}'`));
			assert.ok(hookCommand.includes('.claude/hooks/spec-verifier-guard.mjs'));
			assert.ok(hookCommand.endsWith('|| exit 2'));
		});
	}

	test('Subagent definition: the verifier preloads the verify skill', () => {
		assert.match(frontmatters[0] ?? '', /^skills:\n {2}- openspec-verify-change$/m);
	});
});

describe('Read-only commands', () => {
	for (const command of [
		'openspec status --change "x" --json',
		'openspec instructions apply --change "x" --json',
		'openspec list --json',
		'openspec validate --all --strict',
		'cd edition && openspec status --change "nested" --json',
		'cd edition && openspec validate --all --strict',
		'git diff origin/master',
		'git status',
		`git -C "${sampleProject}" log -p -- openspec/specs/x/spec.md`,
		'git -C . status',
		'./dashboard.sh check',
		'./dashboard.sh check --skip-install',
		'./dashboard.sh test-unit',
		'./dashboard.sh test-integration',
		'./dashboard.sh test-live',
		'./dashboard.sh e2e',
		'./dashboard.sh spec-validate',
		'./dashboard.sh scenarios demo',
		'git grep -n "readTsConfig" -- test',
		'git grep -e "-e" -- README.md',
		'git log --oneline -5',
		'git ls-files openspec'
	]) {
		test(`Allowed command: ${command}`, () => {
			assert.equal(guard('Bash', { command }).status, 0);
		});
	}

	for (const command of [
		'git commit -m x',
		'git push',
		'openspec archive x',
		'./dashboard.sh format',
		'./dashboard.sh lint-fix',
		'./dashboard.sh build-image ce',
		'./dashboard.sh contract-check ../openvidu-livekit',
		'./dashboard.sh clean',
		'rm -rf dashboard-ce'
	]) {
		test(`Mutating command: ${command}`, () => {
			const result = guard('Bash', { command });

			assert.equal(result.status, BLOCKED);
			assert.ok(result.stderr.includes('openspec list|status|instructions|show|validate'));
			assert.ok(result.stderr.includes('read-only git commands'));
			assert.ok(result.stderr.includes('./dashboard.sh check|'));
		});
	}

	for (const command of [
		'git -C /tmp/other status',
		'git -C .. status',
		'git -C edition status',
		'git -C outside log'
	]) {
		test(`Another repository: ${command}`, () => {
			const result = guard('Bash', { command });

			assert.equal(result.status, BLOCKED);
			assert.ok(result.stderr.includes('project folder'));
		});
	}
});

describe('Nested OpenSpec root', () => {
	for (const command of [
		'cd edition && openspec archive nested',
		'cd edition && git status',
		'cd edition && ./dashboard.sh check',
		'cd edition && rm -rf openspec',
		'cd plain && openspec list',
		'cd missing && openspec list',
		'cd .. && openspec list',
		'cd edition/.. && openspec list',
		'cd outside && openspec list',
		'cd /tmp && openspec list',
		'cd edition && openspec list && rm -rf x',
		'cd edition && cd .. && openspec list',
		'cd edition && openspec show $(rm x)',
		'cd edition; openspec list',
		'cd edition'
	]) {
		test(`cd used for anything but a read-only openspec command in a root of the project: ${command}`, () => {
			assert.equal(guard('Bash', { command }).status, BLOCKED);
		});
	}
});

describe('Listed checkouts', () => {
	for (const command of [
		`cd ${listed} && ./dashboard.sh check`,
		`cd ${listedProject} && ./dashboard.sh e2e`,
		`cd ${listed} && openspec status --change "rooted" --json`,
		`git -C ${listed} diff origin/master`,
		`git -C "${listedProject}" status`
	]) {
		test(`Allowed in a listed checkout: ${command}`, () => {
			assert.equal(guard('Bash', { command }).status, 0);
		});
	}

	for (const command of [
		`cd ${listed} && ./dashboard.sh build-image ce`,
		`cd ${listed} && ./dashboard.sh contract-check ../openvidu-livekit`,
		`cd ${listed} && rm -rf openspec`,
		`cd ${listed} && git status`,
		`cd ${listed}/openspec && ./dashboard.sh check`,
		`cd ${listed} && ./dashboard.sh check && rm -rf x`,
		'cd . && ./dashboard.sh check',
		`git -C ${listed}/openspec status`,
		`cd ${relative(sampleProject, otherProject)} && openspec list`
	]) {
		test(`Not allowed in a listed checkout: ${command}`, () => {
			assert.equal(guard('Bash', { command }).status, BLOCKED);
		});
	}

	for (const filePath of [
		join(listedProject, 'openspec/changes/rooted/verification.md'),
		`${listed}/openspec/changes/rooted/code-review.md`
	]) {
		test(`Report in a listed checkout: ${filePath}`, () => {
			assert.equal(guard('Write', { file_path: filePath, content: '' }).status, 0);
		});
	}

	for (const filePath of [
		join(listedProject, 'AGENTS.md'),
		join(listedProject, 'openspec/changes/rooted/tasks.md'),
		join(otherProject, 'openspec/changes/rooted/verification.md')
	]) {
		test(`Any other file of a listed checkout: ${filePath}`, () => {
			assert.equal(guard('Write', { file_path: filePath, content: '' }).status, BLOCKED);
		});
	}

	test('Malformed roots file: the guard blocks every call', () => {
		const project = mkdtempSync(join(tmpdir(), 'ovd-guard-bad-roots-'));

		try {
			mkdirSync(join(project, '.claude/hooks'), { recursive: true });
			symlinkSync(
				join(repoRoot, '.claude/hooks/spec-verifier-guard.mjs'),
				join(project, '.claude/hooks/spec-verifier-guard.mjs')
			);
			writeFileSync(join(project, 'agent-roots.json'), '{ "not": "a list" }');

			const result = guard('Bash', { command: 'git status' }, { projectDir: project });

			assert.equal(result.status, BLOCKED);
			assert.ok(result.stderr.includes('agent-roots.json'));
		} finally {
			rmSync(project, { recursive: true, force: true });
		}
	});
});

describe('No smuggled commands', () => {
	for (const command of [
		'openspec list && rm -rf x',
		'openspec list; rm -rf x',
		'cd .. && ls',
		'openspec show $(rm x)',
		'openspec show `rm x`',
		'git diff > out.txt',
		'git diff | tee out.txt',
		'git diff --output=out.txt',
		'git diff "--output=out.txt"',
		'git diff --ou=out.txt',
		'git diff origin/master\t--output=out.txt',
		'git diff --ext-diff',
		'git diff --ext',
		"git diff $'\\x2d\\x2doutput=out.txt'",
		'git diff --{output,stat}=out.txt',
		'git log $GIT_OPTIONS',
		'git grep -O x',
		'git grep -nO x',
		'git grep -Ovi x',
		"git grep -''O x",
		'git grep --open x',
		'git grep "--open-files-in-pager=vi" x',
		'git grep --o\\pen x',
		'git grep --textconv x',
		'git grep -1O x',
		'git grep -1Oecho x',
		'git grep -n1Ovi x',
		'git grep -3nO x',
		'git grep -1"O"echo x'
	]) {
		test(`Allowed prefix used to smuggle a command: ${command}`, () => {
			assert.equal(guard('Bash', { command }).status, BLOCKED);
		});
	}
});

describe('Report is the only writable file', () => {
	for (const filePath of [
		join(sampleProject, 'openspec/changes/demo/verification.md'),
		'openspec/changes/demo/verification.md',
		'openspec/changes/demo/code-review.md',
		'edition/openspec/changes/nested/verification.md',
		join(sampleProject, 'edition/openspec/changes/nested/code-review.md')
	]) {
		test(`Report: ${filePath}`, () => {
			assert.equal(guard('Write', { file_path: filePath, content: '' }).status, 0);
		});
	}

	for (const filePath of [
		'AGENTS.md',
		join(sampleProject, 'dashboard-ce/backend/src/index.ts'),
		join(sampleProject, 'openspec/changes/archive/2026-11-11-demo/verification.md'),
		'openspec/changes/no-such-change/verification.md',
		'openspec/changes/no-metadata/verification.md',
		'openspec/changes/demo/tasks.md',
		'openspec/changes/demo/operations.md',
		'openspec/changes/archive/2026-11-11-demo/code-review.md',
		'edition/openspec/changes/demo/verification.md',
		'edition/openspec/changes/nested/tasks.md',
		// Raw strings: join() would normalise away the `..` segments the guard must resolve.
		`${sampleProject}/openspec/changes/demo/../../../AGENTS.md`,
		'openspec/changes/demo/../../../AGENTS.md',
		'openspec/changes/demo/../demo/verification.md/../../../../AGENTS.md',
		`../${sampleProject.split('/').pop() ?? ''}/../openspec/changes/demo/verification.md`,
		'/tmp/openspec/changes/demo/verification.md'
	]) {
		test(`Any other file: ${filePath}`, () => {
			const result = guard('Write', { file_path: filePath, content: '' });

			assert.equal(result.status, BLOCKED);
			assert.ok(result.stderr.includes('verification.md'));
		});
	}
});

describe('Guard self-check', () => {
	const PROBE = 'echo spec-verifier-guard-probe';

	test('Guard active: the guard blocks the probe with its own message', () => {
		const result = guard('Bash', { command: PROBE });

		assert.equal(result.status, BLOCKED);
		assert.ok(result.stderr.startsWith('spec-verifier guard: '));
	});

	test('Guard missing: the probe is blocked without the guard message', () => {
		const project = mkdtempSync(join(tmpdir(), 'ovd-guard-missing-'));

		try {
			const result = guard('Bash', { command: PROBE }, { projectDir: project });

			assert.equal(result.status, BLOCKED);
			assert.ok(!result.stderr.includes('spec-verifier guard: '));
		} finally {
			rmSync(project, { recursive: true, force: true });
		}
	});

	for (const [index, name] of AGENTS.entries()) {
		test(`Guard inactive: the first instruction of ${name} runs the probe and stops without a report when it runs`, () => {
			const body = (agentFiles[index] ?? '').split('---').slice(2).join('---');
			const firstStep = /^1\. ([\s\S]*?)^2\. /m.exec(body)?.[1] ?? '';

			for (const text of [
				`\`${PROBE}\``,
				'`spec-verifier guard:`',
				'If it runs',
				'stop',
				'write nothing',
				'Guard inactive'
			]) {
				assert.ok(firstStep.includes(text), text);
			}
		});
	}
});

describe('Fail closed', () => {
	const pathWithoutNode = mkdtempSync(join(tmpdir(), 'ovd-no-node-'));

	after(() => {
		rmSync(pathWithoutNode, { recursive: true, force: true });
	});

	test('Node.js missing: the hook blocks the call', () => {
		const bin = join(pathWithoutNode, 'bin');
		mkdirSync(bin);
		symlinkSync('/bin/sh', join(bin, 'sh'));

		const result = guard('Bash', { command: 'openspec list --json' }, { path: bin });

		assert.match(result.stderr, /node/);
		assert.equal(result.status, BLOCKED);
	});
});
