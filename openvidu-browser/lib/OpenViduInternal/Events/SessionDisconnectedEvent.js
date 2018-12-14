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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var Event_1 = require("./Event");
/**
 * Defines event `sessionDisconnected` dispatched by [[Session]]
 */
var SessionDisconnectedEvent = /** @class */ (function (_super) {
    __extends(SessionDisconnectedEvent, _super);
    /**
     * @hidden
     */
    function SessionDisconnectedEvent(target, reason) {
        var _this = _super.call(this, true, target, 'sessionDisconnected') || this;
        _this.reason = reason;
        return _this;
    }
    /**
     * @hidden
     */
    SessionDisconnectedEvent.prototype.callDefaultBehavior = function () {
        console.info("Calling default behavior upon '" + this.type + "' event dispatched by 'Session'");
        var session = this.target;
        // Dispose and delete all remote Connections
        for (var connectionId in session.remoteConnections) {
            if (!!session.remoteConnections[connectionId].stream) {
                session.remoteConnections[connectionId].stream.disposeWebRtcPeer();
                session.remoteConnections[connectionId].stream.disposeMediaStream();
                if (session.remoteConnections[connectionId].stream.streamManager) {
                    session.remoteConnections[connectionId].stream.streamManager.removeAllVideos();
                }
                delete session.remoteStreamsCreated[session.remoteConnections[connectionId].stream.streamId];
                session.remoteConnections[connectionId].dispose();
            }
            delete session.remoteConnections[connectionId];
        }
    };
    return SessionDisconnectedEvent;
}(Event_1.Event));
exports.SessionDisconnectedEvent = SessionDisconnectedEvent;
//# sourceMappingURL=SessionDisconnectedEvent.js.map