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
export interface RecordingProperties {

    /**
     * The name you want to give to the video file. You can access this same value in your clients on recording events (`recordingStarted`, `recordingStopped`).
     * **WARNING: this parameter follows an overwriting policy.** If you name two recordings the same, the newest MP4 file will overwrite the oldest one
     */
    name?: string;

    /**
     * The layout to be used in the recording
     */
    recordingLayout?: RecordingLayout;

    /**
     * If [[recordingLayout]] is `CUSTOM`, the relative path to the specific custom layout you want to use.
     * See [Custom recording layouts](https://openvidu.io/docs/advanced-features/recording#custom-recording-layouts) to learn more
     */
    customLayout?: string;
}