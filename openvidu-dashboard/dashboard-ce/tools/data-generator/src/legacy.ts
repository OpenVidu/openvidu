import type { LegacyCollection } from '@openvidu-dashboard/typings';
import { type Db, type Document, Double } from 'mongodb';
import { Rng } from './random.js';

const HOUR = 3_600_000;
const DAY = 86_400_000;
const BATCH_SIZE = 5000;
const LEGACY_HOURS = 48;
const EVENTS_PER_HOUR = 50;
const STATS_PER_HOUR = 150;
const PARTICIPANTS_PER_ROOM = 5;
/** Expiration the installers up to 3.9 gave the legacy writer (`openvidu_expire_at = write time + 32 days`). */
const LEGACY_EXPIRATION_MS = 32 * DAY;
const PARTICIPANT_EVENTS = ['PARTICIPANT_JOINED', 'TRACK_PUBLISHED', 'PARTICIPANT_LEFT'] as const;
// Literals checked against the typings: the CLI runs on the built typings, which may predate LegacyCollection.
export const LEGACY_EVENTS: LegacyCollection = 'legacy_events';
export const LEGACY_STATS: LegacyCollection = 'stats';

export interface LegacySummary {
	events: number;
	stats: number;
	/** Last second written per collection, as the migration checkpoint records it. */
	lastEventSecond: number;
	lastStatSecond: number;
	/** Latest `openvidu_expire_at`, the `legacyRetainedUntil` of a completed migration. */
	latestExpiry: Date;
}

/**
 * Writes the collections of the writer before 3.10 that a migration leaves behind, `legacy_events` and `stats`, with
 * their indexes: one room per hour over the 48 hours before `until`, each document expiring 32 days after it was
 * written. Its own random stream leaves every other document of a seed unchanged.
 * @param db target database
 * @param until end of the legacy history, the start of the generated range
 * @param seed seed of the generation
 * @returns the documents written and their latest expiry
 */
export async function writeLegacy(db: Db, until: number, seed: number): Promise<LegacySummary> {
	const rng = new Rng(seed + 5_000_011);
	const events: Document[] = [];
	const stats: Document[] = [];
	const from = until - LEGACY_HOURS * HOUR;
	let latestExpiry = 0;
	const expiry = (writtenAt: number): Date => {
		latestExpiry = Math.max(latestExpiry, writtenAt + LEGACY_EXPIRATION_MS);

		return new Date(writtenAt + LEGACY_EXPIRATION_MS);
	};

	for (let hour = 0; hour < LEGACY_HOURS; hour += 1) {
		const start = from + hour * HOUR;
		const roomId = rng.id('RM_', 12);
		const roomName = `legacy-room-${String(hour)}`;
		const participants = Array.from({ length: PARTICIPANTS_PER_ROOM }, () => rng.id('PA_', 12));

		for (let i = 0; i < EVENTS_PER_HOUR; i += 1) {
			const writtenAt = start + Math.floor((i * HOUR) / EVENTS_PER_HOUR);
			const type =
				i === 0
					? 'ROOM_CREATED'
					: i === EVENTS_PER_HOUR - 1
						? 'ROOM_ENDED'
						: (PARTICIPANT_EVENTS[(i - 1) % PARTICIPANT_EVENTS.length] ?? 'PARTICIPANT_JOINED');

			events.push({
				_id: legacyId(rng),
				type,
				timestamp: legacyTimestamp(writtenAt),
				room_id: roomId,
				room: { sid: roomId, name: roomName },
				...(type.startsWith('ROOM_') ? {} : { participant_id: participants[i % PARTICIPANTS_PER_ROOM] }),
				openvidu_expire_at: expiry(writtenAt)
			});
		}

		for (let i = 0; i < STATS_PER_HOUR; i += 1) {
			const writtenAt = start + Math.floor((i * HOUR) / STATS_PER_HOUR);

			stats.push({
				_id: legacyId(rng),
				time_stamp: legacyTimestamp(writtenAt),
				room_id: roomId,
				room_name: roomName,
				participant_id: participants[i % PARTICIPANTS_PER_ROOM],
				kind: i % 2 === 0 ? 'UPSTREAM' : 'DOWNSTREAM',
				openvidu_expire_at: expiry(writtenAt)
			});
		}
	}

	await writeCollection(db, LEGACY_EVENTS, 'timestamp.seconds', events);
	await writeCollection(db, LEGACY_STATS, 'time_stamp.seconds', stats);

	return {
		events: events.length,
		stats: stats.length,
		lastEventSecond: lastSecond(events, 'timestamp'),
		lastStatSecond: lastSecond(stats, 'time_stamp'),
		latestExpiry: new Date(latestExpiry)
	};
}

async function writeCollection(db: Db, name: string, secondsKey: string, docs: Document[]): Promise<void> {
	const collection = db.collection(name);

	await collection.createIndexes([
		{ key: { [secondsKey]: 1 } },
		{ key: { openvidu_expire_at: 1 }, expireAfterSeconds: 0 }
	]);

	for (let i = 0; i < docs.length; i += BATCH_SIZE) {
		await collection.insertMany(docs.slice(i, i + BATCH_SIZE), { ordered: false });
	}
}

/** The legacy writer stored protobuf timestamps with doubles. */
function legacyTimestamp(at: number): { seconds: Double; nanos: Double } {
	return { seconds: new Double(Math.floor(at / 1000)), nanos: new Double((at % 1000) * 1_000_000) };
}

function legacyId(rng: Rng): string {
	let id = '';

	for (let i = 0; i < 32; i += 1) {
		id += rng.int(0, 15).toString(16);
	}

	return id;
}

function lastSecond(docs: Document[], field: string): number {
	const last = docs.at(-1)?.[field] as { seconds: Double } | undefined;

	return last?.seconds.value ?? 0;
}
