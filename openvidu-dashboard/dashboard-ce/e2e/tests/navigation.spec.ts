import { expect, test } from '../fixtures/api.js';

test('the sidenav lists the entries in order with their links', async ({ page, api }) => {
	await page.goto('/overview');

	const entries = page.getByRole('navigation', { name: 'Main' }).getByRole('listitem');

	await expect(entries).toHaveText([
		'Overview',
		'Analytics',
		'Rooms',
		'Participants',
		'Agents',
		'Egress',
		'Ingress',
		'Settings'
	]);
	await expect(page.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
	expect(api.calls()).toContain('GET info');
});

test('a range-scoped route opened without range gets the default preset in the browser zone', async ({ page }) => {
	await page.goto('/rooms');

	await expect(page).toHaveURL('/rooms?from=now-24h&to=now&tz=Europe%2FMadrid');
	await expect(page.getByRole('button', { name: /Time range: Last 24 hours/ })).toBeVisible();
});

test('presets and a custom range are written to the URL', async ({ page }) => {
	await page.goto('/analytics?from=now-24h&to=now&tz=UTC');
	await page.getByRole('button', { name: /Time range/ }).click();
	await page.getByRole('button', { name: 'Last 7 days' }).click();

	await expect(page).toHaveURL('/analytics?from=now-7d&to=now&tz=UTC');

	await page.getByRole('button', { name: /Time range/ }).click();
	await page.getByLabel('From date').fill('2026-10-01');
	await page.getByLabel('From time').fill('00:00');
	await page.getByLabel('To date').fill('2026-10-02');
	await page.getByLabel('To time').fill('00:00');
	await page.getByRole('button', { name: 'Apply' }).click();

	await expect(page).toHaveURL('/analytics?from=2026-10-01T00:00Z&to=2026-10-02T00:00Z&tz=UTC');
});

test('the custom range refuses an end before its start', async ({ page }) => {
	await page.goto('/analytics?from=now-24h&to=now&tz=UTC');
	await page.getByRole('button', { name: /Time range/ }).click();
	await page.getByLabel('From date').fill('2026-10-02');
	await page.getByLabel('From time').fill('00:00');
	await page.getByLabel('To date').fill('2026-10-01');
	await page.getByLabel('To time').fill('00:00');
	await page.getByRole('button', { name: 'Apply' }).click();

	await expect(page.getByText('End must be after start')).toBeVisible();
	await expect(page).toHaveURL('/analytics?from=now-24h&to=now&tz=UTC');
});

test('the range follows the sidenav to the next range-scoped page', async ({ page }) => {
	await page.goto('/analytics?from=now-7d&to=now&tz=UTC');
	await page.getByRole('link', { name: 'Rooms' }).click();

	await expect(page).toHaveURL('/rooms?from=now-7d&to=now&tz=UTC');

	await page.getByRole('link', { name: 'Settings' }).click();
	await expect(page).toHaveURL('/settings');
});

test('invalid parameters are replaced silently', async ({ page }) => {
	await page.goto('/rooms?from=now-1h&to=now&tz=UTC&limit=7&order=sideways&status=active');

	await expect(page).toHaveURL('/rooms?from=now-1h&to=now&tz=UTC&status=active');
	await expect(page.getByRole('heading', { level: 1, name: 'Rooms' })).toBeVisible();
});

test('the UTC toggle writes tz=UTC and back to the browser zone', async ({ page }) => {
	await page.goto('/rooms?from=now-1h&to=now&tz=Europe%2FMadrid');
	await page.getByRole('button', { name: /Time range/ }).click();
	await page.getByRole('switch', { name: 'UTC' }).click();

	await expect(page).toHaveURL('/rooms?from=now-1h&to=now&tz=UTC');

	await page.getByRole('switch', { name: 'UTC' }).click();
	await expect(page).toHaveURL('/rooms?from=now-1h&to=now&tz=Europe%2FMadrid');
});

test('locked detail routes show neither the range picker nor the refresh control', async ({ page }) => {
	for (const path of ['/egress/EG_a1b2', '/rooms/RM_ab12cd', '/participants/PA_x1y2']) {
		await page.goto(path);
		await expect(page.locator('ovd-pro-lock-overlay')).toBeVisible();
		await expect(page.getByRole('button', { name: /Time range/ })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Refresh now' })).toHaveCount(0);
	}
});
