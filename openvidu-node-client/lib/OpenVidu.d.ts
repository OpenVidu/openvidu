import { Session } from "./Session";
import { SessionProperties } from "./SessionProperties";
import { Archive } from "./Archive";
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
    startRecording(sessionId: string): Promise<Archive>;
    stopRecording(recordingId: string): Promise<Archive>;
    getRecording(recordingId: string): Promise<Archive>;
    listRecordings(): Promise<Archive[]>;
    deleteRecording(recordingId: string): Promise<Error>;
    private getBasicAuth(secret);
    private setHostnameAndPort();
}
