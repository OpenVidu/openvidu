import { expect, test } from '@playwright/test';

const USERNAME = 'admin';
const PASSWORD = 'e2e-admin-password';

test('session against the real backend: redirect, sign-in, reload, sign-out and refresh revocation', async ({
	page,
	context
}) => {
	await page.goto('/settings?tab=about');
	await expect(page).toHaveURL('/login?redirect=%2Fsettings%3Ftab%3Dabout');
	await expect(page.getByText('CE', { exact: true })).toBeVisible();

	await page.getByLabel('Username').fill(USERNAME);
	await page.getByLabel('Password', { exact: true }).fill('wrong');
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page.getByRole('alert')).toHaveText('Invalid username or password');

	await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL('/settings?tab=about');
	await expect(page.locator('ovd-about-tab').getByText(/^OpenVidu \d+\.\d+/)).toBeVisible();
	await expect(page.getByRole('row', { name: 'Daily rollups Kept forever' })).toBeVisible();
	expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);

	await page.reload();
	await expect(page).toHaveURL('/settings?tab=about');
	await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();

	const refreshCookie = (await context.cookies()).find((cookie) => cookie.name === 'ov_dashboard_refresh');

	expect(refreshCookie?.httpOnly).toBe(true);
	expect(refreshCookie?.path).toBe('/api/v1/auth');

	await page.getByRole('button', { name: 'User menu' }).click();
	await page.getByRole('menuitem', { name: 'Sign out' }).click();
	await expect(page).toHaveURL('/login');

	if (refreshCookie !== undefined) {
		await context.addCookies([refreshCookie]);
	}

	const refresh = await page.request.post('/api/v1/auth/refresh');

	expect(refresh.status()).toBe(401);

	await page.goto('/rooms');
	await expect(page).toHaveURL('/login?redirect=%2Frooms');
});
