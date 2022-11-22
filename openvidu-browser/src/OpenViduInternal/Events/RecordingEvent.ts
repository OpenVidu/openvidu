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
import { Session } from '../../OpenVidu/Session';
import { RecordingEventReason } from './Types/Types';

/**
 * Triggered by:
 * - {@link SessionEventMap.recordingStarted}
 * - {@link SessionEventMap.recordingStopped}
 */
export class RecordingEvent extends Event {
    /**
     * The recording ID generated in openvidu-server
     */
    id: string;

    /**
     * The recording name you supplied to openvidu-server. For example, to name your recording file MY_RECORDING:
     * - With **API REST**: POST to `/api/recordings/start` passing JSON body `{"session":"sessionId","name":"MY_RECORDING"}`
     * - With **openvidu-java-client**: `OpenVidu.startRecording(sessionId, "MY_RECORDING")` or `OpenVidu.startRecording(sessionId, new RecordingProperties.Builder().name("MY_RECORDING").build())`
     * - With **openvidu-node-client**: `OpenVidu.startRecording(sessionId, "MY_RECORDING")` or `OpenVidu.startRecording(sessionId, {name: "MY_RECORDING"})`
     *
     * If no name is supplied, this property will be undefined and the recorded file will be named after property {@link id}
     */
    name?: string;

    /**
     * For 'recordingStopped' event:
     * - "recordingStoppedByServer": the recording has been gracefully stopped by the application
     * - "sessionClosedByServer": the Session has been closed by the application
     * - "automaticStop": see [Automatic stop of recordings](/en/stable/advanced-features/recording/#automatic-stop-of-recordings)
     * - "nodeCrashed": a node has crashed in the server side
     *
     * For 'recordingStarted' empty string
     */
    reason?: RecordingEventReason;

    /**
     * @hidden
     */
    constructor(target: Session, type: string, id: string, name: string, reason?: RecordingEventReason) {
        super(false, target, type);
        this.id = id;
        if (name !== id) {
            this.name = name;
        }
        this.reason = reason;
    }

    /**
     * @hidden
     */
    // tslint:disable-next-line:no-empty
    callDefaultBehavior() { }
}
