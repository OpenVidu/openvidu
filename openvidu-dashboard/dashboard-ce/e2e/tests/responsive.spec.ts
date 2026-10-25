import { expect, type Page, test } from '../fixtures/api.js';

async function noHorizontalScroll(page: Page): Promise<void> {
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

	expect(overflow).toBeLessThanOrEqual(0);
}

async function sidenavWidth(page: Page): Promise<number> {
	return page.locator('mat-sidenav').evaluate((element) => element.getBoundingClientRect().width);
}

for (const width of [1920, 1280]) {
	test(`${String(width)} px keeps the sidenav open beside the content`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/rooms?from=now-24h&to=now&tz=UTC');

		await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
		expect(await sidenavWidth(page)).toBe(240);
		await expect(page.getByRole('combobox', { name: 'Search' })).toBeVisible();
		await noHorizontalScroll(page);

		await page.getByRole('button', { name: 'Toggle navigation' }).click();
		await expect.poll(() => sidenavWidth(page)).toBe(72);
		await page.reload();
		await expect.poll(() => sidenavWidth(page)).toBe(72);
	});
}

test('960 px shows a rail that the burger expands over the content', async ({ page }) => {
	await page.setViewportSize({ width: 960, height: 800 });
	await page.goto('/rooms?from=now-24h&to=now&tz=UTC');

	expect(await sidenavWidth(page)).toBe(72);

	const contentLeft = await page.locator('main').evaluate((element) => element.getBoundingClientRect().left);

	await page.getByRole('button', { name: 'Toggle navigation' }).click();
	await expect.poll(() => sidenavWidth(page)).toBe(240);
	expect(await page.locator('main').evaluate((element) => element.getBoundingClientRect().left)).toBe(contentLeft);
	await noHorizontalScroll(page);
});

test('header controls share one centre line and one spacing', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/rooms?from=now-24h&to=now&tz=UTC');

	const row = page.locator('ovd-header .brand-row');
	const boxes = await Promise.all(
		[
			row.getByRole('button', { name: 'Refresh now' }),
			row.locator('ovd-refresh-control .interval-icon'),
			row.locator('ovd-theme-toggle button'),
			row.getByRole('button', { name: 'User menu' })
		].map(async (control) => {
			const box = await control.boundingBox();

			expect(box).not.toBeNull();

			return box ?? { x: 0, y: 0, width: 0, height: 0 };
		})
	);
	const centres = boxes.map((box) => box.y + box.height / 2);
	const gaps = boxes.slice(1).map((box, index) => {
		const previous = boxes[index] ?? box;

		return box.x - (previous.x + previous.width);
	});

	for (const centre of centres) {
		expect(Math.abs(centre - (centres[0] ?? 0))).toBeLessThanOrEqual(0.5);
	}

	for (const gap of gaps) {
		expect(Math.abs(gap - (gaps[0] ?? 0))).toBeLessThanOrEqual(0.5);
	}
});

for (const width of [600, 375, 320]) {
	test(`${String(width)} px uses a closed drawer and keeps the page within the viewport`, async ({ page }) => {
		await page.setViewportSize({ width, height: 800 });
		await page.goto('/rooms?from=now-24h&to=now&tz=UTC');

		await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
		await noHorizontalScroll(page);

		await page.getByRole('button', { name: 'Toggle navigation' }).click();
		await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
		// The drawer handles Escape once it has moved the focus inside, after its open transition.
		await expect(page.locator('mat-sidenav :focus')).toHaveCount(1);
		await page.keyboard.press('Escape');
		await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();

		if (width < 600) {
			await expect(page.locator('ovd-header .range-row')).toBeVisible();
			await expect(page.getByRole('button', { name: 'More actions' })).toBeVisible();
		} else {
			await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
		}
	});
}

test.describe('touch', () => {
	test.use({ viewport: { width: 375, height: 800 }, hasTouch: true, isMobile: true });

	test('header targets are at least 44 px', async ({ page }) => {
		await page.goto('/rooms?from=now-24h&to=now&tz=UTC');

		for (const name of ['Toggle navigation', 'Search', 'More actions', 'Refresh now']) {
			// Material icon buttons extend their touch area beyond the visible 40 px circle.
			const box = await page.getByRole('button', { name }).locator('.mat-mdc-button-touch-target').boundingBox();

			expect(box?.width ?? 0, name).toBeGreaterThanOrEqual(44);
			expect(box?.height ?? 0, name).toBeGreaterThanOrEqual(44);
		}
	});
});
