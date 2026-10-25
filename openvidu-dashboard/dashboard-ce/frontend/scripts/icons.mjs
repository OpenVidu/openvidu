#!/usr/bin/env node
// Material Symbols sprite for the dashboard.
//   build: compiles the rounded SVGs named in the manifests into one icon set for MatIconRegistry.addSvgIconSet.
//   check: fails when a source file uses an icon no manifest lists, or a manifest lists an icon none of them uses.
// Usage: icons.mjs build|check [--sprite <file>] [<icons.json>...]. Each manifest lists `icons` and the `sources`
// directories, relative to itself, whose files use them; by default the dashboard-ui manifest and sprite.
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(3);
const spriteIndex = args.indexOf('--sprite');
const spritePath =
	spriteIndex < 0 ? join(root, 'projects/dashboard-ui/assets/icons.svg') : resolve(args[spriteIndex + 1] ?? '');
const manifestPaths = args
	.filter((_, index) => spriteIndex < 0 || (index !== spriteIndex && index !== spriteIndex + 1))
	.map((path) => realpathSync(resolve(path)));

if (manifestPaths.length === 0) {
	manifestPaths.push(join(root, 'projects/dashboard-ui/icons.json'));
}

const manifests = manifestPaths.map((path) => {
	const { icons, sources } = JSON.parse(readFileSync(path, 'utf8'));

	return { path, icons, sources: sources.map((source) => join(dirname(path), source)) };
});
const sourceDirs = manifests.flatMap((manifest) => manifest.sources);

// Icon names in templates, route metadata and component defaults: svgIcon="x", [svgIcon]="cond ? 'x' : 'y'",
// icon="x", icon: 'x' and icon = input('x').
const USAGE_PATTERNS = [
	/\bsvgIcon="([a-z0-9_-]+)"/g,
	/\[svgIcon\]="([^"]+)"/g,
	/\bicon="([a-z0-9_-]+)"/g,
	/\bicon:\s*'([a-z0-9_-]+)'/g,
	/\bicon\s*=\s*input\('([a-z0-9_-]+)'/g
];
// In a bound [svgIcon] expression, the literals that are results: the whole expression or a ternary branch.
const BOUND_RESULT = /(?:^|[?:])\s*'([a-z0-9_-]+)'/g;
// Records of icons, e.g. `export const THEME_ICONS = { system: 'brightness_auto', … };`.
const ICON_RECORD = /const [A-Z_]*ICONS\b[^=]*=\s*\{([^}]*)\}/g;
// Sidenav entries of route files also show the filled variant when active.
const ROUTE_FILE = /routes\.ts$/;

function iconsDir() {
	const require = createRequire(import.meta.url);

	return join(dirname(require.resolve('@material-symbols/svg-400/package.json')), 'rounded');
}

function readManifest() {
	return [...new Set(manifests.flatMap((manifest) => manifest.icons))].sort();
}

function build() {
	const dir = iconsDir();
	const symbols = readManifest().map((name) => {
		const svg = readFileSync(join(dir, `${name}.svg`), 'utf8');
		const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1];
		const body = /<svg[^>]*>([\s\S]*)<\/svg>/.exec(svg)?.[1];

		if (viewBox === undefined || body === undefined) {
			throw new Error(`Unexpected SVG for icon ${name}`);
		}

		return `<svg id="${name}" viewBox="${viewBox}">${body}</svg>`;
	});

	mkdirSync(dirname(spritePath), { recursive: true });
	writeFileSync(spritePath, `<svg xmlns="http://www.w3.org/2000/svg"><defs>${symbols.join('')}</defs></svg>\n`);
	console.log(`icons: ${symbols.length} icons → ${relative(process.cwd(), spritePath)}`);
}

function* sourceFiles(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);

		if (entry.isDirectory()) {
			yield* sourceFiles(path);
		} else if (/\.(ts|html)$/.test(entry.name) && !entry.name.endsWith('.spec.ts')) {
			yield path;
		}
	}
}

function check() {
	const manifest = new Set(readManifest());
	const used = new Map();
	const listed = manifests.map((manifest) => relative(process.cwd(), manifest.path)).join(', ');

	for (const dir of sourceDirs) {
		for (const file of sourceFiles(dir)) {
			const text = readFileSync(file, 'utf8');

			const add = (name) => {
				used.set(name, [...(used.get(name) ?? []), relative(process.cwd(), file)]);
			};

			for (const record of text.matchAll(ICON_RECORD)) {
				for (const literal of record[1].matchAll(/'([a-z0-9_-]+)'/g)) {
					add(literal[1]);
				}
			}

			for (const pattern of USAGE_PATTERNS) {
				for (const match of text.matchAll(pattern)) {
					const names = pattern.source.startsWith('\\[svgIcon')
						? [...match[1].matchAll(BOUND_RESULT)].map((literal) => literal[1])
						: [match[1]];

					for (const name of names) {
						add(name);

						if (ROUTE_FILE.test(file)) {
							add(`${name}-fill`);
						}
					}
				}
			}
		}
	}

	const missing = [...used.keys()].filter((name) => !manifest.has(name)).sort();
	const unused = [...manifest].filter((name) => !used.has(name));
	const unknown = [...manifest].filter((name) => !existsSync(join(iconsDir(), `${name}.svg`)));

	for (const name of missing) {
		console.error(`icons: "${name}" is used in ${used.get(name).join(', ')} but missing from ${listed}`);
	}

	for (const name of unused) {
		console.error(`icons: "${name}" is listed in ${listed} but never used`);
	}

	for (const name of unknown) {
		console.error(`icons: "${name}" is not a rounded Material Symbol`);
	}

	if (missing.length > 0 || unused.length > 0 || unknown.length > 0) {
		process.exit(1);
	}

	console.log(`icons: ${manifest.size} icons, all used and listed`);
}

const command = process.argv[2];

if (command === 'build') {
	build();
} else if (command === 'check') {
	check();
} else {
	console.error('Usage: icons.mjs build|check');
	process.exit(1);
}
