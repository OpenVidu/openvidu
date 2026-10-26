import { expect, test } from '../fixtures/api.js';

test('a signed-in user lands on the overview inside the shell', async ({ page, api }) => {
	await page.goto('/');

	// Overview keeps the session zone in its URL: the browser zone of the suite.
	await expect(page).toHaveURL(/\/overview\?tz=Europe%2FMadrid$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
	await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
	await expect(page.getByRole('main')).toBeVisible();
	expect(api.calls()).toContain('POST auth/refresh');
});
