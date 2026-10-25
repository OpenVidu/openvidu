import { randomBytes } from 'node:crypto';

import { Binary, type Db, MongoServerError } from 'mongodb';

import { DashboardCollection } from './collections.js';

interface SigningKeyDocument {
	_id: 'signing-key';
	key: Binary;
	createdAt: Date;
}

const DUPLICATE_KEY = 11_000;

/**
 * The key that signs access tokens: `DASHBOARD_JWT_SECRET` when set, otherwise the one stored in
 * `dashboard_settings`, created by the first replica that starts; the unique `_id` makes concurrent replicas
 * converge on one key.
 */
export async function provisionSigningKey(db: Db, secret: string | undefined): Promise<Uint8Array> {
	if (secret !== undefined) {
		return new TextEncoder().encode(secret);
	}

	const settings = db.collection<SigningKeyDocument>(DashboardCollection.SETTINGS);
	const stored = await settings.findOne({ _id: 'signing-key' });

	if (stored) {
		return stored.key.buffer;
	}

	const key = randomBytes(32);

	try {
		await settings.insertOne({ _id: 'signing-key', key: new Binary(key), createdAt: new Date() });

		return new Uint8Array(key);
	} catch (error) {
		if (!(error instanceof MongoServerError) || error.code !== DUPLICATE_KEY) {
			throw error;
		}

		const winner = await settings.findOne({ _id: 'signing-key' });

		if (!winner) {
			throw new Error('The signing key was inserted by another replica but cannot be read', { cause: error });
		}

		return winner.key.buffer;
	}
}
