"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var OpenViduRole;
(function (OpenViduRole) {
    /**
     * Can subscribe to published streams of other users
     */
    OpenViduRole["SUBSCRIBER"] = "SUBSCRIBER";
    /**
     * SUBSCRIBER permissions + can publish their own streams
     */
    OpenViduRole["PUBLISHER"] = "PUBLISHER";
    /**
     * _(not available yet)_ SUBSCRIBER + PUBLIHSER permissions + can force `unpublish()` and `disconnect()` over a third-party stream or user
     */
    OpenViduRole["MODERATOR"] = "MODERATOR";
})(OpenViduRole = exports.OpenViduRole || (exports.OpenViduRole = {}));
//# sourceMappingURL=OpenViduRole.js.map