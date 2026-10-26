import { expect, test } from '../fixtures/api.js';
import { expectNoViolations } from '../fixtures/axe.js';

for (const scheme of ['light', 'dark'] as const) {
	test.describe(`axe in the ${scheme} theme`, () => {
		test.use({ colorScheme: scheme });

		test('settings, both tabs', async ({ page }) => {
			await page.goto('/settings?tab=preferences');
			await expect(page.getByLabel('Rows per page')).toBeVisible();
			await expectNoViolations(page);

			await page.goto('/settings?tab=about');
			await expect(page.getByRole('row', { name: 'Events 7 days' })).toBeVisible();
			await expectNoViolations(page);
		});

		test('a locked page and the overview', async ({ page }) => {
			await page.goto('/rooms/RM_ab12cd');
			await expect(page.getByText('Room detail is available in OpenVidu PRO')).toBeVisible();
			await expectNoViolations(page);

			await page.goto('/overview');
			await expect(page.getByRole('region', { name: 'Live' })).toContainText('Active rooms 12');
			await expectNoViolations(page);
		});

		test.describe('signed out', () => {
			test.use({ apiOptions: { signedIn: false } });

			test('login', async ({ page }) => {
				await page.goto('/login');
				await expect(page.getByLabel('Username')).toBeVisible();
				await expectNoViolations(page);
			});
		});
	});
}

test('landmarks and a single h1', async ({ page }) => {
	await page.goto('/overview');

	await expect(page.getByRole('banner')).toHaveCount(1);
	await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(1);
	await expect(page.getByRole('main')).toHaveCount(1);
	await expect(page.getByRole('contentinfo')).toHaveCount(0);
	await expect(page.locator('h1')).toHaveCount(1);
});

test('focus order starts with the skip link, then the header, then the sidenav', async ({ page }) => {
	await page.goto('/overview');
	await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();

	await page.keyboard.press('Tab');
	await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
	await page.keyboard.press('Tab');
	await expect(page.getByRole('button', { name: 'Toggle navigation' })).toBeFocused();

	const order: string[] = [];

	for (let step = 0; step < 12; step++) {
		await page.keyboard.press('Tab');
		order.push(
			await page.evaluate(() => {
				const active = document.activeElement;

				return active?.closest('ovd-header')
					? 'header'
					: active?.closest('ovd-navigation-list')
						? 'sidenav'
						: active?.closest('main')
							? 'main'
							: 'other';
			})
		);
	}

	const firstSidenav = order.indexOf('sidenav');

	expect(firstSidenav).toBeGreaterThan(0);
	expect(order.slice(0, firstSidenav).every((area) => area === 'header')).toBe(true);
});

test('the skip link moves focus to the main landmark', async ({ page }) => {
	await page.goto('/overview');
	await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
	await page.keyboard.press('Tab');
	await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
	await page.keyboard.press('Enter');

	await expect(page.getByRole('main')).toBeFocused();
});

test('slash focuses the global search outside text fields', async ({ page }) => {
	await page.goto('/overview');
	await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
	await page.getByRole('heading', { level: 1 }).click();
	await page.keyboard.press('/');

	await expect(page.getByRole('combobox', { name: 'Search' })).toBeFocused();
});

test('a route change moves focus to the page title', async ({ page }) => {
	await page.goto('/overview');
	await page.getByRole('link', { name: 'Settings' }).focus();
	await page.keyboard.press('Enter');

	await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeFocused();
});

test('Escape closes a menu and returns focus to its trigger', async ({ page }) => {
	await page.goto('/overview');
	await page.getByRole('button', { name: 'User menu' }).click();
	await expect(page.getByRole('menuitem', { name: 'Sign out' })).toBeVisible();
	await page.keyboard.press('Escape');

	await expect(page.getByRole('menuitem', { name: 'Sign out' })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'User menu' })).toBeFocused();
});

test.describe('reduced motion', () => {
	test.use({ reducedMotion: 'reduce' });

	test('disables transitions and animations', async ({ page }) => {
		await page.goto('/overview');

		const duration = await page
			.getByRole('button', { name: 'Toggle navigation' })
			.evaluate((element) => getComputedStyle(element).transitionDuration);

		expect(duration.split(',').every((value) => parseFloat(value) <= 0.001)).toBe(true);
	});
});
