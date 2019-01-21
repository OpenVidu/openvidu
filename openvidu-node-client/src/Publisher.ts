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


/**
 * See [[Connection.publishers]]
 *
 * This is a backend representation of a published media stream (see [OpenVidu Browser Stream class](/api/openvidu-browser/classes/stream.html))
 */
export class Publisher {

    /**
     * Unique identifier of the [Stream](/api/openvidu-browser/classes/stream.html) associated to this Publisher.
     * Each Publisher is paired with only one Stream, so you can identify each Publisher by its
     * [`Stream.streamId`](/api/openvidu-browser/classes/stream.html#streamid)
     */
    streamId: string;

    /**
     * Timestamp when this Publisher started publishing, in UTC milliseconds (ms since Jan 1, 1970, 00:00:00 UTC)
     */
    createdAt: number;

    /**
     * See properties of [Stream](/api/openvidu-browser/classes/stream.html) object in OpenVidu Browser library to find out more
     */
    hasAudio: boolean;

    /**
     * See properties of [Stream](/api/openvidu-browser/classes/stream.html) object in OpenVidu Browser library to find out more
     */
    hasVideo: boolean;

    /**
     * See properties of [Stream](/api/openvidu-browser/classes/stream.html) object in OpenVidu Browser library to find out more
     */
    audioActive: boolean;

    /**
     * See properties of [Stream](/api/openvidu-browser/classes/stream.html) object in OpenVidu Browser library to find out more
     */
    videoActive: boolean;

    /**
     * See properties of [Stream](/api/openvidu-browser/classes/stream.html) object in OpenVidu Browser library to find out more
     */
    frameRate: number;

    /**
     * See properties of [Stream](/api/openvidu-browser/classes/stream.html) object in OpenVidu Browser library to find out more
     */
    typeOfVideo: string;

    /**
     * See properties of [Stream](/api/openvidu-browser/classes/stream.html) object in OpenVidu Browser library to find out more
     */
    videoDimensions: string;

    /**
     * @hidden
     */
    constructor(json) {
        this.streamId = json.streamId;
        this.createdAt = json.createdAt;
        this.hasAudio = json.mediaOptions.hasAudio;
        this.hasVideo = json.mediaOptions.hasVideo;
        this.audioActive = json.mediaOptions.audioActive;
        this.videoActive = json.mediaOptions.videoActive;
        this.frameRate = json.mediaOptions.frameRate;
        this.typeOfVideo = json.mediaOptions.typeOfVideo;
        this.videoDimensions = json.mediaOptions.videoDimensions;
    }

    /**
     * @hidden
     */
    equalTo(other: Publisher): boolean {
        return (
            this.streamId === other.streamId &&
            this.createdAt === other.createdAt &&
            this.hasAudio === other.hasAudio &&
            this.hasVideo === other.hasVideo &&
            this.audioActive === other.audioActive &&
            this.videoActive === other.videoActive &&
            this.frameRate === other.frameRate &&
            this.typeOfVideo === other.typeOfVideo &&
            this.videoDimensions === other.videoDimensions
        );
    }

}