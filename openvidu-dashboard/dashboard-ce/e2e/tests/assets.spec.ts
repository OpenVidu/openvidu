import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '../fixtures/api.js';

const BUILD = join(dirname(fileURLToPath(import.meta.url)), '../../frontend/dist/frontend/browser');

test('no request leaves the origin: fonts and icons are served by the application', async ({ page, baseURL }) => {
	const requests: string[] = [];

	page.on('request', (request) => requests.push(request.url()));
	await page.goto('/settings');
	await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
	await page.evaluate(() => document.fonts.ready);

	const origin = new URL(baseURL ?? '').origin;

	expect(requests.filter((url) => !url.startsWith(origin) && !url.startsWith('data:'))).toEqual([]);
	expect(requests.some((url) => url.endsWith('/assets/icons.svg'))).toBe(true);
	expect(requests.some((url) => /\/media\/inter-.*\.woff2$/.test(url))).toBe(true);
});

test('ECharts is a lazy chunk that the shell does not load', async ({ page }) => {
	const echarts = readdirSync(BUILD).filter((file) => file.includes('echarts-setup'));
	const scripts: string[] = [];

	expect(echarts).toHaveLength(1);
	page.on('request', (request) => {
		if (request.resourceType() === 'script') {
			scripts.push(request.url());
		}
	});
	await page.goto('/overview');
	await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();

	expect(scripts.some((url) => url.includes('echarts-setup'))).toBe(false);
});

test('the shell is interactive within 2 s', async ({ page }) => {
	const start = Date.now();

	await page.goto('/overview');
	await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
	await page.getByRole('button', { name: 'User menu' }).click();
	await expect(page.getByRole('menuitem', { name: 'Sign out' })).toBeVisible();

	expect(Date.now() - start).toBeLessThan(2_000);
});

test('the shell loads without console errors', async ({ page }) => {
	const errors: string[] = [];

	page.on('console', (message) => {
		if (message.type() === 'error') {
			errors.push(message.text());
		}
	});
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto('/rooms');
	await expect(page.getByRole('heading', { level: 1, name: 'Rooms' })).toBeVisible();
	await page.goto('/settings?tab=about');
	await expect(page.getByRole('row', { name: 'Events 7 days' })).toBeVisible();

	expect(errors).toEqual([]);
});
