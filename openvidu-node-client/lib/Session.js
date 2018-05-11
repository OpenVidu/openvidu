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
var MediaMode_1 = require("./MediaMode");
var OpenViduRole_1 = require("./OpenViduRole");
var RecordingLayout_1 = require("./RecordingLayout");
var RecordingMode_1 = require("./RecordingMode");
/**
 * @hidden
 */
var https = require('https');
var Session = /** @class */ (function () {
    function Session(hostname, port, basicAuth, properties) {
        this.hostname = hostname;
        this.port = port;
        this.basicAuth = basicAuth;
        if (!properties) {
            this.properties = {};
        }
        else {
            this.properties = properties;
        }
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
            var requestBody = JSON.stringify({
                session: _this.sessionId,
                role: (!!tokenOptions && !!tokenOptions.role) ? tokenOptions.role : OpenViduRole_1.OpenViduRole.PUBLISHER,
                data: (!!tokenOptions && !!tokenOptions.data) ? tokenOptions.data : ''
            });
            var options = {
                hostname: _this.hostname,
                port: _this.port,
                path: Session.API_TOKENS,
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
                        // SUCCESS response from openvidu-server. Resolve token
                        var parsed = JSON.parse(body);
                        resolve(parsed.id);
                    }
                    else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        reject(new Error(res.statusCode));
                    }
                });
            });
            req.on('error', function (e) {
                reject(e);
            });
            req.write(requestBody);
            req.end();
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
            var requestBody = JSON.stringify({
                mediaMode: !!_this.properties.mediaMode ? _this.properties.mediaMode : MediaMode_1.MediaMode.ROUTED,
                recordingMode: !!_this.properties.recordingMode ? _this.properties.recordingMode : RecordingMode_1.RecordingMode.MANUAL,
                defaultRecordingLayout: !!_this.properties.defaultRecordingLayout ? _this.properties.defaultRecordingLayout : RecordingLayout_1.RecordingLayout.BEST_FIT,
                defaultCustomLayout: !!_this.properties.defaultCustomLayout ? _this.properties.defaultCustomLayout : '',
                customSessionId: !!_this.properties.customSessionId ? _this.properties.customSessionId : ''
            });
            var options = {
                hostname: _this.hostname,
                port: _this.port,
                path: Session.API_SESSIONS,
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
                        // SUCCESS response from openvidu-server. Resolve sessionId
                        var parsed = JSON.parse(body);
                        _this.sessionId = parsed.id;
                        resolve(parsed.id);
                    }
                    else if (res.statusCode === 409) {
                        // 'customSessionId' already existed
                        _this.sessionId = _this.properties.customSessionId;
                        resolve(_this.sessionId);
                    }
                    else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        reject(new Error(res.statusCode));
                    }
                });
            });
            req.on('error', function (e) {
                reject(e);
            });
            req.write(requestBody);
            req.end();
        });
    };
    Session.API_SESSIONS = '/api/sessions';
    Session.API_TOKENS = '/api/tokens';
    return Session;
}());
exports.Session = Session;
//# sourceMappingURL=Session.js.map