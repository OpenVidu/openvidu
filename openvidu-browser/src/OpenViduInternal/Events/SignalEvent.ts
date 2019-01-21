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
import { Connection } from '../../OpenVidu/Connection';
import { Session } from '../../OpenVidu/Session';


/**
 * Defines the following events:
 * - `signal`: dispatched by [[Session]]
 * - `signal:TYPE`: dispatched by [[Session]]
 */
export class SignalEvent extends Event {

    /**
     * The type of signal (can be empty).
     *
     * The client must be subscribed to `Session.on('signal:type', function(signalEvent) {...})` to receive this object in the callback.
     *
     * Subscribing to `Session.on('signal', function(signalEvent) {...})` will trigger all types of signals.
     */
    type: string;

    /**
     * The message of the signal (can be emtpy)
     */
    data: string;

    /**
     * The client that sent the signal
     */
    from: Connection;

    /**
     * @hidden
     */
    constructor(target: Session, type: string, data: string, from: Connection) {
        super(false, target, type);
        this.type = type;
        this.data = data;
        this.from = from;
    }

    /**
     * @hidden
     */
    // tslint:disable-next-line:no-empty
    callDefaultBehavior() { }

}