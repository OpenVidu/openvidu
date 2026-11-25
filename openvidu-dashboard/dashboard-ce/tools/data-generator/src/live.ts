import { type AnyBulkWriteOperation, BSON, type Db, type Document } from 'mongodb';
import { toStored } from './contract.js';
import { cutRoom, reportedUntil, roomLife, type RoomLife } from './cut.js';
import {
	BASE_ROLLUPS,
	deriveEvents,
	deriveStats,
	egressRawRequest,
	type DeriveWindows,
	type EventDoc,
	type RollupCounters,
	type RollupOptions,
	Rollups,
	type StatsDoc
} from './derive.js';
import { HOUR_WEIGHTS, takesRooms, type Server, type World } from './generator.js';
import { generateRoom, type GeneratorContext, type RoomBundle } from './model.js';
import type { Rng } from './random.js';
import { hashRng } from './samples.js';
import { COLLECTIONS, type CollectionName } from './schema.js';

/** Every document of the contract is keyed by a string. */
type Keyed = Document & { _id: string };
type Op = AnyBulkWriteOperation<Keyed>;

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
/** Rooms in progress at every minute at least, outside the waivers. */
const ROOM_FLOOR = 10;
/** How far ahead the planner draws the rooms. */
const HORIZON = HOUR;
/** Shares of the rooms the live writer creates with an egress and with an ingress. */
const LIVE_EGRESS_SHARE = 0.5;
const LIVE_INGRESS_SHARE = 0.1;
/** The aggregator writes the unique identities of a closed UTC day after this time of the next one. */
const UNIQUE_IDENTITIES_AFTER = 5 * MINUTE;

/** The entity collections, keyed as the room's bundle holds them. */
const ENTITIES: readonly (readonly [CollectionName, (bundle: RoomBundle) => readonly Document[]])[] = [
	[COLLECTIONS.rooms, (b) => [b.room]],
	[COLLECTIONS.participants, (b) => b.participants],
	[COLLECTIONS.tracks, (b) => b.tracks],
	[COLLECTIONS.trackSubscriptions, (b) => b.subscriptions],
	[COLLECTIONS.egresses, (b) => b.egresses.map((e) => ({ ...e, rawRequest: egressRawRequest(e) }))],
	[COLLECTIONS.ingresses, (b) => b.ingresses],
	[COLLECTIONS.ingressSessions, (b) => b.ingressSessions]
];

/** What the live writer last wrote of a room: its stored documents, events and rollup counters. */
interface Written {
	docs: Map<CollectionName, Map<string, Document>>;
	events: Set<string>;
	counters: Map<string, RollupCounters>;
	/** The instant its stats were written up to. */
	statsUntil: number;
	/** Its closure is written: nothing of it changes but its ingress deletions and API calls. */
	closed: boolean;
	reconciled: boolean;
}

/** What one tick wrote. */
export interface TickSummary {
	at: number;
	rooms: number;
	documents: number;
	elapsedMs: number;
}

/**
 * Goes on writing a generated world after its generation instant, as the OpenVidu writer, aggregator and reconciler
 * would: each tick writes, as updates and increments, what the lives of the rooms in progress changed since the
 * previous one (entities, events, `track_stats`, rollups), the active peaks of each minute, the unique identities of
 * each closed day and the heartbeats of the servers. A room's documents are its cut at the tick (`cutRoom()`), so the
 * data at an instant does not depend on the interval between ticks.
 */
export class LiveWriter {
	private readonly lives = new Map<string, RoomLife>();
	private readonly written = new Map<string, Written>();
	private readonly windows: DeriveWindows;
	private readonly rollupOptions: RollupOptions;
	private readonly engines: Map<string, Server['rtcEngine']>;
	private last: number;
	private plannedUntil: number;
	private rooms: number;

	constructor(
		private readonly db: Db,
		private readonly world: World
	) {
		const { options, start } = world;
		const retention = options.retentionDays;

		this.rollupOptions = options.rollups ?? BASE_ROLLUPS;
		this.windows = {
			now: start,
			eventsFrom: start - retention.events * DAY,
			statsFrom: start - retention.stats * DAY,
			fiveMinuteFrom: start - (retention.rollups5Min ?? 7) * DAY,
			statsMode: options.statsMode
		};
		this.engines = new Map(world.servers.map((server) => [server.nodeId, server.rtcEngine]));
		this.last = start;
		this.plannedUntil = Math.floor(start / HOUR) * HOUR;
		this.rooms = world.rooms;

		for (const life of world.lives) {
			this.lives.set(life.bundle.room._id, life);
			const cut = cutRoom(life, start);

			if (cut !== undefined) {
				const events = new Set<string>();
				deriveEvents(cut, this.windows, (event) => {
					events.add(event._id);
				});
				this.written.set(life.bundle.room._id, this.snapshot(life, cut, start, events));
			}
		}
	}

	/** Writes the world as it is at `at`, a later instant than the previous tick's. */
	async tick(at: number): Promise<TickSummary> {
		const started = performance.now();
		const previous = this.last;

		if (at <= previous) {
			return { at, rooms: 0, documents: 0, elapsedMs: 0 };
		}

		this.plan(at + HORIZON);

		const entityOps = new Map<CollectionName, Op[]>();
		const rollupOps = new Map<CollectionName, Op[]>();
		const nodeOps: Op[] = [];
		const events: Document[] = [];
		const stats: Document[] = [];
		let rooms = 0;

		for (const life of [...this.lives.values()].sort(byCreation)) {
			const id = life.bundle.room._id;
			const before = this.written.get(id);

			if (
				life.bundle.room.createdAt.getTime() > at ||
				(before?.closed === true && !changesAfter(life, previous, at))
			) {
				continue;
			}

			const cut = cutRoom(life, at);

			if (cut === undefined) {
				continue;
			}

			rooms += 1;
			const eventIds = new Set(before?.events);

			deriveEvents(cut, { ...this.windows, now: at }, (event: EventDoc) => {
				if (!eventIds.has(event._id)) {
					eventIds.add(event._id);
					events.push(toStored(COLLECTIONS.events, event));
				}
			});

			const after = this.snapshot(life, cut, at, eventIds);

			for (const [collection, docs] of after.docs) {
				for (const [docId, doc] of docs) {
					const op = entityUpdate(docId, before?.docs.get(collection)?.get(docId), doc);

					if (op !== undefined) {
						push(entityOps, collection, op);
					}
				}
			}

			deriveStats(
				cut,
				{ ...this.windows, now: reportedUntil(life, at), statsFrom: (before?.statsUntil ?? previous) + 1 },
				life.engine,
				(doc: StatsDoc) => {
					stats.push(toStored(COLLECTIONS.trackStats, doc));
				}
			);

			for (const counters of after.counters.values()) {
				const op = rollupIncrement(counters, before?.counters.get(countersKey(counters)));

				if (op !== undefined) {
					push(rollupOps, counters.collection, op);
				}
			}

			const { nodeId } = cut.room;

			if (before === undefined) {
				nodeOps.push({ updateOne: { filter: { _id: nodeId }, update: { $inc: { 'rooms.hosted': 1 } } } });
			}

			if (after.reconciled && before?.reconciled !== true) {
				nodeOps.push({ updateOne: { filter: { _id: nodeId }, update: { $inc: { 'rooms.reconciled': 1 } } } });
			}

			this.written.set(id, after);

			// The end of the room and of everything it holds is written: it never changes again.
			if (cut === life.bundle) {
				this.lives.delete(id);
				this.written.delete(id);
			}
		}

		let documents = 0;

		for (const [collection, ops] of [...entityOps, ...rollupOps]) {
			documents += ops.length;
			await this.db.collection<Keyed>(collection).bulkWrite(ops, { ordered: false });
		}

		for (const [collection, docs] of [
			[COLLECTIONS.events, events],
			[COLLECTIONS.trackStats, stats]
		] as const) {
			if (docs.length > 0) {
				documents += docs.length;
				await this.db.collection(collection).insertMany(docs, { ordered: false });
			}
		}

		if (nodeOps.length > 0) {
			await this.db.collection<Keyed>(COLLECTIONS.nodes).bulkWrite(nodeOps, { ordered: false });
		}

		if (Math.floor(at / MINUTE) > Math.floor(previous / MINUTE)) {
			await this.writePeaks(at);
		}

		const closedDay = Math.floor((at - UNIQUE_IDENTITIES_AFTER) / DAY) * DAY - DAY;

		if (closedDay > Math.floor((previous - UNIQUE_IDENTITIES_AFTER) / DAY) * DAY - DAY) {
			await this.writeUniqueIdentities(closedDay);
		}

		await this.writeHeartbeats(at);
		this.last = at;

		return { at, rooms, documents, elapsedMs: performance.now() - started };
	}

	/**
	 * Draws the rooms created up to `until`, a UTC hour at a time: the hour's arrivals on the daily curve at the pace of
	 * the scenario, drawn from the seed, the world start and the hour, the first of them a room that stops reporting,
	 * then rooms added in each minute that would hold fewer than 10 rooms in progress.
	 */
	private plan(until: number): void {
		while (this.plannedUntil < until) {
			const hour = this.plannedUntil;
			const rng = hashRng(`${String(this.world.options.seed)}|${String(this.world.start)}|hour|${String(hour)}`);
			const weight = HOUR_WEIGHTS.find(([h]) => h === new Date(hour).getUTCHours())?.[1] ?? 0;
			const total = HOUR_WEIGHTS.reduce((sum, [, w]) => sum + w, 0);
			const expected = (this.world.scenario.roomsPerDay * weight) / total;
			const count = Math.floor(expected) + (rng.chance(expected - Math.floor(expected)) ? 1 : 0);
			// The room that stops reporting is created early in the hour, so that it goes silent within it.
			const arrivals = Array.from({ length: count }, (_, i) => ({
				createdAt: hour + (i === 0 ? rng.int(0, 15 * MINUTE) : rng.int(0, HOUR - 1)),
				stale: i === 0
			})).sort((a, b) => a.createdAt - b.createdAt);

			for (const { createdAt, stale } of arrivals) {
				if (createdAt > this.world.start) {
					this.addRoom(createdAt, stale);
				}
			}

			for (let minute = hour; minute < hour + HOUR; minute += MINUTE) {
				if (minute > this.world.start) {
					this.fillFloor(minute, rng);
				}
			}

			this.plannedUntil += HOUR;
		}
	}

	/** Adds rooms created in the 30 s before `minute` until it holds the floor of rooms in progress. */
	private fillFloor(minute: number, rng: Rng): void {
		let active = [...this.lives.values()].filter((life) => inProgress(life, minute)).length;

		for (let attempt = 0; active < ROOM_FLOOR && attempt < 3 * ROOM_FLOOR; attempt += 1) {
			const life = this.addRoom(Math.max(this.world.start + 1, minute - rng.int(1_000, 30_000)), false);

			if (life === undefined) {
				return;
			}

			active += inProgress(life, minute) ? 1 : 0;
		}
	}

	/** Draws the life of a room created at `createdAt` on a server taking rooms then, if any. */
	private addRoom(createdAt: number, stale: boolean): RoomLife | undefined {
		const hosts = this.world.servers.filter((server) => takesRooms(server, createdAt));

		if (hosts.length === 0) {
			return undefined;
		}

		const index = this.rooms;
		this.rooms += 1;
		const bundle = generateRoom(this.context(index), {
			index,
			createdAt,
			active: false,
			hosts,
			live: { egressShare: LIVE_EGRESS_SHARE, ingressShare: LIVE_INGRESS_SHARE, stale }
		});
		const life = roomLife(bundle, this.engines.get(bundle.room.nodeId) ?? 'pion', this.world.options.statsMode);
		this.lives.set(bundle.room._id, life);

		return life;
	}

	/** The draws of a room of the live writer: streams of its own, seeded by the seed, the world start and its number. */
	private context(index: number): GeneratorContext {
		const { world } = this;
		const { retentionDays } = world.options;
		const stream = (name: string) =>
			hashRng(`${String(world.options.seed)}|${String(world.start)}|${String(index)}|${name}`);

		return {
			rng: stream('rng'),
			shapeRng: stream('shape'),
			ingressRng: stream('ingress'),
			egressRng: stream('egress'),
			mediaRng: stream('media'),
			apiRng: stream('api'),
			scenario: world.scenario,
			// It ends whenever its life does: nothing of it is cut at the generation instant.
			now: Number.POSITIVE_INFINITY,
			windowStart: world.windowStart,
			retentionEntitiesMs: retentionDays.entities * DAY,
			retentionTracksMs: retentionDays.tracks * DAY,
			withoutMediaStats: world.withoutMediaStats
		};
	}

	/** What is written of a room cut at `at`, with the ids of its events written. */
	private snapshot(life: RoomLife, cut: RoomBundle, at: number, events: Set<string>): Written {
		const docs = new Map<CollectionName, Map<string, Document>>();

		for (const [collection, of] of ENTITIES) {
			docs.set(collection, new Map(of(cut).map((doc) => [String(doc._id), toStored(collection, doc)])));
		}

		const rollups = new Rollups(this.rollupOptions);
		rollups.add(cut, { ...this.windows, now: at });

		return {
			docs,
			events,
			counters: new Map(rollups.counters().map((counters) => [countersKey(counters), counters])),
			statsUntil: reportedUntil(life, at),
			closed: cut.room.status === 'closed',
			reconciled: cut.room.closedBy === 'reconciler'
		};
	}

	/**
	 * The active peaks of `at`, counted from the database as the aggregator counts them, kept with `$max` in the
	 * 5-minute, hourly and daily documents of the global scope and, with node rollups, of each media node holding an
	 * active room or session or with a server alive.
	 */
	private async writePeaks(at: number): Promise<void> {
		const { db } = this;
		const samples = new Map<string, Record<string, number>>([
			[
				'global',
				{
					'rooms.peakActive': await db.collection(COLLECTIONS.rooms).countDocuments({ status: 'active' }),
					'participants.peakActive': await db
						.collection(COLLECTIONS.participants)
						.countDocuments({ status: 'active', kind: 'STANDARD' }),
					'egress.peakActive': await db
						.collection(COLLECTIONS.egresses)
						.countDocuments({ status: { $in: ['starting', 'active', 'ending'] } }),
					'ingress.peakActive': await db
						.collection(COLLECTIONS.ingressSessions)
						.countDocuments({ endedAt: { $exists: false } })
				}
			]
		]);

		if (this.rollupOptions.nodes) {
			for (const server of this.world.servers) {
				if (server.mediaNode !== undefined && alive(server, at)) {
					samples.set(`node:${server.mediaNode}`, { 'rooms.peakActive': 0, 'participants.peakActive': 0 });
				}
			}

			for (const [collection, field, filter] of [
				[COLLECTIONS.rooms, 'rooms.peakActive', { status: 'active' }],
				[COLLECTIONS.participants, 'participants.peakActive', { status: 'active', kind: 'STANDARD' }]
			] as const) {
				for (const row of await db
					.collection(collection)
					.aggregate<{ _id: string | null; n: number }>([
						{ $match: { ...filter, mediaNode: { $exists: true } } },
						{ $group: { _id: '$mediaNode', n: { $sum: 1 } } }
					])
					.toArray()) {
					const scope = `node:${String(row._id)}`;
					samples.set(scope, {
						'rooms.peakActive': 0,
						'participants.peakActive': 0,
						...samples.get(scope),
						[field]: row.n
					});
				}
			}
		}

		const buckets: [CollectionName, number][] = [
			[COLLECTIONS.analyticsHourly, Math.floor(at / HOUR) * HOUR],
			[COLLECTIONS.analyticsDaily, Math.floor(at / DAY) * DAY]
		];

		if (this.rollupOptions.fiveMinute) {
			buckets.push([COLLECTIONS.analytics5min, Math.floor(at / (5 * MINUTE)) * 5 * MINUTE]);
		}

		for (const [collection, bucket] of buckets) {
			const ops = [...samples].map(([scope, sample]): Op => {
				// The 5-minute documents keep no ingress figures.
				const peaks = Object.fromEntries(
					Object.entries(sample).filter(
						([field]) => !(collection === COLLECTIONS.analytics5min && field.startsWith('ingress.'))
					)
				);

				return rollupUpsert(scope, bucket, { $max: peaks });
			});

			await db.collection<Keyed>(collection).bulkWrite(ops, { ordered: false });
		}
	}

	/** The distinct identities of the STANDARD sessions that joined on a closed UTC day, in its daily documents. */
	private async writeUniqueIdentities(day: number): Promise<void> {
		const joined = { kind: 'STANDARD', joinedAt: { $gte: new Date(day), $lt: new Date(day + DAY) } };
		const participants = this.db.collection(COLLECTIONS.participants);
		const scopes: [string, Document][] = [['global', joined]];

		if (this.rollupOptions.nodes) {
			for (const label of (await participants.distinct('mediaNode', joined)) as string[]) {
				scopes.push([`node:${label}`, { ...joined, mediaNode: label }]);
			}
		}

		const ops: Op[] = [];

		for (const [scope, filter] of scopes) {
			const identities = (await participants.distinct('identity', filter)).length;
			ops.push(rollupUpsert(scope, day, { $set: { uniqueIdentities: identities } }));
		}

		await this.db.collection<Keyed>(COLLECTIONS.analyticsDaily).bulkWrite(ops, { ordered: false });
	}

	/** The last heartbeat of each server alive at `at`, at its own interval. */
	private async writeHeartbeats(at: number): Promise<void> {
		const ops = this.world.servers.flatMap((server): Op[] => {
			if (!alive(server, at)) {
				return [];
			}

			const beats = Math.floor((at - server.firstSeenAt) / server.batchIntervalMs);

			return [
				{
					updateOne: {
						filter: { _id: server.nodeId },
						update: { $max: { lastSeenAt: new Date(server.firstSeenAt + beats * server.batchIntervalMs) } }
					}
				}
			];
		});

		if (ops.length > 0) {
			await this.db.collection<Keyed>(COLLECTIONS.nodes).bulkWrite(ops, { ordered: false });
		}
	}
}

/** The key of a rollup document's counters: the documents of a bucket that starts on the hour share their `_id`. */
function countersKey(counters: RollupCounters): string {
	return `${counters.collection}|${counters._id}`;
}

function byCreation(a: RoomLife, b: RoomLife): number {
	return a.bundle.room.createdAt.getTime() - b.bundle.room.createdAt.getTime();
}

/** Whether a room is in progress at `at` as the database shows it: created, and its closure not written. */
function inProgress(life: RoomLife, at: number): boolean {
	const { room, closureAt } = life.bundle;
	const end = closureAt ?? room.endedAt?.getTime() ?? Number.POSITIVE_INFINITY;

	return room.createdAt.getTime() <= at && at < end;
}

/** Whether a server is reporting at `at`: started, and neither stopped nor silent. */
function alive(server: Server, at: number): boolean {
	return server.firstSeenAt <= at && (server.end === undefined || at < server.end.at);
}

/** Whether anything of a closed room happens in `(from, to]`: an ingress deletion or an API call. */
function changesAfter(life: RoomLife, from: number, to: number): boolean {
	const within = (at: Date | null) => at !== null && from < at.getTime() && at.getTime() <= to;

	return life.bundle.ingresses.some((i) => within(i.deletedAt)) || life.bundle.apiCalls.some((c) => within(c.at));
}

function push<T>(map: Map<CollectionName, T[]>, collection: CollectionName, item: T): void {
	const list = map.get(collection);

	if (list === undefined) {
		map.set(collection, [item]);
	} else {
		list.push(item);
	}
}

/**
 * The write of an entity: an upsert of the whole document the first time, then a `$set` of the fields that changed
 * and an `$unset` of those gone, never an upsert again, so a document deleted meanwhile stays deleted.
 */
function entityUpdate(id: string, before: Document | undefined, after: Document): Op | undefined {
	const { _id: _ignored, ...fields } = after;

	if (before === undefined) {
		return { updateOne: { filter: { _id: id }, update: { $set: fields }, upsert: true } };
	}

	const set: Document = {};
	const unset: Record<string, ''> = {};

	for (const [key, value] of Object.entries(fields) as [string, unknown][]) {
		if (BSON.EJSON.stringify(value) !== BSON.EJSON.stringify(before[key])) {
			set[key] = value;
		}
	}

	for (const key of Object.keys(before)) {
		if (!(key in after)) {
			unset[key] = '';
		}
	}

	if (Object.keys(set).length === 0 && Object.keys(unset).length === 0) {
		return undefined;
	}

	return {
		updateOne: {
			filter: { _id: id },
			update: {
				...(Object.keys(set).length === 0 ? {} : { $set: set }),
				...(Object.keys(unset).length === 0 ? {} : { $unset: unset })
			}
		}
	};
}

/** The `$inc` of the counters of a rollup document since they were last written, with its new marks. */
function rollupIncrement(after: RollupCounters, before: RollupCounters | undefined): Op | undefined {
	const increments: Document = {};
	let changed = false;

	for (const [path, value] of Object.entries(after.values)) {
		const delta = value - (before?.values[path] ?? 0);

		if (delta !== 0) {
			nest(increments, path, delta);
			changed = true;
		}
	}

	const marks = Object.keys(after.marks).filter((mark) => before?.marks[mark as keyof typeof after.marks] !== true);

	if (!changed && marks.length === 0) {
		return undefined;
	}

	const typed = toStored(after.collection, increments);

	return rollupUpsert(after.scope, after.bucket.getTime(), {
		...(changed ? { $inc: dotted(typed) } : {}),
		...(marks.length === 0 ? {} : { $set: Object.fromEntries(marks.map((mark) => [`mediaStats.${mark}`, true])) })
	});
}

/** An upsert of a rollup document, created with its scope and bucket. */
function rollupUpsert(scope: string, bucket: number, update: Document): Op {
	const date = new Date(bucket);

	return {
		updateOne: {
			filter: { _id: `${scope}:${date.toISOString().replace('.000Z', 'Z')}` },
			update: { ...update, $setOnInsert: { scope, bucket: date } },
			upsert: true
		}
	};
}

function nest(target: Document, path: string, value: number): void {
	const keys = path.split('.');
	let node = target;

	for (const key of keys.slice(0, -1)) {
		node[key] ??= {};
		node = node[key] as Document;
	}

	node[keys.at(-1) ?? path] = value;
}

/** A nested document as dotted paths to its leaves, BSON values kept. */
function dotted(doc: Document, prefix = ''): Document {
	const out: Document = {};

	for (const [key, value] of Object.entries(doc) as [string, unknown][]) {
		const path = prefix === '' ? key : `${prefix}.${key}`;

		if (typeof value === 'object' && value !== null && !(value instanceof Date) && !('_bsontype' in value)) {
			Object.assign(out, dotted(value as Document, path));
		} else {
			out[path] = value;
		}
	}

	return out;
}
