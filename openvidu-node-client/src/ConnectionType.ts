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
 * See {@link Session.createConnection}
 */
export enum ConnectionType {
    /**
     * WebRTC connection. This is the normal type of Connection for a regular user
     * connecting to a session from an application.
     */
    WEBRTC = 'WEBRTC',

    /**
     * IP camera connection. This is the type of Connection used by IP cameras to
     * connect to a session.
     */
    IPCAM = 'IPCAM'
}
