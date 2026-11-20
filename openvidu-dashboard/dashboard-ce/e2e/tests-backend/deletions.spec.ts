import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';
import { MongoClient } from 'mongodb';

import { backendDatabaseFile } from '../scripts/seed-rooms.mjs';

/** The database of the served dashboard, which `serve-dashboard.mjs` publishes. */
function backendDatabase(): { uri: string; database: string } {
	return JSON.parse(readFileSync(backendDatabaseFile(), 'utf8')) as { uri: string; database: string };
}

test('Events deletion accepted: against the real backend', async ({ page }) => {
	const { uri, database } = backendDatabase();
	const client = await MongoClient.connect(uri);
	const events = client.db(database).collection<{ _id: string } & Record<string, unknown>>('events');
	// Events of its own, recorded a day ago and of no room, egress or ingress: deletable on every attempt, retries included.
	const run = String(Date.now());
	const own = Array.from({ length: 12 }, (_, i) => ({
		_id: `AE_e2e_deletion_${run}_${String(i)}`,
		type: 'ROOM_STARTED',
		ts: new Date(Date.now() - 86_400_000),
		nodeId: 'ND_e2e',
		synthetic: false,
		payload: {}
	}));
	// The seeded events the deletion also takes, put back afterwards for the suites that follow.
	const seeded = await events.find({}).toArray();

	try {
		await events.insertMany(own);

		await page.goto('/login?redirect=%2Fsettings%3Ftab%3Ddata');
		await page.getByLabel('Username').fill('admin');
		await page.getByLabel('Password', { exact: true }).fill('e2e-admin-password');
		await page.getByRole('button', { name: 'Sign in' }).click();
		await expect(page).toHaveURL('/settings?tab=data');

		const row = page
			.locator('ovd-data-tab table.classes > tbody > tr')
			.filter({ has: page.getByRole('button', { name: 'Show collections of Events' }) });

		await page.getByRole('button', { name: 'Delete Events' }).click();
		await page
			.getByRole('dialog', { name: 'Delete events?' })
			.getByRole('button', { name: 'Delete', exact: true })
			.click();

		// The status follows the job every 2 s while it runs, and the info document is read again once it ends.
		await expect(row.locator('th .sub')).toHaveText(/^Deleted \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, { timeout: 30_000 });
		await expect(page.locator('ovd-data-tab section.deletion')).toHaveCount(0);
		expect(await events.countDocuments({ _id: { $in: own.map((event) => event._id) } })).toBe(0);
	} finally {
		const left = new Set((await events.find({}, { projection: { _id: 1 } }).toArray()).map((event) => event._id));
		const missing = seeded.filter((event) => !left.has(event._id));

		if (missing.length > 0) {
			await events.insertMany(missing);
		}

		await client.close();
	}
});
