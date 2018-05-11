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
exports.__esModule = true;
var Event = /** @class */ (function () {
    /**
     * @hidden
     */
    function Event(cancelable, target, type) {
        this.hasBeenPrevented = false;
        this.cancelable = cancelable;
        this.target = target;
        this.type = type;
    }
    /**
     * Whether the default beahivour of the event has been prevented or not. Call [[Event.preventDefault]] to prevent it
     */
    Event.prototype.isDefaultPrevented = function () {
        return this.hasBeenPrevented;
    };
    /**
     * Prevents the default behaviour of the event. The following events have a default behaviour:
     * - `sessionDisconnected`: automatically unsubscribes the leaving participant from every Subscriber object of the session (this includes closing the WebRTCPeer connection and disposing all MediaStreamTracks)
     * and also deletes the HTML video element associated to it.
     * - `streamDestroyed`: if dispatched by a [[Publisher]] (_you_ have unpublished), automatically stops all media tracks and deletes the HTML video element associated to the stream. If dispatched by [[Session]],
     * (_other user_ has unpublished), automatically unsubscribes the proper Subscriber object from the session (this includes closing the WebRTCPeer connection and disposing all MediaStreamTracks) and deletes the HTML video element associated to it.
     */
    Event.prototype.preventDefault = function () {
        // tslint:disable-next-line:no-empty
        this.callDefaultBehaviour = function () { };
        this.hasBeenPrevented = true;
    };
    return Event;
}());
exports.Event = Event;
//# sourceMappingURL=Event.js.map