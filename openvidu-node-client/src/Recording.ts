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

import { RecordingProperties } from './RecordingProperties';
import { RecordingLayout } from './RecordingLayout';

/**
 * See {@link OpenVidu.startRecording}
 */
export class Recording {
    /**
     * Recording unique identifier
     */
    id: string;

    /**
     * Session associated to the recording
     */
    sessionId: string;

    /**
     * Time when the recording started in UTC milliseconds
     */
    createdAt: number;

    /**
     * Size of the recording in bytes (0 until the recording is stopped)
     */
    size = 0;

    /**
     * Duration of the recording in seconds (0 until the recording is stopped)
     */
    duration = 0;

    /**
     * URL of the recording. You can access the file from there. It is `null` until recording reaches "ready" or "failed" status. If OpenVidu Server configuration property `OPENVIDU_RECORDING_PUBLIC_ACCESS` is false, this path will be secured with OpenVidu credentials
     */
    url: string;

    /**
     * Status of the recording
     */
    status: Recording.Status;

    /**
     * Technical properties of the recorded file
     */
    properties: RecordingProperties;

    /* tslint:disable:no-string-literal */
    /**
     * @hidden
     */
    constructor(json: JSON) {
        this.id = json['id'];
        this.sessionId = json['sessionId'];
        this.createdAt = json['createdAt'];
        this.size = json['size'];
        this.duration = json['duration'];
        this.url = json['url'];
        this.status = json['status'];
        this.properties = {
            name: json['name'] != null ? json['name'] : this.id,
            hasAudio: json['hasAudio'] != null ? !!json['hasAudio'] : Recording.DefaultRecordingPropertiesValues.hasAudio,
            hasVideo: json['hasVideo'] != null ? !!json['hasVideo'] : Recording.DefaultRecordingPropertiesValues.hasVideo,
            outputMode: json['outputMode'] != null ? json['outputMode'] : Recording.DefaultRecordingPropertiesValues.outputMode,
            mediaNode: json['mediaNode']
        };
        if (
            (this.properties.outputMode.toString() === Recording.OutputMode[Recording.OutputMode.COMPOSED] ||
                this.properties.outputMode.toString() === Recording.OutputMode[Recording.OutputMode.COMPOSED_QUICK_START]) &&
            this.properties.hasVideo
        ) {
            this.properties.recordingLayout =
                json['recordingLayout'] != null ? json['recordingLayout'] : Recording.DefaultRecordingPropertiesValues.recordingLayout;
            this.properties.resolution =
                json['resolution'] != null ? json['resolution'] : Recording.DefaultRecordingPropertiesValues.resolution;
            this.properties.frameRate =
                json['frameRate'] != null ? Number(json['frameRate']) : Recording.DefaultRecordingPropertiesValues.frameRate;
            this.properties.shmSize =
                json['shmSize'] != null ? Number(json['shmSize']) : Recording.DefaultRecordingPropertiesValues.shmSize;
            if (this.properties.recordingLayout.toString() === RecordingLayout[RecordingLayout.CUSTOM]) {
                this.properties.customLayout = json['customLayout'] != null ? json['customLayout'] : '';
            }
        }
        if (this.properties.outputMode.toString() === Recording.OutputMode[Recording.OutputMode.INDIVIDUAL]) {
            this.properties.ignoreFailedStreams =
                json['ignoreFailedStreams'] != null
                    ? !!json['ignoreFailedStreams']
                    : Recording.DefaultRecordingPropertiesValues.ignoreFailedStreams;
        }
    }
    /* tslint:enable:no-string-literal */
}

export namespace Recording {
    /**
     * See {@link Recording.status}
     */
    export enum Status {
        /**
         * The recording is starting (cannot be stopped). Some recording may not go
         * through this status and directly reach "started" status
         */
        starting = 'starting',

        /**
         * The recording has started and is going on
         */
        started = 'started',

        /**
         * The recording has stopped and is being processed. At some point it will reach
         * "ready" status
         */
        stopped = 'stopped',

        /**
         * The recording has finished being processed and is available for download through
         * property {@link Recording.url}
         */
        ready = 'ready',

        /**
         * The recording has failed. This status may be reached from "starting",
         * "started" and "stopped" status
         */
        failed = 'failed'
    }

    /**
     * See {@link RecordingProperties.outputMode}
     */
    export enum OutputMode {
        /**
         * Record all streams in a grid layout in a single archive
         */
        COMPOSED = 'COMPOSED',

        /**
         * Works the same way as COMPOSED mode, but the necessary recorder
         * service module will start some time in advance and won't be terminated
         * once a specific session recording has ended. This module will remain
         * up and running as long as the session remains active.
         *
         * - **Pros vs COMPOSED**: the process of starting the recording will be noticeably
         * faster. This can be very useful in use cases where a session needs to be
         * recorded multiple times over time, when a better response time is usually
         * desirable.

         * - **Cons vs COMPOSED**: for every session initialized with COMPOSED_QUICK_START
         * recording output mode, extra CPU power will be required in OpenVidu Server.
         * The recording module will be continuously rendering all of the streams being
         * published to the session even when the session is not being recorded. And that
         * is for every session configured with COMPOSED_QUICK_START.
         */
        COMPOSED_QUICK_START = 'COMPOSED_QUICK_START',

        /**
         * Record each stream individually
         */
        INDIVIDUAL = 'INDIVIDUAL'
    }

    /**
     * @hidden
     */
    export class DefaultRecordingPropertiesValues {
        static readonly hasAudio: boolean = true;
        static readonly hasVideo: boolean = true;
        static readonly outputMode: Recording.OutputMode = Recording.OutputMode.COMPOSED;
        static readonly recordingLayout: RecordingLayout = RecordingLayout.BEST_FIT;
        static readonly resolution: string = '1280x720';
        static readonly frameRate: number = 25;
        static readonly shmSize: number = 536870912;
        static readonly ignoreFailedStreams: boolean = false;
    }
}
