import { Stream } from './Stream';
import { SubscriberProperties } from '../OpenViduInternal/Interfaces/Public/SubscriberProperties';
import { EventDispatcher } from '../OpenViduInternal/Interfaces/Public/EventDispatcher';
import { VideoElementEvent } from '../OpenViduInternal/Events/VideoElementEvent';
/**
 * Packs remote media streams. Participants automatically receive them when others publish their streams. Initialized with [[Session.subscribe]] method
 */
export declare class Subscriber implements EventDispatcher {
    /**
     * HTML DOM element in which the Subscriber's video has been inserted
     */
    element: HTMLElement;
    /**
     * DOM id of the Subscriber's video element
     */
    id: string;
    /**
     * The [[Stream]] to which you are subscribing
     */
    stream: Stream;
    private ee;
    private properties;
    /**
     * @hidden
     */
    constructor(stream: Stream, targetElement: string | HTMLElement, properties: SubscriberProperties);
    /**
     * Subscribe or unsubscribe from the audio stream (if available). Calling this method twice in a row passing same value will have no effect
     * @param value `true` to subscribe to the audio stream, `false` to unsubscribe from it
     */
    subscribeToAudio(value: boolean): Subscriber;
    /**
     * Subscribe or unsubscribe from the video stream (if available). Calling this method twice in a row passing same value will have no effect
     * @param value `true` to subscribe to the video stream, `false` to unsubscribe from it
     */
    subscribeToVideo(value: boolean): Subscriber;
    /**
     * See [[EventDispatcher.on]]
     */
    on(type: string, handler: (event: VideoElementEvent) => void): EventDispatcher;
    /**
     * See [[EventDispatcher.once]]
     */
    once(type: string, handler: (event: VideoElementEvent) => void): Subscriber;
    /**
     * See [[EventDispatcher.off]]
     */
    off(type: string, handler?: (event: VideoElementEvent) => void): Subscriber;
}
