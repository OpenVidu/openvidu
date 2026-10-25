import { expect, test } from '../fixtures/api.js';
import { expectNoViolations } from '../fixtures/axe.js';
import { PARTICIPANTS } from '../fixtures/participants.js';

test.use({ apiOptions: { participants: PARTICIPANTS } });

test('CE lists agent sessions with the counter tiles and the notice', async ({ page, api }) => {
	await page.goto('/agents?from=now-24h&to=now&tz=UTC');

	const table = page.getByRole('table', { name: 'Agents' });

	await expect(page.getByRole('navigation', { name: 'Main' }).getByLabel('OpenVidu PRO')).toHaveCount(0);
	await expect(page.getByText('is available in OpenVidu PRO')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Refresh now' })).toBeVisible();
	await expect(table.getByRole('row')).toHaveCount(3);
	await expect(table.getByRole('row', { name: /agent-1/ }).getByRole('link', { name: 'PA_agent1' })).toHaveAttribute(
		'href',
		/\/participants\/PA_agent1/
	);
	await expect(table.getByRole('row', { name: /agent-1/ })).not.toContainText('GO 1.2');
	await expect(page.locator('ovd-kpi-tile').filter({ hasText: 'Agents now' })).toContainText('2');
	await expect(page.getByRole('region', { name: 'Agents summary' })).toContainText('Agent sessions in range');
	await expect(page.getByRole('link', { name: 'See them among the participants' })).toHaveAttribute(
		'href',
		/\/participants\?.*kind=AGENT/
	);
	expect(api.calls()).toContain('GET overview');

	await page.getByRole('combobox', { name: 'Status' }).click();
	await page.getByRole('option', { name: 'Active' }).click();
	await expect(page).toHaveURL(/status=active/);
	await expect(table.getByRole('row')).toHaveCount(2);
	// The option closed under the pointer, over a copy button whose tooltip fades in while axe runs.
	await page.mouse.move(0, 0);
	await expectNoViolations(page);
});

test('an agent links to its locked participant detail in CE', async ({ page }) => {
	await page.goto('/agents?from=now-24h&to=now&tz=UTC');
	await page.getByRole('table', { name: 'Agents' }).getByRole('link', { name: 'PA_agent1' }).click();

	await expect(page).toHaveURL(/\/participants\/PA_agent1/);
	await expect(page.getByText('Participant detail is available in OpenVidu PRO')).toBeVisible();
});
