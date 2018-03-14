"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var OpenViduRole_1 = require("./OpenViduRole");
var SessionProperties_1 = require("./SessionProperties");
var https = require('https');
var Session = /** @class */ (function () {
    function Session(urlOpenViduServer, secret, properties) {
        this.urlOpenViduServer = urlOpenViduServer;
        this.secret = secret;
        this.sessionIdURL = '/api/sessions';
        this.tokenURL = '/api/tokens';
        this.sessionId = "";
        if (properties == null) {
            this.properties = new SessionProperties_1.SessionProperties.Builder().build();
        }
        else {
            this.properties = properties;
        }
        this.setHostnameAndPort();
    }
    Session.prototype.getSessionId = function (callback) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.sessionId) {
                resolve(_this.sessionId);
            }
            var requestBody = JSON.stringify({
                'archiveLayout': _this.properties.archiveLayout(),
                'archiveMode': _this.properties.archiveMode(),
                'mediaMode': _this.properties.mediaMode()
            });
            var options = {
                hostname: _this.hostname,
                port: _this.port,
                path: _this.sessionIdURL,
                method: 'POST',
                headers: {
                    'Authorization': _this.getBasicAuth(),
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(requestBody)
                }
            };
            var req = https.request(options, function (res) {
                var body = '';
                res.on('data', function (d) {
                    // Continuously update stream with data
                    body += d;
                });
                res.on('end', function () {
                    // Data reception is done
                    var parsed = JSON.parse(body);
                    _this.sessionId = parsed.id;
                    resolve(parsed.id);
                });
            });
            req.on('error', function (e) {
                reject(e);
            });
            req.write(requestBody);
            req.end();
        });
    };
    Session.prototype.generateToken = function (tokenOptions, callback) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var requestBody;
            if (callback) {
                requestBody = JSON.stringify({
                    'session': _this.sessionId,
                    'role': tokenOptions.getRole(),
                    'data': tokenOptions.getData()
                });
            }
            else {
                requestBody = JSON.stringify({
                    'session': _this.sessionId,
                    'role': OpenViduRole_1.OpenViduRole.PUBLISHER,
                    'data': ''
                });
                callback = tokenOptions;
            }
            var options = {
                hostname: _this.hostname,
                port: _this.port,
                path: _this.tokenURL,
                method: 'POST',
                headers: {
                    'Authorization': _this.getBasicAuth(),
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(requestBody)
                }
            };
            var req = https.request(options, function (res) {
                var body = '';
                res.on('data', function (d) {
                    // Continuously update stream with data
                    body += d;
                });
                res.on('end', function () {
                    // Data reception is done
                    var parsed = JSON.parse(body);
                    resolve(parsed.id);
                });
            });
            req.on('error', function (e) {
                reject(e);
            });
            req.write(requestBody);
            req.end();
        });
    };
    Session.prototype.getProperties = function () {
        return this.properties;
    };
    Session.prototype.getBasicAuth = function () {
        return 'Basic ' + (new Buffer('OPENVIDUAPP:' + this.secret).toString('base64'));
    };
    Session.prototype.setHostnameAndPort = function () {
        var urlSplitted = this.urlOpenViduServer.split(':');
        if (urlSplitted.length === 3) {
            this.hostname = this.urlOpenViduServer.split(':')[1].replace(/\//g, '');
            this.port = parseInt(this.urlOpenViduServer.split(':')[2].replace(/\//g, ''));
        }
        else if (urlSplitted.length == 2) {
            this.hostname = this.urlOpenViduServer.split(':')[0].replace(/\//g, '');
            this.port = parseInt(this.urlOpenViduServer.split(':')[1].replace(/\//g, ''));
        }
        else {
            console.error("URL format incorrect: it must contain hostname and port (current value: '" + this.urlOpenViduServer + "')");
        }
    };
    return Session;
}());
exports.Session = Session;
//# sourceMappingURL=Session.js.map