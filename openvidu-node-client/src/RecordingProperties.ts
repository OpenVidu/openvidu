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

import { Recording } from './Recording';
import { RecordingLayout } from './RecordingLayout';

/**
 * See [[OpenVidu.startRecording]]
 */
export interface RecordingProperties {

    /**
     * Name of the Recording. The video file will be named after this property.
     * You can access this same value in your clients on recording events
     * (`recordingStarted`, `recordingStopped`)
     */
    name?: string;

    /**
     * The mode of recording: COMPOSED for a single archive in a grid layout or INDIVIDUAL for one archive for each stream
     */
    outputMode?: Recording.OutputMode;

    /**
     * The layout to be used in the recording.<br>
     * Will only have effect if [[RecordingProperties.outputMode]] is `COMPOSED` or `COMPOSED_QUICK_START`
     */
    recordingLayout?: RecordingLayout;

    /**
     * The relative path to the specific custom layout you want to use.<br>
     * Will only have effect if [[RecordingProperties.outputMode]] is `COMPOSED` (or `COMPOSED_QUICK_START`) and [[RecordingProperties.recordingLayout]] is `CUSTOM`<br>
     * See [Custom recording layouts](/en/stable/advanced-features/recording#custom-recording-layouts) to learn more
     */
    customLayout?: string;

    /**
     * Recording video file resolution. Must be a string with format "WIDTHxHEIGHT",
     * being both WIDTH and HEIGHT the number of pixels between 100 and 1999.<br>
     * Will only have effect if [[RecordingProperties.outputMode]]
     * is set to [[Recording.OutputMode.COMPOSED]] or [[Recording.OutputMode.COMPOSED_QUICK_START]].
     * For [[Recording.OutputMode.INDIVIDUAL]] all
     * individual video files will have the native resolution of the published stream
     */
    resolution?: string;

    /**
     * Whether or not to record audio. Cannot be set to false at the same time as [[RecordingProperties.hasVideo]]
     */
    hasAudio?: boolean;

    /**
     * Whether or not to record video. Cannot be set to false at the same time as [[RecordingProperties.hasAudio]]
     */
    hasVideo?: boolean;

    /**
     * If COMPOSED recording, the amount of shared memory reserved for the recording process in bytes.
     * Minimum 134217728 (128MB). Property ignored if INDIVIDUAL recording. Default to 536870912 (512 MB)
     */
    shmSize?: number;

    /**
     * **This feature is part of OpenVidu Pro tier** <a href="https://docs.openvidu.io/en/stable/openvidu-pro/" target="_blank" style="display: inline-block; background-color: rgb(0, 136, 170); color: white; font-weight: bold; padding: 0px 5px; margin-right: 5px; border-radius: 3px; font-size: 13px; line-height:21px; font-family: Montserrat, sans-serif">PRO</a> 
     * 
     * The Media Node where to host the recording. The default option if this property is not defined is the same
     * Media Node hosting the Session to record. This object defines the following properties as Media Node selector:
     * - `id`: Media Node unique identifier
     */
    mediaNode?: {
        id: string;
    }

}