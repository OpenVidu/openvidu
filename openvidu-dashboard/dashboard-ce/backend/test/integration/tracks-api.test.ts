import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { bootClient, type Client, issue } from '../support/api-client.js';

const mongoUri = inject('mongoUri');

describe.skipIf(mongoUri === '')('tracks API', () => {
	let ce: Client;

	beforeAll(async () => {
		ce = await bootClient(mongoUri);
	});

	afterAll(async () => {
		await ce.dashboard.stop();
	});

	describe('CE edition', () => {
		it.each(['/tracks/TR_a1b2', '/tracks/TR_a1b2/subscriptions', '/tracks/TR_a1b2/series'])(
			'answers PRO_FEATURE on %s',
			async (path) => {
				expect(await issue(ce, path)).toMatchObject({
					status: 403,
					code: 'PRO_FEATURE',
					feature: 'track-detail'
				});
				expect((await fetch(`${ce.dashboard.url}/api/v1${path}`)).status).toBe(401);
			}
		);
	});
});
