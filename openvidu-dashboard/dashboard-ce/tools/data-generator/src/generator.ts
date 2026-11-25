import { type Db, type Document, MongoBulkWriteError } from 'mongodb';
import {
	deriveEvents,
	deriveStats,
	egressRawRequest,
	BASE_ROLLUPS,
	type DeriveWindows,
	type RollupOptions,
	Rollups,
	type StatsMode
} from './derive.js';
import {
	generateRoom,
	SCENARIOS,
	type GeneratorContext,
	type RoomHost,
	type RoomPlan,
	type Scenario,
	type ScenarioName
} from './model.js';
import { toStored } from './contract.js';
import { cutRoom, roomLife, type RoomLife } from './cut.js';
import type { Engine } from './samples.js';
import { LEGACY_EVENTS, LEGACY_STATS, writeLegacy } from './legacy.js';
import { Rng } from './random.js';
import { COLLECTIONS, createCollections, SCHEMA_VERSION, type CollectionName } from './schema.js';

const BATCH_SIZE = 5000;
const DAY = 86_400_000;
const HOUR = 3_600_000;
const MINUTE = 60_000;
/** Batch interval of the generated heartbeats: the writer's default, and that of the slow media node. */
const BATCH_INTERVAL_MS = 10_000;
const SLOW_BATCH_INTERVAL_MS = 30_000;
/** Version of the servers started before the upgrade halfway through the range, and of those started after it. */
const VERSION_BEFORE_UPGRADE = '3.10.0';
const VERSION_AFTER_UPGRADE = '3.10.1';
// Relative weight of each UTC hour for room creation: office-hours peak around 14:00, quiet nights.
export const HOUR_WEIGHTS: readonly (readonly [number, number])[] = Array.from({ length: 24 }, (_, h) => [
	h,
	0.1 + 0.9 * Math.exp(-((h - 14) ** 2) / 32)
]);

/** Buffers documents per collection and inserts them in batches of BATCH_SIZE with ordered: false. */
class BatchWriter {
	readonly counts: Record<string, number> = {};
	inserted = 0;
	private readonly buffers = new Map<CollectionName, Document[]>();

	constructor(private readonly db: Db) {}

	add(collection: CollectionName, doc: Document): void {
		let buffer = this.buffers.get(collection);

		if (buffer === undefined) {
			buffer = [];
			this.buffers.set(collection, buffer);
		}

		buffer.push(toStored(collection, doc));
	}

	/** Inserts every buffer that reached the batch size. */
	async flushFull(): Promise<void> {
		for (const [collection, buffer] of this.buffers) {
			if (buffer.length >= BATCH_SIZE) {
				await this.flush(collection, buffer);
			}
		}
	}

	async flushAll(): Promise<void> {
		for (const [collection, buffer] of this.buffers) {
			if (buffer.length > 0) {
				await this.flush(collection, buffer);
			}
		}
	}

	private async flush(collection: CollectionName, buffer: Document[]): Promise<void> {
		const docs = buffer.splice(0, BATCH_SIZE);
		const result = await this.db
			.collection(collection)
			.insertMany(docs, { ordered: false })
			.catch((error: unknown) => {
				throw new Error(`${collection}: ${describeWriteError(error)}`, { cause: error });
			});
		this.inserted += result.insertedCount;
		this.counts[collection] = (this.counts[collection] ?? 0) + result.insertedCount;

		if (buffer.length >= BATCH_SIZE) {
			await this.flush(collection, buffer);
		}
	}
}

function planRooms(
	rng: Rng,
	scenario: Scenario,
	days: number,
	windowStart: number,
	now: number,
	activeWindowMinutes: number | undefined,
	minActiveRooms: number
): PlannedRoom[] {
	const createdAts: number[] = [];
	const latest = now - 2 * MINUTE;
	const firstMidnight = Math.floor(windowStart / DAY) * DAY;
	// UTC days the window overlaps; rejection keeps the partial first and last days to their hours inside it.
	const spanDays = Math.ceil((latest - firstMidnight) / DAY);

	for (let i = 0; i < days * scenario.roomsPerDay; i += 1) {
		let createdAt: number;

		do {
			createdAt =
				firstMidnight +
				rng.int(0, spanDays - 1) * DAY +
				rng.weighted(HOUR_WEIGHTS) * HOUR +
				rng.int(0, HOUR - 1);
		} while (createdAt < windowStart || createdAt >= latest);

		createdAts.push(createdAt);
	}

	const activeSince = activeWindowMinutes === undefined ? undefined : now - activeWindowMinutes * MINUTE;

	if (activeSince !== undefined) {
		// Two of every three rooms of the window stay active, so 1.5 rooms per active room.
		const missing =
			Math.ceil(minActiveRooms * 1.5) - createdAts.filter((createdAt) => createdAt >= activeSince).length;

		for (let i = 0; i < missing; i += 1) {
			createdAts.push(rng.int(activeSince, latest - 1));
		}
	}

	createdAts.sort((a, b) => a - b);

	if (activeSince !== undefined) {
		// Two of every three rooms of the window stay active, so recent ranges hold closed rooms too.
		return createdAts.map((createdAt, index) => ({
			createdAt,
			active: createdAt >= activeSince && index % 3 !== 0
		}));
	}

	const activeFrom = createdAts.length - Math.round(createdAts.length * 0.1);

	return createdAts.map((createdAt, index) => ({ createdAt, active: index >= activeFrom }));
}

type PlannedRoom = Pick<RoomPlan, 'createdAt' | 'active' | 'heldOpen'> & { hosts?: readonly RoomHost[] };

/** One server process of the generated deployment, and its `nodes` document. */
export interface Server extends RoomHost {
	firstSeenAt: number;
	drainingAt?: number;
	rtcEngine: Engine;
	serverVersion: string;
	mediaStats: boolean;
	batchIntervalMs: number;
}

/**
 * The servers of the generated deployment, from the server timeline: a single node (one machine, three servers in a
 * row) or, with `mediaNodes`, seven media nodes and ten servers. `M` is the middle of the range, `Q` three quarters of
 * it, `E` the end. With `withoutMediaStats`, the mediasoup machine runs, until the upgrade at `M`, a version that
 * reports no media statistics; the single node then runs mediasoup.
 */
function serverTimeline(
	now: number,
	windowStart: number,
	mediaNodes: boolean,
	withoutMediaStats: boolean,
	seed: number
): Server[] {
	const floor = (at: number) => Math.floor(at / MINUTE) * MINUTE;
	const m = floor(windowStart + (now - windowStart) / 2);
	const q = floor(windowStart + ((now - windowStart) * 3) / 4);
	const singleEngine: Engine = withoutMediaStats ? 'mediasoup' : 'pion';
	const specs: {
		n?: number;
		/** First heartbeat; a day before the range (or before the server's end) when absent. */
		first?: number;
		draining?: number;
		end?: { at: number; stopped: boolean };
		engine: Engine;
		noStats?: boolean;
		slow?: boolean;
	}[] = mediaNodes
		? [
				{ n: 1, draining: m - 10 * MINUTE, end: { at: m, stopped: true }, engine: 'pion' },
				{
					n: 1,
					first: m + MINUTE,
					end: { at: now - 5 * HOUR - 2 * MINUTE, stopped: false },
					engine: 'mediasoup'
				},
				{ n: 1, first: now - 5 * HOUR, engine: 'mediasoup' },
				{
					n: 2,
					draining: m + 20 * MINUTE,
					end: { at: m + 30 * MINUTE, stopped: true },
					engine: 'mediasoup',
					noStats: withoutMediaStats
				},
				{ n: 2, first: m + 31 * MINUTE, engine: 'mediasoup' },
				{ n: 3, draining: now - 20 * MINUTE, engine: 'pion' },
				{
					n: 4,
					draining: now - 3 * HOUR - 10 * MINUTE,
					end: { at: now - 3 * HOUR, stopped: false },
					engine: 'pion'
				},
				{ n: 5, draining: now - 40 * MINUTE, end: { at: now - 30 * MINUTE, stopped: true }, engine: 'pion' },
				{ n: 6, first: q, engine: 'pion', slow: true },
				{ n: 7, end: { at: now - 3 * DAY, stopped: false }, engine: 'pion' }
			]
		: [
				{
					draining: m - 2 * MINUTE,
					end: { at: m, stopped: true },
					engine: singleEngine,
					noStats: withoutMediaStats
				},
				{ first: m + MINUTE, end: { at: q, stopped: false }, engine: singleEngine },
				{ first: q + 2 * MINUTE, engine: singleEngine }
			];
	// Node ids take a stream of their own, so the number of servers shifts no room.
	const ids = new Rng(seed + 11_000_027);

	return specs.map((spec) => {
		const firstSeenAt = spec.first ?? Math.min(windowStart, spec.end?.at ?? windowStart) - DAY;
		const mediaNode = spec.n === undefined ? undefined : `media-node-10-0-0-${String(spec.n)}`;

		return {
			nodeId: ids.id('ND_', 8),
			...(mediaNode === undefined ? {} : { mediaNode }),
			...(spec.end === undefined ? {} : { end: spec.end }),
			firstSeenAt,
			...(spec.draining === undefined ? {} : { drainingAt: spec.draining }),
			rtcEngine: spec.engine,
			serverVersion: firstSeenAt < m ? VERSION_BEFORE_UPGRADE : VERSION_AFTER_UPGRADE,
			mediaStats: spec.noStats !== true,
			batchIntervalMs: spec.slow === true ? SLOW_BATCH_INTERVAL_MS : BATCH_INTERVAL_MS
		};
	});
}

/** Whether a server takes new rooms at `at`: from its first heartbeat until it drains or ends. */
export function takesRooms(server: Server, at: number): boolean {
	return (
		server.firstSeenAt <= at &&
		at < Math.min(server.drainingAt ?? Number.POSITIVE_INFINITY, server.end?.at ?? Number.POSITIVE_INFINITY)
	);
}

/**
 * The rooms to generate, in creation order: the planned ones that a server takes, each with the servers that take it
 * (only those alive at the end for an active room), and one room on each server lost inside the range, created 10
 * minutes before it stops taking rooms and held open until its silence.
 */
function hostRooms(planned: readonly PlannedRoom[], servers: readonly Server[], windowStart: number): RoomPlan[] {
	const lost = servers.flatMap((server): PlannedRoom[] => {
		if (server.end === undefined || server.end.stopped || server.end.at <= windowStart) {
			return [];
		}

		const createdAt = (server.drainingAt ?? server.end.at) - 10 * MINUTE;

		return createdAt >= windowStart && takesRooms(server, createdAt)
			? [{ createdAt, active: false, heldOpen: true, hosts: [server] }]
			: [];
	});

	return [...planned, ...lost]
		.map((room) => ({
			...room,
			hosts:
				room.hosts ??
				servers.filter(
					(server) => takesRooms(server, room.createdAt) && (!room.active || server.end === undefined)
				)
		}))
		.filter((room) => room.hosts.length > 0)
		.sort((a, b) => a.createdAt - b.createdAt)
		.map((room, index) => ({ ...room, index }));
}

/** The highest of some `major.minor.patch` versions. */
function newestVersion(versions: readonly string[]): string {
	const parts = (version: string) => version.split('.').map(Number);

	return versions.reduce((newest, version) => {
		const [a, b] = [parts(version), parts(newest)];
		const index = a.findIndex((part, i) => part !== b[i]);

		return index !== -1 && (a[index] ?? 0) > (b[index] ?? 0) ? version : newest;
	});
}

export interface GenerateOptions {
	scenario: ScenarioName;
	/** Days of history ending at the generation instant. */
	days: number;
	/** Generation instant (ms), floored to the minute; the current time by default. */
	now?: number;
	statsMode: StatsMode;
	seed: number;
	/** Retention in days per class; documents outside it are not written. 5-minute rollups keep 7 days by default. */
	retentionDays: { events: number; stats: number; tracks: number; entities: number; rollups5Min?: number };
	/** Try a time-series track_stats collection (plain collection when false or rejected). */
	timeseries: boolean;
	/** Rollups beyond the global hourly and daily documents; none by default. */
	rollups?: RollupOptions;
	/** Rooms created in the last minutes that are still active; the most recent 10 % of the rooms by default. */
	activeWindowMinutes?: number;
	/** Active rooms the active window holds at least, whatever the hour; extra rooms are added to it when needed. */
	minActiveRooms?: number;
	/**
	 * 0 or 1 (0 by default). With 1, the servers of the mediasoup machine started before the upgrade halfway through the
	 * range (the first of `-2`, or the first of the single node, which then runs mediasoup) report no media statistics.
	 */
	nodesWithoutMediaStats?: number;
	/**
	 * A multi-node deployment: seven media nodes `media-node-10-0-0-1` to `-7` and ten servers. `-1` restarted twice
	 * (a stop at the upgrade halfway through the range, then a lost server 5 h before the end), `-2` upgraded, `-3`
	 * draining for the last 20 minutes, `-4` lost while draining 3 hours before the end, `-5` stopped 30 minutes before
	 * the end, `-6` started three quarters of the way through and reporting every 30 s, `-7` silent for the last 3 days.
	 * Without it, a single node without label: three servers in a row, the first stopped at the upgrade, the second lost
	 * three quarters of the way through, the third alive.
	 */
	mediaNodes?: boolean;
	/**
	 * The `legacy_events` and `stats` collections of the writer before 3.10 over the 48 hours before the range, and a
	 * migration completed one hour into it whose `legacyRetainedUntil` is their latest expiry.
	 */
	legacy?: boolean;
	log?: (line: string) => void;
}

export interface GenerateSummary {
	counts: Record<string, number>;
	inserted: number;
	elapsedSeconds: number;
	timeseries: boolean;
	/** What the live writer goes on writing from the generation instant (`LiveWriter`). */
	world: World;
}

/** The generated world at the generation instant, which the live writer goes on writing. */
export interface World {
	options: GenerateOptions;
	scenario: Scenario;
	/** The generation instant: the live writer's first tick. */
	start: number;
	windowStart: number;
	servers: readonly Server[];
	/** The rooms whose lives go on after the generation instant. */
	lives: RoomLife[];
	/** The number of rooms generated, after which the live writer numbers its own. */
	rooms: number;
	/** The node ids of the servers that report no media statistics. */
	withoutMediaStats: ReadonlySet<string>;
}

/**
 * Fills a database with a deterministic scenario: same options, seed and generation instant, same documents. Each room
 * is drawn over its whole life (`generateRoom()`) and written as it is at the generation instant (`cutRoom()`).
 */
export async function generate(db: Db, options: GenerateOptions): Promise<GenerateSummary> {
	const log = options.log ?? (() => undefined);
	const scenario: Scenario = SCENARIOS[options.scenario];
	const { days, statsMode, retentionDays } = options;
	const rollups5MinDays = retentionDays.rollups5Min ?? 7;

	if (days < 1) {
		throw new Error('days must be at least 1');
	}

	if (options.minActiveRooms !== undefined && options.activeWindowMinutes === undefined) {
		throw new Error('minActiveRooms requires activeWindowMinutes');
	}

	const nodesWithoutMediaStats = options.nodesWithoutMediaStats ?? 0;

	if (options.rollups?.nodes === true && options.mediaNodes !== true) {
		throw new Error('node rollups require mediaNodes: node scopes are keyed by the media node label');
	}

	if (nodesWithoutMediaStats !== 0 && nodesWithoutMediaStats !== 1) {
		throw new Error('nodesWithoutMediaStats must be 0 or 1');
	}

	const retention = {
		events: retentionDays.events * 86_400,
		stats: retentionDays.stats * 86_400,
		tracks: retentionDays.tracks * 86_400,
		entities: retentionDays.entities * 86_400,
		rollups5Min: rollups5MinDays * 86_400,
		rollupsHourly: 400 * 86_400
	};
	const { timeseries } = await createCollections(db, {
		timeseries: options.timeseries,
		retention,
		validationAction: 'error'
	});
	const now = Math.floor((options.now ?? Date.now()) / MINUTE) * MINUTE;
	const windowStart = now - days * DAY;
	const rng = new Rng(options.seed);
	const servers = serverTimeline(
		now,
		windowStart,
		options.mediaNodes === true,
		nodesWithoutMediaStats === 1,
		options.seed
	);
	// Creation instants are drawn by rejection inside a window that moves with the clock, so they take their own stream:
	// the draws of the rooms' content stay the same at any hour.
	const plans = hostRooms(
		planRooms(
			new Rng(options.seed + 4_000_037),
			scenario,
			days,
			windowStart,
			now,
			options.activeWindowMinutes,
			options.minActiveRooms ?? 0
		),
		servers,
		windowStart
	);
	const ctx: GeneratorContext = {
		rng,
		shapeRng: new Rng(options.seed + 3_000_017),
		ingressRng: new Rng(options.seed + 6_000_011),
		egressRng: new Rng(options.seed + 7_000_003),
		mediaRng: new Rng(options.seed + 8_000_009),
		apiRng: new Rng(options.seed + 9_000_011),
		scenario,
		now,
		windowStart,
		retentionEntitiesMs: retentionDays.entities * DAY,
		retentionTracksMs: retentionDays.tracks * DAY,
		withoutMediaStats: new Set(servers.flatMap((server) => (server.mediaStats ? [] : [server.nodeId])))
	};
	const windows: DeriveWindows = {
		now,
		eventsFrom: now - retentionDays.events * DAY,
		statsFrom: now - retentionDays.stats * DAY,
		fiveMinuteFrom: now - rollups5MinDays * DAY,
		statsMode
	};
	// The servers that run mediasoup measure media without padding, the reading's jitter and RTT.
	const engines = new Map(servers.map((server) => [server.nodeId, server.rtcEngine]));
	const rollups = new Rollups(options.rollups ?? BASE_ROLLUPS);
	const writer = new BatchWriter(db);
	const started = performance.now();
	const progressEvery = Math.max(1, Math.floor(plans.length / 20));
	// Entities whose expiresAt already passed would be removed by the TTL monitor; they are not written at all.
	const alive = (doc: { expiresAt: Date | null }): boolean => doc.expiresAt === null || doc.expiresAt.getTime() > now;

	log(
		`Scenario ${scenario.name}: ${formatInt(plans.length)} rooms over ${String(days)} day(s) ` +
			`[${new Date(windowStart).toISOString()} .. ${new Date(now).toISOString()}], stats mode ${statsMode}, ` +
			`track_stats ${timeseries ? 'time-series' : 'plain collection'}, seed ${String(options.seed)}`
	);

	const hosted = new Map<string, number>();
	const reconciled = new Map<string, number>();
	const lives: RoomLife[] = [];

	for (const [i, plan] of plans.entries()) {
		const generated = generateRoom(ctx, plan);
		const engine = engines.get(generated.room.nodeId) ?? 'pion';
		const life = roomLife(generated, engine, statsMode);
		const bundle = cutRoom(life, now);

		if (life.end > now) {
			lives.push(life);
		}

		if (bundle === undefined) {
			throw new Error(`room ${generated.room.name} is created after the generation instant`);
		}

		hosted.set(bundle.room.nodeId, (hosted.get(bundle.room.nodeId) ?? 0) + 1);

		if (bundle.room.closedBy === 'reconciler') {
			reconciled.set(bundle.room.nodeId, (reconciled.get(bundle.room.nodeId) ?? 0) + 1);
		}

		// Entities whose expiry has passed are gone, as the TTL monitor leaves them.
		if (alive(bundle.room)) {
			writer.add(COLLECTIONS.rooms, bundle.room);
		}

		for (const doc of bundle.participants.filter(alive)) {
			writer.add(COLLECTIONS.participants, doc);
		}

		for (const doc of bundle.tracks.filter(alive)) {
			writer.add(COLLECTIONS.tracks, doc);
		}

		for (const doc of bundle.subscriptions.filter(alive)) {
			writer.add(COLLECTIONS.trackSubscriptions, doc);
		}

		for (const doc of bundle.egresses.filter(alive)) {
			writer.add(COLLECTIONS.egresses, { ...doc, rawRequest: egressRawRequest(doc) });
		}

		for (const doc of bundle.ingresses.filter(alive)) {
			writer.add(COLLECTIONS.ingresses, doc);
		}

		for (const doc of bundle.ingressSessions.filter(alive)) {
			writer.add(COLLECTIONS.ingressSessions, doc);
		}

		deriveEvents(bundle, windows, (doc) => {
			writer.add(COLLECTIONS.events, doc);
		});
		deriveStats(bundle, windows, engine, (doc) => {
			writer.add(COLLECTIONS.trackStats, doc);
		});
		rollups.add(bundle, windows);
		await writer.flushFull();

		if ((i + 1) % progressEvery === 0 || i === plans.length - 1) {
			const elapsed = (performance.now() - started) / 1000;
			log(
				`rooms ${formatInt(i + 1)}/${formatInt(plans.length)} | ${formatInt(writer.inserted)} docs inserted | ` +
					`${formatInt(Math.round(writer.inserted / Math.max(elapsed, 0.001)))} docs/s`
			);
		}
	}

	const nodes = servers.map((server) => ({
		_id: server.nodeId,
		firstSeenAt: new Date(server.firstSeenAt),
		lastSeenAt: new Date(server.end?.at ?? now),
		serverVersion: server.serverVersion,
		batchIntervalMs: server.batchIntervalMs,
		mediaStats: server.mediaStats,
		rtcEngine: server.rtcEngine,
		...(server.mediaNode === undefined
			? {}
			: { mediaNode: server.mediaNode, ip: server.mediaNode.replace('media-node-', '').replaceAll('-', '.') }),
		...(server.drainingAt === undefined ? {} : { drainingAt: new Date(server.drainingAt) }),
		...(server.end?.stopped === true ? { stoppedAt: new Date(server.end.at) } : {}),
		rooms: { hosted: hosted.get(server.nodeId) ?? 0, reconciled: reconciled.get(server.nodeId) ?? 0 }
	}));
	// A media node label is alive from the first to the last heartbeat of each of its servers.
	const lifetimes = new Map<string, [number, number][]>();

	for (const server of servers) {
		if (server.mediaNode !== undefined) {
			lifetimes.set(server.mediaNode, [
				...(lifetimes.get(server.mediaNode) ?? []),
				[server.firstSeenAt, server.end?.at ?? now]
			]);
		}
	}

	rollups.samplePeaks(windows, windowStart, lifetimes);

	for (const doc of rollups.hourlyDocs()) {
		writer.add(COLLECTIONS.analyticsHourly, doc);
	}

	for (const doc of rollups.dailyDocs()) {
		writer.add(COLLECTIONS.analyticsDaily, doc);
	}

	for (const doc of rollups.fiveMinuteDocs()) {
		writer.add(COLLECTIONS.analytics5min, doc);
	}

	for (const node of nodes) {
		writer.add(COLLECTIONS.nodes, node);
	}

	const generatedAt = new Date(now);
	writer.add(COLLECTIONS.schemaMeta, {
		_id: 'schema',
		version: SCHEMA_VERSION,
		writerVersion: newestVersion(servers.map((server) => server.serverVersion)),
		updatedAt: generatedAt
	});
	writer.add(COLLECTIONS.schemaMeta, {
		_id: 'retention',
		eventsMs: retentionDays.events * DAY,
		statsMs: retentionDays.stats * DAY,
		tracksMs: retentionDays.tracks * DAY,
		entitiesMs: retentionDays.entities * DAY,
		rollups5MinMs: rollups5MinDays * DAY,
		rollupsHourlyMs: retention.rollupsHourly * 1000,
		rollupsDailyMs: null,
		updatedAt: generatedAt
	});
	writer.add(COLLECTIONS.schemaMeta, {
		_id: 'capabilities',
		timeseries,
		transactions: true,
		serverVersion: 'unknown',
		detectedAt: generatedAt
	});
	writer.add(COLLECTIONS.schemaMeta, { _id: 'config', statsDetail: statsMode, recordedAt: generatedAt });

	if (options.legacy === true) {
		const legacy = await writeLegacy(db, windowStart, options.seed);
		const total = legacy.events + legacy.stats;

		writer.counts[LEGACY_EVENTS] = legacy.events;
		writer.counts[LEGACY_STATS] = legacy.stats;
		writer.inserted += total;
		writer.add(COLLECTIONS.schemaMeta, {
			_id: 'migration',
			state: 'completed',
			checkpoint: { phase: 'cleanup', events: legacy.lastEventSecond, stats: legacy.lastStatSecond },
			processed: total,
			total,
			startedAt: new Date(windowStart + 5 * MINUTE),
			finishedAt: new Date(windowStart + HOUR),
			writerVersion: VERSION_BEFORE_UPGRADE,
			fromSchemaVersion: 0,
			counts: { events: legacy.events, stats: legacy.stats, synthetic: 0, skipped: 0 },
			nodeId: servers[0]?.nodeId ?? '',
			legacyRetainedUntil: legacy.latestExpiry
		});
	}

	await writer.flushAll();

	return {
		counts: writer.counts,
		inserted: writer.inserted,
		elapsedSeconds: (performance.now() - started) / 1000,
		timeseries,
		world: {
			options,
			scenario,
			start: now,
			windowStart,
			servers,
			lives,
			rooms: plans.length,
			withoutMediaStats: ctx.withoutMediaStats
		}
	};
}

/** The failing document and the first contract rules it breaks, from a bulk write error of the validator. */
function describeWriteError(error: unknown): string {
	if (!(error instanceof MongoBulkWriteError)) {
		return error instanceof Error ? error.message : String(error);
	}

	const [first] = error.writeErrors instanceof Array ? error.writeErrors : [error.writeErrors];
	const info = first?.err.errInfo;

	return `${error.message}: ${JSON.stringify(info ?? {}).slice(0, 2_000)}`;
}

function formatInt(value: number): string {
	return value.toLocaleString('en-US');
}
