/*
 * (C) Copyright 2017 OpenVidu (http://openvidu.io/)
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
import { OpenViduInternal } from '../OpenViduInternal/OpenViduInternal';

import { Session } from './Session';
import { Publisher } from './Publisher';
import { OpenViduError, OpenViduErrorName } from '../OpenViduInternal/OpenViduError';
import { OutboundStreamOptions } from '../OpenViduInternal/index';
import { Stream } from '../OpenViduInternal/Stream';
import { LocalRecorder } from '../OpenViduInternal/LocalRecorder';

import * as adapter from 'webrtc-adapter';
import * as screenSharing from '../ScreenSharing/Screen-Capturing.js';
import * as screenSharingAuto from '../ScreenSharing/Screen-Capturing-Auto.js';

if (window) {
    window["adapter"] = adapter;
}

export class OpenVidu {

    openVidu: OpenViduInternal;

    constructor() {
        this.openVidu = new OpenViduInternal();
        console.info("'OpenVidu' initialized");
    };

    initSession(apiKey: string, sessionId: string): Session;
    initSession(sessionId: string): Session;

    initSession(param1, param2?): any {
        if (this.checkSystemRequirements()) {
            if (typeof param2 == "string") {
                return new Session(this.openVidu.initSession(param2), this);
            } else {
                return new Session(this.openVidu.initSession(param1), this);
            }
        } else {
            alert("Browser not supported");
        }
    }

    initPublisher(parentId: string): Publisher;
    initPublisher(parentId: string, cameraOptions: any): Publisher;
    initPublisher(parentId: string, cameraOptions: any, callback: any): Publisher;

    initPublisher(parentId: string, cameraOptions?: any, callback?: Function): any {
        if (this.checkSystemRequirements()) {
            let publisher: Publisher;
            if (cameraOptions != null) {

                cameraOptions.audio = cameraOptions.audio != null ? cameraOptions.audio : true;
                cameraOptions.video = cameraOptions.video != null ? cameraOptions.video : true;

                if (!cameraOptions.screen) {

                    // Webcam and/or microphone is being requested

                    let cameraOptionsAux = {
                        sendAudio: cameraOptions.audio != null ? cameraOptions.audio : true,
                        sendVideo: cameraOptions.video != null ? cameraOptions.video : true,
                        activeAudio: cameraOptions.audioActive != null ? cameraOptions.audioActive : true,
                        activeVideo: cameraOptions.videoActive != null ? cameraOptions.videoActive : true,
                        dataChannel: true,
                        mediaConstraints: this.openVidu.generateMediaConstraints(cameraOptions)
                    };
                    cameraOptions = cameraOptionsAux;

                    publisher = new Publisher(this.openVidu.initPublisherTagged(parentId, cameraOptions, true, callback), parentId, false);
                    console.info("'Publisher' initialized");

                    return publisher;

                } else {

                    publisher = new Publisher(this.openVidu.initPublisherScreen(parentId, true, callback), parentId, true);
                    if (adapter.browserDetails.browser === 'firefox' && adapter.browserDetails.version >= 52) {
                        screenSharingAuto.getScreenId((error, sourceId, screenConstraints) => {
                            cameraOptions = {
                                sendAudio: cameraOptions.audio,
                                sendVideo: cameraOptions.video,
                                activeAudio: cameraOptions.audioActive != null ? cameraOptions.audioActive : true,
                                activeVideo: cameraOptions.videoActive != null ? cameraOptions.videoActive : true,
                                dataChannel: true,
                                mediaConstraints: {
                                    video: screenConstraints.video,
                                    audio: false
                                }
                            }

                            publisher.stream.configureScreenOptions(cameraOptions);
                            console.info("'Publisher' initialized");

                            publisher.stream.ee.emitEvent('can-request-screen');
                        });
                        return publisher;
                    } else if (adapter.browserDetails.browser === 'chrome') {
                        // Screen is being requested

                        /*screenSharing.isChromeExtensionAvailable((availability) => {
                            switch (availability) {
                                case 'available':
                                    console.warn('EXTENSION AVAILABLE!!!');
                                    screenSharing.getScreenConstraints((error, screenConstraints) => {
                                        if (!error) {
                                            console.warn(screenConstraints);
                                        }
                                    });
                                    break;
                                case 'unavailable':
                                    console.warn('EXTENSION NOT AVAILABLE!!!');
                                    break;
                                case 'isFirefox':
                                    console.warn('IT IS FIREFOX!!!');
                                    screenSharing.getScreenConstraints((error, screenConstraints) => {
                                        if (!error) {
                                            console.warn(screenConstraints);
                                        }
                                    });
                                    break;
                            }
                        });*/
                        screenSharingAuto.getScreenId((error, sourceId, screenConstraints) => {

                            if (error === 'not-installed') {
                                let error = new OpenViduError(OpenViduErrorName.SCREEN_EXTENSION_NOT_INSTALLED, 'https://chrome.google.com/webstore/detail/screen-capturing/ajhifddimkapgcifgcodmmfdlknahffk');
                                console.error(error);
                                if (callback) callback(error);
                                return;
                            } else if (error === 'permission-denied') {
                                let error = new OpenViduError(OpenViduErrorName.SCREEN_CAPTURE_DENIED, 'You must allow access to one window of your desktop');
                                console.error(error);
                                if (callback) callback(error);
                                return;
                            }

                            cameraOptions = {
                                sendAudio: cameraOptions.audio != null ? cameraOptions.audio : true,
                                sendVideo: cameraOptions.video != null ? cameraOptions.video : true,
                                activeAudio: cameraOptions.audioActive != null ? cameraOptions.audioActive : true,
                                activeVideo: cameraOptions.videoActive != null ? cameraOptions.videoActive : true,
                                dataChannel: true,
                                mediaConstraints: {
                                    video: screenConstraints.video,
                                    audio: false
                                }
                            }

                            publisher.stream.configureScreenOptions(cameraOptions);

                            publisher.stream.ee.emitEvent('can-request-screen');
                        }, (error) => {
                            console.error('getScreenId error', error);
                            return;
                        });
                        console.info("'Publisher' initialized");
                        return publisher;
                    } else {
                        console.error('Screen sharing not supported on ' + adapter.browserDetails.browser);
                    }
                }
            } else {
                cameraOptions = {
                    sendAudio: true,
                    sendVideo: true,
                    activeAudio: true,
                    activeVideo: true,
                    dataChannel: true,
                    mediaConstraints: {
                        audio: true,
                        video: { width: { ideal: 1280 } }
                    }
                }
                publisher = new Publisher(this.openVidu.initPublisherTagged(parentId, cameraOptions, true, callback), parentId, false);
                console.info("'Publisher' initialized");

                return publisher;
            }
        } else {
            alert("Browser not supported");
        }
    }

    reinitPublisher(publisher: Publisher): any {
        if (publisher.stream.typeOfVideo !== 'SCREEN') {
            publisher = new Publisher(this.openVidu.initPublisherTagged(publisher.stream.getParentId(), publisher.stream.outboundOptions, false), publisher.stream.getParentId(), false);
            console.info("'Publisher' initialized");
            return publisher;
        } else {
            publisher = new Publisher(this.openVidu.initPublisherScreen(publisher.stream.getParentId(), false), publisher.stream.getParentId(), true);
            if (adapter.browserDetails.browser === 'firefox' && adapter.browserDetails.version >= 52) {
                screenSharingAuto.getScreenId((error, sourceId, screenConstraints) => {

                    publisher.stream.outboundOptions.mediaConstraints.video = screenConstraints.video;
                    publisher.stream.configureScreenOptions(publisher.stream.outboundOptions);
                    console.info("'Publisher' initialized");

                    publisher.stream.ee.emitEvent('can-request-screen');
                });
                return publisher;
            } else if (adapter.browserDetails.browser === 'chrome') {
                screenSharingAuto.getScreenId((error, sourceId, screenConstraints) => {
                    if (error === 'not-installed') {
                        let error = new OpenViduError(OpenViduErrorName.SCREEN_EXTENSION_NOT_INSTALLED, 'https://chrome.google.com/webstore/detail/screen-capturing/ajhifddimkapgcifgcodmmfdlknahffk');
                        console.error(error);
                        return;
                    } else if (error === 'permission-denied') {
                        let error = new OpenViduError(OpenViduErrorName.SCREEN_CAPTURE_DENIED, 'You must allow access to one window of your desktop');
                        console.error(error);
                        return;
                    }
                    publisher.stream.outboundOptions.mediaConstraints.video = screenConstraints.video;
                    publisher.stream.configureScreenOptions(publisher.stream.outboundOptions);

                    publisher.stream.ee.emitEvent('can-request-screen');
                }, (error) => {
                    console.error('getScreenId error', error);
                    return;
                });
                console.info("'Publisher' initialized");
                return publisher;
            } else {
                console.error('Screen sharing not supported on ' + adapter.browserDetails.browser);
            }
        }
    }

    checkSystemRequirements(): number {
        let browser = adapter.browserDetails.browser;
        let version = adapter.browserDetails.version;

        //Bug fix: 'navigator.userAgent' in Firefox for Ubuntu 14.04 does not return "Firefox/[version]" in the string, so version returned is null
        if ((browser == 'firefox') && (version == null)) {
            return 1;
        }
        if (((browser == 'chrome') && (version >= 28)) || ((browser == 'edge') && (version >= 12)) || ((browser == 'firefox') && (version >= 22))) {
            return 1;
        } else {
            return 0;
        }
    }

    getDevices(callback) {
        navigator.mediaDevices.enumerateDevices().then((deviceInfos) => {
            callback(null, deviceInfos);
        }).catch((error) => {
            console.error("Error getting devices", error);
            callback(error, null);
        });
    }

    enableProdMode() {
        console.log = function () { };
        console.debug = function () { };
        console.info = function () { };
        console.warn = function () { };
    }

    initLocalRecorder(stream: Stream): LocalRecorder {
        return new LocalRecorder(stream);
    }

}
