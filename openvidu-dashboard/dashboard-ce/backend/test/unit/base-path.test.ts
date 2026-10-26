import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveBasePath } from '../../src/http/base-path.js';

function spa(baseHref: string): string {
	const root = mkdtempSync(join(tmpdir(), 'dashboard-base-'));

	writeFileSync(join(root, 'index.html'), `<!doctype html><html><head><base href="${baseHref}"></head></html>`);

	return root;
}

describe('public base path', () => {
	it('prefers DASHBOARD_BASE_PATH', () => {
		expect(resolveBasePath('/admin/', spa('/dashboard/'))).toEqual({ basePath: '/admin/', source: 'variable' });
	});

	it('reads the <base href> of the built SPA', () => {
		expect(resolveBasePath(undefined, spa('/dashboard/'))).toEqual({
			basePath: '/dashboard/',
			source: 'index.html'
		});
		expect(resolveBasePath(undefined, spa('/dashboard'))).toEqual({
			basePath: '/dashboard/',
			source: 'index.html'
		});
	});

	it('falls back to / without a built SPA', () => {
		expect(resolveBasePath(undefined, '/nonexistent')).toEqual({ basePath: '/', source: 'default' });
	});
});
