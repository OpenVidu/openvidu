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

export interface VideoOptions {
    thumb: string;
    video: HTMLVideoElement;
}

export class Stream {

    public connection: Connection;

    private ee = new EventEmitter();
    private wrStream: MediaStream;
    private wp: any;
    private id: string;
    private video: HTMLVideoElement;
    private videoElements: VideoOptions[] = [];
    private elements: HTMLDivElement[] = [];
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

    private videoSrcObject: MediaStream | null;
    private parentId: string;
    public isReady: boolean = false;
    public isVideoELementCreated: boolean = false;
    public accessIsAllowed: boolean = false;
    public accessIsDenied: boolean = false;

    constructor(private openVidu: OpenViduInternal, private local: boolean, private room: SessionInternal, options: StreamOptions) {

        if (options.id) {
            this.id = options.id;
        } else {
            this.id = "webcam";
        }

        this.connection = options.connection;
        this.recvVideo = options.recvVideo || false;
        this.recvAudio = options.recvAudio || false;
        this.sendVideo = options.sendVideo;
        this.sendAudio = options.sendAudio;
        this.activeAudio = options.activeAudio;
        this.activeVideo = options.activeVideo;
        this.dataChannel = options.data || false;
        this.mediaConstraints = options.mediaConstraints;

        this.addEventListener('src-added', (srcEvent) => {
            this.videoSrcObject = srcEvent.srcObject;
            if (this.video) this.video.srcObject = srcEvent.srcObject;
            console.debug("Video srcObject [" + srcEvent.srcObject + "] added to stream [" + this.getId() + "]");
        });
    }

    emitSrcEvent(wrstream) {
        this.ee.emitEvent('src-added', [{
            srcObject: wrstream
        }]);
    }

    emitStreamReadyEvent() {
        this.ee.emitEvent('stream-ready'), [{}];
    }

    getVideoSrcObject() {
        return this.videoSrcObject;
    }

    removeVideo(parentElement: string);
    removeVideo(parentElement: Element);
    removeVideo();

    removeVideo(parentElement?) {
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
    }

    getVideoElement(): HTMLVideoElement {
        return this.video;
    }

    setVideoElement(video: HTMLVideoElement) {
        this.video = video;
    }






    getRecvVideo() {
        return this.recvVideo;
    }

    getRecvAudio() {
        return this.recvAudio;
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
            this.wrStream = wr;
            this.emitSrcEvent(this.wrStream);
        }
    }

    isLocalMirrored() {
        return this.localMirrored;
    }

    getChannelName() {
        return this.getId() + '_' + this.chanId++;
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

    getWrStream() {
        return this.wrStream;
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
        progress.id = 'progress-' + this.getId();
        progress.style.background = "center transparent url('img/spinner.gif') no-repeat";
        let spinnerParent = document.getElementById(spinnerParentId);
        if (spinnerParent) {
            spinnerParent.appendChild(progress);
        }
    }

    hideSpinner(spinnerId?: string) {
        spinnerId = (spinnerId === undefined) ? this.getId() : spinnerId;
        hide('progress-' + spinnerId);
    }

    playOnlyVideo(parentElement, thumbnailId) {

        // TO-DO: check somehow if the stream is audio only, so the element created is <audio> instead of <video>

        this.video = document.createElement('video');

        this.video.id = (this.local ? 'local-' : 'remote-') + 'video-' + this.getId();
        this.video.autoplay = true;
        this.video.controls = false;
        this.video.srcObject = this.videoSrcObject;

        this.videoElements.push({
            thumb: thumbnailId,
            video: this.video
        });

        if (this.local && !this.displayMyRemote()) {
            this.video.muted = true;
            this.video.onplaying = () => {
                console.info("Local 'Stream' with id [" + this.getId() + "] video is now playing");
                this.ee.emitEvent('video-is-playing', [{
                    element: this.video
                }]);
            };
        } else {
            this.video.title = this.getId();
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

        this.ee.emitEvent('stream-created-by-publisher');

        this.isReady = true;

        return this.video;
    }

    playThumbnail(thumbnailId) {

        let container = document.createElement('div');
        container.className = "participant";
        container.id = this.getId();
        let thumbnail = document.getElementById(thumbnailId);
        if (thumbnail) {
            thumbnail.appendChild(container);
        }

        this.elements.push(container);

        let name = document.createElement('div');
        container.appendChild(name);
        let userName = this.getId().replace('_webcam', '');
        if (userName.length >= 16) {
            userName = userName.substring(0, 16) + "...";
        }
        name.appendChild(document.createTextNode(userName));
        name.id = "name-" + this.getId();
        name.className = "name";
        name.title = this.getId();

        this.showSpinner(thumbnailId);

        return this.playOnlyVideo(container, thumbnailId);
    }

    getIdInParticipant() {
        return this.id;
    }

    getParticipant() {
        return this.connection;
    }

    getId() {
        return this.connection.connectionId + "_" + this.id;
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
                constraints.video = false;
                this.sendVideo = false;
                this.requestCameraAccesAux(constraints, callback);
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
                /*//  Try to ask for microphone only
                navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                    .then(userStream => {
                        constraints.video = false;
                        this.sendVideo = false;
                        this.sendAudio = true;
                        this.cameraAccessSuccess(userStream, callback);
                    })
                    .catch(error => {*/
                this.accessIsDenied = true;
                this.accessIsAllowed = false;
                this.ee.emitEvent('access-denied-by-publisher');

                console.error("Access denied", error);
                callback(error, this);
            });
    }

    private cameraAccessSuccess(userStream, callback) {
        this.accessIsAllowed = true;
        this.accessIsDenied = false;
        this.ee.emitEvent('access-allowed-by-publisher');

        if (userStream.getAudioTracks()[0] != null) {
            userStream.getAudioTracks()[0].enabled = this.activeAudio;
        }
        if (userStream.getVideoTracks()[0] != null) {
            userStream.getVideoTracks()[0].enabled = this.activeVideo;
        }

        this.wrStream = userStream;
        this.emitSrcEvent(this.wrStream);

        callback(undefined, this);
    }

    private userMediaHasVideo(callback) {
        navigator.mediaDevices.enumerateDevices().then(function (mediaDevices) {
            var videoInput = mediaDevices.filter(function (deviceInfo) {
                return deviceInfo.kind === 'videoinput';
            })[0];
            callback(videoInput != null);
        });
    }

    publishVideoCallback(error, sdpOfferParam, wp) {

        if (error) {
            return console.error("(publish) SDP offer error: "
                + JSON.stringify(error));
        }

        console.debug("Sending SDP offer to publish as "
            + this.getId(), sdpOfferParam);

        this.openVidu.sendRequest("publishVideo", {
            sdpOffer: sdpOfferParam,
            doLoopback: this.displayMyRemote() || false,
            audioActive: this.sendAudio,
            videoActive: this.sendVideo
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
            + this.getId(), sdpOfferParam);
        this.openVidu.sendRequest("receiveVideoFrom", {
            sender: this.getId(),
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
                videoStream: this.wrStream,
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
            + (this.local ? "local" : "remote") + " 'Stream': " + this.getId() + ")");
    }

    publish() {

        // FIXME: Throw error when stream is not local
        if (this.isReady) {
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
        console.debug(this.getId() + ": set peer connection with recvd SDP answer",
            sdpAnswer);
        let participantId = this.getId();
        let pc = this.wp.peerConnection;
        pc.setRemoteDescription(answer, () => {
            // Avoids to subscribe to your own stream remotely 
            // except when showMyRemote is true
            if (!this.local || this.displayMyRemote()) {
                this.wrStream = pc.getRemoteStreams()[0];
                console.debug("Peer remote stream", this.wrStream);

                if (this.wrStream != undefined) {

                    this.emitSrcEvent(this.wrStream);

                    if (this.wrStream.getAudioTracks()[0] != null) {

                        this.speechEvent = kurentoUtils.WebRtcPeer.hark(this.wrStream, { threshold: this.room.thresholdSpeaker });

                        this.speechEvent.on('speaking', () => {
                            this.room.addParticipantSpeaking(participantId);
                            this.room.emitEvent('stream-speaking', [{
                                participantId: participantId
                            }]);
                        });

                        this.speechEvent.on('stopped_speaking', () => {
                            this.room.removeParticipantSpeaking(participantId);
                            this.room.emitEvent('stream-stopped-speaking', [{
                                participantId: participantId
                            }]);
                        });
                        
                    }
                }
                for (let videoElement of this.videoElements) {
                    let thumbnailId = videoElement.thumb;
                    let video = videoElement.video;
                    video.srcObject = this.wrStream;
                    video.onplaying = () => {
                        if (this.local && this.displayMyRemote()) {
                            console.info("Your own remote 'Stream' with id [" + this.getId() + "] video is now playing");
                            this.ee.emitEvent('remote-video-is-playing', [{
                                element: this.video
                            }]);
                        } else if (!this.local && !this.displayMyRemote()) {
                            console.info("Remote 'Stream' with id [" + this.getId() + "] video is now playing");
                            this.ee.emitEvent('video-is-playing', [{
                                element: this.video
                            }]);
                        }
                        //show(thumbnailId);
                        //this.hideSpinner(this.getId());
                    };
                }
                this.room.emitEvent('stream-subscribed', [{
                    stream: this
                }]);
            }
        }, error => {
            console.error(this.getId() + ": Error setting SDP to the peer connection: "
                + JSON.stringify(error));
        });
    }

    unpublish() {
        if (this.wp) {
            this.wp.dispose();
        } else {
            if (this.wrStream) {
                this.wrStream.getAudioTracks().forEach(function (track) {
                    track.stop && track.stop()
                })
                this.wrStream.getVideoTracks().forEach(function (track) {
                    track.stop && track.stop()
                })
            }
        }

        if (this.speechEvent) {
            this.speechEvent.stop();
        }

        console.info(this.getId() + ": Stream '" + this.id + "' unpublished");
    }

    dispose() {

        function disposeElement(element) {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }

        this.elements.forEach(e => disposeElement(e));

        //this.videoElements.forEach(ve => disposeElement(ve.video));

        disposeElement("progress-" + this.getId());

        if (this.wp) {
            this.wp.dispose();
        } else {
            if (this.wrStream) {
                this.wrStream.getAudioTracks().forEach(function (track) {
                    track.stop && track.stop()
                })
                this.wrStream.getVideoTracks().forEach(function (track) {
                    track.stop && track.stop()
                })
            }
        }

        if (this.speechEvent) {
            this.speechEvent.stop();
        }

        console.info((this.local ? "Local " : "Remote ") + "'Stream' with id [" + this.getId() + "]' has been succesfully disposed");
    }
}
