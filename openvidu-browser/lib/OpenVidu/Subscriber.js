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
var VideoElementEvent_1 = require("../OpenViduInternal/Events/VideoElementEvent");
var EventEmitter = require("wolfy87-eventemitter");
/**
 * Packs remote media streams. Participants automatically receive them when others publish their streams. Initialized with [[Session.subscribe]] method
 */
var Subscriber = /** @class */ (function () {
    /**
     * @hidden
     */
    function Subscriber(stream, targetElement, properties) {
        var _this = this;
        this.ee = new EventEmitter();
        this.stream = stream;
        this.properties = properties;
        if (typeof targetElement === 'string') {
            var e = document.getElementById(targetElement);
            if (!!e) {
                this.element = e;
            }
        }
        else if (targetElement instanceof HTMLElement) {
            this.element = targetElement;
        }
        this.stream.once('video-removed', function (element) {
            _this.ee.emitEvent('videoElementDestroyed', [new VideoElementEvent_1.VideoElementEvent(element, _this, 'videoElementDestroyed')]);
        });
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
    /**
     * See [[EventDispatcher.on]]
     */
    Subscriber.prototype.on = function (type, handler) {
        var _this = this;
        this.ee.on(type, function (event) {
            if (event) {
                console.info("Event '" + type + "' triggered by 'Subscriber'", event);
            }
            else {
                console.info("Event '" + type + "' triggered by 'Subscriber'");
            }
            handler(event);
        });
        if (type === 'videoElementCreated') {
            if (this.stream.isVideoELementCreated) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(this.stream.getVideoElement(), this, 'videoElementCreated')]);
            }
            else {
                this.stream.once('video-element-created-by-stream', function (element) {
                    _this.id = element.id;
                    _this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(element, _this, 'videoElementCreated')]);
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
        return this;
    };
    /**
     * See [[EventDispatcher.once]]
     */
    Subscriber.prototype.once = function (type, handler) {
        var _this = this;
        this.ee.once(type, function (event) {
            if (event) {
                console.info("Event '" + type + "' triggered once by 'Subscriber'", event);
            }
            else {
                console.info("Event '" + type + "' triggered once by 'Subscriber'");
            }
            handler(event);
        });
        if (type === 'videoElementCreated') {
            if (this.stream.isVideoELementCreated) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(this.stream.getVideoElement(), this, 'videoElementCreated')]);
            }
            else {
                this.stream.once('video-element-created-by-stream', function (element) {
                    _this.id = element.id;
                    _this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(element, _this, 'videoElementCreated')]);
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
        return this;
    };
    /**
     * See [[EventDispatcher.off]]
     */
    Subscriber.prototype.off = function (type, handler) {
        if (!handler) {
            this.ee.removeAllListeners(type);
        }
        else {
            this.ee.off(type, handler);
        }
        return this;
    };
    return Subscriber;
}());
exports.Subscriber = Subscriber;
//# sourceMappingURL=Subscriber.js.map