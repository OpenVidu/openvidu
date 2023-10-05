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

import { LocalRecorder } from './LocalRecorder';
import { Publisher } from './Publisher';
import { Session } from './Session';
import { Stream } from './Stream';
import { SessionDisconnectedEvent } from '../OpenViduInternal/Events/SessionDisconnectedEvent';
import { StreamPropertyChangedEvent } from '../OpenViduInternal/Events/StreamPropertyChangedEvent';
import { Device } from '../OpenViduInternal/Interfaces/Public/Device';
import { OpenViduAdvancedConfiguration } from '../OpenViduInternal/Interfaces/Public/OpenViduAdvancedConfiguration';
import { PublisherProperties } from '../OpenViduInternal/Interfaces/Public/PublisherProperties';
import { CustomMediaStreamConstraints } from '../OpenViduInternal/Interfaces/Private/CustomMediaStreamConstraints';
import { OpenViduError, OpenViduErrorName } from '../OpenViduInternal/Enums/OpenViduError';
import { VideoInsertMode } from '../OpenViduInternal/Enums/VideoInsertMode';
import { OpenViduLogger } from '../OpenViduInternal/Logger/OpenViduLogger';
import { PlatformUtils } from '../OpenViduInternal/Utils/Platform';
import { StreamPropertyChangedEventReason, ChangedPropertyType } from '../OpenViduInternal/Events/Types/Types';

import * as screenSharingAuto from '../OpenViduInternal/ScreenSharing/Screen-Capturing-Auto';
import * as screenSharing from '../OpenViduInternal/ScreenSharing/Screen-Capturing';
import { OpenViduLoggerConfiguration } from '../OpenViduInternal/Logger/OpenViduLoggerConfiguration';
/**
 * @hidden
 */
import EventEmitter = require('wolfy87-eventemitter');
/**
 * @hidden
 */
import RpcBuilder = require('../OpenViduInternal/KurentoUtils/kurento-jsonrpc');

/**
 * @hidden
 */
const packageJson = require('../../package.json');
/**
 * @hidden
 */
declare var cordova: any;
/**
 * @hidden
 */
const logger: OpenViduLogger = OpenViduLogger.getInstance();

/**
 * @hidden
 */
let platform: PlatformUtils;

/**
 * Entrypoint of OpenVidu Browser library.
 * Use it to initialize objects of type {@link Session}, {@link Publisher} and {@link LocalRecorder}
 */
export class OpenVidu {
    private jsonRpcClient: any;
    private masterNodeHasCrashed = false;

    /**
     * @hidden
     */
    session: Session;
    /**
     * @hidden
     */
    publishers: Publisher[] = [];
    /**
     * @hidden
     */
    wsUri: string;
    /**
     * @hidden
     */
    httpUri: string;
    /**
     * @hidden
     */
    secret = '';
    /**
     * @hidden
     */
    recorder = false;
    /**
     * @hidden
     */
    stt = false;
    /**
     * @hidden
     */
    iceServers: RTCIceServer[];
    /**
     * @hidden
     */
    role: string;
    /**
     * @hidden
     */
    finalUserId: string;
    /**
     * @hidden
     */
    mediaServer: string;
    /**
     * @hidden
     */
    videoSimulcast: boolean;
    /**
     * @hidden
     */
    life: number = -1;
    /**
     * @hidden
     */
    advancedConfiguration: OpenViduAdvancedConfiguration = {};
    /**
     * @hidden
     */
    webrtcStatsInterval: number = -1;
    /**
     * @hidden
     */
    sendBrowserLogs: OpenViduLoggerConfiguration = OpenViduLoggerConfiguration.disabled;
    /**
     * @hidden
     */
    isAtLeastPro: boolean = false;
    /**
     * @hidden
     */
    isEnterprise: boolean = false;
    /**
     * @hidden
     */
    libraryVersion: string;
    /**
     * @hidden
     */
    ee = new EventEmitter();

    constructor() {
        platform = PlatformUtils.getInstance();
        this.libraryVersion = packageJson.version;
        logger.info('OpenVidu initialized');
        logger.info('Platform detected: ' + platform.getDescription());
        logger.info('openvidu-browser version: ' + this.libraryVersion);

        if (platform.isMobileDevice() || platform.isReactNative()) {
            // Listen to orientationchange only on mobile devices
            this.onOrientationChanged(() => {
                this.publishers.forEach((publisher) => {
                    if (publisher.stream.isLocalStreamPublished && !!publisher.stream && !!publisher.stream.hasVideo) {
                        this.sendNewVideoDimensionsIfRequired(publisher, 'deviceRotated', 75, 10);
                    }
                });
            });
        }
    }

    /**
     * Returns new session
     */
    initSession(): Session {
        this.session = new Session(this);
        return this.session;
    }

    initPublisher(targetElement: string | HTMLElement | undefined): Publisher;
    initPublisher(targetElement: string | HTMLElement | undefined, properties: PublisherProperties): Publisher;
    initPublisher(targetElement: string | HTMLElement | undefined, completionHandler: (error: Error | undefined) => void): Publisher;
    initPublisher(
        targetElement: string | HTMLElement | undefined,
        properties: PublisherProperties,
        completionHandler: (error: Error | undefined) => void
    ): Publisher;

    /**
     * Returns a new publisher
     *
     * #### Events dispatched
     *
     * The {@link Publisher} object will dispatch an `accessDialogOpened` event, only if the pop-up shown by the browser to request permissions for the camera is opened. You can use this event to alert the user about granting permissions
     * for your website. An `accessDialogClosed` event will also be dispatched after user clicks on "Allow" or "Block" in the pop-up.
     *
     * The {@link Publisher} object will dispatch an `accessAllowed` or `accessDenied` event once it has been granted access to the requested input devices or not.
     *
     * The {@link Publisher} object will dispatch a `videoElementCreated` event once a HTML video element has been added to DOM (only if you
     * [let OpenVidu take care of the video players](/en/stable/cheatsheet/manage-videos/#let-openvidu-take-care-of-the-video-players)). See {@link VideoElementEvent} to learn more.
     *
     * The {@link Publisher} object will dispatch a `streamPlaying` event once the local streams starts playing. See {@link StreamManagerEvent} to learn more.
     *
     * @param targetElement  HTML DOM element (or its `id` attribute) in which the video element of the Publisher will be inserted (see {@link PublisherProperties.insertMode}). If *null* or *undefined* no default video will be created for this Publisher.
     * You can always call method {@link Publisher.addVideoElement} or {@link Publisher.createVideoElement} to manage the video elements on your own (see [Manage video players](/en/stable/cheatsheet/manage-videos) section)
     * @param completionHandler `error` parameter is null if `initPublisher` succeeds, and is defined if it fails.
     *                          `completionHandler` function is called before the Publisher dispatches an `accessAllowed` or an `accessDenied` event
     */
    initPublisher(targetElement: string | HTMLElement | undefined, param2?, param3?): Publisher {
        let properties: PublisherProperties;

        if (!!param2 && typeof param2 !== 'function') {
            // Matches 'initPublisher(targetElement, properties)' or 'initPublisher(targetElement, properties, completionHandler)'

            properties = <PublisherProperties>param2;

            properties = {
                audioSource: typeof properties.audioSource !== 'undefined' ? properties.audioSource : undefined,
                frameRate:
                    typeof MediaStreamTrack !== 'undefined' && properties.videoSource instanceof MediaStreamTrack
                        ? undefined
                        : typeof properties.frameRate !== 'undefined'
                            ? properties.frameRate
                            : undefined,
                insertMode:
                    typeof properties.insertMode !== 'undefined'
                        ? typeof properties.insertMode === 'string'
                            ? VideoInsertMode[properties.insertMode]
                            : properties.insertMode
                        : VideoInsertMode.APPEND,
                mirror: typeof properties.mirror !== 'undefined' ? properties.mirror : true,
                publishAudio: typeof properties.publishAudio !== 'undefined' ? properties.publishAudio : true,
                publishVideo: typeof properties.publishVideo !== 'undefined' ? properties.publishVideo : true,
                resolution:
                    typeof MediaStreamTrack !== 'undefined' && properties.videoSource instanceof MediaStreamTrack
                        ? undefined
                        : typeof properties.resolution !== 'undefined'
                            ? properties.resolution
                            : '640x480',
                videoSource: typeof properties.videoSource !== 'undefined' ? properties.videoSource : undefined,
                videoSimulcast: properties.videoSimulcast,
                filter: properties.filter
            };
        } else {
            // Matches 'initPublisher(targetElement)' or 'initPublisher(targetElement, completionHandler)'

            properties = {
                insertMode: VideoInsertMode.APPEND,
                mirror: true,
                publishAudio: true,
                publishVideo: true,
                resolution: '640x480'
            };
        }

        const publisher: Publisher = new Publisher(targetElement, properties, this);

        let completionHandler: (error: Error | undefined) => void;
        if (!!param2 && typeof param2 === 'function') {
            completionHandler = param2;
        } else if (!!param3) {
            completionHandler = param3;
        }

        publisher
            .initialize()
            .then(() => {
                if (completionHandler !== undefined) {
                    completionHandler(undefined);
                }
                publisher.emitEvent('accessAllowed', []);
            })
            .catch((error) => {
                if (completionHandler !== undefined) {
                    completionHandler(error);
                }
                publisher.emitEvent('accessDenied', [error]);
            });

        this.publishers.push(publisher);
        return publisher;
    }

    /**
     * Promisified version of {@link OpenVidu.initPublisher}
     *
     * > WARNING: events `accessDialogOpened` and `accessDialogClosed` will not be dispatched if using this method instead of {@link OpenVidu.initPublisher}
     */
    initPublisherAsync(targetElement: string | HTMLElement | undefined): Promise<Publisher>;
    initPublisherAsync(targetElement: string | HTMLElement | undefined, properties: PublisherProperties): Promise<Publisher>;

    initPublisherAsync(targetElement: string | HTMLElement | undefined, properties?: PublisherProperties): Promise<Publisher> {
        return new Promise<Publisher>((resolve, reject) => {
            let publisher: Publisher;

            const callback = (error: Error) => {
                if (!!error) {
                    return reject(error);
                } else {
                    return resolve(publisher);
                }
            };

            if (!!properties) {
                publisher = this.initPublisher(targetElement, properties, callback);
            } else {
                publisher = this.initPublisher(targetElement, callback);
            }
        });
    }

    /**
     * Returns a new local recorder for recording streams straight away from the browser
     * @param stream  Stream to record
     */
    initLocalRecorder(stream: Stream): LocalRecorder {
        return new LocalRecorder(stream);
    }

    /**
     * Checks if the browser supports OpenVidu
     * @returns 1 if the browser supports OpenVidu, 0 otherwise
     */
    checkSystemRequirements(): boolean {
        // Specific iOS platform support (iPhone, iPad)
        if (platform.isIPhoneOrIPad()) {
            return (
                platform.isIOSWithSafari() ||
                platform.isChromeMobileBrowser() ||
                platform.isFirefoxMobileBrowser() ||
                platform.isOperaMobileBrowser() ||
                platform.isEdgeMobileBrowser() ||
                platform.isIonicIos() // Ionic apps for iOS
            );
        }

        // General platform support for web clients (Desktop, Mobile)
        return (
            platform.isChromeBrowser() ||
            platform.isChromeMobileBrowser() ||
            platform.isFirefoxBrowser() ||
            platform.isFirefoxMobileBrowser() ||
            platform.isOperaBrowser() ||
            platform.isOperaMobileBrowser() ||
            platform.isEdgeBrowser() ||
            platform.isEdgeMobileBrowser() ||
            platform.isSamsungBrowser() ||
            platform.isSafariBrowser() ||
            platform.isAndroidBrowser() || // Android WebView & Ionic apps for Android
            platform.isElectron() ||
            platform.isNodeJs() ||
            // TODO: remove when updating platform detection library
            platform.isMotorolaEdgeDevice()
        );
    }

    /**
     * Checks if the browser supports screen-sharing. Desktop Chrome, Firefox and Opera support screen-sharing
     * @returns 1 if the browser supports screen-sharing, 0 otherwise
     */
    checkScreenSharingCapabilities(): boolean {
        return platform.canScreenShare();
    }

    /**
     * Collects information about the media input devices available on the system. You can pass property `deviceId` of a {@link Device} object as value of `audioSource` or `videoSource` properties in {@link initPublisher} method
     */
    getDevices(): Promise<Device[]> {
        return new Promise<Device[]>((resolve, reject) => {
            navigator.mediaDevices
                .enumerateDevices()
                .then((deviceInfos) => {
                    const devices: Device[] = [];

                    // Ionic Android  devices
                    if (platform.isIonicAndroid() && typeof cordova != 'undefined' && cordova?.plugins?.EnumerateDevicesPlugin) {
                        cordova.plugins.EnumerateDevicesPlugin.getEnumerateDevices().then((pluginDevices: Device[]) => {
                            let pluginAudioDevices: Device[] = [];
                            let videoDevices: Device[] = [];
                            let audioDevices: Device[] = [];
                            pluginAudioDevices = pluginDevices.filter((device: Device) => device.kind === 'audioinput');
                            videoDevices = deviceInfos.filter((device: MediaDeviceInfo) => device.kind === 'videoinput') as any;
                            audioDevices = deviceInfos.filter((device: MediaDeviceInfo) => device.kind === 'audioinput') as any;
                            videoDevices.forEach((deviceInfo, index) => {
                                if (!deviceInfo.label) {
                                    let label = '';
                                    if (index === 0) {
                                        label = 'Front Camera';
                                    } else if (index === 1) {
                                        label = 'Back Camera';
                                    } else {
                                        label = 'Unknown Camera';
                                    }
                                    devices.push({
                                        kind: deviceInfo.kind,
                                        deviceId: deviceInfo.deviceId,
                                        label: label
                                    });
                                } else {
                                    devices.push({
                                        kind: deviceInfo.kind,
                                        deviceId: deviceInfo.deviceId,
                                        label: deviceInfo.label
                                    });
                                }
                            });
                            audioDevices.forEach((deviceInfo, index) => {
                                if (!deviceInfo.label) {
                                    let label = '';
                                    switch (index) {
                                        case 0: // Default Microphone
                                            label = 'Default';
                                            break;
                                        case 1: // Microphone + Speakerphone
                                            const defaultMatch = pluginAudioDevices.filter((d) => d.label.includes('Built'))[0];
                                            label = defaultMatch ? defaultMatch.label : 'Built-in Microphone';
                                            break;
                                        case 2: // Headset Microphone
                                            const wiredMatch = pluginAudioDevices.filter((d) => d.label.includes('Wired'))[0];
                                            if (wiredMatch) {
                                                label = wiredMatch.label;
                                            } else {
                                                label = 'Headset earpiece';
                                            }
                                            break;
                                        case 3:
                                            const wirelessMatch = pluginAudioDevices.filter((d) => d.label.includes('Bluetooth'))[0];
                                            label = wirelessMatch ? wirelessMatch.label : 'Wireless';
                                            break;
                                        default:
                                            label = 'Unknown Microphone';
                                            break;
                                    }
                                    devices.push({
                                        kind: deviceInfo.kind,
                                        deviceId: deviceInfo.deviceId,
                                        label: label
                                    });
                                } else {
                                    devices.push({
                                        kind: deviceInfo.kind,
                                        deviceId: deviceInfo.deviceId,
                                        label: deviceInfo.label
                                    });
                                }
                            });
                            return resolve(devices);
                        });
                    } else {
                        // Rest of platforms
                        deviceInfos.forEach((deviceInfo) => {
                            if (deviceInfo.kind === 'audioinput' || deviceInfo.kind === 'videoinput') {
                                devices.push({
                                    kind: deviceInfo.kind,
                                    deviceId: deviceInfo.deviceId,
                                    label: deviceInfo.label
                                });
                            }
                        });
                        return resolve(devices);
                    }
                })
                .catch((error) => {
                    logger.error('Error getting devices', error);
                    return reject(error);
                });
        });
    }

    /**
     * Get a MediaStream object that you can customize before calling {@link initPublisher} (pass _MediaStreamTrack_ property of the _MediaStream_ value resolved by the Promise as `audioSource` or `videoSource` properties in {@link initPublisher})
     *
     * Parameter `options` is the same as in {@link initPublisher} second parameter (of type {@link PublisherProperties}), but only the following properties will be applied: `audioSource`, `videoSource`, `frameRate`, `resolution`
     *
     * To customize the Publisher's video, the API for HTMLCanvasElement is very useful. For example, to get a black-and-white video at 10 fps and HD resolution with no sound:
     * ```
     * var OV = new OpenVidu();
     * var FRAME_RATE = 10;
     *
     * OV.getUserMedia({
     *    audioSource: false,
     *    videoSource: undefined,
     *    resolution: '1280x720',
     *    frameRate: FRAME_RATE
     * })
     * .then(mediaStream => {
     *
     *    var videoTrack = mediaStream.getVideoTracks()[0];
     *    var video = document.createElement('video');
     *    video.srcObject = new MediaStream([videoTrack]);
     *
     *    var canvas = document.createElement('canvas');
     *    var ctx = canvas.getContext('2d');
     *    ctx.filter = 'grayscale(100%)';
     *
     *    video.addEventListener('play', () => {
     *      var loop = () => {
     *        if (!video.paused && !video.ended) {
     *          ctx.drawImage(video, 0, 0, 300, 170);
     *          setTimeout(loop, 1000/ FRAME_RATE); // Drawing at 10 fps
     *        }
     *      };
     *      loop();
     *    });
     *    video.play();
     *
     *    var grayVideoTrack = canvas.captureStream(FRAME_RATE).getVideoTracks()[0];
     *    var publisher = this.OV.initPublisher(
     *      myHtmlTarget,
     *      {
     *        audioSource: false,
     *        videoSource: grayVideoTrack
     *      });
     * });
     * ```
     */
    async getUserMedia(options: PublisherProperties): Promise<MediaStream> {
        const askForAudioStreamOnly = async (previousMediaStream: MediaStream, constraints: MediaStreamConstraints) => {
            const definedAudioConstraint = constraints.audio === undefined ? true : constraints.audio;
            const constraintsAux: MediaStreamConstraints = { audio: definedAudioConstraint, video: false };
            try {
                const audioOnlyStream = await navigator.mediaDevices.getUserMedia(constraintsAux);
                previousMediaStream.addTrack(audioOnlyStream.getAudioTracks()[0]);
                return previousMediaStream;
            } catch (error) {
                previousMediaStream.getAudioTracks().forEach((track) => {
                    track.stop();
                });
                previousMediaStream.getVideoTracks().forEach((track) => {
                    track.stop();
                });
                throw this.generateAudioDeviceError(error, constraintsAux);
            }
        };

        try {
            const myConstraints = await this.generateMediaConstraints(options);
            if (
                (!!myConstraints.videoTrack && !!myConstraints.audioTrack) ||
                (!!myConstraints.audioTrack && myConstraints.constraints?.video === false) ||
                (!!myConstraints.videoTrack && myConstraints.constraints?.audio === false)
            ) {
                // No need to call getUserMedia at all. Both tracks provided, or only AUDIO track provided or only VIDEO track provided
                return this.addAlreadyProvidedTracks(myConstraints, new MediaStream());
            } else {
                // getUserMedia must be called. AUDIO or VIDEO are requesting a new track

                // Delete already provided constraints for audio or video
                if (!!myConstraints.videoTrack) {
                    delete myConstraints.constraints!.video;
                }
                if (!!myConstraints.audioTrack) {
                    delete myConstraints.constraints!.audio;
                }

                let mustAskForAudioTrackLater = false;
                if (typeof options.videoSource === 'string') {
                    // Video is deviceId or screen sharing
                    if (
                        options.videoSource === 'screen' ||
                        options.videoSource === 'window' ||
                        (platform.isElectron() && options.videoSource.startsWith('screen:'))
                    ) {
                        // Video is screen sharing
                        mustAskForAudioTrackLater =
                            !myConstraints.audioTrack && options.audioSource !== null && options.audioSource !== false;
                        if (navigator.mediaDevices['getDisplayMedia'] && !platform.isElectron()) {
                            // getDisplayMedia supported
                            try {
                                const mediaStream = await navigator.mediaDevices['getDisplayMedia']({ video: true, audio: options.audioSource === 'screen' });
                                this.addAlreadyProvidedTracks(myConstraints, mediaStream);
                                if (mustAskForAudioTrackLater) {
                                    return await askForAudioStreamOnly(mediaStream, <MediaStreamConstraints>myConstraints.constraints);
                                } else {
                                    return mediaStream;
                                }
                            } catch (error) {
                                let errorName: OpenViduErrorName = OpenViduErrorName.SCREEN_CAPTURE_DENIED;
                                const errorMessage = error.toString();
                                throw new OpenViduError(errorName, errorMessage);
                            }
                        } else {
                            // getDisplayMedia NOT supported. Can perform getUserMedia below with already calculated constraints
                        }
                    } else {
                        // Video is deviceId. Can perform getUserMedia below with already calculated constraints
                    }
                }
                // Use already calculated constraints
                const constraintsAux = mustAskForAudioTrackLater
                    ? { video: myConstraints.constraints!.video }
                    : myConstraints.constraints;
                try {
                    const mediaStream = await navigator.mediaDevices.getUserMedia(constraintsAux);
                    this.addAlreadyProvidedTracks(myConstraints, mediaStream);
                    if (mustAskForAudioTrackLater) {
                        return await askForAudioStreamOnly(mediaStream, <MediaStreamConstraints>myConstraints.constraints);
                    } else {
                        return mediaStream;
                    }
                } catch (error) {
                    let errorName: OpenViduErrorName;
                    const errorMessage = error.toString();
                    if (!(options.videoSource === 'screen')) {
                        errorName = OpenViduErrorName.DEVICE_ACCESS_DENIED;
                    } else {
                        errorName = OpenViduErrorName.SCREEN_CAPTURE_DENIED;
                    }
                    throw new OpenViduError(errorName, errorMessage);
                }
            }
        } catch (error) {
            throw error;
        }
    }

    /* tslint:disable:no-empty */
    /**
     * Disable all logging except error level
     */
    enableProdMode(): void {
        logger.enableProdMode();
    }
    /* tslint:enable:no-empty */

    /**
     * Set OpenVidu advanced configuration options. `configuration` is an object of type {@link OpenViduAdvancedConfiguration}. Call this method to override previous values at any moment.
     */
    setAdvancedConfiguration(configuration: OpenViduAdvancedConfiguration): void {
        this.advancedConfiguration = configuration;
    }

    /* Hidden methods */

    /**
     * @hidden
     */
    onOrientationChanged(handler): void {
        (globalThis as any).addEventListener('orientationchange', handler);
    }

    /**
     * @hidden
     */
    sendNewVideoDimensionsIfRequired(publisher: Publisher, reason: StreamPropertyChangedEventReason, WAIT_INTERVAL: number, MAX_ATTEMPTS: number) {
        let attempts = 0;
        const oldWidth = publisher?.stream?.videoDimensions?.width || 0;
        const oldHeight = publisher?.stream?.videoDimensions?.height || 0;

        const repeatUntilChangeOrMaxAttempts: NodeJS.Timeout = setInterval(() => {
            attempts++;
            if (attempts > MAX_ATTEMPTS) {
                clearTimeout(repeatUntilChangeOrMaxAttempts);
            }
            publisher.getVideoDimensions().then((newDimensions) => {
                if (newDimensions.width !== oldWidth || newDimensions.height !== oldHeight) {
                    clearTimeout(repeatUntilChangeOrMaxAttempts);
                    this.sendVideoDimensionsChangedEvent(publisher, reason, oldWidth, oldHeight, newDimensions.width, newDimensions.height);
                }
            });
        }, WAIT_INTERVAL);
    }

    /**
     * @hidden
     */
    sendVideoDimensionsChangedEvent(
        publisher: Publisher,
        reason: StreamPropertyChangedEventReason,
        oldWidth: number,
        oldHeight: number,
        newWidth: number,
        newHeight: number
    ) {
        publisher.stream.videoDimensions = {
            width: newWidth || 0,
            height: newHeight || 0
        };
        this.sendRequest(
            'streamPropertyChanged',
            {
                streamId: publisher.stream.streamId,
                property: 'videoDimensions',
                newValue: JSON.stringify(publisher.stream.videoDimensions),
                reason
            },
            (error, response) => {
                if (error) {
                    logger.error("Error sending 'streamPropertyChanged' event", error);
                } else {
                    this.session.emitEvent('streamPropertyChanged', [
                        new StreamPropertyChangedEvent(
                            this.session,
                            publisher.stream,
                            'videoDimensions',
                            publisher.stream.videoDimensions,
                            { width: oldWidth, height: oldHeight },
                            reason
                        )
                    ]);
                    publisher.emitEvent('streamPropertyChanged', [
                        new StreamPropertyChangedEvent(
                            publisher,
                            publisher.stream,
                            'videoDimensions',
                            publisher.stream.videoDimensions,
                            { width: oldWidth, height: oldHeight },
                            reason
                        )
                    ]);
                    this.session.sendVideoData(publisher);
                }
            }
        );
    }

    /**
     * @hidden
     */
    sendTrackChangedEvent(publisher: Publisher, oldLabel: string, newLabel: string, propertyType: ChangedPropertyType) {
        const oldValue = { label: oldLabel };
        const newValue = { label: newLabel };
        const reason = 'trackReplaced';

        if (publisher.stream.isLocalStreamPublished) {
            this.sendRequest(
                'streamPropertyChanged',
                {
                    streamId: publisher.stream.streamId,
                    property: propertyType,
                    newValue: newValue,
                    reason
                },
                (error, response) => {
                    if (error) {
                        logger.error("Error sending 'streamPropertyChanged' event", error);
                    } else {
                        this.session.emitEvent('streamPropertyChanged', [
                            new StreamPropertyChangedEvent(this.session, publisher.stream, propertyType, newValue, oldValue, reason)
                        ]);
                        publisher.emitEvent('streamPropertyChanged', [
                            new StreamPropertyChangedEvent(publisher, publisher.stream, propertyType, newValue, oldValue, reason)
                        ]);
                    }
                }
            );
        } else {
            this.session.emitEvent('streamPropertyChanged', [
                new StreamPropertyChangedEvent(this.session, publisher.stream, propertyType, newValue, oldValue, reason)
            ]);
            publisher.emitEvent('streamPropertyChanged', [
                new StreamPropertyChangedEvent(publisher, publisher.stream, propertyType, newValue, oldValue, reason)
            ]);
        }
    }

    /**
     * @hidden
     */
    generateMediaConstraints(publisherProperties: PublisherProperties): Promise<CustomMediaStreamConstraints> {
        return new Promise<CustomMediaStreamConstraints>((resolve, reject) => {
            const myConstraints: CustomMediaStreamConstraints = {
                audioTrack: undefined,
                videoTrack: undefined,
                constraints: {
                    audio: undefined,
                    video: undefined
                }
            };
            const audioSource = publisherProperties.audioSource;
            const videoSource = publisherProperties.videoSource;

            // CASE 1: null/false
            if (audioSource === null || audioSource === false) {
                // No audio track
                myConstraints.constraints!.audio = false;
            }
            if (videoSource === null || videoSource === false) {
                // No video track
                myConstraints.constraints!.video = false;
            }
            if (myConstraints.constraints!.audio === false && myConstraints.constraints!.video === false) {
                // ERROR! audioSource and videoSource cannot be both false at the same time
                return reject(
                    new OpenViduError(
                        OpenViduErrorName.NO_INPUT_SOURCE_SET,
                        "Properties 'audioSource' and 'videoSource' cannot be set to false or null at the same time"
                    )
                );
            }

            // CASE 2: MediaStreamTracks
            if (typeof MediaStreamTrack !== 'undefined' && audioSource instanceof MediaStreamTrack) {
                // Already provided audio track
                myConstraints.audioTrack = audioSource;
            }
            if (typeof MediaStreamTrack !== 'undefined' && videoSource instanceof MediaStreamTrack) {
                // Already provided video track
                myConstraints.videoTrack = videoSource;
            }

            // CASE 3: Default tracks
            if (audioSource === undefined) {
                myConstraints.constraints!.audio = true;
            }
            if (videoSource === undefined) {
                myConstraints.constraints!.video = {
                    width: {
                        ideal: 640
                    },
                    height: {
                        ideal: 480
                    }
                };
            }

            // CASE 3.5: give values to resolution and frameRate if video not null/false
            if (videoSource !== null && videoSource !== false) {
                if (!!publisherProperties.resolution) {
                    const widthAndHeight = publisherProperties.resolution.toLowerCase().split('x');
                    const idealWidth = Number(widthAndHeight[0]);
                    const idealHeight = Number(widthAndHeight[1]);
                    myConstraints.constraints!.video = {
                        width: {
                            ideal: idealWidth
                        },
                        height: {
                            ideal: idealHeight
                        }
                    };
                }
                if (!!publisherProperties.frameRate) {
                    (<MediaTrackConstraints>myConstraints.constraints!.video).frameRate = { ideal: publisherProperties.frameRate };
                }
            }

            // CASE 4: deviceId or screen sharing
            this.configureDeviceIdOrScreensharing(myConstraints, publisherProperties, resolve, reject);

            return resolve(myConstraints);
        });
    }

    /**
     * @hidden
     */
    startWs(onConnectSucces: (error: Error) => void): void {
        const config = {
            heartbeat: 5000,
            ws: {
                uri: this.wsUri + '?sessionId=' + this.session.sessionId,
                onconnected: onConnectSucces,
                ondisconnect: this.disconnectCallback.bind(this),
                onreconnecting: this.reconnectingCallback.bind(this),
                onreconnected: this.reconnectedCallback.bind(this),
                ismasternodecrashed: this.isMasterNodeCrashed.bind(this)
            },
            rpc: {
                requestTimeout: 10000,
                heartbeatRequestTimeout: 5000,
                participantJoined: this.session.onParticipantJoined.bind(this.session),
                participantPublished: this.session.onParticipantPublished.bind(this.session),
                participantUnpublished: this.session.onParticipantUnpublished.bind(this.session),
                participantLeft: this.session.onParticipantLeft.bind(this.session),
                participantEvicted: this.session.onParticipantEvicted.bind(this.session),
                recordingStarted: this.session.onRecordingStarted.bind(this.session),
                recordingStopped: this.session.onRecordingStopped.bind(this.session),
                broadcastStarted: this.session.onBroadcastStarted.bind(this.session),
                broadcastStopped: this.session.onBroadcastStopped.bind(this.session),
                sendMessage: this.session.onNewMessage.bind(this.session),
                streamPropertyChanged: this.session.onStreamPropertyChanged.bind(this.session),
                connectionPropertyChanged: this.session.onConnectionPropertyChanged.bind(this.session),
                networkQualityLevelChanged: this.session.onNetworkQualityLevelChangedChanged.bind(this.session),
                filterEventDispatched: this.session.onFilterEventDispatched.bind(this.session),
                iceCandidate: this.session.recvIceCandidate.bind(this.session),
                mediaError: this.session.onMediaError.bind(this.session),
                masterNodeCrashedNotification: this.onMasterNodeCrashedNotification.bind(this),
                forciblyReconnectSubscriber: this.session.onForciblyReconnectSubscriber.bind(this.session),
                speechToTextMessage: this.session.onSpeechToTextMessage.bind(this.session),
                speechToTextDisconnected: this.session.onSpeechToTextDisconnected.bind(this.session)
            }
        };
        this.jsonRpcClient = new RpcBuilder.clients.JsonRpcClient(config);
    }

    /**
     * @hidden
     */
    onMasterNodeCrashedNotification(response): void {
        console.error('Master Node has crashed');
        this.masterNodeHasCrashed = true;
        this.session.onLostConnection('nodeCrashed');
        this.jsonRpcClient.close(4103, 'Master Node has crashed');
    }

    /**
     * @hidden
     */
    getWsReadyState(): number {
        return this.jsonRpcClient.getReadyState();
    }

    /**
     * @hidden
     */
    closeWs(): void {
        this.jsonRpcClient.close(4102, 'Connection closed by client');
    }

    /**
     * @hidden
     */
    sendRequest(method: string, params: any, callback?): void {
        if (params && params instanceof Function) {
            callback = params;
            params = {};
        }
        logger.debug('Sending request: {method:"' + method + '", params: ' + JSON.stringify(params) + '}');
        this.jsonRpcClient?.send(method, params, callback);
    }

    /**
     * @hidden
     */
    getWsUri(): string {
        return this.wsUri;
    }

    /**
     * @hidden
     */
    getSecret(): string {
        return this.secret;
    }

    /**
     * @hidden
     */
    getRecorder(): boolean {
        return this.recorder;
    }

    /**
     * @hidden
     */
    getStt(): boolean {
        return this.stt;
    }

    /**
     * @hidden
     */
    generateAudioDeviceError(error, constraints: MediaStreamConstraints): OpenViduError {
        if (error.name === 'Error') {
            // Safari OverConstrainedError has as name property 'Error' instead of 'OverConstrainedError'
            error.name = error.constructor.name;
        }
        let errorName, errorMessage: string;
        switch (error.name.toLowerCase()) {
            case 'notfounderror':
                errorName = OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                errorMessage = error.toString();
                return new OpenViduError(errorName, errorMessage);
            case 'notallowederror':
                errorName = OpenViduErrorName.DEVICE_ACCESS_DENIED;
                errorMessage = error.toString();
                return new OpenViduError(errorName, errorMessage);
            case 'overconstrainederror':
                if (error.constraint.toLowerCase() === 'deviceid') {
                    errorName = OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                    errorMessage =
                        "Audio input device with deviceId '" +
                        (<ConstrainDOMStringParameters>(<MediaTrackConstraints>constraints.audio).deviceId!!).exact +
                        "' not found";
                } else {
                    errorName = OpenViduErrorName.PUBLISHER_PROPERTIES_ERROR;
                    errorMessage = "Audio input device doesn't support the value passed for constraint '" + error.constraint + "'";
                }
                return new OpenViduError(errorName, errorMessage);
            case 'notreadableerror':
                errorName = OpenViduErrorName.DEVICE_ALREADY_IN_USE;
                errorMessage = error.toString();
                return new OpenViduError(errorName, errorMessage);
            default:
                return new OpenViduError(OpenViduErrorName.INPUT_AUDIO_DEVICE_GENERIC_ERROR, error.toString());
        }
    }

    /**
     * @hidden
     */
    addAlreadyProvidedTracks(myConstraints: CustomMediaStreamConstraints, mediaStream: MediaStream, stream?: Stream): MediaStream {
        if (!!myConstraints.videoTrack) {
            mediaStream.addTrack(myConstraints.videoTrack);
            if (!!stream) {
                if (!!myConstraints.constraints.video) {
                    stream.lastVideoTrackConstraints = myConstraints.constraints.video;
                } else {
                    stream.lastVideoTrackConstraints = myConstraints.videoTrack.getConstraints();
                }
            }
        }
        if (!!myConstraints.audioTrack) {
            mediaStream.addTrack(myConstraints.audioTrack);
        }
        return mediaStream;
    }

    /**
     * @hidden
     */
    protected configureDeviceIdOrScreensharing(
        myConstraints: CustomMediaStreamConstraints,
        publisherProperties: PublisherProperties,
        resolve,
        reject
    ) {
        const audioSource = publisherProperties.audioSource;
        const videoSource = publisherProperties.videoSource;
        if (typeof audioSource === 'string' && audioSource !== 'screen') {
            myConstraints.constraints!.audio = { deviceId: { exact: audioSource } };
        }

        if (typeof videoSource === 'string') {
            if (!this.isScreenShare(videoSource)) {
                this.setVideoSource(myConstraints, videoSource);
                if (audioSource === 'screen') {
                    logger.warn('Parameter "audioSource" is set to "screen", which means rquesting audio from screen sharing source. But "videoSource" is not set to "screen". No audio source will be requested');
                    myConstraints.constraints!.audio = false;
                }
            } else {
                // Screen sharing

                if (!this.checkScreenSharingCapabilities()) {
                    const error = new OpenViduError(
                        OpenViduErrorName.SCREEN_SHARING_NOT_SUPPORTED,
                        'You can only screen share in desktop Chrome, Firefox, Opera, Safari (>=13.0), Edge (>= 80) or Electron. Detected client: ' +
                        platform.getName() +
                        ' ' +
                        platform.getVersion()
                    );
                    logger.error(error);
                    return reject(error);
                } else {
                    if (platform.isElectron()) {
                        const prefix = 'screen:';
                        const videoSourceString: string = videoSource;
                        const electronScreenId = videoSourceString.substr(videoSourceString.indexOf(prefix) + prefix.length);
                        (<any>myConstraints.constraints!.video) = {
                            mandatory: {
                                chromeMediaSource: 'desktop',
                                chromeMediaSourceId: electronScreenId
                            }
                        };
                        return resolve(myConstraints);
                    } else {
                        if (
                            !!this.advancedConfiguration.screenShareChromeExtension &&
                            !(platform.isFirefoxBrowser() || platform.isFirefoxMobileBrowser()) &&
                            !navigator.mediaDevices['getDisplayMedia']
                        ) {
                            // Custom screen sharing extension for Chrome (and Opera) and no support for MediaDevices.getDisplayMedia()

                            screenSharing.getScreenConstraints((error, screenConstraints) => {
                                if (
                                    !!error ||
                                    (!!screenConstraints.mandatory && screenConstraints.mandatory.chromeMediaSource === 'screen')
                                ) {
                                    if (error === 'permission-denied' || error === 'PermissionDeniedError') {
                                        const error = new OpenViduError(
                                            OpenViduErrorName.SCREEN_CAPTURE_DENIED,
                                            'You must allow access to one window of your desktop'
                                        );
                                        logger.error(error);
                                        return reject(error);
                                    } else {
                                        const extensionId = this.advancedConfiguration
                                            .screenShareChromeExtension!.split('/')
                                            .pop()!!
                                            .trim();
                                        screenSharing.getChromeExtensionStatus(extensionId, (status) => {
                                            if (status === 'installed-disabled') {
                                                const error = new OpenViduError(
                                                    OpenViduErrorName.SCREEN_EXTENSION_DISABLED,
                                                    'You must enable the screen extension'
                                                );
                                                logger.error(error);
                                                return reject(error);
                                            }
                                            if (status === 'not-installed') {
                                                const error = new OpenViduError(
                                                    OpenViduErrorName.SCREEN_EXTENSION_NOT_INSTALLED,
                                                    <string>this.advancedConfiguration.screenShareChromeExtension
                                                );
                                                logger.error(error);
                                                return reject(error);
                                            }
                                        });
                                        return;
                                    }
                                } else {
                                    myConstraints.constraints!.video = screenConstraints;
                                    return resolve(myConstraints);
                                }
                            });
                            return;
                        } else {
                            if (navigator.mediaDevices['getDisplayMedia']) {
                                // getDisplayMedia support (Chrome >= 72, Firefox >= 66, Safari >= 13)
                                return resolve(myConstraints);
                            } else {
                                // Default screen sharing extension for Chrome/Opera, or is Firefox < 66
                                const firefoxString =
                                    platform.isFirefoxBrowser() || platform.isFirefoxMobileBrowser()
                                        ? publisherProperties.videoSource
                                        : undefined;

                                screenSharingAuto.getScreenId(firefoxString, (error, sourceId, screenConstraints) => {
                                    if (!!error) {
                                        if (error === 'not-installed') {
                                            const extensionUrl = !!this.advancedConfiguration.screenShareChromeExtension
                                                ? this.advancedConfiguration.screenShareChromeExtension
                                                : 'https://chrome.google.com/webstore/detail/openvidu-screensharing/lfcgfepafnobdloecchnfaclibenjold';
                                            const err = new OpenViduError(OpenViduErrorName.SCREEN_EXTENSION_NOT_INSTALLED, extensionUrl);
                                            logger.error(err);
                                            return reject(err);
                                        } else if (error === 'installed-disabled') {
                                            const err = new OpenViduError(
                                                OpenViduErrorName.SCREEN_EXTENSION_DISABLED,
                                                'You must enable the screen extension'
                                            );
                                            logger.error(err);
                                            return reject(err);
                                        } else if (error === 'permission-denied') {
                                            const err = new OpenViduError(
                                                OpenViduErrorName.SCREEN_CAPTURE_DENIED,
                                                'You must allow access to one window of your desktop'
                                            );
                                            logger.error(err);
                                            return reject(err);
                                        } else {
                                            const err = new OpenViduError(
                                                OpenViduErrorName.GENERIC_ERROR,
                                                'Unknown error when accessing screen share'
                                            );
                                            logger.error(err);
                                            logger.error(error);
                                            return reject(err);
                                        }
                                    } else {
                                        myConstraints.constraints!.video = screenConstraints.video;
                                        return resolve(myConstraints);
                                    }
                                });
                                return;
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * @hidden
     */
    protected setVideoSource(myConstraints: CustomMediaStreamConstraints, videoSource: string) {
        if (!myConstraints.constraints!.video) {
            myConstraints.constraints!.video = {};
        }
        (<MediaTrackConstraints>myConstraints.constraints!.video)['deviceId'] = { exact: videoSource };
    }

    /* Private methods */

    private disconnectCallback(): void {
        logger.warn('Websocket connection lost');
        if (this.isRoomAvailable()) {
            this.session.onLostConnection('networkDisconnect');
        } else {
            alert('Connection error. Please reload page.');
        }
    }

    private reconnectingCallback(): void {
        logger.warn('Websocket connection lost (reconnecting)');
        if (!this.isRoomAvailable()) {
            alert('Connection error. Please reload page.');
        } else {
            this.session.emitEvent('reconnecting', []);
        }
    }

    private reconnectWebsocketThroughRpcConnectMethod(rpcSessionId) {
        // This RPC method allows checking:
        // Single Master: if success, connection recovered
        //                if error, no Master Node crashed and life will be -1. onLostConnection with reason networkDisconnect will be triggered
        // Multi Master: if success, connection recovered
        //               if error and Master Node crashed notification was already received, nothing must be done
        //               if error and Master Node NOT crashed, sessionStatus method must be sent:
        //                 if life is equal, networkDisconnect
        //                 if life is greater, nodeCrashed
        this.sendRequest('connect', { sessionId: rpcSessionId, reconnect: true }, (error, response) => {
            if (!!error) {
                if (this.isMasterNodeCrashed()) {
                    logger.warn('Master Node has crashed!');
                } else {
                    logger.error(error);

                    const notifyLostConnection = (reason, errorMsg) => {
                        logger.warn(errorMsg);
                        this.session.onLostConnection(reason);
                        this.jsonRpcClient.close(4101, 'Reconnection fault: ' + errorMsg);
                    };

                    const rpcSessionStatus = () => {
                        if (this.life === -1) {
                            // Single Master
                            notifyLostConnection(
                                'networkDisconnect',
                                'WS successfully reconnected but the user was already evicted due to timeout'
                            );
                        } else {
                            // Multi Master
                            // This RPC method is only required to find out the reason of the disconnection:
                            // whether the client lost its network connection or a Master Node crashed
                            this.sendRequest('sessionStatus', { sessionId: this.session.sessionId }, (error, response) => {
                                if (error != null) {
                                    console.error('Error checking session status', error);
                                } else {
                                    if (this.life === response.life) {
                                        // If the life stored in the client matches the life stored in the server, it means that the client lost its network connection
                                        notifyLostConnection(
                                            'networkDisconnect',
                                            'WS successfully reconnected but the user was already evicted due to timeout'
                                        );
                                    } else {
                                        // If the life stored in the client is below the life stored in the server, it means that the Master Node has crashed
                                        notifyLostConnection(
                                            'nodeCrashed',
                                            'WS successfully reconnected to OpenVidu Server but your Master Node crashed'
                                        );
                                    }
                                }
                            });
                        }
                    };

                    if (error.code === 40007 && error.message === 'reconnection error') {
                        // Kurento error: invalid RPC sessionId. This means that the kurento-jsonrpc-server of openvidu-server where kurento-jsonrpc-client
                        // is trying to reconnect does not know about this sessionId. This can mean two things:
                        // 1) openvidu-browser managed to reconnect after a while, but openvidu-server already evicted the user for not receiving ping.
                        // 2) openvidu-server process is a different one because of a node crash.
                        // Send a "sessionStatus" method to check the reason
                        console.error('Invalid RPC sessionId. Client network disconnection or Master Node crash');
                        rpcSessionStatus();
                    } else {
                        rpcSessionStatus();
                    }
                }
            } else {
                this.jsonRpcClient.resetPing();
                this.session.onRecoveredConnection();
            }
        });
    }

    private reconnectedCallback(): void {
        logger.warn('Websocket reconnected');
        if (this.isRoomAvailable()) {
            if (!!this.session.connection) {
                this.reconnectWebsocketThroughRpcConnectMethod(this.session.connection.rpcSessionId);
            } else {
                logger.warn('There was no previous connection when running reconnection callback');
                // Make Session object dispatch 'sessionDisconnected' event
                const sessionDisconnectEvent = new SessionDisconnectedEvent(this.session, 'networkDisconnect');
                this.session.ee.emitEvent('sessionDisconnected', [sessionDisconnectEvent]);
                sessionDisconnectEvent.callDefaultBehavior();
            }
        } else {
            alert('Connection error. Please reload page.');
        }
    }

    private isMasterNodeCrashed() {
        return this.masterNodeHasCrashed;
    }

    private isRoomAvailable(): boolean {
        if (this.session !== undefined && this.session instanceof Session) {
            return true;
        } else {
            logger.warn('Session instance not found');
            return false;
        }
    }

    private isScreenShare(videoSource: string) {
        return videoSource === 'screen' || videoSource === 'window' || (platform.isElectron() && videoSource.startsWith('screen:'));
    }
}
