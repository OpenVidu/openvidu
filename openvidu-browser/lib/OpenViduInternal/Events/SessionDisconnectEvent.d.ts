import { Event } from './Event';
import { Session } from '../..';
export declare class SessionDisconnectEvent extends Event {
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
