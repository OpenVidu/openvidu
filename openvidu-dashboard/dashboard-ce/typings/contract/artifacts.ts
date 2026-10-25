import { COLLECTIONS, SCHEMA_VERSION } from '../src/index.js';
import { toExtendedJson } from './ejson.js';
import { FIXTURES } from './fixtures/index.js';
import { COLLECTION_DEFINITIONS, INDEXES } from './indexes.js';
import { COLLECTION_SCHEMAS } from './schemas.js';

/** Generated contract files keyed by their path relative to the package root. JSON files hold plain JSON values. */
export function buildArtifacts(): Map<string, unknown> {
	const artifacts = new Map<string, unknown>();

	for (const collection of COLLECTIONS) {
		artifacts.set(`schema/${collection}.schema.json`, COLLECTION_SCHEMAS[collection]);
	}

	artifacts.set('schema/indexes.json', INDEXES);
	artifacts.set('schema/collections.json', COLLECTION_DEFINITIONS);
	artifacts.set('schema/contract_version.txt', `${String(SCHEMA_VERSION)}\n`);

	for (const collection of COLLECTIONS) {
		const schema = COLLECTION_SCHEMAS[collection];
		artifacts.set(
			`fixtures/${collection}.json`,
			FIXTURES[collection].map((document, i) => toExtendedJson(document, schema, `${collection}[${String(i)}]`))
		);
	}

	return artifacts;
}
