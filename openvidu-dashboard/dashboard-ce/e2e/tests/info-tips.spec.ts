import { expect, type Page, test } from '../fixtures/api.js';
import { expectNoViolations } from '../fixtures/axe.js';
import { ROOM_SUMMARY, ROOMS } from '../fixtures/rooms.js';

test.use({ apiOptions: { rooms: ROOMS, roomSummary: ROOM_SUMMARY } });

const PARTICIPANTS_NOW = 'Regular participants connected now. Egress, ingress and agents are not counted.';

function tooltip(page: Page) {
	return page.locator('.mat-mdc-tooltip');
}

test('an info tip shows on hover without opening the list its tile links to', async ({ page }) => {
	await page.goto('/overview?tz=UTC');

	const tiles = page.getByRole('region', { name: 'Live' });
	const tip = tiles.getByRole('button', { name: 'About Participants' });

	await tip.hover();
	await expect(tooltip(page)).toHaveText(PARTICIPANTS_NOW);
	await tip.click();
	await expect(page).toHaveURL(/\/overview/);

	await tiles.getByRole('link', { name: 'Participants' }).click();
	await expect(page).toHaveURL(/\/participants\?.*status=active/);
});

test('an info tip shows on keyboard focus and hides on Escape', async ({ page }) => {
	await page.goto('/overview?tz=UTC');
	// The pointer rests at the top-left corner, where the overlay renders the tooltip before positioning it: the
	// mouseleave that follows would close a tooltip still opening, as on a slow runner.
	await page.mouse.move(640, 700);

	const tiles = page.getByRole('region', { name: 'Live' });

	await tiles.getByRole('link', { name: 'Participants' }).focus();
	await page.keyboard.press('Tab');
	await expect(tiles.getByRole('button', { name: 'About Participants' })).toBeFocused();
	await expect(tooltip(page)).toHaveText(PARTICIPANTS_NOW);
	await page.keyboard.press('Escape');
	await expect(tooltip(page)).toHaveCount(0);
});

test('a column info tip never sorts the table', async ({ page }) => {
	await page.goto('/rooms?from=now-24h&to=now&tz=UTC');

	const header = page.getByRole('columnheader', { name: /Unique identities/ });

	await header.getByRole('button', { name: 'About Unique identities' }).click();
	await expect(tooltip(page)).toHaveText(
		'Distinct participant identities among those sessions: someone who joined three times counts once.'
	);
	await expect(page).not.toHaveURL(/sort=/);
	await page.mouse.move(0, 0);
	await expectNoViolations(page);
});

test('Analytics explains its terms and has no PRO divider', async ({ page }) => {
	await page.goto('/analytics?from=now-7d&to=now&tz=UTC');

	await expect(
		page.getByRole('region', { name: 'Summary' }).getByRole('button', { name: 'About Participant sessions' })
	).toBeVisible();
	await expect(page.getByRole('separator')).toHaveCount(0);
	await expect(page.getByText('PRO', { exact: true })).toHaveCount(0);
});

test.describe('touch', () => {
	test.use({ viewport: { width: 375, height: 800 }, hasTouch: true, isMobile: true });

	test('a tap toggles an info tip', async ({ page }) => {
		await page.goto('/overview?tz=UTC');

		const tip = page.getByRole('region', { name: 'Live' }).getByRole('button', { name: 'About Participants' });

		await tip.tap();
		await expect(tooltip(page)).toHaveText(PARTICIPANTS_NOW);
		await tip.tap();
		await expect(tooltip(page)).toHaveCount(0);
	});
});
