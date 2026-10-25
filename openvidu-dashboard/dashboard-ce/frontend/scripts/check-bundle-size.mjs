#!/usr/bin/env node
// Enforces the gzip budgets of the production build: the initial chunks (scripts and styles referenced by index.html)
// within INITIAL_BUDGET, the ECharts chunk (loaded with the first chart) within ECHARTS_BUDGET and every other lazy
// script within LAZY_BUDGET. angular.json budgets only measure raw sizes; `namedChunks` lets the ECharts chunk be told
// apart.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const KB = 1000;
const INITIAL_BUDGET = 400 * KB;
const LAZY_BUDGET = 150 * KB;
// Even a minimal ECharts 6 build (line, grid, tooltip, canvas) is about 176 kB gzip.
const ECHARTS_BUDGET = 250 * KB;
const ECHARTS_CHUNK = /echarts-setup/;

// The build output: the argument, relative to the working directory, or the CE application's.
const browser =
	process.argv[2] === undefined
		? join(dirname(fileURLToPath(import.meta.url)), '..', 'dist/frontend/browser')
		: resolve(process.argv[2]);
const html = readFileSync(join(browser, 'index.html'), 'utf8');
const initial = new Set(
	[...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((match) => match[1].replace(/^\.?\//, ''))
);
const gzip = (file) => gzipSync(readFileSync(join(browser, file))).length;
const kb = (bytes) => `${(bytes / KB).toFixed(1)} kB`;
const failures = [];
let initialTotal = 0;

for (const file of readdirSync(browser)
	.filter((name) => /\.(js|css)$/.test(name))
	.sort()) {
	const size = gzip(file);

	if (initial.has(file)) {
		initialTotal += size;
		console.log(`initial  ${kb(size).padStart(9)}  ${file}`);
	} else if (file.endsWith('.js')) {
		const budget = ECHARTS_CHUNK.test(file) ? ECHARTS_BUDGET : LAZY_BUDGET;

		console.log(`lazy     ${kb(size).padStart(9)}  ${file}`);

		if (size > budget) {
			failures.push(`${file} is ${kb(size)} gzip, over its ${kb(budget)} budget`);
		}
	}
}

console.log(`initial total ${kb(initialTotal)} gzip (budget ${kb(INITIAL_BUDGET)})`);

if (initialTotal > INITIAL_BUDGET) {
	failures.push(`initial chunks are ${kb(initialTotal)} gzip, over the ${kb(INITIAL_BUDGET)} budget`);
}

for (const failure of failures) {
	console.error(`bundle budget: ${failure}`);
}

process.exit(failures.length > 0 ? 1 : 0);
