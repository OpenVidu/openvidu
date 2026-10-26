import { expect, type Page, test } from '../fixtures/api.js';
import { expectNoViolations } from '../fixtures/axe.js';

function card(page: Page, title: string) {
	return page
		.locator('ovd-analytics-card')
		.filter({ has: page.getByRole('heading', { level: 2, name: title, exact: true }) });
}

test('a deep link drives the selectors and every request', async ({ page, api }) => {
	await page.goto('/analytics?from=now-7d&to=now&tz=UTC&granularity=1h');

	await expect(page.getByRole('heading', { level: 1, name: 'Analytics' })).toBeVisible();
	await expect(page.getByRole('button', { name: /Time range: Last 7 days/ })).toBeVisible();
	await expect(page.locator('.granularity-select')).toContainText('1 h');
	await expect(card(page, 'Rooms').locator('ovd-time-series-chart')).toBeVisible();

	const analytics = api.requests.filter((request) => request.path.startsWith('analytics/'));

	expect(analytics.map((request) => request.path).sort()).toEqual([
		'analytics/breakdowns',
		'analytics/series',
		'analytics/summary'
	]);
	expect(analytics.every((request) => request.params.get('tz') === 'UTC')).toBe(true);
	expect(analytics.find((request) => request.path === 'analytics/series')?.params.get('granularity')).toBe('1h');
});

test('the granularity selector offers what the range accepts', async ({ page }) => {
	await page.goto('/analytics?from=now-7d&to=now&tz=UTC');
	await expect(page.locator('.granularity-select')).toContainText('auto (1 h)');
	await page.locator('.granularity-select mat-select').click();
	await expect(page.getByRole('option')).toHaveText(['auto (1 h)', '1 h', '6 h', '1 d']);
	await page.getByRole('option', { name: '6 h' }).click();
	await expect(page).toHaveURL(/granularity=6h/);

	await page.goto('/analytics?from=now-24h&to=now&tz=UTC');
	await page.locator('.granularity-select mat-select').click();
	await expect(page.getByRole('option')).toHaveText(['auto (5 min)', '5 min', '15 min', '1 h', '6 h', '1 d']);
});

test('tiles, the six sections, the breakdown table and the page scroll over a chart', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.goto('/analytics?from=now-24h&to=now&tz=UTC');

	const tiles = page.getByRole('region', { name: 'Summary' });

	await expect(tiles).toContainText('1,203');
	await expect(tiles).toContainText('↑ 1.2 TB');
	await expect(tiles).toContainText('Unique identities (sum of 7 UTC days)');

	for (const title of ['Rooms', 'Participants', 'Client breakdowns', 'Data transferred', 'Egress', 'Ingress']) {
		await expect(card(page, title).locator('ovd-time-series-chart, ovd-breakdown-chart').first()).toBeVisible();
	}

	await expect(card(page, 'Rooms')).toContainText('4 participants');
	await expect(card(page, 'Egress').locator('.chart-heading + .chart-note')).toHaveText([
		'Five-minute buckets · UTC',
		'Hourly · UTC'
	]);
	await expect(page.locator('main [title]')).toHaveCount(0);
	await expect(card(page, 'Participants')).toContainText('Unique identities are available at daily granularity');
	await expect(card(page, 'Ingress').locator('ovd-breakdown-chart')).toContainText('Ingress input type');

	const sdk = card(page, 'Client breakdowns').locator('ovd-breakdown-chart').first();

	await sdk.getByRole('button', { name: 'Show table' }).click();
	await expect(sdk.locator('tbody tr')).toHaveCount(3);
	await expect(sdk.locator('tbody tr').first()).toContainText('60.0 %');

	const chart = card(page, 'Data transferred').locator('.chart');

	await chart.scrollIntoViewIfNeeded();

	const before = await page.evaluate(() => document.querySelector('mat-sidenav-content')?.scrollTop ?? 0);
	const box = await chart.boundingBox();

	await page.mouse.move((box?.x ?? 0) + 50, (box?.y ?? 0) + 50);
	await page.mouse.wheel(0, 400);
	await expect
		.poll(() => page.evaluate(() => document.querySelector('mat-sidenav-content')?.scrollTop ?? 0))
		.toBeGreaterThan(before);
});

test('the daily override shows unique identities per UTC day', async ({ page, api }) => {
	await page.goto('/analytics?from=now-7d&to=now&tz=UTC');
	await card(page, 'Participants').getByRole('button', { name: 'Switch to 1 d' }).click();

	await expect(page).toHaveURL(/granularity=1d/);
	await expect(card(page, 'Participants').locator('ovd-time-series-chart')).toHaveCount(3);
	await expect(
		card(page, 'Participants')
			.locator('ovd-time-series-chart')
			.filter({ hasText: 'Unique identities' })
			.locator('.chart-note')
	).toHaveText('per UTC day');
	await expect
		.poll(() =>
			api.requests.some(
				(request) =>
					request.path === 'analytics/series' &&
					request.params.get('metrics')?.includes('uniqueIdentities') === true
			)
		)
		.toBe(true);
});

test('the PRO strip is locked on CE and sends no PRO request', async ({ page, api }) => {
	await page.goto('/analytics?from=now-24h&to=now&tz=UTC');

	await expect(page.locator('ovd-pro-lock-overlay')).toHaveCount(3);
	await expect(page.locator('.scope-select mat-select')).toBeDisabled();
	await expect(
		page.locator('.scope-select').getByRole('img', { name: 'Per-node analytics is available in OpenVidu PRO' })
	).toBeVisible();
	await expect(card(page, 'Quality')).toContainText('Quality analytics is available in OpenVidu PRO');
	await expect(card(page, 'Top rooms')).toContainText('Top rooms is available in OpenVidu PRO');
	await expect(card(page, 'Quality').getByRole('button', { name: 'Export CSV' })).toBeDisabled();
	await expect(card(page, 'Rooms').locator('ovd-time-series-chart')).toBeVisible();
	expect(api.calls()).not.toContain('GET analytics/top');
	expect(api.calls()).not.toContain('GET analytics/scopes');

	const metrics = api.requests
		.filter((request) => request.path === 'analytics/series')
		.flatMap((request) => request.params.get('metrics')?.split(',') ?? []);

	expect(metrics).not.toContain('scoreAvg');
	expect(metrics).toContain('ingressSessions');
	await expectNoViolations(page);
});

test('a card exports its CSV under the server file name', async ({ page, api }) => {
	await page.goto('/analytics?from=now-7d&to=now&tz=UTC');
	await expect(card(page, 'Data transferred').locator('ovd-time-series-chart')).toBeVisible();

	const download = page.waitForEvent('download');

	await card(page, 'Data transferred').getByRole('button', { name: 'Export CSV' }).click();

	const file = await download;
	const request = api.requests.find((item) => item.path === 'analytics/export.csv');

	expect(request?.params.get('kind')).toBe('series');
	expect(request?.params.get('metrics')).toBe('bytesUp,bytesDown');
	expect(request?.authorization).toMatch(/^Bearer /);
	expect(file.suggestedFilename()).toBe(
		`analytics-series-${request?.params.get('from') ?? ''}-${request?.params.get('to') ?? ''}.csv`.replaceAll(
			':',
			''
		)
	);
});

test.describe('a failed request', () => {
	test.use({ apiOptions: { analyticsFail: ['breakdowns', 'export.csv'] } });

	test('fails its cards only, with retry, and an export failure toasts', async ({ page, api }) => {
		await page.goto('/analytics?from=now-24h&to=now&tz=UTC');

		const clients = card(page, 'Client breakdowns');

		await expect(clients.getByRole('alert')).toContainText('Request e2e-breakdowns');
		await expect(card(page, 'Rooms').locator('ovd-time-series-chart')).toBeVisible();

		api.options.analyticsFail = ['export.csv'];
		await clients.getByRole('button', { name: 'Retry' }).click();
		await expect(clients.locator('ovd-breakdown-chart').first()).toBeVisible();

		await card(page, 'Rooms').getByRole('button', { name: 'Export CSV' }).click();
		await expect(page.getByText(/Export failed: .*Request e2e-export\.csv/)).toBeVisible();
		await expect(card(page, 'Rooms').getByRole('button', { name: 'Export CSV' })).toBeEnabled();
	});
});
