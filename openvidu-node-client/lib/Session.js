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
var Connection_1 = require("./Connection");
var MediaMode_1 = require("./MediaMode");
var OpenVidu_1 = require("./OpenVidu");
var OpenViduRole_1 = require("./OpenViduRole");
var Publisher_1 = require("./Publisher");
var RecordingLayout_1 = require("./RecordingLayout");
var RecordingMode_1 = require("./RecordingMode");
var Session = /** @class */ (function () {
    /**
     * @hidden
     */
    function Session(propertiesOrJson) {
        /**
         * Array of active connections to the session. This property always initialize as an empty array and
         * **will remain unchanged since the last time method [[Session.fetch]] was called**. Exceptions to this rule are:
         *
         * - Calling [[Session.forceUnpublish]] also automatically updates each affected Connection status
         * - Calling [[Session.forceDisconnect]] automatically updates each affected Connection status
         *
         * To get the array of active connections with their current actual value, you must call [[Session.fetch]] before consulting
         * property [[activeConnections]]
         */
        this.activeConnections = [];
        /**
         * Whether the session is being recorded or not
         */
        this.recording = false;
        if (!!propertiesOrJson) {
            // Defined parameter
            if (!!propertiesOrJson.sessionId) {
                // Parameter is a JSON representation of Session ('sessionId' property always defined)
                this.resetSessionWithJson(propertiesOrJson);
            }
            else {
                // Parameter is a SessionProperties object
                this.properties = propertiesOrJson;
            }
        }
        else {
            // Empty parameter
            this.properties = {};
        }
        this.properties.mediaMode = !!this.properties.mediaMode ? this.properties.mediaMode : MediaMode_1.MediaMode.ROUTED;
        this.properties.recordingMode = !!this.properties.recordingMode ? this.properties.recordingMode : RecordingMode_1.RecordingMode.MANUAL;
        this.properties.defaultRecordingLayout = !!this.properties.defaultRecordingLayout ? this.properties.defaultRecordingLayout : RecordingLayout_1.RecordingLayout.BEST_FIT;
    }
    /**
     * Gets the unique identifier of the Session
     */
    Session.prototype.getSessionId = function () {
        return this.sessionId;
    };
    /**
     * Gets a new token associated to Session object
     *
     * @returns A Promise that is resolved to the _token_ if success and rejected with an Error object if not
     */
    Session.prototype.generateToken = function (tokenOptions) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var data = JSON.stringify({
                session: _this.sessionId,
                role: (!!tokenOptions && !!tokenOptions.role) ? tokenOptions.role : OpenViduRole_1.OpenViduRole.PUBLISHER,
                data: (!!tokenOptions && !!tokenOptions.data) ? tokenOptions.data : '',
                kurentoOptions: (!!tokenOptions && !!tokenOptions.kurentoOptions) ? tokenOptions.kurentoOptions : {},
            });
            axios_1.default.post('https://' + OpenVidu_1.OpenVidu.hostname + ':' + OpenVidu_1.OpenVidu.port + OpenVidu_1.OpenVidu.API_TOKENS, data, {
                headers: {
                    'Authorization': OpenVidu_1.OpenVidu.basicAuth,
                    'Content-Type': 'application/json'
                }
            })
                .then(function (res) {
                if (res.status === 200) {
                    // SUCCESS response from openvidu-server. Resolve token
                    resolve(res.data.id);
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
                    reject(new Error(error.request));
                }
                else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('Error', error.message);
                    reject(new Error(error.message));
                }
            });
        });
    };
    /**
     * Gracefully closes the Session: unpublishes all streams and evicts every participant
     *
     * @returns A Promise that is resolved if the session has been closed successfully and rejected with an Error object if not
     */
    Session.prototype.close = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            axios_1.default.delete('https://' + OpenVidu_1.OpenVidu.hostname + ':' + OpenVidu_1.OpenVidu.port + OpenVidu_1.OpenVidu.API_SESSIONS + '/' + _this.sessionId, {
                headers: {
                    'Authorization': OpenVidu_1.OpenVidu.basicAuth,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
                .then(function (res) {
                if (res.status === 204) {
                    // SUCCESS response from openvidu-server
                    var indexToRemove = OpenVidu_1.OpenVidu.getActiveSessions().findIndex(function (s) { return s.sessionId === _this.sessionId; });
                    OpenVidu_1.OpenVidu.getActiveSessions().splice(indexToRemove, 1);
                    resolve();
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
                    reject(new Error(error.request));
                }
                else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('Error', error.message);
                    reject(new Error(error.message));
                }
            });
        });
    };
    /**
     * Updates every property of the Session with the current status it has in OpenVidu Server. This is especially useful for accessing the list of active
     * connections of the Session ([[Session.activeConnections]]) and use those values to call [[Session.forceDisconnect]] or [[Session.forceUnpublish]].
     *
     * To update every Session object owned by OpenVidu object, call [[OpenVidu.fetch]]
     *
     * @returns A promise resolved to true if the Session status has changed with respect to the server, or to false if not.
     *          This applies to any property or sub-property of the Session object
     */
    Session.prototype.fetch = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var beforeJSON = JSON.stringify(_this);
            axios_1.default.get('https://' + OpenVidu_1.OpenVidu.hostname + ':' + OpenVidu_1.OpenVidu.port + OpenVidu_1.OpenVidu.API_SESSIONS + '/' + _this.sessionId, {
                headers: {
                    'Authorization': OpenVidu_1.OpenVidu.basicAuth,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
                .then(function (res) {
                if (res.status === 200) {
                    // SUCCESS response from openvidu-server
                    _this.resetSessionWithJson(res.data);
                    var afterJSON = JSON.stringify(_this);
                    var hasChanged = !(beforeJSON === afterJSON);
                    console.log("Session info fetched for session '" + _this.sessionId + "'. Any change: " + hasChanged);
                    resolve(hasChanged);
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
                    reject(new Error(error.request));
                }
                else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('Error', error.message);
                    reject(new Error(error.message));
                }
            });
        });
    };
    /**
     * Forces the user with Connection `connectionId` to leave the session. OpenVidu Browser will trigger the proper events on the client-side
     * (`streamDestroyed`, `connectionDestroyed`, `sessionDisconnected`) with reason set to `"forceDisconnectByServer"`
     *
     * You can get `connection` parameter from [[Session.activeConnections]] array ([[Connection.connectionId]] for getting each `connectionId` property).
     * Remember to call [[Session.fetch]] before to fetch the current actual properties of the Session from OpenVidu Server
     *
     * @returns A Promise that is resolved if the user was successfully disconnected and rejected with an Error object if not
     */
    Session.prototype.forceDisconnect = function (connection) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var connectionId = typeof connection === 'string' ? connection : connection.connectionId;
            axios_1.default.delete('https://' + OpenVidu_1.OpenVidu.hostname + ':' + OpenVidu_1.OpenVidu.port + OpenVidu_1.OpenVidu.API_SESSIONS + '/' + _this.sessionId + '/connection/' + connectionId, {
                headers: {
                    'Authorization': OpenVidu_1.OpenVidu.basicAuth,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
                .then(function (res) {
                if (res.status === 204) {
                    // SUCCESS response from openvidu-server
                    // Remove connection from activeConnections array
                    var connectionClosed_1;
                    _this.activeConnections = _this.activeConnections.filter(function (con) {
                        if (con.connectionId !== connectionId) {
                            return true;
                        }
                        else {
                            connectionClosed_1 = con;
                            return false;
                        }
                    });
                    // Remove every Publisher of the closed connection from every subscriber list of other connections
                    if (!!connectionClosed_1) {
                        connectionClosed_1.publishers.forEach(function (publisher) {
                            _this.activeConnections.forEach(function (con) {
                                con.subscribers = con.subscribers.filter(function (subscriber) {
                                    // tslint:disable:no-string-literal
                                    if (!!subscriber['streamId']) {
                                        // Subscriber with advanced webRtc configuration properties
                                        return (subscriber['streamId'] !== publisher.streamId);
                                        // tslint:enable:no-string-literal
                                    }
                                    else {
                                        // Regular string subscribers
                                        return subscriber !== publisher.streamId;
                                    }
                                });
                            });
                        });
                    }
                    else {
                        console.warn("The closed connection wasn't fetched in OpenVidu Java Client. No changes in the collection of active connections of the Session");
                    }
                    console.log("Connection '" + connectionId + "' closed");
                    resolve();
                }
                else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    reject(new Error(res.status.toString()));
                }
            })
                .catch(function (error) {
                if (error.response) {
                    // The request was made and the server responded with a status code (not 2xx)
                    reject(new Error(error.response.status.toString()));
                }
                else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    console.error(error.request);
                    reject(new Error(error.request));
                }
                else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('Error', error.message);
                    reject(new Error(error.message));
                }
            });
        });
    };
    /**
     * Forces some user to unpublish a Stream (identified by its `streamId` or the corresponding [[Publisher]] object owning it).
     * OpenVidu Browser will trigger the proper events on the client-side (`streamDestroyed`) with reason set to `"forceUnpublishByServer"`.
     *
     * You can get `publisher` parameter from [[Connection.publishers]] array ([[Publisher.streamId]] for getting each `streamId` property).
     * Remember to call [[Session.fetch]] before to fetch the current actual properties of the Session from OpenVidu Server
     *
     * @returns A Promise that is resolved if the stream was successfully unpublished and rejected with an Error object if not
     */
    Session.prototype.forceUnpublish = function (publisher) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var streamId = typeof publisher === 'string' ? publisher : publisher.streamId;
            axios_1.default.delete('https://' + OpenVidu_1.OpenVidu.hostname + ':' + OpenVidu_1.OpenVidu.port + OpenVidu_1.OpenVidu.API_SESSIONS + '/' + _this.sessionId + '/stream/' + streamId, {
                headers: {
                    'Authorization': OpenVidu_1.OpenVidu.basicAuth,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })
                .then(function (res) {
                if (res.status === 204) {
                    // SUCCESS response from openvidu-server
                    _this.activeConnections.forEach(function (connection) {
                        // Try to remove the Publisher from the Connection publishers collection
                        connection.publishers = connection.publishers.filter(function (pub) { return pub.streamId !== streamId; });
                        // Try to remove the Publisher from the Connection subscribers collection
                        if (!!connection.subscribers && connection.subscribers.length > 0) {
                            // tslint:disable:no-string-literal
                            if (!!connection.subscribers[0]['streamId']) {
                                // Subscriber with advanced webRtc configuration properties
                                connection.subscribers = connection.subscribers.filter(function (sub) { return sub['streamId'] !== streamId; });
                                // tslint:enable:no-string-literal
                            }
                            else {
                                // Regular string subscribers
                                connection.subscribers = connection.subscribers.filter(function (sub) { return sub !== streamId; });
                            }
                        }
                    });
                    console.log("Stream '" + streamId + "' unpublished");
                    resolve();
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
                    reject(new Error(error.request));
                }
                else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('Error', error.message);
                    reject(new Error(error.message));
                }
            });
        });
    };
    /**
     * @hidden
     */
    Session.prototype.getSessionIdHttp = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (!!_this.sessionId) {
                resolve(_this.sessionId);
            }
            var data = JSON.stringify({
                mediaMode: !!_this.properties.mediaMode ? _this.properties.mediaMode : MediaMode_1.MediaMode.ROUTED,
                recordingMode: !!_this.properties.recordingMode ? _this.properties.recordingMode : RecordingMode_1.RecordingMode.MANUAL,
                defaultRecordingLayout: !!_this.properties.defaultRecordingLayout ? _this.properties.defaultRecordingLayout : RecordingLayout_1.RecordingLayout.BEST_FIT,
                defaultCustomLayout: !!_this.properties.defaultCustomLayout ? _this.properties.defaultCustomLayout : '',
                customSessionId: !!_this.properties.customSessionId ? _this.properties.customSessionId : ''
            });
            axios_1.default.post('https://' + OpenVidu_1.OpenVidu.hostname + ':' + OpenVidu_1.OpenVidu.port + OpenVidu_1.OpenVidu.API_SESSIONS, data, {
                headers: {
                    'Authorization': OpenVidu_1.OpenVidu.basicAuth,
                    'Content-Type': 'application/json'
                }
            })
                .then(function (res) {
                if (res.status === 200) {
                    // SUCCESS response from openvidu-server. Resolve token
                    _this.sessionId = res.data.id;
                    _this.createdAt = res.data.createdAt;
                    resolve(_this.sessionId);
                }
                else {
                    // ERROR response from openvidu-server. Resolve HTTP status
                    reject(new Error(res.status.toString()));
                }
            }).catch(function (error) {
                if (error.response) {
                    // The request was made and the server responded with a status code (not 2xx)
                    if (error.response.status === 409) {
                        // 'customSessionId' already existed
                        _this.sessionId = _this.properties.customSessionId;
                        resolve(_this.sessionId);
                    }
                    else {
                        reject(new Error(error.response.status.toString()));
                    }
                }
                else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    console.error(error.request);
                    reject(new Error(error.request));
                }
                else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('Error', error.message);
                    reject(new Error(error.message));
                }
            });
        });
    };
    /**
     * @hidden
     */
    Session.prototype.resetSessionWithJson = function (json) {
        var _this = this;
        this.sessionId = json.sessionId;
        this.createdAt = json.createdAt;
        this.recording = json.recording;
        var customSessionId;
        var defaultCustomLayout;
        if (!!this.properties) {
            customSessionId = this.properties.customSessionId;
            defaultCustomLayout = !!json.defaultCustomLayout ? json.defaultCustomLayout : this.properties.defaultCustomLayout;
        }
        this.properties = {
            mediaMode: json.mediaMode,
            recordingMode: json.recordingMode,
            defaultRecordingLayout: json.defaultRecordingLayout
        };
        if (!!customSessionId) {
            this.properties.customSessionId = customSessionId;
        }
        else if (!!json.customSessionId) {
            this.properties.customSessionId = json.customSessionId;
        }
        if (!!defaultCustomLayout) {
            this.properties.defaultCustomLayout = defaultCustomLayout;
        }
        this.activeConnections = [];
        json.connections.content.forEach(function (connection) {
            var publishers = [];
            connection.publishers.forEach(function (publisher) {
                publishers.push(new Publisher_1.Publisher(publisher));
            });
            var subscribers = [];
            connection.subscribers.forEach(function (subscriber) {
                subscribers.push(subscriber.streamId);
            });
            _this.activeConnections.push(new Connection_1.Connection(connection.connectionId, connection.createdAt, connection.role, connection.token, connection.location, connection.platform, connection.serverData, connection.clientData, publishers, subscribers));
        });
        // Order connections by time of creation
        this.activeConnections.sort(function (c1, c2) { return (c1.createdAt > c2.createdAt) ? 1 : ((c2.createdAt > c1.createdAt) ? -1 : 0); });
        return this;
    };
    /**
     * @hidden
     */
    Session.prototype.equalTo = function (other) {
        var equals = (this.sessionId === other.sessionId &&
            this.createdAt === other.createdAt &&
            this.recording === other.recording &&
            this.activeConnections.length === other.activeConnections.length &&
            JSON.stringify(this.properties) === JSON.stringify(other.properties));
        if (equals) {
            var i = 0;
            while (equals && i < this.activeConnections.length) {
                equals = this.activeConnections[i].equalTo(other.activeConnections[i]);
                i++;
            }
            return equals;
        }
        else {
            return false;
        }
    };
    return Session;
}());
exports.Session = Session;
//# sourceMappingURL=Session.js.map