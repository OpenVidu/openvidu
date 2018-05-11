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
     * For 'connectionDestroyed' event:
     * - "disconnect": the remote user has called `Session.disconnect()`
     * - "networkDisconnect": the remote user network connection has dropped
     *
     * For 'connectionCreated' empty string
     */
    reason: string;
    /**
     * @hidden
     */
    constructor(cancelable: boolean, target: Session, type: string, connection: Connection, reason: string);
    /**
     * @hidden
     */
    callDefaultBehaviour(): void;
}
