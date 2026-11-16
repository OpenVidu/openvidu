import {
	Collection,
	formatRetentionLength,
	type InfoRetention,
	type InfoStorageEntry,
	retentionLength
} from '@openvidu-dashboard/typings';

import { formatBytes, formatNumber } from '../../format/formatters.js';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const YEAR_MS = 365 * DAY_MS;
const UNIT_MS = { day: DAY_MS, hour: HOUR_MS, minute: 60_000, second: 1_000 } as const;

interface StorageClass {
	label: string;
	retentionKey: keyof InfoRetention;
	collections: readonly Collection[];
	/** Collections whose earliest `oldest` dates the class; `null` for the deployment clock. */
	clock: readonly Collection[] | null;
}

const ENTITY_CLOCK = [
	Collection.ROOMS,
	Collection.PARTICIPANTS,
	Collection.EGRESSES,
	Collection.INGRESS_SESSIONS
] as const;

/** The data classes in the order the writer expires them; `schema_meta` belongs to none. */
export const STORAGE_CLASSES: readonly StorageClass[] = [
	{ label: 'Events', retentionKey: 'eventsMs', collections: [Collection.EVENTS], clock: [Collection.EVENTS] },
	{ label: 'Stats', retentionKey: 'statsMs', collections: [Collection.TRACK_STATS], clock: null },
	{
		label: 'Tracks and subscriptions',
		retentionKey: 'tracksMs',
		collections: [Collection.TRACKS, Collection.TRACK_SUBSCRIPTIONS],
		clock: null
	},
	{
		label: 'Entities',
		retentionKey: 'entitiesMs',
		collections: [
			Collection.ROOMS,
			Collection.PARTICIPANTS,
			Collection.EGRESSES,
			Collection.INGRESSES,
			Collection.INGRESS_SESSIONS,
			Collection.NODES
		],
		clock: ENTITY_CLOCK
	},
	{
		label: '5-minute rollups',
		retentionKey: 'rollups5MinMs',
		collections: [Collection.ANALYTICS_5MIN],
		clock: [Collection.ANALYTICS_5MIN]
	},
	{
		label: 'Hourly rollups',
		retentionKey: 'rollupsHourlyMs',
		collections: [Collection.ANALYTICS_HOURLY],
		clock: [Collection.ANALYTICS_HOURLY]
	},
	{
		label: 'Daily rollups',
		retentionKey: 'rollupsDailyMs',
		collections: [Collection.ANALYTICS_DAILY],
		clock: [Collection.ANALYTICS_DAILY]
	}
];

/**
 * The collections that date the deployment as a whole, for the classes the info endpoint does not date. Not
 * `analytics_daily`: its `oldest` is the start of a UTC-day bucket, up to a day before the first data.
 */
const DEPLOYMENT_CLOCK: readonly Collection[] = [
	...ENTITY_CLOCK,
	Collection.EVENTS,
	Collection.ANALYTICS_5MIN,
	Collection.ANALYTICS_HOURLY
];

export interface StorageCollectionEntry {
	collection: Collection;
	entry: InfoStorageEntry;
}

export interface StorageClassRow {
	label: string;
	/** `7 days`, `Kept forever`, `—` when the server does not report the retention. */
	retention: string;
	documents: number;
	bytes: number;
	/** Progress and estimate of a class that has not reached its retention; `null` for none. */
	tip: string | null;
	collections: StorageCollectionEntry[];
}

export interface StorageClasses {
	rows: StorageClassRow[];
	total: { documents: number; bytes: number };
}

/** `7 days`, `36 hours`, `Kept forever` for a retention without limit. */
export function formatRetention(ms: number | null): string {
	return ms === null ? 'Kept forever' : formatRetentionLength(ms, { formatCount: formatNumber });
}

function earliest(
	storage: Readonly<Record<string, InfoStorageEntry>>,
	collections: readonly Collection[]
): number | null {
	const dates = collections
		.map((collection) => storage[collection]?.oldest)
		.filter((oldest) => oldest !== undefined)
		.map((oldest) => Date.parse(oldest));

	return dates.length === 0 ? null : Math.min(...dates);
}

function sizeOf(entry: InfoStorageEntry): number {
	return entry.storageBytes + entry.indexBytes;
}

/** `12 of 90 days so far`, `Less than 1 day of 7 days so far`. */
function progress(spanMs: number, retentionMs: number): string {
	const { unit } = retentionLength(retentionMs);
	const count = Math.floor(spanMs / UNIT_MS[unit]);
	const of = formatRetention(retentionMs);

	return count < 1 ? `Less than 1 ${unit} of ${of} so far` : `${formatNumber(count)} of ${of} so far`;
}

/**
 * The tip of a class, or `null` when it has reached its retention, has no clock or has no documents; unlimited daily
 * rollups always have one. A class within one day or a tenth of
 * its retention, whichever is longer, counts as full: the oldest surviving document of a full class is always slightly
 * younger than the retention.
 */
function classTip(retentionMs: number | null, spanMs: number | null, documents: number, bytes: number): string | null {
	const estimable = spanMs !== null && spanMs >= DAY_MS && documents > 0;

	if (retentionMs === null) {
		return estimable
			? `Grows without limit · ≈ ${formatBytes((bytes * YEAR_MS) / spanMs)} per year (estimate)`
			: 'Grows without limit';
	}

	if (spanMs === null || documents === 0 || retentionMs - spanMs <= Math.max(DAY_MS, retentionMs / 10)) {
		return null;
	}

	const estimate = estimable
		? ` · ≈ ${formatBytes((bytes * retentionMs) / spanMs)} at full retention (estimate)`
		: '';

	return `${progress(spanMs, retentionMs)}${estimate}`;
}

/**
 * The rows of the Storage table of the Data tab and their total.
 *
 * @param storage The `storage` of the info document.
 * @param retention The `retention` of the info document; without it, no row has a retention or a tip.
 * @param readAt When the info document was read (epoch ms), the end of every data span.
 */
export function storageClasses(
	storage: Readonly<Record<string, InfoStorageEntry>>,
	retention: InfoRetention | undefined,
	readAt: number
): StorageClasses {
	const deploymentClock = earliest(storage, DEPLOYMENT_CLOCK);
	const rows = STORAGE_CLASSES.map((definition): StorageClassRow => {
		const collections = definition.collections.flatMap((collection) => {
			const entry = storage[collection];

			return entry === undefined ? [] : [{ collection, entry }];
		});
		const documents = collections.reduce((sum, { entry }) => sum + entry.documents, 0);
		const bytes = collections.reduce((sum, { entry }) => sum + sizeOf(entry), 0);
		const clock = definition.clock === null ? deploymentClock : earliest(storage, definition.clock);
		const spanMs = clock === null ? null : Math.max(0, readAt - clock);

		return {
			label: definition.label,
			retention: retention === undefined ? '—' : formatRetention(retention[definition.retentionKey]),
			documents,
			bytes,
			tip:
				retention === undefined ? null : classTip(retention[definition.retentionKey], spanMs, documents, bytes),
			collections
		};
	});

	return {
		rows,
		total: {
			documents: rows.reduce((sum, row) => sum + row.documents, 0),
			bytes: rows.reduce((sum, row) => sum + row.bytes, 0)
		}
	};
}
