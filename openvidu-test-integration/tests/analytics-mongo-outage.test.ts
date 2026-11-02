import { killProcess, sleep, waitFor } from "./utils/helper";
import { Livekit } from "./utils/livekit";
import { LocalDeployment } from "./utils/local-deployment";
import { MongoService } from "./utils/mongodb";
import { Collection } from "./utils/types";

/**
 * While MongoDB is down the OpenVidu server keeps the analytics events in memory and retries the failed batches, so
 * what happened during the outage is written once MongoDB is back.
 */
describe("OpenVidu analytics during a MongoDB outage", () => {
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

    it("writes a session that joined and left while MongoDB was down", async () => {
        const roomName = "OutageRoom";
        const identity = "outage-alice";

        LocalDeployment.stopContainer("mongo");
        pids = [Livekit.joinParticipantToRoom(identity, roomName)];
        await waitFor(async () => Livekit.isParticipantInRoom(identity, roomName), 60, "the session to join");
        await sleep(5);
        killProcess(pids[0]);
        pids = [];
        await waitFor(async () => !Livekit.isParticipantInRoom(identity, roomName), 60, "the session to leave");
        // A few batch ticks of the writer fail while MongoDB is still down, so the leave event is retried.
        await sleep(5);
        LocalDeployment.startContainer("mongo");

        await waitFor(
            async () =>
                (await mongo.count(Collection.PARTICIPANTS, {
                    roomName,
                    identity,
                    status: "left",
                    closedBy: "event"
                })) === 1,
            180,
            "the session of the outage to be written"
        );
        const participant = await mongo.findEntity(Collection.PARTICIPANTS, { roomName, identity });
        expect(participant!.durationMs).toBeGreaterThan(0);
        const types = new Set((await mongo.findEvents({ roomName })).map((event) => event.type as string));
        expect(types).toContain("ROOM_CREATED");
        expect(types).toContain("PARTICIPANT_JOINED");
        expect(types).toContain("PARTICIPANT_LEFT");
    }, 600000);
});
