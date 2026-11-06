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
	type RoomPlan,
	type Scenario,
	type ScenarioName
} from './model.js';
import { toStored } from './contract.js';
import { Rng } from './random.js';
import { BATCH_INTERVAL_MS, COLLECTIONS, createCollections, SCHEMA_VERSION, type CollectionName } from './schema.js';

const BATCH_SIZE = 5000;
const DAY = 86_400_000;
const HOUR = 3_600_000;
const MINUTE = 60_000;
const NODE_COUNT = 3;
// Relative weight of each UTC hour for room creation: office-hours peak around 14:00, quiet nights.
const HOUR_WEIGHTS: readonly (readonly [number, number])[] = Array.from({ length: 24 }, (_, h) => [
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
): RoomPlan[] {
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
			index,
			createdAt,
			active: createdAt >= activeSince && index % 3 !== 0
		}));
	}

	const activeFrom = createdAts.length - Math.round(createdAts.length * 0.1);

	return createdAts.map((createdAt, index) => ({ index, createdAt, active: index >= activeFrom }));
}

export interface GenerateOptions {
	scenario: ScenarioName;
	/** Days of history ending now. */
	days: number;
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
	/** Generated nodes, the last ones, that report no media statistics; none by default. */
	nodesWithoutMediaStats?: number;
	/**
	 * Five media nodes `media-node-10-0-0-<n>`, one per state: `-1` restarted (an earlier, stopped process), `-2` alive,
	 * `-3` draining, `-4` not reporting for the last 3 hours and `-5` stopped 30 minutes before the end.
	 */
	mediaNodes?: boolean;
	log?: (line: string) => void;
}

export interface GenerateSummary {
	counts: Record<string, number>;
	inserted: number;
	elapsedSeconds: number;
	timeseries: boolean;
}

/** Fills a database with a deterministic scenario: same options and seed, same documents (dates relative to now). */
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

	if (nodesWithoutMediaStats > NODE_COUNT) {
		throw new Error(`nodesWithoutMediaStats must be at most ${String(NODE_COUNT)}`);
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
	const now = Math.floor(Date.now() / MINUTE) * MINUTE;
	const windowStart = now - days * DAY;
	const rng = new Rng(options.seed);
	const nodeIds = Array.from({ length: NODE_COUNT }, () => rng.id('ND_', 8));
	const labelled = options.mediaNodes === true;
	// A separate generator keeps the rooms of a seed the same with and without labels.
	const restart = labelled
		? {
				nodeId: nodeIds[0] ?? '',
				previousNodeId: new Rng(options.seed + 1_000_003).id('ND_', 8),
				at: Math.floor((windowStart + (now - windowStart) / 2) / MINUTE) * MINUTE
			}
		: undefined;
	const mediaNodes = new Map<string, string>(
		labelled ? nodeIds.map((id, i) => [id, `media-node-10-0-0-${String(i + 1)}`] as const) : []
	);
	const withoutMediaStats = new Set(nodeIds.slice(NODE_COUNT - nodesWithoutMediaStats));
	// Media nodes gone before the end of the data: they host some of the rooms that ended before they did.
	const extraRng = new Rng(options.seed + 2_000_003);
	const departed = labelled
		? [
				{ nodeId: extraRng.id('ND_', 8), n: 4, lastSeenAt: now - 3 * HOUR, drainingAt: null, stoppedAt: null },
				{
					nodeId: extraRng.id('ND_', 8),
					n: 5,
					lastSeenAt: now - 30 * MINUTE,
					drainingAt: now - 40 * MINUTE,
					stoppedAt: now - 30 * MINUTE
				}
			]
		: [];

	for (const node of departed) {
		mediaNodes.set(node.nodeId, `media-node-10-0-0-${String(node.n)}`);
	}

	if (restart !== undefined) {
		mediaNodes.set(restart.previousNodeId, mediaNodes.get(restart.nodeId) ?? '');

		if (withoutMediaStats.has(restart.nodeId)) {
			withoutMediaStats.add(restart.previousNodeId);
		}
	}

	const plans = planRooms(
		rng,
		scenario,
		days,
		windowStart,
		now,
		options.activeWindowMinutes,
		options.minActiveRooms ?? 0
	);
	const ctx: GeneratorContext = {
		rng,
		scenario,
		now,
		nodeIds,
		retentionEntitiesMs: retentionDays.entities * DAY,
		retentionTracksMs: retentionDays.tracks * DAY,
		withoutMediaStats,
		mediaNodes,
		...(restart === undefined ? {} : { restart })
	};
	const windows: DeriveWindows = {
		now,
		eventsFrom: now - retentionDays.events * DAY,
		statsFrom: now - retentionDays.stats * DAY,
		fiveMinuteFrom: now - rollups5MinDays * DAY,
		statsMode
	};
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

	for (const [i, plan] of plans.entries()) {
		const bundle = generateRoom(ctx, plan);
		const target = departed[plan.index % 5];

		if (
			target !== undefined &&
			bundle.room.mediaStats !== false &&
			bundle.room.endedAt !== null &&
			bundle.room.endedAt.getTime() < (target.drainingAt ?? target.lastSeenAt)
		) {
			rehost(bundle, target.nodeId, `media-node-10-0-0-${String(target.n)}`);
		}

		hosted.set(bundle.room.nodeId, (hosted.get(bundle.room.nodeId) ?? 0) + 1);

		if (bundle.room.closedBy === 'reconciler') {
			reconciled.set(bundle.room.nodeId, (reconciled.get(bundle.room.nodeId) ?? 0) + 1);
		}

		writer.add(COLLECTIONS.rooms, bundle.room);

		for (const doc of bundle.participants) {
			writer.add(COLLECTIONS.participants, doc);
		}

		for (const doc of bundle.tracks.filter(alive)) {
			writer.add(COLLECTIONS.tracks, doc);
		}

		for (const doc of bundle.subscriptions.filter(alive)) {
			writer.add(COLLECTIONS.trackSubscriptions, doc);
		}

		for (const doc of bundle.egresses) {
			writer.add(COLLECTIONS.egresses, { ...doc, rawRequest: egressRawRequest(doc) });
		}

		for (const doc of bundle.ingresses) {
			writer.add(COLLECTIONS.ingresses, doc);
		}

		for (const doc of bundle.ingressSessions) {
			writer.add(COLLECTIONS.ingressSessions, doc);
		}

		deriveEvents(rng, bundle, windows, (doc) => {
			writer.add(COLLECTIONS.events, doc);
		});
		deriveStats(rng, bundle, windows, (doc) => {
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

	for (const doc of rollups.hourlyDocs()) {
		writer.add(COLLECTIONS.analyticsHourly, doc);
	}

	for (const doc of rollups.dailyDocs()) {
		writer.add(COLLECTIONS.analyticsDaily, doc);
	}

	for (const doc of rollups.fiveMinuteDocs()) {
		writer.add(COLLECTIONS.analytics5min, doc);
	}

	const nodeDocument = (nodeId: string, fields: { firstSeenAt: number; lastSeenAt: number }) => {
		const mediaNode = mediaNodes.get(nodeId);
		const reportsMediaStats = !ctx.withoutMediaStats.has(nodeId);
		const rooms = { hosted: hosted.get(nodeId) ?? 0, reconciled: reconciled.get(nodeId) ?? 0 };

		return {
			_id: nodeId,
			firstSeenAt: new Date(fields.firstSeenAt),
			lastSeenAt: new Date(fields.lastSeenAt),
			serverVersion: '3.10.0',
			batchIntervalMs: BATCH_INTERVAL_MS,
			mediaStats: reportsMediaStats,
			rtcEngine: reportsMediaStats ? 'pion' : 'mediasoup',
			...(mediaNode === undefined
				? {}
				: { mediaNode, ip: mediaNode.replace('media-node-', '').replaceAll('-', '.') }),
			rooms
		};
	};

	for (const [i, nodeId] of nodeIds.entries()) {
		writer.add(COLLECTIONS.nodes, {
			...nodeDocument(nodeId, {
				firstSeenAt: restart?.nodeId === nodeId ? restart.at : windowStart - DAY,
				lastSeenAt: now
			}),
			// The third media node is draining: it takes no new rooms and stops once its rooms end.
			...(labelled && i === 2 ? { drainingAt: new Date(now - 20 * MINUTE) } : {})
		});
	}

	if (restart !== undefined) {
		const stoppedAt = restart.at - MINUTE;
		writer.add(COLLECTIONS.nodes, {
			...nodeDocument(restart.previousNodeId, { firstSeenAt: windowStart - DAY, lastSeenAt: stoppedAt }),
			stoppedAt: new Date(stoppedAt)
		});
	}

	for (const node of departed) {
		writer.add(COLLECTIONS.nodes, {
			...nodeDocument(node.nodeId, { firstSeenAt: windowStart - DAY, lastSeenAt: node.lastSeenAt }),
			...(node.drainingAt === null ? {} : { drainingAt: new Date(node.drainingAt) }),
			...(node.stoppedAt === null ? {} : { stoppedAt: new Date(node.stoppedAt) })
		});
	}

	const generatedAt = new Date(now);
	writer.add(COLLECTIONS.schemaMeta, {
		_id: 'schema',
		version: SCHEMA_VERSION,
		writerVersion: '3.10.0',
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
	await writer.flushAll();

	return {
		counts: writer.counts,
		inserted: writer.inserted,
		elapsedSeconds: (performance.now() - started) / 1000,
		timeseries
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

/** Moves a generated room and its sessions to another server, before its events, stats and rollups are derived. */
function rehost(bundle: ReturnType<typeof generateRoom>, nodeId: string, mediaNode: string): void {
	bundle.room.nodeId = nodeId;
	bundle.room.mediaNode = mediaNode;

	for (const participant of bundle.participants) {
		participant.nodeId = nodeId;
		participant.mediaNode = mediaNode;
	}
}
