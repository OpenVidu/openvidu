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

import { Event } from './Event';
import { Session } from '../../OpenVidu/Session';
import { Stream } from '../../OpenVidu/Stream';

/**
 * Defines event `streamPropertyChangedEvent` dispatched by [[Session]]
 */
export class StreamPropertyChangedEvent extends Event {

    /**
     * The Stream whose property has changed
     */
    stream: Stream;

    /**
     * The property of the stream that changed. This value is either `"hasAudio"`, `"hasVideo"` or `"videoDimensions"`
     */
    changedProperty: string;

    /**
     * New value of the property (before change)
     */
    newValue: Object;

    /**
     * Previous value of the property (after change)
     */
    oldValue: Object;

    /**
     * @hidden
     */
    constructor(target: Session, stream: Stream, changedProperty: string, newValue: Object, oldValue: Object) {
        super(false, target, 'streamPropertyChangedEvent');
        this.stream = stream;
        this.changedProperty = changedProperty;
        this.newValue = newValue;
        this.oldValue = oldValue;
    }

    /**
     * @hidden
     */
    // tslint:disable-next-line:no-empty
    callDefaultBehaviour() { }

}