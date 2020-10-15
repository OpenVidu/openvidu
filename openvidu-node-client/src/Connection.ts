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

import { OpenViduRole } from './OpenViduRole';
import { Publisher } from './Publisher';
import { ConnectionOptions } from './ConnectionOptions';

/**
 * See [[Session.connections]]
 */
export class Connection {

    /**
     * Identifier of the connection. You can call methods [[Session.forceDisconnect]]
     * or [[Session.updateConnection]] passing this property as parameter
     */
    connectionId: string;

    /**
     * Returns the status of the connection. Can be:
     * - `pending`: if the Connection is waiting for any user to use
     * its internal token to connect to the session, calling method
     * [Session.connect](https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/session.html#connect)
     * in OpenVidu Browser.
     * - `active`: if the internal token of the Connection has already
     * been used by some user to connect to the session, and it cannot be used
     * again.
     */
    status: string;

    /**
     * Timestamp when this connection was established, in UTC milliseconds (ms since Jan 1, 1970, 00:00:00 UTC)
     */
    createdAt: number;

    /**
     * Role of the connection
     */
    role: OpenViduRole;

    /**
     * Data associated to the connection on the server-side. This value is set with property [[TokenOptions.data]] when calling [[Session.generateToken]]
     */
    serverData: string;

    /**
     * Whether to record the streams published by the participant owning this token or not. This only affects [INDIVIDUAL recording](/en/stable/advanced-features/recording#selecting-streams-to-be-recorded)
     */
    record: boolean;

    /**
     * Token associated to the connection
     */
    token: string;

    /**
     * <a href="https://docs.openvidu.io/en/stable/openvidu-pro/" target="_blank" style="display: inline-block; background-color: rgb(0, 136, 170); color: white; font-weight: bold; padding: 0px 5px; margin-right: 5px; border-radius: 3px; font-size: 13px; line-height:21px; font-family: Montserrat, sans-serif">PRO</a>
     * Geo location of the connection, with the following format: `"CITY, COUNTRY"` (`"unknown"` if it wasn't possible to locate it)
     */
    location: string;

    /**
     * A complete description of the platform used by the participant to connect to the session
     */
    platform: string;

    /**
     * Data associated to the connection on the client-side. This value is set with second parameter of method
     * [Session.connect](/en/stable/api/openvidu-browser/classes/session.html#connect) in OpenVidu Browser
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
    constructor(json) {
        // These properties may be null
        if (json.publishers != null) {
            json.publishers.forEach(publisher => {
                this.publishers.push(new Publisher(publisher));
            });
        }
        if (json.subscribers != null) {
            json.subscribers.forEach(subscriber => {
                this.subscribers.push(subscriber.streamId);
            });
        }
        this.createdAt = json.createdAt;
        this.location = json.location;
        this.platform = json.platform;
        this.clientData = json.clientData;

        // These properties won't ever be null
        this.connectionId = json.connectionId;
        this.status = json.status;
        this.token = json.token;
        this.role = json.role;
        this.serverData = json.serverData;
        this.record = json.record;
    }

    /**
     * @hidden
     */
    equalTo(other: Connection): boolean {
        let equals: boolean = (
            this.connectionId === other.connectionId &&
            this.status === other.status &&
            this.createdAt === other.createdAt &&
            this.role === other.role &&
            this.serverData === other.serverData &&
            this.record === other.record &&
            this.token === other.token &&
            this.location === other.location &&
            this.platform === other.platform &&
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

    /**
     * @hidden
     */
    overrideConnectionOptions(connectionOptions: ConnectionOptions): void {
        if (connectionOptions.role != null) {
            this.role = connectionOptions.role;
        }
        if (connectionOptions.record != null) {
            this.record = connectionOptions.record
        }
    }

}