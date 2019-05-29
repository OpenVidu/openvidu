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

import { VideoInsertMode } from '../../Enums/VideoInsertMode';


export interface StreamManagerVideo {

    /**
     * DOM video element displaying the StreamManager's stream
     */
    video: HTMLVideoElement;

    /**
     * `id` attribute of the DOM video element displaying the StreamManager's stream
     */
    id: string;

    /**
     * The DOM HTMLElement assigned as target element when creating a video for the StreamManager. This property is defined when:
     * - [[OpenVidu.initPublisher]] or [[Session.subscribe]] methods have been called passing a valid `targetElement` parameter.
     * - [[StreamManager.createVideoElement]] has been called.
     *
     * This property is undefined when:
     * - [[OpenVidu.initPublisher]] or [[Session.subscribe]] methods have been called passing *null* or *undefined* as `targetElement` parameter.
     * - [[StreamManager.addVideoElement]] has been called.
     */
    targetElement?: HTMLElement;

    /**
     * How the DOM video element should be inserted with respect to `targetElement`. This property is defined when:
     * - [[OpenVidu.initPublisher]] or [[Session.subscribe]] methods have been called passing a valid `targetElement` parameter.
     * - [[StreamManager.createVideoElement]] has been called.
     *
     * This property is undefined when:
     * - [[OpenVidu.initPublisher]] or [[Session.subscribe]] methods have been called passing *null* or *undefined* as `targetElement` parameter.
     * - [[StreamManager.addVideoElement]] has been called.
     */
    insertMode?: VideoInsertMode;

    /**
     * @hidden
     */
    canplayListenerAdded: boolean;


}