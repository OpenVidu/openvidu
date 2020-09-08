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

import platform = require('platform');
import { OpenViduLogger } from '../Logger/OpenViduLogger';
import { WebRtcPeerConfiguration } from './WebRtcPeer';
import { WebRtcPeer } from './WebRtcPeer';
/**
 * @hidden
 */
const logger: OpenViduLogger = OpenViduLogger.getInstance();

export class WebRtcPeerLEGACY extends WebRtcPeer {

    constructor(protected configuration: WebRtcPeerConfiguration) {
        super(configuration);
    }

    /**
     * Function that creates an offer, sets it as local description and returns the offer param
     * to send to OpenVidu Server (will be the remote description of other peer)
     */
    generateOffer(): Promise<string> {
        return new Promise((resolve, reject) => {
            let offerAudio, offerVideo = true;

            // Constraints must have both blocks
            if (!!this.configuration.mediaConstraints) {
                offerAudio = (typeof this.configuration.mediaConstraints.audio === 'boolean') ?
                    this.configuration.mediaConstraints.audio : true;
                offerVideo = (typeof this.configuration.mediaConstraints.video === 'boolean') ?
                    this.configuration.mediaConstraints.video : true;
            }

            const constraints: RTCOfferOptions = {
                offerToReceiveAudio: (this.configuration.mode !== 'sendonly' && offerAudio),
                offerToReceiveVideo: (this.configuration.mode !== 'sendonly' && offerVideo)
            };

            logger.debug('RTCPeerConnection constraints: ' + JSON.stringify(constraints));

            if (platform.name === 'Safari' && platform.ua!!.indexOf('Safari') !== -1) {
                // Safari (excluding Ionic), at least on iOS just seems to support unified plan, whereas in other browsers is not yet ready and considered experimental
                if (offerAudio) {
                    this.pc.addTransceiver('audio', {
                        direction: this.configuration.mode,
                    });
                }

                if (offerVideo) {
                    this.pc.addTransceiver('video', {
                        direction: this.configuration.mode,
                    });
                }

                this.pc
                    .createOffer()
                    .then(offer => {
                        logger.debug('Created SDP offer');
                        return this.pc.setLocalDescription(offer);
                    })
                    .then(() => {
                        const localDescription = this.pc.localDescription;

                        if (!!localDescription) {
                            logger.debug('Local description set', localDescription.sdp);
                            resolve(localDescription.sdp);
                        } else {
                            reject('Local description is not defined');
                        }
                    })
                    .catch(error => reject(error));

            } else {

                // Rest of platforms
                this.pc.createOffer(constraints).then(offer => {
                    logger.debug('Created SDP offer');
                    return this.pc.setLocalDescription(offer);
                })
                    .then(() => {
                        const localDescription = this.pc.localDescription;
                        if (!!localDescription) {
                            logger.debug('Local description set', localDescription.sdp);
                            resolve(localDescription.sdp);
                        } else {
                            reject('Local description is not defined');
                        }
                    })
                    .catch(error => reject(error));
            }
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

            this.setRemoteDescriptionLEGACY(answer, needsTimeoutOnProcessAnswer, resolve, reject);

        });
    }

    /**
     * @hidden
     */
    private setRemoteDescriptionLEGACY(answer: RTCSessionDescriptionInit, needsTimeoutOnProcessAnswer: boolean, resolve: (value?: string | PromiseLike<string> | undefined) => void, reject: (reason?: any) => void) {
        if (platform['isIonicIos']) {
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

}


export class WebRtcPeerRecvonlyLEGACY extends WebRtcPeerLEGACY {
    constructor(configuration: WebRtcPeerConfiguration) {
        configuration.mode = 'recvonly';
        super(configuration);
    }
}

export class WebRtcPeerSendonlyLEGACY extends WebRtcPeerLEGACY {
    constructor(configuration: WebRtcPeerConfiguration) {
        configuration.mode = 'sendonly';
        super(configuration);
    }
}

export class WebRtcPeerSendrecvLEGACY extends WebRtcPeerLEGACY {
    constructor(configuration: WebRtcPeerConfiguration) {
        configuration.mode = 'sendrecv';
        super(configuration);
    }
}