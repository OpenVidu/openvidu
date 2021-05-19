/*
 * (C) Copyright 2017-2020 OpenVidu (https://openvidu.io)
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

import freeice = require('freeice');
import { v4 as uuidv4 } from 'uuid';
import { ExceptionEventName } from '../Events/ExceptionEvent';
import { OpenViduLogger } from '../Logger/OpenViduLogger';
import { PlatformUtils } from '../Utils/Platform';

/**
 * @hidden
 */
const logger: OpenViduLogger = OpenViduLogger.getInstance();
/**
 * @hidden
 */
let platform: PlatformUtils;


export interface WebRtcPeerConfiguration {
    mediaConstraints: {
        audio: boolean,
        video: boolean
    };
    simulcast: boolean;
    onicecandidate: (event: RTCIceCandidate) => void;
    onexception: (exceptionName: ExceptionEventName, message: string, data?: any) => void;
    iceServers: RTCIceServer[] | undefined;
    mediaStream?: MediaStream | null;
    mode?: 'sendonly' | 'recvonly' | 'sendrecv';
    id?: string;
}

export class WebRtcPeer {
    public pc: RTCPeerConnection;
    public remoteCandidatesQueue: RTCIceCandidate[] = [];
    public localCandidatesQueue: RTCIceCandidate[] = [];

    // Same as WebRtcPeerConfiguration but without optional fields.
    protected configuration: Required<WebRtcPeerConfiguration>;

    private iceCandidateList: RTCIceCandidate[] = [];
    private candidategatheringdone = false;

    constructor(configuration: WebRtcPeerConfiguration) {
        platform = PlatformUtils.getInstance();

        this.configuration = {
            ...configuration,
            iceServers: (!!configuration.iceServers && configuration.iceServers.length > 0) ? configuration.iceServers : freeice(),
            mediaStream: !!configuration.mediaStream
                ? configuration.mediaStream
                : null,
            mode: !!configuration.mode ? configuration.mode : "sendrecv",
            id: !!configuration.id ? configuration.id : this.generateUniqueId(),
        };

        this.pc = new RTCPeerConnection({ iceServers: this.configuration.iceServers });

        this.pc.addEventListener('icecandidate', (event: RTCPeerConnectionIceEvent) => {
            if (event.candidate != null) {
                const candidate: RTCIceCandidate = event.candidate;
                this.configuration.onicecandidate(candidate);
                if (candidate.candidate !== '') {
                    this.localCandidatesQueue.push(<RTCIceCandidate>{ candidate: candidate.candidate });
                }
            }
        });

        this.pc.addEventListener('signalingstatechange', () => {
            if (this.pc.signalingState === 'stable') {
                while (this.iceCandidateList.length > 0) {
                    let candidate = this.iceCandidateList.shift();
                    this.pc.addIceCandidate(<RTCIceCandidate>candidate);
                }
            }
        });
    }

    /**
     * This method frees the resources used by WebRtcPeer
     */
    dispose() {
        logger.debug('Disposing WebRtcPeer');
        if (this.pc) {
            if (this.pc.signalingState === 'closed') {
                return;
            }
            this.pc.close();
            this.remoteCandidatesQueue = [];
            this.localCandidatesQueue = [];
        }
    }

    /**
     * Creates an SDP offer from the local RTCPeerConnection to send to the other peer
     * Only if the negotiation was initiated by the this peer
     */
    createOffer(): Promise<RTCSessionDescriptionInit> {
        return new Promise((resolve, reject) => {
            const hasAudio = this.configuration.mediaConstraints.audio;
            const hasVideo = this.configuration.mediaConstraints.video;

            let offerPromise: Promise<RTCSessionDescriptionInit>;

            // TODO: Delete this conditional when all supported browsers are
            // modern enough to implement the Transceiver methods.
            if ("addTransceiver" in this.pc) {
                logger.debug("[createOffer] Method RTCPeerConnection.addTransceiver() is available; using it");

                // At this point, all "send" audio/video tracks have been added
                // with pc.addTrack(), which in modern versions of libwebrtc
                // will have created Transceivers with "sendrecv" direction.
                // Source: [addTrack/9.3](https://www.w3.org/TR/2020/CRD-webrtc-20201203/#dom-rtcpeerconnection-addtrack).
                //
                // Here we just need to enforce that those Transceivers have the
                // correct direction, either "sendrecv" or "sendonly".
                //
                // Otherwise, if the tracks are "recv", no Transceiver should
                // have been added yet.

                const tcs = this.pc.getTransceivers();

                if (tcs.length > 0) {
                    // Assert correct mode.
                    if (
                        this.configuration.mode !== "sendrecv" &&
                        this.configuration.mode !== "sendonly"
                    ) {
                        throw new Error(
                            "BUG: Transceivers added, but direction is not send"
                        );
                    }

                    for (const tc of tcs) {
                        tc.direction = this.configuration.mode;
                        logger.debug(
                            `RTCRtpTransceiver direction: ${tc.direction}`
                        );
                    }
                } else {
                    if (this.configuration.mode !== "recvonly") {
                        throw new Error(
                            "BUG: Transceivers missing, but direction is not recv"
                        );
                    }

                    if (hasAudio) {
                        this.pc.addTransceiver("audio", {
                            direction: this.configuration.mode,
                        });
                    }

                    if (hasVideo) {
                        this.pc.addTransceiver("video", {
                            direction: this.configuration.mode,
                        });
                    }
                }

                offerPromise = this.pc.createOffer();
            } else {
                logger.debug("[generateOffer] Method pc.getTransceivers() NOT available; using LEGACY offerToReceive{Audio,Video}");

                // DEPRECATED: LEGACY METHOD: Old WebRTC versions don't implement
                // Transceivers, and instead depend on the deprecated
                // "offerToReceiveAudio" and "offerToReceiveVideo".

                const constraints: RTCOfferOptions = {
                    offerToReceiveAudio:
                        this.configuration.mode !== "sendonly" && hasAudio,
                    offerToReceiveVideo:
                        this.configuration.mode !== "sendonly" && hasVideo,
                };

                logger.debug(
                    "RTCPeerConnection constraints: " +
                        JSON.stringify(constraints)
                );

                // @ts-ignore: Compiler is too clever and thinks this branch
                // will never execute.
                offerPromise = this.pc.createOffer(constraints);
            }

            offerPromise
                .then((offer) => {
                    logger.debug("Created SDP offer");
                    return this.pc.setLocalDescription(offer);
                })
                .then(() => {
                    const localDescription = this.pc.localDescription;

                    if (!!localDescription) {
                        logger.debug(
                            "Local description set:",
                            localDescription.sdp
                        );
                        resolve(localDescription.sdp);
                    } else {
                        reject("Local description is not defined");
                    }
                })
                .catch((error) => reject(error));
        });
    }

    /**
     * Creates an SDP answer from the local RTCPeerConnection to send to the other peer
     * Only if the negotiation was initiated by the other peer
     */
    createAnswer(): Promise<RTCSessionDescriptionInit> {
        return new Promise((resolve, reject) => {
            let offerAudio, offerVideo = true;
            if (!!this.configuration.mediaConstraints) {
                offerAudio = (typeof this.configuration.mediaConstraints.audio === 'boolean') ?
                    this.configuration.mediaConstraints.audio : true;
                offerVideo = (typeof this.configuration.mediaConstraints.video === 'boolean') ?
                    this.configuration.mediaConstraints.video : true;
            }
            const constraints: RTCOfferOptions = {
                offerToReceiveAudio: offerAudio,
                offerToReceiveVideo: offerVideo
            };
            this.pc.createAnswer(constraints).then(sdpAnswer => {
                resolve(sdpAnswer);
            }).catch(error => {
                reject(error);
            });
        });
    }

    /**
     * This peer initiated negotiation. Step 1/4 of SDP offer-answer protocol
     */
    processLocalOffer(offer: RTCSessionDescriptionInit): Promise<void> {
        return new Promise((resolve, reject) => {
            this.pc.setLocalDescription(offer)
                .then(() => {
                    const localDescription = this.pc.localDescription;
                    if (!!localDescription) {
                        logger.debug('Local description set', localDescription.sdp);
                        resolve();
                    } else {
                        reject('Local description is not defined');
                    }
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    /**
     * Other peer initiated negotiation. Step 2/4 of SDP offer-answer protocol
     */
    processRemoteOffer(sdpOffer: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const offer: RTCSessionDescriptionInit = {
                type: 'offer',
                sdp: sdpOffer
            };
            logger.debug('SDP offer received, setting remote description', offer);

            if (this.pc.signalingState === 'closed') {
                reject('RTCPeerConnection is closed when trying to set remote description');
            }
            this.setRemoteDescription(offer)
                .then(() => {
                    resolve();
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    /**
     * Other peer initiated negotiation. Step 3/4 of SDP offer-answer protocol
     */
    processLocalAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
        return new Promise((resolve, reject) => {
            logger.debug('SDP answer created, setting local description');
            if (this.pc.signalingState === 'closed') {
                reject('RTCPeerConnection is closed when trying to set local description');
            }
            this.pc.setLocalDescription(answer)
                .then(() => resolve())
                .catch(error => reject(error));
        });
    }

    /**
     * This peer initiated negotiation. Step 4/4 of SDP offer-answer protocol
     */
    processRemoteAnswer(sdpAnswer: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const answer: RTCSessionDescriptionInit = {
                type: 'answer',
                sdp: sdpAnswer
            };
            logger.debug('SDP answer received, setting remote description');

            if (this.pc.signalingState === 'closed') {
                reject('RTCPeerConnection is closed when trying to set remote description');
            }
            this.setRemoteDescription(answer)
                .then(() => resolve())
                .catch(error => reject(error));
        });
    }

    /**
     * @hidden
     */
    async setRemoteDescription(sdp: RTCSessionDescriptionInit): Promise<void> {
        return this.pc.setRemoteDescription(sdp);
    }

    /**
     * Callback function invoked when an ICE candidate is received
     */
    addIceCandidate(iceCandidate: RTCIceCandidate): Promise<void> {
        return new Promise((resolve, reject) => {
            logger.debug('Remote ICE candidate received', iceCandidate);
            this.remoteCandidatesQueue.push(iceCandidate);
            switch (this.pc.signalingState) {
                case 'closed':
                    reject(new Error('PeerConnection object is closed'));
                    break;
                case 'stable':
                    if (!!this.pc.remoteDescription) {
                        this.pc.addIceCandidate(iceCandidate).then(() => resolve()).catch(error => reject(error));
                    } else {
                        this.iceCandidateList.push(iceCandidate);
                        resolve();
                    }
                    break;
                default:
                    this.iceCandidateList.push(iceCandidate);
                    resolve();
            }
        });
    }

    addIceConnectionStateChangeListener(otherId: string) {
        this.pc.addEventListener('iceconnectionstatechange', () => {
            const iceConnectionState: RTCIceConnectionState = this.pc.iceConnectionState;
            switch (iceConnectionState) {
                case 'disconnected':
                    // Possible network disconnection
                    const msg1 = 'IceConnectionState of RTCPeerConnection ' + this.id + ' (' + otherId + ') change to "disconnected". Possible network disconnection';
                    logger.warn(msg1);
                    this.configuration.onexception(ExceptionEventName.ICE_CONNECTION_DISCONNECTED, msg1);
                    break;
                case 'failed':
                    const msg2 = 'IceConnectionState of RTCPeerConnection ' + this.id + ' (' + otherId + ') to "failed"';
                    logger.error(msg2);
                    this.configuration.onexception(ExceptionEventName.ICE_CONNECTION_FAILED, msg2);
                    break;
                case 'closed':
                    logger.log('IceConnectionState of RTCPeerConnection ' + this.configuration.id + ' (' + otherId + ') change to "closed"');
                    break;
                case 'new':
                    logger.log('IceConnectionState of RTCPeerConnection ' + this.configuration.id + ' (' + otherId + ') change to "new"');
                    break;
                case 'checking':
                    logger.log('IceConnectionState of RTCPeerConnection ' + this.configuration.id + ' (' + otherId + ') change to "checking"');
                    break;
                case 'connected':
                    logger.log('IceConnectionState of RTCPeerConnection ' + this.configuration.id + ' (' + otherId + ') change to "connected"');
                    break;
                case 'completed':
                    logger.log('IceConnectionState of RTCPeerConnection ' + this.configuration.id + ' (' + otherId + ') change to "completed"');
                    break;
            }
        });
    }

    /**
     * @hidden
     */
    generateUniqueId(): string {
        return uuidv4();
    }

}


export class WebRtcPeerRecvonly extends WebRtcPeer {
    constructor(configuration: WebRtcPeerConfiguration) {
        configuration.mode = 'recvonly';
        super(configuration);
    }
}

export class WebRtcPeerSendonly extends WebRtcPeer {
    constructor(configuration: WebRtcPeerConfiguration) {
        configuration.mode = 'sendonly';
        super(configuration);
    }
}

export class WebRtcPeerSendrecv extends WebRtcPeer {
    constructor(configuration: WebRtcPeerConfiguration) {
        configuration.mode = 'sendrecv';
        super(configuration);
    }
}
