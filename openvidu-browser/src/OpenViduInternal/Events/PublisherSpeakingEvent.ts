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
import { Connection } from '../../OpenVidu/Connection';
import { Session } from '../..';


/**
 * Defines the following events:
 * - `publisherStartSpeaking`: dispatched by [[Session]] when a remote user has started speaking
 * - `publisherStopSpeaking`: dispatched by [[Session]] when a remote user has stopped speaking
 *
 * More information:
 * - This events will only be triggered for **remote streams that have audio tracks** ([[Stream.hasAudio]] must be true)
 * - You can further configure how the events are dispatched by setting property `publisherSpeakingEventsOptions` in the call of [[OpenVidu.setAdvancedConfiguration]]
 */
export class PublisherSpeakingEvent extends Event {

    /**
     * The client that started or stopped speaking
     */
    connection: Connection;

    /**
     * The streamId of the Stream affected by the speaking event
     */
    streamId: string;

    /**
     * @hidden
     */
    constructor(target: Session, type: string, connection: Connection, streamId: string) {
        super(false, target, type);
        this.type = type;
        this.connection = connection;
        this.streamId = streamId;
    }

    /**
     * @hidden
     */
    // tslint:disable-next-line:no-empty
    callDefaultBehavior() { }

}