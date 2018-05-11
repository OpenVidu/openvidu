import { Session } from './Session';
import { SessionProperties } from './SessionProperties';
import { Recording } from './Recording';
import { RecordingProperties } from './RecordingProperties';
export declare class OpenVidu {
    private urlOpenViduServer;
    private static readonly API_RECORDINGS;
    private static readonly API_RECORDINGS_START;
    private static readonly API_RECORDINGS_STOP;
    private hostname;
    private port;
    private basicAuth;
    /**
     * @param urlOpenViduServer Public accessible IP where your instance of OpenVidu Server is up an running
     * @param secret Secret used on OpenVidu Server initialization
     */
    constructor(urlOpenViduServer: string, secret: string);
    /**
     * Creates an OpenVidu session. You can call [[Session.getSessionId]] in the resolved promise to retrieve the `sessionId`
     *
     * @returns A Promise that is resolved to the [[Session]] if success and rejected with an Error object if not.
     */
    createSession(properties?: SessionProperties): Promise<Session>;
    startRecording(sessionId: string): Promise<Recording>;
    startRecording(sessionId: string, name: string): Promise<Recording>;
    startRecording(sessionId: string, properties: RecordingProperties): Promise<Recording>;
    /**
     * Stops the recording of a [[Session]]
     *
     * @param recordingId The `id` property of the [[Recording]] you want to stop
     *
     * @returns A Promise that is resolved to the [[Recording]] if it successfully stopped and rejected with an Error object if not. This Error object has as `message` property with the following values:
     * - `404`: no recording exists for the passed `recordingId`
     * - `406`: recording has `starting` status. Wait until `started` status before stopping the recording
     */
    stopRecording(recordingId: string): Promise<Recording>;
    /**
     * Gets an existing [[Recording]]
     *
     * @param recordingId The `id` property of the [[Recording]] you want to retrieve
     *
     * @returns A Promise that is resolved to the [[Recording]] if it successfully stopped and rejected with an Error object if not. This Error object has as `message` property with the following values:
     * - `404`: no recording exists for the passed `recordingId`
     */
    getRecording(recordingId: string): Promise<Recording>;
    /**
     * Lists all existing recordings
     *
     * @returns A Promise that is resolved to an array with all existing recordings
     */
    listRecordings(): Promise<Recording[]>;
    /**
     * Deletes a [[Recording]]. The recording must have status `stopped` or `available`
     *
     * @param recordingId
     *
     * @returns A Promise that is resolved if the Recording was successfully deleted and rejected with an Error object if not. This Error object has as `message` property with the following values:
     * - `404`: no recording exists for the passed `recordingId`
     * - `409`: the recording has `started` status. Stop it before deletion
     */
    deleteRecording(recordingId: string): Promise<Error>;
    private getBasicAuth(secret);
    private setHostnameAndPort();
}
