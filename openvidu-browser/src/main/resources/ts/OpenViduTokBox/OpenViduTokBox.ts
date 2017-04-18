/*
 * (C) Copyright 2016 OpenVidu (http://kurento.org/)
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
import { OpenVidu } from '../OpenVidu/OpenVidu';

import { SessionTokBox } from './SessionTokBox';
import { PublisherTokBox } from './PublisherTokBox';

import * as adapter from 'webrtc-adapter';

if (window) {
    window["adapter"] = adapter;
}

export class OpenViduTokBox {

    openVidu: OpenVidu;

    constructor(private wsUri: string) {
        this.openVidu = new OpenVidu(wsUri);
    }

    initSession(apiKey: string, sessionId: string): SessionTokBox;
    initSession(sessionId: string): SessionTokBox;

    initSession(param1, param2?): any {
        if (this.checkSystemRequirements()){
            if (typeof param2 == "string") {
                return new SessionTokBox(this.openVidu.initSession(param2), this);
            } else {
                return new SessionTokBox(this.openVidu.initSession(param1), this);
            }
        } else {
            alert("Browser not supported");
        }
    }

    initPublisher(parentId: string, cameraOptions: any): PublisherTokBox;
    initPublisher(parentId: string, cameraOptions: any, callback: any): PublisherTokBox;

    initPublisher(parentId: string, cameraOptions: any, callback?): any {
        if (this.checkSystemRequirements()){
            if (!("audio" in cameraOptions && "data" in cameraOptions && "mediaConstraints" in cameraOptions &&
                "video" in cameraOptions && (Object.keys(cameraOptions).length === 4))) {
                cameraOptions = {
                    audio: true,
                    video: true,
                    data: true,
                    mediaConstraints: {
                        audio: true,
                        video: { width: { ideal: 1280 } }
                    }
                }
            }
            return new PublisherTokBox(this.openVidu.initPublisherTagged(parentId, cameraOptions, callback), parentId);
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
            console.log("Error getting devices: " + error);
            callback(error, null);
        });
    }
}
