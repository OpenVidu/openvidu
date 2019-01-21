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

import { Event } from './Event';
import { StreamManager } from '../../OpenVidu/StreamManager';


/**
 * Defines the following events:
 * - `videoElementCreated`: dispatched by [[Publisher]] and [[Subscriber]] whenever a new HTML video element has been inserted into DOM by OpenVidu Browser library. See
 * [Manage video players](/docs/how-do-i/manage-videos) section.
 * - `videoElementDestroyed`: dispatched by [[Publisher]] and [[Subscriber]] whenever an HTML video element has been removed from DOM by OpenVidu Browser library.
 */
export class VideoElementEvent extends Event {

    /**
     * Video element that was created or destroyed
     */
    element: HTMLVideoElement;

    /**
     * @hidden
     */
    constructor(element: HTMLVideoElement, target: StreamManager, type: string) {
        super(false, target, type);
        this.element = element;
    }

    /**
     * @hidden
     */
    // tslint:disable-next-line:no-empty
    callDefaultBehavior() { }

}