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
 * - `signal`: dispatched by [[Session]]
 * - `signal:TYPE`: dispatched by [[Session]]
 */
var SignalEvent = /** @class */ (function (_super) {
    __extends(SignalEvent, _super);
    /**
     * @hidden
     */
    function SignalEvent(target, type, data, from) {
        var _this = _super.call(this, false, target, type) || this;
        _this.type = type;
        _this.data = data;
        _this.from = from;
        return _this;
    }
    /**
     * @hidden
     */
    // tslint:disable-next-line:no-empty
    SignalEvent.prototype.callDefaultBehavior = function () { };
    return SignalEvent;
}(Event_1.Event));
exports.SignalEvent = SignalEvent;
//# sourceMappingURL=SignalEvent.js.map