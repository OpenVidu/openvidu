import { Connection } from './Connection';
import { OpenVidu } from './OpenVidu';
import { Publisher } from './Publisher';
import { Stream } from './Stream';
import { StreamManager } from './StreamManager';
import { Subscriber } from './Subscriber';
import { Capabilities } from '../OpenViduInternal/Interfaces/Public/Capabilities';
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
 * Participants who publish their videos to a session can be seen by the rest of users connected to that specific session.
 * Initialized with [[OpenVidu.initSession]] method
 */
export declare class Session implements EventDispatcher {
    /**
     * Local connection to the Session. This object is defined only after [[Session.connect]] has been successfully executed, and can be retrieved subscribing to `connectionCreated` event
     */
    connection: Connection;
    /**
     * Unique identifier of the Session
     */
    sessionId: string;
    /**
     * Collection of all StreamManagers of this Session ([[Publisher]] and [[Subscriber]])
     */
    streamManagers: StreamManager[];
    /**
     * Object defining the methods that the client is able to call. These are defined by the role of the token used to connect to the Session.
     * This object is only defined after [[Session.connect]] has been successfully resolved
     */
    capabilities: Capabilities;
    /**
     * @hidden
     */
    remoteStreamsCreated: ObjMap<boolean>;
    /**
     * @hidden
     */
    isFirstIonicIosSubscriber: boolean;
    /**
     * @hidden
     */
    countDownForIonicIosSubscribers: boolean;
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
     * and also deletes any HTML video element associated to each Subscriber (only those [created by OpenVidu Browser](/docs/how-do-i/manage-videos/#let-openvidu-take-care-of-the-video-players)).
     * For every video removed, each Subscriber object will dispatch a `videoElementDestroyed` event.
     * Call `event.preventDefault()` upon event `sessionDisconnected` to avoid this behavior and take care of disposing and cleaning all the Subscriber objects yourself.
     * See [[SessionDisconnectedEvent]] and [[VideoElementEvent]] to learn more to learn more.
     *
     * The [[Publisher]] object of the local participant will dispatch a `streamDestroyed` event if there is a [[Publisher]] object publishing to the session.
     * This event will automatically stop all media tracks and delete any HTML video element associated to it (only those [created by OpenVidu Browser](/docs/how-do-i/manage-videos/#let-openvidu-take-care-of-the-video-players)).
     * For every video removed, the Publisher object will dispatch a `videoElementDestroyed` event.
     * Call `event.preventDefault()` upon event `streamDestroyed` if you want to clean the Publisher object on your own or re-publish it in a different Session (to do so it is a mandatory requirement to call `Session.unpublish()`
     * or/and `Session.disconnect()` in the previous session). See [[StreamEvent]] and [[VideoElementEvent]] to learn more.
     *
     * The [[Session]] object of every other participant connected to the session will dispatch a `streamDestroyed` event if the disconnected participant was publishing.
     * This event will automatically unsubscribe the Subscriber object from the session (this includes closing the WebRTCPeer connection and disposing all MediaStreamTracks)
     * and also deletes any HTML video element associated to that Subscriber (only those [created by OpenVidu Browser](/docs/how-do-i/manage-videos/#let-openvidu-take-care-of-the-video-players)).
     * For every video removed, the Subscriber object will dispatch a `videoElementDestroyed` event.
     * Call `event.preventDefault()` upon event `streamDestroyed` to avoid this default behavior and take care of disposing and cleaning the Subscriber object yourself.
     * See [[StreamEvent]] and [[VideoElementEvent]] to learn more.
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
     * Unsubscribes from `subscriber`, automatically removing its associated HTML video elements.
     *
     * #### Events dispatched
     *
     * The [[Subscriber]] object will dispatch a `videoElementDestroyed` event for each video associated to it that was removed from DOM.
     * Only videos [created by OpenVidu Browser](/docs/how-do-i/manage-videos/#let-openvidu-take-care-of-the-video-players)) will be automatically removed
     *
     * See [[VideoElementEvent]] to learn more
     */
    unsubscribe(subscriber: Subscriber): void;
    /**
     * Publishes to the Session the Publisher object
     *
     * #### Events dispatched
     *
     * The local [[Publisher]] object will dispatch a `streamCreated` event upon successful termination of this method. See [[StreamEvent]] to learn more.
     *
     * The local [[Publisher]] object will dispatch a `streamPlaying` once the media stream starts playing. See [[StreamManagerEvent]] to learn more.
     *
     * The [[Session]] object of every other participant connected to the session will dispatch a `streamCreated` event so they can subscribe to it. See [[StreamEvent]] to learn more.
     *
     * @returns A Promise (to which you can optionally subscribe to) that is resolved only after the publisher was successfully published and rejected with an Error object if not
     */
    publish(publisher: Publisher): Promise<any>;
    /**
     * Unpublishes from the Session the Publisher object.
     *
     * #### Events dispatched
     *
     * The [[Publisher]] object of the local participant will dispatch a `streamDestroyed` event.
     * This event will automatically stop all media tracks and delete any HTML video element associated to this Publisher
     * (only those videos [created by OpenVidu Browser](/docs/how-do-i/manage-videos/#let-openvidu-take-care-of-the-video-players)).
     * For every video removed, the Publisher object will dispatch a `videoElementDestroyed` event.
     * Call `event.preventDefault()` upon event `streamDestroyed` if you want to clean the Publisher object on your own or re-publish it in a different Session.
     *
     * The [[Session]] object of every other participant connected to the session will dispatch a `streamDestroyed` event.
     * This event will automatically unsubscribe the Subscriber object from the session (this includes closing the WebRTCPeer connection and disposing all MediaStreamTracks) and
     * delete any HTML video element associated to it (only those [created by OpenVidu Browser](/docs/how-do-i/manage-videos/#let-openvidu-take-care-of-the-video-players)).
     * For every video removed, the Subscriber object will dispatch a `videoElementDestroyed` event.
     * Call `event.preventDefault()` upon event `streamDestroyed` to avoid this default behavior and take care of disposing and cleaning the Subscriber object on your own.
     *
     * See [[StreamEvent]] and [[VideoElementEvent]] to learn more.
     */
    unpublish(publisher: Publisher): void;
    /**
     * Forces some user to leave the session
     *
     * #### Events dispatched
     *
     * The behavior is the same as when some user calls [[Session.disconnect]], but `reason` property in all events will be `"forceDisconnectByUser"`.
     *
     * The [[Session]] object of every participant will dispatch a `streamDestroyed` event if the evicted user was publishing a stream, with property `reason` set to `"forceDisconnectByUser"`.
     * The [[Session]] object of every participant except the evicted one will dispatch a `connectionDestroyed` event for the evicted user, with property `reason` set to `"forceDisconnectByUser"`.
     *
     * If any, the [[Publisher]] object of the evicted participant will also dispatch a `streamDestroyed` event with property `reason` set to `"forceDisconnectByUser"`.
     * The [[Session]] object of the evicted participant will dispatch a `sessionDisconnected` event with property `reason` set to `"forceDisconnectByUser"`.
     *
     * See [[StreamEvent]], [[ConnectionEvent]] and [[SessionDisconnectedEvent]] to learn more.
     *
     * @returns A Promise (to which you can optionally subscribe to) that is resolved only after the participant has been successfully evicted from the session and rejected with an Error object if not
     */
    forceDisconnect(connection: Connection): Promise<any>;
    /**
     * Forces some user to unpublish a Stream
     *
     * #### Events dispatched
     *
     * The behavior is the same as when some user calls [[Session.unpublish]], but `reason` property in all events will be `"forceUnpublishByUser"`
     *
     * The [[Session]] object of every participant will dispatch a `streamDestroyed` event with property `reason` set to `"forceDisconnectByUser"`
     *
     * The [[Publisher]] object of the affected participant will also dispatch a `streamDestroyed` event with property `reason` set to `"forceDisconnectByUser"`
     *
     * See [[StreamEvent]] to learn more.
     *
     * @returns A Promise (to which you can optionally subscribe to) that is resolved only after the remote Stream has been successfully unpublished from the session and rejected with an Error object if not
     */
    forceUnpublish(stream: Stream): Promise<any>;
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
    onStreamPropertyChanged(msg: any): void;
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
    onLostConnection(reason: any): void;
    /**
     * @hidden
     */
    onRecoveredConnection(): void;
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
     * response = {connectionId: string, streamId: string, type: string, data: Object}
     */
    onFilterEventDispatched(response: any): void;
    /**
     * @hidden
     */
    emitEvent(type: string, eventArray: any[]): void;
    /**
     * @hidden
     */
    leave(forced: boolean, reason: string): void;
    private connectAux;
    private stopPublisherStream;
    private stringClientMetadata;
    private getConnection;
    private getRemoteConnection;
    private processToken;
}
