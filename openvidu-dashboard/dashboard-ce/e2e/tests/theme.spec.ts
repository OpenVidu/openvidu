import { expect, test } from '../fixtures/api.js';

const DARK_SURFACE = 'rgb(15, 20, 22)';
const LIGHT_SURFACE = 'rgb(248, 250, 251)';

test('the toggle cycles system → light → dark and the choice survives a reload', async ({ page }) => {
	await page.goto('/overview');

	const toggle = page.getByRole('button', { name: /^Theme:/ });
	const html = page.locator('html');

	await expect(toggle).toHaveAccessibleName('Theme: system');
	await expect(html).not.toHaveAttribute('data-theme');
	await toggle.click();
	await expect(html).toHaveAttribute('data-theme', 'light');
	await toggle.click();
	await expect(html).toHaveAttribute('data-theme', 'dark');

	await page.reload();
	await expect(html).toHaveAttribute('data-theme', 'dark');
	await expect(page.getByRole('button', { name: 'Theme: dark' })).toBeVisible();

	await page.getByRole('button', { name: 'Theme: dark' }).click();
	await expect(html).not.toHaveAttribute('data-theme');
});

test('a stored dark theme applies before the application starts', async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem('ovd.prefs.v1', JSON.stringify({ version: 1, theme: 'dark' }));
	});

	let release: () => void = () => undefined;
	const held = new Promise<void>((resolve) => {
		release = resolve;
	});

	await page.route(/\/main-[^/]*\.js$/, async (route) => {
		await held;
		await route.continue();
	});

	// The application script is held, so this is what the browser paints before Angular starts.
	await page.goto('/overview', { waitUntil: 'commit' });
	await page.waitForFunction(() => {
		const body = document.body as HTMLElement | null;

		return body !== null && getComputedStyle(body).backgroundColor !== 'rgba(0, 0, 0, 0)';
	});

	expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('dark');
	expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(DARK_SURFACE);
	expect(await page.locator('ovd-root').innerHTML()).toBe('');

	release();
	await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
});

test('system mode follows the operating system without reload', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'light' });
	await page.goto('/overview');
	await expect(page.locator('body')).toHaveCSS('background-color', LIGHT_SURFACE);

	await page.emulateMedia({ colorScheme: 'dark' });
	await expect(page.locator('body')).toHaveCSS('background-color', DARK_SURFACE);
});

for (const scheme of ['light', 'dark'] as const) {
	test.describe(`${scheme} baseline`, () => {
		test.use({ colorScheme: scheme, viewport: { width: 1280, height: 800 }, timezoneId: 'UTC' });

		test('of the shell', async ({ page }) => {
			await page.clock.setFixedTime(new Date('2026-10-13T12:00:00Z'));
			await page.goto('/settings?tab=preferences');
			await expect(page.getByLabel('Rows per page')).toBeVisible();

			await expect(page).toHaveScreenshot(`shell-${scheme}.png`, { animations: 'disabled', caret: 'hide' });
		});
	});
}
