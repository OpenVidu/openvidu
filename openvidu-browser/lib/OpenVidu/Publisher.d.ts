/// <reference types="node" />
import { OpenVidu } from './OpenVidu';
import { Session } from './Session';
import { StreamManager } from './StreamManager';
import { EventDispatcher } from '../OpenViduInternal/Interfaces/Public/EventDispatcher';
import { PublisherProperties } from '../OpenViduInternal/Interfaces/Public/PublisherProperties';
import { Event } from '../OpenViduInternal/Events/Event';
/**
 * Packs local media streams. Participants can publish it to a session. Initialized with [[OpenVidu.initPublisher]] method
 */
export declare class Publisher extends StreamManager {
    /**
     * Whether the Publisher has been granted access to the requested input devices or not
     */
    accessAllowed: boolean;
    /**
     * Whether you have called [[Publisher.subscribeToRemote]] with value `true` or `false` (*false* by default)
     */
    isSubscribedToRemote: boolean;
    /**
     * The [[Session]] to which the Publisher belongs
     */
    session: Session;
    private accessDenied;
    private properties;
    private permissionDialogTimeout;
    /**
     * @hidden
     */
    openvidu: OpenVidu;
    /**
     * @hidden
     */
    videoReference: HTMLVideoElement;
    /**
     * @hidden
     */
    screenShareResizeInterval: NodeJS.Timer;
    /**
     * @hidden
     */
    constructor(targEl: string | HTMLElement, properties: PublisherProperties, openvidu: OpenVidu);
    /**
     * Publish or unpublish the audio stream (if available). Calling this method twice in a row passing same value will have no effect
     *
     * #### Events dispatched
     *
     * > _Only if `Session.publish(Publisher)` has been called for this Publisher_
     *
     * The [[Session]] object of the local participant will dispatch a `streamPropertyChanged` event with `changedProperty` set to `"audioActive"` and `reason` set to `"publishAudio"`
     * The [[Publisher]] object of the local participant will also dispatch the exact same event
     *
     * The [[Session]] object of every other participant connected to the session will dispatch a `streamPropertyChanged` event with `changedProperty` set to `"audioActive"` and `reason` set to `"publishAudio"`
     * The respective [[Subscriber]] object of every other participant receiving this Publisher's stream will also dispatch the exact same event
     *
     * See [[StreamPropertyChangedEvent]] to learn more.
     *
     * @param value `true` to publish the audio stream, `false` to unpublish it
     */
    publishAudio(value: boolean): void;
    /**
     * Publish or unpublish the video stream (if available). Calling this method twice in a row passing same value will have no effect
     *
     * #### Events dispatched
     *
     * > _Only if `Session.publish(Publisher)` has been called for this Publisher_
     *
     * The [[Session]] object of the local participant will dispatch a `streamPropertyChanged` event with `changedProperty` set to `"videoActive"` and `reason` set to `"publishVideo"`
     * The [[Publisher]] object of the local participant will also dispatch the exact same event
     *
     * The [[Session]] object of every other participant connected to the session will dispatch a `streamPropertyChanged` event with `changedProperty` set to `"videoActive"` and `reason` set to `"publishVideo"`
     * The respective [[Subscriber]] object of every other participant receiving this Publisher's stream will also dispatch the exact same event
     *
     * See [[StreamPropertyChangedEvent]] to learn more.
     *
     * @param value `true` to publish the video stream, `false` to unpublish it
     */
    publishVideo(value: boolean): void;
    /**
     * Call this method before [[Session.publish]] if you prefer to subscribe to your Publisher's remote stream instead of using the local stream, as any other user would do.
     */
    subscribeToRemote(value?: boolean): void;
    /**
     * See [[EventDispatcher.on]]
     */
    on(type: string, handler: (event: Event) => void): EventDispatcher;
    /**
     * See [[EventDispatcher.once]]
     */
    once(type: string, handler: (event: Event) => void): Publisher;
    /**
     * @hidden
     */
    initialize(): Promise<any>;
    /**
     * @hidden
     */
    reestablishStreamPlayingEvent(): void;
    private setPermissionDialogTimer;
    private clearPermissionDialogTimer;
}
