import { Event } from './Event';
import { Session } from '../..';
/**
 * Defines event `sessionDisconnected` dispatched by [[Session]]
 */
export declare class SessionDisconnectedEvent extends Event {
    /**
     * - "disconnect"
     * - "networkDisconnect"
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
