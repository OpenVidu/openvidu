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

import { Connection } from './Connection';
import { Event } from '../OpenViduInternal/Events/Event';
import { Filter } from './Filter';
import { Session } from './Session';
import { StreamManager } from './StreamManager';
import { Subscriber } from './Subscriber';
import { EventDispatcher } from './EventDispatcher';
import { InboundStreamOptions } from '../OpenViduInternal/Interfaces/Private/InboundStreamOptions';
import { OutboundStreamOptions } from '../OpenViduInternal/Interfaces/Private/OutboundStreamOptions';
import { WebRtcPeer, WebRtcPeerSendonly, WebRtcPeerRecvonly, WebRtcPeerSendrecv } from '../OpenViduInternal/WebRtcPeer/WebRtcPeer';
import { WebRtcStats } from '../OpenViduInternal/WebRtcStats/WebRtcStats';
import { PublisherSpeakingEvent } from '../OpenViduInternal/Events/PublisherSpeakingEvent';
import { StreamManagerEvent } from '../OpenViduInternal/Events/StreamManagerEvent';
import { StreamPropertyChangedEvent } from '../OpenViduInternal/Events/StreamPropertyChangedEvent';
import { OpenViduError, OpenViduErrorName } from '../OpenViduInternal/Enums/OpenViduError';

/**
 * @hidden
 */
import hark = require('hark');
import platform = require('platform');
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
export class Stream extends EventDispatcher {

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
     * Unique identifier of the stream. If the stream belongs to a...
     * - Subscriber object: property `streamId` is always defined
     * - Publisher object: property `streamId` is only defined after successful execution of [[Session.publish]]
     */
    streamId: string;

    /**
     * Time when this stream was created in OpenVidu Server (UTC milliseconds). Depending on the owner of this stream:
     * - Subscriber object: property `creationTime` is always defined
     * - Publisher object: property `creationTime` is only defined after successful execution of [[Session.publish]]
     */
    creationTime: number;

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
     * Filter applied to the Stream. You can apply filters by calling [[Stream.applyFilter]], execute methods of the applied filter with
     * [[Filter.execMethod]] and remove it with [[Stream.removeFilter]]. Be aware that the client calling this methods must have the
     * necessary permissions: the token owned by the client must have been initialized with the appropriated `allowedFilters` array.
     */
    filter: Filter;

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
    publisherStartSpeakingEventEnabled = false;
    /**
     * @hidden
     */
    publisherStartSpeakingEventEnabledOnce = false;
    /**
     * @hidden
     */
    publisherStopSpeakingEventEnabled = false;
    /**
     * @hidden
     */
    publisherStopSpeakingEventEnabledOnce = false;
    /**
     * @hidden
     */
    volumeChangeEventEnabled = false;
    /**
     * @hidden
     */
    volumeChangeEventEnabledOnce = false;
    /**
     * @hidden
     */
    harkOptions;
    /**
     * @hidden
     */
    localMediaStreamWhenSubscribedToRemote: MediaStream;


    /**
     * @hidden
     */
    constructor(session: Session, options: InboundStreamOptions | OutboundStreamOptions | {}) {

        super();

        this.session = session;

        if (options.hasOwnProperty('id')) {
            // InboundStreamOptions: stream belongs to a Subscriber
            this.inboundStreamOpts = <InboundStreamOptions>options;
            this.streamId = this.inboundStreamOpts.id;
            this.creationTime = this.inboundStreamOpts.createdAt;
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
                if (typeof MediaStreamTrack !== 'undefined' && this.outboundStreamOpts.publisherProperties.videoSource instanceof MediaStreamTrack) {
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
            logger.debug('Video srcObject [' + this.mediaStream + '] updated in stream [' + this.streamId + ']');
        });
    }


    /**
     * See [[EventDispatcher.on]]
     */
    on(type: string, handler: (event: Event) => void): EventDispatcher {
        super.onAux(type, "Event '" + type + "' triggered by stream '" + this.streamId + "'", handler);
        return this;
    }


    /**
     * See [[EventDispatcher.once]]
     */
    once(type: string, handler: (event: Event) => void): EventDispatcher {
        super.onceAux(type, "Event '" + type + "' triggered once by stream '" + this.streamId + "'", handler);
        return this;
    }


    /**
     * See [[EventDispatcher.off]]
     */
    off(type: string, handler?: (event: Event) => void): EventDispatcher {
        super.off(type, handler);
        return this;
    }


    /**
     * Applies an audio/video filter to the stream.
     *
     * @param type Type of filter applied. See [[Filter.type]]
     * @param options Parameters used to initialize the filter. See [[Filter.options]]
     *
     * @returns A Promise (to which you can optionally subscribe to) that is resolved to the applied filter if success and rejected with an Error object if not
     */
    applyFilter(type: string, options: Object): Promise<Filter> {
        return new Promise((resolve, reject) => {
            logger.info('Applying filter to stream ' + this.streamId);
            options = !!options ? options : {};
            if (typeof options !== 'string') {
                options = JSON.stringify(options);
            }
            this.session.openvidu.sendRequest(
                'applyFilter',
                { streamId: this.streamId, type, options },
                (error, response) => {
                    if (error) {
                        logger.error('Error applying filter for Stream ' + this.streamId, error);
                        if (error.code === 401) {
                            reject(new OpenViduError(OpenViduErrorName.OPENVIDU_PERMISSION_DENIED, "You don't have permissions to apply a filter"));
                        } else {
                            reject(error);
                        }
                    } else {
                        logger.info('Filter successfully applied on Stream ' + this.streamId);
                        const oldValue: Filter = this.filter;
                        this.filter = new Filter(type, options);
                        this.filter.stream = this;
                        this.session.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent(this.session, this, 'filter', this.filter, oldValue, 'applyFilter')]);
                        this.streamManager.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent(this.streamManager, this, 'filter', this.filter, oldValue, 'applyFilter')]);
                        resolve(this.filter);
                    }
                }
            );
        });
    }

    /**
     * Removes an audio/video filter previously applied.
     *
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the previously applied filter has been successfully removed and rejected with an Error object in other case
     */
    removeFilter(): Promise<any> {
        return new Promise((resolve, reject) => {
            logger.info('Removing filter of stream ' + this.streamId);
            this.session.openvidu.sendRequest(
                'removeFilter',
                { streamId: this.streamId },
                (error, response) => {
                    if (error) {
                        logger.error('Error removing filter for Stream ' + this.streamId, error);
                        if (error.code === 401) {
                            reject(new OpenViduError(OpenViduErrorName.OPENVIDU_PERMISSION_DENIED, "You don't have permissions to remove a filter"));
                        } else {
                            reject(error);
                        }
                    } else {
                        logger.info('Filter successfully removed from Stream ' + this.streamId);
                        const oldValue = this.filter;
                        delete this.filter;
                        this.session.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent(this.session, this, 'filter', this.filter, oldValue, 'applyFilter')]);
                        this.streamManager.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent(this.streamManager, this, 'filter', this.filter, oldValue, 'applyFilter')]);
                        resolve();
                    }
                }
            );
        });
    }

    /**
     * Returns the internal RTCPeerConnection object associated to this stream (https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection)
     *
     * @returns Native RTCPeerConnection Web API object
     */
    getRTCPeerConnection(): RTCPeerConnection {
        return this.webRtcPeer.pc;
    }

    /**
     * Returns the internal MediaStream object associated to this stream (https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)
     *
     * @returns Native MediaStream Web API object
     */
    getMediaStream(): MediaStream {
        return this.mediaStream;
    }

    /* Hidden methods */

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
        this.ee.emitEvent('mediastream-updated', []);
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
            this.initWebRtcPeerReceive(false)
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
                this.initWebRtcPeerSend(false)
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
        if (!!this.webRtcPeer) {
            this.webRtcPeer.dispose();
            this.stopWebRtcStats();
        }
        logger.info((!!this.outboundStreamOpts ? 'Outbound ' : 'Inbound ') + "WebRTCPeer from 'Stream' with id [" + this.streamId + '] is now closed');
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
        // If subscribeToRemote local MediaStream must be stopped
        if (this.localMediaStreamWhenSubscribedToRemote) {
            this.localMediaStreamWhenSubscribedToRemote.getAudioTracks().forEach((track) => {
                track.stop();
            });
            this.localMediaStreamWhenSubscribedToRemote.getVideoTracks().forEach((track) => {
                track.stop();
            });
            delete this.localMediaStreamWhenSubscribedToRemote;
        }
        if (!!this.speechEvent) {
            if (!!this.speechEvent.stop) {
                this.speechEvent.stop();
            }
            delete this.speechEvent;
        }
        logger.info((!!this.outboundStreamOpts ? 'Local ' : 'Remote ') + "MediaStream from 'Stream' with id [" + this.streamId + '] is now disposed');
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
        let screen = this.outboundStreamOpts.publisherProperties.videoSource === 'screen';
        if (platform.name === 'Electron') {
            screen = typeof this.outboundStreamOpts.publisherProperties.videoSource === 'string' &&
                this.outboundStreamOpts.publisherProperties.videoSource.startsWith('screen:');
        }
        return !!this.outboundStreamOpts && screen;
    }

    /**
     * @hidden
     */
    enableStartSpeakingEvent(): void {
        this.setSpeechEventIfNotExists();
        if (!this.publisherStartSpeakingEventEnabled) {
            this.publisherStartSpeakingEventEnabled = true;
            this.speechEvent.on('speaking', () => {
                this.session.emitEvent('publisherStartSpeaking', [new PublisherSpeakingEvent(this.session, 'publisherStartSpeaking', this.connection, this.streamId)]);
                this.publisherStartSpeakingEventEnabledOnce = false; // Disable 'once' version if 'on' version was triggered
            });
        }
    }

    /**
     * @hidden
     */
    enableOnceStartSpeakingEvent(): void {
        this.setSpeechEventIfNotExists();
        if (!this.publisherStartSpeakingEventEnabledOnce) {
            this.publisherStartSpeakingEventEnabledOnce = true;
            this.speechEvent.once('speaking', () => {
                if (this.publisherStartSpeakingEventEnabledOnce) {
                    // If the listener has been disabled in the meantime (for example by the 'on' version) do not trigger the event
                    this.session.emitEvent('publisherStartSpeaking', [new PublisherSpeakingEvent(this.session, 'publisherStartSpeaking', this.connection, this.streamId)]);
                }
                this.disableStartSpeakingEvent(true);
            });
        }
    }

    /**
     * @hidden
     */
    disableStartSpeakingEvent(disabledByOnce: boolean): void {
        if (!!this.speechEvent) {
            this.publisherStartSpeakingEventEnabledOnce = false;
            if (disabledByOnce) {
                if (this.publisherStartSpeakingEventEnabled) {
                    // The 'on' version of this same event is enabled too. Do not remove the hark listener
                    return;
                }
            } else {
                this.publisherStartSpeakingEventEnabled = false;
            }
            // Shutting down the hark event
            if (this.volumeChangeEventEnabled ||
                this.volumeChangeEventEnabledOnce ||
                this.publisherStopSpeakingEventEnabled ||
                this.publisherStopSpeakingEventEnabledOnce) {
                // Some other hark event is enabled. Cannot stop the hark process, just remove the specific listener
                this.speechEvent.off('speaking');
            } else {
                // No other hark event is enabled. We can get entirely rid of it
                this.speechEvent.stop();
                delete this.speechEvent;
            }
        }
    }

    /**
     * @hidden
     */
    enableStopSpeakingEvent(): void {
        this.setSpeechEventIfNotExists();
        if (!this.publisherStopSpeakingEventEnabled) {
            this.publisherStopSpeakingEventEnabled = true;
            this.speechEvent.on('stopped_speaking', () => {
                this.session.emitEvent('publisherStopSpeaking', [new PublisherSpeakingEvent(this.session, 'publisherStopSpeaking', this.connection, this.streamId)]);
                this.publisherStopSpeakingEventEnabledOnce = false; // Disable 'once' version if 'on' version was triggered
            });
        }
    }

    /**
     * @hidden
     */
    enableOnceStopSpeakingEvent(): void {
        this.setSpeechEventIfNotExists();
        if (!this.publisherStopSpeakingEventEnabledOnce) {
            this.publisherStopSpeakingEventEnabledOnce = true;
            this.speechEvent.once('stopped_speaking', () => {
                if (this.publisherStopSpeakingEventEnabledOnce) {
                    // If the listener has been disabled in the meantime (for example by the 'on' version) do not trigger the event
                    this.session.emitEvent('publisherStopSpeaking', [new PublisherSpeakingEvent(this.session, 'publisherStopSpeaking', this.connection, this.streamId)]);
                }
                this.disableStopSpeakingEvent(true);
            });
        }
    }

    /**
    * @hidden
    */
    disableStopSpeakingEvent(disabledByOnce: boolean): void {
        if (!!this.speechEvent) {
            this.publisherStopSpeakingEventEnabledOnce = false;
            if (disabledByOnce) {
                if (this.publisherStopSpeakingEventEnabled) {
                    // We are cancelling the 'once' listener for this event, but the 'on' version
                    // of this same event is enabled too. Do not remove the hark listener
                    return;
                }
            } else {
                this.publisherStopSpeakingEventEnabled = false;
            }
            // Shutting down the hark event
            if (this.volumeChangeEventEnabled ||
                this.volumeChangeEventEnabledOnce ||
                this.publisherStartSpeakingEventEnabled ||
                this.publisherStartSpeakingEventEnabledOnce) {
                // Some other hark event is enabled. Cannot stop the hark process, just remove the specific listener
                this.speechEvent.off('stopped_speaking');
            } else {
                // No other hark event is enabled. We can get entirely rid of it
                this.speechEvent.stop();
                delete this.speechEvent;
            }
        }
    }

    /**
     * @hidden
     */
    enableVolumeChangeEvent(force: boolean): void {
        if (this.setSpeechEventIfNotExists()) {
            if (!this.volumeChangeEventEnabled || force) {
                this.volumeChangeEventEnabled = true;
                this.speechEvent.on('volume_change', harkEvent => {
                    const oldValue = this.speechEvent.oldVolumeValue;
                    const value = { newValue: harkEvent, oldValue };
                    this.speechEvent.oldVolumeValue = harkEvent;
                    this.streamManager.emitEvent('streamAudioVolumeChange', [new StreamManagerEvent(this.streamManager, 'streamAudioVolumeChange', value)]);
                });
            }
        } else {
            // This way whenever the MediaStream object is available, the event listener will be automatically added
            this.volumeChangeEventEnabled = true;
        }
    }

    /**
     * @hidden
     */
    enableOnceVolumeChangeEvent(force: boolean): void {
        if (this.setSpeechEventIfNotExists()) {
            if (!this.volumeChangeEventEnabledOnce || force) {
                this.volumeChangeEventEnabledOnce = true;
                this.speechEvent.once('volume_change', harkEvent => {
                    const oldValue = this.speechEvent.oldVolumeValue;
                    const value = { newValue: harkEvent, oldValue };
                    this.speechEvent.oldVolumeValue = harkEvent;
                    this.disableVolumeChangeEvent(true);
                    this.streamManager.emitEvent('streamAudioVolumeChange', [new StreamManagerEvent(this.streamManager, 'streamAudioVolumeChange', value)]);
                });
            }
        } else {
            // This way whenever the MediaStream object is available, the event listener will be automatically added
            this.volumeChangeEventEnabledOnce = true;
        }
    }

    /**
     * @hidden
     */
    disableVolumeChangeEvent(disabledByOnce: boolean): void {
        if (!!this.speechEvent) {
            this.volumeChangeEventEnabledOnce = false;
            if (disabledByOnce) {
                if (this.volumeChangeEventEnabled) {
                    // We are cancelling the 'once' listener for this event, but the 'on' version
                    // of this same event is enabled too. Do not remove the hark listener
                    return;
                }
            } else {
                this.volumeChangeEventEnabled = false;
            }
            // Shutting down the hark event
            if (this.publisherStartSpeakingEventEnabled ||
                this.publisherStartSpeakingEventEnabledOnce ||
                this.publisherStopSpeakingEventEnabled ||
                this.publisherStopSpeakingEventEnabledOnce) {
                // Some other hark event is enabled. Cannot stop the hark process, just remove the specific listener
                this.speechEvent.off('volume_change');
            } else {
                // No other hark event is enabled. We can get entirely rid of it
                this.speechEvent.stop();
                delete this.speechEvent;
            }
        }
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

    /**
     * @hidden
     */
    streamIceConnectionStateBroken() {
        if (!this.getWebRtcPeer() || !this.getRTCPeerConnection()) {
            return false;
        }
        if (this.isLocal && !!this.session.openvidu.advancedConfiguration.forceMediaReconnectionAfterNetworkDrop) {
            logger.warn('OpenVidu Browser advanced configuration option "forceMediaReconnectionAfterNetworkDrop" is enabled. Publisher stream ' + this.streamId + 'will force a reconnection');
            return true;
        }
        const iceConnectionState: RTCIceConnectionState = this.getRTCPeerConnection().iceConnectionState;
        return iceConnectionState === 'disconnected' || iceConnectionState === 'failed';
    }

    /* Private methods */

    private setSpeechEventIfNotExists(): boolean {
        if (!!this.mediaStream) {
            if (!this.speechEvent) {
                const harkOptions = !!this.harkOptions ? this.harkOptions : (this.session.openvidu.advancedConfiguration.publisherSpeakingEventsOptions || {});
                harkOptions.interval = (typeof harkOptions.interval === 'number') ? harkOptions.interval : 100;
                harkOptions.threshold = (typeof harkOptions.threshold === 'number') ? harkOptions.threshold : -50;
                this.speechEvent = hark(this.mediaStream, harkOptions);
            }
            return true;
        }
        return false;
    }

    /**
     * @hidden
     */
    initWebRtcPeerSend(reconnect: boolean): Promise<any> {
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
                        this.webRtcPeer.processAnswer(response.sdpAnswer, false)
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
                this.webRtcPeer = new WebRtcPeerSendrecv(options);
            } else {
                this.webRtcPeer = new WebRtcPeerSendonly(options);
            }
            this.webRtcPeer.addIceConnectionStateChangeListener('publisher of ' + this.connection.connectionId);
            this.webRtcPeer.generateOffer().then(sdpOffer => {
                successCallback(sdpOffer);
            }).catch(error => {
                reject(new Error('(publish) SDP offer error: ' + JSON.stringify(error)));
            });
        });
    }

    /**
     * @hidden
     */
    initWebRtcPeerReceive(reconnect: boolean): Promise<any> {
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
                        this.webRtcPeer.processAnswer(response.sdpAnswer, needsTimeoutOnProcessAnswer).then(() => {
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

            this.webRtcPeer = new WebRtcPeerRecvonly(options);
            this.webRtcPeer.addIceConnectionStateChangeListener(this.streamId);
            this.webRtcPeer.generateOffer()
                .then(sdpOffer => {
                    successCallback(sdpOffer);
                })
                .catch(error => {
                    reject(new Error('(subscribe) SDP offer error: ' + JSON.stringify(error)));
                });
        });
    }

    private remotePeerSuccessfullyEstablished(): void {
        if (platform['isIonicIos']) {
            // iOS Ionic. LIMITATION: must use deprecated WebRTC API
            const pc1: any = this.webRtcPeer.pc;
            this.mediaStream = pc1.getRemoteStreams()[0];
        } else {
            this.mediaStream = new MediaStream();
            let receiver: RTCRtpReceiver;
            for (receiver of this.webRtcPeer.pc.getReceivers()) {
                if (!!receiver.track) {
                    this.mediaStream.addTrack(receiver.track);
                }
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

    private initHarkEvents(): void {
        if (!!this.mediaStream.getAudioTracks()[0]) {
            // Hark events can only be set if audio track is available
            if (this.streamManager.remote) {
                // publisherStartSpeaking/publisherStopSpeaking is only defined for remote streams
                if (this.session.startSpeakingEventsEnabled) {
                    this.enableStartSpeakingEvent();
                }
                if (this.session.startSpeakingEventsEnabledOnce) {
                    this.enableOnceStartSpeakingEvent();
                }
                if (this.session.stopSpeakingEventsEnabled) {
                    this.enableStopSpeakingEvent();
                }
                if (this.session.stopSpeakingEventsEnabledOnce) {
                    this.enableOnceStopSpeakingEvent();
                }
            }
            // streamAudioVolumeChange event is defined for both Publishers and Subscribers
            if (this.volumeChangeEventEnabled) {
                this.enableVolumeChangeEvent(true);
            }
            if (this.volumeChangeEventEnabledOnce) {
                this.enableOnceVolumeChangeEvent(true);
            }
        }
    }

    private initWebRtcStats(): void {
        this.webRtcStats = new WebRtcStats(this);
        this.webRtcStats.initWebRtcStats();

        //TODO: send common webrtc stats from client to openvidu-server
        /*if (this.session.openvidu.webrtcStatsInterval > 0) {
            setInterval(() => {
                this.gatherStatsForPeer().then(jsonStats => {
                    const body = {
                        sessionId: this.session.sessionId,
                        participantPrivateId: this.connection.rpcSessionId,
                        stats: jsonStats
                    }
                    var xhr = new XMLHttpRequest();
                    xhr.open('POST', this.session.openvidu.httpUri + '/elasticsearch/webrtc-stats', true);
                    xhr.setRequestHeader('Content-Type', 'application/json');
                    xhr.send(JSON.stringify(body));
                })
            }, this.session.openvidu.webrtcStatsInterval * 1000);
        }*/
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

    private gatherStatsForPeer(): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.isLocal()) {

                // Publisher stream stats

                this.getRTCPeerConnection().getSenders().forEach(sender => sender.getStats()
                    .then(
                        response => {
                            response.forEach(report => {

                                if (this.isReportWanted(report)) {

                                    const finalReport = {};

                                    finalReport['type'] = report.type;
                                    finalReport['timestamp'] = report.timestamp;
                                    finalReport['id'] = report.id;

                                    // Common to Chrome, Firefox and Safari
                                    if (report.type === 'outbound-rtp') {
                                        finalReport['ssrc'] = report.ssrc;
                                        finalReport['firCount'] = report.firCount;
                                        finalReport['pliCount'] = report.pliCount;
                                        finalReport['nackCount'] = report.nackCount;
                                        finalReport['qpSum'] = report.qpSum;

                                        // Set media type
                                        if (!!report.kind) {
                                            finalReport['mediaType'] = report.kind;
                                        } else if (!!report.mediaType) {
                                            finalReport['mediaType'] = report.mediaType;
                                        } else {
                                            // Safari does not have 'mediaType' defined for inbound-rtp. Must be inferred from 'id' field
                                            finalReport['mediaType'] = (report.id.indexOf('VideoStream') !== -1) ? 'video' : 'audio';
                                        }

                                        if (finalReport['mediaType'] === 'video') {
                                            finalReport['framesEncoded'] = report.framesEncoded;
                                        }

                                        finalReport['packetsSent'] = report.packetsSent;
                                        finalReport['bytesSent'] = report.bytesSent;
                                    }

                                    // Only for Chrome and Safari
                                    if (report.type === 'candidate-pair' && report.totalRoundTripTime !== undefined) {
                                        // This is the final selected candidate pair
                                        finalReport['availableOutgoingBitrate'] = report.availableOutgoingBitrate;
                                        finalReport['rtt'] = report.currentRoundTripTime;
                                        finalReport['averageRtt'] = report.totalRoundTripTime / report.responsesReceived;
                                    }

                                    // Only for Firefox >= 66.0
                                    if (report.type === 'remote-inbound-rtp' || report.type === 'remote-outbound-rtp') {

                                    }

                                    logger.log(finalReport);
                                }
                            });
                        }));
            } else {

                // Subscriber stream stats

                this.getRTCPeerConnection().getReceivers().forEach(receiver => receiver.getStats()
                    .then(
                        response => {
                            response.forEach(report => {

                                if (this.isReportWanted(report)) {

                                    const finalReport = {};

                                    finalReport['type'] = report.type;
                                    finalReport['timestamp'] = report.timestamp;
                                    finalReport['id'] = report.id;

                                    // Common to Chrome, Firefox and Safari
                                    if (report.type === 'inbound-rtp') {
                                        finalReport['ssrc'] = report.ssrc;
                                        finalReport['firCount'] = report.firCount;
                                        finalReport['pliCount'] = report.pliCount;
                                        finalReport['nackCount'] = report.nackCount;
                                        finalReport['qpSum'] = report.qpSum;

                                        // Set media type
                                        if (!!report.kind) {
                                            finalReport['mediaType'] = report.kind;
                                        } else if (!!report.mediaType) {
                                            finalReport['mediaType'] = report.mediaType;
                                        } else {
                                            // Safari does not have 'mediaType' defined for inbound-rtp. Must be inferred from 'id' field
                                            finalReport['mediaType'] = (report.id.indexOf('VideoStream') !== -1) ? 'video' : 'audio';
                                        }

                                        if (finalReport['mediaType'] === 'video') {
                                            finalReport['framesDecoded'] = report.framesDecoded;
                                        }

                                        finalReport['packetsReceived'] = report.packetsReceived;
                                        finalReport['packetsLost'] = report.packetsLost;
                                        finalReport['jitter'] = report.jitter;
                                        finalReport['bytesReceived'] = report.bytesReceived;
                                    }

                                    // Only for Chrome and Safari
                                    if (report.type === 'candidate-pair' && report.totalRoundTripTime !== undefined) {
                                        // This is the final selected candidate pair
                                        finalReport['availableIncomingBitrate'] = report.availableIncomingBitrate;
                                        finalReport['rtt'] = report.currentRoundTripTime;
                                        finalReport['averageRtt'] = report.totalRoundTripTime / report.responsesReceived;
                                    }

                                    // Only for Firefox >= 66.0
                                    if (report.type === 'remote-inbound-rtp' || report.type === 'remote-outbound-rtp') {

                                    }
                                    logger.log(finalReport);
                                }
                            })
                        })
                )
            }
        });
    }

    private isReportWanted(report: any): boolean {
        return report.type === 'inbound-rtp' && !this.isLocal() ||
            report.type === 'outbound-rtp' && this.isLocal() ||
            (report.type === 'candidate-pair' && report.nominated && report.bytesSent > 0);
    }

}