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

import { OpenVidu, Session, Stream, VideoInsertMode } from '..';
import { EventDispatcher } from '../OpenViduInternal/Interfaces/Public/EventDispatcher';
import { PublisherProperties } from '../OpenViduInternal/Interfaces/Public/PublisherProperties';
import { InboundStreamOptions } from '../OpenViduInternal/Interfaces/Private/InboundStreamOptions';
import { OutboundStreamOptions } from '../OpenViduInternal/Interfaces/Private/OutboundStreamOptions';
import { StreamEvent } from '../OpenViduInternal/Events/StreamEvent';
import { VideoElementEvent } from '../OpenViduInternal/Events/VideoElementEvent';
import { OpenViduError, OpenViduErrorName } from '../OpenViduInternal/Enums/OpenViduError';

import EventEmitter = require('wolfy87-eventemitter');


/**
 * Packs local media streams. Participants can publish it to a session. Initialized with [[OpenVidu.initPublisher]] method
 */
export class Publisher implements EventDispatcher {

    /**
     * Whether the Publisher has been granted access to the requested input devices or not
     */
    accessAllowed = false;

    /**
     * HTML DOM element in which the Publisher's video has been inserted
     */
    element: HTMLElement;

    /**
     * DOM id of the Publisher's video element
     */
    id: string;

    /**
     * The [[Session]] to which the Publisher belongs
     */
    session: Session; // Initialized by Session.publish(Publisher)

    /**
     * The [[Stream]] that you are publishing
     */
    stream: Stream;

    private ee = new EventEmitter();

    private properties: PublisherProperties;
    private permissionDialogTimeout: NodeJS.Timer;

    /**
     * @hidden
     */
    constructor(targetElement: string | HTMLElement, properties: PublisherProperties, private openvidu: OpenVidu) {
        this.properties = properties;
        this.stream = new Stream(this.session, { publisherProperties: properties, mediaConstraints: {} });

        this.stream.on('video-removed', (element: HTMLVideoElement) => {
            this.ee.emitEvent('videoElementDestroyed', [new VideoElementEvent(element, this, 'videoElementDestroyed')]);
        });

        this.stream.on('stream-destroyed-by-disconnect', (reason: string) => {
            const streamEvent = new StreamEvent(true, this, 'streamDestroyed', this.stream, reason);
            this.ee.emitEvent('streamDestroyed', [streamEvent]);
            streamEvent.callDefaultBehaviour();
        });

        if (typeof targetElement === 'string') {
            const e = document.getElementById(targetElement);
            if (!!e) {
                this.element = e;
            }
        } else if (targetElement instanceof HTMLElement) {
            this.element = targetElement;
        }

        if (!this.element) {
            console.warn("The provided 'targetElement' for the Publisher couldn't be resolved to any HTML element: " + targetElement);
        }
    }

    /**
     * Publish or unpublish the audio stream (if available). Calling this method twice in a row passing same value will have no effect
     * @param value `true` to publish the audio stream, `false` to unpublish it
     */
    publishAudio(value: boolean): void {
        this.stream.getWebRtcPeer().audioEnabled = value;
        console.info("'Publisher' has " + (value ? 'published' : 'unpublished') + ' its audio stream');
    }

    /**
     * Publish or unpublish the video stream (if available). Calling this method twice in a row passing same value will have no effect
     * @param value `true` to publish the video stream, `false` to unpublish it
     */
    publishVideo(value: boolean): void {
        this.stream.getWebRtcPeer().videoEnabled = value;
        console.info("'Publisher' has " + (value ? 'published' : 'unpublished') + ' its video stream');
    }

    /**
     * Call this method before [[Session.publish]] to subscribe to your Publisher's stream as any other user would do. The local video will be automatically replaced by the remote video
     */
    subscribeToRemote(): void {
        this.stream.subscribeToMyRemote();
    }


    /**
     * See [[EventDispatcher.on]]
     */
    on(type: string, handler: (event: StreamEvent | VideoElementEvent) => void): EventDispatcher {
        this.ee.on(type, event => {
            if (event) {
                console.info("Event '" + type + "' triggered by 'Publisher'", event);
            } else {
                console.info("Event '" + type + "' triggered by 'Publisher'");
            }
            handler(event);
        });

        if (type === 'streamCreated') {
            if (!!this.stream && this.stream.isPublisherPublished) {
                this.ee.emitEvent('streamCreated', [new StreamEvent(false, this, 'streamCreated', this.stream, '')]);
            } else {
                this.stream.on('stream-created-by-publisher', () => {
                    this.ee.emitEvent('streamCreated', [new StreamEvent(false, this, 'streamCreated', this.stream, '')]);
                });
            }
        }
        if (type === 'videoElementCreated') {
            if (!!this.stream && this.stream.isVideoELementCreated) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent(this.stream.getVideoElement(), this, 'videoElementCreated')]);
            } else {
                this.stream.on('video-element-created-by-stream', (element) => {
                    this.id = element.id;
                    this.ee.emitEvent('videoElementCreated', [new VideoElementEvent(element.element, this, 'videoElementCreated')]);
                });
            }
        }
        if (type === 'videoPlaying') {
            const video = this.stream.getVideoElement();
            if (!this.stream.displayMyRemote() && video &&
                video.currentTime > 0 &&
                video.paused === false &&
                video.ended === false &&
                video.readyState === 4) {
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent(this.stream.getVideoElement(), this, 'videoPlaying')]);
            } else {
                this.stream.on('video-is-playing', (element) => {
                    this.ee.emitEvent('videoPlaying', [new VideoElementEvent(element.element, this, 'videoPlaying')]);
                });
            }
        }
        if (type === 'remoteVideoPlaying') {
            const video = this.stream.getVideoElement();
            if (this.stream.displayMyRemote() && video &&
                video.currentTime > 0 &&
                video.paused === false &&
                video.ended === false &&
                video.readyState === 4) {
                this.ee.emitEvent('remoteVideoPlaying', [new VideoElementEvent(this.stream.getVideoElement(), this, 'remoteVideoPlaying')]);
            } else {
                this.stream.on('remote-video-is-playing', (element) => {
                    this.ee.emitEvent('remoteVideoPlaying', [new VideoElementEvent(element.element, this, 'remoteVideoPlaying')]);
                });
            }
        }
        if (type === 'accessAllowed') {
            if (this.stream.accessIsAllowed) {
                this.ee.emitEvent('accessAllowed');
            }
        }
        if (type === 'accessDenied') {
            if (this.stream.accessIsDenied) {
                this.ee.emitEvent('accessDenied');
            }
        }

        return this;
    }


    /**
     * See [[EventDispatcher.once]]
     */
    once(type: string, handler: (event: StreamEvent | VideoElementEvent) => void): Publisher {
        this.ee.once(type, event => {
            if (event) {
                console.info("Event '" + type + "' triggered by 'Publisher'", event);
            } else {
                console.info("Event '" + type + "' triggered by 'Publisher'");
            }
            handler(event);
        });

        if (type === 'streamCreated') {
            if (!!this.stream && this.stream.isPublisherPublished) {
                this.ee.emitEvent('streamCreated', [new StreamEvent(false, this, 'streamCreated', this.stream, '')]);
            } else {
                this.stream.once('stream-created-by-publisher', () => {
                    this.ee.emitEvent('streamCreated', [new StreamEvent(false, this, 'streamCreated', this.stream, '')]);
                });
            }
        }
        if (type === 'videoElementCreated') {
            if (!!this.stream && this.stream.isVideoELementCreated) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent(this.stream.getVideoElement(), this, 'videoElementCreated')]);
            } else {
                this.stream.once('video-element-created-by-stream', (element) => {
                    this.id = element.id;
                    this.ee.emitEvent('videoElementCreated', [new VideoElementEvent(element.element, this, 'videoElementCreated')]);
                });
            }
        }
        if (type === 'videoPlaying') {
            const video = this.stream.getVideoElement();
            if (!this.stream.displayMyRemote() && video &&
                video.currentTime > 0 &&
                video.paused === false &&
                video.ended === false &&
                video.readyState === 4) {
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent(this.stream.getVideoElement(), this, 'videoPlaying')]);
            } else {
                this.stream.once('video-is-playing', (element) => {
                    this.ee.emitEvent('videoPlaying', [new VideoElementEvent(element.element, this, 'videoPlaying')]);
                });
            }
        }
        if (type === 'remoteVideoPlaying') {
            const video = this.stream.getVideoElement();
            if (this.stream.displayMyRemote() && video &&
                video.currentTime > 0 &&
                video.paused === false &&
                video.ended === false &&
                video.readyState === 4) {
                this.ee.emitEvent('remoteVideoPlaying', [new VideoElementEvent(this.stream.getVideoElement(), this, 'remoteVideoPlaying')]);
            } else {
                this.stream.once('remote-video-is-playing', (element) => {
                    this.ee.emitEvent('remoteVideoPlaying', [new VideoElementEvent(element.element, this, 'remoteVideoPlaying')]);
                });
            }
        }
        if (type === 'accessAllowed') {
            if (this.stream.accessIsAllowed) {
                this.ee.emitEvent('accessAllowed');
            }
        }
        if (type === 'accessDenied') {
            if (this.stream.accessIsDenied) {
                this.ee.emitEvent('accessDenied');
            }
        }

        return this;
    }


    /**
     * See [[EventDispatcher.off]]
     */
    off(type: string, handler?: (event: StreamEvent | VideoElementEvent) => void): Publisher {
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
    initialize(): Promise<any> {
        return new Promise((resolve, reject) => {

            const errorCallback = (openViduError: OpenViduError) => {
                this.stream.accessIsDenied = true;
                this.stream.accessIsAllowed = false;
                reject(openViduError);
            };

            const successCallback = (mediaStream: MediaStream) => {
                this.stream.accessIsAllowed = true;
                this.stream.accessIsDenied = false;

                if (this.openvidu.isMediaStreamTrack(this.properties.audioSource)) {
                    mediaStream.removeTrack(mediaStream.getAudioTracks()[0]);
                    mediaStream.addTrack((<MediaStreamTrack>this.properties.audioSource));
                }

                if (this.openvidu.isMediaStreamTrack(this.properties.videoSource)) {
                    mediaStream.removeTrack(mediaStream.getVideoTracks()[0]);
                    mediaStream.addTrack((<MediaStreamTrack>this.properties.videoSource));
                }

                // Apply PublisherProperties.publishAudio and PublisherProperties.publishVideo
                if (!!mediaStream.getAudioTracks()[0]) {
                    mediaStream.getAudioTracks()[0].enabled = !!this.stream.outboundStreamOpts.publisherProperties.publishAudio;
                }
                if (!!mediaStream.getVideoTracks()[0]) {
                    mediaStream.getVideoTracks()[0].enabled = !!this.stream.outboundStreamOpts.publisherProperties.publishVideo;
                }

                this.stream.setMediaStream(mediaStream);
                this.stream.insertVideo(this.element, <VideoInsertMode>this.properties.insertMode);

                resolve();
            };

            this.openvidu.generateMediaConstraints(this.properties)
                .then(constraints => {

                    const outboundStreamOptions = {
                        mediaConstraints: constraints,
                        publisherProperties: this.properties
                    };

                    this.stream.setOutboundStreamOptions(outboundStreamOptions);

                    // Ask independently for audio stream and video stream. If the user asks for both of them and one is blocked, the method still
                    // success only with the allowed input. This is not the desierd behaviour: if any of them is blocked, access should be denied
                    const constraintsAux: MediaStreamConstraints = {};
                    const timeForDialogEvent = 1250;

                    if (this.stream.isSendVideo()) {

                        constraintsAux.audio = false;
                        constraintsAux.video = constraints.video;

                        let startTime = Date.now();
                        this.setPermissionDialogTimer(timeForDialogEvent);

                        navigator.mediaDevices.getUserMedia(constraintsAux)
                            .then(videoOnlyStream => {
                                this.clearPermissionDialogTimer(startTime, timeForDialogEvent);

                                if (this.stream.isSendAudio()) {

                                    constraintsAux.audio = (constraints.audio === undefined) ? true : constraints.audio;
                                    constraintsAux.video = false;

                                    startTime = Date.now();
                                    this.setPermissionDialogTimer(timeForDialogEvent);

                                    navigator.mediaDevices.getUserMedia(constraintsAux)
                                        .then(audioOnlyStream => {
                                            this.clearPermissionDialogTimer(startTime, timeForDialogEvent);

                                            videoOnlyStream.addTrack(audioOnlyStream.getAudioTracks()[0]);
                                            successCallback(videoOnlyStream);
                                        })
                                        .catch(error => {
                                            this.clearPermissionDialogTimer(startTime, timeForDialogEvent);

                                            videoOnlyStream.getVideoTracks().forEach((track) => {
                                                track.stop();
                                            });
                                            let errorName;
                                            let errorMessage;
                                            switch (error.name.toLowerCase()) {
                                                case 'notfounderror':
                                                    errorName = OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                                    errorMessage = error.toString();
                                                    break;
                                                case 'notallowederror':
                                                    errorName = OpenViduErrorName.MICROPHONE_ACCESS_DENIED;
                                                    errorMessage = error.toString();
                                                    break;
                                                case 'overconstrainederror':
                                                    if (error.constraint.toLowerCase() === 'deviceid') {
                                                        errorName = OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                                        errorMessage = "Audio input device with deviceId '" + (<ConstrainDOMStringParameters>(<MediaTrackConstraints>constraints.audio).deviceId!!).exact + "' not found";
                                                    } else {
                                                        errorName = OpenViduErrorName.PUBLISHER_PROPERTIES_ERROR;
                                                        errorMessage = "Audio input device doesn't support the value passed for constraint '" + error.constraint + "'";
                                                    }
                                            }
                                            errorCallback(new OpenViduError(errorName, errorMessage));
                                        });
                                } else {
                                    successCallback(videoOnlyStream);
                                }
                            })
                            .catch(error => {
                                this.clearPermissionDialogTimer(startTime, timeForDialogEvent);

                                let errorName;
                                let errorMessage;
                                switch (error.name.toLowerCase()) {
                                    case 'notfounderror':
                                        errorName = OpenViduErrorName.INPUT_VIDEO_DEVICE_NOT_FOUND;
                                        errorMessage = error.toString();
                                        break;
                                    case 'notallowederror':
                                        errorName = this.stream.isSendScreen() ? OpenViduErrorName.SCREEN_CAPTURE_DENIED : OpenViduErrorName.CAMERA_ACCESS_DENIED;
                                        errorMessage = error.toString();
                                        break;
                                    case 'overconstrainederror':
                                        if (error.constraint.toLowerCase() === 'deviceid') {
                                            errorName = OpenViduErrorName.INPUT_VIDEO_DEVICE_NOT_FOUND;
                                            errorMessage = "Video input device with deviceId '" + (<ConstrainDOMStringParameters>(<MediaTrackConstraints>constraints.video).deviceId!!).exact + "' not found";
                                        } else {
                                            errorName = OpenViduErrorName.PUBLISHER_PROPERTIES_ERROR;
                                            errorMessage = "Video input device doesn't support the value passed for constraint '" + error.constraint + "'";
                                        }
                                }
                                errorCallback(new OpenViduError(errorName, errorMessage));
                            });

                    } else if (this.stream.isSendAudio()) {

                        constraintsAux.audio = (constraints.audio === undefined) ? true : constraints.audio;
                        constraintsAux.video = false;

                        const startTime = Date.now();
                        this.setPermissionDialogTimer(timeForDialogEvent);

                        navigator.mediaDevices.getUserMedia(constraints)
                            .then(audioOnlyStream => {
                                this.clearPermissionDialogTimer(startTime, timeForDialogEvent);

                                successCallback(audioOnlyStream);
                            })
                            .catch(error => {
                                this.clearPermissionDialogTimer(startTime, timeForDialogEvent);

                                let errorName;
                                let errorMessage;
                                switch (error.name.toLowerCase()) {
                                    case 'notfounderror':
                                        errorName = OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                        errorMessage = error.toString();
                                        break;
                                    case 'notallowederror':
                                        errorName = OpenViduErrorName.MICROPHONE_ACCESS_DENIED;
                                        errorMessage = error.toString();
                                        break;
                                    case 'overconstrainederror':
                                        if (error.constraint.toLowerCase() === 'deviceid') {
                                            errorName = OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                            errorMessage = "Audio input device with deviceId '" + (<ConstrainDOMStringParameters>(<MediaTrackConstraints>constraints.audio).deviceId!!).exact + "' not found";
                                        } else {
                                            errorName = OpenViduErrorName.PUBLISHER_PROPERTIES_ERROR;
                                            errorMessage = "Audio input device doesn't support the value passed for constraint '" + error.constraint + "'";
                                        }
                                }
                                errorCallback(new OpenViduError(errorName, errorMessage));
                            });
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
    updateSession(session: Session): void {
        this.session = session;
        this.stream.session = session;
    }

    /**
     * @hidden
     */
    emitEvent(type: string, eventArray: any[]): void {
        this.ee.emitEvent(type, eventArray);
    }


    /* Private methods */

    private setPermissionDialogTimer(waitTime: number): void {
        this.permissionDialogTimeout = setTimeout(() => {
            this.ee.emitEvent('accessDialogOpened', []);
        }, waitTime);
    }

    private clearPermissionDialogTimer(startTime: number, waitTime: number): void {
        clearTimeout(this.permissionDialogTimeout);
        if ((Date.now() - startTime) > waitTime) {
            // Permission dialog was shown and now is closed
            this.ee.emitEvent('accessDialogClosed', []);
        }
    }


    /* Private methods */

    private userMediaHasVideo(callback): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            // If the user is going to publish its screen there's a video source
            if ((typeof this.properties.videoSource === 'string') && this.properties.videoSource === 'screen') {
                resolve(true);
            } else {
                this.openvidu.getDevices()
                    .then(devices => {
                        resolve(
                            !!(devices.filter((device) => {
                                return device.kind === 'videoinput';
                            })[0]));
                    })
                    .catch(error => {
                        reject(error);
                    });
            }
        });
    }

    private userMediaHasAudio(callback): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.openvidu.getDevices()
                .then(devices => {
                    resolve(
                        !!(devices.filter((device) => {
                            return device.kind === 'audioinput';
                        })[0]));
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

}