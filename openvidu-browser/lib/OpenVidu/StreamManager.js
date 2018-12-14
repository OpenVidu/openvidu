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
var StreamManagerEvent_1 = require("../OpenViduInternal/Events/StreamManagerEvent");
var VideoElementEvent_1 = require("../OpenViduInternal/Events/VideoElementEvent");
var VideoInsertMode_1 = require("../OpenViduInternal/Enums/VideoInsertMode");
var EventEmitter = require("wolfy87-eventemitter");
var platform = require("platform");
platform['isIonicIos'] = (platform.product === 'iPhone' || platform.product === 'iPad') && platform.ua.indexOf('Safari') === -1;
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
                if (platform.name === 'Safari') {
                    this.firstVideoElement.video.setAttribute('playsinline', 'true');
                }
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
            _this.ee.emitEvent('streamPlaying', [new StreamManagerEvent_1.StreamManagerEvent(_this, 'streamPlaying', undefined)]);
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
                this.ee.emitEvent('streamPlaying', [new StreamManagerEvent_1.StreamManagerEvent(this, 'streamPlaying', undefined)]);
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.videos[0].video, this, 'videoPlaying')]);
            }
        }
        if (type === 'streamAudioVolumeChange' && this.stream.hasAudio) {
            this.stream.enableVolumeChangeEvent();
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
                this.ee.emitEvent('streamPlaying', [new StreamManagerEvent_1.StreamManagerEvent(this, 'streamPlaying', undefined)]);
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.videos[0].video, this, 'videoPlaying')]);
            }
        }
        if (type === 'streamAudioVolumeChange' && this.stream.hasAudio) {
            this.stream.enableOnceVolumeChangeEvent();
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
        if (type === 'streamAudioVolumeChange') {
            this.stream.disableVolumeChangeEvent();
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
        if (this.stream.isLocal() && this.stream.displayMyRemote()) {
            video.srcObject = this.stream.getMediaStream();
        }
        // If the video element is already part of this StreamManager do nothing
        for (var _i = 0, _a = this.videos; _i < _a.length; _i++) {
            var v = _a[_i];
            if (v.video === video) {
                return 0;
            }
        }
        var returnNumber = 1;
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
        if (!(this.stream.isLocal() && this.stream.displayMyRemote())) {
            // Avoid setting the MediaStream into the srcObject if remote subscription before publishing
            video.srcObject = this.stream.getMediaStream();
        }
        video.autoplay = true;
        video.controls = false;
        if (platform.name === 'Safari') {
            video.setAttribute('playsinline', 'true');
        }
        if (!video.id) {
            video.id = (this.remote ? 'remote-' : 'local-') + 'video-' + this.stream.streamId;
            // DEPRECATED property: assign once the property id if the user provided a valid targetElement
            if (!this.id && !!this.targetElement) {
                this.id = video.id;
            }
        }
        if (!this.remote && !this.stream.displayMyRemote()) {
            video.muted = true;
            if (video.style.transform === 'rotateY(180deg)' && !this.stream.outboundStreamOpts.publisherProperties.mirror) {
                // If the video was already rotated and now is set to not mirror
                this.removeMirrorVideo(video);
            }
            else if (this.stream.outboundStreamOpts.publisherProperties.mirror) {
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
        this.videos.forEach(function (streamManagerVideo) {
            // Remove oncanplay event listener (only OpenVidu browser one, not the user ones)
            streamManagerVideo.video.removeEventListener('canplay', _this.canPlayListener);
            if (!!streamManagerVideo.targetElement) {
                // Only remove from DOM videos created by OpenVidu Browser (those generated by passing a valid targetElement in OpenVidu.initPublisher
                // and Session.subscribe or those created by StreamManager.createVideoElement). All this videos triggered a videoElementCreated event
                streamManagerVideo.video.parentNode.removeChild(streamManagerVideo.video);
                _this.ee.emitEvent('videoElementDestroyed', [new VideoElementEvent_1.VideoElementEvent(streamManagerVideo.video, _this, 'videoElementDestroyed')]);
            }
            // Remove srcObject from the video
            streamManagerVideo.video.srcObject = null;
            // Remove from collection of videos every video managed by OpenVidu Browser
            _this.videos.filter(function (v) { return !v.targetElement; });
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
            if (platform['isIonicIos']) {
                // iOS Ionic. LIMITATION: must reinsert the video in the DOM for
                // the media stream to be updated
                var vParent = streamManagerVideo.video.parentElement;
                var newVideo = streamManagerVideo.video;
                vParent.replaceChild(newVideo, streamManagerVideo.video);
                streamManagerVideo.video = newVideo;
            }
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
        if (!platform['isIonicIos']) {
            video.style.transform = 'rotateY(180deg)';
            video.style.webkitTransform = 'rotateY(180deg)';
        }
    };
    StreamManager.prototype.removeMirrorVideo = function (video) {
        video.style.transform = 'unset';
        video.style.webkitTransform = 'unset';
    };
    return StreamManager;
}());
exports.StreamManager = StreamManager;
//# sourceMappingURL=StreamManager.js.map