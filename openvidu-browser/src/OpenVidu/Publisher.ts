/*
 * (C) Copyright 2017-2019 OpenVidu (https://openvidu.io/)
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

import { OpenVidu } from './OpenVidu';
import { Session } from './Session';
import { Stream } from './Stream';
import { StreamManager } from './StreamManager';
import { EventDispatcher } from '../OpenViduInternal/Interfaces/Public/EventDispatcher';
import { PublisherProperties } from '../OpenViduInternal/Interfaces/Public/PublisherProperties';
import { Event } from '../OpenViduInternal/Events/Event';
import { StreamEvent } from '../OpenViduInternal/Events/StreamEvent';
import { StreamPropertyChangedEvent } from '../OpenViduInternal/Events/StreamPropertyChangedEvent';
import { VideoElementEvent } from '../OpenViduInternal/Events/VideoElementEvent';
import { OpenViduError, OpenViduErrorName } from '../OpenViduInternal/Enums/OpenViduError';
import { VideoInsertMode } from '../OpenViduInternal/Enums/VideoInsertMode';

import platform = require('platform');

/**
 * Packs local media streams. Participants can publish it to a session. Initialized with [[OpenVidu.initPublisher]] method
 */
export class Publisher extends StreamManager {

    /**
     * Whether the Publisher has been granted access to the requested input devices or not
     */
    accessAllowed = false;

    /**
     * Whether you have called [[Publisher.subscribeToRemote]] with value `true` or `false` (*false* by default)
     */
    isSubscribedToRemote = false;

    /**
     * The [[Session]] to which the Publisher belongs
     */
    session: Session; // Initialized by Session.publish(Publisher)

    private accessDenied = false;
    private properties: PublisherProperties;
    private permissionDialogTimeout: NodeJS.Timer;

    /**
     * @hidden
     */
    openvidu: OpenVidu;
    /**
     * @hidden
     */
    videoReference: HTMLVideoElement;
    /**
     * @hidden
     */
    screenShareResizeInterval: NodeJS.Timer;
    /**
     * @hidden
     */
    IEAdapter: any;

    /**
     * @hidden
     */
    constructor(targEl: string | HTMLElement, properties: PublisherProperties, openvidu: OpenVidu) {
        super(new Stream((!!openvidu.session) ? openvidu.session : new Session(openvidu), { publisherProperties: properties, mediaConstraints: {} }), targEl);
        this.properties = properties;
        this.openvidu = openvidu;

        this.stream.ee.on('local-stream-destroyed', (reason: string) => {
            this.stream.isLocalStreamPublished = false;
            const streamEvent = new StreamEvent(true, this, 'streamDestroyed', this.stream, reason);
            this.emitEvent('streamDestroyed', [streamEvent]);
            streamEvent.callDefaultBehavior();
        });
    }


    /**
     * Publish or unpublish the audio stream (if available). Calling this method twice in a row passing same value will have no effect
     *
     * #### Events dispatched
     *
     * > _Only if `Session.publish(Publisher)` has been called for this Publisher_
     *
     * The [[Session]] object of the local participant will dispatch a `streamPropertyChanged` event with `changedProperty` set to `"audioActive"` and `reason` set to `"publishAudio"`
     * The [[Publisher]] object of the local participant will also dispatch the exact same event
     *
     * The [[Session]] object of every other participant connected to the session will dispatch a `streamPropertyChanged` event with `changedProperty` set to `"audioActive"` and `reason` set to `"publishAudio"`
     * The respective [[Subscriber]] object of every other participant receiving this Publisher's stream will also dispatch the exact same event
     *
     * See [[StreamPropertyChangedEvent]] to learn more.
     *
     * @param value `true` to publish the audio stream, `false` to unpublish it
     */
    publishAudio(value: boolean): void {
        if (this.stream.audioActive !== value) {
            this.stream.getMediaStream().getAudioTracks().forEach((track) => {
                track.enabled = value;
            });
            if (!!this.session && !!this.stream.streamId) {
                this.session.openvidu.sendRequest(
                    'streamPropertyChanged',
                    {
                        streamId: this.stream.streamId,
                        property: 'audioActive',
                        newValue: value,
                        reason: 'publishAudio'
                    },
                    (error, response) => {
                        if (error) {
                            console.error("Error sending 'streamPropertyChanged' event", error);
                        } else {
                            this.session.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent(this.session, this.stream, 'audioActive', value, !value, 'publishAudio')]);
                            this.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent(this, this.stream, 'audioActive', value, !value, 'publishAudio')]);
                        }
                    });
            }
            this.stream.audioActive = value;
            console.info("'Publisher' has " + (value ? 'published' : 'unpublished') + ' its audio stream');
        }
    }


    /**
     * Publish or unpublish the video stream (if available). Calling this method twice in a row passing same value will have no effect
     *
     * #### Events dispatched
     *
     * > _Only if `Session.publish(Publisher)` has been called for this Publisher_
     *
     * The [[Session]] object of the local participant will dispatch a `streamPropertyChanged` event with `changedProperty` set to `"videoActive"` and `reason` set to `"publishVideo"`
     * The [[Publisher]] object of the local participant will also dispatch the exact same event
     *
     * The [[Session]] object of every other participant connected to the session will dispatch a `streamPropertyChanged` event with `changedProperty` set to `"videoActive"` and `reason` set to `"publishVideo"`
     * The respective [[Subscriber]] object of every other participant receiving this Publisher's stream will also dispatch the exact same event
     *
     * See [[StreamPropertyChangedEvent]] to learn more.
     *
     * @param value `true` to publish the video stream, `false` to unpublish it
     */
    publishVideo(value: boolean): void {
        if (this.stream.videoActive !== value) {
            this.stream.getMediaStream().getVideoTracks().forEach((track) => {
                track.enabled = value;
            });
            if (!!this.session && !!this.stream.streamId) {
                this.session.openvidu.sendRequest(
                    'streamPropertyChanged',
                    {
                        streamId: this.stream.streamId,
                        property: 'videoActive',
                        newValue: value,
                        reason: 'publishVideo'
                    },
                    (error, response) => {
                        if (error) {
                            console.error("Error sending 'streamPropertyChanged' event", error);
                        } else {
                            this.session.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent(this.session, this.stream, 'videoActive', value, !value, 'publishVideo')]);
                            this.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent(this, this.stream, 'videoActive', value, !value, 'publishVideo')]);
                        }
                    });
            }
            this.stream.videoActive = value;
            console.info("'Publisher' has " + (value ? 'published' : 'unpublished') + ' its video stream');
        }
    }


    /**
     * Call this method before [[Session.publish]] if you prefer to subscribe to your Publisher's remote stream instead of using the local stream, as any other user would do.
     */
    subscribeToRemote(value?: boolean): void {
        value = (value !== undefined) ? value : true;
        this.isSubscribedToRemote = value;
        this.stream.subscribeToMyRemote(value);
    }


    /**
     * See [[EventDispatcher.on]]
     */
    on(type: string, handler: (event: Event) => void): EventDispatcher {
        super.on(type, handler);
        if (type === 'streamCreated') {
            if (!!this.stream && this.stream.isLocalStreamPublished) {
                this.emitEvent('streamCreated', [new StreamEvent(false, this, 'streamCreated', this.stream, '')]);
            } else {
                this.stream.ee.on('stream-created-by-publisher', () => {
                    this.emitEvent('streamCreated', [new StreamEvent(false, this, 'streamCreated', this.stream, '')]);
                });
            }
        }
        if (type === 'remoteVideoPlaying') {
            if (this.stream.displayMyRemote() && this.videos[0] && this.videos[0].video &&
                this.videos[0].video.currentTime > 0 &&
                this.videos[0].video.paused === false &&
                this.videos[0].video.ended === false &&
                this.videos[0].video.readyState === 4) {
                this.emitEvent('remoteVideoPlaying', [new VideoElementEvent(this.videos[0].video, this, 'remoteVideoPlaying')]);
            }
        }
        if (type === 'accessAllowed') {
            if (this.accessAllowed) {
                this.emitEvent('accessAllowed', []);
            }
        }
        if (type === 'accessDenied') {
            if (this.accessDenied) {
                this.emitEvent('accessDenied', []);
            }
        }
        return this;
    }


    /**
     * See [[EventDispatcher.once]]
     */
    once(type: string, handler: (event: Event) => void): Publisher {
        super.once(type, handler);
        if (type === 'streamCreated') {
            if (!!this.stream && this.stream.isLocalStreamPublished) {
                this.emitEvent('streamCreated', [new StreamEvent(false, this, 'streamCreated', this.stream, '')]);
            } else {
                this.stream.ee.once('stream-created-by-publisher', () => {
                    this.emitEvent('streamCreated', [new StreamEvent(false, this, 'streamCreated', this.stream, '')]);
                });
            }
        }
        if (type === 'remoteVideoPlaying') {
            if (this.stream.displayMyRemote() && this.videos[0] && this.videos[0].video &&
                this.videos[0].video.currentTime > 0 &&
                this.videos[0].video.paused === false &&
                this.videos[0].video.ended === false &&
                this.videos[0].video.readyState === 4) {
                this.emitEvent('remoteVideoPlaying', [new VideoElementEvent(this.videos[0].video, this, 'remoteVideoPlaying')]);
            }
        }
        if (type === 'accessAllowed') {
            if (this.accessAllowed) {
                this.emitEvent('accessAllowed', []);
            }
        }
        if (type === 'accessDenied') {
            if (this.accessDenied) {
                this.emitEvent('accessDenied', []);
            }
        }
        return this;
    }


    /* Hidden methods */

    /**
     * @hidden
     */
    initialize(): Promise<any> {
        return new Promise((resolve, reject) => {

            let constraints: MediaStreamConstraints = {};
            let constraintsAux: MediaStreamConstraints = {};
            const timeForDialogEvent = 1250;
            let startTime;

            const errorCallback = (openViduError: OpenViduError) => {
                this.accessDenied = true;
                this.accessAllowed = false;
                reject(openViduError);
            };

            const successCallback = (mediaStream: MediaStream) => {
                this.accessAllowed = true;
                this.accessDenied = false;

                if (typeof MediaStreamTrack !== 'undefined' && this.properties.audioSource instanceof MediaStreamTrack) {
                    mediaStream.removeTrack(mediaStream.getAudioTracks()[0]);
                    mediaStream.addTrack((<MediaStreamTrack>this.properties.audioSource));
                }

                if (typeof MediaStreamTrack !== 'undefined' && this.properties.videoSource instanceof MediaStreamTrack) {
                    mediaStream.removeTrack(mediaStream.getVideoTracks()[0]);
                    mediaStream.addTrack((<MediaStreamTrack>this.properties.videoSource));
                }

                // Apply PublisherProperties.publishAudio and PublisherProperties.publishVideo
                if (!!mediaStream.getAudioTracks()[0]) {
                    const enabled = (this.stream.audioActive !== undefined && this.stream.audioActive !== null) ? this.stream.audioActive : !!this.stream.outboundStreamOpts.publisherProperties.publishAudio;
                    mediaStream.getAudioTracks()[0].enabled = enabled;
                }
                if (!!mediaStream.getVideoTracks()[0]) {
                    const enabled = (this.stream.videoActive !== undefined && this.stream.videoActive !== null) ? this.stream.videoActive : !!this.stream.outboundStreamOpts.publisherProperties.publishVideo;
                    mediaStream.getVideoTracks()[0].enabled = enabled;
                }

                this.videoReference = document.createElement('video');

                if (platform.name === 'Safari') {
                    this.videoReference.setAttribute('playsinline', 'true');
                }

                this.stream.setMediaStream(mediaStream);

                if (!!this.firstVideoElement) {
                    this.createVideoElement(this.firstVideoElement.targetElement, <VideoInsertMode>this.properties.insertMode);
                }

                this.videoReference.srcObject = mediaStream;

                if (!this.stream.displayMyRemote()) {
                    // When we are subscribed to our remote we don't still set the MediaStream object in the video elements to
                    // avoid early 'streamPlaying' event
                    this.stream.updateMediaStreamInVideos();
                }
                delete this.firstVideoElement;

                if (this.stream.isSendVideo()) {
                    if (!this.stream.isSendScreen()) {

                        if (platform['isIonicIos'] || platform.name === 'Safari') {
                            // iOS Ionic or Safari. Limitation: cannot set videoDimensions directly, as the videoReference is not loaded
                            // if not added to DOM. Must add it to DOM and wait for videoWidth and videoHeight properties to be defined

                            this.videoReference.style.display = 'none';
                            document.body.appendChild(this.videoReference);

                            const videoDimensionsSet = () => {
                                this.stream.videoDimensions = {
                                    width: this.videoReference.videoWidth,
                                    height: this.videoReference.videoHeight
                                };
                                this.stream.isLocalStreamReadyToPublish = true;
                                this.stream.ee.emitEvent('stream-ready-to-publish', []);
                                document.body.removeChild(this.videoReference);
                            };

                            let interval;
                            this.videoReference.addEventListener('loadedmetadata', () => {
                                if (this.videoReference.videoWidth === 0) {
                                    interval = setInterval(() => {
                                        if (this.videoReference.videoWidth !== 0) {
                                            clearInterval(interval);
                                            videoDimensionsSet();
                                        }
                                    }, 40);
                                } else {
                                    videoDimensionsSet();
                                }
                            });
                        } else {
                            // Rest of platforms
                            // With no screen share, video dimension can be set directly from MediaStream (getSettings)
                            // Orientation must be checked for mobile devices (width and height are reversed)
                            const { width, height } = mediaStream.getVideoTracks()[0].getSettings();

                            if ((platform.os!!.family === 'iOS' || platform.os!!.family === 'Android') && (window.innerHeight > window.innerWidth)) {
                                // Mobile portrait mode
                                this.stream.videoDimensions = {
                                    width: height || 0,
                                    height: width || 0
                                };
                            } else {
                                this.stream.videoDimensions = {
                                    width: width || 0,
                                    height: height || 0
                                };
                            }
                            this.stream.isLocalStreamReadyToPublish = true;
                            this.stream.ee.emitEvent('stream-ready-to-publish', []);
                        }
                    } else {
                        // With screen share, video dimension must be got from a video element (onloadedmetadata event)
                        this.videoReference.addEventListener('loadedmetadata', () => {
                            this.stream.videoDimensions = {
                                width: this.videoReference.videoWidth,
                                height: this.videoReference.videoHeight
                            };
                            this.screenShareResizeInterval = setInterval(() => {
                                const firefoxSettings = mediaStream.getVideoTracks()[0].getSettings();
                                const newWidth = (platform.name === 'Chrome' || platform.name === 'Opera') ? this.videoReference.videoWidth : firefoxSettings.width;
                                const newHeight = (platform.name === 'Chrome' || platform.name === 'Opera') ? this.videoReference.videoHeight : firefoxSettings.height;
                                if (this.stream.isLocalStreamPublished &&
                                    (newWidth !== this.stream.videoDimensions.width ||
                                        newHeight !== this.stream.videoDimensions.height)) {
                                    const oldValue = { width: this.stream.videoDimensions.width, height: this.stream.videoDimensions.height };
                                    this.stream.videoDimensions = {
                                        width: newWidth || 0,
                                        height: newHeight || 0
                                    };
                                    this.session.openvidu.sendRequest(
                                        'streamPropertyChanged',
                                        {
                                            streamId: this.stream.streamId,
                                            property: 'videoDimensions',
                                            newValue: JSON.stringify(this.stream.videoDimensions),
                                            reason: 'screenResized'
                                        },
                                        (error, response) => {
                                            if (error) {
                                                console.error("Error sending 'streamPropertyChanged' event", error);
                                            } else {
                                                this.session.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent(this.session, this.stream, 'videoDimensions', this.stream.videoDimensions, oldValue, 'screenResized')]);
                                                this.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent(this, this.stream, 'videoDimensions', this.stream.videoDimensions, oldValue, 'screenResized')]);
                                            }
                                        });
                                }
                            }, 500);
                            this.stream.isLocalStreamReadyToPublish = true;
                            this.stream.ee.emitEvent('stream-ready-to-publish', []);
                        });
                    }
                } else {
                    this.stream.isLocalStreamReadyToPublish = true;
                    this.stream.ee.emitEvent('stream-ready-to-publish', []);
                }
                resolve();
            };

            const getMediaSuccess = (mediaStream: MediaStream, definedAudioConstraint) => {
                this.clearPermissionDialogTimer(startTime, timeForDialogEvent);
                if (this.stream.isSendScreen() && this.stream.isSendAudio()) {
                    // When getting desktop as user media audio constraint must be false. Now we can ask for it if required
                    constraintsAux.audio = definedAudioConstraint;
                    constraintsAux.video = false;
                    startTime = Date.now();
                    this.setPermissionDialogTimer(timeForDialogEvent);

                    navigator.mediaDevices.getUserMedia(constraintsAux)
                        .then(audioOnlyStream => {
                            this.clearPermissionDialogTimer(startTime, timeForDialogEvent);
                            mediaStream.addTrack(audioOnlyStream.getAudioTracks()[0]);
                            successCallback(mediaStream);
                        })
                        .catch(error => {
                            this.clearPermissionDialogTimer(startTime, timeForDialogEvent);
                            if (error.name === 'Error') {
                                // Safari OverConstrainedError has as name property 'Error' instead of 'OverConstrainedError'
                                error.name = error.constructor.name;
                            }
                            let errorName, errorMessage;
                            switch (error.name.toLowerCase()) {
                                case 'notfounderror':
                                    errorName = OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                    errorMessage = error.toString();
                                    errorCallback(new OpenViduError(errorName, errorMessage));
                                    break;
                                case 'notallowederror':
                                    errorName = OpenViduErrorName.DEVICE_ACCESS_DENIED;
                                    errorMessage = error.toString();
                                    errorCallback(new OpenViduError(errorName, errorMessage));
                                    break;
                                case 'overconstrainederror':
                                    if (error.constraint.toLowerCase() === 'deviceid') {
                                        errorName = OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                        errorMessage = "Audio input device with deviceId '" + (<ConstrainDOMStringParameters>(<MediaTrackConstraints>constraints.video).deviceId!!).exact + "' not found";
                                    } else {
                                        errorName = OpenViduErrorName.PUBLISHER_PROPERTIES_ERROR;
                                        errorMessage = "Audio input device doesn't support the value passed for constraint '" + error.constraint + "'";
                                    }
                                    errorCallback(new OpenViduError(errorName, errorMessage));
                                    break;
                            }
                        });
                } else {
                    successCallback(mediaStream);
                }
            };

            const getMediaError = error => {
                console.error(error);
                this.clearPermissionDialogTimer(startTime, timeForDialogEvent);
                if (error.name === 'Error') {
                    // Safari OverConstrainedError has as name property 'Error' instead of 'OverConstrainedError'
                    error.name = error.constructor.name;
                }
                let errorName, errorMessage;
                switch (error.name.toLowerCase()) {
                    case 'notfounderror':
                        navigator.mediaDevices.getUserMedia({
                            audio: false,
                            video: constraints.video
                        })
                            .then(mediaStream => {
                                mediaStream.getVideoTracks().forEach((track) => {
                                    track.stop();
                                });
                                errorName = OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                errorMessage = error.toString();
                                errorCallback(new OpenViduError(errorName, errorMessage));
                            }).catch(e => {
                                errorName = OpenViduErrorName.INPUT_VIDEO_DEVICE_NOT_FOUND;
                                errorMessage = error.toString();
                                errorCallback(new OpenViduError(errorName, errorMessage));
                            });
                        break;
                    case 'notallowederror':
                        errorName = this.stream.isSendScreen() ? OpenViduErrorName.SCREEN_CAPTURE_DENIED : OpenViduErrorName.DEVICE_ACCESS_DENIED;
                        errorMessage = error.toString();
                        errorCallback(new OpenViduError(errorName, errorMessage));
                        break;
                    case 'overconstrainederror':
                        navigator.mediaDevices.getUserMedia({
                            audio: false,
                            video: constraints.video
                        })
                            .then(mediaStream => {
                                mediaStream.getVideoTracks().forEach((track) => {
                                    track.stop();
                                });
                                if (error.constraint.toLowerCase() === 'deviceid') {
                                    errorName = OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                    errorMessage = "Audio input device with deviceId '" + (<ConstrainDOMStringParameters>(<MediaTrackConstraints>constraints.audio).deviceId!!).exact + "' not found";
                                } else {
                                    errorName = OpenViduErrorName.PUBLISHER_PROPERTIES_ERROR;
                                    errorMessage = "Audio input device doesn't support the value passed for constraint '" + error.constraint + "'";
                                }
                                errorCallback(new OpenViduError(errorName, errorMessage));
                            }).catch(e => {
                                if (error.constraint.toLowerCase() === 'deviceid') {
                                    errorName = OpenViduErrorName.INPUT_VIDEO_DEVICE_NOT_FOUND;
                                    errorMessage = "Video input device with deviceId '" + (<ConstrainDOMStringParameters>(<MediaTrackConstraints>constraints.video).deviceId!!).exact + "' not found";
                                } else {
                                    errorName = OpenViduErrorName.PUBLISHER_PROPERTIES_ERROR;
                                    errorMessage = "Video input device doesn't support the value passed for constraint '" + error.constraint + "'";
                                }
                                errorCallback(new OpenViduError(errorName, errorMessage));
                            });
                        break;
                    case 'aborterror':
                    case 'notreadableerror':
                        errorName = OpenViduErrorName.DEVICE_ALREADY_IN_USE;
                        errorMessage = error.toString();
                        errorCallback(new OpenViduError(errorName, errorMessage));
                        break;
                    default:
                        errorName = OpenViduErrorName.GENERIC_ERROR;
                        errorMessage = error.toString();
                        errorCallback(new OpenViduError(errorName, errorMessage));
                        break;
                }
            }

            // Check if new constraints need to be generated. No constraints needed if
            // - video track is given and no audio
            // - audio track is given and no video
            // - both video and audio tracks are given
            if ((typeof MediaStreamTrack !== 'undefined' && this.properties.videoSource instanceof MediaStreamTrack && !this.properties.audioSource)
                || (typeof MediaStreamTrack !== 'undefined' && this.properties.audioSource instanceof MediaStreamTrack && !this.properties.videoSource)
                || (typeof MediaStreamTrack !== 'undefined' && this.properties.videoSource instanceof MediaStreamTrack && this.properties.audioSource instanceof MediaStreamTrack)) {
                const mediaStream = new MediaStream();
                if (typeof MediaStreamTrack !== 'undefined' && this.properties.videoSource instanceof MediaStreamTrack) {
                    mediaStream.addTrack((<MediaStreamTrack>this.properties.videoSource));
                }
                if (typeof MediaStreamTrack !== 'undefined' && this.properties.audioSource instanceof MediaStreamTrack) {
                    mediaStream.addTrack((<MediaStreamTrack>this.properties.audioSource));
                }
                // MediaStreamTracks are handled within callback - just call callback with new MediaStream() and let it handle the sources
                successCallback(mediaStream);
                // Return as we do not need to process further
                return;
            }

            this.openvidu.generateMediaConstraints(this.properties)
                .then(myConstraints => {

                    constraints = myConstraints;

                    const outboundStreamOptions = {
                        mediaConstraints: constraints,
                        publisherProperties: this.properties
                    };

                    this.stream.setOutboundStreamOptions(outboundStreamOptions);

                    if (this.stream.isSendVideo() || this.stream.isSendAudio()) {
                        const definedAudioConstraint = ((constraints.audio === undefined) ? true : constraints.audio);
                        constraintsAux.audio = this.stream.isSendScreen() ? false : definedAudioConstraint;
                        constraintsAux.video = constraints.video;
                        startTime = Date.now();
                        this.setPermissionDialogTimer(timeForDialogEvent);

                        if (this.stream.isSendScreen() && navigator.mediaDevices['getDisplayMedia'] && platform.name !== 'Electron') {

                            navigator.mediaDevices['getDisplayMedia']({ video: true })
                                .then(mediaStream => {
                                    getMediaSuccess(mediaStream, definedAudioConstraint);
                                })
                                .catch(error => {
                                    getMediaError(error);
                                });

                        } else {

                            navigator.mediaDevices.getUserMedia(constraintsAux)
                                .then(mediaStream => {
                                    getMediaSuccess(mediaStream, definedAudioConstraint);
                                })
                                .catch(error => {
                                    getMediaError(error);
                                });

                        }
                    } else {
                        reject(new OpenViduError(OpenViduErrorName.NO_INPUT_SOURCE_SET,
                            "Properties 'audioSource' and 'videoSource' cannot be set to false or null at the same time when calling 'OpenVidu.initPublisher'"));
                    }
                })
                .catch((error: OpenViduError) => {
                    errorCallback(error);
                });
        });
    }

    /**
     * @hidden
     */
    reestablishStreamPlayingEvent() {
        if (this.ee.getListeners('streamPlaying').length > 0) {
            this.addPlayEventToFirstVideo();
        }
    }


    /* Private methods */

    private setPermissionDialogTimer(waitTime: number): void {
        this.permissionDialogTimeout = setTimeout(() => {
            this.emitEvent('accessDialogOpened', []);
        }, waitTime);
    }

    private clearPermissionDialogTimer(startTime: number, waitTime: number): void {
        clearTimeout(this.permissionDialogTimeout);
        if ((Date.now() - startTime) > waitTime) {
            // Permission dialog was shown and now is closed
            this.emitEvent('accessDialogClosed', []);
        }
    }

}