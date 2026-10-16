import { Document, Double } from "mongodb";

export const LEGACY_ROOM_SID = "RM_LegacyRoom0001";
export const LEGACY_ROOM_NAME = "legacy-room";
export const LEGACY_NODE_ID = "ND_LegacyNode001";
export const LEGACY_PARTICIPANTS = [
    { sid: "PA_LegacyAlice001", identity: "legacy-alice", joined: 60, left: 1_260 },
    { sid: "PA_LegacyBob00001", identity: "legacy-bob", joined: 120, left: 1_800 }
];

/** A legacy analytics event as the writer before 3.10 stored it: numbers as doubles, timestamps in seconds. */
function legacyEvent(id: string, type: string, seconds: number, fields: Document): Document {
    return {
        _id: id,
        id: `AE_${id}`,
        type,
        timestamp: { seconds: new Double(seconds), nanos: new Double(0) },
        room_id: LEGACY_ROOM_SID,
        node_id: LEGACY_NODE_ID,
        openvidu_expire_at: new Date((seconds + 32 * 86_400) * 1000),
        ...fields
    };
}

/** One room of two participants that ended an hour ago, in the legacy shape. */
export function legacyRoom(start: number): Document[] {
    const room = {
        sid: LEGACY_ROOM_SID,
        name: LEGACY_ROOM_NAME,
        empty_timeout: new Double(300),
        departure_timeout: new Double(20),
        creation_time: new Double(start),
        creation_time_ms: new Double(start * 1000),
        turn_password: "legacy-turn-password"
    };
    const participant = (p: (typeof LEGACY_PARTICIPANTS)[number], state: string) => ({
        sid: p.sid,
        identity: p.identity,
        state,
        joined_at: new Double(start + p.joined),
        joined_at_ms: new Double((start + p.joined) * 1000),
        permission: { can_publish: true, can_subscribe: true, can_publish_data: true }
    });
    const events = [legacyEvent("legacy-room-created", "ROOM_CREATED", start, { room })];

    for (const p of LEGACY_PARTICIPANTS) {
        events.push(
            legacyEvent(`${p.sid}-joined`, "PARTICIPANT_JOINED", start + p.joined, {
                room,
                participant_id: p.sid,
                participant: participant(p, "JOINED"),
                client_info: { sdk: "JS", os: "linux", version: "2.15.0" }
            }),
            legacyEvent(`${p.sid}-active`, "PARTICIPANT_ACTIVE", start + p.joined + 1, {
                room,
                participant_id: p.sid,
                participant: participant(p, "ACTIVE"),
                client_meta: { client_connect_time: new Double(800), connection_type: "udp" }
            }),
            legacyEvent(`${p.sid}-left`, "PARTICIPANT_LEFT", start + p.left, {
                room,
                participant_id: p.sid,
                participant: { ...participant(p, "DISCONNECTED"), disconnect_reason: new Double(1) }
            })
        );
    }

    events.push(legacyEvent("legacy-room-ended", "ROOM_ENDED", start + 1_820, { room_end_reason: new Double(2) }));

    return events;
}
