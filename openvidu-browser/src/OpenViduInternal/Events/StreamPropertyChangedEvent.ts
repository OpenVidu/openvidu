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
import { Session } from '../../OpenVidu/Session';
import { Stream } from '../../OpenVidu/Stream';
import { StreamManager } from '../../OpenVidu/StreamManager';

/**
 * Defines event `streamPropertyChanged` dispatched by [[Session]] as well as by [[StreamManager]] ([[Publisher]] and [[Subscriber]]).
 * This event is fired when any remote stream (owned by a Subscriber) or local stream (owned by a Publisher) undergoes
 * any change in any of its mutable properties (see [[changedProperty]]).
 */
export class StreamPropertyChangedEvent extends Event {

    /**
     * The Stream whose property has changed. You can always identify the user publishing the changed stream by consulting property [[Stream.connection]]
     */
    stream: Stream;

    /**
     * The property of the stream that changed. This value is either `"videoActive"`, `"audioActive"`, `"videoDimensions"` or `"filter"`
     */
    changedProperty: string;

    /**
     * Cause of the change on the stream's property:
     * - For `videoActive`: `"publishVideo"`
     * - For `audioActive`: `"publishAudio"`
     * - For `videoDimensions`: `"deviceRotated"` or `"screenResized"`
     */
    reason: string;

    /**
     * New value of the property (after change, current value)
     */
    newValue: Object;

    /**
     * Previous value of the property (before change)
     */
    oldValue: Object;

    /**
     * @hidden
     */
    constructor(target: Session | StreamManager, stream: Stream, changedProperty: string, newValue: Object, oldValue: Object, reason: string) {
        super(false, target, 'streamPropertyChanged');
        this.stream = stream;
        this.changedProperty = changedProperty;
        this.newValue = newValue;
        this.oldValue = oldValue;
        this.reason = reason;
    }

    /**
     * @hidden
     */
    // tslint:disable-next-line:no-empty
    callDefaultBehavior() { }

}