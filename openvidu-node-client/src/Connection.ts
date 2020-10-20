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
import { ConnectionOptions } from './ConnectionOptions';
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
     * The [[ConnectionOptions]] assigned to the Connection
     */
    connectionOptions: ConnectionOptions;

    /**
     * Token associated to the Connection
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
     * @hidden deprecated. Inside ConnectionOptions
     */
    role?: OpenViduRole;
    /**
     * @hidden deprecated. Inside ConnectionOptions
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
        if (this.connectionOptions != null) {
            this.connectionOptions.type = json.type;
            this.connectionOptions.data = json.data;
            this.connectionOptions.record = json.record;
            this.connectionOptions.role = json.role;
            this.connectionOptions.kurentoOptions = json.kurentoOptions;
            this.connectionOptions.rtspUri = json.rtspUri;
            this.connectionOptions.adaptativeBitrate = json.adaptativeBitrate;
            this.connectionOptions.onlyPlayWithSubscribers = json.onlyPlayWithSubscribers;
            this.connectionOptions.networkCache = json.networkCache;
        } else {
            this.connectionOptions = {
                type: json.type,
                data: json.data,
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
        this.serverData = json.data;

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
            this.connectionOptions.type === other.connectionOptions.type &&
            this.connectionOptions.data === other.connectionOptions.data &&
            this.connectionOptions.record === other.connectionOptions.record &&
            this.connectionOptions.role === other.connectionOptions.role &&
            this.connectionOptions.kurentoOptions === other.connectionOptions.kurentoOptions &&
            this.connectionOptions.rtspUri === other.connectionOptions.rtspUri &&
            this.connectionOptions.adaptativeBitrate === other.connectionOptions.adaptativeBitrate &&
            this.connectionOptions.onlyPlayWithSubscribers === other.connectionOptions.onlyPlayWithSubscribers &&
            this.connectionOptions.networkCache === other.connectionOptions.networkCache &&
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
    overrideConnectionOptions(newConnectionOptions: ConnectionOptions): void {
        // For now only properties record and role
        if (newConnectionOptions.record != null) {
            this.connectionOptions.record = newConnectionOptions.record;
        }
        if (newConnectionOptions.role != null) {
            this.connectionOptions.role = newConnectionOptions.role;
        }
    }

}