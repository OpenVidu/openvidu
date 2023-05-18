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

import axios, { AxiosError } from 'axios';
import { OpenViduLogger } from './Logger/OpenViduLogger';
import { Connection } from './Connection';
import { Recording } from './Recording';
import { RecordingProperties } from './RecordingProperties';
import { Session } from './Session';
import { SessionProperties } from './SessionProperties';

/**
 * @hidden
 */
interface ObjMap<T> {
    [s: string]: T;
}

/**
 * @hidden
 */
interface HttpError {
    message?: string;
    response?: any;
    request?: any;
    status?: number;
}

const logger: OpenViduLogger = OpenViduLogger.getInstance();

export class OpenVidu {
    private Buffer = require('buffer/').Buffer;

    /**
     * @hidden
     */
    public host: string;
    /**
     * @hidden
     */
    public basicAuth: string;

    /**
     * @hidden
     */
    static readonly API_PATH: string = '/openvidu/api';
    /**
     * @hidden
     */
    static readonly API_SESSIONS = OpenVidu.API_PATH + '/sessions';
    /**
     * @hidden
     */
    static readonly API_TOKENS = OpenVidu.API_PATH + '/tokens';
    /**
     * @hidden
     */
    static readonly API_RECORDINGS: string = OpenVidu.API_PATH + '/recordings';
    /**
     * @hidden
     */
    static readonly API_RECORDINGS_START: string = OpenVidu.API_RECORDINGS + '/start';
    /**
     * @hidden
     */
    static readonly API_RECORDINGS_STOP: string = OpenVidu.API_RECORDINGS + '/stop';
    /**
     * @hidden
     */
    static readonly API_BROADCAST: string = OpenVidu.API_PATH + '/broadcast';
    /**
     * @hidden
     */
    static readonly API_BROADCAST_START: string = OpenVidu.API_BROADCAST + '/start';
    /**
     * @hidden
     */
    static readonly API_BROADCAST_STOP: string = OpenVidu.API_BROADCAST + '/stop';

    /**
     * Array of active sessions. **This value will remain unchanged since the last time method {@link OpenVidu.fetch}
     * was called**. Exceptions to this rule are:
     *
     * - Calling {@link OpenVidu.createSession} automatically adds the new Session object to the local collection.
     * - Calling {@link Session.fetch} updates that specific Session status
     * - Calling {@link Session.close} automatically removes the Session from the list of active Sessions
     * - Calling {@link Session.forceDisconnect} automatically updates the inner affected connections for that specific Session
     * - Calling {@link Session.forceUnpublish} also automatically updates the inner affected connections for that specific Session
     * - Calling {@link Session.updateConnection} automatically updates the inner affected connection for that specific Session
     * - Calling {@link OpenVidu.startRecording} and {@link OpenVidu.stopRecording} automatically updates the recording status of the Session ({@link Session.recording})
     *
     * To get the array of active sessions with their current actual value, you must call {@link OpenVidu.fetch} before consulting
     * property {@link activeSessions}
     */
    activeSessions: Session[] = [];

    /**
     * @param hostname URL where your OpenVidu deployment is up an running.
     *                 It must be the full URL (e.g. `https://12.34.56.78:1234/`)
     *
     * @param secret Secret configured in your OpenVidu deployment
     */
    constructor(private hostname: string, secret: string) {
        this.setHostnameAndPort();
        this.basicAuth = this.getBasicAuth(secret);
    }

    /**
     * Creates an OpenVidu session. The session identifier will be available at property {@link Session.sessionId}
     *
     * @returns A Promise that is resolved to the {@link Session} if success and rejected with an
     * [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error) object if not.
     * This Error object has as `message` property with a status code carrying a specific meaning
     * (see [REST API](/en/stable/reference-docs/REST-API/#post-recording-start)).
     *
     * This method will never return an Error with status `409`. If a session with the same `customSessionId` already
     * exists in OpenVidu Server, a {@link Session.fetch} operation is performed in the background and the updated Session
     * object is returned.
     */
    public createSession(properties?: SessionProperties): Promise<Session> {
        return new Promise<Session>((resolve, reject) => {
            const session = new Session(this, properties);
            session
                .getSessionHttp()
                .then((response) => {
                    this.activeSessions.push(session);
                    resolve(session);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    public startRecording(sessionId: string): Promise<Recording>;
    public startRecording(sessionId: string, name: string): Promise<Recording>;
    public startRecording(sessionId: string, properties: RecordingProperties): Promise<Recording>;

    /**
     * Starts the recording of a {@link Session}
     *
     * @param sessionId The `sessionId` of the {@link Session} you want to start recording
     * @param name The name you want to give to the video file. You can access this same value in your clients on recording events (`recordingStarted`, `recordingStopped`)
     * @param properties Custom RecordingProperties to apply to this Recording. This will override the global default values set to the Session with {@link SessionProperties.defaultRecordingProperties}
     *
     * @returns A Promise that is resolved to the {@link Recording} if it successfully started (the recording can be stopped with guarantees) and rejected with an
     * [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error) object if not.
     * This Error object has as `message` property with a status code carrying a specific meaning
     * (see [REST API](/en/stable/reference-docs/REST-API/#post-recording-start)).
     */
    public startRecording(sessionId: string, param2?: string | RecordingProperties): Promise<Recording> {
        return new Promise<Recording>((resolve, reject) => {
            let data;

            if (param2 != null) {
                if (typeof param2 === 'string') {
                    data = JSON.stringify({
                        session: sessionId,
                        name: param2
                    });
                } else {
                    const properties: RecordingProperties = param2 as RecordingProperties;
                    data = {
                        session: sessionId,
                        name: properties.name,
                        outputMode: properties.outputMode,
                        recordingLayout: properties.recordingLayout,
                        customLayout: properties.customLayout,
                        ignoreFailedStreams: properties.ignoreFailedStreams,
                        resolution: properties.resolution,
                        frameRate: properties.frameRate,
                        hasAudio: properties.hasAudio,
                        hasVideo: properties.hasVideo,
                        shmSize: properties.shmSize,
                        mediaNode: properties.mediaNode
                    };
                    data = JSON.stringify(data);
                }
            } else {
                data = JSON.stringify({
                    session: sessionId,
                    name: ''
                });
            }

            axios
                .post(this.host + OpenVidu.API_RECORDINGS_START, data, {
                    headers: {
                        Authorization: this.basicAuth,
                        'Content-Type': 'application/json'
                    },
                    validateStatus: (_) => true
                })
                .then((res) => {
                    if (res.status === 200) {
                        // SUCCESS response from openvidu-server (Recording in JSON format). Resolve new Recording
                        const r: Recording = new Recording(res.data);
                        const activeSession = this.activeSessions.find((s) => s.sessionId === r.sessionId);
                        if (!!activeSession) {
                            activeSession.recording = true;
                        } else {
                            logger.warn(
                                "No active session found for sessionId '" +
                                    r.sessionId +
                                    "'. This instance of OpenVidu Node Client didn't create this session"
                            );
                        }
                        resolve(r);
                    } else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        this.handleError(res, reject);
                    }
                })
                .catch((error) => {
                    // Request error.
                    this.handleError(error, reject);
                });
        });
    }

    /**
     * Stops the recording of a {@link Session}
     *
     * @param recordingId The `id` property of the {@link Recording} you want to stop
     *
     * @returns A Promise that is resolved to the {@link Recording} if it successfully stopped and rejected with an
     * [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error) object if not.
     * This Error object has as `message` property with a status code carrying a specific meaning
     * (see [REST API](/en/stable/reference-docs/REST-API/#post-recording-stop)).
     */
    public stopRecording(recordingId: string): Promise<Recording> {
        return new Promise<Recording>((resolve, reject) => {
            axios
                .post(this.host + OpenVidu.API_RECORDINGS_STOP + '/' + recordingId, undefined, {
                    headers: {
                        Authorization: this.basicAuth,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    validateStatus: (_) => true
                })
                .then((res) => {
                    if (res.status === 200) {
                        // SUCCESS response from openvidu-server (Recording in JSON format). Resolve new Recording
                        const r: Recording = new Recording(res.data);
                        const activeSession = this.activeSessions.find((s) => s.sessionId === r.sessionId);
                        if (!!activeSession) {
                            activeSession.recording = false;
                        } else {
                            logger.warn(
                                "No active session found for sessionId '" +
                                    r.sessionId +
                                    "'. This instance of OpenVidu Node Client didn't create this session"
                            );
                        }
                        resolve(r);
                    } else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        this.handleError(res, reject);
                    }
                })
                .catch((error) => {
                    // Request error.
                    this.handleError(error, reject);
                });
        });
    }

    /**
     * Gets an existing {@link Recording}
     *
     * @param recordingId The `id` property of the {@link Recording} you want to retrieve
     *
     * @returns A Promise that is resolved to the {@link Recording} if it successfully stopped and rejected with an
     * [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error) object if not.
     * This Error object has as `message` property with a status code carrying a specific meaning
     * (see [REST API](/en/stable/reference-docs/REST-API/#get-recording)).
     */
    public getRecording(recordingId: string): Promise<Recording> {
        return new Promise<Recording>((resolve, reject) => {
            axios
                .get(this.host + OpenVidu.API_RECORDINGS + '/' + recordingId, {
                    headers: {
                        Authorization: this.basicAuth,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    validateStatus: (_) => true
                })
                .then((res) => {
                    if (res.status === 200) {
                        // SUCCESS response from openvidu-server (Recording in JSON format). Resolve new Recording
                        resolve(new Recording(res.data));
                    } else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        this.handleError(res, reject);
                    }
                })
                .catch((error) => {
                    // Request error.
                    this.handleError(error, reject);
                });
        });
    }

    /**
     * Lists all existing recordings
     *
     * @returns A Promise that is resolved to an array with all existing recordings
     */
    public listRecordings(): Promise<Recording[]> {
        return new Promise<Recording[]>((resolve, reject) => {
            axios
                .get(this.host + OpenVidu.API_RECORDINGS, {
                    headers: {
                        Authorization: this.basicAuth
                    },
                    validateStatus: (_) => true
                })
                .then((res) => {
                    if (res.status === 200) {
                        // SUCCESS response from openvidu-server (JSON arrays of recordings in JSON format). Resolve list of new recordings
                        const recordingArray: Recording[] = [];
                        const responseItems = res.data.items;
                        for (const item of responseItems) {
                            recordingArray.push(new Recording(item));
                        }
                        // Order recordings by time of creation (newest first)
                        recordingArray.sort((r1, r2) => (r1.createdAt < r2.createdAt ? 1 : r2.createdAt < r1.createdAt ? -1 : 0));
                        resolve(recordingArray);
                    } else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        this.handleError(res, reject);
                    }
                })
                .catch((error) => {
                    // Request error.
                    this.handleError(error, reject);
                });
        });
    }

    /**
     * Deletes a {@link Recording}. The recording must have status `stopped`, `ready` or `failed`
     *
     * @param recordingId
     *
     * @returns A Promise that is resolved if the Recording was successfully deleted and rejected with an
     * [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error) object if not.
     * This Error object has as `message` property with a status code carrying a specific meaning
     * (see [REST API](/en/stable/reference-docs/REST-API/#delete-recording)).
     */
    public deleteRecording(recordingId: string): Promise<Error> {
        return new Promise<Error>((resolve, reject) => {
            axios
                .delete(this.host + OpenVidu.API_RECORDINGS + '/' + recordingId, {
                    headers: {
                        Authorization: this.basicAuth,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    validateStatus: (_) => true
                })
                .then((res) => {
                    if (res.status === 204) {
                        // SUCCESS response from openvidu-server. Resolve undefined
                        resolve(undefined);
                    } else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        this.handleError(res, reject);
                    }
                })
                .catch((error) => {
                    // Request error.
                    this.handleError(error, reject);
                });
        });
    }

    public startBroadcast(sessionId: string, broadcastUrl: string): Promise<void>;
    public startBroadcast(sessionId: string, broadcastUrl: string, properties: RecordingProperties): Promise<void>;

    /**
     * Starts the broadcast of a {@link Session}
     *
     * @param sessionId The `sessionId` of the {@link Session} you want to start broadcasting
     * @param broadcastUrl The URL where to broadcast
     * @param properties The configuration for this broadcast. It uses a subset of the {@link RecordingProperties}:
     * - {@link RecordingProperties.hasAudio}
     * - {@link RecordingProperties.resolution}
     * - {@link RecordingProperties.frameRate}
     * - {@link RecordingProperties.recordingLayout}
     * - {@link RecordingProperties.customLayout}
     * - {@link RecordingProperties.shmSize}
     * - {@link RecordingProperties.mediaNode}
     *
     * @returns A Promise that is resolved if the broadcast successfully started and rejected with an
     * [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error) object if not.
     * This Error object has as `message` property with a status code carrying a specific meaning
     * (see [REST API](/en/stable/reference-docs/REST-API/#start-broadcast)).
     */
    public startBroadcast(sessionId: string, broadcastUrl: string, properties?: RecordingProperties): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let data;
            if (properties != undefined) {
                data = {
                    session: sessionId,
                    broadcastUrl,
                    recordingLayout: properties.recordingLayout,
                    customLayout: properties.customLayout,
                    resolution: properties.resolution,
                    frameRate: properties.frameRate,
                    hasAudio: properties.hasAudio,
                    shmSize: properties.shmSize,
                    mediaNode: properties.mediaNode
                };
                data = JSON.stringify(data);
            } else {
                data = {
                    session: sessionId,
                    broadcastUrl
                };
            }

            axios
                .post(this.host + OpenVidu.API_BROADCAST_START, data, {
                    headers: {
                        Authorization: this.basicAuth,
                        'Content-Type': 'application/json'
                    },
                    validateStatus: (_) => true
                })
                .then((res) => {
                    if (res.status === 200) {
                        const activeSession = this.activeSessions.find((s) => s.sessionId === sessionId);
                        if (!!activeSession) {
                            activeSession.broadcasting = true;
                        } else {
                            logger.warn(
                                "No active session found for sessionId '" +
                                    sessionId +
                                    "'. This instance of OpenVidu Node Client didn't create this session"
                            );
                        }
                        resolve();
                    } else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        this.handleError(res, reject);
                    }
                })
                .catch((error) => {
                    // Request error.
                    this.handleError(error, reject);
                });
        });
    }

    /**
     * Stops the broadcast of a {@link Session}
     *
     * @param sessionId The `sessionId` of the {@link Session} you want to stop broadcasting
     *
     * @returns A Promise that is resolved if the broadcast successfully stopped and rejected with an
     * [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error) object if not.
     * This Error object has as `message` property with a status code carrying a specific meaning
     * (see [REST API](/en/stable/reference-docs/REST-API/#stop-broadcast)).
     */
    public stopBroadcast(sessionId: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            axios
                .post(
                    this.host + OpenVidu.API_BROADCAST_STOP,
                    { session: sessionId },
                    {
                        headers: {
                            Authorization: this.basicAuth,
                            'Content-Type': 'application/json'
                        },
                        validateStatus: (_) => true
                    }
                )
                .then((res) => {
                    if (res.status === 200) {
                        // SUCCESS response from openvidu-server
                        const activeSession = this.activeSessions.find((s) => s.sessionId === sessionId);
                        if (!!activeSession) {
                            activeSession.broadcasting = false;
                        } else {
                            logger.warn(
                                "No active session found for sessionId '" +
                                    sessionId +
                                    "'. This instance of OpenVidu Node Client didn't create this session"
                            );
                        }
                        resolve();
                    } else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        this.handleError(res, reject);
                    }
                })
                .catch((error) => {
                    // Request error.
                    this.handleError(error, reject);
                });
        });
    }

    /**
     * Updates every property of every active Session with the current status they have in OpenVidu Server.
     * After calling this method you can access the updated array of active sessions in {@link activeSessions}
     *
     * @returns A promise resolved to true if any Session status has changed with respect to the server, or to false if not.
     * This applies to any property or sub-property of any of the sessions locally stored in OpenVidu Node Client
     */
    public fetch(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            axios
                .get(this.host + OpenVidu.API_SESSIONS + '?pendingConnections=true', {
                    headers: {
                        Authorization: this.basicAuth
                    },
                    validateStatus: (_) => true
                })
                .then((res) => {
                    if (res.status === 200) {
                        // Boolean to store if any Session has changed
                        let hasChanged = false;

                        // 1. Array to store fetched sessionIds and later remove closed ones
                        const fetchedSessionIds: string[] = [];
                        res.data.content.forEach((jsonSession) => {
                            const fetchedSession: Session = new Session(this, jsonSession);
                            fetchedSessionIds.push(fetchedSession.sessionId);
                            let storedSession = this.activeSessions.find((s) => s.sessionId === fetchedSession.sessionId);

                            if (!!storedSession) {
                                // 2. Update existing Session
                                const changed: boolean = !storedSession.equalTo(fetchedSession);
                                storedSession.resetWithJson(jsonSession);
                                logger.log("Available session '" + storedSession.sessionId + "' info fetched. Any change: " + changed);
                                hasChanged = hasChanged || changed;
                            } else {
                                // 3. Add new Session
                                this.activeSessions.push(fetchedSession);
                                logger.log("New session '" + fetchedSession.sessionId + "' info fetched");
                                hasChanged = true;
                            }
                        });

                        // 4. Remove closed sessions from local collection
                        for (var i = this.activeSessions.length - 1; i >= 0; --i) {
                            let sessionId = this.activeSessions[i].sessionId;
                            if (!fetchedSessionIds.includes(sessionId)) {
                                logger.log("Removing closed session '" + sessionId + "'");
                                hasChanged = true;
                                this.activeSessions.splice(i, 1);
                            }
                        }

                        logger.log('Active sessions info fetched: ', fetchedSessionIds);
                        resolve(hasChanged);
                    } else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        this.handleError(res, reject);
                    }
                })
                .catch((error) => {
                    // Request error.
                    this.handleError(error, reject);
                });
        });
    }

    /**
     * @hidden
     * @returns A map paring every existing sessionId with true or false depending on whether it has changed or not
     */
    fetchWebRtc(): Promise<any> {
        // tslint:disable:no-string-literal
        const addWebRtcStatsToConnections = (connection: Connection, connectionsExtendedInfo: any) => {
            const connectionExtended = connectionsExtendedInfo.find((c) => c.connectionId === connection.connectionId);
            if (!!connectionExtended) {
                connection.publishers.forEach((pub) => {
                    const publisherExtended = connectionExtended.publishers.find((p) => p.streamId === pub.streamId);
                    pub['webRtc'] = {
                        kms: {
                            events: publisherExtended.events,
                            localCandidate: publisherExtended.localCandidate,
                            remoteCandidate: publisherExtended.remoteCandidate,
                            clientIceCandidates: publisherExtended.clientIceCandidates,
                            serverIceCandidates: publisherExtended.serverIceCandidates,
                            webrtcEndpointName: publisherExtended.webrtcEndpointName,
                            localSdp: publisherExtended.localSdp,
                            remoteSdp: publisherExtended.remoteSdp
                        }
                    };
                    pub['localCandidatePair'] = parseRemoteCandidatePair(pub['webRtc'].kms.remoteCandidate);
                    if (!!publisherExtended.serverStats) {
                        pub['webRtc'].kms.serverStats = publisherExtended.serverStats;
                    }
                });
                const subscriberArray = [];
                connection.subscribers.forEach((sub) => {
                    const subscriberExtended = connectionExtended.subscribers.find((s) => s.streamId === sub);
                    const subAux = {};
                    // Standard properties
                    subAux['streamId'] = sub;
                    subAux['publisher'] = subscriberExtended.publisher;
                    // WebRtc properties
                    subAux['createdAt'] = subscriberExtended.createdAt;
                    subAux['webRtc'] = {
                        kms: {
                            events: subscriberExtended.events,
                            localCandidate: subscriberExtended.localCandidate,
                            remoteCandidate: subscriberExtended.remoteCandidate,
                            clientIceCandidates: subscriberExtended.clientIceCandidates,
                            serverIceCandidates: subscriberExtended.serverIceCandidates,
                            webrtcEndpointName: subscriberExtended.webrtcEndpointName,
                            localSdp: subscriberExtended.localSdp,
                            remoteSdp: subscriberExtended.remoteSdp
                        }
                    };
                    subAux['localCandidatePair'] = parseRemoteCandidatePair(subAux['webRtc'].kms.remoteCandidate);
                    if (!!subscriberExtended.serverStats) {
                        subAux['webRtc'].kms.serverStats = subscriberExtended.serverStats;
                    }
                    subscriberArray.push(subAux);
                });
                connection.subscribers = subscriberArray;
            }
        };

        const parseRemoteCandidatePair = (candidateStr: string) => {
            if (!candidateStr) {
                return 'ERROR: No remote candidate available';
            }
            const array = candidateStr.split(/\s+/);
            return {
                portNumber: array[5],
                ipAddress: array[4],
                transport: array[2].toLowerCase(),
                candidateType: array[7],
                priority: array[3],
                raw: candidateStr
            };
        };

        return new Promise<{ changes: boolean; sessionChanges: ObjMap<boolean> }>((resolve, reject) => {
            axios
                .get(this.host + OpenVidu.API_SESSIONS + '?webRtcStats=true', {
                    headers: {
                        Authorization: this.basicAuth
                    },
                    validateStatus: (_) => true
                })
                .then((res) => {
                    if (res.status === 200) {
                        // Global changes
                        let globalChanges = false;
                        // Collection of sessionIds telling whether each one of them has changed or not
                        const sessionChanges: ObjMap<boolean> = {};

                        // 1. Array to store fetched sessionIds and later remove closed ones
                        const fetchedSessionIds: string[] = [];
                        res.data.content.forEach((jsonSession) => {
                            const fetchedSession: Session = new Session(this, jsonSession);
                            fetchedSession.connections.forEach((connection) => {
                                addWebRtcStatsToConnections(connection, jsonSession.connections.content);
                            });
                            fetchedSessionIds.push(fetchedSession.sessionId);
                            let storedSession = this.activeSessions.find((s) => s.sessionId === fetchedSession.sessionId);

                            if (!!storedSession) {
                                // 2. Update existing Session
                                let changed = !storedSession.equalTo(fetchedSession);
                                if (!changed) {
                                    // Check if server webrtc information has changed in any Publisher object (Session.equalTo does not check Publisher.webRtc auxiliary object)
                                    fetchedSession.connections.forEach((connection, index1) => {
                                        for (let index2 = 0; index2 < connection['publishers'].length && !changed; index2++) {
                                            changed =
                                                changed ||
                                                JSON.stringify(connection['publishers'][index2]['webRtc']) !==
                                                    JSON.stringify(storedSession.connections[index1]['publishers'][index2]['webRtc']);
                                        }
                                    });
                                }

                                storedSession.resetWithJson(jsonSession);
                                storedSession.connections.forEach((connection) => {
                                    addWebRtcStatsToConnections(connection, jsonSession.connections.content);
                                });
                                logger.log("Available session '" + storedSession.sessionId + "' info fetched. Any change: " + changed);
                                sessionChanges[storedSession.sessionId] = changed;
                                globalChanges = globalChanges || changed;
                            } else {
                                // 3. Add new Session
                                this.activeSessions.push(fetchedSession);
                                logger.log("New session '" + fetchedSession.sessionId + "' info fetched");
                                sessionChanges[fetchedSession.sessionId] = true;
                                globalChanges = true;
                            }
                        });

                        // 4. Remove closed sessions from local collection
                        for (var i = this.activeSessions.length - 1; i >= 0; --i) {
                            let sessionId = this.activeSessions[i].sessionId;
                            if (!fetchedSessionIds.includes(sessionId)) {
                                logger.log("Removing closed session '" + sessionId + "'");
                                sessionChanges[sessionId] = true;
                                globalChanges = true;
                                this.activeSessions.splice(i, 1);
                            }
                        }

                        logger.log('Active sessions info fetched: ', fetchedSessionIds);
                        resolve({ changes: globalChanges, sessionChanges });
                    } else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        this.handleError(res, reject);
                    }
                })
                .catch((error) => {
                    // Request error.
                    this.handleError(error, reject);
                });
        });
    }
    // tslint:enable:no-string-literal

    /**
     * Disable all logging except error level
     */
    enableProdMode(): void {
        logger.enableProdMode();
    }

    private getBasicAuth(secret: string): string {
        return 'Basic ' + this.Buffer('OPENVIDUAPP:' + secret).toString('base64');
    }

    private setHostnameAndPort(): void {
        let url: URL;
        try {
            url = new URL(this.hostname);
        } catch (error) {
            throw new Error('URL format incorrect: ' + error);
        }
        this.host = url.protocol + '//' + url.host;
    }

    /**
     * @hidden
     */
    handleError(error: AxiosError | HttpError, reject: (reason?: any) => void) {
        if (error.status) {
            // Error returned by openvidu-server
            reject(new Error(error.status.toString()));
        } else if (error.response) {
            // The request was made and the server responded with a status code (not 2xx)
            reject(new Error(error.response.status.toString()));
        } else if (error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            reject(new Error(error.request));
        } else {
            // Something happened in setting up the request that triggered an Error
            reject(new Error(error.message));
        }
    }
}
