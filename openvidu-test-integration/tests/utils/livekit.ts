import { execCommandInBackground } from "./helper";

const LIVEKIT_URL = "ws://localhost:7880";
const LIVEKIT_API_KEY = "devkey";
const LIVEKIT_API_SECRET = "secret";

const LK_CLI = "lk";

export class Livekit {
    static joinParticipantToRoom(participantIdentity: string, roomName: string): number {
        const args = [
            "room",
            "join",
            "--url",
            LIVEKIT_URL,
            "--api-key",
            LIVEKIT_API_KEY,
            "--api-secret",
            LIVEKIT_API_SECRET,
            "--publish-demo",
            "--identity",
            participantIdentity,
            roomName
        ];
        const pid = execCommandInBackground(LK_CLI, args);
        if (!pid) {
            throw new Error("Error joining participant to room");
        }
        return pid;
    }
}
