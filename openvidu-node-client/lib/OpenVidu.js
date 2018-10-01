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
Object.defineProperty(exports, "__esModule", { value: true });
var axios_1 = require("axios");
var Publisher_1 = require("./Publisher");
var Recording_1 = require("./Recording");
var Session_1 = require("./Session");
var OpenVidu = /** @class */ (function () {
    /**
     * @param urlOpenViduServer Public accessible IP where your instance of OpenVidu Server is up an running
     * @param secret Secret used on OpenVidu Server initialization
     */
    function OpenVidu(urlOpenViduServer, secret) {
        this.urlOpenViduServer = urlOpenViduServer;
        this.Buffer = require('buffer/').Buffer;
        /**
         * Array of active sessions. **This value will remain unchanged since the last time method [[OpenVidu.fetch]]
         * was called**. Exceptions to this rule are:
         *
         * - Calling [[Session.fetch]] updates that specific Session status
         * - Calling [[Session.close]] automatically removes the Session from the list of active Sessions
         * - Calling [[Session.forceDisconnect]] automatically updates the inner affected connections for that specific Session
         * - Calling [[Session.forceUnpublish]] also automatically updates the inner affected connections for that specific Session
         * - Calling [[OpenVidu.startRecording]] and [[OpenVidu.stopRecording]] automatically updates the recording status of the
         * Session ([[Session.recording]])
         *
         * To get the array of active sessions with their current actual value, you must call [[OpenVidu.fetch]] before consulting
         * property [[activeSessions]]
         */
        this.activeSessions = [];
        this.setHostnameAndPort();
        OpenVidu.basicAuth = this.getBasicAuth(secret);
        OpenVidu.o = this;
    }
    /**
     * Creates an OpenVidu session. You can call [[Session.getSessionId]] inside the resolved promise to retrieve the `sessionId`
     *
     * @returns A Promise that is resolved to the [[Session]] if success and rejected with an Error object if not.
     */
    OpenVidu.prototype.createSession = function (properties) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var session = new Session_1.Session(properties);
            session.getSessionIdHttp()
                .then(function (sessionId) {
                _this.activeSessions.push(session);
                resolve(session);
            })
                .catch(function (error) {
                reject(error);
            });
        });
    };
    /**
     * Starts the recording of a [[Session]]
     *
     * @param sessionId The `sessionId` of the [[Session]] you want to start recording
     * @param name The name you want to give to the video file. You can access this same value in your clients on recording events (`recordingStarted`, `recordingStopped`)
     * **WARNING: this parameter follows an overwriting policy.** If you name two recordings the same, the newest MP4 file will overwrite the oldest one
     *
     * @returns A Promise that is resolved to the [[Recording]] if it successfully started (the recording can be stopped with guarantees) and rejected with an Error object if not. This Error object has as `message` property with the following values:
     * - `404`: no session exists for the passed `sessionId`
     * - `400`: the session has no connected participants
     * - `409`: the session is not configured for using [[MediaMode.ROUTED]] or it is already being recorded
     * - `501`: OpenVidu Server recording module is disabled (`openvidu.recording` property set to `false`)
     */
    OpenVidu.prototype.startRecording = function (sessionId, param2) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var data;
            if (!!param2) {
                if (!(typeof param2 === 'string')) {
                    var properties = param2;
                    data = JSON.stringify({
                        session: sessionId,
                        name: !!properties.name ? properties.name : '',
                        recordingLayout: !!properties.recordingLayout ? properties.recordingLayout : '',
                        customLayout: !!properties.customLayout ? properties.customLayout : ''
                    });
                }
                else {
                    data = JSON.stringify({
                        session: sessionId,
                        name: param2,
                        recordingLayout: '',
                        customLayout: ''
                    });
                }
            }
            else {
                data = JSON.stringify({
                    session: sessionId,
                    name: '',
                    recordingLayout: '',
                    customLayout: ''
                });
            }
            axios_1.default.post('https://' + OpenVidu.hostname + ':' + OpenVidu.port + OpenVidu.API_RECORDINGS + OpenVidu.API_RECORDINGS_START, data, {
                headers: {
                    'Authorization': OpenVidu.basicAuth,
                    'Content-Type': 'application/json'
                }
            })
                .then(function (res) {
                if (res.status === 200) {
                    // SUCCESS response from openvidu-server (Recording in JSON format). Resolve new Recording
                    var r_1 = new Recording_1.Recording(res.data);
                    var activeSession = _this.activeSessions.find(function (s) { return s.sessionId === r_1.sessionId; });
                    if (!!activeSession) {
                        activeSession.recording = true;
                    }
                    else {
                        console.warn("No active session found for sessionId '" + r_1.sessionId + "'. This instance of OpenVidu Node Client didn't create this session");
                    }
                    resolve(r_1);
                }
                else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    reject(new Error(res.status.toString()));
                }
            }).catch(function (error) {
                if (error.response) {
                    // The request was made and the server responded with a status code (not 2xx)
                    reject(new Error(error.response.status.toString()));
                }
                else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    console.error(error.request);
                }
                else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('Error', error.message);
                }
            });
        });
    };
    /**
     * Stops the recording of a [[Session]]
     *
     * @param recordingId The `id` property of the [[Recording]] you want to stop
     *
     * @returns A Promise that is resolved to the [[Recording]] if it successfully stopped and rejected with an Error object if not. This Error object has as `message` property with the following values:
     * - `404`: no recording exists for the passed `recordingId`
     * - `406`: recording has `starting` status. Wait until `started` status before stopping the recording
     */
    OpenVidu.prototype.stopRecording = function (recordingId) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            axios_1.default.post('https://' + OpenVidu.hostname + ':' + OpenVidu.port + OpenVidu.API_RECORDINGS + OpenVidu.API_RECORDINGS_STOP + '/' + recordingId, undefined, {
                headers: {
                    'Authorization': OpenVidu.basicAuth,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
                .then(function (res) {
                if (res.status === 200) {
                    // SUCCESS response from openvidu-server (Recording in JSON format). Resolve new Recording
                    var r_2 = new Recording_1.Recording(res.data);
                    var activeSession = _this.activeSessions.find(function (s) { return s.sessionId === r_2.sessionId; });
                    if (!!activeSession) {
                        activeSession.recording = false;
                    }
                    else {
                        console.warn("No active session found for sessionId '" + r_2.sessionId + "'. This instance of OpenVidu Node Client didn't create this session");
                    }
                    resolve(r_2);
                }
                else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    reject(new Error(res.status.toString()));
                }
            }).catch(function (error) {
                if (error.response) {
                    // The request was made and the server responded with a status code (not 2xx)
                    reject(new Error(error.response.status.toString()));
                }
                else if (error.request) {
                    // The request was made but no response was received `error.request` is an instance of XMLHttpRequest
                    // in the browser and an instance of http.ClientRequest in node.js
                    console.error(error.request);
                }
                else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('Error', error.message);
                }
            });
        });
    };
    /**
     * Gets an existing [[Recording]]
     *
     * @param recordingId The `id` property of the [[Recording]] you want to retrieve
     *
     * @returns A Promise that is resolved to the [[Recording]] if it successfully stopped and rejected with an Error object if not. This Error object has as `message` property with the following values:
     * - `404`: no recording exists for the passed `recordingId`
     */
    OpenVidu.prototype.getRecording = function (recordingId) {
        return new Promise(function (resolve, reject) {
            axios_1.default.get('https://' + OpenVidu.hostname + ':' + OpenVidu.port + OpenVidu.API_RECORDINGS + '/' + recordingId, {
                headers: {
                    'Authorization': OpenVidu.basicAuth,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
                .then(function (res) {
                if (res.status === 200) {
                    // SUCCESS response from openvidu-server (Recording in JSON format). Resolve new Recording
                    resolve(new Recording_1.Recording(res.data));
                }
                else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    reject(new Error(res.status.toString()));
                }
            }).catch(function (error) {
                if (error.response) {
                    // The request was made and the server responded with a status code (not 2xx)
                    reject(new Error(error.response.status.toString()));
                }
                else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    console.error(error.request);
                }
                else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('Error', error.message);
                }
            });
        });
    };
    /**
     * Lists all existing recordings
     *
     * @returns A Promise that is resolved to an array with all existing recordings
     */
    OpenVidu.prototype.listRecordings = function () {
        return new Promise(function (resolve, reject) {
            axios_1.default.get('https://' + OpenVidu.hostname + ':' + OpenVidu.port + OpenVidu.API_RECORDINGS, {
                headers: {
                    Authorization: OpenVidu.basicAuth
                }
            })
                .then(function (res) {
                if (res.status === 200) {
                    // SUCCESS response from openvidu-server (JSON arrays of recordings in JSON format). Resolve list of new recordings
                    var recordingArray = [];
                    var responseItems = res.data.items;
                    for (var _i = 0, responseItems_1 = responseItems; _i < responseItems_1.length; _i++) {
                        var item = responseItems_1[_i];
                        recordingArray.push(new Recording_1.Recording(item));
                    }
                    resolve(recordingArray);
                }
                else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    reject(new Error(res.status.toString()));
                }
            }).catch(function (error) {
                if (error.response) {
                    // The request was made and the server responded with a status code (not 2xx)
                    reject(new Error(error.response.status.toString()));
                }
                else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    console.error(error.request);
                }
                else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('Error', error.message);
                }
            });
        });
    };
    /**
     * Deletes a [[Recording]]. The recording must have status `stopped` or `available`
     *
     * @param recordingId
     *
     * @returns A Promise that is resolved if the Recording was successfully deleted and rejected with an Error object if not. This Error object has as `message` property with the following values:
     * - `404`: no recording exists for the passed `recordingId`
     * - `409`: the recording has `started` status. Stop it before deletion
     */
    OpenVidu.prototype.deleteRecording = function (recordingId) {
        return new Promise(function (resolve, reject) {
            axios_1.default.delete('https://' + OpenVidu.hostname + ':' + OpenVidu.port + OpenVidu.API_RECORDINGS + '/' + recordingId, {
                headers: {
                    'Authorization': OpenVidu.basicAuth,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
                .then(function (res) {
                if (res.status === 204) {
                    // SUCCESS response from openvidu-server. Resolve undefined
                    resolve(undefined);
                }
                else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    reject(new Error(res.status.toString()));
                }
            }).catch(function (error) {
                if (error.response) {
                    // The request was made and the server responded with a status code (not 2xx)
                    reject(new Error(error.response.status.toString()));
                }
                else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    console.error(error.request);
                }
                else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('Error', error.message);
                }
            });
        });
    };
    /**
     * Updates every property of every active Session with the current status they have in OpenVidu Server.
     * After calling this method you can access the updated array of active sessions in [[activeSessions]]
     *
     * @returns A promise resolved to true if any Session status has changed with respect to the server, or to false if not.
     * This applies to any property or sub-property of any of the sessions locally stored in OpenVidu Node Client
     */
    OpenVidu.prototype.fetch = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            axios_1.default.get('https://' + OpenVidu.hostname + ':' + OpenVidu.port + OpenVidu.API_SESSIONS, {
                headers: {
                    Authorization: OpenVidu.basicAuth
                }
            })
                .then(function (res) {
                if (res.status === 200) {
                    // Array to store fetched sessionIds and later remove closed sessions
                    var fetchedSessionIds_1 = [];
                    // Boolean to store if any Session has changed
                    var hasChanged_1 = false;
                    res.data.content.forEach(function (session) {
                        fetchedSessionIds_1.push(session.sessionId);
                        var sessionIndex = -1;
                        var storedSession = _this.activeSessions.find(function (s, index) {
                            if (s.sessionId === session.sessionId) {
                                sessionIndex = index;
                                return true;
                            }
                            else {
                                return false;
                            }
                        });
                        if (!!storedSession) {
                            var fetchedSession = new Session_1.Session().resetSessionWithJson(session);
                            var changed = !storedSession.equalTo(fetchedSession);
                            if (changed) {
                                storedSession = fetchedSession;
                                _this.activeSessions[sessionIndex] = storedSession;
                            }
                            console.log("Available session '" + storedSession.sessionId + "' info fetched. Any change: " + changed);
                            hasChanged_1 = hasChanged_1 || changed;
                        }
                        else {
                            _this.activeSessions.push(new Session_1.Session(session));
                            console.log("New session '" + session.sessionId + "' info fetched");
                            hasChanged_1 = true;
                        }
                    });
                    // Remove closed sessions from activeSessions array
                    _this.activeSessions = _this.activeSessions.filter(function (session) {
                        if (fetchedSessionIds_1.includes(session.sessionId)) {
                            return true;
                        }
                        else {
                            console.log("Removing closed session '" + session.sessionId + "'");
                            hasChanged_1 = true;
                            return false;
                        }
                    });
                    console.log('Active sessions info fetched: ', fetchedSessionIds_1);
                    resolve(hasChanged_1);
                }
                else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    reject(new Error(res.status.toString()));
                }
            }).catch(function (error) {
                if (error.response) {
                    // The request was made and the server responded with a status code (not 2xx)
                    reject(new Error(error.response.status.toString()));
                }
                else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    console.error(error.request);
                }
                else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('Error', error.message);
                }
            });
        });
    };
    /**
     * @hidden
     */
    OpenVidu.prototype.fetchWebRtc = function () {
        var _this = this;
        // tslint:disable:no-string-literal
        var addWebRtcStatsToConnections = function (connection, connectionsExtendedInfo) {
            var connectionExtended = connectionsExtendedInfo.find(function (c) { return c.connectionId === connection.connectionId; });
            if (!!connectionExtended) {
                var publisherArray_1 = [];
                connection.publishers.forEach(function (pub) {
                    var publisherExtended = connectionExtended.publishers.find(function (p) { return p.streamId === pub.streamId; });
                    var pubAux = {};
                    // Standard properties
                    pubAux['streamId'] = pub.streamId;
                    pubAux['createdAt'] = pub.createdAt;
                    var mediaOptions = {
                        audioActive: pub.audioActive,
                        videoActive: pub.videoActive,
                        hasAudio: pub.hasAudio,
                        hasVideo: pub.hasVideo,
                        typeOfVideo: pub.typeOfVideo,
                        frameRate: pub.frameRate,
                        videoDimensions: pub.videoDimensions
                    };
                    pubAux['mediaOptions'] = mediaOptions;
                    var newPublisher = new Publisher_1.Publisher(pubAux);
                    // WebRtc properties
                    newPublisher['webRtc'] = {
                        kms: {
                            events: publisherExtended.events,
                            localCandidate: publisherExtended.localCandidate,
                            remoteCandidate: publisherExtended.remoteCandidate,
                            receivedCandidates: publisherExtended.receivedCandidates,
                            webrtcTagName: publisherExtended.webrtcTagName
                        }
                    };
                    newPublisher['localCandidatePair'] = parseRemoteCandidatePair(newPublisher['webRtc'].kms.remoteCandidate);
                    if (!!publisherExtended.serverStats) {
                        newPublisher['webRtc'].kms.serverStats = publisherExtended.serverStats;
                    }
                    publisherArray_1.push(newPublisher);
                });
                var subscriberArray_1 = [];
                connection.subscribers.forEach(function (sub) {
                    var subscriberExtended = connectionExtended.subscribers.find(function (s) { return s.streamId === sub; });
                    var subAux = {};
                    // Standard properties
                    subAux['streamId'] = sub;
                    subAux['publisher'] = subscriberExtended.publisher;
                    // WebRtc properties
                    subAux['createdAt'] = subscriberExtended.createdAt;
                    subAux['webRtc'] = {
                        kms: {
                            events: subscriberExtended.events,
                            localCandidate: subscriberExtended.localCandidate,
                            remoteCandidate: subscriberExtended.remoteCandidate,
                            receivedCandidates: subscriberExtended.receivedCandidates,
                            webrtcTagName: subscriberExtended.webrtcTagName
                        }
                    };
                    subAux['localCandidatePair'] = parseRemoteCandidatePair(subAux['webRtc'].kms.remoteCandidate);
                    if (!!subscriberExtended.serverStats) {
                        subAux['webRtc'].kms.serverStats = subscriberExtended.serverStats;
                    }
                    subscriberArray_1.push(subAux);
                });
                connection.publishers = publisherArray_1;
                connection.subscribers = subscriberArray_1;
            }
        };
        var parseRemoteCandidatePair = function (candidateStr) {
            if (!candidateStr) {
                return 'ERROR: No remote candidate available';
            }
            var array = candidateStr.split(/\s+/);
            return {
                portNumber: array[5],
                ipAddress: array[4],
                transport: array[2].toLowerCase(),
                candidateType: array[7],
                priority: array[3],
                raw: candidateStr
            };
        };
        return new Promise(function (resolve, reject) {
            axios_1.default.get('https://' + OpenVidu.hostname + ':' + OpenVidu.port + OpenVidu.API_SESSIONS + '?webRtcStats=true', {
                headers: {
                    Authorization: OpenVidu.basicAuth
                }
            })
                .then(function (res) {
                if (res.status === 200) {
                    // Array to store fetched sessionIds and later remove closed sessions
                    var fetchedSessionIds_2 = [];
                    // Boolean to store if any Session has changed
                    var hasChanged_2 = false;
                    res.data.content.forEach(function (session) {
                        fetchedSessionIds_2.push(session.sessionId);
                        var sessionIndex = -1;
                        var storedSession = _this.activeSessions.find(function (s, index) {
                            if (s.sessionId === session.sessionId) {
                                sessionIndex = index;
                                return true;
                            }
                            else {
                                return false;
                            }
                        });
                        if (!!storedSession) {
                            var fetchedSession = new Session_1.Session().resetSessionWithJson(session);
                            fetchedSession.activeConnections.forEach(function (connection) {
                                addWebRtcStatsToConnections(connection, session.connections.content);
                            });
                            var changed_1 = !storedSession.equalTo(fetchedSession);
                            if (!changed_1) { // Check if server webrtc information has changed in any Publisher object (Session.equalTo does not check Publisher.webRtc auxiliary object)
                                fetchedSession.activeConnections.forEach(function (connection, index1) {
                                    for (var index2 = 0; (index2 < connection['publishers'].length && !changed_1); index2++) {
                                        changed_1 = changed_1 || JSON.stringify(connection['publishers'][index2]['webRtc']) !== JSON.stringify(storedSession.activeConnections[index1]['publishers'][index2]['webRtc']);
                                    }
                                });
                            }
                            if (changed_1) {
                                storedSession = fetchedSession;
                                _this.activeSessions[sessionIndex] = storedSession;
                            }
                            console.log("Available session '" + storedSession.sessionId + "' info fetched. Any change: " + changed_1);
                            hasChanged_2 = hasChanged_2 || changed_1;
                        }
                        else {
                            var newSession = new Session_1.Session(session);
                            newSession.activeConnections.forEach(function (connection) {
                                addWebRtcStatsToConnections(connection, session.connections.content);
                            });
                            _this.activeSessions.push(newSession);
                            console.log("New session '" + session.sessionId + "' info fetched");
                            hasChanged_2 = true;
                        }
                    });
                    // Remove closed sessions from activeSessions array
                    _this.activeSessions = _this.activeSessions.filter(function (session) {
                        if (fetchedSessionIds_2.includes(session.sessionId)) {
                            return true;
                        }
                        else {
                            console.log("Removing closed session '" + session.sessionId + "'");
                            hasChanged_2 = true;
                            return false;
                        }
                    });
                    console.log('Active sessions info fetched: ', fetchedSessionIds_2);
                    resolve(hasChanged_2);
                }
                else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    reject(new Error(res.status.toString()));
                }
            }).catch(function (error) {
                if (error.response) {
                    // The request was made and the server responded with a status code (not 2xx)
                    reject(new Error(error.response.status.toString()));
                }
                else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    console.error(error.request);
                }
                else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('Error', error.message);
                }
            });
        });
    };
    // tslint:enable:no-string-literal
    OpenVidu.prototype.getBasicAuth = function (secret) {
        return 'Basic ' + this.Buffer('OPENVIDUAPP:' + secret).toString('base64');
    };
    OpenVidu.prototype.setHostnameAndPort = function () {
        var urlSplitted = this.urlOpenViduServer.split(':');
        if (urlSplitted.length === 3) { // URL has format: http:// + hostname + :port
            OpenVidu.hostname = this.urlOpenViduServer.split(':')[1].replace(/\//g, '');
            OpenVidu.port = parseInt(this.urlOpenViduServer.split(':')[2].replace(/\//g, ''));
        }
        else if (urlSplitted.length === 2) { // URL has format: hostname + :port
            OpenVidu.hostname = this.urlOpenViduServer.split(':')[0].replace(/\//g, '');
            OpenVidu.port = parseInt(this.urlOpenViduServer.split(':')[1].replace(/\//g, ''));
        }
        else {
            console.error("URL format incorrect: it must contain hostname and port (current value: '" + this.urlOpenViduServer + "')");
        }
    };
    /**
     * @hidden
     */
    OpenVidu.getActiveSessions = function () {
        return this.o.activeSessions;
    };
    /**
     * @hidden
     */
    OpenVidu.API_RECORDINGS = '/api/recordings';
    /**
     * @hidden
     */
    OpenVidu.API_RECORDINGS_START = '/start';
    /**
     * @hidden
     */
    OpenVidu.API_RECORDINGS_STOP = '/stop';
    /**
     * @hidden
     */
    OpenVidu.API_SESSIONS = '/api/sessions';
    /**
     * @hidden
     */
    OpenVidu.API_TOKENS = '/api/tokens';
    return OpenVidu;
}());
exports.OpenVidu = OpenVidu;
//# sourceMappingURL=OpenVidu.js.map