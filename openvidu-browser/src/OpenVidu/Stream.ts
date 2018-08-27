/*
 * (C) Copyright 2017-2018 OpenVidu (https://openvidu.io/)
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

import { Connection } from './Connection';
import { Event } from '../OpenViduInternal/Events/Event';
import { Filter } from './Filter';
import { Session } from './Session';
import { StreamManager } from './StreamManager';
import { EventDispatcher } from '../OpenViduInternal/Interfaces/Public/EventDispatcher';
import { InboundStreamOptions } from '../OpenViduInternal/Interfaces/Private/InboundStreamOptions';
import { OutboundStreamOptions } from '../OpenViduInternal/Interfaces/Private/OutboundStreamOptions';
import { WebRtcPeer, WebRtcPeerSendonly, WebRtcPeerRecvonly, WebRtcPeerSendrecv } from '../OpenViduInternal/WebRtcPeer/WebRtcPeer';
import { WebRtcStats } from '../OpenViduInternal/WebRtcStats/WebRtcStats';
import { PublisherSpeakingEvent } from '../OpenViduInternal/Events/PublisherSpeakingEvent';

import EventEmitter = require('wolfy87-eventemitter');
import hark = require('hark');
import { OpenViduError, OpenViduErrorName } from '../OpenViduInternal/Enums/OpenViduError';


/**
 * Represents each one of the media streams available in OpenVidu Server for certain session.
 * Each [[Publisher]] and [[Subscriber]] has an attribute of type Stream, as they give access
 * to one of them (sending and receiving it, respectively)
 */
export class Stream implements EventDispatcher {

    /**
     * The Connection object that is publishing the stream
     */
    connection: Connection;

    /**
     * Frame rate of the video in frames per second. This property is only defined if the [[Publisher]] of
     * the stream was initialized passing a _frameRate_ property on [[OpenVidu.initPublisher]] method
     */
    frameRate?: number;

    /**
     * Whether the stream has a video track or not
     */
    hasVideo: boolean;

    /**
     * Whether the stream has an audio track or not
     */
    hasAudio: boolean;

    /**
     * Whether the stream has the video track muted or unmuted. If [[hasVideo]] is false, this property is undefined.
     *
     * This property may change if the Publisher publishing the stream calls [[Publisher.publishVideo]]. Whenever this happens a [[StreamPropertyChangedEvent]] will be dispatched
     * by the Session object as well as by the affected Subscriber/Publisher object
     */
    videoActive: boolean;

    /**
     * Whether the stream has the audio track muted or unmuted. If [[hasAudio]] is false, this property is undefined
     *
     * This property may change if the Publisher publishing the stream calls [[Publisher.publishAudio]]. Whenever this happens a [[StreamPropertyChangedEvent]] will be dispatched
     * by the Session object as well as by the affected Subscriber/Publisher object
     */
    audioActive: boolean;

    /**
     * Unique identifier of the stream
     */
    streamId: string;

    /**
     * `"CAMERA"`, `"SCREEN"` or `"CUSTOM"` (the latter when [[PublisherProperties.videoSource]] is a MediaStreamTrack when calling [[OpenVidu.initPublisher]]).
     * If [[hasVideo]] is false, this property is undefined
     */
    typeOfVideo?: string;

    /**
     * StreamManager object ([[Publisher]] or [[Subscriber]]) in charge of displaying this stream in the DOM
     */
    streamManager: StreamManager;

    /**
     * Width and height in pixels of the encoded video stream. If [[hasVideo]] is false, this property is undefined
     *
     * This property may change if the Publisher that is publishing:
     * - If it is a mobile device, whenever the user rotates the device.
     * - If it is screen-sharing, whenever the user changes the size of the captured window.
     *
     * Whenever this happens a [[StreamPropertyChangedEvent]] will be dispatched by the Session object as well as by the affected Subscriber/Publisher object
     */
    videoDimensions: { width: number, height: number };

    /**
     * **WARNING**: experimental option. This interface may change in the near future
     *
     * Filter applied to the Stream. You can apply filters by calling [[Session.applyFilter]], execute methods of the applied filter with
     * [[Session.execFilterMethod]] and remove it with [[Session.removeFilter]]. Be aware that the client calling this methods must have the
     * necessary permissions: the token owned by the client must have been initialized with the appropriated `allowedFilters` array.
     */
    filter: Filter;

    /**
     * @hidden
     */
    ee = new EventEmitter();

    private webRtcPeer: WebRtcPeer;
    private mediaStream: MediaStream;
    private webRtcStats: WebRtcStats;

    private isSubscribeToRemote = false;

    /**
     * @hidden
     */
    isLocalStreamReadyToPublish = false;
    /**
     * @hidden
     */
    isLocalStreamPublished = false;
    /**
     * @hidden
     */
    publishedOnce = false;
    /**
     * @hidden
     */
    session: Session;
    /**
     * @hidden
     */
    inboundStreamOpts: InboundStreamOptions;
    /**
     * @hidden
     */
    outboundStreamOpts: OutboundStreamOptions;
    /**
     * @hidden
     */
    speechEvent: any;


    /**
     * @hidden
     */
    constructor(session: Session, options: InboundStreamOptions | OutboundStreamOptions | {}) {

        this.session = session;

        if (options.hasOwnProperty('id')) {
            // InboundStreamOptions: stream belongs to a Subscriber
            this.inboundStreamOpts = <InboundStreamOptions>options;
            this.streamId = this.inboundStreamOpts.id;
            this.hasAudio = this.inboundStreamOpts.hasAudio;
            this.hasVideo = this.inboundStreamOpts.hasVideo;
            if (this.hasAudio) {
                this.audioActive = this.inboundStreamOpts.audioActive;
            }
            if (this.hasVideo) {
                this.videoActive = this.inboundStreamOpts.videoActive;
                this.typeOfVideo = (!this.inboundStreamOpts.typeOfVideo) ? undefined : this.inboundStreamOpts.typeOfVideo;
                this.frameRate = (this.inboundStreamOpts.frameRate === -1) ? undefined : this.inboundStreamOpts.frameRate;
                this.videoDimensions = this.inboundStreamOpts.videoDimensions;
            }
            if (!!this.inboundStreamOpts.filter && (Object.keys(this.inboundStreamOpts.filter).length > 0)) {
                if (!!this.inboundStreamOpts.filter.lastExecMethod && Object.keys(this.inboundStreamOpts.filter.lastExecMethod).length === 0) {
                    delete this.inboundStreamOpts.filter.lastExecMethod;
                }
                this.filter = this.inboundStreamOpts.filter;
            }
        } else {
            // OutboundStreamOptions: stream belongs to a Publisher
            this.outboundStreamOpts = <OutboundStreamOptions>options;

            this.hasAudio = this.isSendAudio();
            this.hasVideo = this.isSendVideo();

            if (this.hasAudio) {
                this.audioActive = !!this.outboundStreamOpts.publisherProperties.publishAudio;
            }
            if (this.hasVideo) {
                this.videoActive = !!this.outboundStreamOpts.publisherProperties.publishVideo;
                this.frameRate = this.outboundStreamOpts.publisherProperties.frameRate;
                if (this.outboundStreamOpts.publisherProperties.videoSource instanceof MediaStreamTrack) {
                    this.typeOfVideo = 'CUSTOM';
                } else {
                    this.typeOfVideo = this.isSendScreen() ? 'SCREEN' : 'CAMERA';
                }
            }
            if (!!this.outboundStreamOpts.publisherProperties.filter) {
                this.filter = this.outboundStreamOpts.publisherProperties.filter;
            }
        }

        this.ee.on('mediastream-updated', () => {
            this.streamManager.updateMediaStream(this.mediaStream);
            console.debug('Video srcObject [' + this.mediaStream + '] updated in stream [' + this.streamId + ']');
        });
    }


    /**
     * See [[EventDispatcher.on]]
     */
    on(type: string, handler: (event: Event) => void): EventDispatcher {
        this.ee.on(type, event => {
            if (event) {
                console.info("Event '" + type + "' triggered by stream '" + this.streamId + "'", event);
            } else {
                console.info("Event '" + type + "' triggered by stream '" + this.streamId + "'");
            }
            handler(event);
        });
        return this;
    }


    /**
     * See [[EventDispatcher.once]]
     */
    once(type: string, handler: (event: Event) => void): EventDispatcher {
        this.ee.once(type, event => {
            if (event) {
                console.info("Event '" + type + "' triggered once by stream '" + this.streamId + "'", event);
            } else {
                console.info("Event '" + type + "' triggered once by stream '" + this.streamId + "'");
            }
            handler(event);
        });
        return this;
    }


    /**
     * See [[EventDispatcher.off]]
     */
    off(type: string, handler?: (event: Event) => void): EventDispatcher {
        if (!handler) {
            this.ee.removeAllListeners(type);
        } else {
            this.ee.off(type, handler);
        }
        return this;
    }


    /* Hidden methods */

    /**
     * @hidden
     */
    getMediaStream(): MediaStream {
        return this.mediaStream;
    }

    /**
     * @hidden
     */
    setMediaStream(mediaStream: MediaStream): void {
        this.mediaStream = mediaStream;
    }

    /**
     * @hidden
     */
    updateMediaStreamInVideos() {
        this.ee.emitEvent('mediastream-updated');
    }

    /**
     * @hidden
     */
    getWebRtcPeer(): WebRtcPeer {
        return this.webRtcPeer;
    }

    /**
     * @hidden
     */
    getRTCPeerConnection(): RTCPeerConnection {
        return this.webRtcPeer.pc;
    }

    /**
     * @hidden
     */
    subscribeToMyRemote(value: boolean): void {
        this.isSubscribeToRemote = value;
    }

    /**
     * @hidden
     */
    setOutboundStreamOptions(outboundStreamOpts: OutboundStreamOptions): void {
        this.outboundStreamOpts = outboundStreamOpts;
    }

    /**
     * @hidden
     */
    subscribe(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.initWebRtcPeerReceive()
                .then(() => {
                    resolve();
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    /**
     * @hidden
     */
    publish(): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.isLocalStreamReadyToPublish) {
                this.initWebRtcPeerSend()
                    .then(() => {
                        resolve();
                    })
                    .catch(error => {
                        reject(error);
                    });
            } else {
                this.ee.once('stream-ready-to-publish', () => {
                    this.publish()
                        .then(() => {
                            resolve();
                        })
                        .catch(error => {
                            reject(error);
                        });
                });
            }
        });
    }

    /**
     * @hidden
     */
    disposeWebRtcPeer(): void {
        if (this.webRtcPeer) {
            this.webRtcPeer.dispose();
        }
        if (this.speechEvent) {
            this.speechEvent.stop();
        }

        this.stopWebRtcStats();

        console.info((!!this.outboundStreamOpts ? 'Outbound ' : 'Inbound ') + "WebRTCPeer from 'Stream' with id [" + this.streamId + '] is now closed');
    }

    /**
     * @hidden
     */
    disposeMediaStream(): void {
        if (this.mediaStream) {
            this.mediaStream.getAudioTracks().forEach((track) => {
                track.stop();
            });
            this.mediaStream.getVideoTracks().forEach((track) => {
                track.stop();
            });
            delete this.mediaStream;
        }
        console.info((!!this.outboundStreamOpts ? 'Local ' : 'Remote ') + "MediaStream from 'Stream' with id [" + this.streamId + '] is now disposed');
    }

    /**
     * @hidden
     */
    displayMyRemote(): boolean {
        return this.isSubscribeToRemote;
    }

    /**
     * @hidden
     */
    isSendAudio(): boolean {
        return (!!this.outboundStreamOpts &&
            this.outboundStreamOpts.publisherProperties.audioSource !== null &&
            this.outboundStreamOpts.publisherProperties.audioSource !== false);
    }

    /**
     * @hidden
     */
    isSendVideo(): boolean {
        return (!!this.outboundStreamOpts &&
            this.outboundStreamOpts.publisherProperties.videoSource !== null &&
            this.outboundStreamOpts.publisherProperties.videoSource !== false);
    }

    /**
     * @hidden
     */
    isSendScreen(): boolean {
        return (!!this.outboundStreamOpts &&
            this.outboundStreamOpts.publisherProperties.videoSource === 'screen');
    }

    /**
     * @hidden
     */
    setSpeechEventIfNotExists(): void {
        if (!this.speechEvent) {
            const harkOptions = this.session.openvidu.advancedConfiguration.publisherSpeakingEventsOptions || {};
            harkOptions.interval = (typeof harkOptions.interval === 'number') ? harkOptions.interval : 50;
            harkOptions.threshold = (typeof harkOptions.threshold === 'number') ? harkOptions.threshold : -50;

            this.speechEvent = hark(this.mediaStream, harkOptions);
        }
    }

    /**
     * @hidden
     */
    enableSpeakingEvents(): void {
        this.setSpeechEventIfNotExists();
        this.speechEvent.on('speaking', () => {
            this.session.emitEvent('publisherStartSpeaking', [new PublisherSpeakingEvent(this.session, 'publisherStartSpeaking', this.connection, this.streamId)]);
        });
        this.speechEvent.on('stopped_speaking', () => {
            this.session.emitEvent('publisherStopSpeaking', [new PublisherSpeakingEvent(this.session, 'publisherStopSpeaking', this.connection, this.streamId)]);
        });
    }

    /**
     * @hidden
     */
    enableOnceSpeakingEvents(): void {
        this.setSpeechEventIfNotExists();
        this.speechEvent.on('speaking', () => {
            this.session.emitEvent('publisherStartSpeaking', [new PublisherSpeakingEvent(this.session, 'publisherStartSpeaking', this.connection, this.streamId)]);
            this.disableSpeakingEvents();
        });
        this.speechEvent.on('stopped_speaking', () => {
            this.session.emitEvent('publisherStopSpeaking', [new PublisherSpeakingEvent(this.session, 'publisherStopSpeaking', this.connection, this.streamId)]);
            this.disableSpeakingEvents();
        });
    }

    /**
     * @hidden
     */
    disableSpeakingEvents(): void {
        this.speechEvent.stop();
        this.speechEvent = undefined;
    }

    /**
     * @hidden
     */
    isLocal(): boolean {
        // inbound options undefined and outbound options defined
        return (!this.inboundStreamOpts && !!this.outboundStreamOpts);
    }

    /**
     * @hidden
     */
    getSelectedIceCandidate(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.webRtcStats.getSelectedIceCandidateInfo()
                .then(report => resolve(report))
                .catch(error => reject(error));
        });
    }

    /**
     * @hidden
     */
    getRemoteIceCandidateList(): RTCIceCandidate[] {
        return this.webRtcPeer.remoteCandidatesQueue;
    }

    /**
     * @hidden
     */
    getLocalIceCandidateList(): RTCIceCandidate[] {
        return this.webRtcPeer.localCandidatesQueue;
    }

    /* Private methods */

    private initWebRtcPeerSend(): Promise<any> {
        return new Promise((resolve, reject) => {

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
                console.debug('Sending SDP offer to publish as '
                    + this.streamId, sdpOfferParam);

                let typeOfVideo = '';
                if (this.isSendVideo()) {
                    typeOfVideo = this.outboundStreamOpts.publisherProperties.videoSource instanceof MediaStreamTrack ? 'CUSTOM' : (this.isSendScreen() ? 'SCREEN' : 'CAMERA');
                }

                this.session.openvidu.sendRequest('publishVideo', {
                    sdpOffer: sdpOfferParam,
                    doLoopback: this.displayMyRemote() || false,
                    hasAudio: this.isSendAudio(),
                    hasVideo: this.isSendVideo(),
                    audioActive: this.audioActive,
                    videoActive: this.videoActive,
                    typeOfVideo,
                    frameRate: !!this.frameRate ? this.frameRate : -1,
                    videoDimensions: JSON.stringify(this.videoDimensions),
                    filter: this.outboundStreamOpts.publisherProperties.filter
                }, (error, response) => {
                    if (error) {
                        if (error.code === 401) {
                            reject(new OpenViduError(OpenViduErrorName.OPENVIDU_PERMISSION_DENIED, "You don't have permissions to publish"));
                        } else {
                            reject('Error on publishVideo: ' + JSON.stringify(error));
                        }
                    } else {
                        this.webRtcPeer.processAnswer(response.sdpAnswer)
                            .then(() => {
                                this.streamId = response.id;
                                this.isLocalStreamPublished = true;
                                this.publishedOnce = true;
                                if (this.displayMyRemote()) {
                                    this.remotePeerSuccessfullyEstablished();
                                }
                                this.ee.emitEvent('stream-created-by-publisher');
                                this.initWebRtcStats();
                                resolve();
                            })
                            .catch(error => {
                                reject(error);
                            });
                        console.info("'Publisher' successfully published to session");
                    }
                });
            };

            if (this.displayMyRemote()) {
                this.webRtcPeer = new WebRtcPeerSendrecv(options);
            } else {
                this.webRtcPeer = new WebRtcPeerSendonly(options);
            }
            this.webRtcPeer.generateOffer().then(offer => {
                successCallback(offer);
            }).catch(error => {
                reject(new Error('(publish) SDP offer error: ' + JSON.stringify(error)));
            });
        });
    }

    private initWebRtcPeerReceive(): Promise<any> {
        return new Promise((resolve, reject) => {

            const offerConstraints = {
                audio: this.inboundStreamOpts.hasAudio,
                video: this.inboundStreamOpts.hasVideo
            };
            console.debug("'Session.subscribe(Stream)' called. Constraints of generate SDP offer",
                offerConstraints);
            const options = {
                onicecandidate: this.connection.sendIceCandidate.bind(this.connection),
                mediaConstraints: offerConstraints,
                iceServers: this.getIceServersConf(),
                simulcast: false
            };

            const successCallback = (sdpOfferParam) => {
                console.debug('Sending SDP offer to subscribe to '
                    + this.streamId, sdpOfferParam);
                this.session.openvidu.sendRequest('receiveVideoFrom', {
                    sender: this.streamId,
                    sdpOffer: sdpOfferParam
                }, (error, response) => {
                    if (error) {
                        reject(new Error('Error on recvVideoFrom: ' + JSON.stringify(error)));
                    } else {
                        this.webRtcPeer.processAnswer(response.sdpAnswer).then(() => {
                            this.remotePeerSuccessfullyEstablished();
                            this.initWebRtcStats();
                            resolve();
                        }).catch(error => {
                            reject(error);
                        });
                    }
                });
            };

            this.webRtcPeer = new WebRtcPeerRecvonly(options);
            this.webRtcPeer.generateOffer()
                .then(offer => {
                    successCallback(offer);
                })
                .catch(error => {
                    reject(new Error('(subscribe) SDP offer error: ' + JSON.stringify(error)));
                });
        });
    }

    private remotePeerSuccessfullyEstablished(): void {
        this.mediaStream = this.webRtcPeer.pc.getRemoteStreams()[0];
        console.debug('Peer remote stream', this.mediaStream);

        if (!!this.mediaStream) {
            this.ee.emitEvent('mediastream-updated');
            if (!this.displayMyRemote() && !!this.mediaStream.getAudioTracks()[0] && this.session.speakingEventsEnabled) {
                this.enableSpeakingEvents();
            }
        }
    }

    private initWebRtcStats(): void {
        this.webRtcStats = new WebRtcStats(this);
        this.webRtcStats.initWebRtcStats();
    }

    private stopWebRtcStats(): void {
        if (!!this.webRtcStats && this.webRtcStats.isEnabled()) {
            this.webRtcStats.stopWebRtcStats();
        }
    }

    private getIceServersConf(): RTCIceServer[] | undefined {
        let returnValue;
        if (!!this.session.openvidu.advancedConfiguration.iceServers) {
            returnValue = this.session.openvidu.advancedConfiguration.iceServers === 'freeice' ?
                undefined :
                this.session.openvidu.advancedConfiguration.iceServers;
        } else if (this.session.openvidu.iceServers) {
            returnValue = this.session.openvidu.iceServers;
        } else {
            returnValue = undefined;
        }
        return returnValue;
    }

}