// PreToolUse guard for the spec-verifier and code-reviewer subagents: they may only run read-only commands and the
// workspace checks, and write their reports.
// Exit code 2 blocks the tool call and returns stderr to the subagent.
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

const OPENSPEC = /^openspec (list|status|instructions|show|validate)( |$)/;
const READ_ONLY_COMMANDS = [
	OPENSPEC,
	/^git( -C ("[^"]*"|'[^']*'|\S+))? (diff|log|show|status|ls-files|grep|rev-parse|merge-base)( |$)/,
	/^\.\/dashboard\.sh (check|lint|format-check|typecheck|spec-validate|scenarios|test|test-unit|test-integration|e2e)( |$)/
];
const GIT_DIRECTORY = /^git -C ("([^"]*)"|'([^']*)'|(\S+)) /;
// The openspec CLI acts on the nearest OpenSpec root, so a root below the project folder is reached with one `cd`.
const NESTED_ROOT = /^cd ([\w.-]+(?:\/[\w.-]+)*) && (.*)$/;
// Redirections, pipes, chaining, substitution and variable or brace expansion would let an allowed prefix run anything
// or build a blocked option.
const SHELL_CONTROL = /[;&|<>`\n${}]/;
// Git options that write files or run programs: --output, --ext-diff, --open-files-in-pager (-O) and --textconv. Git
// accepts unique prefixes of long options, and -O may follow other short options or a context number (`-1O<pager>`).
const GIT_UNSAFE_OPTIONS = /(^|\s)(--(ou|op|ext|textc)|-[^-\s]*O)/;
const REPORT_PATH =
	/^((?:(?!\.\.\/)[\w.-]+\/)*)openspec\/changes\/(?!archive\/)([^/]+)\/(verification|code-review)\.md$/;

const input = JSON.parse(readFileSync(0, 'utf8'));
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd;

function block(reason) {
	process.stderr.write(`spec-verifier guard: ${reason}\n`);
	process.exit(2);
}

/**
 * Resolves a directory inside the project folder, following symlinks.
 * @param {string} dir Absolute or project-relative directory.
 * @returns {string | undefined} Its path relative to the project folder ('' for the folder itself), or undefined when
 * it does not exist or lies outside.
 */
function insideProject(dir) {
	try {
		const path = relative(realpathSync(projectDir), realpathSync(resolve(projectDir, dir)));

		return path === '..' || path.startsWith(`..${sep}`) || isAbsolute(path) ? undefined : path;
	} catch {
		return undefined;
	}
}

if (input.tool_name === 'Bash') {
	let command = String(input.tool_input?.command ?? '').trim();
	const nested = NESTED_ROOT.exec(command);

	if (nested) {
		const root = insideProject(nested[1] ?? '');

		if (!root || !existsSync(join(projectDir, root, 'openspec')) || !OPENSPEC.test(nested[2] ?? '')) {
			block('`cd <dir> && ` may only precede a read-only openspec command, in a folder of the project that holds an openspec/ root.');
		}

		command = nested[2] ?? '';
	}

	// The shell strips quotes and backslashes before git parses the options.
	const unquoted = command.replace(/['"\\]/g, '');

	if (SHELL_CONTROL.test(command) || GIT_UNSAFE_OPTIONS.test(unquoted)) {
		block(
			'run one plain read-only command, without redirections, pipes, chaining, $ or braces, and without git options that write files or run programs.'
		);
	}

	if (!READ_ONLY_COMMANDS.some((pattern) => pattern.test(command))) {
		block(
			'only `openspec list|status|instructions|show|validate` (after `cd <dir> && ` for an OpenSpec root below the project folder), read-only git commands and `./dashboard.sh check|lint|format-check|typecheck|spec-validate|scenarios|test|test-unit|test-integration|e2e` are allowed.'
		);
	}

	const gitDirectory = GIT_DIRECTORY.exec(command);

	// The configuration of another repository (core.fsmonitor, for example) can run programs.
	if (gitDirectory && insideProject(gitDirectory[2] ?? gitDirectory[3] ?? gitDirectory[4] ?? '') !== '') {
		block('git -C may only name the project folder.');
	}
} else if (input.tool_name === 'Write' || input.tool_name === 'Edit') {
	const filePath = String(input.tool_input?.file_path ?? '');
	const relativePath = relative(projectDir, isAbsolute(filePath) ? filePath : resolve(projectDir, filePath));
	const report = REPORT_PATH.exec(relativePath);

	if (
		!report ||
		!existsSync(join(projectDir, report[1] ?? '', 'openspec', 'changes', report[2] ?? '', '.openspec.yaml'))
	) {
		block(
			'the only files you may write are verification.md and code-review.md in openspec/changes/<change>/ of an existing change.'
		);
	}
}
