/*
 * (C) Copyright 2017-2022 OpenVidu (https://openvidu.io)
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
import { PublisherProperties } from '../OpenViduInternal/Interfaces/Public/PublisherProperties';
import { PublisherEventMap } from '../OpenViduInternal/Events/EventMap/PublisherEventMap';
import { StreamEvent } from '../OpenViduInternal/Events/StreamEvent';
import { StreamPropertyChangedEvent } from '../OpenViduInternal/Events/StreamPropertyChangedEvent';
import { OpenViduError, OpenViduErrorName } from '../OpenViduInternal/Enums/OpenViduError';
import { VideoInsertMode } from '../OpenViduInternal/Enums/VideoInsertMode';
import { OpenViduLogger } from '../OpenViduInternal/Logger/OpenViduLogger';
import { PlatformUtils } from '../OpenViduInternal/Utils/Platform';
import { TypeOfVideo } from '../OpenViduInternal/Enums/TypeOfVideo';
import { StreamEventReason } from '../OpenViduInternal/Events/Types/Types';

/**
 * @hidden
 */
const logger: OpenViduLogger = OpenViduLogger.getInstance();

/**
 * @hidden
 */
let platform: PlatformUtils;

/**
 * Packs local media streams. Participants can publish it to a session. Initialized with {@link OpenVidu.initPublisher} method.
 *
 * See available event listeners at {@link PublisherEventMap}.
 */
export class Publisher extends StreamManager {
    /**
     * Whether the Publisher has been granted access to the requested input devices or not
     */
    accessAllowed = false;

    /**
     * Whether you have called {@link Publisher.subscribeToRemote} with value `true` or `false` (*false* by default)
     */
    isSubscribedToRemote = false;

    /**
     * The {@link Session} to which the Publisher belongs
     */
    session: Session; // Initialized by Session.publish(Publisher)

    private accessDenied = false;
    protected properties: PublisherProperties;
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
    constructor(targEl: string | HTMLElement | undefined, properties: PublisherProperties, openvidu: OpenVidu) {
        super(
            new Stream(!!openvidu.session ? openvidu.session : new Session(openvidu), {
                publisherProperties: properties,
                mediaConstraints: {}
            }),
            targEl
        );
        platform = PlatformUtils.getInstance();
        this.properties = properties;
        this.openvidu = openvidu;

        this.stream.ee.on('local-stream-destroyed', (reason: StreamEventReason) => {
            this.stream.isLocalStreamPublished = false;
            const streamEvent = new StreamEvent(true, this, 'streamDestroyed', this.stream, reason);
            this.emitEvent('streamDestroyed', [streamEvent]);
            streamEvent.callDefaultBehavior();
        });
    }

    /**
     * Publish or unpublish the audio stream (if available). Calling this method twice in a row passing same `enabled` value will have no effect
     *
     * #### Events dispatched
     *
     * > _Only if `Session.publish(Publisher)` has been called for this Publisher_
     *
     * The {@link Session} object of the local participant will dispatch a `streamPropertyChanged` event with `changedProperty` set to `"audioActive"` and `reason` set to `"publishAudio"`
     * The {@link Publisher} object of the local participant will also dispatch the exact same event
     *
     * The {@link Session} object of every other participant connected to the session will dispatch a `streamPropertyChanged` event with `changedProperty` set to `"audioActive"` and `reason` set to `"publishAudio"`
     * The respective {@link Subscriber} object of every other participant receiving this Publisher's stream will also dispatch the exact same event
     *
     * See {@link StreamPropertyChangedEvent} to learn more.
     *
     * @param enabled `true` to publish the audio stream, `false` to unpublish it
     */
    publishAudio(enabled: boolean): void {
        if (this.stream.audioActive !== enabled) {
            const affectedMediaStream: MediaStream = this.stream.displayMyRemote()
                ? this.stream.localMediaStreamWhenSubscribedToRemote!
                : this.stream.getMediaStream();
            affectedMediaStream.getAudioTracks().forEach((track) => {
                track.enabled = enabled;
            });
            if (!!this.session && !!this.stream.streamId) {
                this.session.openvidu.sendRequest(
                    'streamPropertyChanged',
                    {
                        streamId: this.stream.streamId,
                        property: 'audioActive',
                        newValue: enabled,
                        reason: 'publishAudio'
                    },
                    (error, response) => {
                        if (error) {
                            logger.error("Error sending 'streamPropertyChanged' event", error);
                        } else {
                            this.session.emitEvent('streamPropertyChanged', [
                                new StreamPropertyChangedEvent(this.session, this.stream, 'audioActive', enabled, !enabled, 'publishAudio')
                            ]);
                            this.emitEvent('streamPropertyChanged', [
                                new StreamPropertyChangedEvent(this, this.stream, 'audioActive', enabled, !enabled, 'publishAudio')
                            ]);
                            this.session.sendVideoData(this.stream.streamManager);
                        }
                    }
                );
            }
            this.stream.audioActive = enabled;
            logger.info("'Publisher' has " + (enabled ? 'published' : 'unpublished') + ' its audio stream');
        }
    }

    /**
     * Publish or unpublish the video stream (if available). Calling this method twice in a row passing same `enabled` value will have no effect
     *
     * #### Events dispatched
     *
     * > _Only if `Session.publish(Publisher)` has been called for this Publisher_
     *
     * The {@link Session} object of the local participant will dispatch a `streamPropertyChanged` event with `changedProperty` set to `"videoActive"` and `reason` set to `"publishVideo"`
     * The {@link Publisher} object of the local participant will also dispatch the exact same event
     *
     * The {@link Session} object of every other participant connected to the session will dispatch a `streamPropertyChanged` event with `changedProperty` set to `"videoActive"` and `reason` set to `"publishVideo"`
     * The respective {@link Subscriber} object of every other participant receiving this Publisher's stream will also dispatch the exact same event
     *
     * See {@link StreamPropertyChangedEvent} to learn more.
     *
     * @param enabled `true` to publish the video stream, `false` to unpublish it
     * @param resource
     * 
     * If parameter **`enabled`** is `false`, this optional parameter is of type boolean. It can be set to `true` to forcibly free the hardware resource associated to the video track, or can be set to `false` to keep the access to the hardware resource.
     * Not freeing the resource makes the operation much more efficient, but depending on the platform two side-effects can be introduced: the video device may not be accessible by other applications and the access light of
     * webcams may remain on. This is platform-dependent: some browsers will not present the side-effects even when not freeing the resource.
     * 
     * If parameter **`enabled`** is `true`, this optional parameter is of type [MediaStreamTrack](https://developer.mozilla.org/docs/Web/API/MediaStreamTrack). It can be set to force the restoration of the video track with a custom track. This may be
     * useful if the Publisher was unpublished freeing the hardware resource, and openvidu-browser is not able to successfully re-create the video track as it was before unpublishing. In this way previous track settings will be ignored and this MediaStreamTrack
     * will be used instead.
     */
    publishVideo<T extends boolean>(enabled: T, resource?: T extends false ? boolean : MediaStreamTrack): Promise<void> {
        return new Promise(async (resolve, reject) => {
            if (this.stream.videoActive !== enabled) {
                const affectedMediaStream: MediaStream = this.stream.displayMyRemote()
                    ? this.stream.localMediaStreamWhenSubscribedToRemote!
                    : this.stream.getMediaStream();
                let mustRestartMediaStream = false;
                affectedMediaStream.getVideoTracks().forEach((track) => {
                    track.enabled = enabled;
                    if (!enabled && resource === true) {
                        track.stop();
                    } else if (enabled && track.readyState === 'ended') {
                        // Resource was freed
                        mustRestartMediaStream = true;
                    }
                });

                // There is a Virtual Background filter applied that must be removed in case the hardware must be freed
                if (!enabled && resource === true && !!this.stream.filter && this.stream.filter.type.startsWith('VB:')) {
                    this.stream.lastVBFilter = this.stream.filter; // Save the filter to be re-applied in case of unmute
                    await this.stream.removeFilterAux(true);
                }

                if (mustRestartMediaStream) {
                    const oldVideoTrack = affectedMediaStream.getVideoTracks()[0];
                    affectedMediaStream.removeTrack(oldVideoTrack);

                    const replaceVideoTrack = async (tr: MediaStreamTrack) => {
                        affectedMediaStream.addTrack(tr);
                        if (this.stream.isLocalStreamPublished) {
                            await this.replaceTrackInRtcRtpSender(tr);
                        }
                        if (!!this.stream.lastVBFilter) {
                            setTimeout(async () => {
                                let options = this.stream.lastVBFilter!.options;
                                const lastExecMethod = this.stream.lastVBFilter!.lastExecMethod;
                                if (!!lastExecMethod && lastExecMethod.method === 'update') {
                                    options = Object.assign({}, options, lastExecMethod.params);
                                }
                                await this.stream.applyFilter(this.stream.lastVBFilter!.type, options);
                                delete this.stream.lastVBFilter;
                            }, 1);
                        }
                    };

                    if (!!resource && resource instanceof MediaStreamTrack) {
                        await replaceVideoTrack(resource);
                    } else {
                        try {
                            const mediaStream = await navigator.mediaDevices.getUserMedia({
                                audio: false,
                                video: this.stream.lastVideoTrackConstraints
                            });
                            await replaceVideoTrack(mediaStream.getVideoTracks()[0]);
                        } catch (error) {
                            return reject(error);
                        }
                    }
                }

                if (!!this.session && !!this.stream.streamId) {
                    this.session.openvidu.sendRequest(
                        'streamPropertyChanged',
                        {
                            streamId: this.stream.streamId,
                            property: 'videoActive',
                            newValue: enabled,
                            reason: 'publishVideo'
                        },
                        (error, response) => {
                            if (error) {
                                logger.error("Error sending 'streamPropertyChanged' event", error);
                            } else {
                                this.session.emitEvent('streamPropertyChanged', [
                                    new StreamPropertyChangedEvent(
                                        this.session,
                                        this.stream,
                                        'videoActive',
                                        enabled,
                                        !enabled,
                                        'publishVideo'
                                    )
                                ]);
                                this.emitEvent('streamPropertyChanged', [
                                    new StreamPropertyChangedEvent(this, this.stream, 'videoActive', enabled, !enabled, 'publishVideo')
                                ]);
                                this.session.sendVideoData(this.stream.streamManager);
                            }
                        }
                    );
                }
                this.stream.videoActive = enabled;
                logger.info("'Publisher' has " + (enabled ? 'published' : 'unpublished') + ' its video stream');
                return resolve();
            }
        });
    }

    /**
     * Call this method before {@link Session.publish} if you prefer to subscribe to your Publisher's remote stream instead of using the local stream, as any other user would do.
     */
    subscribeToRemote(value?: boolean): void {
        value = value !== undefined ? value : true;
        this.isSubscribedToRemote = value;
        this.stream.subscribeToMyRemote(value);
    }

    /**
     * See {@link EventDispatcher.on}
     */
    on<K extends keyof PublisherEventMap>(type: K, handler: (event: PublisherEventMap[K]) => void): this {
        super.on(<any>type, handler);

        if (type === 'streamCreated') {
            if (!!this.stream && this.stream.isLocalStreamPublished) {
                this.emitEvent('streamCreated', [new StreamEvent(false, this, 'streamCreated', this.stream, '')]);
            } else {
                this.stream.ee.on('stream-created-by-publisher', () => {
                    this.emitEvent('streamCreated', [new StreamEvent(false, this, 'streamCreated', this.stream, '')]);
                });
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
     * See {@link EventDispatcher.once}
     */
    once<K extends keyof PublisherEventMap>(type: K, handler: (event: PublisherEventMap[K]) => void): this {
        super.once(<any>type, handler);

        if (type === 'streamCreated') {
            if (!!this.stream && this.stream.isLocalStreamPublished) {
                this.emitEvent('streamCreated', [new StreamEvent(false, this, 'streamCreated', this.stream, '')]);
            } else {
                this.stream.ee.once('stream-created-by-publisher', () => {
                    this.emitEvent('streamCreated', [new StreamEvent(false, this, 'streamCreated', this.stream, '')]);
                });
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
     * See {@link EventDispatcher.off}
     */
    off<K extends keyof PublisherEventMap>(type: K, handler?: (event: PublisherEventMap[K]) => void): this {
        super.off(<any>type, handler);
        return this;
    }

    /**
     * Replaces the current video or audio track with a different one. This allows you to replace an ongoing track with a different one
     * without having to renegotiate the whole WebRTC connection (that is, initializing a new Publisher, unpublishing the previous one
     * and publishing the new one).
     *
     * You can get this new MediaStreamTrack by using the native Web API or simply with {@link OpenVidu.getUserMedia} method.
     *
     * **WARNING: this method has been proven to work in the majority of cases, but there may be some combinations of published/replaced tracks that may be incompatible
     * between them and break the connection in OpenVidu Server. A complete renegotiation may be the only solution in this case.
     * Visit [RTCRtpSender.replaceTrack](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/replaceTrack) documentation for further details.**
     *
     * @param track The [MediaStreamTrack](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack) object to replace the current one.
     * If it is an audio track, the current audio track will be the replaced one. If it is a video track, the current video track will be the replaced one.
     *
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the track was successfully replaced and rejected with an Error object in other case
     */
    async replaceTrack(track: MediaStreamTrack): Promise<void> {
        return this.replaceTrackAux(track, true);
    }

    /* Hidden methods */

    /**
     * @hidden
     */
    initialize(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            let constraints: MediaStreamConstraints = {};
            let constraintsAux: MediaStreamConstraints = {};
            const timeForDialogEvent = 2000;
            let startTime;

            const errorCallback = (openViduError: OpenViduError) => {
                this.accessDenied = true;
                this.accessAllowed = false;
                logger.error(`Publisher initialization failed. ${openViduError.name}: ${openViduError.message}`);
                return reject(openViduError);
            };

            const successCallback = (mediaStream: MediaStream) => {
                this.accessAllowed = true;
                this.accessDenied = false;

                if (typeof MediaStreamTrack !== 'undefined' && this.properties.audioSource instanceof MediaStreamTrack) {
                    mediaStream.removeTrack(mediaStream.getAudioTracks()[0]);
                    mediaStream.addTrack(<MediaStreamTrack>this.properties.audioSource);
                }

                if (typeof MediaStreamTrack !== 'undefined' && this.properties.videoSource instanceof MediaStreamTrack) {
                    mediaStream.removeTrack(mediaStream.getVideoTracks()[0]);
                    mediaStream.addTrack(<MediaStreamTrack>this.properties.videoSource);
                }

                // Apply PublisherProperties.publishAudio and PublisherProperties.publishVideo
                if (!!mediaStream.getAudioTracks()[0]) {
                    const enabled =
                        this.stream.audioActive !== undefined && this.stream.audioActive !== null
                            ? this.stream.audioActive
                            : !!this.stream.outboundStreamOpts.publisherProperties.publishAudio;
                    mediaStream.getAudioTracks()[0].enabled = enabled;
                }
                if (!!mediaStream.getVideoTracks()[0]) {
                    const enabled =
                        this.stream.videoActive !== undefined && this.stream.videoActive !== null
                            ? this.stream.videoActive
                            : !!this.stream.outboundStreamOpts.publisherProperties.publishVideo;
                    mediaStream.getVideoTracks()[0].enabled = enabled;
                }

                // Set Content Hint on all MediaStreamTracks
                for (const track of mediaStream.getAudioTracks()) {
                    if (!track.contentHint?.length) {
                        // contentHint for audio: "", "speech", "speech-recognition", "music".
                        // https://w3c.github.io/mst-content-hint/#audio-content-hints
                        track.contentHint = '';
                        logger.info(`Audio track Content Hint set: '${track.contentHint}'`);
                    }
                }
                for (const track of mediaStream.getVideoTracks()) {
                    if (!track.contentHint?.length) {
                        // contentHint for video: "", "motion", "detail", "text".
                        // https://w3c.github.io/mst-content-hint/#video-content-hints
                        switch (this.stream.typeOfVideo) {
                            case TypeOfVideo.SCREEN:
                                track.contentHint = 'detail';
                                break;
                            case TypeOfVideo.CUSTOM:
                                logger.warn('CUSTOM type video track was provided without Content Hint!');
                                track.contentHint = 'motion';
                                break;
                            case TypeOfVideo.CAMERA:
                            case TypeOfVideo.IPCAM:
                            default:
                                track.contentHint = 'motion';
                                break;
                        }
                        logger.info(`Video track Content Hint set: '${track.contentHint}'`);
                    }
                }

                this.initializeVideoReference(mediaStream);

                if (!this.stream.displayMyRemote()) {
                    // When we are subscribed to our remote we don't still set the MediaStream object in the video elements to
                    // avoid early 'streamPlaying' event
                    this.stream.updateMediaStreamInVideos();
                }
                delete this.firstVideoElement;

                if (this.stream.isSendVideo()) {
                    // Has video track
                    this.getVideoDimensions().then((dimensions) => {
                        this.stream.videoDimensions = {
                            width: dimensions.width,
                            height: dimensions.height
                        };

                        if (this.stream.isSendScreen()) {

                            if(this.stream.isSendAudio() && mediaStream.getAudioTracks().length === 0){
                                // If sending audio is enabled and there are no audio tracks in the mediaStream, disable audio for screen sharing.
                                this.stream.audioActive = false;
                                this.stream.hasAudio = false;
                                this.stream.outboundStreamOpts.publisherProperties.publishAudio = false;
                                this.stream.outboundStreamOpts.publisherProperties.audioSource = false;
                            }

                            // Set interval to listen for screen resize events
                            this.screenShareResizeInterval = setInterval(() => {
                                const settings: MediaTrackSettings = mediaStream.getVideoTracks()[0].getSettings();
                                const newWidth = settings.width;
                                const newHeight = settings.height;
                                const widthChanged = newWidth != null && newWidth !== this.stream.videoDimensions.width;
                                const heightChanged = newHeight != null && newHeight !== this.stream.videoDimensions.height;
                                if (this.stream.isLocalStreamPublished && (widthChanged || heightChanged)) {
                                    this.openvidu.sendVideoDimensionsChangedEvent(
                                        this,
                                        'screenResized',
                                        this.stream.videoDimensions.width,
                                        this.stream.videoDimensions.height,
                                        newWidth || 0,
                                        newHeight || 0
                                    );
                                }
                            }, 650);
                        }

                        this.stream.isLocalStreamReadyToPublish = true;
                        this.stream.ee.emitEvent('stream-ready-to-publish', []);
                    });
                } else {
                    // Only audio track (no videoDimensions)
                    this.stream.isLocalStreamReadyToPublish = true;
                    this.stream.ee.emitEvent('stream-ready-to-publish', []);
                }

                return resolve();
            };

            const getMediaSuccess = async (mediaStream: MediaStream, definedAudioConstraint) => {
                this.clearPermissionDialogTimer(startTime, timeForDialogEvent);
                if (this.stream.isSendScreen() && this.properties.audioSource !== 'screen' && this.stream.isSendAudio()) {
                    // When getting desktop as user media audio constraint must be false. Now we can ask for it if required
                    constraintsAux.audio = definedAudioConstraint;
                    constraintsAux.video = false;
                    startTime = Date.now();
                    this.setPermissionDialogTimer(timeForDialogEvent);

                    try {
                        const audioOnlyStream = await navigator.mediaDevices.getUserMedia(constraintsAux);
                        this.clearPermissionDialogTimer(startTime, timeForDialogEvent);
                        mediaStream.addTrack(audioOnlyStream.getAudioTracks()[0]);
                        successCallback(mediaStream);
                    } catch (error) {
                        this.clearPermissionDialogTimer(startTime, timeForDialogEvent);
                        mediaStream.getAudioTracks().forEach((track) => {
                            track.stop();
                        });
                        mediaStream.getVideoTracks().forEach((track) => {
                            track.stop();
                        });
                        errorCallback(this.openvidu.generateAudioDeviceError(error, constraints));
                        return;
                    }
                } else {
                    successCallback(mediaStream);
                }
            };

            const getMediaError = async (error) => {
                logger.error(`getMediaError: ${error.toString()}`);
                this.clearPermissionDialogTimer(startTime, timeForDialogEvent);
                if (error.name === 'Error') {
                    // Safari OverConstrainedError has as name property 'Error' instead of 'OverConstrainedError'
                    error.name = error.constructor.name;
                }
                let errorName, errorMessage;
                switch (error.name.toLowerCase()) {
                    case 'notfounderror':
                        try {
                            const mediaStream = await navigator.mediaDevices.getUserMedia({
                                audio: false,
                                video: constraints.video
                            });
                            mediaStream.getVideoTracks().forEach((track) => {
                                track.stop();
                            });
                            errorName = OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                            errorMessage = error.toString();
                            errorCallback(new OpenViduError(errorName, errorMessage));
                        } catch (error) {
                            errorName = OpenViduErrorName.INPUT_VIDEO_DEVICE_NOT_FOUND;
                            errorMessage = error.toString();
                            errorCallback(new OpenViduError(errorName, errorMessage));
                        }

                        break;
                    case 'notallowederror':
                        errorName = this.stream.isSendScreen()
                            ? OpenViduErrorName.SCREEN_CAPTURE_DENIED
                            : OpenViduErrorName.DEVICE_ACCESS_DENIED;
                        errorMessage = error.toString();
                        errorCallback(new OpenViduError(errorName, errorMessage));
                        break;
                    case 'overconstrainederror':
                        try {
                            const mediaStream = await navigator.mediaDevices.getUserMedia({
                                audio: false,
                                video: constraints.video
                            });
                            mediaStream.getVideoTracks().forEach((track) => {
                                track.stop();
                            });
                            if (error.constraint.toLowerCase() === 'deviceid') {
                                errorName = OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                errorMessage =
                                    "Audio input device with deviceId '" +
                                    (<ConstrainDOMStringParameters>(<MediaTrackConstraints>constraints.audio).deviceId!!).exact +
                                    "' not found";
                            } else {
                                errorName = OpenViduErrorName.PUBLISHER_PROPERTIES_ERROR;
                                errorMessage =
                                    "Audio input device doesn't support the value passed for constraint '" + error.constraint + "'";
                            }
                            errorCallback(new OpenViduError(errorName, errorMessage));
                        } catch (error) {
                            if (error.constraint.toLowerCase() === 'deviceid') {
                                errorName = OpenViduErrorName.INPUT_VIDEO_DEVICE_NOT_FOUND;
                                errorMessage =
                                    "Video input device with deviceId '" +
                                    (<ConstrainDOMStringParameters>(<MediaTrackConstraints>constraints.video).deviceId!!).exact +
                                    "' not found";
                            } else {
                                errorName = OpenViduErrorName.PUBLISHER_PROPERTIES_ERROR;
                                errorMessage =
                                    "Video input device doesn't support the value passed for constraint '" + error.constraint + "'";
                            }
                            errorCallback(new OpenViduError(errorName, errorMessage));
                        }

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
            };

            try {
                const myConstraints = await this.openvidu.generateMediaConstraints(this.properties);
                if (
                    (!!myConstraints.videoTrack && !!myConstraints.audioTrack) ||
                    (!!myConstraints.audioTrack && myConstraints.constraints?.video === false) ||
                    (!!myConstraints.videoTrack && myConstraints.constraints?.audio === false)
                ) {
                    // No need to call getUserMedia at all. MediaStreamTracks already provided
                    successCallback(this.openvidu.addAlreadyProvidedTracks(myConstraints, new MediaStream(), this.stream));
                } else {
                    constraints = myConstraints.constraints;

                    const outboundStreamOptions = {
                        mediaConstraints: constraints,
                        publisherProperties: this.properties
                    };
                    this.stream.setOutboundStreamOptions(outboundStreamOptions);

                    const definedAudioConstraint = constraints.audio === undefined ? true : constraints.audio;
                    constraintsAux.audio = this.stream.isSendScreen() ? false : definedAudioConstraint;
                    constraintsAux.video = constraints.video;
                    startTime = Date.now();
                    this.setPermissionDialogTimer(timeForDialogEvent);

                    try {
                        if (this.stream.isSendScreen() && navigator.mediaDevices['getDisplayMedia'] && !platform.isElectron()) {
                            const mediaStream = await navigator.mediaDevices['getDisplayMedia']({ video: true, audio: this.properties.audioSource === 'screen' });
                            this.openvidu.addAlreadyProvidedTracks(myConstraints, mediaStream);
                            await getMediaSuccess(mediaStream, definedAudioConstraint);
                        } else {
                            this.stream.lastVideoTrackConstraints = constraintsAux.video;
                            const mediaStream = await navigator.mediaDevices.getUserMedia(constraintsAux);
                            this.openvidu.addAlreadyProvidedTracks(myConstraints, mediaStream, this.stream);
                            await getMediaSuccess(mediaStream, definedAudioConstraint);
                        }
                    } catch (error) {
                        await getMediaError(error);
                    }
                }
            } catch (error) {
                errorCallback(error);
            }
        });
    }

    /**
     * @hidden
     */
    async replaceTrackAux(track: MediaStreamTrack, updateLastConstraints: boolean): Promise<void> {
        // Set field "enabled" of the new track to the previous value
        const trackOriginalEnabledValue: boolean = track.enabled;
        if (track.kind === 'video') {
            track.enabled = this.stream.videoActive;
        } else if (track.kind === 'audio') {
            track.enabled = this.stream.audioActive;
        }
        try {
            if (this.stream.isLocalStreamPublished) {
                // Only if the Publisher has been published is necessary to call native Web API RTCRtpSender.replaceTrack
                // If it has not been published yet, replacing it on the MediaStream object is enough
                this.replaceTrackInMediaStream(track, updateLastConstraints);
                return await this.replaceTrackInRtcRtpSender(track);
            } else {
                // Publisher not published. Simply replace the track on the local MediaStream
                return this.replaceTrackInMediaStream(track, updateLastConstraints);
            }
        } catch (error) {
            track.enabled = trackOriginalEnabledValue;
            throw error;
        }
    }

    /**
     * @hidden
     *
     * To obtain the videoDimensions we wait for the video reference to have enough metadata
     * and then try to use MediaStreamTrack.getSettingsMethod(). If not available, then we
     * use the HTMLVideoElement properties videoWidth and videoHeight
     */
    getVideoDimensions(): Promise<{ width: number; height: number }> {
        return new Promise((resolve, reject) => {
            // Ionic iOS and Safari iOS supposedly require the video element to actually exist inside the DOM
            const requiresDomInsertion: boolean = (platform.isIonicIos() || platform.isIOSWithSafari()) && (this.videoReference.readyState < 1);

            let loadedmetadataListener;
            const resolveDimensions = () => {
                let width: number;
                let height: number;
                if (typeof this.stream.getMediaStream().getVideoTracks()[0].getSettings === 'function') {
                    const settings = this.stream.getMediaStream().getVideoTracks()[0].getSettings();
                    width = settings.width || this.videoReference.videoWidth;
                    height = settings.height || this.videoReference.videoHeight;
                } else {
                    logger.warn('MediaStreamTrack does not have getSettings method on ' + platform.getDescription());
                    width = this.videoReference.videoWidth;
                    height = this.videoReference.videoHeight;
                }

                if (loadedmetadataListener != null) {
                    this.videoReference.removeEventListener('loadedmetadata', loadedmetadataListener);
                }
                if (requiresDomInsertion) {
                    document.body.removeChild(this.videoReference);
                }

                return resolve({ width, height });
            };

            if (this.videoReference.readyState >= 1) {
                // The video already has metadata available
                // No need of loadedmetadata event
                resolveDimensions();
            } else {
                // The video does not have metadata available yet
                // Must listen to loadedmetadata event
                loadedmetadataListener = () => {
                    if (!this.videoReference.videoWidth) {
                        let interval = setInterval(() => {
                            if (!!this.videoReference.videoWidth) {
                                clearInterval(interval);
                                resolveDimensions();
                            }
                        }, 40);
                    } else {
                        resolveDimensions();
                    }
                };
                this.videoReference.addEventListener('loadedmetadata', loadedmetadataListener);
                if (requiresDomInsertion) {
                    document.body.appendChild(this.videoReference);
                }
            }
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

    /**
     * @hidden
     */
    initializeVideoReference(mediaStream: MediaStream) {
        this.videoReference = document.createElement('video');
        this.videoReference.style.display = 'none';
        this.videoReference.muted = true;
        this.videoReference.autoplay = true;
        this.videoReference.controls = false;
        if (
            platform.isSafariBrowser() ||
            (platform.isIPhoneOrIPad() &&
                (platform.isChromeMobileBrowser() ||
                    platform.isEdgeMobileBrowser() ||
                    platform.isOperaMobileBrowser() ||
                    platform.isFirefoxMobileBrowser()))
        ) {
            this.videoReference.playsInline = true;
        }
        this.stream.setMediaStream(mediaStream);
        if (!!this.firstVideoElement) {
            this.createVideoElement(this.firstVideoElement.targetElement, <VideoInsertMode>this.properties.insertMode);
        }
        this.videoReference.srcObject = this.stream.getMediaStream();
    }

    /**
     * @hidden
     */
    replaceTrackInMediaStream(track: MediaStreamTrack, updateLastConstraints: boolean): void {
        const mediaStream: MediaStream = this.stream.displayMyRemote()
            ? this.stream.localMediaStreamWhenSubscribedToRemote!
            : this.stream.getMediaStream();
        let removedTrack: MediaStreamTrack;
        if (track.kind === 'video') {
            removedTrack = mediaStream.getVideoTracks()[0];
            if (updateLastConstraints) {
                this.stream.lastVideoTrackConstraints = track.getConstraints();
            }
        } else {
            removedTrack = mediaStream.getAudioTracks()[0];
        }
        removedTrack.enabled = false;
        removedTrack.stop();
        mediaStream.removeTrack(removedTrack);
        mediaStream.addTrack(track);
        const trackInfo = {
            oldLabel: removedTrack?.label || '',
            newLabel: track?.label || ''
        };
        if (track.kind === 'video' && updateLastConstraints) {
            this.openvidu.sendNewVideoDimensionsIfRequired(this, 'trackReplaced', 50, 30);
            this.openvidu.sendTrackChangedEvent(this, trackInfo.oldLabel, trackInfo.newLabel, 'videoTrack');
            if (this.stream.isLocalStreamPublished) {
                this.session.sendVideoData(this.stream.streamManager, 5, true, 5);
            }
        } else if (track.kind === 'audio' && updateLastConstraints) {
            this.openvidu.sendTrackChangedEvent(this, trackInfo.oldLabel, trackInfo.newLabel, 'audioTrack');
        }
        if (track.kind === 'audio') {
            this.stream.disableHarkSpeakingEvent(false);
            this.stream.disableHarkStoppedSpeakingEvent(false);
            this.stream.disableHarkVolumeChangeEvent(false);
            this.stream.initHarkEvents();
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
        if (Date.now() - startTime > waitTime) {
            // Permission dialog was shown and now is closed
            this.emitEvent('accessDialogClosed', []);
        }
    }

    private async replaceTrackInRtcRtpSender(track: MediaStreamTrack): Promise<void> {
        const senders: RTCRtpSender[] = this.stream.getRTCPeerConnection().getSenders();
        let sender: RTCRtpSender | undefined;
        if (track.kind === 'video') {
            sender = senders.find((s) => !!s.track && s.track.kind === 'video');
            if (!sender) {
                throw new Error("There's no replaceable track for that kind of MediaStreamTrack in this Publisher object");
            }
        } else if (track.kind === 'audio') {
            sender = senders.find((s) => !!s.track && s.track.kind === 'audio');
            if (!sender) {
                throw new Error("There's no replaceable track for that kind of MediaStreamTrack in this Publisher object");
            }
        } else {
            throw new Error('Unknown track kind ' + track.kind);
        }
        await (sender as RTCRtpSender).replaceTrack(track);
    }
}
