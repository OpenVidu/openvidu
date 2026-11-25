import type { Db, Document } from 'mongodb';
import { toStored } from './contract.js';
import { Rollups, type RollupCounters } from './derive.js';
import { type GenerateOptions, type Server, type World } from './generator.js';
import { liveRollupIncrement, type LiveOp } from './live.js';
import { SCENARIOS, type RoomBundle } from './model.js';
import { nodeState, SCHEDULE_AHEAD, ServerSchedule } from './operations.js';
import { hashRng } from './random.js';
import { ALIVE_NODE_MS, COLLECTIONS } from './schema.js';

const MINUTE = 60_000;
const DAY = 86_400_000;
const RECONCILED = 'RECONCILED';
const NODE_DEAD = 'node-dead';
const ROOM_CLOSED_NODE_DEAD = 'room-closed-node-dead';
const LOST_EGRESS_ERROR = 'egress lost (reconciled)';
const LOST_INGRESS_ERROR = 'ingress lost (reconciled)';
const OPEN_EGRESS = ['starting', 'active', 'ending'];

/** A stored document of the contract: keyed by a string, its absent fields omitted. */
type Stored = Record<string, unknown> & { _id: string };
/** A document being built. */
type Fields = Record<string, unknown>;

/**
 * Restarts the live writing of a kept database at `at`, treating the time since its last heartbeat (the freshest
 * `lastSeenAt` of a running server) as an outage:
 * - every room, session, track, subscription, egress and ingress session still open is closed as the reconciler does
 *   after a node-dead confirmation, at its last signal (`max(lastStatsAt, lastEventAt)`, never after the heartbeat),
 *   with its synthetic events, `rooms.reconciled` on its server and the rollups of each closure in its end buckets;
 * - the servers alive at the heartbeat stay lost, and each of their machines gets a new server at `at`;
 * - a new world is drawn from the seed and `at`, with no room floor for the 10 minutes after it.
 * Nothing is dated between the heartbeat and `at`, whatever wrote the data, a live or a frozen run.
 */
export async function restartLive(db: Db, options: GenerateOptions, at: number): Promise<World> {
	const nodes = await db.collection<Stored>(COLLECTIONS.nodes).find().sort({ firstSeenAt: 1, _id: 1 }).toArray();
	const running = nodes.filter((node) => node.stoppedAt === undefined);
	const heartbeat = Math.max(...running.map((node) => time(node.lastSeenAt)));

	if (!Number.isFinite(heartbeat)) {
		throw new Error('The database has no running server; generate it first');
	}

	const alive = running.filter((node) => time(node.lastSeenAt) >= heartbeat - ALIVE_NODE_MS);
	const reconcilerNode = alive[0]?._id ?? '';

	await closeOpen(db, options, heartbeat, reconcilerNode);

	const servers: Server[] = nodes.map(toServer);
	const started: Server[] = alive.map((node) => ({
		nodeId: hashRng(
			`${String(options.seed)}|${String(at)}|${typeof node.mediaNode === 'string' ? node.mediaNode : 'single'}`
		).id('ND_', 8),
		...(typeof node.mediaNode === 'string' ? { mediaNode: node.mediaNode } : {}),
		firstSeenAt: at,
		rtcEngine: node.rtcEngine as Server['rtcEngine'],
		serverVersion: '3.10.1',
		mediaStats: true,
		batchIntervalMs: Number(node.batchIntervalMs)
	}));

	if (started.length > 0) {
		await db.collection<Stored>(COLLECTIONS.nodes).insertMany(
			started.map(
				(server) =>
					toStored(COLLECTIONS.nodes, {
						...nodeState(server, at),
						rooms: { hosted: 0, reconciled: 0 }
					}) as Stored
			)
		);
	}

	servers.push(...started);

	const schedule = new ServerSchedule(servers, at, options.seed, options.mediaNodes === true);
	schedule.extend(at + SCHEDULE_AHEAD);
	const last = await db.collection<Stored>(COLLECTIONS.rooms).find().sort({ name: -1 }).limit(1).next();

	return {
		options,
		scenario: SCENARIOS[options.scenario],
		start: at,
		windowStart: at - Math.max(1, options.days) * DAY,
		servers,
		schedule,
		lives: [],
		rooms: Number.parseInt(typeof last?.name === 'string' ? last.name.replace('room-', '') : '0', 10) || 0,
		withoutMediaStats: new Set(servers.flatMap((server) => (server.mediaStats ? [] : [server.nodeId]))),
		floorWaivers: [{ from: at, ramp: at, until: at + 10 * MINUTE }]
	};
}

/** A server of the timeline from its `nodes` document: a running one is lost at its last heartbeat. */
function toServer(node: Stored): Server {
	return {
		nodeId: node._id,
		...(typeof node.mediaNode === 'string' ? { mediaNode: node.mediaNode } : {}),
		firstSeenAt: time(node.firstSeenAt),
		...(node.drainingAt === undefined ? {} : { drainingAt: time(node.drainingAt) }),
		end:
			node.stoppedAt === undefined
				? { at: time(node.lastSeenAt), stopped: false }
				: { at: time(node.stoppedAt), stopped: true },
		rtcEngine: node.rtcEngine as Server['rtcEngine'],
		serverVersion: String(node.serverVersion),
		mediaStats: node.mediaStats !== false,
		batchIntervalMs: Number(node.batchIntervalMs)
	};
}

/** Closes what is open as the reconciler does once every server is confirmed dead at `heartbeat`. */
async function closeOpen(db: Db, options: GenerateOptions, heartbeat: number, reconcilerNode: string): Promise<void> {
	const { retentionDays } = options;
	const collection = (name: string) => db.collection<Stored>(name);
	const rooms = await collection(COLLECTIONS.rooms).find({ status: 'active' }).toArray();
	const egresses = await collection(COLLECTIONS.egresses)
		.find({ status: { $in: OPEN_EGRESS } })
		.toArray();
	const sessions = await collection(COLLECTIONS.ingressSessions)
		.find({ endedAt: { $exists: false } })
		.toArray();
	const writes = new Map<string, LiveOp[]>();
	const events: Document[] = [];
	const push = (name: string, op: LiveOp) => {
		writes.set(name, [...(writes.get(name) ?? []), op]);
	};
	const set = (name: string, doc: Stored, fields: Document, unset: string[] = []) => {
		push(name, {
			updateOne: {
				filter: { _id: doc._id },
				update: {
					$set: toStored(name as never, fields),
					...(unset.length === 0 ? {} : { $unset: Object.fromEntries(unset.map((field) => [field, ''])) })
				}
			}
		});
	};
	const entityExpiry = (end: number) => new Date(end + retentionDays.entities * DAY);
	const trackExpiry = (end: number) => new Date(end + retentionDays.tracks * DAY);
	const rollups: [RollupCounters[], RollupCounters[]] = [[], []];
	const closedSessions: Stored[] = [];

	for (const room of rooms) {
		const signal = Math.max(time(room.lastStatsAt) || 0, time(room.lastEventAt) || 0, time(room.createdAt));
		const end = Math.min(signal, heartbeat);
		const at = (start: unknown) => Math.max(end, time(start));
		const roomMin = { sid: room._id, name: room.name };
		const ref = { roomSid: room._id, roomName: room.name, nodeId: room.nodeId };
		const reconciler = { reason: NODE_DEAD };
		const participants = await collection(COLLECTIONS.participants).find({ roomSid: room._id }).toArray();
		const tracks = await collection(COLLECTIONS.tracks).find({ roomSid: room._id }).toArray();
		const subscriptions = await collection(COLLECTIONS.trackSubscriptions).find({ roomSid: room._id }).toArray();
		const roomEgresses = egresses.filter((e) => e.roomSid === room._id);
		const roomSessions = sessions.filter((s) => s.roomName === room.name);
		const closed = {
			participants: participants.map((p) => {
				if (p.leftAt !== undefined) {
					return p;
				}

				const leftAt = at(p.joinedAt);
				const connected = p.status === 'active';
				const fields = {
					status: connected ? 'left' : 'aborted',
					leftAt: new Date(leftAt),
					durationMs: leftAt - time(p.joinedAt),
					disconnectReason: RECONCILED,
					closedBy: 'reconciler',
					lastEventAt: new Date(leftAt),
					expiresAt: entityExpiry(leftAt)
				};
				set(COLLECTIONS.participants, p, fields);
				events.push({
					_id: `AE_SYN_${p._id}`,
					type: connected ? 'PARTICIPANT_LEFT' : 'PARTICIPANT_CONNECTION_ABORTED',
					ts: new Date(leftAt),
					...ref,
					participantSid: p._id,
					identity: p.identity,
					synthetic: true,
					payload: {
						room: roomMin,
						participant: { sid: p._id, identity: p.identity, disconnect_reason: RECONCILED },
						reconciler
					}
				});

				return { ...p, ...fields };
			}),
			egresses: roomEgresses.map((e) => closeEgress(e, at(e.startedAt), set, events, entityExpiry, ref)),
			ingressSessions: roomSessions.map((s) =>
				closeIngressSession(s, at(s.startedAt), set, events, entityExpiry, ref)
			)
		};

		closedSessions.push(...closed.ingressSessions);

		for (const t of tracks.filter((track) => track.unpublishedAt === undefined)) {
			const unpublishedAt = at(t.publishedAt);
			set(COLLECTIONS.tracks, t, {
				status: 'unpublished',
				unpublishedAt: new Date(unpublishedAt),
				durationMs: unpublishedAt - time(t.publishedAt),
				closedBy: 'reconciler',
				subscribers: { ...(t.subscribers as Fields), current: 0 },
				expiresAt: trackExpiry(unpublishedAt)
			});
		}

		for (const s of subscriptions.filter((sub) => sub.status === 'subscribed')) {
			const unsubscribedAt = at(s.subscribedAt);
			set(COLLECTIONS.trackSubscriptions, s, {
				status: 'unsubscribed',
				unsubscribedAt: new Date(unsubscribedAt),
				durationMs: unsubscribedAt - time(s.subscribedAt),
				closedBy: 'reconciler',
				expiresAt: trackExpiry(unsubscribedAt)
			});
		}

		const roomFields = {
			status: 'closed',
			endedAt: new Date(end),
			durationMs: end - time(room.createdAt),
			endReason: RECONCILED,
			closedBy: 'reconciler',
			lastEventAt: new Date(Math.max(end, time(room.lastEventAt) || 0)),
			participants: { ...(room.participants as Fields), active: 0 },
			egress: { ...(room.egress as Fields), active: 0 },
			ingress: { ...(room.ingress as Fields), active: 0 },
			expiresAt: entityExpiry(end)
		};
		set(COLLECTIONS.rooms, room, roomFields);
		events.push({
			_id: `AE_SYN_${room._id}`,
			type: 'ROOM_ENDED',
			ts: new Date(end),
			...ref,
			synthetic: true,
			payload: { room: roomMin, room_end_reason: RECONCILED, reconciler }
		});
		push(COLLECTIONS.nodes, {
			updateOne: { filter: { _id: String(room.nodeId) }, update: { $inc: { 'rooms.reconciled': 1 } } }
		});
		rollups[0].push(...counters(options, room, participants, roomEgresses, roomSessions));
		rollups[1].push(
			...counters(
				options,
				{ ...room, ...roomFields },
				closed.participants,
				closed.egresses,
				closed.ingressSessions
			)
		);
	}

	// What is open with no room in progress: web egresses and ingress sessions whose room is gone.
	const closedRooms = new Set(rooms.map((room) => room.name));
	const orphanRef = { nodeId: reconcilerNode };

	for (const e of egresses.filter((egress) => !rooms.some((room) => room._id === egress.roomSid))) {
		const end = Math.min(Math.max(time(e.updatedAt), time(e.startedAt)), heartbeat);
		const closed = closeEgress(e, Math.max(end, time(e.startedAt)), set, events, entityExpiry, {
			...orphanRef,
			...(e.roomSid === undefined ? {} : { roomSid: e.roomSid, roomName: e.roomName })
		});
		rollups[0].push(...counters(options, undefined, [], [e], []));
		rollups[1].push(...counters(options, undefined, [], [closed], []));
	}

	for (const s of sessions.filter((session) => !closedRooms.has(String(session.roomName)))) {
		const end = Math.min(time(s.startedAt), heartbeat);
		const closed = closeIngressSession(s, Math.max(end, time(s.startedAt)), set, events, entityExpiry, {
			...orphanRef,
			roomName: s.roomName
		});
		closedSessions.push(closed);
		rollups[0].push(...counters(options, undefined, [], [], [s]));
		rollups[1].push(...counters(options, undefined, [], [], [closed]));
	}

	await closeIngresses(db, closedSessions, push);

	for (const [name, ops] of writes) {
		await db.collection<Stored>(name).bulkWrite(ops, { ordered: false });
	}

	if (events.length > 0) {
		await db.collection(COLLECTIONS.events).insertMany(
			events.map((event) => toStored(COLLECTIONS.events, event)),
			{ ordered: false }
		);
	}

	await writeIncrements(db, rollups[0], rollups[1]);
}

type SetFn = (name: string, doc: Stored, fields: Document, unset?: string[]) => void;

/** An egress lost with its node: failed by the reconciler at `endedAt`, with its synthetic `EGRESS_ENDED`. */
function closeEgress(
	e: Stored,
	endedAt: number,
	set: SetFn,
	events: Document[],
	expiry: (end: number) => Date,
	ref: Document
): Stored {
	const end = new Date(endedAt);
	const fields = {
		status: 'failed',
		closedBy: 'reconciler',
		error: LOST_EGRESS_ERROR,
		endedAt: end,
		updatedAt: end,
		durationMs: endedAt - time(e.startedAt),
		statusHistory: [...((e.statusHistory as Fields[] | undefined) ?? []), { status: 'failed', at: end }],
		outputs: ((e.outputs as Fields[] | undefined) ?? []).map((output) => ({
			...output,
			...(output.startedAt === undefined
				? {}
				: { endedAt: end, durationMs: endedAt - time(output.startedAt as Date) }),
			...(output.kind === 'stream' ? { status: 'FAILED', error: LOST_EGRESS_ERROR } : {})
		})),
		expiresAt: expiry(endedAt)
	};
	set(COLLECTIONS.egresses, e, fields);
	events.push({
		_id: `AE_SYN_${e._id}`,
		type: 'EGRESS_ENDED',
		ts: end,
		...ref,
		egressId: e._id,
		synthetic: true,
		payload: {
			egress: {
				egress_id: e._id,
				...(e.roomSid === undefined ? {} : { room_id: e.roomSid }),
				...(e.roomName === undefined ? {} : { room_name: e.roomName }),
				status: 'EGRESS_FAILED',
				error: LOST_EGRESS_ERROR
			},
			reconciler: { reason: ROOM_CLOSED_NODE_DEAD }
		}
	});

	return { ...e, ...fields };
}

/** An ingress session lost with its node: in error at `endedAt`, with its synthetic `INGRESS_ENDED`. */
function closeIngressSession(
	s: Stored,
	endedAt: number,
	set: SetFn,
	events: Document[],
	expiry: (end: number) => Date,
	ref: Document
): Stored {
	const fields = {
		status: 'error',
		error: LOST_INGRESS_ERROR,
		closedBy: 'reconciler',
		endedAt: new Date(endedAt),
		durationMs: endedAt - time(s.startedAt),
		expiresAt: expiry(endedAt)
	};
	set(COLLECTIONS.ingressSessions, s, fields);
	events.push({
		_id: `AE_SYN_${s._id}`,
		type: 'INGRESS_ENDED',
		ts: new Date(endedAt),
		...ref,
		ingressId: s.ingressId,
		ingressSessionId: s._id,
		synthetic: true,
		payload: {
			ingress: {
				ingress_id: s.ingressId,
				room_name: s.roomName,
				state: {
					status: 'ENDPOINT_ERROR',
					error: LOST_INGRESS_ERROR,
					...(s.roomSid === undefined ? {} : { room_id: s.roomSid }),
					resource_id: s._id
				}
			},
			reconciler: { reason: ROOM_CLOSED_NODE_DEAD }
		}
	});

	return { ...s, ...fields };
}

/**
 * The ingresses of the sessions closed take the status and the error of their latest session, and add their
 * durations, as the writer derives them.
 */
async function closeIngresses(
	db: Db,
	closed: readonly Stored[],
	push: (name: string, op: LiveOp) => void
): Promise<void> {
	for (const ingressId of new Set(closed.map((s) => String(s.ingressId)))) {
		const ingress = await db.collection<Stored>(COLLECTIONS.ingresses).findOne({ _id: ingressId });

		if (ingress === null || ingress.status === 'deleted') {
			continue;
		}

		const duration = closed
			.filter((s) => s.ingressId === ingressId)
			.reduce((sum, s) => sum + Number(s.durationMs), 0);
		push(COLLECTIONS.ingresses, {
			updateOne: {
				filter: { _id: ingressId },
				update: {
					$set: { status: 'error', lastError: LOST_INGRESS_ERROR },
					...(duration === 0 ? {} : { $inc: { totalDurationMs: duration } })
				}
			}
		});
	}
}

/**
 * The rollup counters of a room's documents, or of documents with no room in progress, as the writer counts them:
 * the closures' increments are their difference after and before.
 */
function counters(
	options: GenerateOptions,
	room: Stored | undefined,
	participants: readonly Stored[],
	egresses: readonly Stored[],
	ingressSessions: readonly Stored[]
): RollupCounters[] {
	const nullable = (doc: Fields, fields: string[]): Fields =>
		Object.fromEntries([
			...Object.entries(doc),
			...fields.map((field): [string, unknown] => [field, doc[field] ?? null])
		]);
	const bundle = {
		room:
			room === undefined
				? { _id: 'none', createdAt: new Date(0), endedAt: null, participants: { sessions: 0 } }
				: nullable(room, ['endedAt', 'durationMs', 'endReason']),
		participants: participants.map((p) =>
			nullable(p, ['activeAt', 'leftAt', 'durationMs', 'disconnectReason', 'connectionType', 'connectTimeMs'])
		),
		tracks: [],
		subscriptions: [],
		egresses: egresses.map((e) => nullable(e, ['endedAt', 'durationMs'])),
		ingresses: [],
		ingressSessions: ingressSessions.map((s) => nullable(s, ['endedAt', 'durationMs'])),
		meanScores: new Map(),
		apiCalls: [],
		traffic: new Map()
	} as unknown as RoomBundle;
	const rollups = new Rollups({
		fiveMinute: options.rollups?.fiveMinute ?? false,
		nodes: options.rollups?.nodes ?? false,
		roomSums: options.rollups?.roomSums ?? false
	});

	rollups.add(bundle, {
		now: Number.POSITIVE_INFINITY,
		eventsFrom: 0,
		statsFrom: 0,
		fiveMinuteFrom: 0,
		statsMode: options.statsMode
	});

	return rollups.counters();
}

/** The `$inc` of the rollup documents by the difference of their counters after and before the closures. */
async function writeIncrements(db: Db, before: RollupCounters[], after: RollupCounters[]): Promise<void> {
	const key = (c: RollupCounters) => `${c.collection}|${c._id}`;
	const sum = (list: RollupCounters[]) => {
		const totals = new Map<string, RollupCounters>();

		for (const c of list) {
			const total = totals.get(key(c)) ?? { ...c, values: {}, marks: { ...c.marks } };

			for (const [path, value] of Object.entries(c.values)) {
				total.values[path] = (total.values[path] ?? 0) + value;
			}

			totals.set(key(c), total);
		}

		return totals;
	};
	const was = sum(before);
	const ops = new Map<string, LiveOp[]>();

	for (const [k, now] of sum(after)) {
		const op = liveRollupIncrement(now, was.get(k));

		if (op !== undefined) {
			ops.set(now.collection, [...(ops.get(now.collection) ?? []), op]);
		}
	}

	for (const [name, list] of ops) {
		await db.collection<Stored>(name).bulkWrite(list, { ordered: false });
	}
}

function time(at: unknown): number {
	return at instanceof Date ? at.getTime() : Number.NaN;
}
