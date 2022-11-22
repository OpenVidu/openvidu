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
 * Defines property {@link OpenViduError.name}
 */
export enum OpenViduErrorName {
    /**
     * Browser is not supported by OpenVidu.
     * Returned upon unsuccessful {@link Session.connect}
     */
    BROWSER_NOT_SUPPORTED = 'BROWSER_NOT_SUPPORTED',

    /**
     * The user hasn't granted permissions to the required input device when the browser asked for them.
     * Returned upon unsuccessful {@link OpenVidu.initPublisher} or {@link OpenVidu.getUserMedia}
     */
    DEVICE_ACCESS_DENIED = 'DEVICE_ACCESS_DENIED',

    /**
     * The required input device is probably being used by other process when the browser asked for it.
     * This error can also be triggered when the user granted permission to use the devices but a hardware
     * error occurred at the OS, browser or web page level, which prevented access to the device.
     * Returned upon unsuccessful {@link OpenVidu.initPublisher} or {@link OpenVidu.getUserMedia}
     */
    DEVICE_ALREADY_IN_USE = 'DEVICE_ALREADY_IN_USE',

    /**
     * The user hasn't granted permissions to capture some desktop screen when the browser asked for them.
     * Returned upon unsuccessful {@link OpenVidu.initPublisher} or {@link OpenVidu.getUserMedia}
     */
    SCREEN_CAPTURE_DENIED = 'SCREEN_CAPTURE_DENIED',

    /**
     * Browser does not support screen sharing.
     * Returned upon unsuccessful {@link OpenVidu.initPublisher} or {@link OpenVidu.getUserMedia}
     */
    SCREEN_SHARING_NOT_SUPPORTED = 'SCREEN_SHARING_NOT_SUPPORTED',

    /**
     * Only for Chrome, there's no screen sharing extension installed
     * Returned upon unsuccessful {@link OpenVidu.initPublisher} or {@link OpenVidu.getUserMedia}
     */
    SCREEN_EXTENSION_NOT_INSTALLED = 'SCREEN_EXTENSION_NOT_INSTALLED',

    /**
     * Only for Chrome, the screen sharing extension is installed but is disabled
     * Returned upon unsuccessful {@link OpenVidu.initPublisher} or {@link OpenVidu.getUserMedia}
     */
    SCREEN_EXTENSION_DISABLED = 'SCREEN_EXTENSION_DISABLED',

    /**
     * No video input device found with the provided deviceId (property {@link PublisherProperties.videoSource})
     * Returned upon unsuccessful {@link OpenVidu.initPublisher} or {@link OpenVidu.getUserMedia}
     */
    INPUT_VIDEO_DEVICE_NOT_FOUND = 'INPUT_VIDEO_DEVICE_NOT_FOUND',

    /**
     * No audio input device found with the provided deviceId (property {@link PublisherProperties.audioSource})
     * Returned upon unsuccessful {@link OpenVidu.initPublisher} or {@link OpenVidu.getUserMedia}
     */
    INPUT_AUDIO_DEVICE_NOT_FOUND = 'INPUT_AUDIO_DEVICE_NOT_FOUND',

    /**
     * There was an unknown error when trying to access the specified audio device
     * Returned upon unsuccessful {@link OpenVidu.initPublisher} or {@link OpenVidu.getUserMedia}
     */
    INPUT_AUDIO_DEVICE_GENERIC_ERROR = 'INPUT_AUDIO_DEVICE_GENERIC_ERROR',

    /**
     * Method {@link OpenVidu.initPublisher} or  {@link OpenVidu.getUserMedia} has been called with properties `videoSource` and `audioSource` of
     * {@link PublisherProperties} parameter both set to *false* or *null*
     */
    NO_INPUT_SOURCE_SET = 'NO_INPUT_SOURCE_SET',

    /**
     * Some media property of {@link PublisherProperties} such as `frameRate` or `resolution` is not supported
     * by the input devices (whenever it is possible they are automatically adjusted to the most similar value).
     * Returned upon unsuccessful {@link OpenVidu.initPublisher} or {@link OpenVidu.getUserMedia}
     */
    PUBLISHER_PROPERTIES_ERROR = 'PUBLISHER_PROPERTIES_ERROR',

    /**
     * The client tried to call a method without the required permissions. This can occur for methods {@link Session.publish},
     * {@link Session.forceUnpublish}, {@link Session.forceDisconnect}, {@link Stream.applyFilter}, {@link Stream.removeFilter}
     */
    OPENVIDU_PERMISSION_DENIED = 'OPENVIDU_PERMISSION_DENIED',

    /**
     * There is no connection to the Session. This error will be thrown when any method requiring a connection to
     * openvidu-server is called before successfully calling method {@link Session.connect}
     */
    OPENVIDU_NOT_CONNECTED = 'OPENVIDU_NOT_CONNECTED',

    /**
     * Error related to [Virtual Background](/en/stable/advanced-features/virtual-background/)
     */
    VIRTUAL_BACKGROUND_ERROR = 'VIRTUAL_BACKGROUND_ERROR',

    /**
     * Generic error
     */
    GENERIC_ERROR = 'GENERIC_ERROR'
}

/**
 * Simple object to identify runtime errors on the client side
 */
export class OpenViduError {
    /**
     * Uniquely identifying name of the error
     */
    name: OpenViduErrorName;

    /**
     * Full description of the error
     */
    message: string;

    /**
     * @hidden
     */
    constructor(name: OpenViduErrorName, message: string) {
        this.name = name;
        this.message = message;
    }
}
