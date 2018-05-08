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
var Session_1 = require("./Session");
var Recording_1 = require("./Recording");
/**
 * @hidden
 */
var https = require('https');
var OpenVidu = /** @class */ (function () {
    /**
     * @param urlOpenViduServer Public accessible IP where your instance of OpenVidu Server is up an running
     * @param secret Secret used on OpenVidu Server initialization
     */
    function OpenVidu(urlOpenViduServer, secret) {
        this.urlOpenViduServer = urlOpenViduServer;
        this.setHostnameAndPort();
        this.basicAuth = this.getBasicAuth(secret);
    }
    /**
     * Creates an OpenVidu session. You can call [[Session.getSessionId]] in the resolved promise to retrieve the `sessionId`
     *
     * @returns A Promise that is resolved to the [[Session]] if success and rejected with an Error object if not.
     */
    OpenVidu.prototype.createSession = function (properties) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var session = new Session_1.Session(_this.hostname, _this.port, _this.basicAuth, properties);
            session.getSessionIdHttp()
                .then(function (sessionId) {
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
            var requestBody;
            if (!!param2) {
                if (!(typeof param2 === 'string')) {
                    var properties = param2;
                    requestBody = JSON.stringify({
                        session: sessionId,
                        name: !!properties.name ? properties.name : '',
                        recordingLayout: !!properties.recordingLayout ? properties.recordingLayout : '',
                        customLayout: !!properties.customLayout ? properties.customLayout : ''
                    });
                }
                else {
                    requestBody = JSON.stringify({
                        session: sessionId,
                        name: param2,
                        recordingLayout: '',
                        customLayout: ''
                    });
                }
            }
            else {
                requestBody = JSON.stringify({
                    session: sessionId,
                    name: '',
                    recordingLayout: '',
                    customLayout: ''
                });
            }
            var options = {
                hostname: _this.hostname,
                port: _this.port,
                path: OpenVidu.API_RECORDINGS + OpenVidu.API_RECORDINGS_START,
                method: 'POST',
                headers: {
                    'Authorization': _this.basicAuth,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(requestBody)
                }
            };
            var req = https.request(options, function (res) {
                var body = '';
                res.on('data', function (d) {
                    // Continuously update stream with data
                    body += d;
                });
                res.on('end', function () {
                    if (res.statusCode === 200) {
                        // SUCCESS response from openvidu-server (Recording in JSON format). Resolve new Recording
                        resolve(new Recording_1.Recording(JSON.parse(body)));
                    }
                    else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        reject(new Error(res.statusCode));
                    }
                });
            });
            req.on('error', function (e) {
                reject(new Error(e));
            });
            req.write(requestBody);
            req.end();
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
            var options = {
                hostname: _this.hostname,
                port: _this.port,
                path: OpenVidu.API_RECORDINGS + OpenVidu.API_RECORDINGS_STOP + '/' + recordingId,
                method: 'POST',
                headers: {
                    'Authorization': _this.basicAuth,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };
            var req = https.request(options, function (res) {
                var body = '';
                res.on('data', function (d) {
                    // Continuously update stream with data
                    body += d;
                });
                res.on('end', function () {
                    if (res.statusCode === 200) {
                        // SUCCESS response from openvidu-server (Recording in JSON format). Resolve new Recording
                        resolve(new Recording_1.Recording(JSON.parse(body)));
                    }
                    else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        reject(new Error(res.statusCode));
                    }
                });
            });
            req.on('error', function (e) {
                reject(new Error(e));
            });
            // req.write();
            req.end();
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
        var _this = this;
        return new Promise(function (resolve, reject) {
            var options = {
                hostname: _this.hostname,
                port: _this.port,
                path: OpenVidu.API_RECORDINGS + '/' + recordingId,
                method: 'GET',
                headers: {
                    'Authorization': _this.basicAuth,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };
            var req = https.request(options, function (res) {
                var body = '';
                res.on('data', function (d) {
                    // Continuously update stream with data
                    body += d;
                });
                res.on('end', function () {
                    if (res.statusCode === 200) {
                        // SUCCESS response from openvidu-server (Recording in JSON format). Resolve new Recording
                        resolve(new Recording_1.Recording(JSON.parse(body)));
                    }
                    else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        reject(new Error(res.statusCode));
                    }
                });
            });
            req.on('error', function (e) {
                reject(new Error(e));
            });
            // req.write();
            req.end();
        });
    };
    /**
     * Lists all existing recordings
     *
     * @returns A Promise that is resolved to an array with all existing recordings
     */
    OpenVidu.prototype.listRecordings = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var options = {
                hostname: _this.hostname,
                port: _this.port,
                path: OpenVidu.API_RECORDINGS,
                method: 'GET',
                headers: {
                    'Authorization': _this.basicAuth,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };
            var req = https.request(options, function (res) {
                var body = '';
                res.on('data', function (d) {
                    // Continuously update stream with data
                    body += d;
                });
                res.on('end', function () {
                    if (res.statusCode === 200) {
                        // SUCCESS response from openvidu-server (JSON arrays of recordings in JSON format). Resolve list of new recordings
                        var recordingArray = [];
                        var responseItems = JSON.parse(body).items;
                        for (var _i = 0, responseItems_1 = responseItems; _i < responseItems_1.length; _i++) {
                            var item = responseItems_1[_i];
                            recordingArray.push(new Recording_1.Recording(item));
                        }
                        resolve(recordingArray);
                    }
                    else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        reject(new Error(res.statusCode));
                    }
                });
            });
            req.on('error', function (e) {
                reject(new Error(e));
            });
            // req.write();
            req.end();
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
        var _this = this;
        return new Promise(function (resolve, reject) {
            var options = {
                hostname: _this.hostname,
                port: _this.port,
                path: OpenVidu.API_RECORDINGS + '/' + recordingId,
                method: 'DELETE',
                headers: {
                    'Authorization': _this.basicAuth,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };
            var req = https.request(options, function (res) {
                var body = '';
                res.on('data', function (d) {
                    // Continuously update stream with data
                    body += d;
                });
                res.on('end', function () {
                    if (res.statusCode === 204) {
                        // SUCCESS response from openvidu-server. Resolve undefined
                        resolve(undefined);
                    }
                    else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        reject(new Error(res.statusCode));
                    }
                });
            });
            req.on('error', function (e) {
                reject(new Error(e));
            });
            // req.write();
            req.end();
        });
    };
    OpenVidu.prototype.getBasicAuth = function (secret) {
        return 'Basic ' + (new Buffer('OPENVIDUAPP:' + secret).toString('base64'));
    };
    OpenVidu.prototype.setHostnameAndPort = function () {
        var urlSplitted = this.urlOpenViduServer.split(':');
        if (urlSplitted.length === 3) { // URL has format: http:// + hostname + :port
            this.hostname = this.urlOpenViduServer.split(':')[1].replace(/\//g, '');
            this.port = parseInt(this.urlOpenViduServer.split(':')[2].replace(/\//g, ''));
        }
        else if (urlSplitted.length === 2) { // URL has format: hostname + :port
            this.hostname = this.urlOpenViduServer.split(':')[0].replace(/\//g, '');
            this.port = parseInt(this.urlOpenViduServer.split(':')[1].replace(/\//g, ''));
        }
        else {
            console.error("URL format incorrect: it must contain hostname and port (current value: '" + this.urlOpenViduServer + "')");
        }
    };
    OpenVidu.API_RECORDINGS = '/api/recordings';
    OpenVidu.API_RECORDINGS_START = '/start';
    OpenVidu.API_RECORDINGS_STOP = '/stop';
    return OpenVidu;
}());
exports.OpenVidu = OpenVidu;
//# sourceMappingURL=OpenVidu.js.map