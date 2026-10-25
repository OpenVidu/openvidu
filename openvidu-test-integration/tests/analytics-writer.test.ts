import { killProcess, waitFor } from "./utils/helper";
import { Livekit } from "./utils/livekit";
import { LocalDeployment } from "./utils/local-deployment";
import { MongoService } from "./utils/mongodb";
import { Collection } from "./utils/types";

/**
 * The OpenVidu server writes the analytics data model that OpenVidu Dashboard reads: one document per room,
 * participant session, track and subscription, the raw events, the statistics and the rollups.
 */
describe("OpenVidu analytics writer", () => {
    const mongo = MongoService.getInstance();
    let pids: number[] = [];

    beforeEach(async () => {
        await LocalDeployment.start();
    }, 120000);

    afterEach(() => {
        for (const pid of pids) {
            killProcess(pid, "SIGKILL");
        }
        pids = [];
        LocalDeployment.stop();
    }, 120000);

    afterAll(async () => {
        await mongo.disconnect();
    });

    it("records a room with its participants, tracks, subscriptions, statistics, events and rollups", async () => {
        const roomName = "WriterRoom";
        const identities = ["writer-alice", "writer-bob"];
        pids = identities.map((identity) => Livekit.joinParticipantToRoom(identity, roomName));

        await waitFor(
            async () =>
                (await mongo.count(Collection.PARTICIPANTS, {
                    roomName,
                    status: "active",
                    lastStatsAt: { $exists: true }
                })) === identities.length,
            90,
            "both participants to be active with statistics"
        );
        const room = await mongo.findEntity(Collection.ROOMS, { name: roomName, status: "active" });
        expect(room).not.toBeNull();
        expect(room!.participants).toMatchObject({ active: 2, sessions: 2, unique: 2 });
        const roomSid = room!._id;

        expect(await mongo.countOpen(Collection.TRACKS, { roomSid })).toBeGreaterThanOrEqual(2);
        await waitFor(
            async () => (await mongo.countOpen(Collection.TRACK_SUBSCRIPTIONS, { roomSid })) >= 2,
            60,
            "the participants to subscribe to each other"
        );
        await waitFor(
            async () => (await mongo.count(Collection.TRACK_STATS, { "meta.roomSid": roomSid })) > 0,
            60,
            "statistics of the room"
        );

        killProcess(pids[0]);
        await waitFor(
            async () =>
                (await mongo.count(Collection.PARTICIPANTS, {
                    roomSid,
                    identity: identities[0],
                    status: "left",
                    closedBy: "event"
                })) === 1,
            90,
            "the first participant to leave"
        );
        expect(
            await mongo.countOpen(Collection.TRACK_SUBSCRIPTIONS, {
                $or: [{ subscriberIdentity: identities[0] }, { publisherIdentity: identities[0] }],
                roomSid
            })
        ).toBe(0);

        killProcess(pids[1]);
        await waitFor(
            async () => (await mongo.count(Collection.ROOMS, { _id: roomSid, status: "closed", closedBy: "event" })) === 1,
            120,
            "the room to end after its departure timeout"
        );
        const closed = await mongo.findEntity(Collection.ROOMS, { _id: roomSid });
        expect(closed!.endedAt).toBeInstanceOf(Date);
        expect(closed!.durationMs).toBeGreaterThan(0);
        expect(closed!.participants).toMatchObject({ active: 0, sessions: 2 });
        expect(await mongo.countOpen(Collection.PARTICIPANTS, { roomSid })).toBe(0);
        expect(await mongo.countOpen(Collection.TRACKS, { roomSid })).toBe(0);
        expect(await mongo.countOpen(Collection.TRACK_SUBSCRIPTIONS, { roomSid })).toBe(0);

        const events = await mongo.findEvents({ roomSid });
        const types = new Set(events.map((event) => event.type as string));
        for (const type of [
            "ROOM_CREATED",
            "PARTICIPANT_JOINED",
            "PARTICIPANT_ACTIVE",
            "TRACK_PUBLISHED",
            "PARTICIPANT_LEFT",
            "ROOM_ENDED"
        ]) {
            expect(types).toContain(type);
        }
        // API calls are only counted in the rollups, and credentials never reach the database.
        expect(types).not.toContain("API_CALL");
        expect(JSON.stringify(events)).not.toContain("turn_password");

        const hourly = await mongo.findEntities(Collection.ANALYTICS_HOURLY, {
            scope: "global",
            bucket: { $gte: new Date(Date.now() - 2 * 3_600_000) }
        });
        const total = (read: (doc: Record<string, any>) => number | undefined) =>
            hourly.reduce((sum, doc) => sum + (read(doc) ?? 0), 0);
        expect(total((doc) => doc.rooms?.created)).toBeGreaterThanOrEqual(1);
        expect(total((doc) => doc.participants?.joined)).toBeGreaterThanOrEqual(2);
        expect(total((doc) => doc.participants?.left)).toBeGreaterThanOrEqual(2);

        expect((await mongo.schemaMeta("schema"))?.version).toBeGreaterThanOrEqual(1);
    }, 600000);
});
