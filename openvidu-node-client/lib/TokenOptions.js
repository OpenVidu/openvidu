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
Object.defineProperty(exports, "__esModule", { value: true });
var OpenViduRole_1 = require("./OpenViduRole");
var TokenOptions = /** @class */ (function () {
    function TokenOptions(data, role) {
        this.data = data;
        this.role = role;
    }
    TokenOptions.prototype.getData = function () {
        return this.data;
    };
    TokenOptions.prototype.getRole = function () {
        return this.role;
    };
    return TokenOptions;
}());
exports.TokenOptions = TokenOptions;
(function (TokenOptions) {
    var Builder = /** @class */ (function () {
        function Builder() {
            this.dataProp = '';
            this.roleProp = OpenViduRole_1.OpenViduRole.PUBLISHER;
        }
        Builder.prototype.build = function () {
            return new TokenOptions(this.dataProp, this.roleProp);
        };
        Builder.prototype.data = function (data) {
            this.dataProp = data;
            return this;
        };
        Builder.prototype.role = function (role) {
            this.roleProp = role;
            return this;
        };
        return Builder;
    }());
    TokenOptions.Builder = Builder;
    ;
})(TokenOptions = exports.TokenOptions || (exports.TokenOptions = {}));
exports.TokenOptions = TokenOptions;
//# sourceMappingURL=TokenOptions.js.map