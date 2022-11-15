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

import { Event } from './Event';
import { Publisher } from '../../OpenVidu/Publisher';
import { Session } from '../../OpenVidu/Session';
import { Stream } from '../../OpenVidu/Stream';
import { OpenViduLogger } from '../Logger/OpenViduLogger';
import { StreamEventReason } from './Types/Types';

/**
 * @hidden
 */
const logger: OpenViduLogger = OpenViduLogger.getInstance();

/**
 * Triggered by:
 * - `streamCreated` (available for [Session](/en/stable/api/openvidu-browser/interfaces/SessionEventMap.html#streamCreated) and [Publisher](/en/stable/api/openvidu-browser/interfaces/PublisherEventMap.html#streamCreated) objects)
 * - `streamDestroyed` (available for [Session](/en/stable/api/openvidu-browser/interfaces/SessionEventMap.html#streamDestroyed) and [Publisher](/en/stable/api/openvidu-browser/interfaces/PublisherEventMap.html#streamDestroyed) objects)
 */
export class StreamEvent extends Event {
    /**
     * Stream object that was created or destroyed
     */
    stream: Stream;

    /**
     * For 'streamDestroyed' event:
     * - "unpublish": method `Session.unpublish()` has been called
     * - "disconnect": method `Session.disconnect()` has been called
     * - "forceUnpublishByUser": some user has called `Session.forceUnpublish()` over the Stream
     * - "forceDisconnectByUser": some user has called `Session.forceDisconnect()` over the Stream
     * - "forceUnpublishByServer": the user's stream has been unpublished from the Session by the application
     * - "forceDisconnectByServer": the user has been evicted from the Session by the application
     * - "sessionClosedByServer": the Session has been closed by the application
     * - "networkDisconnect": the user's network connection has dropped
     * - "nodeCrashed": a node has crashed in the server side
     *
     * For 'streamCreated' empty string
     */
    reason: StreamEventReason;

    /**
     * @hidden
     */
    constructor(cancelable: boolean, target: Session | Publisher, type: string, stream: Stream, reason: StreamEventReason) {
        super(cancelable, target, type);
        this.stream = stream;
        this.reason = reason;
    }

    /**
     * @hidden
     */
    callDefaultBehavior() {
        if (this.type === 'streamDestroyed') {
            if (this.target instanceof Session) {
                // Remote Stream
                logger.info("Calling default behavior upon '" + this.type + "' event dispatched by 'Session'");
                this.stream.disposeWebRtcPeer();
            } else if (this.target instanceof Publisher) {
                // Local Stream
                logger.info("Calling default behavior upon '" + this.type + "' event dispatched by 'Publisher'");
                clearInterval((<Publisher>this.target).screenShareResizeInterval);
                this.stream.isLocalStreamReadyToPublish = false;

                // Delete Publisher object from OpenVidu publishers array
                const openviduPublishers = (<Publisher>this.target).openvidu.publishers;
                for (let i = 0; i < openviduPublishers.length; i++) {
                    if (openviduPublishers[i] === <Publisher>this.target) {
                        openviduPublishers.splice(i, 1);
                        break;
                    }
                }
            }

            // Dispose the MediaStream local object
            this.stream.disposeMediaStream();

            // Remove from DOM all video elements associated to this Stream, if there's a StreamManager defined
            // (method Session.subscribe must have been called)
            if (this.stream.streamManager) this.stream.streamManager.removeAllVideos();

            // Delete stream from Session.remoteStreamsCreated map
            this.stream.session.remoteStreamsCreated.delete(this.stream.streamId);

            // Delete StreamOptionsServer from remote Connection
            const remoteConnection = this.stream.session.remoteConnections.get(this.stream.connection.connectionId);
            if (!!remoteConnection && !!remoteConnection.remoteOptions) {
                const streamOptionsServer = remoteConnection.remoteOptions.streams;
                for (let i = streamOptionsServer.length - 1; i >= 0; --i) {
                    if (streamOptionsServer[i].id === this.stream.streamId) {
                        streamOptionsServer.splice(i, 1);
                    }
                }
            }
        }
    }
}
