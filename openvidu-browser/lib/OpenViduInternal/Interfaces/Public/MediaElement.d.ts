import { EventDispatcher } from './EventDispatcher';
import { Stream } from '../../../OpenVidu/Stream';
/**
 * Interface representing a media element of the DOM. Can be local ([[Publisher]]) or remote ([[Subscriber]])
 */
export interface MediaElement extends EventDispatcher {
    /**
     * DOM id of the MediaElement's video
     */
    id: string;
    /**
     * Wheter the MediaElement refers to a local stream ([[Publisher]]) or a remote stream ([[Subscriber]])
     */
    remote: boolean;
    /**
     * The [[Stream]] of the MediaElement
     */
    stream: Stream;
    /**
     * HTML DOM element in which the MediaElement's video has been inserted
     */
    element: HTMLElement;
}
