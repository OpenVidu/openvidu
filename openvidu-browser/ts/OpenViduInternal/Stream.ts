/*
 * options: name: XXX data: true (Maybe this is based on webrtc) audio: true,
 * video: true, url: "file:///..." > Player screen: true > Desktop (implicit
 * video:true, audio:false) audio: true, video: true > Webcam
 *
 * stream.hasAudio(); stream.hasVideo(); stream.hasData();
 */
import { Connection } from './Connection';
import { SessionInternal } from './SessionInternal';
import { OpenViduInternal, Callback } from './OpenViduInternal';
import { OpenViduError, OpenViduErrorName } from './OpenViduError';
import EventEmitter = require('wolfy87-eventemitter');
import * as kurentoUtils from '../KurentoUtils/kurento-utils-js';

import * as adapter from 'webrtc-adapter';
declare var navigator: any;
declare var RTCSessionDescription: any;

if (window) {
    window["adapter"] = adapter;
}

function jq(id: string): string {
    return id.replace(/(@|:|\.|\[|\]|,)/g, "\\$1");
}

function show(id: string) {
    document.getElementById(jq(id))!.style.display = 'block';
}

function hide(id: string) {
    document.getElementById(jq(id))!.style.display = 'none';
}

export interface StreamOptions {
    id: string;
    connection: Connection;
    recvVideo: boolean;
    recvAudio: boolean;
    sendVideo: boolean;
    sendAudio: boolean;
    activeAudio: boolean;
    activeVideo: boolean;
    data: boolean;
    mediaConstraints: any;
}

export class Stream {

    public connection: Connection;
    public streamId: string;
    public hasVideo: boolean;
    public hasAudio: boolean;
    public typeOfVideo: string; // 'CAMERA' or 'SCREEN'

    ee = new EventEmitter();
    private mediaStream: MediaStream;
    private wp: any;
    private video: HTMLVideoElement;
    private speechEvent: any;
    private recvVideo: boolean;
    private recvAudio: boolean;
    private sendVideo: boolean;
    private sendAudio: boolean;
    private mediaConstraints: any;
    private showMyRemote = false;
    private localMirrored = false;
    private chanId = 0;
    private dataChannel: boolean;
    private dataChannelOpened = false;

    private activeAudio = true;
    private activeVideo = true;

    private parentId: string;
    public isReadyToPublish: boolean = false;
    public isPublisherPublished: boolean = false;
    public isVideoELementCreated: boolean = false;
    public accessIsAllowed: boolean = false;
    public accessIsDenied: boolean = false;
    public isScreenRequestedReady: boolean = false;
    private isScreenRequested = false;

    constructor(private openVidu: OpenViduInternal, private local: boolean, private room: SessionInternal, options: any) {
        if (options !== 'screen-options') {
            this.configureOptions(options);
        } else {
            this.isScreenRequested = true;
            this.connection = this.room.getLocalParticipant();
        }
        this.addEventListener('mediastream-updated', () => {
            if (this.video) this.video.srcObject = this.mediaStream;
            console.debug("Video srcObject [" + this.mediaStream + "] added to stream [" + this.streamId + "]");
        });
    }

    emitStreamReadyEvent() {
        this.ee.emitEvent('stream-ready'), [{}];
    }

    removeVideo(parentElement: string);
    removeVideo(parentElement: Element);
    removeVideo();

    removeVideo(parentElement?) {
        if (this.video) {
            if (typeof parentElement === "string") {
                document.getElementById(parentElement)!.removeChild(this.video);
            } else if (parentElement instanceof Element) {
                parentElement.removeChild(this.video);
            }
            else if (!parentElement) {
                if (document.getElementById(this.parentId)) {
                    document.getElementById(this.parentId)!.removeChild(this.video);
                }
            }
            delete this.video;
        }
    }

    getVideoElement(): HTMLVideoElement {
        return this.video;
    }

    setVideoElement(video: HTMLVideoElement) {
        this.video = video;
    }

    getParentId() {
        return this.parentId;
    }

    getRecvVideo() {
        return this.recvVideo;
    }

    getRecvAudio() {
        return this.recvAudio;
    }

    getSendVideo() {
        return this.sendVideo;
    }

    getSendAudio() {
        return this.sendAudio;
    }


    subscribeToMyRemote() {
        this.showMyRemote = true;
    }

    displayMyRemote() {
        return this.showMyRemote;
    }

    mirrorLocalStream(wr) {
        this.showMyRemote = true;
        this.localMirrored = true;
        if (wr) {
            this.mediaStream = wr;
            this.ee.emitEvent('mediastream-updated');
        }
    }

    isLocalMirrored() {
        return this.localMirrored;
    }

    getChannelName() {
        return this.streamId + '_' + this.chanId++;
    }


    isDataChannelEnabled() {
        return this.dataChannel;
    }


    isDataChannelOpened() {
        return this.dataChannelOpened;
    }

    onDataChannelOpen(event) {
        console.debug('Data channel is opened');
        this.dataChannelOpened = true;
    }

    onDataChannelClosed(event) {
        console.debug('Data channel is closed');
        this.dataChannelOpened = false;
    }

    sendData(data) {
        if (this.wp === undefined) {
            throw new Error('WebRTC peer has not been created yet');
        }
        if (!this.dataChannelOpened) {
            throw new Error('Data channel is not opened');
        }
        console.info("Sending through data channel: " + data);
        this.wp.send(data);
    }

    getMediaStream() {
        return this.mediaStream;
    }

    getWebRtcPeer() {
        return this.wp;
    }

    addEventListener(eventName: string, listener: any) {
        this.ee.addListener(eventName, listener);
    }

    addOnceEventListener(eventName: string, listener: any) {
        this.ee.addOnceListener(eventName, listener);
    }

    removeListener(eventName) {
        this.ee.removeAllListeners(eventName);
    }

    showSpinner(spinnerParentId: string) {
        let progress = document.createElement('div');
        progress.id = 'progress-' + this.streamId;
        progress.style.background = "center transparent url('img/spinner.gif') no-repeat";
        let spinnerParent = document.getElementById(spinnerParentId);
        if (spinnerParent) {
            spinnerParent.appendChild(progress);
        }
    }

    hideSpinner(spinnerId?: string) {
        spinnerId = (spinnerId === undefined) ? this.streamId : spinnerId;
        hide('progress-' + spinnerId);
    }

    playOnlyVideo(parentElement, thumbnailId) {

        this.video = document.createElement('video');

        this.video.id = (this.local ? 'local-' : 'remote-') + 'video-' + this.streamId;
        this.video.autoplay = true;
        this.video.controls = false;
        this.ee.emitEvent('mediastream-updated');

        if (this.local && !this.displayMyRemote()) {
            this.video.muted = true;
            this.video.oncanplay = () => {
                console.info("Local 'Stream' with id [" + this.streamId + "] video is now playing");
                this.ee.emitEvent('video-is-playing', [{
                    element: this.video
                }]);
            };
        } else {
            this.video.title = this.streamId;
        }

        if (typeof parentElement === "string") {
            this.parentId = parentElement;

            let parentElementDom = document.getElementById(parentElement);
            if (parentElementDom) {
                this.video = parentElementDom.appendChild(this.video);
                this.ee.emitEvent('video-element-created-by-stream', [{
                    element: this.video
                }]);
                this.isVideoELementCreated = true;
            }
        } else {
            this.parentId = parentElement.id;
            this.video = parentElement.appendChild(this.video);
        }

        this.isReadyToPublish = true;

        return this.video;
    }

    playThumbnail(thumbnailId) {

        let container = document.createElement('div');
        container.className = "participant";
        container.id = this.streamId;
        let thumbnail = document.getElementById(thumbnailId);
        if (thumbnail) {
            thumbnail.appendChild(container);
        }

        let name = document.createElement('div');
        container.appendChild(name);
        let userName = this.streamId.replace('_webcam', '');
        if (userName.length >= 16) {
            userName = userName.substring(0, 16) + "...";
        }
        name.appendChild(document.createTextNode(userName));
        name.id = "name-" + this.streamId;
        name.className = "name";
        name.title = this.streamId;

        this.showSpinner(thumbnailId);

        return this.playOnlyVideo(container, thumbnailId);
    }

    getParticipant() {
        return this.connection;
    }

    getRTCPeerConnection() {
        return this.getWebRtcPeer().peerConnection;
    }

    requestCameraAccess(callback: Callback<Stream>) {

        this.connection.addStream(this);

        let constraints = this.mediaConstraints;

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

        this.userMediaHasVideo((hasVideo) => {
            if (!hasVideo) {
                if (this.sendVideo) {
                    callback(new OpenViduError(OpenViduErrorName.NO_VIDEO_DEVICE, 'You have requested camera access but there is no video input device available. Trying to connect with an audio input device only'), this);
                }
                if (!this.sendAudio) {
                    callback(new OpenViduError(OpenViduErrorName.NO_INPUT_DEVICE, 'You must init Publisher object with audio or video streams enabled'), undefined);
                } else {
                    constraints.video = false;
                    this.sendVideo = false;
                    this.requestCameraAccesAux(constraints, callback);
                }
            } else {
                this.requestCameraAccesAux(constraints, callback);
            }
        });
    }

    private requestCameraAccesAux(constraints, callback) {
        navigator.mediaDevices.getUserMedia(constraints)
            .then(userStream => {
                this.cameraAccessSuccess(userStream, callback);
            })
            .catch(error => {
                this.accessIsDenied = true;
                this.accessIsAllowed = false;
                let errorName: OpenViduErrorName;
                let errorMessage = error.toString();;
                if (!this.isScreenRequested) {
                    errorName = this.sendVideo ? OpenViduErrorName.CAMERA_ACCESS_DENIED : OpenViduErrorName.MICROPHONE_ACCESS_DENIED;
                } else {
                    errorName = OpenViduErrorName.SCREEN_CAPTURE_DENIED; // This code is only reachable for Firefox
                }
                callback(new OpenViduError(errorName, errorMessage), undefined);
            });
    }

    private cameraAccessSuccess(userStream: MediaStream, callback: Function) {
        this.accessIsAllowed = true;
        this.accessIsDenied = false;
        this.ee.emitEvent('access-allowed-by-publisher');

        if (userStream.getAudioTracks()[0] != null) {
            userStream.getAudioTracks()[0].enabled = this.activeAudio;
        }
        if (userStream.getVideoTracks()[0] != null) {
            userStream.getVideoTracks()[0].enabled = this.activeVideo;
        }

        this.mediaStream = userStream;
        this.ee.emitEvent('mediastream-updated');

        callback(undefined, this);
    }

    private userMediaHasVideo(callback) {
        // If the user is going to publish its screen there's a video source
        if (this.isScreenRequested) {
            callback(true);
            return;
        } else {
            // List all input devices and serach for a video kind
            navigator.mediaDevices.enumerateDevices().then(function (mediaDevices) {
                var videoInput = mediaDevices.filter(function (deviceInfo) {
                    return deviceInfo.kind === 'videoinput';
                })[0];
                callback(videoInput != null);
            });
        }
    }

    publishVideoCallback(error, sdpOfferParam, wp) {

        if (error) {
            return console.error("(publish) SDP offer error: "
                + JSON.stringify(error));
        }

        console.debug("Sending SDP offer to publish as "
            + this.streamId, sdpOfferParam);

        this.openVidu.sendRequest("publishVideo", {
            sdpOffer: sdpOfferParam,
            doLoopback: this.displayMyRemote() || false,
            audioActive: this.sendAudio,
            videoActive: this.sendVideo,
            typeOfVideo: ((this.sendVideo) ? ((this.isScreenRequested) ? 'SCREEN' :'CAMERA') : '')
        }, (error, response) => {
            if (error) {
                console.error("Error on publishVideo: " + JSON.stringify(error));
            } else {
                this.processSdpAnswer(response.sdpAnswer);
                console.info("'Publisher' succesfully published to session");
            }
        });
    }

    startVideoCallback(error, sdpOfferParam, wp) {
        if (error) {
            return console.error("(subscribe) SDP offer error: "
                + JSON.stringify(error));
        }
        console.debug("Sending SDP offer to subscribe to "
            + this.streamId, sdpOfferParam);
        this.openVidu.sendRequest("receiveVideoFrom", {
            sender: this.streamId,
            sdpOffer: sdpOfferParam
        }, (error, response) => {
            if (error) {
                console.error("Error on recvVideoFrom: " + JSON.stringify(error));
            } else {
                this.processSdpAnswer(response.sdpAnswer);
            }
        });
    }

    private initWebRtcPeer(sdpOfferCallback) {
        if (this.local) {

            let userMediaConstraints = {
                audio: this.sendAudio,
                video: this.sendVideo
            }

            let options: any = {
                videoStream: this.mediaStream,
                mediaConstraints: userMediaConstraints,
                onicecandidate: this.connection.sendIceCandidate.bind(this.connection),
            }

            if (this.dataChannel) {
                options.dataChannelConfig = {
                    id: this.getChannelName(),
                    onopen: this.onDataChannelOpen,
                    onclose: this.onDataChannelClosed
                };
                options.dataChannels = true;
            }

            if (this.displayMyRemote()) {
                this.wp = kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, error => {
                    if (error) {
                        return console.error(error);
                    }
                    this.wp.generateOffer(sdpOfferCallback.bind(this));
                });
            } else {
                this.wp = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, error => {
                    if (error) {
                        return console.error(error);
                    }
                    this.wp.generateOffer(sdpOfferCallback.bind(this));
                });
            }
            this.isPublisherPublished = true;
            this.ee.emitEvent('stream-created-by-publisher');
        } else {
            let offerConstraints = {
                audio: this.recvAudio,
                video: this.recvVideo
            };
            console.debug("'Session.subscribe(Stream)' called. Constraints of generate SDP offer",
                offerConstraints);
            let options = {
                onicecandidate: this.connection.sendIceCandidate.bind(this.connection),
                mediaConstraints: offerConstraints
            }
            this.wp = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, error => {
                if (error) {
                    return console.error(error);
                }
                this.wp.generateOffer(sdpOfferCallback.bind(this));
            });
        }
        console.debug("Waiting for SDP offer to be generated ("
            + (this.local ? "local" : "remote") + " 'Stream': " + this.streamId + ")");
    }

    publish() {

        // FIXME: Throw error when stream is not local
        if (this.isReadyToPublish) {
            this.initWebRtcPeer(this.publishVideoCallback);
        } else {
            this.ee.once('stream-ready', streamEvent => {
                this.publish();
            });
        }

        // FIXME: Now we have coupled connecting to a room and adding a
        // stream to this room. But in the new API, there are two steps.
        // This is the second step. For now, it do nothing.

    }

    subscribe() {

        // FIXME: In the current implementation all participants are subscribed
        // automatically to all other participants. We use this method only to
        // negotiate SDP

        this.initWebRtcPeer(this.startVideoCallback);
    }

    processSdpAnswer(sdpAnswer) {

        let answer = new RTCSessionDescription({
            type: 'answer',
            sdp: sdpAnswer,
        });
        console.debug(this.streamId + ": set peer connection with recvd SDP answer",
            sdpAnswer);
        let participantId = this.streamId;
        let pc = this.wp.peerConnection;
        pc.setRemoteDescription(answer, () => {
            // Avoids to subscribe to your own stream remotely 
            // except when showMyRemote is true
            if (!this.local || this.displayMyRemote()) {
                this.mediaStream = pc.getRemoteStreams()[0];
                console.debug("Peer remote stream", this.mediaStream);

                if (this.mediaStream != undefined) {

                    this.ee.emitEvent('mediastream-updated');

                    if (this.mediaStream.getAudioTracks()[0] != null) {

                        this.speechEvent = kurentoUtils.WebRtcPeer.hark(this.mediaStream, { threshold: this.room.thresholdSpeaker });

                        this.speechEvent.on('speaking', () => {
                            //this.room.addParticipantSpeaking(participantId);
                            this.room.emitEvent('publisherStartSpeaking', [{
                                connection: this.connection,
                                streamId: this.streamId
                            }]);
                        });

                        this.speechEvent.on('stopped_speaking', () => {
                            //this.room.removeParticipantSpeaking(participantId);
                            this.room.emitEvent('publisherStopSpeaking', [{
                                connection: this.connection,
                                streamId: this.streamId
                            }]);
                        });

                    }
                }
                // let thumbnailId = this.video.thumb;
                this.video.oncanplay = () => {
                    if (this.local && this.displayMyRemote()) {
                        console.info("Your own remote 'Stream' with id [" + this.streamId + "] video is now playing");
                        this.ee.emitEvent('remote-video-is-playing', [{
                            element: this.video
                        }]);
                    } else if (!this.local && !this.displayMyRemote()) {
                        console.info("Remote 'Stream' with id [" + this.streamId + "] video is now playing");
                        this.ee.emitEvent('video-is-playing', [{
                            element: this.video
                        }]);
                    }
                    //show(thumbnailId);
                    //this.hideSpinner(this.streamId);
                };
                this.room.emitEvent('stream-subscribed', [{
                    stream: this
                }]);
            }
        }, error => {
            console.error(this.streamId + ": Error setting SDP to the peer connection: "
                + JSON.stringify(error));
        });
    }

    unpublish() {
        if (this.wp) {
            this.wp.dispose();
        } else {
            if (this.mediaStream) {
                this.mediaStream.getAudioTracks().forEach(function (track) {
                    track.stop && track.stop()
                })
                this.mediaStream.getVideoTracks().forEach(function (track) {
                    track.stop && track.stop()
                })
            }
        }

        if (this.speechEvent) {
            this.speechEvent.stop();
        }

        console.info(this.streamId + ": Stream '" + this.streamId + "' unpublished");
    }

    dispose() {

        function disposeElement(element) {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }

        disposeElement("progress-" + this.streamId);

        if (this.wp) {
            this.wp.dispose();
        } else {
            if (this.mediaStream) {
                this.mediaStream.getAudioTracks().forEach(function (track) {
                    track.stop && track.stop()
                })
                this.mediaStream.getVideoTracks().forEach(function (track) {
                    track.stop && track.stop()
                })
            }
        }

        if (this.speechEvent) {
            this.speechEvent.stop();
        }

        console.info((this.local ? "Local " : "Remote ") + "'Stream' with id [" + this.streamId + "]' has been succesfully disposed");
    }

    private configureOptions(options) {
        this.connection = options.connection;
        this.recvVideo = options.recvVideo || false;
        this.recvAudio = options.recvAudio || false;
        this.sendVideo = options.sendVideo;
        this.sendAudio = options.sendAudio;
        this.activeAudio = options.activeAudio;
        this.activeVideo = options.activeVideo;
        this.dataChannel = options.data || false;
        this.mediaConstraints = options.mediaConstraints;

        this.hasAudio = ((this.recvAudio || this.sendAudio) != undefined) ? (this.recvAudio || this.sendAudio) : false;
        this.hasVideo = ((this.recvVideo || this.sendVideo) != undefined) ? (this.recvVideo || this.sendVideo) : false;
        this.typeOfVideo = options.typeOfVideo;

        if (options.id) {
            this.streamId = options.id;
        } else {
            this.streamId =  this.sendVideo ? "WEBCAM" : "MICRO";
        }
    }

    configureScreenOptions(options) {
        if (options.id) {
            this.streamId = options.id;
        } else {
            this.streamId = "SCREEN";
        }
        this.recvVideo = options.recvVideo || false;
        this.recvAudio = options.recvAudio || false;
        this.sendVideo = options.sendVideo;
        this.sendAudio = options.sendAudio;
        this.activeAudio = options.activeAudio;
        this.activeVideo = options.activeVideo;
        this.dataChannel = options.data || false;
        this.mediaConstraints = options.mediaConstraints;

        this.ee.emitEvent('can-request-screen');
    }
}
