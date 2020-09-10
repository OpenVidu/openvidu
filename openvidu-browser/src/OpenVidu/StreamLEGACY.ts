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

import { Stream } from './Stream';
import { Subscriber } from './Subscriber';
import { WebRtcPeerLEGACY, WebRtcPeerSendrecvLEGACY, WebRtcPeerSendonlyLEGACY, WebRtcPeerRecvonlyLEGACY } from '../OpenViduInternal/WebRtcPeer/WebRtcPeerLEGACY';
import { OpenViduError, OpenViduErrorName } from '../OpenViduInternal/Enums/OpenViduError';

/**
 * @hidden
 */
import { OpenViduLogger } from '../OpenViduInternal/Logger/OpenViduLogger';
/**
 * @hidden
 */
const logger: OpenViduLogger = OpenViduLogger.getInstance();



/**
 * Represents each one of the media streams available in OpenVidu Server for certain session.
 * Each [[Publisher]] and [[Subscriber]] has an attribute of type Stream, as they give access
 * to one of them (sending and receiving it, respectively)
 */
export class StreamLEGACY extends Stream {

    /**
     * @hidden
     */
    initWebRtcPeerSend(reconnect: boolean): Promise<any> {

        if (!!this.session.openvidu.openviduServerVersion) {
            // 2.16.0
            return super.initWebRtcPeerSend(reconnect);

        } else {
            // 2.15.0
            return new Promise((resolve, reject) => {

                if (!reconnect) {
                    this.initHarkEvents(); // Init hark events for the local stream
                }

                const userMediaConstraints = {
                    audio: this.isSendAudio(),
                    video: this.isSendVideo()
                };

                const options = {
                    mediaStream: this.mediaStream,
                    mediaConstraints: userMediaConstraints,
                    onicecandidate: this.connection.sendIceCandidate.bind(this.connection),
                    iceServers: this.getIceServersConf(),
                    simulcast: false
                };

                const successCallback = (sdpOfferParam) => {
                    logger.debug('Sending SDP offer to publish as '
                        + this.streamId, sdpOfferParam);

                    const method = reconnect ? 'reconnectStream' : 'publishVideo';
                    let params;
                    if (reconnect) {
                        params = {
                            stream: this.streamId
                        }
                    } else {
                        let typeOfVideo = '';
                        if (this.isSendVideo()) {
                            typeOfVideo = (typeof MediaStreamTrack !== 'undefined' && this.outboundStreamOpts.publisherProperties.videoSource instanceof MediaStreamTrack) ? 'CUSTOM' : (this.isSendScreen() ? 'SCREEN' : 'CAMERA');
                        }
                        params = {
                            doLoopback: this.displayMyRemote() || false,
                            hasAudio: this.isSendAudio(),
                            hasVideo: this.isSendVideo(),
                            audioActive: this.audioActive,
                            videoActive: this.videoActive,
                            typeOfVideo,
                            frameRate: !!this.frameRate ? this.frameRate : -1,
                            videoDimensions: JSON.stringify(this.videoDimensions),
                            filter: this.outboundStreamOpts.publisherProperties.filter
                        }
                    }
                    params['sdpOffer'] = sdpOfferParam;

                    this.session.openvidu.sendRequest(method, params, (error, response) => {
                        if (error) {
                            if (error.code === 401) {
                                reject(new OpenViduError(OpenViduErrorName.OPENVIDU_PERMISSION_DENIED, "You don't have permissions to publish"));
                            } else {
                                reject('Error on publishVideo: ' + JSON.stringify(error));
                            }
                        } else {
                            (<WebRtcPeerLEGACY>this.webRtcPeer).processAnswer(response.sdpAnswer, false)
                                .then(() => {
                                    this.streamId = response.id;
                                    this.creationTime = response.createdAt;
                                    this.isLocalStreamPublished = true;
                                    this.publishedOnce = true;
                                    if (this.displayMyRemote()) {
                                        this.localMediaStreamWhenSubscribedToRemote = this.mediaStream;
                                        this.remotePeerSuccessfullyEstablished();
                                    }
                                    if (reconnect) {
                                        this.ee.emitEvent('stream-reconnected-by-publisher', []);
                                    } else {
                                        this.ee.emitEvent('stream-created-by-publisher', []);
                                    }
                                    this.initWebRtcStats();
                                    logger.info("'Publisher' (" + this.streamId + ") successfully " + (reconnect ? "reconnected" : "published") + " to session");
                                    resolve();
                                })
                                .catch(error => {
                                    reject(error);
                                });
                        }
                    });
                };

                if (reconnect) {
                    this.disposeWebRtcPeer();
                }
                if (this.displayMyRemote()) {
                    this.webRtcPeer = new WebRtcPeerSendrecvLEGACY(options);
                } else {
                    this.webRtcPeer = new WebRtcPeerSendonlyLEGACY(options);
                }
                this.webRtcPeer.addIceConnectionStateChangeListener('publisher of ' + this.connection.connectionId);
                (<WebRtcPeerLEGACY>this.webRtcPeer).generateOffer().then(sdpOffer => {
                    successCallback(sdpOffer);
                }).catch(error => {
                    reject(new Error('(publish) SDP offer error: ' + JSON.stringify(error)));
                });
            });

        }
    }

    /**
     * @hidden
     */
    initWebRtcPeerReceive(reconnect: boolean): Promise<any> {

        if (!!this.session.openvidu.openviduServerVersion) {
            // 2.16.0
            return super.initWebRtcPeerReceive(reconnect);

        } else {
            // 2.15.0
            return new Promise((resolve, reject) => {

                const offerConstraints = {
                    audio: this.inboundStreamOpts.hasAudio,
                    video: this.inboundStreamOpts.hasVideo
                };
                logger.debug("'Session.subscribe(Stream)' called. Constraints of generate SDP offer",
                    offerConstraints);
                const options = {
                    onicecandidate: this.connection.sendIceCandidate.bind(this.connection),
                    mediaConstraints: offerConstraints,
                    iceServers: this.getIceServersConf(),
                    simulcast: false
                };

                const successCallback = (sdpOfferParam) => {
                    logger.debug('Sending SDP offer to subscribe to '
                        + this.streamId, sdpOfferParam);

                    const method = reconnect ? 'reconnectStream' : 'receiveVideoFrom';
                    const params = { sdpOffer: sdpOfferParam };
                    params[reconnect ? 'stream' : 'sender'] = this.streamId;

                    this.session.openvidu.sendRequest(method, params, (error, response) => {
                        if (error) {
                            reject(new Error('Error on recvVideoFrom: ' + JSON.stringify(error)));
                        } else {
                            // Ios Ionic. Limitation: some bug in iosrtc cordova plugin makes it necessary
                            // to add a timeout before calling PeerConnection#setRemoteDescription during
                            // some time (400 ms) from the moment first subscriber stream is received
                            if (this.session.isFirstIonicIosSubscriber) {
                                this.session.isFirstIonicIosSubscriber = false;
                                setTimeout(() => {
                                    // After 400 ms Ionic iOS subscribers won't need to run
                                    // PeerConnection#setRemoteDescription after 250 ms timeout anymore
                                    this.session.countDownForIonicIosSubscribersActive = false;
                                }, 400);
                            }
                            const needsTimeoutOnProcessAnswer = this.session.countDownForIonicIosSubscribersActive;
                            (<WebRtcPeerLEGACY>this.webRtcPeer).processAnswer(response.sdpAnswer, needsTimeoutOnProcessAnswer).then(() => {
                                logger.info("'Subscriber' (" + this.streamId + ") successfully " + (reconnect ? "reconnected" : "subscribed"));
                                this.remotePeerSuccessfullyEstablished();
                                this.initWebRtcStats();
                                resolve();
                            }).catch(error => {
                                reject(error);
                            });
                        }
                    });
                };

                this.webRtcPeer = new WebRtcPeerRecvonlyLEGACY(options);
                this.webRtcPeer.addIceConnectionStateChangeListener(this.streamId);
                (<WebRtcPeerLEGACY>this.webRtcPeer).generateOffer()
                    .then(sdpOffer => {
                        successCallback(sdpOffer);
                    })
                    .catch(error => {
                        reject(new Error('(subscribe) SDP offer error: ' + JSON.stringify(error)));
                    });
            });

        }
    }

    /**
     * @hidden
     */
    remotePeerSuccessfullyEstablished(): void {

        if (!!this.session.openvidu.openviduServerVersion) {
            // 2.16.0
            super.remotePeerSuccessfullyEstablished();

        } else {
            // 2.15.0
            this.mediaStream = new MediaStream();
            let receiver: RTCRtpReceiver;
            for (receiver of this.webRtcPeer.pc.getReceivers()) {
                if (!!receiver.track) {
                    this.mediaStream.addTrack(receiver.track);
                }
            }
            logger.debug('Peer remote stream', this.mediaStream);

            if (!!this.mediaStream) {

                if (this.streamManager instanceof Subscriber) {
                    // Apply SubscriberProperties.subscribeToAudio and SubscriberProperties.subscribeToVideo
                    if (!!this.mediaStream.getAudioTracks()[0]) {
                        const enabled = !!((<Subscriber>this.streamManager).properties.subscribeToAudio);
                        this.mediaStream.getAudioTracks()[0].enabled = enabled;
                    }
                    if (!!this.mediaStream.getVideoTracks()[0]) {
                        const enabled = !!((<Subscriber>this.streamManager).properties.subscribeToVideo);
                        this.mediaStream.getVideoTracks()[0].enabled = enabled;
                    }
                }

                this.updateMediaStreamInVideos();
                this.initHarkEvents(); // Init hark events for the remote stream
            }

        }
    }

}