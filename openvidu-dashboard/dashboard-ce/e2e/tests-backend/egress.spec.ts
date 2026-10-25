import { expect, test } from '@playwright/test';

import { LEAKING_EGRESS, RECONCILED_EGRESS, SENTINEL, WEB_EGRESS } from '../scripts/seed-rooms.mjs';

test('egress against the real backend: seeded list, filters, the locked detail and no stored credential', async ({
	page
}) => {
	const bodies: string[] = [];

	page.on('response', (response) => {
		if (response.url().includes('/api/v1/') && response.status() === 200) {
			void response.text().then(
				(text) => bodies.push(text),
				() => undefined
			);
		}
	});

	await page.goto('/login?redirect=%2Fegress%3Ffrom%3Dnow-7d%26to%3Dnow%26tz%3DUTC');
	await page.getByLabel('Username').fill('admin');
	await page.getByLabel('Password', { exact: true }).fill('e2e-admin-password');
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/egress\?/);

	const table = page.getByRole('table', { name: 'Egress' });

	await expect(table.getByRole('row', { name: new RegExp(LEAKING_EGRESS) })).toContainText('complete');
	await expect(table.getByRole('row', { name: new RegExp(WEB_EGRESS) })).toContainText('—');
	await expect(
		table.getByRole('row', { name: new RegExp(RECONCILED_EGRESS) }).locator('ovd-status-badge .estimated')
	).toBeVisible();
	await expect(
		table.getByRole('row', { name: new RegExp(RECONCILED_EGRESS) }).getByRole('img', { name: /Egress failed/ })
	).toHaveCount(0);
	await expect(page.getByRole('region', { name: 'Summary' })).toContainText('Recorded time');

	await page.getByRole('combobox', { name: 'Status' }).click();
	await page.getByRole('option', { name: 'Failed' }).click();
	await page.keyboard.press('Escape');
	await expect(page).toHaveURL(/status=failed/);
	await expect(table.getByRole('row', { name: new RegExp(LEAKING_EGRESS) })).toHaveCount(0);

	await page.goto(`/egress/${RECONCILED_EGRESS}`);
	await expect(page.getByRole('heading', { level: 1, name: RECONCILED_EGRESS })).toBeVisible();
	await expect(page.getByText('Egress detail is available in OpenVidu PRO')).toBeVisible();
	expect(bodies.length).toBeGreaterThan(0);
	expect(bodies.filter((body) => body.includes(SENTINEL))).toEqual([]);
});
