import { Event } from './Event';
import { Connection } from '../../OpenVidu/Connection';
import { Session } from '../../OpenVidu/Session';
/**
 * Defines the following events:
 * - `connectionCreated`: dispatched by [[Session]]
 * - `connectionDestroyed`: dispatched by [[Session]]
 */
export declare class ConnectionEvent extends Event {
    /**
     * Connection object that was created or destroyed
     */
    connection: Connection;
    /**
     * For `connectionDestroyed` event:
     * - "disconnect": the remote user has called `Session.disconnect()`
     * - "forceDisconnectByUser": the remote user has been evicted from the Session by other user calling `Session.forceDisconnect()`
     * - "forceDisconnectByServer": the remote user has been evicted from the Session by the application
     * - "sessionClosedByServer": the Session has been closed by the application
     * - "networkDisconnect": the remote user network connection has dropped
     *
     * For `connectionCreated` event an empty string
     */
    reason: string;
    /**
     * @hidden
     */
    constructor(cancelable: boolean, target: Session, type: string, connection: Connection, reason: string);
    /**
     * @hidden
     */
    callDefaultBehavior(): void;
}
