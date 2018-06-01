"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var VideoElementEvent_1 = require("../OpenViduInternal/Events/VideoElementEvent");
var VideoInsertMode_1 = require("../OpenViduInternal/Enums/VideoInsertMode");
var EventEmitter = require("wolfy87-eventemitter");
var StreamManager = (function () {
    function StreamManager(stream, targetElement) {
        var _this = this;
        this.videos = [];
        this.isVideoElementCreated = false;
        this.ee = new EventEmitter();
        this.customEe = new EventEmitter();
        this.stream = stream;
        this.stream.streamManager = this;
        if (typeof targetElement === 'string') {
            var e = document.getElementById(targetElement);
            if (!!e) {
                this.targetElement = e;
            }
        }
        else if (targetElement instanceof HTMLElement) {
            this.targetElement = targetElement;
        }
        else if (!!this.targetElement) {
            console.warn("The provided 'targetElement' couldn't be resolved to any HTML element: " + targetElement);
        }
        this.customEe.on('video-removed', function (element) {
            _this.ee.emitEvent('videoElementDestroyed', [new VideoElementEvent_1.VideoElementEvent(element, _this, 'videoElementDestroyed')]);
        });
    }
    StreamManager.prototype.on = function (type, handler) {
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
            if (!!this.stream && this.isVideoElementCreatedAsync) {
                this.isVideoElementCreated = false;
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(this.videos[0], this, 'videoElementCreated')]);
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
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.videos[0], this, 'videoPlaying')]);
            }
            else {
                this.customEe.on('video-is-playing', function (element) {
                    _this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(element.element, _this, 'videoPlaying')]);
                });
            }
        }
        return this;
    };
    StreamManager.prototype.once = function (type, handler) {
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
                this.isVideoElementCreated = false;
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(this.videos[0], this, 'videoElementCreated')]);
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
    StreamManager.prototype.off = function (type, handler) {
        if (!handler) {
            this.ee.removeAllListeners(type);
        }
        else {
            this.ee.off(type, handler);
        }
        return this;
    };
    StreamManager.prototype.addVideoElement = function (video) {
        this.initializeVideoProperties(video);
        video.srcObject = this.stream.getMediaStream();
        video.autoplay = true;
        video.muted = this.stream.isLocal() ? true : false;
        this.remote = !this.stream.isLocal();
        streamManager.id = video.id;
    };
    StreamManager.prototype.createVideoElement = function (targetElement, insertMode) {
        var tar;
        if (typeof targetElement === 'string') {
            var e = document.getElementById(targetElement);
            if (!!e) {
                tar = e;
            }
            else {
                console.error("The provided 'targetElement' couldn't be resolved to any HTML element: " + targetElement);
                return;
            }
        }
        else if (targetElement instanceof HTMLElement) {
            tar = targetElement;
        }
        else if (!!this.targetElement) {
            console.error("The provided 'targetElement' couldn't be resolved to any HTML element: " + targetElement);
            return;
        }
        this.insertVideo(tar, insertMode);
    };
    StreamManager.prototype.insertVideo = function (targetElement, insertMode) {
        if (!!targetElement) {
            var video = document.createElement('video');
            this.initializeVideoProperties(video);
            this.targetElement = targetElement;
            var insMode = !!insertMode ? insertMode : VideoInsertMode_1.VideoInsertMode.APPEND;
            this.insertVideoElementWithMode(video, insMode);
            this.videos.push(video);
            this.stream.session.videos[this.stream.connection.connectionId].push(video);
            this.customEe.emitEvent('video-element-created', [{
                    element: video
                }]);
            this.isVideoElementCreated = true;
        }
        if (this.stream.isLocal()) {
            this.stream.isLocalStreamReadyToPublish = true;
            this.stream.ee.emitEvent('stream-ready-to-publish', []);
        }
    };
    StreamManager.prototype.initializeVideoProperties = function (video) {
        video.srcObject = this.stream.getMediaStream();
        video.autoplay = true;
        video.controls = false;
        if (!video.id) {
            video.id = (this.stream.isLocal() ? 'local-' : 'remote-') + 'video-' + this.stream.streamId;
        }
        if (this.stream.isLocal() && !this.stream.displayMyRemote()) {
            video.muted = true;
            if (this.stream.outboundStreamOpts.publisherProperties.mirror) {
                this.mirrorVideo(video);
            }
            this.addOnCanPlayLocalVideoEvent(video);
        }
    };
    StreamManager.prototype.insertVideoElementWithMode = function (video, insertMode) {
        if (!!this.targetElement) {
            switch (insertMode) {
                case VideoInsertMode_1.VideoInsertMode.AFTER:
                    this.targetElement.parentNode.insertBefore(video, this.targetElement.nextSibling);
                    break;
                case VideoInsertMode_1.VideoInsertMode.APPEND:
                    this.targetElement.appendChild(video);
                    break;
                case VideoInsertMode_1.VideoInsertMode.BEFORE:
                    this.targetElement.parentNode.insertBefore(video, this.targetElement);
                    break;
                case VideoInsertMode_1.VideoInsertMode.PREPEND:
                    this.targetElement.insertBefore(video, this.targetElement.childNodes[0]);
                    break;
                case VideoInsertMode_1.VideoInsertMode.REPLACE:
                    this.targetElement.parentNode.replaceChild(video, this.targetElement);
                    break;
                default:
                    this.insertVideoElementWithMode(video, VideoInsertMode_1.VideoInsertMode.APPEND);
            }
        }
    };
    StreamManager.prototype.removeVideos = function () {
        var _this = this;
        this.videos.forEach(function (video) {
            video.parentNode.removeChild(video);
            _this.customEe.emitEvent('video-removed', [video]);
        });
        this.videos = [];
        delete this.stream.session.videos[this.stream.connection.connectionId];
    };
    StreamManager.prototype.addOnCanPlayLocalVideoEvent = function (video) {
        var _this = this;
        video.oncanplay = function () {
            if (_this.stream.isLocal() && _this.stream.displayMyRemote()) {
                console.info("Your own remote 'Stream' with id [" + _this.stream.streamId + '] video is now playing');
                _this.customEe.emitEvent('remote-video-is-playing', [{
                        element: video
                    }]);
            }
            else if (!_this.stream.isLocal() && !_this.stream.displayMyRemote()) {
                console.info("Remote 'Stream' with id [" + _this.stream.streamId + '] video is now playing');
                _this.customEe.emitEvent('video-is-playing', [{
                        element: video
                    }]);
            }
        };
    };
    StreamManager.prototype.updateMediaStream = function (mediaStream) {
        this.videos.forEach(function (video) {
            video.srcObject = mediaStream;
        });
    };
    StreamManager.prototype.mirrorVideo = function (video) {
        video.style.transform = 'rotateY(180deg)';
        video.style.webkitTransform = 'rotateY(180deg)';
    };
    return StreamManager;
}());
exports.StreamManager = StreamManager;
//# sourceMappingURL=MediaManager.js.map