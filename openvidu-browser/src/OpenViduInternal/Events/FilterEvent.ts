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
import { Stream } from '../../OpenVidu/Stream';
import { Filter } from '../../OpenVidu/Filter';


/**
 * Defines every event dispatched by audio/video stream filters. You can subscribe to filter events by calling [[Filter.addEventListener]]
 */
export class FilterEvent extends Event {

    /**
     * Data of the event
     */
    data: Object;

    /**
     * @hidden
     */
    constructor(target: Filter, eventType: string, data: Object) {
        super(false, target, eventType);
        this.data = data;
    }

    /**
     * @hidden
     */
    // tslint:disable-next-line:no-empty
    callDefaultBehavior() { }

}