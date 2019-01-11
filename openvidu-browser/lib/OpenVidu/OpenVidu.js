"use strict";
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
exports.__esModule = true;
var LocalRecorder_1 = require("./LocalRecorder");
var Publisher_1 = require("./Publisher");
var Session_1 = require("./Session");
var StreamPropertyChangedEvent_1 = require("../OpenViduInternal/Events/StreamPropertyChangedEvent");
var OpenViduError_1 = require("../OpenViduInternal/Enums/OpenViduError");
var VideoInsertMode_1 = require("../OpenViduInternal/Enums/VideoInsertMode");
var screenSharingAuto = require("../OpenViduInternal/ScreenSharing/Screen-Capturing-Auto");
var screenSharing = require("../OpenViduInternal/ScreenSharing/Screen-Capturing");
var RpcBuilder = require("../OpenViduInternal/KurentoUtils/kurento-jsonrpc");
var platform = require("platform");
platform['isIonicIos'] = (platform.product === 'iPhone' || platform.product === 'iPad') && platform.ua.indexOf('Safari') === -1;
/**
 * Entrypoint of OpenVidu Browser library.
 * Use it to initialize objects of type [[Session]], [[Publisher]] and [[LocalRecorder]]
 */
var OpenVidu = /** @class */ (function () {
    function OpenVidu() {
        var _this = this;
        /**
         * @hidden
         */
        this.publishers = [];
        /**
         * @hidden
         */
        this.secret = '';
        /**
         * @hidden
         */
        this.recorder = false;
        /**
         * @hidden
         */
        this.advancedConfiguration = {};
        console.info("'OpenVidu' initialized");
        if (platform.os.family === 'iOS' || platform.os.family === 'Android') {
            // Listen to orientationchange only on mobile devices
            window.addEventListener('orientationchange', function () {
                _this.publishers.forEach(function (publisher) {
                    if (!!publisher.stream && !!publisher.stream.hasVideo && !!publisher.stream.streamManager.videos[0]) {
                        var attempts_1 = 0;
                        var oldWidth_1 = publisher.stream.videoDimensions.width;
                        var oldHeight_1 = publisher.stream.videoDimensions.height;
                        var getNewVideoDimensions_1 = function () {
                            return new Promise(function (resolve, reject) {
                                if (platform['isIonicIos']) {
                                    // iOS Ionic. Limitation: must get new dimensions from an existing video element already inserted into DOM
                                    resolve({
                                        newWidth: publisher.stream.streamManager.videos[0].video.videoWidth,
                                        newHeight: publisher.stream.streamManager.videos[0].video.videoHeight
                                    });
                                }
                                else {
                                    // Rest of platforms
                                    // New resolution got from different places for Chrome and Firefox. Chrome needs a videoWidth and videoHeight of a videoElement.
                                    // Firefox needs getSettings from the videoTrack
                                    var firefoxSettings = publisher.stream.getMediaStream().getVideoTracks()[0].getSettings();
                                    var newWidth = ((platform.name.toLowerCase().indexOf('firefox') !== -1) ? firefoxSettings.width : publisher.videoReference.videoWidth);
                                    var newHeight = ((platform.name.toLowerCase().indexOf('firefox') !== -1) ? firefoxSettings.height : publisher.videoReference.videoHeight);
                                    resolve({ newWidth: newWidth, newHeight: newHeight });
                                }
                            });
                        };
                        var repeatUntilChange_1 = setInterval(function () {
                            getNewVideoDimensions_1().then(function (newDimensions) {
                                sendStreamPropertyChangedEvent_1(oldWidth_1, oldHeight_1, newDimensions.newWidth, newDimensions.newHeight);
                            });
                        }, 75);
                        var sendStreamPropertyChangedEvent_1 = function (oldWidth, oldHeight, newWidth, newHeight) {
                            attempts_1++;
                            if (attempts_1 > 10) {
                                clearTimeout(repeatUntilChange_1);
                            }
                            if (newWidth !== oldWidth || newHeight !== oldHeight) {
                                publisher.stream.videoDimensions = {
                                    width: newWidth || 0,
                                    height: newHeight || 0
                                };
                                _this.sendRequest('streamPropertyChanged', {
                                    streamId: publisher.stream.streamId,
                                    property: 'videoDimensions',
                                    newValue: JSON.stringify(publisher.stream.videoDimensions),
                                    reason: 'deviceRotated'
                                }, function (error, response) {
                                    if (error) {
                                        console.error("Error sending 'streamPropertyChanged' event", error);
                                    }
                                    else {
                                        _this.session.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this.session, publisher.stream, 'videoDimensions', publisher.stream.videoDimensions, { width: oldWidth, height: oldHeight }, 'deviceRotated')]);
                                        publisher.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(publisher, publisher.stream, 'videoDimensions', publisher.stream.videoDimensions, { width: oldWidth, height: oldHeight }, 'deviceRotated')]);
                                    }
                                });
                                clearTimeout(repeatUntilChange_1);
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
    OpenVidu.prototype.initSession = function () {
        this.session = new Session_1.Session(this);
        return this.session;
    };
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
    OpenVidu.prototype.initPublisher = function (targetElement, param2, param3) {
        var properties;
        if (!!param2 && (typeof param2 !== 'function')) {
            // Matches 'initPublisher(targetElement, properties)' or 'initPublisher(targetElement, properties, completionHandler)'
            properties = param2;
            properties = {
                audioSource: (typeof properties.audioSource !== 'undefined') ? properties.audioSource : undefined,
                frameRate: (properties.videoSource instanceof MediaStreamTrack) ? undefined : ((typeof properties.frameRate !== 'undefined') ? properties.frameRate : undefined),
                insertMode: (typeof properties.insertMode !== 'undefined') ? ((typeof properties.insertMode === 'string') ? VideoInsertMode_1.VideoInsertMode[properties.insertMode] : properties.insertMode) : VideoInsertMode_1.VideoInsertMode.APPEND,
                mirror: (typeof properties.mirror !== 'undefined') ? properties.mirror : true,
                publishAudio: (typeof properties.publishAudio !== 'undefined') ? properties.publishAudio : true,
                publishVideo: (typeof properties.publishVideo !== 'undefined') ? properties.publishVideo : true,
                resolution: (properties.videoSource instanceof MediaStreamTrack) ? undefined : ((typeof properties.resolution !== 'undefined') ? properties.resolution : '640x480'),
                videoSource: (typeof properties.videoSource !== 'undefined') ? properties.videoSource : undefined,
                filter: properties.filter
            };
        }
        else {
            // Matches 'initPublisher(targetElement)' or 'initPublisher(targetElement, completionHandler)'
            properties = {
                insertMode: VideoInsertMode_1.VideoInsertMode.APPEND,
                mirror: true,
                publishAudio: true,
                publishVideo: true,
                resolution: '640x480'
            };
        }
        var publisher = new Publisher_1.Publisher(targetElement, properties, this);
        var completionHandler;
        if (!!param2 && (typeof param2 === 'function')) {
            completionHandler = param2;
        }
        else if (!!param3) {
            completionHandler = param3;
        }
        publisher.initialize()
            .then(function () {
            if (completionHandler !== undefined) {
                completionHandler(undefined);
            }
            publisher.emitEvent('accessAllowed', []);
        })["catch"](function (error) {
            if (completionHandler !== undefined) {
                completionHandler(error);
            }
            publisher.emitEvent('accessDenied', []);
        });
        this.publishers.push(publisher);
        return publisher;
    };
    OpenVidu.prototype.initPublisherAsync = function (targetElement, properties) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var publisher;
            var callback = function (error) {
                if (!!error) {
                    reject(error);
                }
                else {
                    resolve(publisher);
                }
            };
            if (!!properties) {
                publisher = _this.initPublisher(targetElement, properties, callback);
            }
            else {
                publisher = _this.initPublisher(targetElement, callback);
            }
        });
    };
    /**
     * Returns a new local recorder for recording streams straight away from the browser
     * @param stream  Stream to record
     */
    OpenVidu.prototype.initLocalRecorder = function (stream) {
        return new LocalRecorder_1.LocalRecorder(stream);
    };
    /**
     * Checks if the browser supports OpenVidu
     * @returns 1 if the browser supports OpenVidu, 0 otherwise
     */
    OpenVidu.prototype.checkSystemRequirements = function () {
        var browser = platform.name;
        var family = platform.os.family;
        var userAgent = !!platform.ua ? platform.ua : navigator.userAgent;
        // Reject iPhones and iPads if not Safari ('Safari' also covers Ionic for iOS)
        if (family === 'iOS' && (browser !== 'Safari' || userAgent.indexOf('CriOS') !== -1 || userAgent.indexOf('FxiOS') !== -1)) {
            return 0;
        }
        // Accept: Chrome (desktop and Android), Firefox (desktop and Android), Opera (desktop and Android),
        // Safari (OSX and iOS), Ionic (Android and iOS)
        if ((browser !== 'Safari') &&
            (browser !== 'Chrome') && (browser !== 'Chrome Mobile') &&
            (browser !== 'Firefox') && (browser !== 'Firefox Mobile') &&
            (browser !== 'Opera') && (browser !== 'Opera Mobile') &&
            (browser !== 'Android Browser')) {
            return 0;
        }
        else {
            return 1;
        }
    };
    /**
     * Checks if the browser supports screen-sharing. Desktop Chrome, Firefox and Opera support screen-sharing
     * @returns 1 if the browser supports screen-sharing, 0 otherwise
     */
    OpenVidu.prototype.checkScreenSharingCapabilities = function () {
        var browser = platform.name;
        var family = platform.os.family;
        // Reject mobile devices
        if (family === 'iOS' || family === 'Android') {
            return 0;
        }
        if ((browser !== 'Chrome') && (browser !== 'Firefox') && (browser !== 'Opera')) {
            return 0;
        }
        else {
            return 1;
        }
    };
    /**
     * Collects information about the media input devices available on the system. You can pass property `deviceId` of a [[Device]] object as value of `audioSource` or `videoSource` properties in [[initPublisher]] method
     */
    OpenVidu.prototype.getDevices = function () {
        return new Promise(function (resolve, reject) {
            navigator.mediaDevices.enumerateDevices().then(function (deviceInfos) {
                var devices = [];
                deviceInfos.forEach(function (deviceInfo) {
                    if (deviceInfo.kind === 'audioinput' || deviceInfo.kind === 'videoinput') {
                        devices.push({
                            kind: deviceInfo.kind,
                            deviceId: deviceInfo.deviceId,
                            label: deviceInfo.label
                        });
                    }
                });
                resolve(devices);
            })["catch"](function (error) {
                console.error('Error getting devices', error);
                reject(error);
            });
        });
    };
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
    OpenVidu.prototype.getUserMedia = function (options) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.generateMediaConstraints(options)
                .then(function (constraints) {
                navigator.mediaDevices.getUserMedia(constraints)
                    .then(function (mediaStream) {
                    resolve(mediaStream);
                })["catch"](function (error) {
                    var errorName;
                    var errorMessage = error.toString();
                    if (!(options.videoSource === 'screen')) {
                        errorName = OpenViduError_1.OpenViduErrorName.DEVICE_ACCESS_DENIED;
                    }
                    else {
                        errorName = OpenViduError_1.OpenViduErrorName.SCREEN_CAPTURE_DENIED;
                    }
                    reject(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                });
            })["catch"](function (error) {
                reject(error);
            });
        });
    };
    /* tslint:disable:no-empty */
    /**
     * Disable all logging except error level
     */
    OpenVidu.prototype.enableProdMode = function () {
        console.log = function () { };
        console.debug = function () { };
        console.info = function () { };
        console.warn = function () { };
    };
    /* tslint:enable:no-empty */
    /**
     * Set OpenVidu advanced configuration options. Currently `configuration` is an object with the following optional properties (see [[OpenViduAdvancedConfiguration]] for more details):
     * - `iceServers`: set custom STUN/TURN servers to be used by OpenVidu Browser
     * - `screenShareChromeExtension`: url to a custom screen share extension for Chrome to be used instead of the default one, based on ours [https://github.com/OpenVidu/openvidu-screen-sharing-chrome-extension](https://github.com/OpenVidu/openvidu-screen-sharing-chrome-extension)
     * - `publisherSpeakingEventsOptions`: custom configuration for the [[PublisherSpeakingEvent]] feature
     */
    OpenVidu.prototype.setAdvancedConfiguration = function (configuration) {
        this.advancedConfiguration = configuration;
    };
    // Only for testing.
    OpenVidu.prototype.reconnect = function () {
        console.log("Attempt to test reconnect");
        this.jsonRpcClient.forceClose();
    };
    /* Hidden methods */
    /**
     * @hidden
     */
    OpenVidu.prototype.generateMediaConstraints = function (publisherProperties) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var audio, video;
            if (publisherProperties.audioSource === null || publisherProperties.audioSource === false) {
                audio = false;
            }
            else if (publisherProperties.audioSource === undefined) {
                audio = true;
            }
            else {
                audio = publisherProperties.audioSource;
            }
            if (publisherProperties.videoSource === null || publisherProperties.videoSource === false) {
                video = false;
            }
            else {
                video = {
                    height: {
                        ideal: 480
                    },
                    width: {
                        ideal: 640
                    }
                };
            }
            var mediaConstraints = {
                audio: audio,
                video: video
            };
            if (typeof mediaConstraints.audio === 'string') {
                mediaConstraints.audio = { deviceId: { exact: mediaConstraints.audio } };
            }
            if (mediaConstraints.video) {
                if (!!publisherProperties.resolution) {
                    var widthAndHeight = publisherProperties.resolution.toLowerCase().split('x');
                    var width = Number(widthAndHeight[0]);
                    var height = Number(widthAndHeight[1]);
                    mediaConstraints.video.width.ideal = width;
                    mediaConstraints.video.height.ideal = height;
                }
                if (!!publisherProperties.frameRate) {
                    mediaConstraints.video.frameRate = { ideal: publisherProperties.frameRate };
                }
                if (!!publisherProperties.videoSource && typeof publisherProperties.videoSource === 'string') {
                    if (publisherProperties.videoSource === 'screen' ||
                        (platform.name.indexOf('Firefox') !== -1 && publisherProperties.videoSource === 'window')) {
                        if (platform.name !== 'Chrome' && platform.name.indexOf('Firefox') === -1 && platform.name !== 'Opera') {
                            var error = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_SHARING_NOT_SUPPORTED, 'You can only screen share in desktop Chrome, Firefox or Opera. Detected browser: ' + platform.name);
                            console.error(error);
                            reject(error);
                        }
                        else {
                            if (!!_this.advancedConfiguration.screenShareChromeExtension && !(platform.name.indexOf('Firefox') !== -1)) {
                                // Custom screen sharing extension for Chrome (and Opera)
                                screenSharing.getScreenConstraints(function (error, screenConstraints) {
                                    if (!!error || !!screenConstraints.mandatory && screenConstraints.mandatory.chromeMediaSource === 'screen') {
                                        if (error === 'permission-denied' || error === 'PermissionDeniedError') {
                                            var error_1 = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_CAPTURE_DENIED, 'You must allow access to one window of your desktop');
                                            console.error(error_1);
                                            reject(error_1);
                                        }
                                        else {
                                            var extensionId = _this.advancedConfiguration.screenShareChromeExtension.split('/').pop().trim();
                                            screenSharing.getChromeExtensionStatus(extensionId, function (status) {
                                                if (status === 'installed-disabled') {
                                                    var error_2 = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_EXTENSION_DISABLED, 'You must enable the screen extension');
                                                    console.error(error_2);
                                                    reject(error_2);
                                                }
                                                if (status === 'not-installed') {
                                                    var error_3 = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_EXTENSION_NOT_INSTALLED, _this.advancedConfiguration.screenShareChromeExtension);
                                                    console.error(error_3);
                                                    reject(error_3);
                                                }
                                            });
                                        }
                                    }
                                    else {
                                        mediaConstraints.video = screenConstraints;
                                        resolve(mediaConstraints);
                                    }
                                });
                            }
                            else {
                                // Default screen sharing extension for Chrome (or is Firefox)
                                var firefoxString = platform.name.indexOf('Firefox') !== -1 ? publisherProperties.videoSource : undefined;
                                screenSharingAuto.getScreenId(firefoxString, function (error, sourceId, screenConstraints) {
                                    if (!!error) {
                                        if (error === 'not-installed') {
                                            var extensionUrl = !!_this.advancedConfiguration.screenShareChromeExtension ? _this.advancedConfiguration.screenShareChromeExtension :
                                                'https://chrome.google.com/webstore/detail/openvidu-screensharing/lfcgfepafnobdloecchnfaclibenjold';
                                            var error_4 = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_EXTENSION_NOT_INSTALLED, extensionUrl);
                                            console.error(error_4);
                                            reject(error_4);
                                        }
                                        else if (error === 'installed-disabled') {
                                            var error_5 = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_EXTENSION_DISABLED, 'You must enable the screen extension');
                                            console.error(error_5);
                                            reject(error_5);
                                        }
                                        else if (error === 'permission-denied') {
                                            var error_6 = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_CAPTURE_DENIED, 'You must allow access to one window of your desktop');
                                            console.error(error_6);
                                            reject(error_6);
                                        }
                                    }
                                    else {
                                        mediaConstraints.video = screenConstraints.video;
                                        resolve(mediaConstraints);
                                    }
                                });
                            }
                            publisherProperties.videoSource = 'screen';
                        }
                    }
                    else {
                        // tslint:disable-next-line:no-string-literal
                        mediaConstraints.video['deviceId'] = { exact: publisherProperties.videoSource };
                        resolve(mediaConstraints);
                    }
                }
                else {
                    resolve(mediaConstraints);
                }
            }
            else {
                resolve(mediaConstraints);
            }
        });
    };
    /**
     * @hidden
     */
    OpenVidu.prototype.startWs = function (onConnectSucces) {
        var config = {
            heartbeat: process.env.OPENVIDU_BROWSER_PING_PERIOD || 5000,
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
                requestTimeout: process.env.OPENVIDU_BROWSER_PING_TIMEOUT || 10000,
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
    };
    /**
     * @hidden
     */
    OpenVidu.prototype.closeWs = function () {
        this.jsonRpcClient.close(4102, "Connection closed by client");
    };
    /**
     * @hidden
     */
    OpenVidu.prototype.sendRequest = function (method, params, callback) {
        if (params && params instanceof Function) {
            callback = params;
            params = {};
        }
        console.debug('Sending request: {method:"' + method + '", params: ' + JSON.stringify(params) + '}');
        this.jsonRpcClient.send(method, params, callback);
    };
    /**
     * @hidden
     */
    OpenVidu.prototype.getWsUri = function () {
        return this.wsUri;
    };
    /**
     * @hidden
     */
    OpenVidu.prototype.getSecret = function () {
        return this.secret;
    };
    /**
     * @hidden
     */
    OpenVidu.prototype.getRecorder = function () {
        return this.recorder;
    };
    /* Private methods */
    OpenVidu.prototype.disconnectCallback = function () {
        console.warn('Websocket connection lost');
        if (this.isRoomAvailable()) {
            this.session.onLostConnection('Websocket connection lost');
        }
        else {
            alert('Connection error. Please reload page.');
        }
    };
    OpenVidu.prototype.reconnectingCallback = function () {
        console.warn('Websocket connection lost (reconnecting)');
        if (!this.isRoomAvailable()) {
            alert('Connection error. Please reload page.');
        }
    };
    OpenVidu.prototype.reconnectedCallback = function () {
        var _this = this;
        console.warn('Websocket reconnected');
        if (this.isRoomAvailable()) {
            this.sendRequest("connect", { sessionId: this.session.connection.rpcSessionId }, function (error, response) {
                if (error != null) {
                    console.error(error);
                    _this.session.onLostConnection("Reconnection fault");
                    _this.jsonRpcClient.close(4101, "Reconnection fault");
                    return;
                }
                _this.jsonRpcClient.resetPing();
                _this.session.onRecoveredConnection();
            });
        }
        else {
            alert('Connection error. Please reload page.');
        }
    };
    OpenVidu.prototype.isRoomAvailable = function () {
        if (this.session !== undefined && this.session instanceof Session_1.Session) {
            return true;
        }
        else {
            console.warn('Session instance not found');
            return false;
        }
    };
    return OpenVidu;
}());
exports.OpenVidu = OpenVidu;
//# sourceMappingURL=OpenVidu.js.map