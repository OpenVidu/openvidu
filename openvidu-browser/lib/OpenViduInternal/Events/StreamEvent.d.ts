import { Event } from './Event';
import { Publisher } from '../../OpenVidu/Publisher';
import { Session } from '../../OpenVidu/Session';
import { Stream } from '../../OpenVidu/Stream';
/**
 * Defines the following events:
 * - `streamCreated`: dispatched by [[Session]] and [[Publisher]]
 * - `streamDestroyed`: dispatched by [[Session]] and [[Publisher]]
 */
export declare class StreamEvent extends Event {
    /**
     * Stream object that was created or destroyed
     */
    stream: Stream;
    /**
     * For 'streamDestroyed' event:
     * - "unpublish": method `Session.unpublish()` has been called
     * - "disconnect": method `Session.disconnect()` has been called
     * - "networkDisconnect": the user's network connection has dropped
     *
     * For 'streamCreated' empty string
     */
    reason: string;
    /**
     * @hidden
     */
    constructor(cancelable: boolean, target: Session | Publisher, type: string, stream: Stream, reason: string);
    /**
     * @hidden
     */
    callDefaultBehaviour(): void;
}
