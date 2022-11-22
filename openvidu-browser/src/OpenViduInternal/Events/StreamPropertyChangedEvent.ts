/*
 * (C) Copyright 2017-2022 OpenVidu (https://openvidu.io)
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
import { StreamPropertyChangedEventReason, ChangedPropertyType } from './Types/Types';

/**
 * Triggered by `streamPropertyChanged` (available for [Session](/en/stable/api/openvidu-browser/interfaces/SessionEventMap.html#streamPropertyChanged) and [StreamManager](/en/stable/api/openvidu-browser/interfaces/StreamManagerEventMap.html#streamPropertyChanged) objects)
 */
export class StreamPropertyChangedEvent extends Event {
    /**
     * The Stream whose property has changed. You can always identify the user publishing the changed stream by consulting property {@link Stream.connection}
     */
    stream: Stream;

    /**
     * The property of the stream that changed. This value is either `"videoActive"`, `"audioActive"`, `"videoTrack"`, `"audioTrack"`, `"videoDimensions"` or `"filter"`
     */
    changedProperty: ChangedPropertyType;

    /**
     * Cause of the change on the stream's property:
     * - For `videoActive`: `"publishVideo"`
     * - For `audioActive`: `"publishAudio"`
     * - For `videoTrack`: `"trackReplaced"`
     * - For `audioTrack`: `"trackReplaced"`
     * - For `videoDimensions`: `"deviceRotated"`, `"screenResized"` or `"trackReplaced"`
     * - For `filter`: `"applyFilter"`, `"execFilterMethod"` or `"removeFilter"`
     */
    reason: StreamPropertyChangedEventReason;

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
    constructor(
        target: Session | StreamManager,
        stream: Stream,
        changedProperty: ChangedPropertyType,
        newValue: Object,
        oldValue: Object,
        reason: StreamPropertyChangedEventReason
    ) {
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
