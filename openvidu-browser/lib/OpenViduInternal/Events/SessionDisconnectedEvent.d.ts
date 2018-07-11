import { Event } from './Event';
import { Session } from '../../OpenVidu/Session';
/**
 * Defines event `sessionDisconnected` dispatched by [[Session]]
 */
export declare class SessionDisconnectedEvent extends Event {
    /**
     * - "disconnect": you have called `Session.disconnect()`
     * - "forceDisconnectByUser": you have been evicted from the Session by other user calling `Session.forceDisconnect()`
     * - "forceDisconnectByServer": you have been evicted from the Session by the application
     * - "sessionClosedByServer": the Session has been closed by the application
     * - "networkDisconnect": your network connection has dropped
     */
    reason: string;
    /**
     * @hidden
     */
    constructor(target: Session, reason: string);
    /**
     * @hidden
     */
    callDefaultBehavior(): void;
}
