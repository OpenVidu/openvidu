import { Stream } from '../../../OpenVidu/Stream';
import { EventDispatcher } from './EventDispatcher';
import { Event } from '../../Events/Event';
import { VideoInsertMode } from '../../Enums/VideoInsertMode';
import EventEmitter = require('wolfy87-eventemitter');
/**
 * Interface in charge of displaying the media streams in the HTML DOM. This wraps any Publisher and Subscriber object, as well as
 * any extra representation in the DOM you assign to some Stream by calling [[Stream.addVideoElement]].
 *
 * The use of this interface is useful when you don't need to differentiate between streams and just want to directly manage videos
 */
export declare class MediaManager implements EventDispatcher {
    /**
     * The Stream represented in the DOM by the MediaManager
     */
    stream: Stream;
    /**
     * Whether the MediaManager is representing in the DOM a local Stream ([[Publisher]]) or a remote Stream ([[Subscriber]])
     */
    remote: boolean;
    /**
     * The DOM HTMLElement assigned as targetElement when initializing the MediaManager. This property is defined when [[OpenVidu.initPublisher]]
     * or [[Session.subscribe]] methods have been called passing a valid `targetElement` parameter. It is undefined when [[OpenVidu.initPublisher]]
     * or [[Session.subscribe]] methods have been called passing *null* or *undefined* as `targetElement` parameter or when the MediaManager hass been
     * created by calling [[Stream.addVideoElement]]
     */
    targetElement?: HTMLElement;
    /**
     * The DOM HTMLVideoElement displaying the MediaManager's stream
     */
    video: HTMLVideoElement;
    /**
     * `id` attribute of the DOM HTMLVideoElement displaying the MediaManager's stream
     */
    id: string;
    /**
     * @hidden
     */
    isVideoElementCreated: boolean;
    protected ee: EventEmitter;
    protected customEe: EventEmitter;
    /**
     * @hidden
     */
    constructor(stream: Stream, targetElement?: HTMLElement | string);
    /**
     * See [[EventDispatcher.on]]
     */
    on(type: string, handler: (event: Event) => void): EventDispatcher;
    /**
     * See [[EventDispatcher.once]]
     */
    once(type: string, handler: (event: Event) => void): MediaManager;
    /**
     * See [[EventDispatcher.off]]
     */
    off(type: string, handler?: (event: Event) => void): MediaManager;
    /**
     * @hidden
     */
    insertVideo(targetElement?: HTMLElement, insertMode?: VideoInsertMode): HTMLVideoElement;
    /**
     * @hidden
     */
    insertVideoWithMode(insertMode: VideoInsertMode): void;
    /**
     * @hidden
     */
    removeVideo(): void;
    /**
     * @hidden
     */
    addOnCanPlayEvent(): void;
    private mirrorVideo();
}
