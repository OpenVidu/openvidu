import { Session } from "./Session";
import { SessionProperties } from "./SessionProperties";
export declare class OpenVidu {
    private urlOpenViduServer;
    private secret;
    constructor(urlOpenViduServer: string, secret: string);
    createSession(properties?: SessionProperties): Session;
    startRecording(sessionId: string): void;
    stopRecording(sessionId: string): void;
}
