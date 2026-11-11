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
	// mouseleave that follows would close a tooltip still opening, as on a slow runner. The page title has no tooltip.
	const title = await page.getByRole('heading', { level: 1, name: 'Overview' }).boundingBox();

	await page.mouse.move((title?.x ?? 0) + 4, (title?.y ?? 0) + 4);

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

	await page.getByRole('button', { name: 'About Active rooms' }).click();
	await expect(tooltip(page)).toHaveText(
		'The most rooms open at the same time in each bucket, sampled every minute.'
	);
	await page.keyboard.press('Escape');
	await page.getByRole('button', { name: 'About Active participants' }).click();
	await expect(tooltip(page)).toHaveText(
		'The most participants connected at the same time in each bucket, sampled every minute. Only regular participants count.'
	);
	await page.keyboard.press('Escape');
	await page.getByRole('button', { name: 'About Active egress' }).click();
	await expect(tooltip(page)).toHaveText(
		'The most egress in progress at the same time in each bucket, sampled every minute.'
	);
	await page.keyboard.press('Escape');
	await page.getByRole('button', { name: 'About Active ingress' }).click();
	await expect(tooltip(page)).toHaveText(
		'The most ingress sessions publishing at the same time in each bucket, sampled every minute.'
	);
	await page.keyboard.press('Escape');
	// The summary tile and the chart of the Participants section.
	await expect(page.getByRole('button', { name: 'About Participant sessions' })).toHaveCount(2);

	const rooms = page
		.locator('ovd-analytics-card')
		.filter({ has: page.getByRole('heading', { level: 2, name: 'Rooms', exact: true }) });

	await rooms.getByRole('button', { name: 'About Room topology' }).click();
	await expect(tooltip(page)).toHaveText(
		'Rooms ended in each bucket by their shape, from the most regular participants connected at once (N) and the most of them sending audio or video at once (P): Empty (N = 0), Single participant (N = 1), No publishers (P = 0), 1:1 (N = 2), 1:N (one sender, N ≥ 3) and N:M (several senders, N ≥ 3). A muted track counts once unmuted; agents, ingress and SIP participants do not count.'
	);
	await page.keyboard.press('Escape');
	// The tile and the chart.
	await expect(rooms.getByRole('button', { name: 'About Recorded rooms' })).toHaveCount(2);
	await rooms.getByRole('button', { name: 'About Recorded rooms' }).first().click();
	await expect(tooltip(page)).toHaveText(
		'Share of the rooms ended in the range that were recorded: an egress with a file or HLS output started recording. Live streams and images alone do not count.'
	);
	await page.keyboard.press('Escape');
	await rooms.getByRole('button', { name: 'About Recorded rooms' }).last().click();
	await expect(tooltip(page)).toHaveText(
		'Share of the rooms ended in each bucket that were recorded: an egress with a file or HLS output started recording. Live streams and images alone do not count.'
	);
	await page.keyboard.press('Escape');
	await rooms.getByRole('button', { name: 'About Room size by topology' }).click();
	await expect(tooltip(page)).toHaveText(
		'Rooms ended in the range with several participants, by the most regular participants connected at once.'
	);
	await page.keyboard.press('Escape');
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
