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

/**
 * Defines property [[OpenViduError.name]]
 */
export enum OpenViduErrorName {
    BROWSER_NOT_SUPPORTED = 'BROWSER_NOT_SUPPORTED',
    CAMERA_ACCESS_DENIED = 'CAMERA_ACCESS_DENIED',
    MICROPHONE_ACCESS_DENIED = 'MICROPHONE_ACCESS_DENIED',
    SCREEN_CAPTURE_DENIED = 'SCREEN_CAPTURE_DENIED',
    SCREEN_SHARING_NOT_SUPPORTED = 'SCREEN_SHARING_NOT_SUPPORTED',
    SCREEN_EXTENSION_NOT_INSTALLED = 'SCREEN_EXTENSION_NOT_INSTALLED',
    SCREEN_EXTENSION_DISABLED = 'SCREEN_EXTENSION_DISABLED',
    INPUT_VIDEO_DEVICE_NOT_FOUND = 'INPUT_VIDEO_DEVICE_NOT_FOUND',
    INPUT_AUDIO_DEVICE_NOT_FOUND = 'INPUT_AUDIO_DEVICE_NOT_FOUND',
    NO_INPUT_SOURCE_SET = 'NO_INPUT_SOURCE_SET',
    PUBLISHER_PROPERTIES_ERROR = 'PUBLISHER_PROPERTIES_ERROR',
    OPENVIDU_PERMISSION_DENIED = 'OPENVIDU_PERMISSION_DENIED',
    OPENVIDU_NOT_CONNECTED = 'OPENVIDU_NOT_CONNECTED',
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