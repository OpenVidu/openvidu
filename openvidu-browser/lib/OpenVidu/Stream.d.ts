import { Connection } from './Connection';
import { Session } from './Session';
import { InboundStreamOptions } from '../OpenViduInternal/Interfaces/Private/InboundStreamOptions';
import { OutboundStreamOptions } from '../OpenViduInternal/Interfaces/Private/OutboundStreamOptions';
import { VideoInsertMode } from '../OpenViduInternal/Enums/VideoInsertMode';
/**
 * Represents each one of the videos send and receive by a user in a session.
 * Therefore each [[Publisher]] and [[Subscriber]] has an attribute of type Stream
 */
export declare class Stream {
    /**
     * The Connection object that is publishing the stream
     */
    connection: Connection;
    /**
     * Frame rate of the video in frames per second. This property is only defined if the [[Publisher]] of the stream was initialized passing a _frameRate_ property on [[OpenVidu.initPublisher]] method
     */
    frameRate?: number;
    /**
     * Whether the stream has a video track or not
     */
    hasVideo: boolean;
    /**
     * Whether the stream has an audio track or not
     */
    hasAudio: boolean;
    /**
     * Unique identifier of the stream
     */
    streamId: string;
    /**
     * `"CAMERA"` or `"SCREEN"`. undefined if stream is audio-only
     */
    typeOfVideo?: string;
    private ee;
    private webRtcPeer;
    private mediaStream;
    private video;
    private targetElement;
    private parentId;
    private webRtcStats;
    private isSubscribeToRemote;
    /**
     * @hidden
     */
    isReadyToPublish: boolean;
    /**
     * @hidden
     */
    isPublisherPublished: boolean;
    /**
     * @hidden
     */
    isVideoELementCreated: boolean;
    /**
     * @hidden
     */
    accessIsAllowed: boolean;
    /**
     * @hidden
     */
    accessIsDenied: boolean;
    /**
     * @hidden
     */
    session: Session;
    /**
     * @hidden
     */
    inboundStreamOpts: InboundStreamOptions;
    /**
     * @hidden
     */
    outboundStreamOpts: OutboundStreamOptions;
    /**
     * @hidden
     */
    speechEvent: any;
    /**
     * @hidden
     */
    constructor(session: Session, options: InboundStreamOptions | OutboundStreamOptions | {});
    /**
     * @hidden
     */
    getMediaStream(): MediaStream;
    /**
     * @hidden
     */
    setMediaStream(mediaStream: MediaStream): void;
    /**
     * @hidden
     */
    getWebRtcPeer(): any;
    /**
     * @hidden
     */
    getRTCPeerConnection(): RTCPeerConnection;
    /**
     * @hidden
     */
    getVideoElement(): HTMLVideoElement;
    /**
     * @hidden
     */
    subscribeToMyRemote(): void;
    /**
     * @hidden
     */
    setOutboundStreamOptions(outboundStreamOpts: OutboundStreamOptions): void;
    /**
     * @hidden
     */
    subscribe(): Promise<any>;
    /**
     * @hidden
     */
    publish(): Promise<any>;
    /**
     * @hidden
     */
    disposeWebRtcPeer(): void;
    /**
     * @hidden
     */
    disposeMediaStream(): void;
    /**
     * @hidden
     */
    displayMyRemote(): boolean;
    /**
     * @hidden
     */
    on(eventName: string, listener: any): void;
    /**
     * @hidden
     */
    once(eventName: string, listener: any): void;
    /**
     * @hidden
     */
    insertVideo(targetElement?: HTMLElement, insertMode?: VideoInsertMode): HTMLVideoElement;
    /**
     * @hidden
     */
    removeVideo(): void;
    /**
     * @hidden
     */
    isSendAudio(): boolean;
    /**
     * @hidden
     */
    isSendVideo(): boolean;
    /**
     * @hidden
     */
    isSendScreen(): boolean;
    /**
     * @hidden
     */
    emitEvent(type: string, eventArray: any[]): void;
    /**
     * @hidden
     */
    setSpeechEventIfNotExists(): void;
    /**
     * @hidden
     */
    enableSpeakingEvents(): void;
    /**
     * @hidden
     */
    enableOnceSpeakingEvents(): void;
    /**
     * @hidden
     */
    disableSpeakingEvents(): void;
    private initWebRtcPeerSend();
    private initWebRtcPeerReceive();
    private processSdpAnswer(sdpAnswer);
    private initWebRtcStats();
    private stopWebRtcStats();
    private isLocal();
    private insertElementWithMode(element, insertMode);
    private mirrorVideo(video);
}
