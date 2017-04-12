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

export class OpenViduTokBox {

    openVidu: OpenVidu;

    constructor(private wsUri: string) {
        this.openVidu = new OpenVidu(wsUri);
    }

    initSession(apiKey: string, sessionId: string): SessionTokBox;
    initSession(sessionId: string): SessionTokBox;

    initSession(param1, param2?): any {
        if (typeof param2 == "string") {
            return new SessionTokBox(this.openVidu.initSession(param2), this);
        } else {
            return new SessionTokBox(this.openVidu.initSession(param1), this);
        }
    }

    initPublisher(parentId: string, cameraOptions: any): PublisherTokBox;
    initPublisher(parentId: string, cameraOptions: any, callback: any): PublisherTokBox;

    initPublisher(parentId: string, cameraOptions: any, callback?): PublisherTokBox {
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
        return new PublisherTokBox(this.openVidu.initPublisherTagged(parentId, cameraOptions, callback));
    }

}
