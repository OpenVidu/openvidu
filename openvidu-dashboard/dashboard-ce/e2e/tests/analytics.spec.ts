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
	await expect(card(page, 'Rooms').locator('ovd-time-series-chart').first()).toBeVisible();

	const analytics = api.requests.filter((request) => request.path.startsWith('analytics/'));

	expect(analytics.map((request) => request.path).sort()).toEqual([
		'analytics/breakdowns',
		'analytics/series',
		'analytics/series',
		'analytics/summary'
	]);
	expect(analytics.every((request) => request.params.get('tz') === 'UTC')).toBe(true);
	expect(
		analytics.filter((request) => request.path === 'analytics/series').map((item) => item.params.get('granularity'))
	).toEqual(['1h', '1d']);
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
	await expect(card(page, 'Rooms').locator('.chart-heading')).toContainText(['Active rooms', 'Rooms created']);
	await expect(card(page, 'Rooms').locator('.chart-heading + .chart-note')).toHaveText([
		'Five-minute buckets · UTC',
		'Five-minute buckets · UTC'
	]);
	await expect(card(page, 'Participants').locator('.chart-heading')).toContainText([
		'Active participants',
		'Participant sessions',
		'Connection success',
		'Participant kind',
		'Unique identities'
	]);
	await expect(card(page, 'Egress').locator('.chart-heading + .chart-note')).toHaveText([
		'Five-minute buckets · UTC',
		'Five-minute buckets · UTC',
		'Hourly · UTC'
	]);
	await expect(card(page, 'Ingress').locator('.chart-heading + .chart-note')).toHaveText([
		'Hourly · UTC',
		'Hourly · UTC'
	]);
	await expect(page.locator('main [title]')).toHaveCount(0);
	await expect(card(page, 'Participants')).not.toContainText('Switch to 1 d');
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

test('unique identities show per UTC day at any granularity', async ({ page, api }) => {
	await page.goto('/analytics?from=now-7d&to=now&tz=UTC');

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
					request.params.get('metrics') === 'uniqueIdentities' &&
					request.params.get('granularity') === '1d'
			)
		)
		.toBe(true);
});

test('the charts of a card share its rows evenly', async ({ page }) => {
	const rows = async (title: string) => {
		const tops = await card(page, title)
			.locator('ovd-chart-grid > *')
			.evaluateAll((charts) => charts.map((chart) => Math.round(chart.getBoundingClientRect().top)));

		return [...new Set(tops)].map((top) => tops.filter((value) => value === top).length);
	};

	await page.setViewportSize({ width: 1920, height: 1080 });
	await page.goto('/analytics?from=now-24h&to=now&tz=UTC');
	await expect(card(page, 'Egress').locator('ovd-time-series-chart').first()).toBeVisible();
	await expect.poll(() => rows('Egress')).toEqual([2, 2]);
	expect(await rows('Client breakdowns')).toEqual([2, 2]);
	expect(await rows('Participants')).toEqual([3, 2]);
	expect(await rows('Rooms')).toEqual([2]);

	await page.setViewportSize({ width: 375, height: 800 });
	await expect.poll(() => rows('Egress')).toEqual([1, 1, 1, 1]);
});

test('the PRO strip is locked on CE and sends no PRO request', async ({ page, api }) => {
	await page.goto('/analytics?from=now-24h&to=now&tz=UTC');

	await expect(page.locator('ovd-pro-lock-overlay')).toHaveCount(3);
	// Nothing per node on CE: no scope selector, lock or text about nodes.
	await expect(page.locator('.scope-select')).toHaveCount(0);
	await expect(page.getByText('All nodes')).toHaveCount(0);
	await expect(card(page, 'Quality')).toContainText('Quality analytics is available in OpenVidu PRO');
	await expect(card(page, 'Top rooms')).toContainText('Top rooms is available in OpenVidu PRO');
	await expect(card(page, 'Quality').getByRole('button', { name: 'Export CSV' })).toBeDisabled();
	await expect(card(page, 'Rooms').locator('ovd-time-series-chart').first()).toBeVisible();
	expect(api.calls()).not.toContain('GET analytics/top');
	expect(api.calls()).not.toContain('GET analytics/scopes');

	const metrics = api.requests
		.filter((request) => request.path === 'analytics/series')
		.flatMap((request) => request.params.get('metrics')?.split(',') ?? []);

	expect(metrics).not.toContain('scoreAvg');
	expect(metrics).toEqual(expect.arrayContaining(['ingressSessions', 'ingressPeakActive', 'egressPeakActive']));
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

test('the entity cards draw their peak and volume and export them', async ({ page, api }) => {
	await page.goto('/analytics?from=now-7d&to=now&tz=UTC&granularity=1d');
	await expect(card(page, 'Rooms').locator('ovd-time-series-chart').first()).toBeVisible();

	const metrics = api.requests
		.filter((request) => request.path === 'analytics/series')
		.flatMap((request) => request.params.get('metrics')?.split(',') ?? []);

	expect(metrics).toEqual(
		expect.arrayContaining([
			'roomsPeakActive',
			'roomsCreated',
			'participantsPeakActive',
			'participantsJoined',
			'egressPeakActive',
			'ingressPeakActive'
		])
	);
	expect(metrics.filter((metric) => /^(roomsEnded|participantsAborted)$/.test(metric))).toEqual([]);

	const exported = async (title: string) => {
		const download = page.waitForEvent('download');

		await card(page, title).getByRole('button', { name: 'Export CSV' }).click();
		await download;

		return api.requests.findLast((item) => item.path === 'analytics/export.csv')?.params.get('metrics');
	};

	expect(await exported('Rooms')).toBe('roomsPeakActive,roomsCreated');
	expect(await exported('Participants')).toBe(
		'participantsPeakActive,participantsJoined,connectionSuccessRate,uniqueIdentities'
	);
	expect(await exported('Egress')).toBe('egressPeakActive,egressStarted,egressEnded');
	expect(await exported('Ingress')).toBe('ingressPeakActive,ingressSessions');
});

test.describe('a failed request', () => {
	test.use({ apiOptions: { analyticsFail: ['breakdowns', 'export.csv'] } });

	test('fails its cards only, with retry, and an export failure toasts', async ({ page, api }) => {
		await page.goto('/analytics?from=now-24h&to=now&tz=UTC');

		const clients = card(page, 'Client breakdowns');

		await expect(clients.getByRole('alert')).toContainText('Request e2e-breakdowns');
		await expect(card(page, 'Rooms').locator('ovd-time-series-chart').first()).toBeVisible();

		api.options.analyticsFail = ['export.csv'];
		await clients.getByRole('button', { name: 'Retry' }).click();
		await expect(clients.locator('ovd-breakdown-chart').first()).toBeVisible();

		await card(page, 'Rooms').getByRole('button', { name: 'Export CSV' }).click();
		await expect(page.getByText(/Export failed: .*Request e2e-export\.csv/)).toBeVisible();
		await expect(card(page, 'Rooms').getByRole('button', { name: 'Export CSV' })).toBeEnabled();
	});
});

test.describe('a range whose servers report no media statistics', () => {
	test.use({ apiOptions: { analyticsSummary: { mediaStats: 'none', bytesUp: 0, bytesDown: 0 } } });

	test('keeps the Data up / down tile and the Data transferred section, unavailable, with the warning', async ({
		page
	}) => {
		await page.goto('/analytics?from=now-7d&to=now&tz=UTC');

		const summary = page.getByRole('region', { name: 'Summary' });
		const section = card(page, 'Data transferred');

		await expect(summary.locator('.value.unavailable')).toHaveCount(1);
		await expect(section.locator('.value.unavailable')).toHaveCount(2);
		await expect(section.locator('ovd-time-series-chart .chart.unavailable')).toHaveCount(1);
		await expect(section.getByRole('button', { name: 'Show table' })).toHaveCount(0);
		await expect(section.locator('ovd-notice')).toHaveCount(0);
		await section
			.getByRole('button', {
				name: 'The servers of this range use mediasoup as RTC engine, which does not generate media statistics yet. This data will be available soon.'
			})
			.first()
			.hover();
		await expect(page.locator('.mat-mdc-tooltip')).toHaveText(
			'The servers of this range use mediasoup as RTC engine, which does not generate media statistics yet. This data will be available soon.'
		);
		await expectNoViolations(page);
	});
});

test.describe('a range where only some servers report media statistics', () => {
	test.use({ apiOptions: { analyticsSummary: { mediaStats: 'partial' } } });

	test('the Data up / down tile and the Data transferred section warn and keep their data', async ({ page }) => {
		await page.goto('/analytics?from=now-7d&to=now&tz=UTC');

		const section = card(page, 'Data transferred');

		await expect(
			page.getByRole('region', { name: 'Summary' }).getByRole('button', {
				name: 'This data comes only from rooms on servers using Pion as RTC engine. mediasoup does not generate media statistics yet. They will be available soon.'
			})
		).toHaveCount(1);
		await expect(
			section.getByRole('button', {
				name: 'This data comes only from rooms on servers using Pion as RTC engine. mediasoup does not generate media statistics yet. They will be available soon.'
			})
		).toHaveCount(1);
		await expect(section.locator('.unavailable')).toHaveCount(0);
		await expect(section.locator('ovd-time-series-chart')).toHaveCount(1);
	});

	test('the warning tooltip opens with a tap on a phone', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 800 });
		await page.goto('/analytics?from=now-7d&to=now&tz=UTC');

		await card(page, 'Data transferred')
			.getByRole('button', {
				name: 'This data comes only from rooms on servers using Pion as RTC engine. mediasoup does not generate media statistics yet. They will be available soon.'
			})
			.click();
		await expect(page.locator('.mat-mdc-tooltip')).toHaveText(
			'This data comes only from rooms on servers using Pion as RTC engine. mediasoup does not generate media statistics yet. They will be available soon.'
		);
	});
});
