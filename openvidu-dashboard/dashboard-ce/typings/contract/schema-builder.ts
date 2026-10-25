/**
 * Helpers that build MongoDB `$jsonSchema` documents. Only keywords MongoDB accepts are emitted (`bsonType` instead of
 * `type`; no `$schema`, `$ref`, `format` or `default`), so the generated files work as collection validators and,
 * with a `bsonType` keyword, in a standard JSON Schema validator.
 */

export type BsonType =
	'object' | 'array' | 'string' | 'bool' | 'date' | 'int' | 'long' | 'double' | 'objectId' | 'null';

export interface BsonSchema {
	bsonType?: BsonType | BsonType[];
	description?: string;
	enum?: readonly string[];
	pattern?: string;
	minimum?: number;
	maxItems?: number;
	items?: BsonSchema;
	required?: string[];
	properties?: Record<string, BsonSchema>;
	patternProperties?: Record<string, BsonSchema>;
	additionalProperties?: boolean | BsonSchema;
	oneOf?: BsonSchema[];
}

const REQUIRED = Symbol('required');

type Field = BsonSchema & { [REQUIRED]?: true };

/** Marks a property as required in the enclosing `obj()`. */
export function req(schema: BsonSchema): Field {
	return { ...schema, [REQUIRED]: true };
}

export function str(description?: string): BsonSchema {
	return withDescription({ bsonType: 'string' }, description);
}

export function bool(description?: string): BsonSchema {
	return withDescription({ bsonType: 'bool' }, description);
}

export function date(description?: string): BsonSchema {
	return withDescription({ bsonType: 'date' }, description);
}

/** Counter or small integer; written as int32, int64 accepted. */
export function int(description?: string): BsonSchema {
	return withDescription({ bsonType: ['int', 'long'] }, description);
}

/** Milliseconds or bytes; written as int64, int32 accepted. */
export function long(description?: string): BsonSchema {
	return withDescription({ bsonType: ['long', 'int'] }, description);
}

export function double(description?: string): BsonSchema {
	return withDescription({ bsonType: 'double' }, description);
}

type Values = Readonly<Record<string, string>> | readonly string[];

function isList(values: Values): values is readonly string[] {
	return Array.isArray(values);
}

function valuesOf(values: Values): string[] {
	return isList(values) ? [...values] : Object.values(values);
}

export function oneOfValues(values: Values, description?: string): BsonSchema {
	return withDescription({ bsonType: 'string', enum: valuesOf(values) }, description);
}

export function arr(items: BsonSchema, options: { maxItems?: number; description?: string } = {}): BsonSchema {
	return withDescription(
		{ bsonType: 'array', items, ...(options.maxItems === undefined ? {} : { maxItems: options.maxItems }) },
		options.description
	);
}

export function nullable(schema: BsonSchema): BsonSchema {
	const types: BsonType[] =
		schema.bsonType === undefined ? [] : Array.isArray(schema.bsonType) ? schema.bsonType : [schema.bsonType];

	return { ...schema, bsonType: [...types, 'null'] };
}

/** Object whose properties are listed; unknown properties are rejected unless `additionalProperties` says otherwise. */
export function obj(
	fields: Record<string, Field>,
	options: { additionalProperties?: boolean | BsonSchema; description?: string } = {}
): BsonSchema {
	const required = Object.entries(fields)
		.filter(([, field]) => field[REQUIRED] === true)
		.map(([name]) => name);
	const properties = Object.fromEntries(
		Object.entries(fields).map(([name, field]) => {
			const { [REQUIRED]: _required, ...schema } = field;

			return [name, schema];
		})
	);

	return withDescription(
		{
			bsonType: 'object',
			...(required.length > 0 ? { required } : {}),
			properties,
			additionalProperties: options.additionalProperties ?? false
		},
		options.description
	);
}

/** Object with arbitrary content (protocol payloads, writer bookkeeping). */
export function anyObject(description?: string): BsonSchema {
	return withDescription({ bsonType: 'object' }, description);
}

/** Map from a closed set of keys to integer counts. */
export function counts(keys: Values, description?: string): BsonSchema {
	const fields = Object.fromEntries(valuesOf(keys).map((key) => [key, int()]));

	return obj(fields, description === undefined ? {} : { description });
}

/** Map whose keys match `pattern`, each holding an integer count. */
export function patternCounts(pattern: string, description?: string): BsonSchema {
	return withDescription(
		{ bsonType: 'object', patternProperties: { [pattern]: int() }, additionalProperties: false },
		description
	);
}

function withDescription(schema: BsonSchema, description: string | undefined): BsonSchema {
	return description === undefined ? schema : { ...schema, description };
}
