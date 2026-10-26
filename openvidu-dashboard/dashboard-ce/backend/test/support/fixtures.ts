import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { BSON, type Db, type Document } from 'mongodb';

import type { Collection } from '@openvidu-dashboard/typings';

const require = createRequire(import.meta.url);

/** Documents of a collection from the contract fixtures of `@openvidu-dashboard/typings`, with BSON dates. */
export function loadFixture<T extends Document = Document>(collection: Collection): T[] {
	const path = require.resolve(`@openvidu-dashboard/typings/fixtures/${collection}.json`);

	return BSON.EJSON.parse(readFileSync(path, 'utf8'), { relaxed: true }) as T[];
}

/** Inserts the contract fixtures of the given collections. */
export async function seedFixtures(db: Db, collections: readonly Collection[]): Promise<void> {
	for (const collection of collections) {
		await db.collection(collection).insertMany(loadFixture(collection));
	}
}
