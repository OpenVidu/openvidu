import { Stream } from './Stream';
import { StreamManager } from './StreamManager';
import { SubscriberProperties } from '../OpenViduInternal/Interfaces/Public/SubscriberProperties';
/**
 * Packs remote media streams. Participants automatically receive them when others publish their streams. Initialized with [[Session.subscribe]] method
 */
export declare class Subscriber extends StreamManager {
    private properties;
    /**
     * @hidden
     */
    constructor(stream: Stream, targEl: string | HTMLElement, properties: SubscriberProperties);
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
}
