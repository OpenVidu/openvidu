import {
    joinParticipantToRoom,
    killProcess,
    sleep,
    startComposeContainer,
    startLocalDeployment,
    stopComposeContainer,
    stopLocalDeployment
} from "./utils/helper";
import { MongoService } from "./utils/mongodb";
import { EntityType } from "./utils/types";

describe("OpenVidu active entities fixer", () => {
    const mongoService = MongoService.getInstance();

    beforeEach(async () => {
        await startLocalDeployment();
    }, 120000); // 2 minute

    afterEach(() => {
        stopLocalDeployment();
    }, 60000); // 1 minute

    it("should fix fake active entities in MongoDB", async () => {
        console.log("Joining participant to room...");
        const roomName = "TestRoom";
        const participantIdentity = "TestParticipant1";
        const pid = joinParticipantToRoom(participantIdentity, roomName);
        await sleep(5);

        const roomStartedEvent = await mongoService.findStartEvent(EntityType.ROOM, roomName);
        if (!roomStartedEvent) {
            throw new Error("ROOM_CREATED event not found");
        }

        const participantActiveEvent = await mongoService.findStartEvent(EntityType.PARTICIPANT, participantIdentity);
        if (!participantActiveEvent) {
            throw new Error("PARTICIPANT_ACTIVE event not found");
        }

        const roomId = roomStartedEvent.room.sid;
        const participantId = participantActiveEvent.participant_id;

        stopComposeContainer("openvidu");
        killProcess(pid);
        await sleep(5);
        startComposeContainer("openvidu");

        // Check if there is a fake close event for room and participant in MongoDB
        // and the active entities are removed
        let roomEndedEvent;
        let participantLeftEvent;
        let isRoomActive: boolean;
        let isParticipantActive: boolean;

        do {
            console.log("Waiting for fake close events in MongoDB...");
            await sleep(10);
            roomEndedEvent = await mongoService.findCloseEvent(EntityType.ROOM, roomId);
            participantLeftEvent = await mongoService.findCloseEvent(EntityType.PARTICIPANT, participantId);
            isRoomActive = await mongoService.isActiveEntity(roomId);
            isParticipantActive = await mongoService.isActiveEntity(participantId);
        } while (!roomEndedEvent || !participantLeftEvent || isRoomActive || isParticipantActive);

        // Check properties of fake ROOM_ENDED event
        expect(isRoomActive).toBeFalsy();
        expect(roomEndedEvent).not.toBeNull();
        expect(roomEndedEvent).toMatchObject({
            room_id: roomId,
            room: {
                sid: roomId,
                name: roomName,
                creation_time: roomStartedEvent.room.creation_time
            }
        });
        expect(roomEndedEvent!.timestamp.seconds).toBeGreaterThan(roomStartedEvent.room.creation_time);
        expect(roomEndedEvent!.openvidu_expire_at).toBeDefined();

        // Check properties of fake PARTICIPANT_LEFT event
        expect(isParticipantActive).toBeFalsy();
        expect(participantLeftEvent).not.toBeNull();
        expect(participantLeftEvent).toMatchObject({
            room_id: roomId,
            room: {
                sid: roomId
            },
            participant_id: participantId,
            participant: {
                sid: participantId,
                identity: participantIdentity,
                joined_at: participantActiveEvent.participant.joined_at
            }
        });
        expect(participantLeftEvent!.timestamp.seconds).toBeGreaterThan(participantActiveEvent.participant.joined_at);
        expect(participantLeftEvent!.openvidu_expire_at).toBeDefined();
    }, 300000); // 5 minutes
});
