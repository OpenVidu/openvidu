import { Event } from './Event';
import { Publisher, Subscriber } from '../..';
/**
 * Defines the following events:
 * - `videoElementCreated`: dispatched by [[Publisher]] and [[Subscriber]]
 * - `videoElementDestroyed`: dispatched by [[Publisher]] and [[Subscriber]]
 * - `videoPlaying`: dispatched by [[Publisher]] and [[Subscriber]]
 * - `remoteVideoPlaying`: dispatched by [[Publisher]] if `Publisher.subscribeToRemote()` was called before `Session.publish(Publisher)`
 */
export declare class VideoElementEvent extends Event {
    /**
     * Video element that was created, destroyed or started playing
     */
    element: HTMLVideoElement;
    /**
     * @hidden
     */
    constructor(element: HTMLVideoElement, target: Publisher | Subscriber, type: string);
    /**
     * @hidden
     */
    callDefaultBehaviour(): void;
}
