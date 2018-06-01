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
var VideoInsertMode_1 = require("../../Enums/VideoInsertMode");
var VideoElementEvent_1 = require("../../Events/VideoElementEvent");
var EventEmitter = require("wolfy87-eventemitter");
/**
 * Interface in charge of displaying the media streams in the HTML DOM. This wraps any Publisher and Subscriber object, as well as
 * any extra representation in the DOM you assign to some Stream by calling [[Stream.addVideoElement]].
 *
 * The use of this interface is useful when you don't need to differentiate between streams and just want to directly manage videos
 */
var MediaManager = /** @class */ (function () {
    /**
     * @hidden
     */
    function MediaManager(stream, targetElement) {
        var _this = this;
        /**
         * @hidden
         */
        this.isVideoElementCreated = false;
        this.ee = new EventEmitter();
        this.customEe = new EventEmitter();
        this.stream = stream;
        this.stream.mediaManagers.push(this);
        if (typeof targetElement === 'string') {
            var e = document.getElementById(targetElement);
            if (!!e) {
                this.targetElement = e;
            }
        }
        else if (targetElement instanceof HTMLElement) {
            this.targetElement = targetElement;
        }
        if (!this.targetElement) {
            console.warn("The provided 'targetElement' couldn't be resolved to any HTML element: " + targetElement);
        }
        this.customEe.on('video-removed', function (element) {
            _this.ee.emitEvent('videoElementDestroyed', [new VideoElementEvent_1.VideoElementEvent(element, _this, 'videoElementDestroyed')]);
        });
    }
    /**
     * See [[EventDispatcher.on]]
     */
    MediaManager.prototype.on = function (type, handler) {
        var _this = this;
        this.ee.on(type, function (event) {
            if (event) {
                console.info("Event '" + type + "' triggered", event);
            }
            else {
                console.info("Event '" + type + "' triggered");
            }
            handler(event);
        });
        if (type === 'videoElementCreated') {
            if (!!this.stream && this.isVideoElementCreated) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(this.video, this, 'videoElementCreated')]);
            }
            else {
                this.customEe.on('video-element-created', function (element) {
                    _this.id = element.id;
                    _this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(element.element, _this, 'videoElementCreated')]);
                });
            }
        }
        if (type === 'videoPlaying') {
            if (!this.stream.displayMyRemote() && !!this.video &&
                this.video.currentTime > 0 &&
                this.video.paused === false &&
                this.video.ended === false &&
                this.video.readyState === 4) {
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.video, this, 'videoPlaying')]);
            }
            else {
                this.customEe.once('video-is-playing', function (element) {
                    _this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(element.element, _this, 'videoPlaying')]);
                });
            }
        }
        return this;
    };
    /**
     * See [[EventDispatcher.once]]
     */
    MediaManager.prototype.once = function (type, handler) {
        var _this = this;
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
            if (!!this.stream && this.isVideoElementCreated) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(this.video, this, 'videoElementCreated')]);
            }
            else {
                this.customEe.once('video-element-created', function (element) {
                    _this.id = element.id;
                    _this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(element.element, _this, 'videoElementCreated')]);
                });
            }
        }
        if (type === 'videoPlaying') {
            if (!this.stream.displayMyRemote() && this.video &&
                this.video.currentTime > 0 &&
                this.video.paused === false &&
                this.video.ended === false &&
                this.video.readyState === 4) {
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.video, this, 'videoPlaying')]);
            }
            else {
                this.customEe.once('video-is-playing', function (element) {
                    _this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(element.element, _this, 'videoPlaying')]);
                });
            }
        }
        return this;
    };
    /**
     * See [[EventDispatcher.off]]
     */
    MediaManager.prototype.off = function (type, handler) {
        if (!handler) {
            this.ee.removeAllListeners(type);
        }
        else {
            this.ee.off(type, handler);
        }
        return this;
    };
    /**
     * @hidden
     */
    MediaManager.prototype.insertVideo = function (targetElement, insertMode) {
        var _this = this;
        if (!!targetElement) {
            this.video = document.createElement('video');
            this.video.id = (this.stream.isLocal() ? 'local-' : 'remote-') + 'video-' + this.stream.streamId;
            this.video.autoplay = true;
            this.video.controls = false;
            this.video.srcObject = this.stream.getMediaStream();
            if (this.stream.isLocal() && !this.stream.displayMyRemote()) {
                this.video.muted = true;
                if (this.stream.outboundStreamOpts.publisherProperties.mirror) {
                    this.mirrorVideo();
                }
                this.video.oncanplay = function () {
                    console.info("Local 'Stream' with id [" + _this.stream.streamId + '] video is now playing');
                    _this.customEe.emitEvent('video-is-playing', [{
                            element: _this.video
                        }]);
                };
            }
            else {
                this.video.title = this.stream.streamId;
            }
            this.targetElement = targetElement;
            var insMode = !!insertMode ? insertMode : VideoInsertMode_1.VideoInsertMode.APPEND;
            this.insertVideoWithMode(insMode);
            this.customEe.emitEvent('video-element-created', [{
                    element: this.video
                }]);
            this.isVideoElementCreated = true;
        }
        this.stream.isReadyToPublish = true;
        this.customEe.emitEvent('stream-ready-to-publish');
        return this.video;
    };
    /**
     * @hidden
     */
    MediaManager.prototype.insertVideoWithMode = function (insertMode) {
        if (!!this.targetElement) {
            switch (insertMode) {
                case VideoInsertMode_1.VideoInsertMode.AFTER:
                    this.targetElement.parentNode.insertBefore(this.video, this.targetElement.nextSibling);
                    break;
                case VideoInsertMode_1.VideoInsertMode.APPEND:
                    this.targetElement.appendChild(this.video);
                    break;
                case VideoInsertMode_1.VideoInsertMode.BEFORE:
                    this.targetElement.parentNode.insertBefore(this.video, this.targetElement);
                    break;
                case VideoInsertMode_1.VideoInsertMode.PREPEND:
                    this.targetElement.insertBefore(this.video, this.targetElement.childNodes[0]);
                    break;
                case VideoInsertMode_1.VideoInsertMode.REPLACE:
                    this.targetElement.parentNode.replaceChild(this.video, this.targetElement);
                    break;
                default:
                    this.insertVideoWithMode(VideoInsertMode_1.VideoInsertMode.APPEND);
            }
        }
    };
    /**
     * @hidden
     */
    MediaManager.prototype.removeVideo = function () {
        if (!!this.video) {
            var videoDOM = document.getElementById(this.id);
            if (!!videoDOM) {
                videoDOM.parentNode.removeChild(videoDOM);
                this.customEe.emitEvent('video-removed', [this.video]);
            }
            delete this.video;
        }
    };
    /**
     * @hidden
     */
    MediaManager.prototype.addOnCanPlayEvent = function () {
        var _this = this;
        if (!!this.video) {
            // let thumbnailId = this.video.thumb;
            this.video.oncanplay = function () {
                if (_this.stream.isLocal() && _this.stream.displayMyRemote()) {
                    console.info("Your own remote 'Stream' with id [" + _this.stream.streamId + '] video is now playing');
                    _this.customEe.emitEvent('remote-video-is-playing', [{
                            element: _this.video
                        }]);
                }
                else if (!_this.stream.isLocal() && !_this.stream.displayMyRemote()) {
                    console.info("Remote 'Stream' with id [" + _this.stream.streamId + '] video is now playing');
                    _this.customEe.emitEvent('video-is-playing', [{
                            element: _this.video
                        }]);
                }
                // show(thumbnailId);
                // this.hideSpinner(this.streamId);
            };
        }
    };
    MediaManager.prototype.mirrorVideo = function () {
        this.video.style.transform = 'rotateY(180deg)';
        this.video.style.webkitTransform = 'rotateY(180deg)';
    };
    return MediaManager;
}());
exports.MediaManager = MediaManager;
//# sourceMappingURL=MediaManager.js.map