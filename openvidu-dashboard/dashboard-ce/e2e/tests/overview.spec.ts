import { expect, type Page, test } from '../fixtures/api.js';
import { expectNoViolations } from '../fixtures/axe.js';
import { activeOverview, activeStatus, freshOverview, freshStatus } from '../fixtures/overview.js';

function card(page: Page, title: string) {
	return page.locator('ovd-section-card').filter({ has: page.getByRole('heading', { level: 2, name: title }) });
}

test('the overview shows the live tiles with links, the hint, the status card and the recent rooms', async ({
	page
}) => {
	await page.goto('/overview?tz=UTC');

	const tiles = page.getByRole('region', { name: 'Live' });

	await expect(tiles).toContainText('Active rooms 12');
	await expect(tiles).toContainText('Agents 2');
	await expect(tiles).not.toContainText('Services');
	await expect(page.locator('.page-header ovd-live-chip')).toHaveText('LIVE');
	// The notice needs two responses in a row reporting stale entities.
	await expect(page.getByText('may be stale')).toHaveCount(0);
	await page.getByRole('button', { name: 'Refresh now' }).click();
	await expect(page.getByRole('alert').filter({ hasText: 'may be stale' })).toContainText(
		'1 active room and 4 participants have had no stats for over 90 s and may be stale'
	);
	await expect(card(page, 'Data pipeline')).toContainText(/Last batch at \d\d:\d\d:\d\d/);
	await expect(card(page, 'Data pipeline')).toContainText(/\d+ of \d+ nodes? reporting/);
	await expect(card(page, 'Data pipeline')).not.toContainText('schema');
	await expect(card(page, 'Data pipeline')).not.toContainText('retention:');
	await expect(card(page, 'Data pipeline').getByRole('link', { name: 'Storage and retention' })).toBeVisible();
	await expect(card(page, 'Today (UTC, since 00:00)')).toContainText('143');
	await expect(card(page, 'By node')).toContainText('Per-node breakdown is available in OpenVidu PRO');

	const recent = card(page, 'Recent rooms');

	await expect(recent.getByRole('link', { name: 'RM_ab12cd' })).toHaveAttribute('href', '/rooms/RM_ab12cd');
	await expect(recent.getByRole('columnheader')).toHaveText([
		'SID',
		'Name',
		'Status',
		'Started',
		'Duration',
		'Unique identities'
	]);
	await expect(recent.locator('ovd-live-chip')).toHaveCount(0);
	await expect(recent.locator('ovd-status-badge mat-icon.stale')).toHaveCount(1);
	await expect(page.locator('main [title]')).toHaveCount(0);
	expect(
		await recent.getByRole('link', { name: 'RM_ab12cd' }).evaluate((link) => {
			const titled: string[] = [];

			for (let node: Element | null = link; node !== null; node = node.parentElement) {
				if (node.hasAttribute('title')) {
					titled.push(node.tagName);
				}
			}

			return titled;
		})
	).toEqual([]);
	await expectNoViolations(page);

	await tiles.getByRole('link', { name: /Active rooms/ }).click();
	await expect(page).toHaveURL(/\/rooms\?.*status=active/);
});

test.describe('a fresh deployment', () => {
	test.use({ apiOptions: { overview: () => freshOverview(), status: () => freshStatus() } });

	test('waits for the first events with every tile at zero and no error', async ({ page }) => {
		await page.goto('/overview?tz=UTC');

		await expect(page.getByText('Waiting for the first events')).toBeVisible();
		await expect(page.getByRole('region', { name: 'Live' }).locator('ovd-kpi-tile .value')).toHaveText([
			'0',
			'0',
			'0',
			'0',
			'0',
			'0'
		]);
		await expect(card(page, 'Data pipeline')).toContainText('Last batch: never');
		await expect(page.locator('ovd-error-banner')).toHaveCount(0);
	});
});

test.describe('a silent writer', () => {
	test.use({ apiOptions: { status: () => activeStatus(Date.now(), 3 * 60_000) } });

	test('raises one dismissible banner on any page and turns the overview chip stale', async ({ page }) => {
		await page.clock.install();
		await page.goto('/rooms?tz=UTC');

		// The banner needs two silent statuses in a row; the status is polled every 30 s.
		await expect(page.getByRole('table', { name: 'Rooms' })).toBeVisible();
		await expect(page.getByText(/No analytics data received/)).toHaveCount(0);
		await page.clock.fastForward('00:31');
		await expect(page.getByText(/No analytics data received for 3 min/)).toHaveCount(1);
		await page
			.getByRole('alert')
			.filter({ hasText: 'No analytics data' })
			.getByRole('button', { name: 'Dismiss' })
			.click();
		await expect(page.getByText('No analytics data received for 3 min')).toHaveCount(0);

		await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Overview' }).click();
		await expect(page.locator('.page-header ovd-live-chip')).toHaveText('stale');
		await expect(card(page, 'Data pipeline')).toContainText('0 of 2 nodes reporting');
	});
});

test.describe('a running migration', () => {
	test.use({
		apiOptions: {
			status: () =>
				activeStatus(Date.now(), 3 * 60_000, {
					state: 'running',
					progress: { processed: 400_000, total: 1_200_000 }
				})
		}
	});

	test('shows its progress in the banner and the card, without a writer banner', async ({ page }) => {
		await page.goto('/overview?tz=UTC');

		await expect(page.getByText(/Migration in progress: 400,000 \/ 1,200,000 records/)).toHaveCount(1);
		await expect(card(page, 'Data pipeline')).toContainText('400,000 / 1,200,000 (33 %)');
		await expect(page.getByText(/No analytics data received/)).toHaveCount(0);
	});
});

test('the live chip reads paused once the auto-refresh is off, while the status poll goes on', async ({
	page,
	api
}) => {
	await page.goto('/overview?tz=UTC');
	await expect(page.locator('.page-header ovd-live-chip')).toHaveText('LIVE');

	await page.getByRole('button', { name: /^Auto-refresh:/ }).click();
	await page.getByRole('menuitemradio', { name: 'Off' }).click();
	await expect(page.locator('.page-header ovd-live-chip')).toHaveText('paused');
	expect(api.calls()).toContain('GET status');
	await expectNoViolations(page);
});

test.describe('a quiet deployment', () => {
	const body = activeOverview();

	test.use({ apiOptions: { overview: () => body } });

	test('keeps the values on 304 while the refresh advances', async ({ page, api }) => {
		await page.goto('/overview?tz=UTC');
		await expect(page.getByRole('region', { name: 'Live' })).toContainText('Active rooms 12');

		const polls = () => api.requests.filter((request) => request.path === 'overview').length;
		const before = polls();

		await page.getByRole('button', { name: 'Refresh now' }).click();
		await expect.poll(polls).toBeGreaterThan(before);
		await expect(page.getByRole('region', { name: 'Live' })).toContainText('Active rooms 12');
		await expect(page.locator('.highlight')).toHaveCount(0);
	});
});
