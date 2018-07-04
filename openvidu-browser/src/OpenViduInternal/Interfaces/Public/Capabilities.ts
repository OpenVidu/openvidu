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
 * See [[Session.capabilities]]
 */
export interface Capabilities {

    /**
     * 1 if the client can call [[Session.publish]], 0 if not
     */
    publish: number;

    /**
     * 1 if the client can call [[Session.subscribe]], 0 if not (1 for every user for now)
     */
    subscribe: number;

}