import { expect, type Page, test } from '../fixtures/api.js';
import { PARTICIPANTS } from '../fixtures/participants.js';
import { ROOM_SUMMARY, ROOMS } from '../fixtures/rooms.js';

test.use({ apiOptions: { rooms: ROOMS, roomSummary: ROOM_SUMMARY, participants: PARTICIPANTS } });

function sidenav(page: Page, label: string) {
	return page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: label });
}

/** Picks `zone` from a zone select after typing `query` in it. */
async function pickZone(page: Page, field: ReturnType<Page['getByLabel']>, query: string, zone: string) {
	await field.fill(query);
	await page.getByRole('option', { name: zone, exact: true }).click();
}

test('the zone of a list follows the session to a detail, Overview and the next list', async ({ page }) => {
	await page.goto('/rooms?from=now-24h&to=now&tz=UTC');
	await page.getByRole('link', { name: 'RM_ab12cd' }).click();

	await expect(page).toHaveURL(/\/rooms\/RM_ab12cd\?tz=UTC$/);
	// A locked CE detail shows no zone chip.
	await expect(page.locator('ovd-header ovd-zone-chip')).toHaveCount(0);

	await sidenav(page, 'Overview').click();
	await expect(page).toHaveURL(/\/overview\?tz=UTC$/);
	await expect(page.locator('ovd-header ovd-zone-chip')).toContainText('UTC');
	await expect(page.getByText('Today (UTC, since 00:00)')).toBeVisible();

	await sidenav(page, 'Participants').click();
	await expect(page).toHaveURL(/\/participants\?.*tz=UTC/);
});

test('a reloaded detail keeps its zone for the next list', async ({ page }) => {
	await page.goto('/rooms/RM_ab12cd?tz=Asia%2FTokyo');
	await expect(page.getByText('Room detail is available in OpenVidu PRO')).toBeVisible();

	await sidenav(page, 'Participants').click();
	await expect(page).toHaveURL(/\/participants\?from=now-24h&to=now&tz=Asia%2FTokyo/);
});

test('the zone chip switches Overview to another zone', async ({ page, api }) => {
	await page.goto('/overview?tz=UTC');
	await page.locator('ovd-header ovd-zone-chip button').click();
	await expect(page.getByRole('menuitemradio', { name: 'UTC' })).toHaveAttribute('aria-checked', 'true');

	await pickZone(page, page.getByRole('menu').getByLabel('Other zone'), 'tok', 'Asia/Tokyo');

	await expect(page).toHaveURL(/\/overview\?tz=Asia%2FTokyo$/);
	await expect(page.locator('ovd-header ovd-zone-chip')).toContainText('Asia/Tokyo');
	await expect
		.poll(() =>
			api.requests.some((request) => request.path === 'overview' && request.params.get('tz') === 'Asia/Tokyo')
		)
		.toBe(true);
});

test('a default zone saved in Settings reaches the next page', async ({ page }) => {
	await page.goto('/settings?tab=preferences');
	await page.getByRole('radio', { name: 'Another zone' }).check();
	await pickZone(
		page,
		page.locator('ovd-preferences-tab').getByLabel('Time zone', { exact: true }),
		'new_york',
		'America/New_York'
	);
	await expect(page.getByText('Saved').first()).toBeVisible();

	await sidenav(page, 'Rooms').click();
	await expect(page).toHaveURL(/\/rooms\?.*tz=America%2FNew_York/);
});
