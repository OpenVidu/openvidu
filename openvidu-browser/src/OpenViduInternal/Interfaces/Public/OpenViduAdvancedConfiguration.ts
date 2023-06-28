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

/**
 * See {@link OpenVidu.setAdvancedConfiguration}
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
     * Custom configuration for the {@link PublisherSpeakingEvent} feature and the [StreamManagerEvent.streamAudioVolumeChange](/en/stable/api/openvidu-browser/classes/StreamManagerEvent.html) feature. It is an object which includes the following optional properties:
     * - `interval`: (number) how frequently the analyser polls the audio stream to check if speaking has started/stopped or audio volume has changed. Default **100** (ms)
     * - `threshold`: (number) the volume at which _publisherStartSpeaking_ and _publisherStopSpeaking_ events will be fired. Default **-50** (dB)
     *
     * This sets the global default configuration that will affect all streams, but you can later customize these values for each specific stream by calling {@link StreamManager.updatePublisherSpeakingEventsOptions}
     */
    publisherSpeakingEventsOptions?: {
        interval?: number;
        threshold?: number;
    };

    /**
     * Determines the automatic reconnection process policy. Whenever the client's network drops, OpenVidu Browser starts a reconnection process with OpenVidu Server. After network is recovered, OpenVidu Browser automatically
     * inspects all of its media streams to see their status. For any of them that are broken, it asks OpenVidu Server for a forced and silent reconnection.
     *
     * This policy is technically enough to recover any broken media connection after a network drop, but in practice it has been proven that OpenVidu Browser may think a media connection has properly recovered when in fact it has not.
     * This is not a common case, but it may occur. This property allows **forcing OpenVidu Browser to reconnect all of its outgoing and incoming media streams** after a network drop regardless of their supposed status.
     *
     * Default to `false`.
     */
    forceMediaReconnectionAfterNetworkDrop?: boolean;

    /**
     * The milliseconds that must elapse after triggering {@link ExceptionEvent} of name [`ICE_CONNECTION_DISCONNECTED`](/en/stable/api/openvidu-browser/enums/ExceptionEventName.html#ICE_CONNECTION_DISCONNECTED) to perform an automatic reconnection process of the affected media stream.
     * This automatic reconnection process can only take place if the client still has network connection to OpenVidu Server. If the ICE connection has broken because of a total network drop,
     * then no reconnection process will be possible at all.
     *
     * Default to `4000`.
     */
    iceConnectionDisconnectedExceptionTimeout?: number;

    /**
     * The milliseconds that must elapse for the {@link ExceptionEvent} of name [`NO_STREAM_PLAYING_EVENT`](/en/stable/api/openvidu-browser/enums/ExceptionEventName.html#NO_STREAM_PLAYING_EVENT) to be fired.
     *
     * Default to `4000`.
     */
    noStreamPlayingEventExceptionTimeout?: number;
}
