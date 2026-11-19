import { expect, test } from '@playwright/test';

test('Events deletion accepted: against the real backend', async ({ page }) => {
	await page.goto('/login?redirect=%2Fsettings%3Ftab%3Ddata');
	await page.getByLabel('Username').fill('admin');
	await page.getByLabel('Password', { exact: true }).fill('e2e-admin-password');
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL('/settings?tab=data');

	const events = page
		.locator('ovd-data-tab table.classes > tbody > tr')
		.filter({ has: page.getByRole('button', { name: 'Show collections of Events' }) });
	const documents = events.locator(':scope > td').nth(1);
	const count = async () => Number((await documents.innerText()).replaceAll(',', ''));

	await expect(documents).toHaveText(/^[\d,]+$/);

	// The seeded events of the closed rooms ended more than 5 minutes ago: the deletion takes them.
	const before = await count();

	expect(before).toBeGreaterThan(0);

	await page.getByRole('button', { name: 'Delete Events' }).click();
	await page
		.getByRole('dialog', { name: 'Delete events?' })
		.getByRole('button', { name: 'Delete', exact: true })
		.click();

	// The status follows the job every 10 s while it runs, and the info document is read again once it ends.
	await expect(events.locator('th .sub')).toHaveText(/^Deleted \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, { timeout: 30_000 });
	expect(await count()).toBeLessThan(before);
	await expect(page.locator('ovd-data-tab section.deletion')).toHaveCount(0);
});
