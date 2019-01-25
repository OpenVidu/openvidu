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
 * Defines property [[OpenViduError.name]]
 */
export enum OpenViduErrorName {

    /**
     * Browser is not supported by OpenVidu.
     * Returned upon unsuccessful [[Session.connect]]
     */
    BROWSER_NOT_SUPPORTED = 'BROWSER_NOT_SUPPORTED',

    /**
     * The user hasn't granted permissions to the required input device when the browser asked for them.
     * Returned upon unsuccessful [[OpenVidu.initPublisher]] or [[OpenVidu.getUserMedia]]
     */
    DEVICE_ACCESS_DENIED = 'DEVICE_ACCESS_DENIED',

    /**
     * The required input device is probably being used by other process when the browser asked for it.
     * Accuracy of this property is only granted for Chrome and Firefox clients. 
     * Returned upon unsuccessful [[OpenVidu.initPublisher]] or [[OpenVidu.getUserMedia]]
     */
    DEVICE_ALREADY_IN_USE = "DEVICE_ALREADY_IN_USE",

    /**
     * The user hasn't granted permissions to capture some desktop screen when the browser asked for them.
     * Returned upon unsuccessful [[OpenVidu.initPublisher]] or [[OpenVidu.getUserMedia]]
     */
    SCREEN_CAPTURE_DENIED = 'SCREEN_CAPTURE_DENIED',

    /**
     * Browser does not support screen sharing.
     * Returned upon unsuccessful [[OpenVidu.initPublisher]]
     */
    SCREEN_SHARING_NOT_SUPPORTED = 'SCREEN_SHARING_NOT_SUPPORTED',

    /**
     * Only for Chrome, there's no screen sharing extension installed
     * Returned upon unsuccessful [[OpenVidu.initPublisher]]
     */
    SCREEN_EXTENSION_NOT_INSTALLED = 'SCREEN_EXTENSION_NOT_INSTALLED',

    /**
     * Only for Chrome, the screen sharing extension is installed but is disabled
     * Returned upon unsuccessful [[OpenVidu.initPublisher]]
     */
    SCREEN_EXTENSION_DISABLED = 'SCREEN_EXTENSION_DISABLED',

    /**
     * No video input device found with the provided deviceId (property [[PublisherProperties.videoSource]])
     * Returned upon unsuccessful [[OpenVidu.initPublisher]]
     */
    INPUT_VIDEO_DEVICE_NOT_FOUND = 'INPUT_VIDEO_DEVICE_NOT_FOUND',

    /**
     * No audio input device found with the provided deviceId (property [[PublisherProperties.audioSource]])
     * Returned upon unsuccessful [[OpenVidu.initPublisher]]
     */
    INPUT_AUDIO_DEVICE_NOT_FOUND = 'INPUT_AUDIO_DEVICE_NOT_FOUND',

    /**
     * Method [[OpenVidu.initPublisher]] has been called with properties `videoSource` and `audioSource` of
     * [[PublisherProperties]] parameter both set to *false* or *null*
     */
    NO_INPUT_SOURCE_SET = 'NO_INPUT_SOURCE_SET',

    /**
     * Some media property of [[PublisherProperties]] such as `frameRate` or `resolution` is not supported
     * by the input devices (whenever it is possible they are automatically adjusted to the most similar value).
     * Returned upon unsuccessful [[OpenVidu.initPublisher]]
     */
    PUBLISHER_PROPERTIES_ERROR = 'PUBLISHER_PROPERTIES_ERROR',

    /**
     * The client tried to call a method without the required permissions. This can occur for methods [[Session.publish]],
     * [[Session.forceUnpublish]], [[Session.forceDisconnect]], [[Stream.applyFilter]], [[Stream.removeFilter]]
     */
    OPENVIDU_PERMISSION_DENIED = 'OPENVIDU_PERMISSION_DENIED',

    /**
     * _Not in use yet_
     */
    OPENVIDU_NOT_CONNECTED = 'OPENVIDU_NOT_CONNECTED',

    /**
     * _Not in use yet_
     */
    GENERIC_ERROR = 'GENERIC_ERROR'
}

/**
 * Simple object to identify runtime errors on the client side
 */
export class OpenViduError {

    name: OpenViduErrorName;
    message: string;

    /**
     * @hidden
     */
    constructor(name: OpenViduErrorName, message: string) {
        this.name = name;
        this.message = message;
    }

}