import { expect, test } from '../fixtures/api.js';

test('CE shows no locked sidenav entry and the full-page lock on PRO routes without requesting them', async ({
	page,
	api
}) => {
	await page.goto('/overview');

	await expect(page.getByRole('navigation', { name: 'Main' }).getByLabel('OpenVidu PRO')).toHaveCount(0);

	for (const [path, title] of [
		['/rooms/RM_ab12cd', 'Room detail'],
		['/participants/PA_x1y2', 'Participant detail'],
		['/egress/EG_a1b2', 'Egress detail'],
		['/ingress/IN_c3d4', 'Ingress detail']
	] as const) {
		await page.goto(path);
		await expect(page.getByText(`${title} is available in OpenVidu PRO`)).toBeVisible();
		await expect(page.getByRole('link', { name: 'Learn about OpenVidu PRO' })).toHaveAttribute('target', '_blank');
		await expect(page.locator('ovd-pro-lock-overlay .backdrop .tile')).toHaveCount(3);
		await expect(page.locator('ovd-pro-lock-overlay .backdrop .block')).toHaveCount(1);
		await expect(page.locator('.title ovd-copy-button')).toHaveCount(1);
		await expect(page.getByRole('button', { name: 'Refresh now' })).toHaveCount(0);
	}

	const detailCalls = api.calls().filter((call) => /^GET (rooms|participants|egresses|ingresses)\//.test(call));

	expect(detailCalls).toEqual([]);
});

test.describe('PRO', () => {
	test.use({ apiOptions: { edition: 'pro' } });

	test('shows no locks', async ({ page }) => {
		await page.goto('/overview');

		await expect(page.getByRole('navigation', { name: 'Main' }).getByLabel('OpenVidu PRO')).toHaveCount(0);
		await expect(page.getByText('PRO', { exact: true })).toBeVisible();

		await page.goto('/rooms/RM_ab12cd');
		await expect(page.getByText('is available in OpenVidu PRO')).toHaveCount(0);
	});

	test('a 403 PRO_FEATURE re-reads the feature flags and renders the lock', async ({ page, api }) => {
		await page.goto('/rooms/RM_ab12cd');
		await expect(page.getByText('Coming in this release')).toBeVisible();

		const infoReads = api.calls().filter((call) => call === 'GET info').length;

		api.downgrade('rooms');
		await page.getByRole('combobox', { name: 'Search' }).fill('dem');

		await expect(page.getByText('Room detail is available in OpenVidu PRO')).toBeVisible();
		expect(api.calls().filter((call) => call === 'GET info').length).toBeGreaterThan(infoReads);
	});
});
