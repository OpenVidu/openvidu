export const enum EntityType {
    ROOM = "room",
    PARTICIPANT = "participant"
}

export interface ActiveEntity {
    _id: string;
    entity: EntityType;
}
