/*
 * (C) Copyright 2017-2018 OpenVidu (http://openvidu.io/)
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
import { Session, Stream, Publisher } from '../..';


/**
 * Defines the following events:
 * - `streamCreated`: dispatched by [[Session]] and [[Publisher]]
 * - `streamDestroyed`: dispatched by [[Session]] and [[Publisher]]
 */
export class StreamEvent extends Event {

    /**
     * Stream object that was created or destroyed
     */
    stream: Stream;

    /**
     * For 'streamDestroyed' event:
     * - "disconnect"
     * - "networkDisconnect"
     * - "unpublish"
     *
     * For 'streamCreated' empty string
     */
    reason: string;

    /**
     * @hidden
     */
    constructor(cancelable: boolean, target: Session | Publisher, type: string, stream: Stream, reason: string) {
        super(cancelable, target, type);
        this.stream = stream;
        this.reason = reason;
    }

    /**
     * @hidden
     */
    callDefaultBehaviour() {
        if (this.type === 'streamDestroyed') {

            if (this.target instanceof Session) {

                console.info("Calling default behaviour upon '" + this.type + "' event dispatched by 'Session'");

                // Remote Stream
                this.stream.disposeWebRtcPeer();
                this.stream.disposeMediaStream();
                this.stream.removeVideo();

            } else if (this.target instanceof Publisher) {

                console.info("Calling default behaviour upon '" + this.type + "' event dispatched by 'Publisher'");

                // Local Stream
                this.stream.disposeMediaStream();
                this.stream.removeVideo();
                this.stream.isReadyToPublish = false;
            }

            // Delete stream from Session.remoteStreamsCreated map
            delete this.stream.session.remoteStreamsCreated[this.stream.streamId];

            // Delete StreamOptionsServer from remote Connection
            const remoteConnection = this.stream.session.remoteConnections[this.stream.connection.connectionId];
            if (!!remoteConnection && !!remoteConnection.options) {
                const streamOptionsServer = remoteConnection.options.streams;
                for (let i = streamOptionsServer.length - 1; i >= 0; --i) {
                    if (streamOptionsServer[i].id === this.stream.streamId) {
                        streamOptionsServer.splice(i, 1);
                    }
                }
            }

        }
    }

}