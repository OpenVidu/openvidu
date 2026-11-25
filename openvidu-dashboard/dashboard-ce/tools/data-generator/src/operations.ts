import type { Server } from './generator.js';
import { hashRng } from './random.js';

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
/** Version of the servers the rolling operations start. */
const NEW_SERVER_VERSION = '3.10.1';
/** The media nodes that take turns, in order; `-7` stays silent as a retired machine. */
const ROTATION = [1, 2, 3, 4, 5, 6].map((n) => `media-node-10-0-0-${String(n)}`);
/** How far ahead of the rooms it draws the timeline is extended: beyond the end of any room's life. */
export const SCHEDULE_AHEAD = 12 * HOUR;
/** Key of the machine of a single-node deployment, which has no media node label. */
const SINGLE = 'single';

/** The minutes around a single-node restart, in which no room floor holds: none, then ramping up from `ramp`. */
export interface FloorWaiver {
	from: number;
	ramp: number;
	until: number;
}

/**
 * The rolling server operations from the generation instant (`start`), which extend the server timeline:
 * - with media nodes, at each even UTC hour the next machine in the order `-1` … `-6` that is reporting and in no other
 *   operation drains, stops 20 minutes later and has a new server 10 minutes after that; a stopped machine returns at
 *   its turn, 30 minutes after that hour. At 15:00 UTC the reporting machine after the last one drained is lost, and
 *   has a new server 6 hours later;
 * - at the start, a draining server stops 20 minutes later and its machine returns 10 minutes after that, a machine
 *   lost in the last 6 hours returns 6 hours after its loss, one lost longer ago stays silent;
 * - a single node drains at 04:00 UTC, stops at 04:02 and has a new server at 04:03.
 *
 * New servers run 3.10.1 with the engine and the heartbeat interval of the machine's previous server. Operations are
 * decided in time order, so the timeline does not depend on how far ahead it was extended.
 */
export class ServerSchedule {
	private until: number;
	private pointer = 0;
	private readonly awaitingTurn = new Set<string>();
	private readonly waivers: FloorWaiver[] = [];

	constructor(
		private readonly servers: Server[],
		private readonly start: number,
		private readonly seed: number,
		private readonly mediaNodes: boolean
	) {
		this.until = start;

		for (const machine of new Set(servers.map(machineOf))) {
			const current = this.latest(machine);

			if (current === undefined) {
				continue;
			}

			if (current.end === undefined && current.drainingAt !== undefined && current.drainingAt <= start) {
				current.end = { at: start + 20 * MINUTE, stopped: true };
				this.spawn(machine, start + 30 * MINUTE);
			} else if (current.end?.stopped === true && current.end.at <= start) {
				this.awaitingTurn.add(machine);
			} else if (current.end !== undefined && current.end.at <= start && start - current.end.at < 6 * HOUR) {
				this.spawn(machine, current.end.at + 6 * HOUR);
			}
		}
	}

	/** Decides the operations up to `until`. */
	extend(until: number): void {
		// Decisions fall on the hour with media nodes, at 04:00 UTC on a single node.
		const step = this.mediaNodes ? HOUR : DAY;
		const offset = this.mediaNodes ? 0 : 4 * HOUR;

		for (let at = Math.floor((this.until - offset) / step) * step + offset; at <= until; at += step) {
			if (at <= this.until) {
				continue;
			}

			const hour = new Date(at).getUTCHours();

			if (!this.mediaNodes) {
				this.restartSingle(at);
			} else if (hour % 2 === 0) {
				this.rotate(at);
			} else if (hour === 15) {
				this.lose(at);
			}
		}

		this.until = Math.max(this.until, until);
	}

	/** The minutes around each single-node restart decided so far. */
	floorWaivers(): readonly FloorWaiver[] {
		return this.waivers;
	}

	private rotate(at: number): void {
		for (let k = 0; k < ROTATION.length; k += 1) {
			const index = (this.pointer + k) % ROTATION.length;
			const machine = ROTATION[index] ?? '';

			if (this.awaitingTurn.delete(machine)) {
				this.spawn(machine, at + 30 * MINUTE);
			} else if (this.free(machine, at)) {
				this.drain(machine, at, 20 * MINUTE, 30 * MINUTE);
			} else {
				continue;
			}

			this.pointer = index + 1;

			return;
		}
	}

	private lose(at: number): void {
		for (let k = 0; k < ROTATION.length; k += 1) {
			const machine = ROTATION[(this.pointer + k) % ROTATION.length] ?? '';
			const current = this.latest(machine);

			if (current !== undefined && this.free(machine, at)) {
				current.end = { at, stopped: false };
				this.spawn(machine, at + 6 * HOUR);

				return;
			}
		}
	}

	/** The single node's daily restart. */
	private restartSingle(at: number): void {
		if (!this.free(SINGLE, at)) {
			return;
		}

		this.drain(SINGLE, at, 2 * MINUTE, 3 * MINUTE);
		this.waivers.push({ from: at, ramp: at + 3 * MINUTE, until: at + 13 * MINUTE });
	}

	private drain(machine: string, at: number, stopAfter: number, returnAfter: number): void {
		const current = this.latest(machine);

		if (current !== undefined) {
			current.drainingAt = at;
			current.end = { at: at + stopAfter, stopped: true };
			this.spawn(machine, at + returnAfter);
		}
	}

	/** A new server of `machine` from `at`, like its previous one. */
	private spawn(machine: string, at: number): void {
		const previous = this.latest(machine);

		if (previous === undefined) {
			return;
		}

		this.servers.push({
			nodeId: hashRng(`${String(this.seed)}|${String(this.start)}|${machine}|${String(at)}`).id('ND_', 8),
			...(previous.mediaNode === undefined ? {} : { mediaNode: previous.mediaNode }),
			firstSeenAt: at,
			rtcEngine: previous.rtcEngine,
			serverVersion: NEW_SERVER_VERSION,
			mediaStats: true,
			batchIntervalMs: previous.batchIntervalMs
		});
	}

	/** Whether a machine reports at `at` and is in no operation: no drain, no server to come. */
	private free(machine: string, at: number): boolean {
		const current = this.latest(machine);

		return (
			current !== undefined &&
			!this.awaitingTurn.has(machine) &&
			current.firstSeenAt <= at &&
			(current.end === undefined || at < current.end.at) &&
			(current.drainingAt === undefined || at < current.drainingAt)
		);
	}

	/** The latest server of a machine, started or to come. */
	private latest(machine: string): Server | undefined {
		return this.servers.filter((server) => machineOf(server) === machine).at(-1);
	}
}

function machineOf(server: Server): string {
	return server.mediaNode ?? SINGLE;
}

/** The `nodes` document of a server as it stands at `at`, without its room counters. */
export function nodeState(server: Server, at: number): Record<string, unknown> {
	const ended = server.end !== undefined && server.end.at <= at;
	const beats = Math.floor((at - server.firstSeenAt) / server.batchIntervalMs);

	return {
		_id: server.nodeId,
		firstSeenAt: new Date(server.firstSeenAt),
		lastSeenAt: new Date(ended ? (server.end?.at ?? at) : server.firstSeenAt + beats * server.batchIntervalMs),
		serverVersion: server.serverVersion,
		batchIntervalMs: server.batchIntervalMs,
		mediaStats: server.mediaStats,
		rtcEngine: server.rtcEngine,
		...(server.mediaNode === undefined
			? {}
			: { mediaNode: server.mediaNode, ip: server.mediaNode.replace('media-node-', '').replaceAll('-', '.') }),
		...(server.drainingAt === undefined || server.drainingAt > at
			? {}
			: { drainingAt: new Date(server.drainingAt) }),
		...(ended && server.end?.stopped === true ? { stoppedAt: new Date(server.end.at) } : {})
	};
}
