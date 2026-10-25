import { Db, Document, Filter, MongoClient } from "mongodb";
import { Collection } from "./types";

const DATABASE_URL =
    "mongodb://mongoadmin:mongoadmin@localhost:27017/?replicaSet=rs0&readPreference=primaryPreferred&directConnection=true";
const DATABASE_NAME = "openvidu";

/** Statuses of the entities that are still open, per collection. */
const OPEN_STATUSES: Partial<Record<Collection, string[]>> = {
    [Collection.ROOMS]: ["active"],
    [Collection.PARTICIPANTS]: ["active", "joining"],
    [Collection.TRACKS]: ["published"],
    [Collection.TRACK_SUBSCRIPTIONS]: ["requested", "subscribed"]
};

/** A document of the analytics data model, whose ids are strings. */
export interface AnalyticsDocument extends Document {
    _id: string;
}

/** A query on documents whose ids are strings. */
export type Query = Filter<AnalyticsDocument>;

export class MongoService {
    private static instance: MongoService;
    private client: MongoClient;
    private db: Db;

    private constructor() {
        this.client = new MongoClient(DATABASE_URL, { serverSelectionTimeoutMS: 30000 });
        this.db = this.client.db(DATABASE_NAME);
    }

    public static getInstance(): MongoService {
        if (!MongoService.instance) {
            MongoService.instance = new MongoService();
        }

        return MongoService.instance;
    }

    public async disconnect(): Promise<void> {
        await this.client.close();
    }

    public database(): Db {
        return this.db;
    }

    public async findEntity(collection: Collection, filter: Query): Promise<AnalyticsDocument | null> {
        return this.db.collection<AnalyticsDocument>(collection).findOne(filter);
    }

    public async findEntities(collection: Collection, filter: Query): Promise<AnalyticsDocument[]> {
        return this.db
            .collection<AnalyticsDocument>(collection)
            .find(filter)
            .toArray();
    }

    public async count(collection: Collection, filter: Query): Promise<number> {
        return this.db.collection<AnalyticsDocument>(collection).countDocuments(filter);
    }

    /** Documents of the collection matching the filter that are still open. */
    public async countOpen(collection: Collection, filter: Query): Promise<number> {
        return this.count(collection, { ...filter, status: { $in: OPEN_STATUSES[collection] ?? [] } });
    }

    public async findEvents(filter: Query): Promise<Document[]> {
        return this.db.collection<AnalyticsDocument>(Collection.EVENTS).find(filter).sort({ ts: 1 }).toArray();
    }

    /** The synthetic close event the reconciler inserted for an entity. */
    public async findSyntheticEvent(entityId: string): Promise<Document | null> {
        return this.db.collection<AnalyticsDocument>(Collection.EVENTS).findOne({ _id: `AE_SYN_${entityId}`, synthetic: true });
    }

    public async schemaMeta(id: string): Promise<Document | null> {
        return this.db.collection<AnalyticsDocument>(Collection.SCHEMA_META).findOne({ _id: id });
    }

    public async collectionNames(): Promise<string[]> {
        return (await this.db.listCollections({}, { nameOnly: true }).toArray()).map((info) => info.name);
    }
}
