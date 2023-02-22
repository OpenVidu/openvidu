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

import { Recording } from './Recording';
import { RecordingLayout } from './RecordingLayout';

/**
 * See {@link OpenVidu.startRecording}
 */
export interface RecordingProperties {
    /**
     * Name of the Recording. The video file will be named after this property.
     * You can access this same value in your clients on recording events
     * (`recordingStarted`, `recordingStopped`)
     */
    name?: string;

    /**
     * Whether or not to record audio. Cannot be set to false at the same time as {@link RecordingProperties.hasVideo}
     *
     * Default to true
     */
    hasAudio?: boolean;

    /**
     * Whether or not to record video. Cannot be set to false at the same time as {@link RecordingProperties.hasAudio}
     *
     * Default to true
     */
    hasVideo?: boolean;

    /**
     * The mode of recording: COMPOSED for a single archive in a grid layout or INDIVIDUAL for one archive for each stream
     *
     * Default to {@link Recording.OutputMode.COMPOSED}
     */
    outputMode?: Recording.OutputMode;

    /**
     * The layout to be used in the recording.<br>
     * Will only have effect if {@link RecordingProperties.outputMode} is set to {@link Recording.OutputMode.COMPOSED} or {@link Recording.OutputMode.COMPOSED_QUICK_START}
     *
     * Default to {@link RecordingLayout.BEST_FIT}
     */
    recordingLayout?: RecordingLayout;

    /**
     * Recording video file resolution. Must be a string with format "WIDTHxHEIGHT",
     * being both WIDTH and HEIGHT the number of pixels between 100 and 1999.<br>
     * Will only have effect if {@link RecordingProperties.outputMode} is set to {@link Recording.OutputMode.COMPOSED} or {@link Recording.OutputMode.COMPOSED_QUICK_START}
     * and {@link RecordingProperties.hasVideo} is set to true. For {@link Recording.OutputMode.INDIVIDUAL} all individual video files will have the native resolution of the published stream.
     *
     * Default to "1280x720"
     */
    resolution?: string;

    /**
     * Recording video file frame rate.<br>
     * Will only have effect if {@link RecordingProperties.outputMode} is set to {@link Recording.OutputMode.COMPOSED} or {@link Recording.OutputMode.COMPOSED_QUICK_START}
     * and {@link RecordingProperties.hasVideo} is set to true. For {@link Recording.OutputMode.INDIVIDUAL} all individual video files will have the native frame rate of the published stream.
     *
     * Default to 25
     */
    frameRate?: number;

    /**
     * The amount of shared memory reserved for the recording process in bytes.
     * Will only have effect if {@link RecordingProperties.outputMode} is set to {@link Recording.OutputMode.COMPOSED} or {@link Recording.OutputMode.COMPOSED_QUICK_START}
     * and {@link RecordingProperties.hasVideo} is set to true. Property ignored for INDIVIDUAL recordings and audio-only recordings.
     * Minimum 134217728 (128MB).
     *
     * Default to 536870912 (512 MB)
     */
    shmSize?: number;

    /**
     * The relative path to the specific custom layout you want to use.<br>
     * Will only have effect if {@link RecordingProperties.outputMode} is set to {@link Recording.OutputMode.COMPOSED} or {@link Recording.OutputMode.COMPOSED_QUICK_START}
     * and {@link RecordingProperties.recordingLayout} is set to {@link RecordingLayout.CUSTOM}<br>
     * See [Custom recording layouts](/en/stable/advanced-features/recording#custom-recording-layouts) to learn more.
     */
    customLayout?: string;

    /**
     * Whether to ignore failed streams or not when starting the recording. This property only applies if {@link RecordingProperties.outputMode} is set to {@link Recording.OutputMode.INDIVIDUAL}.
     * For this type of recordings, when calling {@link OpenVidu.startRecording} by default all the streams available at the moment the recording process starts must be healthy
     * and properly sending media. If some stream that should be sending media is broken, then the recording process fails after a 10s timeout. In this way your application is notified
     * that some stream is not being recorded, so it can retry the process again.
     *
     * But you can disable this rollback behavior and simply ignore any failed stream, which will be susceptible to be recorded in the future if media starts flowing as expected at any point.
     * The downside of this behavior is that you will have no guarantee that all streams present at the beginning of a recording are actually being recorded.
     *
     * Default to false
     */
    ignoreFailedStreams?: boolean;

    /**
     * **This feature is part of OpenVidu
     * <a href="https://docs.openvidu.io/en/2.23.0/openvidu-pro/" style="display: inline-block; background-color: rgb(0, 136, 170); color: white; font-weight: bold; padding: 0px 5px; margin: 0 2px 0 2px; border-radius: 3px; font-size: 13px; line-height:21px; text-decoration: none; font-family: Montserrat, sans-serif">PRO</a>
     * and
     * <a href="https://docs.openvidu.io/en/2.23.0/openvidu-enterprise/" style="display: inline-block; background-color: rgb(156, 39, 176); color: white; font-weight: bold; padding: 0px 5px; margin: 0 2px 0 2px; border-radius: 3px; font-size: 13px; line-height:21px; text-decoration: none; font-family: Montserrat, sans-serif">ENTERPRISE</a>
     * editions**
     *
     * The Media Node where to host the recording. The default option if this property is not defined is the same
     * Media Node hosting the Session to record. This object defines the following properties as Media Node selector:
     * - `id`: Media Node unique identifier
     */
    mediaNode?: {
        id: string;
    };
}
