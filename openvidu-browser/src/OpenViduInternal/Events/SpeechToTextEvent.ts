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
import { Connection } from '../../OpenVidu/Connection';
import { Session } from '../../OpenVidu/Session';

/**
 * Triggered by [[SessionEventMap.signal]]
 */
export class SpeechToTextEvent extends Event {
    /**
     * The connectionId of the 
     */
    connection: Connection;

    /**
     * 
     */
    timestamp: number;

    /**
     * The original event from the speech to text engine. This can vary depending on the engine
     */
    raw: string;

    /**
     * @hidden
     */
    constructor(target: Session, connection: Connection, timestamp: number, raw: string) {
        super(false, target, 'speechToText');
        this.connection = connection;
        this.timestamp = timestamp;
        this.raw = raw;
    }

    /**
     * @hidden
     */
    // tslint:disable-next-line:no-empty
    callDefaultBehavior() { }
}
