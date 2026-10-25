import type { Db } from 'mongodb';

import { Collection, DEFAULT_RETENTION_MS, type SchemaMetaRetention } from '@openvidu-dashboard/typings';

/** Effective stats retention from `schema_meta`, or the writer default before the writer has recorded it. */
export async function readStatsRetentionMs(db: Db): Promise<number> {
	const document = await db
		.collection<SchemaMetaRetention>(Collection.SCHEMA_META)
		.findOne({ _id: 'retention' }, { projection: { statsMs: 1 } });

	return typeof document?.statsMs === 'number' ? document.statsMs : (DEFAULT_RETENTION_MS.stats ?? 0);
}

export interface RetentionMs {
	statsMs: number;
	entitiesMs: number;
	rollups5MinMs: number;
	rollupsHourlyMs: number;
}

/** Retention of the stats, entity, 5-minute and hourly rollup classes from `schema_meta`, or the writer defaults. */
export async function readRetentionMs(db: Db): Promise<RetentionMs> {
	const document = await db
		.collection<SchemaMetaRetention>(Collection.SCHEMA_META)
		.findOne(
			{ _id: 'retention' },
			{ projection: { statsMs: 1, entitiesMs: 1, rollups5MinMs: 1, rollupsHourlyMs: 1 } }
		);
	const pick = (value: unknown, fallback: number | null) =>
		typeof value === 'number' ? value : (fallback ?? Number.POSITIVE_INFINITY);

	return {
		statsMs: pick(document?.statsMs, DEFAULT_RETENTION_MS.stats),
		entitiesMs: pick(document?.entitiesMs, DEFAULT_RETENTION_MS.entities),
		rollups5MinMs: pick(document?.rollups5MinMs, DEFAULT_RETENTION_MS.rollups5Min),
		rollupsHourlyMs: pick(document?.rollupsHourlyMs, DEFAULT_RETENTION_MS.rollupsHourly)
	};
}
