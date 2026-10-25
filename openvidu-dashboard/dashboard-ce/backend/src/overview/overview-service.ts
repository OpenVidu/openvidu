import { createHash } from 'node:crypto';

import type { Db } from 'mongodb';

import {
	freshnessWindows,
	type NodeDocument,
	type OverviewLive,
	type OverviewRecentRoom,
	type OverviewResponse,
	type OverviewToday,
	ParticipantKind,
	type RoomDocument
} from '@openvidu-dashboard/typings';

import type { Counters } from '../analytics/analytics-catalogue.js';
import { iso } from '../api/mapping.js';
import { staleFlag, writerBatchInterval } from '../status/freshness.js';
import { compact } from '../util/compact.js';
import { OverviewRepository, type ParticipantGroup, type RoomGroup } from './overview-repository.js';
import { todayWindow } from './overview-window.js';

/** What an {@link OverviewExtension} folds: the node documents, the active groups and the database clock. */
export interface OverviewInputs {
	nodes: readonly NodeDocument[];
	roomGroups: readonly RoomGroup[];
	participantGroups: readonly ParticipantGroup[];
	now: Date;
}

/** Extra fields of the overview body, merged before its `ETag` is computed; the PRO edition adds the nodes. */
export type OverviewExtension = (inputs: OverviewInputs) => Readonly<Record<string, unknown>>;

export interface OverviewServiceOptions {
	/** Dashboard clock, used only when MongoDB does not report its own. */
	now: () => Date;
	extension: OverviewExtension;
}

/** An overview body and its weak validator. */
export interface OverviewResult {
	body: OverviewResponse;
	etag: string;
}

export function foldLive(
	roomGroups: readonly RoomGroup[],
	participantGroups: readonly ParticipantGroup[],
	egresses: number,
	ingressSessions: number,
	staleMs: number
): OverviewLive {
	const byKind = Object.fromEntries(Object.values(ParticipantKind).map((kind) => [kind, 0])) as Record<
		ParticipantKind,
		number
	>;
	let participants = 0;
	let services = 0;
	let publishers = 0;
	let staleParticipants = 0;

	for (const group of participantGroups) {
		// A kind newer than this dashboard counts as a service but has no entry of its own.
		if (Object.hasOwn(byKind, group._id.kind)) {
			byKind[group._id.kind] += group.count;
		}

		staleParticipants += group.stale;

		if (group._id.kind === ParticipantKind.STANDARD) {
			participants += group.count;
			publishers += group.publishers;
		} else {
			services += group.count;
		}
	}

	return {
		rooms: roomGroups.reduce((sum, group) => sum + group.rooms, 0),
		participants,
		services,
		participantsByKind: byKind,
		publishers,
		egresses,
		ingressSessions,
		stale: {
			rooms: roomGroups.reduce((sum, group) => sum + group.stale, 0),
			participants: staleParticipants,
			olderThanMs: staleMs
		}
	};
}

export function toRecentRoom(doc: RoomDocument, staleMs: number, now: Date): OverviewRecentRoom {
	return compact<OverviewRecentRoom>({
		sid: doc._id,
		name: doc.name,
		status: doc.status,
		createdAt: doc.createdAt.toISOString(),
		endedAt: iso(doc.endedAt),
		durationMs: doc.durationMs,
		closedBy: doc.closedBy,
		participants: {
			active: doc.participants.active,
			sessions: doc.participants.sessions,
			unique: doc.participants.unique
		},
		nodeId: doc.nodeId,
		lastStatsAt: iso(doc.lastStatsAt),
		stale: staleFlag(doc.status, doc.lastStatsAt, staleMs, now)
	});
}

function today(counters: Counters, tz: string, since: Date, approximate: boolean): OverviewToday {
	const value = (path: string) => counters.get(path) ?? 0;

	return {
		tz,
		since: since.toISOString(),
		rooms: value('rooms.created'),
		participantSessions: value('participants.joined'),
		participantMinutes: Math.round(value('participants.minutes')),
		egresses: value('egress.started'),
		ingressSessions: value('ingress.sessionsStarted'),
		approximate
	};
}

/** `W/"<sha1>"` of the body without `generatedAt`: unchanged while nothing the page shows changes. */
export function overviewEtag(body: OverviewResponse): string {
	const { generatedAt: _generatedAt, ...rest } = body;

	return `W/"${createHash('sha1').update(JSON.stringify(rest)).digest('base64url')}"`;
}

/** The overview: live counters, today's rollups, recent rooms and the fields of the extension. */
export class OverviewService {
	private readonly repository: OverviewRepository;

	constructor(
		db: Db,
		private readonly options: OverviewServiceOptions
	) {
		this.repository = new OverviewRepository(db);
	}

	async overview(tz: string): Promise<OverviewResult> {
		const [now, nodes] = await Promise.all([this.repository.now(this.options.now()), this.repository.nodes()]);
		const { staleMs } = freshnessWindows(writerBatchInterval(nodes, now));
		const threshold = new Date(now.getTime() - staleMs);
		const window = todayWindow(now, tz);
		const [roomGroups, participantGroups, egresses, ingressSessions, recent, counters] = await Promise.all([
			this.repository.roomGroups(threshold),
			this.repository.participantGroups(threshold),
			this.repository.inFlightEgresses(),
			this.repository.publishingIngressSessions(),
			this.repository.recentRooms(),
			this.repository.today(window.from, now)
		]);
		const body: OverviewResponse = {
			generatedAt: now.toISOString(),
			live: foldLive(roomGroups, participantGroups, egresses, ingressSessions, staleMs),
			today: today(counters, tz, window.since, window.approximate),
			recentRooms: recent.map((room) => toRecentRoom(room, staleMs, now)),
			...this.options.extension({ nodes, roomGroups, participantGroups, now })
		};

		return { body, etag: overviewEtag(body) };
	}
}
