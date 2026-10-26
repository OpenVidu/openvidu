import { expect, test } from '../fixtures/api.js';
import { expectNoViolations } from '../fixtures/axe.js';
import { PARTICIPANTS } from '../fixtures/participants.js';

test.use({ apiOptions: { participants: PARTICIPANTS } });

test('searches identities, filters by kind and status and links the room and the detail', async ({ page }) => {
	await page.goto('/participants?from=now-24h&to=now&tz=UTC');

	const table = page.getByRole('table', { name: 'Participants' });

	await expect(page.locator('ovd-header ovd-refresh-control')).toBeVisible();

	// Standard participants only by default.
	await expect(table.getByRole('row')).toHaveCount(3);

	const alice = table.getByRole('row', { name: /alice/ });

	await expect(alice.getByRole('link', { name: 'PA_x1y2' })).toHaveAttribute('href', /\/participants\/PA_x1y2/);
	await expect(alice.getByRole('link', { name: 'demo-room' })).toHaveAttribute('href', /\/rooms\/RM_ab12cd/);
	await expect(alice.locator('ovd-source-icon')).toHaveCount(2);
	await expect(alice).not.toContainText('Chrome');

	await page.getByRole('combobox', { name: 'Kind' }).click();
	await expect(page.getByRole('option')).toHaveText(['Standard', 'Ingress', 'Egress', 'Agent']);
	await page.getByRole('option', { name: 'Agent' }).click();
	await page.keyboard.press('Escape');
	await expect(page).toHaveURL(/kind=STANDARD,AGENT/);
	await expect(table.getByRole('row')).toHaveCount(5);

	const search = page.getByLabel('Identity or SID');

	await search.fill('a');
	await expect(page.getByText('Type at least 2 characters')).toBeVisible();
	await search.fill('ag');
	await expect(page).toHaveURL(/q=ag/);
	await expect(table.getByRole('row')).toHaveCount(3);

	await page.getByRole('combobox', { name: 'Status' }).click();
	await page.getByRole('option', { name: 'Active' }).click();
	await expect(page).toHaveURL(/status=active/);
	await expect(table.getByRole('row')).toHaveCount(2);
	await expectNoViolations(page);
});

test('the room chip clears the room filter and an exact SID opens the locked detail', async ({ page, api }) => {
	await page.goto('/participants?room=RM_other&kind=all&from=now-24h&to=now&tz=UTC');

	await expect(page.getByText('Room: other-room')).toBeVisible();
	await page.getByRole('button', { name: /Remove room filter/ }).click();
	await expect(page).not.toHaveURL(/room=/);

	await page.getByLabel('Identity or SID').fill('PA_x1y2');
	await page.getByLabel('Identity or SID').press('Enter');
	await expect(page).toHaveURL(/\/participants\/PA_x1y2\?/);
	await expect(page.getByText('Participant detail is available in OpenVidu PRO')).toBeVisible();
	await expect(page.getByRole('heading', { level: 1, name: 'alice' })).toBeVisible();
	expect(api.calls().filter((call) => call.startsWith('GET participants/PA_'))).toEqual([]);
});

test('the empty state clears every filter', async ({ page }) => {
	await page.goto('/participants?q=zzz&kind=AGENT&from=now-24h&to=now&tz=UTC');

	await expect(page.getByText('No participants match')).toBeVisible();
	await page.getByRole('button', { name: 'Clear filters' }).click();
	await expect(page).not.toHaveURL(/q=|kind=/);
	await expect(page.getByRole('table', { name: 'Participants' }).getByRole('row')).toHaveCount(3);
});
