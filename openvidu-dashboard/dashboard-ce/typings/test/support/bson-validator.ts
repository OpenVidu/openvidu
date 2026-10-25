import { Ajv, type ValidateFunction } from 'ajv';

type BsonTypeName =
	'object' | 'array' | 'string' | 'bool' | 'date' | 'int' | 'long' | 'double' | 'objectId' | 'null' | 'binData';

/** BSON type of a value decoded with `EJSON.parse(text, { relaxed: false })`. */
export function bsonTypeOf(value: unknown): BsonTypeName | 'unknown' {
	if (value === null) {
		return 'null';
	}

	if (value instanceof Date) {
		return 'date';
	}

	if (Array.isArray(value)) {
		return 'array';
	}

	switch (typeof value) {
		case 'string':
			return 'string';
		case 'boolean':
			return 'bool';
		case 'object':
			return bsonWrapperType(value);
		default:
			return 'unknown';
	}
}

function bsonWrapperType(value: { _bsontype?: unknown }): BsonTypeName {
	switch (value._bsontype) {
		case 'Int32':
			return 'int';
		case 'Long':
			return 'long';
		case 'Double':
			return 'double';
		case 'ObjectId':
			return 'objectId';
		case 'Binary':
			return 'binData';
		default:
			return 'object';
	}
}

/**
 * JSON Schema validator that understands MongoDB's `bsonType` keyword, so the validator files of `schema/` can check
 * documents decoded from canonical Extended JSON.
 */
export function createBsonValidator(): Ajv {
	const ajv = new Ajv({ allErrors: true, strict: true, strictTypes: false });

	ajv.addKeyword({
		keyword: 'bsonType',
		schemaType: ['string', 'array'],
		validate: (expected: string | string[], data: unknown) => {
			const types = Array.isArray(expected) ? expected : [expected];

			return types.includes(bsonTypeOf(data));
		}
	});

	// The built-in `minimum` skips BSON number wrappers, which are objects.
	ajv.removeKeyword('minimum');
	ajv.addKeyword({
		keyword: 'minimum',
		schemaType: 'number',
		validate: (minimum: number, data: unknown) => {
			const value = numberOf(data);

			return value === undefined || value >= minimum;
		}
	});

	return ajv;
}

function numberOf(value: unknown): number | undefined {
	if (typeof value === 'number') {
		return value;
	}

	switch (bsonTypeOf(value)) {
		case 'int':
		case 'long':
		case 'double':
			return Number(value);
		default:
			return undefined;
	}
}

export function describeErrors(validate: ValidateFunction): string {
	return (validate.errors ?? [])
		.map((error) => `${error.instancePath || '/'} ${error.message ?? ''} ${JSON.stringify(error.params)}`)
		.join('\n');
}
