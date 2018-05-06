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

import { OpenViduRole } from './OpenViduRole';

export interface TokenOptions {

    /**
     * Secure (server-side) data associated to this token. Every client will receive this data in property `Connection.data`. Object `Connection` can be retrieved by subscribing to event `connectionCreated` of Session object.
     * - If you have provided no data in your clients when calling method `Session.connect(TOKEN, DATA)` (`DATA` not defined), then `Connection.data` will only have this [[TokenOptions.data]] property.
     * - If you have provided some data when calling `Session.connect(TOKEN, DATA)` (`DATA` defined), then `Connection.data` will have the following structure: `"CLIENT_DATA%/%SERVER_DATA"`, being `CLIENT_DATA` the second
     * parameter passed in OpenVidu Browser in method `Session.connect` and `SERVER_DATA` this [[TokenOptions.data]] property.
     */
    data: string;

    /**
     * The role assigned to this token
     */
    role: OpenViduRole;
}