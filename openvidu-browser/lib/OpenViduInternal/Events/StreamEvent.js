"use strict";
/*
 * (C) Copyright 2017-2018 OpenVidu (http://openvidu.io/)
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
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var Event_1 = require("./Event");
var __1 = require("../..");
/**
 * Defines the following events:
 * - `streamCreated`: dispatched by [[Session]] and [[Publisher]]
 * - `streamDestroyed`: dispatched by [[Session]] and [[Publisher]]
 */
var StreamEvent = /** @class */ (function (_super) {
    __extends(StreamEvent, _super);
    /**
     * @hidden
     */
    function StreamEvent(cancelable, target, type, stream, reason) {
        var _this = _super.call(this, cancelable, target, type) || this;
        _this.stream = stream;
        _this.reason = reason;
        return _this;
    }
    /**
     * @hidden
     */
    StreamEvent.prototype.callDefaultBehaviour = function () {
        if (this.type === 'streamDestroyed') {
            if (this.target instanceof __1.Session) {
                console.info("Calling default behaviour upon '" + this.type + "' event dispatched by 'Session'");
                // Remote Stream
                this.stream.disposeWebRtcPeer();
                this.stream.disposeMediaStream();
                this.stream.removeVideo();
            }
            else if (this.target instanceof __1.Publisher) {
                console.info("Calling default behaviour upon '" + this.type + "' event dispatched by 'Publisher'");
                // Local Stream
                this.stream.disposeMediaStream();
                this.stream.removeVideo();
                this.stream.isReadyToPublish = false;
            }
            // Delete stream from Session.remoteStreamsCreated map
            delete this.stream.session.remoteStreamsCreated[this.stream.streamId];
            // Delete StreamOptionsServer from remote Connection
            var remoteConnection = this.stream.session.remoteConnections[this.stream.connection.connectionId];
            if (!!remoteConnection && !!remoteConnection.options) {
                var streamOptionsServer = remoteConnection.options.streams;
                for (var i = streamOptionsServer.length - 1; i >= 0; --i) {
                    if (streamOptionsServer[i].id === this.stream.streamId) {
                        streamOptionsServer.splice(i, 1);
                    }
                }
            }
        }
    };
    return StreamEvent;
}(Event_1.Event));
exports.StreamEvent = StreamEvent;
//# sourceMappingURL=StreamEvent.js.map