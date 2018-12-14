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
 * Defines event `streamPropertyChanged` dispatched by [[Session]] as well as by [[StreamManager]] ([[Publisher]] and [[Subscriber]]).
 * This event is fired when any remote stream (owned by a Subscriber) or local stream (owned by a Publisher) undergoes
 * any change in any of its mutable properties (see [[changedProperty]]).
 */
var StreamPropertyChangedEvent = /** @class */ (function (_super) {
    __extends(StreamPropertyChangedEvent, _super);
    /**
     * @hidden
     */
    function StreamPropertyChangedEvent(target, stream, changedProperty, newValue, oldValue, reason) {
        var _this = _super.call(this, false, target, 'streamPropertyChanged') || this;
        _this.stream = stream;
        _this.changedProperty = changedProperty;
        _this.newValue = newValue;
        _this.oldValue = oldValue;
        _this.reason = reason;
        return _this;
    }
    /**
     * @hidden
     */
    // tslint:disable-next-line:no-empty
    StreamPropertyChangedEvent.prototype.callDefaultBehavior = function () { };
    return StreamPropertyChangedEvent;
}(Event_1.Event));
exports.StreamPropertyChangedEvent = StreamPropertyChangedEvent;
//# sourceMappingURL=StreamPropertyChangedEvent.js.map