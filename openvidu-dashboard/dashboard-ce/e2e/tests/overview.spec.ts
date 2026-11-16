import { expect, type Page, test } from '../fixtures/api.js';
import { expectNoViolations } from '../fixtures/axe.js';
import { egressItem } from '../fixtures/egress.js';
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
	await expect(tiles).toContainText('Active agents 2');
	await expect(tiles).not.toContainText('Services');
	await expect(page.locator('.page-header ovd-live-chip')).toHaveText('LIVE');
	// The notice needs two responses in a row reporting stale entities.
	await expect(page.getByText('may be stale')).toHaveCount(0);
	await page.getByRole('button', { name: 'Refresh now' }).click();
	await expect(page.getByRole('alert').filter({ hasText: 'may be stale' })).toContainText(
		'1 active room and 4 participants have had no stats for over 90 s and may be stale'
	);
	await expect(card(page, 'Data pipeline')).toContainText(/Last batch at \d\d:\d\d:\d\d/);
	await expect(card(page, 'Data pipeline')).not.toContainText('node');
	await expect(card(page, 'Data pipeline')).not.toContainText('schema');
	await expect(card(page, 'Data pipeline')).not.toContainText('retention:');
	await expect(card(page, 'Data pipeline').getByRole('link', { name: 'Storage and retention' })).toBeVisible();
	await expect(card(page, 'Today (UTC, since 00:00)')).toContainText('143');
	// CE has a single machine: no per-node card, and Recent rooms takes the full width.
	await expect(page.locator('ovd-section-card').filter({ hasText: 'By node' })).toHaveCount(0);
	await expect(page.getByText('Per-node breakdown')).toHaveCount(0);
	await expect(card(page, 'Recent rooms')).toHaveClass(/\bfull\b/);

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

test('Label on two lines', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.goto('/overview?tz=UTC');

	const tiles = page.getByRole('region', { name: 'Live' }).locator('ovd-kpi-tile');

	await expect(tiles.locator('.value')).toHaveCount(6);

	const boxes = await tiles.evaluateAll((elements) =>
		elements.map((tile) => {
			const box = tile.getBoundingClientRect();
			const style = getComputedStyle(tile);
			const label = tile.querySelector('.label')?.getBoundingClientRect();
			const value = tile.querySelector('.value')?.getBoundingClientRect();

			return {
				top: Math.round(box.top),
				contentBottom: Math.round(
					box.bottom - Number.parseFloat(style.paddingBottom) - Number.parseFloat(style.borderBottomWidth)
				),
				labelTop: Math.round(label?.top ?? 0),
				labelHeight: Math.round(label?.height ?? 0),
				valueBottom: Math.round(value?.bottom ?? 0)
			};
		})
	);
	const [rooms, participants] = boxes;

	// The six tiles share one line, where "Active participants" wraps and "Active rooms" does not.
	expect(new Set(boxes.map((box) => box.top)).size).toBe(1);
	expect(participants?.labelHeight).toBeGreaterThan(rooms?.labelHeight ?? Infinity);
	expect(new Set(boxes.map((box) => box.labelTop)).size).toBe(1);
	expect(new Set(boxes.map((box) => box.valueBottom)).size).toBe(1);
	expect(boxes.every((box) => box.valueBottom === box.contentBottom)).toBe(true);
});

test('Publishers tile', async ({ page, api }) => {
	await page.goto('/overview?tz=UTC');
	await page
		.getByRole('region', { name: 'Live' })
		.getByRole('link', { name: /Active publishers/ })
		.click();

	await expect(page).toHaveURL(/\/participants\?(.*&)?status=active&publisher=true(&|$)/);
	await expect(page.locator('.publisher-chip')).toHaveText('Publishers');
	await expect(page.locator('.publisher-chip').getByRole('button')).toBeVisible();
	await expect
		.poll(() =>
			api.requests.some(
				(request) => request.path === 'participants' && request.params.get('publisher') === 'true'
			)
		)
		.toBe(true);
});

test.describe('the Active egress tile', () => {
	test.use({
		apiOptions: {
			egresses: [
				egressItem({ egressId: 'EG_starting', status: 'starting' }),
				egressItem({ egressId: 'EG_active', status: 'active' }),
				egressItem({ egressId: 'EG_ending', status: 'ending' }),
				egressItem({ egressId: 'EG_complete', status: 'complete' })
			]
		}
	});

	test('Active egress tile', async ({ page, api }) => {
		await page.goto('/overview?tz=UTC');
		await page
			.getByRole('region', { name: 'Live' })
			.getByRole('link', { name: /Active egress/ })
			.click();

		await expect(page).toHaveURL(/\/egress\?(.*&)?status=starting,active,ending(&|$)/);
		await expect(page.getByRole('combobox', { name: 'Status' })).toHaveText('Active');
		await expect
			.poll(() =>
				api.requests
					.filter((request) => request.path === 'egresses')
					.map((request) => request.params.get('status'))
			)
			.toContain('starting,active,ending');

		const table = page.getByRole('table', { name: 'Egress' });

		await expect(table.getByRole('row')).toHaveCount(4);

		for (const id of ['EG_starting', 'EG_active', 'EG_ending']) {
			await expect(table.getByRole('row', { name: new RegExp(id) })).toBeVisible();
		}

		await expect(table.getByRole('row', { name: /EG_complete/ })).toHaveCount(0);
	});
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
		await expect(card(page, 'Data pipeline').locator('mat-icon.warn')).toBeVisible();
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
	// The tag height of every state, as a status badge beside it.
	expect(
		await page.locator('.page-header ovd-live-chip .ovd-tag').evaluate((tag) => tag.getBoundingClientRect().height)
	).toBe(24);
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
