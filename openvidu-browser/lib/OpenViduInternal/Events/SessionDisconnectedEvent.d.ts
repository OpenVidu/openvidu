import { Event } from './Event';
import { Session } from '../../OpenVidu/Session';
/**
 * Defines event `sessionDisconnected` dispatched by [[Session]]
 */
export declare class SessionDisconnectedEvent extends Event {
    /**
     * - "disconnect": you have called `Session.disconnect()`
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
    callDefaultBehaviour(): void;
}
