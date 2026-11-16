import { expect, test } from '../fixtures/api.js';
import { activeStatus } from '../fixtures/overview.js';

test('preferences persist across reloads and reset to the defaults', async ({ page }) => {
	await page.goto('/settings');
	await page.getByLabel('Rows per page').click();
	await page.getByRole('option', { name: '50' }).click();
	await expect(page.getByText('Saved')).toBeVisible();
	await page.getByRole('radio', { name: 'Dark' }).check();

	await page.reload();
	await expect(page.getByLabel('Rows per page')).toHaveText('50');
	await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

	await page.getByRole('button', { name: 'Reset to defaults' }).click();
	await expect(page.getByLabel('Rows per page')).toHaveText('25');
	await expect(page.getByRole('radio', { name: 'System' })).toBeChecked();
	expect(await page.evaluate(() => localStorage.getItem('ovd.prefs.v1'))).toBeNull();
});

test('the default preset preference applies to a bare range-scoped route', async ({ page }) => {
	await page.goto('/settings');
	await page.getByLabel('Default time range').click();
	await page.getByRole('option', { name: 'Last 7 days' }).click();
	// "Another zone" starts from UTC.
	await page.getByRole('radio', { name: 'Another zone' }).check();

	await page.goto('/egress');
	await expect(page).toHaveURL('/egress?from=now-7d&to=now&tz=UTC');
});

test('Data shows the storage per data class, the collections of a class and no version line', async ({ page }) => {
	await page.goto('/settings?tab=data');

	const data = page.locator('ovd-data-tab');

	await expect(page.getByRole('tab', { name: 'Data' })).toBeFocused();
	await expect(page.getByRole('tab', { name: 'About' })).toHaveCount(0);
	await expect(data.getByRole('row', { name: 'Events 7 days' })).toBeVisible();
	await expect(data.getByRole('row', { name: 'Daily rollups Kept forever' })).toBeVisible();
	await expect(data).not.toContainText('OpenVidu 3.10.0');
	await expect(data.locator('ovd-edition-badge')).toHaveCount(0);
	await expect(data).not.toContainText('openvidu-livekit');
	await expect(data).not.toContainText('Schema');
	await expect(data).not.toContainText('Migration');
	await expect(data).not.toContainText('schema_meta');
	await expect(data).toContainText('Retention is set in openvidu.analytics.retention');

	await data.getByRole('button', { name: 'Show collections of Entities' }).click();
	await expect(data.getByRole('button', { name: 'Hide collections of Entities' })).toHaveAttribute(
		'aria-expanded',
		'true'
	);
	await expect(data.getByRole('row', { name: /rooms 1,203/ })).toBeVisible();
	await expect(page).toHaveURL('/settings?tab=data');
	await expect(page.getByRole('link', { name: /OpenAPI/ })).toHaveCount(0);
});

const ENTITIES_TIP = /^12 of 90 days so far · ≈ [\d.]+ MB at full retention \(estimate\)$/;

test('Retention tip by keyboard', async ({ page }) => {
	await page.goto('/settings?tab=data');

	const tip = page.getByRole('button', { name: 'About Entities retention' });

	await page.getByRole('button', { name: 'Show collections of Entities' }).focus();
	await page.keyboard.press('Tab');
	await expect(tip).toBeFocused();
	await expect(page.locator('.mat-mdc-tooltip')).toHaveText(ENTITIES_TIP);
	await expect(tip).toHaveAccessibleDescription(ENTITIES_TIP);

	await page.keyboard.press('Escape');
	await expect(page.locator('.mat-mdc-tooltip')).toHaveCount(0);
});

test.describe('on a phone', () => {
	test.use({ viewport: { width: 375, height: 740 }, hasTouch: true });

	test('Retention tip on a phone', async ({ page }) => {
		await page.goto('/settings?tab=data');

		const tip = page.getByRole('button', { name: 'About Entities retention' });
		const tooltip = page.locator('.mat-mdc-tooltip');

		await tip.tap();
		await expect(tooltip).toHaveText(ENTITIES_TIP);

		const box = await tooltip.boundingBox();

		expect(box?.x).toBeGreaterThanOrEqual(0);
		expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(375);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

		await tip.tap();
		await expect(tooltip).toHaveCount(0);
	});
});

test.describe('incompatible writer', () => {
	test.use({
		apiOptions: {
			info: { schema: { dashboard: 2, writer: 3, status: 'newer' }, openapiDocsEnabled: true },
			status: () => ({ ...activeStatus(), schema: { dashboard: 2, writer: 3, status: 'newer' } })
		}
	});

	test('warns about the schema in the shell and links the OpenAPI document from the sidenav', async ({ page }) => {
		await page.goto('/settings?tab=data');

		await expect(page.locator('ovd-data-tab')).not.toContainText('Schema');
		await expect(page.getByRole('alert').filter({ hasText: 'newer than v2' })).toBeVisible();
		await expect(page.locator('ovd-sidenav-footer').getByRole('link', { name: /OpenAPI/ })).toHaveAttribute(
			'href',
			'api/v1/docs'
		);
	});
});

test.describe('migration running', () => {
	const migration = { state: 'running', progress: { processed: 300_000, total: 1_200_000 } } as const;

	test.use({
		apiOptions: { info: { migration }, status: () => activeStatus(Date.now(), 4_000, migration) }
	});

	test('shows the progress and polls the server status every 10 s, not the info document', async ({ page, api }) => {
		await page.clock.install();
		await page.goto('/settings?tab=data');

		await expect(page.locator('ovd-data-tab').getByText('300,000 / 1,200,000 records (25 %)')).toBeVisible();
		await expect(page.getByRole('progressbar', { name: 'Migration progress' }).first()).toBeVisible();

		const count = (call: string) => api.calls().filter((made) => made === call).length;
		const reads = count('GET info');
		const polls = count('GET status');

		await page.clock.fastForward('00:11');
		await expect.poll(() => count('GET status')).toBe(polls + 1);
		expect(count('GET info')).toBe(reads);
	});
});

test.describe('info unavailable', () => {
	test.use({ apiOptions: { infoFails: true } });

	test('shows the message with retry and keeps Preferences usable', async ({ page, api }) => {
		await page.goto('/settings?tab=data');

		await expect(page.getByText('Server info unavailable')).toBeVisible();

		const reads = api.calls().filter((call) => call === 'GET info').length;

		await page.getByRole('button', { name: 'Retry' }).first().click();
		await expect.poll(() => api.calls().filter((call) => call === 'GET info').length).toBe(reads + 1);

		await page.getByRole('tab', { name: 'Preferences' }).click();
		await expect(page).toHaveURL('/settings?tab=preferences');
		await expect(page.getByLabel('Rows per page')).toBeVisible();
	});
});
