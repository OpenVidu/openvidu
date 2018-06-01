import { Event } from './Event';
import { Stream } from '../../OpenVidu/Stream';
/**
 * Defines the following events:
 * - `mediaStreamSet`: dispatched by [[Stream]]
 *
 * This is useful if you decide to manage the DOM video elements on your own instead of letting OpenVidu take care of them (passing _null_ or _undefined_ as `targetElement` on [[OpenVidu.initPublisher]] or [[Session.subscribe]])
 */
export declare class MediaStreamSetEvent extends Event {
    /**
     * The [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream) object recently initialized in the [[Stream]] object. You can directly set `HTMLMediaElement.srcObject = MediaStreamEvent.mediaStream;`
     */
    mediaStream: MediaStream;
    /**
     * @hidden
     */
    constructor(mediaStream: MediaStream, target: Stream);
    /**
     * @hidden
     */
    callDefaultBehaviour(): void;
}
