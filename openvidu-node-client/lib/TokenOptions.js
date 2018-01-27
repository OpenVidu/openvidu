"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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