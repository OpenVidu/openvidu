"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Session_1 = require("./Session");
var OpenVidu = /** @class */ (function () {
    function OpenVidu(urlOpenViduServer, secret) {
        this.urlOpenViduServer = urlOpenViduServer;
        this.secret = secret;
    }
    OpenVidu.prototype.createSession = function () {
        return new Session_1.Session(this.urlOpenViduServer, this.secret);
    };
    return OpenVidu;
}());
exports.OpenVidu = OpenVidu;
//# sourceMappingURL=OpenVidu.js.map