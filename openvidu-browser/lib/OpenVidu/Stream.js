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
exports.__esModule = true;
var WebRtcStats_1 = require("../OpenViduInternal/WebRtcStats/WebRtcStats");
var PublisherSpeakingEvent_1 = require("../OpenViduInternal/Events/PublisherSpeakingEvent");
var EventEmitter = require("wolfy87-eventemitter");
var kurentoUtils = require("../OpenViduInternal/KurentoUtils/kurento-utils-js");
var VideoInsertMode_1 = require("../OpenViduInternal/Enums/VideoInsertMode");
/**
 * Represents each one of the videos send and receive by a user in a session.
 * Therefore each [[Publisher]] and [[Subscriber]] has an attribute of type Stream
 */
var Stream = /** @class */ (function () {
    /**
     * @hidden
     */
    function Stream(session, options) {
        var _this = this;
        this.ee = new EventEmitter();
        this.isSubscribeToRemote = false;
        /**
         * @hidden
         */
        this.isReadyToPublish = false;
        /**
         * @hidden
         */
        this.isPublisherPublished = false;
        /**
         * @hidden
         */
        this.isVideoELementCreated = false;
        /**
         * @hidden
         */
        this.accessIsAllowed = false;
        /**
         * @hidden
         */
        this.accessIsDenied = false;
        this.session = session;
        if (options.hasOwnProperty('id')) {
            // InboundStreamOptions: stream belongs to a Subscriber
            this.inboundStreamOpts = options;
            this.streamId = this.inboundStreamOpts.id;
            this.hasAudio = this.inboundStreamOpts.recvAudio;
            this.hasVideo = this.inboundStreamOpts.recvVideo;
            this.typeOfVideo = (!this.inboundStreamOpts.typeOfVideo) ? undefined : this.inboundStreamOpts.typeOfVideo;
            this.frameRate = (this.inboundStreamOpts.frameRate === -1) ? undefined : this.inboundStreamOpts.frameRate;
        }
        else {
            // OutboundStreamOptions: stream belongs to a Publisher
            this.outboundStreamOpts = options;
            if (this.isSendVideo()) {
                if (this.isSendScreen()) {
                    this.streamId = 'SCREEN';
                    this.typeOfVideo = 'SCREEN';
                }
                else {
                    this.streamId = 'CAMERA';
                    this.typeOfVideo = 'CAMERA';
                }
                this.frameRate = this.outboundStreamOpts.publisherProperties.frameRate;
            }
            else {
                this.streamId = 'MICRO';
                delete this.typeOfVideo;
            }
            this.hasAudio = this.isSendAudio();
            this.hasVideo = this.isSendVideo();
        }
        this.on('mediastream-updated', function () {
            if (_this.video)
                _this.video.srcObject = _this.mediaStream;
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
        return this.webRtcPeer.peerConnection;
    };
    /**
     * @hidden
     */
    Stream.prototype.getVideoElement = function () {
        return this.video;
    };
    /**
     * @hidden
     */
    Stream.prototype.subscribeToMyRemote = function () {
        this.isSubscribeToRemote = true;
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
            if (_this.isReadyToPublish) {
                _this.initWebRtcPeerSend()
                    .then(function () {
                    resolve();
                })["catch"](function (error) {
                    reject(error);
                });
            }
            else {
                _this.ee.once('stream-ready-to-publish', function (streamEvent) {
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
    Stream.prototype.on = function (eventName, listener) {
        this.ee.on(eventName, listener);
    };
    /**
     * @hidden
     */
    Stream.prototype.once = function (eventName, listener) {
        this.ee.once(eventName, listener);
    };
    /**
     * @hidden
     */
    Stream.prototype.insertVideo = function (targetElement, insertMode) {
        var _this = this;
        if (!!targetElement) {
            this.video = document.createElement('video');
            this.video.id = (this.isLocal() ? 'local-' : 'remote-') + 'video-' + this.streamId;
            this.video.autoplay = true;
            this.video.controls = false;
            this.video.srcObject = this.mediaStream;
            if (this.isLocal() && !this.displayMyRemote()) {
                this.video.muted = true;
                if (this.outboundStreamOpts.publisherProperties.mirror) {
                    this.mirrorVideo(this.video);
                }
                this.video.oncanplay = function () {
                    console.info("Local 'Stream' with id [" + _this.streamId + '] video is now playing');
                    _this.ee.emitEvent('video-is-playing', [{
                            element: _this.video
                        }]);
                };
            }
            else {
                this.video.title = this.streamId;
            }
            this.targetElement = targetElement;
            this.parentId = targetElement.id;
            var insMode = !!insertMode ? insertMode : VideoInsertMode_1.VideoInsertMode.APPEND;
            this.insertElementWithMode(this.video, insMode);
            this.ee.emitEvent('video-element-created-by-stream', [{
                    element: this.video
                }]);
            this.isVideoELementCreated = true;
        }
        this.isReadyToPublish = true;
        this.ee.emitEvent('stream-ready-to-publish');
        return this.video;
    };
    /**
     * @hidden
     */
    Stream.prototype.removeVideo = function () {
        if (this.video) {
            if (document.getElementById(this.parentId)) {
                document.getElementById(this.parentId).removeChild(this.video);
                this.ee.emitEvent('video-removed', [this.video]);
            }
            delete this.video;
        }
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
    Stream.prototype.emitEvent = function (type, eventArray) {
        this.ee.emitEvent(type, eventArray);
    };
    /**
     * @hidden
     */
    Stream.prototype.setSpeechEventIfNotExists = function () {
        if (!this.speechEvent) {
            var harkOptions = this.session.openvidu.advancedConfiguration.publisherSpeakingEventsOptions || {};
            harkOptions.interval = (typeof harkOptions.interval === 'number') ? harkOptions.interval : 50;
            harkOptions.threshold = (typeof harkOptions.threshold === 'number') ? harkOptions.threshold : -50;
            this.speechEvent = kurentoUtils.WebRtcPeer.hark(this.mediaStream, harkOptions);
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
    /* Private methods */
    Stream.prototype.initWebRtcPeerSend = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var userMediaConstraints = {
                audio: _this.isSendAudio(),
                video: _this.isSendVideo()
            };
            var options = {
                videoStream: _this.mediaStream,
                mediaConstraints: userMediaConstraints,
                onicecandidate: _this.connection.sendIceCandidate.bind(_this.connection),
                iceServers: _this.session.openvidu.advancedConfiguration.iceServers
            };
            var successCallback = function (error, sdpOfferParam, wp) {
                if (error) {
                    reject(new Error('(publish) SDP offer error: ' + JSON.stringify(error)));
                }
                console.debug('Sending SDP offer to publish as '
                    + _this.streamId, sdpOfferParam);
                _this.session.openvidu.sendRequest('publishVideo', {
                    sdpOffer: sdpOfferParam,
                    doLoopback: _this.displayMyRemote() || false,
                    audioActive: _this.isSendAudio(),
                    videoActive: _this.isSendVideo(),
                    typeOfVideo: ((_this.isSendVideo()) ? (_this.isSendScreen() ? 'SCREEN' : 'CAMERA') : ''),
                    frameRate: !!_this.frameRate ? _this.frameRate : -1
                }, function (error, response) {
                    if (error) {
                        reject('Error on publishVideo: ' + JSON.stringify(error));
                    }
                    else {
                        _this.processSdpAnswer(response.sdpAnswer)
                            .then(function () {
                            _this.ee.emitEvent('stream-created-by-publisher');
                            resolve();
                        })["catch"](function (error) {
                            reject(error);
                        });
                        console.info("'Publisher' successfully published to session");
                    }
                });
            };
            if (_this.displayMyRemote()) {
                _this.webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function (err) {
                    if (err) {
                        reject(err);
                    }
                    _this.webRtcPeer.generateOffer(successCallback);
                });
            }
            else {
                _this.webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function (error) {
                    if (error) {
                        reject(error);
                    }
                    _this.webRtcPeer.generateOffer(successCallback);
                });
            }
            _this.isPublisherPublished = true;
        });
    };
    Stream.prototype.initWebRtcPeerReceive = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var offerConstraints = {
                audio: _this.inboundStreamOpts.recvAudio,
                video: _this.inboundStreamOpts.recvVideo
            };
            console.debug("'Session.subscribe(Stream)' called. Constraints of generate SDP offer", offerConstraints);
            var options = {
                onicecandidate: _this.connection.sendIceCandidate.bind(_this.connection),
                mediaConstraints: offerConstraints
            };
            var successCallback = function (error, sdpOfferParam, wp) {
                if (error) {
                    reject(new Error('(subscribe) SDP offer error: ' + JSON.stringify(error)));
                }
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
                        _this.processSdpAnswer(response.sdpAnswer).then(function () {
                            resolve();
                        })["catch"](function (error) {
                            reject(error);
                        });
                    }
                });
            };
            _this.webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function (error) {
                if (error) {
                    reject(error);
                }
                _this.webRtcPeer.generateOffer(successCallback);
            });
        });
    };
    Stream.prototype.processSdpAnswer = function (sdpAnswer) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var answer = new RTCSessionDescription({
                type: 'answer',
                sdp: sdpAnswer
            });
            console.debug(_this.streamId + ': set peer connection with recvd SDP answer', sdpAnswer);
            var streamId = _this.streamId;
            var peerConnection = _this.webRtcPeer.peerConnection;
            peerConnection.setRemoteDescription(answer, function () {
                // Avoids to subscribe to your own stream remotely
                // except when showMyRemote is true
                if (!_this.isLocal() || _this.displayMyRemote()) {
                    _this.mediaStream = peerConnection.getRemoteStreams()[0];
                    console.debug('Peer remote stream', _this.mediaStream);
                    if (!!_this.mediaStream) {
                        _this.ee.emitEvent('mediastream-updated');
                        if (!!_this.mediaStream.getAudioTracks()[0] && _this.session.speakingEventsEnabled) {
                            _this.enableSpeakingEvents();
                        }
                    }
                    if (!!_this.video) {
                        // let thumbnailId = this.video.thumb;
                        _this.video.oncanplay = function () {
                            if (_this.isLocal() && _this.displayMyRemote()) {
                                console.info("Your own remote 'Stream' with id [" + _this.streamId + '] video is now playing');
                                _this.ee.emitEvent('remote-video-is-playing', [{
                                        element: _this.video
                                    }]);
                            }
                            else if (!_this.isLocal() && !_this.displayMyRemote()) {
                                console.info("Remote 'Stream' with id [" + _this.streamId + '] video is now playing');
                                _this.ee.emitEvent('video-is-playing', [{
                                        element: _this.video
                                    }]);
                            }
                            // show(thumbnailId);
                            // this.hideSpinner(this.streamId);
                        };
                    }
                    _this.session.emitEvent('stream-subscribed', [{
                            stream: _this
                        }]);
                }
                _this.initWebRtcStats();
                resolve();
            }, function (error) {
                reject(new Error(_this.streamId + ': Error setting SDP to the peer connection: ' + JSON.stringify(error)));
            });
        });
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
    Stream.prototype.isLocal = function () {
        // inbound options undefined and outbound options defined
        return (!this.inboundStreamOpts && !!this.outboundStreamOpts);
    };
    Stream.prototype.insertElementWithMode = function (element, insertMode) {
        if (!!this.targetElement) {
            switch (insertMode) {
                case VideoInsertMode_1.VideoInsertMode.AFTER:
                    this.targetElement.parentNode.insertBefore(element, this.targetElement.nextSibling);
                    break;
                case VideoInsertMode_1.VideoInsertMode.APPEND:
                    this.targetElement.appendChild(element);
                    break;
                case VideoInsertMode_1.VideoInsertMode.BEFORE:
                    this.targetElement.parentNode.insertBefore(element, this.targetElement);
                    break;
                case VideoInsertMode_1.VideoInsertMode.PREPEND:
                    this.targetElement.insertBefore(element, this.targetElement.childNodes[0]);
                    break;
                case VideoInsertMode_1.VideoInsertMode.REPLACE:
                    this.targetElement.parentNode.replaceChild(element, this.targetElement);
                    break;
                default:
                    this.insertElementWithMode(element, VideoInsertMode_1.VideoInsertMode.APPEND);
            }
        }
    };
    Stream.prototype.mirrorVideo = function (video) {
        video.style.transform = 'rotateY(180deg)';
        video.style.webkitTransform = 'rotateY(180deg)';
    };
    return Stream;
}());
exports.Stream = Stream;
//# sourceMappingURL=Stream.js.map