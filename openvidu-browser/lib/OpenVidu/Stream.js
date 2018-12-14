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
var Filter_1 = require("./Filter");
var WebRtcPeer_1 = require("../OpenViduInternal/WebRtcPeer/WebRtcPeer");
var WebRtcStats_1 = require("../OpenViduInternal/WebRtcStats/WebRtcStats");
var PublisherSpeakingEvent_1 = require("../OpenViduInternal/Events/PublisherSpeakingEvent");
var StreamManagerEvent_1 = require("../OpenViduInternal/Events/StreamManagerEvent");
var StreamPropertyChangedEvent_1 = require("../OpenViduInternal/Events/StreamPropertyChangedEvent");
var OpenViduError_1 = require("../OpenViduInternal/Enums/OpenViduError");
var EventEmitter = require("wolfy87-eventemitter");
var hark = require("hark");
var platform = require("platform");
platform['isIonicIos'] = (platform.product === 'iPhone' || platform.product === 'iPad') && platform.ua.indexOf('Safari') === -1;
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
        /**
         * @hidden
         */
        this.publishedOnce = false;
        /**
         * @hidden
         */
        this.publisherStartSpeakingEventEnabled = false;
        /**
         * @hidden
         */
        this.publisherStopSpeakingEventEnabled = false;
        /**
         * @hidden
         */
        this.volumeChangeEventEnabled = false;
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
            if (!!this.inboundStreamOpts.filter && (Object.keys(this.inboundStreamOpts.filter).length > 0)) {
                if (!!this.inboundStreamOpts.filter.lastExecMethod && Object.keys(this.inboundStreamOpts.filter.lastExecMethod).length === 0) {
                    delete this.inboundStreamOpts.filter.lastExecMethod;
                }
                this.filter = this.inboundStreamOpts.filter;
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
            if (!!this.outboundStreamOpts.publisherProperties.filter) {
                this.filter = this.outboundStreamOpts.publisherProperties.filter;
            }
        }
        this.ee.on('mediastream-updated', function () {
            _this.streamManager.updateMediaStream(_this.mediaStream);
            console.debug('Video srcObject [' + _this.mediaStream + '] updated in stream [' + _this.streamId + ']');
        });
    }
    /**
     * See [[EventDispatcher.on]]
     */
    Stream.prototype.on = function (type, handler) {
        var _this = this;
        this.ee.on(type, function (event) {
            if (event) {
                console.info("Event '" + type + "' triggered by stream '" + _this.streamId + "'", event);
            }
            else {
                console.info("Event '" + type + "' triggered by stream '" + _this.streamId + "'");
            }
            handler(event);
        });
        return this;
    };
    /**
     * See [[EventDispatcher.once]]
     */
    Stream.prototype.once = function (type, handler) {
        var _this = this;
        this.ee.once(type, function (event) {
            if (event) {
                console.info("Event '" + type + "' triggered once by stream '" + _this.streamId + "'", event);
            }
            else {
                console.info("Event '" + type + "' triggered once by stream '" + _this.streamId + "'");
            }
            handler(event);
        });
        return this;
    };
    /**
     * See [[EventDispatcher.off]]
     */
    Stream.prototype.off = function (type, handler) {
        if (!handler) {
            this.ee.removeAllListeners(type);
        }
        else {
            this.ee.off(type, handler);
        }
        return this;
    };
    /**
     * Applies an audio/video filter to the stream.
     *
     * @param type Type of filter applied. See [[Filter.type]]
     * @param options Parameters used to initialize the filter. See [[Filter.options]]
     *
     * @returns A Promise (to which you can optionally subscribe to) that is resolved to the applied filter if success and rejected with an Error object if not
     */
    Stream.prototype.applyFilter = function (type, options) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            console.info('Applying filter to stream ' + _this.streamId);
            options = !!options ? options : {};
            if (typeof options !== 'string') {
                options = JSON.stringify(options);
            }
            _this.session.openvidu.sendRequest('applyFilter', { streamId: _this.streamId, type: type, options: options }, function (error, response) {
                if (error) {
                    console.error('Error applying filter for Stream ' + _this.streamId, error);
                    if (error.code === 401) {
                        reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.OPENVIDU_PERMISSION_DENIED, "You don't have permissions to apply a filter"));
                    }
                    else {
                        reject(error);
                    }
                }
                else {
                    console.info('Filter successfully applied on Stream ' + _this.streamId);
                    var oldValue = _this.filter;
                    _this.filter = new Filter_1.Filter(type, options);
                    _this.filter.stream = _this;
                    _this.session.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this.session, _this, 'filter', _this.filter, oldValue, 'applyFilter')]);
                    _this.streamManager.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this.streamManager, _this, 'filter', _this.filter, oldValue, 'applyFilter')]);
                    resolve(_this.filter);
                }
            });
        });
    };
    /**
     * Removes an audio/video filter previously applied.
     *
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the previously applied filter has been successfully removed and rejected with an Error object in other case
     */
    Stream.prototype.removeFilter = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            console.info('Removing filter of stream ' + _this.streamId);
            _this.session.openvidu.sendRequest('removeFilter', { streamId: _this.streamId }, function (error, response) {
                if (error) {
                    console.error('Error removing filter for Stream ' + _this.streamId, error);
                    if (error.code === 401) {
                        reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.OPENVIDU_PERMISSION_DENIED, "You don't have permissions to remove a filter"));
                    }
                    else {
                        reject(error);
                    }
                }
                else {
                    console.info('Filter successfully removed from Stream ' + _this.streamId);
                    var oldValue = _this.filter;
                    delete _this.filter;
                    _this.session.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this.session, _this, 'filter', _this.filter, oldValue, 'applyFilter')]);
                    _this.streamManager.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this.streamManager, _this, 'filter', _this.filter, oldValue, 'applyFilter')]);
                    resolve();
                }
            });
        });
    };
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
            var isSenderAndCustomTrack = !!this.outboundStreamOpts &&
                this.outboundStreamOpts.publisherProperties.videoSource instanceof MediaStreamTrack;
            this.webRtcPeer.dispose(isSenderAndCustomTrack);
        }
        if (this.speechEvent) {
            this.speechEvent.stop();
            delete this.speechEvent;
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
        if (!this.publisherStartSpeakingEventEnabled) {
            this.publisherStartSpeakingEventEnabled = true;
            this.speechEvent.on('speaking', function () {
                _this.session.emitEvent('publisherStartSpeaking', [new PublisherSpeakingEvent_1.PublisherSpeakingEvent(_this.session, 'publisherStartSpeaking', _this.connection, _this.streamId)]);
            });
        }
        if (!this.publisherStopSpeakingEventEnabled) {
            this.publisherStopSpeakingEventEnabled = true;
            this.speechEvent.on('stopped_speaking', function () {
                _this.session.emitEvent('publisherStopSpeaking', [new PublisherSpeakingEvent_1.PublisherSpeakingEvent(_this.session, 'publisherStopSpeaking', _this.connection, _this.streamId)]);
            });
        }
    };
    /**
     * @hidden
     */
    Stream.prototype.enableOnceSpeakingEvents = function () {
        var _this = this;
        this.setSpeechEventIfNotExists();
        if (!this.publisherStartSpeakingEventEnabled) {
            this.publisherStartSpeakingEventEnabled = true;
            this.speechEvent.once('speaking', function () {
                _this.session.emitEvent('publisherStartSpeaking', [new PublisherSpeakingEvent_1.PublisherSpeakingEvent(_this.session, 'publisherStartSpeaking', _this.connection, _this.streamId)]);
                _this.disableSpeakingEvents();
            });
        }
        if (!this.publisherStopSpeakingEventEnabled) {
            this.publisherStopSpeakingEventEnabled = true;
            this.speechEvent.once('stopped_speaking', function () {
                _this.session.emitEvent('publisherStopSpeaking', [new PublisherSpeakingEvent_1.PublisherSpeakingEvent(_this.session, 'publisherStopSpeaking', _this.connection, _this.streamId)]);
                _this.disableSpeakingEvents();
            });
        }
    };
    /**
     * @hidden
     */
    Stream.prototype.disableSpeakingEvents = function () {
        if (!!this.speechEvent) {
            if (this.volumeChangeEventEnabled) {
                // 'streamAudioVolumeChange' event is enabled. Cannot stop the hark process
                this.speechEvent.off('speaking');
                this.speechEvent.off('stopped_speaking');
            }
            else {
                this.speechEvent.stop();
                delete this.speechEvent;
            }
        }
        this.publisherStartSpeakingEventEnabled = false;
        this.publisherStopSpeakingEventEnabled = false;
    };
    /**
     * @hidden
     */
    Stream.prototype.enableVolumeChangeEvent = function () {
        var _this = this;
        this.setSpeechEventIfNotExists();
        if (!this.volumeChangeEventEnabled) {
            this.volumeChangeEventEnabled = true;
            this.speechEvent.on('volume_change', function (harkEvent) {
                var oldValue = _this.speechEvent.oldVolumeValue;
                var value = { newValue: harkEvent, oldValue: oldValue };
                _this.speechEvent.oldVolumeValue = harkEvent;
                _this.streamManager.emitEvent('streamAudioVolumeChange', [new StreamManagerEvent_1.StreamManagerEvent(_this.streamManager, 'streamAudioVolumeChange', value)]);
            });
        }
    };
    /**
     * @hidden
     */
    Stream.prototype.enableOnceVolumeChangeEvent = function () {
        var _this = this;
        this.setSpeechEventIfNotExists();
        if (!this.volumeChangeEventEnabled) {
            this.volumeChangeEventEnabled = true;
            this.speechEvent.once('volume_change', function (harkEvent) {
                var oldValue = _this.speechEvent.oldVolumeValue;
                var value = { newValue: harkEvent, oldValue: oldValue };
                _this.speechEvent.oldVolumeValue = harkEvent;
                _this.disableVolumeChangeEvent();
                _this.streamManager.emitEvent('streamAudioVolumeChange', [new StreamManagerEvent_1.StreamManagerEvent(_this.streamManager, 'streamAudioVolumeChange', value)]);
            });
        }
    };
    /**
     * @hidden
     */
    Stream.prototype.disableVolumeChangeEvent = function () {
        if (!!this.speechEvent) {
            if (this.session.speakingEventsEnabled) {
                // 'publisherStartSpeaking' and/or publisherStopSpeaking` events are enabled. Cannot stop the hark process
                this.speechEvent.off('volume_change');
            }
            else {
                this.speechEvent.stop();
                delete this.speechEvent;
            }
        }
        this.volumeChangeEventEnabled = false;
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
                    videoDimensions: JSON.stringify(_this.videoDimensions),
                    filter: _this.outboundStreamOpts.publisherProperties.filter
                }, function (error, response) {
                    if (error) {
                        if (error.code === 401) {
                            reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.OPENVIDU_PERMISSION_DENIED, "You don't have permissions to publish"));
                        }
                        else {
                            reject('Error on publishVideo: ' + JSON.stringify(error));
                        }
                    }
                    else {
                        _this.webRtcPeer.processAnswer(response.sdpAnswer, false)
                            .then(function () {
                            _this.streamId = response.id;
                            _this.isLocalStreamPublished = true;
                            _this.publishedOnce = true;
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
                        // Ios Ionic. Limitation: some bug in iosrtc cordova plugin makes
                        // it necessary to add a timeout before processAnswer method
                        if (_this.session.isFirstIonicIosSubscriber) {
                            _this.session.isFirstIonicIosSubscriber = false;
                            _this.session['iosInterval'] = setTimeout(function () {
                                _this.session.countDownForIonicIosSubscribers = false;
                            }, 400);
                        }
                        var needsTimeoutOnProcessAswer = _this.session.countDownForIonicIosSubscribers;
                        _this.webRtcPeer.processAnswer(response.sdpAnswer, needsTimeoutOnProcessAswer).then(function () {
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
        if (platform['isIonicIos']) {
            // iOS Ionic. LIMITATION: must use deprecated WebRTC API
            var pc1 = this.webRtcPeer.pc;
            this.mediaStream = pc1.getRemoteStreams()[0];
        }
        else {
            this.mediaStream = new MediaStream();
            var receiver = void 0;
            for (var _i = 0, _a = this.webRtcPeer.pc.getReceivers(); _i < _a.length; _i++) {
                receiver = _a[_i];
                if (!!receiver.track) {
                    this.mediaStream.addTrack(receiver.track);
                }
            }
        }
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