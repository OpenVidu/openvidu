/*
 * (C) Copyright 2017-2022 OpenVidu (https://openvidu.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { Connection } from './Connection';
import { Filter } from './Filter';
import { OpenVidu } from './OpenVidu';
import { Publisher } from './Publisher';
import { Stream } from './Stream';
import { StreamManager } from './StreamManager';
import { Subscriber } from './Subscriber';
import { Capabilities } from '../OpenViduInternal/Interfaces/Public/Capabilities';
import { EventDispatcher } from './EventDispatcher';
import { SignalOptions } from '../OpenViduInternal/Interfaces/Public/SignalOptions';
import { SubscriberProperties } from '../OpenViduInternal/Interfaces/Public/SubscriberProperties';
import { RemoteConnectionOptions } from '../OpenViduInternal/Interfaces/Private/RemoteConnectionOptions';
import { LocalConnectionOptions } from '../OpenViduInternal/Interfaces/Private/LocalConnectionOptions';
import { SessionOptions } from '../OpenViduInternal/Interfaces/Private/SessionOptions';
import { SessionEventMap } from '../OpenViduInternal/Events/EventMap/SessionEventMap';
import { ConnectionEvent } from '../OpenViduInternal/Events/ConnectionEvent';
import { FilterEvent } from '../OpenViduInternal/Events/FilterEvent';
import { RecordingEvent } from '../OpenViduInternal/Events/RecordingEvent';
import { SessionDisconnectedEvent } from '../OpenViduInternal/Events/SessionDisconnectedEvent';
import { SignalEvent } from '../OpenViduInternal/Events/SignalEvent';
import { SpeechToTextEvent } from '../OpenViduInternal/Events/SpeechToTextEvent';
import { StreamEvent } from '../OpenViduInternal/Events/StreamEvent';
import { StreamPropertyChangedEvent } from '../OpenViduInternal/Events/StreamPropertyChangedEvent';
import { ConnectionPropertyChangedEvent } from '../OpenViduInternal/Events/ConnectionPropertyChangedEvent';
import { NetworkQualityLevelChangedEvent } from '../OpenViduInternal/Events/NetworkQualityLevelChangedEvent';
import { OpenViduError, OpenViduErrorName } from '../OpenViduInternal/Enums/OpenViduError';
import { VideoInsertMode } from '../OpenViduInternal/Enums/VideoInsertMode';
import { OpenViduLogger } from '../OpenViduInternal/Logger/OpenViduLogger';
import { PlatformUtils } from '../OpenViduInternal/Utils/Platform';
import { StreamPropertyChangedEventReason, ChangedPropertyType, RecordingEventReason, ConnectionEventReason, StreamEventReason } from '../OpenViduInternal/Events/Types/Types';
/**
 * @hidden
 */
import semverMajor = require('semver/functions/major');
/**
 * @hidden
 */
import semverMinor = require('semver/functions/minor');
import { ExceptionEvent, ExceptionEventName } from '../OpenViduInternal/Events/ExceptionEvent';

/**
 * @hidden
 */
const logger: OpenViduLogger = OpenViduLogger.getInstance();

/**
 * @hidden
 */
let platform: PlatformUtils;

/**
 * Represents a video call. It can also be seen as a videoconference room where multiple users can connect.
 * Participants who publish their videos to a session can be seen by the rest of users connected to that specific session.
 * Initialized with {@link OpenVidu.initSession} method.
 *
 * See available event listeners at {@link SessionEventMap}.
 */
export class Session extends EventDispatcher {
    /**
     * Local connection to the Session. This object is defined only after {@link Session.connect} has been successfully executed, and can be retrieved subscribing to `connectionCreated` event
     */
    connection: Connection;

    /**
     * Unique identifier of the Session
     */
    sessionId: string;

    /**
     * Collection of all StreamManagers of this Session ({@link Publisher} and {@link Subscriber})
     */
    streamManagers: StreamManager[] = [];

    /**
     * Object defining the methods that the client is able to call. These are defined by the {@link Connection.role}.
     * This object is only defined after {@link Session.connect} has been successfully resolved
     */
    capabilities: Capabilities;

    // This map is only used to avoid race condition between 'joinRoom' response and 'onParticipantPublished' notification
    /**
     * @hidden
     */
    remoteStreamsCreated: Map<string, boolean> = new Map();

    /**
     * @hidden
     */
    remoteConnections: Map<string, Connection> = new Map();
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
    token: string;
    /**
     * @hidden
     */
    private videoDataInterval: NodeJS.Timeout;
    /**
     * @hidden
     */
    private videoDataTimeout: NodeJS.Timeout;

    /**
     * @hidden
     */
    constructor(openvidu: OpenVidu) {
        super();
        platform = PlatformUtils.getInstance();
        this.openvidu = openvidu;
    }

    connect(token: string): Promise<any>;
    connect(token: string, metadata: any): Promise<any>;

    /**
     * Connects to the session using `token`. Parameter `metadata` allows you to pass extra data to share with other users when
     * they receive `streamCreated` event. The structure of `metadata` string is up to you (maybe some standardized format
     * as JSON or XML is a good idea).
     *
     * This metadata is not considered secure, as it is generated in the client side. To pass secure data, add it as a parameter in the
     * token generation operation (through the API REST, openvidu-java-client or openvidu-node-client).
     *
     * Only after the returned Promise is successfully resolved {@link Session.connection} object will be available and properly defined.
     *
     * #### Events dispatched
     *
     * The {@link Session} object of the local participant will first dispatch one or more `connectionCreated` events upon successful termination of this method:
     * - First one for your own local Connection object, so you can retrieve {@link Session.connection} property.
     * - Then one for each remote Connection previously connected to the Session, if any. Any other remote user connecting to the Session after you have
     * successfully connected will also dispatch a `connectionCreated` event when they do so.
     *
     * The {@link Session} object of the local participant will also dispatch a `streamCreated` event for each remote active {@link Publisher} that was already streaming
     * when connecting, just after dispatching all remote `connectionCreated` events.
     *
     * The {@link Session} object of every other participant connected to the session will dispatch a `connectionCreated` event.
     *
     * See {@link ConnectionEvent} and {@link StreamEvent} to learn more.
     *
     * @returns A Promise to which you must subscribe that is resolved if the the connection to the Session was successful and rejected with an Error object if not
     *
     */
    connect(token: string, metadata?: any): Promise<void> {
        return new Promise((resolve, reject) => {
            this.processToken(token);

            if (this.openvidu.checkSystemRequirements()) {
                // Early configuration to deactivate automatic subscription to streams
                this.options = {
                    sessionId: this.sessionId,
                    participantId: token,
                    metadata: !!metadata ? this.stringClientMetadata(metadata) : ''
                };
                this.connectAux(token)
                    .then(() => resolve())
                    .catch((error) => reject(error));
            } else {
                return reject(
                    new OpenViduError(
                        OpenViduErrorName.BROWSER_NOT_SUPPORTED,
                        'Browser ' +
                        platform.getName() +
                        ' (version ' +
                        platform.getVersion() +
                        ') for ' +
                        platform.getFamily() +
                        ' is not supported in OpenVidu'
                    )
                );
            }
        });
    }

    /**
     * Leaves the session, destroying all streams and deleting the user as a participant.
     *
     * #### Events dispatched
     *
     * The {@link Session} object of the local participant will dispatch a `sessionDisconnected` event.
     * This event will automatically unsubscribe the leaving participant from every Subscriber object of the session (this includes closing the RTCPeerConnection and disposing all MediaStreamTracks)
     * and also deletes any HTML video element associated to each Subscriber (only those [created by OpenVidu Browser](/en/stable/cheatsheet/manage-videos/#let-openvidu-take-care-of-the-video-players)).
     * For every video removed, each Subscriber object will dispatch a `videoElementDestroyed` event.
     * Call `event.preventDefault()` upon event `sessionDisconnected` to avoid this behavior and take care of disposing and cleaning all the Subscriber objects yourself.
     * See {@link SessionDisconnectedEvent} and {@link VideoElementEvent} to learn more.
     *
     * The {@link Publisher} object of the local participant will dispatch a `streamDestroyed` event if there is a {@link Publisher} object publishing to the session.
     * This event will automatically stop all media tracks and delete any HTML video element associated to it (only those [created by OpenVidu Browser](/en/stable/cheatsheet/manage-videos/#let-openvidu-take-care-of-the-video-players)).
     * For every video removed, the Publisher object will dispatch a `videoElementDestroyed` event.
     * Call `event.preventDefault()` upon event `streamDestroyed` if you want to clean the Publisher object on your own or re-publish it in a different Session (to do so it is a mandatory requirement to call `Session.unpublish()`
     * or/and `Session.disconnect()` in the previous session). See {@link StreamEvent} and {@link VideoElementEvent} to learn more.
     *
     * The {@link Session} object of every other participant connected to the session will dispatch a `streamDestroyed` event if the disconnected participant was publishing.
     * This event will automatically unsubscribe the Subscriber object from the session (this includes closing the RTCPeerConnection and disposing all MediaStreamTracks)
     * and also deletes any HTML video element associated to that Subscriber (only those [created by OpenVidu Browser](/en/stable/cheatsheet/manage-videos/#let-openvidu-take-care-of-the-video-players)).
     * For every video removed, the Subscriber object will dispatch a `videoElementDestroyed` event.
     * Call `event.preventDefault()` upon event `streamDestroyed` to avoid this default behavior and take care of disposing and cleaning the Subscriber object yourself.
     * See {@link StreamEvent} and {@link VideoElementEvent} to learn more.
     *
     * The {@link Session} object of every other participant connected to the session will dispatch a `connectionDestroyed` event in any case. See {@link ConnectionEvent} to learn more.
     */
    disconnect(): void {
        this.leave(false, 'disconnect');
    }

    subscribe(stream: Stream, targetElement: string | HTMLElement | undefined): Subscriber;
    subscribe(stream: Stream, targetElement: string | HTMLElement | undefined, properties: SubscriberProperties): Subscriber;
    subscribe(
        stream: Stream,
        targetElement: string | HTMLElement | undefined,
        completionHandler: (error: Error | undefined) => void
    ): Subscriber;
    subscribe(
        stream: Stream,
        targetElement: string | HTMLElement | undefined,
        properties: SubscriberProperties,
        completionHandler: (error: Error | undefined) => void
    ): Subscriber;

    /**
     * Subscribes to a `stream`, adding a new HTML video element to DOM with `subscriberProperties` settings. This method is usually called in the callback of `streamCreated` event.
     *
     * #### Events dispatched
     *
     * The {@link Subscriber} object will dispatch a `videoElementCreated` event once the HTML video element has been added to DOM (only if you
     * [let OpenVidu take care of the video players](/en/stable/cheatsheet/manage-videos/#let-openvidu-take-care-of-the-video-players)). See {@link VideoElementEvent} to learn more.
     *
     * The {@link Subscriber} object will dispatch a `streamPlaying` event once the remote stream starts playing. See {@link StreamManagerEvent} to learn more.
     *
     * @param stream Stream object to subscribe to
     * @param targetElement HTML DOM element (or its `id` attribute) in which the video element of the Subscriber will be inserted (see {@link SubscriberProperties.insertMode}). If *null* or *undefined* no default video will be created for this Subscriber.
     * You can always call method {@link Subscriber.addVideoElement} or {@link Subscriber.createVideoElement} to manage the video elements on your own (see [Manage video players](/en/stable/cheatsheet/manage-videos) section)
     * @param completionHandler `error` parameter is null if `subscribe` succeeds, and is defined if it fails.
     */
    subscribe(
        stream: Stream,
        targetElement: string | HTMLElement | undefined,
        param3?: ((error: Error | undefined) => void) | SubscriberProperties,
        param4?: (error: Error | undefined) => void
    ): Subscriber {
        let properties: SubscriberProperties = {};
        if (!!param3 && typeof param3 !== 'function') {
            properties = {
                insertMode:
                    typeof param3.insertMode !== 'undefined'
                        ? typeof param3.insertMode === 'string'
                            ? VideoInsertMode[param3.insertMode]
                            : properties.insertMode
                        : VideoInsertMode.APPEND,
                subscribeToAudio: typeof param3.subscribeToAudio !== 'undefined' ? param3.subscribeToAudio : true,
                subscribeToVideo: typeof param3.subscribeToVideo !== 'undefined' ? param3.subscribeToVideo : true
            };
        } else {
            properties = {
                insertMode: VideoInsertMode.APPEND,
                subscribeToAudio: true,
                subscribeToVideo: true
            };
        }

        let completionHandler: ((error: Error | undefined) => void) | undefined = undefined;
        if (!!param3 && typeof param3 === 'function') {
            completionHandler = param3;
        } else if (!!param4) {
            completionHandler = param4;
        }

        if (!this.sessionConnected()) {
            if (completionHandler !== undefined) {
                completionHandler(this.notConnectedError());
            }
            throw this.notConnectedError();
        }

        logger.info('Subscribing to ' + stream.connection.connectionId);

        stream
            .subscribe()
            .then(() => {
                logger.info('Subscribed correctly to ' + stream.connection.connectionId);
                if (completionHandler !== undefined) {
                    completionHandler(undefined);
                }
            })
            .catch((error) => {
                if (completionHandler !== undefined) {
                    completionHandler(error);
                }
            });
        const subscriber = new Subscriber(stream, targetElement, properties);
        if (!!subscriber.targetElement) {
            stream.streamManager.createVideoElement(subscriber.targetElement, <VideoInsertMode>properties.insertMode);
        }
        return subscriber;
    }

    /**
     * Promisified version of {@link Session.subscribe}
     */
    subscribeAsync(stream: Stream, targetElement: string | HTMLElement): Promise<Subscriber>;
    subscribeAsync(stream: Stream, targetElement: string | HTMLElement, properties: SubscriberProperties): Promise<Subscriber>;

    subscribeAsync(stream: Stream, targetElement: string | HTMLElement, properties?: SubscriberProperties): Promise<Subscriber> {
        return new Promise<Subscriber>((resolve, reject) => {
            if (!this.sessionConnected()) {
                return reject(this.notConnectedError());
            }

            let subscriber: Subscriber;

            const callback = (error: Error) => {
                if (!!error) {
                    return reject(error);
                } else {
                    return resolve(subscriber);
                }
            };

            if (!!properties) {
                subscriber = this.subscribe(stream, targetElement, properties, callback);
            } else {
                subscriber = this.subscribe(stream, targetElement, callback);
            }
        });
    }

    /**
     * Unsubscribes from `subscriber`, automatically removing its associated HTML video elements.
     *
     * #### Events dispatched
     *
     * The {@link Subscriber} object will dispatch a `videoElementDestroyed` event for each video associated to it that was removed from DOM.
     * Only videos [created by OpenVidu Browser](/en/stable/cheatsheet/manage-videos/#let-openvidu-take-care-of-the-video-players)) will be automatically removed
     *
     * See {@link VideoElementEvent} to learn more
     */
    unsubscribe(subscriber: Subscriber): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.sessionConnected()) {
                return reject(this.notConnectedError());
            } else {
                const connectionId = subscriber.stream.connection.connectionId;

                logger.info('Unsubscribing from ' + connectionId);

                this.openvidu.sendRequest(
                    'unsubscribeFromVideo',
                    { sender: subscriber.stream.connection.connectionId },
                    (error, response) => {
                        if (error) {
                            logger.error('Error unsubscribing from ' + connectionId);
                            return reject(error);
                        } else {
                            logger.info('Unsubscribed correctly from ' + connectionId);
                            subscriber.stream.streamManager.removeAllVideos();
                            subscriber.stream.disposeWebRtcPeer();
                            subscriber.stream.disposeMediaStream();
                            return resolve();
                        }
                    }
                );
            }
        });
    }

    /**
     * Publishes to the Session the Publisher object
     *
     * #### Events dispatched
     *
     * The local {@link Publisher} object will dispatch a `streamCreated` event upon successful termination of this method. See {@link StreamEvent} to learn more.
     *
     * The local {@link Publisher} object will dispatch a `streamPlaying` once the media stream starts playing. See {@link StreamManagerEvent} to learn more.
     *
     * The {@link Session} object of every other participant connected to the session will dispatch a `streamCreated` event so they can subscribe to it. See {@link StreamEvent} to learn more.
     *
     * @returns A Promise (to which you can optionally subscribe to) that is resolved only after the publisher was successfully published and rejected with an Error object if not
     */
    publish(publisher: Publisher): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.sessionConnected()) {
                return reject(this.notConnectedError());
            }

            publisher.session = this;
            publisher.stream.session = this;

            if (!publisher.stream.publishedOnce) {
                // 'Session.unpublish(Publisher)' has NOT been called
                this.connection.addStream(publisher.stream);
                publisher.stream
                    .publish()
                    .then(() => {
                        this.sendVideoData(publisher, 8, true, 5);
                        return resolve();
                    })
                    .catch((error) => reject(error));
            } else {
                // 'Session.unpublish(Publisher)' has been called. Must initialize again Publisher
                publisher
                    .initialize()
                    .then(() => {
                        this.connection.addStream(publisher.stream);
                        publisher.reestablishStreamPlayingEvent();
                        publisher.stream
                            .publish()
                            .then(() => {
                                this.sendVideoData(publisher, 8, true, 5);
                                return resolve();
                            })
                            .catch((error) => reject(error));
                    })
                    .catch((error) => reject(error));
            }
        });
    }

    /**
     * Unpublishes from the Session the Publisher object.
     *
     * #### Events dispatched
     *
     * The {@link Publisher} object of the local participant will dispatch a `streamDestroyed` event.
     * This event will automatically stop all media tracks and delete any HTML video element associated to this Publisher
     * (only those videos [created by OpenVidu Browser](/en/stable/cheatsheet/manage-videos/#let-openvidu-take-care-of-the-video-players)).
     * For every video removed, the Publisher object will dispatch a `videoElementDestroyed` event.
     * Call `event.preventDefault()` upon event `streamDestroyed` if you want to clean the Publisher object on your own or re-publish it in a different Session.
     *
     * The {@link Session} object of every other participant connected to the session will dispatch a `streamDestroyed` event.
     * This event will automatically unsubscribe the Subscriber object from the session (this includes closing the RTCPeerConnection and disposing all MediaStreamTracks) and
     * delete any HTML video element associated to it (only those [created by OpenVidu Browser](/en/stable/cheatsheet/manage-videos/#let-openvidu-take-care-of-the-video-players)).
     * For every video removed, the Subscriber object will dispatch a `videoElementDestroyed` event.
     * Call `event.preventDefault()` upon event `streamDestroyed` to avoid this default behavior and take care of disposing and cleaning the Subscriber object on your own.
     *
     * See {@link StreamEvent} and {@link VideoElementEvent} to learn more.
     */
    unpublish(publisher: Publisher): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.sessionConnected()) {
                throw this.notConnectedError();
            }

            const stream = publisher.stream;

            if (!stream.connection) {
                return reject(new Error('The associated Connection object of this Publisher is null'));
            } else if (stream.connection !== this.connection) {
                return reject(
                    new Error(
                        'The associated Connection object of this Publisher is not your local Connection.  ' +
                        "Only moderators can force unpublish on remote Streams via 'forceUnpublish' method"
                    )
                );
            } else {
                logger.info('Unpublishing local media (' + stream.connection.connectionId + ')');

                this.openvidu.sendRequest('unpublishVideo', (error, response) => {
                    if (error) {
                        return reject(error);
                    } else {
                        logger.info('Media unpublished correctly');

                        stream.disposeWebRtcPeer();

                        if (stream.connection.stream == stream) {
                            // The Connection.stream may have changed if Session.publish was called with other Publisher
                            delete stream.connection.stream;
                        }

                        const streamEvent = new StreamEvent(true, publisher, 'streamDestroyed', publisher.stream, 'unpublish');
                        publisher.emitEvent('streamDestroyed', [streamEvent]);
                        streamEvent.callDefaultBehavior();

                        return resolve();
                    }
                });
            }
        });
    }

    /**
     * Forces some user to leave the session
     *
     * #### Events dispatched
     *
     * The behavior is the same as when some user calls {@link Session.disconnect}, but `reason` property in all events will be `"forceDisconnectByUser"`.
     *
     * The {@link Session} object of every participant will dispatch a `streamDestroyed` event if the evicted user was publishing a stream, with property `reason` set to `"forceDisconnectByUser"`.
     * The {@link Session} object of every participant except the evicted one will dispatch a `connectionDestroyed` event for the evicted user, with property `reason` set to `"forceDisconnectByUser"`.
     *
     * If any, the {@link Publisher} object of the evicted participant will also dispatch a `streamDestroyed` event with property `reason` set to `"forceDisconnectByUser"`.
     * The {@link Session} object of the evicted participant will dispatch a `sessionDisconnected` event with property `reason` set to `"forceDisconnectByUser"`.
     *
     * See {@link StreamEvent}, {@link ConnectionEvent} and {@link SessionDisconnectedEvent} to learn more.
     *
     * @returns A Promise (to which you can optionally subscribe to) that is resolved only after the participant has been successfully evicted from the session and rejected with an Error object if not
     */
    forceDisconnect(connection: Connection): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.sessionConnected()) {
                return reject(this.notConnectedError());
            }

            logger.info('Forcing disconnect for connection ' + connection.connectionId);
            this.openvidu.sendRequest('forceDisconnect', { connectionId: connection.connectionId }, (error, response) => {
                if (error) {
                    logger.error('Error forcing disconnect for Connection ' + connection.connectionId, error);
                    if (error.code === 401) {
                        return reject(
                            new OpenViduError(
                                OpenViduErrorName.OPENVIDU_PERMISSION_DENIED,
                                "You don't have permissions to force a disconnection"
                            )
                        );
                    } else {
                        return reject(error);
                    }
                } else {
                    logger.info('Forcing disconnect correctly for Connection ' + connection.connectionId);
                    return resolve();
                }
            });
        });
    }

    /**
     * Forces some user to unpublish a Stream
     *
     * #### Events dispatched
     *
     * The behavior is the same as when some user calls {@link Session.unpublish}, but `reason` property in all events will be `"forceUnpublishByUser"`
     *
     * The {@link Session} object of every participant will dispatch a `streamDestroyed` event with property `reason` set to `"forceDisconnectByUser"`
     *
     * The {@link Publisher} object of the affected participant will also dispatch a `streamDestroyed` event with property `reason` set to `"forceDisconnectByUser"`
     *
     * See {@link StreamEvent} to learn more.
     *
     * @returns A Promise (to which you can optionally subscribe to) that is resolved only after the remote Stream has been successfully unpublished from the session and rejected with an Error object if not
     */
    forceUnpublish(stream: Stream): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.sessionConnected()) {
                return reject(this.notConnectedError());
            }

            logger.info('Forcing unpublish for stream ' + stream.streamId);
            this.openvidu.sendRequest('forceUnpublish', { streamId: stream.streamId }, (error, response) => {
                if (error) {
                    logger.error('Error forcing unpublish for Stream ' + stream.streamId, error);
                    if (error.code === 401) {
                        return reject(
                            new OpenViduError(
                                OpenViduErrorName.OPENVIDU_PERMISSION_DENIED,
                                "You don't have permissions to force an unpublishing"
                            )
                        );
                    } else {
                        return reject(error);
                    }
                } else {
                    logger.info('Forcing unpublish correctly for Stream ' + stream.streamId);
                    return resolve();
                }
            });
        });
    }

    /**
     * Sends one signal. `signal` object has the following optional properties:
     * ```json
     * {data:string, to:Connection[], type:string}
     * ```
     * All users subscribed to that signal (`session.on('signal:type', ...)` or `session.on('signal', ...)` for all signals) and whose Connection objects are in `to` array will receive it. Their local
     * Session objects will dispatch a `signal` or `signal:type` event. See {@link SignalEvent} to learn more.
     *
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the message successfully reached openvidu-server and rejected with an Error object if not. _This doesn't
     * mean that openvidu-server could resend the message to all the listed receivers._
     */
    signal(signal: SignalOptions): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.sessionConnected()) {
                return reject(this.notConnectedError());
            }

            const signalMessage = {};

            if (signal.to && signal.to.length > 0) {
                const connectionIds: string[] = [];
                signal.to.forEach((connection) => {
                    if (!!connection.connectionId) {
                        connectionIds.push(connection.connectionId);
                    }
                });
                signalMessage['to'] = connectionIds;
            } else {
                signalMessage['to'] = [];
            }

            signalMessage['data'] = signal.data ? signal.data : '';

            let typeAux: string = signal.type ? signal.type : 'signal';
            if (!!typeAux) {
                if (typeAux.substring(0, 7) !== 'signal:') {
                    typeAux = 'signal:' + typeAux;
                }
            }
            signalMessage['type'] = typeAux;

            this.openvidu.sendRequest(
                'sendMessage',
                {
                    message: JSON.stringify(signalMessage)
                },
                (error, response) => {
                    if (!!error) {
                        return reject(error);
                    } else {
                        return resolve();
                    }
                }
            );
        });
    }

    /**
     * Subscribe to the Speech-To-Text events for this {@link Stream}. The Session object will emit {@link SpeechToTextEvent} for the Stream
     * when speech is detected in its audio track.
     *
     * @param stream - The Stream for which you want to start receiving {@link SpeechToTextEvent}.
     * @param lang - The language of the Stream's audio track. It must be a valid [BCP-47](https://tools.ietf.org/html/bcp47) language tag like "en-US" or "es-ES".
     * 
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the speech-to-text subscription
     * was successful and rejected with an Error object if not.
     */
    subscribeToSpeechToText(stream: Stream, lang: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.openvidu.sendRequest(
                'subscribeToSpeechToText',
                {
                    connectionId: stream.connection.connectionId,
                    lang
                },
                (error, response) => {
                    if (!!error) {
                        return reject(error);
                    } else {
                        return resolve();
                    }
                }
            );
        });
    }

    /**
     * Unsubscribe from the Speech-To-Text events for this {@link Stream}.
     *
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the speech-to-text subscription
     * was successful and rejected with an Error object if not.
     */
    unsubscribeFromSpeechToText(stream: Stream): Promise<void> {
        return new Promise((resolve, reject) => {
            this.openvidu.sendRequest(
                'unsubscribeFromSpeechToText',
                {
                    connectionId: stream.connection.connectionId
                },
                (error, response) => {
                    if (!!error) {
                        return reject(error);
                    } else {
                        return resolve();
                    }
                }
            );
        });
    }

    /**
     * See {@link EventDispatcher.on}
     */
    on<K extends keyof SessionEventMap>(type: K, handler: (event: SessionEventMap[K]) => void): this {
        super.onAux(type, "Event '" + type + "' triggered by 'Session'", handler);

        if (type === 'publisherStartSpeaking') {
            // If there are already available remote streams with audio, enable hark 'speaking' event in all of them
            this.remoteConnections.forEach((remoteConnection) => {
                if (!!remoteConnection.stream?.hasAudio) {
                    remoteConnection.stream.enableHarkSpeakingEvent();
                }
            });
            if (!!this.connection?.stream?.hasAudio) {
                // If connected to the Session and publishing with audio, also enable hark 'speaking' event for the Publisher
                this.connection.stream.enableHarkSpeakingEvent();
            }
        }
        if (type === 'publisherStopSpeaking') {
            // If there are already available remote streams with audio, enable hark 'stopped_speaking' event in all of them
            this.remoteConnections.forEach((remoteConnection) => {
                if (!!remoteConnection.stream?.hasAudio) {
                    remoteConnection.stream.enableHarkStoppedSpeakingEvent();
                }
            });
            if (!!this.connection?.stream?.hasAudio) {
                // If connected to the Session and publishing with audio, also enable hark 'stopped_speaking' event for the Publisher
                this.connection.stream.enableHarkStoppedSpeakingEvent();
            }
        }

        return this;
    }

    /**
     * See {@link EventDispatcher.once}
     */
    once<K extends keyof SessionEventMap>(type: K, handler: (event: SessionEventMap[K]) => void): this {
        super.onceAux(type, "Event '" + type + "' triggered once by 'Session'", handler);

        if (type === 'publisherStartSpeaking') {
            // If there are already available remote streams with audio, enable hark 'speaking' event (once) in all of them once
            this.remoteConnections.forEach((remoteConnection) => {
                if (!!remoteConnection.stream?.hasAudio) {
                    remoteConnection.stream.enableOnceHarkSpeakingEvent();
                }
            });
            if (!!this.connection?.stream?.hasAudio) {
                // If connected to the Session and publishing with audio, also enable hark 'speaking' event (once) for the Publisher
                this.connection.stream.enableOnceHarkSpeakingEvent();
            }
        }
        if (type === 'publisherStopSpeaking') {
            // If there are already available remote streams with audio, enable hark 'stopped_speaking' event (once) in all of them once
            this.remoteConnections.forEach((remoteConnection) => {
                if (!!remoteConnection.stream?.hasAudio) {
                    remoteConnection.stream.enableOnceHarkStoppedSpeakingEvent();
                }
            });
            if (!!this.connection?.stream?.hasAudio) {
                // If connected to the Session and publishing with audio, also enable hark 'stopped_speaking' event (once) for the Publisher
                this.connection.stream.enableOnceHarkStoppedSpeakingEvent();
            }
        }

        return this;
    }

    /**
     * See {@link EventDispatcher.off}
     */
    off<K extends keyof SessionEventMap>(type: K, handler?: (event: SessionEventMap[K]) => void): this {
        super.offAux(type, handler);

        if (type === 'publisherStartSpeaking') {
            // Check if Session object still has some listener for the event
            if (!this.anySpeechEventListenerEnabled('publisherStartSpeaking', false)) {
                this.remoteConnections.forEach((remoteConnection) => {
                    if (!!remoteConnection.stream?.streamManager) {
                        // Check if Subscriber object still has some listener for the event
                        if (!this.anySpeechEventListenerEnabled('publisherStartSpeaking', false, remoteConnection.stream.streamManager)) {
                            remoteConnection.stream.disableHarkSpeakingEvent(false);
                        }
                    }
                });
                if (!!this.connection?.stream?.streamManager) {
                    // Check if Publisher object still has some listener for the event
                    if (!this.anySpeechEventListenerEnabled('publisherStartSpeaking', false, this.connection.stream.streamManager)) {
                        this.connection.stream.disableHarkSpeakingEvent(false);
                    }
                }
            }
        }
        if (type === 'publisherStopSpeaking') {
            // Check if Session object still has some listener for the event
            if (!this.anySpeechEventListenerEnabled('publisherStopSpeaking', false)) {
                this.remoteConnections.forEach((remoteConnection) => {
                    if (!!remoteConnection.stream?.streamManager) {
                        // Check if Subscriber object still has some listener for the event
                        if (!this.anySpeechEventListenerEnabled('publisherStopSpeaking', false, remoteConnection.stream.streamManager)) {
                            remoteConnection.stream.disableHarkStoppedSpeakingEvent(false);
                        }
                    }
                });
                if (!!this.connection?.stream?.streamManager) {
                    // Check if Publisher object still has some listener for the event
                    if (!this.anySpeechEventListenerEnabled('publisherStopSpeaking', false, this.connection.stream.streamManager)) {
                        this.connection.stream.disableHarkStoppedSpeakingEvent(false);
                    }
                }
            }
        }
        return this;
    }

    /* Hidden methods */

    /**
     * @hidden
     */
    onParticipantJoined(event: RemoteConnectionOptions): void {
        // Connection shouldn't exist
        this.getConnection(event.id, '')
            .then((connection) => {
                logger.warn('Connection ' + connection.connectionId + ' already exists in connections list');
            })
            .catch((openViduError) => {
                const connection = new Connection(this, event);
                this.remoteConnections.set(event.id, connection);
                this.ee.emitEvent('connectionCreated', [new ConnectionEvent(false, this, 'connectionCreated', connection, '')]);
            });
    }

    /**
     * @hidden
     */
    onParticipantLeft(event: { connectionId: string; reason: ConnectionEventReason }): void {
        this.getRemoteConnection(event.connectionId, 'onParticipantLeft')
            .then((connection) => {
                if (!!connection.stream) {
                    const stream = connection.stream;

                    const streamEvent = new StreamEvent(true, this, 'streamDestroyed', stream, event.reason);
                    this.ee.emitEvent('streamDestroyed', [streamEvent]);
                    streamEvent.callDefaultBehavior();

                    this.remoteStreamsCreated.delete(stream.streamId);
                }
                connection.dispose();
                this.remoteConnections.delete(connection.connectionId);
                this.ee.emitEvent('connectionDestroyed', [
                    new ConnectionEvent(false, this, 'connectionDestroyed', connection, event.reason)
                ]);
            })
            .catch((openViduError) => {
                logger.error(openViduError);
            });
    }

    /**
     * @hidden
     */
    onParticipantPublished(event: RemoteConnectionOptions): void {
        const afterConnectionFound = (connection) => {
            this.remoteConnections.set(connection.connectionId, connection);

            if (!this.remoteStreamsCreated.get(connection.stream.streamId)) {
                // Avoid race condition between stream.subscribe() in "onParticipantPublished" and in "joinRoom" rpc callback
                // This condition is false if openvidu-server sends "participantPublished" event to a subscriber participant that has
                // already subscribed to certain stream in the callback of "joinRoom" method

                this.ee.emitEvent('streamCreated', [new StreamEvent(false, this, 'streamCreated', connection.stream, '')]);
            }

            this.remoteStreamsCreated.set(connection.stream.streamId, true);
        };

        // Get the existing Connection created on 'onParticipantJoined' for
        // existing participants or create a new one for new participants
        let connection: Connection;
        this.getRemoteConnection(event.id, 'onParticipantPublished')

            .then((con) => {
                // Update existing Connection
                connection = con;
                event.metadata = con.data;
                connection.remoteOptions = event;
                connection.initRemoteStreams(event.streams);
                afterConnectionFound(connection);
            })
            .catch((openViduError) => {
                // Create new Connection
                connection = new Connection(this, event);
                afterConnectionFound(connection);
            });
    }

    /**
     * @hidden
     */
    onParticipantUnpublished(event: { connectionId: string; reason: StreamEventReason }): void {
        if (event.connectionId === this.connection.connectionId) {
            // Your stream has been forcedly unpublished from the session
            this.stopPublisherStream(event.reason);
        } else {
            this.getRemoteConnection(event.connectionId, 'onParticipantUnpublished')

                .then((connection) => {
                    const streamEvent = new StreamEvent(true, this, 'streamDestroyed', connection.stream!, event.reason);
                    this.ee.emitEvent('streamDestroyed', [streamEvent]);
                    streamEvent.callDefaultBehavior();

                    // Deleting the remote stream if it exists
                    if (connection.stream != null) {
                        const streamId: string = connection.stream!.streamId;
                        this.remoteStreamsCreated.delete(streamId);
                        connection.removeStream();
                    }
                })
                .catch((openViduError) => {
                    logger.error(openViduError);
                });
        }
    }

    /**
     * @hidden
     */
    onParticipantEvicted(event: { connectionId: string; reason: ConnectionEventReason }): void {
        if (event.connectionId === this.connection.connectionId) {
            // You have been evicted from the session
            if (!!this.sessionId && !this.connection.disposed) {
                this.leave(true, event.reason);
            }
        }
    }

    /**
     * @hidden
     */
    onNewMessage(event: { type?: string; data?: string; from?: string }): void {
        logger.info('New signal: ' + JSON.stringify(event));

        const strippedType = !!event.type ? event.type.replace(/^(signal:)/, '') : undefined;

        if (!!event.from) {
            // Signal sent by other client
            this.getConnection(
                event.from,
                "Connection '" +
                event.from +
                "' unknown when 'onNewMessage'. Existing remote connections: " +
                JSON.stringify(this.remoteConnections.keys()) +
                '. Existing local connection: ' +
                this.connection.connectionId
            )

                .then((connection) => {
                    this.ee.emitEvent('signal', [new SignalEvent(this, strippedType, event.data, connection)]);
                    if (!!event.type && event.type !== 'signal') {
                        this.ee.emitEvent(event.type, [new SignalEvent(this, strippedType, event.data, connection)]);
                    }
                })
                .catch((openViduError) => {
                    logger.error(openViduError);
                });
        } else {
            // Signal sent by server
            this.ee.emitEvent('signal', [new SignalEvent(this, strippedType, event.data, undefined)]);
            if (!!event.type && event.type !== 'signal') {
                this.ee.emitEvent(event.type, [new SignalEvent(this, strippedType, event.data, undefined)]);
            }
        }
    }

    /**
     * @hidden
     */
    onStreamPropertyChanged(event: { connectionId: string; streamId: string; property: ChangedPropertyType; newValue: any; reason: StreamPropertyChangedEventReason }): void {
        const callback = (connection: Connection) => {
            if (!!connection.stream && connection.stream.streamId === event.streamId) {
                const stream = connection.stream;
                let oldValue;
                switch (event.property) {
                    case 'audioActive':
                        oldValue = stream.audioActive;
                        event.newValue = event.newValue === 'true';
                        stream.audioActive = event.newValue;
                        break;
                    case 'videoActive':
                        oldValue = stream.videoActive;
                        event.newValue = event.newValue === 'true';
                        stream.videoActive = event.newValue;
                        const videoTrack = stream?.getMediaStream()?.getVideoTracks()?.[0];
                        if(videoTrack && !videoTrack.enabled && stream.videoActive){
                            videoTrack.enabled = true;
                        }
                        break;
                    case 'videoTrack':
                        event.newValue = JSON.parse(event.newValue);
                        break;
                    case 'audioTrack':
                        event.newValue = JSON.parse(event.newValue);
                        break;
                    case 'videoDimensions':
                        oldValue = stream.videoDimensions;
                        event.newValue = JSON.parse(JSON.parse(event.newValue));
                        stream.videoDimensions = event.newValue;
                        break;
                    case 'filter':
                        oldValue = stream.filter;
                        event.newValue = Object.keys(event.newValue).length > 0 ? event.newValue : undefined;
                        if (event.newValue !== undefined) {
                            stream.filter = new Filter(event.newValue.type, event.newValue.options);
                            stream.filter.stream = stream;
                            if (event.newValue.lastExecMethod) {
                                stream.filter.lastExecMethod = event.newValue.lastExecMethod;
                            }
                        } else {
                            delete stream.filter;
                        }
                        event.newValue = stream.filter;
                        break;
                }
                this.ee.emitEvent('streamPropertyChanged', [
                    new StreamPropertyChangedEvent(this, stream, event.property, event.newValue, oldValue, event.reason)
                ]);
                if (!!stream.streamManager) {
                    stream.streamManager.emitEvent('streamPropertyChanged', [
                        new StreamPropertyChangedEvent(stream.streamManager, stream, event.property, event.newValue, oldValue, event.reason)
                    ]);
                }
            } else {
                logger.error(
                    "No stream with streamId '" +
                    event.streamId +
                    "' found for connection '" +
                    event.connectionId +
                    "' on 'streamPropertyChanged' event"
                );
            }
        };

        if (event.connectionId === this.connection.connectionId) {
            // Your stream has been forcedly changed (filter feature)
            callback(this.connection);
        } else {
            this.getRemoteConnection(event.connectionId, 'onStreamPropertyChanged')
                .then((connection) => {
                    callback(connection);
                })
                .catch((openViduError) => {
                    logger.error(openViduError);
                });
        }
    }

    /**
     * @hidden
     */
    onConnectionPropertyChanged(event: { property: string; newValue: any }): void {
        let oldValue;
        switch (event.property) {
            case 'role':
                oldValue = this.connection.role.slice();
                this.connection.role = event.newValue;
                this.connection.localOptions!.role = event.newValue;
                break;
            case 'record':
                oldValue = this.connection.record;
                event.newValue = event.newValue === 'true';
                this.connection.record = event.newValue;
                this.connection.localOptions!.record = event.newValue;
                break;
        }
        this.ee.emitEvent('connectionPropertyChanged', [
            new ConnectionPropertyChangedEvent(this, this.connection, event.property, event.newValue, oldValue)
        ]);
    }

    /**
     * @hidden
     */
    onNetworkQualityLevelChangedChanged(event: { connectionId: string; newValue: number; oldValue: number }): void {
        if (event.connectionId === this.connection.connectionId) {
            this.ee.emitEvent('networkQualityLevelChanged', [
                new NetworkQualityLevelChangedEvent(this, event.newValue, event.oldValue, this.connection)
            ]);
        } else {
            this.getConnection(event.connectionId, 'Connection not found for connectionId ' + event.connectionId)
                .then((connection: Connection) => {
                    this.ee.emitEvent('networkQualityLevelChanged', [
                        new NetworkQualityLevelChangedEvent(this, event.newValue, event.oldValue, connection)
                    ]);
                })
                .catch((openViduError) => {
                    logger.error(openViduError);
                });
        }
    }

    /**
     * @hidden
     */
    recvIceCandidate(event: {
        senderConnectionId: string;
        endpointName: string;
        sdpMLineIndex: number;
        sdpMid: string;
        candidate: string;
    }): void {
        // The event contains fields that can be used to obtain a proper candidate,
        // using the RTCIceCandidate constructor:
        // https://w3c.github.io/webrtc-pc/#dom-rtcicecandidate-constructor
        const candidateInit: RTCIceCandidateInit = {
            candidate: event.candidate,
            sdpMLineIndex: event.sdpMLineIndex,
            sdpMid: event.sdpMid
        };
        const iceCandidate = new RTCIceCandidate(candidateInit);

        this.getConnection(
            event.senderConnectionId,
            'Connection not found for connectionId ' +
            event.senderConnectionId +
            ' owning endpoint ' +
            event.endpointName +
            '. Ice candidate will be ignored: ' +
            iceCandidate
        )
            .then((connection) => {
                const stream: Stream = connection.stream!;
                stream
                    .getWebRtcPeer()
                    .addIceCandidate(iceCandidate)
                    .catch((error) => {
                        logger.error(
                            'Error adding candidate for ' + stream!.streamId + ' stream of endpoint ' + event.endpointName + ': ' + error
                        );
                    });
            })
            .catch((openViduError) => {
                logger.error(openViduError);
            });
    }

    /**
     * @hidden
     */
    onSessionClosed(msg): void {
        logger.info('Session closed: ' + JSON.stringify(msg));
        const s = msg.sessionId;
        if (s !== undefined) {
            this.ee.emitEvent('session-closed', [
                {
                    session: s
                }
            ]);
        } else {
            logger.warn('Session undefined on session closed', msg);
        }
    }

    /**
     * @hidden
     */
    onLostConnection(reason: ConnectionEventReason): void {
        logger.warn('Lost connection in Session ' + this.sessionId);
        if (!!this.sessionId && !!this.connection && !this.connection.disposed) {
            this.leave(true, reason);
        }
    }

    /**
     * @hidden
     */
    onRecoveredConnection(): void {
        logger.info('Recovered connection in Session ' + this.sessionId);
        this.reconnectBrokenStreams();
        this.ee.emitEvent('reconnected', []);
    }

    /**
     * @hidden
     */
    onMediaError(event: { error: string }): void {
        logger.error('Media error: ' + JSON.stringify(event));
        const err = event.error;
        if (err) {
            this.ee.emitEvent('error-media', [{ error: err }]);
        } else {
            logger.warn('Received undefined media error:', event);
        }
    }

    /**
     * @hidden
     */
    onRecordingStarted(event: { id: string; name: string }): void {
        this.ee.emitEvent('recordingStarted', [new RecordingEvent(this, 'recordingStarted', event.id, event.name)]);
    }

    /**
     * @hidden
     */
    onRecordingStopped(event: { id: string; name: string; reason: RecordingEventReason }): void {
        this.ee.emitEvent('recordingStopped', [new RecordingEvent(this, 'recordingStopped', event.id, event.name, event.reason)]);
    }

    /**
     * @hidden
     */
    onBroadcastStarted(): void {
        this.ee.emitEvent('broadcastStarted', []);
    }

    /**
     * @hidden
     */
    onBroadcastStopped(): void {
        this.ee.emitEvent('broadcastStopped', []);
    }

    /**
     * @hidden
     */
    onFilterEventDispatched(event: { connectionId: string; streamId: string; filterType: string; eventType: string; data: string }): void {
        const connectionId: string = event.connectionId;
        this.getConnection(connectionId, 'No connection found for connectionId ' + connectionId).then((connection) => {
            logger.info(`Filter event of type "${event.eventType}" dispatched`);
            const stream: Stream = connection.stream!;
            if (!stream || !stream.filter) {
                return logger.error(
                    `Filter event of type "${event.eventType}" dispatched for stream ${stream.streamId} but there is no ${!stream ? 'stream' : 'filter'
                    } defined`
                );
            }
            const eventHandler = stream.filter.handlers.get(event.eventType);
            if (!eventHandler || typeof eventHandler !== 'function') {
                const actualHandlers: string[] = Array.from(stream.filter.handlers.keys());
                return logger.error(
                    `Filter event of type "${event.eventType}" not handled or not a function! Active filter events: ${actualHandlers.join(
                        ','
                    )}`
                );
            } else {
                eventHandler.call(this, new FilterEvent(stream.filter, event.eventType, event.data));
            }
        });
    }

    /**
     * @hidden
     */
    onForciblyReconnectSubscriber(event: { connectionId: string; streamId: string; sdpOffer: string }): Promise<void> {
        return new Promise((resolve, reject) => {
            this.getRemoteConnection(event.connectionId, 'onForciblyReconnectSubscriber')
                .then((connection) => {
                    if (!!connection.stream && connection.stream.streamId === event.streamId) {
                        const stream = connection.stream;

                        if (stream.setupReconnectionEventEmitter(resolve, reject)) {
                            // Ongoing reconnection
                            // Wait for the event emitter to be free (with success or error) and call the method again
                            if (stream.reconnectionEventEmitter!['onForciblyReconnectSubscriberLastEvent'] != null) {
                                // Two or more onForciblyReconnectSubscriber events were received while a reconnection process
                                // of the subscriber was already taking place. Always use the last one to retry the re-subscription
                                // process, as that SDP offer will be the only one available at the server side. Ignore previous ones
                                stream.reconnectionEventEmitter!['onForciblyReconnectSubscriberLastEvent'] = event;
                                return reject('Ongoing forced subscriber reconnection');
                            } else {
                                // One onForciblyReconnectSubscriber even has been received while a reconnection process
                                // of the subscriber was already taking place. Set up a listener to wait for it to retry the
                                // forced reconnection process
                                stream.reconnectionEventEmitter!['onForciblyReconnectSubscriberLastEvent'] = event;
                                const callback = () => {
                                    const eventAux = stream.reconnectionEventEmitter!['onForciblyReconnectSubscriberLastEvent'];
                                    delete stream.reconnectionEventEmitter!['onForciblyReconnectSubscriberLastEvent'];
                                    this.onForciblyReconnectSubscriber(eventAux);
                                };
                                stream.reconnectionEventEmitter!.once('success', () => {
                                    callback();
                                });
                                stream.reconnectionEventEmitter!.once('error', () => {
                                    callback();
                                });
                            }
                            return;
                        }

                        stream
                            .completeWebRtcPeerReceive(true, true, event.sdpOffer)
                            .then(() => stream.finalResolveForSubscription(true, resolve))
                            .catch((error) =>
                                stream.finalRejectForSubscription(
                                    true,
                                    `Error while forcibly reconnecting remote stream ${event.streamId}: ${error.toString()}`,
                                    reject
                                )
                            );
                    } else {
                        const errMsg =
                            "No stream with streamId '" +
                            event.streamId +
                            "' found for connection '" +
                            event.connectionId +
                            "' on 'streamPropertyChanged' event";
                        logger.error(errMsg);
                        return reject(errMsg);
                    }
                })
                .catch((openViduError) => {
                    logger.error(openViduError);
                    return reject(openViduError);
                });
        });
    }

    /**
     * @hidden
     */
    reconnectBrokenStreams(): void {
        logger.info('Re-establishing media connections...');
        let someReconnection = false;
        // Re-establish Publisher stream
        if (!!this.connection.stream && this.connection.stream.streamIceConnectionStateBroken()) {
            logger.warn('Re-establishing Publisher ' + this.connection.stream.streamId);
            this.connection.stream.initWebRtcPeerSend(true);
            someReconnection = true;
        }
        // Re-establish Subscriber streams
        this.remoteConnections.forEach((remoteConnection) => {
            if (!!remoteConnection.stream && remoteConnection.stream.streamIceConnectionStateBroken()) {
                logger.warn('Re-establishing Subscriber ' + remoteConnection.stream.streamId);
                remoteConnection.stream.initWebRtcPeerReceive(true);
                someReconnection = true;
            }
        });
        if (!someReconnection) {
            logger.info('There were no media streams in need of a reconnection');
        }
    }

    /**
     * @hidden
     */
    async onSpeechToTextMessage(event: {
        timestamp?: Date;
        streamId: string;
        connectionId: string;
        sessionId: string;
        text: string;
        reason: string;
        raw: string;
        lang: string;
    }): Promise<void> {
        const connection = await this.getConnection(event.connectionId, 'No connection found for connectionId ' + event.connectionId);
        const ev = new SpeechToTextEvent(this, connection, event.text, <any>(event.reason).toLowerCase(), event.raw, event.lang);
        this.ee.emitEvent('speechToTextMessage', [ev]);
    }

    /**
     * @hidden
     */
    async onSpeechToTextDisconnected(event: { message: string }): Promise<void> {
        this.emitEvent('exception', [new ExceptionEvent(this, ExceptionEventName.SPEECH_TO_TEXT_DISCONNECTED, this, event.message)]);
    }

    /**
     * @hidden
     */
    emitEvent(type: string, eventArray: any[]): void {
        this.ee.emitEvent(type, eventArray);
    }

    /**
     * @hidden
     */
    leave(forced: boolean, reason: ConnectionEventReason): void {
        forced = !!forced;
        logger.info('Leaving Session (forced=' + forced + ')');
        this.stopVideoDataIntervals();

        if (!!this.connection) {
            if (!this.connection.disposed && !forced) {
                this.openvidu.sendRequest('leaveRoom', (error, response) => {
                    if (error) {
                        logger.error(`leaveRoom error: ${JSON.stringify(error)}`);
                    }
                    this.openvidu.closeWs();
                });
            } else {
                this.openvidu.closeWs();
            }

            this.stopPublisherStream(reason);

            if (!this.connection.disposed) {
                // Make Session object dispatch 'sessionDisconnected' event (if it is not already disposed)
                const sessionDisconnectEvent = new SessionDisconnectedEvent(this, reason);
                this.ee.emitEvent('sessionDisconnected', [sessionDisconnectEvent]);
                sessionDisconnectEvent.callDefaultBehavior();
            }
        } else {
            logger.warn('You were not connected to the session ' + this.sessionId);
        }
        logger.flush();
    }

    /**
     * @hidden
     */
    initializeParams(token: string) {
        const joinParams = {
            token: !!token ? token : '',
            session: this.sessionId,
            platform: !!platform.getDescription() ? platform.getDescription() : 'unknown',
            sdkVersion: this.openvidu.libraryVersion,
            metadata: !!this.options.metadata ? this.options.metadata : '',
            secret: this.openvidu.getSecret(),
            recorder: this.openvidu.getRecorder(),
            stt: this.openvidu.getStt()
        };
        return joinParams;
    }

    /**
     * @hidden
     */
    sendVideoData(streamManager: StreamManager, intervalSeconds: number = 1, doInterval: boolean = false, maxLoops: number = 1) {
        if (
            platform.isChromeBrowser() ||
            platform.isChromeMobileBrowser() ||
            platform.isOperaBrowser() ||
            platform.isOperaMobileBrowser() ||
            platform.isEdgeBrowser() ||
            platform.isEdgeMobileBrowser() ||
            platform.isElectron() ||
            (platform.isSafariBrowser() && !platform.isIonicIos()) ||
            platform.isAndroidBrowser() ||
            platform.isSamsungBrowser() ||
            platform.isIonicAndroid() ||
            platform.isIOSWithSafari()
        ) {
            const obtainAndSendVideo = async () => {
                const pc = streamManager.stream.getRTCPeerConnection();
                if (pc.connectionState === 'connected') {
                    const statsMap = await pc.getStats();
                    const arr: any[] = [];
                    statsMap.forEach((stats) => {
                        if ('frameWidth' in stats && 'frameHeight' in stats && arr.length === 0) {
                            arr.push(stats);
                        }
                    });
                    if (arr.length > 0) {
                        this.openvidu.sendRequest(
                            'videoData',
                            {
                                height: arr[0].frameHeight,
                                width: arr[0].frameWidth,
                                videoActive: streamManager.stream.videoActive != null ? streamManager.stream.videoActive : false,
                                audioActive: streamManager.stream.audioActive != null ? streamManager.stream.audioActive : false
                            },
                            (error, response) => {
                                if (error) {
                                    logger.error("Error sending 'videoData' event", error);
                                }
                            }
                        );
                    }
                }
            };
            if (doInterval) {
                let loops = 1;
                this.videoDataInterval = setInterval(() => {
                    if (loops < maxLoops) {
                        loops++;
                        obtainAndSendVideo();
                    } else {
                        clearInterval(this.videoDataInterval);
                    }
                }, intervalSeconds * 1000);
            } else {
                this.videoDataTimeout = setTimeout(obtainAndSendVideo, intervalSeconds * 1000);
            }
        } else if (platform.isFirefoxBrowser() || platform.isFirefoxMobileBrowser() || platform.isIonicIos() || platform.isReactNative()) {
            // Basic version for Firefox and Ionic iOS. They do not support stats
            this.openvidu.sendRequest(
                'videoData',
                {
                    height: streamManager.stream.videoDimensions?.height || 0,
                    width: streamManager.stream.videoDimensions?.width || 0,
                    videoActive: streamManager.stream.videoActive != null ? streamManager.stream.videoActive : false,
                    audioActive: streamManager.stream.audioActive != null ? streamManager.stream.audioActive : false
                },
                (error, response) => {
                    if (error) {
                        logger.error("Error sending 'videoData' event", error);
                    }
                }
            );
        } else {
            logger.error(
                'Browser ' +
                platform.getName() +
                ' (version ' +
                platform.getVersion() +
                ') for ' +
                platform.getFamily() +
                ' is not supported in OpenVidu for Network Quality'
            );
        }
    }

    /**
     * @hidden
     */
    sessionConnected() {
        return this.connection != null;
    }

    /**
     * @hidden
     */
    notConnectedError(): OpenViduError {
        return new OpenViduError(
            OpenViduErrorName.OPENVIDU_NOT_CONNECTED,
            "There is no connection to the session. Method 'Session.connect' must be successfully completed first"
        );
    }

    /**
     * @hidden
     */
    anySpeechEventListenerEnabled(event: string, onlyOnce: boolean, streamManager?: StreamManager): boolean {
        let handlersInSession = this.ee.getListeners(event);
        if (onlyOnce) {
            handlersInSession = handlersInSession.filter((h) => (h as any).once);
        }
        let listenersInSession = handlersInSession.length;
        if (listenersInSession > 0) return true;
        let listenersInStreamManager = 0;
        if (!!streamManager) {
            let handlersInStreamManager = streamManager.ee.getListeners(event);
            if (onlyOnce) {
                handlersInStreamManager = handlersInStreamManager.filter((h) => (h as any).once);
            }
            listenersInStreamManager = handlersInStreamManager.length;
        }
        return listenersInStreamManager > 0;
    }

    /**
     * @hidden
     */
    getTokenParams(token: string) {
        const match = token.match(/^(wss?)\:\/\/(([^:\/?#]*)(?:\:([0-9]+))?)([\/]{0,1}[^?#]*)(\?[^#]*|)(#.*|)$/);
        if (!!match) {
            const url = {
                protocol: match[1],
                host: match[2],
                hostname: match[3],
                port: match[4],
                pathname: match[5],
                search: match[6],
                hash: match[7]
            };

            const params = token.split('?');
            const queryParams = decodeURI(params[1])
                .split('&')
                .map((param) => param.split('='))
                .reduce((values, [key, value]) => {
                    values[key] = value;
                    return values;
                }, {});

            return {
                sessionId: queryParams['sessionId'],
                secret: queryParams['secret'],
                recorder: queryParams['recorder'],
                stt: queryParams['stt'],
                webrtcStatsInterval: queryParams['webrtcStatsInterval'],
                sendBrowserLogs: queryParams['sendBrowserLogs'],
                edition: queryParams['edition'],
                wsUri: url.protocol + '://' + url.host + '/openvidu',
                httpUri: 'https://' + url.host
            };
        } else {
            throw new Error(`Token not valid: "${token}"`);
        }
    }

    /* Private methods */

    private connectAux(token: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.openvidu.startWs((error) => {
                if (!!error) {
                    return reject(error);
                } else {
                    const joinParams = this.initializeParams(token);

                    this.openvidu.sendRequest('joinRoom', joinParams, (error, response: LocalConnectionOptions) => {
                        if (!!error) {
                            return reject(error);
                        } else {
                            // Process join room response
                            this.processJoinRoomResponse(response, token);

                            // Initialize local Connection object with values returned by openvidu-server
                            this.connection = new Connection(this, response);

                            // Initialize remote Connections with value returned by openvidu-server
                            const events = {
                                connections: new Array<Connection>(),
                                streams: new Array<Stream>()
                            };
                            const existingParticipants: RemoteConnectionOptions[] = response.value;
                            existingParticipants.forEach((remoteConnectionOptions: RemoteConnectionOptions) => {
                                const connection = new Connection(this, remoteConnectionOptions);
                                this.remoteConnections.set(connection.connectionId, connection);
                                events.connections.push(connection);
                                if (!!connection.stream) {
                                    this.remoteStreamsCreated.set(connection.stream.streamId, true);
                                    events.streams.push(connection.stream);
                                }
                            });

                            // Own 'connectionCreated' event
                            this.ee.emitEvent('connectionCreated', [
                                new ConnectionEvent(false, this, 'connectionCreated', this.connection, '')
                            ]);

                            // One 'connectionCreated' event for each existing connection in the session
                            events.connections.forEach((connection) => {
                                this.ee.emitEvent('connectionCreated', [
                                    new ConnectionEvent(false, this, 'connectionCreated', connection, '')
                                ]);
                            });

                            // One 'streamCreated' event for each active stream in the session
                            events.streams.forEach((stream) => {
                                this.ee.emitEvent('streamCreated', [new StreamEvent(false, this, 'streamCreated', stream, '')]);
                            });

                            if (!!response.recordingId && !!response.recordingName) {
                                this.ee.emitEvent('recordingStarted', [
                                    new RecordingEvent(this, 'recordingStarted', response.recordingId, response.recordingName)
                                ]);
                            }

                            return resolve();
                        }
                    });
                }
            });
        });
    }

    private stopPublisherStream(reason: StreamEventReason) {
        if (!!this.connection.stream) {
            // Dispose Publisher's  local stream
            this.connection.stream.disposeWebRtcPeer();
            if (this.connection.stream.isLocalStreamPublished) {
                // Make Publisher object dispatch 'streamDestroyed' event if the Stream was published
                this.connection.stream.ee.emitEvent('local-stream-destroyed', [reason]);
            }
        }
    }

    private stopVideoDataIntervals(): void {
        clearInterval(this.videoDataInterval);
        clearTimeout(this.videoDataTimeout);
    }

    private stringClientMetadata(metadata: any): string {
        if (typeof metadata !== 'string') {
            return JSON.stringify(metadata);
        } else {
            return metadata;
        }
    }

    protected getConnection(connectionId: string, errorMessage: string): Promise<Connection> {
        return new Promise<Connection>((resolve, reject) => {
            const connection = this.remoteConnections.get(connectionId);
            if (!!connection) {
                // Resolve remote connection
                return resolve(connection);
            } else {
                if (this.connection.connectionId === connectionId) {
                    // Resolve local connection
                    return resolve(this.connection);
                } else {
                    // Connection not found. Reject with OpenViduError
                    return reject(new OpenViduError(OpenViduErrorName.GENERIC_ERROR, errorMessage));
                }
            }
        });
    }

    private getRemoteConnection(connectionId: string, operation: string): Promise<Connection> {
        return new Promise<Connection>((resolve, reject) => {
            const connection = this.remoteConnections.get(connectionId);
            if (!!connection) {
                // Resolve remote connection
                return resolve(connection);
            } else {
                // Remote connection not found. Reject with OpenViduError
                const errorMessage =
                    'Remote connection ' +
                    connectionId +
                    " unknown when '" +
                    operation +
                    "'. " +
                    'Existing remote connections: ' +
                    JSON.stringify(this.remoteConnections.keys());
                return reject(new OpenViduError(OpenViduErrorName.GENERIC_ERROR, errorMessage));
            }
        });
    }

    private processToken(token: string): void {
        const tokenParams = this.getTokenParams(token);
        this.sessionId = tokenParams.sessionId;

        if (!!tokenParams.secret) {
            this.openvidu.secret = tokenParams.secret;
        }
        if (!!tokenParams.recorder) {
            this.openvidu.recorder = true;
        }
        if (!!tokenParams.stt) {
            this.openvidu.stt = true;
        }
        if (!!tokenParams.webrtcStatsInterval) {
            this.openvidu.webrtcStatsInterval = tokenParams.webrtcStatsInterval;
        }
        if (!!tokenParams.sendBrowserLogs) {
            this.openvidu.sendBrowserLogs = tokenParams.sendBrowserLogs;
        }
        this.openvidu.isAtLeastPro = tokenParams.edition === 'pro' || tokenParams.edition === 'enterprise';
        this.openvidu.isEnterprise = tokenParams.edition === 'enterprise';

        this.openvidu.wsUri = tokenParams.wsUri;
        this.openvidu.httpUri = tokenParams.httpUri;
    }

    private processJoinRoomResponse(opts: LocalConnectionOptions, token: string) {
        this.sessionId = opts.session;
        if (opts.customIceServers != null && opts.customIceServers.length > 0) {
            this.openvidu.iceServers = [];
            for (const iceServer of opts.customIceServers) {
                let rtcIceServer: RTCIceServer = {
                    urls: [iceServer.url]
                };
                logger.log('STUN/TURN server IP: ' + iceServer.url);
                if (iceServer.username != null && iceServer.credential != null) {
                    rtcIceServer.username = iceServer.username;
                    rtcIceServer.credential = iceServer.credential;
                    logger.log('TURN credentials [' + iceServer.username + ':' + iceServer.credential + ']');
                }
                this.openvidu.iceServers.push(rtcIceServer);
            }
        }
        this.openvidu.role = opts.role;
        this.openvidu.finalUserId = opts.finalUserId;
        this.openvidu.mediaServer = opts.mediaServer;
        this.openvidu.videoSimulcast = opts.videoSimulcast;
        this.capabilities = {
            subscribe: true,
            publish: this.openvidu.role !== 'SUBSCRIBER',
            forceUnpublish: this.openvidu.role === 'MODERATOR',
            forceDisconnect: this.openvidu.role === 'MODERATOR'
        };
        logger.info('openvidu-server version: ' + opts.version);
        if (opts.life != null) {
            this.openvidu.life = opts.life;
        }
        const minorDifference: number = semverMinor(opts.version) - semverMinor(this.openvidu.libraryVersion);
        if (semverMajor(opts.version) !== semverMajor(this.openvidu.libraryVersion) || !(minorDifference == 0 || minorDifference == 1)) {
            logger.error(
                `openvidu-browser (${this.openvidu.libraryVersion}) and openvidu-server (${opts.version}) versions are incompatible. ` +
                'Errors are likely to occur. openvidu-browser SDK is only compatible with the same version or the immediately following minor version of an OpenVidu deployment'
            );
        } else if (minorDifference == 1) {
            logger.warn(
                `openvidu-browser version ${this.openvidu.libraryVersion} does not match openvidu-server version ${opts.version}. ` +
                `These versions are still compatible with each other, but openvidu-browser version must be updated as soon as possible to ${semverMajor(
                    opts.version
                )}.${semverMinor(opts.version)}.x. ` +
                `This client using openvidu-browser ${this.openvidu.libraryVersion} will become incompatible with the next release of openvidu-server`
            );
        }

        // Configure JSNLogs
        OpenViduLogger.configureJSNLog(this.openvidu, token);

        // Store token
        this.token = token;
    }
}
