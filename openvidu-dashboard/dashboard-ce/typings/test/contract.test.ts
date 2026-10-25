import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EJSON, Int32 } from 'bson';
import { describe, expect, it } from 'vitest';
import { buildArtifacts } from '../contract/artifacts.js';
import type { BsonSchema } from '../contract/schema-builder.js';
import {
	Collection,
	COLLECTIONS,
	type CollectionDefinition,
	DEFAULT_RETENTION_MS,
	DEFAULT_UNSTORED_EVENT_TYPES,
	ENTITY_RETENTION_CLASS,
	type IndexDefinition,
	RetentionClass,
	SCHEMA_VERSION,
	StoredEventType
} from '../src/index.js';
import { createBsonValidator, describeErrors } from './support/bson-validator.js';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));

function readText(relativePath: string): string {
	return readFileSync(join(packageRoot, relativePath), 'utf8');
}

function readJson(relativePath: string): unknown {
	return JSON.parse(readText(relativePath));
}

function readSchema(collection: Collection): BsonSchema {
	return readJson(`schema/${collection}.schema.json`) as BsonSchema;
}

function readFixtures(collection: Collection): Record<string, unknown>[] {
	return EJSON.parse(readText(`fixtures/${collection}.json`), { relaxed: false }) as Record<string, unknown>[];
}

const ajv = createBsonValidator();
const validators = new Map(COLLECTIONS.map((collection) => [collection, ajv.compile(readSchema(collection))]));

function validate(collection: Collection, document: unknown): string | null {
	const validator = validators.get(collection);

	if (validator === undefined) {
		throw new Error(`no validator for ${collection}`);
	}

	return validator(document) ? null : describeErrors(validator);
}

describe('generated contract files', () => {
	it.each([...buildArtifacts().entries()])('%s matches its source', (relativePath, expected) => {
		if (typeof expected === 'string') {
			expect(readText(relativePath)).toBe(expected);
		} else {
			expect(readJson(relativePath)).toEqual(JSON.parse(JSON.stringify(expected)));
		}
	});

	it('records the schema version', () => {
		expect(readText('schema/contract_version.txt').trim()).toBe(String(SCHEMA_VERSION));
	});
});

describe('schema files', () => {
	const MONGODB_KEYWORDS = new Set([
		'bsonType',
		'description',
		'enum',
		'pattern',
		'minimum',
		'maxItems',
		'items',
		'required',
		'properties',
		'patternProperties',
		'additionalProperties',
		'oneOf'
	]);

	function unsupportedKeywords(schema: BsonSchema, path: string): string[] {
		const found: string[] = [];

		for (const [keyword, value] of Object.entries(schema)) {
			if (!MONGODB_KEYWORDS.has(keyword)) {
				found.push(`${path}.${keyword}`);
			}

			if (keyword === 'properties' || keyword === 'patternProperties') {
				for (const [name, child] of Object.entries(value as Record<string, BsonSchema>)) {
					found.push(...unsupportedKeywords(child, `${path}.${name}`));
				}
			} else if ((keyword === 'items' || keyword === 'additionalProperties') && typeof value === 'object') {
				found.push(...unsupportedKeywords(value as BsonSchema, `${path}.${keyword}`));
			} else if (keyword === 'oneOf') {
				for (const [i, child] of (value as BsonSchema[]).entries()) {
					found.push(...unsupportedKeywords(child, `${path}.oneOf[${String(i)}]`));
				}
			}
		}

		return found;
	}

	it.each(COLLECTIONS)('%s uses only keywords MongoDB accepts in $jsonSchema', (collection) => {
		expect(unsupportedKeywords(readSchema(collection), collection)).toEqual([]);
	});

	it('rejects a room whose createdAt is a string', () => {
		const [room] = readFixtures(Collection.ROOMS);
		expect(validate(Collection.ROOMS, { ...room, createdAt: '2026-10-12T09:00:00Z' })).toContain('/createdAt');
	});

	it('rejects unknown fields and enum values', () => {
		const [room] = readFixtures(Collection.ROOMS);
		expect(validate(Collection.ROOMS, { ...room, turnPassword: 'x' })).not.toBeNull();
		expect(validate(Collection.ROOMS, { ...room, status: 'ended' })).not.toBeNull();
	});

	it('rejects an int32 where a double is required', () => {
		const [room] = readFixtures(Collection.ROOMS);
		const quality = (room as { quality: Record<string, unknown> }).quality;
		expect(validate(Collection.ROOMS, { ...room, quality: { ...quality, scoreSum: new Int32(1296) } })).toContain(
			'/quality/scoreSum'
		);
	});

	it('rejects a node batch interval below one second', () => {
		const [node] = readFixtures(Collection.NODES);
		expect(validate(Collection.NODES, { ...node, batchIntervalMs: new Int32(500) })).toContain('/batchIntervalMs');
		expect(validate(Collection.NODES, { ...node, batchIntervalMs: new Int32(1000) })).toBeNull();
	});

	it('rejects API_CALL raw events', () => {
		const [event] = readFixtures(Collection.EVENTS);
		expect(validate(Collection.EVENTS, { ...event, type: 'API_CALL' })).not.toBeNull();
	});

	it('rejects rollup counters keyed by free text', () => {
		const [hourly] = readFixtures(Collection.ANALYTICS_HOURLY);
		const participants = (hourly as { participants: Record<string, unknown> }).participants;
		expect(
			validate(Collection.ANALYTICS_HOURLY, {
				...hourly,
				participants: { ...participants, byOs: { 'Windows 11': 1 } }
			})
		).not.toBeNull();
	});
});

describe('fixtures', () => {
	it.each(COLLECTIONS)('%s documents validate against their schema', (collection) => {
		const documents = readFixtures(collection);
		expect(documents.length).toBeGreaterThan(0);

		for (const document of documents) {
			expect(validate(collection, document), String(document._id)).toBeNull();
		}
	});

	it('contain no secret field names', () => {
		const forbidden = new Set(['turnpassword', 'accesskey', 'secret', 'streamkey', 'token', 'signingkey']);
		const found: string[] = [];

		const walk = (value: unknown, path: string): void => {
			if (Array.isArray(value)) {
				for (const [i, item] of value.entries()) {
					walk(item, `${path}[${String(i)}]`);
				}
			} else if (value !== null && typeof value === 'object') {
				for (const [key, child] of Object.entries(value)) {
					if (forbidden.has(key.replaceAll('_', '').toLowerCase())) {
						found.push(`${path}.${key}`);
					}

					walk(child, `${path}.${key}`);
				}
			}
		};

		for (const collection of COLLECTIONS) {
			walk(readJson(`fixtures/${collection}.json`), collection);
		}

		expect(found).toEqual([]);
	});

	it('cover the cases the contract describes', () => {
		const field = (collection: Collection, name: string): unknown[] =>
			readFixtures(collection).map((doc) => doc[name]);

		expect(field(Collection.ROOMS, 'status')).toEqual(expect.arrayContaining(['active', 'closed']));
		expect(new Set(field(Collection.PARTICIPANTS, 'status'))).toEqual(
			new Set(['joining', 'active', 'left', 'aborted'])
		);
		expect(field(Collection.PARTICIPANTS, 'kind')).toEqual(
			expect.arrayContaining(['STANDARD', 'EGRESS', 'INGRESS', 'SIP', 'AGENT'])
		);
		expect(field(Collection.TRACK_SUBSCRIPTIONS, 'status')).toEqual(
			expect.arrayContaining(['requested', 'subscribed', 'unsubscribed', 'failed'])
		);
		expect(field(Collection.EGRESSES, 'status')).toEqual(expect.arrayContaining(['complete', 'failed', 'active']));
		expect(readFixtures(Collection.EGRESSES).every((egress) => (egress.outputs as unknown[]).length > 0)).toBe(
			true
		);

		const sessionsPerIngress = new Map<unknown, number>();

		for (const ingressId of field(Collection.INGRESS_SESSIONS, 'ingressId')) {
			sessionsPerIngress.set(ingressId, (sessionsPerIngress.get(ingressId) ?? 0) + 1);
		}

		expect(Math.max(...sessionsPerIngress.values())).toBeGreaterThanOrEqual(2);

		const storedByDefault = Object.values(StoredEventType).filter(
			(type) => !DEFAULT_UNSTORED_EVENT_TYPES.includes(type)
		);
		expect(new Set(field(Collection.EVENTS, 'type'))).toEqual(new Set(storedByDefault));

		const statsWithTrack = readFixtures(Collection.TRACK_STATS).map((doc) => 'trackSid' in (doc.meta as object));
		expect(new Set(statsWithTrack)).toEqual(new Set([true, false]));

		for (const rollups of [Collection.ANALYTICS_5MIN, Collection.ANALYTICS_HOURLY, Collection.ANALYTICS_DAILY]) {
			expect(new Set(field(rollups, 'scope').map((scope) => String(scope).split(':')[0]))).toEqual(
				new Set(['global', 'node'])
			);
		}

		expect(field(Collection.SCHEMA_META, '_id')).toEqual(
			expect.arrayContaining(['schema', 'retention', 'capabilities', 'config', 'migration', 'reconciler'])
		);

		const reconciled = readFixtures(Collection.PARTICIPANTS).filter((doc) => doc.closedBy === 'reconciler');
		expect(reconciled.map((doc) => doc.disconnectReason)).toEqual(['RECONCILED']);
		const synthetic = readFixtures(Collection.EVENTS).filter((doc) => doc.synthetic === true);
		expect(synthetic.map((doc) => [doc._id, doc.participantSid, doc.ts])).toEqual([
			[`AE_SYN_${String(reconciled[0]?._id)}`, reconciled[0]?._id, reconciled[0]?.leftAt]
		]);
	});

	it('carry the schema version on every entity document', () => {
		for (const collection of Object.keys(ENTITY_RETENTION_CLASS) as Collection[]) {
			for (const document of readFixtures(collection)) {
				expect(document.schemaVersion?.valueOf()).toBe(SCHEMA_VERSION);
			}
		}
	});
});

describe('index definitions', () => {
	const indexes = readJson('schema/indexes.json') as IndexDefinition[];
	const collections = readJson('schema/collections.json') as CollectionDefinition[];

	function hasPath(schema: BsonSchema, path: string): boolean {
		const [head, ...rest] = path.split('.');
		const child = head === undefined ? undefined : schema.properties?.[head];

		return child !== undefined && (rest.length === 0 || hasPath(child, rest.join('.')));
	}

	it('list every collection once, in the order of the Collection enum', () => {
		expect(collections.map((definition) => definition.name)).toEqual(COLLECTIONS);
	});

	it('use unique names per collection', () => {
		const names = indexes.map((index) => `${index.collection}.${index.name}`);
		expect(new Set(names).size).toBe(names.length);
	});

	it('index only fields of the collection schema', () => {
		for (const index of indexes) {
			const schema = readSchema(index.collection);

			for (const [field] of index.key) {
				expect(hasPath(schema, field), `${index.collection}.${index.name}: ${field}`).toBe(true);
			}
		}
	});

	it('give every entity collection an expiresAt TTL index', () => {
		for (const collection of Object.keys(ENTITY_RETENTION_CLASS)) {
			expect(
				indexes.some(
					(index) =>
						index.collection === collection &&
						index.key.length === 1 &&
						index.key[0]?.[0] === 'expiresAt' &&
						index.options.expireAfterSeconds === 0
				),
				collection
			).toBe(true);
		}
	});

	it('expire every rollup collection by bucket with its own retention class', () => {
		const ttl = (collection: Collection) =>
			indexes.find((index) => index.collection === collection && index.name === 'bucket_ttl');

		expect(ttl(Collection.ANALYTICS_5MIN)?.retentionClass).toBe(RetentionClass.ROLLUPS_5MIN);
		expect(ttl(Collection.ANALYTICS_HOURLY)?.retentionClass).toBe(RetentionClass.ROLLUPS_HOURLY);
		expect(ttl(Collection.ANALYTICS_DAILY)?.retentionClass).toBe(RetentionClass.ROLLUPS_DAILY);
		expect(DEFAULT_RETENTION_MS.rollupsDaily).toBeNull();
	});

	it('never combine a fixed TTL with a retention class', () => {
		for (const index of indexes) {
			expect(index.retentionClass !== undefined && index.options.expireAfterSeconds !== undefined).toBe(false);
		}
	});
});
