import { Event } from './Event';
import { StreamManager } from '../../OpenVidu/StreamManager';
/**
 * Defines the following events:
 * - `videoElementCreated`: dispatched by [[Publisher]] and [[Subscriber]] whenever a new HTML video element has been inserted into DOM by OpenVidu Browser library. See
 * [Manage video players](/docs/how-do-i/manage-videos) section.
 * - `videoElementDestroyed`: dispatched by [[Publisher]] and [[Subscriber]] whenever an HTML video element has been removed from DOM by OpenVidu Browser library.
 */
export declare class VideoElementEvent extends Event {
    /**
     * Video element that was created or destroyed
     */
    element: HTMLVideoElement;
    /**
     * @hidden
     */
    constructor(element: HTMLVideoElement, target: StreamManager, type: string);
    /**
     * @hidden
     */
    callDefaultBehavior(): void;
}
