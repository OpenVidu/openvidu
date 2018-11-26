import { Stream } from './Stream';
import { EventDispatcher } from '../OpenViduInternal/Interfaces/Public/EventDispatcher';
import { StreamManagerVideo } from '../OpenViduInternal/Interfaces/Public/StreamManagerVideo';
import { Event } from '../OpenViduInternal/Events/Event';
import { VideoInsertMode } from '../OpenViduInternal/Enums/VideoInsertMode';
import EventEmitter = require('wolfy87-eventemitter');
/**
 * Interface in charge of displaying the media streams in the HTML DOM. This wraps any [[Publisher]] and [[Subscriber]] object.
 * You can insert as many video players fo the same Stream as you want by calling [[StreamManager.addVideoElement]] or
 * [[StreamManager.createVideoElement]].
 *
 * The use of StreamManager wrapper is particularly useful when you don't need to differentiate between Publisher or Subscriber streams or just
 * want to directly manage your own video elements (even more than one video element per Stream). This scenario is pretty common in
 * declarative, MVC frontend frameworks such as Angular, React or Vue.js
 */
export declare class StreamManager implements EventDispatcher {
    /**
     * The Stream represented in the DOM by the Publisher/Subscriber
     */
    stream: Stream;
    /**
     * All the videos displaying the Stream of this Publisher/Subscriber
     */
    videos: StreamManagerVideo[];
    /**
     * Whether the Stream represented in the DOM is local or remote
     * - `false` for [[Publisher]]
     * - `true` for [[Subscriber]]
     */
    remote: boolean;
    /**
     * The DOM HTMLElement assigned as target element when creating the video for the Publisher/Subscriber. This property is only defined if:
     * - [[Publisher]] has been initialized by calling method [[OpenVidu.initPublisher]] with a valid `targetElement` parameter
     * - [[Subscriber]] has been initialized by calling method [[Session.subscribe]] with a valid `targetElement` parameter
     */
    targetElement: HTMLElement;
    /**
     * `id` attribute of the DOM video element displaying the Publisher/Subscriber's stream. This property is only defined if:
     * - [[Publisher]] has been initialized by calling method [[OpenVidu.initPublisher]] with a valid `targetElement` parameter
     * - [[Subscriber]] has been initialized by calling method [[Session.subscribe]] with a valid `targetElement` parameter
     */
    id: string;
    /**
     * @hidden
     */
    firstVideoElement: StreamManagerVideo;
    /**
     * @hidden
     */
    lazyLaunchVideoElementCreatedEvent: boolean;
    /**
     * @hidden
     */
    element: HTMLElement;
    /**
     * @hidden
     */
    protected ee: EventEmitter;
    /**
     * @hidden
     */
    protected canPlayListener: EventListenerOrEventListenerObject;
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
    once(type: string, handler: (event: Event) => void): StreamManager;
    /**
     * See [[EventDispatcher.off]]
     */
    off(type: string, handler?: (event: Event) => void): StreamManager;
    /**
     * Makes `video` element parameter display this [[stream]]. This is useful when you are
     * [managing the video elements on your own](/docs/how-do-i/manage-videos/#you-take-care-of-the-video-players)
     *
     * Calling this method with a video already added to other Publisher/Subscriber will cause the video element to be
     * disassociated from that previous Publisher/Subscriber and to be associated to this one.
     *
     * @returns 1 if the video wasn't associated to any other Publisher/Subscriber and has been successfully added to this one.
     * 0 if the video was already added to this Publisher/Subscriber. -1 if the video was previously associated to any other
     * Publisher/Subscriber and has been successfully disassociated from that one and properly added to this one.
     */
    addVideoElement(video: HTMLVideoElement): number;
    /**
     * Creates a new video element displaying this [[stream]]. This allows you to have multiple video elements displaying the same media stream.
     *
     * #### Events dispatched
     *
     * The Publisher/Subscriber object will dispatch a `videoElementCreated` event once the HTML video element has been added to DOM. See [[VideoElementEvent]]
     *
     * @param targetElement HTML DOM element (or its `id` attribute) in which the video element of the Publisher/Subscriber will be inserted
     * @param insertMode How the video element will be inserted accordingly to `targetElemet`
     */
    createVideoElement(targetElement?: string | HTMLElement, insertMode?: VideoInsertMode): HTMLVideoElement;
    /**
     * @hidden
     */
    initializeVideoProperties(video: HTMLVideoElement): void;
    /**
     * @hidden
     */
    removeAllVideos(): void;
    /**
     * @hidden
     */
    disassociateVideo(video: HTMLVideoElement): boolean;
    /**
     * @hidden
     */
    addPlayEventToFirstVideo(): void;
    /**
     * @hidden
     */
    updateMediaStream(mediaStream: MediaStream): void;
    /**
     * @hidden
     */
    emitEvent(type: string, eventArray: any[]): void;
    private pushNewStreamManagerVideo;
    private mirrorVideo;
    private removeMirrorVideo;
}
