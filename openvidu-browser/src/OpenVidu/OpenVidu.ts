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

import { LocalRecorder } from './LocalRecorder';
import { Publisher } from './Publisher';
import { Session } from './Session';
import { Stream } from './Stream';
import { StreamPropertyChangedEvent } from '../OpenViduInternal/Events/StreamPropertyChangedEvent';
import { Device } from '../OpenViduInternal/Interfaces/Public/Device';
import { OpenViduAdvancedConfiguration } from '../OpenViduInternal/Interfaces/Public/OpenViduAdvancedConfiguration';
import { PublisherProperties } from '../OpenViduInternal/Interfaces/Public/PublisherProperties';
import { OpenViduError, OpenViduErrorName } from '../OpenViduInternal/Enums/OpenViduError';
import { VideoInsertMode } from '../OpenViduInternal/Enums/VideoInsertMode';

import * as screenSharingAuto from '../OpenViduInternal/ScreenSharing/Screen-Capturing-Auto';
import * as screenSharing from '../OpenViduInternal/ScreenSharing/Screen-Capturing';

import EventEmitter = require('wolfy87-eventemitter');
import RpcBuilder = require('../OpenViduInternal/KurentoUtils/kurento-jsonrpc');
import platform = require('platform');
platform['isIonicIos'] = (platform.product === 'iPhone' || platform.product === 'iPad') && platform.ua!!.indexOf('Safari') === -1;
platform['isIonicAndroid'] = platform.os!!.family === 'Android' && platform.name == "Android Browser";

/**
 * @hidden
 */
const packageJson = require('../../package.json');
/**
 * @hidden
 */
declare var cordova: any;

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

    console.info("'OpenVidu' initialized");
    console.info("openvidu-browser version: " + this.libraryVersion);

    if (platform.os!!.family === 'iOS' || platform.os!!.family === 'Android') {
      // Listen to orientationchange only on mobile devices
      (<any>window).addEventListener('orientationchange', () => {
        this.publishers.forEach(publisher => {
          if (publisher.stream.isLocalStreamPublished && !!publisher.stream && !!publisher.stream.hasVideo && !!publisher.stream.streamManager.videos[0]) {

            let attempts = 0;

            const oldWidth = publisher.stream.videoDimensions.width;
            const oldHeight = publisher.stream.videoDimensions.height;

            const getNewVideoDimensions = (): Promise<{ newWidth: number, newHeight: number }> => {
              return new Promise((resolve, reject) => {
                if (platform['isIonicIos']) {
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
                  const newWidth = <number>((platform.name!!.toLowerCase().indexOf('firefox') !== -1) ? firefoxSettings.width : publisher.videoReference.videoWidth);
                  const newHeight = <number>((platform.name!!.toLowerCase().indexOf('firefox') !== -1) ? firefoxSettings.height : publisher.videoReference.videoHeight);
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
                      console.error("Error sending 'streamPropertyChanged' event", error);
                    } else {
                      this.session.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent(this.session, publisher.stream, 'videoDimensions', publisher.stream.videoDimensions, { width: oldWidth, height: oldHeight }, 'deviceRotated')]);
                      publisher.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent(publisher, publisher.stream, 'videoDimensions', publisher.stream.videoDimensions, { width: oldWidth, height: oldHeight }, 'deviceRotated')]);
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
   * [let OpenVidu take care of the video players](/docs/how-do-i/manage-videos/#let-openvidu-take-care-of-the-video-players)). See [[VideoElementEvent]] to learn more.
   *
   * The [[Publisher]] object will dispatch a `streamPlaying` event once the local streams starts playing. See [[StreamManagerEvent]] to learn more.
   *
   * @param targetElement  HTML DOM element (or its `id` attribute) in which the video element of the Publisher will be inserted (see [[PublisherProperties.insertMode]]). If *null* or *undefined* no default video will be created for this Publisher.
   * You can always call method [[Publisher.addVideoElement]] or [[Publisher.createVideoElement]] to manage the video elements on your own (see [Manage video players](/docs/how-do-i/manage-videos) section)
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
    const browser = platform.name;
    const family = platform.os!!.family;
    const userAgent = !!platform.ua ? platform.ua : navigator.userAgent;

    // Reject iPhones and iPads if not Safari ('Safari' also covers Ionic for iOS)
    if (family === 'iOS' && (browser !== 'Safari' || userAgent.indexOf('CriOS') !== -1 || userAgent.indexOf('FxiOS') !== -1)) {
      return 0;
    }

    // Accept: Chrome (desktop and Android), Firefox (desktop and Android), Opera (desktop and Android),
    // Safari (OSX and iOS), Ionic (Android and iOS)
    if (
      (browser !== 'Safari') &&
      (browser !== 'Chrome') && (browser !== 'Chrome Mobile') &&
      (browser !== 'Firefox') && (browser !== 'Firefox Mobile') &&
      (browser !== 'Opera') && (browser !== 'Opera Mobile') &&
      (browser !== 'Android Browser') && (browser !== 'Electron')
    ) {
      return 0;
    } else {
      return 1;
    }
  }


  /**
   * Checks if the browser supports screen-sharing. Desktop Chrome, Firefox and Opera support screen-sharing
   * @returns 1 if the browser supports screen-sharing, 0 otherwise
   */
  checkScreenSharingCapabilities(): number {
    const browser = platform.name;
    const family = platform.os!!.family;

    // Reject mobile devices
    if (family === 'iOS' || family === 'Android') {
      return 0;
    }

    if ((browser !== 'Chrome') && (browser !== 'Firefox') && (browser !== 'Opera') && (browser !== 'Electron')) {
      return 0;
    } else {
      return 1;
    }
  }


  /**
   * Collects information about the media input devices available on the system. You can pass property `deviceId` of a [[Device]] object as value of `audioSource` or `videoSource` properties in [[initPublisher]] method
   */
  getDevices(): Promise<Device[]> {
    return new Promise<Device[]>((resolve, reject) => {
      navigator.mediaDevices.enumerateDevices().then((deviceInfos) => {
        const devices: Device[] = [];

        // Ionic Android  devices
        if (platform['isIonicAndroid'] && cordova.plugins && cordova.plugins.EnumerateDevicesPlugin) {
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
        console.error('Error getting devices', error);
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
   *    audioSource: false;
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
      this.generateMediaConstraints(options)
        .then(constraints => {
          navigator.mediaDevices.getUserMedia(constraints)
            .then(mediaStream => {
              resolve(mediaStream);
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
        })
        .catch((error: OpenViduError) => {
          reject(error);
        });
    });
  }


  /* tslint:disable:no-empty */
  /**
   * Disable all logging except error level
   */
  enableProdMode(): void {
    console.log = () => { };
    console.debug = () => { };
    console.info = () => { };
    console.warn = () => { };
  }
  /* tslint:enable:no-empty */


  /**
   * Set OpenVidu advanced configuration options. Currently `configuration` is an object with the following optional properties (see [[OpenViduAdvancedConfiguration]] for more details):
   * - `iceServers`: set custom STUN/TURN servers to be used by OpenVidu Browser
   * - `screenShareChromeExtension`: url to a custom screen share extension for Chrome to be used instead of the default one, based on ours [https://github.com/OpenVidu/openvidu-screen-sharing-chrome-extension](https://github.com/OpenVidu/openvidu-screen-sharing-chrome-extension)
   * - `publisherSpeakingEventsOptions`: custom configuration for the [[PublisherSpeakingEvent]] feature
   */
  setAdvancedConfiguration(configuration: OpenViduAdvancedConfiguration): void {
    this.advancedConfiguration = configuration;
  }


  /* Hidden methods */

  /**
   * @hidden
   */
  generateMediaConstraints(publisherProperties: PublisherProperties): Promise<MediaStreamConstraints> {
    return new Promise<MediaStreamConstraints>((resolve, reject) => {
      let audio, video;

      if (publisherProperties.audioSource === null || publisherProperties.audioSource === false) {
        audio = false;
      } else if (publisherProperties.audioSource === undefined) {
        audio = true;
      } else {
        audio = publisherProperties.audioSource;
      }

      if (publisherProperties.videoSource === null || publisherProperties.videoSource === false) {
        video = false;
      } else {
        video = {
          height: {
            ideal: 480
          },
          width: {
            ideal: 640
          }
        };
      }

      const mediaConstraints: MediaStreamConstraints = {
        audio,
        video
      };

      if (typeof mediaConstraints.audio === 'string') {
        mediaConstraints.audio = { deviceId: { exact: mediaConstraints.audio } };
      }

      if (mediaConstraints.video) {

        if (!!publisherProperties.resolution) {
          const widthAndHeight = publisherProperties.resolution.toLowerCase().split('x');
          const width = Number(widthAndHeight[0]);
          const height = Number(widthAndHeight[1]);
          (mediaConstraints.video as any).width.ideal = width;
          (mediaConstraints.video as any).height.ideal = height;
        }

        if (!!publisherProperties.frameRate) {
          (mediaConstraints.video as any).frameRate = { ideal: publisherProperties.frameRate };
        }

        if (!!publisherProperties.videoSource && typeof publisherProperties.videoSource === 'string') {

          if (publisherProperties.videoSource === 'screen' ||
            (platform.name!.indexOf('Firefox') !== -1 && publisherProperties.videoSource === 'window') ||
            (platform.name === 'Electron' && publisherProperties.videoSource.startsWith('screen:'))) {

            if (!this.checkScreenSharingCapabilities()) {

              const error = new OpenViduError(OpenViduErrorName.SCREEN_SHARING_NOT_SUPPORTED, 'You can only screen share in desktop Chrome, Firefox, Opera or Electron. Detected client: ' + platform.name);
              console.error(error);
              reject(error);

            } else {

              if (platform.name === 'Electron') {

                const prefix = "screen:";
                const videoSourceString: string = publisherProperties.videoSource;
                const electronScreenId = videoSourceString.substr(videoSourceString.indexOf(prefix) + prefix.length);
                (<any>mediaConstraints['video']) = {
                  mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: electronScreenId
                  }
                };
                resolve(mediaConstraints);

              } else {

                if (!!this.advancedConfiguration.screenShareChromeExtension && !(platform.name!.indexOf('Firefox') !== -1) && !navigator.mediaDevices['getDisplayMedia']) {

                  // Custom screen sharing extension for Chrome (and Opera) and no support for MediaDevices.getDisplayMedia()

                  screenSharing.getScreenConstraints((error, screenConstraints) => {
                    if (!!error || !!screenConstraints.mandatory && screenConstraints.mandatory.chromeMediaSource === 'screen') {
                      if (error === 'permission-denied' || error === 'PermissionDeniedError') {
                        const error = new OpenViduError(OpenViduErrorName.SCREEN_CAPTURE_DENIED, 'You must allow access to one window of your desktop');
                        console.error(error);
                        reject(error);
                      } else {
                        const extensionId = this.advancedConfiguration.screenShareChromeExtension!.split('/').pop()!!.trim();
                        screenSharing.getChromeExtensionStatus(extensionId, (status) => {
                          if (status === 'installed-disabled') {
                            const error = new OpenViduError(OpenViduErrorName.SCREEN_EXTENSION_DISABLED, 'You must enable the screen extension');
                            console.error(error);
                            reject(error);
                          }
                          if (status === 'not-installed') {
                            const error = new OpenViduError(OpenViduErrorName.SCREEN_EXTENSION_NOT_INSTALLED, (<string>this.advancedConfiguration.screenShareChromeExtension));
                            console.error(error);
                            reject(error);
                          }
                        });
                      }
                    } else {
                      mediaConstraints.video = screenConstraints;
                      resolve(mediaConstraints);
                    }
                  });

                } else {

                  if (navigator.mediaDevices['getDisplayMedia']) {
                    // getDisplayMedia support (Chrome >= 72, Firefox >= 52)
                    resolve(mediaConstraints);
                  } else {
                    // Default screen sharing extension for Chrome/Opera, or is Firefox < 66
                    const firefoxString = platform.name!.indexOf('Firefox') !== -1 ? publisherProperties.videoSource : undefined;

                    screenSharingAuto.getScreenId(firefoxString, (error, sourceId, screenConstraints) => {
                      if (!!error) {
                        if (error === 'not-installed') {
                          const extensionUrl = !!this.advancedConfiguration.screenShareChromeExtension ? this.advancedConfiguration.screenShareChromeExtension :
                            'https://chrome.google.com/webstore/detail/openvidu-screensharing/lfcgfepafnobdloecchnfaclibenjold';
                          const error = new OpenViduError(OpenViduErrorName.SCREEN_EXTENSION_NOT_INSTALLED, extensionUrl);
                          console.error(error);
                          reject(error);
                        } else if (error === 'installed-disabled') {
                          const error = new OpenViduError(OpenViduErrorName.SCREEN_EXTENSION_DISABLED, 'You must enable the screen extension');
                          console.error(error);
                          reject(error);
                        } else if (error === 'permission-denied') {
                          const error = new OpenViduError(OpenViduErrorName.SCREEN_CAPTURE_DENIED, 'You must allow access to one window of your desktop');
                          console.error(error);
                          reject(error);
                        }
                      } else {
                        mediaConstraints.video = screenConstraints.video;
                        resolve(mediaConstraints);
                      }
                    });
                  }
                }

                publisherProperties.videoSource = 'screen';

              }
            }
          } else {
            // tslint:disable-next-line:no-string-literal
            mediaConstraints.video['deviceId'] = { exact: publisherProperties.videoSource };
            resolve(mediaConstraints);
          }
        } else {
          resolve(mediaConstraints);
        }
      } else {
        resolve(mediaConstraints);
      }
    });
  }

  /**
   * @hidden
   */
  startWs(onConnectSucces: (error: Error) => void): void {
    const config = {
      heartbeat: 5000,
      sendCloseMessage: false,
      ws: {
        uri: this.wsUri,
        useSockJS: false,
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
    console.debug('Sending request: {method:"' + method + '", params: ' + JSON.stringify(params) + '}');
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


  /* Private methods */

  private disconnectCallback(): void {
    console.warn('Websocket connection lost');
    if (this.isRoomAvailable()) {
      this.session.onLostConnection('networkDisconnect');
    } else {
      alert('Connection error. Please reload page.');
    }
  }

  private reconnectingCallback(): void {
    console.warn('Websocket connection lost (reconnecting)');
    if (!this.isRoomAvailable()) {
      alert('Connection error. Please reload page.');
    }
  }

  private reconnectedCallback(): void {
    console.warn('Websocket reconnected');
    if (this.isRoomAvailable()) {
      this.sendRequest('connect', { sessionId: this.session.connection.rpcSessionId }, (error, response) => {
        if (!!error) {
          console.error(error);
          this.session.onLostConnection("networkDisconnect");
          this.jsonRpcClient.close(4101, "Reconnection fault");
        } else {
          this.jsonRpcClient.resetPing();
          this.session.onRecoveredConnection();
        }
      });
    } else {
      alert('Connection error. Please reload page.');
    }
  }

  private isRoomAvailable(): boolean {
    if (this.session !== undefined && this.session instanceof Session) {
      return true;
    } else {
      console.warn('Session instance not found');
      return false;
    }
  }

}