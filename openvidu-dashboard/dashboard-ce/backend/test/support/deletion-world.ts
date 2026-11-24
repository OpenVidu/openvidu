import { randomUUID } from 'node:crypto';

import type { Db, Document } from 'mongodb';

import {
	Collection,
	type DashboardDeletionJob,
	type DeletionClass,
	type DeletionJob,
	type StatusResponse
} from '@openvidu-dashboard/typings';

import { stepCount } from '../../src/deletions/deletion-plan.js';
import { DeletionRecordsStore, INSTANCE } from '../../src/deletions/deletion-records.js';
import { DeletionRunner } from '../../src/deletions/deletion-runner.js';
import { type Client, json } from './api-client.js';
import { silentLogger } from './silent-logger.js';

const MINUTE = 60_000;
const DAY = 86_400_000;
/** Retention the deletion suites record: a year, so the TTL monitor removes nothing they seed. */
export const WORLD_RETENTION_MS = 365 * DAY;

/** Documents per collection, as a seed. */
export type World = Partial<Record<string, Document[]>>;

export function merge(...worlds: World[]): World {
	const merged: World = {};

	for (const world of worlds) {
		for (const [collection, documents] of Object.entries(world)) {
			merged[collection] = [...(merged[collection] ?? []), ...(documents ?? [])];
		}
	}

	return merged;
}

export async function insertWorld(db: Db, world: World): Promise<void> {
	for (const [collection, documents] of Object.entries(world)) {
		if (documents !== undefined && documents.length > 0) {
			await db.collection(collection).insertMany(documents);
		}
	}
}

/** The `retention` document of `schema_meta` with a year for the entities and the tracks. */
export function retentionDocument(): Document {
	return {
		_id: 'retention',
		eventsMs: WORLD_RETENTION_MS,
		statsMs: WORLD_RETENTION_MS,
		tracksMs: WORLD_RETENTION_MS,
		entitiesMs: WORLD_RETENTION_MS,
		rollups5MinMs: WORLD_RETENTION_MS,
		rollupsHourlyMs: WORLD_RETENTION_MS,
		rollupsDailyMs: null,
		updatedAt: new Date()
	};
}

const expiry = (end: Date) => new Date(end.getTime() + WORLD_RETENTION_MS);

export interface RoomShape {
	/** End of the room; in progress without it. */
	endedAt?: Date;
	createdAt?: Date;
	/** Ended sessions, then `activeSessions` sessions in progress (only in a room in progress). */
	sessions?: number;
	activeSessions?: number;
	/** Tracks spread over the sessions, `subscriptions` per room, events and stats. */
	tracks?: number;
	subscriptions?: number;
	events?: number;
	/** Stats documents with a track id, and `participantStats` without one. */
	stats?: number;
	participantStats?: number;
	/** An egress of the room, ended with the room or active. */
	egress?: 'ended' | 'active';
	/** Time of the events and stats; the room creation by default. */
	recordedAt?: Date;
}

/** A room with its sessions, tracks, subscriptions, events, stats and egress, ended unless `endedAt` is absent. */
export function room(sid: string, shape: RoomShape): World {
	const createdAt = shape.createdAt ?? new Date((shape.endedAt?.getTime() ?? Date.now()) - 30 * MINUTE);
	const endedAt = shape.endedAt;
	const at = shape.recordedAt ?? createdAt;
	const sessions: Document[] = [];

	for (let i = 0; i < (shape.sessions ?? 1); i++) {
		const leftAt = endedAt ?? new Date(at.getTime() + MINUTE);

		sessions.push({
			_id: `PA_${sid}_${String(i)}`,
			roomSid: sid,
			identity: `user-${String(i)}`,
			status: 'left',
			joinedAt: createdAt,
			leftAt,
			expiresAt: expiry(leftAt)
		});
	}

	for (let i = 0; i < (shape.activeSessions ?? 0); i++) {
		sessions.push({
			_id: `PA_${sid}_active_${String(i)}`,
			roomSid: sid,
			identity: `active-${String(i)}`,
			status: 'active',
			joinedAt: createdAt,
			expiresAt: null
		});
	}

	const participantOf = (i: number) => String(sessions[i % Math.max(1, sessions.length)]?._id ?? `PA_${sid}`);
	const closedTrack = (i: number) => endedAt !== undefined || i % 2 === 0;
	const tracks = Array.from({ length: shape.tracks ?? 0 }, (_, i) => {
		const unpublishedAt = endedAt ?? new Date(at.getTime() + MINUTE);

		return {
			_id: `TR_${sid}_${String(i)}`,
			roomSid: sid,
			participantSid: participantOf(i),
			status: closedTrack(i) ? 'unpublished' : 'published',
			publishedAt: createdAt,
			...(closedTrack(i) ? { unpublishedAt, expiresAt: expiry(unpublishedAt) } : { expiresAt: null })
		};
	});
	const subscriptions = Array.from({ length: shape.subscriptions ?? 0 }, (_, i) => {
		const unsubscribedAt = endedAt ?? new Date(at.getTime() + MINUTE);

		return {
			_id: `TR_${sid}_${String(i % Math.max(1, tracks.length))}:sub${String(i)}`,
			trackSid: `TR_${sid}_${String(i % Math.max(1, tracks.length))}`,
			roomSid: sid,
			subscriberSid: participantOf(i + 1),
			status: closedTrack(i) ? 'unsubscribed' : 'subscribed',
			subscribedAt: createdAt,
			...(closedTrack(i) ? { unsubscribedAt, expiresAt: expiry(unsubscribedAt) } : { expiresAt: null })
		};
	});
	const events = Array.from({ length: shape.events ?? 0 }, (_, i) => ({
		_id: `AE_${sid}_${String(i)}`,
		type: 'PARTICIPANT_JOINED',
		ts: at,
		roomSid: sid,
		participantSid: participantOf(i),
		nodeId: 'ND_test',
		synthetic: false,
		payload: {}
	}));
	const stat = (i: number, trackSid?: string) => ({
		ts: new Date(at.getTime() + i * 1000),
		meta: {
			roomSid: sid,
			participantSid: participantOf(i),
			kind: 'publish',
			nodeId: 'ND_test',
			...(trackSid === undefined ? {} : { trackSid })
		},
		score: 4
	});
	const stats = [
		...Array.from({ length: shape.stats ?? 0 }, (_, i) => stat(i, `TR_${sid}_${String(i % 4)}`)),
		...Array.from({ length: shape.participantStats ?? 0 }, (_, i) => stat(i))
	];
	const egresses =
		shape.egress === undefined
			? []
			: [
					{
						_id: `EG_${sid}`,
						roomSid: sid,
						status: shape.egress === 'active' ? 'active' : 'complete',
						startedAt: createdAt,
						updatedAt: endedAt ?? at,
						...(shape.egress === 'ended' && endedAt !== undefined
							? { endedAt, expiresAt: expiry(endedAt) }
							: shape.egress === 'ended'
								? { endedAt: at, expiresAt: expiry(at) }
								: { expiresAt: null })
					}
				];

	return {
		[Collection.ROOMS]: [
			{
				_id: sid,
				name: sid,
				status: endedAt === undefined ? 'active' : 'closed',
				createdAt,
				...(endedAt === undefined ? { expiresAt: null } : { endedAt, expiresAt: expiry(endedAt) })
			}
		],
		[Collection.PARTICIPANTS]: sessions,
		[Collection.TRACKS]: tracks,
		[Collection.TRACK_SUBSCRIPTIONS]: subscriptions,
		[Collection.EVENTS]: events,
		[Collection.TRACK_STATS]: stats,
		[Collection.EGRESSES]: egresses
	};
}

/** Every document of `world` that is still in the database, by collection. */
export async function remaining(db: Db, world: World): Promise<Record<string, number>> {
	const counts: Record<string, number> = {};

	for (const [collection, documents] of Object.entries(world)) {
		if (documents === undefined || documents.length === 0) {
			continue;
		}

		if (collection === Collection.TRACK_STATS) {
			// A time series stores its meta fields sorted: they are matched one by one.
			counts[collection] = await db.collection(collection).countDocuments({
				$or: documents.map((document) => {
					const meta = document.meta as Document;

					return {
						ts: document.ts as Date,
						'meta.roomSid': meta.roomSid as string,
						'meta.participantSid': meta.participantSid as string,
						'meta.trackSid': (meta.trackSid as string | undefined) ?? { $exists: false }
					};
				})
			});
		} else {
			counts[collection] = await db
				.collection(collection)
				.countDocuments({ _id: { $in: documents.map((document) => document._id as unknown) } } as Document);
		}
	}

	return counts;
}

/** Number of documents of each collection of `world`. */
export function sizes(world: World): Record<string, number> {
	return Object.fromEntries(
		Object.entries(world)
			.filter(([, documents]) => documents !== undefined && documents.length > 0)
			.map(([collection, documents]) => [collection, documents?.length ?? 0])
	);
}

/** Records a running job of `deletionClass` with `cutoff` and runs it to its end in this process. */
export async function runJob(
	db: Db,
	deletionClass: DeletionClass,
	cutoff: Date,
	options: { includeLegacy?: boolean; sleep?: (ms: number) => Promise<void> } = {}
): Promise<DashboardDeletionJob> {
	const includeLegacy = options.includeLegacy ?? false;
	const job: DashboardDeletionJob = {
		id: randomUUID(),
		class: deletionClass,
		includeLegacy,
		state: 'running',
		cutoff,
		startedAt: cutoff,
		heartbeatAt: new Date(),
		instance: INSTANCE,
		collection: { index: 1, total: stepCount(deletionClass, includeLegacy) },
		deleted: 0,
		deletedBy: {},
		requestId: 'test'
	};
	const records = new DeletionRecordsStore(db);

	await db
		.collection<{ _id: string }>(Collection.SCHEMA_META)
		.updateOne({ _id: 'dashboard' }, { $set: { deletion: job } }, { upsert: true });
	await new DeletionRunner({
		db,
		records,
		logger: silentLogger(),
		sleep: options.sleep ?? (() => Promise.resolve())
	}).run(job);

	const recorded = (await records.read())?.deletion;

	if (recorded === undefined) {
		throw new Error('the job left no record');
	}

	return recorded;
}

/** Waits until `condition` holds, polling every 50 ms for up to 30 s. */
export async function until(condition: () => Promise<boolean>, timeoutMs = 30_000): Promise<void> {
	const deadline = Date.now() + timeoutMs;

	while (!(await condition())) {
		if (Date.now() > deadline) {
			throw new Error('condition not met in time');
		}

		await new Promise((resolve) => setTimeout(resolve, 50));
	}
}

/** `POST /api/v1/deletions` with the client's token. */
export function postDeletion(client: Client, body: unknown, headers: Record<string, string> = {}): Promise<Response> {
	return fetch(`${client.dashboard.url}/api/v1/deletions`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${client.token}`, 'Content-Type': 'application/json', ...headers },
		body: JSON.stringify(body)
	});
}

/** The latest deletion job of the status once it no longer runs. */
export async function settledDeletion(client: Client): Promise<DeletionJob> {
	let job: DeletionJob | undefined;

	await until(async () => {
		job = (await json<StatusResponse>(client, '/status')).deletion;

		return job !== undefined && job.state !== 'running';
	});

	if (job === undefined) {
		throw new Error('no deletion job');
	}

	return job;
}
