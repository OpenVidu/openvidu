/*
 * (C) Copyright 2017-2018 OpenVidu (https://openvidu.io/)
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

import { RecordingLayout } from './RecordingLayout';

/**
 * See [[OpenVidu.startRecording]]
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
     * URL of the recording. You can access the file from there. It is `null` until recording is stopped or if OpenVidu Server configuration property `openvidu.recording.public-access` is false
     */
    url: string;

    /**
     * `true` if the recording has an audio track, `false` otherwise (currently fixed to true)
     */
    hasAudio = true;

    /**
     * `true` if the recording has a video track, `false` otherwise (currently fixed to true)
     */
    hasVideo = true;

    /**
     * Status of the recording
     */
    status: Recording.Status;

    /**
     * Name of the Recording. The video file will be named after this property.
     * You can access this same value in your clients on recording events
     * (`recordingStarted`, `recordingStopped`)
     */
    name: string;

    /**
     * The layout used in this Recording
     */
    recordingLayout: RecordingLayout;

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
        this.hasAudio = json['hasAudio'];
        this.hasVideo = json['hasVideo'];
        this.status = json['status'];
        this.name = json['name'];
        this.recordingLayout = json['recordingLayout'];
    }
    /* tslint:enable:no-string-literal */
}

export namespace Recording {

    /**
     * See [[Recording.status]]
     */
    export enum Status {

        /**
         * The recording is starting (cannot be stopped)
         */
        starting,

        /**
         * The recording has started and is going on
         */
        started,

        /**
         * The recording has finished OK
         */
        stopped,

        /**
         * The recording is available for downloading. This status is reached for all
         * stopped recordings if [OpenVidu Server configuration](https://openvidu.io/docs/reference-docs/openvidu-server-params/)
         * property `openvidu.recording.public-access` is true
         */
        available,

        /**
         * The recording has failed
         */
        failed
    }
}