/*
 * (C) Copyright 2017-2018 OpenVidu (http://openvidu.io/)
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
import { OpenViduError, OpenViduErrorName } from '../OpenViduInternal/Enums/OpenViduError';
import { VideoInsertMode } from '../OpenViduInternal/Enums/VideoInsertMode';
import { solveIfCallback } from '../OpenViduInternal/VersionAdapter';

import platform = require('platform');
import EventEmitter = require('wolfy87-eventemitter');


/**
 * Represents a video call. It can also be seen as a videoconference room where multiple users can connect.
 * Participants who publish their videos to a session will be seen by the rest of users connected to that specific session.
 * Initialized with [[OpenVidu.initSession]] method
 */
export class Session implements EventDispatcher {

    /**
     * Local connection to the Session. This object is defined only after [[Session.connect]] has been successfully executed, and can be retrieved subscribing to `connectionCreated` event
     */
    connection: Connection;

    /**
     * Unique identifier of the Session. This is the same value you pass when calling [[OpenVidu.initSession]]
     */
    sessionId: string;

    // This map is only used to avoid race condition between 'joinRoom' response and 'onParticipantPublished' notification
    /**
     * @hidden
     */
    remoteStreamsCreated: ObjMap<boolean> = {};

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
     * ---
     * ## DEPRECATED
     *
     * _Use promisified version of the method_
     *
     * ---
     */
    connect(token: string, metadata?: any, callback?): void;

    /**
     * Connects to the session using `token`. Parameter `metadata` allows you to pass extra data to share with other users when
     * they receive `streamCreated` event. The structure of `metadata` string is up to you (maybe some standarized format
     * as JSON or XML is a good idea), the only restriction is a maximum length of 10000 chars.
     *
     * This metadata is not considered secure, as it is generated in the client side. To pass securized data, add it as a parameter in the
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
     * The [[Session]] object of the local participant will also dispatch a `streamCreated` event for each remote active [[Publisher]] after dispatching all remote
     * `connectionCreated` events.
     *
     * The [[Session]] object of every other participant connected to the session will dispatch a `connectionCreated` event.
     *
     * See [[ConnectionEvent]] and [[StreamEvent]] to learn more.
     *
     * @returns A Promise to which you must subscribe that is resolved if the recording successfully started and rejected with an Error object if not
     *
     */
    connect(token: string, metadata?: any, param3?: (error: Error) => void): Promise<any> {

        // DEPRECATED WARNING
        return solveIfCallback('Session.connect', (!!param3 && (typeof param3 === 'function')) ? param3 : ((typeof metadata === 'function') ? metadata : ''),


        /*return */new Promise((resolve, reject) => {

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
                    reject(new OpenViduError(OpenViduErrorName.BROWSER_NOT_SUPPORTED, 'Browser ' + platform.name + ' ' + platform.version + ' is not supported in OpenVidu'));
                }
            })


        );
    }

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
     * The [[Subscriber]] object will dispatch a `videoElementCreated` event once the HTML video element has been added to DOM (if _targetElement_ not null or undefined)
     *
     * The [[Subscriber]] object will dispatch a `videoPlaying` event once the remote video starts playing (only if `videoElementCreated` event has been previously dispatched)
     *
     * See [[VideoElementEvent]] to learn more.
     *
     * @param stream Stream object to subscribe to
     * @param targetElement HTML DOM element (or its `id` attribute) in which the video element of the Subscriber will be inserted (see [[SubscriberProperties.insertMode]]). If null or undefined no default video will be created for this Subscriber
     * (you can always access the native MediaStream object by calling _Subscriber.stream.getMediaStream()_ and use it as _srcObject_ of any HTML video element)
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
        stream.insertVideo(subscriber.element, <VideoInsertMode>properties.insertMode);
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
     * Unsubscribes from `subscriber`, automatically removing its HTML video element.
     *
     * #### Events dispatched
     *
     * The [[Subscriber]] object will dispatch a `videoElementDestroyed` event (only if it previously dispatched a `videoElementCreated` event). See [[VideoElementEvent]] to learn more
     */
    unsubscribe(subscriber: Subscriber): void {
        const connectionId = subscriber.stream.connection.connectionId;

        console.info('Unsubscribing from ' + connectionId);

        this.openvidu.sendRequest('unsubscribeFromVideo', {
            sender: subscriber.stream.connection.connectionId
        },
            (error, response) => {
                if (error) {
                    console.error('Error unsubscribing from ' + connectionId, error);
                } else {
                    console.info('Unsubscribed correctly from ' + connectionId);
                }
                subscriber.stream.disposeWebRtcPeer();
                subscriber.stream.disposeMediaStream();
            });
        subscriber.stream.removeVideo();
    }


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
    publish(publisher: Publisher): Promise<any> {
        return new Promise((resolve, reject) => {
            publisher.session = this;
            publisher.stream.session = this;

            if (!publisher.stream.isPublisherPublished) {
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
            streamEvent.callDefaultBehaviour();
        }
    }


    signal(signal: SignalOptions): Promise<any>;
    /**
     * ---
     * ## DEPRECATED
     *
     * _Use promisified version of the method_
     *
     * ---
     */
    signal(signal: SignalOptions, callback?): void;

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
    signal(signal: SignalOptions, callback?): Promise<any> {

        // DEPRECATED WARNING
        return solveIfCallback('Session.signal', callback,

        /*return */new Promise((resolve, reject) => {
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
                signalMessage['type'] = signal.type ? signal.type : '';

                this.openvidu.sendRequest('sendMessage', {
                    message: JSON.stringify(signalMessage)
                }, (error, response) => {
                    if (!!error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            }));


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
                if (!!str && !str.speechEvent && str.hasAudio) {
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
                if (!!str && !str.speechEvent && str.hasAudio) {
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

            // If there are already available remote streams, disablae hark in all of them
            for (const connectionId in this.remoteConnections) {
                const str = this.remoteConnections[connectionId].stream;
                if (!!str && !!str.speechEvent) {
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
        this.getRemoteConnection(msg.name, 'Remote connection ' + msg.name + " unknown when 'onParticipantLeft'. " +
            'Existing remote connections: ' + JSON.stringify(Object.keys(this.remoteConnections)))

            .then(connection => {
                if (!!connection.stream) {
                    const stream = connection.stream;

                    const streamEvent = new StreamEvent(true, this, 'streamDestroyed', stream, msg.reason);
                    this.ee.emitEvent('streamDestroyed', [streamEvent]);
                    streamEvent.callDefaultBehaviour();

                    delete this.remoteStreamsCreated[stream.streamId];
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
        this.getRemoteConnection(msg.name, "Remote connection '" + msg.name + "' unknown when 'onParticipantUnpublished'. " +
            'Existing remote connections: ' + JSON.stringify(Object.keys(this.remoteConnections)))

            .then(connection => {

                const streamEvent = new StreamEvent(true, this, 'streamDestroyed', connection.stream, msg.reason);
                this.ee.emitEvent('streamDestroyed', [streamEvent]);
                streamEvent.callDefaultBehaviour();

                // Deleting the remote stream
                const streamId: string = connection.stream.streamId;
                delete this.remoteStreamsCreated[streamId];
                connection.removeStream(streamId);
            })
            .catch(openViduError => {
                console.error(openViduError);
            });
    }

    /**
     * @hidden
     */
    onParticipantEvicted(msg): void {
        /*this.getRemoteConnection(msg.name, 'Remote connection ' + msg.name + " unknown when 'onParticipantLeft'. " +
            'Existing remote connections: ' + JSON.stringify(Object.keys(this.remoteConnections)))

            .then(connection => {
                if (!!connection.stream) {
                    const stream = connection.stream;

                    const streamEvent = new StreamEvent(true, this, 'streamDestroyed', stream, 'forceDisconnect');
                    this.ee.emitEvent('streamDestroyed', [streamEvent]);
                    streamEvent.callDefaultBehaviour();

                    delete this.remoteStreamsCreated[stream.streamId];
                }
                connection.dispose();
                delete this.remoteConnections[connection.connectionId];
                this.ee.emitEvent('connectionDestroyed', [new ConnectionEvent(false, this, 'connectionDestroyed', connection, 'forceDisconnect')]);
            })
            .catch(openViduError => {
                console.error(openViduError);
            });*/
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
                this.ee.emitEvent('signal:' + msg.type, [new SignalEvent(this, msg.type, msg.data, connection)]);
            })
            .catch(openViduError => {
                console.error(openViduError);
            });
    }

    /**
     * @hidden
     */
    recvIceCandidate(msg): void {
        const candidate = {
            candidate: msg.candidate,
            sdpMid: msg.sdpMid,
            sdpMLineIndex: msg.sdpMLineIndex
        };
        this.getConnection(msg.endpointName, 'Connection not found for endpoint ' + msg.endpointName + '. Ice candidate will be ignored: ' + candidate)

            .then(connection => {
                const stream = connection.stream;
                stream.getWebRtcPeer().addIceCandidate(candidate, (error) => {
                    if (error) {
                        console.error('Error adding candidate for ' + stream.streamId
                            + ' stream of endpoint ' + msg.endpointName + ': ' + error);
                    }
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
        const s = msg.room;
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
    onLostConnection(): void {

        if (!this.connection) {

            console.warn('Not connected to session: if you are not debugging, this is probably a certificate error');

            const url = 'https://' + this.openvidu.getWsUri().split('wss://')[1].split('/openvidu')[0];
            if (window.confirm('If you are not debugging, this is probably a certificate error at \"' + url + '\"\n\nClick OK to navigate and accept it')) {
                location.assign(url + '/accept-certificate');
            }
            return;
        }

        console.warn('Lost connection in Session ' + this.sessionId);
        if (!!this.sessionId && !this.connection.disposed) {
            this.leave(true, 'networkDisconnect');
        }
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
        this.ee.emitEvent('recordingStopped', [new RecordingEvent(this, 'recordingStopped', response.id, response.name)]);
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

            if (!!this.connection.stream) {
                // Make Publisher object dispatch 'streamDestroyed' event (if there's a local stream)
                this.connection.stream.disposeWebRtcPeer();
                this.connection.stream.emitEvent('stream-destroyed-by-disconnect', [reason]);
            }

            if (!this.connection.disposed) {
                // Make Session object dispatch 'sessionDisconnected' event (if it is not already disposed)
                const sessionDisconnectEvent = new SessionDisconnectedEvent(this, reason);
                this.ee.emitEvent('sessionDisconnected', [sessionDisconnectEvent]);
                sessionDisconnectEvent.callDefaultBehaviour();
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
                        metadata: !!this.options.metadata ? this.options.metadata : '',
                        secret: this.openvidu.getSecret(),
                        recorder: this.openvidu.getRecorder(),
                    };

                    this.openvidu.sendRequest('joinRoom', joinParams, (error, response) => {
                        if (!!error) {
                            reject(error);
                        } else {

                            // Initialize local Connection object with values returned by openvidu-server
                            this.connection = new Connection(this);
                            this.connection.connectionId = response.id;
                            this.connection.data = response.metadata;

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
        const url = new URL(token);
        this.sessionId = <string>url.searchParams.get('sessionId');
        const secret = url.searchParams.get('secret');
        const recorder = url.searchParams.get('recorder');

        if (!!secret) {
            this.openvidu.secret = secret;
        }
        if (!!recorder) {
            this.openvidu.recorder = true;
        }

        this.openvidu.wsUri = 'wss://' + url.host + '/openvidu';
    }

}