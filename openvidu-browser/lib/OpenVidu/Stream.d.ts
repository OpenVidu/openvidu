import { Connection } from './Connection';
import { Session } from './Session';
import { StreamManager } from './StreamManager';
import { InboundStreamOptions } from '../OpenViduInternal/Interfaces/Private/InboundStreamOptions';
import { OutboundStreamOptions } from '../OpenViduInternal/Interfaces/Private/OutboundStreamOptions';
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
     * Unique identifier of the stream
     */
    streamId: string;
    /**
     * `"CAMERA"` or `"SCREEN"`. *undefined* if stream is audio-only
     */
    typeOfVideo?: string;
    /**
     * StreamManager object ([[Publisher]] or [[Subscriber]]) in charge of displaying this stream in the DOM
     */
    streamManager: StreamManager;
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
    getWebRtcPeer(): any;
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
    private initWebRtcPeerSend();
    private initWebRtcPeerReceive();
    private processSdpAnswer(sdpAnswer);
    private initWebRtcStats();
    private stopWebRtcStats();
    /**
     * @hidden
     */
    isLocal(): boolean;
}
