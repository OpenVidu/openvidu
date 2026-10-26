import { expect, test } from '@playwright/test';

import { FAILED_INGRESS, IDLE_INGRESS, INGRESS_USER_INFO, LEAKING_INGRESS, SENTINEL } from '../scripts/seed-rooms.mjs';

test('ingress against the real backend: seeded list, filters, the locked detail and no credential', async ({
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

	await page.goto('/login?redirect=%2Fingress%3Ffrom%3Dnow-7d%26to%3Dnow%26tz%3DUTC');
	await page.getByLabel('Username').fill('admin');
	await page.getByLabel('Password', { exact: true }).fill('e2e-admin-password');
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/ingress\?/);

	const table = page.getByRole('table', { name: 'Ingress' });

	await expect(table.getByRole('row', { name: new RegExp(IDLE_INGRESS) })).toContainText('idle');
	await expect(
		table
			.getByRole('row', { name: new RegExp(FAILED_INGRESS) })
			.getByRole('img', { name: 'Last session ended with an error' })
	).toBeVisible();
	await expect(table.getByRole('row', { name: new RegExp(LEAKING_INGRESS) })).toBeVisible();

	await page.getByRole('combobox', { name: 'Input' }).click();
	await page.getByRole('option', { name: 'WHIP' }).click();
	await expect(page).toHaveURL(/inputType=whip/);
	await expect(table.getByRole('row', { name: new RegExp(FAILED_INGRESS) })).toHaveCount(0);

	await page.goto(`/ingress/${LEAKING_INGRESS}`);
	await expect(page.getByRole('heading', { level: 1, name: 'leaky-cam' })).toBeVisible();
	await expect(page.getByText('Ingress detail is available in OpenVidu PRO')).toBeVisible();
	expect(bodies.length).toBeGreaterThan(0);
	expect(bodies.filter((body) => body.includes(SENTINEL) || body.includes(INGRESS_USER_INFO))).toEqual([]);
});
