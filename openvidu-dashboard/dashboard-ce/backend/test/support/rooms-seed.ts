import { createCollections } from '@openvidu-dashboard/data-generator/schema';
import type { Db, Document } from 'mongodb';

import {
	Collection,
	type EgressDocument,
	type EventDocument,
	type HourlyRollupDocument,
	type IngressSessionDocument,
	type ParticipantDocument,
	type RoomDocument,
	type TrackDocument,
	type TrackStatsDocument,
	type TrackSubscriptionDocument
} from '@openvidu-dashboard/typings';

import { loadFixture } from './fixtures.js';

const YEAR_SECONDS = 365 * 86_400;
const MINUTE = 60_000;

/** Contract collections and indexes; TTLs far enough that the TTL monitor never removes seeded documents. */
export async function createContractCollections(db: Db): Promise<void> {
	await createCollections(db, {
		timeseries: true,
		retention: {
			events: YEAR_SECONDS,
			stats: YEAR_SECONDS,
			tracks: YEAR_SECONDS,
			entities: YEAR_SECONDS,
			rollups5Min: YEAR_SECONDS,
			rollupsHourly: YEAR_SECONDS
		}
	});
}

const SEEDED: readonly Collection[] = [
	Collection.ROOMS,
	Collection.PARTICIPANTS,
	Collection.TRACKS,
	Collection.TRACK_SUBSCRIPTIONS,
	Collection.EGRESSES,
	Collection.INGRESS_SESSIONS,
	Collection.EVENTS,
	Collection.TRACK_STATS,
	Collection.ANALYTICS_HOURLY
];

export interface Seed {
	rooms?: RoomDocument[];
	participants?: ParticipantDocument[];
	tracks?: TrackDocument[];
	subscriptions?: TrackSubscriptionDocument[];
	egresses?: EgressDocument[];
	ingressSessions?: IngressSessionDocument[];
	events?: EventDocument[];
	trackStats?: TrackStatsDocument[];
	hourly?: HourlyRollupDocument[];
}

/** Empties the seeded collections and inserts `seed`. */
export async function reseed(db: Db, seed: Seed): Promise<void> {
	for (const collection of SEEDED) {
		await db.collection(collection).deleteMany({});
	}

	const inserts: [Collection, Document[] | undefined][] = [
		[Collection.ROOMS, seed.rooms],
		[Collection.PARTICIPANTS, seed.participants],
		[Collection.TRACKS, seed.tracks],
		[Collection.TRACK_SUBSCRIPTIONS, seed.subscriptions],
		[Collection.EGRESSES, seed.egresses],
		[Collection.INGRESS_SESSIONS, seed.ingressSessions],
		[Collection.EVENTS, seed.events],
		[Collection.TRACK_STATS, seed.trackStats],
		[Collection.ANALYTICS_HOURLY, seed.hourly]
	];

	for (const [collection, documents] of inserts) {
		if (documents !== undefined && documents.length > 0) {
			await db.collection(collection).insertMany(documents);
		}
	}
}

function template<T extends Document>(collection: Collection, pick: (doc: T) => boolean): T {
	const found = loadFixture<T>(collection).find(pick);

	if (found === undefined) {
		throw new Error(`no ${collection} fixture matches`);
	}

	return structuredClone(found);
}

export function minutesAgo(minutes: number, now = Date.now()): Date {
	return new Date(now - minutes * MINUTE);
}

type RoomInput = Partial<RoomDocument> & { _id: string; createdAt: Date };

/** A closed room shaped like the contract fixture; ends 30 minutes after creation unless `endedAt` is given. */
export function closedRoom(input: RoomInput): RoomDocument {
	const base = template<RoomDocument>(Collection.ROOMS, (room) => room.status === 'closed');
	const name = input.name ?? input._id;
	const endedAt = input.endedAt ?? new Date(input.createdAt.getTime() + 30 * MINUTE);

	return {
		...base,
		name,
		nameLower: name.toLowerCase(),
		endedAt,
		durationMs: endedAt.getTime() - input.createdAt.getTime(),
		lastEventAt: endedAt,
		lastStatsAt: endedAt,
		expiresAt: new Date(endedAt.getTime() + YEAR_SECONDS * 1000),
		...input
	};
}

/** An active room shaped like the contract fixture. */
export function activeRoom(input: RoomInput): RoomDocument {
	const {
		endedAt: _endedAt,
		durationMs: _durationMs,
		endReason: _endReason,
		closedBy: _closedBy,
		...base
	} = template<RoomDocument>(Collection.ROOMS, (room) => room.status === 'active');
	const name = input.name ?? input._id;

	return {
		...base,
		name,
		nameLower: name.toLowerCase(),
		lastEventAt: input.createdAt,
		expiresAt: null,
		...input
	};
}

type ParticipantInput = Partial<ParticipantDocument> & {
	_id: string;
	identity: string;
	roomSid: string;
	joinedAt: Date;
};

/** A participant session shaped like the contract fixture; active unless `leftAt` is given. */
export function participant(input: ParticipantInput): ParticipantDocument {
	const {
		leftAt: _leftAt,
		durationMs: _durationMs,
		disconnectReason: _reason,
		...base
	} = template<ParticipantDocument>(Collection.PARTICIPANTS, (doc) => doc.identity === 'alice');
	const left = input.leftAt !== undefined;

	return {
		...base,
		identityLower: input.identity.toLowerCase(),
		kind: 'STANDARD',
		status: left ? 'left' : 'active',
		...(left && input.leftAt ? { durationMs: input.leftAt.getTime() - input.joinedAt.getTime() } : {}),
		expiresAt: left ? new Date(Date.now() + YEAR_SECONDS * 1000) : null,
		...input
	};
}

type TrackInput = Partial<TrackDocument> & Pick<TrackDocument, '_id' | 'participantSid' | 'publishedAt'>;

/** A published track shaped like the contract fixture (the camera of alice); override the source for audio. */
export function track(input: TrackInput): TrackDocument {
	return {
		...template<TrackDocument>(Collection.TRACKS, (doc) => doc.source === 'CAMERA'),
		status: 'published',
		expiresAt: null,
		...input
	};
}

type SubscriptionInput = Partial<TrackSubscriptionDocument> &
	Pick<TrackSubscriptionDocument, 'trackSid' | 'subscriberSid'>;

/** A subscription shaped like the contract fixture; `_id` is `<trackSid>:<subscriberSid>`. */
export function subscription(input: SubscriptionInput): TrackSubscriptionDocument {
	return {
		...template<TrackSubscriptionDocument>(Collection.TRACK_SUBSCRIPTIONS, (doc) => doc.status === 'unsubscribed'),
		_id: `${input.trackSid}:${input.subscriberSid}`,
		...input
	};
}

type EgressInput = Partial<EgressDocument> & { _id: string; roomSid: string; startedAt: Date };

export function egress(input: EgressInput): EgressDocument {
	return { ...template<EgressDocument>(Collection.EGRESSES, (doc) => doc.type === 'room_composite'), ...input };
}

type IngressSessionInput = Partial<IngressSessionDocument> & { _id: string; roomSid: string; startedAt: Date };

export function ingressSession(input: IngressSessionInput): IngressSessionDocument {
	return { ...template<IngressSessionDocument>(Collection.INGRESS_SESSIONS, () => true), ...input };
}

type EventInput = Partial<EventDocument> & Pick<EventDocument, '_id' | 'type' | 'ts'>;

export function event(input: EventInput): EventDocument {
	return { nodeId: 'ND_test', synthetic: false, payload: { note: input._id }, ...input };
}

export function trackStat(
	input: Pick<TrackStatsDocument, 'ts' | 'meta'> & Partial<TrackStatsDocument>
): TrackStatsDocument {
	return {
		score: 4,
		minScore: 3.5,
		medianScore: 4,
		bytes: 1_000,
		packets: 10,
		packetsLost: 0,
		rttMs: 20,
		jitterMs: 5,
		nacks: 0,
		plis: 0,
		firs: 0,
		frames: 0,
		layers: [],
		...input
	};
}

/** A global hourly rollup with the room and participant counters the rooms summary sums. */
export function globalHourly(
	bucket: Date,
	rooms: number,
	participants: number,
	scope = 'global'
): HourlyRollupDocument {
	return {
		_id: `${scope}:${bucket.toISOString().replace('.000Z', 'Z')}`,
		scope,
		bucket,
		rooms: { created: rooms },
		participants: { joined: participants }
	};
}
