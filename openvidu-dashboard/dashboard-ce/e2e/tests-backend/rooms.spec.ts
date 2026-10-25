import { expect, test } from '@playwright/test';

test('rooms against the real backend: seeded list, summary, search and the locked detail', async ({ page }) => {
	await page.goto('/login?redirect=%2Frooms%3Ffrom%3Dnow-7d%26to%3Dnow%26tz%3DUTC');
	await page.getByLabel('Username').fill('admin');
	await page.getByLabel('Password', { exact: true }).fill('e2e-admin-password');
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/rooms\?/);

	const table = page.getByRole('table', { name: 'Rooms' });

	await expect(table.getByRole('row', { name: /Webinar-Q4/ })).toContainText('active');
	await expect(table.getByRole('row', { name: /Daily-Standup/ })).toContainText('closed');
	await expect(page.getByRole('region', { name: 'Summary' })).toContainText('Active rooms');

	await page.getByRole('radio', { name: 'Closed' }).click();
	await expect(table.getByRole('row', { name: /Webinar-Q4/ })).toHaveCount(0);

	await page.getByLabel('Room name or SID').fill('crash');
	await expect(table.getByRole('row')).toHaveCount(2);

	await page.goto('/rooms/RM_rec0nciled01');
	await expect(page.getByRole('heading', { level: 1, name: 'Crashed-Node-Room' })).toBeVisible();
	await expect(page.getByText('Room detail is available in OpenVidu PRO')).toBeVisible();
});
