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

import { MediaManager } from './MediaManager';
import { OpenVidu } from './OpenVidu';
import { Session } from './Session';
import { Stream } from './Stream';
import { EventDispatcher } from '../OpenViduInternal/Interfaces/Public/EventDispatcher';
import { PublisherProperties } from '../OpenViduInternal/Interfaces/Public/PublisherProperties';
import { InboundStreamOptions } from '../OpenViduInternal/Interfaces/Private/InboundStreamOptions';
import { OutboundStreamOptions } from '../OpenViduInternal/Interfaces/Private/OutboundStreamOptions';
import { Event } from '../OpenViduInternal/Events/Event';
import { StreamEvent } from '../OpenViduInternal/Events/StreamEvent';
import { VideoElementEvent } from '../OpenViduInternal/Events/VideoElementEvent';
import { OpenViduError, OpenViduErrorName } from '../OpenViduInternal/Enums/OpenViduError';
import { VideoInsertMode } from '../OpenViduInternal/Enums/VideoInsertMode';


/**
 * Packs local media streams. Participants can publish it to a session. Initialized with [[OpenVidu.initPublisher]] method
 */
export class Publisher extends MediaManager {

    /**
     * Whether the Publisher has been granted access to the requested input devices or not
     */
    accessAllowed = false;

    /**
     * The [[Session]] to which the Publisher belongs
     */
    session: Session; // Initialized by Session.publish(Publisher)

    /**
     * @hidden
     */
    accessDenied = false;

    private element?: HTMLElement;
    private properties: PublisherProperties;
    private permissionDialogTimeout: NodeJS.Timer;

    /**
     * @hidden
     */
    constructor(targEl: string | HTMLElement, properties: PublisherProperties, private openvidu: OpenVidu) {
        super(new Stream(new Session(openvidu), { publisherProperties: properties, mediaConstraints: {} }), targEl);
        this.properties = properties;

        this.stream.on('local-stream-destroyed-by-disconnect', (reason: string) => {
            const streamEvent = new StreamEvent(true, this, 'streamDestroyed', this.stream, reason);
            this.ee.emitEvent('streamDestroyed', [streamEvent]);
            streamEvent.callDefaultBehaviour();
        });
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
    on(type: string, handler: (event: Event) => void): EventDispatcher {
        super.on(type, handler);
        if (type === 'streamCreated') {
            if (!!this.stream && this.stream.isLocalStreamPublished) {
                this.ee.emitEvent('streamCreated', [new StreamEvent(false, this, 'streamCreated', this.stream, '')]);
            } else {
                this.stream.on('stream-created-by-publisher', () => {
                    this.ee.emitEvent('streamCreated', [new StreamEvent(false, this, 'streamCreated', this.stream, '')]);
                });
            }
        }
        if (type === 'remoteVideoPlaying') {
            if (this.stream.displayMyRemote() && this.video &&
                this.video.currentTime > 0 &&
                this.video.paused === false &&
                this.video.ended === false &&
                this.video.readyState === 4) {
                this.ee.emitEvent('remoteVideoPlaying', [new VideoElementEvent(this.video, this, 'remoteVideoPlaying')]);
            } else {
                this.stream.on('remote-video-is-playing', (element) => {
                    this.ee.emitEvent('remoteVideoPlaying', [new VideoElementEvent(element.element, this, 'remoteVideoPlaying')]);
                });
            }
        }
        if (type === 'accessAllowed') {
            if (this.accessAllowed) {
                this.ee.emitEvent('accessAllowed');
            }
        }
        if (type === 'accessDenied') {
            if (this.accessDenied) {
                this.ee.emitEvent('accessDenied');
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
                this.ee.emitEvent('streamCreated', [new StreamEvent(false, this, 'streamCreated', this.stream, '')]);
            } else {
                this.stream.once('stream-created-by-publisher', () => {
                    this.ee.emitEvent('streamCreated', [new StreamEvent(false, this, 'streamCreated', this.stream, '')]);
                });
            }
        }
        if (type === 'remoteVideoPlaying') {
            if (this.stream.displayMyRemote() && this.video &&
                this.video.currentTime > 0 &&
                this.video.paused === false &&
                this.video.ended === false &&
                this.video.readyState === 4) {
                this.ee.emitEvent('remoteVideoPlaying', [new VideoElementEvent(this.video, this, 'remoteVideoPlaying')]);
            } else {
                this.stream.once('remote-video-is-playing', (element) => {
                    this.ee.emitEvent('remoteVideoPlaying', [new VideoElementEvent(element.element, this, 'remoteVideoPlaying')]);
                });
            }
        }
        if (type === 'accessAllowed') {
            if (this.accessAllowed) {
                this.ee.emitEvent('accessAllowed');
            }
        }
        if (type === 'accessDenied') {
            if (this.accessDenied) {
                this.ee.emitEvent('accessDenied');
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

            const errorCallback = (openViduError: OpenViduError) => {
                this.accessDenied = true;
                this.accessAllowed = false;
                reject(openViduError);
            };

            const successCallback = (mediaStream: MediaStream) => {
                this.accessAllowed = true;
                this.accessDenied = false;

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
                this.insertVideo(this.targetElement, <VideoInsertMode>this.properties.insertMode);

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