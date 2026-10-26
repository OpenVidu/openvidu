import { expect, test } from '../fixtures/api.js';
import { expectNoViolations } from '../fixtures/axe.js';
import { INGRESS_SUMMARY, INGRESSES } from '../fixtures/ingress.js';

test.use({ apiOptions: { ingresses: INGRESSES, ingressSummary: INGRESS_SUMMARY } });

test('lists the ingresses with tiles, links, badges, the live chip and the status cues', async ({ page }) => {
	await page.goto('/ingress?from=now-24h&to=now&tz=UTC');

	await expect(page.getByRole('region', { name: 'Summary' })).toContainText('RTMP 2 · WHIP 1 · URL 1');

	const table = page.getByRole('table', { name: 'Ingress' });

	await expect(table.getByRole('row')).toHaveCount(5);

	const publishing = table.getByRole('row', { name: /IN_c3d4/ });

	await expect(publishing.getByRole('link', { name: 'IN_c3d4' })).toHaveAttribute('href', '/ingress/IN_c3d4');
	await expect(publishing.getByRole('link', { name: 'demo-room' })).toHaveAttribute('href', /\/rooms\?.*q=demo-room/);
	await expect(publishing.locator('ovd-live-chip')).toHaveCount(0);
	await expect(publishing.locator('ovd-status-badge')).toContainText('publishing');
	await expect(table.getByRole('row', { name: /IN_gone/ }).locator('ovd-status-badge')).toContainText('deleted');
	await expect(
		table.getByRole('row', { name: /IN_url1/ }).getByRole('img', { name: 'Last session ended with an error' })
	).toBeVisible();
	await expectNoViolations(page);
});

test('the selects write the URL, the search hints its modes and the empty state clears the filters', async ({
	page
}) => {
	await page.goto('/ingress?from=now-24h&to=now&tz=UTC&cursor=abc');

	await page.getByRole('combobox', { name: 'Status' }).click();
	await page.getByRole('option', { name: 'Idle' }).click();
	await expect(page).toHaveURL(/status=inactive/);
	await expect(page).not.toHaveURL(/cursor=/);
	await expect(page.getByRole('table', { name: 'Ingress' }).getByRole('row')).toHaveCount(2);

	await page.getByRole('combobox', { name: 'Input' }).click();
	await page.getByRole('option', { name: 'RTMP' }).click();
	await expect(page).toHaveURL(/inputType=rtmp/);
	await expect(page.getByText('No ingress match')).toBeVisible();
	await page.getByRole('button', { name: 'Clear filters' }).click();
	await expect(page).not.toHaveURL(/status=|inputType=/);

	const search = page.getByLabel('Ingress name or ID');

	await search.fill('c');
	await expect(page.getByText('Type at least 2 characters')).toBeVisible();
	await search.fill('IN_gone');
	await expect(page.getByText('Exact ID: range and filters ignored · Enter opens it')).toBeVisible();
	await expect(page).toHaveURL(/q=IN_gone/);
});

test('the ingress detail is locked in CE with the header from the list', async ({ page, api }) => {
	await page.goto('/ingress?from=now-24h&to=now&tz=UTC');
	await page.getByRole('link', { name: 'IN_c3d4' }).click();

	await expect(page.getByText('Ingress detail is available in OpenVidu PRO')).toBeVisible();
	await expect(page.getByRole('heading', { level: 1, name: 'cam-1' })).toBeVisible();
	await expect(page.locator('.title').getByRole('button', { name: /Copy ingress name/ })).toBeVisible();
	await expect(page.locator('.title ovd-status-badge')).toContainText('publishing');
	await expect(page.locator('ovd-kind-badge')).toHaveCount(0);
	expect(api.calls().filter((call) => call.startsWith('GET ingresses/IN_'))).toEqual([]);
});
