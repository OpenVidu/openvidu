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

import { Publisher } from './Publisher';
import { ConnectionProperties } from './ConnectionProperties';
import { OpenViduRole } from './OpenViduRole';

/**
 * See [[Session.connections]]
 */
export class Connection {

    /**
     * Identifier of the Connection. You can call methods [[Session.forceDisconnect]]
     * or [[Session.updateConnection]] passing this property as parameter
     */
    connectionId: string;

    /**
     * Returns the status of the Connection. Can be:
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
     * Timestamp when the Connection was created, in UTC milliseconds (ms since Jan 1, 1970, 00:00:00 UTC)
     */
    createdAt: number;

    /**
     * Timestamp when the Connection was taken by a user (passing from status "pending" to "active")
     * in UTC milliseconds (ms since Jan 1, 1970, 00:00:00 UTC)
     */
    activeAt: number;

    /**
     * <a href="https://docs.openvidu.io/en/stable/openvidu-pro/" target="_blank" style="display: inline-block; background-color: rgb(0, 136, 170); color: white; font-weight: bold; padding: 0px 5px; margin-right: 5px; border-radius: 3px; font-size: 13px; line-height:21px; font-family: Montserrat, sans-serif">PRO</a>
     * Geo location of the Connection, with the following format: `"CITY, COUNTRY"` (`"unknown"` if it wasn't possible to locate it)
     */
    location: string;

    /**
     * A complete description of the platform used by the participant to connect to the session
     */
    platform: string;

    /**
     * Data associated to the Connection on the client-side. This value is set with second parameter of method
     * [Session.connect](/en/stable/api/openvidu-browser/classes/session.html#connect) in OpenVidu Browser
     */
    clientData: string;

    /**
     * The [[ConnectionProperties]] assigned to the Connection
     */
    connectionProperties: ConnectionProperties;

    /**
     * Token associated to the Connection. This is the value that must be sent to the client-side to be consumed in OpenVidu Browser
     * method [Session.connect](https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/session.html#connect).
     */
    token: string;

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
     * @hidden deprecated. Inside ConnectionProperties
     */
    role?: OpenViduRole;
    /**
     * @hidden deprecated. Inside ConnectionProperties
     */
    serverData?: string;

    /**
     * @hidden
     */
    constructor(json) {
        this.resetWithJson(json);
    }

    /**
     * @hidden
     */
    resetWithJson(json): Connection {

        this.connectionId = json.connectionId;
        this.status = json.status;
        this.createdAt = json.createdAt;
        this.activeAt = json.activeAt;
        this.location = json.location;
        this.platform = json.platform;
        this.clientData = json.clientData;
        this.token = json.token;
        if (this.connectionProperties != null) {
            this.connectionProperties.type = json.type;
            this.connectionProperties.data = json.serverData;
            this.connectionProperties.record = json.record;
            this.connectionProperties.role = json.role;
            this.connectionProperties.kurentoOptions = json.kurentoOptions;
            this.connectionProperties.rtspUri = json.rtspUri;
            this.connectionProperties.adaptativeBitrate = json.adaptativeBitrate;
            this.connectionProperties.onlyPlayWithSubscribers = json.onlyPlayWithSubscribers;
            this.connectionProperties.networkCache = json.networkCache;
        } else {
            this.connectionProperties = {
                type: json.type,
                data: json.serverData,
                record: json.record,
                role: json.role,
                kurentoOptions: json.kurentoOptions,
                rtspUri: json.rtspUri,
                adaptativeBitrate: json.adaptativeBitrate,
                onlyPlayWithSubscribers: json.onlyPlayWithSubscribers,
                networkCache: json.networkCache
            }
        }
        this.role = json.role;
        this.serverData = json.serverData;

        // publishers may be null
        if (json.publishers != null) {

            // 1. Array to store fetched Publishers and later remove closed ones
            const fetchedPublisherIds: string[] = [];
            json.publishers.forEach(jsonPublisher => {

                const publisherObj: Publisher = new Publisher(jsonPublisher);
                fetchedPublisherIds.push(publisherObj.streamId);
                let storedPublisher = this.publishers.find(c => c.streamId === publisherObj.streamId);

                if (!!storedPublisher) {
                    // 2. Update existing Publisher
                    storedPublisher.resetWithJson(jsonPublisher);
                } else {
                    // 3. Add new Publisher
                    this.publishers.push(publisherObj);
                }
            });

            // 4. Remove closed Publishers from local collection
            for (var i = this.publishers.length - 1; i >= 0; --i) {
                if (!fetchedPublisherIds.includes(this.publishers[i].streamId)) {
                    this.publishers.splice(i, 1);
                }
            }

        }

        // subscribers may be null
        if (json.subscribers != null) {

            // 1. Array to store fetched Subscribers and later remove closed ones
            const fetchedSubscriberIds: string[] = [];
            json.subscribers.forEach(jsonSubscriber => {
                fetchedSubscriberIds.push(jsonSubscriber.streamId)
                if (this.subscribers.indexOf(jsonSubscriber.streamId) === -1) {
                    // 2. Add new Subscriber
                    this.subscribers.push(jsonSubscriber.streamId);
                }
            });

            // 3. Remove closed Subscribers from local collection
            for (var i = this.subscribers.length - 1; i >= 0; --i) {
                if (!fetchedSubscriberIds.includes(this.subscribers[i])) {
                    this.subscribers.splice(i, 1);
                }
            }
        }

        return this;
    }

    /**
     * @hidden
     */
    equalTo(other: Connection): boolean {
        let equals: boolean = (
            this.connectionId === other.connectionId &&
            this.status === other.status &&
            this.createdAt === other.createdAt &&
            this.activeAt === other.activeAt &&
            this.connectionProperties.type === other.connectionProperties.type &&
            this.connectionProperties.data === other.connectionProperties.data &&
            this.connectionProperties.record === other.connectionProperties.record &&
            this.connectionProperties.role === other.connectionProperties.role &&
            this.connectionProperties.rtspUri === other.connectionProperties.rtspUri &&
            this.connectionProperties.adaptativeBitrate === other.connectionProperties.adaptativeBitrate &&
            this.connectionProperties.onlyPlayWithSubscribers === other.connectionProperties.onlyPlayWithSubscribers &&
            this.connectionProperties.networkCache === other.connectionProperties.networkCache &&
            this.token === other.token &&
            this.location === other.location &&
            this.platform === other.platform &&
            this.clientData === other.clientData &&
            this.subscribers.length === other.subscribers.length &&
            this.publishers.length === other.publishers.length);
        if (equals) {
            if (this.connectionProperties.kurentoOptions != null) {
                equals = JSON.stringify(this.connectionProperties.kurentoOptions) === JSON.stringify(other.connectionProperties.kurentoOptions);
            } else {
                equals = (this.connectionProperties.kurentoOptions === other.connectionProperties.kurentoOptions);
            }
        }
        if (equals) {
            equals = JSON.stringify(this.subscribers.sort()) === JSON.stringify(other.subscribers.sort());
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
    overrideConnectionProperties(newConnectionProperties: ConnectionProperties): void {
        // For now only properties record and role
        if (newConnectionProperties.record != null) {
            this.connectionProperties.record = newConnectionProperties.record;
        }
        if (newConnectionProperties.role != null) {
            this.connectionProperties.role = newConnectionProperties.role;
        }
    }

}