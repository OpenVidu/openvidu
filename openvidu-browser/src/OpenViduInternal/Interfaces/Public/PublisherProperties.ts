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

import { Filter } from '../../../OpenVidu/Filter';
import { VideoInsertMode } from '../../Enums/VideoInsertMode';

/**
 * See [[OpenVidu.initPublisher]]
 */
export interface PublisherProperties {

    /**
     * Which device should provide the audio source. Can be:
     * - Property `deviceId` of a [[Device]]
     * - A MediaStreamTrack obtained from a MediaStream object with [[OpenVidu.getUserMedia]]
     * - `false` or null to have a video-only publisher
     * @default _Default microphone_
     */
    audioSource?: string | MediaStreamTrack | boolean;

    /**
     * Desired framerate of the video in frames per second.
     * Limiting the framerate has always effect on browsers Chrome and Opera. Firefox requires that the input device explicitly supports the desired framerate.
     * @default undefined
     */
    frameRate?: number;

    /**
     * How the video element of the publisher should be inserted in the DOM
     * @default VideoInsertMode.APPEND
     */
    insertMode?: VideoInsertMode | string;

    /**
     * Whether the publisher's video will be mirrored in the page or not. Only affects the local view of the publisher in the browser (remote streams will not be mirrored). If `videoSource` is set to "screen" this property is fixed to `false`
     * @default true
     */
    mirror?: boolean;

    /**
     * Whether to initially publish to the session with the audio unmuted or muted. Only makes sense if property `audioSource` is NOT set to *false* or *null*. You can change the audio state later during the session with [[Publisher.publishAudio]]
     * @default true
     */
    publishAudio?: boolean;

    /**
     * Whether to initially publish to the session with the video enabled or disabled. Only makes sense if property `videoSource` is NOT set to *false* or *null*. You can change the video state later during the session with [[Publisher.publishVideo]]
     * @default true
     */
    publishVideo?: boolean;

    /**
     * Resolution of the video: `"320x240"`, `"640x480"`, `"1280x720"` (low, medium and high quality respectively)
     * @default "640x480"
     */
    resolution?: string;

    /**
     * Which device should provide the video source. Can be:
     * - Property `deviceId` of a [[Device]]
     * - `"screen"` to screen-share. We provide a default screen-shraring extension for Chrome that can run in any domain, but you can customize it so it has your own icon, your own name, etc. Visit this
     * [GitHub repository](https://github.com/OpenVidu/openvidu-screen-sharing-chrome-extension/) to learn how. Once you have uploaded your own extension to Chrome Web Store,
     * simply call `OpenVidu.setAdvancedConfiguration({screenShareChromeExtension : "https://chrome.google.com/webstore/detail/YOUR_EXTENSION_NAME/YOUR_EXTENSION_ID"})` before calling `OpenVidu.initPublisher(targetElement, {videoSource: "screen"})`.
     * For Firefox `"screen"` string will ask for permissions to share the entire screen. To ask for a specific window or application, use `"window"` string instead (this only applies to Firefox).
     * - A MediaStreamTrack obtained from a MediaStream object with [[OpenVidu.getUserMedia]]
     * - `false` or null to have an audio-only publisher
     * @default _Default camera_
     */
    videoSource?: string | MediaStreamTrack | boolean;

    /**
     * **WARNING**: experimental option. This property may change in the near future
     *
     * Define a filter to apply in the Publisher's stream
     */
    filter?: Filter;

}