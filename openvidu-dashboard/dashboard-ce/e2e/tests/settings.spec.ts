import { expect, legacyMigration, type Page, test } from '../fixtures/api.js';
import { expectNoViolations } from '../fixtures/axe.js';
import { activeStatus } from '../fixtures/overview.js';

const LEGACY_LABEL = 'Legacy data (before 3.10)';

/** The retention text of the legacy data the mock keeps, in UTC. */
function keptUntil(): string {
	return `Kept until ${(legacyMigration(Date.now()).legacyRetainedUntil ?? '').slice(0, 10)} for rollback`;
}

function legacyRow(page: Page) {
	return page.locator('ovd-data-tab table.classes > tbody > tr').filter({
		has: page.getByRole('rowheader', { name: LEGACY_LABEL })
	});
}

test('preferences persist across reloads and reset to the defaults', async ({ page }) => {
	await page.goto('/settings');
	await page.getByLabel('Rows per page').click();
	await page.getByRole('option', { name: '50' }).click();
	await expect(page.getByText('Saved')).toBeVisible();
	await page.getByRole('radio', { name: 'Dark' }).check();

	await page.reload();
	await expect(page.getByLabel('Rows per page')).toHaveText('50');
	await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

	await page.getByRole('button', { name: 'Reset to defaults' }).click();
	await expect(page.getByLabel('Rows per page')).toHaveText('25');
	await expect(page.getByRole('radio', { name: 'System' })).toBeChecked();
	expect(await page.evaluate(() => localStorage.getItem('ovd.prefs.v1'))).toBeNull();
});

test('the default preset preference applies to a bare range-scoped route', async ({ page }) => {
	await page.goto('/settings');
	await page.getByLabel('Default time range').click();
	await page.getByRole('option', { name: 'Last 7 days' }).click();
	// "Another zone" starts from UTC.
	await page.getByRole('radio', { name: 'Another zone' }).check();

	await page.goto('/egress');
	await expect(page).toHaveURL('/egress?from=now-7d&to=now&tz=UTC');
});

test('Data shows the storage per data class, the collections of a class and no version line', async ({ page }) => {
	await page.goto('/settings?tab=data');

	const data = page.locator('ovd-data-tab');

	await expect(page.getByRole('tab', { name: 'Data' })).toBeFocused();
	await expect(page.getByRole('tab', { name: 'About' })).toHaveCount(0);
	await expect(data.getByRole('row', { name: 'Events 7 days' })).toBeVisible();
	await expect(data.getByRole('row', { name: 'Daily rollups Kept forever' })).toBeVisible();
	await expect(data).not.toContainText('OpenVidu 3.10.0');
	await expect(data.locator('ovd-edition-badge')).toHaveCount(0);
	await expect(data).not.toContainText('openvidu-livekit');
	await expect(data).not.toContainText('Schema');
	await expect(data).not.toContainText('Migration');
	await expect(data).not.toContainText('schema_meta');
	await expect(data.getByRole('status').filter({ hasText: 'Retention is set in' })).toContainText(
		'Retention is set in openvidu.analytics.retention of the OpenVidu Server configuration (livekit.yaml) and applies when the server restarts.'
	);
	await expect(data.getByRole('link', { name: /Configuration reference/ })).toHaveAttribute(
		'href',
		'https://openvidu.io/latest/docs/self-hosting/configuration/reference/#analytics-settings'
	);

	await data.getByRole('button', { name: 'Show collections of Entities' }).click();
	await expect(data.getByRole('button', { name: 'Hide collections of Entities' })).toHaveAttribute(
		'aria-expanded',
		'true'
	);
	await expect(data.getByRole('row', { name: /rooms 1,203/ })).toBeVisible();
	await expect(page).toHaveURL('/settings?tab=data');
	await expect(page.getByRole('link', { name: /OpenAPI/ })).toHaveCount(0);
});

const ENTITIES_TIP = /^12 of 90 days so far · ≈ [\d.]+ MB at full retention \(estimate\)$/;

test('Retention tip by keyboard', async ({ page }) => {
	await page.goto('/settings?tab=data');
	// The tooltip shows once on focus: wait for the Data tab to settle so that nothing closes it while it renders.
	await page.waitForLoadState('networkidle');

	const tip = page.getByRole('button', { name: 'About Entities retention' });

	await page.getByRole('button', { name: 'Show collections of Entities' }).focus();
	await page.keyboard.press('Tab');
	await expect(tip).toBeFocused();
	await expect(page.locator('.mat-mdc-tooltip')).toHaveText(ENTITIES_TIP);
	await expect(tip).toHaveAccessibleDescription(ENTITIES_TIP);

	await page.keyboard.press('Escape');
	await expect(page.locator('.mat-mdc-tooltip')).toHaveCount(0);
});

test.describe('legacy data', () => {
	test.use({ apiOptions: { legacy: true }, timezoneId: 'UTC' });

	test('Legacy row kept for rollback: after Daily rollups, with its retention, size and collections', async ({
		page
	}) => {
		await page.goto('/settings?tab=data');

		const data = page.locator('ovd-data-tab');
		const row = legacyRow(page);
		const labels = data.locator('table.classes > tbody > tr > th[scope="row"]');

		await expect(row.locator(':scope > th, :scope > td:not(.action)')).toHaveText([
			LEGACY_LABEL,
			keptUntil(),
			'420,000',
			'130 MB'
		]);
		await expect(labels.nth(-2)).toHaveText('Daily rollups');
		await expect(labels.last()).toHaveText(LEGACY_LABEL);
		await expect(row.locator('ovd-info-tip')).toHaveCount(0);

		await data.getByRole('button', { name: `Show collections of ${LEGACY_LABEL}` }).click();

		const collections = data.getByRole('table', { name: `Collections of ${LEGACY_LABEL}` });

		await expect(collections.locator('tbody th')).toHaveText(['legacy_events', 'stats']);
	});
});

test.describe('on a phone', () => {
	test.use({ viewport: { width: 375, height: 740 }, hasTouch: true });

	test('Retention tip on a phone', async ({ page }) => {
		await page.goto('/settings?tab=data');

		const tip = page.getByRole('button', { name: 'About Entities retention' });
		const tooltip = page.locator('.mat-mdc-tooltip');

		await tip.tap();
		await expect(tooltip).toHaveText(ENTITIES_TIP);

		const box = await tooltip.boundingBox();

		expect(box?.x).toBeGreaterThanOrEqual(0);
		expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(375);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

		await tip.tap();
		await expect(tooltip).toHaveCount(0);
	});

	test.describe('with legacy data', () => {
		test.use({ apiOptions: { legacy: true }, timezoneId: 'UTC' });

		test('Legacy row on a phone: the retention text wraps inside the viewport', async ({ page }) => {
			await page.goto('/settings?tab=data');

			const retention = legacyRow(page).locator(':scope > td').first();

			await expect(retention).toHaveText(keptUntil());

			const box = await retention.boundingBox();

			expect(box?.x).toBeGreaterThanOrEqual(0);
			expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(375);
			expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
		});

		test('Delete buttons on a phone', async ({ page }) => {
			await page.goto('/settings?tab=data');

			const buttons = page.locator('ovd-data-tab td.action button');

			await expect(buttons).toHaveCount(9);

			for (const button of await buttons.all()) {
				const box = await button.boundingBox();

				expect(box?.x).toBeGreaterThanOrEqual(0);
				expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(375);
			}

			expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
		});

		test.describe('in the dark theme', () => {
			test.use({ colorScheme: 'dark' });

			test('Dialog on a phone', async ({ page }) => {
				await page.goto('/settings?tab=data');
				await page.getByRole('button', { name: 'Delete all analytics data' }).click();

				const dialog = page.getByRole('dialog', { name: 'Delete all analytics data?' });
				const checkbox = dialog.getByRole('checkbox', { name: 'Also delete the data before 3.10' });

				await expect(dialog).toBeVisible();
				await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
				await checkbox.check();
				await expect(dialog).toContainText('A rollback to 3.9 will find no analytics data.');

				for (const part of [
					dialog.getByRole('heading', { name: 'Delete all analytics data?' }),
					dialog.locator('mat-dialog-content p').first(),
					dialog.getByRole('link', { name: /How to free disk space/ }),
					checkbox,
					dialog.getByRole('button', { name: 'Cancel' }),
					dialog.getByRole('button', { name: 'Delete', exact: true })
				]) {
					await part.scrollIntoViewIfNeeded();

					const box = await part.boundingBox();

					expect(box?.x).toBeGreaterThanOrEqual(0);
					expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(375);
				}

				expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
				await expectNoViolations(page);
			});
		});
	});
});

for (const scheme of ['light', 'dark'] as const) {
	test.describe(`deleting in the ${scheme} theme`, () => {
		test.use({ colorScheme: scheme, timezoneId: 'UTC' });

		test('Events dialog: flow with axe in both themes', async ({ page, api }) => {
			await page.clock.install();
			await page.goto('/settings?tab=data');
			await page.getByRole('button', { name: 'Delete Events' }).click();

			const dialog = page.getByRole('dialog', { name: 'Delete events?' });

			await expect(dialog).toContainText(
				'Deletes the stored events of rooms, participant sessions, egresses and ingresses that have ended.'
			);
			await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
			await expect(dialog.getByRole('link', { name: /How to free disk space/ })).toHaveAttribute(
				'href',
				'https://openvidu.io/latest/docs/self-hosting/production-ready/observability/openvidu-dashboard/#freeing-disk-space'
			);
			await expectNoViolations(page);

			await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
			await expect(dialog).toHaveCount(0);
			await expect(page.getByRole('button', { name: 'Delete Events' })).toBeFocused();
			await expect.poll(() => api.deletionRequests).toEqual([{ class: 'events' }]);

			const data = page.locator('ovd-data-tab');

			await expect(data.getByRole('heading', { name: 'Deleting analytics data' })).toBeVisible();
			await expect(data).toContainText('Deleting Events: 0 documents deleted · collection 1 of 1');
			await expect(page.getByRole('button', { name: 'Delete Stats' })).toHaveAttribute('aria-disabled', 'true');
			await expect(page.getByText('Lists and figures may change.')).toHaveCount(0);
			await expectNoViolations(page);

			api.finishDeletion(48_000);
			await page.clock.fastForward('00:11');
			await expect(page.getByText('Events deleted: 48,000 documents')).toBeVisible();
			await expect(data.getByRole('heading', { name: 'Deleting analytics data' })).toHaveCount(0);
			await expect(
				data
					.locator('table.classes > tbody > tr')
					.filter({ has: page.getByRole('button', { name: 'Show collections of Events' }) })
					.locator('th .sub')
			).toHaveText(/^Deleted \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
		});
	});
}

test.describe('incompatible writer', () => {
	test.use({
		apiOptions: {
			info: { schema: { dashboard: 2, writer: 3, status: 'newer' }, openapiDocsEnabled: true },
			status: () => ({ ...activeStatus(), schema: { dashboard: 2, writer: 3, status: 'newer' } })
		}
	});

	test('warns about the schema in the shell and links the OpenAPI document from the sidenav', async ({ page }) => {
		await page.goto('/settings?tab=data');

		await expect(page.locator('ovd-data-tab')).not.toContainText('Schema');
		await expect(page.getByRole('alert').filter({ hasText: 'newer than v2' })).toBeVisible();
		await expect(page.locator('ovd-sidenav-footer').getByRole('link', { name: /OpenAPI/ })).toHaveAttribute(
			'href',
			'api/v1/docs'
		);
	});
});

test.describe('migration running', () => {
	const migration = { state: 'running', progress: { processed: 300_000, total: 1_200_000 } } as const;

	test.use({
		apiOptions: { info: { migration }, status: () => activeStatus(Date.now(), 4_000, migration) }
	});

	test('shows the progress and polls the server status every 10 s, not the info document', async ({ page, api }) => {
		await page.clock.install();
		await page.goto('/settings?tab=data');

		await expect(page.locator('ovd-data-tab').getByText('300,000 / 1,200,000 records (25 %)')).toBeVisible();
		await expect(page.getByRole('progressbar', { name: 'Migration progress' }).first()).toBeVisible();

		const count = (call: string) => api.calls().filter((made) => made === call).length;
		const reads = count('GET info');
		const polls = count('GET status');

		await page.clock.fastForward('00:11');
		await expect.poll(() => count('GET status')).toBe(polls + 1);
		expect(count('GET info')).toBe(reads);
	});
});

test.describe('info unavailable', () => {
	test.use({ apiOptions: { infoFails: true } });

	test('shows the message with retry and keeps Preferences usable', async ({ page, api }) => {
		await page.goto('/settings?tab=data');

		await expect(page.getByText('Server info unavailable')).toBeVisible();

		const reads = api.calls().filter((call) => call === 'GET info').length;

		await page.getByRole('button', { name: 'Retry' }).first().click();
		await expect.poll(() => api.calls().filter((call) => call === 'GET info').length).toBe(reads + 1);

		await page.getByRole('tab', { name: 'Preferences' }).click();
		await expect(page).toHaveURL('/settings?tab=preferences');
		await expect(page.getByLabel('Rows per page')).toBeVisible();
	});
});
