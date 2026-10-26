import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseConfig } from '../../src/config/variables.js';
import { DEV_ENV_FILE, loadDevEnv } from '../../scripts/dev.js';

describe('development variables', () => {
	function file(content: string): string {
		const path = join(mkdtempSync(join(tmpdir(), 'dashboard-dev-')), '.env');
		writeFileSync(path, content);

		return path;
	}

	it('keeps the environment over the first file and that file over the next one', () => {
		const env: NodeJS.ProcessEnv = { ADMIN_PASSWORD: 'from-env' };

		loadDevEnv(
			[file('ADMIN_PASSWORD=from-local\nLOG_LEVEL=debug\n'), file('LOG_LEVEL=warn\nSERVER_PORT=6000\n')],
			env
		);
		expect(env).toEqual({ ADMIN_PASSWORD: 'from-env', LOG_LEVEL: 'debug', SERVER_PORT: '6000' });
	});

	it('skips a file that does not exist', () => {
		const env: NodeJS.ProcessEnv = {};

		loadDevEnv(['/nonexistent/.env'], env);
		expect(env).toEqual({});
	});

	it('defaults to a valid configuration for the local deployment', () => {
		const env: NodeJS.ProcessEnv = {};

		loadDevEnv([DEV_ENV_FILE], env);

		const parsed = parseConfig(env);

		expect(parsed.kind).toBe('config');
		expect(parsed.kind === 'config' && parsed.config.admin.username).toBe('admin');
		expect(env.DATABASE_URL).toBe('mongodb://mongoadmin:mongoadmin@localhost:27017/?directConnection=true');
	});
});
