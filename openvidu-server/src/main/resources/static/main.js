(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["main"],{

/***/ "../../../../openvidu-browser/lib/OpenVidu/Connection.js":
/*!**************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenVidu/Connection.js ***!
  \**************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

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
var Stream_1 = __webpack_require__(/*! ./Stream */ "../../../../openvidu-browser/lib/OpenVidu/Stream.js");
/**
 * Represents each one of the user's connection to the session (the local one and other user's connections).
 * Therefore each [[Session]] and [[Stream]] object has an attribute of type Connection
 */
var Connection = /** @class */ (function () {
    /**
     * @hidden
     */
    function Connection(session, opts) {
        this.session = session;
        /**
         * @hidden
         */
        this.disposed = false;
        var msg = "'Connection' created ";
        if (!!opts) {
            msg += "(remote) with 'connectionId' [" + opts.id + ']';
        }
        else {
            msg += '(local)';
        }
        console.info(msg);
        this.options = opts;
        if (!!opts) {
            // Connection is remote
            this.connectionId = opts.id;
            if (opts.metadata) {
                this.data = opts.metadata;
            }
            if (opts.streams) {
                this.initRemoteStreams(opts.streams);
            }
        }
        this.creationTime = new Date().getTime();
    }
    /* Hidden methods */
    /**
     * @hidden
     */
    Connection.prototype.sendIceCandidate = function (candidate) {
        console.debug((!!this.stream.outboundStreamOpts ? 'Local' : 'Remote'), 'candidate for', this.connectionId, JSON.stringify(candidate));
        this.session.openvidu.sendRequest('onIceCandidate', {
            endpointName: this.connectionId,
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex
        }, function (error, response) {
            if (error) {
                console.error('Error sending ICE candidate: '
                    + JSON.stringify(error));
            }
        });
    };
    /**
     * @hidden
     */
    Connection.prototype.initRemoteStreams = function (options) {
        var _this = this;
        // This is ready for supporting multiple streams per Connection object. Right now the loop will always run just once
        // this.stream should also be replaced by a collection of streams to support multiple streams per Connection
        options.forEach(function (opts) {
            var streamOptions = {
                id: opts.id,
                connection: _this,
                hasAudio: opts.hasAudio,
                hasVideo: opts.hasVideo,
                audioActive: opts.audioActive,
                videoActive: opts.videoActive,
                typeOfVideo: opts.typeOfVideo,
                frameRate: opts.frameRate,
                videoDimensions: !!opts.videoDimensions ? JSON.parse(opts.videoDimensions) : undefined
            };
            var stream = new Stream_1.Stream(_this.session, streamOptions);
            _this.addStream(stream);
        });
        console.info("Remote 'Connection' with 'connectionId' [" + this.connectionId + '] is now configured for receiving Streams with options: ', this.stream.inboundStreamOpts);
    };
    /**
     * @hidden
     */
    Connection.prototype.addStream = function (stream) {
        stream.connection = this;
        this.stream = stream;
    };
    /**
     * @hidden
     */
    Connection.prototype.removeStream = function (streamId) {
        delete this.stream;
    };
    /**
     * @hidden
     */
    Connection.prototype.dispose = function () {
        if (!!this.stream) {
            delete this.stream;
        }
        this.disposed = true;
    };
    return Connection;
}());
exports.Connection = Connection;
//# sourceMappingURL=Connection.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenVidu/LocalRecorder.js":
/*!*****************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenVidu/LocalRecorder.js ***!
  \*****************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

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
var LocalRecorderState_1 = __webpack_require__(/*! ../OpenViduInternal/Enums/LocalRecorderState */ "../../../../openvidu-browser/lib/OpenViduInternal/Enums/LocalRecorderState.js");
/**
 * Easy recording of [[Stream]] objects straightaway from the browser.
 *
 * > WARNING: Performing browser local recording of **remote streams** may cause some troubles. A long waiting time may be required after calling _LocalRecorder.stop()_ in this case
 */
var LocalRecorder = /** @class */ (function () {
    /**
     * @hidden
     */
    function LocalRecorder(stream) {
        this.stream = stream;
        this.chunks = [];
        this.count = 0;
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
        if (typeof parentElement === 'string') {
            this.htmlParentElementId = parentElement;
            var parentElementDom = document.getElementById(parentElement);
            if (parentElementDom) {
                this.videoPreview = parentElementDom.appendChild(this.videoPreview);
            }
        }
        else {
            this.htmlParentElementId = parentElement.id;
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
            _this.count = 0;
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

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenVidu/OpenVidu.js":
/*!************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenVidu/OpenVidu.js ***!
  \************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

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
var LocalRecorder_1 = __webpack_require__(/*! ./LocalRecorder */ "../../../../openvidu-browser/lib/OpenVidu/LocalRecorder.js");
var Publisher_1 = __webpack_require__(/*! ./Publisher */ "../../../../openvidu-browser/lib/OpenVidu/Publisher.js");
var Session_1 = __webpack_require__(/*! ./Session */ "../../../../openvidu-browser/lib/OpenVidu/Session.js");
var StreamPropertyChangedEvent_1 = __webpack_require__(/*! ../OpenViduInternal/Events/StreamPropertyChangedEvent */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/StreamPropertyChangedEvent.js");
var OpenViduError_1 = __webpack_require__(/*! ../OpenViduInternal/Enums/OpenViduError */ "../../../../openvidu-browser/lib/OpenViduInternal/Enums/OpenViduError.js");
var VideoInsertMode_1 = __webpack_require__(/*! ../OpenViduInternal/Enums/VideoInsertMode */ "../../../../openvidu-browser/lib/OpenViduInternal/Enums/VideoInsertMode.js");
var screenSharingAuto = __webpack_require__(/*! ../OpenViduInternal/ScreenSharing/Screen-Capturing-Auto */ "../../../../openvidu-browser/lib/OpenViduInternal/ScreenSharing/Screen-Capturing-Auto.js");
var screenSharing = __webpack_require__(/*! ../OpenViduInternal/ScreenSharing/Screen-Capturing */ "../../../../openvidu-browser/lib/OpenViduInternal/ScreenSharing/Screen-Capturing.js");
var RpcBuilder = __webpack_require__(/*! ../OpenViduInternal/KurentoUtils/kurento-jsonrpc */ "../../../../openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/index.js");
var platform = __webpack_require__(/*! platform */ "../../../../openvidu-browser/node_modules/platform/platform.js");
/**
 * Entrypoint of OpenVidu Browser library.
 * Use it to initialize objects of type [[Session]], [[Publisher]] and [[LocalRecorder]]
 */
var OpenVidu = /** @class */ (function () {
    function OpenVidu() {
        var _this = this;
        /**
         * @hidden
         */
        this.publishers = [];
        /**
         * @hidden
         */
        this.secret = '';
        /**
         * @hidden
         */
        this.recorder = false;
        /**
         * @hidden
         */
        this.advancedConfiguration = {};
        console.info("'OpenVidu' initialized");
        if (platform.name.toLowerCase().indexOf('mobile') !== -1) {
            // Listen to orientationchange only on mobile browsers
            window.onorientationchange = function () {
                _this.publishers.forEach(function (publisher) {
                    if (!!publisher.stream && !!publisher.stream.hasVideo && !!publisher.stream.streamManager.videos[0]) {
                        var attempts_1 = 0;
                        var oldWidth_1 = publisher.stream.videoDimensions.width;
                        var oldHeight_1 = publisher.stream.videoDimensions.height;
                        // New resolution got from different places for Chrome and Firefox. Chrome needs a videoWidth and videoHeight of a videoElement.
                        // Firefox needs getSettings from the videoTrack
                        var firefoxSettings_1 = publisher.stream.getMediaStream().getVideoTracks()[0].getSettings();
                        var newWidth_1 = (platform.name.toLowerCase().indexOf('firefox') !== -1) ? firefoxSettings_1.width : publisher.videoReference.videoWidth;
                        var newHeight_1 = (platform.name.toLowerCase().indexOf('firefox') !== -1) ? firefoxSettings_1.height : publisher.videoReference.videoHeight;
                        var repeatUntilChange_1 = setInterval(function () {
                            firefoxSettings_1 = publisher.stream.getMediaStream().getVideoTracks()[0].getSettings();
                            newWidth_1 = (platform.name.toLowerCase().indexOf('firefox') !== -1) ? firefoxSettings_1.width : publisher.videoReference.videoWidth;
                            newHeight_1 = (platform.name.toLowerCase().indexOf('firefox') !== -1) ? firefoxSettings_1.height : publisher.videoReference.videoHeight;
                            sendStreamPropertyChangedEvent_1(oldWidth_1, oldHeight_1, newWidth_1, newHeight_1);
                        }, 100);
                        var sendStreamPropertyChangedEvent_1 = function (oldWidth, oldHeight, newWidth, newHeight) {
                            attempts_1++;
                            if (attempts_1 > 4) {
                                clearTimeout(repeatUntilChange_1);
                            }
                            if (newWidth !== oldWidth || newHeight !== oldHeight) {
                                publisher.stream.videoDimensions = {
                                    width: newWidth || 0,
                                    height: newHeight || 0
                                };
                                var newValue_1 = JSON.stringify(publisher.stream.videoDimensions);
                                _this.sendRequest('streamPropertyChanged', {
                                    streamId: publisher.stream.streamId,
                                    property: 'videoDimensions',
                                    newValue: newValue_1,
                                    reason: 'deviceRotated'
                                }, function (error, response) {
                                    if (error) {
                                        console.error("Error sending 'streamPropertyChanged' event", error);
                                    }
                                    else {
                                        _this.session.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this.session, publisher.stream, 'videoDimensions', newValue_1, { width: oldWidth, height: oldHeight }, 'deviceRotated')]);
                                        publisher.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(publisher, publisher.stream, 'videoDimensions', newValue_1, { width: oldWidth, height: oldHeight }, 'deviceRotated')]);
                                    }
                                });
                                clearTimeout(repeatUntilChange_1);
                            }
                        };
                    }
                });
            };
        }
    }
    /**
     * Returns new session
     */
    OpenVidu.prototype.initSession = function () {
        this.session = new Session_1.Session(this);
        return this.session;
    };
    /**
     * Returns a new publisher
     *
     * #### Events dispatched
     *
     * The [[Publisher]] object will dispatch an `accessDialogOpened` event, only if the pop-up shown by the browser to request permissions for the camera is opened. You can use this event to alert the user about granting permissions
     * for your website. An `accessDialogClosed` event will also be dispatched after user clicks on "Allow" or "Block" in the pop-up.
     *
     * The [[Publisher]] object will dispatch an `accessAllowed` or `accessDenied` event once it has been granted access to the requested input devices or not.
     *
     * The [[Publisher]] object will dispatch a `videoElementCreated` event once a HTML video element has been added to DOM (only if you
     * [let OpenVidu take care of the video players](/docs/how-do-i/manage-videos/#let-openvidu-take-care-of-the-video-players)). See [[VideoElementEvent]] to learn more.
     *
     * The [[Publisher]] object will dispatch a `streamPlaying` event once the local streams starts playing. See [[StreamManagerEvent]] to learn more.
     *
     * @param targetElement  HTML DOM element (or its `id` attribute) in which the video element of the Publisher will be inserted (see [[PublisherProperties.insertMode]]). If *null* or *undefined* no default video will be created for this Publisher.
     * You can always call method [[Publisher.addVideoElement]] or [[Publisher.createVideoElement]] to manage the video elements on your own (see [Manage video players](/docs/how-do-i/manage-videos) section)
     * @param completionHandler `error` parameter is null if `initPublisher` succeeds, and is defined if it fails.
     *                          `completionHandler` function is called before the Publisher dispatches an `accessAllowed` or an `accessDenied` event
     */
    OpenVidu.prototype.initPublisher = function (targetElement, param2, param3) {
        var properties;
        if (!!param2 && (typeof param2 !== 'function')) {
            // Matches 'initPublisher(targetElement, properties)' or 'initPublisher(targetElement, properties, completionHandler)'
            properties = param2;
            properties = {
                audioSource: (typeof properties.audioSource !== 'undefined') ? properties.audioSource : undefined,
                frameRate: this.isMediaStreamTrack(properties.videoSource) ? undefined : ((typeof properties.frameRate !== 'undefined') ? properties.frameRate : undefined),
                insertMode: (typeof properties.insertMode !== 'undefined') ? ((typeof properties.insertMode === 'string') ? VideoInsertMode_1.VideoInsertMode[properties.insertMode] : properties.insertMode) : VideoInsertMode_1.VideoInsertMode.APPEND,
                mirror: (typeof properties.mirror !== 'undefined') ? properties.mirror : true,
                publishAudio: (typeof properties.publishAudio !== 'undefined') ? properties.publishAudio : true,
                publishVideo: (typeof properties.publishVideo !== 'undefined') ? properties.publishVideo : true,
                resolution: this.isMediaStreamTrack(properties.videoSource) ? undefined : ((typeof properties.resolution !== 'undefined') ? properties.resolution : '640x480'),
                videoSource: (typeof properties.videoSource !== 'undefined') ? properties.videoSource : undefined
            };
        }
        else {
            // Matches 'initPublisher(targetElement)' or 'initPublisher(targetElement, completionHandler)'
            properties = {
                insertMode: VideoInsertMode_1.VideoInsertMode.APPEND,
                mirror: true,
                publishAudio: true,
                publishVideo: true,
                resolution: '640x480'
            };
        }
        var publisher = new Publisher_1.Publisher(targetElement, properties, this);
        var completionHandler;
        if (!!param2 && (typeof param2 === 'function')) {
            completionHandler = param2;
        }
        else if (!!param3) {
            completionHandler = param3;
        }
        publisher.initialize()
            .then(function () {
            if (completionHandler !== undefined) {
                completionHandler(undefined);
            }
            publisher.emitEvent('accessAllowed', []);
        })["catch"](function (error) {
            if (completionHandler !== undefined) {
                completionHandler(error);
            }
            publisher.emitEvent('accessDenied', []);
        });
        this.publishers.push(publisher);
        return publisher;
    };
    OpenVidu.prototype.initPublisherAsync = function (targetElement, properties) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var publisher;
            var callback = function (error) {
                if (!!error) {
                    reject(error);
                }
                else {
                    resolve(publisher);
                }
            };
            if (!!properties) {
                publisher = _this.initPublisher(targetElement, properties, callback);
            }
            else {
                publisher = _this.initPublisher(targetElement, callback);
            }
        });
    };
    /**
     * Returns a new local recorder for recording streams straight away from the browser
     * @param stream  Stream to record
     */
    OpenVidu.prototype.initLocalRecorder = function (stream) {
        return new LocalRecorder_1.LocalRecorder(stream);
    };
    /**
     * Checks if the browser supports OpenVidu
     * @returns 1 if the browser supports OpenVidu, 0 otherwise
     */
    OpenVidu.prototype.checkSystemRequirements = function () {
        var browser = platform.name;
        var version = platform.version;
        if ((browser !== 'Chrome') && (browser !== 'Chrome Mobile') &&
            (browser !== 'Firefox') && (browser !== 'Firefox Mobile') && (browser !== 'Firefox for iOS') &&
            (browser !== 'Opera') && (browser !== 'Opera Mobile') &&
            (browser !== 'Safari')) {
            return 0;
        }
        else {
            return 1;
        }
    };
    /**
     * Collects information about the media input devices available on the system. You can pass property `deviceId` of a [[Device]] object as value of `audioSource` or `videoSource` properties in [[initPublisher]] method
     */
    OpenVidu.prototype.getDevices = function () {
        return new Promise(function (resolve, reject) {
            navigator.mediaDevices.enumerateDevices().then(function (deviceInfos) {
                var devices = [];
                deviceInfos.forEach(function (deviceInfo) {
                    if (deviceInfo.kind === 'audioinput' || deviceInfo.kind === 'videoinput') {
                        devices.push({
                            kind: deviceInfo.kind,
                            deviceId: deviceInfo.deviceId,
                            label: deviceInfo.label
                        });
                    }
                });
                resolve(devices);
            })["catch"](function (error) {
                console.error('Error getting devices', error);
                reject(error);
            });
        });
    };
    /**
     * Get a MediaStream object that you can customize before calling [[initPublisher]] (pass _MediaStreamTrack_ property of the _MediaStream_ value resolved by the Promise as `audioSource` or `videoSource` properties in [[initPublisher]])
     *
     * Parameter `options` is the same as in [[initPublisher]] second parameter (of type [[PublisherProperties]]), but only the following properties will be applied: `audioSource`, `videoSource`, `frameRate`, `resolution`
     *
     * To customize the Publisher's video, the API for HTMLCanvasElement is very useful. For example, to get a black-and-white video at 10 fps and HD resolution with no sound:
     * ```
     * var OV = new OpenVidu();
     * var FRAME_RATE = 10;
     *
     * OV.getUserMedia({
     *    audioSource: false;
     *    videoSource: undefined,
     *    resolution: '1280x720',
     *    frameRate: FRAME_RATE
     * })
     * .then(mediaStream => {
     *
     *    var videoTrack = mediaStream.getVideoTracks()[0];
     *    var video = document.createElement('video');
     *    video.srcObject = new MediaStream([videoTrack]);
     *
     *    var canvas = document.createElement('canvas');
     *    var ctx = canvas.getContext('2d');
     *    ctx.filter = 'grayscale(100%)';
     *
     *    video.addEventListener('play', () => {
     *      var loop = () => {
     *        if (!video.paused && !video.ended) {
     *          ctx.drawImage(video, 0, 0, 300, 170);
     *          setTimeout(loop, 1000/ FRAME_RATE); // Drawing at 10 fps
     *        }
     *      };
     *      loop();
     *    });
     *    video.play();
     *
     *    var grayVideoTrack = canvas.captureStream(FRAME_RATE).getVideoTracks()[0];
     *    var publisher = this.OV.initPublisher(
     *      myHtmlTarget,
     *      {
     *        audioSource: false,
     *        videoSource: grayVideoTrack
     *      });
     * });
     * ```
     */
    OpenVidu.prototype.getUserMedia = function (options) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.generateMediaConstraints(options)
                .then(function (constraints) {
                navigator.mediaDevices.getUserMedia(constraints)
                    .then(function (mediaStream) {
                    resolve(mediaStream);
                })["catch"](function (error) {
                    var errorName;
                    var errorMessage = error.toString();
                    if (!(options.videoSource === 'screen')) {
                        errorName = OpenViduError_1.OpenViduErrorName.DEVICE_ACCESS_DENIED;
                    }
                    else {
                        errorName = OpenViduError_1.OpenViduErrorName.SCREEN_CAPTURE_DENIED;
                    }
                    reject(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                });
            })["catch"](function (error) {
                reject(error);
            });
        });
    };
    /* tslint:disable:no-empty */
    /**
     * Disable all logging except error level
     */
    OpenVidu.prototype.enableProdMode = function () {
        console.log = function () { };
        console.debug = function () { };
        console.info = function () { };
        console.warn = function () { };
    };
    /* tslint:enable:no-empty */
    /**
     * Set OpenVidu advanced configuration options. Currently `configuration` is an object with the following optional properties (see [[OpenViduAdvancedConfiguration]] for more details):
     * - `iceServers`: set custom STUN/TURN servers to be used by OpenVidu Browser
     * - `screenShareChromeExtension`: url to a custom screen share extension for Chrome to be used instead of the default one, based on ours [https://github.com/OpenVidu/openvidu-screen-sharing-chrome-extension](https://github.com/OpenVidu/openvidu-screen-sharing-chrome-extension)
     * - `publisherSpeakingEventsOptions`: custom configuration for the [[PublisherSpeakingEvent]] feature
     */
    OpenVidu.prototype.setAdvancedConfiguration = function (configuration) {
        this.advancedConfiguration = configuration;
    };
    /* Hidden methods */
    /**
     * @hidden
     */
    OpenVidu.prototype.generateMediaConstraints = function (publisherProperties) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var audio, video;
            if (publisherProperties.audioSource === null || publisherProperties.audioSource === false) {
                audio = false;
            }
            else if (publisherProperties.audioSource === undefined) {
                audio = true;
            }
            else {
                audio = publisherProperties.audioSource;
            }
            if (publisherProperties.videoSource === null || publisherProperties.videoSource === false) {
                video = false;
            }
            else {
                video = {
                    height: {
                        ideal: 480
                    },
                    width: {
                        ideal: 640
                    }
                };
            }
            var mediaConstraints = {
                audio: audio,
                video: video
            };
            if (typeof mediaConstraints.audio === 'string') {
                mediaConstraints.audio = { deviceId: { exact: mediaConstraints.audio } };
            }
            if (mediaConstraints.video) {
                if (!!publisherProperties.resolution) {
                    var widthAndHeight = publisherProperties.resolution.toLowerCase().split('x');
                    var width = Number(widthAndHeight[0]);
                    var height = Number(widthAndHeight[1]);
                    mediaConstraints.video.width.ideal = width;
                    mediaConstraints.video.height.ideal = height;
                }
                if (!!publisherProperties.frameRate) {
                    mediaConstraints.video.frameRate = { ideal: publisherProperties.frameRate };
                }
                if (!!publisherProperties.videoSource && typeof publisherProperties.videoSource === 'string') {
                    if (publisherProperties.videoSource === 'screen') {
                        if (platform.name !== 'Chrome' && platform.name.indexOf('Firefox') === -1) {
                            var error = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_SHARING_NOT_SUPPORTED, 'You can only screen share in desktop Chrome and Firefox. Detected browser: ' + platform.name);
                            console.error(error);
                            reject(error);
                        }
                        else {
                            if (!!_this.advancedConfiguration.screenShareChromeExtension && !(platform.name.indexOf('Firefox') !== -1)) {
                                // Custom screen sharing extension for Chrome
                                screenSharing.getScreenConstraints(function (error, screenConstraints) {
                                    if (!!error || !!screenConstraints.mandatory && screenConstraints.mandatory.chromeMediaSource === 'screen') {
                                        if (error === 'permission-denied' || error === 'PermissionDeniedError') {
                                            var error_1 = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_CAPTURE_DENIED, 'You must allow access to one window of your desktop');
                                            console.error(error_1);
                                            reject(error_1);
                                        }
                                        else {
                                            var extensionId = _this.advancedConfiguration.screenShareChromeExtension.split('/').pop().trim();
                                            screenSharing.getChromeExtensionStatus(extensionId, function (status) {
                                                if (status === 'installed-disabled') {
                                                    var error_2 = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_EXTENSION_DISABLED, 'You must enable the screen extension');
                                                    console.error(error_2);
                                                    reject(error_2);
                                                }
                                                if (status === 'not-installed') {
                                                    var error_3 = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_EXTENSION_NOT_INSTALLED, _this.advancedConfiguration.screenShareChromeExtension);
                                                    console.error(error_3);
                                                    reject(error_3);
                                                }
                                            });
                                        }
                                    }
                                    else {
                                        mediaConstraints.video = screenConstraints;
                                        resolve(mediaConstraints);
                                    }
                                });
                            }
                            else {
                                // Default screen sharing extension for Chrome
                                screenSharingAuto.getScreenId(function (error, sourceId, screenConstraints) {
                                    if (!!error) {
                                        if (error === 'not-installed') {
                                            var extensionUrl = !!_this.advancedConfiguration.screenShareChromeExtension ? _this.advancedConfiguration.screenShareChromeExtension :
                                                'https://chrome.google.com/webstore/detail/openvidu-screensharing/lfcgfepafnobdloecchnfaclibenjold';
                                            var error_4 = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_EXTENSION_NOT_INSTALLED, extensionUrl);
                                            console.error(error_4);
                                            reject(error_4);
                                        }
                                        else if (error === 'installed-disabled') {
                                            var error_5 = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_EXTENSION_DISABLED, 'You must enable the screen extension');
                                            console.error(error_5);
                                            reject(error_5);
                                        }
                                        else if (error === 'permission-denied') {
                                            var error_6 = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_CAPTURE_DENIED, 'You must allow access to one window of your desktop');
                                            console.error(error_6);
                                            reject(error_6);
                                        }
                                    }
                                    else {
                                        mediaConstraints.video = screenConstraints.video;
                                        resolve(mediaConstraints);
                                    }
                                });
                            }
                            publisherProperties.videoSource = 'screen';
                        }
                    }
                    else {
                        // tslint:disable-next-line:no-string-literal
                        mediaConstraints.video['deviceId'] = { exact: publisherProperties.videoSource };
                        resolve(mediaConstraints);
                    }
                }
                else {
                    resolve(mediaConstraints);
                }
            }
            else {
                resolve(mediaConstraints);
            }
        });
    };
    /**
     * @hidden
     */
    OpenVidu.prototype.startWs = function (onConnectSucces) {
        var config = {
            heartbeat: 5000,
            sendCloseMessage: false,
            ws: {
                uri: this.wsUri,
                useSockJS: false,
                onconnected: onConnectSucces,
                ondisconnect: this.disconnectCallback.bind(this),
                onreconnecting: this.reconnectingCallback.bind(this),
                onreconnected: this.reconnectedCallback.bind(this)
            },
            rpc: {
                requestTimeout: 10000,
                participantJoined: this.session.onParticipantJoined.bind(this.session),
                participantPublished: this.session.onParticipantPublished.bind(this.session),
                participantUnpublished: this.session.onParticipantUnpublished.bind(this.session),
                participantLeft: this.session.onParticipantLeft.bind(this.session),
                participantEvicted: this.session.onParticipantEvicted.bind(this.session),
                recordingStarted: this.session.onRecordingStarted.bind(this.session),
                recordingStopped: this.session.onRecordingStopped.bind(this.session),
                sendMessage: this.session.onNewMessage.bind(this.session),
                streamPropertyChanged: this.session.onStreamPropertyChanged.bind(this.session),
                iceCandidate: this.session.recvIceCandidate.bind(this.session),
                mediaError: this.session.onMediaError.bind(this.session)
            }
        };
        this.jsonRpcClient = new RpcBuilder.clients.JsonRpcClient(config);
    };
    /**
     * @hidden
     */
    OpenVidu.prototype.closeWs = function () {
        this.jsonRpcClient.close();
    };
    /**
     * @hidden
     */
    OpenVidu.prototype.sendRequest = function (method, params, callback) {
        if (params && params instanceof Function) {
            callback = params;
            params = {};
        }
        console.debug('Sending request: {method:"' + method + '", params: ' + JSON.stringify(params) + '}');
        this.jsonRpcClient.send(method, params, callback);
    };
    /**
     * @hidden
     */
    OpenVidu.prototype.isMediaStreamTrack = function (mediaSource) {
        var is = (!!mediaSource &&
            mediaSource.enabled !== undefined && typeof mediaSource.enabled === 'boolean' &&
            mediaSource.id !== undefined && typeof mediaSource.id === 'string' &&
            mediaSource.kind !== undefined && typeof mediaSource.kind === 'string' &&
            mediaSource.label !== undefined && typeof mediaSource.label === 'string' &&
            mediaSource.muted !== undefined && typeof mediaSource.muted === 'boolean' &&
            mediaSource.readyState !== undefined && typeof mediaSource.readyState === 'string');
        return is;
    };
    /**
     * @hidden
     */
    OpenVidu.prototype.getWsUri = function () {
        return this.wsUri;
    };
    /**
     * @hidden
     */
    OpenVidu.prototype.getSecret = function () {
        return this.secret;
    };
    /**
     * @hidden
     */
    OpenVidu.prototype.getRecorder = function () {
        return this.recorder;
    };
    /* Private methods */
    OpenVidu.prototype.disconnectCallback = function () {
        console.warn('Websocket connection lost');
        if (this.isRoomAvailable()) {
            this.session.onLostConnection();
        }
        else {
            alert('Connection error. Please reload page.');
        }
    };
    OpenVidu.prototype.reconnectingCallback = function () {
        console.warn('Websocket connection lost (reconnecting)');
        if (this.isRoomAvailable()) {
            this.session.onLostConnection();
        }
        else {
            alert('Connection error. Please reload page.');
        }
    };
    OpenVidu.prototype.reconnectedCallback = function () {
        console.warn('Websocket reconnected');
    };
    OpenVidu.prototype.isRoomAvailable = function () {
        if (this.session !== undefined && this.session instanceof Session_1.Session) {
            return true;
        }
        else {
            console.warn('Session instance not found');
            return false;
        }
    };
    return OpenVidu;
}());
exports.OpenVidu = OpenVidu;
//# sourceMappingURL=OpenVidu.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenVidu/Publisher.js":
/*!*************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenVidu/Publisher.js ***!
  \*************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var Session_1 = __webpack_require__(/*! ./Session */ "../../../../openvidu-browser/lib/OpenVidu/Session.js");
var Stream_1 = __webpack_require__(/*! ./Stream */ "../../../../openvidu-browser/lib/OpenVidu/Stream.js");
var StreamManager_1 = __webpack_require__(/*! ./StreamManager */ "../../../../openvidu-browser/lib/OpenVidu/StreamManager.js");
var StreamEvent_1 = __webpack_require__(/*! ../OpenViduInternal/Events/StreamEvent */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/StreamEvent.js");
var StreamPropertyChangedEvent_1 = __webpack_require__(/*! ../OpenViduInternal/Events/StreamPropertyChangedEvent */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/StreamPropertyChangedEvent.js");
var VideoElementEvent_1 = __webpack_require__(/*! ../OpenViduInternal/Events/VideoElementEvent */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/VideoElementEvent.js");
var OpenViduError_1 = __webpack_require__(/*! ../OpenViduInternal/Enums/OpenViduError */ "../../../../openvidu-browser/lib/OpenViduInternal/Enums/OpenViduError.js");
var platform = __webpack_require__(/*! platform */ "../../../../openvidu-browser/node_modules/platform/platform.js");
/**
 * Packs local media streams. Participants can publish it to a session. Initialized with [[OpenVidu.initPublisher]] method
 */
var Publisher = /** @class */ (function (_super) {
    __extends(Publisher, _super);
    /**
     * @hidden
     */
    function Publisher(targEl, properties, openvidu) {
        var _this = _super.call(this, new Stream_1.Stream((!!openvidu.session) ? openvidu.session : new Session_1.Session(openvidu), { publisherProperties: properties, mediaConstraints: {} }), targEl) || this;
        /**
         * Whether the Publisher has been granted access to the requested input devices or not
         */
        _this.accessAllowed = false;
        /**
         * Whether you have called [[Publisher.subscribeToRemote]] with value `true` or `false` (*false* by default)
         */
        _this.isSubscribedToRemote = false;
        _this.accessDenied = false;
        _this.properties = properties;
        _this.openvidu = openvidu;
        _this.stream.ee.on('local-stream-destroyed-by-disconnect', function (reason) {
            var streamEvent = new StreamEvent_1.StreamEvent(true, _this, 'streamDestroyed', _this.stream, reason);
            _this.emitEvent('streamDestroyed', [streamEvent]);
            streamEvent.callDefaultBehavior();
        });
        return _this;
    }
    /**
     * Publish or unpublish the audio stream (if available). Calling this method twice in a row passing same value will have no effect
     *
     * #### Events dispatched
     *
     * The [[Session]] object of the local participant will dispatch a `streamPropertyChanged` event with `changedProperty` set to `"audioActive"` and `reason` set to `"publishAudio"`
     * The [[Publisher]] object of the local participant will also dispatch the exact same event
     *
     * The [[Session]] object of every other participant connected to the session will dispatch a `streamPropertyChanged` event with `changedProperty` set to `"audioActive"` and `reason` set to `"publishAudio"`
     * The respective [[Subscriber]] object of every other participant receiving this Publisher's stream will also dispatch the exact same event
     *
     * See [[StreamPropertyChangedEvent]] to learn more.
     *
     * @param value `true` to publish the audio stream, `false` to unpublish it
     */
    Publisher.prototype.publishAudio = function (value) {
        var _this = this;
        if (this.stream.audioActive !== value) {
            this.stream.getMediaStream().getAudioTracks().forEach(function (track) {
                track.enabled = value;
            });
            this.session.openvidu.sendRequest('streamPropertyChanged', {
                streamId: this.stream.streamId,
                property: 'audioActive',
                newValue: value,
                reason: 'publishAudio'
            }, function (error, response) {
                if (error) {
                    console.error("Error sending 'streamPropertyChanged' event", error);
                }
                else {
                    _this.session.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this.session, _this.stream, 'audioActive', value, !value, 'publishAudio')]);
                    _this.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this, _this.stream, 'audioActive', value, !value, 'publishAudio')]);
                }
            });
            this.stream.audioActive = value;
            console.info("'Publisher' has " + (value ? 'published' : 'unpublished') + ' its audio stream');
        }
    };
    /**
     * Publish or unpublish the video stream (if available). Calling this method twice in a row passing same value will have no effect
     *
     * #### Events dispatched
     *
     * The [[Session]] object of the local participant will dispatch a `streamPropertyChanged` event with `changedProperty` set to `"videoActive"` and `reason` set to `"publishVideo"`
     * The [[Publisher]] object of the local participant will also dispatch the exact same event
     *
     * The [[Session]] object of every other participant connected to the session will dispatch a `streamPropertyChanged` event with `changedProperty` set to `"videoActive"` and `reason` set to `"publishVideo"`
     * The respective [[Subscriber]] object of every other participant receiving this Publisher's stream will also dispatch the exact same event
     *
     * See [[StreamPropertyChangedEvent]] to learn more.
     *
     * @param value `true` to publish the video stream, `false` to unpublish it
     */
    Publisher.prototype.publishVideo = function (value) {
        var _this = this;
        if (this.stream.videoActive !== value) {
            this.stream.getMediaStream().getVideoTracks().forEach(function (track) {
                track.enabled = value;
            });
            this.session.openvidu.sendRequest('streamPropertyChanged', {
                streamId: this.stream.streamId,
                property: 'videoActive',
                newValue: value,
                reason: 'publishVideo'
            }, function (error, response) {
                if (error) {
                    console.error("Error sending 'streamPropertyChanged' event", error);
                }
                else {
                    _this.session.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this.session, _this.stream, 'videoActive', value, !value, 'publishVideo')]);
                    _this.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this, _this.stream, 'videoActive', value, !value, 'publishVideo')]);
                }
            });
            this.stream.videoActive = value;
            console.info("'Publisher' has " + (value ? 'published' : 'unpublished') + ' its video stream');
        }
    };
    /**
     * Call this method before [[Session.publish]] if you prefer to subscribe to your Publisher's remote stream instead of using the local stream, as any other user would do.
     */
    Publisher.prototype.subscribeToRemote = function (value) {
        value = (value !== undefined) ? value : true;
        this.isSubscribedToRemote = value;
        this.stream.subscribeToMyRemote(value);
    };
    /**
     * See [[EventDispatcher.on]]
     */
    Publisher.prototype.on = function (type, handler) {
        var _this = this;
        _super.prototype.on.call(this, type, handler);
        if (type === 'streamCreated') {
            if (!!this.stream && this.stream.isLocalStreamPublished) {
                this.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, this, 'streamCreated', this.stream, '')]);
            }
            else {
                this.stream.ee.on('stream-created-by-publisher', function () {
                    _this.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, _this, 'streamCreated', _this.stream, '')]);
                });
            }
        }
        if (type === 'remoteVideoPlaying') {
            if (this.stream.displayMyRemote() && this.videos[0] && this.videos[0].video &&
                this.videos[0].video.currentTime > 0 &&
                this.videos[0].video.paused === false &&
                this.videos[0].video.ended === false &&
                this.videos[0].video.readyState === 4) {
                this.emitEvent('remoteVideoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.videos[0].video, this, 'remoteVideoPlaying')]);
            }
        }
        if (type === 'accessAllowed') {
            if (this.accessAllowed) {
                this.emitEvent('accessAllowed', []);
            }
        }
        if (type === 'accessDenied') {
            if (this.accessDenied) {
                this.emitEvent('accessDenied', []);
            }
        }
        return this;
    };
    /**
     * See [[EventDispatcher.once]]
     */
    Publisher.prototype.once = function (type, handler) {
        var _this = this;
        _super.prototype.once.call(this, type, handler);
        if (type === 'streamCreated') {
            if (!!this.stream && this.stream.isLocalStreamPublished) {
                this.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, this, 'streamCreated', this.stream, '')]);
            }
            else {
                this.stream.ee.once('stream-created-by-publisher', function () {
                    _this.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, _this, 'streamCreated', _this.stream, '')]);
                });
            }
        }
        if (type === 'remoteVideoPlaying') {
            if (this.stream.displayMyRemote() && this.videos[0] && this.videos[0].video &&
                this.videos[0].video.currentTime > 0 &&
                this.videos[0].video.paused === false &&
                this.videos[0].video.ended === false &&
                this.videos[0].video.readyState === 4) {
                this.emitEvent('remoteVideoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.videos[0].video, this, 'remoteVideoPlaying')]);
            }
        }
        if (type === 'accessAllowed') {
            if (this.accessAllowed) {
                this.emitEvent('accessAllowed', []);
            }
        }
        if (type === 'accessDenied') {
            if (this.accessDenied) {
                this.emitEvent('accessDenied', []);
            }
        }
        return this;
    };
    /* Hidden methods */
    /**
     * @hidden
     */
    Publisher.prototype.initialize = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var errorCallback = function (openViduError) {
                _this.accessDenied = true;
                _this.accessAllowed = false;
                reject(openViduError);
            };
            var successCallback = function (mediaStream) {
                _this.accessAllowed = true;
                _this.accessDenied = false;
                if (_this.openvidu.isMediaStreamTrack(_this.properties.audioSource)) {
                    mediaStream.removeTrack(mediaStream.getAudioTracks()[0]);
                    mediaStream.addTrack(_this.properties.audioSource);
                }
                if (_this.openvidu.isMediaStreamTrack(_this.properties.videoSource)) {
                    mediaStream.removeTrack(mediaStream.getVideoTracks()[0]);
                    mediaStream.addTrack(_this.properties.videoSource);
                }
                // Apply PublisherProperties.publishAudio and PublisherProperties.publishVideo
                if (!!mediaStream.getAudioTracks()[0]) {
                    mediaStream.getAudioTracks()[0].enabled = !!_this.stream.outboundStreamOpts.publisherProperties.publishAudio;
                }
                if (!!mediaStream.getVideoTracks()[0]) {
                    mediaStream.getVideoTracks()[0].enabled = !!_this.stream.outboundStreamOpts.publisherProperties.publishVideo;
                }
                _this.stream.setMediaStream(mediaStream);
                if (!_this.stream.displayMyRemote()) {
                    // When we are subscribed to our remote we don't still set the MediaStream object in the video elements to
                    // avoid early 'streamPlaying' event
                    _this.stream.updateMediaStreamInVideos();
                }
                if (!!_this.firstVideoElement) {
                    _this.createVideoElement(_this.firstVideoElement.targetElement, _this.properties.insertMode);
                }
                delete _this.firstVideoElement;
                if (!_this.stream.isSendScreen() && !!mediaStream.getVideoTracks()[0]) {
                    // With no screen share, video dimension can be set directly from MediaStream (getSettings)
                    // Orientation must be checked for mobile devices (width and height are reversed)
                    var _a = mediaStream.getVideoTracks()[0].getSettings(), width = _a.width, height = _a.height;
                    if (platform.name.toLowerCase().indexOf('mobile') !== -1 && (window.innerHeight > window.innerWidth)) {
                        // Mobile portrait mode
                        _this.stream.videoDimensions = {
                            width: height || 0,
                            height: width || 0
                        };
                    }
                    else {
                        _this.stream.videoDimensions = {
                            width: width || 0,
                            height: height || 0
                        };
                    }
                    _this.stream.isLocalStreamReadyToPublish = true;
                    _this.stream.ee.emitEvent('stream-ready-to-publish', []);
                }
                else {
                    // With screen share, video dimension must be got from a video element (onloadedmetadata event)
                    _this.videoReference = document.createElement('video');
                    _this.videoReference.srcObject = mediaStream;
                    _this.videoReference.onloadedmetadata = function () {
                        _this.stream.videoDimensions = {
                            width: _this.videoReference.videoWidth,
                            height: _this.videoReference.videoHeight
                        };
                        _this.screenShareResizeInterval = setInterval(function () {
                            var firefoxSettings = mediaStream.getVideoTracks()[0].getSettings();
                            var newWidth = (platform.name === 'Chrome') ? _this.videoReference.videoWidth : firefoxSettings.width;
                            var newHeight = (platform.name === 'Chrome') ? _this.videoReference.videoHeight : firefoxSettings.height;
                            if (_this.stream.isLocalStreamPublished &&
                                (newWidth !== _this.stream.videoDimensions.width ||
                                    newHeight !== _this.stream.videoDimensions.height)) {
                                var oldValue_1 = { width: _this.stream.videoDimensions.width, height: _this.stream.videoDimensions.height };
                                _this.stream.videoDimensions = {
                                    width: newWidth || 0,
                                    height: newHeight || 0
                                };
                                var newValue_1 = JSON.stringify(_this.stream.videoDimensions);
                                _this.session.openvidu.sendRequest('streamPropertyChanged', {
                                    streamId: _this.stream.streamId,
                                    property: 'videoDimensions',
                                    newValue: newValue_1,
                                    reason: 'screenResized'
                                }, function (error, response) {
                                    if (error) {
                                        console.error("Error sending 'streamPropertyChanged' event", error);
                                    }
                                    else {
                                        _this.session.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this.session, _this.stream, 'videoDimensions', newValue_1, oldValue_1, 'screenResized')]);
                                        _this.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this, _this.stream, 'videoDimensions', newValue_1, oldValue_1, 'screenResized')]);
                                    }
                                });
                            }
                        }, 500);
                        _this.stream.isLocalStreamReadyToPublish = true;
                        _this.stream.ee.emitEvent('stream-ready-to-publish', []);
                    };
                }
                resolve();
            };
            _this.openvidu.generateMediaConstraints(_this.properties)
                .then(function (constraints) {
                var outboundStreamOptions = {
                    mediaConstraints: constraints,
                    publisherProperties: _this.properties
                };
                _this.stream.setOutboundStreamOptions(outboundStreamOptions);
                var constraintsAux = {};
                var timeForDialogEvent = 1250;
                if (_this.stream.isSendVideo() || _this.stream.isSendAudio()) {
                    var definedAudioConstraint_1 = ((constraints.audio === undefined) ? true : constraints.audio);
                    constraintsAux.audio = _this.stream.isSendScreen() ? false : definedAudioConstraint_1;
                    constraintsAux.video = constraints.video;
                    var startTime_1 = Date.now();
                    _this.setPermissionDialogTimer(timeForDialogEvent);
                    navigator.mediaDevices.getUserMedia(constraintsAux)
                        .then(function (mediaStream) {
                        _this.clearPermissionDialogTimer(startTime_1, timeForDialogEvent);
                        if (_this.stream.isSendScreen() && _this.stream.isSendAudio()) {
                            // When getting desktop as user media audio constraint must be false. Now we can ask for it if required
                            constraintsAux.audio = definedAudioConstraint_1;
                            constraintsAux.video = false;
                            startTime_1 = Date.now();
                            _this.setPermissionDialogTimer(timeForDialogEvent);
                            navigator.mediaDevices.getUserMedia(constraintsAux)
                                .then(function (audioOnlyStream) {
                                _this.clearPermissionDialogTimer(startTime_1, timeForDialogEvent);
                                mediaStream.addTrack(audioOnlyStream.getAudioTracks()[0]);
                                successCallback(mediaStream);
                            })["catch"](function (error) {
                                _this.clearPermissionDialogTimer(startTime_1, timeForDialogEvent);
                                var errorName, errorMessage;
                                switch (error.name.toLowerCase()) {
                                    case 'notfounderror':
                                        errorName = OpenViduError_1.OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                        errorMessage = error.toString();
                                        errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                                        break;
                                    case 'notallowederror':
                                        errorName = OpenViduError_1.OpenViduErrorName.DEVICE_ACCESS_DENIED;
                                        errorMessage = error.toString();
                                        errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                                        break;
                                    case 'overconstrainederror':
                                        if (error.constraint.toLowerCase() === 'deviceid') {
                                            errorName = OpenViduError_1.OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                            errorMessage = "Audio input device with deviceId '" + constraints.video.deviceId.exact + "' not found";
                                        }
                                        else {
                                            errorName = OpenViduError_1.OpenViduErrorName.PUBLISHER_PROPERTIES_ERROR;
                                            errorMessage = "Audio input device doesn't support the value passed for constraint '" + error.constraint + "'";
                                        }
                                        errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                                        break;
                                }
                            });
                        }
                        else {
                            successCallback(mediaStream);
                        }
                    })["catch"](function (error) {
                        _this.clearPermissionDialogTimer(startTime_1, timeForDialogEvent);
                        var errorName, errorMessage;
                        switch (error.name.toLowerCase()) {
                            case 'notfounderror':
                                navigator.mediaDevices.getUserMedia({
                                    audio: false,
                                    video: constraints.video
                                })
                                    .then(function (mediaStream) {
                                    mediaStream.getVideoTracks().forEach(function (track) {
                                        track.stop();
                                    });
                                    errorName = OpenViduError_1.OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                    errorMessage = error.toString();
                                    errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                                })["catch"](function (e) {
                                    errorName = OpenViduError_1.OpenViduErrorName.INPUT_VIDEO_DEVICE_NOT_FOUND;
                                    errorMessage = error.toString();
                                    errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                                });
                                break;
                            case 'notallowederror':
                                errorName = _this.stream.isSendScreen() ? OpenViduError_1.OpenViduErrorName.SCREEN_CAPTURE_DENIED : OpenViduError_1.OpenViduErrorName.DEVICE_ACCESS_DENIED;
                                errorMessage = error.toString();
                                errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                                break;
                            case 'overconstrainederror':
                                navigator.mediaDevices.getUserMedia({
                                    audio: false,
                                    video: constraints.video
                                })
                                    .then(function (mediaStream) {
                                    mediaStream.getVideoTracks().forEach(function (track) {
                                        track.stop();
                                    });
                                    if (error.constraint.toLowerCase() === 'deviceid') {
                                        errorName = OpenViduError_1.OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                        errorMessage = "Audio input device with deviceId '" + constraints.audio.deviceId.exact + "' not found";
                                    }
                                    else {
                                        errorName = OpenViduError_1.OpenViduErrorName.PUBLISHER_PROPERTIES_ERROR;
                                        errorMessage = "Audio input device doesn't support the value passed for constraint '" + error.constraint + "'";
                                    }
                                    errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                                })["catch"](function (e) {
                                    if (error.constraint.toLowerCase() === 'deviceid') {
                                        errorName = OpenViduError_1.OpenViduErrorName.INPUT_VIDEO_DEVICE_NOT_FOUND;
                                        errorMessage = "Video input device with deviceId '" + constraints.video.deviceId.exact + "' not found";
                                    }
                                    else {
                                        errorName = OpenViduError_1.OpenViduErrorName.PUBLISHER_PROPERTIES_ERROR;
                                        errorMessage = "Video input device doesn't support the value passed for constraint '" + error.constraint + "'";
                                    }
                                    errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                                });
                                break;
                        }
                    });
                }
                else {
                    reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.NO_INPUT_SOURCE_SET, "Properties 'audioSource' and 'videoSource' cannot be set to false or null at the same time when calling 'OpenVidu.initPublisher'"));
                }
            })["catch"](function (error) {
                errorCallback(error);
            });
        });
    };
    /**
     * @hidden
     */
    Publisher.prototype.updateSession = function (session) {
        this.session = session;
        this.stream.session = session;
    };
    /**
     * @hidden
     */
    Publisher.prototype.reestablishStreamPlayingEvent = function () {
        if (this.ee.getListeners('streamPlaying').length > 0) {
            this.addPlayEventToFirstVideo();
        }
    };
    /* Private methods */
    Publisher.prototype.setPermissionDialogTimer = function (waitTime) {
        var _this = this;
        this.permissionDialogTimeout = setTimeout(function () {
            _this.emitEvent('accessDialogOpened', []);
        }, waitTime);
    };
    Publisher.prototype.clearPermissionDialogTimer = function (startTime, waitTime) {
        clearTimeout(this.permissionDialogTimeout);
        if ((Date.now() - startTime) > waitTime) {
            // Permission dialog was shown and now is closed
            this.emitEvent('accessDialogClosed', []);
        }
    };
    return Publisher;
}(StreamManager_1.StreamManager));
exports.Publisher = Publisher;
//# sourceMappingURL=Publisher.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenVidu/Session.js":
/*!***********************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenVidu/Session.js ***!
  \***********************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

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
var Connection_1 = __webpack_require__(/*! ./Connection */ "../../../../openvidu-browser/lib/OpenVidu/Connection.js");
var Subscriber_1 = __webpack_require__(/*! ./Subscriber */ "../../../../openvidu-browser/lib/OpenVidu/Subscriber.js");
var ConnectionEvent_1 = __webpack_require__(/*! ../OpenViduInternal/Events/ConnectionEvent */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/ConnectionEvent.js");
var RecordingEvent_1 = __webpack_require__(/*! ../OpenViduInternal/Events/RecordingEvent */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/RecordingEvent.js");
var SessionDisconnectedEvent_1 = __webpack_require__(/*! ../OpenViduInternal/Events/SessionDisconnectedEvent */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/SessionDisconnectedEvent.js");
var SignalEvent_1 = __webpack_require__(/*! ../OpenViduInternal/Events/SignalEvent */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/SignalEvent.js");
var StreamEvent_1 = __webpack_require__(/*! ../OpenViduInternal/Events/StreamEvent */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/StreamEvent.js");
var StreamPropertyChangedEvent_1 = __webpack_require__(/*! ../OpenViduInternal/Events/StreamPropertyChangedEvent */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/StreamPropertyChangedEvent.js");
var OpenViduError_1 = __webpack_require__(/*! ../OpenViduInternal/Enums/OpenViduError */ "../../../../openvidu-browser/lib/OpenViduInternal/Enums/OpenViduError.js");
var VideoInsertMode_1 = __webpack_require__(/*! ../OpenViduInternal/Enums/VideoInsertMode */ "../../../../openvidu-browser/lib/OpenViduInternal/Enums/VideoInsertMode.js");
var platform = __webpack_require__(/*! platform */ "../../../../openvidu-browser/node_modules/platform/platform.js");
var EventEmitter = __webpack_require__(/*! wolfy87-eventemitter */ "../../../../openvidu-browser/node_modules/wolfy87-eventemitter/EventEmitter.js");
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
            streamEvent.callDefaultBehavior();
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
                streamEvent.callDefaultBehavior();
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
            streamEvent.callDefaultBehavior();
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
                    streamEvent.callDefaultBehavior();

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
    Session.prototype.onStreamPropertyChanged = function (msg) {
        var _this = this;
        this.getRemoteConnection(msg.connectionId, 'Remote connection ' + msg.connectionId + " unknown when 'onStreamPropertyChanged'. " +
            'Existing remote connections: ' + JSON.stringify(Object.keys(this.remoteConnections)))
            .then(function (connection) {
            if (!!connection.stream && connection.stream.streamId === msg.streamId) {
                var stream = connection.stream;
                var oldValue = void 0;
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
                }
                _this.ee.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this, stream, msg.property, msg.newValue, oldValue, msg.reason)]);
                stream.streamManager.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(stream.streamManager, stream, msg.property, msg.newValue, oldValue, msg.reason)]);
            }
            else {
                console.error("No stream with streamId '" + msg.streamId + "' found for connection '" + msg.connectionId + "' on 'streamPropertyChanged' event");
            }
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
                sessionDisconnectEvent.callDefaultBehavior();
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

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenVidu/Stream.js":
/*!**********************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenVidu/Stream.js ***!
  \**********************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

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
var WebRtcPeer_1 = __webpack_require__(/*! ../OpenViduInternal/WebRtcPeer/WebRtcPeer */ "../../../../openvidu-browser/lib/OpenViduInternal/WebRtcPeer/WebRtcPeer.js");
var WebRtcStats_1 = __webpack_require__(/*! ../OpenViduInternal/WebRtcStats/WebRtcStats */ "../../../../openvidu-browser/lib/OpenViduInternal/WebRtcStats/WebRtcStats.js");
var PublisherSpeakingEvent_1 = __webpack_require__(/*! ../OpenViduInternal/Events/PublisherSpeakingEvent */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/PublisherSpeakingEvent.js");
var EventEmitter = __webpack_require__(/*! wolfy87-eventemitter */ "../../../../openvidu-browser/node_modules/wolfy87-eventemitter/EventEmitter.js");
var hark = __webpack_require__(/*! hark */ "../../../../openvidu-browser/node_modules/hark/hark.js");
/**
 * Represents each one of the media streams available in OpenVidu Server for certain session.
 * Each [[Publisher]] and [[Subscriber]] has an attribute of type Stream, as they give access
 * to one of them (sending and receiving it, respectively)
 */
var Stream = /** @class */ (function () {
    /**
     * @hidden
     */
    function Stream(session, options) {
        var _this = this;
        /**
         * @hidden
         */
        this.ee = new EventEmitter();
        this.isSubscribeToRemote = false;
        /**
         * @hidden
         */
        this.isLocalStreamReadyToPublish = false;
        /**
         * @hidden
         */
        this.isLocalStreamPublished = false;
        this.session = session;
        if (options.hasOwnProperty('id')) {
            // InboundStreamOptions: stream belongs to a Subscriber
            this.inboundStreamOpts = options;
            this.streamId = this.inboundStreamOpts.id;
            this.hasAudio = this.inboundStreamOpts.hasAudio;
            this.hasVideo = this.inboundStreamOpts.hasVideo;
            if (this.hasAudio) {
                this.audioActive = this.inboundStreamOpts.audioActive;
            }
            if (this.hasVideo) {
                this.videoActive = this.inboundStreamOpts.videoActive;
                this.typeOfVideo = (!this.inboundStreamOpts.typeOfVideo) ? undefined : this.inboundStreamOpts.typeOfVideo;
                this.frameRate = (this.inboundStreamOpts.frameRate === -1) ? undefined : this.inboundStreamOpts.frameRate;
                this.videoDimensions = this.inboundStreamOpts.videoDimensions;
            }
        }
        else {
            // OutboundStreamOptions: stream belongs to a Publisher
            this.outboundStreamOpts = options;
            this.hasAudio = this.isSendAudio();
            this.hasVideo = this.isSendVideo();
            if (this.hasAudio) {
                this.audioActive = !!this.outboundStreamOpts.publisherProperties.publishAudio;
            }
            if (this.hasVideo) {
                this.videoActive = !!this.outboundStreamOpts.publisherProperties.publishVideo;
                this.frameRate = this.outboundStreamOpts.publisherProperties.frameRate;
                if (this.outboundStreamOpts.publisherProperties.videoSource instanceof MediaStreamTrack) {
                    this.typeOfVideo = 'CUSTOM';
                }
                else {
                    this.typeOfVideo = this.isSendScreen() ? 'SCREEN' : 'CAMERA';
                }
            }
        }
        this.ee.on('mediastream-updated', function () {
            _this.streamManager.updateMediaStream(_this.mediaStream);
            console.debug('Video srcObject [' + _this.mediaStream + '] updated in stream [' + _this.streamId + ']');
        });
    }
    /* Hidden methods */
    /**
     * @hidden
     */
    Stream.prototype.getMediaStream = function () {
        return this.mediaStream;
    };
    /**
     * @hidden
     */
    Stream.prototype.setMediaStream = function (mediaStream) {
        this.mediaStream = mediaStream;
    };
    /**
     * @hidden
     */
    Stream.prototype.updateMediaStreamInVideos = function () {
        this.ee.emitEvent('mediastream-updated');
    };
    /**
     * @hidden
     */
    Stream.prototype.getWebRtcPeer = function () {
        return this.webRtcPeer;
    };
    /**
     * @hidden
     */
    Stream.prototype.getRTCPeerConnection = function () {
        return this.webRtcPeer.pc;
    };
    /**
     * @hidden
     */
    Stream.prototype.subscribeToMyRemote = function (value) {
        this.isSubscribeToRemote = value;
    };
    /**
     * @hidden
     */
    Stream.prototype.setOutboundStreamOptions = function (outboundStreamOpts) {
        this.outboundStreamOpts = outboundStreamOpts;
    };
    /**
     * @hidden
     */
    Stream.prototype.subscribe = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.initWebRtcPeerReceive()
                .then(function () {
                resolve();
            })["catch"](function (error) {
                reject(error);
            });
        });
    };
    /**
     * @hidden
     */
    Stream.prototype.publish = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.isLocalStreamReadyToPublish) {
                _this.initWebRtcPeerSend()
                    .then(function () {
                    resolve();
                })["catch"](function (error) {
                    reject(error);
                });
            }
            else {
                _this.ee.once('stream-ready-to-publish', function () {
                    _this.publish()
                        .then(function () {
                        resolve();
                    })["catch"](function (error) {
                        reject(error);
                    });
                });
            }
        });
    };
    /**
     * @hidden
     */
    Stream.prototype.disposeWebRtcPeer = function () {
        if (this.webRtcPeer) {
            this.webRtcPeer.dispose();
        }
        if (this.speechEvent) {
            this.speechEvent.stop();
        }
        this.stopWebRtcStats();
        console.info((!!this.outboundStreamOpts ? 'Outbound ' : 'Inbound ') + "WebRTCPeer from 'Stream' with id [" + this.streamId + '] is now closed');
    };
    /**
     * @hidden
     */
    Stream.prototype.disposeMediaStream = function () {
        if (this.mediaStream) {
            this.mediaStream.getAudioTracks().forEach(function (track) {
                track.stop();
            });
            this.mediaStream.getVideoTracks().forEach(function (track) {
                track.stop();
            });
            delete this.mediaStream;
        }
        console.info((!!this.outboundStreamOpts ? 'Local ' : 'Remote ') + "MediaStream from 'Stream' with id [" + this.streamId + '] is now disposed');
    };
    /**
     * @hidden
     */
    Stream.prototype.displayMyRemote = function () {
        return this.isSubscribeToRemote;
    };
    /**
     * @hidden
     */
    Stream.prototype.isSendAudio = function () {
        return (!!this.outboundStreamOpts &&
            this.outboundStreamOpts.publisherProperties.audioSource !== null &&
            this.outboundStreamOpts.publisherProperties.audioSource !== false);
    };
    /**
     * @hidden
     */
    Stream.prototype.isSendVideo = function () {
        return (!!this.outboundStreamOpts &&
            this.outboundStreamOpts.publisherProperties.videoSource !== null &&
            this.outboundStreamOpts.publisherProperties.videoSource !== false);
    };
    /**
     * @hidden
     */
    Stream.prototype.isSendScreen = function () {
        return (!!this.outboundStreamOpts &&
            this.outboundStreamOpts.publisherProperties.videoSource === 'screen');
    };
    /**
     * @hidden
     */
    Stream.prototype.setSpeechEventIfNotExists = function () {
        if (!this.speechEvent) {
            var harkOptions = this.session.openvidu.advancedConfiguration.publisherSpeakingEventsOptions || {};
            harkOptions.interval = (typeof harkOptions.interval === 'number') ? harkOptions.interval : 50;
            harkOptions.threshold = (typeof harkOptions.threshold === 'number') ? harkOptions.threshold : -50;
            this.speechEvent = hark(this.mediaStream, harkOptions);
        }
    };
    /**
     * @hidden
     */
    Stream.prototype.enableSpeakingEvents = function () {
        var _this = this;
        this.setSpeechEventIfNotExists();
        this.speechEvent.on('speaking', function () {
            _this.session.emitEvent('publisherStartSpeaking', [new PublisherSpeakingEvent_1.PublisherSpeakingEvent(_this.session, 'publisherStartSpeaking', _this.connection, _this.streamId)]);
        });
        this.speechEvent.on('stopped_speaking', function () {
            _this.session.emitEvent('publisherStopSpeaking', [new PublisherSpeakingEvent_1.PublisherSpeakingEvent(_this.session, 'publisherStopSpeaking', _this.connection, _this.streamId)]);
        });
    };
    /**
     * @hidden
     */
    Stream.prototype.enableOnceSpeakingEvents = function () {
        var _this = this;
        this.setSpeechEventIfNotExists();
        this.speechEvent.on('speaking', function () {
            _this.session.emitEvent('publisherStartSpeaking', [new PublisherSpeakingEvent_1.PublisherSpeakingEvent(_this.session, 'publisherStartSpeaking', _this.connection, _this.streamId)]);
            _this.disableSpeakingEvents();
        });
        this.speechEvent.on('stopped_speaking', function () {
            _this.session.emitEvent('publisherStopSpeaking', [new PublisherSpeakingEvent_1.PublisherSpeakingEvent(_this.session, 'publisherStopSpeaking', _this.connection, _this.streamId)]);
            _this.disableSpeakingEvents();
        });
    };
    /**
     * @hidden
     */
    Stream.prototype.disableSpeakingEvents = function () {
        this.speechEvent.stop();
        this.speechEvent = undefined;
    };
    /**
     * @hidden
     */
    Stream.prototype.isLocal = function () {
        // inbound options undefined and outbound options defined
        return (!this.inboundStreamOpts && !!this.outboundStreamOpts);
    };
    /**
     * @hidden
     */
    Stream.prototype.getSelectedIceCandidate = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.webRtcStats.getSelectedIceCandidateInfo()
                .then(function (report) { return resolve(report); })["catch"](function (error) { return reject(error); });
        });
    };
    /**
     * @hidden
     */
    Stream.prototype.getRemoteIceCandidateList = function () {
        return this.webRtcPeer.remoteCandidatesQueue;
    };
    /**
     * @hidden
     */
    Stream.prototype.getLocalIceCandidateList = function () {
        return this.webRtcPeer.localCandidatesQueue;
    };
    /* Private methods */
    Stream.prototype.initWebRtcPeerSend = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var userMediaConstraints = {
                audio: _this.isSendAudio(),
                video: _this.isSendVideo()
            };
            var options = {
                mediaStream: _this.mediaStream,
                mediaConstraints: userMediaConstraints,
                onicecandidate: _this.connection.sendIceCandidate.bind(_this.connection),
                iceServers: _this.getIceServersConf(),
                simulcast: false
            };
            var successCallback = function (sdpOfferParam) {
                console.debug('Sending SDP offer to publish as '
                    + _this.streamId, sdpOfferParam);
                var typeOfVideo = '';
                if (_this.isSendVideo()) {
                    typeOfVideo = _this.outboundStreamOpts.publisherProperties.videoSource instanceof MediaStreamTrack ? 'CUSTOM' : (_this.isSendScreen() ? 'SCREEN' : 'CAMERA');
                }
                _this.session.openvidu.sendRequest('publishVideo', {
                    sdpOffer: sdpOfferParam,
                    doLoopback: _this.displayMyRemote() || false,
                    hasAudio: _this.isSendAudio(),
                    hasVideo: _this.isSendVideo(),
                    audioActive: _this.audioActive,
                    videoActive: _this.videoActive,
                    typeOfVideo: typeOfVideo,
                    frameRate: !!_this.frameRate ? _this.frameRate : -1,
                    videoDimensions: JSON.stringify(_this.videoDimensions)
                }, function (error, response) {
                    if (error) {
                        reject('Error on publishVideo: ' + JSON.stringify(error));
                    }
                    else {
                        _this.webRtcPeer.processAnswer(response.sdpAnswer)
                            .then(function () {
                            _this.streamId = response.id;
                            _this.isLocalStreamPublished = true;
                            if (_this.displayMyRemote()) {
                                _this.remotePeerSuccessfullyEstablished();
                            }
                            _this.ee.emitEvent('stream-created-by-publisher');
                            _this.initWebRtcStats();
                            resolve();
                        })["catch"](function (error) {
                            reject(error);
                        });
                        console.info("'Publisher' successfully published to session");
                    }
                });
            };
            if (_this.displayMyRemote()) {
                _this.webRtcPeer = new WebRtcPeer_1.WebRtcPeerSendrecv(options);
            }
            else {
                _this.webRtcPeer = new WebRtcPeer_1.WebRtcPeerSendonly(options);
            }
            _this.webRtcPeer.generateOffer().then(function (offer) {
                successCallback(offer);
            })["catch"](function (error) {
                reject(new Error('(publish) SDP offer error: ' + JSON.stringify(error)));
            });
        });
    };
    Stream.prototype.initWebRtcPeerReceive = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var offerConstraints = {
                audio: _this.inboundStreamOpts.hasAudio,
                video: _this.inboundStreamOpts.hasVideo
            };
            console.debug("'Session.subscribe(Stream)' called. Constraints of generate SDP offer", offerConstraints);
            var options = {
                onicecandidate: _this.connection.sendIceCandidate.bind(_this.connection),
                mediaConstraints: offerConstraints,
                iceServers: _this.getIceServersConf(),
                simulcast: false
            };
            var successCallback = function (sdpOfferParam) {
                console.debug('Sending SDP offer to subscribe to '
                    + _this.streamId, sdpOfferParam);
                _this.session.openvidu.sendRequest('receiveVideoFrom', {
                    sender: _this.streamId,
                    sdpOffer: sdpOfferParam
                }, function (error, response) {
                    if (error) {
                        reject(new Error('Error on recvVideoFrom: ' + JSON.stringify(error)));
                    }
                    else {
                        _this.webRtcPeer.processAnswer(response.sdpAnswer).then(function () {
                            _this.remotePeerSuccessfullyEstablished();
                            _this.initWebRtcStats();
                            resolve();
                        })["catch"](function (error) {
                            reject(error);
                        });
                    }
                });
            };
            _this.webRtcPeer = new WebRtcPeer_1.WebRtcPeerRecvonly(options);
            _this.webRtcPeer.generateOffer()
                .then(function (offer) {
                successCallback(offer);
            })["catch"](function (error) {
                reject(new Error('(subscribe) SDP offer error: ' + JSON.stringify(error)));
            });
        });
    };
    Stream.prototype.remotePeerSuccessfullyEstablished = function () {
        this.mediaStream = this.webRtcPeer.pc.getRemoteStreams()[0];
        console.debug('Peer remote stream', this.mediaStream);
        if (!!this.mediaStream) {
            this.ee.emitEvent('mediastream-updated');
            if (!this.displayMyRemote() && !!this.mediaStream.getAudioTracks()[0] && this.session.speakingEventsEnabled) {
                this.enableSpeakingEvents();
            }
        }
    };
    Stream.prototype.initWebRtcStats = function () {
        this.webRtcStats = new WebRtcStats_1.WebRtcStats(this);
        this.webRtcStats.initWebRtcStats();
    };
    Stream.prototype.stopWebRtcStats = function () {
        if (!!this.webRtcStats && this.webRtcStats.isEnabled()) {
            this.webRtcStats.stopWebRtcStats();
        }
    };
    Stream.prototype.getIceServersConf = function () {
        var returnValue;
        if (!!this.session.openvidu.advancedConfiguration.iceServers) {
            returnValue = this.session.openvidu.advancedConfiguration.iceServers === 'freeice' ?
                undefined :
                this.session.openvidu.advancedConfiguration.iceServers;
        }
        else if (this.session.openvidu.iceServers) {
            returnValue = this.session.openvidu.iceServers;
        }
        else {
            returnValue = undefined;
        }
        return returnValue;
    };
    return Stream;
}());
exports.Stream = Stream;
//# sourceMappingURL=Stream.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenVidu/StreamManager.js":
/*!*****************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenVidu/StreamManager.js ***!
  \*****************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

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
var StreamManagerEvent_1 = __webpack_require__(/*! ../OpenViduInternal/Events/StreamManagerEvent */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/StreamManagerEvent.js");
var VideoElementEvent_1 = __webpack_require__(/*! ../OpenViduInternal/Events/VideoElementEvent */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/VideoElementEvent.js");
var VideoInsertMode_1 = __webpack_require__(/*! ../OpenViduInternal/Enums/VideoInsertMode */ "../../../../openvidu-browser/lib/OpenViduInternal/Enums/VideoInsertMode.js");
var EventEmitter = __webpack_require__(/*! wolfy87-eventemitter */ "../../../../openvidu-browser/node_modules/wolfy87-eventemitter/EventEmitter.js");
/**
 * Interface in charge of displaying the media streams in the HTML DOM. This wraps any [[Publisher]] and [[Subscriber]] object.
 * You can insert as many video players fo the same Stream as you want by calling [[StreamManager.addVideoElement]] or
 * [[StreamManager.createVideoElement]].
 *
 * The use of StreamManager wrapper is particularly useful when you don't need to differentiate between Publisher or Subscriber streams or just
 * want to directly manage your own video elements (even more than one video element per Stream). This scenario is pretty common in
 * declarative, MVC frontend frameworks such as Angular, React or Vue.js
 */
var StreamManager = /** @class */ (function () {
    /**
     * @hidden
     */
    function StreamManager(stream, targetElement) {
        var _this = this;
        /**
         * All the videos displaying the Stream of this Publisher/Subscriber
         */
        this.videos = [];
        /**
         * @hidden
         */
        this.lazyLaunchVideoElementCreatedEvent = false;
        /**
         * @hidden
         */
        this.ee = new EventEmitter();
        this.stream = stream;
        this.stream.streamManager = this;
        this.remote = !this.stream.isLocal();
        if (!!targetElement) {
            var targEl = void 0;
            if (typeof targetElement === 'string') {
                targEl = document.getElementById(targetElement);
            }
            else if (targetElement instanceof HTMLElement) {
                targEl = targetElement;
            }
            if (!!targEl) {
                this.firstVideoElement = {
                    targetElement: targEl,
                    video: document.createElement('video'),
                    id: ''
                };
                this.targetElement = targEl;
                this.element = targEl;
            }
        }
        this.canPlayListener = function () {
            if (_this.stream.isLocal()) {
                if (!_this.stream.displayMyRemote()) {
                    console.info("Your local 'Stream' with id [" + _this.stream.streamId + '] video is now playing');
                    _this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(_this.videos[0].video, _this, 'videoPlaying')]);
                }
                else {
                    console.info("Your own remote 'Stream' with id [" + _this.stream.streamId + '] video is now playing');
                    _this.ee.emitEvent('remoteVideoPlaying', [new VideoElementEvent_1.VideoElementEvent(_this.videos[0].video, _this, 'remoteVideoPlaying')]);
                }
            }
            else {
                console.info("Remote 'Stream' with id [" + _this.stream.streamId + '] video is now playing');
                _this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(_this.videos[0].video, _this, 'videoPlaying')]);
            }
            _this.ee.emitEvent('streamPlaying', [new StreamManagerEvent_1.StreamManagerEvent(_this)]);
        };
    }
    /**
     * See [[EventDispatcher.on]]
     */
    StreamManager.prototype.on = function (type, handler) {
        var _this = this;
        this.ee.on(type, function (event) {
            if (event) {
                console.info("Event '" + type + "' triggered by '" + (_this.remote ? 'Subscriber' : 'Publisher') + "'", event);
            }
            else {
                console.info("Event '" + type + "' triggered by '" + (_this.remote ? 'Subscriber' : 'Publisher') + "'");
            }
            handler(event);
        });
        if (type === 'videoElementCreated') {
            if (!!this.stream && this.lazyLaunchVideoElementCreatedEvent) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(this.videos[0].video, this, 'videoElementCreated')]);
                this.lazyLaunchVideoElementCreatedEvent = false;
            }
        }
        if (type === 'streamPlaying' || type === 'videoPlaying') {
            if (this.videos[0] && this.videos[0].video &&
                this.videos[0].video.currentTime > 0 &&
                this.videos[0].video.paused === false &&
                this.videos[0].video.ended === false &&
                this.videos[0].video.readyState === 4) {
                this.ee.emitEvent('streamPlaying', [new StreamManagerEvent_1.StreamManagerEvent(this)]);
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.videos[0].video, this, 'videoPlaying')]);
            }
        }
        return this;
    };
    /**
     * See [[EventDispatcher.once]]
     */
    StreamManager.prototype.once = function (type, handler) {
        this.ee.once(type, function (event) {
            if (event) {
                console.info("Event '" + type + "' triggered once", event);
            }
            else {
                console.info("Event '" + type + "' triggered once");
            }
            handler(event);
        });
        if (type === 'videoElementCreated') {
            if (!!this.stream && this.lazyLaunchVideoElementCreatedEvent) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(this.videos[0].video, this, 'videoElementCreated')]);
            }
        }
        if (type === 'streamPlaying' || type === 'videoPlaying') {
            if (this.videos[0] && this.videos[0].video &&
                this.videos[0].video.currentTime > 0 &&
                this.videos[0].video.paused === false &&
                this.videos[0].video.ended === false &&
                this.videos[0].video.readyState === 4) {
                this.ee.emitEvent('streamPlaying', [new StreamManagerEvent_1.StreamManagerEvent(this)]);
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.videos[0].video, this, 'videoPlaying')]);
            }
        }
        return this;
    };
    /**
     * See [[EventDispatcher.off]]
     */
    StreamManager.prototype.off = function (type, handler) {
        if (!handler) {
            this.ee.removeAllListeners(type);
        }
        else {
            this.ee.off(type, handler);
        }
        return this;
    };
    /**
     * Makes `video` element parameter display this [[stream]]. This is useful when you are
     * [managing the video elements on your own](/docs/how-do-i/manage-videos/#you-take-care-of-the-video-players)
     *
     * Calling this method with a video already added to other Publisher/Subscriber will cause the video element to be
     * disassociated from that previous Publisher/Subscriber and to be associated to this one.
     *
     * @returns 1 if the video wasn't associated to any other Publisher/Subscriber and has been successfully added to this one.
     * 0 if the video was already added to this Publisher/Subscriber. -1 if the video was previously associated to any other
     * Publisher/Subscriber and has been successfully disassociated from that one and properly added to this one.
     */
    StreamManager.prototype.addVideoElement = function (video) {
        this.initializeVideoProperties(video);
        // If the video element is already part of this StreamManager do nothing
        for (var _i = 0, _a = this.videos; _i < _a.length; _i++) {
            var v = _a[_i];
            if (v.video === video) {
                return 0;
            }
        }
        var returnNumber = 1;
        this.initializeVideoProperties(video);
        for (var _b = 0, _c = this.stream.session.streamManagers; _b < _c.length; _b++) {
            var streamManager = _c[_b];
            if (streamManager.disassociateVideo(video)) {
                returnNumber = -1;
                break;
            }
        }
        this.stream.session.streamManagers.forEach(function (streamManager) {
            streamManager.disassociateVideo(video);
        });
        this.pushNewStreamManagerVideo({
            video: video,
            id: video.id
        });
        console.info('New video element associated to ', this);
        return returnNumber;
    };
    /**
     * Creates a new video element displaying this [[stream]]. This allows you to have multiple video elements displaying the same media stream.
     *
     * #### Events dispatched
     *
     * The Publisher/Subscriber object will dispatch a `videoElementCreated` event once the HTML video element has been added to DOM. See [[VideoElementEvent]]
     *
     * @param targetElement HTML DOM element (or its `id` attribute) in which the video element of the Publisher/Subscriber will be inserted
     * @param insertMode How the video element will be inserted accordingly to `targetElemet`
     */
    StreamManager.prototype.createVideoElement = function (targetElement, insertMode) {
        var targEl;
        if (typeof targetElement === 'string') {
            targEl = document.getElementById(targEl);
            if (!targEl) {
                throw new Error("The provided 'targetElement' couldn't be resolved to any HTML element: " + targetElement);
            }
        }
        else if (targetElement instanceof HTMLElement) {
            targEl = targetElement;
        }
        else {
            throw new Error("The provided 'targetElement' couldn't be resolved to any HTML element: " + targetElement);
        }
        var video = document.createElement('video');
        this.initializeVideoProperties(video);
        var insMode = !!insertMode ? insertMode : VideoInsertMode_1.VideoInsertMode.APPEND;
        switch (insMode) {
            case VideoInsertMode_1.VideoInsertMode.AFTER:
                targEl.parentNode.insertBefore(video, targEl.nextSibling);
                break;
            case VideoInsertMode_1.VideoInsertMode.APPEND:
                targEl.appendChild(video);
                break;
            case VideoInsertMode_1.VideoInsertMode.BEFORE:
                targEl.parentNode.insertBefore(video, targEl);
                break;
            case VideoInsertMode_1.VideoInsertMode.PREPEND:
                targEl.insertBefore(video, targEl.childNodes[0]);
                break;
            case VideoInsertMode_1.VideoInsertMode.REPLACE:
                targEl.parentNode.replaceChild(video, targEl);
                break;
            default:
                insMode = VideoInsertMode_1.VideoInsertMode.APPEND;
                targEl.appendChild(video);
                break;
        }
        var v = {
            targetElement: targEl,
            video: video,
            insertMode: insMode,
            id: video.id
        };
        this.pushNewStreamManagerVideo(v);
        this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(v.video, this, 'videoElementCreated')]);
        this.lazyLaunchVideoElementCreatedEvent = !!this.firstVideoElement;
        return video;
    };
    /**
     * @hidden
     */
    StreamManager.prototype.initializeVideoProperties = function (video) {
        video.srcObject = this.stream.getMediaStream();
        video.autoplay = true;
        video.controls = false;
        if (!video.id) {
            video.id = (this.remote ? 'remote-' : 'local-') + 'video-' + this.stream.streamId;
            // DEPRECATED property: assign once the property id if the user provided a valid targetElement
            if (!this.id && !!this.targetElement) {
                this.id = video.id;
            }
        }
        if (!this.remote && !this.stream.displayMyRemote()) {
            video.muted = true;
            if (this.stream.outboundStreamOpts.publisherProperties.mirror) {
                this.mirrorVideo(video);
            }
        }
    };
    /**
     * @hidden
     */
    StreamManager.prototype.removeAllVideos = function () {
        var _this = this;
        for (var i = this.stream.session.streamManagers.length - 1; i >= 0; --i) {
            if (this.stream.session.streamManagers[i] === this) {
                this.stream.session.streamManagers.splice(i, 1);
            }
        }
        this.videos.slice().reverse().forEach(function (streamManagerVideo, index, videos) {
            // Remove oncanplay event listener (only OpenVidu browser one, not the user ones)
            streamManagerVideo.video.removeEventListener('canplay', _this.canPlayListener);
            if (!!streamManagerVideo.targetElement) {
                // Only remove videos created by OpenVidu Browser (those generated by passing a valid targetElement in OpenVidu.initPublisher and Session.subscribe
                // or those created by StreamManager.createVideoElement). These are also the videos that triggered a videoElementCreated event
                streamManagerVideo.video.parentNode.removeChild(streamManagerVideo.video);
                _this.ee.emitEvent('videoElementDestroyed', [new VideoElementEvent_1.VideoElementEvent(streamManagerVideo.video, _this, 'videoElementDestroyed')]);
                _this.videos.splice(videos.length - 1 - index, 1);
            }
            else {
                // Remove srcObject in all videos managed by the user
                streamManagerVideo.video.srcObject = null;
            }
        });
    };
    /**
     * @hidden
     */
    StreamManager.prototype.disassociateVideo = function (video) {
        var disassociated = false;
        for (var i = 0; i < this.videos.length; i++) {
            if (this.videos[i].video === video) {
                this.videos.splice(i, 1);
                disassociated = true;
                console.info('Video element disassociated from ', this);
                break;
            }
        }
        return disassociated;
    };
    /**
     * @hidden
     */
    StreamManager.prototype.addPlayEventToFirstVideo = function () {
        if ((!!this.videos[0]) && (!!this.videos[0].video) && (this.videos[0].video.oncanplay === null)) {
            this.videos[0].video.addEventListener('canplay', this.canPlayListener);
        }
    };
    /**
     * @hidden
     */
    StreamManager.prototype.updateMediaStream = function (mediaStream) {
        this.videos.forEach(function (streamManagerVideo) {
            streamManagerVideo.video.srcObject = mediaStream;
        });
    };
    /**
     * @hidden
     */
    StreamManager.prototype.emitEvent = function (type, eventArray) {
        this.ee.emitEvent(type, eventArray);
    };
    StreamManager.prototype.pushNewStreamManagerVideo = function (streamManagerVideo) {
        this.videos.push(streamManagerVideo);
        this.addPlayEventToFirstVideo();
        if (this.stream.session.streamManagers.indexOf(this) === -1) {
            this.stream.session.streamManagers.push(this);
        }
    };
    StreamManager.prototype.mirrorVideo = function (video) {
        video.style.transform = 'rotateY(180deg)';
        video.style.webkitTransform = 'rotateY(180deg)';
    };
    return StreamManager;
}());
exports.StreamManager = StreamManager;
//# sourceMappingURL=StreamManager.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenVidu/Subscriber.js":
/*!**************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenVidu/Subscriber.js ***!
  \**************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var StreamManager_1 = __webpack_require__(/*! ./StreamManager */ "../../../../openvidu-browser/lib/OpenVidu/StreamManager.js");
/**
 * Packs remote media streams. Participants automatically receive them when others publish their streams. Initialized with [[Session.subscribe]] method
 */
var Subscriber = /** @class */ (function (_super) {
    __extends(Subscriber, _super);
    /**
     * @hidden
     */
    function Subscriber(stream, targEl, properties) {
        var _this = _super.call(this, stream, targEl) || this;
        _this.element = _this.targetElement;
        _this.stream = stream;
        _this.properties = properties;
        return _this;
    }
    /**
     * Subscribe or unsubscribe from the audio stream (if available). Calling this method twice in a row passing same value will have no effect
     * @param value `true` to subscribe to the audio stream, `false` to unsubscribe from it
     */
    Subscriber.prototype.subscribeToAudio = function (value) {
        this.stream.getMediaStream().getAudioTracks().forEach(function (track) {
            track.enabled = value;
        });
        console.info("'Subscriber' has " + (value ? 'subscribed to' : 'unsubscribed from') + ' its audio stream');
        return this;
    };
    /**
     * Subscribe or unsubscribe from the video stream (if available). Calling this method twice in a row passing same value will have no effect
     * @param value `true` to subscribe to the video stream, `false` to unsubscribe from it
     */
    Subscriber.prototype.subscribeToVideo = function (value) {
        this.stream.getMediaStream().getVideoTracks().forEach(function (track) {
            track.enabled = value;
        });
        console.info("'Subscriber' has " + (value ? 'subscribed to' : 'unsubscribed from') + ' its video stream');
        return this;
    };
    return Subscriber;
}(StreamManager_1.StreamManager));
exports.Subscriber = Subscriber;
//# sourceMappingURL=Subscriber.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/Enums/LocalRecorderState.js":
/*!************************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/Enums/LocalRecorderState.js ***!
  \************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

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
var LocalRecorderState;
(function (LocalRecorderState) {
    LocalRecorderState["READY"] = "READY";
    LocalRecorderState["RECORDING"] = "RECORDING";
    LocalRecorderState["PAUSED"] = "PAUSED";
    LocalRecorderState["FINISHED"] = "FINISHED";
})(LocalRecorderState = exports.LocalRecorderState || (exports.LocalRecorderState = {}));
//# sourceMappingURL=LocalRecorderState.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/Enums/OpenViduError.js":
/*!*******************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/Enums/OpenViduError.js ***!
  \*******************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

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
/**
 * Defines property [[OpenViduError.name]]
 */
var OpenViduErrorName;
(function (OpenViduErrorName) {
    /**
     * Browser is not supported by OpenVidu.
     * Returned upon unsuccessful [[Session.connect]]
     */
    OpenViduErrorName["BROWSER_NOT_SUPPORTED"] = "BROWSER_NOT_SUPPORTED";
    /**
     * The user hasn't granted permissions to the required input device when the browser asked for them.
     * Returned upon unsuccessful [[OpenVidu.initPublisher]] or [[OpenVidu.getUserMedia]]
     */
    OpenViduErrorName["DEVICE_ACCESS_DENIED"] = "DEVICE_ACCESS_DENIED";
    /**
     * The user hasn't granted permissions to capture some desktop screen when the browser asked for them.
     * Returned upon unsuccessful [[OpenVidu.initPublisher]] or [[OpenVidu.getUserMedia]]
     */
    OpenViduErrorName["SCREEN_CAPTURE_DENIED"] = "SCREEN_CAPTURE_DENIED";
    /**
     * Browser does not support screen sharing.
     * Returned upon unsuccessful [[OpenVidu.initPublisher]]
     */
    OpenViduErrorName["SCREEN_SHARING_NOT_SUPPORTED"] = "SCREEN_SHARING_NOT_SUPPORTED";
    /**
     * Only for Chrome, there's no screen sharing extension installed
     * Returned upon unsuccessful [[OpenVidu.initPublisher]]
     */
    OpenViduErrorName["SCREEN_EXTENSION_NOT_INSTALLED"] = "SCREEN_EXTENSION_NOT_INSTALLED";
    /**
     * Only for Chrome, the screen sharing extension is installed but is disabled
     * Returned upon unsuccessful [[OpenVidu.initPublisher]]
     */
    OpenViduErrorName["SCREEN_EXTENSION_DISABLED"] = "SCREEN_EXTENSION_DISABLED";
    /**
     * No video input device found with the provided deviceId (property [[PublisherProperties.videoSource]])
     * Returned upon unsuccessful [[OpenVidu.initPublisher]]
     */
    OpenViduErrorName["INPUT_VIDEO_DEVICE_NOT_FOUND"] = "INPUT_VIDEO_DEVICE_NOT_FOUND";
    /**
     * No audio input device found with the provided deviceId (property [[PublisherProperties.audioSource]])
     * Returned upon unsuccessful [[OpenVidu.initPublisher]]
     */
    OpenViduErrorName["INPUT_AUDIO_DEVICE_NOT_FOUND"] = "INPUT_AUDIO_DEVICE_NOT_FOUND";
    /**
     * Method [[OpenVidu.initPublisher]] has been called with properties `videoSource` and `audioSource` of
     * [[PublisherProperties]] parameter both set to *false* or *null*
     */
    OpenViduErrorName["NO_INPUT_SOURCE_SET"] = "NO_INPUT_SOURCE_SET";
    /**
     * Some media property of [[PublisherProperties]] such as `frameRate` or `resolution` is not supported
     * by the input devices (whenever it is possible they are automatically adjusted to the most similar value).
     * Returned upon unsuccessful [[OpenVidu.initPublisher]]
     */
    OpenViduErrorName["PUBLISHER_PROPERTIES_ERROR"] = "PUBLISHER_PROPERTIES_ERROR";
    /**
     * _Not in use yet_
     */
    OpenViduErrorName["OPENVIDU_PERMISSION_DENIED"] = "OPENVIDU_PERMISSION_DENIED";
    /**
     * _Not in use yet_
     */
    OpenViduErrorName["OPENVIDU_NOT_CONNECTED"] = "OPENVIDU_NOT_CONNECTED";
    /**
     * _Not in use yet_
     */
    OpenViduErrorName["GENERIC_ERROR"] = "GENERIC_ERROR";
})(OpenViduErrorName = exports.OpenViduErrorName || (exports.OpenViduErrorName = {}));
/**
 * Simple object to identify runtime errors on the client side
 */
var OpenViduError = /** @class */ (function () {
    /**
     * @hidden
     */
    function OpenViduError(name, message) {
        this.name = name;
        this.message = message;
    }
    return OpenViduError;
}());
exports.OpenViduError = OpenViduError;
//# sourceMappingURL=OpenViduError.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/Enums/VideoInsertMode.js":
/*!*********************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/Enums/VideoInsertMode.js ***!
  \*********************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

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
/**
 * How the video will be inserted in the DOM for Publishers and Subscribers. See [[PublisherProperties.insertMode]] and [[SubscriberProperties.insertMode]]
 */
var VideoInsertMode;
(function (VideoInsertMode) {
    /**
     * Video inserted after the target element (as next sibling)
     */
    VideoInsertMode["AFTER"] = "AFTER";
    /**
     * Video inserted as last child of the target element
     */
    VideoInsertMode["APPEND"] = "APPEND";
    /**
     * Video inserted before the target element (as previous sibling)
     */
    VideoInsertMode["BEFORE"] = "BEFORE";
    /**
     * Video inserted as first child of the target element
     */
    VideoInsertMode["PREPEND"] = "PREPEND";
    /**
     * Video replaces target element
     */
    VideoInsertMode["REPLACE"] = "REPLACE";
})(VideoInsertMode = exports.VideoInsertMode || (exports.VideoInsertMode = {}));
//# sourceMappingURL=VideoInsertMode.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/Events/ConnectionEvent.js":
/*!**********************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/Events/ConnectionEvent.js ***!
  \**********************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var Event_1 = __webpack_require__(/*! ./Event */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/Event.js");
/**
 * Defines the following events:
 * - `connectionCreated`: dispatched by [[Session]]
 * - `connectionDestroyed`: dispatched by [[Session]]
 */
var ConnectionEvent = /** @class */ (function (_super) {
    __extends(ConnectionEvent, _super);
    /**
     * @hidden
     */
    function ConnectionEvent(cancelable, target, type, connection, reason) {
        var _this = _super.call(this, cancelable, target, type) || this;
        _this.connection = connection;
        _this.reason = reason;
        return _this;
    }
    /**
     * @hidden
     */
    // tslint:disable-next-line:no-empty
    ConnectionEvent.prototype.callDefaultBehavior = function () { };
    return ConnectionEvent;
}(Event_1.Event));
exports.ConnectionEvent = ConnectionEvent;
//# sourceMappingURL=ConnectionEvent.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/Events/Event.js":
/*!************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/Events/Event.js ***!
  \************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

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
var Event = /** @class */ (function () {
    /**
     * @hidden
     */
    function Event(cancelable, target, type) {
        this.hasBeenPrevented = false;
        this.cancelable = cancelable;
        this.target = target;
        this.type = type;
    }
    /**
     * Whether the default beahivour of the event has been prevented or not. Call [[Event.preventDefault]] to prevent it
     */
    Event.prototype.isDefaultPrevented = function () {
        return this.hasBeenPrevented;
    };
    /**
     * Prevents the default behavior of the event. The following events have a default behavior:
     *
     * - `sessionDisconnected`: dispatched by [[Session]] object, automatically unsubscribes the leaving participant from every Subscriber object of the session (this includes closing the WebRTCPeer connection and disposing all MediaStreamTracks)
     * and also deletes any HTML video element associated to each Subscriber (only those created by OpenVidu Browser, either by passing a valid parameter as `targetElement` in method [[Session.subscribe]] or
     * by calling [[Subscriber.createVideoElement]]). For every video removed, each Subscriber object will also dispatch a `videoElementDestroyed` event.
     *
     * - `streamDestroyed`:
     *   - If dispatched by a [[Publisher]] (*you* have unpublished): automatically stops all media tracks and deletes any HTML video element associated to it (only those created by OpenVidu Browser, either by passing a valid parameter as `targetElement`
     * in method [[OpenVidu.initPublisher]] or by calling [[Publisher.createVideoElement]]). For every video removed, the Publisher object will also dispatch a `videoElementDestroyed` event.
     *   - If dispatched by [[Session]] (*other user* has unpublished): automatically unsubscribes the proper Subscriber object from the session (this includes closing the WebRTCPeer connection and disposing all MediaStreamTracks)
     * and also deletes any HTML video element associated to that Subscriber (only those created by OpenVidu Browser, either by passing a valid parameter as `targetElement` in method [[Session.subscribe]] or
     * by calling [[Subscriber.createVideoElement]]). For every video removed, the Subscriber object will also dispatch a `videoElementDestroyed` event.
     */
    Event.prototype.preventDefault = function () {
        // tslint:disable-next-line:no-empty
        this.callDefaultBehavior = function () { };
        this.hasBeenPrevented = true;
    };
    return Event;
}());
exports.Event = Event;
//# sourceMappingURL=Event.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/Events/PublisherSpeakingEvent.js":
/*!*****************************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/Events/PublisherSpeakingEvent.js ***!
  \*****************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var Event_1 = __webpack_require__(/*! ./Event */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/Event.js");
/**
 * Defines the following events:
 * - `publisherStartSpeaking`: dispatched by [[Session]]
 * - `publisherStopSpeaking`: dispatched by [[Session]]
 *
 * More information:
 * - This events will only be triggered for **remote streams that have audio tracks**
 * - Both events share the same lifecycle. That means that you can subscribe to only one of them if you want, but if you call `Session.off('publisherStopSpeaking')`,
 * keep in mind that this will also internally remove any 'publisherStartSpeaking' event
 * - You can further configure how the events are dispatched by setting property `publisherSpeakingEventsOptions` in the call of [[OpenVidu.setAdvancedConfiguration]]
 */
var PublisherSpeakingEvent = /** @class */ (function (_super) {
    __extends(PublisherSpeakingEvent, _super);
    /**
     * @hidden
     */
    function PublisherSpeakingEvent(target, type, connection, streamId) {
        var _this = _super.call(this, false, target, type) || this;
        _this.type = type;
        _this.connection = connection;
        _this.streamId = streamId;
        return _this;
    }
    /**
     * @hidden
     */
    // tslint:disable-next-line:no-empty
    PublisherSpeakingEvent.prototype.callDefaultBehavior = function () { };
    return PublisherSpeakingEvent;
}(Event_1.Event));
exports.PublisherSpeakingEvent = PublisherSpeakingEvent;
//# sourceMappingURL=PublisherSpeakingEvent.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/Events/RecordingEvent.js":
/*!*********************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/Events/RecordingEvent.js ***!
  \*********************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var Event_1 = __webpack_require__(/*! ./Event */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/Event.js");
/**
 * Defines the following events:
 * - `recordingStarted`: dispatched by [[Session]]
 * - `recordingStopped`: dispatched by [[Session]]
 */
var RecordingEvent = /** @class */ (function (_super) {
    __extends(RecordingEvent, _super);
    /**
     * @hidden
     */
    function RecordingEvent(target, type, id, name) {
        var _this = _super.call(this, false, target, type) || this;
        _this.id = id;
        if (name !== id) {
            _this.name = name;
        }
        return _this;
    }
    /**
     * @hidden
     */
    // tslint:disable-next-line:no-empty
    RecordingEvent.prototype.callDefaultBehavior = function () { };
    return RecordingEvent;
}(Event_1.Event));
exports.RecordingEvent = RecordingEvent;
//# sourceMappingURL=RecordingEvent.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/Events/SessionDisconnectedEvent.js":
/*!*******************************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/Events/SessionDisconnectedEvent.js ***!
  \*******************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var Event_1 = __webpack_require__(/*! ./Event */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/Event.js");
/**
 * Defines event `sessionDisconnected` dispatched by [[Session]]
 */
var SessionDisconnectedEvent = /** @class */ (function (_super) {
    __extends(SessionDisconnectedEvent, _super);
    /**
     * @hidden
     */
    function SessionDisconnectedEvent(target, reason) {
        var _this = _super.call(this, true, target, 'sessionDisconnected') || this;
        _this.reason = reason;
        return _this;
    }
    /**
     * @hidden
     */
    SessionDisconnectedEvent.prototype.callDefaultBehavior = function () {
        console.info("Calling default behavior upon '" + this.type + "' event dispatched by 'Session'");
        var session = this.target;
        // Dispose and delete all remote Connections
        for (var connectionId in session.remoteConnections) {
            if (!!session.remoteConnections[connectionId].stream) {
                session.remoteConnections[connectionId].stream.disposeWebRtcPeer();
                session.remoteConnections[connectionId].stream.disposeMediaStream();
                if (session.remoteConnections[connectionId].stream.streamManager) {
                    session.remoteConnections[connectionId].stream.streamManager.removeAllVideos();
                }
                delete session.remoteStreamsCreated[session.remoteConnections[connectionId].stream.streamId];
                session.remoteConnections[connectionId].dispose();
            }
            delete session.remoteConnections[connectionId];
        }
    };
    return SessionDisconnectedEvent;
}(Event_1.Event));
exports.SessionDisconnectedEvent = SessionDisconnectedEvent;
//# sourceMappingURL=SessionDisconnectedEvent.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/Events/SignalEvent.js":
/*!******************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/Events/SignalEvent.js ***!
  \******************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var Event_1 = __webpack_require__(/*! ./Event */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/Event.js");
/**
 * Defines the following events:
 * - `signal`: dispatched by [[Session]]
 * - `signal:TYPE`: dispatched by [[Session]]
 */
var SignalEvent = /** @class */ (function (_super) {
    __extends(SignalEvent, _super);
    /**
     * @hidden
     */
    function SignalEvent(target, type, data, from) {
        var _this = _super.call(this, false, target, type) || this;
        _this.type = type;
        _this.data = data;
        _this.from = from;
        return _this;
    }
    /**
     * @hidden
     */
    // tslint:disable-next-line:no-empty
    SignalEvent.prototype.callDefaultBehavior = function () { };
    return SignalEvent;
}(Event_1.Event));
exports.SignalEvent = SignalEvent;
//# sourceMappingURL=SignalEvent.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/Events/StreamEvent.js":
/*!******************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/Events/StreamEvent.js ***!
  \******************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var Event_1 = __webpack_require__(/*! ./Event */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/Event.js");
var Publisher_1 = __webpack_require__(/*! ../../OpenVidu/Publisher */ "../../../../openvidu-browser/lib/OpenVidu/Publisher.js");
var Session_1 = __webpack_require__(/*! ../../OpenVidu/Session */ "../../../../openvidu-browser/lib/OpenVidu/Session.js");
/**
 * Defines the following events:
 * - `streamCreated`: dispatched by [[Session]] and [[Publisher]]
 * - `streamDestroyed`: dispatched by [[Session]] and [[Publisher]]
 */
var StreamEvent = /** @class */ (function (_super) {
    __extends(StreamEvent, _super);
    /**
     * @hidden
     */
    function StreamEvent(cancelable, target, type, stream, reason) {
        var _this = _super.call(this, cancelable, target, type) || this;
        _this.stream = stream;
        _this.reason = reason;
        return _this;
    }
    /**
     * @hidden
     */
    StreamEvent.prototype.callDefaultBehavior = function () {
        if (this.type === 'streamDestroyed') {
            if (this.target instanceof Session_1.Session) {
                // Remote Stream
                console.info("Calling default behavior upon '" + this.type + "' event dispatched by 'Session'");
                this.stream.disposeWebRtcPeer();
            }
            else if (this.target instanceof Publisher_1.Publisher) {
                // Local Stream
                console.info("Calling default behavior upon '" + this.type + "' event dispatched by 'Publisher'");
                clearInterval(this.target.screenShareResizeInterval);
                this.stream.isLocalStreamReadyToPublish = false;
                // Delete Publisher object from OpenVidu publishers array
                var openviduPublishers = this.target.openvidu.publishers;
                for (var i = 0; i < openviduPublishers.length; i++) {
                    if (openviduPublishers[i] === this.target) {
                        openviduPublishers.splice(i, 1);
                        break;
                    }
                }
            }
            // Dispose the MediaStream local object
            this.stream.disposeMediaStream();
            // Remove from DOM all video elements associated to this Stream, if there's a StreamManager defined
            // (method Session.subscribe must have been called)
            if (this.stream.streamManager)
                this.stream.streamManager.removeAllVideos();
            // Delete stream from Session.remoteStreamsCreated map
            delete this.stream.session.remoteStreamsCreated[this.stream.streamId];
            // Delete StreamOptionsServer from remote Connection
            var remoteConnection = this.stream.session.remoteConnections[this.stream.connection.connectionId];
            if (!!remoteConnection && !!remoteConnection.options) {
                var streamOptionsServer = remoteConnection.options.streams;
                for (var i = streamOptionsServer.length - 1; i >= 0; --i) {
                    if (streamOptionsServer[i].id === this.stream.streamId) {
                        streamOptionsServer.splice(i, 1);
                    }
                }
            }
        }
    };
    return StreamEvent;
}(Event_1.Event));
exports.StreamEvent = StreamEvent;
//# sourceMappingURL=StreamEvent.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/Events/StreamManagerEvent.js":
/*!*************************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/Events/StreamManagerEvent.js ***!
  \*************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var Event_1 = __webpack_require__(/*! ./Event */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/Event.js");
/**
 * Defines the following events:
 * - `streamPlaying`: dispatched by [[StreamManager]] ([[Publisher]] and [[Subscriber]])
 */
var StreamManagerEvent = /** @class */ (function (_super) {
    __extends(StreamManagerEvent, _super);
    /**
     * @hidden
     */
    function StreamManagerEvent(target) {
        return _super.call(this, false, target, 'streamPlaying') || this;
    }
    /**
     * @hidden
     */
    // tslint:disable-next-line:no-empty
    StreamManagerEvent.prototype.callDefaultBehavior = function () { };
    return StreamManagerEvent;
}(Event_1.Event));
exports.StreamManagerEvent = StreamManagerEvent;
//# sourceMappingURL=StreamManagerEvent.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/Events/StreamPropertyChangedEvent.js":
/*!*********************************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/Events/StreamPropertyChangedEvent.js ***!
  \*********************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var Event_1 = __webpack_require__(/*! ./Event */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/Event.js");
/**
 * Defines event `streamPropertyChanged` dispatched by [[Session]] as well as by [[StreamManager]] ([[Publisher]] and [[Subscriber]]).
 * This event is fired when any remote stream (owned by a Subscriber) or local stream (owned by a Publisher) undergoes
 * any change in any of its mutable properties (see [[changedProperty]]).
 */
var StreamPropertyChangedEvent = /** @class */ (function (_super) {
    __extends(StreamPropertyChangedEvent, _super);
    /**
     * @hidden
     */
    function StreamPropertyChangedEvent(target, stream, changedProperty, newValue, oldValue, reason) {
        var _this = _super.call(this, false, target, 'streamPropertyChanged') || this;
        _this.stream = stream;
        _this.changedProperty = changedProperty;
        _this.newValue = newValue;
        _this.oldValue = oldValue;
        _this.reason = reason;
        return _this;
    }
    /**
     * @hidden
     */
    // tslint:disable-next-line:no-empty
    StreamPropertyChangedEvent.prototype.callDefaultBehavior = function () { };
    return StreamPropertyChangedEvent;
}(Event_1.Event));
exports.StreamPropertyChangedEvent = StreamPropertyChangedEvent;
//# sourceMappingURL=StreamPropertyChangedEvent.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/Events/VideoElementEvent.js":
/*!************************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/Events/VideoElementEvent.js ***!
  \************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var Event_1 = __webpack_require__(/*! ./Event */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/Event.js");
/**
 * Defines the following events:
 * - `videoElementCreated`: dispatched by [[Publisher]] and [[Subscriber]] whenever a new HTML video element has been inserted into DOM by OpenVidu Browser library. See
 * [Manage video players](/docs/how-do-i/manage-videos) section.
 * - `videoElementDestroyed`: dispatched by [[Publisher]] and [[Subscriber]] whenever an HTML video element has been removed from DOM by OpenVidu Browser library.
 */
var VideoElementEvent = /** @class */ (function (_super) {
    __extends(VideoElementEvent, _super);
    /**
     * @hidden
     */
    function VideoElementEvent(element, target, type) {
        var _this = _super.call(this, false, target, type) || this;
        _this.element = element;
        return _this;
    }
    /**
     * @hidden
     */
    // tslint:disable-next-line:no-empty
    VideoElementEvent.prototype.callDefaultBehavior = function () { };
    return VideoElementEvent;
}(Event_1.Event));
exports.VideoElementEvent = VideoElementEvent;
//# sourceMappingURL=VideoElementEvent.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/Mapper.js":
/*!***********************************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/Mapper.js ***!
  \***********************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

function Mapper() {
    var sources = {};
    this.forEach = function (callback) {
        for (var key in sources) {
            var source = sources[key];
            for (var key2 in source)
                callback(source[key2]);
        }
        ;
    };
    this.get = function (id, source) {
        var ids = sources[source];
        if (ids == undefined)
            return undefined;
        return ids[id];
    };
    this.remove = function (id, source) {
        var ids = sources[source];
        if (ids == undefined)
            return;
        delete ids[id];
        for (var i in ids) {
            return false;
        }
        delete sources[source];
    };
    this.set = function (value, id, source) {
        if (value == undefined)
            return this.remove(id, source);
        var ids = sources[source];
        if (ids == undefined)
            sources[source] = ids = {};
        ids[id] = value;
    };
}
;
Mapper.prototype.pop = function (id, source) {
    var value = this.get(id, source);
    if (value == undefined)
        return undefined;
    this.remove(id, source);
    return value;
};
module.exports = Mapper;
//# sourceMappingURL=Mapper.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/clients/index.js":
/*!******************************************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/clients/index.js ***!
  \******************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var JsonRpcClient = __webpack_require__(/*! ./jsonrpcclient */ "../../../../openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/clients/jsonrpcclient.js");
exports.JsonRpcClient = JsonRpcClient;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/clients/jsonrpcclient.js":
/*!**************************************************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/clients/jsonrpcclient.js ***!
  \**************************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var RpcBuilder = __webpack_require__(/*! ../ */ "../../../../openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/index.js");
var WebSocketWithReconnection = __webpack_require__(/*! ./transports/webSocketWithReconnection */ "../../../../openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/clients/transports/webSocketWithReconnection.js");
Date.now = Date.now || function () {
    return +new Date;
};
var PING_INTERVAL = 5000;
var RECONNECTING = 'RECONNECTING';
var CONNECTED = 'CONNECTED';
var DISCONNECTED = 'DISCONNECTED';
var Logger = console;
function JsonRpcClient(configuration) {
    var self = this;
    var wsConfig = configuration.ws;
    var notReconnectIfNumLessThan = -1;
    var pingNextNum = 0;
    var enabledPings = true;
    var pingPongStarted = false;
    var pingInterval;
    var status = DISCONNECTED;
    var onreconnecting = wsConfig.onreconnecting;
    var onreconnected = wsConfig.onreconnected;
    var onconnected = wsConfig.onconnected;
    var onerror = wsConfig.onerror;
    configuration.rpc.pull = function (params, request) {
        request.reply(null, "push");
    };
    wsConfig.onreconnecting = function () {
        Logger.debug("--------- ONRECONNECTING -----------");
        if (status === RECONNECTING) {
            Logger.error("Websocket already in RECONNECTING state when receiving a new ONRECONNECTING message. Ignoring it");
            return;
        }
        status = RECONNECTING;
        if (onreconnecting) {
            onreconnecting();
        }
    };
    wsConfig.onreconnected = function () {
        Logger.debug("--------- ONRECONNECTED -----------");
        if (status === CONNECTED) {
            Logger.error("Websocket already in CONNECTED state when receiving a new ONRECONNECTED message. Ignoring it");
            return;
        }
        status = CONNECTED;
        enabledPings = true;
        updateNotReconnectIfLessThan();
        usePing();
        if (onreconnected) {
            onreconnected();
        }
    };
    wsConfig.onconnected = function () {
        Logger.debug("--------- ONCONNECTED -----------");
        if (status === CONNECTED) {
            Logger.error("Websocket already in CONNECTED state when receiving a new ONCONNECTED message. Ignoring it");
            return;
        }
        status = CONNECTED;
        enabledPings = true;
        usePing();
        if (onconnected) {
            onconnected();
        }
    };
    wsConfig.onerror = function (error) {
        Logger.debug("--------- ONERROR -----------");
        status = DISCONNECTED;
        if (onerror) {
            onerror(error);
        }
    };
    var ws = new WebSocketWithReconnection(wsConfig);
    Logger.debug('Connecting websocket to URI: ' + wsConfig.uri);
    var rpcBuilderOptions = {
        request_timeout: configuration.rpc.requestTimeout,
        ping_request_timeout: configuration.rpc.heartbeatRequestTimeout
    };
    var rpc = new RpcBuilder(RpcBuilder.packers.JsonRPC, rpcBuilderOptions, ws, function (request) {
        Logger.debug('Received request: ' + JSON.stringify(request));
        try {
            var func = configuration.rpc[request.method];
            if (func === undefined) {
                Logger.error("Method " + request.method + " not registered in client");
            }
            else {
                func(request.params, request);
            }
        }
        catch (err) {
            Logger.error('Exception processing request: ' + JSON.stringify(request));
            Logger.error(err);
        }
    });
    this.send = function (method, params, callback) {
        if (method !== 'ping') {
            Logger.debug('Request: method:' + method + " params:" + JSON.stringify(params));
        }
        var requestTime = Date.now();
        rpc.encode(method, params, function (error, result) {
            if (error) {
                try {
                    Logger.error("ERROR:" + error.message + " in Request: method:" +
                        method + " params:" + JSON.stringify(params) + " request:" +
                        error.request);
                    if (error.data) {
                        Logger.error("ERROR DATA:" + JSON.stringify(error.data));
                    }
                }
                catch (e) { }
                error.requestTime = requestTime;
            }
            if (callback) {
                if (result != undefined && result.value !== 'pong') {
                    Logger.debug('Response: ' + JSON.stringify(result));
                }
                callback(error, result);
            }
        });
    };
    function updateNotReconnectIfLessThan() {
        Logger.debug("notReconnectIfNumLessThan = " + pingNextNum + ' (old=' +
            notReconnectIfNumLessThan + ')');
        notReconnectIfNumLessThan = pingNextNum;
    }
    function sendPing() {
        if (enabledPings) {
            var params = null;
            if (pingNextNum == 0 || pingNextNum == notReconnectIfNumLessThan) {
                params = {
                    interval: configuration.heartbeat || PING_INTERVAL
                };
            }
            pingNextNum++;
            self.send('ping', params, (function (pingNum) {
                return function (error, result) {
                    if (error) {
                        Logger.debug("Error in ping request #" + pingNum + " (" +
                            error.message + ")");
                        if (pingNum > notReconnectIfNumLessThan) {
                            enabledPings = false;
                            updateNotReconnectIfLessThan();
                            Logger.debug("Server did not respond to ping message #" +
                                pingNum + ". Reconnecting... ");
                            ws.reconnectWs();
                        }
                    }
                };
            })(pingNextNum));
        }
        else {
            Logger.debug("Trying to send ping, but ping is not enabled");
        }
    }
    function usePing() {
        if (!pingPongStarted) {
            Logger.debug("Starting ping (if configured)");
            pingPongStarted = true;
            if (configuration.heartbeat != undefined) {
                pingInterval = setInterval(sendPing, configuration.heartbeat);
                sendPing();
            }
        }
    }
    this.close = function () {
        Logger.debug("Closing jsonRpcClient explicitly by client");
        if (pingInterval != undefined) {
            Logger.debug("Clearing ping interval");
            clearInterval(pingInterval);
        }
        pingPongStarted = false;
        enabledPings = false;
        if (configuration.sendCloseMessage) {
            Logger.debug("Sending close message");
            this.send('closeSession', null, function (error, result) {
                if (error) {
                    Logger.error("Error sending close message: " + JSON.stringify(error));
                }
                ws.close();
            });
        }
        else {
            ws.close();
        }
    };
    this.forceClose = function (millis) {
        ws.forceClose(millis);
    };
    this.reconnect = function () {
        ws.reconnectWs();
    };
}
module.exports = JsonRpcClient;
//# sourceMappingURL=jsonrpcclient.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/clients/transports/index.js":
/*!*****************************************************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/clients/transports/index.js ***!
  \*****************************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var WebSocketWithReconnection = __webpack_require__(/*! ./webSocketWithReconnection */ "../../../../openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/clients/transports/webSocketWithReconnection.js");
exports.WebSocketWithReconnection = WebSocketWithReconnection;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/clients/transports/webSocketWithReconnection.js":
/*!*************************************************************************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/clients/transports/webSocketWithReconnection.js ***!
  \*************************************************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var BrowserWebSocket = global.WebSocket || global.MozWebSocket;
var Logger = console;
var MAX_RETRIES = 2000;
var RETRY_TIME_MS = 3000;
var CONNECTING = 0;
var OPEN = 1;
var CLOSING = 2;
var CLOSED = 3;
function WebSocketWithReconnection(config) {
    var closing = false;
    var registerMessageHandler;
    var wsUri = config.uri;
    var useSockJS = config.useSockJS;
    var reconnecting = false;
    var forcingDisconnection = false;
    var ws;
    if (useSockJS) {
        ws = new SockJS(wsUri);
    }
    else {
        ws = new WebSocket(wsUri);
    }
    ws.onopen = function () {
        logConnected(ws, wsUri);
        if (config.onconnected) {
            config.onconnected();
        }
    };
    ws.onerror = function (error) {
        Logger.error("Could not connect to " + wsUri + " (invoking onerror if defined)", error);
        if (config.onerror) {
            config.onerror(error);
        }
    };
    function logConnected(ws, wsUri) {
        try {
            Logger.debug("WebSocket connected to " + wsUri);
        }
        catch (e) {
            Logger.error(e);
        }
    }
    var reconnectionOnClose = function () {
        if (ws.readyState === CLOSED) {
            if (closing) {
                Logger.debug("Connection closed by user");
            }
            else {
                Logger.debug("Connection closed unexpectecly. Reconnecting...");
                reconnectToSameUri(MAX_RETRIES, 1);
            }
        }
        else {
            Logger.debug("Close callback from previous websocket. Ignoring it");
        }
    };
    ws.onclose = reconnectionOnClose;
    function reconnectToSameUri(maxRetries, numRetries) {
        Logger.debug("reconnectToSameUri (attempt #" + numRetries + ", max=" + maxRetries + ")");
        if (numRetries === 1) {
            if (reconnecting) {
                Logger.warn("Trying to reconnectToNewUri when reconnecting... Ignoring this reconnection.");
                return;
            }
            else {
                reconnecting = true;
            }
            if (config.onreconnecting) {
                config.onreconnecting();
            }
        }
        if (forcingDisconnection) {
            reconnectToNewUri(maxRetries, numRetries, wsUri);
        }
        else {
            if (config.newWsUriOnReconnection) {
                config.newWsUriOnReconnection(function (error, newWsUri) {
                    if (error) {
                        Logger.debug(error);
                        setTimeout(function () {
                            reconnectToSameUri(maxRetries, numRetries + 1);
                        }, RETRY_TIME_MS);
                    }
                    else {
                        reconnectToNewUri(maxRetries, numRetries, newWsUri);
                    }
                });
            }
            else {
                reconnectToNewUri(maxRetries, numRetries, wsUri);
            }
        }
    }
    function reconnectToNewUri(maxRetries, numRetries, reconnectWsUri) {
        Logger.debug("Reconnection attempt #" + numRetries);
        ws.close();
        wsUri = reconnectWsUri || wsUri;
        var newWs;
        if (useSockJS) {
            newWs = new SockJS(wsUri);
        }
        else {
            newWs = new WebSocket(wsUri);
        }
        newWs.onopen = function () {
            Logger.debug("Reconnected after " + numRetries + " attempts...");
            logConnected(newWs, wsUri);
            reconnecting = false;
            registerMessageHandler();
            if (config.onreconnected()) {
                config.onreconnected();
            }
            newWs.onclose = reconnectionOnClose;
        };
        var onErrorOrClose = function (error) {
            Logger.warn("Reconnection error: ", error);
            if (numRetries === maxRetries) {
                if (config.ondisconnect) {
                    config.ondisconnect();
                }
            }
            else {
                setTimeout(function () {
                    reconnectToSameUri(maxRetries, numRetries + 1);
                }, RETRY_TIME_MS);
            }
        };
        newWs.onerror = onErrorOrClose;
        ws = newWs;
    }
    this.close = function () {
        closing = true;
        ws.close();
    };
    this.forceClose = function (millis) {
        Logger.debug("Testing: Force WebSocket close");
        if (millis) {
            Logger.debug("Testing: Change wsUri for " + millis + " millis to simulate net failure");
            var goodWsUri = wsUri;
            wsUri = "wss://21.234.12.34.4:443/";
            forcingDisconnection = true;
            setTimeout(function () {
                Logger.debug("Testing: Recover good wsUri " + goodWsUri);
                wsUri = goodWsUri;
                forcingDisconnection = false;
            }, millis);
        }
        ws.close();
    };
    this.reconnectWs = function () {
        Logger.debug("reconnectWs");
        reconnectToSameUri(MAX_RETRIES, 1, wsUri);
    };
    this.send = function (message) {
        ws.send(message);
    };
    this.addEventListener = function (type, callback) {
        registerMessageHandler = function () {
            ws.addEventListener(type, callback);
        };
        registerMessageHandler();
    };
}
module.exports = WebSocketWithReconnection;
//# sourceMappingURL=webSocketWithReconnection.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/index.js":
/*!**********************************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/index.js ***!
  \**********************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var defineProperty_IE8 = false;
if (Object.defineProperty) {
    try {
        Object.defineProperty({}, "x", {});
    }
    catch (e) {
        defineProperty_IE8 = true;
    }
}
if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
        if (typeof this !== 'function') {
            throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
        }
        var aArgs = Array.prototype.slice.call(arguments, 1), fToBind = this, fNOP = function () { }, fBound = function () {
            return fToBind.apply(this instanceof fNOP && oThis
                ? this
                : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
        };
        fNOP.prototype = this.prototype;
        fBound.prototype = new fNOP();
        return fBound;
    };
}
var EventEmitter = __webpack_require__(/*! events */ "../../../../openvidu-browser/node_modules/events/events.js").EventEmitter;
var inherits = __webpack_require__(/*! inherits */ "../../../../openvidu-browser/node_modules/inherits/inherits_browser.js");
var packers = __webpack_require__(/*! ./packers */ "../../../../openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/packers/index.js");
var Mapper = __webpack_require__(/*! ./Mapper */ "../../../../openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/Mapper.js");
var BASE_TIMEOUT = 5000;
function unifyResponseMethods(responseMethods) {
    if (!responseMethods)
        return {};
    for (var key in responseMethods) {
        var value = responseMethods[key];
        if (typeof value == 'string')
            responseMethods[key] =
                {
                    response: value
                };
    }
    ;
    return responseMethods;
}
;
function unifyTransport(transport) {
    if (!transport)
        return;
    if (transport instanceof Function)
        return { send: transport };
    if (transport.send instanceof Function)
        return transport;
    if (transport.postMessage instanceof Function) {
        transport.send = transport.postMessage;
        return transport;
    }
    if (transport.write instanceof Function) {
        transport.send = transport.write;
        return transport;
    }
    if (transport.onmessage !== undefined)
        return;
    if (transport.pause instanceof Function)
        return;
    throw new SyntaxError("Transport is not a function nor a valid object");
}
;
function RpcNotification(method, params) {
    if (defineProperty_IE8) {
        this.method = method;
        this.params = params;
    }
    else {
        Object.defineProperty(this, 'method', { value: method, enumerable: true });
        Object.defineProperty(this, 'params', { value: params, enumerable: true });
    }
}
;
function RpcBuilder(packer, options, transport, onRequest) {
    var self = this;
    if (!packer)
        throw new SyntaxError('Packer is not defined');
    if (!packer.pack || !packer.unpack)
        throw new SyntaxError('Packer is invalid');
    var responseMethods = unifyResponseMethods(packer.responseMethods);
    if (options instanceof Function) {
        if (transport != undefined)
            throw new SyntaxError("There can't be parameters after onRequest");
        onRequest = options;
        transport = undefined;
        options = undefined;
    }
    ;
    if (options && options.send instanceof Function) {
        if (transport && !(transport instanceof Function))
            throw new SyntaxError("Only a function can be after transport");
        onRequest = transport;
        transport = options;
        options = undefined;
    }
    ;
    if (transport instanceof Function) {
        if (onRequest != undefined)
            throw new SyntaxError("There can't be parameters after onRequest");
        onRequest = transport;
        transport = undefined;
    }
    ;
    if (transport && transport.send instanceof Function)
        if (onRequest && !(onRequest instanceof Function))
            throw new SyntaxError("Only a function can be after transport");
    options = options || {};
    EventEmitter.call(this);
    if (onRequest)
        this.on('request', onRequest);
    if (defineProperty_IE8)
        this.peerID = options.peerID;
    else
        Object.defineProperty(this, 'peerID', { value: options.peerID });
    var max_retries = options.max_retries || 0;
    function transportMessage(event) {
        self.decode(event.data || event);
    }
    ;
    this.getTransport = function () {
        return transport;
    };
    this.setTransport = function (value) {
        if (transport) {
            if (transport.removeEventListener)
                transport.removeEventListener('message', transportMessage);
            else if (transport.removeListener)
                transport.removeListener('data', transportMessage);
        }
        ;
        if (value) {
            if (value.addEventListener)
                value.addEventListener('message', transportMessage);
            else if (value.addListener)
                value.addListener('data', transportMessage);
        }
        ;
        transport = unifyTransport(value);
    };
    if (!defineProperty_IE8)
        Object.defineProperty(this, 'transport', {
            get: this.getTransport.bind(this),
            set: this.setTransport.bind(this)
        });
    this.setTransport(transport);
    var request_timeout = options.request_timeout || BASE_TIMEOUT;
    var ping_request_timeout = options.ping_request_timeout || request_timeout;
    var response_timeout = options.response_timeout || BASE_TIMEOUT;
    var duplicates_timeout = options.duplicates_timeout || BASE_TIMEOUT;
    var requestID = 0;
    var requests = new Mapper();
    var responses = new Mapper();
    var processedResponses = new Mapper();
    var message2Key = {};
    function storeResponse(message, id, dest) {
        var response = {
            message: message,
            timeout: setTimeout(function () {
                responses.remove(id, dest);
            }, response_timeout)
        };
        responses.set(response, id, dest);
    }
    ;
    function storeProcessedResponse(ack, from) {
        var timeout = setTimeout(function () {
            processedResponses.remove(ack, from);
        }, duplicates_timeout);
        processedResponses.set(timeout, ack, from);
    }
    ;
    function RpcRequest(method, params, id, from, transport) {
        RpcNotification.call(this, method, params);
        this.getTransport = function () {
            return transport;
        };
        this.setTransport = function (value) {
            transport = unifyTransport(value);
        };
        if (!defineProperty_IE8)
            Object.defineProperty(this, 'transport', {
                get: this.getTransport.bind(this),
                set: this.setTransport.bind(this)
            });
        var response = responses.get(id, from);
        if (!(transport || self.getTransport())) {
            if (defineProperty_IE8)
                this.duplicated = Boolean(response);
            else
                Object.defineProperty(this, 'duplicated', {
                    value: Boolean(response)
                });
        }
        var responseMethod = responseMethods[method];
        this.pack = packer.pack.bind(packer, this, id);
        this.reply = function (error, result, transport) {
            if (error instanceof Function || error && error.send instanceof Function) {
                if (result != undefined)
                    throw new SyntaxError("There can't be parameters after callback");
                transport = error;
                result = null;
                error = undefined;
            }
            else if (result instanceof Function
                || result && result.send instanceof Function) {
                if (transport != undefined)
                    throw new SyntaxError("There can't be parameters after callback");
                transport = result;
                result = null;
            }
            ;
            transport = unifyTransport(transport);
            if (response)
                clearTimeout(response.timeout);
            if (from != undefined) {
                if (error)
                    error.dest = from;
                if (result)
                    result.dest = from;
            }
            ;
            var message;
            if (error || result != undefined) {
                if (self.peerID != undefined) {
                    if (error)
                        error.from = self.peerID;
                    else
                        result.from = self.peerID;
                }
                if (responseMethod) {
                    if (responseMethod.error == undefined && error)
                        message =
                            {
                                error: error
                            };
                    else {
                        var method = error
                            ? responseMethod.error
                            : responseMethod.response;
                        message =
                            {
                                method: method,
                                params: error || result
                            };
                    }
                }
                else
                    message =
                        {
                            error: error,
                            result: result
                        };
                message = packer.pack(message, id);
            }
            else if (response)
                message = response.message;
            else
                message = packer.pack({ result: null }, id);
            storeResponse(message, id, from);
            transport = transport || this.getTransport() || self.getTransport();
            if (transport)
                return transport.send(message);
            return message;
        };
    }
    ;
    inherits(RpcRequest, RpcNotification);
    function cancel(message) {
        var key = message2Key[message];
        if (!key)
            return;
        delete message2Key[message];
        var request = requests.pop(key.id, key.dest);
        if (!request)
            return;
        clearTimeout(request.timeout);
        storeProcessedResponse(key.id, key.dest);
    }
    ;
    this.cancel = function (message) {
        if (message)
            return cancel(message);
        for (var message in message2Key)
            cancel(message);
    };
    this.close = function () {
        var transport = this.getTransport();
        if (transport && transport.close)
            transport.close();
        this.cancel();
        processedResponses.forEach(clearTimeout);
        responses.forEach(function (response) {
            clearTimeout(response.timeout);
        });
    };
    this.encode = function (method, params, dest, transport, callback) {
        if (params instanceof Function) {
            if (dest != undefined)
                throw new SyntaxError("There can't be parameters after callback");
            callback = params;
            transport = undefined;
            dest = undefined;
            params = undefined;
        }
        else if (dest instanceof Function) {
            if (transport != undefined)
                throw new SyntaxError("There can't be parameters after callback");
            callback = dest;
            transport = undefined;
            dest = undefined;
        }
        else if (transport instanceof Function) {
            if (callback != undefined)
                throw new SyntaxError("There can't be parameters after callback");
            callback = transport;
            transport = undefined;
        }
        ;
        if (self.peerID != undefined) {
            params = params || {};
            params.from = self.peerID;
        }
        ;
        if (dest != undefined) {
            params = params || {};
            params.dest = dest;
        }
        ;
        var message = {
            method: method,
            params: params
        };
        if (callback) {
            var id = requestID++;
            var retried = 0;
            message = packer.pack(message, id);
            function dispatchCallback(error, result) {
                self.cancel(message);
                callback(error, result);
            }
            ;
            var request = {
                message: message,
                callback: dispatchCallback,
                responseMethods: responseMethods[method] || {}
            };
            var encode_transport = unifyTransport(transport);
            function sendRequest(transport) {
                var rt = (method === 'ping' ? ping_request_timeout : request_timeout);
                request.timeout = setTimeout(timeout, rt * Math.pow(2, retried++));
                message2Key[message] = { id: id, dest: dest };
                requests.set(request, id, dest);
                transport = transport || encode_transport || self.getTransport();
                if (transport)
                    return transport.send(message);
                return message;
            }
            ;
            function retry(transport) {
                transport = unifyTransport(transport);
                console.warn(retried + ' retry for request message:', message);
                var timeout = processedResponses.pop(id, dest);
                clearTimeout(timeout);
                return sendRequest(transport);
            }
            ;
            function timeout() {
                if (retried < max_retries)
                    return retry(transport);
                var error = new Error('Request has timed out');
                error.request = message;
                error.retry = retry;
                dispatchCallback(error);
            }
            ;
            return sendRequest(transport);
        }
        ;
        message = packer.pack(message);
        transport = transport || this.getTransport();
        if (transport)
            return transport.send(message);
        return message;
    };
    this.decode = function (message, transport) {
        if (!message)
            throw new TypeError("Message is not defined");
        try {
            message = packer.unpack(message);
        }
        catch (e) {
            return console.debug(e, message);
        }
        ;
        var id = message.id;
        var ack = message.ack;
        var method = message.method;
        var params = message.params || {};
        var from = params.from;
        var dest = params.dest;
        if (self.peerID != undefined && from == self.peerID)
            return;
        if (id == undefined && ack == undefined) {
            var notification = new RpcNotification(method, params);
            if (self.emit('request', notification))
                return;
            return notification;
        }
        ;
        function processRequest() {
            transport = unifyTransport(transport) || self.getTransport();
            if (transport) {
                var response = responses.get(id, from);
                if (response)
                    return transport.send(response.message);
            }
            ;
            var idAck = (id != undefined) ? id : ack;
            var request = new RpcRequest(method, params, idAck, from, transport);
            if (self.emit('request', request))
                return;
            return request;
        }
        ;
        function processResponse(request, error, result) {
            request.callback(error, result);
        }
        ;
        function duplicatedResponse(timeout) {
            console.warn("Response already processed", message);
            clearTimeout(timeout);
            storeProcessedResponse(ack, from);
        }
        ;
        if (method) {
            if (dest == undefined || dest == self.peerID) {
                var request = requests.get(ack, from);
                if (request) {
                    var responseMethods = request.responseMethods;
                    if (method == responseMethods.error)
                        return processResponse(request, params);
                    if (method == responseMethods.response)
                        return processResponse(request, null, params);
                    return processRequest();
                }
                var processed = processedResponses.get(ack, from);
                if (processed)
                    return duplicatedResponse(processed);
            }
            return processRequest();
        }
        ;
        var error = message.error;
        var result = message.result;
        if (error && error.dest && error.dest != self.peerID)
            return;
        if (result && result.dest && result.dest != self.peerID)
            return;
        var request = requests.get(ack, from);
        if (!request) {
            var processed = processedResponses.get(ack, from);
            if (processed)
                return duplicatedResponse(processed);
            return console.warn("No callback was defined for this message", message);
        }
        ;
        processResponse(request, error, result);
    };
}
;
inherits(RpcBuilder, EventEmitter);
RpcBuilder.RpcNotification = RpcNotification;
module.exports = RpcBuilder;
var clients = __webpack_require__(/*! ./clients */ "../../../../openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/clients/index.js");
var transports = __webpack_require__(/*! ./clients/transports */ "../../../../openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/clients/transports/index.js");
RpcBuilder.clients = clients;
RpcBuilder.clients.transports = transports;
RpcBuilder.packers = packers;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/packers/JsonRPC.js":
/*!********************************************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/packers/JsonRPC.js ***!
  \********************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

function pack(message, id) {
    var result = {
        jsonrpc: "2.0"
    };
    if (message.method) {
        result.method = message.method;
        if (message.params)
            result.params = message.params;
        if (id != undefined)
            result.id = id;
    }
    else if (id != undefined) {
        if (message.error) {
            if (message.result !== undefined)
                throw new TypeError("Both result and error are defined");
            result.error = message.error;
        }
        else if (message.result !== undefined)
            result.result = message.result;
        else
            throw new TypeError("No result or error is defined");
        result.id = id;
    }
    ;
    return JSON.stringify(result);
}
;
function unpack(message) {
    var result = message;
    if (typeof message === 'string' || message instanceof String) {
        result = JSON.parse(message);
    }
    var version = result.jsonrpc;
    if (version !== '2.0')
        throw new TypeError("Invalid JsonRPC version '" + version + "': " + message);
    if (result.method == undefined) {
        if (result.id == undefined)
            throw new TypeError("Invalid message: " + message);
        var result_defined = result.result !== undefined;
        var error_defined = result.error !== undefined;
        if (result_defined && error_defined)
            throw new TypeError("Both result and error are defined: " + message);
        if (!result_defined && !error_defined)
            throw new TypeError("No result or error is defined: " + message);
        result.ack = result.id;
        delete result.id;
    }
    return result;
}
;
exports.pack = pack;
exports.unpack = unpack;
//# sourceMappingURL=JsonRPC.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/packers/XmlRPC.js":
/*!*******************************************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/packers/XmlRPC.js ***!
  \*******************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

function pack(message) {
    throw new TypeError("Not yet implemented");
}
;
function unpack(message) {
    throw new TypeError("Not yet implemented");
}
;
exports.pack = pack;
exports.unpack = unpack;
//# sourceMappingURL=XmlRPC.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/packers/index.js":
/*!******************************************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/packers/index.js ***!
  \******************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var JsonRPC = __webpack_require__(/*! ./JsonRPC */ "../../../../openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/packers/JsonRPC.js");
var XmlRPC = __webpack_require__(/*! ./XmlRPC */ "../../../../openvidu-browser/lib/OpenViduInternal/KurentoUtils/kurento-jsonrpc/packers/XmlRPC.js");
exports.JsonRPC = JsonRPC;
exports.XmlRPC = XmlRPC;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/ScreenSharing/Screen-Capturing-Auto.js":
/*!***********************************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/ScreenSharing/Screen-Capturing-Auto.js ***!
  \***********************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

window.getScreenId = function (callback, custom_parameter) {
    if (navigator.userAgent.indexOf('Edge') !== -1 && (!!navigator.msSaveOrOpenBlob || !!navigator.msSaveBlob)) {
        callback({
            video: true
        });
        return;
    }
    if (!!navigator.mozGetUserMedia) {
        callback(null, 'firefox', {
            video: {
                mozMediaSource: 'window',
                mediaSource: 'window'
            }
        });
        return;
    }
    window.addEventListener('message', onIFrameCallback);
    function onIFrameCallback(event) {
        if (!event.data)
            return;
        if (event.data.chromeMediaSourceId) {
            if (event.data.chromeMediaSourceId === 'PermissionDeniedError') {
                callback('permission-denied');
            }
            else {
                callback(null, event.data.chromeMediaSourceId, getScreenConstraints(null, event.data.chromeMediaSourceId, event.data.canRequestAudioTrack));
            }
            window.removeEventListener('message', onIFrameCallback);
        }
        if (event.data.chromeExtensionStatus) {
            callback(event.data.chromeExtensionStatus, null, getScreenConstraints(event.data.chromeExtensionStatus));
            window.removeEventListener('message', onIFrameCallback);
        }
    }
    if (!custom_parameter) {
        setTimeout(postGetSourceIdMessage, 100);
    }
    else {
        setTimeout(function () {
            postGetSourceIdMessage(custom_parameter);
        }, 100);
    }
};
function getScreenConstraints(error, sourceId, canRequestAudioTrack) {
    var screen_constraints = {
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: error ? 'screen' : 'desktop',
                maxWidth: window.screen.width > 1920 ? window.screen.width : 1920,
                maxHeight: window.screen.height > 1080 ? window.screen.height : 1080
            },
            optional: []
        }
    };
    if (!!canRequestAudioTrack) {
        screen_constraints.audio = {
            mandatory: {
                chromeMediaSource: error ? 'screen' : 'desktop',
            },
            optional: []
        };
    }
    if (sourceId) {
        screen_constraints.video.mandatory.chromeMediaSourceId = sourceId;
        if (screen_constraints.audio && screen_constraints.audio.mandatory) {
            screen_constraints.audio.mandatory.chromeMediaSourceId = sourceId;
        }
    }
    return screen_constraints;
}
function postGetSourceIdMessage(custom_parameter) {
    if (!iframe) {
        loadIFrame(function () {
            postGetSourceIdMessage(custom_parameter);
        });
        return;
    }
    if (!iframe.isLoaded) {
        setTimeout(function () {
            postGetSourceIdMessage(custom_parameter);
        }, 100);
        return;
    }
    if (!custom_parameter) {
        iframe.contentWindow.postMessage({
            captureSourceId: true
        }, '*');
    }
    else if (!!custom_parameter.forEach) {
        iframe.contentWindow.postMessage({
            captureCustomSourceId: custom_parameter
        }, '*');
    }
    else {
        iframe.contentWindow.postMessage({
            captureSourceIdWithAudio: true
        }, '*');
    }
}
var iframe;
window.getScreenConstraints = function (callback) {
    loadIFrame(function () {
        getScreenId(function (error, sourceId, screen_constraints) {
            if (!screen_constraints) {
                screen_constraints = {
                    video: true
                };
            }
            callback(error, screen_constraints.video);
        });
    });
};
function loadIFrame(loadCallback) {
    if (iframe) {
        loadCallback();
        return;
    }
    iframe = document.createElement('iframe');
    iframe.onload = function () {
        iframe.isLoaded = true;
        loadCallback();
    };
    iframe.src = 'https://openvidu.github.io/openvidu-screen-sharing-chrome-extension/';
    iframe.style.display = 'none';
    (document.body || document.documentElement).appendChild(iframe);
}
window.getChromeExtensionStatus = function (callback) {
    if (!!navigator.mozGetUserMedia) {
        callback('installed-enabled');
        return;
    }
    window.addEventListener('message', onIFrameCallback);
    function onIFrameCallback(event) {
        if (!event.data)
            return;
        if (event.data.chromeExtensionStatus) {
            callback(event.data.chromeExtensionStatus);
            window.removeEventListener('message', onIFrameCallback);
        }
    }
    setTimeout(postGetChromeExtensionStatusMessage, 100);
};
function postGetChromeExtensionStatusMessage() {
    if (!iframe) {
        loadIFrame(postGetChromeExtensionStatusMessage);
        return;
    }
    if (!iframe.isLoaded) {
        setTimeout(postGetChromeExtensionStatusMessage, 100);
        return;
    }
    iframe.contentWindow.postMessage({
        getChromeExtensionStatus: true
    }, '*');
}
exports.getScreenId = getScreenId;
//# sourceMappingURL=Screen-Capturing-Auto.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/ScreenSharing/Screen-Capturing.js":
/*!******************************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/ScreenSharing/Screen-Capturing.js ***!
  \******************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

var chromeMediaSource = 'screen';
var sourceId;
var screenCallback;
var isFirefox = typeof window.InstallTrigger !== 'undefined';
var isOpera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
var isChrome = !!window.chrome && !isOpera;
window.addEventListener('message', function (event) {
    if (event.origin != window.location.origin) {
        return;
    }
    onMessageCallback(event.data);
});
function onMessageCallback(data) {
    if (data == 'PermissionDeniedError') {
        if (screenCallback)
            return screenCallback('PermissionDeniedError');
        else
            throw new Error('PermissionDeniedError');
    }
    if (data == 'rtcmulticonnection-extension-loaded') {
        chromeMediaSource = 'desktop';
    }
    if (data.sourceId && screenCallback) {
        screenCallback(sourceId = data.sourceId, data.canRequestAudioTrack === true);
    }
}
function isChromeExtensionAvailable(callback) {
    if (!callback)
        return;
    if (chromeMediaSource == 'desktop')
        return callback(true);
    window.postMessage('are-you-there', '*');
    setTimeout(function () {
        if (chromeMediaSource == 'screen') {
            callback(false);
        }
        else
            callback(true);
    }, 2000);
}
function getSourceId(callback) {
    if (!callback)
        throw '"callback" parameter is mandatory.';
    if (sourceId)
        return callback(sourceId);
    screenCallback = callback;
    window.postMessage('get-sourceId', '*');
}
function getCustomSourceId(arr, callback) {
    if (!arr || !arr.forEach)
        throw '"arr" parameter is mandatory and it must be an array.';
    if (!callback)
        throw '"callback" parameter is mandatory.';
    if (sourceId)
        return callback(sourceId);
    screenCallback = callback;
    window.postMessage({
        'get-custom-sourceId': arr
    }, '*');
}
function getSourceIdWithAudio(callback) {
    if (!callback)
        throw '"callback" parameter is mandatory.';
    if (sourceId)
        return callback(sourceId);
    screenCallback = callback;
    window.postMessage('audio-plus-tab', '*');
}
function getChromeExtensionStatus(extensionid, callback) {
    if (isFirefox)
        return callback('not-chrome');
    if (arguments.length != 2) {
        callback = extensionid;
        extensionid = 'lfcgfepafnobdloecchnfaclibenjold';
    }
    var image = document.createElement('img');
    image.src = 'chrome-extension://' + extensionid + '/icon.png';
    image.onload = function () {
        chromeMediaSource = 'screen';
        window.postMessage('are-you-there', '*');
        setTimeout(function () {
            if (chromeMediaSource == 'screen') {
                callback('installed-disabled');
            }
            else
                callback('installed-enabled');
        }, 2000);
    };
    image.onerror = function () {
        callback('not-installed');
    };
}
function getScreenConstraintsWithAudio(callback) {
    getScreenConstraints(callback, true);
}
function getScreenConstraints(callback, captureSourceIdWithAudio) {
    sourceId = '';
    var firefoxScreenConstraints = {
        mozMediaSource: 'window',
        mediaSource: 'window'
    };
    if (isFirefox)
        return callback(null, firefoxScreenConstraints);
    var screen_constraints = {
        mandatory: {
            chromeMediaSource: chromeMediaSource,
            maxWidth: screen.width > 1920 ? screen.width : 1920,
            maxHeight: screen.height > 1080 ? screen.height : 1080
        },
        optional: []
    };
    if (chromeMediaSource == 'desktop' && !sourceId) {
        if (captureSourceIdWithAudio) {
            getSourceIdWithAudio(function (sourceId, canRequestAudioTrack) {
                screen_constraints.mandatory.chromeMediaSourceId = sourceId;
                if (canRequestAudioTrack) {
                    screen_constraints.canRequestAudioTrack = true;
                }
                callback(sourceId == 'PermissionDeniedError' ? sourceId : null, screen_constraints);
            });
        }
        else {
            getSourceId(function (sourceId) {
                screen_constraints.mandatory.chromeMediaSourceId = sourceId;
                callback(sourceId == 'PermissionDeniedError' ? sourceId : null, screen_constraints);
            });
        }
        return;
    }
    if (chromeMediaSource == 'desktop') {
        screen_constraints.mandatory.chromeMediaSourceId = sourceId;
    }
    callback(null, screen_constraints);
}
exports.getScreenConstraints = getScreenConstraints;
exports.getScreenConstraintsWithAudio = getScreenConstraintsWithAudio;
exports.isChromeExtensionAvailable = isChromeExtensionAvailable;
exports.getChromeExtensionStatus = getChromeExtensionStatus;
exports.getSourceId = getSourceId;
//# sourceMappingURL=Screen-Capturing.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/WebRtcPeer/WebRtcPeer.js":
/*!*********************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/WebRtcPeer/WebRtcPeer.js ***!
  \*********************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var freeice = __webpack_require__(/*! freeice */ "../../../../openvidu-browser/node_modules/freeice/index.js");
var uuid = __webpack_require__(/*! uuid */ "../../../../openvidu-browser/node_modules/uuid/index.js");
var platform = __webpack_require__(/*! platform */ "../../../../openvidu-browser/node_modules/platform/platform.js");
var WebRtcPeer = /** @class */ (function () {
    function WebRtcPeer(configuration) {
        var _this = this;
        this.configuration = configuration;
        this.remoteCandidatesQueue = [];
        this.localCandidatesQueue = [];
        this.iceCandidateList = [];
        this.candidategatheringdone = false;
        this.configuration.iceServers = (!!this.configuration.iceServers && this.configuration.iceServers.length > 0) ? this.configuration.iceServers : freeice();
        this.pc = new RTCPeerConnection({ iceServers: this.configuration.iceServers });
        this.id = !!configuration.id ? configuration.id : uuid.v4();
        this.pc.onicecandidate = function (event) {
            var candidate = event.candidate;
            if (candidate) {
                _this.localCandidatesQueue.push({ candidate: candidate.candidate });
                _this.candidategatheringdone = false;
                _this.configuration.onicecandidate(event.candidate);
            }
            else if (!_this.candidategatheringdone) {
                _this.candidategatheringdone = true;
            }
        };
        this.pc.onsignalingstatechange = function () {
            if (_this.pc.signalingState === 'stable') {
                while (_this.iceCandidateList.length > 0) {
                    _this.pc.addIceCandidate(_this.iceCandidateList.shift());
                }
            }
        };
        this.start();
    }
    /**
     * This function creates the RTCPeerConnection object taking into account the
     * properties received in the constructor. It starts the SDP negotiation
     * process: generates the SDP offer and invokes the onsdpoffer callback. This
     * callback is expected to send the SDP offer, in order to obtain an SDP
     * answer from another peer.
     */
    WebRtcPeer.prototype.start = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.pc.signalingState === 'closed') {
                reject('The peer connection object is in "closed" state. This is most likely due to an invocation of the dispose method before accepting in the dialogue');
            }
            if (!!_this.configuration.mediaStream) {
                _this.pc.addStream(_this.configuration.mediaStream);
            }
            // [Hack] https://code.google.com/p/chromium/issues/detail?id=443558
            if (_this.configuration.mode === 'sendonly' &&
                (platform.name === 'Chrome' && platform.version.toString().substring(0, 2) === '39')) {
                _this.configuration.mode = 'sendrecv';
            }
            resolve();
        });
    };
    /**
     * This method frees the resources used by WebRtcPeer
     */
    WebRtcPeer.prototype.dispose = function () {
        var _this = this;
        console.debug('Disposing WebRtcPeer');
        try {
            if (this.pc) {
                if (this.pc.signalingState === 'closed') {
                    return;
                }
                this.remoteCandidatesQueue = [];
                this.localCandidatesQueue = [];
                this.pc.getLocalStreams().forEach(function (str) {
                    _this.streamStop(str);
                });
                // FIXME This is not yet implemented in firefox
                // if(videoStream) pc.removeStream(videoStream);
                // if(audioStream) pc.removeStream(audioStream);
                this.pc.close();
            }
        }
        catch (err) {
            console.warn('Exception disposing webrtc peer ' + err);
        }
    };
    /**
     * 1) Function that creates an offer, sets it as local description and returns the offer param
     * to send to OpenVidu Server (will be the remote description of other peer)
     */
    WebRtcPeer.prototype.generateOffer = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var offerAudio, offerVideo = true;
            // Constraints must have both blocks
            if (!!_this.configuration.mediaConstraints) {
                offerAudio = (typeof _this.configuration.mediaConstraints.audio === 'boolean') ?
                    _this.configuration.mediaConstraints.audio : true;
                offerVideo = (typeof _this.configuration.mediaConstraints.video === 'boolean') ?
                    _this.configuration.mediaConstraints.video : true;
            }
            var constraints = {
                offerToReceiveAudio: +(_this.configuration.mode !== 'sendonly' && offerAudio),
                offerToReceiveVideo: +(_this.configuration.mode !== 'sendonly' && offerVideo)
            };
            console.debug('RTCPeerConnection constraints: ' + JSON.stringify(constraints));
            _this.pc.createOffer(constraints).then(function (offer) {
                console.debug('Created SDP offer');
                return _this.pc.setLocalDescription(offer);
            }).then(function () {
                var localDescription = _this.pc.localDescription;
                if (!!localDescription) {
                    console.debug('Local description set', localDescription.sdp);
                    resolve(localDescription.sdp);
                }
                else {
                    reject('Local description is not defined');
                }
            })["catch"](function (error) { return reject(error); });
        });
    };
    /**
     * 2) Function to invoke when a SDP offer is received. Sets it as remote description,
     * generates and answer and returns it to send it to OpenVidu Server
     */
    WebRtcPeer.prototype.processOffer = function (sdpOffer) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var offer = {
                type: 'offer',
                sdp: sdpOffer
            };
            console.debug('SDP offer received, setting remote description');
            if (_this.pc.signalingState === 'closed') {
                reject('PeerConnection is closed');
            }
            _this.pc.setRemoteDescription(offer)
                .then(function () {
                return _this.pc.createAnswer();
            }).then(function (answer) {
                console.debug('Created SDP answer');
                return _this.pc.setLocalDescription(answer);
            }).then(function () {
                var localDescription = _this.pc.localDescription;
                if (!!localDescription) {
                    console.debug('Local description set', localDescription.sdp);
                    resolve(localDescription.sdp);
                }
                else {
                    reject('Local description is not defined');
                }
            })["catch"](function (error) { return reject(error); });
        });
    };
    /**
     * 3) Function invoked when a SDP answer is received. Final step in SDP negotiation, the peer
     * just needs to set the answer as its remote description
     */
    WebRtcPeer.prototype.processAnswer = function (sdpAnswer) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var answer = {
                type: 'answer',
                sdp: sdpAnswer
            };
            console.debug('SDP answer received, setting remote description');
            if (_this.pc.signalingState === 'closed') {
                reject('RTCPeerConnection is closed');
            }
            _this.pc.setRemoteDescription(answer).then(function () { return resolve(); })["catch"](function (error) { return reject(error); });
        });
    };
    /**
     * Callback function invoked when an ICE candidate is received
     */
    WebRtcPeer.prototype.addIceCandidate = function (iceCandidate) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            console.debug('Remote ICE candidate received', iceCandidate);
            _this.remoteCandidatesQueue.push(iceCandidate);
            switch (_this.pc.signalingState) {
                case 'closed':
                    reject(new Error('PeerConnection object is closed'));
                    break;
                case 'stable':
                    if (!!_this.pc.remoteDescription) {
                        _this.pc.addIceCandidate(iceCandidate).then(function () { return resolve(); })["catch"](function (error) { return reject(error); });
                    }
                    break;
                default:
                    _this.iceCandidateList.push(iceCandidate);
                    resolve();
            }
        });
    };
    WebRtcPeer.prototype.streamStop = function (stream) {
        stream.getTracks().forEach(function (track) {
            track.stop();
            stream.removeTrack(track);
        });
    };
    return WebRtcPeer;
}());
exports.WebRtcPeer = WebRtcPeer;
var WebRtcPeerRecvonly = /** @class */ (function (_super) {
    __extends(WebRtcPeerRecvonly, _super);
    function WebRtcPeerRecvonly(configuration) {
        var _this = this;
        configuration.mode = 'recvonly';
        _this = _super.call(this, configuration) || this;
        return _this;
    }
    return WebRtcPeerRecvonly;
}(WebRtcPeer));
exports.WebRtcPeerRecvonly = WebRtcPeerRecvonly;
var WebRtcPeerSendonly = /** @class */ (function (_super) {
    __extends(WebRtcPeerSendonly, _super);
    function WebRtcPeerSendonly(configuration) {
        var _this = this;
        configuration.mode = 'sendonly';
        _this = _super.call(this, configuration) || this;
        return _this;
    }
    return WebRtcPeerSendonly;
}(WebRtcPeer));
exports.WebRtcPeerSendonly = WebRtcPeerSendonly;
var WebRtcPeerSendrecv = /** @class */ (function (_super) {
    __extends(WebRtcPeerSendrecv, _super);
    function WebRtcPeerSendrecv(configuration) {
        var _this = this;
        configuration.mode = 'sendrecv';
        _this = _super.call(this, configuration) || this;
        return _this;
    }
    return WebRtcPeerSendrecv;
}(WebRtcPeer));
exports.WebRtcPeerSendrecv = WebRtcPeerSendrecv;
//# sourceMappingURL=WebRtcPeer.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/WebRtcStats/WebRtcStats.js":
/*!***********************************************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/OpenViduInternal/WebRtcStats/WebRtcStats.js ***!
  \***********************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

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
var platform = __webpack_require__(/*! platform */ "../../../../openvidu-browser/node_modules/platform/platform.js");
var WebRtcStats = /** @class */ (function () {
    function WebRtcStats(stream) {
        this.stream = stream;
        this.webRtcStatsEnabled = false;
        this.statsInterval = 1;
        this.stats = {
            inbound: {
                audio: {
                    bytesReceived: 0,
                    packetsReceived: 0,
                    packetsLost: 0
                },
                video: {
                    bytesReceived: 0,
                    packetsReceived: 0,
                    packetsLost: 0,
                    framesDecoded: 0,
                    nackCount: 0
                }
            },
            outbound: {
                audio: {
                    bytesSent: 0,
                    packetsSent: 0
                },
                video: {
                    bytesSent: 0,
                    packetsSent: 0,
                    framesEncoded: 0,
                    nackCount: 0
                }
            }
        };
    }
    WebRtcStats.prototype.isEnabled = function () {
        return this.webRtcStatsEnabled;
    };
    WebRtcStats.prototype.initWebRtcStats = function () {
        var _this = this;
        var elastestInstrumentation = localStorage.getItem('elastest-instrumentation');
        if (elastestInstrumentation) {
            // ElasTest instrumentation object found in local storage
            console.warn('WebRtc stats enabled for stream ' + this.stream.streamId + ' of connection ' + this.stream.connection.connectionId);
            this.webRtcStatsEnabled = true;
            var instrumentation_1 = JSON.parse(elastestInstrumentation);
            this.statsInterval = instrumentation_1.webrtc.interval; // Interval in seconds
            console.warn('localStorage item: ' + JSON.stringify(instrumentation_1));
            this.webRtcStatsIntervalId = setInterval(function () {
                _this.sendStatsToHttpEndpoint(instrumentation_1);
            }, this.statsInterval * 1000);
            return;
        }
        console.debug('WebRtc stats not enabled');
    };
    WebRtcStats.prototype.stopWebRtcStats = function () {
        if (this.webRtcStatsEnabled) {
            clearInterval(this.webRtcStatsIntervalId);
            console.warn('WebRtc stats stopped for disposed stream ' + this.stream.streamId + ' of connection ' + this.stream.connection.connectionId);
        }
    };
    WebRtcStats.prototype.getSelectedIceCandidateInfo = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.getStatsAgnostic(_this.stream.getRTCPeerConnection(), function (stats) {
                if ((platform.name.indexOf('Chrome') !== -1) || (platform.name.indexOf('Opera') !== -1)) {
                    var localCandidateId = void 0, remoteCandidateId = void 0, googCandidatePair = void 0;
                    var localCandidates = {};
                    var remoteCandidates = {};
                    for (var key in stats) {
                        var stat = stats[key];
                        if (stat.type === 'localcandidate') {
                            localCandidates[stat.id] = stat;
                        }
                        else if (stat.type === 'remotecandidate') {
                            remoteCandidates[stat.id] = stat;
                        }
                        else if (stat.type === 'googCandidatePair' && (stat.googActiveConnection === 'true')) {
                            googCandidatePair = stat;
                            localCandidateId = stat.localCandidateId;
                            remoteCandidateId = stat.remoteCandidateId;
                        }
                    }
                    var finalLocalCandidate_1 = localCandidates[localCandidateId];
                    if (!!finalLocalCandidate_1) {
                        var candList = _this.stream.getLocalIceCandidateList();
                        var cand = candList.filter(function (c) {
                            return (!!c.candidate &&
                                c.candidate.indexOf(finalLocalCandidate_1.ipAddress) >= 0 &&
                                c.candidate.indexOf(finalLocalCandidate_1.portNumber) >= 0 &&
                                c.candidate.indexOf(finalLocalCandidate_1.priority) >= 0);
                        });
                        finalLocalCandidate_1.raw = !!cand[0] ? cand[0].candidate : 'ERROR: Cannot find local candidate in list of sent ICE candidates';
                    }
                    else {
                        finalLocalCandidate_1 = 'ERROR: No active local ICE candidate. Probably ICE-TCP is being used';
                    }
                    var finalRemoteCandidate_1 = remoteCandidates[remoteCandidateId];
                    if (!!finalRemoteCandidate_1) {
                        var candList = _this.stream.getRemoteIceCandidateList();
                        var cand = candList.filter(function (c) {
                            return (!!c.candidate &&
                                c.candidate.indexOf(finalRemoteCandidate_1.ipAddress) >= 0 &&
                                c.candidate.indexOf(finalRemoteCandidate_1.portNumber) >= 0 &&
                                c.candidate.indexOf(finalRemoteCandidate_1.priority) >= 0);
                        });
                        finalRemoteCandidate_1.raw = !!cand[0] ? cand[0].candidate : 'ERROR: Cannot find remote candidate in list of received ICE candidates';
                    }
                    else {
                        finalRemoteCandidate_1 = 'ERROR: No active remote ICE candidate. Probably ICE-TCP is being used';
                    }
                    resolve({
                        googCandidatePair: googCandidatePair,
                        localCandidate: finalLocalCandidate_1,
                        remoteCandidate: finalRemoteCandidate_1
                    });
                }
                else {
                    reject('Selected ICE candidate info only available for Chrome');
                }
            }, function (error) {
                reject(error);
            });
        });
    };
    WebRtcStats.prototype.sendStatsToHttpEndpoint = function (instrumentation) {
        var _this = this;
        var sendPost = function (json) {
            var http = new XMLHttpRequest();
            var url = instrumentation.webrtc.httpEndpoint;
            http.open('POST', url, true);
            http.setRequestHeader('Content-type', 'application/json');
            http.onreadystatechange = function () {
                if (http.readyState === 4 && http.status === 200) {
                    console.log('WebRtc stats successfully sent to ' + url + ' for stream ' + _this.stream.streamId + ' of connection ' + _this.stream.connection.connectionId);
                }
            };
            http.send(json);
        };
        var f = function (stats) {
            if (platform.name.indexOf('Firefox') !== -1) {
                stats.forEach(function (stat) {
                    var json = {};
                    if ((stat.type === 'inbound-rtp') &&
                        (
                        // Avoid firefox empty outbound-rtp statistics
                        stat.nackCount !== null &&
                            stat.isRemote === false &&
                            stat.id.startsWith('inbound') &&
                            stat.remoteId.startsWith('inbound'))) {
                        var metricId = 'webrtc_inbound_' + stat.mediaType + '_' + stat.ssrc;
                        var jit = stat.jitter * 1000;
                        var metrics = {
                            bytesReceived: (stat.bytesReceived - _this.stats.inbound[stat.mediaType].bytesReceived) / _this.statsInterval,
                            jitter: jit,
                            packetsReceived: (stat.packetsReceived - _this.stats.inbound[stat.mediaType].packetsReceived) / _this.statsInterval,
                            packetsLost: (stat.packetsLost - _this.stats.inbound[stat.mediaType].packetsLost) / _this.statsInterval
                        };
                        var units = {
                            bytesReceived: 'bytes',
                            jitter: 'ms',
                            packetsReceived: 'packets',
                            packetsLost: 'packets'
                        };
                        if (stat.mediaType === 'video') {
                            metrics['framesDecoded'] = (stat.framesDecoded - _this.stats.inbound.video.framesDecoded) / _this.statsInterval;
                            metrics['nackCount'] = (stat.nackCount - _this.stats.inbound.video.nackCount) / _this.statsInterval;
                            units['framesDecoded'] = 'frames';
                            units['nackCount'] = 'packets';
                            _this.stats.inbound.video.framesDecoded = stat.framesDecoded;
                            _this.stats.inbound.video.nackCount = stat.nackCount;
                        }
                        _this.stats.inbound[stat.mediaType].bytesReceived = stat.bytesReceived;
                        _this.stats.inbound[stat.mediaType].packetsReceived = stat.packetsReceived;
                        _this.stats.inbound[stat.mediaType].packetsLost = stat.packetsLost;
                        json = {
                            '@timestamp': new Date(stat.timestamp).toISOString(),
                            'exec': instrumentation.exec,
                            'component': instrumentation.component,
                            'stream': 'webRtc',
                            'type': metricId,
                            'stream_type': 'composed_metrics',
                            'units': units
                        };
                        json[metricId] = metrics;
                        sendPost(JSON.stringify(json));
                    }
                    else if ((stat.type === 'outbound-rtp') &&
                        (
                        // Avoid firefox empty inbound-rtp statistics
                        stat.isRemote === false &&
                            stat.id.toLowerCase().includes('outbound'))) {
                        var metricId = 'webrtc_outbound_' + stat.mediaType + '_' + stat.ssrc;
                        var metrics = {
                            bytesSent: (stat.bytesSent - _this.stats.outbound[stat.mediaType].bytesSent) / _this.statsInterval,
                            packetsSent: (stat.packetsSent - _this.stats.outbound[stat.mediaType].packetsSent) / _this.statsInterval
                        };
                        var units = {
                            bytesSent: 'bytes',
                            packetsSent: 'packets'
                        };
                        if (stat.mediaType === 'video') {
                            metrics['framesEncoded'] = (stat.framesEncoded - _this.stats.outbound.video.framesEncoded) / _this.statsInterval;
                            units['framesEncoded'] = 'frames';
                            _this.stats.outbound.video.framesEncoded = stat.framesEncoded;
                        }
                        _this.stats.outbound[stat.mediaType].bytesSent = stat.bytesSent;
                        _this.stats.outbound[stat.mediaType].packetsSent = stat.packetsSent;
                        json = {
                            '@timestamp': new Date(stat.timestamp).toISOString(),
                            'exec': instrumentation.exec,
                            'component': instrumentation.component,
                            'stream': 'webRtc',
                            'type': metricId,
                            'stream_type': 'composed_metrics',
                            'units': units
                        };
                        json[metricId] = metrics;
                        sendPost(JSON.stringify(json));
                    }
                });
            }
            else if ((platform.name.indexOf('Chrome') !== -1) || (platform.name.indexOf('Opera') !== -1)) {
                for (var _i = 0, _a = Object.keys(stats); _i < _a.length; _i++) {
                    var key = _a[_i];
                    var stat = stats[key];
                    if (stat.type === 'ssrc') {
                        var json = {};
                        if ('bytesReceived' in stat && ((stat.mediaType === 'audio' && 'audioOutputLevel' in stat) ||
                            (stat.mediaType === 'video' && 'qpSum' in stat))) {
                            // inbound-rtp
                            var metricId = 'webrtc_inbound_' + stat.mediaType + '_' + stat.ssrc;
                            var metrics = {
                                bytesReceived: (stat.bytesReceived - _this.stats.inbound[stat.mediaType].bytesReceived) / _this.statsInterval,
                                jitter: stat.googJitterBufferMs,
                                packetsReceived: (stat.packetsReceived - _this.stats.inbound[stat.mediaType].packetsReceived) / _this.statsInterval,
                                packetsLost: (stat.packetsLost - _this.stats.inbound[stat.mediaType].packetsLost) / _this.statsInterval
                            };
                            var units = {
                                bytesReceived: 'bytes',
                                jitter: 'ms',
                                packetsReceived: 'packets',
                                packetsLost: 'packets'
                            };
                            if (stat.mediaType === 'video') {
                                metrics['framesDecoded'] = (stat.framesDecoded - _this.stats.inbound.video.framesDecoded) / _this.statsInterval;
                                metrics['nackCount'] = (stat.googNacksSent - _this.stats.inbound.video.nackCount) / _this.statsInterval;
                                units['framesDecoded'] = 'frames';
                                units['nackCount'] = 'packets';
                                _this.stats.inbound.video.framesDecoded = stat.framesDecoded;
                                _this.stats.inbound.video.nackCount = stat.googNacksSent;
                            }
                            _this.stats.inbound[stat.mediaType].bytesReceived = stat.bytesReceived;
                            _this.stats.inbound[stat.mediaType].packetsReceived = stat.packetsReceived;
                            _this.stats.inbound[stat.mediaType].packetsLost = stat.packetsLost;
                            json = {
                                '@timestamp': new Date(stat.timestamp).toISOString(),
                                'exec': instrumentation.exec,
                                'component': instrumentation.component,
                                'stream': 'webRtc',
                                'type': metricId,
                                'stream_type': 'composed_metrics',
                                'units': units
                            };
                            json[metricId] = metrics;
                            sendPost(JSON.stringify(json));
                        }
                        else if ('bytesSent' in stat) {
                            // outbound-rtp
                            var metricId = 'webrtc_outbound_' + stat.mediaType + '_' + stat.ssrc;
                            var metrics = {
                                bytesSent: (stat.bytesSent - _this.stats.outbound[stat.mediaType].bytesSent) / _this.statsInterval,
                                packetsSent: (stat.packetsSent - _this.stats.outbound[stat.mediaType].packetsSent) / _this.statsInterval
                            };
                            var units = {
                                bytesSent: 'bytes',
                                packetsSent: 'packets'
                            };
                            if (stat.mediaType === 'video') {
                                metrics['framesEncoded'] = (stat.framesEncoded - _this.stats.outbound.video.framesEncoded) / _this.statsInterval;
                                units['framesEncoded'] = 'frames';
                                _this.stats.outbound.video.framesEncoded = stat.framesEncoded;
                            }
                            _this.stats.outbound[stat.mediaType].bytesSent = stat.bytesSent;
                            _this.stats.outbound[stat.mediaType].packetsSent = stat.packetsSent;
                            json = {
                                '@timestamp': new Date(stat.timestamp).toISOString(),
                                'exec': instrumentation.exec,
                                'component': instrumentation.component,
                                'stream': 'webRtc',
                                'type': metricId,
                                'stream_type': 'composed_metrics',
                                'units': units
                            };
                            json[metricId] = metrics;
                            sendPost(JSON.stringify(json));
                        }
                    }
                }
            }
        };
        this.getStatsAgnostic(this.stream.getRTCPeerConnection(), f, function (error) { console.log(error); });
    };
    WebRtcStats.prototype.standardizeReport = function (response) {
        console.log(response);
        var standardReport = {};
        if (platform.name.indexOf('Firefox') !== -1) {
            Object.keys(response).forEach(function (key) {
                console.log(response[key]);
            });
            return response;
        }
        response.result().forEach(function (report) {
            var standardStats = {
                id: report.id,
                timestamp: report.timestamp,
                type: report.type
            };
            report.names().forEach(function (name) {
                standardStats[name] = report.stat(name);
            });
            standardReport[standardStats.id] = standardStats;
        });
        return standardReport;
    };
    WebRtcStats.prototype.getStatsAgnostic = function (pc, successCb, failureCb) {
        var _this = this;
        if (platform.name.indexOf('Firefox') !== -1) {
            // getStats takes args in different order in Chrome and Firefox
            return pc.getStats(null).then(function (response) {
                var report = _this.standardizeReport(response);
                successCb(report);
            })["catch"](failureCb);
        }
        else if ((platform.name.indexOf('Chrome') !== -1) || (platform.name.indexOf('Opera') !== -1)) {
            // In Chrome, the first two arguments are reversed
            return pc.getStats(function (response) {
                var report = _this.standardizeReport(response);
                successCb(report);
            }, null, failureCb);
        }
    };
    return WebRtcStats;
}());
exports.WebRtcStats = WebRtcStats;
//# sourceMappingURL=WebRtcStats.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/index.js":
/*!************************************************************************!*\
  !*** /home/pablo/Documents/Git/openvidu/openvidu-browser/lib/index.js ***!
  \************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

exports.__esModule = true;
var OpenVidu_1 = __webpack_require__(/*! ./OpenVidu/OpenVidu */ "../../../../openvidu-browser/lib/OpenVidu/OpenVidu.js");
exports.OpenVidu = OpenVidu_1.OpenVidu;
var Session_1 = __webpack_require__(/*! ./OpenVidu/Session */ "../../../../openvidu-browser/lib/OpenVidu/Session.js");
exports.Session = Session_1.Session;
var Publisher_1 = __webpack_require__(/*! ./OpenVidu/Publisher */ "../../../../openvidu-browser/lib/OpenVidu/Publisher.js");
exports.Publisher = Publisher_1.Publisher;
var Subscriber_1 = __webpack_require__(/*! ./OpenVidu/Subscriber */ "../../../../openvidu-browser/lib/OpenVidu/Subscriber.js");
exports.Subscriber = Subscriber_1.Subscriber;
var StreamManager_1 = __webpack_require__(/*! ./OpenVidu/StreamManager */ "../../../../openvidu-browser/lib/OpenVidu/StreamManager.js");
exports.StreamManager = StreamManager_1.StreamManager;
var Stream_1 = __webpack_require__(/*! ./OpenVidu/Stream */ "../../../../openvidu-browser/lib/OpenVidu/Stream.js");
exports.Stream = Stream_1.Stream;
var Connection_1 = __webpack_require__(/*! ./OpenVidu/Connection */ "../../../../openvidu-browser/lib/OpenVidu/Connection.js");
exports.Connection = Connection_1.Connection;
var LocalRecorder_1 = __webpack_require__(/*! ./OpenVidu/LocalRecorder */ "../../../../openvidu-browser/lib/OpenVidu/LocalRecorder.js");
exports.LocalRecorder = LocalRecorder_1.LocalRecorder;
var LocalRecorderState_1 = __webpack_require__(/*! ./OpenViduInternal/Enums/LocalRecorderState */ "../../../../openvidu-browser/lib/OpenViduInternal/Enums/LocalRecorderState.js");
exports.LocalRecorderState = LocalRecorderState_1.LocalRecorderState;
var OpenViduError_1 = __webpack_require__(/*! ./OpenViduInternal/Enums/OpenViduError */ "../../../../openvidu-browser/lib/OpenViduInternal/Enums/OpenViduError.js");
exports.OpenViduError = OpenViduError_1.OpenViduError;
var VideoInsertMode_1 = __webpack_require__(/*! ./OpenViduInternal/Enums/VideoInsertMode */ "../../../../openvidu-browser/lib/OpenViduInternal/Enums/VideoInsertMode.js");
exports.VideoInsertMode = VideoInsertMode_1.VideoInsertMode;
var Event_1 = __webpack_require__(/*! ./OpenViduInternal/Events/Event */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/Event.js");
exports.Event = Event_1.Event;
var ConnectionEvent_1 = __webpack_require__(/*! ./OpenViduInternal/Events/ConnectionEvent */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/ConnectionEvent.js");
exports.ConnectionEvent = ConnectionEvent_1.ConnectionEvent;
var PublisherSpeakingEvent_1 = __webpack_require__(/*! ./OpenViduInternal/Events/PublisherSpeakingEvent */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/PublisherSpeakingEvent.js");
exports.PublisherSpeakingEvent = PublisherSpeakingEvent_1.PublisherSpeakingEvent;
var RecordingEvent_1 = __webpack_require__(/*! ./OpenViduInternal/Events/RecordingEvent */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/RecordingEvent.js");
exports.RecordingEvent = RecordingEvent_1.RecordingEvent;
var SessionDisconnectedEvent_1 = __webpack_require__(/*! ./OpenViduInternal/Events/SessionDisconnectedEvent */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/SessionDisconnectedEvent.js");
exports.SessionDisconnectedEvent = SessionDisconnectedEvent_1.SessionDisconnectedEvent;
var SignalEvent_1 = __webpack_require__(/*! ./OpenViduInternal/Events/SignalEvent */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/SignalEvent.js");
exports.SignalEvent = SignalEvent_1.SignalEvent;
var StreamEvent_1 = __webpack_require__(/*! ./OpenViduInternal/Events/StreamEvent */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/StreamEvent.js");
exports.StreamEvent = StreamEvent_1.StreamEvent;
var StreamManagerEvent_1 = __webpack_require__(/*! ./OpenViduInternal/Events/StreamManagerEvent */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/StreamManagerEvent.js");
exports.StreamManagerEvent = StreamManagerEvent_1.StreamManagerEvent;
var VideoElementEvent_1 = __webpack_require__(/*! ./OpenViduInternal/Events/VideoElementEvent */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/VideoElementEvent.js");
exports.VideoElementEvent = VideoElementEvent_1.VideoElementEvent;
var StreamPropertyChangedEvent_1 = __webpack_require__(/*! ./OpenViduInternal/Events/StreamPropertyChangedEvent */ "../../../../openvidu-browser/lib/OpenViduInternal/Events/StreamPropertyChangedEvent.js");
exports.StreamPropertyChangedEvent = StreamPropertyChangedEvent_1.StreamPropertyChangedEvent;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./src/$$_lazy_route_resource lazy recursive":
/*!**********************************************************!*\
  !*** ./src/$$_lazy_route_resource lazy namespace object ***!
  \**********************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

function webpackEmptyAsyncContext(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncaught exception popping up in devtools
	return Promise.resolve().then(function() {
		var e = new Error('Cannot find module "' + req + '".');
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	});
}
webpackEmptyAsyncContext.keys = function() { return []; };
webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
module.exports = webpackEmptyAsyncContext;
webpackEmptyAsyncContext.id = "./src/$$_lazy_route_resource lazy recursive";

/***/ }),

/***/ "./src/app/app.component.css":
/*!***********************************!*\
  !*** ./src/app/app.component.css ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ""

/***/ }),

/***/ "./src/app/app.component.html":
/*!************************************!*\
  !*** ./src/app/app.component.html ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<main>\n  <router-outlet></router-outlet>\n</main>"

/***/ }),

/***/ "./src/app/app.component.ts":
/*!**********************************!*\
  !*** ./src/app/app.component.ts ***!
  \**********************************/
/*! exports provided: AppComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AppComponent", function() { return AppComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};

var AppComponent = /** @class */ (function () {
    function AppComponent() {
    }
    AppComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-root',
            template: __webpack_require__(/*! ./app.component.html */ "./src/app/app.component.html"),
            styles: [__webpack_require__(/*! ./app.component.css */ "./src/app/app.component.css")]
        })
    ], AppComponent);
    return AppComponent;
}());



/***/ }),

/***/ "./src/app/app.material.module.ts":
/*!****************************************!*\
  !*** ./src/app/app.material.module.ts ***!
  \****************************************/
/*! exports provided: AppMaterialModule */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AppMaterialModule", function() { return AppMaterialModule; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_platform_browser_animations__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/platform-browser/animations */ "./node_modules/@angular/platform-browser/fesm5/animations.js");
/* harmony import */ var _angular_material__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/material */ "./node_modules/@angular/material/esm5/material.es5.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};



var AppMaterialModule = /** @class */ (function () {
    function AppMaterialModule() {
    }
    AppMaterialModule = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["NgModule"])({
            imports: [
                _angular_platform_browser_animations__WEBPACK_IMPORTED_MODULE_1__["BrowserAnimationsModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatButtonModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatIconModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatCheckboxModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatCardModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatInputModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatProgressSpinnerModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatTooltipModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatDialogModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatSlideToggleModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatListModule"]
            ],
            exports: [
                _angular_platform_browser_animations__WEBPACK_IMPORTED_MODULE_1__["BrowserAnimationsModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatButtonModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatIconModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatCheckboxModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatCardModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatInputModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatProgressSpinnerModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatTooltipModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatDialogModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatSlideToggleModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatListModule"]
            ],
        })
    ], AppMaterialModule);
    return AppMaterialModule;
}());



/***/ }),

/***/ "./src/app/app.module.ts":
/*!*******************************!*\
  !*** ./src/app/app.module.ts ***!
  \*******************************/
/*! exports provided: AppModule */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AppModule", function() { return AppModule; });
/* harmony import */ var _angular_platform_browser__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/platform-browser */ "./node_modules/@angular/platform-browser/fesm5/platform-browser.js");
/* harmony import */ var _angular_flex_layout__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/flex-layout */ "./node_modules/@angular/flex-layout/esm5/flex-layout.es5.js");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_forms__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @angular/forms */ "./node_modules/@angular/forms/fesm5/forms.js");
/* harmony import */ var _angular_http__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @angular/http */ "./node_modules/@angular/http/fesm5/http.js");
/* harmony import */ var hammerjs__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! hammerjs */ "./node_modules/hammerjs/hammer.js");
/* harmony import */ var hammerjs__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(hammerjs__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _app_routing__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./app.routing */ "./src/app/app.routing.ts");
/* harmony import */ var app_app_material_module__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! app/app.material.module */ "./src/app/app.material.module.ts");
/* harmony import */ var _services_info_service__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./services/info.service */ "./src/app/services/info.service.ts");
/* harmony import */ var _services_rest_service__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./services/rest.service */ "./src/app/services/rest.service.ts");
/* harmony import */ var _app_component__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./app.component */ "./src/app/app.component.ts");
/* harmony import */ var _components_dashboard_dashboard_component__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./components/dashboard/dashboard.component */ "./src/app/components/dashboard/dashboard.component.ts");
/* harmony import */ var _components_session_details_session_details_component__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./components/session-details/session-details.component */ "./src/app/components/session-details/session-details.component.ts");
/* harmony import */ var _components_dashboard_credentials_dialog_component__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./components/dashboard/credentials-dialog.component */ "./src/app/components/dashboard/credentials-dialog.component.ts");
/* harmony import */ var _components_layouts_layout_best_fit_layout_best_fit_component__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ./components/layouts/layout-best-fit/layout-best-fit.component */ "./src/app/components/layouts/layout-best-fit/layout-best-fit.component.ts");
/* harmony import */ var _components_layouts_ov_video_component__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ./components/layouts/ov-video.component */ "./src/app/components/layouts/ov-video.component.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
















var AppModule = /** @class */ (function () {
    function AppModule() {
    }
    AppModule = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_2__["NgModule"])({
            declarations: [
                _app_component__WEBPACK_IMPORTED_MODULE_10__["AppComponent"],
                _components_dashboard_dashboard_component__WEBPACK_IMPORTED_MODULE_11__["DashboardComponent"],
                _components_session_details_session_details_component__WEBPACK_IMPORTED_MODULE_12__["SessionDetailsComponent"],
                _components_dashboard_credentials_dialog_component__WEBPACK_IMPORTED_MODULE_13__["CredentialsDialogComponent"],
                _components_layouts_layout_best_fit_layout_best_fit_component__WEBPACK_IMPORTED_MODULE_14__["LayoutBestFitComponent"],
                _components_layouts_ov_video_component__WEBPACK_IMPORTED_MODULE_15__["OpenViduVideoComponent"],
            ],
            imports: [
                _angular_platform_browser__WEBPACK_IMPORTED_MODULE_0__["BrowserModule"],
                _angular_forms__WEBPACK_IMPORTED_MODULE_3__["FormsModule"],
                _angular_http__WEBPACK_IMPORTED_MODULE_4__["HttpModule"],
                _app_routing__WEBPACK_IMPORTED_MODULE_6__["routing"],
                app_app_material_module__WEBPACK_IMPORTED_MODULE_7__["AppMaterialModule"],
                _angular_flex_layout__WEBPACK_IMPORTED_MODULE_1__["FlexLayoutModule"]
            ],
            entryComponents: [
                _components_dashboard_credentials_dialog_component__WEBPACK_IMPORTED_MODULE_13__["CredentialsDialogComponent"],
            ],
            providers: [_services_info_service__WEBPACK_IMPORTED_MODULE_8__["InfoService"], _services_rest_service__WEBPACK_IMPORTED_MODULE_9__["RestService"]],
            bootstrap: [_app_component__WEBPACK_IMPORTED_MODULE_10__["AppComponent"]]
        })
    ], AppModule);
    return AppModule;
}());



/***/ }),

/***/ "./src/app/app.routing.ts":
/*!********************************!*\
  !*** ./src/app/app.routing.ts ***!
  \********************************/
/*! exports provided: routing */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "routing", function() { return routing; });
/* harmony import */ var _angular_router__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/router */ "./node_modules/@angular/router/fesm5/router.js");
/* harmony import */ var app_components_dashboard_dashboard_component__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! app/components/dashboard/dashboard.component */ "./src/app/components/dashboard/dashboard.component.ts");
/* harmony import */ var app_components_session_details_session_details_component__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! app/components/session-details/session-details.component */ "./src/app/components/session-details/session-details.component.ts");
/* harmony import */ var app_components_layouts_layout_best_fit_layout_best_fit_component__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! app/components/layouts/layout-best-fit/layout-best-fit.component */ "./src/app/components/layouts/layout-best-fit/layout-best-fit.component.ts");




var appRoutes = [
    {
        path: '',
        component: app_components_dashboard_dashboard_component__WEBPACK_IMPORTED_MODULE_1__["DashboardComponent"],
        pathMatch: 'full'
    },
    {
        path: 'session/:sessionId',
        component: app_components_session_details_session_details_component__WEBPACK_IMPORTED_MODULE_2__["SessionDetailsComponent"],
        pathMatch: 'full'
    },
    {
        path: 'layout-best-fit/:sessionId/:secret',
        component: app_components_layouts_layout_best_fit_layout_best_fit_component__WEBPACK_IMPORTED_MODULE_3__["LayoutBestFitComponent"],
        pathMatch: 'full'
    }
];
var routing = _angular_router__WEBPACK_IMPORTED_MODULE_0__["RouterModule"].forRoot(appRoutes, { useHash: true });


/***/ }),

/***/ "./src/app/components/dashboard/credentials-dialog.component.ts":
/*!**********************************************************************!*\
  !*** ./src/app/components/dashboard/credentials-dialog.component.ts ***!
  \**********************************************************************/
/*! exports provided: CredentialsDialogComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CredentialsDialogComponent", function() { return CredentialsDialogComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};

var CredentialsDialogComponent = /** @class */ (function () {
    function CredentialsDialogComponent() {
    }
    CredentialsDialogComponent.prototype.testVideo = function () {
        this.myReference.close(this.secret);
    };
    CredentialsDialogComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-credentials-dialog',
            template: "\n        <div>\n            <h1 mat-dialog-title>\n                Insert your secret\n            </h1>\n            <form #dialogForm (ngSubmit)=\"testVideo()\">\n                <mat-dialog-content>\n                    <mat-form-field>\n                        <input matInput name=\"secret\" type=\"password\" [(ngModel)]=\"secret\" required>\n                    </mat-form-field>\n                </mat-dialog-content>\n                <mat-dialog-actions>\n                    <button mat-button mat-dialog-close>CANCEL</button>\n                    <button mat-button id=\"join-btn\" type=\"submit\">TEST</button>\n                </mat-dialog-actions>\n            </form>\n        </div>\n    ",
            styles: ["\n        #quality-div {\n            margin-top: 20px;\n        }\n        #join-div {\n            margin-top: 25px;\n            margin-bottom: 20px;\n        }\n        #quality-tag {\n            display: block;\n        }\n        h5 {\n            margin-bottom: 10px;\n            text-align: left;\n        }\n        #joinWithVideo {\n            margin-right: 50px;\n        }\n        mat-dialog-actions {\n            display: block;\n        }\n        #join-btn {\n            float: right;\n        }\n    "],
        }),
        __metadata("design:paramtypes", [])
    ], CredentialsDialogComponent);
    return CredentialsDialogComponent;
}());



/***/ }),

/***/ "./src/app/components/dashboard/dashboard.component.css":
/*!**************************************************************!*\
  !*** ./src/app/components/dashboard/dashboard.component.css ***!
  \**************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "#dashboard-div {\n  height: 100%;\n  padding: 20px;\n}\n\n#log {\n  height: 90%;\n}\n\n#log-content {\n  height: 90%;\n  font-family: Consolas, 'Liberation Mono', Menlo, Courier, monospace;\n  overflow-y: auto;\n  overflow-x: hidden\n}\n\nul {\n  margin: 0;\n}\n\n#test-btn {\n  text-transform: uppercase;\n}\n\nmat-card-title button.blue {\n  color: #ffffff;\n  background-color: #0088aa;\n}\n\nmat-card-title button.yellow {\n  color: rgba(0, 0, 0, 0.87);\n  background-color: #ffcc00;\n}\n\nmat-spinner {\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  -webkit-transform: translate(-50%, -50%);\n          transform: translate(-50%, -50%);\n}\n\n#tick-div {\n  width: 100px;\n  height: 100px;\n  z-index: 1;\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  -webkit-transform: translate(-50%, -50%);\n          transform: translate(-50%, -50%);\n}\n\n#tooltip-tick {\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  z-index: 2;\n}\n\n.circ {\n  opacity: 0;\n  stroke-dasharray: 130;\n  stroke-dashoffset: 130;\n  transition: all 1s;\n}\n\n.tick {\n  stroke-dasharray: 50;\n  stroke-dashoffset: 50;\n  transition: stroke-dashoffset 1s 0.5s ease-out;\n}\n\n.drawn+svg .path {\n  opacity: 1;\n  stroke-dashoffset: 0;\n}\n\n#mirrored-video {\n  position: relative;\n}\n\n@media screen and (max-width: 599px) {\n  mat-card-title {\n     font-size: 20px;\n  }\n}\n\n/* Pure CSS loader */\n\n#loader {\n  width: 100px;\n  height: 100px;\n  z-index: 1;\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  -webkit-transform: translate(-50%, -50%);\n  transform: translate(-50%, -50%);\n}\n\n#loader * {\n  box-sizing: border-box;\n}\n\n#loader ::after {\n  box-sizing: border-box;\n}\n\n#loader ::before {\n  box-sizing: border-box;\n}\n\n.loader-1 {\n  height: 100px;\n  width: 100px;\n  -webkit-animation: loader-1-1 4.8s linear infinite;\n  animation: loader-1-1 4.8s linear infinite;\n}\n\n@-webkit-keyframes loader-1-1 {\n  0% {\n    -webkit-transform: rotate(0deg);\n  }\n  100% {\n    -webkit-transform: rotate(360deg);\n  }\n}\n\n@keyframes loader-1-1 {\n  0% {\n    -webkit-transform: rotate(0deg);\n            transform: rotate(0deg);\n  }\n  100% {\n    -webkit-transform: rotate(360deg);\n            transform: rotate(360deg);\n  }\n}\n\n.loader-1 span {\n  display: block;\n  position: absolute;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  right: 0;\n  margin: auto;\n  height: 100px;\n  width: 100px;\n  clip: rect(0, 100px, 100px, 50px);\n  -webkit-animation: loader-1-2 1.2s linear infinite;\n  animation: loader-1-2 1.2s linear infinite;\n}\n\n@-webkit-keyframes loader-1-2 {\n  0% {\n    -webkit-transform: rotate(0deg);\n  }\n  100% {\n    -webkit-transform: rotate(220deg);\n  }\n}\n\n@keyframes loader-1-2 {\n  0% {\n    -webkit-transform: rotate(0deg);\n            transform: rotate(0deg);\n  }\n  100% {\n    -webkit-transform: rotate(220deg);\n            transform: rotate(220deg);\n  }\n}\n\n.loader-1 span::after {\n  content: \"\";\n  position: absolute;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  right: 0;\n  margin: auto;\n  height: 100px;\n  width: 100px;\n  clip: rect(0, 100px, 100px, 50px);\n  border: 8px solid #4d4d4d;\n  border-radius: 50%;\n  -webkit-animation: loader-1-3 1.2s cubic-bezier(0.770, 0.000, 0.175, 1.000) infinite;\n  animation: loader-1-3 1.2s cubic-bezier(0.770, 0.000, 0.175, 1.000) infinite;\n}\n\n@-webkit-keyframes loader-1-3 {\n  0% {\n    -webkit-transform: rotate(-140deg);\n  }\n  50% {\n    -webkit-transform: rotate(-160deg);\n  }\n  100% {\n    -webkit-transform: rotate(140deg);\n  }\n}\n\n@keyframes loader-1-3 {\n  0% {\n    -webkit-transform: rotate(-140deg);\n            transform: rotate(-140deg);\n  }\n  50% {\n    -webkit-transform: rotate(-160deg);\n            transform: rotate(-160deg);\n  }\n  100% {\n    -webkit-transform: rotate(140deg);\n            transform: rotate(140deg);\n  }\n}"

/***/ }),

/***/ "./src/app/components/dashboard/dashboard.component.html":
/*!***************************************************************!*\
  !*** ./src/app/components/dashboard/dashboard.component.html ***!
  \***************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<div id=\"dashboard-div\" fxLayout=\"row\" fxLayout.xs=\"column\" fxLayoutGap=\"20px\" fxLayoutGap.xs=\"20px\">\n\n  <div fxFlex=\"66%\" fxFlexOrder=\"1\" fxFlexOrder.xs=\"2\">\n    <mat-card id=\"log\">\n      <mat-card-title>Server events\n        <mat-slide-toggle title=\"Lock Scroll\" [(ngModel)]=\"lockScroll\" style=\"float: right; margin-left: auto;\">\n          <mat-icon>lock_outline</mat-icon>\n        </mat-slide-toggle>\n      </mat-card-title>\n      <mat-divider></mat-divider>\n      <mat-card-content #scrollMe id=\"log-content\">\n        <ul>\n          <li *ngFor=\"let i of info\">\n            <p>{{i}}</p>\n          </li>\n        </ul>\n      </mat-card-content>\n    </mat-card>\n  </div>\n\n  <div fxFlex=\"33%\" fxFlex.xs=\"auto\" fxFlexOrder=\"2\" fxFlexOrder.xs=\"1\">\n    <mat-card id=\"video-loop\">\n      <mat-card-title>Test the connection\n        <button id=\"test-btn\" mat-raised-button [ngClass]=\"testStatus == 'DISCONNECTED' ? 'blue' : (testStatus == 'PLAYING' ? 'yellow' : 'disabled')\" (click)=\"toggleTestVideo()\" [disabled]=\"testStatus==='CONNECTING' || testStatus==='CONNECTED'\">{{testButton}}</button>\n      </mat-card-title>\n      <mat-divider></mat-divider>\n      <mat-card-content>\n        <div id=\"mirrored-video\">\n          <div *ngIf=\"showSpinner\" id=\"loader\">\n            <div class=\"loader-1 center\"><span></span></div>\n          </div>\n          <div *ngIf=\"session\" id=\"tick-div\">\n            <div id=\"tooltip-tick\" *ngIf=\"testStatus=='PLAYING'\" matTooltip=\"The connection is successful\" matTooltipPosition=\"below\"></div>\n            <div [ngClass]=\"testStatus=='PLAYING' ? 'trigger drawn' : 'trigger'\"></div>\n            <svg version=\"1.1\" id=\"tick\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\n              viewBox=\"-1 -1 39 39\" style=\"enable-background:new 0 0 37 37;\" xml:space=\"preserve\">\n              <path class=\"circ path\" style=\"fill:none;stroke:#06d362;stroke-width:4;stroke-linejoin:round;stroke-miterlimit:10;\" d=\"\n\tM30.5,6.5L30.5,6.5c6.6,6.6,6.6,17.4,0,24l0,0c-6.6,6.6-17.4,6.6-24,0l0,0c-6.6-6.6-6.6-17.4,0-24l0,0C13.1-0.2,23.9-0.2,30.5,6.5z\"\n              />\n              <polyline class=\"tick path\" style=\"fill:none;stroke:#06d362;stroke-width:4;stroke-linejoin:round;stroke-miterlimit:10;\" points=\"\n\t11.6,20 15.9,24.2 26.4,13.8 \" />\n            </svg>\n          </div>\n        </div>\n        <div id=\"msg-chain\"><p *ngFor=\"let msg of msgChain\">{{msg}}</p></div>\n      </mat-card-content>\n    </mat-card>\n  </div>\n</div>\n"

/***/ }),

/***/ "./src/app/components/dashboard/dashboard.component.ts":
/*!*************************************************************!*\
  !*** ./src/app/components/dashboard/dashboard.component.ts ***!
  \*************************************************************/
/*! exports provided: DashboardComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DashboardComponent", function() { return DashboardComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_material__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/material */ "./node_modules/@angular/material/esm5/material.es5.js");
/* harmony import */ var _services_info_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../services/info.service */ "./src/app/services/info.service.ts");
/* harmony import */ var _services_rest_service__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../services/rest.service */ "./src/app/services/rest.service.ts");
/* harmony import */ var openvidu_browser__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! openvidu-browser */ "../../../../openvidu-browser/lib/index.js");
/* harmony import */ var openvidu_browser__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(openvidu_browser__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _credentials_dialog_component__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./credentials-dialog.component */ "./src/app/components/dashboard/credentials-dialog.component.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};






var DashboardComponent = /** @class */ (function () {
    function DashboardComponent(infoService, restService, dialog) {
        var _this = this;
        this.infoService = infoService;
        this.restService = restService;
        this.dialog = dialog;
        this.lockScroll = false;
        this.info = [];
        this.testStatus = 'DISCONNECTED';
        this.testButton = 'Test';
        this.tickClass = 'trigger';
        this.showSpinner = false;
        this.msgChain = [];
        // Subscription to info updated event raised by InfoService
        this.infoSubscription = this.infoService.newInfo$.subscribe(function (info) {
            _this.info.push(info);
            _this.scrollToBottom();
        });
    }
    DashboardComponent.prototype.ngOnInit = function () {
        var _this = this;
        var protocol = location.protocol.includes('https') ? 'wss://' : 'ws://';
        var port = (location.port) ? (':' + location.port) : '';
        this.websocket = new WebSocket(protocol + location.hostname + port + '/info');
        this.websocket.onopen = function (event) {
            console.log('Info websocket connected');
        };
        this.websocket.onclose = function (event) {
            console.log('Info websocket closed');
        };
        this.websocket.onerror = function (event) {
            console.log('Info websocket error');
        };
        this.websocket.onmessage = function (event) {
            console.log('Info websocket message');
            console.log(event.data);
            _this.infoService.updateInfo(event.data);
        };
        this.restService.getOpenViduPublicUrl()
            .then(function (url) {
            _this.openviduPublicUrl = url.replace('https://', 'wss://').replace('http://', 'ws://');
        })
            .catch(function (error) {
            console.error(error);
        });
    };
    DashboardComponent.prototype.beforeunloadHandler = function () {
        // On window closed leave test session and close info websocket
        if (this.session) {
            this.endTestVideo();
        }
        this.websocket.close();
    };
    DashboardComponent.prototype.ngOnDestroy = function () {
        // On component destroyed leave test session and close info websocket
        if (this.session) {
            this.endTestVideo();
        }
        this.websocket.close();
    };
    DashboardComponent.prototype.toggleTestVideo = function () {
        if (!this.session) {
            this.testVideo();
        }
        else {
            this.endTestVideo();
        }
    };
    DashboardComponent.prototype.testVideo = function () {
        var _this = this;
        var dialogRef;
        dialogRef = this.dialog.open(_credentials_dialog_component__WEBPACK_IMPORTED_MODULE_5__["CredentialsDialogComponent"]);
        dialogRef.componentInstance.myReference = dialogRef;
        dialogRef.afterClosed().subscribe(function (secret) {
            if (secret) {
                if (!_this.openviduPublicUrl) {
                    _this.restService.getOpenViduPublicUrl()
                        .then((function (url) {
                        _this.openviduPublicUrl = url.replace('https://', 'wss://').replace('http://', 'ws://');
                        _this.connectToSession(_this.openviduPublicUrl + '?sessionId=testSession&secret=' + secret);
                    }))
                        .catch(function (error) {
                        console.error(error);
                    });
                }
                else {
                    _this.connectToSession(_this.openviduPublicUrl + '?sessionId=testSession&secret=' + secret);
                }
            }
        });
    };
    DashboardComponent.prototype.connectToSession = function (token) {
        var _this = this;
        this.msgChain = [];
        var OV = new openvidu_browser__WEBPACK_IMPORTED_MODULE_4__["OpenVidu"]();
        this.session = OV.initSession();
        this.testStatus = 'CONNECTING';
        this.testButton = 'Testing...';
        this.session.connect(token)
            .then(function () {
            _this.msgChain.push('Connected to session');
            _this.testStatus = 'CONNECTED';
            var publisherRemote = OV.initPublisher('mirrored-video', {
                publishAudio: true,
                publishVideo: true,
                resolution: '640x480'
            }, function (e) {
                if (!!e) {
                    console.error(e);
                }
            });
            publisherRemote.on('accessAllowed', function () {
                _this.msgChain.push('Camera access allowed');
            });
            publisherRemote.on('accessDenied', function () {
                _this.endTestVideo();
                _this.msgChain.push('Camera access denied');
            });
            publisherRemote.on('videoElementCreated', function (video) {
                _this.showSpinner = true;
                _this.msgChain.push('Video element created');
            });
            publisherRemote.on('streamCreated', function (video) {
                _this.msgChain.push('Stream created');
            });
            publisherRemote.on('streamPlaying', function (video) {
                _this.msgChain.push('Stream playing');
                _this.testButton = 'End test';
                _this.testStatus = 'PLAYING';
                _this.showSpinner = false;
            });
            publisherRemote.subscribeToRemote();
            _this.session.publish(publisherRemote);
        })
            .catch(function (error) {
            if (error.code === 401) {
                _this.endTestVideo();
                var dialogRef = void 0;
                dialogRef = _this.dialog.open(_credentials_dialog_component__WEBPACK_IMPORTED_MODULE_5__["CredentialsDialogComponent"]);
                dialogRef.componentInstance.myReference = dialogRef;
                dialogRef.afterClosed().subscribe(function (secret) {
                    if (secret) {
                        _this.connectToSession(_this.openviduPublicUrl + '?sessionId=testSession&secret=' + secret);
                    }
                });
            }
            else {
                console.error(error);
                _this.msgChain.push('Error connecting to session');
            }
        });
    };
    DashboardComponent.prototype.endTestVideo = function () {
        this.session.disconnect();
        this.session = null;
        this.testStatus = 'DISCONNECTED';
        this.testButton = 'Test';
        this.showSpinner = false;
        this.info = [];
        this.msgChain = [];
    };
    DashboardComponent.prototype.scrollToBottom = function () {
        try {
            if (!this.lockScroll) {
                this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
            }
        }
        catch (err) {
            console.error('[Error]:' + err.toString());
        }
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChild"])('scrollMe'),
        __metadata("design:type", _angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"])
    ], DashboardComponent.prototype, "myScrollContainer", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostListener"])('window:beforeunload'),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], DashboardComponent.prototype, "beforeunloadHandler", null);
    DashboardComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-dashboard',
            template: __webpack_require__(/*! ./dashboard.component.html */ "./src/app/components/dashboard/dashboard.component.html"),
            styles: [__webpack_require__(/*! ./dashboard.component.css */ "./src/app/components/dashboard/dashboard.component.css")],
        }),
        __metadata("design:paramtypes", [_services_info_service__WEBPACK_IMPORTED_MODULE_2__["InfoService"], _services_rest_service__WEBPACK_IMPORTED_MODULE_3__["RestService"], _angular_material__WEBPACK_IMPORTED_MODULE_1__["MatDialog"]])
    ], DashboardComponent);
    return DashboardComponent;
}());



/***/ }),

/***/ "./src/app/components/layouts/layout-best-fit/layout-best-fit.component.css":
/*!**********************************************************************************!*\
  !*** ./src/app/components/layouts/layout-best-fit/layout-best-fit.component.css ***!
  \**********************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ".bounds {\n  background-color: black;\n  overflow: hidden;\n  cursor: none !important;\n  position: absolute;\n  left: 0;\n  right: 0;\n  top: 0;\n  bottom: 0;\n}\n\napp-ov-video video {\n  -o-object-fit: cover;\n  object-fit: cover;\n  display: block;\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  color: #ffffff;\n  margin: 0;\n  padding: 0;\n  border: 0;\n  font-size: 100%;\n  font-family: Arial, Helvetica, sans-serif;\n}\n\n/*!\n * Copyright (c) 2017 TokBox, Inc.\n * Released under the MIT license\n * http://opensource.org/licenses/MIT\n */\n\n.custom-class {\n  min-height: 0px !important;\n}\n\n/**\n * OT Base styles\n */\n\n/* Root OT object, this is where our CSS reset happens */\n\n.OT_root, .OT_root * {\n  color: #ffffff;\n  margin: 0;\n  padding: 0;\n  border: 0;\n  font-size: 100%;\n  font-family: Arial, Helvetica, sans-serif;\n  vertical-align: baseline;\n}\n\n.OT_dialog-centering {\n  display: table;\n  width: 100%;\n  height: 100%;\n}\n\n.OT_dialog-centering-child {\n  display: table-cell;\n  vertical-align: middle;\n}\n\n.OT_dialog {\n  position: relative;\n  box-sizing: border-box;\n  max-width: 576px;\n  margin-right: auto;\n  margin-left: auto;\n  padding: 36px;\n  text-align: center;\n  /* centers all the inline content */\n  background-color: #363636;\n  color: #fff;\n  box-shadow: 2px 4px 6px #999;\n  font-family: 'Didact Gothic', sans-serif;\n  font-size: 13px;\n  line-height: 1.4;\n}\n\n.OT_dialog * {\n  font-family: inherit;\n  box-sizing: inherit;\n}\n\n.OT_closeButton {\n  color: #999999;\n  cursor: pointer;\n  font-size: 32px;\n  line-height: 36px;\n  position: absolute;\n  right: 18px;\n  top: 0;\n}\n\n.OT_dialog-messages {\n  text-align: center;\n}\n\n.OT_dialog-messages-main {\n  margin-bottom: 36px;\n  line-height: 36px;\n  font-weight: 300;\n  font-size: 24px;\n}\n\n.OT_dialog-messages-minor {\n  margin-bottom: 18px;\n  font-size: 13px;\n  line-height: 18px;\n  color: #A4A4A4;\n}\n\n.OT_dialog-messages-minor strong {\n  color: #ffffff;\n}\n\n.OT_dialog-actions-card {\n  display: inline-block;\n}\n\n.OT_dialog-button-title {\n  margin-bottom: 18px;\n  line-height: 18px;\n  font-weight: 300;\n  text-align: center;\n  font-size: 14px;\n  color: #999999;\n}\n\n.OT_dialog-button-title label {\n  color: #999999;\n}\n\n.OT_dialog-button-title a, .OT_dialog-button-title a:link, .OT_dialog-button-title a:active {\n  color: #02A1DE;\n}\n\n.OT_dialog-button-title strong {\n  color: #ffffff;\n  font-weight: 100;\n  display: block;\n}\n\n.OT_dialog-button {\n  display: inline-block;\n  margin-bottom: 18px;\n  padding: 0 1em;\n  background-color: #1CA3DC;\n  text-align: center;\n  cursor: pointer;\n}\n\n.OT_dialog-button:disabled {\n  cursor: not-allowed;\n  opacity: 0.5;\n}\n\n.OT_dialog-button-large {\n  line-height: 36px;\n  padding-top: 9px;\n  padding-bottom: 9px;\n  font-weight: 100;\n  font-size: 24px;\n}\n\n.OT_dialog-button-small {\n  line-height: 18px;\n  padding-top: 9px;\n  padding-bottom: 9px;\n  background-color: #444444;\n  color: #999999;\n  font-size: 16px;\n}\n\n.OT_dialog-progress-bar {\n  display: inline-block;\n  /* prevents margin collapse */\n  width: 100%;\n  margin-top: 5px;\n  margin-bottom: 41px;\n  border: 1px solid #4E4E4E;\n  height: 8px;\n}\n\n.OT_dialog-progress-bar-fill {\n  height: 100%;\n  background-color: #29A4DA;\n}\n\n.OT_dialog-plugin-upgrading .OT_dialog-plugin-upgrade-percentage {\n  line-height: 54px;\n  font-size: 48px;\n  font-weight: 100;\n}\n\n/* Helpers */\n\n.OT_centered {\n  position: fixed;\n  left: 50%;\n  top: 50%;\n  margin: 0;\n}\n\n.OT_dialog-hidden {\n  display: none;\n}\n\n.OT_dialog-button-block {\n  display: block;\n}\n\n.OT_dialog-no-natural-margin {\n  margin-bottom: 0;\n}\n\n/* Publisher and Subscriber styles */\n\n.OT_publisher, .OT_subscriber {\n  position: relative;\n  min-width: 48px;\n  min-height: 48px;\n}\n\n.OT_publisher .OT_video-element, .OT_subscriber .OT_video-element {\n  display: block;\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  -webkit-transform-origin: 0 0;\n  transform-origin: 0 0;\n}\n\n/* Styles that are applied when the video element should be mirrored */\n\n.OT_publisher.OT_mirrored .OT_video-element {\n  -webkit-transform: scale(-1, 1);\n  transform: scale(-1, 1);\n  -webkit-transform-origin: 50% 50%;\n  transform-origin: 50% 50%;\n}\n\n.OT_subscriber_error {\n  background-color: #000;\n  color: #fff;\n  text-align: center;\n}\n\n.OT_subscriber_error>p {\n  padding: 20px;\n}\n\n/* The publisher/subscriber name/mute background */\n\n.OT_publisher .OT_bar, .OT_subscriber .OT_bar, .OT_publisher .OT_name, .OT_subscriber .OT_name, .OT_publisher .OT_archiving, .OT_subscriber .OT_archiving, .OT_publisher .OT_archiving-status, .OT_subscriber .OT_archiving-status, .OT_publisher .OT_archiving-light-box, .OT_subscriber .OT_archiving-light-box {\n  -ms-box-sizing: border-box;\n  box-sizing: border-box;\n  top: 0;\n  left: 0;\n  right: 0;\n  display: block;\n  height: 34px;\n  position: absolute;\n}\n\n.OT_publisher .OT_bar, .OT_subscriber .OT_bar {\n  background: rgba(0, 0, 0, 0.4);\n}\n\n.OT_publisher .OT_edge-bar-item, .OT_subscriber .OT_edge-bar-item {\n  z-index: 1;\n  /* required to get audio level meter underneath */\n}\n\n/* The publisher/subscriber name panel/archiving status bar */\n\n.OT_publisher .OT_name, .OT_subscriber .OT_name {\n  background-color: transparent;\n  color: #ffffff;\n  font-size: 15px;\n  line-height: 34px;\n  font-weight: normal;\n  padding: 0 4px 0 36px;\n}\n\n.OT_publisher .OT_archiving-status, .OT_subscriber .OT_archiving-status {\n  background: rgba(0, 0, 0, 0.4);\n  top: auto;\n  bottom: 0;\n  left: 34px;\n  padding: 0 4px;\n  color: rgba(255, 255, 255, 0.8);\n  font-size: 15px;\n  line-height: 34px;\n  font-weight: normal;\n}\n\n.OT_micro .OT_archiving-status, .OT_micro:hover .OT_archiving-status, .OT_mini .OT_archiving-status, .OT_mini:hover .OT_archiving-status {\n  display: none;\n}\n\n.OT_publisher .OT_archiving-light-box, .OT_subscriber .OT_archiving-light-box {\n  background: rgba(0, 0, 0, 0.4);\n  top: auto;\n  bottom: 0;\n  right: auto;\n  width: 34px;\n  height: 34px;\n}\n\n.OT_archiving-light {\n  width: 7px;\n  height: 7px;\n  border-radius: 30px;\n  position: absolute;\n  top: 14px;\n  left: 14px;\n  background-color: #575757;\n  box-shadow: 0 0 5px 1px #575757;\n}\n\n.OT_archiving-light.OT_active {\n  background-color: #970d13;\n  animation: OT_pulse 1.3s ease-in;\n  -webkit-animation: OT_pulse 1.3s ease-in;\n  -moz-animation: OT_pulse 1.3s ease-in;\n  -webkit-animation: OT_pulse 1.3s ease-in;\n  animation-iteration-count: infinite;\n  -webkit-animation-iteration-count: infinite;\n  -moz-animation-iteration-count: infinite;\n  -webkit-animation-iteration-count: infinite;\n}\n\n@-webkit-keyframes OT_pulse {\n  0% {\n    box-shadow: 0 0 0px 0px #c70019;\n  }\n  30% {\n    box-shadow: 0 0 5px 1px #c70019;\n  }\n  50% {\n    box-shadow: 0 0 5px 1px #c70019;\n  }\n  80% {\n    box-shadow: 0 0 0px 0px #c70019;\n  }\n  100% {\n    box-shadow: 0 0 0px 0px #c70019;\n  }\n}\n\n@-webkit-keyframes OT_pulse {\n  0% {\n    box-shadow: 0 0 0px 0px #c70019;\n  }\n  30% {\n    box-shadow: 0 0 5px 1px #c70019;\n  }\n  50% {\n    box-shadow: 0 0 5px 1px #c70019;\n  }\n  80% {\n    box-shadow: 0 0 0px 0px #c70019;\n  }\n  100% {\n    box-shadow: 0 0 0px 0px #c70019;\n  }\n}\n\n.OT_mini .OT_bar, .OT_bar.OT_mode-mini, .OT_bar.OT_mode-mini-auto {\n  bottom: 0;\n  height: auto;\n}\n\n.OT_mini .OT_name.OT_mode-off, .OT_mini .OT_name.OT_mode-on, .OT_mini .OT_name.OT_mode-auto, .OT_mini:hover .OT_name.OT_mode-auto {\n  display: none;\n}\n\n.OT_publisher .OT_name, .OT_subscriber .OT_name {\n  left: 10px;\n  right: 37px;\n  height: 34px;\n  padding-left: 0;\n}\n\n.OT_publisher .OT_mute, .OT_subscriber .OT_mute {\n  border: none;\n  cursor: pointer;\n  display: block;\n  position: absolute;\n  text-align: center;\n  text-indent: -9999em;\n  background-color: transparent;\n  background-repeat: no-repeat;\n}\n\n.OT_publisher .OT_mute, .OT_subscriber .OT_mute {\n  right: 0;\n  top: 0;\n  border-left: 1px solid rgba(255, 255, 255, 0.2);\n  height: 36px;\n  width: 37px;\n}\n\n.OT_mini .OT_mute, .OT_publisher.OT_mini .OT_mute.OT_mode-auto.OT_mode-on-hold, .OT_subscriber.OT_mini .OT_mute.OT_mode-auto.OT_mode-on-hold {\n  top: 50%;\n  left: 50%;\n  right: auto;\n  margin-top: -18px;\n  margin-left: -18.5px;\n  border-left: none;\n}\n\n.OT_publisher .OT_mute {\n  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAcCAMAAAC02HQrAAAA1VBMVEUAAAD3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pn3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pn3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj39/j3+Pj3+Pn4+Pk/JRMlAAAAQ3RSTlMABAUHCQoLDhAQERwdHiAjLjAxOD9ASFBRVl1mbnZ6fH2LjI+QkaWqrrC1uLzAwcXJycrL1NXj5Ofo6u3w9fr7/P3+d4M3+QAAAQBJREFUGBlVwYdCglAABdCLlr5Unijm3hMUtBzlBLSr//9JgUToOQgVJgceJgU8aHgMeA38K50ZOpcQmTPwcyXn+JM8M3JJIqQypiIkeXelTyIkGZPwKS1NMia1lgKTVkaE3oQQGYsmHNqSMWnTgUFbMiZtGlD2dpaxrL1XgM0i4ZK8MeAmFhsAs29MGZniawagS63oMOQUNXYB5D0D1RMDpyoMLw/fiE2og/V+PVDR5AiBl0/2Uwik+vx4xV3a5G5Ye68Nd1czjUjZckm6VhmPciRzeCZICjwTJAViQq+3e+St167rAoHK8sLYZVkBYPCZAZ/eGa+2R5LH7Wrc0YFf/O9J3yBDFaoAAAAASUVORK5CYII=);\n  background-position: 9px 5px;\n}\n\n.OT_publisher .OT_mute.OT_active {\n  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAdCAYAAABFRCf7AAADcElEQVRIiaWVXWhcRRTHf7NNd2aDtUKMIjTpg4ufFIuiUOmDEWm0Vi3VYhXRqIggQh4sWJFSig9+oOhTKSpIRUWMIBIr2kptoTbgU6ooxCiIjR+14kcJmf9sNceHnd3ebnc3Uv9wuXfOzPzmnDMz5zozGwdWAbc65w5RUJQ8cC2wDJgFJioh/MJCMrNxq2vOzK4HmIvRRemxKP0RJWt53o7S+d2Yzsx6gQ+AIUDAnUqpBLzXZd4RYFUlhB/bdZacc3PAOmAcCMC7wfvFwLNdoAPAyx09bXyYWRl4E7gDmAdGlNKFwLYu8GolhO9O87RJd64GbMrgEvB68P4osMWdXLtVV7czlooNpVRWSs8DO7NpR/B+3rBHsvetCgtCMTxwQCm9BbyQrc8F7/uBex3uRCeXO0PrUZ4NfKyUPgWeyj3bg/crDNsIRGwBaJQGorQ3Svdn2wHgc2BUKb0DPJHtjwfvbwRucc7tz+N+i9LFUdoXpfVN36I0CVwBTFI/q9e1LPxT8P4qYEdu70q12mYzWw1MYQzjeJF6zq+shHC4B7jklOBPP/TzSunh4P0DwKvAfb5c9krpe+CcwsEoZdbhEvBM9wxRAl5RShcA9wAngE3B+8tLpdLuwrhp4MNmK0pfRWkySr7NXS8+L5nZbWZWy/Vin1IaitJnUTqvwevJ71lgSSWEFKUfHG7Q2m/xqFJaGry/GXgfGPLl8mJgrXPur2JoUC8Qy3OpG+sAbGhEKT0ErAWOA6uBPWbW1wr9BOgFbgKezot0kAPYqJQA1gC/A9cA+82svzksSn1R+jNKX0SpnM/e1x3yqig92JhrZivM7FjO8bSZLSuCR/Ok16K0KMNHojQWpYko7Y7S1igN5PE3ROl4lNaZ2UVmNpPBU01orvZvZPCeKFXbBR+lEKVtUapFaSZKg9njqpl9aWYTrmXCImA7sCWb9lK/jj9TrwkrgA1AH3AQuKsSwkzbrLfxpgpsBtYDxf/R3xm2ExirhNCuHHZXTsmRwiat+S/zSt06eysVA/4pmGr/G3qm6ik28v29FKgCg8BS6pvS0KNRGgZ+Bb4FpsxsOkfUlMuwDcBWYOUZOHYM2AU8WQmhBifDv70O7PjX7KZ+4G7g3FM8zd6uBIaBy4AqxnIcZwFLCovPAhE4Sj38b4BDwEeVEFKD9S94Khjn486v3QAAAABJRU5ErkJggg==);\n  background-position: 9px 4px;\n}\n\n.OT_subscriber .OT_mute {\n  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAATCAYAAAB7u5a2AAABx0lEQVQ4jaWUv48NURiGn3ONmCs32ZBd28ht1gqyZAkF21ylQkEiSp2ehpDlD1BoFGqqVdJohYKI7MaPxMoVNghCWMF+7ybLUewnOXfcMWO9yeQ857zne8+XmZOBGjJpr0kvTIomvTZpS526UCO4DUwD64FjwCFgqZnnR+oc8LfgzKQ73vGsr42ZtGjSQFV9o8KfBCacZwCaef4YmAf2rzjcpN3A2WSpm/AssKcqPDNpDBjs410CViXzTwk/A7b1C4wxDgOngAsZcAXY2buDfp/6S4F3lDS8DjgBzDWAjX/Y/e/QgYS/AhsKHa+OMQ6GEJ4Cj4BOAxgq6aCowyZtdf4OtAr+FHDO+R4wWnVbihr3cQnICt4boO38GWj9a/icjwOACt4m4K3zEPA+AxaAtTWCnwN3lzHkEL8V/OPAGud9wK2GF9XR1Wae/1zG2AI+pGYI4VUIoRtjHAc2A9cz4LRPevYCZ+i9/4sJt4GXJU10gaPAzdI2TTro/5Tfz8XEe2LSZGmxq/SDNvP8BnA5WRrx4BwYBe6vONx1EnjovGvBLAAd4Adwuyq8UiaNmDTvr+a8SQ9MuvbfwckBHZPe+QEfTdpep+4XZmPBHiHgz74AAAAASUVORK5CYII=);\n  background-position: 8px 7px;\n}\n\n.OT_subscriber .OT_mute.OT_active {\n  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAUCAYAAACXtf2DAAACtklEQVQ4jZ2VSYiURxTHf+/T9Nc9iRrBuYySmIsXUU9iFMEFERRBvAjJLUQi5ioiHvSScfTmgqC4XAT1ZIgLuJHkICaaQAgKI2hAUBT30bjUq7bbv4eukXK029F3+eqtv/fqK6qQdEnSNUmT6CDB/bvgfjO4N9zj2RD8007xg1IABkwEzkma0qb4PGAPMBZYLtSD8eNwAEjqTlNI0gNJM4YU7w7ut4O7gvuhZFsR3C8NC5BBLiTIY0mzM8AvqbiC++pk+zLpE95XuwAws3vAQuBPYDRwWtL84P4tsDSLv5oaug4EYOawAMF9jMdoLxqNZcDvQA04UVYqL4G/svj7AF21mhJscrvCksYBFO7xc2AAGGg2mrdjvf4rcAyomNn+slLZmUEGBgsYdh945xZJmgvckDSrEJpK6ySBgV6q12O8ABwGPjGzfWWlsjdN9rpjoSfA+DYDXARGAksK4Is3XC1Ub4z1f4CDQGFmu6tleQSYk0U+p7WVeefLJc00s4fAeWB6Qeunvj0m2ugx9gO7kmlrtSxvBfcy6fXUZS6rgG/S+jLQUwCVNmMC9HqM14EtSe+rluWazN8YEv8IqKZ1E1qnaIDO0ucx3gX6kv6TpM3AM+D/IbGjgP60/gq4WQA33gMA2OQxPgHWJX1ttSwL4FAeZGYLgB2SasBs4A8L7qOBf9M0uXQB3a+TMYSmVctyDrA9mfcBK82smSdKWgCcAaa1bTm4fxbc/8uuCQX3RanAD5Ka6Wo5IGnE0HxJPZ03pQX5Org3MsD3AO5xXLPZXJ9BjkrqdFg6QjZkgG3Jtsw93pG0VFI9QU5K6voYQBHcTydAfwheBI9HgvvPAJIWS3qeIL9JGvUxkO7gfi1BrqTvwkG/pPmSnibIqTzXPgAyEVgBjAEu1qrVPbk/PVTHgb/NbPGg/RVIzOQqzSTBaQAAAABJRU5ErkJggg==);\n  background-position: 7px 7px;\n}\n\n/**\n * Styles for display modes\n *\n * Note: It's important that these completely control the display and opacity\n * attributes, no other selectors should atempt to change them.\n */\n\n/* Default display mode transitions for various chrome elements */\n\n.OT_publisher .OT_edge-bar-item, .OT_subscriber .OT_edge-bar-item {\n  transition-property: top, bottom, opacity;\n  transition-duration: 0.5s;\n  transition-timing-function: ease-in;\n}\n\n.OT_publisher .OT_edge-bar-item.OT_mode-off, .OT_subscriber .OT_edge-bar-item.OT_mode-off, .OT_publisher .OT_edge-bar-item.OT_mode-auto, .OT_subscriber .OT_edge-bar-item.OT_mode-auto, .OT_publisher .OT_edge-bar-item.OT_mode-mini-auto, .OT_subscriber .OT_edge-bar-item.OT_mode-mini-auto {\n  top: -25px;\n  opacity: 0;\n}\n\n.OT_publisher .OT_edge-bar-item.OT_mode-off, .OT_subscriber .OT_edge-bar-item.OT_mode-off {\n  display: none;\n}\n\n.OT_mini .OT_mute.OT_mode-auto, .OT_publisher .OT_mute.OT_mode-mini-auto, .OT_subscriber .OT_mute.OT_mode-mini-auto {\n  top: 50%;\n}\n\n.OT_publisher .OT_edge-bar-item.OT_edge-bottom.OT_mode-off, .OT_subscriber .OT_edge-bar-item.OT_edge-bottom.OT_mode-off, .OT_publisher .OT_edge-bar-item.OT_edge-bottom.OT_mode-auto, .OT_subscriber .OT_edge-bar-item.OT_edge-bottom.OT_mode-auto, .OT_publisher .OT_edge-bar-item.OT_edge-bottom.OT_mode-mini-auto, .OT_subscriber .OT_edge-bar-item.OT_edge-bottom.OT_mode-mini-auto {\n  top: auto;\n  bottom: -25px;\n}\n\n.OT_publisher .OT_edge-bar-item.OT_mode-on, .OT_subscriber .OT_edge-bar-item.OT_mode-on, .OT_publisher .OT_edge-bar-item.OT_mode-auto.OT_mode-on-hold, .OT_subscriber .OT_edge-bar-item.OT_mode-auto.OT_mode-on-hold, .OT_publisher:hover .OT_edge-bar-item.OT_mode-auto, .OT_subscriber:hover .OT_edge-bar-item.OT_mode-auto, .OT_publisher:hover .OT_edge-bar-item.OT_mode-mini-auto, .OT_subscriber:hover .OT_edge-bar-item.OT_mode-mini-auto {\n  top: 0;\n  opacity: 1;\n}\n\n.OT_mini .OT_mute.OT_mode-on, .OT_mini:hover .OT_mute.OT_mode-auto, .OT_mute.OT_mode-mini, .OT_root:hover .OT_mute.OT_mode-mini-auto {\n  top: 50%;\n}\n\n.OT_publisher .OT_edge-bar-item.OT_edge-bottom.OT_mode-on, .OT_subscriber .OT_edge-bar-item.OT_edge-bottom.OT_mode-on, .OT_publisher:hover .OT_edge-bar-item.OT_edge-bottom.OT_mode-auto, .OT_subscriber:hover .OT_edge-bar-item.OT_edge-bottom.OT_mode-auto {\n  top: auto;\n  bottom: 0;\n  opacity: 1;\n}\n\n/* Contains the video element, used to fix video letter-boxing */\n\n.OT_widget-container {\n  width: 100%;\n  height: 100%;\n  position: absolute;\n  background-color: #000000;\n  overflow: hidden;\n}\n\n/* Load animation */\n\n.OT_root .OT_video-loading {\n  position: absolute;\n  z-index: 1;\n  width: 100%;\n  height: 100%;\n  display: none;\n  background-color: rgba(0, 0, 0, .75);\n}\n\n.OT_root .OT_video-loading .OT_video-loading-spinner {\n  background: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0yMCAtMjAgMjQwIDI0MCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJhIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZiIgc3RvcC1vcGFjaXR5PSIwIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZmZmIiBzdG9wLW9wYWNpdHk9IjAiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iYiIgeDE9IjEiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZmIiBzdG9wLW9wYWNpdHk9IjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNmZmYiIHN0b3Atb3BhY2l0eT0iLjA4Ii8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImMiIHgxPSIxIiB4Mj0iMCIgeTE9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZiIgc3RvcC1vcGFjaXR5PSIuMDgiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNmZmYiIHN0b3Atb3BhY2l0eT0iLjE2Ii8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImQiIHgyPSIwIiB5MT0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZmIiBzdG9wLW9wYWNpdHk9Ii4xNiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI2ZmZiIgc3RvcC1vcGFjaXR5PSIuMzMiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iZSIgeDI9IjEiIHkxPSIxIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiNmZmYiIHN0b3Atb3BhY2l0eT0iLjMzIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZmZmIiBzdG9wLW9wYWNpdHk9Ii42NiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJmIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZiIgc3RvcC1vcGFjaXR5PSIuNjYiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNmZmYiLz48L2xpbmVhckdyYWRpZW50PjxtYXNrIGlkPSJnIj48ZyBmaWxsPSJub25lIiBzdHJva2Utd2lkdGg9IjQwIj48cGF0aCBzdHJva2U9InVybCgjYSkiIGQ9Ik04Ni42LTUwYTEwMCAxMDAgMCAwIDEgMCAxMDAiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEwMCAxMDApIi8+PHBhdGggc3Ryb2tlPSJ1cmwoI2IpIiBkPSJNODYuNiA1MEExMDAgMTAwIDAgMCAxIDAgMTAwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMDAgMTAwKSIvPjxwYXRoIHN0cm9rZT0idXJsKCNjKSIgZD0iTTAgMTAwYTEwMCAxMDAgMCAwIDEtODYuNi01MCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTAwIDEwMCkiLz48cGF0aCBzdHJva2U9InVybCgjZCkiIGQ9Ik0tODYuNiA1MGExMDAgMTAwIDAgMCAxIDAtMTAwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMDAgMTAwKSIvPjxwYXRoIHN0cm9rZT0idXJsKCNlKSIgZD0iTS04Ni42LTUwQTEwMCAxMDAgMCAwIDEgMC0xMDAiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEwMCAxMDApIi8+PHBhdGggc3Ryb2tlPSJ1cmwoI2YpIiBkPSJNMC0xMDBhMTAwIDEwMCAwIDAgMSA4Ni42IDUwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMDAgMTAwKSIvPjwvZz48L21hc2s+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHg9Ii0yMCIgeT0iLTIwIiBtYXNrPSJ1cmwoI2cpIiBmaWxsPSIjZmZmIi8+PC9zdmc+) no-repeat;\n  position: absolute;\n  width: 32px;\n  height: 32px;\n  left: 50%;\n  top: 50%;\n  margin-left: -16px;\n  margin-top: -16px;\n  -webkit-animation: OT_spin 2s linear infinite;\n  animation: OT_spin 2s linear infinite;\n}\n\n@-webkit-keyframes OT_spin {\n  100% {\n    -webkit-transform: rotate(360deg);\n  }\n}\n\n@keyframes OT_spin {\n  100% {\n    -webkit-transform: rotate(360deg);\n    transform: rotate(360deg);\n  }\n}\n\n.OT_publisher.OT_loading .OT_video-loading, .OT_subscriber.OT_loading .OT_video-loading {\n  display: block;\n}\n\n.OT_video-centering {\n  display: table;\n  width: 100%;\n  height: 100%;\n}\n\n.OT_video-container {\n  display: table-cell;\n  vertical-align: middle;\n}\n\n.OT_video-poster {\n  position: absolute;\n  z-index: 1;\n  width: 100%;\n  height: 100%;\n  display: none;\n  opacity: .25;\n  background-repeat: no-repeat;\n  background-image: url(data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNDcxIDQ2NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSI2Ni42NiUiIHN0b3AtY29sb3I9IiNmZmYiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNmZmYiIHN0b3Atb3BhY2l0eT0iMCIvPjwvbGluZWFyR3JhZGllbnQ+PHBhdGggZmlsbD0idXJsKCNhKSIgZD0iTTc5IDMwOGMxNC4yNS02LjUgNTQuMjUtMTkuNzUgNzEtMjkgOS0zLjI1IDI1LTIxIDI1LTIxczMuNzUtMTMgMy0yMmMtMS43NS02Ljc1LTE1LTQzLTE1LTQzLTIuNSAzLTQuNzQxIDMuMjU5LTcgMS0zLjI1LTcuNS0yMC41LTQ0LjUtMTYtNTcgMS4yNS03LjUgMTAtNiAxMC02LTExLjI1LTMzLjc1LTgtNjctOC02N3MuMDczLTcuMzQ2IDYtMTVjLTMuNDguNjM3LTkgNC05IDQgMi41NjMtMTEuNzI3IDE1LTIxIDE1LTIxIC4xNDgtLjMxMi0xLjMyMS0xLjQ1NC0xMCAxIDEuNS0yLjc4IDE2LjY3NS04LjY1NCAzMC0xMSAzLjc4Ny05LjM2MSAxMi43ODItMTcuMzk4IDIyLTIyLTIuMzY1IDMuMTMzLTMgNi0zIDZzMTUuNjQ3LTguMDg4IDQxLTZjLTE5Ljc1IDItMjQgNi0yNCA2czc0LjUtMTAuNzUgMTA0IDM3YzcuNSA5LjUgMjQuNzUgNTUuNzUgMTAgODkgMy43NS0xLjUgNC41LTQuNSA5IDEgLjI1IDE0Ljc1LTExLjUgNjMtMTkgNjItMi43NSAxLTQtMy00LTMtMTAuNzUgMjkuNS0xNCAzOC0xNCAzOC0yIDQuMjUtMy43NSAxOC41LTEgMjIgMS4yNSA0LjUgMjMgMjMgMjMgMjNsMTI3IDUzYzM3IDM1IDIzIDEzNSAyMyAxMzVMMCA0NjRzLTMtOTYuNzUgMTQtMTIwYzUuMjUtNi4yNSAyMS43NS0xOS43NSA2NS0zNnoiLz48L3N2Zz4=);\n  background-size: auto 76%;\n}\n\n.OT_fit-mode-cover .OT_video-element {\n  -o-object-fit: cover;\n  object-fit: cover;\n}\n\n/* Workaround for iOS freezing issue when cropping videos */\n\n/* https://bugs.webkit.org/show_bug.cgi?id=176439 */\n\n@media only screen and (orientation: portrait) {\n  .OT_subscriber.OT_ForceContain.OT_fit-mode-cover .OT_video-element {\n    -o-object-fit: contain !important;\n    object-fit: contain !important;\n  }\n}\n\n.OT_fit-mode-contain .OT_video-element {\n  -o-object-fit: contain;\n  object-fit: contain;\n}\n\n.OT_fit-mode-cover .OT_video-poster {\n  background-position: center bottom;\n}\n\n.OT_fit-mode-contain .OT_video-poster {\n  background-position: center;\n}\n\n.OT_audio-level-meter {\n  position: absolute;\n  width: 25%;\n  max-width: 224px;\n  min-width: 21px;\n  top: 0;\n  right: 0;\n  overflow: hidden;\n}\n\n.OT_audio-level-meter:before {\n  /* makes the height of the container equals its width */\n  content: '';\n  display: block;\n  padding-top: 100%;\n}\n\n.OT_audio-level-meter__bar {\n  position: absolute;\n  width: 192%;\n  /* meter value can overflow of 8% */\n  height: 192%;\n  top: -96%/* half of the size */\n  ;\n  right: -96%;\n  border-radius: 50%;\n  background-color: rgba(0, 0, 0, .8);\n}\n\n.OT_audio-level-meter__audio-only-img {\n  position: absolute;\n  top: 22%;\n  right: 15%;\n  width: 40%;\n  opacity: .7;\n  background: url(data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzkgODYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0iI2ZmZiI+PHBhdGggZD0iTTkuNzU3IDQwLjkyNGMzLjczOC01LjE5MSAxMi43MTEtNC4zMDggMTIuNzExLTQuMzA4IDIuMjIzIDMuMDE0IDUuMTI2IDI0LjU4NiAzLjYyNCAyOC43MTgtMS40MDEgMS4zMDEtMTEuNjExIDEuNjI5LTEzLjM4LTEuNDM2LTEuMjI2LTguODA0LTIuOTU1LTIyLjk3NS0yLjk1NS0yMi45NzV6bTU4Ljc4NSAwYy0zLjczNy01LjE5MS0xMi43MTEtNC4zMDgtMTIuNzExLTQuMzA4LTIuMjIzIDMuMDE0LTUuMTI2IDI0LjU4Ni0zLjYyNCAyOC43MTggMS40MDEgMS4zMDEgMTEuNjExIDEuNjI5IDEzLjM4LTEuNDM2IDEuMjI2LTguODA0IDIuOTU1LTIyLjk3NSAyLjk1NS0yMi45NzV6Ii8+PHBhdGggZD0iTTY4LjY0NyA1OC42Yy43MjktNC43NTMgMi4zOC05LjU2MSAyLjM4LTE0LjgwNCAwLTIxLjQxMi0xNC4xMTUtMzguNzctMzEuNTI4LTM4Ljc3LTE3LjQxMiAwLTMxLjUyNyAxNy4zNTgtMzEuNTI3IDM4Ljc3IDAgNC41NDEuNTE1IDguOTM2IDEuODAyIDEyLjk1IDEuNjk4IDUuMjk1LTUuNTQyIDYuOTkxLTYuNjE2IDIuMDczQzIuNDEgNTUuMzk0IDAgNTEuNzg3IDAgNDguMTAzIDAgMjEuNTM2IDE3LjY4NSAwIDM5LjUgMCA2MS4zMTYgMCA3OSAyMS41MzYgNzkgNDguMTAzYzAgLjcxOC0yLjg5OSA5LjY5My0zLjI5MiAxMS40MDgtLjc1NCAzLjI5My03Ljc1MSAzLjU4OS03LjA2MS0uOTEyeiIvPjxwYXRoIGQ9Ik01LjA4NCA1MS4zODVjLS44MDQtMy43ODIuNTY5LTcuMzM1IDMuMTM0LTcuOTIxIDIuNjM2LS42MDMgNS40ODUgMi4xNSA2LjI4OSA2LjEzMi43OTcgMy45NDgtLjc1MiA3LjQ1Ny0zLjM4OCA3Ljg1OS0yLjU2Ni4zOTEtNS4yMzctMi4zMTgtNi4wMzQtNi4wN3ptNjguODM0IDBjLjgwNC0zLjc4Mi0uNTY4LTcuMzM1LTMuMTMzLTcuOTIxLTIuNjM2LS42MDMtNS40ODUgMi4xNS02LjI4OSA2LjEzMi0uNzk3IDMuOTQ4Ljc1MiA3LjQ1NyAzLjM4OSA3Ljg1OSAyLjU2NS4zOTEgNS4yMzctMi4zMTggNi4wMzQtNi4wN3ptLTIuMDM4IDguMjg4Yy0uOTI2IDE5LjY1OS0xNS4xMTIgMjQuNzU5LTI1Ljg1OSAyMC40NzUtNS40MDUtLjYwNi0zLjAzNCAxLjI2Mi0zLjAzNCAxLjI2MiAxMy42NjEgMy41NjIgMjYuMTY4IDMuNDk3IDMxLjI3My0yMC41NDktLjU4NS00LjUxMS0yLjM3OS0xLjE4Ny0yLjM3OS0xLjE4N3oiLz48cGF0aCBkPSJNNDEuNjYyIDc4LjQyMmw3LjU1My41NWMxLjE5Mi4xMDcgMi4xMiAxLjE1MyAyLjA3MiAyLjMzNWwtLjEwOSAyLjczOGMtLjA0NyAxLjE4Mi0xLjA1MSAyLjA1NC0yLjI0MyAxLjk0NmwtNy41NTMtLjU1Yy0xLjE5MS0uMTA3LTIuMTE5LTEuMTUzLTIuMDcyLTIuMzM1bC4xMDktMi43MzdjLjA0Ny0xLjE4MiAxLjA1Mi0yLjA1NCAyLjI0My0xLjk0N3oiLz48L2c+PC9zdmc+) no-repeat center;\n}\n\n.OT_audio-level-meter__audio-only-img:before {\n  /* makes the height of the container equals its width */\n  content: '';\n  display: block;\n  padding-top: 100%;\n}\n\n.OT_audio-level-meter__value {\n  position: absolute;\n  border-radius: 50%;\n  background-image: radial-gradient(circle, rgba(151, 206, 0, 1) 0%, rgba(151, 206, 0, 0) 100%);\n}\n\n.OT_audio-level-meter.OT_mode-off {\n  display: none;\n}\n\n.OT_audio-level-meter.OT_mode-on, .OT_audio-only .OT_audio-level-meter.OT_mode-auto {\n  display: block;\n}\n\n.OT_audio-only.OT_publisher .OT_video-element, .OT_audio-only.OT_subscriber .OT_video-element {\n  display: none;\n}\n\n.OT_video-disabled-indicator {\n  opacity: 1;\n  border: none;\n  display: none;\n  position: absolute;\n  background-color: transparent;\n  background-repeat: no-repeat;\n  background-position: bottom right;\n  pointer-events: none;\n  top: 0;\n  left: 0;\n  bottom: 3px;\n  right: 3px;\n}\n\n.OT_video-disabled {\n  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFIAAAAoCAYAAABtla08AAAINUlEQVR42u2aaUxUVxTHcRBmAAEBRVTK4sKwDIsg+wCK7CqIw1CN1YobbbS2qYlJ06Qx1UpdqMbYWq2pSzWmH6ytNbXWJY1Lq7VuqBERtW64V0XFLYae0/xvcp3MMAMzDz6IyT/ge2ce5/7ucpY3Ts3NzZ1ygF57AJ0gO0G2jyZPmdbFyclJSAV1EeoEaUUSLGdSV5KLLFxzFmA7QVqGqDqjixhWkxCVeyRVl38wM6bwj6yYItYK47BAuu9B0gCqs6Ng2r494KQtkj/Dz2jHraw6qw2fdSE4rNmcCPCvZONP8iF1I6kdBdMaQJWZLeJqRWa2kPJAxXY+GxE+zxLI03GRh8lGSwoi9WCY8FWlCEh+8JOnT7MfPGjMuXX7Tt61hoaCi/9cKmKdv3BxeEtim/UbNpnbQiqF4MmT7kqrbr4lkMcTo46TTSpJB5g+8NHuVWnWuaampvhmO/7duHmrGluoO4C6OsJZGRrkDIld43ZqUOTnlkDSmXmabAoBU0vqBf+6KgFSxQ9++uzZ8rZApM81TJ8xM5me0Z/UF7PuBmdVdkGEb5gYDeQmyZNW3SJLIP9Kj64lGyMpmxRN6sOfIbkoAhKOdnv2/PmB1kB88eLFo+olyyrps3rSINIAzLonnqlqK8R9w+L86vtrt5L2nhug3Vc3ULu/Liz8AOuXESlZZONH6kmr7gtLIA9lRNeRzVukAvj3BslLnJNKgfScO69K+/Lly0ZbQW7e8tNK+pwBjqaSIjDrXgJkW1ciAZvbQjQ+RDahpBBKd5ZZsqN758hmImk4KQHnpDd8UwSkCyJarx07d4+3BeKJmlMHyX4qaRxpBCmNFE4KENvHDpAutVERn1kCVBMfeRRgYvZnx62wZPdnZkw92VQA5GClQXYRBze2S+iJmpPVVoJLA9l9QKokjcWKTCT1R5rhLg70NuSsziT16diIKkuAjibrTpJNDkn/e17CahtAjlAWJAYkb29Sb1LE9Rs391kILk8mVkyuIpuZcLKUlEmKkra1WuSTNuesEPzwoEploSVAh9Oiz+BIyd9dOHhtx4OEpFpVg6gbNK3yXX1j48N6U5Dz5i/gc/FDrMY3sTLiSMEkXxGxzUEUAGnbxlPaksMlHUXWAlHS8URCPseSohZbCSLjSSU7ixLXdzhIWVKq4Y7t2a/2bN0qGeKly1fYsVmk6RgIDz4J0bonyUOcjeYqm/8hRoYbWkigV2NH9CHAS60EkUkkw47hSRs6FqT1LR5AVcsrueXlK1d5AO+RpmBrZZEiefByytPCanRGNLZY0uF52gNDYr9sCRB8MHY0SJu2OJWKS2WQV65e4y31DmkCImEi0hBfufRime0RIhpbKen0/Ny9OYNW2ghyYytABjNIaxNuKttAWk6HPLn0k0FevdZwFinPWFIuKZbUV16NVko6jbWSDoPO3pOf8K0jQWLSQ0S9bdpkYck+m7vfWpAiHfKgBsZiGSSt0FqcTeU8WETqAHE2CgcAVd3Gkm4MD3xXYeI6B4NMItvKbcUpQ9gP+KMWnSsW+TaYJtoo+avBWLoKoK0CCSDud+7eXWQGZAXqV3YoQjQCfixJ8+fzj9ta3JHhlUeJ8wJOY2ws6eRKpPS3oqTvHAESEz9ya0naXL5WH6pt3FqSOhTHkTcKEXc6k1POh4Q9YJu/03TT4a8PoGMFI4i2EqSbOZAYaBkpCyD92RkG6KCSbjI/H0HEISBnlOZPFdcEzI2GTO4KBZICGKyAKLTEmJOB2txf5MbgohBINCl4FTqmpJMB2W+HiRn1Q2l6lXyPmiEP6VVE2TfGoaMYrHyPdtAnyI0jEOn9RLWmNEhvBBE7SjpFQZaShtLK+1S+T12lRwxUvrZlVPp8jE1PikeO7C/nyEqBDCB1t7+kUx4kKUWclea0yZC5BIGpiJSNSD9QgFR0RQKkL6KxHSWdsiARHJNYewoGrzG1/bk4dTPSunL2EyDjcbb7MQ+lQfZmkKiN7SjpFAM5CWAyGcwyY84YsZ1lUcbRNNtQMAdtQWGvQ0DyVjzYAKQfQFodeAeC1C8vzymXIZqD+ZEh/2OyLSalS/3VbnJZ+VqDXGjMrTCFuK4s66vVZUNfqaDolcbjOcb899sLpEE+I20GifywXe2QR3KElu99PzqjGufhREqB1pjCnG3IL3fY1v733r2FMsiGhutn0LAoJWWIGbPxjKwgjUbF0m52mPhigrpdXOecEq9pR6MkHbu2LOtrcZ9y3d0ODTb15y9MePz48aF79+8fvXnr9sljx2u2I7KNxDuaMPGVECoRs7mC4eT7SIruFNfNHK15MKuM2evwNq+4qjxvGnd5CHwNNynawW4cOlUZdG8b55IIJHmkItwrZHH6QxB3OSL9kTtAGpIvZiQB3Z4SKBfXQtEE9sashWAW87Bt3sYZNR6zn4uzJwWDKUKXfaKCdqUoBpLxSjYe9nqGiwWRBGipuGZ3Qm76itYLbbJI/PEhUApfw73uOIy9xfse3M9F9BuFJHcYrseSouGkHtCVtkuGTTikI8XgZzhg9SeF4VqcvSWiaSvNHQ8JwkNjIfEHemCmNLD1RaEfLs18mlgNuN6PFALHo7CyU5W2g00gFAQF4ozvibH04muwDbWraSFAyt/AAMzewgGR8uCeWn77xzBxPxgzPRCDDMZ14bQ/3jqGKGoHf2Hjgx3kw5LbaJDYWb52t9FMgw4AuWNWukNeuOYqOsmQi2jgws4PA/DD/z0B2x0/veCs4naw0cgybezid7X9jV3rX2RSs0wfLkll4pBGcgifg+NYxe1kJ2ycTaRq66uG/wBOl0vjcw70xwAAAABJRU5ErkJggg==);\n  background-size: 33px auto;\n}\n\n.OT_video-disabled-warning {\n  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFIAAAAoCAYAAABtla08AAAGMElEQVR4Ae2aA7D0yBaAc7oH12vbRmlLaxYWb23btm3btm2899a2bWuYtPZ01cmtU9lJrib315yqr9I3Oem/5/s7acwEnehEJzoxCcX2O+wEeIgRBDDaGjAZOgQ6ihRpLklHZDJIXK1WWymMIhGGkVBKCWMM+Iv/f/b5t7faYtM/sGgIS7j8RNLjceUVl41GvGN1BFiHy9sgtRWaYbhvuVQ6o1VOvV5/tLe3dyssKoZuh8xClkDEi2MMS6ZjR0cScxdK/+HgnJsmLccYOx0e/PUGUqfTJDEHkV5go9lcMQoj4R8RpSIRRUr4a9baTJFCCNfqESKJ7RYJibK0xoi05EhFRTxMi1Rit6xHAuLaKRLwEVi6q1x+EhlVpd3d3Wfh4VQkQhRhxthYLg7SRGqdLlIp7UVOHf+JhEhEMscUolVje3p63saeeOFoKsT7fjj++BNuw2I/0ouUENmGaQcQEilQvUU6xuWC0kqmVWCt8df6kG7WLoFA20VSCOyNh0RKPT+SyrTWtQsvuvTYCy84z3+oAdbgAiLGIvHjTz6bFuu/B3lKKfVkFKknwih6EnnipZdfXQZzepAupXSGSCfwUGZtkrx3t/0dSQGnnXbmdocdetArQoj+4VR23wMP3bj/vnv9Sv/rBmkish09ca655thHSrlWq4TFF1vkNDxsgjiUnPqZnHPABIq47jx7pPMcecShfz7x1DO7D6eit99576X1113nVd8rqLGAuDaNitJonTGIqHgQGQjDsJglMrUH5iDSEQbRa6y2yrNvv/PuWVmV/PTzLz8steTit1B9FtGJeZrJksmWdBzBMcami4xUkaY1A1Qe94WIaPGBApJhaERrLrXkElf8+NPPz6YMLs1DDjn0Wn9PnI/UiQadM4jNEkhzVsEGE8nIHESM1j5/KqRX+/IEiOQ/yifNBlEkpnb00cccesbpp13T3983H88/48xzrrvm6it/8U5JXgX5G6nSvSq1R5LATR7aYGkwMG1RSwkWABH+4jUb3vT/uJ1Z0xpjraTBRltrxUQhksIRmgTJyy69+Pv99tv3qYX6FxgU+fU33352xGEHf5wisU7nNWJpZRMkAjZ6aIN1mwV7h29Jo2wCHlveu/GV169z65E+T6koexCh6c+EEiky3lnxQKFjUeVyOeI5AOBzIiayRhJryd7YYnkIHgvB0qk9Tdql6N3XH4bRUIOIIIKJSiRb0hkSEpZKRd1CpEq8GxtIyCVmDSgFl94GacTgaJw1rUlYhYng0c4ewaUsmKRIJjpiqMSOCh9QeI+UYECmtQIsxEu6OorEcv6Rl0gu0woh8MhFkmSCTXVI4pC704WCFRJvSRNJSzrMMEZO2iKZTCHAZYnmvXCny7ed5vfZK3viHSBdIFCKEFj2+nt+73nw8m2uedcLJlktA++VNMEPaR45aYukcKnnCfY3/DFbZS8t7eHxNgsPM0N1hXhJJwwM1QbpoQFlog2R13a/zBxEYHAQEUYUM6qiVwEyBYoM6JFNF2kFLelI5KQf+fVI4dJFCguDS7oAyx2R6SFQJKRedSDj/cMg/RXQ6ZE05GSIDAaXdCi1I3L021SQWNJ1RLY5OiIdL4/yvuw8ADfWPFrSciaMyH8tEQPwf1uGG54g5+KlJGTmsrxsQdl5PKidnPFe2QS///7Hu+VS6WX/HYnf0sevGL7lXydwod2/9DykZq0s5yff0sgSWCigNOH7TPHL7ufj+/TH8P/+qYpL4HkBDiRYpEXeM8/89/9zzjn7EtY64dfd1nqccM7Bs8+9MKy8555/8TnKS+5MufH6EZVASkgPzf+mJXroet17JirU0ALST3nT0y5ONyLpeo1y64ih+vuQfsoTOeRFSJXa+SvyB90TUmdw49EjLaKpMQ0mzEeTzkWsd/oI6fzfiKM8gWg6X6OjpXstu5ZHnmIb0GFiu29MIUfUewkmVrEN3RqVQ/bY8FzNcquMBv/pCNUZ5pHHem01KdN/I/DG66/lLhKSvTO5M84kav5C5z2ZfyAivi9i9VGd45RH7UWJbjwGG/7NYsRECt7jiOToHedKAui8SW4CsxyRc54mKH/8f7ELhCCACyNcIl/wI+FaAJyc8yzRtinQPzWzuFZrFHq/AAAAAElFTkSuQmCC);\n  background-size: 33px auto;\n}\n\n.OT_video-disabled-indicator.OT_active {\n  display: block;\n}\n\n.OT_audio-blocked-indicator {\n  opacity: 1;\n  border: none;\n  display: none;\n  position: absolute;\n  background-color: transparent;\n  background-repeat: no-repeat;\n  background-position: center;\n  pointer-events: none;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  right: 0;\n}\n\n.OT_audio-blocked {\n  background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMTUwIiBoZWlnaHQ9IjkwIj48ZGVmcz48cGF0aCBkPSJNNjcgMTJMNi40NDggNzIuNTUyIDAgMzFWMThMMjYgMGw0MSAxMnptMyA3bDYgNDctMjkgMTgtMzUuNTAyLTYuNDk4TDcwIDE5eiIgaWQ9ImEiLz48L2RlZnM+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSI5MCIgcng9IjM1IiByeT0iNDUiIG9wYWNpdHk9Ii41Ii8+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzNikiPjxtYXNrIGlkPSJiIiBmaWxsPSIjZmZmIj48dXNlIHhsaW5rOmhyZWY9IiNhIi8+PC9tYXNrPjxwYXRoIGQ9Ik0zOS4yNDkgNTEuMzEyYy42OTcgMTAuMzcgMi43ODUgMTcuODk3IDUuMjUxIDE3Ljg5NyAzLjAzOCAwIDUuNS0xMS40MTcgNS41LTI1LjVzLTIuNDYyLTI1LjUtNS41LTI1LjVjLTIuNTEgMC00LjYyOCA3Ljc5Ny01LjI4NyAxOC40NTNBOC45ODkgOC45ODkgMCAwIDEgNDMgNDRhOC45ODggOC45ODggMCAwIDEtMy43NTEgNy4zMTJ6TTIwLjk4NSAzMi4yMjRsMTUuNzQ2LTE2Ljg3N2E3LjM4NSA3LjM4NSAwIDAgMSAxMC4zNzQtLjQyQzUxLjcwMiAxOS4xMTQgNTQgMjkuMjA4IDU0IDQ1LjIwOGMwIDE0LjUyNy0yLjM0MyAyMy44OC03LjAzIDI4LjA1OGE3LjI4IDcuMjggMCAwIDEtMTAuMTY4LS40NjhMMjAuNDA1IDU1LjIyNEgxMmE1IDUgMCAwIDEtNS01di0xM2E1IDUgMCAwIDEgNS01aDguOTg1eiIgZmlsbD0iI0ZGRiIgbWFzaz0idXJsKCNiKSIvPjwvZz48cGF0aCBkPSJNMTA2LjUgMTMuNUw0NC45OTggNzUuMDAyIiBzdHJva2U9IiNGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9nPjwvc3ZnPg==);\n  background-size: 90px auto;\n}\n\n.OT_container-audio-blocked {\n  cursor: pointer;\n}\n\n.OT_container-audio-blocked.OT_mini .OT_edge-bar-item {\n  display: none;\n}\n\n.OT_container-audio-blocked .OT_mute {\n  display: none;\n}\n\n.OT_audio-blocked-indicator.OT_active {\n  display: block;\n}\n\n.OT_video-unsupported {\n  opacity: 1;\n  border: none;\n  display: none;\n  position: absolute;\n  background-color: transparent;\n  background-repeat: no-repeat;\n  background-position: center;\n  background-image: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTciIGhlaWdodD0iOTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPjxkZWZzPjxwYXRoIGQ9Ik03MCAxMkw5LjQ0OCA3Mi41NTIgMCA2MmwzLTQ0TDI5IDBsNDEgMTJ6bTggMmwxIDUyLTI5IDE4LTM1LjUwMi02LjQ5OEw3OCAxNHoiIGlkPSJhIi8+PC9kZWZzPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoOCAzKSI+PG1hc2sgaWQ9ImIiIGZpbGw9IiNmZmYiPjx1c2UgeGxpbms6aHJlZj0iI2EiLz48L21hc2s+PHBhdGggZD0iTTkuMTEgMjAuOTY4SDQ4LjFhNSA1IDAgMCAxIDUgNVY1OC4xOGE1IDUgMCAwIDEtNSA1SDkuMTFhNSA1IDAgMCAxLTUtNVYyNS45N2E1IDUgMCAwIDEgNS01em00Ny4wOCAxMy4zOTRjMC0uMzQ1IDUuNDcyLTMuMTU5IDE2LjQxNS04LjQ0M2EzIDMgMCAwIDEgNC4zMDQgMi43MDJ2MjYuODM1YTMgMyAwIDAgMS00LjMwNSAyLjcwMWMtMTAuOTQyLTUuMjg2LTE2LjQxMy04LjEtMTYuNDEzLTguNDQ2VjM0LjM2MnoiIGZpbGw9IiNGRkYiIG1hc2s9InVybCgjYikiLz48L2c+PHBhdGggZD0iTTgxLjUgMTYuNUwxOS45OTggNzguMDAyIiBzdHJva2U9IiNGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9nPjwvc3ZnPg==);\n  background-size: 58px auto;\n  pointer-events: none;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  right: 0;\n  margin-top: -30px;\n}\n\n.OT_video-unsupported-bar {\n  display: none;\n  position: absolute;\n  width: 192%;\n  /* copy the size of the audio meter bar for symmetry */\n  height: 192%;\n  top: -96%/* half of the size */\n  ;\n  left: -96%;\n  border-radius: 50%;\n  background-color: rgba(0, 0, 0, .8);\n}\n\n.OT_video-unsupported-img {\n  display: none;\n  position: absolute;\n  top: 11%;\n  left: 15%;\n  width: 70%;\n  opacity: .7;\n  background-image: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTciIGhlaWdodD0iOTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPjxkZWZzPjxwYXRoIGQ9Ik03MCAxMkw5LjQ0OCA3Mi41NTIgMCA2MmwzLTQ0TDI5IDBsNDEgMTJ6bTggMmwxIDUyLTI5IDE4LTM1LjUwMi02LjQ5OEw3OCAxNHoiIGlkPSJhIi8+PC9kZWZzPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoOCAzKSI+PG1hc2sgaWQ9ImIiIGZpbGw9IiNmZmYiPjx1c2UgeGxpbms6aHJlZj0iI2EiLz48L21hc2s+PHBhdGggZD0iTTkuMTEgMjAuOTY4SDQ4LjFhNSA1IDAgMCAxIDUgNVY1OC4xOGE1IDUgMCAwIDEtNSA1SDkuMTFhNSA1IDAgMCAxLTUtNVYyNS45N2E1IDUgMCAwIDEgNS01em00Ny4wOCAxMy4zOTRjMC0uMzQ1IDUuNDcyLTMuMTU5IDE2LjQxNS04LjQ0M2EzIDMgMCAwIDEgNC4zMDQgMi43MDJ2MjYuODM1YTMgMyAwIDAgMS00LjMwNSAyLjcwMWMtMTAuOTQyLTUuMjg2LTE2LjQxMy04LjEtMTYuNDEzLTguNDQ2VjM0LjM2MnoiIGZpbGw9IiNGRkYiIG1hc2s9InVybCgjYikiLz48L2c+PHBhdGggZD0iTTgxLjUgMTYuNUwxOS45OTggNzguMDAyIiBzdHJva2U9IiNGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9nPjwvc3ZnPg==);\n  background-repeat: no-repeat;\n  background-position: center;\n  background-size: 100% auto;\n}\n\n.OT_video-unsupported-img:before {\n  /* makes the height of the container 93% of its width (90/97 px) */\n  content: '';\n  display: block;\n  padding-top: 93%;\n}\n\n.OT_video-unsupported-text {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  text-align: center;\n  height: 100%;\n  margin-top: 40px;\n}"

/***/ }),

/***/ "./src/app/components/layouts/layout-best-fit/layout-best-fit.component.html":
/*!***********************************************************************************!*\
  !*** ./src/app/components/layouts/layout-best-fit/layout-best-fit.component.html ***!
  \***********************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<div id=\"layout\" class=\"bounds\">\n  <div *ngFor=\"let s of subscribers\" class=\"OT_root OT_publisher custom-class\">\n    <div class=\"OT_widget-container\">\n      <app-ov-video [subscriber]=\"s\"></app-ov-video>\n    </div>\n  </div>\n</div>\n"

/***/ }),

/***/ "./src/app/components/layouts/layout-best-fit/layout-best-fit.component.ts":
/*!*********************************************************************************!*\
  !*** ./src/app/components/layouts/layout-best-fit/layout-best-fit.component.ts ***!
  \*********************************************************************************/
/*! exports provided: LayoutBestFitComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "LayoutBestFitComponent", function() { return LayoutBestFitComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_router__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/router */ "./node_modules/@angular/router/fesm5/router.js");
/* harmony import */ var openvidu_browser__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! openvidu-browser */ "../../../../openvidu-browser/lib/index.js");
/* harmony import */ var openvidu_browser__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(openvidu_browser__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _openvidu_layout__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../openvidu-layout */ "./src/app/components/layouts/openvidu-layout.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};




var LayoutBestFitComponent = /** @class */ (function () {
    function LayoutBestFitComponent(route, appRef) {
        var _this = this;
        this.route = route;
        this.appRef = appRef;
        this.subscribers = [];
        this.numberOfScreenStreams = 0;
        this.layoutOptions = {
            maxRatio: 3 / 2,
            minRatio: 9 / 16,
            fixedRatio: false,
            bigClass: 'OV_big',
            bigPercentage: 0.8,
            bigFixedRatio: false,
            bigMaxRatio: 3 / 2,
            bigMinRatio: 9 / 16,
            bigFirst: true,
            animate: true // Whether you want to animate the transitions
        };
        this.route.params.subscribe(function (params) {
            _this.sessionId = params.sessionId;
            _this.secret = params.secret;
        });
    }
    LayoutBestFitComponent.prototype.beforeunloadHandler = function () {
        this.leaveSession();
    };
    LayoutBestFitComponent.prototype.sizeChange = function (event) {
        var _this = this;
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(function () {
            _this.openviduLayout.updateLayout();
        }, 20);
    };
    LayoutBestFitComponent.prototype.ngOnDestroy = function () {
        this.leaveSession();
    };
    LayoutBestFitComponent.prototype.ngOnInit = function () {
        var _this = this;
        var OV = new openvidu_browser__WEBPACK_IMPORTED_MODULE_2__["OpenVidu"]();
        this.session = OV.initSession();
        this.session.on('streamCreated', function (event) {
            var changeFixedRatio = false;
            if (event.stream.typeOfVideo === 'SCREEN') {
                _this.numberOfScreenStreams++;
                changeFixedRatio = true;
            }
            var subscriber = _this.session.subscribe(event.stream, undefined);
            subscriber.on('streamPlaying', function (e) {
                var video = subscriber.videos[0].video;
                video.parentElement.parentElement.classList.remove('custom-class');
                _this.updateLayout(changeFixedRatio);
            });
            _this.addSubscriber(subscriber);
        });
        this.session.on('streamDestroyed', function (event) {
            var changeFixedRatio = false;
            if (event.stream.typeOfVideo === 'SCREEN') {
                _this.numberOfScreenStreams--;
                changeFixedRatio = true;
            }
            _this.deleteSubscriber(event.stream.streamManager);
            _this.updateLayout(changeFixedRatio);
        });
        var port = !!location.port ? (':' + location.port) : '';
        var token = 'wss://' + location.hostname + port + '?sessionId=' + this.sessionId + '&secret=' + this.secret + '&recorder=true';
        this.session.connect(token)
            .catch(function (error) {
            console.error(error);
        });
        this.openviduLayout = new _openvidu_layout__WEBPACK_IMPORTED_MODULE_3__["OpenViduLayout"]();
        this.openviduLayout.initLayoutContainer(document.getElementById('layout'), this.layoutOptions);
    };
    LayoutBestFitComponent.prototype.addSubscriber = function (subscriber) {
        this.subscribers.push(subscriber);
        this.appRef.tick();
    };
    LayoutBestFitComponent.prototype.deleteSubscriber = function (subscriber) {
        var index = -1;
        for (var i = 0; i < this.subscribers.length; i++) {
            if (this.subscribers[i] === subscriber) {
                index = i;
                break;
            }
        }
        if (index > -1) {
            this.subscribers.splice(index, 1);
        }
        this.appRef.tick();
    };
    LayoutBestFitComponent.prototype.leaveSession = function () {
        if (this.session) {
            this.session.disconnect();
        }
        ;
        this.subscribers = [];
        this.session = null;
    };
    LayoutBestFitComponent.prototype.updateLayout = function (changeFixedRatio) {
        if (changeFixedRatio) {
            this.layoutOptions.fixedRatio = this.numberOfScreenStreams > 0;
            this.openviduLayout.setLayoutOptions(this.layoutOptions);
        }
        this.openviduLayout.updateLayout();
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostListener"])('window:beforeunload'),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], LayoutBestFitComponent.prototype, "beforeunloadHandler", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostListener"])('window:resize', ['$event']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object]),
        __metadata("design:returntype", void 0)
    ], LayoutBestFitComponent.prototype, "sizeChange", null);
    LayoutBestFitComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-layout-best-fit',
            template: __webpack_require__(/*! ./layout-best-fit.component.html */ "./src/app/components/layouts/layout-best-fit/layout-best-fit.component.html"),
            styles: [__webpack_require__(/*! ./layout-best-fit.component.css */ "./src/app/components/layouts/layout-best-fit/layout-best-fit.component.css")],
            encapsulation: _angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewEncapsulation"].None
        }),
        __metadata("design:paramtypes", [_angular_router__WEBPACK_IMPORTED_MODULE_1__["ActivatedRoute"], _angular_core__WEBPACK_IMPORTED_MODULE_0__["ApplicationRef"]])
    ], LayoutBestFitComponent);
    return LayoutBestFitComponent;
}());



/***/ }),

/***/ "./src/app/components/layouts/openvidu-layout.ts":
/*!*******************************************************!*\
  !*** ./src/app/components/layouts/openvidu-layout.ts ***!
  \*******************************************************/
/*! exports provided: OpenViduLayout */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "OpenViduLayout", function() { return OpenViduLayout; });
var OpenViduLayout = /** @class */ (function () {
    function OpenViduLayout() {
    }
    OpenViduLayout.prototype.fixAspectRatio = function (elem, width) {
        var sub = elem.querySelector('.OT_root');
        if (sub) {
            // If this is the parent of a subscriber or publisher then we need
            // to force the mutation observer on the publisher or subscriber to
            // trigger to get it to fix it's layout
            var oldWidth = sub.style.width;
            sub.style.width = width + 'px';
            // sub.style.height = height + 'px';
            sub.style.width = oldWidth || '';
        }
    };
    OpenViduLayout.prototype.positionElement = function (elem, x, y, width, height, animate) {
        var _this = this;
        var targetPosition = {
            left: x + 'px',
            top: y + 'px',
            width: width + 'px',
            height: height + 'px'
        };
        this.fixAspectRatio(elem, width);
        if (animate && $) {
            $(elem).stop();
            $(elem).animate(targetPosition, animate.duration || 200, animate.easing || 'swing', function () {
                _this.fixAspectRatio(elem, width);
                if (animate.complete) {
                    animate.complete.call(_this);
                }
            });
        }
        else {
            $(elem).css(targetPosition);
        }
        this.fixAspectRatio(elem, width);
    };
    OpenViduLayout.prototype.getVideoRatio = function (elem) {
        if (!elem) {
            return 3 / 4;
        }
        var video = elem.querySelector('video');
        if (video && video.videoHeight && video.videoWidth) {
            return video.videoHeight / video.videoWidth;
        }
        else if (elem.videoHeight && elem.videoWidth) {
            return elem.videoHeight / elem.videoWidth;
        }
        return 3 / 4;
    };
    OpenViduLayout.prototype.getCSSNumber = function (elem, prop) {
        var cssStr = $(elem).css(prop);
        return cssStr ? parseInt(cssStr, 10) : 0;
    };
    // Really cheap UUID function
    OpenViduLayout.prototype.cheapUUID = function () {
        return (Math.random() * 100000000).toFixed(0);
    };
    OpenViduLayout.prototype.getHeight = function (elem) {
        var heightStr = $(elem).css('height');
        return heightStr ? parseInt(heightStr, 10) : 0;
    };
    OpenViduLayout.prototype.getWidth = function (elem) {
        var widthStr = $(elem).css('width');
        return widthStr ? parseInt(widthStr, 10) : 0;
    };
    OpenViduLayout.prototype.getBestDimensions = function (minR, maxR, count, WIDTH, HEIGHT, targetHeight) {
        var maxArea, targetCols, targetRows, targetWidth, tWidth, tHeight, tRatio;
        // Iterate through every possible combination of rows and columns
        // and see which one has the least amount of whitespace
        for (var i = 1; i <= count; i++) {
            var colsAux = i;
            var rowsAux = Math.ceil(count / colsAux);
            // Try taking up the whole height and width
            tHeight = Math.floor(HEIGHT / rowsAux);
            tWidth = Math.floor(WIDTH / colsAux);
            tRatio = tHeight / tWidth;
            if (tRatio > maxR) {
                // We went over decrease the height
                tRatio = maxR;
                tHeight = tWidth * tRatio;
            }
            else if (tRatio < minR) {
                // We went under decrease the width
                tRatio = minR;
                tWidth = tHeight / tRatio;
            }
            var area = (tWidth * tHeight) * count;
            // If this width and height takes up the most space then we're going with that
            if (maxArea === undefined || (area > maxArea)) {
                maxArea = area;
                targetHeight = tHeight;
                targetWidth = tWidth;
                targetCols = colsAux;
                targetRows = rowsAux;
            }
        }
        return {
            maxArea: maxArea,
            targetCols: targetCols,
            targetRows: targetRows,
            targetHeight: targetHeight,
            targetWidth: targetWidth,
            ratio: targetHeight / targetWidth
        };
    };
    ;
    OpenViduLayout.prototype.arrange = function (children, WIDTH, HEIGHT, offsetLeft, offsetTop, fixedRatio, minRatio, maxRatio, animate) {
        var targetHeight;
        var count = children.length;
        var dimensions;
        if (!fixedRatio) {
            dimensions = this.getBestDimensions(minRatio, maxRatio, count, WIDTH, HEIGHT, targetHeight);
        }
        else {
            // Use the ratio of the first video element we find to approximate
            var ratio = this.getVideoRatio(children.length > 0 ? children[0] : null);
            dimensions = this.getBestDimensions(ratio, ratio, count, WIDTH, HEIGHT, targetHeight);
        }
        // Loop through each stream in the container and place it inside
        var x = 0, y = 0;
        var rows = [];
        var row;
        // Iterate through the children and create an array with a new item for each row
        // and calculate the width of each row so that we know if we go over the size and need
        // to adjust
        for (var i = 0; i < children.length; i++) {
            if (i % dimensions.targetCols === 0) {
                // This is a new row
                row = {
                    children: [],
                    width: 0,
                    height: 0
                };
                rows.push(row);
            }
            var elem = children[i];
            row.children.push(elem);
            var targetWidth = dimensions.targetWidth;
            targetHeight = dimensions.targetHeight;
            // If we're using a fixedRatio then we need to set the correct ratio for this element
            if (fixedRatio) {
                targetWidth = targetHeight / this.getVideoRatio(elem);
            }
            row.width += targetWidth;
            row.height = targetHeight;
        }
        // Calculate total row height adjusting if we go too wide
        var totalRowHeight = 0;
        var remainingShortRows = 0;
        for (var i = 0; i < rows.length; i++) {
            row = rows[i];
            if (row.width > WIDTH) {
                // Went over on the width, need to adjust the height proportionally
                row.height = Math.floor(row.height * (WIDTH / row.width));
                row.width = WIDTH;
            }
            else if (row.width < WIDTH) {
                remainingShortRows += 1;
            }
            totalRowHeight += row.height;
        }
        if (totalRowHeight < HEIGHT && remainingShortRows > 0) {
            // We can grow some of the rows, we're not taking up the whole height
            var remainingHeightDiff = HEIGHT - totalRowHeight;
            totalRowHeight = 0;
            for (var i = 0; i < rows.length; i++) {
                row = rows[i];
                if (row.width < WIDTH) {
                    // Evenly distribute the extra height between the short rows
                    var extraHeight = remainingHeightDiff / remainingShortRows;
                    if ((extraHeight / row.height) > ((WIDTH - row.width) / row.width)) {
                        // We can't go that big or we'll go too wide
                        extraHeight = Math.floor(((WIDTH - row.width) / row.width) * row.height);
                    }
                    row.width += Math.floor((extraHeight / row.height) * row.width);
                    row.height += extraHeight;
                    remainingHeightDiff -= extraHeight;
                    remainingShortRows -= 1;
                }
                totalRowHeight += row.height;
            }
        }
        // vertical centering
        y = ((HEIGHT - (totalRowHeight)) / 2);
        // Iterate through each row and place each child
        for (var i = 0; i < rows.length; i++) {
            row = rows[i];
            // center the row
            var rowMarginLeft = ((WIDTH - row.width) / 2);
            x = rowMarginLeft;
            for (var j = 0; j < row.children.length; j++) {
                var elem = row.children[j];
                var targetWidth = dimensions.targetWidth;
                targetHeight = row.height;
                // If we're using a fixedRatio then we need to set the correct ratio for this element
                if (fixedRatio) {
                    targetWidth = Math.floor(targetHeight / this.getVideoRatio(elem));
                }
                elem.style.position = 'absolute';
                // $(elem).css('position', 'absolute');
                var actualWidth = targetWidth - this.getCSSNumber(elem, 'paddingLeft') -
                    this.getCSSNumber(elem, 'paddingRight') -
                    this.getCSSNumber(elem, 'marginLeft') -
                    this.getCSSNumber(elem, 'marginRight') -
                    this.getCSSNumber(elem, 'borderLeft') -
                    this.getCSSNumber(elem, 'borderRight');
                var actualHeight = targetHeight - this.getCSSNumber(elem, 'paddingTop') -
                    this.getCSSNumber(elem, 'paddingBottom') -
                    this.getCSSNumber(elem, 'marginTop') -
                    this.getCSSNumber(elem, 'marginBottom') -
                    this.getCSSNumber(elem, 'borderTop') -
                    this.getCSSNumber(elem, 'borderBottom');
                this.positionElement(elem, x + offsetLeft, y + offsetTop, actualWidth, actualHeight, animate);
                x += targetWidth;
            }
            y += targetHeight;
        }
    };
    OpenViduLayout.prototype.filterDisplayNone = function (element) {
        return element.style.display !== 'none';
    };
    OpenViduLayout.prototype.updateLayout = function () {
        if (this.layoutContainer.style.display === 'none') {
            return;
        }
        var id = this.layoutContainer.id;
        if (!id) {
            id = 'OT_' + this.cheapUUID();
            this.layoutContainer.id = id;
        }
        var HEIGHT = this.getHeight(this.layoutContainer) -
            this.getCSSNumber(this.layoutContainer, 'borderTop') -
            this.getCSSNumber(this.layoutContainer, 'borderBottom');
        var WIDTH = this.getWidth(this.layoutContainer) -
            this.getCSSNumber(this.layoutContainer, 'borderLeft') -
            this.getCSSNumber(this.layoutContainer, 'borderRight');
        var availableRatio = HEIGHT / WIDTH;
        var offsetLeft = 0;
        var offsetTop = 0;
        var bigOffsetTop = 0;
        var bigOffsetLeft = 0;
        var bigOnes = Array.prototype.filter.call(this.layoutContainer.querySelectorAll('#' + id + '>.' + this.opts.bigClass), this.filterDisplayNone);
        var smallOnes = Array.prototype.filter.call(this.layoutContainer.querySelectorAll('#' + id + '>*:not(.' + this.opts.bigClass + ')'), this.filterDisplayNone);
        if (bigOnes.length > 0 && smallOnes.length > 0) {
            var bigWidth = void 0, bigHeight = void 0;
            if (availableRatio > this.getVideoRatio(bigOnes[0])) {
                // We are tall, going to take up the whole width and arrange small
                // guys at the bottom
                bigWidth = WIDTH;
                bigHeight = Math.floor(HEIGHT * this.opts.bigPercentage);
                offsetTop = bigHeight;
                bigOffsetTop = HEIGHT - offsetTop;
            }
            else {
                // We are wide, going to take up the whole height and arrange the small
                // guys on the right
                bigHeight = HEIGHT;
                bigWidth = Math.floor(WIDTH * this.opts.bigPercentage);
                offsetLeft = bigWidth;
                bigOffsetLeft = WIDTH - offsetLeft;
            }
            if (this.opts.bigFirst) {
                this.arrange(bigOnes, bigWidth, bigHeight, 0, 0, this.opts.bigFixedRatio, this.opts.bigMinRatio, this.opts.bigMaxRatio, this.opts.animate);
                this.arrange(smallOnes, WIDTH - offsetLeft, HEIGHT - offsetTop, offsetLeft, offsetTop, this.opts.fixedRatio, this.opts.minRatio, this.opts.maxRatio, this.opts.animate);
            }
            else {
                this.arrange(smallOnes, WIDTH - offsetLeft, HEIGHT - offsetTop, 0, 0, this.opts.fixedRatio, this.opts.minRatio, this.opts.maxRatio, this.opts.animate);
                this.arrange(bigOnes, bigWidth, bigHeight, bigOffsetLeft, bigOffsetTop, this.opts.bigFixedRatio, this.opts.bigMinRatio, this.opts.bigMaxRatio, this.opts.animate);
            }
        }
        else if (bigOnes.length > 0 && smallOnes.length === 0) {
            this.
                // We only have one bigOne just center it
                arrange(bigOnes, WIDTH, HEIGHT, 0, 0, this.opts.bigFixedRatio, this.opts.bigMinRatio, this.opts.bigMaxRatio, this.opts.animate);
        }
        else {
            this.arrange(smallOnes, WIDTH - offsetLeft, HEIGHT - offsetTop, offsetLeft, offsetTop, this.opts.fixedRatio, this.opts.minRatio, this.opts.maxRatio, this.opts.animate);
        }
    };
    OpenViduLayout.prototype.initLayoutContainer = function (container, opts) {
        this.opts = {
            maxRatio: (opts.maxRatio != null) ? opts.maxRatio : 3 / 2,
            minRatio: (opts.minRatio != null) ? opts.minRatio : 9 / 16,
            fixedRatio: (opts.fixedRatio != null) ? opts.fixedRatio : false,
            animate: (opts.animate != null) ? opts.animate : false,
            bigClass: (opts.bigClass != null) ? opts.bigClass : 'OT_big',
            bigPercentage: (opts.bigPercentage != null) ? opts.bigPercentage : 0.8,
            bigFixedRatio: (opts.bigFixedRatio != null) ? opts.bigFixedRatio : false,
            bigMaxRatio: (opts.bigMaxRatio != null) ? opts.bigMaxRatio : 3 / 2,
            bigMinRatio: (opts.bigMinRatio != null) ? opts.bigMinRatio : 9 / 16,
            bigFirst: (opts.bigFirst != null) ? opts.bigFirst : true
        };
        this.layoutContainer = typeof (container) === 'string' ? $(container) : container;
    };
    OpenViduLayout.prototype.setLayoutOptions = function (options) {
        this.opts = options;
    };
    return OpenViduLayout;
}());



/***/ }),

/***/ "./src/app/components/layouts/ov-video.component.ts":
/*!**********************************************************!*\
  !*** ./src/app/components/layouts/ov-video.component.ts ***!
  \**********************************************************/
/*! exports provided: OpenViduVideoComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "OpenViduVideoComponent", function() { return OpenViduVideoComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var openvidu_browser__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! openvidu-browser */ "../../../../openvidu-browser/lib/index.js");
/* harmony import */ var openvidu_browser__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(openvidu_browser__WEBPACK_IMPORTED_MODULE_1__);
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};


var OpenViduVideoComponent = /** @class */ (function () {
    function OpenViduVideoComponent() {
    }
    OpenViduVideoComponent.prototype.ngAfterViewInit = function () {
        this._subscriber.addVideoElement(this.elementRef.nativeElement);
    };
    Object.defineProperty(OpenViduVideoComponent.prototype, "subscriber", {
        set: function (subscriber) {
            this._subscriber = subscriber;
            if (!!this.elementRef) {
                this._subscriber.addVideoElement(this.elementRef.nativeElement);
            }
        },
        enumerable: true,
        configurable: true
    });
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChild"])('videoElement'),
        __metadata("design:type", _angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"])
    ], OpenViduVideoComponent.prototype, "elementRef", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", openvidu_browser__WEBPACK_IMPORTED_MODULE_1__["Subscriber"]),
        __metadata("design:paramtypes", [openvidu_browser__WEBPACK_IMPORTED_MODULE_1__["Subscriber"]])
    ], OpenViduVideoComponent.prototype, "subscriber", null);
    OpenViduVideoComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-ov-video',
            template: '<video #videoElement></video>'
        })
    ], OpenViduVideoComponent);
    return OpenViduVideoComponent;
}());



/***/ }),

/***/ "./src/app/components/session-details/session-details.component.css":
/*!**************************************************************************!*\
  !*** ./src/app/components/session-details/session-details.component.css ***!
  \**************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ""

/***/ }),

/***/ "./src/app/components/session-details/session-details.component.html":
/*!***************************************************************************!*\
  !*** ./src/app/components/session-details/session-details.component.html ***!
  \***************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<p>\n  session-details works!\n</p>\n"

/***/ }),

/***/ "./src/app/components/session-details/session-details.component.ts":
/*!*************************************************************************!*\
  !*** ./src/app/components/session-details/session-details.component.ts ***!
  \*************************************************************************/
/*! exports provided: SessionDetailsComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "SessionDetailsComponent", function() { return SessionDetailsComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};

var SessionDetailsComponent = /** @class */ (function () {
    function SessionDetailsComponent() {
    }
    SessionDetailsComponent.prototype.ngOnInit = function () {
    };
    SessionDetailsComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-session-details',
            template: __webpack_require__(/*! ./session-details.component.html */ "./src/app/components/session-details/session-details.component.html"),
            styles: [__webpack_require__(/*! ./session-details.component.css */ "./src/app/components/session-details/session-details.component.css")]
        }),
        __metadata("design:paramtypes", [])
    ], SessionDetailsComponent);
    return SessionDetailsComponent;
}());



/***/ }),

/***/ "./src/app/services/info.service.ts":
/*!******************************************!*\
  !*** ./src/app/services/info.service.ts ***!
  \******************************************/
/*! exports provided: InfoService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "InfoService", function() { return InfoService; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};


var InfoService = /** @class */ (function () {
    function InfoService() {
        this.newInfo$ = new rxjs__WEBPACK_IMPORTED_MODULE_1__["Subject"]();
    }
    InfoService.prototype.getInfo = function () {
        return this.info;
    };
    InfoService.prototype.updateInfo = function (info) {
        this.info = info;
        this.newInfo$.next(info);
    };
    InfoService = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Injectable"])(),
        __metadata("design:paramtypes", [])
    ], InfoService);
    return InfoService;
}());



/***/ }),

/***/ "./src/app/services/rest.service.ts":
/*!******************************************!*\
  !*** ./src/app/services/rest.service.ts ***!
  \******************************************/
/*! exports provided: RestService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "RestService", function() { return RestService; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};

var RestService = /** @class */ (function () {
    function RestService() {
    }
    RestService.prototype.getOpenViduPublicUrl = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (!!_this.openviduPublicUrl) {
                resolve(_this.openviduPublicUrl);
            }
            else {
                var url = location.protocol + '//' + location.hostname + ((!!location.port) ? (':' + location.port) : '') +
                    '/config/openvidu-publicurl';
                var http_1 = new XMLHttpRequest();
                http_1.onreadystatechange = function () {
                    if (http_1.readyState === 4) {
                        if (http_1.status === 200) {
                            _this.openviduPublicUrl = http_1.responseText;
                            resolve(http_1.responseText);
                        }
                        else {
                            reject('Error getting OpenVidu publicurl');
                        }
                    }
                    ;
                };
                http_1.open('GET', url, true);
                http_1.send();
            }
        });
    };
    RestService = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Injectable"])()
    ], RestService);
    return RestService;
}());



/***/ }),

/***/ "./src/environments/environment.ts":
/*!*****************************************!*\
  !*** ./src/environments/environment.ts ***!
  \*****************************************/
/*! exports provided: environment */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "environment", function() { return environment; });
// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.
var environment = {
    production: false
};


/***/ }),

/***/ "./src/main.ts":
/*!*********************!*\
  !*** ./src/main.ts ***!
  \*********************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_platform_browser_dynamic__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/platform-browser-dynamic */ "./node_modules/@angular/platform-browser-dynamic/fesm5/platform-browser-dynamic.js");
/* harmony import */ var _app_app_module__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./app/app.module */ "./src/app/app.module.ts");
/* harmony import */ var _environments_environment__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./environments/environment */ "./src/environments/environment.ts");




if (_environments_environment__WEBPACK_IMPORTED_MODULE_3__["environment"].production) {
    Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["enableProdMode"])();
}
Object(_angular_platform_browser_dynamic__WEBPACK_IMPORTED_MODULE_1__["platformBrowserDynamic"])().bootstrapModule(_app_app_module__WEBPACK_IMPORTED_MODULE_2__["AppModule"]);


/***/ }),

/***/ 0:
/*!***************************!*\
  !*** multi ./src/main.ts ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(/*! /home/pablo/Documents/Git/openvidu/openvidu-server/src/angular/frontend/src/main.ts */"./src/main.ts");


/***/ })

},[[0,"runtime","vendor"]]]);
//# sourceMappingURL=main.js.map