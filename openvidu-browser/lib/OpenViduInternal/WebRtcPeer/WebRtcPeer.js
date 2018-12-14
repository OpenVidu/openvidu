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
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var freeice = require("freeice");
var uuid = require("uuid");
var platform = require("platform");
platform['isIonicIos'] = (platform.product === 'iPhone' || platform.product === 'iPad') && platform.ua.indexOf('Safari') === -1;
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
            if (!!event.candidate) {
                var candidate = event.candidate;
                if (candidate) {
                    _this.localCandidatesQueue.push({ candidate: candidate.candidate });
                    _this.candidategatheringdone = false;
                    _this.configuration.onicecandidate(event.candidate);
                }
                else if (!_this.candidategatheringdone) {
                    _this.candidategatheringdone = true;
                }
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
                if (platform['isIonicIos']) {
                    // iOS Ionic. LIMITATION: must use deprecated WebRTC API
                    var pc2 = _this.pc;
                    pc2.addStream(_this.configuration.mediaStream);
                }
                else {
                    for (var _i = 0, _a = _this.configuration.mediaStream.getTracks(); _i < _a.length; _i++) {
                        var track = _a[_i];
                        _this.pc.addTrack(track, _this.configuration.mediaStream);
                    }
                }
                resolve();
            }
        });
    };
    /**
     * This method frees the resources used by WebRtcPeer
     */
    WebRtcPeer.prototype.dispose = function (videoSourceIsMediaStreamTrack) {
        console.debug('Disposing WebRtcPeer');
        try {
            if (this.pc) {
                if (this.pc.signalingState === 'closed') {
                    return;
                }
                this.remoteCandidatesQueue = [];
                this.localCandidatesQueue = [];
                if (platform['isIonicIos']) {
                    // iOS Ionic. LIMITATION: must use deprecated WebRTC API
                    // Stop senders deprecated
                    var pc1 = this.pc;
                    for (var _i = 0, _a = pc1.getLocalStreams(); _i < _a.length; _i++) {
                        var sender = _a[_i];
                        if (!videoSourceIsMediaStreamTrack) {
                            sender.stop();
                        }
                        pc1.removeStream(sender);
                    }
                    // Stop receivers deprecated
                    for (var _b = 0, _c = pc1.getRemoteStreams(); _b < _c.length; _b++) {
                        var receiver = _c[_b];
                        if (!!receiver.track) {
                            receiver.stop();
                        }
                    }
                }
                else {
                    // Stop senders
                    for (var _d = 0, _e = this.pc.getSenders(); _d < _e.length; _d++) {
                        var sender = _e[_d];
                        if (!videoSourceIsMediaStreamTrack) {
                            if (!!sender.track) {
                                sender.track.stop();
                            }
                        }
                        this.pc.removeTrack(sender);
                    }
                    // Stop receivers
                    for (var _f = 0, _g = this.pc.getReceivers(); _f < _g.length; _f++) {
                        var receiver = _g[_f];
                        if (!!receiver.track) {
                            receiver.track.stop();
                        }
                    }
                }
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
                offerToReceiveAudio: (_this.configuration.mode !== 'sendonly' && offerAudio),
                offerToReceiveVideo: (_this.configuration.mode !== 'sendonly' && offerVideo)
            };
            console.debug('RTCPeerConnection constraints: ' + JSON.stringify(constraints));
            if (platform.name === 'Safari' && platform.ua.indexOf('Safari') !== -1) {
                // Safari (excluding Ionic), at least on iOS just seems to support unified plan, whereas in other browsers is not yet ready and considered experimental
                if (offerAudio) {
                    _this.pc.addTransceiver('audio', {
                        direction: _this.configuration.mode
                    });
                }
                if (offerVideo) {
                    _this.pc.addTransceiver('video', {
                        direction: _this.configuration.mode
                    });
                }
                _this.pc
                    .createOffer()
                    .then(function (offer) {
                    console.debug('Created SDP offer');
                    return _this.pc.setLocalDescription(offer);
                })
                    .then(function () {
                    var localDescription = _this.pc.localDescription;
                    if (!!localDescription) {
                        console.debug('Local description set', localDescription.sdp);
                        resolve(localDescription.sdp);
                    }
                    else {
                        reject('Local description is not defined');
                    }
                })["catch"](function (error) { return reject(error); });
            }
            else {
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
            }
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
    WebRtcPeer.prototype.processAnswer = function (sdpAnswer, needsTimeoutOnProcessAswer) {
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
            if (needsTimeoutOnProcessAswer && platform['isIonicIos']) {
                setTimeout(function () {
                    console.info('setRemoteDescription run after timout for iOS device');
                    _this.pc.setRemoteDescription(answer).then(function () { return resolve(); })["catch"](function (error) { return reject(error); });
                }, 250);
            }
            else {
                _this.pc.setRemoteDescription(answer).then(function () { return resolve(); })["catch"](function (error) { return reject(error); });
            }
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