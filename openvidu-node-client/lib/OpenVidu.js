"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Session_1 = require("./Session");
var OpenVidu = /** @class */ (function () {
    function OpenVidu(urlOpenViduServer, secret) {
        this.urlOpenViduServer = urlOpenViduServer;
        this.secret = secret;
    }
    OpenVidu.prototype.createSession = function (properties) {
        return new Session_1.Session(this.urlOpenViduServer, this.secret, properties);
    };
    OpenVidu.prototype.startRecording = function (sessionId) {
        // TODO: REST POST to start recording in OpenVidu Server
    };
    OpenVidu.prototype.stopRecording = function (sessionId) {
        // TODO: REST POST to end recording in OpenVidu Server
    };
    return OpenVidu;
}());
exports.OpenVidu = OpenVidu;
//# sourceMappingURL=OpenVidu.js.map