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

import { Session } from './Session';
import { Stream } from './Stream';
import { ConnectionOptions } from '../OpenViduInternal/Interfaces/Private/ConnectionOptions';
import { InboundStreamOptions } from '../OpenViduInternal/Interfaces/Private/InboundStreamOptions';
import { StreamOptionsServer } from '../OpenViduInternal/Interfaces/Private/StreamOptionsServer';


/**
 * Represents each one of the user's connection to the session (the local one and other user's connections).
 * Therefore each [[Session]] and [[Stream]] object has an attribute of type Connection
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
     * @hidden
     */
    stream: Stream;

    /**
     * @hidden
     */
    options: ConnectionOptions | undefined;

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
    constructor(private session: Session, opts?: ConnectionOptions) {
        let msg = "'Connection' created ";
        if (!!opts) {
            // Connection is remote
            msg += "(remote) with 'connectionId' [" + opts.id + ']';
            this.options = opts;
            this.connectionId = opts.id;
            this.creationTime = opts.createdAt;
            if (opts.metadata) {
                this.data = opts.metadata;
            }
            if (opts.streams) {
                this.initRemoteStreams(opts.streams);
            }
        } else {
            // Connection is local
            msg += '(local)';
        }
        console.info(msg);
    }


    /* Hidden methods */

    /**
     * @hidden
     */
    sendIceCandidate(candidate: RTCIceCandidate): void {

        console.debug((!!this.stream.outboundStreamOpts ? 'Local' : 'Remote') + 'candidate for' +
            this.connectionId, candidate);

        this.session.openvidu.sendRequest('onIceCandidate', {
            endpointName: this.connectionId,
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex
        }, (error, response) => {
            if (error) {
                console.error('Error sending ICE candidate: '
                    + JSON.stringify(error));
            }
        });
    }

    /**
     * @hidden
     */
    initRemoteStreams(options: StreamOptionsServer[]): void {

        // This is ready for supporting multiple streams per Connection object. Right now the loop will always run just once
        // this.stream should also be replaced by a collection of streams to support multiple streams per Connection
        options.forEach(opts => {
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

        console.info("Remote 'Connection' with 'connectionId' [" + this.connectionId + '] is now configured for receiving Streams with options: ', this.stream.inboundStreamOpts);
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
    removeStream(streamId: string): void {
        delete this.stream;
    }

    /**
     * @hidden
     */
    dispose(): void {
        if (!!this.stream) {
            delete this.stream;
        }
        this.disposed = true;
    }

}