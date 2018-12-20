"use strict";
var Logger = console;
var MAX_RETRY_TIME_MS = 10000;
var CONNECTING = 0;
var OPEN = 1;
var CLOSING = 2;
var CLOSED = 3;
function WebSocketWithReconnection(config) {
    var totalNumRetries = 1;
    var registerMessageHandler;
    var reconnecting = false;
    var ws;
    function onOpen() {
        ws.addEventListener("close", onClose);
        if (reconnecting === true) {
            registerMessageHandler();
            if (config.onreconnected) {
                config.onreconnected();
            }
            reconnecting = false;
        }
        else {
            if (config.onconnected) {
                config.onconnected();
            }
        }
        totalNumRetries = 1;
    }
    function onClose(event) {
        removeAllListeners();
        Logger.log("Close Web Socket code: " + event.code + " reason: " + event.reason);
        if (event.code > 4000) {
            if (config.onerror) {
                config.onerror(event.reason);
            }
            return;
        }
        if (reconnecting === false) {
            reconnecting = true;
            reconnect(500 * totalNumRetries);
        }
    }
    function onError(event) {
        removeAllListeners();
        if (config.onerror) {
            config.onerror("Web socket establishing error");
        }
        reconnect(500 * totalNumRetries);
    }
    function resetWebSocket(config) {
        var newWS;
        if (config.useSockJS) {
            newWS = new SockJS(config.uri);
        }
        else {
            newWS = new WebSocket(config.uri);
        }
        newWS.addEventListener("open", onOpen);
        newWS.addEventListener("error", onError);
        return newWS;
    }
    function removeAllListeners() {
        ws.removeEventListener("open", onOpen);
        ws.removeEventListener("error", onError);
        ws.removeEventListener("close", onClose);
    }
    function reconnect(reconnectInterval) {
        if (reconnectInterval > MAX_RETRY_TIME_MS) {
            if (config.onerror) {
                config.onerror("Server is not responding");
            }
            return;
        }
        if (config.onreconnecting) {
            config.onreconnecting();
        }
        setTimeout(function () {
            totalNumRetries++;
            ws = resetWebSocket(config);
        }, reconnectInterval);
    }
    ws = resetWebSocket(config);
    this.close = function (code, reason) {
        if (ws.readyState < CLOSING) {
            ws.close(code, reason);
        }
    };
    this.forceClose = function (millis) {
        Logger.debug("Testing: Force WebSocket close");
        if (millis) {
            Logger.log("Testing: Change wsUri for " + millis
                + " millis to simulate net failure");
            setTimeout(function () {
                ws.close(1000, "Test close for reconnect with timeout");
            }, millis);
        }
        else {
            ws.close(1000, "Test close for reconnect");
        }
    };
    this.reconnectWs = function () {
        Logger.log("reconnectWs");
        ws.close(1000, "Close Web socket for reconnection");
    };
    this.send = function (message) {
        ws.send(message);
    };
    this.addEventListener = function (type, callback) {
        registerMessageHandler = function () {
            ws.addEventListener(type, callback);
        };
        registerMessageHandler();
    };
}
module.exports = WebSocketWithReconnection;
//# sourceMappingURL=webSocketWithReconnection.js.map