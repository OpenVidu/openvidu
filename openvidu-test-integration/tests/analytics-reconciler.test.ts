import { killProcess, sleep, waitFor } from "./utils/helper";
import { Livekit } from "./utils/livekit";
import { LocalDeployment } from "./utils/local-deployment";
import { AnalyticsDocument, MongoService } from "./utils/mongodb";
import { Collection } from "./utils/types";

/**
 * The reconciler of the OpenVidu server closes the rooms and participant sessions whose end event never arrives,
 * with their tracks and subscriptions: those of a server that crashed or could not flush on shutdown, and those the
 * store holds open while LiveKit no longer has them. Healthy sessions stay open, also while Redis restarts. The cases
 * share one deployment; a failed case hands a fresh one to the next.
 */
describe("OpenVidu analytics reconciler", () => {
    const mongo = MongoService.getInstance();
    /** A crashed session is closed within this time of the restart (reconciler period of 10 s in CI). */
    const CLOSURE_TIMEOUT_SECONDS = 180;
    /** A room is closed once its empty timeout (300 s) and two reconciler periods passed since its last event. */
    const ROOM_CLOSURE_TIMEOUT_SECONDS = 420;
    /** Statistics are flushed every 30 s: the estimated end time is at most this early. */
    const STATS_INTERVAL_MS = 30_000;
    /** A session without statistics for this long is a candidate (3 × the statistics interval). */
    const STALE_AFTER_MS = 3 * STATS_INTERVAL_MS;
    /** The reconciler period the CI workflow configures. */
    const RECONCILER_INTERVAL_MS = 10_000;
    /**
     * How long healthy sessions are watched after Redis restarts: longer than a session takes to become a candidate,
     * plus two reconciler runs and one more statistics flush.
     */
    const REDIS_RESTART_WATCH_SECONDS = 150;
    /** A candidate of an alive node is closed after two consecutive runs that do not find it in LiveKit. */
    const ABSENT_CLOSURE_TIMEOUT_SECONDS = 60;
    let pids: number[] = [];
    let caseStartedAt = new Date();
    let passed = false;

    beforeAll(async () => {
        await LocalDeployment.start();
    }, 120000);

    beforeEach(() => {
        caseStartedAt = new Date();
        passed = false;
    });

    afterEach(async () => {
        dropClients();
        LocalDeployment.saveServerLogs(caseStartedAt);
        if (!passed) {
            LocalDeployment.stop();
            await LocalDeployment.start();
        }
    }, 240000);

    afterAll(async () => {
        // Each case saved its own part of the log.
        LocalDeployment.stop(false);
        await mongo.disconnect();
    }, 120000);

    /** Joins publishers to a room and waits until every session is active with statistics; returns their sids. */
    async function startRoomWithPublishers(roomName: string, identities: string[]): Promise<string[]> {
        pids.push(...identities.map((identity) => Livekit.joinParticipantToRoom(identity, roomName)));
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
        const participants = await mongo.findEntities(Collection.PARTICIPANTS, {
            roomName,
            identity: { $in: identities },
            status: "active"
        });
        return participants.map((participant) => participant._id);
    }

    /** The clients are gone with the server: no leave event will ever arrive. */
    function dropClients() {
        for (const pid of pids) {
            killProcess(pid, "SIGKILL");
        }
        pids = [];
    }

    /** Waits for the server to be back after a restart that began at `since`; returns when it was seen ready. */
    async function serverReady(since: Date): Promise<Date> {
        LocalDeployment.startContainer("openvidu");
        return LocalDeployment.waitForAnalytics(since, 120);
    }

    /**
     * Every session closed by the reconciler: left with the reason RECONCILED, an end time at most one statistics
     * interval before the failure, one synthetic event each naming the closure reason, and no track or subscription
     * of theirs left open.
     */
    async function expectClosedByReconciler(sids: string[], failedAt: Date, reason = "node-dead") {
        for (const sid of sids) {
            const participant = await mongo.findEntity(Collection.PARTICIPANTS, { _id: sid });
            expect(participant).toMatchObject({ status: "left", closedBy: "reconciler", disconnectReason: "RECONCILED" });
            const leftAt = (participant!.leftAt as Date).getTime();
            expect(leftAt).toBeLessThanOrEqual(failedAt.getTime());
            expect(leftAt).toBeGreaterThanOrEqual(failedAt.getTime() - STATS_INTERVAL_MS);
            expect(await mongo.findSyntheticEvent(sid)).toMatchObject({
                type: "PARTICIPANT_LEFT",
                participantSid: sid,
                synthetic: true,
                payload: { reconciler: { reason } }
            });
        }
        expect(await mongo.countOpen(Collection.TRACKS, { participantSid: { $in: sids } })).toBe(0);
        expect(
            await mongo.countOpen(Collection.TRACK_SUBSCRIPTIONS, {
                $or: [{ subscriberSid: { $in: sids } }, { publisherSid: { $in: sids } }]
            })
        ).toBe(0);
    }

    /**
     * Inserts an active session in the room of `template`, on the same node, whose statistics stopped 100 s ago and
     * that LiveKit never had: what a lost leave event leaves behind on a server that is still alive.
     */
    async function seedStaleParticipant(template: AnalyticsDocument, identity: string): Promise<string> {
        const sid = `PA_${identity.replace(/[^A-Za-z0-9]/g, "")}${Date.now()}`;
        const joinedAt = new Date(Date.now() - 120_000);
        const { leftAt, durationMs, disconnectReason, closedBy, internal, ...fields } = template;
        await mongo.insertEntity(Collection.PARTICIPANTS, {
            ...fields,
            _id: sid,
            identity,
            identityLower: identity.toLowerCase(),
            status: "active",
            joinedAt,
            activeAt: joinedAt,
            lastEventAt: joinedAt,
            lastStatsAt: new Date(Date.now() - 100_000)
        });
        return sid;
    }

    it("closes the sessions and the room of a crashed server", async () => {
        const roomName = "ReconcilerCrash";
        const sids = await startRoomWithPublishers(roomName, ["crash-alice", "crash-bob"]);

        const crashedAt = new Date();
        LocalDeployment.killContainer("openvidu");
        dropClients();
        await sleep(5);
        await serverReady(crashedAt);

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
        const room = await mongo.findEntity(Collection.ROOMS, { name: roomName });
        expect(room).toMatchObject({ status: "closed", closedBy: "reconciler", endReason: "RECONCILED" });
        // The room never ends before its sessions: it ends with the last one.
        const leftAts = (await mongo.findEntities(Collection.PARTICIPANTS, { _id: { $in: sids } })).map((participant) =>
            (participant.leftAt as Date).getTime()
        );
        expect((room!.endedAt as Date).getTime()).toBe(Math.max(...leftAts));
        passed = true;
    }, 900000);

    it("closes the sessions that a server stopped before its flush could not write", async () => {
        const sids = await startRoomWithPublishers("ReconcilerStop", ["stop-alice", "stop-bob"]);

        // SIGTERM, then SIGKILL one second later: the shutdown flush of the analytics queues (up to 5 s) is cut short.
        const stoppedAt = new Date();
        LocalDeployment.stopContainerWithTimeout("openvidu", 1);
        dropClients();
        await serverReady(stoppedAt);

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
        passed = true;
    }, 900000);

    it("closes the sessions of a server that was down for longer than the stale threshold as soon as it starts", async () => {
        const sids = await startRoomWithPublishers("ReconcilerStartup", ["startup-alice", "startup-bob"]);

        // A stop without any grace is a crash that keeps the server down: its sessions are stale when it starts.
        const crashedAt = new Date();
        LocalDeployment.stopContainerWithTimeout("openvidu", 0);
        dropClients();
        await sleep((STALE_AFTER_MS + STATS_INTERVAL_MS) / 1000);
        const readyAt = await serverReady(crashedAt);

        // The startup run closes them; the first periodic run would come one reconciler period later.
        let closedAt: Date | undefined;
        const deadline = readyAt.getTime() + CLOSURE_TIMEOUT_SECONDS * 1000;
        while (!closedAt && Date.now() < deadline) {
            if ((await mongo.countOpen(Collection.PARTICIPANTS, { _id: { $in: sids } })) === 0) {
                closedAt = new Date();
            } else {
                await sleep(0.5);
            }
        }
        expect(closedAt).toBeDefined();
        expect(closedAt!.getTime() - readyAt.getTime()).toBeLessThan(RECONCILER_INTERVAL_MS - 2_000);
        await expectClosedByReconciler(sids, crashedAt);
        passed = true;
    }, 900000);

    it("closes the sessions and the rooms that an alive server's LiveKit no longer has", async () => {
        const roomName = "ReconcilerAbsent";
        const [realSid] = await startRoomWithPublishers(roomName, ["absent-alice"]);
        const participant = (await mongo.findEntity(Collection.PARTICIPANTS, { _id: realSid }))!;
        const room = (await mongo.findEntity(Collection.ROOMS, { name: roomName, status: "active" }))!;

        // A session of the live room that LiveKit never listed, and an empty room past its empty timeout that LiveKit
        // never had, both of the alive server.
        const ghostSid = await seedStaleParticipant(participant, "absent-ghost");
        const emptyRoomSid = `RM_ReconcilerAbsentEmpty${Date.now()}`;
        const lastEventAt = new Date(Date.now() - 8 * 60_000);
        const { endedAt, durationMs, endReason, closedBy, internal, ...roomFields } = room;
        await mongo.insertEntity(Collection.ROOMS, {
            ...roomFields,
            _id: emptyRoomSid,
            name: "ReconcilerAbsentEmpty",
            nameLower: "reconcilerabsentempty",
            createdAt: new Date(lastEventAt.getTime() - 60_000),
            lastEventAt,
            lastStatsAt: lastEventAt,
            participants: { sessions: 0, unique: 0, active: 0, peakActive: 0, aborted: 0, byKind: {} }
        });

        await waitFor(
            async () =>
                (await mongo.countOpen(Collection.PARTICIPANTS, { _id: ghostSid })) === 0 &&
                (await mongo.countOpen(Collection.ROOMS, { _id: emptyRoomSid })) === 0,
            ABSENT_CLOSURE_TIMEOUT_SECONDS,
            "the entities LiveKit does not have to be closed"
        );
        expect(await mongo.findEntity(Collection.PARTICIPANTS, { _id: ghostSid })).toMatchObject({
            status: "left",
            closedBy: "reconciler",
            disconnectReason: "RECONCILED"
        });
        expect(await mongo.findSyntheticEvent(ghostSid)).toMatchObject({
            type: "PARTICIPANT_LEFT",
            payload: { reconciler: { reason: "absent-live" } }
        });
        expect(await mongo.findEntity(Collection.ROOMS, { _id: emptyRoomSid })).toMatchObject({
            status: "closed",
            closedBy: "reconciler",
            endReason: "RECONCILED",
            endedAt: lastEventAt
        });
        expect(await mongo.findSyntheticEvent(emptyRoomSid)).toMatchObject({
            type: "ROOM_ENDED",
            payload: { reconciler: { reason: "absent-live" } }
        });
        // The sessions LiveKit lists stay open.
        expect(await mongo.countOpen(Collection.PARTICIPANTS, { _id: realSid })).toBe(1);
        expect(await mongo.countOpen(Collection.ROOMS, { _id: room._id })).toBe(1);
        passed = true;
    }, 900000);

    it("closes the rooms and sessions of a planned restart with their real end events", async () => {
        const roomName = "ReconcilerPlannedRestart";
        const sids = await startRoomWithPublishers(roomName, ["planned-alice", "planned-bob"]);
        const startedAt = LocalDeployment.containerStartedAt("openvidu");

        // The first SIGTERM makes the server drain; the second one closes its rooms and it exits after its flush.
        const stoppingAt = new Date();
        LocalDeployment.signalContainer("openvidu", "SIGTERM");
        await sleep(3);
        LocalDeployment.signalContainer("openvidu", "SIGTERM");
        dropClients();
        await waitFor(
            async () =>
                !LocalDeployment.isContainerRunning("openvidu") ||
                LocalDeployment.containerStartedAt("openvidu") !== startedAt,
            60,
            "the server to exit"
        );
        await serverReady(stoppingAt);

        const room = await mongo.findEntity(Collection.ROOMS, { name: roomName });
        expect(room).toMatchObject({ status: "closed", closedBy: "event", endReason: "SERVER_SHUTDOWN" });
        for (const sid of sids) {
            const participant = await mongo.findEntity(Collection.PARTICIPANTS, { _id: sid });
            expect(participant).toMatchObject({ status: "left", closedBy: "event" });
            // The final statistics were flushed on the way out.
            expect((participant!.lastStatsAt as Date).getTime()).toBeGreaterThanOrEqual(stoppingAt.getTime());
            expect(await mongo.findSyntheticEvent(sid)).toBeNull();
        }
        const types = (await mongo.findEvents({ roomName })).map((event) => event.type as string);
        expect(types).toContain("ROOM_ENDED");
        expect(types.filter((type) => type === "PARTICIPANT_LEFT")).toHaveLength(sids.length);
        passed = true;
    }, 900000);

    it("keeps healthy sessions open while Redis restarts and loses its state, trusts LiveKit again once it lists rooms, and records the real leave events", async () => {
        const roomName = "ReconcilerRedis";
        const sids = await startRoomWithPublishers(roomName, ["redis-alice", "redis-bob"]);
        const template = (await mongo.findEntity(Collection.PARTICIPANTS, { _id: sids[0] }))!;
        const runBefore = await mongo.schemaMeta("reconciler");

        // The deployment's Redis persists its data, so it comes back with LiveKit's listing; emptying it is a Redis
        // restarted without its data.
        const restartedAt = new Date();
        LocalDeployment.restartContainer("redis");
        LocalDeployment.flushRedis();
        // A stale session of the live room: while LiveKit lists no room and the room still receives statistics, the
        // listing is not trusted and the session is kept.
        const ghostSid = await seedStaleParticipant(template, "redis-ghost");
        await waitFor(
            async () => LocalDeployment.serverLogsSince(restartedAt).includes("live-state-untrusted"),
            60,
            "a reconciler run that does not trust the empty live listing"
        );
        expect(await mongo.countOpen(Collection.PARTICIPANTS, { _id: ghostSid })).toBe(1);

        const deadline = restartedAt.getTime() + REDIS_RESTART_WATCH_SECONDS * 1000;
        while (Date.now() < deadline) {
            expect(await mongo.countOpen(Collection.PARTICIPANTS, { _id: { $in: sids } })).toBe(sids.length);
            await sleep(10);
        }
        expect(await mongo.countOpen(Collection.ROOMS, { name: roomName })).toBe(1);
        const runAfter = await mongo.schemaMeta("reconciler");
        expect((runAfter!.lastRunAt as Date).getTime()).toBeGreaterThan(
            Math.max(restartedAt.getTime(), (runBefore?.lastRunAt as Date | undefined)?.getTime() ?? 0)
        );

        // A new room puts LiveKit's listing back in Redis: the listing is trusted again and the stale session, which
        // it does not list, is closed.
        pids.push(Livekit.joinParticipantToRoom("redis-carol", "ReconcilerRedisAfter"));
        await waitFor(
            async () => (await mongo.countOpen(Collection.PARTICIPANTS, { _id: ghostSid })) === 0,
            ABSENT_CLOSURE_TIMEOUT_SECONDS,
            "the stale session to be closed once the listing is trusted"
        );
        expect(await mongo.findSyntheticEvent(ghostSid)).toMatchObject({
            payload: { reconciler: { reason: "absent-live" } }
        });
        expect(await mongo.countOpen(Collection.PARTICIPANTS, { _id: { $in: sids } })).toBe(sids.length);

        for (const pid of pids) {
            killProcess(pid);
        }
        pids = [];
        await waitFor(
            async () => (await mongo.countOpen(Collection.PARTICIPANTS, { _id: { $in: sids } })) === 0,
            120,
            "the sessions to be closed by their leave events"
        );
        expect(await mongo.count(Collection.PARTICIPANTS, { _id: { $in: sids }, closedBy: "event" })).toBe(sids.length);
        passed = true;
    }, 900000);
});
