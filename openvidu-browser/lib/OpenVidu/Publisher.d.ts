import { OpenVidu, Session, Stream } from '..';
import { EventDispatcher } from '../OpenViduInternal/Interfaces/Public/EventDispatcher';
import { PublisherProperties } from '../OpenViduInternal/Interfaces/Public/PublisherProperties';
import { StreamEvent } from '../OpenViduInternal/Events/StreamEvent';
import { VideoElementEvent } from '../OpenViduInternal/Events/VideoElementEvent';
/**
 * Packs local media streams. Participants can publish it to a session. Initialized with [[OpenVidu.initPublisher]] method
 */
export declare class Publisher implements EventDispatcher {
    private openvidu;
    /**
     * Whether the Publisher has been granted access to the requested input devices or not
     */
    accessAllowed: boolean;
    /**
     * HTML DOM element in which the Publisher's video has been inserted
     */
    element: HTMLElement;
    /**
     * DOM id of the Publisher's video element
     */
    id: string;
    /**
     * The [[Session]] to which the Publisher belongs
     */
    session: Session;
    /**
     * The [[Stream]] that you are publishing
     */
    stream: Stream;
    private ee;
    private properties;
    private permissionDialogTimeout;
    /**
     * @hidden
     */
    constructor(targetElement: string | HTMLElement, properties: PublisherProperties, openvidu: OpenVidu);
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
     * Call this method before [[Session.publish]] to subscribe to your Publisher's stream as any other user would do. The local video will be automatically replaced by the remote video
     */
    subscribeToRemote(): void;
    /**
     * See [[EventDispatcher.on]]
     */
    on(type: string, handler: (event: StreamEvent | VideoElementEvent) => void): EventDispatcher;
    /**
     * See [[EventDispatcher.once]]
     */
    once(type: string, handler: (event: StreamEvent | VideoElementEvent) => void): Publisher;
    /**
     * See [[EventDispatcher.off]]
     */
    off(type: string, handler?: (event: StreamEvent | VideoElementEvent) => void): Publisher;
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
    private setPermissionDialogTimer(waitTime);
    private clearPermissionDialogTimer(startTime, waitTime);
    private userMediaHasVideo(callback);
    private userMediaHasAudio(callback);
}
