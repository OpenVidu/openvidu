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
 * See [[OpenVidu.setAdvancedConfiguration]]
 */
export interface OpenViduAdvancedConfiguration {

    /**
     * Array of [RTCIceServer](https://developer.mozilla.org/en-US/docs/Web/API/RTCIceServer) to be used by OpenVidu Browser. By default OpenVidu will generate the required credentials to use the COTURN server hosted along OpenVidu Server
     * You can also set this property to string 'freeice' to force the use of free STUN servers instead (got thanks to [freeice](https://github.com/DamonOehlman/freeice) library).
     */
    iceServers?: RTCIceServer[] | string;

    /**
     * URL to a custom screen share extension for Chrome (always based on ours: [openvidu-screen-sharing-chrome-extension](https://github.com/OpenVidu/openvidu-screen-sharing-chrome-extension)) to be used instead of the default one.
     * Must be something like this: `https://chrome.google.com/webstore/detail/YOUR_WEBSTORE_EXTENSION_NAME/YOUR_EXTENSION_ID`
     */
    screenShareChromeExtension?: string;

    /**
     * Custom configuration for the [[PublisherSpeakingEvent]] feature. It is an object which includes the following optional properties:
     * - `interval`: (number) how frequently the analyser polls the audio stream to check if speaking has started or stopped. Default **50** (ms)
     * - `threshold`: (number) the volume at which _publisherStartSpeaking_ and _publisherStopSpeaking_ events will be fired. Default **-50** (dB)
     */
    publisherSpeakingEventsOptions?: any;

}
