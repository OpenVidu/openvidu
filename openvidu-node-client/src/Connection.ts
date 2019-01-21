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

import { OpenViduRole } from './OpenViduRole';
import { Publisher } from './Publisher';

/**
 * See [[Session.activeConnections]]
 */
export class Connection {

    /**
     * Identifier of the connection. You can call [[Session.forceDisconnect]] passing this property as parameter
     */
    connectionId: string;

    /**
     * Timestamp when this connection was established, in UTC milliseconds (ms since Jan 1, 1970, 00:00:00 UTC)
     */
    createdAt: number;

    /**
     * Role of the connection
     */
    role: OpenViduRole;

    /**
     * Token associated to the connection
     */
    token: string;

    /**
     * <a href="/docs/openvidu-pro/" target="_blank" style="display: inline-block; background-color: rgb(0, 136, 170); color: white; font-weight: bold; padding: 0px 5px; margin-right: 5px; border-radius: 3px; font-size: 13px; line-height:21px; font-family: Montserrat, sans-serif">PRO</a>
     * Geo location of the connection, with the following format: `"CITY, COUNTRY"` (`"unknown"` if it wasn't possible to locate it)
     */
    location: string;

    /**
     * A complete description of the platform used by the participant to connect to the session
     */
    platform: string;

    /**
     * Data associated to the connection on the server-side. This value is set with property [[TokenOptions.data]] when calling [[Session.generateToken]]
     */
    serverData: string;

    /**
     * Data associated to the connection on the client-side. This value is set with second parameter of method
     * [Session.connect](/api/openvidu-browser/classes/session.html#connect) in OpenVidu Browser
     */
    clientData: string;

    /**
     * Array of Publisher objects this particular Connection is publishing to the Session (each Publisher object has one Stream, uniquely
     * identified by its `streamId`). You can call [[Session.forceUnpublish]] passing any of this values as parameter
     */
    publishers: Publisher[] = [];

    /**
     * Array of streams (their `streamId` properties) this particular Connection is subscribed to. Each one always corresponds to one
     * Publisher of some other Connection: each string of this array must be equal to one [[Publisher.streamId]] of other Connection
     */
    subscribers: string[] = [];

    /**
     * @hidden
     */
    constructor(connectionId: string, createdAt: number, role: OpenViduRole, token: string, location: string, platform: string, serverData: string, clientData: string,
        publishers: Publisher[], subscribers: string[]) {
        this.connectionId = connectionId;
        this.createdAt = createdAt;
        this.role = role;
        this.token = token;
        this.location = location;
        this.platform = platform;
        this.serverData = serverData;
        this.clientData = clientData;
        this.publishers = publishers;
        this.subscribers = subscribers;
    }

    /**
     * @hidden
     */
    equalTo(other: Connection): boolean {
        let equals: boolean = (
            this.connectionId === other.connectionId &&
            this.createdAt === other.createdAt &&
            this.role === other.role &&
            this.token === other.token &&
            this.location === other.location &&
            this.platform === other.platform &&
            this.serverData === other.serverData &&
            this.clientData === other.clientData &&
            this.subscribers.length === other.subscribers.length &&
            this.publishers.length === other.publishers.length);
        if (equals) {
            equals = JSON.stringify(this.subscribers) === JSON.stringify(other.subscribers);
            if (equals) {
                let i = 0;
                while (equals && i < this.publishers.length) {
                    equals = this.publishers[i].equalTo(other.publishers[i]);
                    i++;
                }
                return equals;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }
}