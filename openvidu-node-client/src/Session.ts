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

import axios, { AxiosError } from 'axios';
import { Connection } from './Connection';
import { ConnectionProperties } from './ConnectionProperties';
import { MediaMode } from './MediaMode';
import { OpenVidu } from './OpenVidu';
import { Publisher } from './Publisher';
import { Recording } from './Recording';
import { RecordingLayout } from './RecordingLayout';
import { RecordingMode } from './RecordingMode';
import { SessionProperties } from './SessionProperties';
import { TokenOptions } from './TokenOptions';

export class Session {

    /**
     * Unique identifier of the Session
     */
    sessionId: string;

    /**
     * Timestamp when this session was created, in UTC milliseconds (ms since Jan 1, 1970, 00:00:00 UTC)
     */
    createdAt: number;

    /**
     * Properties defining the session
     */
    properties: SessionProperties;

    /**
     * Array of Connections to the Session. This property always initialize as an empty array and
     * **will remain unchanged since the last time method [[Session.fetch]] or [[OpenVidu.fetch]] was called**.
     * Exceptions to this rule are:
     *
     * - Calling [[Session.createConnection]] automatically adds the new Connection object to the local collection.
     * - Calling [[Session.forceUnpublish]] automatically updates each affected local Connection object.
     * - Calling [[Session.forceDisconnect]] automatically updates each affected local Connection object.
     * - Calling [[Session.updateConnection]] automatically updates the attributes of the affected local Connection object.
     *
     * To get the array of Connections with their current actual value, you must call [[Session.fetch]] or [[OpenVidu.fetch]]
     * before consulting property [[connections]]
     */
    connections: Connection[] = [];

    /**
     * Array containing the active Connections of the Session. It is a subset of [[Session.connections]] array containing only
     * those Connections with property [[Connection.status]] to `active`.
     * 
     * To get the array of active Connections with their current actual value, you must call [[Session.fetch]] or [[OpenVidu.fetch]]
     * before consulting property [[activeConnections]]
     */
    activeConnections: Connection[] = [];

    /**
     * Whether the session is being recorded or not
     */
    recording = false;

    /**
     * @hidden
     */
    constructor(private ov: OpenVidu, propertiesOrJson?) {
        if (!!propertiesOrJson) {
            // Defined parameter
            if (!!propertiesOrJson.sessionId) {
                // Parameter is a JSON representation of Session ('sessionId' property always defined)
                this.resetWithJson(propertiesOrJson);
            } else {
                // Parameter is a SessionProperties object
                this.properties = propertiesOrJson;
            }
        } else {
            // Empty parameter
            this.properties = {};
        }
        this.properties.mediaMode = !!this.properties.mediaMode ? this.properties.mediaMode : MediaMode.ROUTED;
        this.properties.recordingMode = !!this.properties.recordingMode ? this.properties.recordingMode : RecordingMode.MANUAL;
        this.properties.defaultOutputMode = !!this.properties.defaultOutputMode ? this.properties.defaultOutputMode : Recording.OutputMode.COMPOSED;
        this.properties.defaultRecordingLayout = !!this.properties.defaultRecordingLayout ? this.properties.defaultRecordingLayout : RecordingLayout.BEST_FIT;
        this.properties.forcedVideoCodec = !!this.properties.forcedVideoCodec ? this.properties.forcedVideoCodec : undefined;
        this.properties.allowTranscoding = this.properties.allowTranscoding != null ? this.properties.allowTranscoding : undefined;
    }

    /**
     * @deprecated Use [[Session.createConnection]] instead to get a [[Connection]] object.
     * 
     * @returns A Promise that is resolved to the generated _token_ string if success and rejected with an Error object if not
     */
    public generateToken(tokenOptions?: TokenOptions): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const data = JSON.stringify({
                session: this.sessionId,
                role: (!!tokenOptions && !!tokenOptions.role) ? tokenOptions.role : null,
                data: (!!tokenOptions && !!tokenOptions.data) ? tokenOptions.data : null,
                kurentoOptions: (!!tokenOptions && !!tokenOptions.kurentoOptions) ? tokenOptions.kurentoOptions : null
            });
            axios.post(
                this.ov.host + OpenVidu.API_TOKENS,
                data,
                {
                    headers: {
                        'Authorization': this.ov.basicAuth,
                        'Content-Type': 'application/json'
                    }
                }
            )
                .then(res => {
                    if (res.status === 200) {
                        // SUCCESS response from openvidu-server. Resolve token
                        resolve(res.data.token);
                    } else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        reject(new Error(res.status.toString()));
                    }
                }).catch(error => {
                    this.handleError(error, reject);
                });
        });
    }

    /**
     * Creates a new Connection object associated to Session object and configured with
     * `connectionProperties`. Each user connecting to the Session requires a Connection.
     * The token string value to send to the client side is available at [[Connection.token]].
     * 
     * @returns A Promise that is resolved to the generated [[Connection]] object if success and rejected with an Error object if not
     */
    public createConnection(connectionProperties?: ConnectionProperties): Promise<Connection> {
        return new Promise<Connection>((resolve, reject) => {
            const data = JSON.stringify({
                role: (!!connectionProperties && !!connectionProperties.role) ? connectionProperties.role : null,
                data: (!!connectionProperties && !!connectionProperties.data) ? connectionProperties.data : null,
                record: !!connectionProperties ? connectionProperties.record : null,
                kurentoOptions: (!!connectionProperties && !!connectionProperties.kurentoOptions) ? connectionProperties.kurentoOptions : null
            });
            axios.post(
                this.ov.host + OpenVidu.API_SESSIONS + '/' + this.sessionId + '/connection',
                data,
                {
                    headers: {
                        'Authorization': this.ov.basicAuth,
                        'Content-Type': 'application/json'
                    }
                }
            )
                .then(res => {
                    if (res.status === 200) {
                        // SUCCESS response from openvidu-server. Store and resolve Connection
                        const connection = new Connection(res.data);
                        this.connections.push(connection);
                        if (connection.status === 'active') {
                            this.activeConnections.push(connection);
                        }
                        resolve(new Connection(res.data));
                    } else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        reject(new Error(res.status.toString()));
                    }
                }).catch(error => {
                    this.handleError(error, reject);
                });
        });
    }

    /**
     * Gracefully closes the Session: unpublishes all streams and evicts every participant
     *
     * @returns A Promise that is resolved if the session has been closed successfully and rejected with an Error object if not
     */
    public close(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            axios.delete(
                this.ov.host + OpenVidu.API_SESSIONS + '/' + this.sessionId,
                {
                    headers: {
                        'Authorization': this.ov.basicAuth,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            )
                .then(res => {
                    if (res.status === 204) {
                        // SUCCESS response from openvidu-server
                        const indexToRemove: number = this.ov.activeSessions.findIndex(s => s.sessionId === this.sessionId);
                        this.ov.activeSessions.splice(indexToRemove, 1);
                        resolve();
                    } else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        reject(new Error(res.status.toString()));
                    }
                }).catch(error => {
                    this.handleError(error, reject);
                });
        });
    }

    /**
     * Updates every property of the Session with the current status it has in OpenVidu Server. This is especially useful for accessing the list of
     * Connections of the Session ([[Session.connections]], [[Session.activeConnections]]) and use those values to call [[Session.forceDisconnect]],
     * [[Session.forceUnpublish]] or [[Session.updateConnection]].
     *
     * To update all Session objects owned by OpenVidu object at once, call [[OpenVidu.fetch]]
     *
     * @returns A promise resolved to true if the Session status has changed with respect to the server, or to false if not.
     *          This applies to any property or sub-property of the Session object
     */
    public fetch(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            const beforeJSON: string = JSON.stringify(this, this.removeCircularOpenViduReference);
            axios.get(
                this.ov.host + OpenVidu.API_SESSIONS + '/' + this.sessionId + '?pendingConnections=true',
                {
                    headers: {
                        'Authorization': this.ov.basicAuth,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            )
                .then(res => {
                    if (res.status === 200) {
                        // SUCCESS response from openvidu-server
                        this.resetWithJson(res.data);
                        const afterJSON: string = JSON.stringify(this, this.removeCircularOpenViduReference);
                        const hasChanged: boolean = !(beforeJSON === afterJSON);
                        console.log("Session info fetched for session '" + this.sessionId + "'. Any change: " + hasChanged);
                        resolve(hasChanged);
                    } else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        reject(new Error(res.status.toString()));
                    }
                }).catch(error => {
                    this.handleError(error, reject);
                });
        });
    }

    /**
     * Removes the Connection from the Session. This can translate into a forced eviction of a user from the Session if the
     * Connection had status `active` or into a token invalidation if no user had taken the Connection yet (status `pending`).
     * 
     * In the first case, OpenVidu Browser will trigger the proper events in the client-side (`streamDestroyed`, `connectionDestroyed`,
     * `sessionDisconnected`) with reason set to `"forceDisconnectByServer"`.
     * 
     * In the second case, the token of the Connection will be invalidated and no user will be able to connect to the session with it.
     * 
     * This method automatically updates the properties of the local affected objects. This means that there is no need to call
     * [[Session.fetch]] or [[OpenVidu.fetch]]] to see the changes consequence of the execution of this method applied in the local objects.
     *
     * @param connection The Connection object to remove from the session, or its `connectionId` property
     * 
     * @returns A Promise that is resolved if the Connection was successfully removed from the Session and rejected with an Error object if not
     */
    public forceDisconnect(connection: string | Connection): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const connectionId: string = typeof connection === 'string' ? connection : (<Connection>connection).connectionId;
            axios.delete(
                this.ov.host + OpenVidu.API_SESSIONS + '/' + this.sessionId + '/connection/' + connectionId,
                {
                    headers: {
                        'Authorization': this.ov.basicAuth,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                })
                .then(res => {
                    if (res.status === 204) {
                        // SUCCESS response from openvidu-server
                        // Remove connection from connections array
                        let connectionClosed;
                        this.connections = this.connections.filter(con => {
                            if (con.connectionId !== connectionId) {
                                return true;
                            } else {
                                connectionClosed = con;
                                return false;
                            }
                        });
                        // Remove every Publisher of the closed connection from every subscriber list of other connections
                        if (!!connectionClosed) {
                            connectionClosed.publishers.forEach(publisher => {
                                this.connections.forEach(con => {
                                    con.subscribers = con.subscribers.filter(subscriber => {
                                        // tslint:disable:no-string-literal
                                        if (!!subscriber['streamId']) {
                                            // Subscriber with advanced webRtc configuration properties
                                            return (subscriber['streamId'] !== publisher.streamId);
                                            // tslint:enable:no-string-literal
                                        } else {
                                            // Regular string subscribers
                                            return subscriber !== publisher.streamId;
                                        }
                                    });
                                });
                            });
                        } else {
                            console.warn("The closed connection wasn't fetched in OpenVidu Node Client. No changes in the collection of active connections of the Session");
                        }
                        this.updateActiveConnectionsArray();
                        console.log("Connection '" + connectionId + "' closed");
                        resolve();
                    } else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        reject(new Error(res.status.toString()));
                    }
                })
                .catch(error => {
                    this.handleError(error, reject);
                });
        });
    }

    /**
     * Forces some Connection to unpublish a Stream (identified by its `streamId` or the corresponding [[Publisher]] object owning it).
     * OpenVidu Browser will trigger the proper events on the client-side (`streamDestroyed`) with reason set to `"forceUnpublishByServer"`.
     *
     * You can get `publisher` parameter from [[Connection.publishers]] array ([[Publisher.streamId]] for getting each `streamId` property).
     * Remember to call [[Session.fetch]] or [[OpenVidu.fetch]] before to fetch the current actual properties of the Session from OpenVidu Server
     *
     * This method automatically updates the properties of the local affected objects. This means that there is no need to call
     * [[Session.fetch]] or [[OpenVidu.fetch]] to see the changes consequence of the execution of this method applied in the local objects.
     * 
     * @param publisher The Publisher object to unpublish, or its `streamId` property
     * 
     * @returns A Promise that is resolved if the stream was successfully unpublished and rejected with an Error object if not
     */
    public forceUnpublish(publisher: string | Publisher): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const streamId: string = typeof publisher === 'string' ? publisher : (<Publisher>publisher).streamId;
            axios.delete(
                this.ov.host + OpenVidu.API_SESSIONS + '/' + this.sessionId + '/stream/' + streamId,
                {
                    headers: {
                        'Authorization': this.ov.basicAuth,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            )
                .then(res => {
                    if (res.status === 204) {
                        // SUCCESS response from openvidu-server
                        this.connections.forEach(connection => {
                            // Try to remove the Publisher from the Connection publishers collection
                            connection.publishers = connection.publishers.filter(pub => pub.streamId !== streamId);
                            // Try to remove the Publisher from the Connection subscribers collection
                            if (!!connection.subscribers && connection.subscribers.length > 0) {
                                // tslint:disable:no-string-literal
                                if (!!connection.subscribers[0]['streamId']) {
                                    // Subscriber with advanced webRtc configuration properties
                                    connection.subscribers = connection.subscribers.filter(sub => sub['streamId'] !== streamId);
                                    // tslint:enable:no-string-literal
                                } else {
                                    // Regular string subscribers
                                    connection.subscribers = connection.subscribers.filter(sub => sub !== streamId);
                                }
                            }
                        });
                        this.updateActiveConnectionsArray();
                        console.log("Stream '" + streamId + "' unpublished");
                        resolve();
                    } else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        reject(new Error(res.status.toString()));
                    }
                }).catch(error => {
                    this.handleError(error, reject);
                });
        });
    }

    /**
     * **This feature is part of OpenVidu Pro tier** <a href="https://docs.openvidu.io/en/stable/openvidu-pro/" target="_blank" style="display: inline-block; background-color: rgb(0, 136, 170); color: white; font-weight: bold; padding: 0px 5px; margin-right: 5px; border-radius: 3px; font-size: 13px; line-height:21px; font-family: Montserrat, sans-serif">PRO</a> 
     * 
     * Updates the properties of a Connection  with a [[ConnectionProperties]] object.
     * Only these properties can be updated:
     * 
     * - [[ConnectionProperties.role]]
     * - [[ConnectionProperties.record]]
     * 
     * This method automatically updates the properties of the local affected objects. This means that there is no need to call
     * [[Session.fetch]] or [[OpenVidu.fetch]] to see the changes consequence of the execution of this method applied in the local objects.
     * 
     * The affected client will trigger one [ConnectionPropertyChangedEvent](/en/stable/api/openvidu-browser/classes/connectionpropertychangedevent.html)
     * for each modified property.
     * 
     * @param connectionId The [[Connection.connectionId]] of the Connection object to modify
     * @param connectionProperties A new [[ConnectionProperties]] object with the updated values to apply
     * 
     * @returns A Promise that is resolved to the updated [[Connection]] object if the operation was
     *          successful and rejected with an Error object if not
     */
    public updateConnection(connectionId: string, connectionProperties: ConnectionProperties): Promise<Connection | undefined> {
        return new Promise<any>((resolve, reject) => {
            axios.patch(
                this.ov.host + OpenVidu.API_SESSIONS + "/" + this.sessionId + "/connection/" + connectionId,
                connectionProperties,
                {
                    headers: {
                        'Authorization': this.ov.basicAuth,
                        'Content-Type': 'application/json'
                    }
                }
            )
                .then(res => {
                    if (res.status === 200) {
                        console.log('Connection ' + connectionId + ' updated');
                    } else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        reject(new Error(res.status.toString()));
                        return;
                    }
                    // Update the actual Connection object with the new options
                    const existingConnection: Connection = this.connections.find(con => con.connectionId === connectionId);
                    if (!existingConnection) {
                        // The updated Connection is not available in local map
                        const newConnection: Connection = new Connection(res.data);
                        this.connections.push(newConnection);
                        this.updateActiveConnectionsArray();
                        resolve(newConnection);
                    } else {
                        // The updated Connection was available in local map
                        existingConnection.overrideConnectionProperties(connectionProperties);
                        this.updateActiveConnectionsArray();
                        resolve(existingConnection);
                    }
                }).catch(error => {
                    this.handleError(error, reject);
                });
        });
    }

    /**
     * @hidden
     */
    public getSessionId(): string {
        return this.sessionId;
    }

    /**
     * @hidden
     */
    public getSessionHttp(): Promise<string> {
        return new Promise<string>((resolve, reject) => {

            if (!!this.sessionId) {
                resolve(this.sessionId);
            }

            const mediaMode = !!this.properties.mediaMode ? this.properties.mediaMode : MediaMode.ROUTED;
            const recordingMode = !!this.properties.recordingMode ? this.properties.recordingMode : RecordingMode.MANUAL;
            const defaultOutputMode = !!this.properties.defaultOutputMode ? this.properties.defaultOutputMode : Recording.OutputMode.COMPOSED;
            const defaultRecordingLayout = !!this.properties.defaultRecordingLayout ? this.properties.defaultRecordingLayout : RecordingLayout.BEST_FIT;
            const defaultCustomLayout = !!this.properties.defaultCustomLayout ? this.properties.defaultCustomLayout : '';
            const customSessionId = !!this.properties.customSessionId ? this.properties.customSessionId : '';
            const mediaNode = !!this.properties.mediaNode ? this.properties.mediaNode : undefined;
            const forcedVideoCodec = !!this.properties.forcedVideoCodec ? this.properties.forcedVideoCodec : undefined;
            const allowTranscoding = this.properties.allowTranscoding != null ? this.properties.allowTranscoding : undefined;

            const data = JSON.stringify({mediaMode, recordingMode, defaultOutputMode, defaultRecordingLayout, defaultCustomLayout,
                customSessionId, mediaNode, forcedVideoCodec, allowTranscoding});

            axios.post(
                this.ov.host + OpenVidu.API_SESSIONS,
                data,
                {
                    headers: {
                        'Authorization': this.ov.basicAuth,
                        'Content-Type': 'application/json'
                    }
                }
            )
                .then(res => {
                    if (res.status === 200) {
                        // SUCCESS response from openvidu-server. Resolve token
                        this.sessionId = res.data.id;
                        this.createdAt = res.data.createdAt;
                        this.properties.mediaMode = mediaMode;
                        this.properties.recordingMode = recordingMode;
                        this.properties.defaultOutputMode = defaultOutputMode;
                        this.properties.defaultRecordingLayout = defaultRecordingLayout;
                        this.properties.defaultCustomLayout = defaultCustomLayout;
                        this.properties.customSessionId = customSessionId;
                        this.properties.mediaNode = mediaNode;
                        this.properties.forcedVideoCodec = res.data.forcedVideoCodec;
                        this.properties.allowTranscoding = res.data.allowTranscoding;
                        resolve(this.sessionId);
                    } else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        reject(new Error(res.status.toString()));
                    }
                }).catch(error => {
                    if (error.response) {
                        // The request was made and the server responded with a status code (not 2xx)
                        if (error.response.status === 409) {
                            // 'customSessionId' already existed
                            this.sessionId = this.properties.customSessionId;
                            resolve(this.sessionId);
                        } else {
                            reject(new Error(error.response.status.toString()));
                        }
                    } else if (error.request) {
                        // The request was made but no response was received
                        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                        // http.ClientRequest in node.js
                        console.error(error.request);
                        reject(new Error(error.request));
                    } else {
                        // Something happened in setting up the request that triggered an Error
                        console.error('Error', error.message);
                        reject(new Error(error.message));
                    }
                });
        });
    }

    /**
     * @hidden
     */
    public resetWithJson(json): Session {
        this.sessionId = json.sessionId;
        this.createdAt = json.createdAt;
        this.recording = json.recording;
        this.properties = {
            customSessionId: json.customSessionId,
            mediaMode: json.mediaMode,
            recordingMode: json.recordingMode,
            defaultOutputMode: json.defaultOutputMode,
            defaultRecordingLayout: json.defaultRecordingLayout,
            defaultCustomLayout: json.defaultCustomLayout,
            forcedVideoCodec: json.forcedVideoCodec,
            allowTranscoding: json.allowTranscoding
        };
        if (json.defaultRecordingLayout == null) {
            delete this.properties.defaultRecordingLayout;
        }
        if (json.customSessionId == null) {
            delete this.properties.customSessionId;
        }
        if (json.defaultCustomLayout == null) {
            delete this.properties.defaultCustomLayout;
        }
        if (json.mediaNode == null) {
            delete this.properties.mediaNode;
        }
        if (json.forcedVideoCodec == null) {
            delete this.properties.forcedVideoCodec;
        }
        if (json.allowTranscoding == null) {
            delete this.properties.allowTranscoding;
        }

        // 1. Array to store fetched connections and later remove closed ones
        const fetchedConnectionIds: string[] = [];
        json.connections.content.forEach(jsonConnection => {

            const connectionObj: Connection = new Connection(jsonConnection);
            fetchedConnectionIds.push(connectionObj.connectionId);
            let storedConnection = this.connections.find(c => c.connectionId === connectionObj.connectionId);

            if (!!storedConnection) {
                // 2. Update existing Connection
                storedConnection.resetWithJson(jsonConnection);
            } else {
                // 3. Add new Connection
                this.connections.push(connectionObj);
            }
        });

        // 4. Remove closed sessions from local collection
        for (var i = this.connections.length - 1; i >= 0; --i) {
            if (!fetchedConnectionIds.includes(this.connections[i].connectionId)) {
                this.connections.splice(i, 1);
            }
        }

        // Order connections by time of creation
        this.connections.sort((c1, c2) => (c1.createdAt > c2.createdAt) ? 1 : ((c2.createdAt > c1.createdAt) ? -1 : 0));
        // Populate activeConnections array
        this.updateActiveConnectionsArray();
        return this;
    }

    /**
     * @hidden
     */
    equalTo(other: Session): boolean {
        let equals: boolean = (
            this.sessionId === other.sessionId &&
            this.createdAt === other.createdAt &&
            this.recording === other.recording &&
            this.connections.length === other.connections.length &&
            JSON.stringify(this.properties) === JSON.stringify(other.properties)
        );
        if (equals) {
            let i = 0;
            while (equals && i < this.connections.length) {
                equals = this.connections[i].equalTo(other.connections[i]);
                i++;
            }
            return equals;
        } else {
            return false;
        }
    }

    /**
     * @hidden
     */
    private removeCircularOpenViduReference(key: string, value: any) {
        if (key === 'ov' && value instanceof OpenVidu) {
            return;
        } else {
            return value;
        }
    }

    /**
     * @hidden
     */
    private updateActiveConnectionsArray() {
        this.activeConnections = [];
        this.connections.forEach(con => {
            if (con.status === 'active') {
                this.activeConnections.push(con);
            }
        });
    }

    /**
     * @hidden
     */
    private handleError(error: AxiosError, reject: (reason?: any) => void) {
        if (error.response) {
            // The request was made and the server responded with a status code (not 2xx)
            reject(new Error(error.response.status.toString()));
        } else if (error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            console.error(error.request);
            reject(new Error(error.request));
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error', error.message);
            reject(new Error(error.message));
        }
    }

}