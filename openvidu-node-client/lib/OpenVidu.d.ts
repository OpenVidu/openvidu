import { Recording } from './Recording';
import { RecordingProperties } from './RecordingProperties';
import { Session } from './Session';
import { SessionProperties } from './SessionProperties';
export declare class OpenVidu {
    private urlOpenViduServer;
    private Buffer;
    /**
     * @hidden
     */
    static hostname: string;
    /**
     * @hidden
     */
    static port: number;
    /**
     * @hidden
     */
    static basicAuth: string;
    /**
     * @hidden
     */
    static readonly API_RECORDINGS: string;
    /**
     * @hidden
     */
    static readonly API_RECORDINGS_START: string;
    /**
     * @hidden
     */
    static readonly API_RECORDINGS_STOP: string;
    /**
     * @hidden
     */
    static readonly API_SESSIONS: string;
    /**
     * @hidden
     */
    static readonly API_TOKENS: string;
    private static o;
    /**
     * Array of active sessions. **This value will remain unchanged since the last time method [[OpenVidu.fetch]]
     * was called**. Exceptions to this rule are:
     *
     * - Calling [[Session.fetch]] updates that specific Session status
     * - Calling [[Session.close]] automatically removes the Session from the list of active Sessions
     * - Calling [[Session.forceDisconnect]] automatically updates the inner affected connections for that specific Session
     * - Calling [[Session.forceUnpublish]] also automatically updates the inner affected connections for that specific Session
     * - Calling [[OpenVidu.startRecording]] and [[OpenVidu.stopRecording]] automatically updates the recording status of the
     * Session ([[Session.recording]])
     *
     * To get the array of active sessions with their current actual value, you must call [[OpenVidu.fetch]] before consulting
     * property [[activeSessions]]
     */
    activeSessions: Session[];
    /**
     * @param urlOpenViduServer Public accessible IP where your instance of OpenVidu Server is up an running
     * @param secret Secret used on OpenVidu Server initialization
     */
    constructor(urlOpenViduServer: string, secret: string);
    /**
     * Creates an OpenVidu session. You can call [[Session.getSessionId]] inside the resolved promise to retrieve the `sessionId`
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
    /**
     * Updates every property of every active Session with the current status they have in OpenVidu Server.
     * After calling this method you can access the updated array of active sessions in [[activeSessions]]
     *
     * @returns A promise resolved to true if any Session status has changed with respect to the server, or to false if not.
     * This applies to any property or sub-property of any of the sessions locally stored in OpenVidu Node Client
     */
    fetch(): Promise<boolean>;
    /**
     * @hidden
     */
    fetchWebRtc(): Promise<boolean>;
    private getBasicAuth;
    private setHostnameAndPort;
    /**
     * @hidden
     */
    static getActiveSessions(): Session[];
}
