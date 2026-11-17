// PreToolUse guard for the spec-verifier and code-reviewer subagents: they may only run read-only commands and the
// workspace checks, and write their reports, in the project folder and in the other checkouts it lists.
// Exit code 2 blocks the tool call and returns stderr to the subagent.
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

const OPENSPEC = /^openspec (list|status|instructions|show|validate)( |$)/;
const DASHBOARD = /^\.\/dashboard\.sh (check|lint|format-check|typecheck|spec-validate|scenarios|test|test-unit|test-integration|e2e)( |$)/;
const READ_ONLY_COMMANDS = [
	OPENSPEC,
	/^git( -C ("[^"]*"|'[^']*'|\S+))? (diff|log|show|status|ls-files|grep|rev-parse|merge-base)( |$)/,
	DASHBOARD
];
const GIT_DIRECTORY = /^git -C ("([^"]*)"|'([^']*)'|(\S+)) /;
// The openspec CLI acts on the nearest OpenSpec root and `./dashboard.sh` on its own folder, so another folder is
// reached with one `cd`.
const CD_PREFIX = /^cd (\/?[\w.-]+(?:\/[\w.-]+)*) && (.*)$/;
// Redirections, pipes, chaining, substitution and variable or brace expansion would let an allowed prefix run anything
// or build a blocked option.
const SHELL_CONTROL = /[;&|<>`\n${}]/;
// Git options that write files or run programs: --output, --ext-diff, --open-files-in-pager (-O) and --textconv. Git
// accepts unique prefixes of long options, and -O may follow other short options or a context number (`-1O<pager>`).
const GIT_UNSAFE_OPTIONS = /(^|\s)(--(ou|op|ext|textc)|-[^-\s]*O)/;
const REPORT_PATH =
	/^((?:(?!\.\.\/)[\w.-]+\/)*)openspec\/changes\/(?!archive\/)([^/]+)\/(verification|code-review)\.md$/;
// Other checkouts of the same work (the repository an edition extends, the writer), as paths relative to the project
// folder in a JSON array.
const ROOTS_FILE = 'agent-roots.json';

const input = JSON.parse(readFileSync(0, 'utf8'));
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd;

function block(reason) {
	process.stderr.write(`spec-verifier guard: ${reason}\n`);
	process.exit(2);
}

/**
 * Resolves a path through its symlinks.
 * @param {string} path Absolute path.
 * @returns {string | undefined} The real path, or undefined when it does not exist.
 */
function real(path) {
	try {
		return realpathSync(path);
	} catch {
		return undefined;
	}
}

/**
 * Tells whether a path lies inside a folder or is the folder itself.
 * @param {string} folder Real path of the folder.
 * @param {string} path Real path.
 */
function within(folder, path) {
	const rel = relative(folder, path);

	return !(rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel));
}

/** The project folder and the checkouts its roots file lists, as real paths; a malformed file blocks everything. */
function allowedRoots() {
	const roots = [real(projectDir)];
	const file = join(projectDir, ROOTS_FILE);

	if (existsSync(file)) {
		let listed;

		try {
			listed = JSON.parse(readFileSync(file, 'utf8'));
		} catch {
			block(`${ROOTS_FILE} is not valid JSON.`);
		}

		if (!Array.isArray(listed) || !listed.every((entry) => typeof entry === 'string')) {
			block(`${ROOTS_FILE} must be a JSON array of folder paths.`);
		}

		roots.push(...listed.map((entry) => real(resolve(projectDir, entry))));
	}

	return roots.filter((root) => root !== undefined);
}

const roots = allowedRoots();

/**
 * Resolves a directory inside an allowed root.
 * @param {string} dir Absolute or project-relative directory.
 * @returns {{ path: string, root: string } | undefined} Its real path and root, or undefined when it does not exist or
 * lies outside every root.
 */
function allowedDir(dir) {
	const path = real(resolve(projectDir, dir));
	const root = path === undefined ? undefined : roots.find((candidate) => within(candidate, path));

	return path === undefined || root === undefined ? undefined : { path, root };
}

if (input.tool_name === 'Bash') {
	let command = String(input.tool_input?.command ?? '').trim();
	const prefixed = CD_PREFIX.exec(command);

	if (prefixed) {
		const dir = allowedDir(prefixed[1] ?? '');
		const inner = prefixed[2] ?? '';
		const openspecRoot =
			dir !== undefined && dir.path !== roots[0] && existsSync(join(dir.path, 'openspec')) && OPENSPEC.test(inner);
		const listedCheckout =
			dir !== undefined &&
			dir.path === dir.root &&
			dir.root !== roots[0] &&
			existsSync(join(dir.path, 'dashboard.sh')) &&
			DASHBOARD.test(inner);

		if (!openspecRoot && !listedCheckout) {
			block(
				`\`cd <dir> && \` may only precede a read-only openspec command in a folder that holds an openspec/ root, or a \`./dashboard.sh\` check in a checkout listed in ${ROOTS_FILE}.`
			);
		}

		command = inner;
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
	if (gitDirectory) {
		const dir = allowedDir(gitDirectory[2] ?? gitDirectory[3] ?? gitDirectory[4] ?? '');

		if (dir === undefined || dir.path !== dir.root) {
			block(`git -C may only name the project folder or a checkout listed in ${ROOTS_FILE}.`);
		}
	}
} else if (input.tool_name === 'Write' || input.tool_name === 'Edit') {
	const filePath = String(input.tool_input?.file_path ?? '');
	const target = resolve(projectDir, filePath);
	const folder = real(dirname(target));
	const path = folder === undefined ? undefined : join(folder, basename(target));
	const allowed = roots.some((root) => {
		const report = path === undefined || !within(root, path) ? null : REPORT_PATH.exec(relative(root, path));

		return (
			report !== null &&
			existsSync(join(root, report[1] ?? '', 'openspec', 'changes', report[2] ?? '', '.openspec.yaml'))
		);
	});

	if (!allowed) {
		block(
			'the only files you may write are verification.md and code-review.md in openspec/changes/<change>/ of an existing change.'
		);
	}
}
