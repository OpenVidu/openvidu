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

import * as screenSharingAuto from '../OpenViduInternal/ScreenSharing/Screen-Capturing-Auto';
import * as screenSharing from '../OpenViduInternal/ScreenSharing/Screen-Capturing';
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
const platform: PlatformUtils = PlatformUtils.getInstance();

/**
 * Entrypoint of OpenVidu Browser library.
 * Use it to initialize objects of type [[Session]], [[Publisher]] and [[LocalRecorder]]
 */
export class OpenVidu {

  private jsonRpcClient: any;

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
  iceServers: RTCIceServer[];
  /**
   * @hidden
   */
  role: string;
  /**
   * @hidden
   */
  advancedConfiguration: OpenViduAdvancedConfiguration = {};
  /**
   * @hidden
   */
  webrtcStatsInterval: number = 0;
  /**
   * @hidden
   */
  libraryVersion: string;
  /**
   * @hidden
   */
  ee = new EventEmitter()

  constructor() {
    this.libraryVersion = packageJson.version;
    logger.info("'OpenVidu' initialized");
    logger.info("openvidu-browser version: " + this.libraryVersion);

    if (platform.isMobileDevice()) {
      // Listen to orientationchange only on mobile devices
      (<any>window).addEventListener('orientationchange', () => {
        this.publishers.forEach(publisher => {
          if (publisher.stream.isLocalStreamPublished && !!publisher.stream && !!publisher.stream.hasVideo && !!publisher.stream.streamManager.videos[0]) {

            let attempts = 0;

            const oldWidth = publisher.stream.videoDimensions.width;
            const oldHeight = publisher.stream.videoDimensions.height;

            const getNewVideoDimensions = (): Promise<{ newWidth: number, newHeight: number }> => {
              return new Promise((resolve, reject) => {
                if (platform.isIonicIos()) {
                  // iOS Ionic. Limitation: must get new dimensions from an existing video element already inserted into DOM
                  resolve({
                    newWidth: publisher.stream.streamManager.videos[0].video.videoWidth,
                    newHeight: publisher.stream.streamManager.videos[0].video.videoHeight
                  });
                } else {
                  // Rest of platforms
                  // New resolution got from different places for Chrome and Firefox. Chrome needs a videoWidth and videoHeight of a videoElement.
                  // Firefox needs getSettings from the videoTrack
                  const firefoxSettings = publisher.stream.getMediaStream().getVideoTracks()[0].getSettings();
                  const newWidth = <number>((platform.isFirefoxBrowser() || platform.isFirefoxMobileBrowser()) ? firefoxSettings.width : publisher.videoReference.videoWidth);
                  const newHeight = <number>((platform.isFirefoxBrowser() || platform.isFirefoxMobileBrowser()) ? firefoxSettings.height : publisher.videoReference.videoHeight);
                  resolve({ newWidth, newHeight });
                }
              });
            };

            const repeatUntilChange = setInterval(() => {
              getNewVideoDimensions().then(newDimensions => {
                sendStreamPropertyChangedEvent(oldWidth, oldHeight, newDimensions.newWidth, newDimensions.newHeight);
              });
            }, 75);

            const sendStreamPropertyChangedEvent = (oldWidth, oldHeight, newWidth, newHeight) => {
              attempts++;
              if (attempts > 10) {
                clearTimeout(repeatUntilChange);
              }
              if (newWidth !== oldWidth || newHeight !== oldHeight) {
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
                    reason: 'deviceRotated'
                  },
                  (error, response) => {
                    if (error) {
                      logger.error("Error sending 'streamPropertyChanged' event", error);
                    } else {
                      this.session.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent(this.session, publisher.stream, 'videoDimensions', publisher.stream.videoDimensions, { width: oldWidth, height: oldHeight }, 'deviceRotated')]);
                      publisher.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent(publisher, publisher.stream, 'videoDimensions', publisher.stream.videoDimensions, { width: oldWidth, height: oldHeight }, 'deviceRotated')]);
                      this.session.sendVideoData(publisher);
                    }
                  });
                clearTimeout(repeatUntilChange);
              }
            };
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


  initPublisher(targetElement: string | HTMLElement): Publisher;
  initPublisher(targetElement: string | HTMLElement, properties: PublisherProperties): Publisher;
  initPublisher(targetElement: string | HTMLElement, completionHandler: (error: Error | undefined) => void): Publisher;
  initPublisher(targetElement: string | HTMLElement, properties: PublisherProperties, completionHandler: (error: Error | undefined) => void): Publisher;

  /**
   * Returns a new publisher
   *
   * #### Events dispatched
   *
   * The [[Publisher]] object will dispatch an `accessDialogOpened` event, only if the pop-up shown by the browser to request permissions for the camera is opened. You can use this event to alert the user about granting permissions
   * for your website. An `accessDialogClosed` event will also be dispatched after user clicks on "Allow" or "Block" in the pop-up.
   *
   * The [[Publisher]] object will dispatch an `accessAllowed` or `accessDenied` event once it has been granted access to the requested input devices or not.
   *
   * The [[Publisher]] object will dispatch a `videoElementCreated` event once a HTML video element has been added to DOM (only if you
   * [let OpenVidu take care of the video players](/en/stable/cheatsheet/manage-videos/#let-openvidu-take-care-of-the-video-players)). See [[VideoElementEvent]] to learn more.
   *
   * The [[Publisher]] object will dispatch a `streamPlaying` event once the local streams starts playing. See [[StreamManagerEvent]] to learn more.
   *
   * @param targetElement  HTML DOM element (or its `id` attribute) in which the video element of the Publisher will be inserted (see [[PublisherProperties.insertMode]]). If *null* or *undefined* no default video will be created for this Publisher.
   * You can always call method [[Publisher.addVideoElement]] or [[Publisher.createVideoElement]] to manage the video elements on your own (see [Manage video players](/en/stable/cheatsheet/manage-videos) section)
   * @param completionHandler `error` parameter is null if `initPublisher` succeeds, and is defined if it fails.
   *                          `completionHandler` function is called before the Publisher dispatches an `accessAllowed` or an `accessDenied` event
   */
  initPublisher(targetElement: string | HTMLElement, param2?, param3?): Publisher {

    let properties: PublisherProperties;

    if (!!param2 && (typeof param2 !== 'function')) {

      // Matches 'initPublisher(targetElement, properties)' or 'initPublisher(targetElement, properties, completionHandler)'

      properties = (<PublisherProperties>param2);

      properties = {
        audioSource: (typeof properties.audioSource !== 'undefined') ? properties.audioSource : undefined,
        frameRate: (typeof MediaStreamTrack !== 'undefined' && properties.videoSource instanceof MediaStreamTrack) ? undefined : ((typeof properties.frameRate !== 'undefined') ? properties.frameRate : undefined),
        insertMode: (typeof properties.insertMode !== 'undefined') ? ((typeof properties.insertMode === 'string') ? VideoInsertMode[properties.insertMode] : properties.insertMode) : VideoInsertMode.APPEND,
        mirror: (typeof properties.mirror !== 'undefined') ? properties.mirror : true,
        publishAudio: (typeof properties.publishAudio !== 'undefined') ? properties.publishAudio : true,
        publishVideo: (typeof properties.publishVideo !== 'undefined') ? properties.publishVideo : true,
        resolution: (typeof MediaStreamTrack !== 'undefined' && properties.videoSource instanceof MediaStreamTrack) ? undefined : ((typeof properties.resolution !== 'undefined') ? properties.resolution : '640x480'),
        videoSource: (typeof properties.videoSource !== 'undefined') ? properties.videoSource : undefined,
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
    if (!!param2 && (typeof param2 === 'function')) {
      completionHandler = param2;
    } else if (!!param3) {
      completionHandler = param3;
    }

    publisher.initialize()
      .then(() => {
        if (completionHandler !== undefined) {
          completionHandler(undefined);
        }
        publisher.emitEvent('accessAllowed', []);
      }).catch((error) => {
        if (completionHandler !== undefined) {
          completionHandler(error);
        }
        publisher.emitEvent('accessDenied', [error]);
      });

    this.publishers.push(publisher);
    return publisher;
  }


  /**
   * Promisified version of [[OpenVidu.initPublisher]]
   *
   * > WARNING: events `accessDialogOpened` and `accessDialogClosed` will not be dispatched if using this method instead of [[OpenVidu.initPublisher]]
   */
  initPublisherAsync(targetElement: string | HTMLElement): Promise<Publisher>;
  initPublisherAsync(targetElement: string | HTMLElement, properties: PublisherProperties): Promise<Publisher>;

  initPublisherAsync(targetElement: string | HTMLElement, properties?: PublisherProperties): Promise<Publisher> {
    return new Promise<Publisher>((resolve, reject) => {

      let publisher: Publisher;

      const callback = (error: Error) => {
        if (!!error) {
          reject(error);
        } else {
          resolve(publisher);
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
  checkSystemRequirements(): number {

    if (platform.isIPhoneOrIPad()) {
      if (platform.isIOSWithSafari() || platform.isIonicIos()) {
        return 1;
      }
      return 0;
    }

    // Accept: Chrome (desktop and Android), Firefox (desktop and Android), Opera (desktop and Android),
    // Safari (OSX and iOS), Edge Chromium (>= 80), Ionic (Android and iOS), Samsung Internet Browser (Android)
    if (platform.isChromeBrowser() || platform.isChromeMobileBrowser() ||
      platform.isFirefoxBrowser() || platform.isFirefoxMobileBrowser() || platform.isOperaBrowser() ||
      platform.isOperaMobileBrowser() || platform.isSafariBrowser() || platform.isEdgeBrowser() ||
      platform.isAndroidBrowser() || platform.isElectron() || platform.isSamsungBrowser()
    ) {
      return 1;
    }
    // Reject iPhones and iPads if not Safari ('Safari' also covers Ionic for iOS)
    // Reject others browsers not mentioned above
    return 0;

  }

  /**
   * Checks if the browser supports screen-sharing. Desktop Chrome, Firefox and Opera support screen-sharing
   * @returns 1 if the browser supports screen-sharing, 0 otherwise
   */
  checkScreenSharingCapabilities(): boolean {
    return platform.canScreenShare();
  }


  /**
   * Collects information about the media input devices available on the system. You can pass property `deviceId` of a [[Device]] object as value of `audioSource` or `videoSource` properties in [[initPublisher]] method
   */
  getDevices(): Promise<Device[]> {
    return new Promise<Device[]>((resolve, reject) => {
      navigator.mediaDevices.enumerateDevices().then((deviceInfos) => {
        const devices: Device[] = [];

        // Ionic Android  devices
        if (platform.isIonicAndroid() && typeof cordova != "undefined" && cordova?.plugins?.EnumerateDevicesPlugin) {
          cordova.plugins.EnumerateDevicesPlugin.getEnumerateDevices().then((pluginDevices: Device[]) => {
            let pluginAudioDevices: Device[] = [];
            let videoDevices: Device[] = [];
            let audioDevices: Device[] = [];
            pluginAudioDevices = pluginDevices.filter((device: Device) => device.kind === 'audioinput');
            videoDevices = deviceInfos.filter((device: Device) => device.kind === 'videoinput');
            audioDevices = deviceInfos.filter((device: Device) => device.kind === 'audioinput');
            videoDevices.forEach((deviceInfo, index) => {
              if (!deviceInfo.label) {
                let label = "";
                if (index === 0) {
                  label = "Front Camera";
                } else if (index === 1) {
                  label = "Back Camera";
                } else {
                  label = "Unknown Camera";
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
                let label = "";
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
                    label = "Unknown Microphone";
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
            resolve(devices);
          });
        } else {

          // Rest of platforms
          deviceInfos.forEach(deviceInfo => {
            if (deviceInfo.kind === 'audioinput' || deviceInfo.kind === 'videoinput') {
              devices.push({
                kind: deviceInfo.kind,
                deviceId: deviceInfo.deviceId,
                label: deviceInfo.label
              });
            }
          });
          resolve(devices);
        }
      }).catch((error) => {
        logger.error('Error getting devices', error);
        reject(error);
      });
    });
  }



  /**
   * Get a MediaStream object that you can customize before calling [[initPublisher]] (pass _MediaStreamTrack_ property of the _MediaStream_ value resolved by the Promise as `audioSource` or `videoSource` properties in [[initPublisher]])
   *
   * Parameter `options` is the same as in [[initPublisher]] second parameter (of type [[PublisherProperties]]), but only the following properties will be applied: `audioSource`, `videoSource`, `frameRate`, `resolution`
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
  getUserMedia(options: PublisherProperties): Promise<MediaStream> {
    return new Promise<MediaStream>((resolve, reject) => {

      const askForAudioStreamOnly = (previousMediaStream: MediaStream, constraints: MediaStreamConstraints) => {
        const definedAudioConstraint = ((constraints.audio === undefined) ? true : constraints.audio);
        const constraintsAux: MediaStreamConstraints = { audio: definedAudioConstraint, video: false };
        navigator.mediaDevices.getUserMedia(constraintsAux)
          .then(audioOnlyStream => {
            previousMediaStream.addTrack(audioOnlyStream.getAudioTracks()[0]);
            resolve(previousMediaStream);
          })
          .catch(error => {
            previousMediaStream.getAudioTracks().forEach((track) => {
              track.stop();
            });
            previousMediaStream.getVideoTracks().forEach((track) => {
              track.stop();
            });
            reject(this.generateAudioDeviceError(error, constraintsAux));
          });
      }

      this.generateMediaConstraints(options).then(myConstraints => {

        if (!!myConstraints.videoTrack && !!myConstraints.audioTrack ||
          !!myConstraints.audioTrack && myConstraints.constraints?.video === false ||
          !!myConstraints.videoTrack && myConstraints.constraints?.audio === false) {

          // No need to call getUserMedia at all. Both tracks provided, or only AUDIO track provided or only VIDEO track provided
          resolve(this.addAlreadyProvidedTracks(myConstraints, new MediaStream()));

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
            if (options.videoSource === 'screen' ||
              options.videoSource === 'window' ||
              (platform.isElectron() && options.videoSource.startsWith('screen:'))) {
              // Video is screen sharing
              mustAskForAudioTrackLater = !myConstraints.audioTrack && (options.audioSource !== null && options.audioSource !== false);
              if (navigator.mediaDevices['getDisplayMedia'] && !platform.isElectron()) {
                // getDisplayMedia supported
                navigator.mediaDevices['getDisplayMedia']({ video: true })
                  .then(mediaStream => {
                    this.addAlreadyProvidedTracks(myConstraints, mediaStream);
                    if (mustAskForAudioTrackLater) {
                      askForAudioStreamOnly(mediaStream, <MediaStreamConstraints>myConstraints.constraints);
                      return;
                    } else {
                      resolve(mediaStream);
                    }
                  })
                  .catch(error => {
                    let errorName: OpenViduErrorName = OpenViduErrorName.SCREEN_CAPTURE_DENIED;
                    const errorMessage = error.toString();
                    reject(new OpenViduError(errorName, errorMessage));
                  });
                return;
              } else {
                // getDisplayMedia NOT supported. Can perform getUserMedia below with already calculated constraints
              }
            } else {
              // Video is deviceId. Can perform getUserMedia below with already calculated constraints
            }
          }
          // Use already calculated constraints
          const constraintsAux = mustAskForAudioTrackLater ? { video: myConstraints.constraints!.video } : myConstraints.constraints;
          navigator.mediaDevices.getUserMedia(constraintsAux)
            .then(mediaStream => {
              this.addAlreadyProvidedTracks(myConstraints, mediaStream);
              if (mustAskForAudioTrackLater) {
                askForAudioStreamOnly(mediaStream, <MediaStreamConstraints>myConstraints.constraints);
                return;
              } else {
                resolve(mediaStream);
              }
            })
            .catch(error => {
              let errorName: OpenViduErrorName;
              const errorMessage = error.toString();
              if (!(options.videoSource === 'screen')) {
                errorName = OpenViduErrorName.DEVICE_ACCESS_DENIED;
              } else {
                errorName = OpenViduErrorName.SCREEN_CAPTURE_DENIED;
              }
              reject(new OpenViduError(errorName, errorMessage));
            });
        }
      }).catch((error: OpenViduError) => {
        reject(error);
      });
    });
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
   * Set OpenVidu advanced configuration options. Currently `configuration` is an object with the following optional properties (see [[OpenViduAdvancedConfiguration]] for more details):
   * - `iceServers`: set custom STUN/TURN servers to be used by OpenVidu Browser
   * - `screenShareChromeExtension`: url to a custom screen share extension for Chrome to be used instead of the default one, based on ours [https://github.com/OpenVidu/openvidu-screen-sharing-chrome-extension](https://github.com/OpenVidu/openvidu-screen-sharing-chrome-extension)
   * - `publisherSpeakingEventsOptions`: custom configuration for the [[PublisherSpeakingEvent]] feature and the [StreamManagerEvent.streamAudioVolumeChange](/en/stable/api/openvidu-browser/classes/streammanagerevent.html) feature
   * - `forceMediaReconnectionAfterNetworkDrop`: always force WebRTC renegotiation of all the streams of a client after a network loss and reconnection. This can help reducing frozen videos in low quality networks.
   *
   * Call this method to override previous values at any moment.
   */
  setAdvancedConfiguration(configuration: OpenViduAdvancedConfiguration): void {
    this.advancedConfiguration = configuration;
  }


  /* Hidden methods */

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
      }
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
        reject(new OpenViduError(OpenViduErrorName.NO_INPUT_SOURCE_SET,
          "Properties 'audioSource' and 'videoSource' cannot be set to false or null at the same time"));
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
          }
        }
        if (!!publisherProperties.frameRate) {
          (<MediaTrackConstraints>myConstraints.constraints!.video).frameRate = { ideal: publisherProperties.frameRate };
        }
      }

      // CASE 4: deviceId or screen sharing
      this.configureDeviceIdOrScreensharing(myConstraints, publisherProperties, resolve, reject);

      resolve(myConstraints);
    });
  }

  /**
   * @hidden
   */
  startWs(onConnectSucces: (error: Error) => void): void {
    const config = {
      heartbeat: 5000,
      ws: {
        uri: this.wsUri,
        onconnected: onConnectSucces,
        ondisconnect: this.disconnectCallback.bind(this),
        onreconnecting: this.reconnectingCallback.bind(this),
        onreconnected: this.reconnectedCallback.bind(this)
      },
      rpc: {
        requestTimeout: 10000,
        participantJoined: this.session.onParticipantJoined.bind(this.session),
        participantPublished: this.session.onParticipantPublished.bind(this.session),
        participantUnpublished: this.session.onParticipantUnpublished.bind(this.session),
        participantLeft: this.session.onParticipantLeft.bind(this.session),
        participantEvicted: this.session.onParticipantEvicted.bind(this.session),
        recordingStarted: this.session.onRecordingStarted.bind(this.session),
        recordingStopped: this.session.onRecordingStopped.bind(this.session),
        sendMessage: this.session.onNewMessage.bind(this.session),
        streamPropertyChanged: this.session.onStreamPropertyChanged.bind(this.session),
        connectionPropertyChanged: this.session.onConnectionPropertyChanged.bind(this.session),
        networkQualityLevelChanged: this.session.onNetworkQualityLevelChangedChanged.bind(this.session),
        filterEventDispatched: this.session.onFilterEventDispatched.bind(this.session),
        iceCandidate: this.session.recvIceCandidate.bind(this.session),
        mediaError: this.session.onMediaError.bind(this.session)
      }
    };
    this.jsonRpcClient = new RpcBuilder.clients.JsonRpcClient(config);
  }

  /**
   * @hidden
   */
  closeWs(): void {
    this.jsonRpcClient.close(4102, "Connection closed by client");
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
    this.jsonRpcClient.send(method, params, callback);
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
          errorMessage = "Audio input device with deviceId '" + (<ConstrainDOMStringParameters>(<MediaTrackConstraints>constraints.audio).deviceId!!).exact + "' not found";
        } else {
          errorName = OpenViduErrorName.PUBLISHER_PROPERTIES_ERROR;
          errorMessage = "Audio input device doesn't support the value passed for constraint '" + error.constraint + "'";
        }
        return new OpenViduError(errorName, errorMessage);
      case 'notreadableerror':
        errorName = OpenViduErrorName.DEVICE_ALREADY_IN_USE;
        errorMessage = error.toString();
        return (new OpenViduError(errorName, errorMessage));
      default:
        return new OpenViduError(OpenViduErrorName.INPUT_AUDIO_DEVICE_GENERIC_ERROR, error.toString());
    }
  }

  /**
   * @hidden
   */
  addAlreadyProvidedTracks(myConstraints: CustomMediaStreamConstraints, mediaStream: MediaStream) {
    if (!!myConstraints.videoTrack) {
      mediaStream.addTrack(myConstraints.videoTrack);
    }
    if (!!myConstraints.audioTrack) {
      mediaStream.addTrack(myConstraints.audioTrack);
    }
    return mediaStream;
  }

  /**
   * @hidden
   */
  protected configureDeviceIdOrScreensharing(myConstraints: CustomMediaStreamConstraints, publisherProperties: PublisherProperties, resolve, reject) {
    const audioSource = publisherProperties.audioSource;
    const videoSource = publisherProperties.videoSource;
    if (typeof audioSource === 'string') {
      myConstraints.constraints!.audio = { deviceId: { exact: audioSource } };
    }

    if (typeof videoSource === 'string') {

      if (!this.isScreenShare(videoSource)) {
        this.setVideoSource(myConstraints, videoSource);

      } else {

        // Screen sharing

        if (!this.checkScreenSharingCapabilities()) {
          const error = new OpenViduError(OpenViduErrorName.SCREEN_SHARING_NOT_SUPPORTED, 'You can only screen share in desktop Chrome, Firefox, Opera, Safari (>=13.0), Edge (>= 80) or Electron. Detected client: ' + platform.getName() + ' ' + platform.getVersion());
          logger.error(error);
          reject(error);
        } else {

          if (platform.isElectron()) {
            const prefix = "screen:";
            const videoSourceString: string = videoSource;
            const electronScreenId = videoSourceString.substr(videoSourceString.indexOf(prefix) + prefix.length);
            (<any>myConstraints.constraints!.video) = {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: electronScreenId
              }
            };
            resolve(myConstraints);

          } else {

            if (!!this.advancedConfiguration.screenShareChromeExtension && !(platform.isFirefoxBrowser() || platform.isFirefoxMobileBrowser()) && !navigator.mediaDevices['getDisplayMedia']) {

              // Custom screen sharing extension for Chrome (and Opera) and no support for MediaDevices.getDisplayMedia()

              screenSharing.getScreenConstraints((error, screenConstraints) => {
                if (!!error || !!screenConstraints.mandatory && screenConstraints.mandatory.chromeMediaSource === 'screen') {
                  if (error === 'permission-denied' || error === 'PermissionDeniedError') {
                    const error = new OpenViduError(OpenViduErrorName.SCREEN_CAPTURE_DENIED, 'You must allow access to one window of your desktop');
                    logger.error(error);
                    reject(error);
                  } else {
                    const extensionId = this.advancedConfiguration.screenShareChromeExtension!.split('/').pop()!!.trim();
                    screenSharing.getChromeExtensionStatus(extensionId, status => {
                      if (status === 'installed-disabled') {
                        const error = new OpenViduError(OpenViduErrorName.SCREEN_EXTENSION_DISABLED, 'You must enable the screen extension');
                        logger.error(error);
                        reject(error);
                      }
                      if (status === 'not-installed') {
                        const error = new OpenViduError(OpenViduErrorName.SCREEN_EXTENSION_NOT_INSTALLED, (<string>this.advancedConfiguration.screenShareChromeExtension));
                        logger.error(error);
                        reject(error);
                      }
                    });
                    return;
                  }
                } else {
                  myConstraints.constraints!.video = screenConstraints;
                  resolve(myConstraints);
                }
              });
              return;
            } else {

              if (navigator.mediaDevices['getDisplayMedia']) {
                // getDisplayMedia support (Chrome >= 72, Firefox >= 66, Safari >= 13)
                resolve(myConstraints);
              } else {
                // Default screen sharing extension for Chrome/Opera, or is Firefox < 66
                const firefoxString = (platform.isFirefoxBrowser() || platform.isFirefoxMobileBrowser()) ? publisherProperties.videoSource : undefined;

                screenSharingAuto.getScreenId(firefoxString, (error, sourceId, screenConstraints) => {
                  if (!!error) {
                    if (error === 'not-installed') {
                      const extensionUrl = !!this.advancedConfiguration.screenShareChromeExtension ? this.advancedConfiguration.screenShareChromeExtension :
                        'https://chrome.google.com/webstore/detail/openvidu-screensharing/lfcgfepafnobdloecchnfaclibenjold';
                      const err = new OpenViduError(OpenViduErrorName.SCREEN_EXTENSION_NOT_INSTALLED, extensionUrl);
                      logger.error(err);
                      reject(err);
                    } else if (error === 'installed-disabled') {
                      const err = new OpenViduError(OpenViduErrorName.SCREEN_EXTENSION_DISABLED, 'You must enable the screen extension');
                      logger.error(err);
                      reject(err);
                    } else if (error === 'permission-denied') {
                      const err = new OpenViduError(OpenViduErrorName.SCREEN_CAPTURE_DENIED, 'You must allow access to one window of your desktop');
                      logger.error(err);
                      reject(err);
                    } else {
                      const err = new OpenViduError(OpenViduErrorName.GENERIC_ERROR, 'Unknown error when accessing screen share');
                      logger.error(err);
                      logger.error(error);
                      reject(err);
                    }
                  } else {
                    myConstraints.constraints!.video = screenConstraints.video;
                    resolve(myConstraints);
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

  private reconnectedCallback(): void {
    logger.warn('Websocket reconnected');
    if (this.isRoomAvailable()) {
      if (!!this.session.connection) {
        this.sendRequest('connect', { sessionId: this.session.connection.rpcSessionId }, (error, response) => {
          if (!!error) {
            logger.error(error);
            logger.warn('Websocket was able to reconnect to OpenVidu Server, but your Connection was already destroyed due to timeout. You are no longer a participant of the Session and your media streams have been destroyed');
            this.session.onLostConnection("networkDisconnect");
            this.jsonRpcClient.close(4101, "Reconnection fault");
          } else {
            this.jsonRpcClient.resetPing();
            this.session.onRecoveredConnection();
          }
        });
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

  private isRoomAvailable(): boolean {
    if (this.session !== undefined && this.session instanceof Session) {
      return true;
    } else {
      logger.warn('Session instance not found');
      return false;
    }
  }

  private isScreenShare(videoSource: string) {
    return videoSource === 'screen' ||
      videoSource === 'window' ||
      (platform.isElectron() && videoSource.startsWith('screen:'))
  }

}