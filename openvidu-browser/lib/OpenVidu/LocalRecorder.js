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
var LocalRecorderState_1 = require("../OpenViduInternal/Enums/LocalRecorderState");
var platform = require("platform");
/**
 * Easy recording of [[Stream]] objects straightaway from the browser. Initialized with [[OpenVidu.initLocalRecorder]] method
 *
 * > WARNINGS:
 * - Performing browser local recording of **remote streams** may cause some troubles. A long waiting time may be required after calling _LocalRecorder.stop()_ in this case
 * - Only Chrome and Firefox support local stream recording
 */
var LocalRecorder = /** @class */ (function () {
    /**
     * @hidden
     */
    function LocalRecorder(stream) {
        this.stream = stream;
        this.chunks = [];
        this.connectionId = (!!this.stream.connection) ? this.stream.connection.connectionId : 'default-connection';
        this.id = this.stream.streamId + '_' + this.connectionId + '_localrecord';
        this.state = LocalRecorderState_1.LocalRecorderState.READY;
    }
    /**
     * Starts the recording of the Stream. [[state]] property must be `READY`. After method succeeds is set to `RECORDING`
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the recording successfully started and rejected with an Error object if not
     */
    LocalRecorder.prototype.record = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (typeof MediaRecorder === 'undefined') {
                    console.error('MediaRecorder not supported on your browser. See compatibility in https://caniuse.com/#search=MediaRecorder');
                    throw (Error('MediaRecorder not supported on your browser. See compatibility in https://caniuse.com/#search=MediaRecorder'));
                }
                if (_this.state !== LocalRecorderState_1.LocalRecorderState.READY) {
                    throw (Error('\'LocalRecord.record()\' needs \'LocalRecord.state\' to be \'READY\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.clean()\' or init a new LocalRecorder before'));
                }
                console.log("Starting local recording of stream '" + _this.stream.streamId + "' of connection '" + _this.connectionId + "'");
                if (typeof MediaRecorder.isTypeSupported === 'function') {
                    var options = void 0;
                    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
                        options = { mimeType: 'video/webm;codecs=vp9' };
                    }
                    else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
                        options = { mimeType: 'video/webm;codecs=h264' };
                    }
                    else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
                        options = { mimeType: 'video/webm;codecs=vp8' };
                    }
                    console.log('Using mimeType ' + options.mimeType);
                    _this.mediaRecorder = new MediaRecorder(_this.stream.getMediaStream(), options);
                }
                else {
                    console.warn('isTypeSupported is not supported, using default codecs for browser');
                    _this.mediaRecorder = new MediaRecorder(_this.stream.getMediaStream());
                }
                _this.mediaRecorder.start(10);
            }
            catch (err) {
                reject(err);
            }
            _this.mediaRecorder.ondataavailable = function (e) {
                _this.chunks.push(e.data);
            };
            _this.mediaRecorder.onerror = function (e) {
                console.error('MediaRecorder error: ', e);
            };
            _this.mediaRecorder.onstart = function () {
                console.log('MediaRecorder started (state=' + _this.mediaRecorder.state + ')');
            };
            _this.mediaRecorder.onstop = function () {
                _this.onStopDefault();
            };
            _this.mediaRecorder.onpause = function () {
                console.log('MediaRecorder paused (state=' + _this.mediaRecorder.state + ')');
            };
            _this.mediaRecorder.onresume = function () {
                console.log('MediaRecorder resumed (state=' + _this.mediaRecorder.state + ')');
            };
            _this.mediaRecorder.onwarning = function (e) {
                console.log('MediaRecorder warning: ' + e);
            };
            _this.state = LocalRecorderState_1.LocalRecorderState.RECORDING;
            resolve();
        });
    };
    /**
     * Ends the recording of the Stream. [[state]] property must be `RECORDING` or `PAUSED`. After method succeeds is set to `FINISHED`
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the recording successfully stopped and rejected with an Error object if not
     */
    LocalRecorder.prototype.stop = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (_this.state === LocalRecorderState_1.LocalRecorderState.READY || _this.state === LocalRecorderState_1.LocalRecorderState.FINISHED) {
                    throw (Error('\'LocalRecord.stop()\' needs \'LocalRecord.state\' to be \'RECORDING\' or \'PAUSED\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.start()\' before'));
                }
                _this.mediaRecorder.onstop = function () {
                    _this.onStopDefault();
                    resolve();
                };
                _this.mediaRecorder.stop();
            }
            catch (e) {
                reject(e);
            }
        });
    };
    /**
     * Pauses the recording of the Stream. [[state]] property must be `RECORDING`. After method succeeds is set to `PAUSED`
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the recording was successfully paused and rejected with an Error object if not
     */
    LocalRecorder.prototype.pause = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (_this.state !== LocalRecorderState_1.LocalRecorderState.RECORDING) {
                    reject(Error('\'LocalRecord.pause()\' needs \'LocalRecord.state\' to be \'RECORDING\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.start()\' or \'LocalRecorder.resume()\' before'));
                }
                _this.mediaRecorder.pause();
                _this.state = LocalRecorderState_1.LocalRecorderState.PAUSED;
            }
            catch (error) {
                reject(error);
            }
        });
    };
    /**
     * Resumes the recording of the Stream. [[state]] property must be `PAUSED`. After method succeeds is set to `RECORDING`
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the recording was successfully resumed and rejected with an Error object if not
     */
    LocalRecorder.prototype.resume = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (_this.state !== LocalRecorderState_1.LocalRecorderState.PAUSED) {
                    throw (Error('\'LocalRecord.resume()\' needs \'LocalRecord.state\' to be \'PAUSED\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.pause()\' before'));
                }
                _this.mediaRecorder.resume();
                _this.state = LocalRecorderState_1.LocalRecorderState.RECORDING;
            }
            catch (error) {
                reject(error);
            }
        });
    };
    /**
     * Previews the recording, appending a new HTMLVideoElement to element with id `parentId`. [[state]] property must be `FINISHED`
     */
    LocalRecorder.prototype.preview = function (parentElement) {
        if (this.state !== LocalRecorderState_1.LocalRecorderState.FINISHED) {
            throw (Error('\'LocalRecord.preview()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.stop()\' before'));
        }
        this.videoPreview = document.createElement('video');
        this.videoPreview.id = this.id;
        this.videoPreview.autoplay = true;
        if (platform.name === 'Safari') {
            this.videoPreview.setAttribute('playsinline', 'true');
        }
        if (typeof parentElement === 'string') {
            var parentElementDom = document.getElementById(parentElement);
            if (parentElementDom) {
                this.videoPreview = parentElementDom.appendChild(this.videoPreview);
            }
        }
        else {
            this.videoPreview = parentElement.appendChild(this.videoPreview);
        }
        this.videoPreview.src = this.videoPreviewSrc;
        return this.videoPreview;
    };
    /**
     * Gracefully stops and cleans the current recording (WARNING: it is completely dismissed). Sets [[state]] to `READY` so the recording can start again
     */
    LocalRecorder.prototype.clean = function () {
        var _this = this;
        var f = function () {
            delete _this.blob;
            _this.chunks = [];
            delete _this.mediaRecorder;
            _this.state = LocalRecorderState_1.LocalRecorderState.READY;
        };
        if (this.state === LocalRecorderState_1.LocalRecorderState.RECORDING || this.state === LocalRecorderState_1.LocalRecorderState.PAUSED) {
            this.stop().then(function () { return f(); })["catch"](function () { return f(); });
        }
        else {
            f();
        }
    };
    /**
     * Downloads the recorded video through the browser. [[state]] property must be `FINISHED`
     */
    LocalRecorder.prototype.download = function () {
        if (this.state !== LocalRecorderState_1.LocalRecorderState.FINISHED) {
            throw (Error('\'LocalRecord.download()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.stop()\' before'));
        }
        else {
            var a = document.createElement('a');
            a.style.display = 'none';
            document.body.appendChild(a);
            var url = window.URL.createObjectURL(this.blob);
            a.href = url;
            a.download = this.id + '.webm';
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
    };
    /**
     * Gets the raw Blob file. Methods preview, download, uploadAsBinary and uploadAsMultipartfile use this same file to perform their specific actions. [[state]] property must be `FINISHED`
     */
    LocalRecorder.prototype.getBlob = function () {
        if (this.state !== LocalRecorderState_1.LocalRecorderState.FINISHED) {
            throw (Error('Call \'LocalRecord.stop()\' before getting Blob file'));
        }
        else {
            return this.blob;
        }
    };
    /**
     * Uploads the recorded video as a binary file performing an HTTP/POST operation to URL `endpoint`. [[state]] property must be `FINISHED`. Optional HTTP headers can be passed as second parameter. For example:
     * ```
     * var headers = {
     *  "Cookie": "$Version=1; Skin=new;",
     *  "Authorization":"Basic QWxhZGpbjpuIHNlctZQ=="
     * }
     * ```
     * @returns A Promise (to which you can optionally subscribe to) that is resolved with the `http.responseText` from server if the operation was successful and rejected with the failed `http.status` if not
     */
    LocalRecorder.prototype.uploadAsBinary = function (endpoint, headers) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.state !== LocalRecorderState_1.LocalRecorderState.FINISHED) {
                reject(Error('\'LocalRecord.uploadAsBinary()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.stop()\' before'));
            }
            else {
                var http_1 = new XMLHttpRequest();
                http_1.open('POST', endpoint, true);
                if (typeof headers === 'object') {
                    for (var _i = 0, _a = Object.keys(headers); _i < _a.length; _i++) {
                        var key = _a[_i];
                        http_1.setRequestHeader(key, headers[key]);
                    }
                }
                http_1.onreadystatechange = function () {
                    if (http_1.readyState === 4) {
                        if (http_1.status.toString().charAt(0) === '2') {
                            // Success response from server (HTTP status standard: 2XX is success)
                            resolve(http_1.responseText);
                        }
                        else {
                            reject(http_1.status);
                        }
                    }
                };
                http_1.send(_this.blob);
            }
        });
    };
    /**
     * Uploads the recorded video as a multipart file performing an HTTP/POST operation to URL `endpoint`. [[state]] property must be `FINISHED`. Optional HTTP headers can be passed as second parameter. For example:
     * ```
     * var headers = {
     *  "Cookie": "$Version=1; Skin=new;",
     *  "Authorization":"Basic QWxhZGpbjpuIHNlctZQ=="
     * }
     * ```
     * @returns A Promise (to which you can optionally subscribe to) that is resolved with the `http.responseText` from server if the operation was successful and rejected with the failed `http.status` if not:
     */
    LocalRecorder.prototype.uploadAsMultipartfile = function (endpoint, headers) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.state !== LocalRecorderState_1.LocalRecorderState.FINISHED) {
                reject(Error('\'LocalRecord.uploadAsMultipartfile()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.stop()\' before'));
            }
            else {
                var http_2 = new XMLHttpRequest();
                http_2.open('POST', endpoint, true);
                if (typeof headers === 'object') {
                    for (var _i = 0, _a = Object.keys(headers); _i < _a.length; _i++) {
                        var key = _a[_i];
                        http_2.setRequestHeader(key, headers[key]);
                    }
                }
                var sendable = new FormData();
                sendable.append('file', _this.blob, _this.id + '.webm');
                http_2.onreadystatechange = function () {
                    if (http_2.readyState === 4) {
                        if (http_2.status.toString().charAt(0) === '2') {
                            // Success response from server (HTTP status standard: 2XX is success)
                            resolve(http_2.responseText);
                        }
                        else {
                            reject(http_2.status);
                        }
                    }
                };
                http_2.send(sendable);
            }
        });
    };
    /* Private methods */
    LocalRecorder.prototype.onStopDefault = function () {
        console.log('MediaRecorder stopped  (state=' + this.mediaRecorder.state + ')');
        this.blob = new Blob(this.chunks, { type: 'video/webm' });
        this.chunks = [];
        this.videoPreviewSrc = window.URL.createObjectURL(this.blob);
        this.state = LocalRecorderState_1.LocalRecorderState.FINISHED;
    };
    return LocalRecorder;
}());
exports.LocalRecorder = LocalRecorder;
//# sourceMappingURL=LocalRecorder.js.map