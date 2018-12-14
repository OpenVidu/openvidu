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
 * Defines the following events:
 * - `publisherStartSpeaking`: dispatched by [[Session]]
 * - `publisherStopSpeaking`: dispatched by [[Session]]
 *
 * More information:
 * - This events will only be triggered for **remote streams that have audio tracks** ([[Stream.hasAudio]] must be true)
 * - Both events share the same lifecycle. That means that you can subscribe to only one of them if you want, but if you call `Session.off('publisherStopSpeaking')`,
 * keep in mind that this will also internally remove any 'publisherStartSpeaking' event
 * - You can further configure how the events are dispatched by setting property `publisherSpeakingEventsOptions` in the call of [[OpenVidu.setAdvancedConfiguration]]
 */
var PublisherSpeakingEvent = /** @class */ (function (_super) {
    __extends(PublisherSpeakingEvent, _super);
    /**
     * @hidden
     */
    function PublisherSpeakingEvent(target, type, connection, streamId) {
        var _this = _super.call(this, false, target, type) || this;
        _this.type = type;
        _this.connection = connection;
        _this.streamId = streamId;
        return _this;
    }
    /**
     * @hidden
     */
    // tslint:disable-next-line:no-empty
    PublisherSpeakingEvent.prototype.callDefaultBehavior = function () { };
    return PublisherSpeakingEvent;
}(Event_1.Event));
exports.PublisherSpeakingEvent = PublisherSpeakingEvent;
//# sourceMappingURL=PublisherSpeakingEvent.js.map