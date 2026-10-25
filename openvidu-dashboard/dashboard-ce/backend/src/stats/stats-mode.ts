import type { Db } from 'mongodb';

import { Collection, type SchemaMetaConfig, StatsDetail } from '@openvidu-dashboard/typings';

export const STATS_MODE_CACHE_MS = 60_000;

function modeOf(document: Pick<SchemaMetaConfig, 'statsDetail'> | null | undefined): StatsDetail {
	return document?.statsDetail === StatsDetail.TRACK ? StatsDetail.TRACK : StatsDetail.PARTICIPANT;
}

/**
 * The writer's `stats_detail` from `schema_meta` `config`, `participant` when not recorded; cached for a minute and
 * refreshed whenever `GET /info` reads `schema_meta`.
 */
export class StatsModeReader {
	private cached: { mode: StatsDetail; at: number } | undefined;

	constructor(
		private readonly db: Db,
		private readonly now: () => Date
	) {}

	async read(): Promise<StatsDetail> {
		const now = this.now().getTime();

		if (this.cached !== undefined && now - this.cached.at < STATS_MODE_CACHE_MS) {
			return this.cached.mode;
		}

		const document = await this.db
			.collection<SchemaMetaConfig>(Collection.SCHEMA_META)
			.findOne({ _id: 'config' }, { projection: { statsDetail: 1 } });

		return this.remember(document);
	}

	/** Caches the mode of a `config` document read elsewhere (`undefined` or `null` when absent). */
	remember(document: Pick<SchemaMetaConfig, 'statsDetail'> | null | undefined): StatsDetail {
		const mode = modeOf(document);

		this.cached = { mode, at: this.now().getTime() };

		return mode;
	}
}
