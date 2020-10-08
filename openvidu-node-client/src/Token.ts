/*
 * (C) Copyright 2017-2020 OpenVidu (https://openvidu.io)
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

import { TokenOptions } from './TokenOptions';

export class Token {

    /**
     *  The token string value that must be sent to clients. They need to use it to connect to the session.
     */
    token: string;

    /**
     * The connection identifier that will be associated to the user
     * consuming this token. This means that the future [[Connection]] object created with
     * this token will have as [[Connection.connectionId]] this same value.
     * 
     * With `connectionId` you can call the following methods without
     * having to fetch and search for the actual [[Connection]] object:
     * 
     * - Call [[Session.forceDisconnect]] to invalidate the token if no client has used it
     * yet or force the connected client to leave the session if it has.
     * - Call [[Session.updateConnection]] to update the [[Connection]] options. And this is
     * valid for unused tokens, but also for already used tokens, so you can
     * dynamically change the connection options on the fly.
     */
    connectionId: string;

    /**
     * The [[TokenOptions]] assigned to this token.
     */
    tokenOptions: TokenOptions;

    /**
     * @hidden
     */
    constructor(json) {
        this.token = json.token;
        this.connectionId = json.connectionId;
        let possibleKurentoOptions;
        if (!!json.kurentoOptions) {
            possibleKurentoOptions = {};
            if (json.kurentoOptions.videoMaxRecvBandwidth != null) {
                possibleKurentoOptions['videoMaxRecvBandwidth'] = json.kurentoOptions.videoMaxRecvBandwidth;
            }
            if (json.kurentoOptions.videoMinRecvBandwidth != null) {
                possibleKurentoOptions['videoMinRecvBandwidth'] = json.kurentoOptions.videoMinRecvBandwidth;
            }
            if (json.kurentoOptions.videoMaxSendBandwidth != null) {
                possibleKurentoOptions['videoMaxSendBandwidth'] = json.kurentoOptions.videoMaxSendBandwidth;
            }
            if (json.kurentoOptions.videoMinSendBandwidth != null) {
                possibleKurentoOptions['videoMinSendBandwidth'] = json.kurentoOptions.videoMinSendBandwidth;
            }
            if (json.kurentoOptions.allowedFilters != null) {
                possibleKurentoOptions['allowedFilters'] = json.kurentoOptions.allowedFilters;
            }
        }
        this.tokenOptions = {
            role: json.role,
            data: json.data,
            record: json.record,
            kurentoOptions: possibleKurentoOptions
        };
    }

}