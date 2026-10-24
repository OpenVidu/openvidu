import { killProcess, sleep, waitFor } from "./utils/helper";
import { Livekit } from "./utils/livekit";
import { LocalDeployment } from "./utils/local-deployment";
import { MongoService } from "./utils/mongodb";
import { Collection } from "./utils/types";

/**
 * The reconciler of the OpenVidu server closes the rooms and participant sessions whose end event never arrives,
 * with their tracks and subscriptions: those of a server that crashed or could not flush on shutdown. Healthy
 * sessions stay open, also while Redis restarts.
 */
describe("OpenVidu analytics reconciler", () => {
    const mongo = MongoService.getInstance();
    /** A crashed session is closed within this time of the restart (reconciler period of 10 s in CI). */
    const CLOSURE_TIMEOUT_SECONDS = 180;
    /** A room is closed once its empty timeout (300 s) and two reconciler periods passed since its last event. */
    const ROOM_CLOSURE_TIMEOUT_SECONDS = 420;
    /** Statistics are flushed every 30 s: the estimated end time is at most this early. */
    const STATS_INTERVAL_MS = 30_000;
    /** How long healthy sessions are watched after Redis restarts. */
    const REDIS_RESTART_WATCH_SECONDS = 240;
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

    /** Joins publishers to a room and waits until every session is active with statistics; returns their sids. */
    async function startRoomWithPublishers(roomName: string, identities: string[]): Promise<string[]> {
        pids = identities.map((identity) => Livekit.joinParticipantToRoom(identity, roomName));
        await waitFor(
            async () =>
                (await mongo.count(Collection.PARTICIPANTS, {
                    roomName,
                    identity: { $in: identities },
                    status: "active",
                    lastStatsAt: { $exists: true }
                })) === identities.length,
            120,
            `the sessions of '${roomName}' to be active with statistics`
        );
        const participants = await mongo.findEntities(Collection.PARTICIPANTS, { roomName, status: "active" });
        return participants.map((participant) => participant._id);
    }

    /** The clients are gone with the server: no leave event will ever arrive. */
    function dropClients() {
        for (const pid of pids) {
            killProcess(pid, "SIGKILL");
        }
        pids = [];
    }

    /**
     * Every session closed by the reconciler: left with the reason RECONCILED, an end time at most one statistics
     * interval before the failure, one synthetic event each, and no track or subscription of theirs left open.
     */
    async function expectClosedByReconciler(sids: string[], failedAt: Date) {
        for (const sid of sids) {
            const participant = await mongo.findEntity(Collection.PARTICIPANTS, { _id: sid });
            expect(participant).toMatchObject({ status: "left", closedBy: "reconciler", disconnectReason: "RECONCILED" });
            const leftAt = (participant!.leftAt as Date).getTime();
            expect(leftAt).toBeLessThanOrEqual(failedAt.getTime());
            expect(leftAt).toBeGreaterThanOrEqual(failedAt.getTime() - STATS_INTERVAL_MS);
            expect(await mongo.findSyntheticEvent(sid)).toMatchObject({
                type: "PARTICIPANT_LEFT",
                participantSid: sid,
                synthetic: true
            });
        }
        expect(await mongo.countOpen(Collection.TRACKS, { participantSid: { $in: sids } })).toBe(0);
        expect(
            await mongo.countOpen(Collection.TRACK_SUBSCRIPTIONS, {
                $or: [{ subscriberSid: { $in: sids } }, { publisherSid: { $in: sids } }]
            })
        ).toBe(0);
    }

    it("closes the sessions and the room of a crashed server", async () => {
        const roomName = "ReconcilerCrash";
        const sids = await startRoomWithPublishers(roomName, ["crash-alice", "crash-bob"]);

        const crashedAt = new Date();
        LocalDeployment.killContainer("openvidu");
        dropClients();
        await sleep(5);
        LocalDeployment.startContainer("openvidu");

        await waitFor(
            async () => (await mongo.countOpen(Collection.PARTICIPANTS, { _id: { $in: sids } })) === 0,
            CLOSURE_TIMEOUT_SECONDS,
            "the sessions of the crashed server to be closed"
        );
        await expectClosedByReconciler(sids, crashedAt);
        await waitFor(
            async () => (await mongo.countOpen(Collection.ROOMS, { name: roomName })) === 0,
            ROOM_CLOSURE_TIMEOUT_SECONDS,
            "the room of the crashed server to be closed"
        );
        expect(await mongo.findEntity(Collection.ROOMS, { name: roomName })).toMatchObject({
            status: "closed",
            closedBy: "reconciler",
            endReason: "RECONCILED"
        });
    }, 900000);

    it("closes the sessions that a server stopped before its flush could not write", async () => {
        const sids = await startRoomWithPublishers("ReconcilerStop", ["stop-alice", "stop-bob"]);

        // SIGTERM, then SIGKILL one second later: the shutdown flush of the analytics queues (up to 5 s) is cut short.
        const stoppedAt = new Date();
        LocalDeployment.stopContainerWithTimeout("openvidu", 1);
        dropClients();
        LocalDeployment.startContainer("openvidu");

        await waitFor(
            async () => (await mongo.countOpen(Collection.PARTICIPANTS, { _id: { $in: sids } })) === 0,
            CLOSURE_TIMEOUT_SECONDS,
            "the sessions of the stopped server to be closed"
        );
        // A leave event that made it before the kill closes its session itself.
        const reconciled = (
            await mongo.findEntities(Collection.PARTICIPANTS, { _id: { $in: sids }, closedBy: "reconciler" })
        ).map((participant) => participant._id);
        await expectClosedByReconciler(reconciled, stoppedAt);
        expect(await mongo.countOpen(Collection.TRACKS, { participantSid: { $in: sids } })).toBe(0);
    }, 900000);

    it("keeps healthy sessions open while Redis restarts, and records their real leave events", async () => {
        const roomName = "ReconcilerRedis";
        const sids = await startRoomWithPublishers(roomName, ["redis-alice", "redis-bob"]);
        const runBefore = await mongo.schemaMeta("reconciler");

        const restartedAt = new Date();
        LocalDeployment.restartContainer("redis");

        const deadline = Date.now() + REDIS_RESTART_WATCH_SECONDS * 1000;
        while (Date.now() < deadline) {
            expect(await mongo.countOpen(Collection.PARTICIPANTS, { _id: { $in: sids } })).toBe(sids.length);
            await sleep(10);
        }
        expect(await mongo.countOpen(Collection.ROOMS, { name: roomName })).toBe(1);
        const runAfter = await mongo.schemaMeta("reconciler");
        expect((runAfter!.lastRunAt as Date).getTime()).toBeGreaterThan(
            Math.max(restartedAt.getTime(), (runBefore?.lastRunAt as Date | undefined)?.getTime() ?? 0)
        );

        for (const pid of pids) {
            killProcess(pid);
        }
        pids = [];
        await waitFor(
            async () => (await mongo.countOpen(Collection.PARTICIPANTS, { _id: { $in: sids } })) === 0,
            120,
            "the sessions to be closed by their leave events"
        );
        expect(
            await mongo.count(Collection.PARTICIPANTS, { _id: { $in: sids }, closedBy: "event" })
        ).toBe(sids.length);
    }, 900000);
});
