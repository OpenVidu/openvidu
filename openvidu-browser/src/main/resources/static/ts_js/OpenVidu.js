/*
 * (C) Copyright 2016 OpenVidu (http://kurento.org/)
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
System.register("OpenVidu", ["Session", "Stream"], function(exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var Session_1, Stream_1;
    var OpenVidu;
    return {
        setters:[
            function (Session_1_1) {
                Session_1 = Session_1_1;
            },
            function (Stream_1_1) {
                Stream_1 = Stream_1_1;
            }],
        execute: function() {
            OpenVidu = (function () {
                function OpenVidu(wsUri) {
                    this.wsUri = wsUri;
                    if (this.wsUri.charAt(wsUri.length - 1) != '/') {
                        this.wsUri = '/';
                    }
                    this.wsUri += 'room';
                    this.session = new Session_1.Session(this);
                }
                OpenVidu.prototype.getRoom = function () {
                    return this.session;
                };
                OpenVidu.prototype.connect = function (callback) {
                    this.callback = callback;
                    this.initJsonRpcClient(this.wsUri);
                };
                OpenVidu.prototype.initJsonRpcClient = function (wsUri) {
                    var config = {
                        heartbeat: 3000,
                        sendCloseMessage: false,
                        ws: {
                            uri: wsUri,
                            useSockJS: false,
                            onconnected: this.connectCallback.bind(this),
                            ondisconnect: this.disconnectCallback.bind(this),
                            onreconnecting: this.reconnectingCallback.bind(this),
                            onreconnected: this.reconnectedCallback.bind(this)
                        },
                        rpc: {
                            requestTimeout: 15000,
                            //notifications
                            participantJoined: this.onParticipantJoined.bind(this),
                            participantPublished: this.onParticipantPublished.bind(this),
                            participantUnpublished: this.onParticipantLeft.bind(this),
                            participantLeft: this.onParticipantLeft.bind(this),
                            participantEvicted: this.onParticipantEvicted.bind(this),
                            sendMessage: this.onNewMessage.bind(this),
                            iceCandidate: this.iceCandidateEvent.bind(this),
                            mediaError: this.onMediaError.bind(this),
                            custonNotification: this.customNotification.bind(this)
                        }
                    };
                    this.jsonRpcClient = new RpcBuilder.clients.JsonRpcClient(config);
                };
                OpenVidu.prototype.customNotification = function (params) {
                    if (this.isRoomAvailable()) {
                        this.session.emitEvent("custom-message-received", [{ params: params }]);
                    }
                };
                OpenVidu.prototype.connectCallback = function (error) {
                    if (error) {
                        this.callback(error);
                    }
                    else {
                        this.callback(null, this);
                    }
                };
                OpenVidu.prototype.isRoomAvailable = function () {
                    if (this.session !== undefined && this.session instanceof Session_1.Session) {
                        return true;
                    }
                    else {
                        console.warn('Room instance not found');
                        return false;
                    }
                };
                OpenVidu.prototype.disconnectCallback = function () {
                    console.log('Websocket connection lost');
                    if (this.isRoomAvailable()) {
                        this.session.onLostConnection();
                    }
                    else {
                        alert('Connection error. Please reload page.');
                    }
                };
                OpenVidu.prototype.reconnectingCallback = function () {
                    console.log('Websocket connection lost (reconnecting)');
                    if (this.isRoomAvailable()) {
                        this.session.onLostConnection();
                    }
                    else {
                        alert('Connection error. Please reload page.');
                    }
                };
                OpenVidu.prototype.reconnectedCallback = function () {
                    console.log('Websocket reconnected');
                };
                OpenVidu.prototype.onParticipantJoined = function (params) {
                    if (this.isRoomAvailable()) {
                        this.session.onParticipantJoined(params);
                    }
                };
                OpenVidu.prototype.onParticipantPublished = function (params) {
                    if (this.isRoomAvailable()) {
                        this.session.onParticipantPublished(params);
                    }
                };
                OpenVidu.prototype.onParticipantLeft = function (params) {
                    if (this.isRoomAvailable()) {
                        this.session.onParticipantLeft(params);
                    }
                };
                OpenVidu.prototype.onParticipantEvicted = function (params) {
                    if (this.isRoomAvailable()) {
                        this.session.onParticipantEvicted(params);
                    }
                };
                OpenVidu.prototype.onNewMessage = function (params) {
                    if (this.isRoomAvailable()) {
                        this.session.onNewMessage(params);
                    }
                };
                OpenVidu.prototype.iceCandidateEvent = function (params) {
                    if (this.isRoomAvailable()) {
                        this.session.recvIceCandidate(params);
                    }
                };
                OpenVidu.prototype.onRoomClosed = function (params) {
                    if (this.isRoomAvailable()) {
                        this.session.onRoomClosed(params);
                    }
                };
                OpenVidu.prototype.onMediaError = function (params) {
                    if (this.isRoomAvailable()) {
                        this.session.onMediaError(params);
                    }
                };
                OpenVidu.prototype.setRpcParams = function (params) {
                    this.rpcParams = params;
                };
                OpenVidu.prototype.sendRequest = function (method, params, callback) {
                    if (params && params instanceof Function) {
                        callback = params;
                        params = undefined;
                    }
                    params = params || {};
                    if (this.rpcParams && this.rpcParams !== null && this.rpcParams !== undefined) {
                        for (var index in this.rpcParams) {
                            if (this.rpcParams.hasOwnProperty(index)) {
                                params[index] = this.rpcParams[index];
                                console.log('RPC param added to request {' + index + ': ' + this.rpcParams[index] + '}');
                            }
                        }
                    }
                    console.log('Sending request: { method:"' + method + '", params: ' + JSON.stringify(params) + ' }');
                    this.jsonRpcClient.send(method, params, callback);
                };
                OpenVidu.prototype.close = function (forced) {
                    if (this.isRoomAvailable()) {
                        this.session.leave(forced, this.jsonRpcClient);
                    }
                };
                ;
                OpenVidu.prototype.disconnectParticipant = function (stream) {
                    if (this.isRoomAvailable()) {
                        this.session.disconnect(stream);
                    }
                };
                OpenVidu.prototype.getCamera = function (options) {
                    if (this.camera) {
                        return this.camera;
                    }
                    options = options || {
                        audio: true,
                        video: true,
                        data: true
                    };
                    options.participant = this.session.getLocalParticipant();
                    this.camera = new Stream_1.Stream(this, true, this.session, options);
                    return this.camera;
                };
                ;
                OpenVidu.prototype.joinSession = function (options, callback) {
                    var _this = this;
                    this.session.configure(options);
                    this.session.connect();
                    this.session.addEventListener('room-connected', function (roomEvent) { return callback(undefined, _this.session); });
                    this.session.addEventListener('error-room', function (error) { return callback(error); });
                    return this.session;
                };
                ;
                //CHAT
                OpenVidu.prototype.sendMessage = function (room, user, message) {
                    this.sendRequest('sendMessage', {
                        message: message,
                        userMessage: user,
                        roomMessage: room
                    }, function (error, response) {
                        if (error) {
                            console.error(error);
                        }
                    });
                };
                ;
                OpenVidu.prototype.sendCustomRequest = function (params, callback) {
                    this.sendRequest('customRequest', params, callback);
                };
                ;
                return OpenVidu;
            }());
            exports_1("OpenVidu", OpenVidu);
        }
    }
});
System.register("Participant", ["Stream"], function(exports_2, context_2) {
    "use strict";
    var __moduleName = context_2 && context_2.id;
    var Stream_2;
    var Participant;
    return {
        setters:[
            function (Stream_2_1) {
                Stream_2 = Stream_2_1;
            }],
        execute: function() {
            Participant = (function () {
                function Participant(openVidu, local, room, options) {
                    this.openVidu = openVidu;
                    this.local = local;
                    this.room = room;
                    this.options = options;
                    this.streams = {};
                    this.streamsOpts = [];
                    if (options) {
                        this.id = options.id;
                        if (options.streams) {
                            for (var _i = 0, _a = options.streams; _i < _a.length; _i++) {
                                var streamOptions = _a[_i];
                                var streamOpts = {
                                    id: streamOptions.id,
                                    participant: this,
                                    recvVideo: (streamOptions.recvVideo == undefined ? true : streamOptions.recvVideo),
                                    recvAudio: (streamOptions.recvAudio == undefined ? true : streamOptions.recvAudio),
                                    audio: streamOptions.audio,
                                    video: streamOptions.video,
                                    data: streamOptions.data
                                };
                                var stream = new Stream_2.Stream(openVidu, false, room, streamOpts);
                                this.addStream(stream);
                                this.streamsOpts.push(streamOpts);
                            }
                        }
                    }
                    console.log("New " + (local ? "local " : "remote ") + "participant " + this.id
                        + ", streams opts: ", this.streamsOpts);
                }
                Participant.prototype.setId = function (newId) {
                    this.id = newId;
                };
                Participant.prototype.addStream = function (stream) {
                    this.streams[stream.getIdInParticipant()] = stream;
                    this.room.getStreams()[stream.getIdInParticipant()] = stream;
                };
                Participant.prototype.getStreams = function () {
                    return this.streams;
                };
                Participant.prototype.dispose = function () {
                    for (var key in this.streams) {
                        this.streams[key].dispose();
                    }
                };
                Participant.prototype.getId = function () {
                    return this.id;
                };
                Participant.prototype.sendIceCandidate = function (candidate) {
                    console.debug((this.local ? "Local" : "Remote"), "candidate for", this.getId(), JSON.stringify(candidate));
                    this.openVidu.sendRequest("onIceCandidate", {
                        endpointName: this.getId(),
                        candidate: candidate.candidate,
                        sdpMid: candidate.sdpMid,
                        sdpMLineIndex: candidate.sdpMLineIndex
                    }, function (error, response) {
                        if (error) {
                            console.error("Error sending ICE candidate: "
                                + JSON.stringify(error));
                        }
                    });
                };
                return Participant;
            }());
            exports_2("Participant", Participant);
        }
    }
});
System.register("Stream", [], function(exports_3, context_3) {
    "use strict";
    var __moduleName = context_3 && context_3.id;
    var Stream;
    function jq(id) {
        return "#" + id.replace(/(@|:|\.|\[|\]|,)/g, "\\$1");
    }
    return {
        setters:[],
        execute: function() {
            Stream = (function () {
                function Stream(openVidu, local, room, options) {
                    this.openVidu = openVidu;
                    this.local = local;
                    this.room = room;
                    this.ee = new EventEmitter();
                    this.videoElements = [];
                    this.elements = [];
                    this.showMyRemote = false;
                    this.localMirrored = false;
                    this.chanId = 0;
                    this.dataChannelOpened = false;
                    if (options.id) {
                        this.id = options.id;
                    }
                    else {
                        this.id = "webcam";
                    }
                    this.participant = options.participant;
                    this.recvVideo = options.recvVideo;
                    this.recvAudio = options.recvAudio;
                    this.dataChannel = options.data || false;
                }
                Stream.prototype.getRecvVideo = function () {
                    return this.recvVideo;
                };
                Stream.prototype.getRecvAudio = function () {
                    return this.recvAudio;
                };
                Stream.prototype.subscribeToMyRemote = function () {
                    this.showMyRemote = true;
                };
                Stream.prototype.displayMyRemote = function () {
                    return this.showMyRemote;
                };
                Stream.prototype.mirrorLocalStream = function (wr) {
                    this.showMyRemote = true;
                    this.localMirrored = true;
                    if (wr) {
                        this.wrStream = wr;
                    }
                };
                Stream.prototype.isLocalMirrored = function () {
                    return this.localMirrored;
                };
                Stream.prototype.getChannelName = function () {
                    return this.getId() + '_' + this.chanId++;
                };
                Stream.prototype.isDataChannelEnabled = function () {
                    return this.dataChannel;
                };
                Stream.prototype.isDataChannelOpened = function () {
                    return this.dataChannelOpened;
                };
                Stream.prototype.onDataChannelOpen = function (event) {
                    console.log('Data channel is opened');
                    this.dataChannelOpened = true;
                };
                Stream.prototype.onDataChannelClosed = function (event) {
                    console.log('Data channel is closed');
                    this.dataChannelOpened = false;
                };
                Stream.prototype.sendData = function (data) {
                    if (this.wp === undefined) {
                        throw new Error('WebRTC peer has not been created yet');
                    }
                    if (!this.dataChannelOpened) {
                        throw new Error('Data channel is not opened');
                    }
                    console.log("Sending through data channel: " + data);
                    this.wp.send(data);
                };
                Stream.prototype.getWrStream = function () {
                    return this.wrStream;
                };
                Stream.prototype.getWebRtcPeer = function () {
                    return this.wp;
                };
                Stream.prototype.addEventListener = function (eventName, listener) {
                    this.ee.addListener(eventName, listener);
                };
                Stream.prototype.showSpinner = function (spinnerParentId) {
                    var progress = document.createElement('div');
                    progress.id = 'progress-' + this.getId();
                    progress.style.background = "center transparent url('img/spinner.gif') no-repeat";
                    var spinnerParent = document.getElementById(spinnerParentId);
                    if (spinnerParent) {
                        spinnerParent.appendChild(progress);
                    }
                };
                Stream.prototype.hideSpinner = function (spinnerId) {
                    spinnerId = (spinnerId === undefined) ? this.getId() : spinnerId;
                    $(jq('progress-' + spinnerId)).hide();
                };
                Stream.prototype.playOnlyVideo = function (parentElement, thumbnailId) {
                    this.video = document.createElement('video');
                    this.video.id = 'native-video-' + this.getId();
                    this.video.autoplay = true;
                    this.video.controls = false;
                    if (this.wrStream) {
                        this.video.src = URL.createObjectURL(this.wrStream);
                        $(jq(thumbnailId)).show();
                        this.hideSpinner();
                    }
                    else {
                        console.log("No wrStream yet for", this.getId());
                    }
                    this.videoElements.push({
                        thumb: thumbnailId,
                        video: this.video
                    });
                    if (this.local) {
                        this.video.muted = true;
                    }
                    if (typeof parentElement === "string") {
                        var parentElementDom = document.getElementById(parentElement);
                        if (parentElementDom) {
                            parentElementDom.appendChild(this.video);
                        }
                    }
                    else {
                        parentElement.appendChild(this.video);
                    }
                    return this.video;
                };
                Stream.prototype.playThumbnail = function (thumbnailId) {
                    var container = document.createElement('div');
                    container.className = "participant";
                    container.id = this.getId();
                    var thumbnail = document.getElementById(thumbnailId);
                    if (thumbnail) {
                        thumbnail.appendChild(container);
                    }
                    this.elements.push(container);
                    var name = document.createElement('div');
                    container.appendChild(name);
                    var userName = this.getId().replace('_webcam', '');
                    if (userName.length >= 16) {
                        userName = userName.substring(0, 16) + "...";
                    }
                    name.appendChild(document.createTextNode(userName));
                    name.id = "name-" + this.getId();
                    name.className = "name";
                    name.title = this.getId();
                    this.showSpinner(thumbnailId);
                    return this.playOnlyVideo(container, thumbnailId);
                };
                Stream.prototype.getIdInParticipant = function () {
                    return this.id;
                };
                Stream.prototype.getParticipant = function () {
                    return this.participant;
                };
                Stream.prototype.getId = function () {
                    if (this.participant) {
                        return this.participant.getId() + "_" + this.id;
                    }
                    else {
                        return this.id + "_webcam";
                    }
                };
                Stream.prototype.requestCameraAccess = function (callback) {
                    var _this = this;
                    this.participant.addStream(this);
                    var constraints = {
                        audio: true,
                        video: {
                            width: {
                                ideal: 1280
                            },
                            frameRate: {
                                ideal: 15
                            }
                        }
                    };
                    getUserMedia(constraints, function (userStream) {
                        _this.wrStream = userStream;
                        callback(undefined, _this);
                    }, function (error) {
                        console.error("Access denied", error);
                        callback(error, undefined);
                    });
                };
                Stream.prototype.publishVideoCallback = function (error, sdpOfferParam, wp) {
                    var _this = this;
                    if (error) {
                        return console.error("(publish) SDP offer error: "
                            + JSON.stringify(error));
                    }
                    console.log("Sending SDP offer to publish as "
                        + this.getId(), sdpOfferParam);
                    this.openVidu.sendRequest("publishVideo", {
                        sdpOffer: sdpOfferParam,
                        doLoopback: this.displayMyRemote() || false
                    }, function (error, response) {
                        if (error) {
                            console.error("Error on publishVideo: " + JSON.stringify(error));
                        }
                        else {
                            _this.room.emitEvent('stream-published', [{
                                    stream: _this
                                }]);
                            _this.processSdpAnswer(response.sdpAnswer);
                        }
                    });
                };
                Stream.prototype.startVideoCallback = function (error, sdpOfferParam, wp) {
                    var _this = this;
                    if (error) {
                        return console.error("(subscribe) SDP offer error: "
                            + JSON.stringify(error));
                    }
                    console.log("Sending SDP offer to subscribe to "
                        + this.getId(), sdpOfferParam);
                    this.openVidu.sendRequest("receiveVideoFrom", {
                        sender: this.getId(),
                        sdpOffer: sdpOfferParam
                    }, function (error, response) {
                        if (error) {
                            console.error("Error on recvVideoFrom: " + JSON.stringify(error));
                        }
                        else {
                            _this.processSdpAnswer(response.sdpAnswer);
                        }
                    });
                };
                Stream.prototype.initWebRtcPeer = function (sdpOfferCallback) {
                    var _this = this;
                    if (this.local) {
                        var options = {
                            videoStream: this.wrStream,
                            onicecandidate: this.participant.sendIceCandidate.bind(this.participant),
                        };
                        if (this.dataChannel) {
                            options.dataChannelConfig = {
                                id: this.getChannelName(),
                                onopen: this.onDataChannelOpen,
                                onclose: this.onDataChannelClosed
                            };
                            options.dataChannels = true;
                        }
                        if (this.displayMyRemote()) {
                            this.wp = new kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function (error) {
                                if (error) {
                                    return console.error(error);
                                }
                                _this.wp.generateOffer(sdpOfferCallback.bind(_this));
                            });
                        }
                        else {
                            this.wp = new kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function (error) {
                                if (error) {
                                    return console.error(error);
                                }
                                _this.wp.generateOffer(sdpOfferCallback.bind(_this));
                            });
                        }
                    }
                    else {
                        var offerConstraints = {
                            mandatory: {
                                OfferToReceiveVideo: this.recvVideo,
                                OfferToReceiveAudio: this.recvAudio
                            }
                        };
                        console.log("Constraints of generate SDP offer (subscribing)", offerConstraints);
                        var options = {
                            onicecandidate: this.participant.sendIceCandidate.bind(this.participant),
                            connectionConstraints: offerConstraints
                        };
                        this.wp = new kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function (error) {
                            if (error) {
                                return console.error(error);
                            }
                            _this.wp.generateOffer(sdpOfferCallback.bind(_this));
                        });
                    }
                    console.log("Waiting for SDP offer to be generated ("
                        + (this.local ? "local" : "remote") + " peer: " + this.getId() + ")");
                };
                Stream.prototype.publish = function () {
                    // FIXME: Throw error when stream is not local
                    this.initWebRtcPeer(this.publishVideoCallback);
                    // FIXME: Now we have coupled connecting to a room and adding a
                    // stream to this room. But in the new API, there are two steps.
                    // This is the second step. For now, it do nothing.
                };
                Stream.prototype.subscribe = function () {
                    // FIXME: In the current implementation all participants are subscribed
                    // automatically to all other participants. We use this method only to
                    // negotiate SDP
                    this.initWebRtcPeer(this.startVideoCallback);
                };
                Stream.prototype.processSdpAnswer = function (sdpAnswer) {
                    var _this = this;
                    var answer = new RTCSessionDescription({
                        type: 'answer',
                        sdp: sdpAnswer,
                    });
                    console.log(this.getId() + ": set peer connection with recvd SDP answer", sdpAnswer);
                    var participantId = this.getId();
                    var pc = this.wp.peerConnection;
                    pc.setRemoteDescription(answer, function () {
                        // Avoids to subscribe to your own stream remotely 
                        // except when showMyRemote is true
                        if (!_this.local || _this.displayMyRemote()) {
                            _this.wrStream = pc.getRemoteStreams()[0];
                            console.log("Peer remote stream", _this.wrStream);
                            if (_this.wrStream != undefined) {
                                _this.speechEvent = kurentoUtils.WebRtcPeer.hark(_this.wrStream, { threshold: _this.room.thresholdSpeaker });
                                _this.speechEvent.on('speaking', function () {
                                    _this.room.addParticipantSpeaking(participantId);
                                    _this.room.emitEvent('stream-speaking', [{
                                            participantId: participantId
                                        }]);
                                });
                                _this.speechEvent.on('stopped_speaking', function () {
                                    _this.room.removeParticipantSpeaking(participantId);
                                    _this.room.emitEvent('stream-stopped-speaking', [{
                                            participantId: participantId
                                        }]);
                                });
                            }
                            var _loop_1 = function(videoElement) {
                                var thumbnailId = videoElement.thumb;
                                var video = videoElement.video;
                                video.src = URL.createObjectURL(_this.wrStream);
                                video.onplay = function () {
                                    console.log(_this.getId() + ': ' + 'Video playing');
                                    $(jq(thumbnailId)).show();
                                    _this.hideSpinner(_this.getId());
                                };
                            };
                            for (var _i = 0, _a = _this.videoElements; _i < _a.length; _i++) {
                                var videoElement = _a[_i];
                                _loop_1(videoElement);
                            }
                            _this.room.emitEvent('stream-subscribed', [{
                                    stream: _this
                                }]);
                        }
                    }, function (error) {
                        console.error(_this.getId() + ": Error setting SDP to the peer connection: "
                            + JSON.stringify(error));
                    });
                };
                Stream.prototype.unpublish = function () {
                    if (this.wp) {
                        this.wp.dispose();
                    }
                    else {
                        if (this.wrStream) {
                            this.wrStream.getAudioTracks().forEach(function (track) {
                                track.stop && track.stop();
                            });
                            this.wrStream.getVideoTracks().forEach(function (track) {
                                track.stop && track.stop();
                            });
                        }
                    }
                    if (this.speechEvent) {
                        this.speechEvent.stop();
                    }
                    console.log(this.getId() + ": Stream '" + this.id + "' unpublished");
                };
                Stream.prototype.dispose = function () {
                    function disposeElement(element) {
                        if (element && element.parentNode) {
                            element.parentNode.removeChild(element);
                        }
                    }
                    this.elements.forEach(function (e) { return disposeElement(e); });
                    this.videoElements.forEach(function (ve) { return disposeElement(ve); });
                    disposeElement("progress-" + this.getId());
                    if (this.wp) {
                        this.wp.dispose();
                    }
                    else {
                        if (this.wrStream) {
                            this.wrStream.getAudioTracks().forEach(function (track) {
                                track.stop && track.stop();
                            });
                            this.wrStream.getVideoTracks().forEach(function (track) {
                                track.stop && track.stop();
                            });
                        }
                    }
                    if (this.speechEvent) {
                        this.speechEvent.stop();
                    }
                    console.log(this.getId() + ": Stream '" + this.id + "' disposed");
                };
                return Stream;
            }());
            exports_3("Stream", Stream);
        }
    }
});
System.register("Session", ["Participant"], function(exports_4, context_4) {
    "use strict";
    var __moduleName = context_4 && context_4.id;
    var Participant_1;
    var Session;
    return {
        setters:[
            function (Participant_1_1) {
                Participant_1 = Participant_1_1;
            }],
        execute: function() {
            Session = (function () {
                function Session(openVidu) {
                    this.openVidu = openVidu;
                    this.ee = new EventEmitter();
                    this.streams = {};
                    this.participants = {};
                    this.participantsSpeaking = [];
                    this.connected = false;
                    this.localParticipant = new Participant_1.Participant(this.openVidu, true, this);
                }
                Session.prototype.configure = function (options) {
                    this.options = options;
                    this.id = options.sessionId;
                    this.subscribeToStreams = options.subscribeToStreams || true;
                    this.updateSpeakerInterval = options.updateSpeakerInterval || 1500;
                    this.thresholdSpeaker = options.thresholdSpeaker || -50;
                    this.localParticipant.setId(options.participantId);
                    this.activateUpdateMainSpeaker();
                    this.participants[options.participantId] = this.localParticipant;
                };
                Session.prototype.activateUpdateMainSpeaker = function () {
                    var _this = this;
                    setInterval(function () {
                        if (_this.participantsSpeaking.length > 0) {
                            _this.ee.emitEvent('update-main-speaker', [{
                                    participantId: _this.participantsSpeaking[_this.participantsSpeaking.length - 1]
                                }]);
                        }
                    }, this.updateSpeakerInterval);
                };
                Session.prototype.getLocalParticipant = function () {
                    return this.localParticipant;
                };
                Session.prototype.addEventListener = function (eventName, listener) {
                    this.ee.addListener(eventName, listener);
                };
                Session.prototype.emitEvent = function (eventName, eventsArray) {
                    this.ee.emitEvent(eventName, eventsArray);
                };
                Session.prototype.connect = function () {
                    var _this = this;
                    var joinParams = {
                        user: this.options.participantId,
                        room: this.options.sessionId,
                        dataChannels: false
                    };
                    if (this.localParticipant) {
                        if (Object.keys(this.localParticipant.getStreams()).some(function (streamId) {
                            return _this.streams[streamId].isDataChannelEnabled();
                        })) {
                            joinParams.dataChannels = true;
                        }
                    }
                    this.openVidu.sendRequest('joinRoom', joinParams, function (error, response) {
                        if (error) {
                            console.warn('Unable to join room', error);
                            _this.ee.emitEvent('error-room', [{
                                    error: error
                                }]);
                        }
                        else {
                            _this.connected = true;
                            var exParticipants = response.value;
                            var roomEvent = {
                                participants: new Array(),
                                streams: new Array()
                            };
                            var length_1 = exParticipants.length;
                            for (var i = 0; i < length_1; i++) {
                                var participant = new Participant_1.Participant(_this.openVidu, false, _this, exParticipants[i]);
                                _this.participants[participant.getId()] = participant;
                                roomEvent.participants.push(participant);
                                var streams = participant.getStreams();
                                for (var key in streams) {
                                    roomEvent.streams.push(streams[key]);
                                    if (_this.subscribeToStreams) {
                                        streams[key].subscribe();
                                    }
                                }
                            }
                            _this.ee.emitEvent('room-connected', [roomEvent]);
                            if (_this.subscribeToStreams) {
                                for (var _i = 0, _a = roomEvent.streams; _i < _a.length; _i++) {
                                    var stream = _a[_i];
                                    _this.ee.emitEvent('stream-added', [{ stream: stream }]);
                                }
                            }
                        }
                    });
                };
                Session.prototype.subscribe = function (stream) {
                    stream.subscribe();
                };
                Session.prototype.onParticipantPublished = function (options) {
                    var participant = new Participant_1.Participant(this.openVidu, false, this, options);
                    var pid = participant.getId();
                    if (!(pid in this.participants)) {
                        console.info("Publisher not found in participants list by its id", pid);
                    }
                    else {
                        console.log("Publisher found in participants list by its id", pid);
                    }
                    //replacing old participant (this one has streams)
                    this.participants[pid] = participant;
                    this.ee.emitEvent('participant-published', [{ participant: participant }]);
                    var streams = participant.getStreams();
                    for (var key in streams) {
                        var stream = streams[key];
                        if (this.subscribeToStreams) {
                            stream.subscribe();
                            this.ee.emitEvent('stream-added', [{ stream: stream }]);
                        }
                    }
                };
                Session.prototype.onParticipantJoined = function (msg) {
                    var participant = new Participant_1.Participant(this.openVidu, false, this, msg);
                    var pid = participant.getId();
                    if (!(pid in this.participants)) {
                        console.log("New participant to participants list with id", pid);
                        this.participants[pid] = participant;
                    }
                    else {
                        //use existing so that we don't lose streams info
                        console.info("Participant already exists in participants list with " +
                            "the same id, old:", this.participants[pid], ", joined now:", participant);
                        participant = this.participants[pid];
                    }
                    this.ee.emitEvent('participant-joined', [{
                            participant: participant
                        }]);
                };
                Session.prototype.onParticipantLeft = function (msg) {
                    var participant = this.participants[msg.name];
                    if (participant !== undefined) {
                        delete this.participants[msg.name];
                        this.ee.emitEvent('participant-left', [{
                                participant: participant
                            }]);
                        var streams = participant.getStreams();
                        for (var key in streams) {
                            this.ee.emitEvent('stream-removed', [{
                                    stream: streams[key]
                                }]);
                        }
                        participant.dispose();
                    }
                    else {
                        console.warn("Participant " + msg.name
                            + " unknown. Participants: "
                            + JSON.stringify(this.participants));
                    }
                };
                ;
                Session.prototype.onParticipantEvicted = function (msg) {
                    this.ee.emitEvent('participant-evicted', [{
                            localParticipant: this.localParticipant
                        }]);
                };
                ;
                Session.prototype.onNewMessage = function (msg) {
                    console.log("New message: " + JSON.stringify(msg));
                    var room = msg.room;
                    var user = msg.user;
                    var message = msg.message;
                    if (user !== undefined) {
                        this.ee.emitEvent('newMessage', [{
                                room: room,
                                user: user,
                                message: message
                            }]);
                    }
                    else {
                        console.error("User undefined in new message:", msg);
                    }
                };
                Session.prototype.recvIceCandidate = function (msg) {
                    var candidate = {
                        candidate: msg.candidate,
                        sdpMid: msg.sdpMid,
                        sdpMLineIndex: msg.sdpMLineIndex
                    };
                    var participant = this.participants[msg.endpointName];
                    if (!participant) {
                        console.error("Participant not found for endpoint " +
                            msg.endpointName + ". Ice candidate will be ignored.", candidate);
                        return;
                    }
                    var streams = participant.getStreams();
                    var _loop_2 = function(key) {
                        var stream = streams[key];
                        stream.getWebRtcPeer().addIceCandidate(candidate, function (error) {
                            if (error) {
                                console.error("Error adding candidate for " + key
                                    + " stream of endpoint " + msg.endpointName
                                    + ": " + error);
                            }
                        });
                    };
                    for (var key in streams) {
                        _loop_2(key);
                    }
                };
                Session.prototype.onRoomClosed = function (msg) {
                    console.log("Room closed: " + JSON.stringify(msg));
                    var room = msg.room;
                    if (room !== undefined) {
                        this.ee.emitEvent('room-closed', [{
                                room: room
                            }]);
                    }
                    else {
                        console.error("Room undefined in on room closed", msg);
                    }
                };
                Session.prototype.onLostConnection = function () {
                    if (!this.connected) {
                        console.warn('Not connected to room, ignoring lost connection notification');
                        return;
                    }
                    console.log('Lost connection in room ' + this.id);
                    var room = this.id;
                    if (room !== undefined) {
                        this.ee.emitEvent('lost-connection', [{ room: room }]);
                    }
                    else {
                        console.error('Room undefined when lost connection');
                    }
                };
                Session.prototype.onMediaError = function (params) {
                    console.error("Media error: " + JSON.stringify(params));
                    var error = params.error;
                    if (error) {
                        this.ee.emitEvent('error-media', [{
                                error: error
                            }]);
                    }
                    else {
                        console.error("Received undefined media error. Params:", params);
                    }
                };
                /*
                 * forced means the user was evicted, no need to send the 'leaveRoom' request
                 */
                Session.prototype.leave = function (forced, jsonRpcClient) {
                    forced = !!forced;
                    console.log("Leaving room (forced=" + forced + ")");
                    if (this.connected && !forced) {
                        this.openVidu.sendRequest('leaveRoom', function (error, response) {
                            if (error) {
                                console.error(error);
                            }
                            jsonRpcClient.close();
                        });
                    }
                    else {
                        jsonRpcClient.close();
                    }
                    this.connected = false;
                    if (this.participants) {
                        for (var pid in this.participants) {
                            this.participants[pid].dispose();
                            delete this.participants[pid];
                        }
                    }
                };
                Session.prototype.disconnect = function (stream) {
                    var participant = stream.getParticipant();
                    if (!participant) {
                        console.error("Stream to disconnect has no participant", stream);
                        return;
                    }
                    delete this.participants[participant.getId()];
                    participant.dispose();
                    if (participant === this.localParticipant) {
                        console.log("Unpublishing my media (I'm " + participant.getId() + ")");
                        delete this.localParticipant;
                        this.openVidu.sendRequest('unpublishVideo', function (error, response) {
                            if (error) {
                                console.error(error);
                            }
                            else {
                                console.info("Media unpublished correctly");
                            }
                        });
                    }
                    else {
                        console.log("Unsubscribing from " + stream.getId());
                        this.openVidu.sendRequest('unsubscribeFromVideo', {
                            sender: stream.getId()
                        }, function (error, response) {
                            if (error) {
                                console.error(error);
                            }
                            else {
                                console.info("Unsubscribed correctly from " + stream.getId());
                            }
                        });
                    }
                };
                Session.prototype.getStreams = function () {
                    return this.streams;
                };
                Session.prototype.addParticipantSpeaking = function (participantId) {
                    this.participantsSpeaking.push(participantId);
                };
                Session.prototype.removeParticipantSpeaking = function (participantId) {
                    var pos = -1;
                    for (var i = 0; i < this.participantsSpeaking.length; i++) {
                        if (this.participantsSpeaking[i] == participantId) {
                            pos = i;
                            break;
                        }
                    }
                    if (pos != -1) {
                        this.participantsSpeaking.splice(pos, 1);
                    }
                };
                return Session;
            }());
            exports_4("Session", Session);
        }
    }
});
System.register("Main", ["Session", "Participant", "Stream", "OpenVidu"], function(exports_5, context_5) {
    "use strict";
    var __moduleName = context_5 && context_5.id;
    return {
        setters:[
            function (Session_2_1) {
                exports_5({
                    "Session": Session_2_1["Session"]
                });
            },
            function (Participant_2_1) {
                exports_5({
                    "Participant": Participant_2_1["Participant"]
                });
            },
            function (Stream_3_1) {
                exports_5({
                    "Stream": Stream_3_1["Stream"]
                });
            },
            function (OpenVidu_1_1) {
                exports_5({
                    "OpenVidu": OpenVidu_1_1["OpenVidu"]
                });
            }],
        execute: function() {
        }
    }
});
//# sourceMappingURL=OpenVidu.js.map