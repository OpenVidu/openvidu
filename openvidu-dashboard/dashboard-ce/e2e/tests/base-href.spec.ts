import { expect, test } from '../fixtures/api.js';

test('behind a path-stripping proxy every request of the application carries the prefix', async ({ page }) => {
	const paths: string[] = [];

	page.on('request', (request) => paths.push(new URL(request.url()).pathname));
	await page.goto('/dashboard/overview');

	await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
	await expect(page.getByRole('region', { name: 'Live' })).toContainText('Active rooms 12');
	expect(paths.some((path) => path.startsWith('/dashboard/api/v1/'))).toBe(true);
	expect(paths.filter((path) => !path.startsWith('/dashboard/'))).toEqual([]);
});
