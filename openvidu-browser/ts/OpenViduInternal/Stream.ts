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
import { WebRtcStats } from './WebRtcStats';
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

export interface StreamOptionsServer {
    id: string;
    audioActive: boolean;
    videoActive: boolean;
    typeOfVideo: string;
}

export interface InboundStreamOptions {
    id: string;
    connection: Connection;
    recvAudio: boolean;
    recvVideo: boolean;
    typeOfVideo: string;
}

export interface OutboundStreamOptions {
    activeAudio: boolean;
    activeVideo: boolean;
    mediaConstraints: any;
    sendAudio: boolean;
    sendVideo: boolean;
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
    private showMyRemote = false;
    private localMirrored = false;
    private chanId = 0;

    inboundOptions: InboundStreamOptions;
    outboundOptions: OutboundStreamOptions;

    private parentId: string;
    public isReadyToPublish: boolean = false;
    public isPublisherPublished: boolean = false;
    public isVideoELementCreated: boolean = false;
    public accessIsAllowed: boolean = false;
    public accessIsDenied: boolean = false;
    public isScreenRequestedReady: boolean = false;
    private isScreenRequested = false;

    private webRtcStats: WebRtcStats;

    constructor(private openVidu: OpenViduInternal, private local: boolean, private room: SessionInternal, options: any) {
        if (options !== 'screen-options') {
            // Outbound stream (not screen share) or Inbound stream
            if ('id' in options) {
                this.inboundOptions = options;
            } else {
                this.outboundOptions = options;
            }
            this.streamId = (options.id != null) ? options.id : ((options.sendVideo) ? "CAMERA" : "MICRO");
            this.typeOfVideo = (options.typeOfVideo != null) ? options.typeOfVideo : '';

            if ('recvAudio' in options) {
                // Set Connection for an Inbound stream (for Outbound streams will be set on Session.Publish(Publisher))
                this.connection = options.connection;
            }
        } else {
            // Outbound stream for screen share
            this.isScreenRequested = true;
            this.typeOfVideo = 'SCREEN';
        }
        this.addEventListener('mediastream-updated', () => {
            if (this.video) this.video.srcObject = this.mediaStream;
            console.debug("Video srcObject [" + this.mediaStream + "] added to stream [" + this.streamId + "]");
        });
    }

    emitStreamReadyEvent() {
        this.ee.emitEvent('stream-ready');
    }

    removeVideo(parentElement: string);
    removeVideo(parentElement: Element);
    removeVideo();

    removeVideo(parentElement?) {
        if (this.video) {
            if (typeof parentElement === "string") {
                document.getElementById(parentElement)!.removeChild(this.video);
                this.ee.emitEvent('video-removed');
            } else if (parentElement instanceof Element) {
                parentElement.removeChild(this.video);
                this.ee.emitEvent('video-removed');
            } else if (!parentElement) {
                if (document.getElementById(this.parentId)) {
                    document.getElementById(this.parentId)!.removeChild(this.video);
                    this.ee.emitEvent('video-removed');
                }
            }
            delete this.video;
        }
    }

    getVideoElement(): HTMLVideoElement {
        return this.video;
    }

    setVideoElement(video) {
        if (!!video) this.video = video;
    }

    getParentId() {
        return this.parentId;
    }

    getRecvVideo() {
        return this.inboundOptions.recvVideo;
    }

    getRecvAudio() {
        return this.inboundOptions.recvAudio;
    }

    getSendVideo() {
        return this.outboundOptions.sendVideo;
    }

    getSendAudio() {
        return this.outboundOptions.sendAudio;
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

    getMediaStream() {
        return this.mediaStream;
    }

    getWebRtcPeer() {
        return this.wp;
    }

    getRTCPeerConnection() {
        return this.wp.peerConnection;
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
        if (!!parentElement) {

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
        
        this.isReadyToPublish = true;
        return null;
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

    requestCameraAccess(callback: Callback<Stream>) {

        let constraints = this.outboundOptions.mediaConstraints;

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
                if (this.outboundOptions.sendVideo) {
                    callback(new OpenViduError(OpenViduErrorName.NO_VIDEO_DEVICE, 'You have requested camera access but there is no video input device available. Trying to connect with an audio input device only'), this);
                }
                if (!this.outboundOptions.sendAudio) {
                    callback(new OpenViduError(OpenViduErrorName.NO_INPUT_DEVICE, 'You must init Publisher object with audio or video streams enabled'), undefined);
                } else {
                    constraints.video = false;
                    this.outboundOptions.sendVideo = false;
                    this.requestCameraAccesAux(constraints, callback);
                }
            } else {
                this.requestCameraAccesAux(constraints, callback);
            }
        });
    }

    private requestCameraAccesAux(constraints, callback) {
        console.log(constraints);
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
                    errorName = this.outboundOptions.sendVideo ? OpenViduErrorName.CAMERA_ACCESS_DENIED : OpenViduErrorName.MICROPHONE_ACCESS_DENIED;
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
            userStream.getAudioTracks()[0].enabled = this.outboundOptions.activeAudio;
        }
        if (userStream.getVideoTracks()[0] != null) {
            userStream.getVideoTracks()[0].enabled = this.outboundOptions.activeVideo;
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
            audioActive: this.outboundOptions.sendAudio,
            videoActive: this.outboundOptions.sendVideo,
            typeOfVideo: ((this.outboundOptions.sendVideo) ? ((this.isScreenRequested) ? 'SCREEN' : 'CAMERA') : '')
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
                audio: this.outboundOptions.sendAudio,
                video: this.outboundOptions.sendVideo
            }

            let options: any = {
                videoStream: this.mediaStream,
                mediaConstraints: userMediaConstraints,
                onicecandidate: this.connection.sendIceCandidate.bind(this.connection),
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
                audio: this.inboundOptions.recvAudio,
                video: this.inboundOptions.recvVideo
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

                if (!!this.video) {
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
                }
                this.room.emitEvent('stream-subscribed', [{
                    stream: this
                }]);
            }

            this.initWebRtcStats();

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

        this.stopWebRtcStats();

        console.info((this.local ? "Local " : "Remote ") + "'Stream' with id [" + this.streamId + "]' has been succesfully disposed");
    }

    configureScreenOptions(options: OutboundStreamOptions) {
        this.outboundOptions = options;
        this.streamId = "SCREEN";
    }

    private initWebRtcStats(): void {
        this.webRtcStats = new WebRtcStats(this);
        this.webRtcStats.initWebRtcStats();
    }

    private stopWebRtcStats() {
        if (this.webRtcStats != null && this.webRtcStats.isEnabled()) {
            this.webRtcStats.stopWebRtcStats();
        }
    }

}
