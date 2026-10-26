import { expect, test } from '../fixtures/api.js';

test.describe('signed out', () => {
	test.use({ apiOptions: { signedIn: false } });

	test('a protected route sends to the login with the URL to return to', async ({ page, api }) => {
		await page.goto('/settings?tab=about');

		await expect(page).toHaveURL('/login?redirect=%2Fsettings%3Ftab%3Dabout');
		await expect(page.getByText('CE', { exact: true })).toBeVisible();
		await expect(page.getByText('3.10.0', { exact: true })).toBeVisible();

		await page.getByLabel('Username').fill('admin');
		await page.getByLabel('Password', { exact: true }).fill('secret');
		await page.getByLabel('Password', { exact: true }).press('Enter');

		await expect(page).toHaveURL('/settings?tab=about');
		expect(api.calls()).toContain('POST auth/login');
	});

	test('an unknown path while signed out returns to it after the login', async ({ page }) => {
		await page.goto('/nowhere');

		await expect(page).toHaveURL('/login?redirect=%2Fnowhere');
	});

	test.describe('with wrong credentials', () => {
		test.use({ apiOptions: { signedIn: false, login: 'invalid' } });

		test('shows the error, clears the password and focuses the username', async ({ page }) => {
			await page.goto('/login');
			await page.getByLabel('Username').fill('admin');
			await page.getByLabel('Password', { exact: true }).fill('wrong');
			await page.getByRole('button', { name: 'Sign in' }).click();

			await expect(page.getByRole('alert')).toHaveText('Invalid username or password');
			await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
			await expect(page.getByLabel('Username')).toBeFocused();
		});
	});

	test.describe('when rate limited', () => {
		test.use({ apiOptions: { signedIn: false, login: 'rate-limited', retryAfter: 2 } });

		test('counts down and enables the form again', async ({ page }) => {
			await page.goto('/login');
			await page.getByLabel('Username').fill('admin');
			await page.getByLabel('Password', { exact: true }).fill('secret');
			await page.getByRole('button', { name: 'Sign in' }).click();

			await expect(page.getByRole('alert')).toHaveText('Too many attempts, try again in 2 s');
			await expect(page.getByRole('button', { name: 'Sign in' })).toBeDisabled();
			await expect(page.getByRole('alert')).toHaveText('Too many attempts, try again in 1 s');
			await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled({ timeout: 5_000 });
		});
	});

	test.describe('when the server is unreachable', () => {
		test.use({ apiOptions: { signedIn: false, login: 'unreachable' } });

		test('shows a banner with retry', async ({ page }) => {
			await page.goto('/login');
			await page.getByLabel('Username').fill('admin');
			await page.getByLabel('Password', { exact: true }).fill('secret');
			await page.getByRole('button', { name: 'Sign in' }).click();

			await expect(page.getByText('The server is unreachable.')).toBeVisible();
			await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
		});
	});
});

test('a reload restores the session silently', async ({ page, api }) => {
	await page.goto('/settings');
	await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();

	await page.reload();

	await expect(page).toHaveURL('/settings');
	await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
	expect(api.calls().filter((call) => call === 'POST auth/refresh')).toHaveLength(2);
	expect(api.calls()).not.toContain('POST auth/login');
});

test('an expired token is refreshed once and the requests are replayed', async ({ page, api }) => {
	await page.goto('/overview');
	await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();

	const refreshes = api.calls().filter((call) => call === 'POST auth/refresh').length;

	api.expireToken();
	await page.getByRole('combobox', { name: 'Search' }).fill('dem');

	await expect.poll(() => api.calls().filter((call) => call === 'GET rooms').length).toBe(2);
	expect(api.calls().filter((call) => call === 'POST auth/refresh')).toHaveLength(refreshes + 1);
	expect(api.calls().filter((call) => call === 'GET participants')).toHaveLength(2);
	await expect(page).toHaveURL('/overview?tz=Europe%2FMadrid');
});

test('sign out ends the session and shows the login without redirect', async ({ page, api }) => {
	await page.goto('/rooms');
	await page.getByRole('button', { name: 'User menu' }).click();
	await page.getByRole('menuitem', { name: 'Sign out' }).click();

	await expect(page).toHaveURL('/login');
	expect(api.calls()).toContain('POST auth/logout');
});

test('an authenticated user opening the login goes to the redirect target', async ({ page }) => {
	await page.goto('/login?redirect=%2Fsettings');

	await expect(page).toHaveURL('/settings');
});
