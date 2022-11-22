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
 * See {@link Session.capabilities}
 */
export interface Capabilities {
    /**
     * `true` if the client can call {@link Session.forceDisconnect}, `false` if not
     */
    forceDisconnect: boolean;

    /**
     * `true` if the client can call {@link Session.forceUnpublish}, `false` if not
     */
    forceUnpublish: boolean;

    /**
     * `true` if the client can call {@link Session.publish}, `false` if not
     */
    publish: boolean;

    /**
     * `true` if the client can call {@link Session.subscribe}, `false` if not (true for every user for now)
     */
    subscribe: boolean;
}
