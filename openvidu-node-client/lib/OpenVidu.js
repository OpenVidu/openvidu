"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var Session_1 = require("./Session");
var Recording_1 = require("./Recording");
var https = require('https');
var OpenVidu = /** @class */ (function () {
    function OpenVidu(urlOpenViduServer, secret) {
        this.urlOpenViduServer = urlOpenViduServer;
        this.setHostnameAndPort();
        this.basicAuth = this.getBasicAuth(secret);
    }
    OpenVidu.prototype.createSession = function (properties) {
        return new Session_1.Session(this.hostname, this.port, this.basicAuth, properties);
    };
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
        if (urlSplitted.length === 3) {
            this.hostname = this.urlOpenViduServer.split(':')[1].replace(/\//g, '');
            this.port = parseInt(this.urlOpenViduServer.split(':')[2].replace(/\//g, ''));
        }
        else if (urlSplitted.length === 2) {
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