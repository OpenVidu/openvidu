import { Event } from './Event';
import { StreamManager } from '../../OpenVidu/StreamManager';
/**
 * Defines the following events:
 * - `streamPlaying`: dispatched by [[StreamManager]] ([[Publisher]] and [[Subscriber]])
 */
export declare class StreamManagerEvent extends Event {
    /**
     * @hidden
     */
    constructor(target: StreamManager);
    /**
     * @hidden
     */
    callDefaultBehaviour(): void;
}
