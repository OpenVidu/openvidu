import { Collection, Db, Document, MongoClient, WithId } from "mongodb";
import { ActiveEntity, EntityType } from "./types";

const DATABASE_URL =
    "mongodb://mongoadmin:mongoadmin@localhost:27017/?replicaSet=rs0&readPreference=primaryPreferred&directConnection=true";
const DATABASE_NAME = "openvidu";
const EVENTS_COLLECTION = "events";
const ACTIVE_ENTITIES_COLLECTION = "active-entities";

const entityStartEventTypesMap: Map<EntityType, string> = new Map([
    [EntityType.ROOM, "ROOM_CREATED"],
    [EntityType.PARTICIPANT, "PARTICIPANT_ACTIVE"]
]);
const entityCloseEventTypesMap: Map<EntityType, string> = new Map([
    [EntityType.ROOM, "ROOM_ENDED"],
    [EntityType.PARTICIPANT, "PARTICIPANT_LEFT"]
]);
const entityIdFieldMap: Map<EntityType, string> = new Map([
    [EntityType.ROOM, "room.sid"],
    [EntityType.PARTICIPANT, "participant.sid"]
]);
const entityNameFieldMap: Map<EntityType, string> = new Map([
    [EntityType.ROOM, "room.name"],
    [EntityType.PARTICIPANT, "participant.identity"]
]);

export class MongoService {
    private static instace: MongoService;
    private client: MongoClient;
    private db: Db;
    private eventsCollection: Collection;
    private activeEntitiesCollection: Collection<ActiveEntity>;

    private constructor() {
        this.client = new MongoClient(DATABASE_URL);
        this.db = this.client.db(DATABASE_NAME);
        this.eventsCollection = this.db.collection(EVENTS_COLLECTION);
        this.activeEntitiesCollection = this.db.collection(ACTIVE_ENTITIES_COLLECTION);
    }

    public static getInstance(): MongoService {
        if (!MongoService.instace) {
            MongoService.instace = new MongoService();
        }

        return MongoService.instace;
    }

    public async connect(): Promise<void> {
        try {
            await this.client.connect();
        } catch (error) {
            console.error("Error connecting to MongoDB", error);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        try {
            await this.client.close();
        } catch (error) {
            console.error("Error disconnecting from MongoDB", error);
            throw error;
        }
    }

    public async findStartEvent(entityType: EntityType, entityName: string): Promise<WithId<Document> | null> {
        try {
            const eventType = entityStartEventTypesMap.get(entityType)!;
            const nameField = entityNameFieldMap.get(entityType)!;
            return await this.eventsCollection.findOne({ type: eventType, [nameField]: entityName });
        } catch (error) {
            console.error("Error finding start event", error);
            throw error;
        }
    }

    public async findCloseEvent(entityType: EntityType, entityId: string): Promise<WithId<Document> | null> {
        try {
            const eventType = entityCloseEventTypesMap.get(entityType)!;
            const idField = entityIdFieldMap.get(entityType)!;
            return await this.eventsCollection.findOne({ type: eventType, [idField]: entityId });
        } catch (error) {
            console.error("Error finding close event", error);
            throw error;
        }
    }

    public async isActiveEntity(id: string): Promise<boolean> {
        try {
            const result = await this.activeEntitiesCollection.findOne({ _id: id });
            return !!result;
        } catch (error) {
            console.error("Error finding active entity", error);
            throw error;
        }
    }
}
