import { expect, test } from '../fixtures/api.js';
import { expectNoViolations } from '../fixtures/axe.js';
import { EGRESS_SUMMARY, EGRESSES } from '../fixtures/egress.js';

test.use({ apiOptions: { egresses: EGRESSES, egressSummary: EGRESS_SUMMARY } });

test('lists the egresses with tiles, links, badges, outputs and error markers', async ({ page }) => {
	await page.goto('/egress?from=now-24h&to=now&tz=UTC');

	const tiles = page.getByRole('region', { name: 'Summary' });

	await expect(tiles).toContainText('Room composite 3 · Web 1 · Track 1');
	await expect(tiles).toContainText('2 h 00 m');

	const table = page.getByRole('table', { name: 'Egress' });

	await expect(table.getByRole('row')).toHaveCount(6);

	const active = table.getByRole('row', { name: /EG_a1b2/ });

	await expect(active.getByRole('link', { name: 'EG_a1b2' })).toHaveAttribute('href', '/egress/EG_a1b2');
	await expect(active.getByRole('link', { name: 'demo-room' })).toHaveAttribute('href', '/rooms/RM_ab12cd');
	await expect(active).not.toContainText('ROOM_COMPOSITE');
	await expect(active.getByRole('img', { name: 'File' })).toBeVisible();
	await expect(table.getByRole('row', { name: /EG_done/ })).toContainText('3');
	// The marker tells an error only where the status badge does not.
	await expect(table.getByRole('row', { name: /EG_done/ }).getByRole('img', { name: /code 403/ })).toBeVisible();
	await expect(table.getByRole('row', { name: /EG_fail/ }).locator('ovd-status-badge')).toContainText('failed');
	await expect(table.getByRole('row', { name: /EG_fail/ }).getByRole('img', { name: /Egress failed/ })).toHaveCount(
		0
	);
	await expect(table.getByRole('row', { name: /EG_web1/ })).toContainText('—');
	await expect(page.locator('ovd-live-chip')).toHaveCount(0);
	await expectNoViolations(page);
});

test('the status and type selects write the URL and the search hints its modes', async ({ page }) => {
	await page.goto('/egress?from=now-24h&to=now&tz=UTC&cursor=abc');

	await page.getByRole('combobox', { name: 'Status' }).click();
	await page.getByRole('option', { name: 'Failed' }).click();
	await page.keyboard.press('Escape');
	await expect(page).toHaveURL(/status=failed/);
	await expect(page).not.toHaveURL(/cursor=/);
	await expect(page.getByRole('table', { name: 'Egress' }).getByRole('row')).toHaveCount(3);

	await page.getByRole('combobox', { name: 'Type' }).click();
	await page.getByRole('option', { name: 'Track', exact: true }).click();
	await page.keyboard.press('Escape');
	await expect(page).toHaveURL(/type=track/);
	await expect(page.getByRole('table', { name: 'Egress' }).getByRole('row')).toHaveCount(2);

	const search = page.getByLabel('Room name or egress ID');

	await search.fill('d');
	await expect(page.getByText('Type at least 2 characters')).toBeVisible();
	await search.fill('EG_web1');
	await expect(page.getByText('Exact ID: range and filters ignored · Enter opens it')).toBeVisible();
	await expect(page).toHaveURL(/q=EG_web1/);
	await search.press('Enter');
	await expect(page).toHaveURL(/\/egress\/EG_web1\?.*from=now-24h/);
});

test('the room chip clears the room and the empty state clears every filter', async ({ page }) => {
	await page.goto('/egress?room=RM_other&from=now-24h&to=now&tz=UTC');

	await expect(page.getByText('No egress match')).toBeVisible();
	await expect(page.locator('ovd-room-chip a')).toHaveAttribute('href', '/rooms/RM_other');
	await page.getByRole('button', { name: 'Clear filters' }).click();
	await expect(page).not.toHaveURL(/room=/);
	await expect(page.getByRole('table', { name: 'Egress' }).getByRole('row')).toHaveCount(6);
});

test('a failed list keeps the error banner with retry', async ({ page }) => {
	await page.route('**/api/v1/egresses?*', (route) =>
		route.fulfill({ status: 500, json: { error: { code: 'INTERNAL_ERROR', message: 'x' } } })
	);
	await page.goto('/egress?from=now-24h&to=now&tz=UTC');

	await expect(page.getByRole('alert')).toContainText('Something went wrong');
	await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
});

test('the egress detail is locked in CE with the header from the list', async ({ page, api }) => {
	await page.goto('/egress?from=now-24h&to=now&tz=UTC');
	await page.getByRole('link', { name: 'EG_a1b2' }).click();

	await expect(page.getByText('Egress detail is available in OpenVidu PRO')).toBeVisible();
	await expect(page.getByRole('heading', { level: 1, name: 'EG_a1b2' })).toBeVisible();
	await expect(page.locator('.title').getByRole('button', { name: /Copy egress ID/ })).toBeVisible();
	await expect(page.locator('.title ovd-status-badge')).toContainText('active');
	await expect(page.locator('ovd-kind-badge')).toHaveCount(0);
	expect(api.calls().filter((call) => call.startsWith('GET egresses/EG_'))).toEqual([]);
});
