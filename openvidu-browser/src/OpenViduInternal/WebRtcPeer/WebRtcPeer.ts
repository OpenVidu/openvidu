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
import uuid = require('uuid');
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
    onicecandidate: (event) => void;
    iceServers?: RTCIceServer[];
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

        this.pc.onicecandidate = event => {
            if (!!event.candidate) {
                const candidate: RTCIceCandidate = event.candidate;
                if (candidate) {
                    this.localCandidatesQueue.push(<RTCIceCandidate>{ candidate: candidate.candidate });
                    this.candidategatheringdone = false;
                    this.configuration.onicecandidate(event.candidate);
                } else if (!this.candidategatheringdone) {
                    this.candidategatheringdone = true;
                }
            }
        };

        this.pc.onsignalingstatechange = () => {
            if (this.pc.signalingState === 'stable') {
                while (this.iceCandidateList.length > 0) {
                    let candidate = this.iceCandidateList.shift();
                    this.pc.addIceCandidate(<RTCIceCandidate>candidate);
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
    start(): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.pc.signalingState === 'closed') {
                reject('The peer connection object is in "closed" state. This is most likely due to an invocation of the dispose method before accepting in the dialogue');
            }
            if (!!this.configuration.mediaStream) {
                for (const track of this.configuration.mediaStream.getTracks()) {
                    this.pc.addTrack(track, this.configuration.mediaStream);
                }
                resolve();
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
     * Function that creates an offer, sets it as local description and returns the offer param
     * to send to OpenVidu Server (will be the remote description of other peer)
     */
    generateOffer(): Promise<string> {
        return new Promise((resolve, reject) => {
            const useAudio = this.configuration.mediaConstraints.audio;
            const useVideo = this.configuration.mediaConstraints.video;

            let offerPromise: Promise<RTCSessionDescriptionInit>;

            // TODO: Delete this conditional when all supported browsers are
            // modern enough to implement the getTransceivers() method.
            if ("getTransceivers" in this.pc) {
                logger.debug("[generateOffer] Method pc.getTransceivers() is available; using it");

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

                    if (useAudio) {
                        this.pc.addTransceiver("audio", {
                            direction: this.configuration.mode,
                        });
                    }

                    if (useVideo) {
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
                        this.configuration.mode !== "sendonly" && useAudio,
                    offerToReceiveVideo:
                        this.configuration.mode !== "sendonly" && useVideo,
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
     * Function invoked when a SDP answer is received. Final step in SDP negotiation, the peer
     * just needs to set the answer as its remote description
     */
    processAnswer(sdpAnswer: string, needsTimeoutOnProcessAnswer: boolean): Promise<string> {
        return new Promise((resolve, reject) => {
            const answer: RTCSessionDescriptionInit = {
                type: 'answer',
                sdp: sdpAnswer
            };
            logger.debug('SDP answer received, setting remote description');

            if (this.pc.signalingState === 'closed') {
                reject('RTCPeerConnection is closed');
            }

            this.setRemoteDescription(answer, needsTimeoutOnProcessAnswer, resolve, reject);

        });
    }

    /**
     * @hidden
     */
    setRemoteDescription(answer: RTCSessionDescriptionInit, needsTimeoutOnProcessAnswer: boolean, resolve: (value?: string | PromiseLike<string> | undefined) => void, reject: (reason?: any) => void) {
        if (platform.isIonicIos()) {
            // Ionic iOS platform
            if (needsTimeoutOnProcessAnswer) {
                // 400 ms have not elapsed yet since first remote stream triggered Stream#initWebRtcPeerReceive
                setTimeout(() => {
                    logger.info('setRemoteDescription run after timeout for Ionic iOS device');
                    this.pc.setRemoteDescription(new RTCSessionDescription(answer)).then(() => resolve()).catch(error => reject(error));
                }, 250);
            } else {
                // 400 ms have elapsed
                this.pc.setRemoteDescription(new RTCSessionDescription(answer)).then(() => resolve()).catch(error => reject(error));
            }
        } else {
            // Rest of platforms
            this.pc.setRemoteDescription(answer).then(() => resolve()).catch(error => reject(error));
        }
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
        this.pc.oniceconnectionstatechange = () => {
            const iceConnectionState: RTCIceConnectionState = this.pc.iceConnectionState;
            switch (iceConnectionState) {
                case 'disconnected':
                    // Possible network disconnection
                    logger.warn('IceConnectionState of RTCPeerConnection ' + this.configuration.id + ' (' + otherId + ') change to "disconnected". Possible network disconnection');
                    break;
                case 'failed':
                    logger.error('IceConnectionState of RTCPeerConnection ' + this.configuration.id + ' (' + otherId + ') to "failed"');
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
        }
    }

    /**
     * @hidden
     */
    generateUniqueId(): string {
        return uuid.v4();
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
