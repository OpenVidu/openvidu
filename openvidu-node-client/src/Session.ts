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

import axios from 'axios';
import { Connection } from './Connection';
import { MediaMode } from './MediaMode';
import { OpenVidu } from './OpenVidu';
import { OpenViduRole } from './OpenViduRole';
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
     * Array of active connections to the session. This property always initialize as an empty array and
     * **will remain unchanged since the last time method [[Session.fetch]] was called**. Exceptions to this rule are:
     *
     * - Calling [[Session.forceUnpublish]] also automatically updates each affected Connection status
     * - Calling [[Session.forceDisconnect]] automatically updates each affected Connection status
     *
     * To get the array of active connections with their current actual value, you must call [[Session.fetch]] before consulting
     * property [[activeConnections]]
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
        console.log(ov)
        if (!!propertiesOrJson) {
            // Defined parameter
            if (!!propertiesOrJson.sessionId) {
                // Parameter is a JSON representation of Session ('sessionId' property always defined)
                this.resetSessionWithJson(propertiesOrJson);
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
    }

    /**
     * Gets the unique identifier of the Session
     */
    public getSessionId(): string {
        return this.sessionId;
    }

    /**
     * Gets a new token associated to Session object
     *
     * @returns A Promise that is resolved to the _token_ if success and rejected with an Error object if not
     */
    public generateToken(tokenOptions?: TokenOptions): Promise<string> {
        return new Promise<string>((resolve, reject) => {

            const data = JSON.stringify({
                session: this.sessionId,
                role: (!!tokenOptions && !!tokenOptions.role) ? tokenOptions.role : OpenViduRole.PUBLISHER,
                data: (!!tokenOptions && !!tokenOptions.data) ? tokenOptions.data : '',
                kurentoOptions: (!!tokenOptions && !!tokenOptions.kurentoOptions) ? tokenOptions.kurentoOptions : {},
            });

            axios.post(
                'https://' + this.ov.hostname + ':' + this.ov.port + OpenVidu.API_TOKENS,
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
                        resolve(res.data.id);
                    } else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        reject(new Error(res.status.toString()));
                    }
                }).catch(error => {
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
                'https://' + this.ov.hostname + ':' + this.ov.port + OpenVidu.API_SESSIONS + '/' + this.sessionId,
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
                });
        });
    }

    /**
     * Updates every property of the Session with the current status it has in OpenVidu Server. This is especially useful for accessing the list of active
     * connections of the Session ([[Session.activeConnections]]) and use those values to call [[Session.forceDisconnect]] or [[Session.forceUnpublish]].
     *
     * To update every Session object owned by OpenVidu object, call [[OpenVidu.fetch]]
     *
     * @returns A promise resolved to true if the Session status has changed with respect to the server, or to false if not.
     *          This applies to any property or sub-property of the Session object
     */
    public fetch(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            const beforeJSON: string = JSON.stringify(this);
            axios.get(
                'https://' + this.ov.hostname + ':' + this.ov.port + OpenVidu.API_SESSIONS + '/' + this.sessionId,
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
                        this.resetSessionWithJson(res.data);
                        const afterJSON: string = JSON.stringify(this);
                        const hasChanged: boolean = !(beforeJSON === afterJSON);
                        console.log("Session info fetched for session '" + this.sessionId + "'. Any change: " + hasChanged);
                        resolve(hasChanged);
                    } else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        reject(new Error(res.status.toString()));
                    }
                }).catch(error => {
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
                });
        });
    }

    /**
     * Forces the user with Connection `connectionId` to leave the session. OpenVidu Browser will trigger the proper events on the client-side
     * (`streamDestroyed`, `connectionDestroyed`, `sessionDisconnected`) with reason set to `"forceDisconnectByServer"`
     *
     * You can get `connection` parameter from [[Session.activeConnections]] array ([[Connection.connectionId]] for getting each `connectionId` property).
     * Remember to call [[Session.fetch]] before to fetch the current actual properties of the Session from OpenVidu Server
     *
     * @returns A Promise that is resolved if the user was successfully disconnected and rejected with an Error object if not
     */
    public forceDisconnect(connection: string | Connection): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const connectionId: string = typeof connection === 'string' ? connection : (<Connection>connection).connectionId;
            axios.delete(
                'https://' + this.ov.hostname + ':' + this.ov.port + OpenVidu.API_SESSIONS + '/' + this.sessionId + '/connection/' + connectionId,
                {
                    headers: {
                        'Authorization': this.ov.basicAuth,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                })
                .then(res => {
                    if (res.status === 204) {
                        // SUCCESS response from openvidu-server
                        // Remove connection from activeConnections array
                        let connectionClosed;
                        this.activeConnections = this.activeConnections.filter(con => {
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
                                this.activeConnections.forEach(con => {
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
                            console.warn("The closed connection wasn't fetched in OpenVidu Java Client. No changes in the collection of active connections of the Session");
                        }
                        console.log("Connection '" + connectionId + "' closed");
                        resolve();
                    } else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        reject(new Error(res.status.toString()));
                    }
                })
                .catch(error => {
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
                });
        });
    }

    /**
     * Forces some user to unpublish a Stream (identified by its `streamId` or the corresponding [[Publisher]] object owning it).
     * OpenVidu Browser will trigger the proper events on the client-side (`streamDestroyed`) with reason set to `"forceUnpublishByServer"`.
     *
     * You can get `publisher` parameter from [[Connection.publishers]] array ([[Publisher.streamId]] for getting each `streamId` property).
     * Remember to call [[Session.fetch]] before to fetch the current actual properties of the Session from OpenVidu Server
     *
     * @returns A Promise that is resolved if the stream was successfully unpublished and rejected with an Error object if not
     */
    public forceUnpublish(publisher: string | Publisher): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const streamId: string = typeof publisher === 'string' ? publisher : (<Publisher>publisher).streamId;
            axios.delete(
                'https://' + this.ov.hostname + ':' + this.ov.port + OpenVidu.API_SESSIONS + '/' + this.sessionId + '/stream/' + streamId,
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
                        this.activeConnections.forEach(connection => {
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
                        console.log("Stream '" + streamId + "' unpublished");
                        resolve();
                    } else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        reject(new Error(res.status.toString()));
                    }
                }).catch(error => {
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
                });
        });
    }

    /**
     * @hidden
     */
    public getSessionIdHttp(): Promise<string> {
        return new Promise<string>((resolve, reject) => {

            if (!!this.sessionId) {
                resolve(this.sessionId);
            }

            const data = JSON.stringify({
                mediaMode: !!this.properties.mediaMode ? this.properties.mediaMode : MediaMode.ROUTED,
                recordingMode: !!this.properties.recordingMode ? this.properties.recordingMode : RecordingMode.MANUAL,
                defaultOutputMode: !!this.properties.defaultOutputMode ? this.properties.defaultOutputMode : Recording.OutputMode.COMPOSED,
                defaultRecordingLayout: !!this.properties.defaultRecordingLayout ? this.properties.defaultRecordingLayout : RecordingLayout.BEST_FIT,
                defaultCustomLayout: !!this.properties.defaultCustomLayout ? this.properties.defaultCustomLayout : '',
                customSessionId: !!this.properties.customSessionId ? this.properties.customSessionId : ''
            });

            axios.post(
                'https://' + this.ov.hostname + ':' + this.ov.port + OpenVidu.API_SESSIONS,
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
    public resetSessionWithJson(json): Session {
        this.sessionId = json.sessionId;
        this.createdAt = json.createdAt;
        this.recording = json.recording;
        let customSessionId: string;
        let defaultCustomLayout: string;
        if (!!this.properties) {
            customSessionId = this.properties.customSessionId;
            defaultCustomLayout = !!json.defaultCustomLayout ? json.defaultCustomLayout : this.properties.defaultCustomLayout;
        }
        this.properties = {
            mediaMode: json.mediaMode,
            recordingMode: json.recordingMode,
            defaultOutputMode: json.defaultOutputMode,
            defaultRecordingLayout: json.defaultRecordingLayout
        };
        if (!!customSessionId) {
            this.properties.customSessionId = customSessionId;
        } else if (!!json.customSessionId) {
            this.properties.customSessionId = json.customSessionId;
        }
        if (!!defaultCustomLayout) {
            this.properties.defaultCustomLayout = defaultCustomLayout;
        }

        this.activeConnections = [];
        json.connections.content.forEach(connection => {
            const publishers: Publisher[] = [];
            connection.publishers.forEach(publisher => {
                publishers.push(new Publisher(publisher));
            });
            const subscribers: string[] = [];
            connection.subscribers.forEach(subscriber => {
                subscribers.push(subscriber.streamId);
            });
            this.activeConnections.push(
                new Connection(
                    connection.connectionId,
                    connection.createdAt,
                    connection.role,
                    connection.token,
                    connection.location,
                    connection.platform,
                    connection.serverData,
                    connection.clientData,
                    publishers,
                    subscribers));
        });
        // Order connections by time of creation
        this.activeConnections.sort((c1, c2) => (c1.createdAt > c2.createdAt) ? 1 : ((c2.createdAt > c1.createdAt) ? -1 : 0));
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
            this.activeConnections.length === other.activeConnections.length &&
            JSON.stringify(this.properties) === JSON.stringify(other.properties)
        );
        if (equals) {
            let i = 0;
            while (equals && i < this.activeConnections.length) {
                equals = this.activeConnections[i].equalTo(other.activeConnections[i]);
                i++;
            }
            return equals;
        } else {
            return false;
        }
    }

}