import { Connection } from './Connection';
import { Session } from './Session';
import { StreamManager } from './StreamManager';
import { InboundStreamOptions } from '../OpenViduInternal/Interfaces/Private/InboundStreamOptions';
import { OutboundStreamOptions } from '../OpenViduInternal/Interfaces/Private/OutboundStreamOptions';
import { WebRtcPeer } from '../OpenViduInternal/WebRtcPeer/WebRtcPeer';
import EventEmitter = require('wolfy87-eventemitter');
/**
 * Represents each one of the media streams available in OpenVidu Server for certain session.
 * Each [[Publisher]] and [[Subscriber]] has an attribute of type Stream, as they give access
 * to one of them (sending and receiving it, respectively)
 */
export declare class Stream {
    /**
     * The Connection object that is publishing the stream
     */
    connection: Connection;
    /**
     * Frame rate of the video in frames per second. This property is only defined if the [[Publisher]] of
     * the stream was initialized passing a _frameRate_ property on [[OpenVidu.initPublisher]] method
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
     * Whether the stream has the video track muted or unmuted. If [[hasVideo]] is false, this property is undefined.
     *
     * This property may change if the Publisher publishing the stream calls [[Publisher.publishVideo]]. Whenever this happens a [[StreamPropertyChangedEvent]] will be dispatched
     * by the Session object as well as by the affected Subscriber/Publisher object
     */
    videoActive: boolean;
    /**
     * Whether the stream has the audio track muted or unmuted. If [[hasAudio]] is false, this property is undefined
     *
     * This property may change if the Publisher publishing the stream calls [[Publisher.publishAudio]]. Whenever this happens a [[StreamPropertyChangedEvent]] will be dispatched
     * by the Session object as well as by the affected Subscriber/Publisher object
     */
    audioActive: boolean;
    /**
     * Unique identifier of the stream
     */
    streamId: string;
    /**
     * `"CAMERA"`, `"SCREEN"` or `"CUSTOM"` (the latter when [[PublisherProperties.videoSource]] is a MediaStreamTrack when calling [[OpenVidu.initPublisher]]).
     * If [[hasVideo]] is false, this property is undefined
     */
    typeOfVideo?: string;
    /**
     * StreamManager object ([[Publisher]] or [[Subscriber]]) in charge of displaying this stream in the DOM
     */
    streamManager: StreamManager;
    /**
     * Width and height in pixels of the encoded video stream. If [[hasVideo]] is false, this property is undefined
     *
     * This property may change if the Publisher that is publishing:
     * - If it is a mobile device, whenever the user rotates the device.
     * - If it is screen-sharing, whenever the user changes the size of the captured window.
     *
     * Whenever this happens a [[StreamPropertyChangedEvent]] will be dispatched by the Session object as well as by the affected Subscriber/Publisher object
     */
    videoDimensions: {
        width: number;
        height: number;
    };
    /**
     * @hidden
     */
    ee: EventEmitter;
    private webRtcPeer;
    private mediaStream;
    private webRtcStats;
    private isSubscribeToRemote;
    /**
     * @hidden
     */
    isLocalStreamReadyToPublish: boolean;
    /**
     * @hidden
     */
    isLocalStreamPublished: boolean;
    /**
     * @hidden
     */
    publishedOnce: boolean;
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
    updateMediaStreamInVideos(): void;
    /**
     * @hidden
     */
    getWebRtcPeer(): WebRtcPeer;
    /**
     * @hidden
     */
    getRTCPeerConnection(): RTCPeerConnection;
    /**
     * @hidden
     */
    subscribeToMyRemote(value: boolean): void;
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
    /**
     * @hidden
     */
    isLocal(): boolean;
    /**
     * @hidden
     */
    getSelectedIceCandidate(): Promise<any>;
    /**
     * @hidden
     */
    getRemoteIceCandidateList(): RTCIceCandidate[];
    /**
     * @hidden
     */
    getLocalIceCandidateList(): RTCIceCandidate[];
    private initWebRtcPeerSend;
    private initWebRtcPeerReceive;
    private remotePeerSuccessfullyEstablished;
    private initWebRtcStats;
    private stopWebRtcStats;
    private getIceServersConf;
}
