import { expect, test } from '../fixtures/api.js';

// Headless Chromium hides the scrollbars; desktop browsers on Windows and Linux take room for them.
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

test('the header settles on the compact range picker when the full one does not fit', async ({ page }) => {
	const picker = page.locator('ovd-header ovd-date-time-range-picker');

	await page.setViewportSize({ width: 1280, height: 1000 });
	await page.goto('/analytics?from=now-24h&to=now&tz=UTC');
	await expect(page.locator('ovd-refresh-control .updated')).not.toBeEmpty();
	await expect(picker.locator('.absolute')).toHaveCount(0);

	const changes = await picker.evaluate(
		(element) =>
			new Promise<number>((resolve) => {
				let count = 0;
				const observer = new MutationObserver((records) => (count += records.length));

				observer.observe(element, { attributes: true, childList: true, subtree: true });
				setTimeout(() => {
					observer.disconnect();
					resolve(count);
				}, 1000);
			})
	);

	expect(changes).toBe(0);
	expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(
		0
	);
});
