/*
 * (C) Copyright 2017-2019 OpenVidu (https://openvidu.io/)
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
import { EventDispatcher } from '../OpenViduInternal/Interfaces/Public/EventDispatcher';
import { SignalOptions } from '../OpenViduInternal/Interfaces/Public/SignalOptions';
import { SubscriberProperties } from '../OpenViduInternal/Interfaces/Public/SubscriberProperties';
import { ConnectionOptions } from '../OpenViduInternal/Interfaces/Private/ConnectionOptions';
import { ObjMap } from '../OpenViduInternal/Interfaces/Private/ObjMap';
import { SessionOptions } from '../OpenViduInternal/Interfaces/Private/SessionOptions';
import { ConnectionEvent } from '../OpenViduInternal/Events/ConnectionEvent';
import { FilterEvent } from '../OpenViduInternal/Events/FilterEvent';
import { PublisherSpeakingEvent } from '../OpenViduInternal/Events/PublisherSpeakingEvent';
import { RecordingEvent } from '../OpenViduInternal/Events/RecordingEvent';
import { SessionDisconnectedEvent } from '../OpenViduInternal/Events/SessionDisconnectedEvent';
import { SignalEvent } from '../OpenViduInternal/Events/SignalEvent';
import { StreamEvent } from '../OpenViduInternal/Events/StreamEvent';
import { StreamPropertyChangedEvent } from '../OpenViduInternal/Events/StreamPropertyChangedEvent';
import { OpenViduError, OpenViduErrorName } from '../OpenViduInternal/Enums/OpenViduError';
import { VideoInsertMode } from '../OpenViduInternal/Enums/VideoInsertMode';

import EventEmitter = require('wolfy87-eventemitter');
import platform = require('platform');

/**
 * Represents a video call. It can also be seen as a videoconference room where multiple users can connect.
 * Participants who publish their videos to a session can be seen by the rest of users connected to that specific session.
 * Initialized with [[OpenVidu.initSession]] method
 */
export class Session implements EventDispatcher {

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
    streamManagers: StreamManager[] = [];

    /**
     * Object defining the methods that the client is able to call. These are defined by the role of the token used to connect to the Session.
     * This object is only defined after [[Session.connect]] has been successfully resolved
     */
    capabilities: Capabilities;

    // This map is only used to avoid race condition between 'joinRoom' response and 'onParticipantPublished' notification
    /**
     * @hidden
     */
    remoteStreamsCreated: ObjMap<boolean> = {};

    /**	
     * @hidden	
     */
    isFirstIonicIosSubscriber = true;
    /**	
     * @hidden	
     */
    countDownForIonicIosSubscribersActive = true;
    /**
     * @hidden
     */
    remoteConnections: ObjMap<Connection> = {};
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
    speakingEventsEnabled = false;

    private ee = new EventEmitter();

    /**
     * @hidden
     */
    constructor(openvidu: OpenVidu) {
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
     * Only after the returned Promise is successfully resolved [[Session.connection]] object will be available and properly defined.
     *
     * #### Events dispatched
     *
     * The [[Session]] object of the local participant will first dispatch one or more `connectionCreated` events upon successful termination of this method:
     * - First one for your own local Connection object, so you can retrieve [[Session.connection]] property.
     * - Then one for each remote Connection previously connected to the Session, if any. Any other remote user connecting to the Session after you have
     * successfully connected will also dispatch a `connectionCreated` event when they do so.
     *
     * The [[Session]] object of the local participant will also dispatch a `streamCreated` event for each remote active [[Publisher]] that was already streaming
     * when connecting, just after dispatching all remote `connectionCreated` events.
     *
     * The [[Session]] object of every other participant connected to the session will dispatch a `connectionCreated` event.
     *
     * See [[ConnectionEvent]] and [[StreamEvent]] to learn more.
     *
     * @returns A Promise to which you must subscribe that is resolved if the the connection to the Session was successful and rejected with an Error object if not
     *
     */
    connect(token: string, metadata?: any): Promise<any> {
        return new Promise((resolve, reject) => {

            this.processToken(token);

            if (this.openvidu.checkSystemRequirements()) {
                // Early configuration to deactivate automatic subscription to streams
                this.options = {
                    sessionId: this.sessionId,
                    participantId: token,
                    metadata: !!metadata ? this.stringClientMetadata(metadata) : ''
                };
                this.connectAux(token).then(() => {
                    resolve();
                }).catch(error => {
                    reject(error);
                });
            } else {
                reject(new OpenViduError(OpenViduErrorName.BROWSER_NOT_SUPPORTED, 'Browser ' + platform.name + ' (version ' + platform.version + ') for ' + platform.os!!.family + ' is not supported in OpenVidu'));
            }
        });
    }

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
    disconnect(): void {
        this.leave(false, 'disconnect');
    }

    subscribe(stream: Stream, targetElement: string | HTMLElement): Subscriber;
    subscribe(stream: Stream, targetElement: string | HTMLElement, properties: SubscriberProperties): Subscriber;
    subscribe(stream: Stream, targetElement: string | HTMLElement, completionHandler: (error: Error | undefined) => void): Subscriber;
    subscribe(stream: Stream, targetElement: string | HTMLElement, properties: SubscriberProperties, completionHandler: (error: Error | undefined) => void): Subscriber;

    /**
     * Subscribes to a `stream`, adding a new HTML video element to DOM with `subscriberProperties` settings. This method is usually called in the callback of `streamCreated` event.
     *
     * #### Events dispatched
     *
     * The [[Subscriber]] object will dispatch a `videoElementCreated` event once the HTML video element has been added to DOM (only if you
     * [let OpenVidu take care of the video players](/docs/how-do-i/manage-videos/#let-openvidu-take-care-of-the-video-players)). See [[VideoElementEvent]] to learn more.
     *
     * The [[Subscriber]] object will dispatch a `streamPlaying` event once the remote stream starts playing. See [[StreamManagerEvent]] to learn more.
     *
     * @param stream Stream object to subscribe to
     * @param targetElement HTML DOM element (or its `id` attribute) in which the video element of the Subscriber will be inserted (see [[SubscriberProperties.insertMode]]). If *null* or *undefined* no default video will be created for this Subscriber.
     * You can always call method [[Subscriber.addVideoElement]] or [[Subscriber.createVideoElement]] to manage the video elements on your own (see [Manage video players](/docs/how-do-i/manage-videos) section)
     * @param completionHandler `error` parameter is null if `subscribe` succeeds, and is defined if it fails.
     */
    subscribe(stream: Stream, targetElement: string | HTMLElement, param3?: ((error: Error | undefined) => void) | SubscriberProperties, param4?: ((error: Error | undefined) => void)): Subscriber {
        let properties: SubscriberProperties = {};
        if (!!param3 && typeof param3 !== 'function') {
            properties = {
                insertMode: (typeof param3.insertMode !== 'undefined') ? ((typeof param3.insertMode === 'string') ? VideoInsertMode[param3.insertMode] : properties.insertMode) : VideoInsertMode.APPEND,
                subscribeToAudio: (typeof param3.subscribeToAudio !== 'undefined') ? param3.subscribeToAudio : true,
                subscribeToVideo: (typeof param3.subscribeToVideo !== 'undefined') ? param3.subscribeToVideo : true
            };
        } else {
            properties = {
                insertMode: VideoInsertMode.APPEND,
                subscribeToAudio: true,
                subscribeToVideo: true
            };
        }

        let completionHandler: (error: Error | undefined) => void;
        if (!!param3 && (typeof param3 === 'function')) {
            completionHandler = param3;
        } else if (!!param4) {
            completionHandler = param4;
        }

        console.info('Subscribing to ' + stream.connection.connectionId);

        stream.subscribe()
            .then(() => {
                console.info('Subscribed correctly to ' + stream.connection.connectionId);
                if (completionHandler !== undefined) {
                    completionHandler(undefined);
                }
            })
            .catch(error => {
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
     * Promisified version of [[Session.subscribe]]
     */
    subscribeAsync(stream: Stream, targetElement: string | HTMLElement): Promise<Subscriber>;
    subscribeAsync(stream: Stream, targetElement: string | HTMLElement, properties: SubscriberProperties): Promise<Subscriber>;

    subscribeAsync(stream: Stream, targetElement: string | HTMLElement, properties?: SubscriberProperties): Promise<Subscriber> {
        return new Promise<Subscriber>((resolve, reject) => {

            let subscriber: Subscriber;

            const callback = (error: Error) => {
                if (!!error) {
                    reject(error);
                } else {
                    resolve(subscriber);
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
     * The [[Subscriber]] object will dispatch a `videoElementDestroyed` event for each video associated to it that was removed from DOM.
     * Only videos [created by OpenVidu Browser](/docs/how-do-i/manage-videos/#let-openvidu-take-care-of-the-video-players)) will be automatically removed
     *
     * See [[VideoElementEvent]] to learn more
     */
    unsubscribe(subscriber: Subscriber): void {
        const connectionId = subscriber.stream.connection.connectionId;

        console.info('Unsubscribing from ' + connectionId);

        this.openvidu.sendRequest(
            'unsubscribeFromVideo',
            { sender: subscriber.stream.connection.connectionId },
            (error, response) => {
                if (error) {
                    console.error('Error unsubscribing from ' + connectionId, error);
                } else {
                    console.info('Unsubscribed correctly from ' + connectionId);
                }
                subscriber.stream.disposeWebRtcPeer();
                subscriber.stream.disposeMediaStream();
            }
        );
        subscriber.stream.streamManager.removeAllVideos();
    }


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
    publish(publisher: Publisher): Promise<any> {
        return new Promise((resolve, reject) => {
            publisher.session = this;
            publisher.stream.session = this;

            if (!publisher.stream.publishedOnce) {
                // 'Session.unpublish(Publisher)' has NOT been called
                this.connection.addStream(publisher.stream);
                publisher.stream.publish()
                    .then(() => {
                        resolve();
                    })
                    .catch(error => {
                        reject(error);
                    });
            } else {
                // 'Session.unpublish(Publisher)' has been called. Must initialize again Publisher
                publisher.initialize()
                    .then(() => {
                        this.connection.addStream(publisher.stream);
                        publisher.reestablishStreamPlayingEvent();
                        publisher.stream.publish()
                            .then(() => {
                                resolve();
                            })
                            .catch(error => {
                                reject(error);
                            });
                    }).catch((error) => {
                        reject(error);
                    });
            }
        });
    }


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
    unpublish(publisher: Publisher): void {

        const stream = publisher.stream;

        if (!stream.connection) {
            console.error('The associated Connection object of this Publisher is null', stream);
            return;
        } else if (stream.connection !== this.connection) {
            console.error('The associated Connection object of this Publisher is not your local Connection.' +
                "Only moderators can force unpublish on remote Streams via 'forceUnpublish' method", stream);
            return;
        } else {

            console.info('Unpublishing local media (' + stream.connection.connectionId + ')');

            this.openvidu.sendRequest('unpublishVideo', (error, response) => {
                if (error) {
                    console.error(error);
                } else {
                    console.info('Media unpublished correctly');
                }
            });

            stream.disposeWebRtcPeer();
            delete stream.connection.stream;

            const streamEvent = new StreamEvent(true, publisher, 'streamDestroyed', publisher.stream, 'unpublish');
            publisher.emitEvent('streamDestroyed', [streamEvent]);
            streamEvent.callDefaultBehavior();
        }
    }


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
    forceDisconnect(connection: Connection): Promise<any> {
        return new Promise((resolve, reject) => {
            console.info('Forcing disconnect for connection ' + connection.connectionId);
            this.openvidu.sendRequest(
                'forceDisconnect',
                { connectionId: connection.connectionId },
                (error, response) => {
                    if (error) {
                        console.error('Error forcing disconnect for Connection ' + connection.connectionId, error);
                        if (error.code === 401) {
                            reject(new OpenViduError(OpenViduErrorName.OPENVIDU_PERMISSION_DENIED, "You don't have permissions to force a disconnection"));
                        } else {
                            reject(error);
                        }
                    } else {
                        console.info('Forcing disconnect correctly for Connection ' + connection.connectionId);
                        resolve();
                    }
                }
            );
        });
    }


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
    forceUnpublish(stream: Stream): Promise<any> {
        return new Promise((resolve, reject) => {
            console.info('Forcing unpublish for stream ' + stream.streamId);
            this.openvidu.sendRequest(
                'forceUnpublish',
                { streamId: stream.streamId },
                (error, response) => {
                    if (error) {
                        console.error('Error forcing unpublish for Stream ' + stream.streamId, error);
                        if (error.code === 401) {
                            reject(new OpenViduError(OpenViduErrorName.OPENVIDU_PERMISSION_DENIED, "You don't have permissions to force an unpublishing"));
                        } else {
                            reject(error);
                        }
                    } else {
                        console.info('Forcing unpublish correctly for Stream ' + stream.streamId);
                        resolve();
                    }
                }
            );
        });
    }


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
    /* tslint:disable:no-string-literal */
    signal(signal: SignalOptions): Promise<any> {
        return new Promise((resolve, reject) => {

            const signalMessage = {};

            if (signal.to && signal.to.length > 0) {
                const connectionIds: string[] = [];

                signal.to.forEach(connection => {
                    connectionIds.push(connection.connectionId);
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

            this.openvidu.sendRequest('sendMessage', {
                message: JSON.stringify(signalMessage)
            }, (error, response) => {
                if (!!error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }
    /* tslint:enable:no-string-literal */


    /**
     * See [[EventDispatcher.on]]
     */
    on(type: string, handler: (event: SessionDisconnectedEvent | SignalEvent | StreamEvent | ConnectionEvent | PublisherSpeakingEvent | RecordingEvent) => void): EventDispatcher {

        this.ee.on(type, event => {
            if (event) {
                console.info("Event '" + type + "' triggered by 'Session'", event);
            } else {
                console.info("Event '" + type + "' triggered by 'Session'");
            }
            handler(event);
        });

        if (type === 'publisherStartSpeaking' || type === 'publisherStopSpeaking') {
            this.speakingEventsEnabled = true;
            // If there are already available remote streams, enable hark 'speaking' event in all of them
            for (const connectionId in this.remoteConnections) {
                const str = this.remoteConnections[connectionId].stream;
                if (!!str && str.hasAudio) {
                    str.enableSpeakingEvents();
                }
            }
        }

        return this;
    }


    /**
     * See [[EventDispatcher.once]]
     */
    once(type: string, handler: (event: SessionDisconnectedEvent | SignalEvent | StreamEvent | ConnectionEvent | PublisherSpeakingEvent | RecordingEvent) => void): Session {

        this.ee.once(type, event => {
            if (event) {
                console.info("Event '" + type + "' triggered by 'Session'", event);
            } else {
                console.info("Event '" + type + "' triggered by 'Session'");
            }
            handler(event);
        });

        if (type === 'publisherStartSpeaking' || type === 'publisherStopSpeaking') {
            this.speakingEventsEnabled = true;
            // If there are already available remote streams, enable hark in all of them
            for (const connectionId in this.remoteConnections) {
                const str = this.remoteConnections[connectionId].stream;
                if (!!str && str.hasAudio) {
                    str.enableOnceSpeakingEvents();
                }
            }
        }

        return this;
    }


    /**
     * See [[EventDispatcher.off]]
     */
    off(type: string, handler?: (event: SessionDisconnectedEvent | SignalEvent | StreamEvent | ConnectionEvent | PublisherSpeakingEvent | RecordingEvent) => void): Session {

        if (!handler) {
            this.ee.removeAllListeners(type);
        } else {
            this.ee.off(type, handler);
        }

        if (type === 'publisherStartSpeaking' || type === 'publisherStopSpeaking') {
            this.speakingEventsEnabled = false;

            // If there are already available remote streams, disable hark in all of them
            for (const connectionId in this.remoteConnections) {
                const str = this.remoteConnections[connectionId].stream;
                if (!!str) {
                    str.disableSpeakingEvents();
                }
            }
        }
        return this;
    }


    /* Hidden methods */

    /**
     * @hidden
     */
    onParticipantJoined(response: ConnectionOptions): void {
        // Connection shouldn't exist
        this.getConnection(response.id, '')

            .then(connection => {
                console.warn('Connection ' + response.id + ' already exists in connections list');
            })
            .catch(openViduError => {
                const connection = new Connection(this, response);
                this.remoteConnections[response.id] = connection;
                this.ee.emitEvent('connectionCreated', [new ConnectionEvent(false, this, 'connectionCreated', connection, '')]);
            });
    }

    /**
     * @hidden
     */
    onParticipantLeft(msg): void {
        this.getRemoteConnection(msg.connectionId, 'Remote connection ' + msg.connectionId + " unknown when 'onParticipantLeft'. " +
            'Existing remote connections: ' + JSON.stringify(Object.keys(this.remoteConnections)))

            .then(connection => {
                if (!!connection.stream) {
                    const stream = connection.stream;

                    const streamEvent = new StreamEvent(true, this, 'streamDestroyed', stream, msg.reason);
                    this.ee.emitEvent('streamDestroyed', [streamEvent]);
                    streamEvent.callDefaultBehavior();

                    delete this.remoteStreamsCreated[stream.streamId];

                    if (Object.keys(this.remoteStreamsCreated).length === 0) {
                        this.isFirstIonicIosSubscriber = true;
                        this.countDownForIonicIosSubscribersActive = true;
                    }
                }
                delete this.remoteConnections[connection.connectionId];
                this.ee.emitEvent('connectionDestroyed', [new ConnectionEvent(false, this, 'connectionDestroyed', connection, msg.reason)]);
            })
            .catch(openViduError => {
                console.error(openViduError);
            });
    }

    /**
     * @hidden
     */
    onParticipantPublished(response: ConnectionOptions): void {

        const afterConnectionFound = (connection) => {
            this.remoteConnections[connection.connectionId] = connection;

            if (!this.remoteStreamsCreated[connection.stream.streamId]) {
                // Avoid race condition between stream.subscribe() in "onParticipantPublished" and in "joinRoom" rpc callback
                // This condition is false if openvidu-server sends "participantPublished" event to a subscriber participant that has
                // already subscribed to certain stream in the callback of "joinRoom" method

                this.ee.emitEvent('streamCreated', [new StreamEvent(false, this, 'streamCreated', connection.stream, '')]);
            }

            this.remoteStreamsCreated[connection.stream.streamId] = true;
        };

        // Get the existing Connection created on 'onParticipantJoined' for
        // existing participants or create a new one for new participants
        let connection: Connection;
        this.getRemoteConnection(response.id, "Remote connection '" + response.id + "' unknown when 'onParticipantPublished'. " +
            'Existing remote connections: ' + JSON.stringify(Object.keys(this.remoteConnections)))

            .then(con => {
                // Update existing Connection
                connection = con;
                response.metadata = con.data;
                connection.options = response;
                connection.initRemoteStreams(response.streams);
                afterConnectionFound(connection);
            })
            .catch(openViduError => {
                // Create new Connection
                connection = new Connection(this, response);
                afterConnectionFound(connection);
            });
    }

    /**
     * @hidden
     */
    onParticipantUnpublished(msg): void {
        if (msg.connectionId === this.connection.connectionId) {
            // Your stream has been forcedly unpublished from the session
            this.stopPublisherStream(msg.reason);
        } else {
            this.getRemoteConnection(msg.connectionId, "Remote connection '" + msg.connectionId + "' unknown when 'onParticipantUnpublished'. " +
                'Existing remote connections: ' + JSON.stringify(Object.keys(this.remoteConnections)))

                .then(connection => {

                    const streamEvent = new StreamEvent(true, this, 'streamDestroyed', connection.stream, msg.reason);
                    this.ee.emitEvent('streamDestroyed', [streamEvent]);
                    streamEvent.callDefaultBehavior();

                    // Deleting the remote stream
                    const streamId: string = connection.stream.streamId;
                    delete this.remoteStreamsCreated[streamId];

                    if (Object.keys(this.remoteStreamsCreated).length === 0) {
                        this.isFirstIonicIosSubscriber = true;
                        this.countDownForIonicIosSubscribersActive = true;
                    }

                    connection.removeStream(streamId);
                })
                .catch(openViduError => {
                    console.error(openViduError);
                });
        }
    }

    /**
     * @hidden
     */
    onParticipantEvicted(msg): void {
        if (msg.connectionId === this.connection.connectionId) {
            // You have been evicted from the session
            if (!!this.sessionId && !this.connection.disposed) {
                this.leave(true, msg.reason);
            }
        }
    }

    /**
     * @hidden
     */
    onNewMessage(msg): void {

        console.info('New signal: ' + JSON.stringify(msg));

        this.getConnection(msg.from, "Connection '" + msg.from + "' unknow when 'onNewMessage'. Existing remote connections: "
            + JSON.stringify(Object.keys(this.remoteConnections)) + '. Existing local connection: ' + this.connection.connectionId)

            .then(connection => {
                this.ee.emitEvent('signal', [new SignalEvent(this, msg.type, msg.data, connection)]);
                if (msg.type !== 'signal') {
                    this.ee.emitEvent(msg.type, [new SignalEvent(this, msg.type, msg.data, connection)]);
                }
            })
            .catch(openViduError => {
                console.error(openViduError);
            });
    }

    /**
     * @hidden
     */
    onStreamPropertyChanged(msg): void {

        const callback = (connection: Connection) => {
            if (!!connection.stream && connection.stream.streamId === msg.streamId) {
                const stream = connection.stream;
                let oldValue;
                switch (msg.property) {
                    case 'audioActive':
                        oldValue = stream.audioActive;
                        msg.newValue = msg.newValue === 'true';
                        stream.audioActive = msg.newValue;
                        break;
                    case 'videoActive':
                        oldValue = stream.videoActive;
                        msg.newValue = msg.newValue === 'true';
                        stream.videoActive = msg.newValue;
                        break;
                    case 'videoDimensions':
                        oldValue = stream.videoDimensions;
                        msg.newValue = JSON.parse(JSON.parse(msg.newValue));
                        stream.videoDimensions = msg.newValue;
                        break;
                    case 'filter':
                        oldValue = stream.filter;
                        msg.newValue = (Object.keys(msg.newValue).length > 0) ? msg.newValue : undefined;
                        if (msg.newValue !== undefined) {
                            stream.filter = new Filter(msg.newValue.type, msg.newValue.options);
                            stream.filter.stream = stream;
                            if (msg.newValue.lastExecMethod) {
                                stream.filter.lastExecMethod = msg.newValue.lastExecMethod;
                            }
                        } else {
                            delete stream.filter;
                        }
                        msg.newValue = stream.filter;
                        break;
                }
                this.ee.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent(this, stream, msg.property, msg.newValue, oldValue, msg.reason)]);
                if (!!stream.streamManager) {
                    stream.streamManager.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent(stream.streamManager, stream, msg.property, msg.newValue, oldValue, msg.reason)]);
                }
            } else {
                console.error("No stream with streamId '" + msg.streamId + "' found for connection '" + msg.connectionId + "' on 'streamPropertyChanged' event");
            }
        };

        if (msg.connectionId === this.connection.connectionId) {
            // Your stream has been forcedly changed (filter feature)
            callback(this.connection);
        } else {
            this.getRemoteConnection(msg.connectionId, 'Remote connection ' + msg.connectionId + " unknown when 'onStreamPropertyChanged'. " +
                'Existing remote connections: ' + JSON.stringify(Object.keys(this.remoteConnections)))
                .then(connection => {
                    callback(connection);
                })
                .catch(openViduError => {
                    console.error(openViduError);
                });
        }
    }

    /**
     * @hidden
     */
    recvIceCandidate(msg): void {
        const candidate: RTCIceCandidate = {
            candidate: msg.candidate,
            component: msg.component,
            foundation: msg.foundation,
            ip: msg.ip,
            port: msg.port,
            priority: msg.priority,
            protocol: msg.protocol,
            relatedAddress: msg.relatedAddress,
            relatedPort: msg.relatedPort,
            sdpMid: msg.sdpMid,
            sdpMLineIndex: msg.sdpMLineIndex,
            tcpType: msg.tcpType,
            usernameFragment: msg.usernameFragment,
            type: msg.type,
            toJSON: () => {
                return { candidate: msg.candidate };
            }
        };
        this.getConnection(msg.senderConnectionId, 'Connection not found for connectionId ' + msg.senderConnectionId + ' owning endpoint ' + msg.endpointName + '. Ice candidate will be ignored: ' + candidate)
            .then(connection => {
                const stream = connection.stream;
                stream.getWebRtcPeer().addIceCandidate(candidate).catch(error => {
                    console.error('Error adding candidate for ' + stream.streamId
                        + ' stream of endpoint ' + msg.endpointName + ': ' + error);
                });
            })
            .catch(openViduError => {
                console.error(openViduError);
            });
    }

    /**
     * @hidden
     */
    onSessionClosed(msg): void {
        console.info('Session closed: ' + JSON.stringify(msg));
        const s = msg.sessionId;
        if (s !== undefined) {
            this.ee.emitEvent('session-closed', [{
                session: s
            }]);
        } else {
            console.warn('Session undefined on session closed', msg);
        }
    }

    /**
     * @hidden
     */
    onLostConnection(reason: string): void {
        console.warn('Lost connection in session ' + this.sessionId + ' waiting for reconnect');
        if (!!this.sessionId && !this.connection.disposed) {
            this.leave(true, reason);
        }
    }

    /**
     * @hidden
     */
    onRecoveredConnection(): void {
        console.warn('Recovered connection in Session ' + this.sessionId);
        // this.ee.emitEvent('connectionRecovered', []);
    }

    /**
     * @hidden
     */
    onMediaError(params): void {

        console.error('Media error: ' + JSON.stringify(params));
        const err = params.error;
        if (err) {
            this.ee.emitEvent('error-media', [{
                error: err
            }]);
        } else {
            console.warn('Received undefined media error. Params:', params);
        }
    }

    /**
     * @hidden
     */
    onRecordingStarted(response): void {
        this.ee.emitEvent('recordingStarted', [new RecordingEvent(this, 'recordingStarted', response.id, response.name)]);
    }

    /**
     * @hidden
     */
    onRecordingStopped(response): void {
        this.ee.emitEvent('recordingStopped', [new RecordingEvent(this, 'recordingStopped', response.id, response.name, response.reason)]);
    }

    /**
     * @hidden
     * response = {connectionId: string, streamId: string, type: string, data: Object}
     */
    onFilterEventDispatched(response): void {
        const connectionId: string = response.connectionId;
        const streamId: string = response.streamId;
        this.getConnection(connectionId, 'No connection found for connectionId ' + connectionId)
            .then(connection => {
                console.info('Filter event dispatched');
                const stream: Stream = connection.stream;
                stream.filter.handlers[response.eventType](new FilterEvent(stream.filter, response.eventType, response.data));
            });
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
    leave(forced: boolean, reason: string): void {

        forced = !!forced;
        console.info('Leaving Session (forced=' + forced + ')');

        if (!!this.connection) {
            if (!this.connection.disposed && !forced) {
                this.openvidu.sendRequest('leaveRoom', (error, response) => {
                    if (error) {
                        console.error(error);
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
            console.warn('You were not connected to the session ' + this.sessionId);
        }
    }


    /* Private methods */

    private connectAux(token: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.openvidu.startWs((error) => {
                if (!!error) {
                    reject(error);
                } else {

                    const joinParams = {
                        token: (!!token) ? token : '',
                        session: this.sessionId,
                        platform: !!platform.description ? platform.description : 'unknown',
                        metadata: !!this.options.metadata ? this.options.metadata : '',
                        secret: this.openvidu.getSecret(),
                        recorder: this.openvidu.getRecorder()
                    };

                    this.openvidu.sendRequest('joinRoom', joinParams, (error, response) => {
                        if (!!error) {
                            reject(error);
                        } else {

                            // Initialize capabilities object with the role
                            this.capabilities = {
                                subscribe: true,
                                publish: this.openvidu.role !== 'SUBSCRIBER',
                                forceUnpublish: this.openvidu.role === 'MODERATOR',
                                forceDisconnect: this.openvidu.role === 'MODERATOR'
                            };

                            // Initialize local Connection object with values returned by openvidu-server
                            this.connection = new Connection(this);
                            this.connection.connectionId = response.id;
                            this.connection.creationTime = response.createdAt;
                            this.connection.data = response.metadata;
                            this.connection.rpcSessionId = response.sessionId;

                            // Initialize remote Connections with value returned by openvidu-server
                            const events = {
                                connections: new Array<Connection>(),
                                streams: new Array<Stream>()
                            };
                            const existingParticipants: ConnectionOptions[] = response.value;
                            existingParticipants.forEach(participant => {
                                const connection = new Connection(this, participant);
                                this.remoteConnections[connection.connectionId] = connection;
                                events.connections.push(connection);
                                if (!!connection.stream) {
                                    this.remoteStreamsCreated[connection.stream.streamId] = true;
                                    events.streams.push(connection.stream);
                                }
                            });

                            // Own 'connectionCreated' event
                            this.ee.emitEvent('connectionCreated', [new ConnectionEvent(false, this, 'connectionCreated', this.connection, '')]);

                            // One 'connectionCreated' event for each existing connection in the session
                            events.connections.forEach(connection => {
                                this.ee.emitEvent('connectionCreated', [new ConnectionEvent(false, this, 'connectionCreated', connection, '')]);
                            });

                            // One 'streamCreated' event for each active stream in the session
                            events.streams.forEach(stream => {
                                this.ee.emitEvent('streamCreated', [new StreamEvent(false, this, 'streamCreated', stream, '')]);
                            });

                            resolve();
                        }
                    });
                }
            });
        });
    }

    private stopPublisherStream(reason: string) {
        if (!!this.connection.stream) {
            // Dispose Publisher's  local stream
            this.connection.stream.disposeWebRtcPeer();
            if (this.connection.stream.isLocalStreamPublished) {
                // Make Publisher object dispatch 'streamDestroyed' event if the Stream was published
                this.connection.stream.ee.emitEvent('local-stream-destroyed', [reason]);
            }
        }
    }

    private stringClientMetadata(metadata: any): string {
        if (typeof metadata !== 'string') {
            return JSON.stringify(metadata);
        } else {
            return metadata;
        }
    }

    private getConnection(connectionId: string, errorMessage: string): Promise<Connection> {
        return new Promise<Connection>((resolve, reject) => {
            const connection = this.remoteConnections[connectionId];
            if (!!connection) {
                // Resolve remote connection
                resolve(connection);
            } else {
                if (this.connection.connectionId === connectionId) {
                    // Resolve local connection
                    resolve(this.connection);
                } else {
                    // Connection not found. Reject with OpenViduError
                    reject(new OpenViduError(OpenViduErrorName.GENERIC_ERROR, errorMessage));
                }
            }
        });
    }

    private getRemoteConnection(connectionId: string, errorMessage: string): Promise<Connection> {
        return new Promise<Connection>((resolve, reject) => {
            const connection = this.remoteConnections[connectionId];
            if (!!connection) {
                // Resolve remote connection
                resolve(connection);
            } else {
                // Remote connection not found. Reject with OpenViduError
                reject(new OpenViduError(OpenViduErrorName.GENERIC_ERROR, errorMessage));
            }
        });
    }

    private processToken(token: string): void {
        const match = token.match(/^(wss?\:)\/\/(([^:\/?#]*)(?:\:([0-9]+))?)([\/]{0,1}[^?#]*)(\?[^#]*|)(#.*|)$/);
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
                .map(param => param.split('='))
                .reduce((values, [key, value]) => {
                    values[key] = value
                    return values
                }, {});

            this.sessionId = <string>queryParams['sessionId'];
            const secret = queryParams['secret'];
            const recorder = queryParams['recorder'];
            const turnUsername = queryParams['turnUsername'];
            const turnCredential = queryParams['turnCredential'];
            const role = queryParams['role'];
            const webrtcStatsInterval = queryParams['webrtcStatsInterval'];
            const openviduServerVersion = queryParams['version'];

            if (!!secret) {
                this.openvidu.secret = secret;
            }
            if (!!recorder) {
                this.openvidu.recorder = true;
            }
            if (!!turnUsername && !!turnCredential) {
                const stunUrl = 'stun:' + url.hostname + ':3478';
                const turnUrl1 = 'turn:' + url.hostname + ':3478';
                const turnUrl2 = turnUrl1 + '?transport=tcp';
                this.openvidu.iceServers = [
                    { urls: [stunUrl] },
                    { urls: [turnUrl1, turnUrl2], username: turnUsername, credential: turnCredential }
                ];
                console.log('TURN temp credentials [' + turnUsername + ':' + turnCredential + ']');
            }
            if (!!role) {
                this.openvidu.role = role;
            }
            if (!!webrtcStatsInterval) {
                this.openvidu.webrtcStatsInterval = +webrtcStatsInterval;
            }
            if (!!openviduServerVersion) {
                console.info("openvidu-server version: " + openviduServerVersion);
                if (openviduServerVersion !== this.openvidu.libraryVersion) {
                    console.error('OpenVidu Server (' + openviduServerVersion +
                        ') and OpenVidu Browser (' + this.openvidu.libraryVersion +
                        ') versions do NOT match. There may be incompatibilities')
                }
            }

            this.openvidu.wsUri = 'wss://' + url.host + '/openvidu';
            this.openvidu.httpUri = 'https://' + url.host;

        } else {
            console.error('Token "' + token + '" is not valid')
        }
    }

}
