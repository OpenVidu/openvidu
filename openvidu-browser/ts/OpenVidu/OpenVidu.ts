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

import * as adapter from 'webrtc-adapter';

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
            if (cameraOptions != null) {
                let cameraOptionsAux = {
                    sendAudio: cameraOptions.audio != null ? cameraOptions.audio : true,
                    sendVideo: cameraOptions.video != null ? cameraOptions.video : true,
                    activeAudio: cameraOptions.activeAudio != null ? cameraOptions.activeAudio : true,
                    activeVideo: cameraOptions.activeVideo != null ? cameraOptions.activeVideo : true,
                    data: true,
                    mediaConstraints: this.openVidu.generateMediaConstraints(cameraOptions)
                };
                cameraOptions = cameraOptionsAux;
            } else {
                cameraOptions = {
                    sendAudio: true,
                    sendVideo: true,
                    activeAudio: true,
                    activeVideo: true,
                    data: true,
                    mediaConstraints: {
                        audio: true,
                        video: { width: { ideal: 1280 } }
                    }
                }
            }
            var publisher = new Publisher(this.openVidu.initPublisherTagged(parentId, cameraOptions, callback), parentId);
            
            console.info("'Publisher' initialized");
            return publisher;

        } else {
            alert("Browser not supported");
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
        console.log = function() {};
        console.debug = function() {};
        console.info = function() {};
        console.warn = function() {};
    }

}
