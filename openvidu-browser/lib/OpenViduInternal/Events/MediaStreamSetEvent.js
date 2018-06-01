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
/**
 * Defines the following events:
 * - `mediaStreamSet`: dispatched by [[Stream]]
 *
 * This is useful if you decide to manage the DOM video elements on your own instead of letting OpenVidu take care of them (passing _null_ or _undefined_ as `targetElement` on [[OpenVidu.initPublisher]] or [[Session.subscribe]])
 */
var MediaStreamSetEvent = /** @class */ (function (_super) {
    __extends(MediaStreamSetEvent, _super);
    /**
     * @hidden
     */
    function MediaStreamSetEvent(mediaStream, target) {
        var _this = _super.call(this, false, target, 'mediaStreamSet') || this;
        _this.mediaStream = mediaStream;
        return _this;
    }
    /**
     * @hidden
     */
    // tslint:disable-next-line:no-empty
    MediaStreamSetEvent.prototype.callDefaultBehaviour = function () { };
    return MediaStreamSetEvent;
}(Event_1.Event));
exports.MediaStreamSetEvent = MediaStreamSetEvent;
//# sourceMappingURL=MediaStreamSetEvent.js.map