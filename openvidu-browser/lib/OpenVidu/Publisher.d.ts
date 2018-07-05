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
    private openvidu;
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
    constructor(targEl: string | HTMLElement, properties: PublisherProperties, openvidu: OpenVidu);
    /**
     * Publish or unpublish the audio stream (if available). Calling this method twice in a row passing same value will have no effect
     * @param value `true` to publish the audio stream, `false` to unpublish it
     */
    publishAudio(value: boolean): void;
    /**
     * Publish or unpublish the video stream (if available). Calling this method twice in a row passing same value will have no effect
     * @param value `true` to publish the video stream, `false` to unpublish it
     */
    publishVideo(value: boolean): void;
    /**
     * Call this method before [[Session.publish]] to subscribe to your Publisher's remote stream instead of using the local stream, as any other user would do.
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
    updateSession(session: Session): void;
    /**
     * @hidden
     */
    emitEvent(type: string, eventArray: any[]): void;
    /**
     * @hidden
     */
    reestablishStreamPlayingEvent(): void;
    private setPermissionDialogTimer;
    private clearPermissionDialogTimer;
}
