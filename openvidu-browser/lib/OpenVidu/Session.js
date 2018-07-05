"use strict";
/*
 * (C) Copyright 2017-2018 OpenVidu (https://openvidu.io/)
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
exports.__esModule = true;
var Connection_1 = require("./Connection");
var Subscriber_1 = require("./Subscriber");
var ConnectionEvent_1 = require("../OpenViduInternal/Events/ConnectionEvent");
var RecordingEvent_1 = require("../OpenViduInternal/Events/RecordingEvent");
var SessionDisconnectedEvent_1 = require("../OpenViduInternal/Events/SessionDisconnectedEvent");
var SignalEvent_1 = require("../OpenViduInternal/Events/SignalEvent");
var StreamEvent_1 = require("../OpenViduInternal/Events/StreamEvent");
var OpenViduError_1 = require("../OpenViduInternal/Enums/OpenViduError");
var VideoInsertMode_1 = require("../OpenViduInternal/Enums/VideoInsertMode");
var platform = require("platform");
var EventEmitter = require("wolfy87-eventemitter");
/**
 * Represents a video call. It can also be seen as a videoconference room where multiple users can connect.
 * Participants who publish their videos to a session can be seen by the rest of users connected to that specific session.
 * Initialized with [[OpenVidu.initSession]] method
 */
var Session = /** @class */ (function () {
    /**
     * @hidden
     */
    function Session(openvidu) {
        /**
         * Collection of all StreamManagers of this Session ([[Publisher]] and [[Subscriber]])
         */
        this.streamManagers = [];
        // This map is only used to avoid race condition between 'joinRoom' response and 'onParticipantPublished' notification
        /**
         * @hidden
         */
        this.remoteStreamsCreated = {};
        /**
         * @hidden
         */
        this.remoteConnections = {};
        /**
         * @hidden
         */
        this.speakingEventsEnabled = false;
        this.ee = new EventEmitter();
        this.openvidu = openvidu;
    }
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
    Session.prototype.connect = function (token, metadata) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.processToken(token);
            if (_this.openvidu.checkSystemRequirements()) {
                // Early configuration to deactivate automatic subscription to streams
                _this.options = {
                    sessionId: _this.sessionId,
                    participantId: token,
                    metadata: !!metadata ? _this.stringClientMetadata(metadata) : ''
                };
                _this.connectAux(token).then(function () {
                    resolve();
                })["catch"](function (error) {
                    reject(error);
                });
            }
            else {
                reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.BROWSER_NOT_SUPPORTED, 'Browser ' + platform.name + ' ' + platform.version + ' is not supported in OpenVidu'));
            }
        });
    };
    /**
     * Leaves the session, destroying all streams and deleting the user as a participant.
     *
     * #### Events dispatched
     *
     * The [[Session]] object of the local participant will dispatch a `sessionDisconnected` event.
     * This event will automatically unsubscribe the leaving participant from every Subscriber object of the session (this includes closing the WebRTCPeer connection and disposing all MediaStreamTracks)
     * and also deletes any HTML video element associated to each Subscriber (only those [created by OpenVidu Browser](/docs/how-do-i/manage-videos/#let-openvidu-take-care-of-the-video-players)).
     * For every video removed, each Subscriber object will dispatch a `videoElementDestroyed` event.
     * Call `event.preventDefault()` uppon event `sessionDisconnected` to avoid this behaviour and take care of disposing and cleaning all the Subscriber objects yourself.
     * See [[SessionDisconnectedEvent]] and [[VideoElementEvent]] to learn more to learn more.
     *
     * The [[Publisher]] object of the local participant will dispatch a `streamDestroyed` event if there is a [[Publisher]] object publishing to the session.
     * This event will automatically stop all media tracks and delete any HTML video element associated to it (only those [created by OpenVidu Browser](/docs/how-do-i/manage-videos/#let-openvidu-take-care-of-the-video-players)).
     * For every video removed, the Publisher object will dispatch a `videoElementDestroyed` event.
     * Call `event.preventDefault()` uppon event `streamDestroyed` if you want to clean the Publisher object on your own or re-publish it in a different Session (to do so it is a mandatory requirement to call `Session.unpublish()`
     * or/and `Session.disconnect()` in the previous session). See [[StreamEvent]] and [[VideoElementEvent]] to learn more.
     *
     * The [[Session]] object of every other participant connected to the session will dispatch a `streamDestroyed` event if the disconnected participant was publishing.
     * This event will automatically unsubscribe the Subscriber object from the session (this includes closing the WebRTCPeer connection and disposing all MediaStreamTracks)
     * and also deletes any HTML video element associated to that Subscriber (only those [created by OpenVidu Browser](/docs/how-do-i/manage-videos/#let-openvidu-take-care-of-the-video-players)).
     * For every video removed, the Subscriber object will dispatch a `videoElementDestroyed` event.
     * Call `event.preventDefault()` uppon event `streamDestroyed` to avoid this default behaviour and take care of disposing and cleaning the Subscriber object yourself.
     * See [[StreamEvent]] and [[VideoElementEvent]] to learn more.
     *
     * The [[Session]] object of every other participant connected to the session will dispatch a `connectionDestroyed` event in any case. See [[ConnectionEvent]] to learn more.
     */
    Session.prototype.disconnect = function () {
        this.leave(false, 'disconnect');
    };
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
    Session.prototype.subscribe = function (stream, targetElement, param3, param4) {
        var properties = {};
        if (!!param3 && typeof param3 !== 'function') {
            properties = {
                insertMode: (typeof param3.insertMode !== 'undefined') ? ((typeof param3.insertMode === 'string') ? VideoInsertMode_1.VideoInsertMode[param3.insertMode] : properties.insertMode) : VideoInsertMode_1.VideoInsertMode.APPEND,
                subscribeToAudio: (typeof param3.subscribeToAudio !== 'undefined') ? param3.subscribeToAudio : true,
                subscribeToVideo: (typeof param3.subscribeToVideo !== 'undefined') ? param3.subscribeToVideo : true
            };
        }
        else {
            properties = {
                insertMode: VideoInsertMode_1.VideoInsertMode.APPEND,
                subscribeToAudio: true,
                subscribeToVideo: true
            };
        }
        var completionHandler;
        if (!!param3 && (typeof param3 === 'function')) {
            completionHandler = param3;
        }
        else if (!!param4) {
            completionHandler = param4;
        }
        console.info('Subscribing to ' + stream.connection.connectionId);
        stream.subscribe()
            .then(function () {
            console.info('Subscribed correctly to ' + stream.connection.connectionId);
            if (completionHandler !== undefined) {
                completionHandler(undefined);
            }
        })["catch"](function (error) {
            if (completionHandler !== undefined) {
                completionHandler(error);
            }
        });
        var subscriber = new Subscriber_1.Subscriber(stream, targetElement, properties);
        if (!!subscriber.targetElement) {
            stream.streamManager.createVideoElement(subscriber.targetElement, properties.insertMode);
        }
        return subscriber;
    };
    Session.prototype.subscribeAsync = function (stream, targetElement, properties) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var subscriber;
            var callback = function (error) {
                if (!!error) {
                    reject(error);
                }
                else {
                    resolve(subscriber);
                }
            };
            if (!!properties) {
                subscriber = _this.subscribe(stream, targetElement, properties, callback);
            }
            else {
                subscriber = _this.subscribe(stream, targetElement, callback);
            }
        });
    };
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
    Session.prototype.unsubscribe = function (subscriber) {
        var connectionId = subscriber.stream.connection.connectionId;
        console.info('Unsubscribing from ' + connectionId);
        this.openvidu.sendRequest('unsubscribeFromVideo', { sender: subscriber.stream.connection.connectionId }, function (error, response) {
            if (error) {
                console.error('Error unsubscribing from ' + connectionId, error);
            }
            else {
                console.info('Unsubscribed correctly from ' + connectionId);
            }
            subscriber.stream.disposeWebRtcPeer();
            subscriber.stream.disposeMediaStream();
        });
        subscriber.stream.streamManager.removeAllVideos();
    };
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
    Session.prototype.publish = function (publisher) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            publisher.session = _this;
            publisher.stream.session = _this;
            if (!publisher.stream.isLocalStreamPublished) {
                // 'Session.unpublish(Publisher)' has NOT been called
                _this.connection.addStream(publisher.stream);
                publisher.stream.publish()
                    .then(function () {
                    resolve();
                })["catch"](function (error) {
                    reject(error);
                });
            }
            else {
                // 'Session.unpublish(Publisher)' has been called. Must initialize again Publisher
                publisher.initialize()
                    .then(function () {
                    _this.connection.addStream(publisher.stream);
                    publisher.reestablishStreamPlayingEvent();
                    publisher.stream.publish()
                        .then(function () {
                        resolve();
                    })["catch"](function (error) {
                        reject(error);
                    });
                })["catch"](function (error) {
                    reject(error);
                });
            }
        });
    };
    /**
     * Unpublishes from the Session the Publisher object.
     *
     * #### Events dispatched
     *
     * The [[Publisher]] object of the local participant will dispatch a `streamDestroyed` event.
     * This event will automatically stop all media tracks and delete any HTML video element associated to this Publisher
     * (only those videos [created by OpenVidu Browser](/docs/how-do-i/manage-videos/#let-openvidu-take-care-of-the-video-players)).
     * For every video removed, the Publisher object will dispatch a `videoElementDestroyed` event.
     * Call `event.preventDefault()` uppon event `streamDestroyed` if you want to clean the Publisher object on your own or re-publish it in a different Session.
     *
     * The [[Session]] object of every other participant connected to the session will dispatch a `streamDestroyed` event.
     * This event will automatically unsubscribe the Subscriber object from the session (this includes closing the WebRTCPeer connection and disposing all MediaStreamTracks) and
     * delete any HTML video element associated to it (only those [created by OpenVidu Browser](/docs/how-do-i/manage-videos/#let-openvidu-take-care-of-the-video-players)).
     * For every video removed, the Subscriber object will dispatch a `videoElementDestroyed` event.
     * Call `event.preventDefault()` uppon event `streamDestroyed` to avoid this default behaviour and take care of disposing and cleaning the Subscriber object on your own.
     *
     * See [[StreamEvent]] and [[VideoElementEvent]] to learn more.
     */
    Session.prototype.unpublish = function (publisher) {
        var stream = publisher.stream;
        if (!stream.connection) {
            console.error('The associated Connection object of this Publisher is null', stream);
            return;
        }
        else if (stream.connection !== this.connection) {
            console.error('The associated Connection object of this Publisher is not your local Connection.' +
                "Only moderators can force unpublish on remote Streams via 'forceUnpublish' method", stream);
            return;
        }
        else {
            console.info('Unpublishing local media (' + stream.connection.connectionId + ')');
            this.openvidu.sendRequest('unpublishVideo', function (error, response) {
                if (error) {
                    console.error(error);
                }
                else {
                    console.info('Media unpublished correctly');
                }
            });
            stream.disposeWebRtcPeer();
            delete stream.connection.stream;
            var streamEvent = new StreamEvent_1.StreamEvent(true, publisher, 'streamDestroyed', publisher.stream, 'unpublish');
            publisher.emitEvent('streamDestroyed', [streamEvent]);
            streamEvent.callDefaultBehaviour();
        }
    };
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
    Session.prototype.signal = function (signal) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var signalMessage = {};
            if (signal.to && signal.to.length > 0) {
                var connectionIds_1 = [];
                signal.to.forEach(function (connection) {
                    connectionIds_1.push(connection.connectionId);
                });
                signalMessage['to'] = connectionIds_1;
            }
            else {
                signalMessage['to'] = [];
            }
            signalMessage['data'] = signal.data ? signal.data : '';
            signalMessage['type'] = signal.type ? signal.type : '';
            _this.openvidu.sendRequest('sendMessage', {
                message: JSON.stringify(signalMessage)
            }, function (error, response) {
                if (!!error) {
                    reject(error);
                }
                else {
                    resolve();
                }
            });
        });
    };
    /* tslint:enable:no-string-literal */
    /**
     * See [[EventDispatcher.on]]
     */
    Session.prototype.on = function (type, handler) {
        this.ee.on(type, function (event) {
            if (event) {
                console.info("Event '" + type + "' triggered by 'Session'", event);
            }
            else {
                console.info("Event '" + type + "' triggered by 'Session'");
            }
            handler(event);
        });
        if (type === 'publisherStartSpeaking' || type === 'publisherStopSpeaking') {
            this.speakingEventsEnabled = true;
            // If there are already available remote streams, enable hark 'speaking' event in all of them
            for (var connectionId in this.remoteConnections) {
                var str = this.remoteConnections[connectionId].stream;
                if (!!str && !str.speechEvent && str.hasAudio) {
                    str.enableSpeakingEvents();
                }
            }
        }
        return this;
    };
    /**
     * See [[EventDispatcher.once]]
     */
    Session.prototype.once = function (type, handler) {
        this.ee.once(type, function (event) {
            if (event) {
                console.info("Event '" + type + "' triggered by 'Session'", event);
            }
            else {
                console.info("Event '" + type + "' triggered by 'Session'");
            }
            handler(event);
        });
        if (type === 'publisherStartSpeaking' || type === 'publisherStopSpeaking') {
            this.speakingEventsEnabled = true;
            // If there are already available remote streams, enable hark in all of them
            for (var connectionId in this.remoteConnections) {
                var str = this.remoteConnections[connectionId].stream;
                if (!!str && !str.speechEvent && str.hasAudio) {
                    str.enableOnceSpeakingEvents();
                }
            }
        }
        return this;
    };
    /**
     * See [[EventDispatcher.off]]
     */
    Session.prototype.off = function (type, handler) {
        if (!handler) {
            this.ee.removeAllListeners(type);
        }
        else {
            this.ee.off(type, handler);
        }
        if (type === 'publisherStartSpeaking' || type === 'publisherStopSpeaking') {
            this.speakingEventsEnabled = false;
            // If there are already available remote streams, disablae hark in all of them
            for (var connectionId in this.remoteConnections) {
                var str = this.remoteConnections[connectionId].stream;
                if (!!str && !!str.speechEvent) {
                    str.disableSpeakingEvents();
                }
            }
        }
        return this;
    };
    /* Hidden methods */
    /**
     * @hidden
     */
    Session.prototype.onParticipantJoined = function (response) {
        var _this = this;
        // Connection shouldn't exist
        this.getConnection(response.id, '')
            .then(function (connection) {
            console.warn('Connection ' + response.id + ' already exists in connections list');
        })["catch"](function (openViduError) {
            var connection = new Connection_1.Connection(_this, response);
            _this.remoteConnections[response.id] = connection;
            _this.ee.emitEvent('connectionCreated', [new ConnectionEvent_1.ConnectionEvent(false, _this, 'connectionCreated', connection, '')]);
        });
    };
    /**
     * @hidden
     */
    Session.prototype.onParticipantLeft = function (msg) {
        var _this = this;
        this.getRemoteConnection(msg.name, 'Remote connection ' + msg.name + " unknown when 'onParticipantLeft'. " +
            'Existing remote connections: ' + JSON.stringify(Object.keys(this.remoteConnections)))
            .then(function (connection) {
            if (!!connection.stream) {
                var stream = connection.stream;
                var streamEvent = new StreamEvent_1.StreamEvent(true, _this, 'streamDestroyed', stream, msg.reason);
                _this.ee.emitEvent('streamDestroyed', [streamEvent]);
                streamEvent.callDefaultBehaviour();
                delete _this.remoteStreamsCreated[stream.streamId];
            }
            delete _this.remoteConnections[connection.connectionId];
            _this.ee.emitEvent('connectionDestroyed', [new ConnectionEvent_1.ConnectionEvent(false, _this, 'connectionDestroyed', connection, msg.reason)]);
        })["catch"](function (openViduError) {
            console.error(openViduError);
        });
    };
    /**
     * @hidden
     */
    Session.prototype.onParticipantPublished = function (response) {
        var _this = this;
        var afterConnectionFound = function (connection) {
            _this.remoteConnections[connection.connectionId] = connection;
            if (!_this.remoteStreamsCreated[connection.stream.streamId]) {
                // Avoid race condition between stream.subscribe() in "onParticipantPublished" and in "joinRoom" rpc callback
                // This condition is false if openvidu-server sends "participantPublished" event to a subscriber participant that has
                // already subscribed to certain stream in the callback of "joinRoom" method
                _this.ee.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, _this, 'streamCreated', connection.stream, '')]);
            }
            _this.remoteStreamsCreated[connection.stream.streamId] = true;
        };
        // Get the existing Connection created on 'onParticipantJoined' for
        // existing participants or create a new one for new participants
        var connection;
        this.getRemoteConnection(response.id, "Remote connection '" + response.id + "' unknown when 'onParticipantPublished'. " +
            'Existing remote connections: ' + JSON.stringify(Object.keys(this.remoteConnections)))
            .then(function (con) {
            // Update existing Connection
            connection = con;
            response.metadata = con.data;
            connection.options = response;
            connection.initRemoteStreams(response.streams);
            afterConnectionFound(connection);
        })["catch"](function (openViduError) {
            // Create new Connection
            connection = new Connection_1.Connection(_this, response);
            afterConnectionFound(connection);
        });
    };
    /**
     * @hidden
     */
    Session.prototype.onParticipantUnpublished = function (msg) {
        var _this = this;
        this.getRemoteConnection(msg.name, "Remote connection '" + msg.name + "' unknown when 'onParticipantUnpublished'. " +
            'Existing remote connections: ' + JSON.stringify(Object.keys(this.remoteConnections)))
            .then(function (connection) {
            var streamEvent = new StreamEvent_1.StreamEvent(true, _this, 'streamDestroyed', connection.stream, msg.reason);
            _this.ee.emitEvent('streamDestroyed', [streamEvent]);
            streamEvent.callDefaultBehaviour();
            // Deleting the remote stream
            var streamId = connection.stream.streamId;
            delete _this.remoteStreamsCreated[streamId];
            connection.removeStream(streamId);
        })["catch"](function (openViduError) {
            console.error(openViduError);
        });
    };
    /**
     * @hidden
     */
    Session.prototype.onParticipantEvicted = function (msg) {
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
    };
    /**
     * @hidden
     */
    Session.prototype.onNewMessage = function (msg) {
        var _this = this;
        console.info('New signal: ' + JSON.stringify(msg));
        this.getConnection(msg.from, "Connection '" + msg.from + "' unknow when 'onNewMessage'. Existing remote connections: "
            + JSON.stringify(Object.keys(this.remoteConnections)) + '. Existing local connection: ' + this.connection.connectionId)
            .then(function (connection) {
            _this.ee.emitEvent('signal', [new SignalEvent_1.SignalEvent(_this, msg.type, msg.data, connection)]);
            _this.ee.emitEvent('signal:' + msg.type, [new SignalEvent_1.SignalEvent(_this, msg.type, msg.data, connection)]);
        })["catch"](function (openViduError) {
            console.error(openViduError);
        });
    };
    /**
     * @hidden
     */
    Session.prototype.recvIceCandidate = function (msg) {
        var candidate = {
            candidate: msg.candidate,
            sdpMid: msg.sdpMid,
            sdpMLineIndex: msg.sdpMLineIndex,
            toJSON: function () {
                return { candidate: msg.candidate };
            }
        };
        this.getConnection(msg.endpointName, 'Connection not found for endpoint ' + msg.endpointName + '. Ice candidate will be ignored: ' + candidate)
            .then(function (connection) {
            var stream = connection.stream;
            stream.getWebRtcPeer().addIceCandidate(candidate)["catch"](function (error) {
                console.error('Error adding candidate for ' + stream.streamId
                    + ' stream of endpoint ' + msg.endpointName + ': ' + error);
            });
        })["catch"](function (openViduError) {
            console.error(openViduError);
        });
    };
    /**
     * @hidden
     */
    Session.prototype.onSessionClosed = function (msg) {
        console.info('Session closed: ' + JSON.stringify(msg));
        var s = msg.room;
        if (s !== undefined) {
            this.ee.emitEvent('session-closed', [{
                    session: s
                }]);
        }
        else {
            console.warn('Session undefined on session closed', msg);
        }
    };
    /**
     * @hidden
     */
    Session.prototype.onLostConnection = function () {
        /*if (!this.connection) {

            console.warn('Not connected to session: if you are not debugging, this is probably a certificate error');

            const url = 'https://' + this.openvidu.getWsUri().split('wss://')[1].split('/openvidu')[0];
            if (window.confirm('If you are not debugging, this is probably a certificate error at \"' + url + '\"\n\nClick OK to navigate and accept it')) {
                location.assign(url + '/accept-certificate');
            }
            return;
        }*/
        console.warn('Lost connection in Session ' + this.sessionId);
        if (!!this.sessionId && !this.connection.disposed) {
            this.leave(true, 'networkDisconnect');
        }
    };
    /**
     * @hidden
     */
    Session.prototype.onMediaError = function (params) {
        console.error('Media error: ' + JSON.stringify(params));
        var err = params.error;
        if (err) {
            this.ee.emitEvent('error-media', [{
                    error: err
                }]);
        }
        else {
            console.warn('Received undefined media error. Params:', params);
        }
    };
    /**
     * @hidden
     */
    Session.prototype.onRecordingStarted = function (response) {
        this.ee.emitEvent('recordingStarted', [new RecordingEvent_1.RecordingEvent(this, 'recordingStarted', response.id, response.name)]);
    };
    /**
     * @hidden
     */
    Session.prototype.onRecordingStopped = function (response) {
        this.ee.emitEvent('recordingStopped', [new RecordingEvent_1.RecordingEvent(this, 'recordingStopped', response.id, response.name)]);
    };
    /**
     * @hidden
     */
    Session.prototype.emitEvent = function (type, eventArray) {
        this.ee.emitEvent(type, eventArray);
    };
    /**
     * @hidden
     */
    Session.prototype.leave = function (forced, reason) {
        var _this = this;
        forced = !!forced;
        console.info('Leaving Session (forced=' + forced + ')');
        if (!!this.connection) {
            if (!this.connection.disposed && !forced) {
                this.openvidu.sendRequest('leaveRoom', function (error, response) {
                    if (error) {
                        console.error(error);
                    }
                    _this.openvidu.closeWs();
                });
            }
            else {
                this.openvidu.closeWs();
            }
            if (!!this.connection.stream) {
                // Dispose Publisher's  local stream
                this.connection.stream.disposeWebRtcPeer();
                if (this.connection.stream.isLocalStreamPublished) {
                    // Make Publisher object dispatch 'streamDestroyed' event if the Stream was published
                    this.connection.stream.ee.emitEvent('local-stream-destroyed-by-disconnect', [reason]);
                }
            }
            if (!this.connection.disposed) {
                // Make Session object dispatch 'sessionDisconnected' event (if it is not already disposed)
                var sessionDisconnectEvent = new SessionDisconnectedEvent_1.SessionDisconnectedEvent(this, reason);
                this.ee.emitEvent('sessionDisconnected', [sessionDisconnectEvent]);
                sessionDisconnectEvent.callDefaultBehaviour();
            }
        }
        else {
            console.warn('You were not connected to the session ' + this.sessionId);
        }
    };
    /* Private methods */
    Session.prototype.connectAux = function (token) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.openvidu.startWs(function (error) {
                if (!!error) {
                    reject(error);
                }
                else {
                    var joinParams = {
                        token: (!!token) ? token : '',
                        session: _this.sessionId,
                        metadata: !!_this.options.metadata ? _this.options.metadata : '',
                        secret: _this.openvidu.getSecret(),
                        recorder: _this.openvidu.getRecorder()
                    };
                    _this.openvidu.sendRequest('joinRoom', joinParams, function (error, response) {
                        if (!!error) {
                            reject(error);
                        }
                        else {
                            // Initialize local Connection object with values returned by openvidu-server
                            _this.connection = new Connection_1.Connection(_this);
                            _this.connection.connectionId = response.id;
                            _this.connection.data = response.metadata;
                            // Initialize remote Connections with value returned by openvidu-server
                            var events_1 = {
                                connections: new Array(),
                                streams: new Array()
                            };
                            var existingParticipants = response.value;
                            existingParticipants.forEach(function (participant) {
                                var connection = new Connection_1.Connection(_this, participant);
                                _this.remoteConnections[connection.connectionId] = connection;
                                events_1.connections.push(connection);
                                if (!!connection.stream) {
                                    _this.remoteStreamsCreated[connection.stream.streamId] = true;
                                    events_1.streams.push(connection.stream);
                                }
                            });
                            // Own 'connectionCreated' event
                            _this.ee.emitEvent('connectionCreated', [new ConnectionEvent_1.ConnectionEvent(false, _this, 'connectionCreated', _this.connection, '')]);
                            // One 'connectionCreated' event for each existing connection in the session
                            events_1.connections.forEach(function (connection) {
                                _this.ee.emitEvent('connectionCreated', [new ConnectionEvent_1.ConnectionEvent(false, _this, 'connectionCreated', connection, '')]);
                            });
                            // One 'streamCreated' event for each active stream in the session
                            events_1.streams.forEach(function (stream) {
                                _this.ee.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, _this, 'streamCreated', stream, '')]);
                            });
                            resolve();
                        }
                    });
                }
            });
        });
    };
    Session.prototype.stringClientMetadata = function (metadata) {
        if (typeof metadata !== 'string') {
            return JSON.stringify(metadata);
        }
        else {
            return metadata;
        }
    };
    Session.prototype.getConnection = function (connectionId, errorMessage) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var connection = _this.remoteConnections[connectionId];
            if (!!connection) {
                // Resolve remote connection
                resolve(connection);
            }
            else {
                if (_this.connection.connectionId === connectionId) {
                    // Resolve local connection
                    resolve(_this.connection);
                }
                else {
                    // Connection not found. Reject with OpenViduError
                    reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.GENERIC_ERROR, errorMessage));
                }
            }
        });
    };
    Session.prototype.getRemoteConnection = function (connectionId, errorMessage) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var connection = _this.remoteConnections[connectionId];
            if (!!connection) {
                // Resolve remote connection
                resolve(connection);
            }
            else {
                // Remote connection not found. Reject with OpenViduError
                reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.GENERIC_ERROR, errorMessage));
            }
        });
    };
    Session.prototype.processToken = function (token) {
        var url = new URL(token);
        this.sessionId = url.searchParams.get('sessionId');
        var secret = url.searchParams.get('secret');
        var recorder = url.searchParams.get('recorder');
        var turnUsername = url.searchParams.get('turnUsername');
        var turnCredential = url.searchParams.get('turnCredential');
        var role = url.searchParams.get('role');
        if (!!secret) {
            this.openvidu.secret = secret;
        }
        if (!!recorder) {
            this.openvidu.recorder = true;
        }
        if (!!turnUsername && !!turnCredential) {
            var stunUrl = 'stun:' + url.hostname + ':3478';
            var turnUrl1 = 'turn:' + url.hostname + ':3478';
            var turnUrl2 = turnUrl1 + '?transport=tcp';
            this.openvidu.iceServers = [
                { urls: [stunUrl] },
                { urls: [turnUrl1, turnUrl2], username: turnUsername, credential: turnCredential }
            ];
            console.log('TURN temp credentials [' + turnUsername + ':' + turnCredential + ']');
        }
        if (!!role) {
            this.openvidu.role = role;
        }
        this.openvidu.wsUri = 'wss://' + url.host + '/openvidu';
    };
    return Session;
}());
exports.Session = Session;
//# sourceMappingURL=Session.js.map