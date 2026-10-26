import { expect, test } from '@playwright/test';

test('participants against the real backend: seeded sessions, identity search and the locked detail', async ({
	page
}) => {
	await page.goto('/login?redirect=%2Fparticipants%3Ffrom%3Dnow-7d%26to%3Dnow%26tz%3DUTC');
	await page.getByLabel('Username').fill('admin');
	await page.getByLabel('Password', { exact: true }).fill('e2e-admin-password');
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/participants\?/);

	const table = page.getByRole('table', { name: 'Participants' });

	await expect(table.getByRole('row', { name: /alice/ })).toBeVisible();

	await page.getByLabel('Identity or SID').fill('bo');
	await expect(page).toHaveURL(/q=bo/);
	await expect(table.getByRole('row')).toHaveCount(3);

	await table.getByRole('row', { name: /bob/ }).first().getByRole('link', { name: /^PA_/ }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'bob' })).toBeVisible();
	await expect(page.getByText('Participant detail is available in OpenVidu PRO')).toBeVisible();
});
