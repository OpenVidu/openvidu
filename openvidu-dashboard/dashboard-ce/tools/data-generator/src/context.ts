import type { Collection, Db, Document } from 'mongodb';
import { COLLECTIONS, type CollectionName } from './schema.js';

/** Every entity document is keyed by a string identifier, never an ObjectId. */
export interface EntityDoc extends Document {
	_id: string;
}

export function entityCollection(db: Db, name: CollectionName): Collection<EntityDoc> {
	return db.collection<EntityDoc>(name);
}

export interface TimeRange {
	from: Date;
	to: Date;
}

/** Identifiers taken from the generated data so that every query hits existing documents. */
export interface Samples {
	roomSid: string;
	/** Keyset cursor of the closed-rooms list: the room after the first page. */
	cursorRoom: { createdAt: Date; _id: string };
	participantSid: string;
	identityLower: string;
	identityPrefix: string;
	namePrefix: string;
	trackSid: string;
	egressId: string;
	ingressId: string;
	nodeId: string;
}

export interface QueryContext {
	db: Db;
	/** Whole data range. */
	range: TimeRange;
	/** Range of at most 24 h, for minute-granularity analytics. */
	shortRange: TimeRange;
	samples: Samples;
}

const PAGE = 50;
const DAY = 86_400_000;

/** Builds a query context from the generated data: the whole data range and sample identifiers. */
export async function queryContext(db: Db): Promise<QueryContext> {
	const rooms = entityCollection(db, COLLECTIONS.rooms);
	const first = await rooms.find({}).sort({ createdAt: 1, _id: 1 }).limit(1).next();
	const last = await rooms.find({}).sort({ createdAt: -1, _id: -1 }).limit(1).next();
	const biggest = await rooms.find({}).sort({ 'participants.sessions': -1 }).limit(1).next();
	const cursorRoom = await rooms
		.find({ status: 'closed' })
		.sort({ createdAt: -1, _id: -1 })
		.skip(PAGE)
		.limit(1)
		.next();

	if (first === null || last === null || biggest === null) {
		throw new Error('The database has no rooms; run the generator first');
	}

	const to = new Date(Math.max(Date.now(), (last.createdAt as Date).getTime() + 1));
	const range = { from: first.createdAt as Date, to };
	const roomSid = biggest._id;
	const participant = await entityCollection(db, COLLECTIONS.participants)
		.find({ roomSid, kind: 'STANDARD', status: { $ne: 'aborted' } })
		.sort({ 'tracks.subscribed': -1 })
		.limit(1)
		.next();
	const participantSid = participant?._id ?? 'PA_none';
	const identityLower = (participant?.identityLower as string | undefined) ?? 'none';
	const track = await entityCollection(db, COLLECTIONS.tracks).findOne({ participantSid });
	const egress = await entityCollection(db, COLLECTIONS.egresses).findOne({});
	const ingress = await entityCollection(db, COLLECTIONS.ingresses).findOne({});
	const node = await entityCollection(db, COLLECTIONS.nodes).findOne({});
	const name = biggest.name as string;

	return {
		db,
		range,
		shortRange: { from: new Date(to.getTime() - DAY), to },
		samples: {
			roomSid,
			cursorRoom: {
				createdAt: (cursorRoom?.createdAt as Date | undefined) ?? range.to,
				_id: cursorRoom?._id ?? roomSid
			},
			participantSid,
			identityLower,
			identityPrefix: identityLower.slice(0, identityLower.search(/\d/) + 1 || 3),
			namePrefix: name.slice(0, Math.max(3, name.length - 1)),
			trackSid: track?._id ?? 'TR_none',
			egressId: egress?._id ?? 'EG_none',
			ingressId: ingress?._id ?? 'IN_none',
			nodeId: node?._id ?? 'ND_none'
		}
	};
}
