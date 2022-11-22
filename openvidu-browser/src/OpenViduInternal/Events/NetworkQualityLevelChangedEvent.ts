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
import { Connection } from '../../OpenVidu/Connection';

/**
 * Triggered by {@link SessionEventMap.networkQualityLevelChanged}
 */
export class NetworkQualityLevelChangedEvent extends Event {
    /**
     * New value of the network quality level
     */
    newValue: number;

    /**
     * Old value of the network quality level
     */
    oldValue: number;

    /**
     * Connection for whom the network quality level changed
     */
    connection: Connection;

    /**
     * @hidden
     */
    constructor(target: Session, newValue: number, oldValue: number, connection: Connection) {
        super(false, target, 'networkQualityLevelChanged');
        this.newValue = newValue;
        this.oldValue = oldValue;
        this.connection = connection;
    }

    /**
     * @hidden
     */
    // tslint:disable-next-line:no-empty
    callDefaultBehavior() {}
}
