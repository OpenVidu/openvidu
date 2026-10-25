import { expect, type Page, test } from '../fixtures/api.js';
import { expectNoViolations } from '../fixtures/axe.js';
import { ROOM_SUMMARY, roomItem, ROOMS } from '../fixtures/rooms.js';

test.use({ apiOptions: { rooms: ROOMS, roomSummary: ROOM_SUMMARY } });

function table(page: Page) {
	return page.getByRole('table', { name: 'Rooms' });
}

test('a deep link reproduces the view and the request', async ({ page, api }) => {
	await page.goto(
		'/rooms?status=closed&q=demo&features=egress,agent&from=now-7d&to=now&tz=UTC&sort=endedAt&order=asc&limit=50'
	);

	await expect(page.getByRole('radio', { name: 'Closed' })).toHaveAttribute('aria-checked', 'true');
	await expect(page.getByLabel('Room name or SID')).toHaveValue('demo');
	await expect(page.getByRole('option', { name: 'Egress' })).toHaveAttribute('aria-selected', 'true');
	await expect(page.getByRole('option', { name: 'Agent' })).toHaveAttribute('aria-selected', 'true');
	await expect(page.getByRole('columnheader', { name: /Ended/ })).toHaveAttribute('aria-sort', 'ascending');
	await expect(page.getByText('Last 7 days')).toBeVisible();
	await expect(table(page).getByRole('row')).toHaveCount(2);
	expect(api.calls()).toContain('GET rooms');
});

test('the range picker warns about a range that starts before the entity retention', async ({ page }) => {
	await page.goto('/rooms?from=now-120d&to=now&tz=UTC');
	await page.getByRole('button', { name: /Time range/ }).click();

	const panel = page.getByRole('dialog', { name: 'Time range' });

	await expect(panel.getByText('Data older than 90 days is not retained.')).toBeVisible();
	// The click ripple of the trigger lowers the contrast of its label while it fades.
	await expect(page.locator('.mat-ripple-element')).toHaveCount(0);
	await expectNoViolations(page);
});

test('the summary tiles and the rows render with copy chips, badges and live cues', async ({ page, context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.goto('/rooms');

	const tiles = page.getByRole('region', { name: 'Summary' });

	await expect(tiles).toContainText('7');
	await expect(tiles).toContainText('120');
	await expect(tiles).toContainText('900');
	await expect(tiles).toContainText('31');

	const demo = table(page).getByRole('row', { name: /demo-room/ });

	await expect(demo.getByRole('link', { name: 'RM_ab12cd' })).toHaveAttribute('href', '/rooms/RM_ab12cd');
	await expect(demo).toContainText('↑ 12 MB ↓ 48 MB');
	await expect(demo.locator('ovd-live-chip')).toHaveCount(0);
	await expect(
		table(page)
			.getByRole('row', { name: /stale-room/ })
			.locator('ovd-status-badge mat-icon.stale')
	).toBeVisible();

	await demo.getByRole('button', { name: /Copy room SID/ }).click();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('RM_ab12cd');
	await expectNoViolations(page);
});

test('filters write the URL and drop the cursor; the search needs two characters or a SID', async ({ page }) => {
	await page.goto('/rooms?cursor=abc');

	await page.getByRole('radio', { name: 'Active' }).click();
	await expect(page).toHaveURL(/status=active/);
	expect(page.url()).not.toContain('cursor=');

	await page.getByRole('option', { name: 'Egress' }).click();
	await expect(page).toHaveURL(/features=egress/);

	const search = page.getByLabel('Room name or SID');
	const status = page.getByRole('radio', { name: 'Active' });
	const before = await status.boundingBox();

	await search.fill('d');
	await expect(page.getByText('Type at least 2 characters')).toBeVisible();
	// The hint takes no room of its own: the neighbouring filters keep their place.
	expect(await status.boundingBox()).toEqual(before);
	expect(page.url()).not.toContain('q=');

	await search.fill('RM_recon1');
	await expect(page).toHaveURL(/q=RM_recon1/);
	await expect(page.getByText('Exact ID: range and filters ignored · Enter opens it')).toBeVisible();
	await expect(table(page).getByRole('row')).toHaveCount(2);

	await page.getByRole('button', { name: 'Clear search' }).click();
	await expect(page).not.toHaveURL(/q=/);
	await expect(page).toHaveURL(/status=active/);
});

test('the paginator writes the cursor and the page, and Back restores the range shown', async ({ page }) => {
	const rooms = (count: number, first: number) =>
		Array.from({ length: count }, (_, index) =>
			roomItem({ sid: `RM_p${String(first + index)}`, name: `room-${String(first + index)}` })
		);

	await page.route(
		(url) => url.pathname.endsWith('/api/v1/rooms'),
		async (route) => {
			const second = new URL(route.request().url()).searchParams.has('cursor');

			await route.fulfill({
				json: {
					items: second ? rooms(4, 26) : rooms(25, 1),
					nextCursor: second ? null : 'next-page',
					prevCursor: second ? 'prev-page' : null,
					total: 29
				}
			});
		}
	);
	await page.goto('/rooms');

	await expect(page.getByText('Showing 1–25 of 29')).toBeVisible();
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page).toHaveURL(/cursor=next-page/);
	await expect(page).toHaveURL(/page=2/);
	await expect(page.getByText('Showing 26–29 of 29')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Prev' })).toBeEnabled();

	await page.getByRole('link', { name: 'RM_p26', exact: true }).click();
	await expect(page).toHaveURL(/\/rooms\/RM_p26/);
	await page.goBack();
	await expect(page.getByText('Showing 26–29 of 29')).toBeVisible();
});

test('an empty list offers to clear the filters; a failed refresh keeps the rows under the error', async ({
	page,
	api
}) => {
	await page.goto('/rooms?status=active&q=zzz');

	await expect(page.getByText('No rooms match')).toBeVisible();
	await page.getByRole('button', { name: 'Clear filters' }).click();
	await expect(page).not.toHaveURL(/status=|q=/);
	await expect(table(page).getByRole('row')).toHaveCount(5);

	api.failRooms();
	await page.getByRole('button', { name: 'Refresh now' }).click();
	await expect(page.getByText('e2e-request-1')).toBeVisible();
	await expect(table(page).getByRole('row')).toHaveCount(5);
});

test('the locked room detail fills its header from the list endpoint without PRO requests', async ({ page, api }) => {
	await page.goto('/rooms/RM_recon1');

	await expect(page.getByRole('heading', { level: 1, name: 'crashed-room' })).toBeVisible();
	await expect(page.getByText('Room detail is available in OpenVidu PRO')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Back to rooms' })).toBeVisible();
	expect(api.calls().filter((call) => call.startsWith('GET rooms/'))).toEqual([]);
});
