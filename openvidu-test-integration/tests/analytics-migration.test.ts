import { Int32, Long } from "mongodb";
import { waitFor } from "./utils/helper";
import { legacyRoom, LEGACY_PARTICIPANTS, LEGACY_ROOM_NAME, LEGACY_ROOM_SID } from "./utils/legacy";
import { LocalDeployment } from "./utils/local-deployment";
import { MongoService } from "./utils/mongodb";
import { Collection } from "./utils/types";

/**
 * The first start of the OpenVidu server on a database of a previous version renames the legacy events to
 * `legacy_events` and migrates them, and the legacy statistics, to the analytics data model in the background.
 */
describe("OpenVidu analytics legacy migration", () => {
    const mongo = MongoService.getInstance();

    beforeEach(async () => {
        await LocalDeployment.start();
    }, 120000);

    afterEach(() => {
        LocalDeployment.stop();
    }, 120000);

    afterAll(async () => {
        await mongo.disconnect();
    });

    it("migrates the analytics data of a previous version at the first start", async () => {
        const start = Math.floor(Date.now() / 1000) - 3 * 3_600;

        LocalDeployment.stopContainer("openvidu");
        await mongo.database().dropDatabase();
        await mongo.database().collection("events").insertMany(legacyRoom(start));
        await mongo
            .database()
            .collection("last_alive")
            .insertOne({ _id: "server" as never, last_alive: { seconds: Long.fromNumber(start), nanos: new Int32(0) } });
        const since = new Date();
        LocalDeployment.startContainer("openvidu");
        await LocalDeployment.waitForAnalytics(since);

        await waitFor(
            async () => (await mongo.schemaMeta("migration"))?.state === "completed",
            180,
            "the legacy migration to complete"
        );

        const collections = await mongo.collectionNames();
        expect(collections).toContain(Collection.LEGACY_EVENTS);
        expect(collections).not.toContain("active_entities");
        expect(collections).not.toContain("last_alive");

        const room = await mongo.findEntity(Collection.ROOMS, { _id: LEGACY_ROOM_SID });
        expect(room).toMatchObject({ name: LEGACY_ROOM_NAME, status: "closed", closedBy: "event", endReason: "IDLE_TIMEOUT" });
        expect((room!.createdAt as Date).getTime()).toBe(start * 1000);
        expect((room!.endedAt as Date).getTime()).toBe((start + 1_820) * 1000);
        expect(room!.participants).toMatchObject({ sessions: 2, unique: 2, active: 0 });

        for (const p of LEGACY_PARTICIPANTS) {
            const participant = await mongo.findEntity(Collection.PARTICIPANTS, { _id: p.sid });
            expect(participant).toMatchObject({
                identity: p.identity,
                roomSid: LEGACY_ROOM_SID,
                status: "left",
                closedBy: "event",
                disconnectReason: "CLIENT_INITIATED"
            });
            expect(participant!.durationMs).toBe((p.left - p.joined) * 1000);
        }

        const events = await mongo.findEvents({ roomSid: LEGACY_ROOM_SID });
        expect(events.map((event) => event.type)).toEqual(
            expect.arrayContaining(["ROOM_CREATED", "PARTICIPANT_JOINED", "PARTICIPANT_LEFT", "ROOM_ENDED"])
        );
        expect(JSON.stringify(events)).not.toContain("legacy-turn-password");
        expect(await mongo.schemaMeta("migration")).toMatchObject({ processed: 8, total: 8 });
    }, 600000);
});
