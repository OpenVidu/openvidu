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
	await expect(page.locator('ovd-kpi-tile').filter({ hasText: 'Active now' })).toContainText('2');
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

test('Detail links in CE: the SID and room links of an agent open their locked details', async ({ page }) => {
	await page.goto('/agents?from=now-24h&to=now&tz=UTC');
	await page.getByRole('table', { name: 'Agents' }).getByRole('link', { name: 'PA_agent1' }).click();

	await expect(page).toHaveURL(/\/participants\/PA_agent1/);
	await expect(page.getByText('Participant detail is available in OpenVidu PRO')).toBeVisible();

	await page.goto('/agents?from=now-24h&to=now&tz=UTC');
	await page
		.getByRole('table', { name: 'Agents' })
		.getByRole('row', { name: /agent-1/ })
		.getByRole('link', { name: 'demo-room' })
		.click();

	await expect(page).toHaveURL(/\/rooms\/RM_ab12cd/);
	await expect(page.getByText('Room detail is available in OpenVidu PRO')).toBeVisible();
});

test('OpenVidu agent with a name: the name, then the OpenVidu tag as high as the status badge', async ({ page }) => {
	await page.goto('/agents?from=now-24h&to=now&tz=UTC');

	const table = page.getByRole('table', { name: 'Agents' });
	const openvidu = table.getByRole('row', { name: /agent-1/ });
	const tag = openvidu.locator('.origin');
	const status = openvidu.locator('ovd-status-badge .ovd-tag');

	await expect(openvidu.getByRole('cell').nth(1)).toHaveText(/^\s*speech-processing\s+OpenVidu\s*$/);
	await expect(tag).toHaveText('OpenVidu');

	const [tagBox, statusBox] = await Promise.all([tag.boundingBox(), status.boundingBox()]);

	expect(tagBox?.height).toBe(24);
	expect(tagBox?.height).toBe(statusBox?.height);

	const thirdParty = table.getByRole('row', { name: /agent-2/ });

	await expect(thirdParty.getByRole('cell').nth(1)).toHaveText('dummy-agent');
	await expect(thirdParty.locator('.origin')).toHaveCount(0);
});

test('OpenVidu origin selected: the URL gets origin=openvidu and the OpenVidu agent stays', async ({ page }) => {
	await page.goto('/agents?from=now-24h&to=now&tz=UTC');

	const table = page.getByRole('table', { name: 'Agents' });

	await expect(table.getByRole('row')).toHaveCount(3);
	await page.getByRole('combobox', { name: 'Origin' }).click();
	await page.getByRole('option', { name: 'OpenVidu' }).click();

	await expect(page).toHaveURL(/origin=openvidu/);
	await expect(table.getByRole('row')).toHaveCount(2);
	await expect(table.getByRole('row', { name: /agent-1/ })).toBeVisible();
});
