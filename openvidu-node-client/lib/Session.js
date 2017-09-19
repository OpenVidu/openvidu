"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var OpenViduRole_1 = require("./OpenViduRole");
var https = require('https');
var Session = (function () {
    function Session(urlOpenViduServer, secret) {
        this.urlOpenViduServer = urlOpenViduServer;
        this.secret = secret;
        this.sessionIdURL = '/api/sessions';
        this.tokenURL = '/api/tokens';
        this.sessionId = "";
        this.setHostnameAndPort();
    }
    Session.prototype.getSessionId = function (callback) {
        var _this = this;
        if (this.sessionId) {
            callback(this.sessionId);
            return;
        }
        var options = {
            hostname: this.hostname,
            port: this.port,
            path: this.sessionIdURL,
            method: 'POST',
            headers: {
                'Authorization': this.getBasicAuth()
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
                callback(parsed.id);
            });
        });
        req.on('error', function (e) {
            console.error(e);
        });
        req.end();
    };
    Session.prototype.generateToken = function (tokenOptions, callback) {
        var requestBody;
        if (callback) {
            requestBody = JSON.stringify({
                'session': this.sessionId,
                'role': tokenOptions.getRole(),
                'data': tokenOptions.getData()
            });
        }
        else {
            requestBody = JSON.stringify({
                'session': this.sessionId,
                'role': OpenViduRole_1.OpenViduRole.PUBLISHER,
                'data': ''
            });
            callback = tokenOptions;
        }
        var options = {
            hostname: this.hostname,
            port: this.port,
            path: this.tokenURL,
            method: 'POST',
            headers: {
                'Authorization': this.getBasicAuth(),
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
                callback(parsed.id);
            });
        });
        req.on('error', function (e) {
            console.error(e);
        });
        req.write(requestBody);
        req.end();
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