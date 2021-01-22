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

import { Event } from './Event';
import { Session } from '../../OpenVidu/Session';
import { OpenViduLogger } from '../Logger/OpenViduLogger';

/**
 * @hidden
 */
const logger: OpenViduLogger = OpenViduLogger.getInstance();


/**
 * Defines event `sessionDisconnected` dispatched by [[Session]] after the local user has left the session. This is the local version of the `connectionDestroyed` event, which is only dispatched by remote users
 */
export class SessionDisconnectedEvent extends Event {

    /**
     * - "disconnect": you have called `Session.disconnect()`
     * - "forceDisconnectByUser": you have been evicted from the Session by other user calling `Session.forceDisconnect()`
     * - "forceDisconnectByServer": you have been evicted from the Session by the application
     * - "sessionClosedByServer": the Session has been closed by the application
     * - "networkDisconnect": your network connection has dropped. Before a SessionDisconnectedEvent with this reason is triggered,
     *      Session object will always have previously dispatched a `reconnecting` event. If the reconnection process succeeds,
     *      Session object will dispatch a `reconnected` event. If it fails, Session object will dispatch a SessionDisconnectedEvent
     *      with reason "networkDisconnect"
     */
    reason: string;

    /**
     * @hidden
     */
    constructor(target: Session, reason: string) {
        super(true, target, 'sessionDisconnected');
        this.reason = reason;
    }

    /**
     * @hidden
     */
    callDefaultBehavior() {

        logger.info("Calling default behavior upon '" + this.type + "' event dispatched by 'Session'");

        const session = <Session>this.target;

        // Dispose and delete all remote Connections
        for (const connectionId in session.remoteConnections) {
            if (!!session.remoteConnections[connectionId].stream) {
                session.remoteConnections[connectionId].stream!.disposeWebRtcPeer();
                session.remoteConnections[connectionId].stream!.disposeMediaStream();
                if (session.remoteConnections[connectionId].stream!.streamManager) {
                    session.remoteConnections[connectionId].stream!.streamManager.removeAllVideos();
                }
                delete session.remoteStreamsCreated[session.remoteConnections[connectionId].stream!.streamId];
                session.remoteConnections[connectionId].dispose();
            }
            delete session.remoteConnections[connectionId];
        }
    }

}