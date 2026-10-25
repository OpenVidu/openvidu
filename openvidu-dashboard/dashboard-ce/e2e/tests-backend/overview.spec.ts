import { expect, test } from '@playwright/test';

test('overview against the real backend: live tiles, stale hint, writer health, recent rooms and the lock', async ({
	page
}) => {
	await page.goto('/login?redirect=%2Foverview%3Ftz%3DUTC');
	await page.getByLabel('Username').fill('admin');
	await page.getByLabel('Password', { exact: true }).fill('e2e-admin-password');
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/overview\?tz=UTC/);

	const card = (title: string) =>
		page.locator('ovd-section-card').filter({ has: page.getByRole('heading', { level: 2, name: title }) });

	await expect(page.getByRole('region', { name: 'Live' })).toContainText('Active rooms 2');
	// The stale notice needs two responses in a row reporting stale entities.
	await page.getByRole('button', { name: 'Refresh now' }).click();
	await expect(page.getByRole('alert').filter({ hasText: 'may be stale' })).toContainText('1 active room');
	await expect(page.locator('.page-header ovd-live-chip')).toHaveText('LIVE');
	await expect(card('Data pipeline')).toContainText(/Last batch at \d\d:\d\d:\d\d/);
	await expect(card('Data pipeline')).toContainText(/\d+ of \d+ nodes? reporting/);
	await expect(card('Today (UTC, since 00:00)')).toContainText('3');
	await expect(card('Recent rooms').getByRole('row', { name: /Webinar-Q4/ })).toBeVisible();
	await expect(card('Recent rooms').locator('ovd-status-badge mat-icon.stale')).toHaveCount(1);
	await expect(card('By node')).toContainText('Per-node breakdown is available in OpenVidu PRO');
});
