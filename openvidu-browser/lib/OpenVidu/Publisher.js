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
var Stream_1 = require("./Stream");
var StreamEvent_1 = require("../OpenViduInternal/Events/StreamEvent");
var VideoElementEvent_1 = require("../OpenViduInternal/Events/VideoElementEvent");
var OpenViduError_1 = require("../OpenViduInternal/Enums/OpenViduError");
var EventEmitter = require("wolfy87-eventemitter");
/**
 * Packs local media streams. Participants can publish it to a session. Initialized with [[OpenVidu.initPublisher]] method
 */
var Publisher = /** @class */ (function () {
    /**
     * @hidden
     */
    function Publisher(targetElement, properties, openvidu) {
        var _this = this;
        this.openvidu = openvidu;
        /**
         * Whether the Publisher has been granted access to the requested input devices or not
         */
        this.accessAllowed = false;
        this.ee = new EventEmitter();
        this.properties = properties;
        this.stream = new Stream_1.Stream(this.session, { publisherProperties: properties, mediaConstraints: {} });
        this.stream.on('video-removed', function (element) {
            _this.ee.emitEvent('videoElementDestroyed', [new VideoElementEvent_1.VideoElementEvent(element, _this, 'videoElementDestroyed')]);
        });
        this.stream.on('stream-destroyed-by-disconnect', function (reason) {
            var streamEvent = new StreamEvent_1.StreamEvent(true, _this, 'streamDestroyed', _this.stream, reason);
            _this.ee.emitEvent('streamDestroyed', [streamEvent]);
            streamEvent.callDefaultBehaviour();
        });
        if (typeof targetElement === 'string') {
            var e = document.getElementById(targetElement);
            if (!!e) {
                this.element = e;
            }
        }
        else if (targetElement instanceof HTMLElement) {
            this.element = targetElement;
        }
        if (!this.element) {
            console.warn("The provided 'targetElement' for the Publisher couldn't be resolved to any HTML element: " + targetElement);
        }
    }
    /**
     * Publish or unpublish the audio stream (if available). Calling this method twice in a row passing same value will have no effect
     * @param value `true` to publish the audio stream, `false` to unpublish it
     */
    Publisher.prototype.publishAudio = function (value) {
        this.stream.getWebRtcPeer().audioEnabled = value;
        console.info("'Publisher' has " + (value ? 'published' : 'unpublished') + ' its audio stream');
    };
    /**
     * Publish or unpublish the video stream (if available). Calling this method twice in a row passing same value will have no effect
     * @param value `true` to publish the video stream, `false` to unpublish it
     */
    Publisher.prototype.publishVideo = function (value) {
        this.stream.getWebRtcPeer().videoEnabled = value;
        console.info("'Publisher' has " + (value ? 'published' : 'unpublished') + ' its video stream');
    };
    /**
     * Call this method before [[Session.publish]] to subscribe to your Publisher's stream as any other user would do. The local video will be automatically replaced by the remote video
     */
    Publisher.prototype.subscribeToRemote = function () {
        this.stream.subscribeToMyRemote();
    };
    /**
     * See [[EventDispatcher.on]]
     */
    Publisher.prototype.on = function (type, handler) {
        var _this = this;
        this.ee.on(type, function (event) {
            if (event) {
                console.info("Event '" + type + "' triggered by 'Publisher'", event);
            }
            else {
                console.info("Event '" + type + "' triggered by 'Publisher'");
            }
            handler(event);
        });
        if (type === 'streamCreated') {
            if (!!this.stream && this.stream.isPublisherPublished) {
                this.ee.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, this, 'streamCreated', this.stream, '')]);
            }
            else {
                this.stream.on('stream-created-by-publisher', function () {
                    _this.ee.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, _this, 'streamCreated', _this.stream, '')]);
                });
            }
        }
        if (type === 'videoElementCreated') {
            if (!!this.stream && this.stream.isVideoELementCreated) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(this.stream.getVideoElement(), this, 'videoElementCreated')]);
            }
            else {
                this.stream.on('video-element-created-by-stream', function (element) {
                    _this.id = element.id;
                    _this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(element.element, _this, 'videoElementCreated')]);
                });
            }
        }
        if (type === 'videoPlaying') {
            var video = this.stream.getVideoElement();
            if (!this.stream.displayMyRemote() && video &&
                video.currentTime > 0 &&
                video.paused === false &&
                video.ended === false &&
                video.readyState === 4) {
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.stream.getVideoElement(), this, 'videoPlaying')]);
            }
            else {
                this.stream.on('video-is-playing', function (element) {
                    _this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(element.element, _this, 'videoPlaying')]);
                });
            }
        }
        if (type === 'remoteVideoPlaying') {
            var video = this.stream.getVideoElement();
            if (this.stream.displayMyRemote() && video &&
                video.currentTime > 0 &&
                video.paused === false &&
                video.ended === false &&
                video.readyState === 4) {
                this.ee.emitEvent('remoteVideoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.stream.getVideoElement(), this, 'remoteVideoPlaying')]);
            }
            else {
                this.stream.on('remote-video-is-playing', function (element) {
                    _this.ee.emitEvent('remoteVideoPlaying', [new VideoElementEvent_1.VideoElementEvent(element.element, _this, 'remoteVideoPlaying')]);
                });
            }
        }
        if (type === 'accessAllowed') {
            if (this.stream.accessIsAllowed) {
                this.ee.emitEvent('accessAllowed');
            }
        }
        if (type === 'accessDenied') {
            if (this.stream.accessIsDenied) {
                this.ee.emitEvent('accessDenied');
            }
        }
        return this;
    };
    /**
     * See [[EventDispatcher.once]]
     */
    Publisher.prototype.once = function (type, handler) {
        var _this = this;
        this.ee.once(type, function (event) {
            if (event) {
                console.info("Event '" + type + "' triggered by 'Publisher'", event);
            }
            else {
                console.info("Event '" + type + "' triggered by 'Publisher'");
            }
            handler(event);
        });
        if (type === 'streamCreated') {
            if (!!this.stream && this.stream.isPublisherPublished) {
                this.ee.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, this, 'streamCreated', this.stream, '')]);
            }
            else {
                this.stream.once('stream-created-by-publisher', function () {
                    _this.ee.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, _this, 'streamCreated', _this.stream, '')]);
                });
            }
        }
        if (type === 'videoElementCreated') {
            if (!!this.stream && this.stream.isVideoELementCreated) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(this.stream.getVideoElement(), this, 'videoElementCreated')]);
            }
            else {
                this.stream.once('video-element-created-by-stream', function (element) {
                    _this.id = element.id;
                    _this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(element.element, _this, 'videoElementCreated')]);
                });
            }
        }
        if (type === 'videoPlaying') {
            var video = this.stream.getVideoElement();
            if (!this.stream.displayMyRemote() && video &&
                video.currentTime > 0 &&
                video.paused === false &&
                video.ended === false &&
                video.readyState === 4) {
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.stream.getVideoElement(), this, 'videoPlaying')]);
            }
            else {
                this.stream.once('video-is-playing', function (element) {
                    _this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(element.element, _this, 'videoPlaying')]);
                });
            }
        }
        if (type === 'remoteVideoPlaying') {
            var video = this.stream.getVideoElement();
            if (this.stream.displayMyRemote() && video &&
                video.currentTime > 0 &&
                video.paused === false &&
                video.ended === false &&
                video.readyState === 4) {
                this.ee.emitEvent('remoteVideoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.stream.getVideoElement(), this, 'remoteVideoPlaying')]);
            }
            else {
                this.stream.once('remote-video-is-playing', function (element) {
                    _this.ee.emitEvent('remoteVideoPlaying', [new VideoElementEvent_1.VideoElementEvent(element.element, _this, 'remoteVideoPlaying')]);
                });
            }
        }
        if (type === 'accessAllowed') {
            if (this.stream.accessIsAllowed) {
                this.ee.emitEvent('accessAllowed');
            }
        }
        if (type === 'accessDenied') {
            if (this.stream.accessIsDenied) {
                this.ee.emitEvent('accessDenied');
            }
        }
        return this;
    };
    /**
     * See [[EventDispatcher.off]]
     */
    Publisher.prototype.off = function (type, handler) {
        if (!handler) {
            this.ee.removeAllListeners(type);
        }
        else {
            this.ee.off(type, handler);
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
                _this.stream.accessIsDenied = true;
                _this.stream.accessIsAllowed = false;
                reject(openViduError);
            };
            var successCallback = function (mediaStream) {
                _this.stream.accessIsAllowed = true;
                _this.stream.accessIsDenied = false;
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
                _this.stream.insertVideo(_this.element, _this.properties.insertMode);
                resolve();
            };
            _this.openvidu.generateMediaConstraints(_this.properties)
                .then(function (constraints) {
                var outboundStreamOptions = {
                    mediaConstraints: constraints,
                    publisherProperties: _this.properties
                };
                _this.stream.setOutboundStreamOptions(outboundStreamOptions);
                // Ask independently for audio stream and video stream. If the user asks for both of them and one is blocked, the method still
                // success only with the allowed input. This is not the desierd behaviour: if any of them is blocked, access should be denied
                var constraintsAux = {};
                var timeForDialogEvent = 1250;
                if (_this.stream.isSendVideo()) {
                    constraintsAux.audio = false;
                    constraintsAux.video = constraints.video;
                    var startTime_1 = Date.now();
                    _this.setPermissionDialogTimer(timeForDialogEvent);
                    navigator.mediaDevices.getUserMedia(constraintsAux)
                        .then(function (videoOnlyStream) {
                        _this.clearPermissionDialogTimer(startTime_1, timeForDialogEvent);
                        if (_this.stream.isSendAudio()) {
                            constraintsAux.audio = (constraints.audio === undefined) ? true : constraints.audio;
                            constraintsAux.video = false;
                            startTime_1 = Date.now();
                            _this.setPermissionDialogTimer(timeForDialogEvent);
                            navigator.mediaDevices.getUserMedia(constraintsAux)
                                .then(function (audioOnlyStream) {
                                _this.clearPermissionDialogTimer(startTime_1, timeForDialogEvent);
                                videoOnlyStream.addTrack(audioOnlyStream.getAudioTracks()[0]);
                                successCallback(videoOnlyStream);
                            })["catch"](function (error) {
                                _this.clearPermissionDialogTimer(startTime_1, timeForDialogEvent);
                                videoOnlyStream.getVideoTracks().forEach(function (track) {
                                    track.stop();
                                });
                                var errorName;
                                var errorMessage;
                                switch (error.name.toLowerCase()) {
                                    case 'notfounderror':
                                        errorName = OpenViduError_1.OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                        errorMessage = error.toString();
                                        break;
                                    case 'notallowederror':
                                        errorName = OpenViduError_1.OpenViduErrorName.MICROPHONE_ACCESS_DENIED;
                                        errorMessage = error.toString();
                                        break;
                                    case 'overconstrainederror':
                                        if (error.constraint.toLowerCase() === 'deviceid') {
                                            errorName = OpenViduError_1.OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                            errorMessage = "Audio input device with deviceId '" + constraints.audio.deviceId.exact + "' not found";
                                        }
                                        else {
                                            errorName = OpenViduError_1.OpenViduErrorName.PUBLISHER_PROPERTIES_ERROR;
                                            errorMessage = "Audio input device doesn't support the value passed for constraint '" + error.constraint + "'";
                                        }
                                }
                                errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                            });
                        }
                        else {
                            successCallback(videoOnlyStream);
                        }
                    })["catch"](function (error) {
                        _this.clearPermissionDialogTimer(startTime_1, timeForDialogEvent);
                        var errorName;
                        var errorMessage;
                        switch (error.name.toLowerCase()) {
                            case 'notfounderror':
                                errorName = OpenViduError_1.OpenViduErrorName.INPUT_VIDEO_DEVICE_NOT_FOUND;
                                errorMessage = error.toString();
                                break;
                            case 'notallowederror':
                                errorName = _this.stream.isSendScreen() ? OpenViduError_1.OpenViduErrorName.SCREEN_CAPTURE_DENIED : OpenViduError_1.OpenViduErrorName.CAMERA_ACCESS_DENIED;
                                errorMessage = error.toString();
                                break;
                            case 'overconstrainederror':
                                if (error.constraint.toLowerCase() === 'deviceid') {
                                    errorName = OpenViduError_1.OpenViduErrorName.INPUT_VIDEO_DEVICE_NOT_FOUND;
                                    errorMessage = "Video input device with deviceId '" + constraints.video.deviceId.exact + "' not found";
                                }
                                else {
                                    errorName = OpenViduError_1.OpenViduErrorName.PUBLISHER_PROPERTIES_ERROR;
                                    errorMessage = "Video input device doesn't support the value passed for constraint '" + error.constraint + "'";
                                }
                        }
                        errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                    });
                }
                else if (_this.stream.isSendAudio()) {
                    constraintsAux.audio = (constraints.audio === undefined) ? true : constraints.audio;
                    constraintsAux.video = false;
                    var startTime_2 = Date.now();
                    _this.setPermissionDialogTimer(timeForDialogEvent);
                    navigator.mediaDevices.getUserMedia(constraints)
                        .then(function (audioOnlyStream) {
                        _this.clearPermissionDialogTimer(startTime_2, timeForDialogEvent);
                        successCallback(audioOnlyStream);
                    })["catch"](function (error) {
                        _this.clearPermissionDialogTimer(startTime_2, timeForDialogEvent);
                        var errorName;
                        var errorMessage;
                        switch (error.name.toLowerCase()) {
                            case 'notfounderror':
                                errorName = OpenViduError_1.OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                errorMessage = error.toString();
                                break;
                            case 'notallowederror':
                                errorName = OpenViduError_1.OpenViduErrorName.MICROPHONE_ACCESS_DENIED;
                                errorMessage = error.toString();
                                break;
                            case 'overconstrainederror':
                                if (error.constraint.toLowerCase() === 'deviceid') {
                                    errorName = OpenViduError_1.OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                    errorMessage = "Audio input device with deviceId '" + constraints.audio.deviceId.exact + "' not found";
                                }
                                else {
                                    errorName = OpenViduError_1.OpenViduErrorName.PUBLISHER_PROPERTIES_ERROR;
                                    errorMessage = "Audio input device doesn't support the value passed for constraint '" + error.constraint + "'";
                                }
                        }
                        errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
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
    Publisher.prototype.emitEvent = function (type, eventArray) {
        this.ee.emitEvent(type, eventArray);
    };
    /* Private methods */
    Publisher.prototype.setPermissionDialogTimer = function (waitTime) {
        var _this = this;
        this.permissionDialogTimeout = setTimeout(function () {
            _this.ee.emitEvent('accessDialogOpened', []);
        }, waitTime);
    };
    Publisher.prototype.clearPermissionDialogTimer = function (startTime, waitTime) {
        clearTimeout(this.permissionDialogTimeout);
        if ((Date.now() - startTime) > waitTime) {
            // Permission dialog was shown and now is closed
            this.ee.emitEvent('accessDialogClosed', []);
        }
    };
    /* Private methods */
    Publisher.prototype.userMediaHasVideo = function (callback) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            // If the user is going to publish its screen there's a video source
            if ((typeof _this.properties.videoSource === 'string') && _this.properties.videoSource === 'screen') {
                resolve(true);
            }
            else {
                _this.openvidu.getDevices()
                    .then(function (devices) {
                    resolve(!!(devices.filter(function (device) {
                        return device.kind === 'videoinput';
                    })[0]));
                })["catch"](function (error) {
                    reject(error);
                });
            }
        });
    };
    Publisher.prototype.userMediaHasAudio = function (callback) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.openvidu.getDevices()
                .then(function (devices) {
                resolve(!!(devices.filter(function (device) {
                    return device.kind === 'audioinput';
                })[0]));
            })["catch"](function (error) {
                reject(error);
            });
        });
    };
    return Publisher;
}());
exports.Publisher = Publisher;
//# sourceMappingURL=Publisher.js.map