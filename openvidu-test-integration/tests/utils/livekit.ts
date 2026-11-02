import { execSync } from "child_process";
import { execCommandInBackground } from "./helper";

const LIVEKIT_URL = "ws://localhost:7880";
const LIVEKIT_API_KEY = "devkey";
const LIVEKIT_API_SECRET = "secret";

const LK_CLI = "lk";

export class Livekit {
    /** Joins a participant that publishes the demo tracks and subscribes to the others; returns the pid of the CLI. */
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
            "--auto-subscribe",
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

    /** Whether LiveKit lists a participant with this identity in the room; false when the room does not exist. */
    static isParticipantInRoom(participantIdentity: string, roomName: string): boolean {
        const args = ["--url", LIVEKIT_URL, "--api-key", LIVEKIT_API_KEY, "--api-secret", LIVEKIT_API_SECRET];
        try {
            return execSync(`${LK_CLI} room participants list ${args.join(" ")} ${roomName}`, { stdio: "pipe" })
                .toString()
                .includes(participantIdentity);
        } catch {
            return false;
        }
    }
}
