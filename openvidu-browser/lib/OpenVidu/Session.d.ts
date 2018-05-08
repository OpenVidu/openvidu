import { Connection, OpenVidu, Publisher, Stream, Subscriber } from '..';
import { EventDispatcher } from '../OpenViduInternal/Interfaces/Public/EventDispatcher';
import { SignalOptions } from '../OpenViduInternal/Interfaces/Public/SignalOptions';
import { SubscriberProperties } from '../OpenViduInternal/Interfaces/Public/SubscriberProperties';
import { ConnectionOptions } from '../OpenViduInternal/Interfaces/Private/ConnectionOptions';
import { ObjMap } from '../OpenViduInternal/Interfaces/Private/ObjMap';
import { SessionOptions } from '../OpenViduInternal/Interfaces/Private/SessionOptions';
import { ConnectionEvent } from '../OpenViduInternal/Events/ConnectionEvent';
import { PublisherSpeakingEvent } from '../OpenViduInternal/Events/PublisherSpeakingEvent';
import { RecordingEvent } from '../OpenViduInternal/Events/RecordingEvent';
import { SessionDisconnectedEvent } from '../OpenViduInternal/Events/SessionDisconnectedEvent';
import { SignalEvent } from '../OpenViduInternal/Events/SignalEvent';
import { StreamEvent } from '../OpenViduInternal/Events/StreamEvent';
/**
 * Represents a video call. It can also be seen as a videoconference room where multiple users can connect.
 * Participants who publish their videos to a session will be seen by the rest of users connected to that specific session.
 * Initialized with [[OpenVidu.initSession]] method
 */
export declare class Session implements EventDispatcher {
    /**
     * Local connection to the Session. This object is defined only after [[Session.connect]] has been successfully executed, and can be retrieved subscribing to `connectionCreated` event
     */
    connection: Connection;
    /**
     * Unique identifier of the Session. This is the same value you pass when calling [[OpenVidu.initSession]]
     */
    sessionId: string;
    /**
     * @hidden
     */
    remoteStreamsCreated: ObjMap<boolean>;
    /**
     * @hidden
     */
    remoteConnections: ObjMap<Connection>;
    /**
     * @hidden
     */
    openvidu: OpenVidu;
    /**
     * @hidden
     */
    options: SessionOptions;
    /**
     * @hidden
     */
    speakingEventsEnabled: boolean;
    private ee;
    /**
     * @hidden
     */
    constructor(openvidu: OpenVidu);
    connect(token: string): Promise<any>;
    connect(token: string, metadata: any): Promise<any>;
    /**
     * Leaves the session, destroying all streams and deleting the user as a participant.
     *
     * #### Events dispatched
     *
     * The [[Session]] object of the local participant will dispatch a `sessionDisconnected` event.
     * This event will automatically unsubscribe the leaving participant from every Subscriber object of the session (this includes closing the WebRTCPeer connection and disposing all MediaStreamTracks)
     * and also delete the HTML video element associated to it.
     * Call `event.preventDefault()` to avoid this beahviour and take care of disposing and cleaning all the Subscriber objects yourself. See [[SessionDisconnectedEvent]] to learn more.
     *
     * The [[Publisher]] object of the local participant will dispatch a `streamDestroyed` event if there is a [[Publisher]] object publishing to the session.
     * This event will automatically stop all media tracks and delete the HTML video element associated to it.
     * Call `event.preventDefault()` if you want clean the Publisher object yourself or re-publish it in a different Session (to do so it is a mandatory
     * requirement to call `Session.unpublish()` or/and `Session.disconnect()` in the previous session). See [[StreamEvent]] to learn more.
     *
     * The [[Session]] object of every other participant connected to the session will dispatch a `streamDestroyed` event if the disconnected participant was publishing.
     * This event will automatically unsubscribe the Subscriber object from the session (this includes closing the WebRTCPeer connection and disposing all MediaStreamTracks)
     * and delete the HTML video element associated to it.
     * Call `event.preventDefault()` to avoid this default behaviour and take care of disposing and cleaning the Subscriber object yourself. See [[StreamEvent]] to learn more.
     *
     * The [[Session]] object of every other participant connected to the session will dispatch a `connectionDestroyed` event in any case. See [[ConnectionEvent]] to learn more.
     */
    disconnect(): void;
    subscribe(stream: Stream, targetElement: string | HTMLElement): Subscriber;
    subscribe(stream: Stream, targetElement: string | HTMLElement, properties: SubscriberProperties): Subscriber;
    subscribe(stream: Stream, targetElement: string | HTMLElement, completionHandler: (error: Error | undefined) => void): Subscriber;
    subscribe(stream: Stream, targetElement: string | HTMLElement, properties: SubscriberProperties, completionHandler: (error: Error | undefined) => void): Subscriber;
    /**
     * Promisified version of [[Session.subscribe]]
     */
    subscribeAsync(stream: Stream, targetElement: string | HTMLElement): Promise<Subscriber>;
    subscribeAsync(stream: Stream, targetElement: string | HTMLElement, properties: SubscriberProperties): Promise<Subscriber>;
    /**
     * Unsubscribes from `subscriber`, automatically removing its HTML video element.
     *
     * #### Events dispatched
     *
     * The [[Subscriber]] object will dispatch a `videoElementDestroyed` event (only if it previously dispatched a `videoElementCreated` event). See [[VideoElementEvent]] to learn more
     */
    unsubscribe(subscriber: Subscriber): void;
    /**
     * Publishes the participant's audio-video stream contained in `publisher` object to the session
     *
     * #### Events dispatched
     *
     * The local [[Publisher]] object will dispatch a `streamCreated` event upon successful termination of this method. See [[StreamEvent]] to learn more.
     *
     * The local [[Publisher]] object will dispatch a `remoteVideoPlaying` event only if [[Publisher.subscribeToRemote]] was called before this method, once the remote video starts playing.
     * See [[VideoElementEvent]] to learn more.
     *
     * The [[Session]] object of every other participant connected to the session will dispatch a `streamCreated` event so they can subscribe to it. See [[StreamEvent]] to learn more.
     *
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the publisher was successfully published and rejected with an Error object if not
     */
    publish(publisher: Publisher): Promise<any>;
    /**
     * Unpublishes the participant's audio-video stream contained in `publisher` object.
     *
     * #### Events dispatched
     *
     * The [[Publisher]] object of the local participant will dispatch a `streamDestroyed` event.
     * This event will automatically stop all media tracks and delete the HTML video element associated to it.
     * Call `event.preventDefault()` if you want clean the Publisher object yourself or re-publish it in a different Session.
     *
     * The [[Session]] object of every other participant connected to the session will dispatch a `streamDestroyed` event.
     * This event will automatically unsubscribe the Subscriber object from the session (this includes closing the WebRTCPeer connection and disposing all MediaStreamTracks) and delete the HTML video element associated to it.
     * Call `event.preventDefault()` to avoid this default behaviour and take care of disposing and cleaning the Subscriber object yourself.
     *
     * See [[StreamEvent]] to learn more.
     */
    unpublish(publisher: Publisher): void;
    /**
     * Sends one signal. `signal` object has the following optional properties:
     * ```json
     * {data:string, to:Connection[], type:string}
     * ```
     * All users subscribed to that signal (`session.on('signal:type', ...)` or `session.on('signal', ...)` for all signals) and whose Connection objects are in `to` array will receive it. Their local
     * Session objects will dispatch a `signal` or `signal:type` event. See [[SignalEvent]] to learn more.
     *
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the message successfully reached openvidu-server and rejected with an Error object if not. _This doesn't
     * mean that openvidu-server could resend the message to all the listed receivers._
     */
    signal(signal: SignalOptions): Promise<any>;
    /**
     * See [[EventDispatcher.on]]
     */
    on(type: string, handler: (event: SessionDisconnectedEvent | SignalEvent | StreamEvent | ConnectionEvent | PublisherSpeakingEvent | RecordingEvent) => void): EventDispatcher;
    /**
     * See [[EventDispatcher.once]]
     */
    once(type: string, handler: (event: SessionDisconnectedEvent | SignalEvent | StreamEvent | ConnectionEvent | PublisherSpeakingEvent | RecordingEvent) => void): Session;
    /**
     * See [[EventDispatcher.off]]
     */
    off(type: string, handler?: (event: SessionDisconnectedEvent | SignalEvent | StreamEvent | ConnectionEvent | PublisherSpeakingEvent | RecordingEvent) => void): Session;
    /**
     * @hidden
     */
    onParticipantJoined(response: ConnectionOptions): void;
    /**
     * @hidden
     */
    onParticipantLeft(msg: any): void;
    /**
     * @hidden
     */
    onParticipantPublished(response: ConnectionOptions): void;
    /**
     * @hidden
     */
    onParticipantUnpublished(msg: any): void;
    /**
     * @hidden
     */
    onParticipantEvicted(msg: any): void;
    /**
     * @hidden
     */
    onNewMessage(msg: any): void;
    /**
     * @hidden
     */
    recvIceCandidate(msg: any): void;
    /**
     * @hidden
     */
    onSessionClosed(msg: any): void;
    /**
     * @hidden
     */
    onLostConnection(): void;
    /**
     * @hidden
     */
    onMediaError(params: any): void;
    /**
     * @hidden
     */
    onRecordingStarted(response: any): void;
    /**
     * @hidden
     */
    onRecordingStopped(response: any): void;
    /**
     * @hidden
     */
    emitEvent(type: string, eventArray: any[]): void;
    /**
     * @hidden
     */
    leave(forced: boolean, reason: string): void;
    private connectAux(token);
    private stringClientMetadata(metadata);
    private getConnection(connectionId, errorMessage);
    private getRemoteConnection(connectionId, errorMessage);
    private processToken(token);
}
