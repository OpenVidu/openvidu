/*
 * (C) Copyright 2017-2020 OpenVidu (https://openvidu.io)
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

/**
 * Defines event `networkQualityChangedEvent` dispatched by [[Session]].
 * This event is fired when the network quality of the local connection changes
 */
export class NetworkQualityChangedEvent extends Event {

    /**
     * Cause of the change on the neteotk quality event
     */
    reason: NetworkQualityChangedReason;

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
    constructor(target: Session, newValue: Object, oldValue: Object, reason: NetworkQualityChangedReason) {
        super(false, target, 'networkQualityChanged');
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

export enum NetworkQualityChangedReason {
	ABOVE_MAX = "above_max",
	BELOW_MIN = "below_min"
}
