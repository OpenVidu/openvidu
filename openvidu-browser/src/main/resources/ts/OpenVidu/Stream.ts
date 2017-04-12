/*
 * options: name: XXX data: true (Maybe this is based on webrtc) audio: true,
 * video: true, url: "file:///..." > Player screen: true > Desktop (implicit
 * video:true, audio:false) audio: true, video: true > Webcam
 *
 * stream.hasAudio(); stream.hasVideo(); stream.hasData();
 */
import { Participant } from './Participant';
import { Session } from './Session';
import { OpenVidu, Callback } from './OpenVidu';
import EventEmitter = require('wolfy87-eventemitter');
import * as kurentoUtils from 'kurento-utils';

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
    participant: Participant;
    recvVideo: any;
    recvAudio: any;
    video: boolean;
    audio: boolean;
    data: boolean;
    mediaConstraints: any;
}

export interface VideoOptions {
    thumb: string;
    video: HTMLVideoElement;
}

export class Stream {

    private ee = new EventEmitter();
    private wrStream: any;
    private wp: any;
    private id: string;
    private video: HTMLVideoElement;
    private videoElements: VideoOptions[] = [];
    private elements: HTMLDivElement[] = [];
    private participant: Participant;
    private speechEvent: any;
    private recvVideo: any;
    private recvAudio: any;
    private sendVideo: boolean;
    private sendAudio: boolean;
    private mediaConstraints: any;
    private showMyRemote = false;
    private localMirrored = false;
    private chanId = 0;
    private dataChannel: boolean;
    private dataChannelOpened = false;

    private videoSrc: string;
    public isReady: boolean = false;

    constructor(private openVidu: OpenVidu, private local: boolean, private room: Session, options: StreamOptions) {

        if (options.id) {
            this.id = options.id;
        } else {
            this.id = "webcam";
        }

        this.participant = options.participant;
        this.recvVideo = options.recvVideo;
        this.recvAudio = options.recvAudio;
        this.dataChannel = options.data || false;
        this.sendVideo = options.video;
        this.sendAudio = options.audio;
        this.mediaConstraints = options.mediaConstraints;

        this.addEventListener('src-added', (srcEvent) => {
            this.videoSrc = srcEvent.src;
            if (this.video) this.video.src = srcEvent.src;
            console.warn("Videosrc [" + srcEvent.src + "] added to stream [" + this.getId() + "]");
        });
    }

    emitSrcEvent(wrstream) {
        this.ee.emitEvent('src-added', [{
            src: URL.createObjectURL(wrstream)
        }]);
    }

    emitStreamReadyEvent(){
        this.ee.emitEvent('stream-ready'), [{}];
    }

    getVideoSrc() {
        return this.videoSrc;
    }

    removeVideo(parentElement) {
        document.getElementById(parentElement)!.removeChild(this.video);
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
        console.log('Data channel is opened');
        this.dataChannelOpened = true;
    }

    onDataChannelClosed(event) {
        console.log('Data channel is closed');
        this.dataChannelOpened = false;
    }

    sendData(data) {
        if (this.wp === undefined) {
            throw new Error('WebRTC peer has not been created yet');
        }
        if (!this.dataChannelOpened) {
            throw new Error('Data channel is not opened');
        }
        console.log("Sending through data channel: " + data);
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
        } else {
            this.video.title = this.getId();
        }

        if (typeof parentElement === "string") {
            let parentElementDom = document.getElementById(parentElement);
            if (parentElementDom) {
                this.video = parentElementDom.appendChild(this.video);
            }
        } else {
            this.video = parentElement.appendChild(this.video);
        }

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
        return this.participant;
    }

    getId() {
        if (this.participant) {
            return this.participant.getId() + "_" + this.id;
        } else {
            return this.id + "_webcam";
        }
    }

    getRTCPeerConnection() {
        return this.getWebRtcPeer().peerConnection;
    }

    requestCameraAccess(callback: Callback<Stream>) {

        this.participant.addStream(this);

        let constraints = this.mediaConstraints;

        let constraints2 = {
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

        navigator.mediaDevices.getUserMedia(constraints)
            .then(userStream => {
                userStream.getAudioTracks()[0].enabled = this.sendAudio;
                userStream.getVideoTracks()[0].enabled = this.sendVideo;

                this.wrStream = userStream;
                this.emitSrcEvent(this.wrStream);

                callback(undefined, this);
            })
            .catch(function (e) {
                console.error("Access denied", e);
                callback(e, undefined);
            });
    }

    publishVideoCallback(error, sdpOfferParam, wp) {

        if (error) {
            return console.error("(publish) SDP offer error: "
                + JSON.stringify(error));
        }

        console.log("Sending SDP offer to publish as "
            + this.getId(), sdpOfferParam);

        this.openVidu.sendRequest("publishVideo", {
            sdpOffer: sdpOfferParam,
            doLoopback: this.displayMyRemote() || false
        }, (error, response) => {
            if (error) {
                console.error("Error on publishVideo: " + JSON.stringify(error));
            } else {
                this.room.emitEvent('stream-published', [{
                    stream: this
                }])
                this.processSdpAnswer(response.sdpAnswer);
            }
        });
    }

    startVideoCallback(error, sdpOfferParam, wp) {
        if (error) {
            return console.error("(subscribe) SDP offer error: "
                + JSON.stringify(error));
        }
        console.log("Sending SDP offer to subscribe to "
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
                onicecandidate: this.participant.sendIceCandidate.bind(this.participant),
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
                this.wp = new kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, error => {
                    if (error) {
                        return console.error(error);
                    }
                    this.wp.generateOffer(sdpOfferCallback.bind(this));
                });
            } else {
                this.wp = new kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, error => {
                    if (error) {
                        return console.error(error);
                    }
                    this.wp.generateOffer(sdpOfferCallback.bind(this));
                });
            }
        } else {
            let offerConstraints = {
                mandatory: {
                    OfferToReceiveVideo: this.recvVideo,
                    OfferToReceiveAudio: this.recvAudio
                }
            };
            console.log("Constraints of generate SDP offer (subscribing)",
                offerConstraints);
            let options = {
                onicecandidate: this.participant.sendIceCandidate.bind(this.participant),
                connectionConstraints: offerConstraints
            }
            this.wp = new kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, error => {
                if (error) {
                    return console.error(error);
                }
                this.wp.generateOffer(sdpOfferCallback.bind(this));
            });
        }
        console.log("Waiting for SDP offer to be generated ("
            + (this.local ? "local" : "remote") + " peer: " + this.getId() + ")");
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
        console.log(this.getId() + ": set peer connection with recvd SDP answer",
            sdpAnswer);
        let streamId = this.getId();
        let pc = this.wp.peerConnection;
        pc.setRemoteDescription(answer, () => {
            // Avoids to subscribe to your own stream remotely 
            // except when showMyRemote is true
            if (!this.local || this.displayMyRemote()) {
                this.wrStream = pc.getRemoteStreams()[0];
                console.log("Peer remote stream", this.wrStream);

                if (this.wrStream != undefined) {

                    this.emitSrcEvent(this.wrStream);

                    this.speechEvent = kurentoUtils.WebRtcPeer.hark(this.wrStream, { threshold: this.room.thresholdSpeaker });

                    this.speechEvent.on('speaking', () => {
                        this.room.addParticipantSpeaking(streamId);
                        this.room.emitEvent('stream-speaking', [{
                            streamId: streamId
                        }]);
                    });

                    this.speechEvent.on('stopped_speaking', () => {
                        this.room.removeParticipantSpeaking(streamId);
                        this.room.emitEvent('stream-stopped-speaking', [{
                            streamId: streamId
                        }]);
                    });
                }
                for (let videoElement of this.videoElements) {
                    let thumbnailId = videoElement.thumb;
                    let video = videoElement.video;
                    video.src = URL.createObjectURL(this.wrStream);
                    video.onplay = () => {
                        console.log(this.getId() + ': ' + 'Video playing');
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

        console.log(this.getId() + ": Stream '" + this.id + "' unpublished");
    }

    dispose() {

        function disposeElement(element) {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }

        this.elements.forEach(e => disposeElement(e));

        this.videoElements.forEach(ve => disposeElement(ve));

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

        console.log(this.getId() + ": Stream '" + this.id + "' disposed");
    }
}
