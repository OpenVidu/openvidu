import type { Db } from 'mongodb';
import { describe, expect, it } from 'vitest';

import { rankedSortLimits } from '../../src/api/ranked-limits.js';
import { FigureCaches } from '../../src/deletions/figure-caches.js';
import { InfoService } from '../../src/info/info-service.js';

/** A database with one `events` collection whose `$collStats` waits for `release()` while `held`. */
function slowStatsDb() {
	let statsReads = 0;
	let held = true;
	let release: () => void = () => undefined;
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	const cursor = (documents: unknown[]) => {
		const self = { sort: () => self, limit: () => self, toArray: () => Promise.resolve(documents) };

		return self;
	};
	const collection = () => ({
		find: () => cursor([]),
		aggregate: () => ({
			toArray: async () => {
				statsReads++;

				if (held) {
					await gate;
				}

				return [{ storageStats: { count: statsReads, storageSize: 1_000, totalIndexSize: 0 } }];
			}
		})
	});
	const db = {
		collection,
		command: () => Promise.resolve({ version: '8.0.29', localTime: new Date() }),
		listCollections: () => ({ toArray: () => Promise.resolve([{ name: 'events' }]) })
	} as unknown as Db;

	return {
		db,
		statsReads: () => statsReads,
		release: () => {
			held = false;
			release();
		}
	};
}

describe('storage cache', () => {
	it('does not keep the figures of a read that a completion cleared while it ran', async () => {
		const { db, statsReads, release } = slowStatsDb();
		const caches = new FigureCaches();
		const info = new InfoService(db, {
			edition: 'ce',
			version: 'test',
			features: () => [],
			limits: rankedSortLimits(7 * 86_400_000),
			openapiDocsEnabled: false,
			caches
		});
		const inFlight = info.fullInfo();

		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(statsReads()).toBe(1);

		// A status read finds a completion while the storage read is in flight.
		const completed = { cutoff: new Date(), endedBefore: new Date(), finishedAt: new Date() };

		caches.observe({ _id: 'dashboard', deletions: { events: { completed } } });
		release();

		expect((await inFlight).storage.events?.documents).toBe(1);
		expect((await info.fullInfo()).storage.events?.documents).toBe(2);
		expect(statsReads()).toBe(2);
		// The figures of a read that no clear interrupted are kept.
		expect((await info.fullInfo()).storage.events?.documents).toBe(2);
		expect(statsReads()).toBe(2);
	});
});
