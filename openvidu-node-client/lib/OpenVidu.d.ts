import { Session } from "./Session";
import { SessionProperties } from "./SessionProperties";
import { Recording } from "./Recording";
export declare class OpenVidu {
    private urlOpenViduServer;
    private static readonly API_RECORDINGS;
    private static readonly API_RECORDINGS_START;
    private static readonly API_RECORDINGS_STOP;
    private hostname;
    private port;
    private basicAuth;
    constructor(urlOpenViduServer: string, secret: string);
    createSession(properties?: SessionProperties): Session;
    startRecording(sessionId: string): Promise<Recording>;
    stopRecording(recordingId: string): Promise<Recording>;
    getRecording(recordingId: string): Promise<Recording>;
    listRecordings(): Promise<Recording[]>;
    deleteRecording(recordingId: string): Promise<Error>;
    private getBasicAuth(secret);
    private setHostnameAndPort();
}
