webpackJsonp([1,4],{

/***/ 104:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var EventEmitter = __webpack_require__(52);
var kurentoUtils = __webpack_require__(277);
var adapter = __webpack_require__(175);
if (window) {
    window["adapter"] = adapter;
}
function jq(id) {
    return id.replace(/(@|:|\.|\[|\]|,)/g, "\\$1");
}
function show(id) {
    document.getElementById(jq(id)).style.display = 'block';
}
function hide(id) {
    document.getElementById(jq(id)).style.display = 'none';
}
var Stream = (function () {
    function Stream(openVidu, local, room, options) {
        var _this = this;
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
        this.audioOnly = false;
        this.isReady = false;
        this.isVideoELementCreated = false;
        this.accessIsAllowed = false;
        this.accessIsDenied = false;
        if (options.id) {
            this.id = options.id;
        }
        else {
            this.id = "webcam";
        }
        this.connection = options.connection;
        this.recvVideo = options.recvVideo;
        this.recvAudio = options.recvAudio;
        this.dataChannel = options.data || false;
        this.sendVideo = options.video;
        this.sendAudio = options.audio;
        this.mediaConstraints = options.mediaConstraints;
        this.audioOnly = options.audioOnly || false;
        this.addEventListener('src-added', function (srcEvent) {
            _this.videoSrc = srcEvent.src;
            if (_this.video)
                _this.video.src = srcEvent.src;
            console.warn("Videosrc [" + srcEvent.src + "] added to stream [" + _this.getId() + "]");
        });
    }
    Stream.prototype.emitSrcEvent = function (wrstream) {
        this.ee.emitEvent('src-added', [{
                src: URL.createObjectURL(wrstream)
            }]);
    };
    Stream.prototype.emitStreamReadyEvent = function () {
        this.ee.emitEvent('stream-ready'), [{}];
    };
    Stream.prototype.getVideoSrc = function () {
        return this.videoSrc;
    };
    Stream.prototype.removeVideo = function (parentElement) {
        if (typeof parentElement === "string") {
            document.getElementById(parentElement).removeChild(this.video);
        }
        else if (parentElement instanceof Element) {
            parentElement.removeChild(this.video);
        }
        else if (!parentElement) {
            if (document.getElementById(this.parentId)) {
                document.getElementById(this.parentId).removeChild(this.video);
            }
        }
    };
    Stream.prototype.getVideoElement = function () {
        return this.video;
    };
    Stream.prototype.setVideoElement = function (video) {
        this.video = video;
    };
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
            this.emitSrcEvent(this.wrStream);
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
    Stream.prototype.addOnceEventListener = function (eventName, listener) {
        this.ee.addOnceListener(eventName, listener);
    };
    Stream.prototype.removeListener = function (eventName) {
        this.ee.removeAllListeners(eventName);
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
        hide('progress-' + spinnerId);
    };
    Stream.prototype.playOnlyVideo = function (parentElement, thumbnailId) {
        // TO-DO: check somehow if the stream is audio only, so the element created is <audio> instead of <video>
        this.video = document.createElement('video');
        this.video.id = 'native-video-' + this.getId();
        this.video.autoplay = true;
        this.video.controls = false;
        this.video.src = this.videoSrc;
        this.videoElements.push({
            thumb: thumbnailId,
            video: this.video
        });
        if (this.local) {
            this.video.muted = true;
        }
        else {
            this.video.title = this.getId();
        }
        if (typeof parentElement === "string") {
            this.parentId = parentElement;
            var parentElementDom = document.getElementById(parentElement);
            if (parentElementDom) {
                this.video = parentElementDom.appendChild(this.video);
                this.ee.emitEvent('video-element-created-by-stream', [{
                        element: this.video
                    }]);
                this.isVideoELementCreated = true;
            }
        }
        else {
            this.parentId = parentElement.id;
            this.video = parentElement.appendChild(this.video);
        }
        this.ee.emitEvent('stream-created-by-publisher');
        this.isReady = true;
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
        return this.connection;
    };
    Stream.prototype.getId = function () {
        if (this.connection) {
            return this.connection.connectionId + "_" + this.id;
        }
        else {
            return this.id + "_webcam";
        }
    };
    Stream.prototype.getRTCPeerConnection = function () {
        return this.getWebRtcPeer().peerConnection;
    };
    Stream.prototype.requestCameraAccess = function (callback) {
        var _this = this;
        this.connection.addStream(this);
        var constraints = this.mediaConstraints;
        /*let constraints2 = {
            audio: true,
            video: {
                width: {
                    ideal: 1280
                },
                frameRate: {
                    ideal: 15
                }
            }
        };*/
        this.userMediaHasVideo(function (hasVideo) {
            if (!hasVideo) {
                constraints.video = false;
                _this.sendVideo = false;
                _this.audioOnly = true;
                _this.requestCameraAccesAux(constraints, callback);
            }
            else {
                _this.requestCameraAccesAux(constraints, callback);
            }
        });
    };
    Stream.prototype.requestCameraAccesAux = function (constraints, callback) {
        var _this = this;
        navigator.mediaDevices.getUserMedia(constraints)
            .then(function (userStream) {
            _this.cameraAccessSuccess(userStream, callback);
        })
            .catch(function (error) {
            //  Try to ask for microphone only
            navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                .then(function (userStream) {
                constraints.video = false;
                _this.sendVideo = false;
                _this.audioOnly = true;
                _this.cameraAccessSuccess(userStream, callback);
            })
                .catch(function (error) {
                _this.accessIsDenied = true;
                _this.accessIsAllowed = false;
                _this.ee.emitEvent('access-denied-by-publisher');
                console.error("Access denied", error);
                callback(error, _this);
            });
        });
    };
    Stream.prototype.cameraAccessSuccess = function (userStream, callback) {
        this.accessIsAllowed = true;
        this.accessIsDenied = false;
        this.ee.emitEvent('access-allowed-by-publisher');
        if (userStream.getAudioTracks()[0] != null) {
            userStream.getAudioTracks()[0].enabled = this.sendAudio;
        }
        if (userStream.getVideoTracks()[0] != null) {
            userStream.getVideoTracks()[0].enabled = this.sendVideo;
        }
        this.wrStream = userStream;
        this.emitSrcEvent(this.wrStream);
        callback(undefined, this);
    };
    Stream.prototype.userMediaHasVideo = function (callback) {
        navigator.mediaDevices.enumerateDevices().then(function (mediaDevices) {
            var videoInput = mediaDevices.filter(function (deviceInfo) {
                return deviceInfo.kind === 'videoinput';
            })[0];
            callback(videoInput != null);
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
            doLoopback: this.displayMyRemote() || false,
            audioOnly: this.audioOnly
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
            var userMediaConstraints = {
                audio: this.sendAudio,
                video: this.sendVideo
            };
            var options = {
                videoStream: this.wrStream,
                mediaConstraints: userMediaConstraints,
                onicecandidate: this.connection.sendIceCandidate.bind(this.connection),
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
                audio: this.recvAudio,
                video: !this.audioOnly
            };
            console.log("Constraints of generate SDP offer (subscribing)", offerConstraints);
            var options = {
                onicecandidate: this.connection.sendIceCandidate.bind(this.connection),
                mediaConstraints: offerConstraints
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
        var _this = this;
        // FIXME: Throw error when stream is not local
        if (this.isReady) {
            this.initWebRtcPeer(this.publishVideoCallback);
        }
        else {
            this.ee.once('stream-ready', function (streamEvent) {
                _this.publish();
            });
        }
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
                    _this.emitSrcEvent(_this.wrStream);
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
                for (var _i = 0, _a = _this.videoElements; _i < _a.length; _i++) {
                    var videoElement = _a[_i];
                    var thumbnailId = videoElement.thumb;
                    var video = videoElement.video;
                    video.src = URL.createObjectURL(_this.wrStream);
                    video.onplay = function () {
                        console.log(_this.getId() + ': ' + 'Video playing');
                        //show(thumbnailId);
                        //this.hideSpinner(this.getId());
                    };
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
        //this.videoElements.forEach(ve => disposeElement(ve.video));
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
exports.Stream = Stream;


/***/ }),

/***/ 120:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CredentialsDialogComponent; });
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};

var CredentialsDialogComponent = (function () {
    function CredentialsDialogComponent() {
    }
    CredentialsDialogComponent.prototype.testVideo = function () {
        this.myReference.close(this.secret);
    };
    return CredentialsDialogComponent;
}());
CredentialsDialogComponent = __decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_4" /* Component */])({
        selector: 'app-credentials-dialog',
        template: "\n        <div>\n            <h1 md-dialog-title>\n                Insert your secret\n            </h1>\n            <form #dialogForm (ngSubmit)=\"testVideo()\">\n                <md-dialog-content>\n                    <md-input-container>\n                        <input mdInput name=\"secret\" type=\"password\" [(ngModel)]=\"secret\">\n                    </md-input-container>\n                </md-dialog-content>\n                <md-dialog-actions>\n                    <button md-button md-dialog-close>CANCEL</button>\n                    <button md-button id=\"join-btn\" type=\"submit\">TEST</button>\n                </md-dialog-actions>\n            </form>\n        </div>\n    ",
        styles: ["\n        #quality-div {\n            margin-top: 20px;\n        }\n        #join-div {\n            margin-top: 25px;\n            margin-bottom: 20px;\n        }\n        #quality-tag {\n            display: block;\n        }\n        h5 {\n            margin-bottom: 10px;\n            text-align: left;\n        }\n        #joinWithVideo {\n            margin-right: 50px;\n        }\n        md-dialog-actions {\n            display: block;\n        }\n        #join-btn {\n            float: right;\n        }\n    "],
    }),
    __metadata("design:paramtypes", [])
], CredentialsDialogComponent);

//# sourceMappingURL=credentials-dialog.component.js.map

/***/ }),

/***/ 121:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_material__ = __webpack_require__(119);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__services_info_service__ = __webpack_require__(69);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_openvidu_browser__ = __webpack_require__(371);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_openvidu_browser___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3_openvidu_browser__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__credentials_dialog_component__ = __webpack_require__(120);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return DashboardComponent; });
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};





var DashboardComponent = (function () {
    function DashboardComponent(infoService, dialog) {
        var _this = this;
        this.infoService = infoService;
        this.dialog = dialog;
        this.lockScroll = false;
        this.info = [];
        this.testStatus = 'DISCONNECTED';
        this.testButton = 'Test';
        this.tickClass = 'trigger';
        this.showSpinner = false;
        // Subscription to info updated event raised by InfoService
        this.infoSubscription = this.infoService.newInfo$.subscribe(function (info) {
            _this.info.push(info);
            _this.scrollToBottom();
        });
    }
    DashboardComponent.prototype.ngOnInit = function () {
    };
    DashboardComponent.prototype.beforeunloadHandler = function () {
        // On window closed leave test session
        if (this.session) {
            this.endTestVideo();
        }
    };
    DashboardComponent.prototype.ngOnDestroy = function () {
        // On component destroyed leave test session
        if (this.session) {
            this.endTestVideo();
        }
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
        dialogRef = this.dialog.open(__WEBPACK_IMPORTED_MODULE_4__credentials_dialog_component__["a" /* CredentialsDialogComponent */]);
        dialogRef.componentInstance.myReference = dialogRef;
        dialogRef.afterClosed().subscribe(function (secret) {
            if (secret) {
                _this.connectToSession('wss://' + location.hostname + ':8443/testSession?secret=' + secret);
            }
        });
    };
    DashboardComponent.prototype.connectToSession = function (mySessionId) {
        var _this = this;
        var OV = new __WEBPACK_IMPORTED_MODULE_3_openvidu_browser__["OpenVidu"]();
        this.session = OV.initSession(mySessionId);
        this.session.on('streamCreated', function (event) {
            _this.session.subscribe(event.stream, 'mirrored-video');
        });
        this.testStatus = 'CONNECTING';
        this.testButton = 'Testing...';
        this.session.connect('token', function (error) {
            if (!error) {
                _this.testStatus = 'CONNECTED';
                var publisherRemote = OV.initPublisher('mirrored-video', {
                    audio: true,
                    video: true,
                    quality: 'MEDIUM'
                });
                publisherRemote.on('videoElementCreated', function (video) {
                    _this.showSpinner = true;
                    video.element.addEventListener('playing', function () {
                        console.warn('PLAYING!!');
                        _this.testButton = 'End test';
                        _this.testStatus = 'PLAYING';
                        _this.showSpinner = false;
                    });
                });
                publisherRemote.stream.subscribeToMyRemote();
                _this.session.publish(publisherRemote);
            }
            else {
                if (error.code === 401) {
                    _this.endTestVideo();
                    var dialogRef = void 0;
                    dialogRef = _this.dialog.open(__WEBPACK_IMPORTED_MODULE_4__credentials_dialog_component__["a" /* CredentialsDialogComponent */]);
                    dialogRef.componentInstance.myReference = dialogRef;
                    dialogRef.afterClosed().subscribe(function (secret) {
                        if (secret) {
                            _this.connectToSession('wss://' + location.hostname + ':8443/testSession?secret=' + secret);
                        }
                    });
                }
                else {
                    console.error(error);
                }
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
    return DashboardComponent;
}());
__decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_7" /* ViewChild */])('scrollMe'),
    __metadata("design:type", typeof (_a = typeof __WEBPACK_IMPORTED_MODULE_0__angular_core__["l" /* ElementRef */] !== "undefined" && __WEBPACK_IMPORTED_MODULE_0__angular_core__["l" /* ElementRef */]) === "function" && _a || Object)
], DashboardComponent.prototype, "myScrollContainer", void 0);
__decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_12" /* HostListener */])('window:beforeunload'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DashboardComponent.prototype, "beforeunloadHandler", null);
DashboardComponent = __decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_4" /* Component */])({
        selector: 'app-dashboard',
        template: __webpack_require__(283),
        styles: [__webpack_require__(261)],
    }),
    __metadata("design:paramtypes", [typeof (_b = typeof __WEBPACK_IMPORTED_MODULE_2__services_info_service__["a" /* InfoService */] !== "undefined" && __WEBPACK_IMPORTED_MODULE_2__services_info_service__["a" /* InfoService */]) === "function" && _b || Object, typeof (_c = typeof __WEBPACK_IMPORTED_MODULE_1__angular_material__["j" /* MdDialog */] !== "undefined" && __WEBPACK_IMPORTED_MODULE_1__angular_material__["j" /* MdDialog */]) === "function" && _c || Object])
], DashboardComponent);

var _a, _b, _c;
//# sourceMappingURL=dashboard.component.js.map

/***/ }),

/***/ 122:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return SessionDetailsComponent; });
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};

var SessionDetailsComponent = (function () {
    function SessionDetailsComponent() {
    }
    SessionDetailsComponent.prototype.ngOnInit = function () {
    };
    return SessionDetailsComponent;
}());
SessionDetailsComponent = __decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_4" /* Component */])({
        selector: 'app-session-details',
        template: __webpack_require__(284),
        styles: [__webpack_require__(262)]
    }),
    __metadata("design:paramtypes", [])
], SessionDetailsComponent);

//# sourceMappingURL=session-details.component.js.map

/***/ }),

/***/ 168:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var EventEmitter = __webpack_require__(52);
var Publisher = (function () {
    function Publisher(stream, parentId) {
        var _this = this;
        this.ee = new EventEmitter();
        this.accessAllowed = false;
        this.stream = stream;
        this.stream.addEventListener('camera-access-changed', function (event) {
            _this.accessAllowed = event.accessAllowed;
            if (_this.accessAllowed) {
                _this.ee.emitEvent('accessAllowed');
            }
            else {
                _this.ee.emitEvent('accessDenied');
            }
        });
        if (document.getElementById(parentId) != null) {
            this.element = document.getElementById(parentId);
        }
    }
    Publisher.prototype.publishAudio = function (value) {
        this.stream.getWebRtcPeer().audioEnabled = value;
    };
    Publisher.prototype.publishVideo = function (value) {
        this.stream.getWebRtcPeer().videoEnabled = value;
    };
    Publisher.prototype.destroy = function () {
        this.session.unpublish(this);
        this.stream.dispose();
        this.stream.removeVideo(this.element);
        return this;
    };
    Publisher.prototype.on = function (eventName, callback) {
        var _this = this;
        this.ee.addListener(eventName, function (event) {
            callback(event);
        });
        if (eventName == 'videoElementCreated') {
            if (this.stream.isVideoELementCreated) {
                this.ee.emitEvent('videoElementCreated', [{
                        element: this.stream.getVideoElement()
                    }]);
            }
            else {
                this.stream.addEventListener('video-element-created-by-stream', function (element) {
                    console.warn('Publisher emitting videoElementCreated');
                    _this.id = element.id;
                    _this.ee.emitEvent('videoElementCreated', [{
                            element: element.element
                        }]);
                });
            }
        }
        if (eventName == 'streamCreated') {
            if (this.stream.isReady) {
                this.ee.emitEvent('streamCreated', [{ stream: this.stream }]);
            }
            else {
                this.stream.addEventListener('stream-created-by-publisher', function () {
                    console.warn('Publisher emitting streamCreated');
                    _this.ee.emitEvent('streamCreated', [{ stream: _this.stream }]);
                });
            }
        }
        if (eventName == 'accessAllowed') {
            if (this.stream.accessIsAllowed) {
                this.ee.emitEvent('accessAllowed');
            }
            else {
                this.stream.addEventListener('access-allowed-by-publisher', function () {
                    _this.ee.emitEvent('accessAllowed');
                });
            }
        }
        if (eventName == 'accessDenied') {
            if (this.stream.accessIsDenied) {
                this.ee.emitEvent('accessDenied');
            }
            else {
                this.stream.addEventListener('access-denied-by-publisher', function () {
                    _this.ee.emitEvent('accessDenied');
                });
            }
        }
    };
    return Publisher;
}());
exports.Publisher = Publisher;


/***/ }),

/***/ 169:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var Subscriber_1 = __webpack_require__(170);
var EventEmitter = __webpack_require__(52);
var Session = (function () {
    function Session(session, openVidu) {
        var _this = this;
        this.session = session;
        this.openVidu = openVidu;
        this.ee = new EventEmitter();
        this.sessionId = session.getSessionId();
        // Listens to the deactivation of the default behaviour upon the deletion of a Stream object
        this.session.addEventListener('stream-destroyed-default', function (event) {
            event.stream.removeVideo();
        });
        // Listens to the deactivation of the default behaviour upon the disconnection of a Session
        this.session.addEventListener('session-disconnected-default', function () {
            var s;
            for (var _i = 0, _a = _this.openVidu.openVidu.getRemoteStreams(); _i < _a.length; _i++) {
                s = _a[_i];
                s.removeVideo();
            }
            if (_this.connection) {
                for (var streamId in _this.connection.getStreams()) {
                    _this.connection.getStreams()[streamId].removeVideo();
                }
            }
        });
        // Sets or updates the value of 'connection' property. Triggered by SessionInternal when succesful connection
        this.session.addEventListener('update-connection-object', function (event) {
            _this.connection = event.connection;
        });
    }
    Session.prototype.connect = function (param1, param2, param3) {
        // Early configuration to deactivate automatic subscription to streams
        if (typeof param2 == "string") {
            this.session.configure({
                sessionId: this.session.getSessionId(),
                participantId: param1,
                metadata: param2,
                subscribeToStreams: false
            });
            this.session.connect(param1, param3);
        }
        else {
            this.session.configure({
                sessionId: this.session.getSessionId(),
                participantId: param1,
                metadata: '',
                subscribeToStreams: false
            });
            this.session.connect(param1, param2);
        }
    };
    Session.prototype.disconnect = function () {
        var _this = this;
        this.openVidu.openVidu.close(false);
        this.session.emitEvent('sessionDisconnected', [{
                preventDefault: function () { _this.session.removeEvent('session-disconnected-default'); }
            }]);
        this.session.emitEvent('session-disconnected-default', [{}]);
    };
    Session.prototype.publish = function (publisher) {
        publisher.session = this;
        publisher.stream.publish();
    };
    Session.prototype.unpublish = function (publisher) {
        this.session.unpublish(publisher.stream);
    };
    Session.prototype.on = function (eventName, callback) {
        this.session.addEventListener(eventName, function (event) {
            callback(event);
        });
    };
    Session.prototype.once = function (eventName, callback) {
        this.session.addOnceEventListener(eventName, function (event) {
            callback(event);
        });
    };
    Session.prototype.off = function (eventName, eventHandler) {
        this.session.removeListener(eventName, eventHandler);
    };
    Session.prototype.subscribe = function (param1, param2, param3) {
        // Subscription
        this.session.subscribe(param1);
        var subscriber = new Subscriber_1.Subscriber(param1, param2);
        param1.playOnlyVideo(param2, null);
        return subscriber;
    };
    Session.prototype.unsubscribe = function (subscriber) {
        this.session.unsuscribe(subscriber.stream);
        subscriber.stream.removeVideo();
    };
    /* Shortcut event API */
    Session.prototype.onStreamCreated = function (callback) {
        this.session.addEventListener("streamCreated", function (streamEvent) {
            callback(streamEvent.stream);
        });
    };
    Session.prototype.onStreamDestroyed = function (callback) {
        this.session.addEventListener("streamDestroyed", function (streamEvent) {
            callback(streamEvent.stream);
        });
    };
    Session.prototype.onParticipantJoined = function (callback) {
        this.session.addEventListener("participant-joined", function (participantEvent) {
            callback(participantEvent.connection);
        });
    };
    Session.prototype.onParticipantLeft = function (callback) {
        this.session.addEventListener("participant-left", function (participantEvent) {
            callback(participantEvent.connection);
        });
    };
    Session.prototype.onParticipantPublished = function (callback) {
        this.session.addEventListener("participant-published", function (participantEvent) {
            callback(participantEvent.connection);
        });
    };
    Session.prototype.onParticipantEvicted = function (callback) {
        this.session.addEventListener("participant-evicted", function (participantEvent) {
            callback(participantEvent.connection);
        });
    };
    Session.prototype.onRoomClosed = function (callback) {
        this.session.addEventListener("room-closed", function (roomEvent) {
            callback(roomEvent.room);
        });
    };
    Session.prototype.onLostConnection = function (callback) {
        this.session.addEventListener("lost-connection", function (roomEvent) {
            callback(roomEvent.room);
        });
    };
    Session.prototype.onMediaError = function (callback) {
        this.session.addEventListener("error-media", function (errorEvent) {
            callback(errorEvent.error);
        });
    };
    return Session;
}());
exports.Session = Session;


/***/ }),

/***/ 170:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var EventEmitter = __webpack_require__(52);
var Subscriber = (function () {
    function Subscriber(stream, parentId) {
        this.ee = new EventEmitter();
        this.stream = stream;
        if (document.getElementById(parentId) != null) {
            this.element = document.getElementById(parentId);
        }
    }
    Subscriber.prototype.on = function (eventName, callback) {
        var _this = this;
        this.ee.addListener(eventName, function (event) {
            callback(event);
        });
        if (eventName == 'videoElementCreated') {
            if (this.stream.isReady) {
                this.ee.emitEvent('videoElementCreated', [{
                        element: this.stream.getVideoElement()
                    }]);
            }
            else {
                this.stream.addEventListener('video-element-created-by-stream', function (element) {
                    console.warn("Subscriber emitting videoElementCreated");
                    _this.id = element.id;
                    _this.ee.emitEvent('videoElementCreated', [{
                            element: element
                        }]);
                });
            }
        }
    };
    return Subscriber;
}());
exports.Subscriber = Subscriber;


/***/ }),

/***/ 171:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var Stream_1 = __webpack_require__(104);
var Connection = (function () {
    function Connection(openVidu, local, room, options) {
        this.openVidu = openVidu;
        this.local = local;
        this.room = room;
        this.options = options;
        this.streams = {};
        this.streamsOpts = [];
        if (options) {
            this.connectionId = options.id;
            this.data = options.metadata;
            if (options.streams) {
                for (var _i = 0, _a = options.streams; _i < _a.length; _i++) {
                    var streamOptions = _a[_i];
                    var streamOpts = {
                        id: streamOptions.id,
                        connection: this,
                        recvVideo: (streamOptions.recvVideo == undefined ? true : streamOptions.recvVideo),
                        recvAudio: (streamOptions.recvAudio == undefined ? true : streamOptions.recvAudio),
                        audio: streamOptions.audio,
                        video: streamOptions.video,
                        data: streamOptions.data,
                        mediaConstraints: streamOptions.mediaConstraints,
                        audioOnly: streamOptions.audioOnly
                    };
                    var stream = new Stream_1.Stream(openVidu, false, room, streamOpts);
                    this.addStream(stream);
                    this.streamsOpts.push(streamOpts);
                }
            }
        }
        console.log("New " + (local ? "local " : "remote ") + "participant " + this.connectionId
            + ", streams opts: ", this.streamsOpts);
    }
    Connection.prototype.addStream = function (stream) {
        this.streams[stream.getIdInParticipant()] = stream;
        this.room.getStreams()[stream.getIdInParticipant()] = stream;
    };
    Connection.prototype.getStreams = function () {
        return this.streams;
    };
    Connection.prototype.dispose = function () {
        for (var key in this.streams) {
            this.streams[key].dispose();
        }
    };
    Connection.prototype.sendIceCandidate = function (candidate) {
        console.debug((this.local ? "Local" : "Remote"), "candidate for", this.connectionId, JSON.stringify(candidate));
        this.openVidu.sendRequest("onIceCandidate", {
            endpointName: this.connectionId,
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
    return Connection;
}());
exports.Connection = Connection;


/***/ }),

/***/ 176:
/***/ (function(module, exports) {

function webpackEmptyContext(req) {
	throw new Error("Cannot find module '" + req + "'.");
}
webpackEmptyContext.keys = function() { return []; };
webpackEmptyContext.resolve = webpackEmptyContext;
module.exports = webpackEmptyContext;
webpackEmptyContext.id = 176;


/***/ }),

/***/ 177:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_platform_browser_dynamic__ = __webpack_require__(197);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__app_app_module__ = __webpack_require__(202);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__environments_environment__ = __webpack_require__(204);




if (__WEBPACK_IMPORTED_MODULE_3__environments_environment__["a" /* environment */].production) {
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["a" /* enableProdMode */])();
}
__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__angular_platform_browser_dynamic__["a" /* platformBrowserDynamic */])().bootstrapModule(__WEBPACK_IMPORTED_MODULE_2__app_app_module__["a" /* AppModule */]);
//# sourceMappingURL=main.js.map

/***/ }),

/***/ 200:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_app_services_info_service__ = __webpack_require__(69);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AppComponent; });
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};


var AppComponent = (function () {
    function AppComponent(infoService) {
        this.infoService = infoService;
    }
    AppComponent.prototype.ngOnInit = function () {
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
    };
    AppComponent.prototype.ngOnDestroy = function () {
        this.websocket.close();
    };
    AppComponent.prototype.beforeUnloadHander = function (event) {
        console.warn('Closing info websocket');
        this.websocket.close();
    };
    return AppComponent;
}());
__decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_12" /* HostListener */])('window:beforeunload', ['$event']),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AppComponent.prototype, "beforeUnloadHander", null);
AppComponent = __decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_4" /* Component */])({
        selector: 'app-root',
        template: __webpack_require__(282),
        styles: [__webpack_require__(260)]
    }),
    __metadata("design:paramtypes", [typeof (_a = typeof __WEBPACK_IMPORTED_MODULE_1_app_services_info_service__["a" /* InfoService */] !== "undefined" && __WEBPACK_IMPORTED_MODULE_1_app_services_info_service__["a" /* InfoService */]) === "function" && _a || Object])
], AppComponent);

var _a;
//# sourceMappingURL=app.component.js.map

/***/ }),

/***/ 201:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_platform_browser_animations__ = __webpack_require__(198);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__angular_material__ = __webpack_require__(119);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AppMaterialModule; });
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};



var AppMaterialModule = (function () {
    function AppMaterialModule() {
    }
    return AppMaterialModule;
}());
AppMaterialModule = __decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["b" /* NgModule */])({
        imports: [
            __WEBPACK_IMPORTED_MODULE_1__angular_platform_browser_animations__["a" /* BrowserAnimationsModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["a" /* MdButtonModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["b" /* MdIconModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["c" /* MdCheckboxModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["d" /* MdCardModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["e" /* MdInputModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["f" /* MdProgressSpinnerModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["g" /* MdTooltipModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["h" /* MdDialogModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["i" /* MdSlideToggleModule */]
        ],
        exports: [
            __WEBPACK_IMPORTED_MODULE_1__angular_platform_browser_animations__["a" /* BrowserAnimationsModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["a" /* MdButtonModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["b" /* MdIconModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["c" /* MdCheckboxModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["d" /* MdCardModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["e" /* MdInputModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["f" /* MdProgressSpinnerModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["g" /* MdTooltipModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["h" /* MdDialogModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["i" /* MdSlideToggleModule */]
        ],
    })
], AppMaterialModule);

//# sourceMappingURL=app.material.module.js.map

/***/ }),

/***/ 202:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_platform_browser__ = __webpack_require__(22);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_flex_layout__ = __webpack_require__(194);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__angular_forms__ = __webpack_require__(117);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__angular_http__ = __webpack_require__(118);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_hammerjs__ = __webpack_require__(264);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_hammerjs___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_5_hammerjs__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__app_routing__ = __webpack_require__(203);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7_app_app_material_module__ = __webpack_require__(201);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__services_info_service__ = __webpack_require__(69);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__app_component__ = __webpack_require__(200);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10__components_dashboard_dashboard_component__ = __webpack_require__(121);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11__components_session_details_session_details_component__ = __webpack_require__(122);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12__components_dashboard_credentials_dialog_component__ = __webpack_require__(120);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AppModule; });
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};













var AppModule = (function () {
    function AppModule() {
    }
    return AppModule;
}());
AppModule = __decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__angular_core__["b" /* NgModule */])({
        declarations: [
            __WEBPACK_IMPORTED_MODULE_9__app_component__["a" /* AppComponent */],
            __WEBPACK_IMPORTED_MODULE_10__components_dashboard_dashboard_component__["a" /* DashboardComponent */],
            __WEBPACK_IMPORTED_MODULE_11__components_session_details_session_details_component__["a" /* SessionDetailsComponent */],
            __WEBPACK_IMPORTED_MODULE_12__components_dashboard_credentials_dialog_component__["a" /* CredentialsDialogComponent */],
        ],
        imports: [
            __WEBPACK_IMPORTED_MODULE_0__angular_platform_browser__["a" /* BrowserModule */],
            __WEBPACK_IMPORTED_MODULE_3__angular_forms__["a" /* FormsModule */],
            __WEBPACK_IMPORTED_MODULE_4__angular_http__["a" /* HttpModule */],
            __WEBPACK_IMPORTED_MODULE_6__app_routing__["a" /* routing */],
            __WEBPACK_IMPORTED_MODULE_7_app_app_material_module__["a" /* AppMaterialModule */],
            __WEBPACK_IMPORTED_MODULE_1__angular_flex_layout__["a" /* FlexLayoutModule */]
        ],
        entryComponents: [
            __WEBPACK_IMPORTED_MODULE_12__components_dashboard_credentials_dialog_component__["a" /* CredentialsDialogComponent */],
        ],
        providers: [__WEBPACK_IMPORTED_MODULE_8__services_info_service__["a" /* InfoService */]],
        bootstrap: [__WEBPACK_IMPORTED_MODULE_9__app_component__["a" /* AppComponent */]]
    })
], AppModule);

//# sourceMappingURL=app.module.js.map

/***/ }),

/***/ 203:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_router__ = __webpack_require__(199);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_app_components_dashboard_dashboard_component__ = __webpack_require__(121);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_app_components_session_details_session_details_component__ = __webpack_require__(122);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return routing; });



var appRoutes = [
    {
        path: '',
        component: __WEBPACK_IMPORTED_MODULE_1_app_components_dashboard_dashboard_component__["a" /* DashboardComponent */]
    },
    {
        path: 'session/:id',
        component: __WEBPACK_IMPORTED_MODULE_2_app_components_session_details_session_details_component__["a" /* SessionDetailsComponent */]
    }
];
var routing = __WEBPACK_IMPORTED_MODULE_0__angular_router__["a" /* RouterModule */].forRoot(appRoutes);
//# sourceMappingURL=app.routing.js.map

/***/ }),

/***/ 204:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return environment; });
// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.
// The file contents for the current environment will overwrite these during build.
var environment = {
    production: false
};
//# sourceMappingURL=environment.js.map

/***/ }),

/***/ 260:
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(37)(false);
// imports


// module
exports.push([module.i, "", ""]);

// exports


/*** EXPORTS FROM exports-loader ***/
module.exports = module.exports.toString();

/***/ }),

/***/ 261:
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(37)(false);
// imports


// module
exports.push([module.i, "#dashboard-div {\n  padding: 20px;\n}\n\n#log {\n  height: 90%;\n}\n\n#log-content {\n  height: 90%;\n  font-family: Consolas, 'Liberation Mono', Menlo, Courier, monospace;\n  overflow-y: auto;\n  overflow-x: hidden\n}\n\nul {\n  margin: 0;\n}\n\nbutton.mat-raised-button {\n  text-transform: uppercase;\n  float: right;\n}\n\nmd-card-title button.blue {\n  color: #ffffff;\n  background-color: #0088aa;\n}\n\nmd-card-title button.yellow {\n  color: rgba(0, 0, 0, 0.87);\n  background-color: #ffcc00;\n}\n\nmd-spinner {\n  position: absolute;\n  top: 55%;\n  left: 50%;\n  -webkit-transform: translate(-50%, -50%);\n          transform: translate(-50%, -50%);\n}\n\n#tick-div {\n  width: 100px;\n  height: 100px;\n  z-index: 1;\n  position: absolute;\n  top: 55%;\n  left: 50%;\n  -webkit-transform: translate(-50%, -50%);\n          transform: translate(-50%, -50%);\n}\n\n#tooltip-tick {\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  z-index: 2;\n}\n\n.circ {\n  opacity: 0;\n  stroke-dasharray: 130;\n  stroke-dashoffset: 130;\n  transition: all 1s;\n}\n\n.tick {\n  stroke-dasharray: 50;\n  stroke-dashoffset: 50;\n  transition: stroke-dashoffset 1s 0.5s ease-out;\n}\n\n.drawn+svg .path {\n  opacity: 1;\n  stroke-dashoffset: 0;\n}\n\n\n/* Pure CSS loader */\n\n#loader {\n  width: 100px;\n  height: 100px;\n  z-index: 1;\n  position: absolute;\n  top: 55%;\n  left: 50%;\n  -webkit-transform: translate(-50%, -50%);\n  transform: translate(-50%, -50%);\n}\n\n#loader * {\n  box-sizing: border-box;\n}\n\n#loader ::after {\n  box-sizing: border-box;\n}\n\n#loader ::before {\n  box-sizing: border-box;\n}\n\n.loader-1 {\n  height: 100px;\n  width: 100px;\n  -webkit-animation: loader-1-1 4.8s linear infinite;\n  animation: loader-1-1 4.8s linear infinite;\n}\n\n@-webkit-keyframes loader-1-1 {\n  0% {\n    -webkit-transform: rotate(0deg);\n  }\n  100% {\n    -webkit-transform: rotate(360deg);\n  }\n}\n\n@keyframes loader-1-1 {\n  0% {\n    -webkit-transform: rotate(0deg);\n            transform: rotate(0deg);\n  }\n  100% {\n    -webkit-transform: rotate(360deg);\n            transform: rotate(360deg);\n  }\n}\n\n.loader-1 span {\n  display: block;\n  position: absolute;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  right: 0;\n  margin: auto;\n  height: 100px;\n  width: 100px;\n  clip: rect(0, 100px, 100px, 50px);\n  -webkit-animation: loader-1-2 1.2s linear infinite;\n  animation: loader-1-2 1.2s linear infinite;\n}\n\n@-webkit-keyframes loader-1-2 {\n  0% {\n    -webkit-transform: rotate(0deg);\n  }\n  100% {\n    -webkit-transform: rotate(220deg);\n  }\n}\n\n@keyframes loader-1-2 {\n  0% {\n    -webkit-transform: rotate(0deg);\n            transform: rotate(0deg);\n  }\n  100% {\n    -webkit-transform: rotate(220deg);\n            transform: rotate(220deg);\n  }\n}\n\n.loader-1 span::after {\n  content: \"\";\n  position: absolute;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  right: 0;\n  margin: auto;\n  height: 100px;\n  width: 100px;\n  clip: rect(0, 100px, 100px, 50px);\n  border: 8px solid #4d4d4d;\n  border-radius: 50%;\n  -webkit-animation: loader-1-3 1.2s cubic-bezier(0.770, 0.000, 0.175, 1.000) infinite;\n  animation: loader-1-3 1.2s cubic-bezier(0.770, 0.000, 0.175, 1.000) infinite;\n}\n\n@-webkit-keyframes loader-1-3 {\n  0% {\n    -webkit-transform: rotate(-140deg);\n  }\n  50% {\n    -webkit-transform: rotate(-160deg);\n  }\n  100% {\n    -webkit-transform: rotate(140deg);\n  }\n}\n\n@keyframes loader-1-3 {\n  0% {\n    -webkit-transform: rotate(-140deg);\n            transform: rotate(-140deg);\n  }\n  50% {\n    -webkit-transform: rotate(-160deg);\n            transform: rotate(-160deg);\n  }\n  100% {\n    -webkit-transform: rotate(140deg);\n            transform: rotate(140deg);\n  }\n}", ""]);

// exports


/*** EXPORTS FROM exports-loader ***/
module.exports = module.exports.toString();

/***/ }),

/***/ 262:
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(37)(false);
// imports


// module
exports.push([module.i, "", ""]);

// exports


/*** EXPORTS FROM exports-loader ***/
module.exports = module.exports.toString();

/***/ }),

/***/ 282:
/***/ (function(module, exports) {

module.exports = "<main>\n  <router-outlet></router-outlet>\n</main>"

/***/ }),

/***/ 283:
/***/ (function(module, exports) {

module.exports = "<div id=\"dashboard-div\" fxLayout=\"row\" fxLayout.xs=\"column\" fxLayoutGap=\"20px\" fxFlexFill>\n\n  <div fxLayout=\"column\" fxFlex=\"66%\" fxFlexOrder=\"1\" fxFlexOrder.xs=\"2\">\n    <md-card id=\"log\">\n      <md-card-title>Server events\n        <md-slide-toggle title=\"Lock Scroll\" [(ngModel)]=\"lockScroll\" style=\"float: right; margin-left: auto;\">\n          <md-icon>lock_outline</md-icon>\n        </md-slide-toggle>\n      </md-card-title>\n      <md-divider></md-divider>\n      <md-card-content #scrollMe id=\"log-content\">\n        <ul>\n          <li *ngFor=\"let i of info\">\n            <p>{{i}}</p>\n          </li>\n        </ul>\n      </md-card-content>\n    </md-card>\n  </div>\n\n  <div fxLayout=\"column\" fxFlex=\"33%\" fxFlexOrder=\"2\" fxFlexOrder.xs=\"1\">\n    <md-card id=\"video-loop\">\n      <md-card-title>Test the connection\n        <button [class]=\"testStatus == 'DISCONNECTED' ? 'blue' : (testStatus == 'PLAYING' ? 'yellow' : 'disabled')\" md-raised-button\n          (click)=\"toggleTestVideo()\" [disabled]=\"testStatus==='CONNECTING' || testStatus==='CONNECTED'\">{{testButton}}</button></md-card-title>\n      <md-card-content #scrollMe id=\"log-content\">\n        <div id=\"mirrored-video\">\n          <div *ngIf=\"showSpinner\" id=\"loader\">\n            <div class=\"loader-1 center\"><span></span></div>\n          </div>\n          <!--<md-spinner *ngIf=\"showSpinner\" [color]=\"color\"></md-spinner>-->\n          <div *ngIf=\"session\" id=\"tick-div\">\n            <div id=\"tooltip-tick\" *ngIf=\"testStatus=='PLAYING'\" mdTooltip=\"The connection is successful\" mdTooltipPosition=\"below\"></div>\n            <div [class]=\"testStatus=='PLAYING' ? 'trigger drawn' : 'trigger'\"></div>\n            <svg version=\"1.1\" id=\"tick\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\n              viewBox=\"-1 -1 39 39\" style=\"enable-background:new 0 0 37 37;\" xml:space=\"preserve\">\n              <path class=\"circ path\" style=\"fill:none;stroke:#06d362;stroke-width:4;stroke-linejoin:round;stroke-miterlimit:10;\" d=\"\n\tM30.5,6.5L30.5,6.5c6.6,6.6,6.6,17.4,0,24l0,0c-6.6,6.6-17.4,6.6-24,0l0,0c-6.6-6.6-6.6-17.4,0-24l0,0C13.1-0.2,23.9-0.2,30.5,6.5z\"\n              />\n              <polyline class=\"tick path\" style=\"fill:none;stroke:#06d362;stroke-width:4;stroke-linejoin:round;stroke-miterlimit:10;\" points=\"\n\t11.6,20 15.9,24.2 26.4,13.8 \" />\n            </svg>\n          </div>\n        </div>\n      </md-card-content>\n    </md-card>\n  </div>\n\n</div>\n"

/***/ }),

/***/ 284:
/***/ (function(module, exports) {

module.exports = "<p>\n  session-details works!\n</p>\n"

/***/ }),

/***/ 370:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
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
var OpenViduInternal_1 = __webpack_require__(372);
var Session_1 = __webpack_require__(169);
var Publisher_1 = __webpack_require__(168);
var adapter = __webpack_require__(175);
if (window) {
    window["adapter"] = adapter;
}
var OpenVidu = (function () {
    function OpenVidu() {
        this.openVidu = new OpenViduInternal_1.OpenViduInternal();
    }
    ;
    OpenVidu.prototype.initSession = function (param1, param2) {
        if (this.checkSystemRequirements()) {
            if (typeof param2 == "string") {
                return new Session_1.Session(this.openVidu.initSession(param2), this);
            }
            else {
                return new Session_1.Session(this.openVidu.initSession(param1), this);
            }
        }
        else {
            alert("Browser not supported");
        }
    };
    OpenVidu.prototype.initPublisher = function (parentId, cameraOptions, callback) {
        if (this.checkSystemRequirements()) {
            if (cameraOptions != null) {
                var cameraOptionsAux = {
                    audio: cameraOptions.audio != null ? cameraOptions.audio : true,
                    video: cameraOptions.video != null ? cameraOptions.video : true,
                    data: true,
                    mediaConstraints: this.openVidu.generateMediaConstraints(cameraOptions.quality)
                };
                cameraOptions = cameraOptionsAux;
            }
            else {
                cameraOptions = {
                    audio: true,
                    video: true,
                    data: true,
                    mediaConstraints: {
                        audio: true,
                        video: { width: { ideal: 1280 } }
                    }
                };
            }
            return new Publisher_1.Publisher(this.openVidu.initPublisherTagged(parentId, cameraOptions, callback), parentId);
        }
        else {
            alert("Browser not supported");
        }
    };
    OpenVidu.prototype.checkSystemRequirements = function () {
        var browser = adapter.browserDetails.browser;
        var version = adapter.browserDetails.version;
        //Bug fix: 'navigator.userAgent' in Firefox for Ubuntu 14.04 does not return "Firefox/[version]" in the string, so version returned is null
        if ((browser == 'firefox') && (version == null)) {
            return 1;
        }
        if (((browser == 'chrome') && (version >= 28)) || ((browser == 'edge') && (version >= 12)) || ((browser == 'firefox') && (version >= 22))) {
            return 1;
        }
        else {
            return 0;
        }
    };
    OpenVidu.prototype.getDevices = function (callback) {
        navigator.mediaDevices.enumerateDevices().then(function (deviceInfos) {
            callback(null, deviceInfos);
        }).catch(function (error) {
            console.log("Error getting devices: " + error);
            callback(error, null);
        });
    };
    return OpenVidu;
}());
exports.OpenVidu = OpenVidu;


/***/ }),

/***/ 371:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(__webpack_require__(370));
__export(__webpack_require__(169));
__export(__webpack_require__(168));
__export(__webpack_require__(170));
__export(__webpack_require__(104));
__export(__webpack_require__(171));


/***/ }),

/***/ 372:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
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
var SessionInternal_1 = __webpack_require__(373);
var Stream_1 = __webpack_require__(104);
var RpcBuilder = __webpack_require__(136);
var OpenViduInternal = (function () {
    function OpenViduInternal() {
        this.remoteStreams = [];
    }
    ;
    /* NEW METHODS */
    OpenViduInternal.prototype.initSession = function (sessionId) {
        console.log("Session initialized!");
        this.session = new SessionInternal_1.SessionInternal(this, sessionId);
        return this.session;
    };
    OpenViduInternal.prototype.initPublisherTagged = function (parentId, cameraOptions, callback) {
        var _this = this;
        console.log("Publisher tagged initialized!");
        this.getCamera(cameraOptions);
        if (callback == null) {
            this.camera.requestCameraAccess(function (error, camera) {
                if (error) {
                    console.log("Error accessing the camera");
                }
                else {
                    _this.camera.setVideoElement(_this.cameraReady(camera, parentId));
                }
            });
            return this.camera;
        }
        else {
            this.camera.requestCameraAccess(function (error, camera) {
                if (error) {
                    callback(error);
                }
                else {
                    _this.camera.setVideoElement(_this.cameraReady(camera, parentId));
                    callback(undefined);
                }
            });
            return this.camera;
        }
    };
    OpenViduInternal.prototype.cameraReady = function (camera, parentId) {
        this.camera = camera;
        var videoElement = this.camera.playOnlyVideo(parentId, null);
        this.camera.emitStreamReadyEvent();
        return videoElement;
    };
    OpenViduInternal.prototype.initPublisher = function (cameraOptions, callback) {
        console.log("Publisher initialized!");
        this.getCamera(cameraOptions);
        this.camera.requestCameraAccess(function (error, camera) {
            if (error)
                callback(error);
            else
                callback(undefined);
        });
    };
    OpenViduInternal.prototype.getLocalStream = function () {
        return this.camera;
    };
    OpenViduInternal.prototype.getRemoteStreams = function () {
        return this.remoteStreams;
    };
    /* NEW METHODS */
    OpenViduInternal.prototype.getWsUri = function () {
        return this.wsUri;
    };
    OpenViduInternal.prototype.setWsUri = function (wsUri) {
        this.wsUri = wsUri;
    };
    OpenViduInternal.prototype.getSecret = function () {
        return this.secret;
    };
    OpenViduInternal.prototype.setSecret = function (secret) {
        this.secret = secret;
    };
    OpenViduInternal.prototype.getOpenViduServerURL = function () {
        return 'https://' + this.wsUri.split("wss://")[1].split("/room")[0];
    };
    OpenViduInternal.prototype.getRoom = function () {
        return this.session;
    };
    OpenViduInternal.prototype.connect = function (callback) {
        this.callback = callback;
        this.initJsonRpcClient(this.wsUri);
    };
    OpenViduInternal.prototype.initJsonRpcClient = function (wsUri) {
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
    OpenViduInternal.prototype.customNotification = function (params) {
        if (this.isRoomAvailable()) {
            this.session.emitEvent("custom-message-received", [{ params: params }]);
        }
    };
    OpenViduInternal.prototype.connectCallback = function (error) {
        if (error) {
            this.callback(error);
        }
        else {
            this.callback(null);
        }
    };
    OpenViduInternal.prototype.isRoomAvailable = function () {
        if (this.session !== undefined && this.session instanceof SessionInternal_1.SessionInternal) {
            return true;
        }
        else {
            console.warn('Room instance not found');
            return false;
        }
    };
    OpenViduInternal.prototype.disconnectCallback = function () {
        console.log('Websocket connection lost');
        if (this.isRoomAvailable()) {
            this.session.onLostConnection();
        }
        else {
            alert('Connection error. Please reload page.');
        }
    };
    OpenViduInternal.prototype.reconnectingCallback = function () {
        console.log('Websocket connection lost (reconnecting)');
        if (this.isRoomAvailable()) {
            this.session.onLostConnection();
        }
        else {
            alert('Connection error. Please reload page.');
        }
    };
    OpenViduInternal.prototype.reconnectedCallback = function () {
        console.log('Websocket reconnected');
    };
    OpenViduInternal.prototype.onParticipantJoined = function (params) {
        if (this.isRoomAvailable()) {
            this.session.onParticipantJoined(params);
        }
    };
    OpenViduInternal.prototype.onParticipantPublished = function (params) {
        if (this.isRoomAvailable()) {
            this.session.onParticipantPublished(params);
        }
    };
    OpenViduInternal.prototype.onParticipantLeft = function (params) {
        if (this.isRoomAvailable()) {
            this.session.onParticipantLeft(params);
        }
    };
    OpenViduInternal.prototype.onParticipantEvicted = function (params) {
        if (this.isRoomAvailable()) {
            this.session.onParticipantEvicted(params);
        }
    };
    OpenViduInternal.prototype.onNewMessage = function (params) {
        if (this.isRoomAvailable()) {
            this.session.onNewMessage(params);
        }
    };
    OpenViduInternal.prototype.iceCandidateEvent = function (params) {
        if (this.isRoomAvailable()) {
            this.session.recvIceCandidate(params);
        }
    };
    OpenViduInternal.prototype.onRoomClosed = function (params) {
        if (this.isRoomAvailable()) {
            this.session.onRoomClosed(params);
        }
    };
    OpenViduInternal.prototype.onMediaError = function (params) {
        if (this.isRoomAvailable()) {
            this.session.onMediaError(params);
        }
    };
    OpenViduInternal.prototype.setRpcParams = function (params) {
        this.rpcParams = params;
    };
    OpenViduInternal.prototype.sendRequest = function (method, params, callback) {
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
    OpenViduInternal.prototype.close = function (forced) {
        if (this.isRoomAvailable()) {
            this.session.leave(forced, this.jsonRpcClient);
        }
    };
    ;
    OpenViduInternal.prototype.disconnectParticipant = function (stream) {
        if (this.isRoomAvailable()) {
            this.session.disconnect(stream);
        }
    };
    OpenViduInternal.prototype.getCamera = function (options) {
        if (this.camera) {
            return this.camera;
        }
        options = options || {
            audio: true,
            video: true,
            data: true,
            mediaConstraints: {
                audio: true,
                video: { width: { ideal: 1280 } }
            }
        };
        options.connection = this.session.getLocalParticipant();
        this.camera = new Stream_1.Stream(this, true, this.session, options);
        return this.camera;
    };
    ;
    /*joinSession(options: SessionOptions, callback: Callback<Session>) {
        
        this.session.configure(options);
        
        this.session.connect2();
        
        this.session.addEventListener('room-connected', roomEvent => callback(undefined,this.session));
        
        this.session.addEventListener('error-room', error => callback(error));
        
        return this.session;
    };*/
    //CHAT
    OpenViduInternal.prototype.sendMessage = function (room, user, message) {
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
    OpenViduInternal.prototype.sendCustomRequest = function (params, callback) {
        this.sendRequest('customRequest', params, callback);
    };
    ;
    OpenViduInternal.prototype.toggleLocalVideoTrack = function (activate) {
        this.getCamera().getWebRtcPeer().videoEnabled = activate;
    };
    OpenViduInternal.prototype.toggleLocalAudioTrack = function (activate) {
        this.getCamera().getWebRtcPeer().audioEnabled = activate;
    };
    OpenViduInternal.prototype.publishLocalVideoAudio = function () {
        this.toggleLocalVideoTrack(true);
        this.toggleLocalAudioTrack(true);
    };
    OpenViduInternal.prototype.unpublishLocalVideoAudio = function () {
        this.toggleLocalVideoTrack(false);
        this.toggleLocalAudioTrack(false);
    };
    OpenViduInternal.prototype.generateMediaConstraints = function (quality) {
        var mediaConstraints = {
            audio: true,
            video: {}
        };
        var w, h;
        switch (quality) {
            case 'LOW':
                w = 320;
                h = 240;
                break;
            case 'MEDIUM':
                w = 640;
                h = 480;
                break;
            case 'HIGH':
                w = 1280;
                h = 720;
                break;
            default:
                w = 640;
                h = 480;
        }
        mediaConstraints.video['width'] = { exact: w };
        mediaConstraints.video['height'] = { exact: h };
        //mediaConstraints.video['frameRate'] = { ideal: Number((<HTMLInputElement>document.getElementById('frameRate')).value) };
        return mediaConstraints;
    };
    return OpenViduInternal;
}());
exports.OpenViduInternal = OpenViduInternal;


/***/ }),

/***/ 373:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var Connection_1 = __webpack_require__(171);
var EventEmitter = __webpack_require__(52);
var SECRET_PARAM = '?secret=';
var SessionInternal = (function () {
    function SessionInternal(openVidu, sessionId) {
        this.openVidu = openVidu;
        this.ee = new EventEmitter();
        this.streams = {};
        this.participants = {};
        this.participantsSpeaking = [];
        this.connected = false;
        this.sessionId = this.getUrlWithoutSecret(sessionId);
        this.localParticipant = new Connection_1.Connection(this.openVidu, true, this);
        if (!this.openVidu.getWsUri()) {
            this.processOpenViduUrl(sessionId);
        }
    }
    SessionInternal.prototype.processOpenViduUrl = function (url) {
        this.openVidu.setSecret(this.getSecretFromUrl(url));
        this.openVidu.setWsUri(this.getFinalUrl(url));
    };
    SessionInternal.prototype.getSecretFromUrl = function (url) {
        var secret = '';
        if (url.indexOf(SECRET_PARAM) !== -1) {
            secret = url.substring(url.lastIndexOf(SECRET_PARAM) + SECRET_PARAM.length, url.length);
        }
        return secret;
    };
    SessionInternal.prototype.getUrlWithoutSecret = function (url) {
        if (url.indexOf(SECRET_PARAM) !== -1) {
            url = url.substring(0, url.lastIndexOf(SECRET_PARAM));
        }
        return url;
    };
    SessionInternal.prototype.getFinalUrl = function (url) {
        url = this.getUrlWithoutSecret(url).substring(0, url.lastIndexOf('/')) + '/room';
        if (url.indexOf(".ngrok.io") !== -1) {
            // OpenVidu server URL referes to a ngrok IP: secure wss protocol and delete port of URL
            url = url.replace("ws://", "wss://");
            var regex = /\.ngrok\.io:\d+/;
            url = url.replace(regex, ".ngrok.io");
        }
        else if ((url.indexOf("localhost") !== -1) || (url.indexOf("127.0.0.1") != -1)) {
            // OpenVidu server URL referes to localhost IP
        }
        return url;
    };
    /* NEW METHODS */
    SessionInternal.prototype.connect = function (token, callback) {
        var _this = this;
        this.openVidu.connect(function (error) {
            if (error) {
                callback('ERROR CONNECTING TO OPENVIDU');
            }
            else {
                var joinParams = {
                    token: token,
                    session: _this.sessionId,
                    metadata: _this.options.metadata,
                    secret: _this.openVidu.getSecret(),
                    dataChannels: false
                };
                if (_this.localParticipant) {
                    if (Object.keys(_this.localParticipant.getStreams()).some(function (streamId) {
                        return _this.streams[streamId].isDataChannelEnabled();
                    })) {
                        joinParams.dataChannels = true;
                    }
                }
                _this.openVidu.sendRequest('joinRoom', joinParams, function (error, response) {
                    if (error) {
                        callback(error);
                    }
                    else {
                        _this.connected = true;
                        var exParticipants = response.value;
                        // IMPORTANT: Update connectionId with value send by server
                        _this.localParticipant.connectionId = response.id;
                        _this.participants[response.id] = _this.localParticipant;
                        var roomEvent = {
                            participants: new Array(),
                            streams: new Array()
                        };
                        var length_1 = exParticipants.length;
                        for (var i = 0; i < length_1; i++) {
                            var connection = new Connection_1.Connection(_this.openVidu, false, _this, exParticipants[i]);
                            connection.creationTime = new Date().getTime();
                            _this.participants[connection.connectionId] = connection;
                            roomEvent.participants.push(connection);
                            var streams = connection.getStreams();
                            for (var key in streams) {
                                roomEvent.streams.push(streams[key]);
                                if (_this.subscribeToStreams) {
                                    streams[key].subscribe();
                                }
                            }
                        }
                        // Update local Connection object properties with values returned by server
                        _this.localParticipant.data = response.metadata;
                        _this.localParticipant.creationTime = new Date().getTime();
                        // Updates the value of property 'connection' in Session object
                        _this.ee.emitEvent('update-connection-object', [{ connection: _this.localParticipant }]);
                        // Own connection created event
                        _this.ee.emitEvent('connectionCreated', [{ connection: _this.localParticipant }]);
                        // One connection created event for each existing connection in the session
                        for (var _i = 0, _a = roomEvent.participants; _i < _a.length; _i++) {
                            var part = _a[_i];
                            _this.ee.emitEvent('connectionCreated', [{ connection: part }]);
                        }
                        //if (this.subscribeToStreams) {
                        for (var _b = 0, _c = roomEvent.streams; _b < _c.length; _b++) {
                            var stream = _c[_b];
                            _this.ee.emitEvent('streamCreated', [{ stream: stream }]);
                            // Adding the remote stream to the OpenVidu object
                            _this.openVidu.getRemoteStreams().push(stream);
                        }
                        //}
                        callback(undefined);
                    }
                });
            }
        });
    };
    SessionInternal.prototype.publish = function () {
        this.openVidu.getCamera().publish();
    };
    /* NEW METHODS */
    SessionInternal.prototype.configure = function (options) {
        this.options = options;
        this.id = options.sessionId;
        this.subscribeToStreams = options.subscribeToStreams == null ? true : options.subscribeToStreams;
        this.updateSpeakerInterval = options.updateSpeakerInterval || 1500;
        this.thresholdSpeaker = options.thresholdSpeaker || -50;
        this.activateUpdateMainSpeaker();
    };
    SessionInternal.prototype.getId = function () {
        return this.id;
    };
    SessionInternal.prototype.getSessionId = function () {
        return this.sessionId;
    };
    SessionInternal.prototype.activateUpdateMainSpeaker = function () {
        var _this = this;
        setInterval(function () {
            if (_this.participantsSpeaking.length > 0) {
                _this.ee.emitEvent('update-main-speaker', [{
                        participantId: _this.participantsSpeaking[_this.participantsSpeaking.length - 1]
                    }]);
            }
        }, this.updateSpeakerInterval);
    };
    SessionInternal.prototype.getLocalParticipant = function () {
        return this.localParticipant;
    };
    SessionInternal.prototype.addEventListener = function (eventName, listener) {
        this.ee.on(eventName, listener);
    };
    SessionInternal.prototype.addOnceEventListener = function (eventName, listener) {
        this.ee.once(eventName, listener);
    };
    SessionInternal.prototype.removeListener = function (eventName, listener) {
        this.ee.off(eventName, listener);
    };
    SessionInternal.prototype.removeEvent = function (eventName) {
        this.ee.removeEvent(eventName);
    };
    SessionInternal.prototype.emitEvent = function (eventName, eventsArray) {
        this.ee.emitEvent(eventName, eventsArray);
    };
    SessionInternal.prototype.subscribe = function (stream) {
        stream.subscribe();
    };
    SessionInternal.prototype.unsuscribe = function (stream) {
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
    };
    SessionInternal.prototype.onParticipantPublished = function (options) {
        options.metadata = this.participants[options.id].data;
        var connection = new Connection_1.Connection(this.openVidu, false, this, options);
        var pid = connection.connectionId;
        if (!(pid in this.participants)) {
            console.info("Publisher not found in participants list by its id", pid);
        }
        else {
            console.log("Publisher found in participants list by its id", pid);
        }
        //replacing old connection (this one has streams)
        connection.creationTime = this.participants[pid].creationTime;
        this.participants[pid] = connection;
        this.ee.emitEvent('participant-published', [{ connection: connection }]);
        var streams = connection.getStreams();
        for (var key in streams) {
            var stream = streams[key];
            if (this.subscribeToStreams) {
                stream.subscribe();
            }
            this.ee.emitEvent('streamCreated', [{ stream: stream }]);
            // Adding the remote stream to the OpenVidu object
            this.openVidu.getRemoteStreams().push(stream);
        }
    };
    SessionInternal.prototype.onParticipantJoined = function (msg) {
        var connection = new Connection_1.Connection(this.openVidu, false, this, msg);
        connection.creationTime = new Date().getTime();
        var pid = connection.connectionId;
        if (!(pid in this.participants)) {
            console.log("New participant to participants list with id", pid);
            this.participants[pid] = connection;
        }
        else {
            //use existing so that we don't lose streams info
            console.info("Participant already exists in participants list with " +
                "the same id, old:", this.participants[pid], ", joined now:", connection);
            connection = this.participants[pid];
        }
        this.ee.emitEvent('participant-joined', [{
                connection: connection
            }]);
        this.ee.emitEvent('connectionCreated', [{
                connection: connection
            }]);
    };
    SessionInternal.prototype.onParticipantLeft = function (msg) {
        var _this = this;
        var connection = this.participants[msg.name];
        if (connection !== undefined) {
            delete this.participants[msg.name];
            this.ee.emitEvent('participant-left', [{
                    connection: connection
                }]);
            var streams = connection.getStreams();
            for (var key in streams) {
                this.ee.emitEvent('streamDestroyed', [{
                        stream: streams[key],
                        preventDefault: function () { _this.ee.removeEvent('stream-destroyed-default'); }
                    }]);
                this.ee.emitEvent('stream-destroyed-default', [{
                        stream: streams[key]
                    }]);
                // Deleting the removed stream from the OpenVidu object
                var index = this.openVidu.getRemoteStreams().indexOf(streams[key]);
                this.openVidu.getRemoteStreams().splice(index, 1);
            }
            connection.dispose();
            this.ee.emitEvent('connectionDestroyed', [{
                    connection: connection
                }]);
        }
        else {
            console.warn("Participant " + msg.name
                + " unknown. Participants: "
                + JSON.stringify(this.participants));
        }
    };
    ;
    SessionInternal.prototype.onParticipantEvicted = function (msg) {
        this.ee.emitEvent('participant-evicted', [{
                localParticipant: this.localParticipant
            }]);
    };
    ;
    SessionInternal.prototype.onNewMessage = function (msg) {
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
            console.warn("User undefined in new message:", msg);
        }
    };
    SessionInternal.prototype.recvIceCandidate = function (msg) {
        var candidate = {
            candidate: msg.candidate,
            sdpMid: msg.sdpMid,
            sdpMLineIndex: msg.sdpMLineIndex
        };
        var connection = this.participants[msg.endpointName];
        if (!connection) {
            console.error("Participant not found for endpoint " +
                msg.endpointName + ". Ice candidate will be ignored.", candidate);
            return;
        }
        var streams = connection.getStreams();
        var _loop_1 = function (key) {
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
            _loop_1(key);
        }
    };
    SessionInternal.prototype.onRoomClosed = function (msg) {
        console.log("Room closed: " + JSON.stringify(msg));
        var room = msg.room;
        if (room !== undefined) {
            this.ee.emitEvent('room-closed', [{
                    room: room
                }]);
        }
        else {
            console.warn("Room undefined in on room closed", msg);
        }
    };
    SessionInternal.prototype.onLostConnection = function () {
        if (!this.connected) {
            console.warn('Not connected to room: if you are not debugging, this is probably a certificate error');
            if (window.confirm('If you are not debugging, this is probably a certificate error at \"' + this.openVidu.getOpenViduServerURL() + '\"\n\nClick OK to navigate and accept it')) {
                location.assign(this.openVidu.getOpenViduServerURL() + '/accept-certificate');
            }
            ;
            return;
        }
        console.log('Lost connection in room ' + this.id);
        var room = this.id;
        if (room !== undefined) {
            this.ee.emitEvent('lost-connection', [{ room: room }]);
        }
        else {
            console.warn('Room undefined when lost connection');
        }
    };
    SessionInternal.prototype.onMediaError = function (params) {
        console.error("Media error: " + JSON.stringify(params));
        var error = params.error;
        if (error) {
            this.ee.emitEvent('error-media', [{
                    error: error
                }]);
        }
        else {
            console.warn("Received undefined media error. Params:", params);
        }
    };
    /*
     * forced means the user was evicted, no need to send the 'leaveRoom' request
     */
    SessionInternal.prototype.leave = function (forced, jsonRpcClient) {
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
    SessionInternal.prototype.disconnect = function (stream) {
        var connection = stream.getParticipant();
        if (!connection) {
            console.error("Stream to disconnect has no participant", stream);
            return;
        }
        delete this.participants[connection.connectionId];
        connection.dispose();
        if (connection === this.localParticipant) {
            console.log("Unpublishing my media (I'm " + connection.connectionId + ")");
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
            this.unsuscribe(stream);
        }
    };
    SessionInternal.prototype.unpublish = function (stream) {
        var connection = stream.getParticipant();
        if (!connection) {
            console.error("Stream to disconnect has no participant", stream);
            return;
        }
        if (connection === this.localParticipant) {
            delete this.participants[connection.connectionId];
            connection.dispose();
            console.log("Unpublishing my media (I'm " + connection.connectionId + ")");
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
    };
    SessionInternal.prototype.getStreams = function () {
        return this.streams;
    };
    SessionInternal.prototype.addParticipantSpeaking = function (participantId) {
        this.participantsSpeaking.push(participantId);
    };
    SessionInternal.prototype.removeParticipantSpeaking = function (participantId) {
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
    return SessionInternal;
}());
exports.SessionInternal = SessionInternal;


/***/ }),

/***/ 389:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(177);


/***/ }),

/***/ 69:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_rxjs_Subject__ = __webpack_require__(31);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_rxjs_Subject___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_rxjs_Subject__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return InfoService; });
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};


var InfoService = (function () {
    function InfoService() {
        this.newInfo$ = new __WEBPACK_IMPORTED_MODULE_1_rxjs_Subject__["Subject"]();
    }
    InfoService.prototype.getInfo = function () {
        return this.info;
    };
    InfoService.prototype.updateInfo = function (info) {
        this.info = info;
        this.newInfo$.next(info);
    };
    return InfoService;
}());
InfoService = __decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["c" /* Injectable */])(),
    __metadata("design:paramtypes", [])
], InfoService);

//# sourceMappingURL=info.service.js.map

/***/ })

},[389]);
//# sourceMappingURL=main.bundle.js.map