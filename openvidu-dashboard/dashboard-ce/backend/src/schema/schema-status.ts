import type { Db } from 'mongodb';

import {
	Collection,
	type InfoSchema,
	MIN_SUPPORTED_SCHEMA_VERSION,
	SCHEMA_VERSION,
	type SchemaMetaSchema,
	WriterSchemaStatus
} from '@openvidu-dashboard/typings';

/** Compares the writer's recorded schema version with the range this dashboard reads. */
export function schemaStatus(writer: number | undefined): InfoSchema {
	if (writer === undefined) {
		return { dashboard: SCHEMA_VERSION, status: WriterSchemaStatus.UNINITIALIZED };
	}

	let status: WriterSchemaStatus = WriterSchemaStatus.OK;

	if (writer < MIN_SUPPORTED_SCHEMA_VERSION) {
		status = WriterSchemaStatus.OLDER;
	} else if (writer > SCHEMA_VERSION) {
		status = WriterSchemaStatus.NEWER;
	}

	return { dashboard: SCHEMA_VERSION, writer, status };
}

/** Reads `schema_meta` `_id: "schema"`; called on every request that reports the status. */
export async function readSchemaStatus(db: Db): Promise<InfoSchema> {
	const document = await db
		.collection<SchemaMetaSchema>(Collection.SCHEMA_META)
		.findOne({ _id: 'schema' }, { projection: { version: 1 } });

	return schemaStatus(typeof document?.version === 'number' ? document.version : undefined);
}

/** Log line of a writer too old for this dashboard; the dashboard then exits with code 3. */
export function olderSchemaMessage(writer: number): string {
	return (
		`Analytics schema version ${String(writer)} is older than the minimum ${String(MIN_SUPPORTED_SCHEMA_VERSION)} ` +
		'supported by this dashboard; upgrade the OpenVidu server'
	);
}
