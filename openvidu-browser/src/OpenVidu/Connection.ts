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

import { Session } from './Session';
import { Stream } from './Stream';
import { LocalConnectionOptions } from '../OpenViduInternal/Interfaces/Private/LocalConnectionOptions';
import { RemoteConnectionOptions } from '../OpenViduInternal/Interfaces/Private/RemoteConnectionOptions';
import { InboundStreamOptions } from '../OpenViduInternal/Interfaces/Private/InboundStreamOptions';
import { StreamOptionsServer } from '../OpenViduInternal/Interfaces/Private/StreamOptionsServer';
import { OpenViduLogger } from '../OpenViduInternal/Logger/OpenViduLogger';
import { ExceptionEvent, ExceptionEventName } from '../OpenViduInternal/Events/ExceptionEvent';

/**
 * @hidden
 */
const logger: OpenViduLogger = OpenViduLogger.getInstance();

/**
 * Represents each one of the user's connection to the session (the local one and other user's connections).
 * Therefore each {@link Session} and {@link Stream} object has an attribute of type Connection
 */
export class Connection {
    /**
     * Unique identifier of the connection
     */
    connectionId: string;

    /**
     * Time when this connection was created in OpenVidu Server (UTC milliseconds)
     */
    creationTime: number;

    /**
     * Data associated to this connection (and therefore to certain user). This is an important field:
     * it allows you to broadcast all the information you want for each user (a username, for example)
     */
    data: string;

    /**
     * Role of the connection.
     * - `SUBSCRIBER`: can subscribe to published Streams of other users by calling {@link Session.subscribe}
     * - `PUBLISHER`: SUBSCRIBER permissions + can publish their own Streams by calling {@link Session.publish}
     * - `MODERATOR`: SUBSCRIBER + PUBLISHER permissions + can force the unpublishing or disconnection over a third-party Stream or Connection by call {@link Session.forceUnpublish} and {@link Session.forceDisconnect}
     *
     * **Only defined for the local connection. In remote connections will be `undefined`**
     */
    role: string;

    /**
     * Whether the streams published by this Connection will be recorded or not. This only affects [INDIVIDUAL recording](/en/stable/advanced-features/recording/#individual-recording-selection) <a href="https://docs.openvidu.io/en/stable/openvidu-pro/" style="display: inline-block; background-color: rgb(0, 136, 170); color: white; font-weight: bold; padding: 0px 5px; margin-right: 5px; border-radius: 3px; font-size: 13px; line-height:21px; font-family: Montserrat, sans-serif">PRO</a>
     *
     * **Only defined for the local connection. In remote connections will be `undefined`**
     */
    record: boolean;

    /**
     * @hidden
     */
    stream?: Stream;

    /**
     * @hidden
     */
    localOptions: LocalConnectionOptions | undefined;

    /**
     * @hidden
     */
    remoteOptions: RemoteConnectionOptions | undefined;

    /**
     * @hidden
     */
    disposed = false;

    /**
     * @hidden
     */
    rpcSessionId: string;

    /**
     * @hidden
     */
    constructor(private session: Session, connectionOptions: LocalConnectionOptions | RemoteConnectionOptions) {
        let msg = "'Connection' created ";
        if (!!(<LocalConnectionOptions>connectionOptions).role) {
            // Connection is local
            this.localOptions = <LocalConnectionOptions>connectionOptions;
            this.connectionId = this.localOptions.id;
            this.creationTime = this.localOptions.createdAt;
            this.data = this.localOptions.metadata;
            this.rpcSessionId = this.localOptions.sessionId;
            this.role = this.localOptions.role;
            this.record = this.localOptions.record;
            msg += '(local)';
        } else {
            // Connection is remote
            this.remoteOptions = <RemoteConnectionOptions>connectionOptions;
            this.connectionId = this.remoteOptions.id;
            this.creationTime = this.remoteOptions.createdAt;
            if (this.remoteOptions.metadata) {
                this.data = this.remoteOptions.metadata;
            }
            if (this.remoteOptions.streams) {
                this.initRemoteStreams(this.remoteOptions.streams);
            }
            msg += "(remote) with 'connectionId' [" + this.remoteOptions.id + ']';
        }
        logger.info(msg);
    }

    /* Hidden methods */

    /**
     * @hidden
     */
    sendIceCandidate(candidate: RTCIceCandidate): void {

        if (!this.disposed) {
            logger.debug((!!this.stream!.outboundStreamOpts ? 'Local' : 'Remote') + 'candidate for' + this.connectionId, candidate);

            this.session.openvidu.sendRequest(
                'onIceCandidate',
                {
                    endpointName: this.connectionId,
                    candidate: candidate.candidate,
                    sdpMid: candidate.sdpMid,
                    sdpMLineIndex: candidate.sdpMLineIndex
                },
                (error, response) => {
                    if (error) {
                        logger.error('Error sending ICE candidate: ' + JSON.stringify(error));
                        this.session.emitEvent('exception', [
                            new ExceptionEvent(
                                this.session,
                                ExceptionEventName.ICE_CANDIDATE_ERROR,
                                this.session,
                                'There was an unexpected error on the server-side processing an ICE candidate generated and sent by the client-side',
                                error
                            )
                        ]);
                    }
                }
            );
        } else {
            logger.warn(`Connection ${this.connectionId} disposed when trying to send an ICE candidate. ICE candidate not sent`);
        }
    }

    /**
     * @hidden
     */
    initRemoteStreams(options: StreamOptionsServer[]): void {
        // This is ready for supporting multiple streams per Connection object. Right now the loop will always run just once
        // this.stream should also be replaced by a collection of streams to support multiple streams per Connection
        options.forEach((opts) => {
            const streamOptions: InboundStreamOptions = {
                id: opts.id,
                createdAt: opts.createdAt,
                connection: this,
                hasAudio: opts.hasAudio,
                hasVideo: opts.hasVideo,
                audioActive: opts.audioActive,
                videoActive: opts.videoActive,
                typeOfVideo: opts.typeOfVideo,
                frameRate: opts.frameRate,
                videoDimensions: !!opts.videoDimensions ? JSON.parse(opts.videoDimensions) : undefined,
                filter: !!opts.filter ? opts.filter : undefined
            };
            const stream = new Stream(this.session, streamOptions);

            this.addStream(stream);
        });

        logger.info(
            "Remote 'Connection' with 'connectionId' [" + this.connectionId + '] is now configured for receiving Streams with options: ',
            this.stream!.inboundStreamOpts
        );
    }

    /**
     * @hidden
     */
    addStream(stream: Stream): void {
        stream.connection = this;
        this.stream = stream;
    }

    /**
     * @hidden
     */
    removeStream(): void {
        delete this.stream;
    }

    /**
     * @hidden
     */
    dispose(): void {
        this.disposed = true;
        this.removeStream();
    }
}
