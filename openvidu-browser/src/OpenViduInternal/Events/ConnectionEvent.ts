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
 * - `connectionCreated`: dispatched by [[Session]]
 * - `connectionDestroyed`: dispatched by [[Session]]
 */
export class ConnectionEvent extends Event {

    /**
     * Connection object that was created or destroyed
     */
    connection: Connection;

    /**
     * For `connectionDestroyed` event:
     * - "disconnect": the remote user has called `Session.disconnect()`
     * - "forceDisconnectByUser": the remote user has been evicted from the Session by other user calling `Session.forceDisconnect()`
     * - "forceDisconnectByServer": the remote user has been evicted from the Session by the application
     * - "sessionClosedByServer": the Session has been closed by the application
     * - "networkDisconnect": the remote user network connection has dropped
     *
     * For `connectionCreated` event an empty string
     */
    reason: string;

    /**
     * @hidden
     */
    constructor(cancelable: boolean, target: Session, type: string, connection: Connection, reason: string) {
        super(cancelable, target, type);
        this.connection = connection;
        this.reason = reason;
    }

    /**
     * @hidden
     */
    // tslint:disable-next-line:no-empty
    callDefaultBehavior() { }

}