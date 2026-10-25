#!/usr/bin/env node
// Runs the end-to-end suites: the mocked-API suite always, the real-backend suite when MongoDB is available
// (DASHBOARD_TEST_MONGO_URI or Docker); otherwise it reports that suite as skipped, like the integration tests.
import { spawnSync } from 'node:child_process';

import { getContainerRuntimeClient } from 'testcontainers';

const args = process.argv.slice(2);

function playwright(extra) {
	return spawnSync('playwright', ['test', ...extra, ...args], { stdio: 'inherit', shell: false }).status ?? 1;
}

const mocked = playwright([]);

let mongo = Boolean(process.env.DASHBOARD_TEST_MONGO_URI);

if (!mongo) {
	try {
		await getContainerRuntimeClient();
		mongo = true;
	} catch {
		console.warn(
			'Docker is not available and DASHBOARD_TEST_MONGO_URI is not set: the real-backend suite is skipped'
		);
	}
}

const backend = mongo ? playwright(['-c', 'playwright.backend.config.ts']) : 0;

process.exit(mocked || backend);
