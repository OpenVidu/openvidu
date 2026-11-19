import {
	COLLECTIONS,
	Collection,
	type InfoMigration,
	type InfoRetention,
	type InfoStorageEntry
} from '@openvidu-dashboard/typings';
import { describe, expect, it } from 'vitest';

import { formatBytes, formatNumber } from '../../format/formatters.js';
import {
	LEGACY_LABEL,
	type LegacyContext,
	STORAGE_CLASSES,
	type StorageClassRow,
	storageClasses
} from './storage-classes.js';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const READ_AT = Date.parse('2026-11-16T12:00:00.000Z');
/** The context of the specs whose storage holds no legacy collection. */
const NO_MIGRATION: LegacyContext = { migration: null, tz: 'UTC' };

const DEFAULT_RETENTION: InfoRetention = {
	eventsMs: 7 * DAY,
	statsMs: 7 * DAY,
	tracksMs: 7 * DAY,
	entitiesMs: 90 * DAY,
	rollups5MinMs: 7 * DAY,
	rollupsHourlyMs: 400 * DAY,
	rollupsDailyMs: null
};

/** An entry of `bytes` (all storage) whose oldest document is `ageMs` before the read; undated without `ageMs`. */
function entry(bytes: number, ageMs?: number, documents = 1): InfoStorageEntry {
	return {
		documents,
		storageBytes: bytes,
		indexBytes: 0,
		freeBytes: 0,
		...(ageMs === undefined ? {} : { oldest: new Date(READ_AT - ageMs).toISOString() })
	};
}

function rowOf(
	label: string,
	storage: Record<string, InfoStorageEntry>,
	retention: Partial<InfoRetention> = {}
): StorageClassRow {
	const row = storageClasses(storage, { ...DEFAULT_RETENTION, ...retention }, READ_AT, NO_MIGRATION).rows.find(
		(candidate) => candidate.label === label
	);

	if (row === undefined) {
		throw new Error(`No row ${label}`);
	}

	return row;
}

function tipOf(
	label: string,
	storage: Record<string, InfoStorageEntry>,
	retention: Partial<InfoRetention> = {}
): string | null {
	return rowOf(label, storage, retention).tip;
}

const ENTITY_CLOCK = ['rooms', 'participants', 'egresses', 'ingress_sessions'] as const;
const DEPLOYMENT_CLOCK = [...ENTITY_CLOCK, 'events', 'analytics_5min', 'analytics_hourly'] as const;

describe('storageClasses', () => {
	it('classifies every collection except schema_meta exactly once', () => {
		const classified = STORAGE_CLASSES.flatMap((definition) => definition.collections);

		expect([...classified].sort()).toEqual(
			COLLECTIONS.filter((collection) => collection !== Collection.SCHEMA_META).sort()
		);
		expect(new Set(classified).size).toBe(classified.length);
	});

	it('Collections of each class', () => {
		const storage = Object.fromEntries(COLLECTIONS.map((collection) => [collection, entry(1_000)]));
		const { rows } = storageClasses(storage, DEFAULT_RETENTION, READ_AT, NO_MIGRATION);

		expect(
			rows.map((row) => [row.label, row.documents, row.collections.map(({ collection }) => collection)])
		).toEqual([
			['Events', 1, ['events']],
			['Stats', 1, ['track_stats']],
			['Tracks and subscriptions', 2, ['tracks', 'track_subscriptions']],
			['Entities', 6, ['rooms', 'participants', 'egresses', 'ingresses', 'ingress_sessions', 'nodes']],
			['5-minute rollups', 1, ['analytics_5min']],
			['Hourly rollups', 1, ['analytics_hourly']],
			['Daily rollups', 1, ['analytics_daily']]
		]);
	});

	it('Class that sums several collections', () => {
		const { rows } = storageClasses(
			{
				rooms: { documents: 4, storageBytes: 36_864, indexBytes: 344_136, freeBytes: 0 },
				participants: { documents: 10, storageBytes: 100_000, indexBytes: 100_000, freeBytes: 0 },
				nodes: { documents: 1, storageBytes: 20_000, indexBytes: 21_000, freeBytes: 0 }
			},
			DEFAULT_RETENTION,
			READ_AT,
			NO_MIGRATION
		);
		const entities = rows.find((row) => row.label === 'Entities');

		expect(entities?.documents).toBe(15);
		expect(entities?.bytes).toBe(622_000);
	});

	it('sums the total over the rows, without schema_meta', () => {
		const { total } = storageClasses(
			{
				rooms: { documents: 4, storageBytes: 36_864, indexBytes: 344_136, freeBytes: 0 },
				events: { documents: 285, storageBytes: 65_536, indexBytes: 290_464, freeBytes: 0 },
				schema_meta: { documents: 4, storageBytes: 20_480, indexBytes: 20_520, freeBytes: 0 }
			},
			DEFAULT_RETENTION,
			READ_AT,
			NO_MIGRATION
		);

		expect(total).toEqual({ documents: 289, bytes: 737_000 });
	});

	it('Span rounded down', () => {
		expect(tipOf('Events', { events: entry(1_000_000, 5 * DAY + 23 * HOUR) })).toMatch(/^5 of 7 days so far/);
	});

	it('Span rounded down: exactly one day', () => {
		expect(tipOf('Events', { events: entry(1_000_000, DAY) })).toBe(
			'1 of 7 days so far · ≈ 7 MB at full retention (estimate)'
		);
	});

	it('Class at full retention', () => {
		expect(tipOf('Events', { events: entry(1_000_000, 6 * DAY + 2 * HOUR) })).toBeNull();
	});

	it('Class at full retention: exactly 6 of 7 days', () => {
		expect(tipOf('Events', { events: entry(1_000_000, 6 * DAY) })).toBeNull();
	});

	it('Full within a tenth of the retention', () => {
		expect(tipOf('Hourly rollups', { analytics_hourly: entry(3_000_000, 365 * DAY) })).toBeNull();
	});

	it('Less than one unit of data', () => {
		expect(tipOf('Events', { events: entry(1_000_000, 5 * HOUR) })).toBe('Less than 1 day of 7 days so far');
	});

	it('Idle period reads as filling', () => {
		const storage = {
			events: entry(70_000_000, 5 * DAY),
			analytics_daily: entry(500_000, 200 * DAY),
			rooms: entry(1_000_000, 80 * DAY)
		};

		expect(tipOf('Events', storage)).toBe('5 of 7 days so far · ≈ 98 MB at full retention (estimate)');
	});

	it('Class without documents', () => {
		const stats = rowOf('Stats', { events: entry(10_000, 3 * DAY), rooms: entry(10_000, 2 * DAY) });

		expect([stats.documents, stats.bytes, stats.tip]).toEqual([0, 0, null]);
	});

	it('Entities clock ignores nodes and ingresses', () => {
		const storage = {
			nodes: entry(1_000, 200 * DAY),
			ingresses: entry(1_000, 300 * DAY),
			rooms: entry(1_000, 12 * DAY),
			participants: entry(1_000, 11 * DAY),
			egresses: entry(1_000, 10 * DAY),
			ingress_sessions: entry(1_000, 10 * DAY)
		};

		expect(tipOf('Entities', storage)).toMatch(/^12 of 90 days so far/);
	});

	it.each(ENTITY_CLOCK)('Entities clock ignores nodes and ingresses: %s earliest', (earliest) => {
		const storage: Record<string, InfoStorageEntry> = {
			nodes: entry(1_000, 200 * DAY),
			ingresses: entry(1_000, 300 * DAY)
		};

		for (const collection of ENTITY_CLOCK) {
			storage[collection] = entry(1_000, collection === earliest ? 12 * DAY : 10 * DAY);
		}

		expect(tipOf('Entities', storage)).toMatch(/^12 of 90 days so far/);
	});

	it('Stats and tracks on the deployment clock', () => {
		const storage = {
			track_stats: entry(30_000_000),
			tracks: entry(4_000_000),
			track_subscriptions: entry(2_000_000),
			analytics_hourly: entry(10_000, 3 * DAY),
			events: entry(10_000, 2 * DAY)
		};

		expect(tipOf('Stats', storage)).toBe('3 of 7 days so far · ≈ 70 MB at full retention (estimate)');
		expect(tipOf('Tracks and subscriptions', storage)).toBe(
			'3 of 7 days so far · ≈ 14 MB at full retention (estimate)'
		);
	});

	it.each(DEPLOYMENT_CLOCK)('Stats and tracks on the deployment clock: %s earliest', (earliest) => {
		const storage: Record<string, InfoStorageEntry> = {
			track_stats: entry(30_000_000),
			tracks: entry(6_000_000)
		};

		for (const collection of DEPLOYMENT_CLOCK) {
			storage[collection] = entry(10_000, collection === earliest ? 3 * DAY : 2 * DAY);
		}

		expect(tipOf('Stats', storage)).toBe('3 of 7 days so far · ≈ 70 MB at full retention (estimate)');
		expect(tipOf('Tracks and subscriptions', storage)).toBe(
			'3 of 7 days so far · ≈ 14 MB at full retention (estimate)'
		);
	});

	it('Daily bucket outside the deployment clock', () => {
		const storage = {
			track_stats: entry(30_000_000),
			analytics_daily: entry(10_000, DAY),
			events: entry(10_000, 5 * HOUR)
		};

		expect(tipOf('Stats', storage)).toBe('Less than 1 day of 7 days so far');
	});

	it('Deployment older than the stats retention', () => {
		expect(
			tipOf('Stats', { track_stats: entry(1_000_000), rooms: entry(1_000, 200 * DAY) }, { statsMs: 30 * DAY })
		).toBeNull();
	});

	it('Class without a clock', () => {
		expect(tipOf('Events', { events: entry(0, undefined, 0) })).toBeNull();
	});

	it('Linear estimate', () => {
		expect(tipOf('Hourly rollups', { analytics_hourly: entry(3_000_000, 30 * DAY) })).toBe(
			'30 of 400 days so far · ≈ 40 MB at full retention (estimate)'
		);
	});

	it('No estimate under one day of data', () => {
		expect(
			tipOf(
				'Tracks and subscriptions',
				{ tracks: entry(1_000_000, undefined, 16), events: entry(1_000, 5 * HOUR) },
				{
					tracksMs: 36 * HOUR
				}
			)
		).toBe('5 of 36 hours so far');
	});

	it('Unlimited daily rollups without data', () => {
		const daily = rowOf('Daily rollups', { events: entry(10_000, 3 * DAY) });

		expect([daily.documents, daily.tip]).toEqual([0, 'Grows without limit']);
	});

	it('Unlimited daily rollups without a day of data', () => {
		expect(tipOf('Daily rollups', { analytics_daily: entry(260_000, 5 * HOUR) })).toBe('Grows without limit');
	});

	it('Daily rollups with a limit', () => {
		expect(
			tipOf('Daily rollups', { analytics_daily: entry(260_000, 73 * DAY) }, { rollupsDailyMs: 1_825 * DAY })
		).toBe('73 of 1,825 days so far · ≈ 6.5 MB at full retention (estimate)');
	});

	describe('Legacy data row', () => {
		const LEGACY_EVENTS: InfoStorageEntry = {
			documents: 120_000,
			storageBytes: 30_000_000,
			indexBytes: 10_000_000,
			freeBytes: 0
		};
		const LEGACY_STATS: InfoStorageEntry = {
			documents: 300_000,
			storageBytes: 80_000_000,
			indexBytes: 10_000_000,
			freeBytes: 0
		};
		const ROOMS: InfoStorageEntry = { documents: 4, storageBytes: 36_864, indexBytes: 344_136, freeBytes: 0 };

		/** The Legacy data row of a migration, read in UTC unless `tz` says otherwise. */
		function legacyOf(
			storage: Record<string, InfoStorageEntry>,
			migration: InfoMigration | null,
			tz = 'UTC'
		): StorageClassRow | undefined {
			return storageClasses(storage, DEFAULT_RETENTION, READ_AT, { migration, tz }).rows.find(
				(row) => row.label === LEGACY_LABEL
			);
		}

		it('Legacy row kept for rollback', () => {
			const { rows, total } = storageClasses(
				{ legacy_events: LEGACY_EVENTS, stats: LEGACY_STATS, rooms: ROOMS },
				DEFAULT_RETENTION,
				READ_AT,
				{
					migration: { state: 'completed', legacyRetainedUntil: '2026-12-15T03:00:00Z' },
					tz: 'America/New_York'
				}
			);
			const legacy = rows.at(-1);

			expect(rows.map((row) => row.label).slice(-2)).toEqual(['Daily rollups', 'Legacy data (before 3.10)']);
			expect(legacy?.retention).toBe('Kept until 2026-12-14 for rollback');
			expect(formatNumber(legacy?.documents ?? 0)).toBe('420,000');
			expect(formatBytes(legacy?.bytes ?? 0)).toBe('130 MB');
			expect(legacy?.tip).toBeNull();
			expect(rows.map((row) => row.legacy)).toEqual([...Array<boolean>(7).fill(false), true]);
			expect(legacy?.collections.map(({ collection }) => collection)).toEqual(['legacy_events', 'stats']);
			expect(formatNumber(total.documents)).toBe('420,004');
			expect(formatBytes(total.bytes)).toBe('130 MB');
		});

		it('Legacy row while the migration runs', () => {
			const legacy = legacyOf(
				{ stats: LEGACY_STATS },
				{ state: 'running', progress: { processed: 1, total: 2 } }
			);

			expect(legacy?.retention).toBe('In use by the migration');
			expect(formatNumber(legacy?.documents ?? 0)).toBe('300,000');
		});

		it('Legacy row of a pending migration', () => {
			const legacy = legacyOf({ legacy_events: LEGACY_EVENTS }, { state: 'pending' });

			expect(legacy?.retention).toBe('Kept until the migration completes');
			expect(formatNumber(legacy?.documents ?? 0)).toBe('120,000');
		});

		it('Legacy row of a failed migration', () => {
			const legacy = legacyOf({ stats: LEGACY_STATS }, { state: 'failed', error: 'legacy event without a room' });

			expect(legacy?.retention).toBe('Kept until the migration completes');
			expect(formatNumber(legacy?.documents ?? 0)).toBe('300,000');
		});

		it('Legacy row after its date', () => {
			const legacy = legacyOf(
				{ legacy_events: { documents: 0, storageBytes: 2_000_000_000, indexBytes: 100_000_000, freeBytes: 0 } },
				{ state: 'completed', legacyRetainedUntil: new Date(READ_AT - HOUR).toISOString() }
			);

			expect(legacy?.retention).toBe('Being removed by the server');
			expect(formatNumber(legacy?.documents ?? 0)).toBe('0');
			expect(formatBytes(legacy?.bytes ?? 0)).toBe('2.1 GB');
		});

		it('Legacy row after its date: without a date', () => {
			expect(legacyOf({ stats: LEGACY_STATS }, { state: 'completed' })?.retention).toBe(
				'Being removed by the server'
			);
		});

		it('Deployment without legacy data', () => {
			const storage = Object.fromEntries(COLLECTIONS.map((collection) => [collection, entry(1_000)]));
			const { rows } = storageClasses(storage, DEFAULT_RETENTION, READ_AT, {
				migration: { state: 'completed', legacyRetainedUntil: '2026-12-15T03:00:00Z' },
				tz: 'UTC'
			});

			expect(rows).toHaveLength(7);
			expect(rows.map((row) => row.label)).not.toContain(LEGACY_LABEL);
		});
	});
});
