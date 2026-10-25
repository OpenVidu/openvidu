import { Double, Int32, Long } from 'bson';
import type { BsonSchema, BsonType } from './schema-builder.js';

/**
 * Converts a typed document into Extended JSON whose numbers carry their BSON type (`$numberInt`, `$numberLong`,
 * `$numberDouble`) and whose dates are `{ "$date": "<ISO 8601>" }`, so the Go writer decodes the fixtures with the
 * exact BSON types it must produce. A plain number takes the first numeric `bsonType` of its schema; where the schema
 * does not constrain the value (payloads, writer bookkeeping) numbers must be `Int32`, `Long` or `Double` instances.
 */
export function toExtendedJson(value: unknown, schema: BsonSchema | undefined, path = '$'): unknown {
	if (value instanceof Date) {
		return { $date: value.toISOString() };
	}

	if (value instanceof Int32 || value instanceof Long || value instanceof Double) {
		const type = wrapperType(value);
		assertAllowed(type, schema, path);

		return encodeWrapper(value);
	}

	if (typeof value === 'number') {
		return encodeNumber(value, schema, path);
	}

	if (value === null || typeof value === 'string' || typeof value === 'boolean') {
		return value;
	}

	if (Array.isArray(value)) {
		return value.map((item, i) => toExtendedJson(item, schema?.items, `${path}[${String(i)}]`));
	}

	if (typeof value === 'object') {
		const branch = selectBranch(value as Record<string, unknown>, schema);

		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>).map(([key, item]) => [
				key,
				toExtendedJson(item, propertySchema(branch, key), `${path}.${key}`)
			])
		);
	}

	throw new Error(`${path}: unsupported value of type ${typeof value}`);
}

function encodeNumber(value: number, schema: BsonSchema | undefined, path: string): unknown {
	const type = numericTypes(schema)[0];

	switch (type) {
		case 'int':
			if (!Number.isInteger(value) || value < -(2 ** 31) || value >= 2 ** 31) {
				throw new Error(`${path}: ${String(value)} is not a 32-bit integer`);
			}

			return { $numberInt: String(value) };
		case 'long':
			if (!Number.isSafeInteger(value)) {
				throw new Error(`${path}: ${String(value)} is not an integer`);
			}

			return { $numberLong: String(value) };
		case 'double':
			return { $numberDouble: formatDouble(value) };
		default:
			throw new Error(`${path}: the schema gives no numeric type; wrap the value in Int32, Long or Double`);
	}
}

function encodeWrapper(value: Int32 | Long | Double): unknown {
	if (value instanceof Int32) {
		return { $numberInt: String(value.value) };
	}

	if (value instanceof Long) {
		return { $numberLong: value.toString() };
	}

	return { $numberDouble: formatDouble(value.value) };
}

function wrapperType(value: Int32 | Long | Double): BsonType {
	return value instanceof Int32 ? 'int' : value instanceof Long ? 'long' : 'double';
}

function assertAllowed(type: BsonType, schema: BsonSchema | undefined, path: string): void {
	const allowed = numericTypes(schema);

	if (schema?.bsonType !== undefined && !allowed.includes(type)) {
		throw new Error(`${path}: ${type} is not allowed by the schema (${allowed.join(', ')})`);
	}
}

function numericTypes(schema: BsonSchema | undefined): BsonType[] {
	const types =
		schema?.bsonType === undefined ? [] : Array.isArray(schema.bsonType) ? schema.bsonType : [schema.bsonType];

	return types.filter((type) => type === 'int' || type === 'long' || type === 'double');
}

function formatDouble(value: number): string {
	return Number.isInteger(value) ? value.toFixed(1) : String(value);
}

/** Picks the `oneOf` branch whose `_id` enum contains the document's `_id` (the `schema_meta` layout). */
function selectBranch(value: Record<string, unknown>, schema: BsonSchema | undefined): BsonSchema | undefined {
	if (schema?.oneOf === undefined) {
		return schema;
	}

	const branch = schema.oneOf.find((candidate) => candidate.properties?._id?.enum?.includes(String(value._id)));

	if (branch === undefined) {
		throw new Error(`no oneOf branch for _id ${String(value._id)}`);
	}

	return branch;
}

function propertySchema(schema: BsonSchema | undefined, key: string): BsonSchema | undefined {
	if (schema === undefined) {
		return undefined;
	}

	const declared = schema.properties?.[key];

	if (declared !== undefined) {
		return declared;
	}

	for (const [pattern, patternSchema] of Object.entries(schema.patternProperties ?? {})) {
		if (new RegExp(pattern).test(key)) {
			return patternSchema;
		}
	}

	return typeof schema.additionalProperties === 'object' ? schema.additionalProperties : undefined;
}
