import { Connection } from './Connection';
import { Publisher } from './Publisher';
import { SessionProperties } from './SessionProperties';
import { TokenOptions } from './TokenOptions';
export declare class Session {
    /**
     * Unique identifier of the Session
     */
    sessionId: string;
    /**
     * Timestamp when this session was created, in UTC milliseconds (ms since Jan 1, 1970, 00:00:00 UTC)
     */
    createdAt: number;
    /**
     * Properties defining the session
     */
    properties: SessionProperties;
    /**
     * Array of active connections to the session. This property always initialize as an empty array and
     * **will remain unchanged since the last time method [[Session.fetch]] was called**. Exceptions to this rule are:
     *
     * - Calling [[Session.forceUnpublish]] also automatically updates each affected Connection status
     * - Calling [[Session.forceDisconnect]] automatically updates each affected Connection status
     *
     * To get the array of active connections with their current actual value, you must call [[Session.fetch]] before consulting
     * property [[activeConnections]]
     */
    activeConnections: Connection[];
    /**
     * Whether the session is being recorded or not
     */
    recording: boolean;
    /**
     * @hidden
     */
    constructor(propertiesOrJson?: any);
    /**
     * Gets the unique identifier of the Session
     */
    getSessionId(): string;
    /**
     * Gets a new token associated to Session object
     *
     * @returns A Promise that is resolved to the _token_ if success and rejected with an Error object if not
     */
    generateToken(tokenOptions?: TokenOptions): Promise<string>;
    /**
     * Gracefully closes the Session: unpublishes all streams and evicts every participant
     *
     * @returns A Promise that is resolved if the session has been closed successfully and rejected with an Error object if not
     */
    close(): Promise<any>;
    /**
     * Updates every property of the Session with the current status it has in OpenVidu Server. This is especially useful for accessing the list of active
     * connections of the Session ([[Session.activeConnections]]) and use those values to call [[Session.forceDisconnect]] or [[Session.forceUnpublish]].
     *
     * To update every Session object owned by OpenVidu object, call [[OpenVidu.fetch]]
     *
     * @returns A promise resolved to true if the Session status has changed with respect to the server, or to false if not.
     *          This applies to any property or sub-property of the Session object
     */
    fetch(): Promise<boolean>;
    /**
     * Forces the user with Connection `connectionId` to leave the session. OpenVidu Browser will trigger the proper events on the client-side
     * (`streamDestroyed`, `connectionDestroyed`, `sessionDisconnected`) with reason set to `"forceDisconnectByServer"`
     *
     * You can get `connection` parameter from [[Session.activeConnections]] array ([[Connection.connectionId]] for getting each `connectionId` property).
     * Remember to call [[Session.fetch]] before to fetch the current actual properties of the Session from OpenVidu Server
     *
     * @returns A Promise that is resolved if the user was successfully disconnected and rejected with an Error object if not
     */
    forceDisconnect(connection: string | Connection): Promise<any>;
    /**
     * Forces some user to unpublish a Stream (identified by its `streamId` or the corresponding [[Publisher]] object owning it).
     * OpenVidu Browser will trigger the proper events on the client-side (`streamDestroyed`) with reason set to `"forceUnpublishByServer"`.
     *
     * You can get `publisher` parameter from [[Connection.publishers]] array ([[Publisher.streamId]] for getting each `streamId` property).
     * Remember to call [[Session.fetch]] before to fetch the current actual properties of the Session from OpenVidu Server
     *
     * @returns A Promise that is resolved if the stream was successfully unpublished and rejected with an Error object if not
     */
    forceUnpublish(publisher: string | Publisher): Promise<any>;
    /**
     * @hidden
     */
    getSessionIdHttp(): Promise<string>;
    /**
     * @hidden
     */
    resetSessionWithJson(json: any): Session;
    /**
     * @hidden
     */
    equalTo(other: Session): boolean;
}
