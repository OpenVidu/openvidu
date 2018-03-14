webpackJsonp(["main"],{

/***/ "../../../../openvidu-browser/lib/KurentoUtils/kurento-jsonrpc/Mapper.js":
/***/ (function(module, exports) {

function Mapper() {
    var sources = {};
    this.forEach = function (callback) {
        for (var key in sources) {
            var source = sources[key];
            for (var key2 in source)
                callback(source[key2]);
        }
        ;
    };
    this.get = function (id, source) {
        var ids = sources[source];
        if (ids == undefined)
            return undefined;
        return ids[id];
    };
    this.remove = function (id, source) {
        var ids = sources[source];
        if (ids == undefined)
            return;
        delete ids[id];
        // Check it's empty
        for (var i in ids) {
            return false;
        }
        delete sources[source];
    };
    this.set = function (value, id, source) {
        if (value == undefined)
            return this.remove(id, source);
        var ids = sources[source];
        if (ids == undefined)
            sources[source] = ids = {};
        ids[id] = value;
    };
}
;
Mapper.prototype.pop = function (id, source) {
    var value = this.get(id, source);
    if (value == undefined)
        return undefined;
    this.remove(id, source);
    return value;
};
module.exports = Mapper;
//# sourceMappingURL=Mapper.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/KurentoUtils/kurento-jsonrpc/clients/index.js":
/***/ (function(module, exports, __webpack_require__) {

/*
 * (C) Copyright 2014 Kurento (http://kurento.org/)
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
var JsonRpcClient = __webpack_require__("../../../../openvidu-browser/lib/KurentoUtils/kurento-jsonrpc/clients/jsonrpcclient.js");
exports.JsonRpcClient = JsonRpcClient;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/KurentoUtils/kurento-jsonrpc/clients/jsonrpcclient.js":
/***/ (function(module, exports, __webpack_require__) {

/*
 * (C) Copyright 2014 Kurento (http://kurento.org/)
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
var RpcBuilder = __webpack_require__("../../../../openvidu-browser/lib/KurentoUtils/kurento-jsonrpc/index.js");
var WebSocketWithReconnection = __webpack_require__("../../../../openvidu-browser/lib/KurentoUtils/kurento-jsonrpc/clients/transports/webSocketWithReconnection.js");
Date.now = Date.now || function () {
    return +new Date;
};
var PING_INTERVAL = 5000;
var RECONNECTING = 'RECONNECTING';
var CONNECTED = 'CONNECTED';
var DISCONNECTED = 'DISCONNECTED';
var Logger = console;
/**
 *
 * heartbeat: interval in ms for each heartbeat message,
 * sendCloseMessage : true / false, before closing the connection, it sends a closeSession message
 * <pre>
 * ws : {
 * 	uri : URI to conntect to,
 *  useSockJS : true (use SockJS) / false (use WebSocket) by default,
 * 	onconnected : callback method to invoke when connection is successful,
 * 	ondisconnect : callback method to invoke when the connection is lost,
 * 	onreconnecting : callback method to invoke when the client is reconnecting,
 * 	onreconnected : callback method to invoke when the client succesfully reconnects,
 * 	onerror : callback method to invoke when there is an error
 * },
 * rpc : {
 * 	requestTimeout : timeout for a request,
 * 	sessionStatusChanged: callback method for changes in session status,
 * 	mediaRenegotiation: mediaRenegotiation
 * }
 * </pre>
 */
function JsonRpcClient(configuration) {
    var self = this;
    var wsConfig = configuration.ws;
    var notReconnectIfNumLessThan = -1;
    var pingNextNum = 0;
    var enabledPings = true;
    var pingPongStarted = false;
    var pingInterval;
    var status = DISCONNECTED;
    var onreconnecting = wsConfig.onreconnecting;
    var onreconnected = wsConfig.onreconnected;
    var onconnected = wsConfig.onconnected;
    var onerror = wsConfig.onerror;
    configuration.rpc.pull = function (params, request) {
        request.reply(null, "push");
    };
    wsConfig.onreconnecting = function () {
        Logger.debug("--------- ONRECONNECTING -----------");
        if (status === RECONNECTING) {
            Logger.error("Websocket already in RECONNECTING state when receiving a new ONRECONNECTING message. Ignoring it");
            return;
        }
        status = RECONNECTING;
        if (onreconnecting) {
            onreconnecting();
        }
    };
    wsConfig.onreconnected = function () {
        Logger.debug("--------- ONRECONNECTED -----------");
        if (status === CONNECTED) {
            Logger.error("Websocket already in CONNECTED state when receiving a new ONRECONNECTED message. Ignoring it");
            return;
        }
        status = CONNECTED;
        enabledPings = true;
        updateNotReconnectIfLessThan();
        usePing();
        if (onreconnected) {
            onreconnected();
        }
    };
    wsConfig.onconnected = function () {
        Logger.debug("--------- ONCONNECTED -----------");
        if (status === CONNECTED) {
            Logger.error("Websocket already in CONNECTED state when receiving a new ONCONNECTED message. Ignoring it");
            return;
        }
        status = CONNECTED;
        enabledPings = true;
        usePing();
        if (onconnected) {
            onconnected();
        }
    };
    wsConfig.onerror = function (error) {
        Logger.debug("--------- ONERROR -----------");
        status = DISCONNECTED;
        if (onerror) {
            onerror(error);
        }
    };
    var ws = new WebSocketWithReconnection(wsConfig);
    Logger.debug('Connecting websocket to URI: ' + wsConfig.uri);
    var rpcBuilderOptions = {
        request_timeout: configuration.rpc.requestTimeout,
        ping_request_timeout: configuration.rpc.heartbeatRequestTimeout
    };
    var rpc = new RpcBuilder(RpcBuilder.packers.JsonRPC, rpcBuilderOptions, ws, function (request) {
        Logger.debug('Received request: ' + JSON.stringify(request));
        try {
            var func = configuration.rpc[request.method];
            if (func === undefined) {
                Logger.error("Method " + request.method + " not registered in client");
            }
            else {
                func(request.params, request);
            }
        }
        catch (err) {
            Logger.error('Exception processing request: ' + JSON.stringify(request));
            Logger.error(err);
        }
    });
    this.send = function (method, params, callback) {
        if (method !== 'ping') {
            Logger.debug('Request: method:' + method + " params:" + JSON.stringify(params));
        }
        var requestTime = Date.now();
        rpc.encode(method, params, function (error, result) {
            if (error) {
                try {
                    Logger.error("ERROR:" + error.message + " in Request: method:" +
                        method + " params:" + JSON.stringify(params) + " request:" +
                        error.request);
                    if (error.data) {
                        Logger.error("ERROR DATA:" + JSON.stringify(error.data));
                    }
                }
                catch (e) { }
                error.requestTime = requestTime;
            }
            if (callback) {
                if (result != undefined && result.value !== 'pong') {
                    Logger.debug('Response: ' + JSON.stringify(result));
                }
                callback(error, result);
            }
        });
    };
    function updateNotReconnectIfLessThan() {
        Logger.debug("notReconnectIfNumLessThan = " + pingNextNum + ' (old=' +
            notReconnectIfNumLessThan + ')');
        notReconnectIfNumLessThan = pingNextNum;
    }
    function sendPing() {
        if (enabledPings) {
            var params = null;
            if (pingNextNum == 0 || pingNextNum == notReconnectIfNumLessThan) {
                params = {
                    interval: configuration.heartbeat || PING_INTERVAL
                };
            }
            pingNextNum++;
            self.send('ping', params, (function (pingNum) {
                return function (error, result) {
                    if (error) {
                        Logger.debug("Error in ping request #" + pingNum + " (" +
                            error.message + ")");
                        if (pingNum > notReconnectIfNumLessThan) {
                            enabledPings = false;
                            updateNotReconnectIfLessThan();
                            Logger.debug("Server did not respond to ping message #" +
                                pingNum + ". Reconnecting... ");
                            ws.reconnectWs();
                        }
                    }
                };
            })(pingNextNum));
        }
        else {
            Logger.debug("Trying to send ping, but ping is not enabled");
        }
    }
    /*
    * If configuration.hearbeat has any value, the ping-pong will work with the interval
    * of configuration.hearbeat
    */
    function usePing() {
        if (!pingPongStarted) {
            Logger.debug("Starting ping (if configured)");
            pingPongStarted = true;
            if (configuration.heartbeat != undefined) {
                pingInterval = setInterval(sendPing, configuration.heartbeat);
                sendPing();
            }
        }
    }
    this.close = function () {
        Logger.debug("Closing jsonRpcClient explicitly by client");
        if (pingInterval != undefined) {
            Logger.debug("Clearing ping interval");
            clearInterval(pingInterval);
        }
        pingPongStarted = false;
        enabledPings = false;
        if (configuration.sendCloseMessage) {
            Logger.debug("Sending close message");
            this.send('closeSession', null, function (error, result) {
                if (error) {
                    Logger.error("Error sending close message: " + JSON.stringify(error));
                }
                ws.close();
            });
        }
        else {
            ws.close();
        }
    };
    // This method is only for testing
    this.forceClose = function (millis) {
        ws.forceClose(millis);
    };
    this.reconnect = function () {
        ws.reconnectWs();
    };
}
module.exports = JsonRpcClient;
//# sourceMappingURL=jsonrpcclient.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/KurentoUtils/kurento-jsonrpc/clients/transports/index.js":
/***/ (function(module, exports, __webpack_require__) {

/*
 * (C) Copyright 2014 Kurento (http://kurento.org/)
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
var WebSocketWithReconnection = __webpack_require__("../../../../openvidu-browser/lib/KurentoUtils/kurento-jsonrpc/clients/transports/webSocketWithReconnection.js");
exports.WebSocketWithReconnection = WebSocketWithReconnection;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/KurentoUtils/kurento-jsonrpc/clients/transports/webSocketWithReconnection.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {/*
 * (C) Copyright 2013-2015 Kurento (http://kurento.org/)
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
 */

var BrowserWebSocket = global.WebSocket || global.MozWebSocket;
var Logger = console;
/**
 * Get either the `WebSocket` or `MozWebSocket` globals
 * in the browser or try to resolve WebSocket-compatible
 * interface exposed by `ws` for Node-like environment.
 */
/*var WebSocket = BrowserWebSocket;
if (!WebSocket && typeof window === 'undefined') {
    try {
        WebSocket = require('ws');
    } catch (e) { }
}*/
//var SockJS = require('sockjs-client');
var MAX_RETRIES = 2000; // Forever...
var RETRY_TIME_MS = 3000; // FIXME: Implement exponential wait times...
var CONNECTING = 0;
var OPEN = 1;
var CLOSING = 2;
var CLOSED = 3;
/*
config = {
        uri : wsUri,
        useSockJS : true (use SockJS) / false (use WebSocket) by default,
        onconnected : callback method to invoke when connection is successful,
        ondisconnect : callback method to invoke when the connection is lost,
        onreconnecting : callback method to invoke when the client is reconnecting,
        onreconnected : callback method to invoke when the client succesfully reconnects,
    };
*/
function WebSocketWithReconnection(config) {
    var closing = false;
    var registerMessageHandler;
    var wsUri = config.uri;
    var useSockJS = config.useSockJS;
    var reconnecting = false;
    var forcingDisconnection = false;
    var ws;
    if (useSockJS) {
        ws = new SockJS(wsUri);
    }
    else {
        ws = new WebSocket(wsUri);
    }
    ws.onopen = function () {
        logConnected(ws, wsUri);
        if (config.onconnected) {
            config.onconnected();
        }
    };
    ws.onerror = function (error) {
        Logger.error("Could not connect to " + wsUri + " (invoking onerror if defined)", error);
        if (config.onerror) {
            config.onerror(error);
        }
    };
    function logConnected(ws, wsUri) {
        try {
            Logger.debug("WebSocket connected to " + wsUri);
        }
        catch (e) {
            Logger.error(e);
        }
    }
    var reconnectionOnClose = function () {
        if (ws.readyState === CLOSED) {
            if (closing) {
                Logger.debug("Connection closed by user");
            }
            else {
                Logger.debug("Connection closed unexpectecly. Reconnecting...");
                reconnectToSameUri(MAX_RETRIES, 1);
            }
        }
        else {
            Logger.debug("Close callback from previous websocket. Ignoring it");
        }
    };
    ws.onclose = reconnectionOnClose;
    function reconnectToSameUri(maxRetries, numRetries) {
        Logger.debug("reconnectToSameUri (attempt #" + numRetries + ", max=" + maxRetries + ")");
        if (numRetries === 1) {
            if (reconnecting) {
                Logger.warn("Trying to reconnectToNewUri when reconnecting... Ignoring this reconnection.");
                return;
            }
            else {
                reconnecting = true;
            }
            if (config.onreconnecting) {
                config.onreconnecting();
            }
        }
        if (forcingDisconnection) {
            reconnectToNewUri(maxRetries, numRetries, wsUri);
        }
        else {
            if (config.newWsUriOnReconnection) {
                config.newWsUriOnReconnection(function (error, newWsUri) {
                    if (error) {
                        Logger.debug(error);
                        setTimeout(function () {
                            reconnectToSameUri(maxRetries, numRetries + 1);
                        }, RETRY_TIME_MS);
                    }
                    else {
                        reconnectToNewUri(maxRetries, numRetries, newWsUri);
                    }
                });
            }
            else {
                reconnectToNewUri(maxRetries, numRetries, wsUri);
            }
        }
    }
    // TODO Test retries. How to force not connection?
    function reconnectToNewUri(maxRetries, numRetries, reconnectWsUri) {
        Logger.debug("Reconnection attempt #" + numRetries);
        ws.close();
        wsUri = reconnectWsUri || wsUri;
        var newWs;
        if (useSockJS) {
            newWs = new SockJS(wsUri);
        }
        else {
            newWs = new WebSocket(wsUri);
        }
        newWs.onopen = function () {
            Logger.debug("Reconnected after " + numRetries + " attempts...");
            logConnected(newWs, wsUri);
            reconnecting = false;
            registerMessageHandler();
            if (config.onreconnected()) {
                config.onreconnected();
            }
            newWs.onclose = reconnectionOnClose;
        };
        var onErrorOrClose = function (error) {
            Logger.warn("Reconnection error: ", error);
            if (numRetries === maxRetries) {
                if (config.ondisconnect) {
                    config.ondisconnect();
                }
            }
            else {
                setTimeout(function () {
                    reconnectToSameUri(maxRetries, numRetries + 1);
                }, RETRY_TIME_MS);
            }
        };
        newWs.onerror = onErrorOrClose;
        ws = newWs;
    }
    this.close = function () {
        closing = true;
        ws.close();
    };
    // This method is only for testing
    this.forceClose = function (millis) {
        Logger.debug("Testing: Force WebSocket close");
        if (millis) {
            Logger.debug("Testing: Change wsUri for " + millis + " millis to simulate net failure");
            var goodWsUri = wsUri;
            wsUri = "wss://21.234.12.34.4:443/";
            forcingDisconnection = true;
            setTimeout(function () {
                Logger.debug("Testing: Recover good wsUri " + goodWsUri);
                wsUri = goodWsUri;
                forcingDisconnection = false;
            }, millis);
        }
        ws.close();
    };
    this.reconnectWs = function () {
        Logger.debug("reconnectWs");
        reconnectToSameUri(MAX_RETRIES, 1, wsUri);
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
/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__("./node_modules/webpack/buildin/global.js")))

/***/ }),

/***/ "../../../../openvidu-browser/lib/KurentoUtils/kurento-jsonrpc/index.js":
/***/ (function(module, exports, __webpack_require__) {

/*
 * (C) Copyright 2014 Kurento (http://kurento.org/)
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
var defineProperty_IE8 = false;
if (Object.defineProperty) {
    try {
        Object.defineProperty({}, "x", {});
    }
    catch (e) {
        defineProperty_IE8 = true;
    }
}
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
        if (typeof this !== 'function') {
            // closest thing possible to the ECMAScript 5
            // internal IsCallable function
            throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
        }
        var aArgs = Array.prototype.slice.call(arguments, 1), fToBind = this, fNOP = function () { }, fBound = function () {
            return fToBind.apply(this instanceof fNOP && oThis
                ? this
                : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
        };
        fNOP.prototype = this.prototype;
        fBound.prototype = new fNOP();
        return fBound;
    };
}
var EventEmitter = __webpack_require__("./node_modules/events/events.js").EventEmitter;
var inherits = __webpack_require__("../../../../openvidu-browser/node_modules/inherits/inherits_browser.js");
var packers = __webpack_require__("../../../../openvidu-browser/lib/KurentoUtils/kurento-jsonrpc/packers/index.js");
var Mapper = __webpack_require__("../../../../openvidu-browser/lib/KurentoUtils/kurento-jsonrpc/Mapper.js");
var BASE_TIMEOUT = 5000;
function unifyResponseMethods(responseMethods) {
    if (!responseMethods)
        return {};
    for (var key in responseMethods) {
        var value = responseMethods[key];
        if (typeof value == 'string')
            responseMethods[key] =
                {
                    response: value
                };
    }
    ;
    return responseMethods;
}
;
function unifyTransport(transport) {
    if (!transport)
        return;
    // Transport as a function
    if (transport instanceof Function)
        return { send: transport };
    // WebSocket & DataChannel
    if (transport.send instanceof Function)
        return transport;
    // Message API (Inter-window & WebWorker)
    if (transport.postMessage instanceof Function) {
        transport.send = transport.postMessage;
        return transport;
    }
    // Stream API
    if (transport.write instanceof Function) {
        transport.send = transport.write;
        return transport;
    }
    // Transports that only can receive messages, but not send
    if (transport.onmessage !== undefined)
        return;
    if (transport.pause instanceof Function)
        return;
    throw new SyntaxError("Transport is not a function nor a valid object");
}
;
/**
 * Representation of a RPC notification
 *
 * @class
 *
 * @constructor
 *
 * @param {String} method -method of the notification
 * @param params - parameters of the notification
 */
function RpcNotification(method, params) {
    if (defineProperty_IE8) {
        this.method = method;
        this.params = params;
    }
    else {
        Object.defineProperty(this, 'method', { value: method, enumerable: true });
        Object.defineProperty(this, 'params', { value: params, enumerable: true });
    }
}
;
/**
 * @class
 *
 * @constructor
 *
 * @param {object} packer
 *
 * @param {object} [options]
 *
 * @param {object} [transport]
 *
 * @param {Function} [onRequest]
 */
function RpcBuilder(packer, options, transport, onRequest) {
    var self = this;
    if (!packer)
        throw new SyntaxError('Packer is not defined');
    if (!packer.pack || !packer.unpack)
        throw new SyntaxError('Packer is invalid');
    var responseMethods = unifyResponseMethods(packer.responseMethods);
    if (options instanceof Function) {
        if (transport != undefined)
            throw new SyntaxError("There can't be parameters after onRequest");
        onRequest = options;
        transport = undefined;
        options = undefined;
    }
    ;
    if (options && options.send instanceof Function) {
        if (transport && !(transport instanceof Function))
            throw new SyntaxError("Only a function can be after transport");
        onRequest = transport;
        transport = options;
        options = undefined;
    }
    ;
    if (transport instanceof Function) {
        if (onRequest != undefined)
            throw new SyntaxError("There can't be parameters after onRequest");
        onRequest = transport;
        transport = undefined;
    }
    ;
    if (transport && transport.send instanceof Function)
        if (onRequest && !(onRequest instanceof Function))
            throw new SyntaxError("Only a function can be after transport");
    options = options || {};
    EventEmitter.call(this);
    if (onRequest)
        this.on('request', onRequest);
    if (defineProperty_IE8)
        this.peerID = options.peerID;
    else
        Object.defineProperty(this, 'peerID', { value: options.peerID });
    var max_retries = options.max_retries || 0;
    function transportMessage(event) {
        self.decode(event.data || event);
    }
    ;
    this.getTransport = function () {
        return transport;
    };
    this.setTransport = function (value) {
        // Remove listener from old transport
        if (transport) {
            // W3C transports
            if (transport.removeEventListener)
                transport.removeEventListener('message', transportMessage);
            else if (transport.removeListener)
                transport.removeListener('data', transportMessage);
        }
        ;
        // Set listener on new transport
        if (value) {
            // W3C transports
            if (value.addEventListener)
                value.addEventListener('message', transportMessage);
            else if (value.addListener)
                value.addListener('data', transportMessage);
        }
        ;
        transport = unifyTransport(value);
    };
    if (!defineProperty_IE8)
        Object.defineProperty(this, 'transport', {
            get: this.getTransport.bind(this),
            set: this.setTransport.bind(this)
        });
    this.setTransport(transport);
    var request_timeout = options.request_timeout || BASE_TIMEOUT;
    var ping_request_timeout = options.ping_request_timeout || request_timeout;
    var response_timeout = options.response_timeout || BASE_TIMEOUT;
    var duplicates_timeout = options.duplicates_timeout || BASE_TIMEOUT;
    var requestID = 0;
    var requests = new Mapper();
    var responses = new Mapper();
    var processedResponses = new Mapper();
    var message2Key = {};
    /**
     * Store the response to prevent to process duplicate request later
     */
    function storeResponse(message, id, dest) {
        var response = {
            message: message,
            /** Timeout to auto-clean old responses */
            timeout: setTimeout(function () {
                responses.remove(id, dest);
            }, response_timeout)
        };
        responses.set(response, id, dest);
    }
    ;
    /**
     * Store the response to ignore duplicated messages later
     */
    function storeProcessedResponse(ack, from) {
        var timeout = setTimeout(function () {
            processedResponses.remove(ack, from);
        }, duplicates_timeout);
        processedResponses.set(timeout, ack, from);
    }
    ;
    /**
     * Representation of a RPC request
     *
     * @class
     * @extends RpcNotification
     *
     * @constructor
     *
     * @param {String} method -method of the notification
     * @param params - parameters of the notification
     * @param {Integer} id - identifier of the request
     * @param [from] - source of the notification
     */
    function RpcRequest(method, params, id, from, transport) {
        RpcNotification.call(this, method, params);
        this.getTransport = function () {
            return transport;
        };
        this.setTransport = function (value) {
            transport = unifyTransport(value);
        };
        if (!defineProperty_IE8)
            Object.defineProperty(this, 'transport', {
                get: this.getTransport.bind(this),
                set: this.setTransport.bind(this)
            });
        var response = responses.get(id, from);
        /**
         * @constant {Boolean} duplicated
         */
        if (!(transport || self.getTransport())) {
            if (defineProperty_IE8)
                this.duplicated = Boolean(response);
            else
                Object.defineProperty(this, 'duplicated', {
                    value: Boolean(response)
                });
        }
        var responseMethod = responseMethods[method];
        this.pack = packer.pack.bind(packer, this, id);
        /**
         * Generate a response to this request
         *
         * @param {Error} [error]
         * @param {*} [result]
         *
         * @returns {string}
         */
        this.reply = function (error, result, transport) {
            // Fix optional parameters
            if (error instanceof Function || error && error.send instanceof Function) {
                if (result != undefined)
                    throw new SyntaxError("There can't be parameters after callback");
                transport = error;
                result = null;
                error = undefined;
            }
            else if (result instanceof Function
                || result && result.send instanceof Function) {
                if (transport != undefined)
                    throw new SyntaxError("There can't be parameters after callback");
                transport = result;
                result = null;
            }
            ;
            transport = unifyTransport(transport);
            // Duplicated request, remove old response timeout
            if (response)
                clearTimeout(response.timeout);
            if (from != undefined) {
                if (error)
                    error.dest = from;
                if (result)
                    result.dest = from;
            }
            ;
            var message;
            // New request or overriden one, create new response with provided data
            if (error || result != undefined) {
                if (self.peerID != undefined) {
                    if (error)
                        error.from = self.peerID;
                    else
                        result.from = self.peerID;
                }
                // Protocol indicates that responses has own request methods
                if (responseMethod) {
                    if (responseMethod.error == undefined && error)
                        message =
                            {
                                error: error
                            };
                    else {
                        var method = error
                            ? responseMethod.error
                            : responseMethod.response;
                        message =
                            {
                                method: method,
                                params: error || result
                            };
                    }
                }
                else
                    message =
                        {
                            error: error,
                            result: result
                        };
                message = packer.pack(message, id);
            }
            else if (response)
                message = response.message;
            else
                message = packer.pack({ result: null }, id);
            // Store the response to prevent to process a duplicated request later
            storeResponse(message, id, from);
            // Return the stored response so it can be directly send back
            transport = transport || this.getTransport() || self.getTransport();
            if (transport)
                return transport.send(message);
            return message;
        };
    }
    ;
    inherits(RpcRequest, RpcNotification);
    function cancel(message) {
        var key = message2Key[message];
        if (!key)
            return;
        delete message2Key[message];
        var request = requests.pop(key.id, key.dest);
        if (!request)
            return;
        clearTimeout(request.timeout);
        // Start duplicated responses timeout
        storeProcessedResponse(key.id, key.dest);
    }
    ;
    /**
     * Allow to cancel a request and don't wait for a response
     *
     * If `message` is not given, cancel all the request
     */
    this.cancel = function (message) {
        if (message)
            return cancel(message);
        for (var message in message2Key)
            cancel(message);
    };
    this.close = function () {
        // Prevent to receive new messages
        var transport = this.getTransport();
        if (transport && transport.close)
            transport.close();
        // Request & processed responses
        this.cancel();
        processedResponses.forEach(clearTimeout);
        // Responses
        responses.forEach(function (response) {
            clearTimeout(response.timeout);
        });
    };
    /**
     * Generates and encode a JsonRPC 2.0 message
     *
     * @param {String} method -method of the notification
     * @param params - parameters of the notification
     * @param [dest] - destination of the notification
     * @param {object} [transport] - transport where to send the message
     * @param [callback] - function called when a response to this request is
     *   received. If not defined, a notification will be send instead
     *
     * @returns {string} A raw JsonRPC 2.0 request or notification string
     */
    this.encode = function (method, params, dest, transport, callback) {
        // Fix optional parameters
        if (params instanceof Function) {
            if (dest != undefined)
                throw new SyntaxError("There can't be parameters after callback");
            callback = params;
            transport = undefined;
            dest = undefined;
            params = undefined;
        }
        else if (dest instanceof Function) {
            if (transport != undefined)
                throw new SyntaxError("There can't be parameters after callback");
            callback = dest;
            transport = undefined;
            dest = undefined;
        }
        else if (transport instanceof Function) {
            if (callback != undefined)
                throw new SyntaxError("There can't be parameters after callback");
            callback = transport;
            transport = undefined;
        }
        ;
        if (self.peerID != undefined) {
            params = params || {};
            params.from = self.peerID;
        }
        ;
        if (dest != undefined) {
            params = params || {};
            params.dest = dest;
        }
        ;
        // Encode message
        var message = {
            method: method,
            params: params
        };
        if (callback) {
            var id = requestID++;
            var retried = 0;
            message = packer.pack(message, id);
            function dispatchCallback(error, result) {
                self.cancel(message);
                callback(error, result);
            }
            ;
            var request = {
                message: message,
                callback: dispatchCallback,
                responseMethods: responseMethods[method] || {}
            };
            var encode_transport = unifyTransport(transport);
            function sendRequest(transport) {
                var rt = (method === 'ping' ? ping_request_timeout : request_timeout);
                request.timeout = setTimeout(timeout, rt * Math.pow(2, retried++));
                message2Key[message] = { id: id, dest: dest };
                requests.set(request, id, dest);
                transport = transport || encode_transport || self.getTransport();
                if (transport)
                    return transport.send(message);
                return message;
            }
            ;
            function retry(transport) {
                transport = unifyTransport(transport);
                console.warn(retried + ' retry for request message:', message);
                var timeout = processedResponses.pop(id, dest);
                clearTimeout(timeout);
                return sendRequest(transport);
            }
            ;
            function timeout() {
                if (retried < max_retries)
                    return retry(transport);
                var error = new Error('Request has timed out');
                error.request = message;
                error.retry = retry;
                dispatchCallback(error);
            }
            ;
            return sendRequest(transport);
        }
        ;
        // Return the packed message
        message = packer.pack(message);
        transport = transport || this.getTransport();
        if (transport)
            return transport.send(message);
        return message;
    };
    /**
     * Decode and process a JsonRPC 2.0 message
     *
     * @param {string} message - string with the content of the message
     *
     * @returns {RpcNotification|RpcRequest|undefined} - the representation of the
     *   notification or the request. If a response was processed, it will return
     *   `undefined` to notify that it was processed
     *
     * @throws {TypeError} - Message is not defined
     */
    this.decode = function (message, transport) {
        if (!message)
            throw new TypeError("Message is not defined");
        try {
            message = packer.unpack(message);
        }
        catch (e) {
            // Ignore invalid messages
            return console.debug(e, message);
        }
        ;
        var id = message.id;
        var ack = message.ack;
        var method = message.method;
        var params = message.params || {};
        var from = params.from;
        var dest = params.dest;
        // Ignore messages send by us
        if (self.peerID != undefined && from == self.peerID)
            return;
        // Notification
        if (id == undefined && ack == undefined) {
            var notification = new RpcNotification(method, params);
            if (self.emit('request', notification))
                return;
            return notification;
        }
        ;
        function processRequest() {
            // If we have a transport and it's a duplicated request, reply inmediatly
            transport = unifyTransport(transport) || self.getTransport();
            if (transport) {
                var response = responses.get(id, from);
                if (response)
                    return transport.send(response.message);
            }
            ;
            var idAck = (id != undefined) ? id : ack;
            var request = new RpcRequest(method, params, idAck, from, transport);
            if (self.emit('request', request))
                return;
            return request;
        }
        ;
        function processResponse(request, error, result) {
            request.callback(error, result);
        }
        ;
        function duplicatedResponse(timeout) {
            console.warn("Response already processed", message);
            // Update duplicated responses timeout
            clearTimeout(timeout);
            storeProcessedResponse(ack, from);
        }
        ;
        // Request, or response with own method
        if (method) {
            // Check if it's a response with own method
            if (dest == undefined || dest == self.peerID) {
                var request = requests.get(ack, from);
                if (request) {
                    var responseMethods = request.responseMethods;
                    if (method == responseMethods.error)
                        return processResponse(request, params);
                    if (method == responseMethods.response)
                        return processResponse(request, null, params);
                    return processRequest();
                }
                var processed = processedResponses.get(ack, from);
                if (processed)
                    return duplicatedResponse(processed);
            }
            // Request
            return processRequest();
        }
        ;
        var error = message.error;
        var result = message.result;
        // Ignore responses not send to us
        if (error && error.dest && error.dest != self.peerID)
            return;
        if (result && result.dest && result.dest != self.peerID)
            return;
        // Response
        var request = requests.get(ack, from);
        if (!request) {
            var processed = processedResponses.get(ack, from);
            if (processed)
                return duplicatedResponse(processed);
            return console.warn("No callback was defined for this message", message);
        }
        ;
        // Process response
        processResponse(request, error, result);
    };
}
;
inherits(RpcBuilder, EventEmitter);
RpcBuilder.RpcNotification = RpcNotification;
module.exports = RpcBuilder;
var clients = __webpack_require__("../../../../openvidu-browser/lib/KurentoUtils/kurento-jsonrpc/clients/index.js");
var transports = __webpack_require__("../../../../openvidu-browser/lib/KurentoUtils/kurento-jsonrpc/clients/transports/index.js");
RpcBuilder.clients = clients;
RpcBuilder.clients.transports = transports;
RpcBuilder.packers = packers;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/KurentoUtils/kurento-jsonrpc/packers/JsonRPC.js":
/***/ (function(module, exports) {

/**
 * JsonRPC 2.0 packer
 */
/**
 * Pack a JsonRPC 2.0 message
 *
 * @param {Object} message - object to be packaged. It requires to have all the
 *   fields needed by the JsonRPC 2.0 message that it's going to be generated
 *
 * @return {String} - the stringified JsonRPC 2.0 message
 */
function pack(message, id) {
    var result = {
        jsonrpc: "2.0"
    };
    // Request
    if (message.method) {
        result.method = message.method;
        if (message.params)
            result.params = message.params;
        // Request is a notification
        if (id != undefined)
            result.id = id;
    }
    else if (id != undefined) {
        if (message.error) {
            if (message.result !== undefined)
                throw new TypeError("Both result and error are defined");
            result.error = message.error;
        }
        else if (message.result !== undefined)
            result.result = message.result;
        else
            throw new TypeError("No result or error is defined");
        result.id = id;
    }
    ;
    return JSON.stringify(result);
}
;
/**
 * Unpack a JsonRPC 2.0 message
 *
 * @param {String} message - string with the content of the JsonRPC 2.0 message
 *
 * @throws {TypeError} - Invalid JsonRPC version
 *
 * @return {Object} - object filled with the JsonRPC 2.0 message content
 */
function unpack(message) {
    var result = message;
    if (typeof message === 'string' || message instanceof String) {
        result = JSON.parse(message);
    }
    // Check if it's a valid message
    var version = result.jsonrpc;
    if (version !== '2.0')
        throw new TypeError("Invalid JsonRPC version '" + version + "': " + message);
    // Response
    if (result.method == undefined) {
        if (result.id == undefined)
            throw new TypeError("Invalid message: " + message);
        var result_defined = result.result !== undefined;
        var error_defined = result.error !== undefined;
        // Check only result or error is defined, not both or none
        if (result_defined && error_defined)
            throw new TypeError("Both result and error are defined: " + message);
        if (!result_defined && !error_defined)
            throw new TypeError("No result or error is defined: " + message);
        result.ack = result.id;
        delete result.id;
    }
    // Return unpacked message
    return result;
}
;
exports.pack = pack;
exports.unpack = unpack;
//# sourceMappingURL=JsonRPC.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/KurentoUtils/kurento-jsonrpc/packers/XmlRPC.js":
/***/ (function(module, exports) {

function pack(message) {
    throw new TypeError("Not yet implemented");
}
;
function unpack(message) {
    throw new TypeError("Not yet implemented");
}
;
exports.pack = pack;
exports.unpack = unpack;
//# sourceMappingURL=XmlRPC.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/KurentoUtils/kurento-jsonrpc/packers/index.js":
/***/ (function(module, exports, __webpack_require__) {

var JsonRPC = __webpack_require__("../../../../openvidu-browser/lib/KurentoUtils/kurento-jsonrpc/packers/JsonRPC.js");
var XmlRPC = __webpack_require__("../../../../openvidu-browser/lib/KurentoUtils/kurento-jsonrpc/packers/XmlRPC.js");
exports.JsonRPC = JsonRPC;
exports.XmlRPC = XmlRPC;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/KurentoUtils/kurento-utils-js/WebRtcPeer.js":
/***/ (function(module, exports, __webpack_require__) {

/*
 * (C) Copyright 2014-2015 Kurento (http://kurento.org/)
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
 */
var freeice = __webpack_require__("../../../../openvidu-browser/node_modules/freeice/index.js");
var inherits = __webpack_require__("../../../../openvidu-browser/node_modules/inherits/inherits_browser.js");
var UAParser = __webpack_require__("../../../../openvidu-browser/node_modules/ua-parser-js/src/ua-parser.js");
var uuid = __webpack_require__("../../../../openvidu-browser/node_modules/uuid/index.js");
var hark = __webpack_require__("../../../../openvidu-browser/node_modules/hark/hark.js");
var EventEmitter = __webpack_require__("./node_modules/events/events.js").EventEmitter;
var recursive = __webpack_require__("../../../../openvidu-browser/node_modules/merge/merge.js").recursive.bind(undefined, true);
var sdpTranslator = __webpack_require__("../../../../openvidu-browser/node_modules/sdp-translator/lib/index.js");
var logger = window.Logger || console;
// var gUM = navigator.mediaDevices.getUserMedia || function (constraints) {
//   return new Promise(navigator.getUserMedia(constraints, function (stream) {
//     videoStream = stream
//     start()
//   }).eror(callback));
// }
/*try {
  require('kurento-browser-extensions')
} catch (error) {
  if (typeof getScreenConstraints === 'undefined') {
    logger.warn('screen sharing is not available')

    getScreenConstraints = function getScreenConstraints(sendSource, callback) {
      callback(new Error("This library is not enabled for screen sharing"))
    }
  }
}*/
var MEDIA_CONSTRAINTS = {
    audio: true,
    video: {
        width: 640,
        framerate: 15
    }
};
// Somehow, the UAParser constructor gets an empty window object.
// We need to pass the user agent string in order to get information
var ua = (window && window.navigator) ? window.navigator.userAgent : '';
var parser = new UAParser(ua);
var browser = parser.getBrowser();
var usePlanB = false;
if (browser.name === 'Chrome' || browser.name === 'Chromium') {
    logger.debug(browser.name + ": using SDP PlanB");
    usePlanB = true;
}
function noop(error) {
    if (error)
        logger.error(error);
}
function trackStop(track) {
    track.stop && track.stop();
}
function streamStop(stream) {
    stream.getTracks().forEach(trackStop);
}
/**
 * Returns a string representation of a SessionDescription object.
 */
var dumpSDP = function (description) {
    if (typeof description === 'undefined' || description === null) {
        return '';
    }
    return 'type: ' + description.type + '\r\n' + description.sdp;
};
function bufferizeCandidates(pc, onerror) {
    var candidatesQueue = [];
    pc.addEventListener('signalingstatechange', function () {
        if (this.signalingState === 'stable') {
            while (candidatesQueue.length) {
                var entry = candidatesQueue.shift();
                this.addIceCandidate(entry.candidate, entry.callback, entry.callback);
            }
        }
    });
    return function (candidate, callback) {
        callback = callback || onerror;
        switch (pc.signalingState) {
            case 'closed':
                callback(new Error('PeerConnection object is closed'));
                break;
            case 'stable':
                if (pc.remoteDescription) {
                    pc.addIceCandidate(candidate, callback, callback);
                }
                break;
            default:
                candidatesQueue.push({
                    candidate: candidate,
                    callback: callback
                });
        }
    };
}
/* Simulcast utilities */
function removeFIDFromOffer(sdp) {
    var n = sdp.indexOf("a=ssrc-group:FID");
    if (n > 0) {
        return sdp.slice(0, n);
    }
    else {
        return sdp;
    }
}
function getSimulcastInfo(videoStream) {
    var videoTracks = videoStream.getVideoTracks();
    if (!videoTracks.length) {
        logger.warn('No video tracks available in the video stream');
        return '';
    }
    var lines = [
        'a=x-google-flag:conference',
        'a=ssrc-group:SIM 1 2 3',
        'a=ssrc:1 cname:localVideo',
        'a=ssrc:1 msid:' + videoStream.id + ' ' + videoTracks[0].id,
        'a=ssrc:1 mslabel:' + videoStream.id,
        'a=ssrc:1 label:' + videoTracks[0].id,
        'a=ssrc:2 cname:localVideo',
        'a=ssrc:2 msid:' + videoStream.id + ' ' + videoTracks[0].id,
        'a=ssrc:2 mslabel:' + videoStream.id,
        'a=ssrc:2 label:' + videoTracks[0].id,
        'a=ssrc:3 cname:localVideo',
        'a=ssrc:3 msid:' + videoStream.id + ' ' + videoTracks[0].id,
        'a=ssrc:3 mslabel:' + videoStream.id,
        'a=ssrc:3 label:' + videoTracks[0].id
    ];
    lines.push('');
    return lines.join('\n');
}
/**
 * Wrapper object of an RTCPeerConnection. This object is aimed to simplify the
 * development of WebRTC-based applications.
 *
 * @constructor module:kurentoUtils.WebRtcPeer
 *
 * @param {String} mode Mode in which the PeerConnection will be configured.
 *  Valid values are: 'recv', 'send', and 'sendRecv'
 * @param localVideo Video tag for the local stream
 * @param remoteVideo Video tag for the remote stream
 * @param {MediaStream} videoStream Stream to be used as primary source
 *  (typically video and audio, or only video if combined with audioStream) for
 *  localVideo and to be added as stream to the RTCPeerConnection
 * @param {MediaStream} audioStream Stream to be used as second source
 *  (typically for audio) for localVideo and to be added as stream to the
 *  RTCPeerConnection
 */
function WebRtcPeer(mode, options, callback) {
    if (!(this instanceof WebRtcPeer)) {
        return new WebRtcPeer(mode, options, callback);
    }
    WebRtcPeer.super_.call(this);
    if (options instanceof Function) {
        callback = options;
        options = undefined;
    }
    options = options || {};
    callback = (callback || noop).bind(this);
    var self = this;
    var localVideo = options.localVideo;
    var remoteVideo = options.remoteVideo;
    var videoStream = options.videoStream;
    var audioStream = options.audioStream;
    var mediaConstraints = options.mediaConstraints;
    var connectionConstraints = options.connectionConstraints;
    var pc = options.peerConnection;
    var sendSource = options.sendSource || 'webcam';
    var dataChannelConfig = options.dataChannelConfig;
    var useDataChannels = options.dataChannels || false;
    var dataChannel;
    var guid = uuid.v4();
    var configuration = recursive({
        iceServers: freeice()
    }, options.configuration);
    var onicecandidate = options.onicecandidate;
    if (onicecandidate)
        this.on('icecandidate', onicecandidate);
    var oncandidategatheringdone = options.oncandidategatheringdone;
    if (oncandidategatheringdone) {
        this.on('candidategatheringdone', oncandidategatheringdone);
    }
    var simulcast = options.simulcast;
    var multistream = options.multistream;
    var interop = new sdpTranslator.Interop();
    var candidatesQueueOut = [];
    var candidategatheringdone = false;
    Object.defineProperties(this, {
        'peerConnection': {
            get: function () {
                return pc;
            }
        },
        'id': {
            value: options.id || guid,
            writable: false
        },
        'remoteVideo': {
            get: function () {
                return remoteVideo;
            }
        },
        'localVideo': {
            get: function () {
                return localVideo;
            }
        },
        'dataChannel': {
            get: function () {
                return dataChannel;
            }
        },
        /**
         * @member {(external:ImageData|undefined)} currentFrame
         */
        'currentFrame': {
            get: function () {
                // [ToDo] Find solution when we have a remote stream but we didn't set
                // a remoteVideo tag
                if (!remoteVideo)
                    return;
                if (remoteVideo.readyState < remoteVideo.HAVE_CURRENT_DATA)
                    throw new Error('No video stream data available');
                var canvas = document.createElement('canvas');
                canvas.width = remoteVideo.videoWidth;
                canvas.height = remoteVideo.videoHeight;
                canvas.getContext('2d').drawImage(remoteVideo, 0, 0);
                return canvas;
            }
        }
    });
    // Init PeerConnection
    if (!pc) {
        pc = new RTCPeerConnection(configuration);
        if (useDataChannels && !dataChannel) {
            var dcId = 'WebRtcPeer-' + self.id;
            var dcOptions = undefined;
            if (dataChannelConfig) {
                dcId = dataChannelConfig.id || dcId;
                dcOptions = dataChannelConfig.options;
            }
            dataChannel = pc.createDataChannel(dcId, dcOptions);
            if (dataChannelConfig) {
                dataChannel.onopen = dataChannelConfig.onopen;
                dataChannel.onclose = dataChannelConfig.onclose;
                dataChannel.onmessage = dataChannelConfig.onmessage;
                dataChannel.onbufferedamountlow = dataChannelConfig.onbufferedamountlow;
                dataChannel.onerror = dataChannelConfig.onerror || noop;
            }
        }
    }
    pc.addEventListener('icecandidate', function (event) {
        var candidate = event.candidate;
        if (EventEmitter.listenerCount(self, 'icecandidate') ||
            EventEmitter.listenerCount(self, 'candidategatheringdone')) {
            if (candidate) {
                var cand;
                if (multistream && usePlanB) {
                    cand = interop.candidateToUnifiedPlan(candidate);
                }
                else {
                    cand = candidate;
                }
                self.emit('icecandidate', cand);
                candidategatheringdone = false;
            }
            else if (!candidategatheringdone) {
                self.emit('candidategatheringdone');
                candidategatheringdone = true;
            }
        }
        else if (!candidategatheringdone) {
            // Not listening to 'icecandidate' or 'candidategatheringdone' events, queue
            // the candidate until one of them is listened
            candidatesQueueOut.push(candidate);
            if (!candidate)
                candidategatheringdone = true;
        }
    });
    pc.ontrack = options.onaddstream;
    pc.onnegotiationneeded = options.onnegotiationneeded;
    this.on('newListener', function (event, listener) {
        if (event === 'icecandidate' || event === 'candidategatheringdone') {
            while (candidatesQueueOut.length) {
                var candidate = candidatesQueueOut.shift();
                if (!candidate === (event === 'candidategatheringdone')) {
                    listener(candidate);
                }
            }
        }
    });
    var addIceCandidate = bufferizeCandidates(pc);
    /**
     * Callback function invoked when an ICE candidate is received. Developers are
     * expected to invoke this function in order to complete the SDP negotiation.
     *
     * @function module:kurentoUtils.WebRtcPeer.prototype.addIceCandidate
     *
     * @param iceCandidate - Literal object with the ICE candidate description
     * @param callback - Called when the ICE candidate has been added.
     */
    this.addIceCandidate = function (iceCandidate, callback) {
        var candidate;
        if (multistream && usePlanB) {
            candidate = interop.candidateToPlanB(iceCandidate);
        }
        else {
            candidate = new RTCIceCandidate(iceCandidate);
        }
        logger.debug('Remote ICE candidate received', iceCandidate);
        callback = (callback || noop).bind(this);
        addIceCandidate(candidate, callback);
    };
    this.generateOffer = function (callback) {
        callback = callback.bind(this);
        var offerAudio = true;
        var offerVideo = true;
        // Constraints must have both blocks
        if (mediaConstraints) {
            offerAudio = (typeof mediaConstraints.audio === 'boolean') ?
                mediaConstraints.audio : true;
            offerVideo = (typeof mediaConstraints.video === 'boolean') ?
                mediaConstraints.video : true;
        }
        var browserDependantConstraints = {
            offerToReceiveAudio: (mode !== 'sendonly' && offerAudio),
            offerToReceiveVideo: (mode !== 'sendonly' && offerVideo)
        };
        //FIXME: clarify possible constraints passed to createOffer()
        /*var constraints = recursive(browserDependantConstraints,
          connectionConstraints)*/
        var constraints = browserDependantConstraints;
        logger.debug('constraints: ' + JSON.stringify(constraints));
        pc.createOffer(constraints).then(function (offer) {
            logger.debug('Created SDP offer');
            offer = mangleSdpToAddSimulcast(offer);
            return pc.setLocalDescription(offer);
        }).then(function () {
            var localDescription = pc.localDescription;
            logger.debug('Local description set', localDescription.sdp);
            if (multistream && usePlanB) {
                localDescription = interop.toUnifiedPlan(localDescription);
                logger.debug('offer::origPlanB->UnifiedPlan', dumpSDP(localDescription));
            }
            callback(null, localDescription.sdp, self.processAnswer.bind(self));
        }).catch(callback);
    };
    this.getLocalSessionDescriptor = function () {
        return pc.localDescription;
    };
    this.getRemoteSessionDescriptor = function () {
        return pc.remoteDescription;
    };
    function setRemoteVideo() {
        if (remoteVideo) {
            var stream = pc.getRemoteStreams()[0];
            var url = stream ? URL.createObjectURL(stream) : '';
            remoteVideo.pause();
            remoteVideo.src = url;
            remoteVideo.load();
            logger.debug('Remote URL:', url);
        }
    }
    this.showLocalVideo = function () {
        localVideo.src = URL.createObjectURL(videoStream);
        localVideo.muted = true;
    };
    this.send = function (data) {
        if (dataChannel && dataChannel.readyState === 'open') {
            dataChannel.send(data);
        }
        else {
            logger.warn('Trying to send data over a non-existing or closed data channel');
        }
    };
    /**
     * Callback function invoked when a SDP answer is received. Developers are
     * expected to invoke this function in order to complete the SDP negotiation.
     *
     * @function module:kurentoUtils.WebRtcPeer.prototype.processAnswer
     *
     * @param sdpAnswer - Description of sdpAnswer
     * @param callback -
     *            Invoked after the SDP answer is processed, or there is an error.
     */
    this.processAnswer = function (sdpAnswer, callback) {
        callback = (callback || noop).bind(this);
        var answer = new RTCSessionDescription({
            type: 'answer',
            sdp: sdpAnswer
        });
        if (multistream && usePlanB) {
            var planBAnswer = interop.toPlanB(answer);
            logger.debug('asnwer::planB', dumpSDP(planBAnswer));
            answer = planBAnswer;
        }
        logger.debug('SDP answer received, setting remote description');
        if (pc.signalingState === 'closed') {
            return callback('PeerConnection is closed');
        }
        pc.setRemoteDescription(answer, function () {
            setRemoteVideo();
            callback();
        }, callback);
    };
    /**
     * Callback function invoked when a SDP offer is received. Developers are
     * expected to invoke this function in order to complete the SDP negotiation.
     *
     * @function module:kurentoUtils.WebRtcPeer.prototype.processOffer
     *
     * @param sdpOffer - Description of sdpOffer
     * @param callback - Called when the remote description has been set
     *  successfully.
     */
    this.processOffer = function (sdpOffer, callback) {
        callback = callback.bind(this);
        var offer = new RTCSessionDescription({
            type: 'offer',
            sdp: sdpOffer
        });
        if (multistream && usePlanB) {
            var planBOffer = interop.toPlanB(offer);
            logger.debug('offer::planB', dumpSDP(planBOffer));
            offer = planBOffer;
        }
        logger.debug('SDP offer received, setting remote description');
        if (pc.signalingState === 'closed') {
            return callback('PeerConnection is closed');
        }
        pc.setRemoteDescription(offer).then(function () {
            return setRemoteVideo();
        }).then(function () {
            return pc.createAnswer();
        }).then(function (answer) {
            answer = mangleSdpToAddSimulcast(answer);
            logger.debug('Created SDP answer');
            return pc.setLocalDescription(answer);
        }).then(function () {
            var localDescription = pc.localDescription;
            if (multistream && usePlanB) {
                localDescription = interop.toUnifiedPlan(localDescription);
                logger.debug('answer::origPlanB->UnifiedPlan', dumpSDP(localDescription));
            }
            logger.debug('Local description set', localDescription.sdp);
            callback(null, localDescription.sdp);
        }).catch(callback);
    };
    function mangleSdpToAddSimulcast(answer) {
        if (simulcast) {
            if (browser.name === 'Chrome' || browser.name === 'Chromium') {
                logger.debug('Adding multicast info');
                answer = new RTCSessionDescription({
                    'type': answer.type,
                    'sdp': removeFIDFromOffer(answer.sdp) + getSimulcastInfo(videoStream)
                });
            }
            else {
                logger.warn('Simulcast is only available in Chrome browser.');
            }
        }
        return answer;
    }
    /**
     * This function creates the RTCPeerConnection object taking into account the
     * properties received in the constructor. It starts the SDP negotiation
     * process: generates the SDP offer and invokes the onsdpoffer callback. This
     * callback is expected to send the SDP offer, in order to obtain an SDP
     * answer from another peer.
     */
    function start() {
        if (pc.signalingState === 'closed') {
            callback('The peer connection object is in "closed" state. This is most likely due to an invocation of the dispose method before accepting in the dialogue');
        }
        if (videoStream && localVideo) {
            self.showLocalVideo();
        }
        if (videoStream) {
            pc.addStream(videoStream);
        }
        if (audioStream) {
            pc.addStream(audioStream);
        }
        // [Hack] https://code.google.com/p/chromium/issues/detail?id=443558
        var browser = parser.getBrowser();
        if (mode === 'sendonly' &&
            (browser.name === 'Chrome' || browser.name === 'Chromium') &&
            browser.major === 39) {
            mode = 'sendrecv';
        }
        callback();
    }
    if (mode !== 'recvonly' && !videoStream && !audioStream) {
        function getMedia(constraints) {
            if (constraints === undefined) {
                constraints = MEDIA_CONSTRAINTS;
            }
            navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
                videoStream = stream;
                start();
            }).catch(callback);
        }
        if (sendSource === 'webcam') {
            getMedia(mediaConstraints);
        }
        else {
            getScreenConstraints(sendSource, function (error, constraints_) {
                if (error)
                    return callback(error);
                constraints = [mediaConstraints];
                constraints.unshift(constraints_);
                getMedia(recursive.apply(undefined, constraints));
            }, guid);
        }
    }
    else {
        setTimeout(start, 0);
    }
    this.on('_dispose', function () {
        if (localVideo) {
            localVideo.pause();
            localVideo.src = '';
            localVideo.load();
            //Unmute local video in case the video tag is later used for remote video
            localVideo.muted = false;
        }
        if (remoteVideo) {
            remoteVideo.pause();
            remoteVideo.src = '';
            remoteVideo.load();
        }
        self.removeAllListeners();
        if (window.cancelChooseDesktopMedia !== undefined) {
            window.cancelChooseDesktopMedia(guid);
        }
    });
}
inherits(WebRtcPeer, EventEmitter);
function createEnableDescriptor(type) {
    var method = 'get' + type + 'Tracks';
    return {
        enumerable: true,
        get: function () {
            // [ToDo] Should return undefined if not all tracks have the same value?
            if (!this.peerConnection)
                return;
            var streams = this.peerConnection.getLocalStreams();
            if (!streams.length)
                return;
            for (var i = 0, stream; stream = streams[i]; i++) {
                var tracks = stream[method]();
                for (var j = 0, track; track = tracks[j]; j++)
                    if (!track.enabled)
                        return false;
            }
            return true;
        },
        set: function (value) {
            function trackSetEnable(track) {
                track.enabled = value;
            }
            this.peerConnection.getLocalStreams().forEach(function (stream) {
                stream[method]().forEach(trackSetEnable);
            });
        }
    };
}
Object.defineProperties(WebRtcPeer.prototype, {
    'enabled': {
        enumerable: true,
        get: function () {
            return this.audioEnabled && this.videoEnabled;
        },
        set: function (value) {
            this.audioEnabled = this.videoEnabled = value;
        }
    },
    'audioEnabled': createEnableDescriptor('Audio'),
    'videoEnabled': createEnableDescriptor('Video')
});
WebRtcPeer.prototype.getLocalStream = function (index) {
    if (this.peerConnection) {
        return this.peerConnection.getLocalStreams()[index || 0];
    }
};
WebRtcPeer.prototype.getRemoteStream = function (index) {
    if (this.peerConnection) {
        return this.peerConnection.getRemoteStreams()[index || 0];
    }
};
/**
 * @description This method frees the resources used by WebRtcPeer.
 *
 * @function module:kurentoUtils.WebRtcPeer.prototype.dispose
 */
WebRtcPeer.prototype.dispose = function () {
    logger.debug('Disposing WebRtcPeer');
    var pc = this.peerConnection;
    var dc = this.dataChannel;
    try {
        if (dc) {
            if (dc.signalingState === 'closed')
                return;
            dc.close();
        }
        if (pc) {
            if (pc.signalingState === 'closed')
                return;
            pc.getLocalStreams().forEach(streamStop);
            // FIXME This is not yet implemented in firefox
            // if(videoStream) pc.removeStream(videoStream);
            // if(audioStream) pc.removeStream(audioStream);
            pc.close();
        }
    }
    catch (err) {
        logger.warn('Exception disposing webrtc peer ' + err);
    }
    this.emit('_dispose');
};
//
// Specialized child classes
//
function WebRtcPeerRecvonly(options, callback) {
    if (!(this instanceof WebRtcPeerRecvonly)) {
        return new WebRtcPeerRecvonly(options, callback);
    }
    WebRtcPeerRecvonly.super_.call(this, 'recvonly', options, callback);
}
inherits(WebRtcPeerRecvonly, WebRtcPeer);
function WebRtcPeerSendonly(options, callback) {
    if (!(this instanceof WebRtcPeerSendonly)) {
        return new WebRtcPeerSendonly(options, callback);
    }
    WebRtcPeerSendonly.super_.call(this, 'sendonly', options, callback);
}
inherits(WebRtcPeerSendonly, WebRtcPeer);
function WebRtcPeerSendrecv(options, callback) {
    if (!(this instanceof WebRtcPeerSendrecv)) {
        return new WebRtcPeerSendrecv(options, callback);
    }
    WebRtcPeerSendrecv.super_.call(this, 'sendrecv', options, callback);
}
inherits(WebRtcPeerSendrecv, WebRtcPeer);
function harkUtils(stream, options) {
    return hark(stream, options);
}
exports.bufferizeCandidates = bufferizeCandidates;
exports.WebRtcPeerRecvonly = WebRtcPeerRecvonly;
exports.WebRtcPeerSendonly = WebRtcPeerSendonly;
exports.WebRtcPeerSendrecv = WebRtcPeerSendrecv;
exports.hark = harkUtils;
//# sourceMappingURL=WebRtcPeer.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/KurentoUtils/kurento-utils-js/index.js":
/***/ (function(module, exports, __webpack_require__) {

/*
 * (C) Copyright 2014 Kurento (http://kurento.org/)
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
/**
 * This module contains a set of reusable components that have been found useful
 * during the development of the WebRTC applications with Kurento.
 *
 * @module kurentoUtils
 *
 * @copyright 2014 Kurento (http://kurento.org/)
 * @license ALv2
 */
var WebRtcPeer = __webpack_require__("../../../../openvidu-browser/lib/KurentoUtils/kurento-utils-js/WebRtcPeer.js");
exports.WebRtcPeer = WebRtcPeer;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenVidu/OpenVidu.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

exports.__esModule = true;
/*
 * (C) Copyright 2017 OpenVidu (http://openvidu.io/)
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
var OpenViduInternal_1 = __webpack_require__("../../../../openvidu-browser/lib/OpenViduInternal/OpenViduInternal.js");
var Session_1 = __webpack_require__("../../../../openvidu-browser/lib/OpenVidu/Session.js");
var Publisher_1 = __webpack_require__("../../../../openvidu-browser/lib/OpenVidu/Publisher.js");
var OpenViduError_1 = __webpack_require__("../../../../openvidu-browser/lib/OpenViduInternal/OpenViduError.js");
var LocalRecorder_1 = __webpack_require__("../../../../openvidu-browser/lib/OpenViduInternal/LocalRecorder.js");
var adapter = __webpack_require__("../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/adapter_core.js");
var screenSharingAuto = __webpack_require__("../../../../openvidu-browser/lib/ScreenSharing/Screen-Capturing-Auto.js");
if (window) {
    window["adapter"] = adapter;
}
var OpenVidu = /** @class */ (function () {
    function OpenVidu() {
        this.openVidu = new OpenViduInternal_1.OpenViduInternal();
        console.info("'OpenVidu' initialized");
    }
    ;
    OpenVidu.prototype.initSession = function (param1, param2) {
        if (this.checkSystemRequirements()) {
            if (typeof param2 == "string") {
                return new Session_1.Session(this.openVidu.initSession(param2), this);
            }
            else {
                return new Session_1.Session(this.openVidu.initSession(param1), this);
            }
        }
        else {
            alert("Browser not supported");
        }
    };
    OpenVidu.prototype.initPublisher = function (parentId, cameraOptions, callback) {
        if (this.checkSystemRequirements()) {
            var publisher_1;
            if (cameraOptions != null) {
                cameraOptions.audio = cameraOptions.audio != null ? cameraOptions.audio : true;
                cameraOptions.video = cameraOptions.video != null ? cameraOptions.video : true;
                if (!cameraOptions.screen) {
                    // Webcam and/or microphone is being requested
                    var cameraOptionsAux = {
                        sendAudio: cameraOptions.audio != null ? cameraOptions.audio : true,
                        sendVideo: cameraOptions.video != null ? cameraOptions.video : true,
                        activeAudio: cameraOptions.audioActive != null ? cameraOptions.audioActive : true,
                        activeVideo: cameraOptions.videoActive != null ? cameraOptions.videoActive : true,
                        dataChannel: true,
                        mediaConstraints: this.openVidu.generateMediaConstraints(cameraOptions)
                    };
                    cameraOptions = cameraOptionsAux;
                    publisher_1 = new Publisher_1.Publisher(this.openVidu.initPublisherTagged(parentId, cameraOptions, true, callback), parentId, false);
                    console.info("'Publisher' initialized");
                    return publisher_1;
                }
                else {
                    publisher_1 = new Publisher_1.Publisher(this.openVidu.initPublisherScreen(parentId, true, callback), parentId, true);
                    if (adapter.browserDetails.browser === 'firefox' && adapter.browserDetails.version >= 52) {
                        screenSharingAuto.getScreenId(function (error, sourceId, screenConstraints) {
                            cameraOptions = {
                                sendAudio: cameraOptions.audio,
                                sendVideo: cameraOptions.video,
                                activeAudio: cameraOptions.audioActive != null ? cameraOptions.audioActive : true,
                                activeVideo: cameraOptions.videoActive != null ? cameraOptions.videoActive : true,
                                dataChannel: true,
                                mediaConstraints: {
                                    video: screenConstraints.video,
                                    audio: false
                                }
                            };
                            publisher_1.stream.configureScreenOptions(cameraOptions);
                            console.info("'Publisher' initialized");
                            publisher_1.stream.ee.emitEvent('can-request-screen');
                        });
                        return publisher_1;
                    }
                    else if (adapter.browserDetails.browser === 'chrome') {
                        // Screen is being requested
                        /*screenSharing.isChromeExtensionAvailable((availability) => {
                            switch (availability) {
                                case 'available':
                                    console.warn('EXTENSION AVAILABLE!!!');
                                    screenSharing.getScreenConstraints((error, screenConstraints) => {
                                        if (!error) {
                                            console.warn(screenConstraints);
                                        }
                                    });
                                    break;
                                case 'unavailable':
                                    console.warn('EXTENSION NOT AVAILABLE!!!');
                                    break;
                                case 'isFirefox':
                                    console.warn('IT IS FIREFOX!!!');
                                    screenSharing.getScreenConstraints((error, screenConstraints) => {
                                        if (!error) {
                                            console.warn(screenConstraints);
                                        }
                                    });
                                    break;
                            }
                        });*/
                        screenSharingAuto.getScreenId(function (error, sourceId, screenConstraints) {
                            if (error === 'not-installed') {
                                var error_1 = new OpenViduError_1.OpenViduError("SCREEN_EXTENSION_NOT_INSTALLED" /* SCREEN_EXTENSION_NOT_INSTALLED */, 'https://chrome.google.com/webstore/detail/screen-capturing/ajhifddimkapgcifgcodmmfdlknahffk');
                                console.error(error_1);
                                if (callback)
                                    callback(error_1);
                                return;
                            }
                            else if (error === 'permission-denied') {
                                var error_2 = new OpenViduError_1.OpenViduError("SCREEN_CAPTURE_DENIED" /* SCREEN_CAPTURE_DENIED */, 'You must allow access to one window of your desktop');
                                console.error(error_2);
                                if (callback)
                                    callback(error_2);
                                return;
                            }
                            cameraOptions = {
                                sendAudio: cameraOptions.audio != null ? cameraOptions.audio : true,
                                sendVideo: cameraOptions.video != null ? cameraOptions.video : true,
                                activeAudio: cameraOptions.audioActive != null ? cameraOptions.audioActive : true,
                                activeVideo: cameraOptions.videoActive != null ? cameraOptions.videoActive : true,
                                dataChannel: true,
                                mediaConstraints: {
                                    video: screenConstraints.video,
                                    audio: false
                                }
                            };
                            publisher_1.stream.configureScreenOptions(cameraOptions);
                            publisher_1.stream.ee.emitEvent('can-request-screen');
                        }, function (error) {
                            console.error('getScreenId error', error);
                            return;
                        });
                        console.info("'Publisher' initialized");
                        return publisher_1;
                    }
                    else {
                        console.error('Screen sharing not supported on ' + adapter.browserDetails.browser);
                    }
                }
            }
            else {
                cameraOptions = {
                    sendAudio: true,
                    sendVideo: true,
                    activeAudio: true,
                    activeVideo: true,
                    dataChannel: true,
                    mediaConstraints: {
                        audio: true,
                        video: { width: { ideal: 1280 } }
                    }
                };
                publisher_1 = new Publisher_1.Publisher(this.openVidu.initPublisherTagged(parentId, cameraOptions, true, callback), parentId, false);
                console.info("'Publisher' initialized");
                return publisher_1;
            }
        }
        else {
            alert("Browser not supported");
        }
    };
    OpenVidu.prototype.reinitPublisher = function (publisher) {
        if (publisher.stream.typeOfVideo !== 'SCREEN') {
            publisher = new Publisher_1.Publisher(this.openVidu.initPublisherTagged(publisher.stream.getParentId(), publisher.stream.outboundOptions, false), publisher.stream.getParentId(), false);
            console.info("'Publisher' initialized");
            return publisher;
        }
        else {
            publisher = new Publisher_1.Publisher(this.openVidu.initPublisherScreen(publisher.stream.getParentId(), false), publisher.stream.getParentId(), true);
            if (adapter.browserDetails.browser === 'firefox' && adapter.browserDetails.version >= 52) {
                screenSharingAuto.getScreenId(function (error, sourceId, screenConstraints) {
                    publisher.stream.outboundOptions.mediaConstraints.video = screenConstraints.video;
                    publisher.stream.configureScreenOptions(publisher.stream.outboundOptions);
                    console.info("'Publisher' initialized");
                    publisher.stream.ee.emitEvent('can-request-screen');
                });
                return publisher;
            }
            else if (adapter.browserDetails.browser === 'chrome') {
                screenSharingAuto.getScreenId(function (error, sourceId, screenConstraints) {
                    if (error === 'not-installed') {
                        var error_3 = new OpenViduError_1.OpenViduError("SCREEN_EXTENSION_NOT_INSTALLED" /* SCREEN_EXTENSION_NOT_INSTALLED */, 'https://chrome.google.com/webstore/detail/screen-capturing/ajhifddimkapgcifgcodmmfdlknahffk');
                        console.error(error_3);
                        return;
                    }
                    else if (error === 'permission-denied') {
                        var error_4 = new OpenViduError_1.OpenViduError("SCREEN_CAPTURE_DENIED" /* SCREEN_CAPTURE_DENIED */, 'You must allow access to one window of your desktop');
                        console.error(error_4);
                        return;
                    }
                    publisher.stream.outboundOptions.mediaConstraints.video = screenConstraints.video;
                    publisher.stream.configureScreenOptions(publisher.stream.outboundOptions);
                    publisher.stream.ee.emitEvent('can-request-screen');
                }, function (error) {
                    console.error('getScreenId error', error);
                    return;
                });
                console.info("'Publisher' initialized");
                return publisher;
            }
            else {
                console.error('Screen sharing not supported on ' + adapter.browserDetails.browser);
            }
        }
    };
    OpenVidu.prototype.checkSystemRequirements = function () {
        var browser = adapter.browserDetails.browser;
        var version = adapter.browserDetails.version;
        //Bug fix: 'navigator.userAgent' in Firefox for Ubuntu 14.04 does not return "Firefox/[version]" in the string, so version returned is null
        if ((browser == 'firefox') && (version == null)) {
            return 1;
        }
        if (((browser == 'chrome') && (version >= 28)) || ((browser == 'edge') && (version >= 12)) || ((browser == 'firefox') && (version >= 22))) {
            return 1;
        }
        else {
            return 0;
        }
    };
    OpenVidu.prototype.getDevices = function (callback) {
        navigator.mediaDevices.enumerateDevices().then(function (deviceInfos) {
            callback(null, deviceInfos);
        })["catch"](function (error) {
            console.error("Error getting devices", error);
            callback(error, null);
        });
    };
    OpenVidu.prototype.enableProdMode = function () {
        console.log = function () { };
        console.debug = function () { };
        console.info = function () { };
        console.warn = function () { };
    };
    OpenVidu.prototype.initLocalRecorder = function (stream) {
        return new LocalRecorder_1.LocalRecorder(stream);
    };
    return OpenVidu;
}());
exports.OpenVidu = OpenVidu;
//# sourceMappingURL=OpenVidu.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenVidu/Publisher.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

exports.__esModule = true;
var EventEmitter = __webpack_require__("../../../../openvidu-browser/node_modules/wolfy87-eventemitter/EventEmitter.js");
var Publisher = /** @class */ (function () {
    function Publisher(stream, parentId, isScreenRequested) {
        var _this = this;
        this.ee = new EventEmitter();
        this.accessAllowed = false;
        this.isScreenRequested = false;
        this.stream = stream;
        this.isScreenRequested = isScreenRequested;
        // Listens to the deactivation of the default behaviour upon the deletion of a Stream object
        this.ee.addListener('stream-destroyed-default', function (event) {
            var s = event.stream;
            s.addOnceEventListener('video-removed', function () {
                _this.ee.emitEvent('videoElementDestroyed');
            });
            s.removeVideo();
        });
        if (document.getElementById(parentId) != null) {
            this.element = document.getElementById(parentId);
        }
    }
    Publisher.prototype.publishAudio = function (value) {
        this.stream.getWebRtcPeer().audioEnabled = value;
    };
    Publisher.prototype.publishVideo = function (value) {
        this.stream.getWebRtcPeer().videoEnabled = value;
    };
    Publisher.prototype.destroy = function () {
        if (!!this.session)
            this.session.unpublish(this);
        this.stream.dispose();
        this.stream.removeVideo(this.element);
        return this;
    };
    Publisher.prototype.subscribeToRemote = function () {
        this.stream.subscribeToMyRemote();
    };
    Publisher.prototype.on = function (eventName, callback) {
        var _this = this;
        this.ee.addListener(eventName, function (event) {
            if (event) {
                console.info("Event '" + eventName + "' triggered by 'Publisher'", event);
            }
            else {
                console.info("Event '" + eventName + "' triggered by 'Publisher'");
            }
            callback(event);
        });
        if (eventName == 'streamCreated') {
            if (this.stream.isPublisherPublished) {
                this.ee.emitEvent('streamCreated', [{ stream: this.stream }]);
            }
            else {
                this.stream.addEventListener('stream-created-by-publisher', function () {
                    _this.ee.emitEvent('streamCreated', [{ stream: _this.stream }]);
                });
            }
        }
        if (eventName == 'videoElementCreated') {
            if (this.stream.isVideoELementCreated) {
                this.ee.emitEvent('videoElementCreated', [{
                        element: this.stream.getVideoElement()
                    }]);
            }
            else {
                this.stream.addEventListener('video-element-created-by-stream', function (element) {
                    _this.id = element.id;
                    _this.ee.emitEvent('videoElementCreated', [{
                            element: element.element
                        }]);
                });
            }
        }
        if (eventName == 'videoPlaying') {
            var video = this.stream.getVideoElement();
            if (!this.stream.displayMyRemote() && video &&
                video.currentTime > 0 &&
                video.paused == false &&
                video.ended == false &&
                video.readyState == 4) {
                this.ee.emitEvent('videoPlaying', [{
                        element: this.stream.getVideoElement()
                    }]);
            }
            else {
                this.stream.addEventListener('video-is-playing', function (element) {
                    _this.ee.emitEvent('videoPlaying', [{
                            element: element.element
                        }]);
                });
            }
        }
        if (eventName == 'remoteVideoPlaying') {
            var video = this.stream.getVideoElement();
            if (this.stream.displayMyRemote() && video &&
                video.currentTime > 0 &&
                video.paused == false &&
                video.ended == false &&
                video.readyState == 4) {
                this.ee.emitEvent('remoteVideoPlaying', [{
                        element: this.stream.getVideoElement()
                    }]);
            }
            else {
                this.stream.addEventListener('remote-video-is-playing', function (element) {
                    _this.ee.emitEvent('remoteVideoPlaying', [{
                            element: element.element
                        }]);
                });
            }
        }
        if (eventName == 'accessAllowed') {
            if (this.stream.accessIsAllowed) {
                this.ee.emitEvent('accessAllowed');
            }
            else {
                this.stream.addEventListener('access-allowed-by-publisher', function () {
                    _this.ee.emitEvent('accessAllowed');
                });
            }
        }
        if (eventName == 'accessDenied') {
            if (this.stream.accessIsDenied) {
                this.ee.emitEvent('accessDenied');
            }
            else {
                this.stream.addEventListener('access-denied-by-publisher', function () {
                    _this.ee.emitEvent('accessDenied');
                });
            }
        }
    };
    return Publisher;
}());
exports.Publisher = Publisher;
//# sourceMappingURL=Publisher.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenVidu/Session.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

exports.__esModule = true;
var Subscriber_1 = __webpack_require__("../../../../openvidu-browser/lib/OpenVidu/Subscriber.js");
var EventEmitter = __webpack_require__("../../../../openvidu-browser/node_modules/wolfy87-eventemitter/EventEmitter.js");
var Session = /** @class */ (function () {
    function Session(session, openVidu) {
        var _this = this;
        this.session = session;
        this.openVidu = openVidu;
        this.ee = new EventEmitter();
        this.sessionId = session.getSessionId();
        // Listens to the deactivation of the default behaviour upon the deletion of a Stream object
        this.session.addEventListener('stream-destroyed-default', function (event) {
            event.stream.removeVideo();
        });
        // Listens to the deactivation of the default behaviour upon the disconnection of a Session
        this.session.addEventListener('session-disconnected-default', function () {
            var s;
            for (var streamId in _this.session.getRemoteStreams()) {
                _this.session.getRemoteStreams()[streamId].removeVideo();
            }
            if (_this.connection && (Object.keys(_this.connection.getStreams()).length > 0)) {
                for (var streamId in _this.connection.getStreams()) {
                    _this.connection.getStreams()[streamId].removeVideo();
                }
            }
        });
        // Sets or updates the value of 'connection' property. Triggered by SessionInternal when succesful connection
        this.session.addEventListener('update-connection-object', function (event) {
            _this.connection = event.connection;
        });
    }
    Session.prototype.connect = function (param1, param2, param3) {
        // Early configuration to deactivate automatic subscription to streams
        if (param3) {
            this.session.configure({
                sessionId: this.session.getSessionId(),
                participantId: param1,
                metadata: this.session.stringClientMetadata(param2),
                subscribeToStreams: false
            });
            this.session.connect(param1, param3);
        }
        else {
            this.session.configure({
                sessionId: this.session.getSessionId(),
                participantId: param1,
                metadata: '',
                subscribeToStreams: false
            });
            this.session.connect(param1, param2);
        }
    };
    Session.prototype.disconnect = function () {
        var _this = this;
        this.openVidu.openVidu.close(false);
        this.session.emitEvent('sessionDisconnected', [{
                preventDefault: function () { _this.session.removeEvent('session-disconnected-default'); }
            }]);
        this.session.emitEvent('session-disconnected-default', [{}]);
    };
    Session.prototype.publish = function (publisher) {
        var _this = this;
        if (!publisher.stream.isPublisherPublished) {
            if (publisher.isScreenRequested) {
                if (!publisher.stream.isScreenRequestedReady) {
                    publisher.stream.addOnceEventListener('screen-ready', function () {
                        _this.streamPublish(publisher);
                    });
                }
                else {
                    this.streamPublish(publisher);
                }
            }
            else {
                this.streamPublish(publisher);
            }
        }
        else {
            publisher = this.openVidu.reinitPublisher(publisher);
            if (publisher.isScreenRequested && !publisher.stream.isScreenRequestedReady) {
                publisher.stream.addOnceEventListener('screen-ready', function () {
                    _this.streamPublish(publisher);
                });
            }
            else {
                this.streamPublish(publisher);
            }
        }
    };
    Session.prototype.streamPublish = function (publisher) {
        publisher.session = this;
        this.connection.addStream(publisher.stream);
        publisher.stream.publish();
    };
    Session.prototype.unpublish = function (publisher) {
        this.session.unpublish(publisher);
    };
    Session.prototype.on = function (eventName, callback) {
        this.session.addEventListener(eventName, function (event) {
            if (event) {
                console.info("Event '" + eventName + "' triggered by 'Session'", event);
            }
            else {
                console.info("Event '" + eventName + "' triggered by 'Session'");
            }
            callback(event);
        });
    };
    Session.prototype.once = function (eventName, callback) {
        this.session.addOnceEventListener(eventName, function (event) {
            callback(event);
        });
    };
    Session.prototype.off = function (eventName, eventHandler) {
        this.session.removeListener(eventName, eventHandler);
    };
    Session.prototype.subscribe = function (param1, param2, param3) {
        // Subscription
        this.session.subscribe(param1);
        var subscriber = new Subscriber_1.Subscriber(param1, param2);
        param1.playOnlyVideo(param2, null);
        return subscriber;
    };
    Session.prototype.unsubscribe = function (subscriber) {
        this.session.unsubscribe(subscriber.stream);
        subscriber.stream.removeVideo();
    };
    Session.prototype.signal = function (signal, completionHandler) {
        var signalMessage = {};
        if (signal.to && signal.to.length > 0) {
            var connectionIds = [];
            for (var i = 0; i < signal.to.length; i++) {
                connectionIds.push(signal.to[i].connectionId);
            }
            signalMessage['to'] = connectionIds;
        }
        else {
            signalMessage['to'] = [];
        }
        signalMessage['data'] = signal.data ? signal.data : '';
        signalMessage['type'] = signal.type ? signal.type : '';
        this.openVidu.openVidu.sendMessage(JSON.stringify(signalMessage));
    };
    return Session;
}());
exports.Session = Session;
//# sourceMappingURL=Session.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenVidu/Subscriber.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

exports.__esModule = true;
var EventEmitter = __webpack_require__("../../../../openvidu-browser/node_modules/wolfy87-eventemitter/EventEmitter.js");
var Subscriber = /** @class */ (function () {
    function Subscriber(stream, parentId) {
        var _this = this;
        this.ee = new EventEmitter();
        this.stream = stream;
        if (document.getElementById(parentId) != null) {
            this.element = document.getElementById(parentId);
        }
        // Listens to deletion of the HTML video element of the Subscriber
        this.stream.addEventListener('video-removed', function () {
            _this.ee.emitEvent('videoElementDestroyed');
        });
    }
    Subscriber.prototype.on = function (eventName, callback) {
        var _this = this;
        this.ee.addListener(eventName, function (event) {
            if (event) {
                console.info("Event '" + eventName + "' triggered by 'Subscriber'", event);
            }
            else {
                console.info("Event '" + eventName + "' triggered by 'Subscriber'");
            }
            callback(event);
        });
        if (eventName == 'videoElementCreated') {
            if (this.stream.isVideoELementCreated) {
                this.ee.emitEvent('videoElementCreated', [{
                        element: this.stream.getVideoElement()
                    }]);
            }
            else {
                this.stream.addOnceEventListener('video-element-created-by-stream', function (element) {
                    _this.id = element.id;
                    _this.ee.emitEvent('videoElementCreated', [{
                            element: element
                        }]);
                });
            }
        }
        if (eventName == 'videoPlaying') {
            var video = this.stream.getVideoElement();
            if (!this.stream.displayMyRemote() && video &&
                video.currentTime > 0 &&
                video.paused == false &&
                video.ended == false &&
                video.readyState == 4) {
                this.ee.emitEvent('videoPlaying', [{
                        element: this.stream.getVideoElement()
                    }]);
            }
            else {
                this.stream.addOnceEventListener('video-is-playing', function (element) {
                    _this.ee.emitEvent('videoPlaying', [{
                            element: element.element
                        }]);
                });
            }
        }
    };
    return Subscriber;
}());
exports.Subscriber = Subscriber;
//# sourceMappingURL=Subscriber.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenVidu/index.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
exports.__esModule = true;
__export(__webpack_require__("../../../../openvidu-browser/lib/OpenVidu/OpenVidu.js"));
__export(__webpack_require__("../../../../openvidu-browser/lib/OpenVidu/Session.js"));
__export(__webpack_require__("../../../../openvidu-browser/lib/OpenVidu/Publisher.js"));
__export(__webpack_require__("../../../../openvidu-browser/lib/OpenVidu/Subscriber.js"));
__export(__webpack_require__("../../../../openvidu-browser/lib/OpenViduInternal/Stream.js"));
__export(__webpack_require__("../../../../openvidu-browser/lib/OpenViduInternal/Connection.js"));
__export(__webpack_require__("../../../../openvidu-browser/lib/OpenViduInternal/LocalRecorder.js"));
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/Connection.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

exports.__esModule = true;
var Stream_1 = __webpack_require__("../../../../openvidu-browser/lib/OpenViduInternal/Stream.js");
var Connection = /** @class */ (function () {
    function Connection(openVidu, local, room, options) {
        this.openVidu = openVidu;
        this.local = local;
        this.room = room;
        this.options = options;
        this.streams = {};
        console.info("'Connection' created (" + (local ? "local" : "remote") + ")" + (local ? "" : ", with 'connectionId' [" + (options ? options.id : '') + "] "));
        if (options && !local) {
            this.connectionId = options.id;
            if (options.metadata) {
                this.data = options.metadata;
            }
            if (options.streams) {
                this.initRemoteStreams(options);
            }
        }
    }
    Connection.prototype.addStream = function (stream) {
        stream.connection = this;
        this.streams[stream.streamId] = stream;
        //this.room.getStreams()[stream.streamId] = stream;
    };
    Connection.prototype.removeStream = function (key) {
        delete this.streams[key];
        //delete this.room.getStreams()[key];
        delete this.inboundStreamsOpts;
    };
    Connection.prototype.setOptions = function (options) {
        this.options = options;
    };
    Connection.prototype.getStreams = function () {
        return this.streams;
    };
    Connection.prototype.dispose = function () {
        for (var key in this.streams) {
            this.streams[key].dispose();
        }
    };
    Connection.prototype.sendIceCandidate = function (candidate) {
        console.debug((this.local ? "Local" : "Remote"), "candidate for", this.connectionId, JSON.stringify(candidate));
        this.openVidu.sendRequest("onIceCandidate", {
            endpointName: this.connectionId,
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex
        }, function (error, response) {
            if (error) {
                console.error("Error sending ICE candidate: "
                    + JSON.stringify(error));
            }
        });
    };
    Connection.prototype.initRemoteStreams = function (options) {
        var opts;
        for (var _i = 0, _a = options.streams; _i < _a.length; _i++) {
            opts = _a[_i];
            var streamOptions = {
                id: opts.id,
                connection: this,
                recvAudio: (opts.audioActive == null ? true : opts.audioActive),
                recvVideo: (opts.videoActive == null ? true : opts.videoActive),
                typeOfVideo: opts.typeOfVideo
            };
            var stream = new Stream_1.Stream(this.openVidu, false, this.room, streamOptions);
            this.addStream(stream);
            this.inboundStreamsOpts = streamOptions;
        }
        console.info("Remote 'Connection' with 'connectionId' [" + this.connectionId + "] is now configured for receiving Streams with options: ", this.inboundStreamsOpts);
    };
    return Connection;
}());
exports.Connection = Connection;
//# sourceMappingURL=Connection.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/LocalRecorder.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

exports.__esModule = true;
var LocalRecorder = /** @class */ (function () {
    function LocalRecorder(stream) {
        this.chunks = [];
        this.count = 0;
        this.stream = stream;
        this.connectionId = (!!this.stream.connection) ? this.stream.connection.connectionId : 'default-connection';
        this.id = this.stream.streamId + '_' + this.connectionId + '_localrecord';
        this.state = "READY" /* READY */;
    }
    LocalRecorder.prototype.record = function () {
        var _this = this;
        if (typeof MediaRecorder === 'undefined') {
            console.error('MediaRecorder not supported on your browser. See compatibility in https://caniuse.com/#search=MediaRecorder');
            throw (Error('MediaRecorder not supported on your browser. See compatibility in https://caniuse.com/#search=MediaRecorder'));
        }
        if (this.state !== "READY" /* READY */) {
            throw (Error('\'LocalRecord.record()\' needs \'LocalRecord.state\' to be \'READY\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.clean()\' or init a new LocalRecorder before'));
        }
        console.log("Starting local recording of stream '" + this.stream.streamId + "' of connection '" + this.connectionId + "'");
        if (typeof MediaRecorder.isTypeSupported == 'function') {
            var options = void 0;
            if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
                options = { mimeType: 'video/webm;codecs=vp9' };
            }
            else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
                options = { mimeType: 'video/webm;codecs=h264' };
            }
            else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
                options = { mimeType: 'video/webm;codecs=vp8' };
            }
            console.log('Using mimeType ' + options.mimeType);
            this.mediaRecorder = new MediaRecorder(this.stream.getMediaStream(), options);
        }
        else {
            console.warn('isTypeSupported is not supported, using default codecs for browser');
            this.mediaRecorder = new MediaRecorder(this.stream.getMediaStream());
        }
        this.mediaRecorder.start(10);
        this.mediaRecorder.ondataavailable = function (e) {
            _this.chunks.push(e.data);
        };
        this.mediaRecorder.onerror = function (e) {
            console.error('MediaRecorder error: ', e);
        };
        this.mediaRecorder.onstart = function () {
            console.log('MediaRecorder started (state=' + _this.mediaRecorder.state + ")");
        };
        this.mediaRecorder.onstop = function () {
            _this.onStopDefault();
        };
        this.mediaRecorder.onpause = function () {
            console.log('MediaRecorder paused (state=' + _this.mediaRecorder.state + ")");
        };
        this.mediaRecorder.onresume = function () {
            console.log('MediaRecorder resumed (state=' + _this.mediaRecorder.state + ")");
        };
        this.mediaRecorder.onwarning = function (e) {
            console.log('MediaRecorder warning: ' + e);
        };
        this.state = "RECORDING" /* RECORDING */;
    };
    LocalRecorder.prototype.stop = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (_this.state === "READY" /* READY */ || _this.state === "FINISHED" /* FINISHED */) {
                    throw (Error('\'LocalRecord.stop()\' needs \'LocalRecord.state\' to be \'RECORDING\' or \'PAUSED\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.start()\' before'));
                }
                _this.mediaRecorder.onstop = function () {
                    _this.onStopDefault();
                    resolve();
                };
            }
            catch (e) {
                reject(e);
            }
            try {
                _this.mediaRecorder.stop();
            }
            catch (e) {
                reject(e);
            }
        });
    };
    LocalRecorder.prototype.pause = function () {
        if (this.state !== "RECORDING" /* RECORDING */) {
            throw (Error('\'LocalRecord.pause()\' needs \'LocalRecord.state\' to be \'RECORDING\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.start()\' or \'LocalRecorder.resume()\' before'));
        }
        this.mediaRecorder.pause();
        this.state = "PAUSED" /* PAUSED */;
    };
    LocalRecorder.prototype.resume = function () {
        if (this.state !== "PAUSED" /* PAUSED */) {
            throw (Error('\'LocalRecord.resume()\' needs \'LocalRecord.state\' to be \'PAUSED\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.pause()\' before'));
        }
        this.mediaRecorder.resume();
        this.state = "RECORDING" /* RECORDING */;
    };
    LocalRecorder.prototype.preview = function (parentElement) {
        if (this.state !== "FINISHED" /* FINISHED */) {
            throw (Error('\'LocalRecord.preview()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.stop()\' before'));
        }
        this.videoPreview = document.createElement('video');
        this.videoPreview.id = this.id;
        this.videoPreview.autoplay = true;
        if (typeof parentElement === "string") {
            this.htmlParentElementId = parentElement;
            var parentElementDom = document.getElementById(parentElement);
            if (parentElementDom) {
                this.videoPreview = parentElementDom.appendChild(this.videoPreview);
            }
        }
        else {
            this.htmlParentElementId = parentElement.id;
            this.videoPreview = parentElement.appendChild(this.videoPreview);
        }
        this.videoPreview.src = this.videoPreviewSrc;
        return this.videoPreview;
    };
    LocalRecorder.prototype.clean = function () {
        var _this = this;
        var f = function () {
            delete _this.blob;
            _this.chunks = [];
            _this.count = 0;
            delete _this.mediaRecorder;
            _this.state = "READY" /* READY */;
        };
        if (this.state === "RECORDING" /* RECORDING */ || this.state === "PAUSED" /* PAUSED */) {
            this.stop().then(function () { return f(); })["catch"](function () { return f(); });
        }
        else {
            f();
        }
    };
    LocalRecorder.prototype.download = function () {
        if (this.state !== "FINISHED" /* FINISHED */) {
            throw (Error('\'LocalRecord.download()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.stop()\' before'));
        }
        else {
            var a = document.createElement("a");
            a.style.display = 'none';
            document.body.appendChild(a);
            var url = window.URL.createObjectURL(this.blob);
            a.href = url;
            a.download = this.id + '.webm';
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
    };
    LocalRecorder.prototype.getBlob = function () {
        if (this.state !== "FINISHED" /* FINISHED */) {
            throw (Error('Call \'LocalRecord.stop()\' before getting Blob file'));
        }
        else {
            return this.blob;
        }
    };
    LocalRecorder.prototype.uploadAsBinary = function (endpoint, headers) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.state !== "FINISHED" /* FINISHED */) {
                reject(Error('\'LocalRecord.uploadAsBinary()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.stop()\' before'));
            }
            else {
                var http_1 = new XMLHttpRequest();
                http_1.open("POST", endpoint, true);
                if (typeof headers === 'object') {
                    for (var _i = 0, _a = Object.keys(headers); _i < _a.length; _i++) {
                        var key = _a[_i];
                        http_1.setRequestHeader(key, headers[key]);
                    }
                }
                http_1.onreadystatechange = function () {
                    if (http_1.readyState === 4) {
                        if (http_1.status.toString().charAt(0) === '2') {
                            // Success response from server (HTTP status standard: 2XX is success)
                            resolve(http_1.responseText);
                        }
                        else {
                            reject(Error("Upload error: " + http_1.status));
                        }
                    }
                };
                http_1.send(_this.blob);
            }
        });
    };
    LocalRecorder.prototype.uploadAsMultipartfile = function (endpoint, headers) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.state !== "FINISHED" /* FINISHED */) {
                reject(Error('\'LocalRecord.uploadAsMultipartfile()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.stop()\' before'));
            }
            else {
                var http_2 = new XMLHttpRequest();
                http_2.open("POST", endpoint, true);
                if (typeof headers === 'object') {
                    for (var _i = 0, _a = Object.keys(headers); _i < _a.length; _i++) {
                        var key = _a[_i];
                        http_2.setRequestHeader(key, headers[key]);
                    }
                }
                var sendable = new FormData();
                sendable.append("file", _this.blob, _this.id + ".webm");
                http_2.onreadystatechange = function () {
                    if (http_2.readyState === 4) {
                        if (http_2.status.toString().charAt(0) === '2') {
                            // Success response from server (HTTP status standard: 2XX is success)
                            resolve(http_2.responseText);
                        }
                        else {
                            reject(Error("Upload error: " + http_2.status));
                        }
                    }
                };
                http_2.send(sendable);
            }
        });
    };
    LocalRecorder.prototype.onStopDefault = function () {
        console.log('MediaRecorder stopped  (state=' + this.mediaRecorder.state + ")");
        this.blob = new Blob(this.chunks, { type: "video/webm" });
        this.chunks = [];
        this.videoPreviewSrc = window.URL.createObjectURL(this.blob);
        this.state = "FINISHED" /* FINISHED */;
    };
    return LocalRecorder;
}());
exports.LocalRecorder = LocalRecorder;
//# sourceMappingURL=LocalRecorder.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/OpenViduError.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

exports.__esModule = true;
var OpenViduError = /** @class */ (function () {
    function OpenViduError(name, message) {
        this.name = name;
        this.message = message;
    }
    return OpenViduError;
}());
exports.OpenViduError = OpenViduError;
//# sourceMappingURL=OpenViduError.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/OpenViduInternal.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

exports.__esModule = true;
/*
 * (C) Copyright 2017 OpenVidu (http://openvidu.io/)
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
var SessionInternal_1 = __webpack_require__("../../../../openvidu-browser/lib/OpenViduInternal/SessionInternal.js");
var OpenViduError_1 = __webpack_require__("../../../../openvidu-browser/lib/OpenViduInternal/OpenViduError.js");
var Stream_1 = __webpack_require__("../../../../openvidu-browser/lib/OpenViduInternal/Stream.js");
var RpcBuilder = __webpack_require__("../../../../openvidu-browser/lib/KurentoUtils/kurento-jsonrpc/index.js");
var OpenViduInternal = /** @class */ (function () {
    function OpenViduInternal() {
        this.recorder = false;
    }
    /* NEW METHODS */
    OpenViduInternal.prototype.initSession = function (sessionId) {
        console.info("'Session' initialized with 'sessionId' [" + sessionId + "]");
        this.session = new SessionInternal_1.SessionInternal(this, sessionId);
        return this.session;
    };
    OpenViduInternal.prototype.initPublisherTagged = function (parentId, cameraOptions, newStream, callback) {
        var _this = this;
        if (newStream) {
            if (cameraOptions == null) {
                cameraOptions = {
                    sendAudio: true,
                    sendVideo: true,
                    activeAudio: true,
                    activeVideo: true,
                    dataChannel: true,
                    mediaConstraints: {
                        audio: true,
                        video: { width: { ideal: 1280 } }
                    }
                };
            }
            this.localStream = new Stream_1.Stream(this, true, this.session, cameraOptions);
        }
        this.localStream.requestCameraAccess(function (error, localStream) {
            if (error) {
                // Neither localStream or microphone device is allowed/able to capture media
                console.error(error);
                if (callback) {
                    callback(error);
                }
                _this.localStream.ee.emitEvent('access-denied-by-publisher');
            }
            else {
                _this.localStream.setVideoElement(_this.cameraReady(localStream, parentId));
                if (callback) {
                    callback(undefined);
                }
            }
        });
        return this.localStream;
    };
    OpenViduInternal.prototype.initPublisherScreen = function (parentId, newStream, callback) {
        var _this = this;
        if (newStream) {
            this.localStream = new Stream_1.Stream(this, true, this.session, 'screen-options');
        }
        this.localStream.addOnceEventListener('can-request-screen', function () {
            _this.localStream.requestCameraAccess(function (error, localStream) {
                if (error) {
                    _this.localStream.ee.emitEvent('access-denied-by-publisher');
                    var errorName = "SCREEN_CAPTURE_DENIED" /* SCREEN_CAPTURE_DENIED */;
                    var errorMessage = 'You must allow access to one window of your desktop';
                    var e = new OpenViduError_1.OpenViduError(errorName, errorMessage);
                    console.error(e);
                    if (callback) {
                        callback(e);
                    }
                }
                else {
                    _this.localStream.setVideoElement(_this.cameraReady(localStream, parentId));
                    if (_this.localStream.getSendAudio()) {
                        // If the user wants to send audio with the screen capturing
                        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                            .then(function (userStream) {
                            _this.localStream.getMediaStream().addTrack(userStream.getAudioTracks()[0]);
                            // Mute audio if 'activeAudio' property is false
                            if (userStream.getAudioTracks()[0] != null) {
                                userStream.getAudioTracks()[0].enabled = _this.localStream.outboundOptions.activeAudio;
                            }
                            _this.localStream.isScreenRequestedReady = true;
                            _this.localStream.ee.emitEvent('screen-ready');
                            if (callback) {
                                callback(undefined);
                            }
                        })["catch"](function (error) {
                            _this.localStream.ee.emitEvent('access-denied-by-publisher');
                            console.error("Error accessing the microphone", error);
                            if (callback) {
                                var errorName = "MICROPHONE_ACCESS_DENIED" /* MICROPHONE_ACCESS_DENIED */;
                                var errorMessage = error.toString();
                                callback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                            }
                        });
                    }
                    else {
                        _this.localStream.isScreenRequestedReady = true;
                        _this.localStream.ee.emitEvent('screen-ready');
                        if (callback) {
                            callback(undefined);
                        }
                    }
                }
            });
        });
        return this.localStream;
    };
    OpenViduInternal.prototype.cameraReady = function (localStream, parentId) {
        this.localStream = localStream;
        var videoElement = this.localStream.playOnlyVideo(parentId, null);
        this.localStream.emitStreamReadyEvent();
        return videoElement;
    };
    OpenViduInternal.prototype.getLocalStream = function () {
        return this.localStream;
    };
    /* NEW METHODS */
    OpenViduInternal.prototype.getWsUri = function () {
        return this.wsUri;
    };
    OpenViduInternal.prototype.setWsUri = function (wsUri) {
        this.wsUri = wsUri;
    };
    OpenViduInternal.prototype.getSecret = function () {
        return this.secret;
    };
    OpenViduInternal.prototype.setSecret = function (secret) {
        this.secret = secret;
    };
    OpenViduInternal.prototype.getRecorder = function () {
        return this.recorder;
    };
    OpenViduInternal.prototype.setRecorder = function (recorder) {
        this.recorder = recorder;
    };
    OpenViduInternal.prototype.getOpenViduServerURL = function () {
        return 'https://' + this.wsUri.split("wss://")[1].split("/room")[0];
    };
    OpenViduInternal.prototype.getRoom = function () {
        return this.session;
    };
    OpenViduInternal.prototype.connect = function (callback) {
        this.callback = callback;
        this.initJsonRpcClient(this.wsUri);
    };
    OpenViduInternal.prototype.initJsonRpcClient = function (wsUri) {
        var config = {
            heartbeat: 3000,
            sendCloseMessage: false,
            ws: {
                uri: wsUri,
                useSockJS: false,
                onconnected: this.connectCallback.bind(this),
                ondisconnect: this.disconnectCallback.bind(this),
                onreconnecting: this.reconnectingCallback.bind(this),
                onreconnected: this.reconnectedCallback.bind(this)
            },
            rpc: {
                requestTimeout: 15000,
                //notifications
                participantJoined: this.onParticipantJoined.bind(this),
                participantPublished: this.onParticipantPublished.bind(this),
                participantUnpublished: this.onParticipantUnpublished.bind(this),
                participantLeft: this.onParticipantLeft.bind(this),
                participantEvicted: this.onParticipantEvicted.bind(this),
                sendMessage: this.onNewMessage.bind(this),
                iceCandidate: this.iceCandidateEvent.bind(this),
                mediaError: this.onMediaError.bind(this)
            }
        };
        this.jsonRpcClient = new RpcBuilder.clients.JsonRpcClient(config);
    };
    OpenViduInternal.prototype.connectCallback = function (error) {
        if (error) {
            this.callback(error);
        }
        else {
            this.callback(null);
        }
    };
    OpenViduInternal.prototype.isRoomAvailable = function () {
        if (this.session !== undefined && this.session instanceof SessionInternal_1.SessionInternal) {
            return true;
        }
        else {
            console.warn('Session instance not found');
            return false;
        }
    };
    OpenViduInternal.prototype.disconnectCallback = function () {
        console.warn('Websocket connection lost');
        if (this.isRoomAvailable()) {
            this.session.onLostConnection();
        }
        else {
            alert('Connection error. Please reload page.');
        }
    };
    OpenViduInternal.prototype.reconnectingCallback = function () {
        console.warn('Websocket connection lost (reconnecting)');
        if (this.isRoomAvailable()) {
            this.session.onLostConnection();
        }
        else {
            alert('Connection error. Please reload page.');
        }
    };
    OpenViduInternal.prototype.reconnectedCallback = function () {
        console.warn('Websocket reconnected');
    };
    OpenViduInternal.prototype.onParticipantJoined = function (params) {
        if (this.isRoomAvailable()) {
            this.session.onParticipantJoined(params);
        }
    };
    OpenViduInternal.prototype.onParticipantPublished = function (params) {
        if (this.isRoomAvailable()) {
            this.session.onParticipantPublished(params);
        }
    };
    OpenViduInternal.prototype.onParticipantUnpublished = function (params) {
        if (this.isRoomAvailable()) {
            this.session.onParticipantUnpublished(params);
        }
    };
    OpenViduInternal.prototype.onParticipantLeft = function (params) {
        if (this.isRoomAvailable()) {
            this.session.onParticipantLeft(params);
        }
    };
    OpenViduInternal.prototype.onParticipantEvicted = function (params) {
        if (this.isRoomAvailable()) {
            this.session.onParticipantEvicted(params);
        }
    };
    OpenViduInternal.prototype.onNewMessage = function (params) {
        if (this.isRoomAvailable()) {
            this.session.onNewMessage(params);
        }
    };
    OpenViduInternal.prototype.iceCandidateEvent = function (params) {
        if (this.isRoomAvailable()) {
            this.session.recvIceCandidate(params);
        }
    };
    OpenViduInternal.prototype.onRoomClosed = function (params) {
        if (this.isRoomAvailable()) {
            this.session.onRoomClosed(params);
        }
    };
    OpenViduInternal.prototype.onMediaError = function (params) {
        if (this.isRoomAvailable()) {
            this.session.onMediaError(params);
        }
    };
    OpenViduInternal.prototype.setRpcParams = function (params) {
        this.rpcParams = params;
    };
    OpenViduInternal.prototype.sendRequest = function (method, params, callback) {
        if (params && params instanceof Function) {
            callback = params;
            params = undefined;
        }
        params = params || {};
        if (this.rpcParams && this.rpcParams !== null && this.rpcParams !== undefined) {
            for (var index in this.rpcParams) {
                if (this.rpcParams.hasOwnProperty(index)) {
                    params[index] = this.rpcParams[index];
                    console.debug('RPC param added to request {' + index + ': ' + this.rpcParams[index] + '}');
                }
            }
        }
        console.debug('Sending request: {method:"' + method + '", params: ' + JSON.stringify(params) + '}');
        this.jsonRpcClient.send(method, params, callback);
    };
    OpenViduInternal.prototype.close = function (forced) {
        if (this.isRoomAvailable()) {
            this.session.leave(forced, this.jsonRpcClient);
        }
    };
    ;
    OpenViduInternal.prototype.disconnectParticipant = function (stream) {
        if (this.isRoomAvailable()) {
            this.session.disconnect(stream);
        }
    };
    //CHAT
    OpenViduInternal.prototype.sendMessage = function (message) {
        this.sendRequest('sendMessage', {
            message: message
        }, function (error, response) {
            if (error) {
                console.error(error);
            }
        });
    };
    ;
    OpenViduInternal.prototype.generateMediaConstraints = function (cameraOptions) {
        var mediaConstraints = {
            audio: cameraOptions.audio,
            video: {}
        };
        if (!cameraOptions.video) {
            mediaConstraints.video = false;
        }
        else {
            var w = void 0, h = void 0;
            switch (cameraOptions.quality) {
                case 'LOW':
                    w = 320;
                    h = 240;
                    break;
                case 'MEDIUM':
                    w = 640;
                    h = 480;
                    break;
                case 'HIGH':
                    w = 1280;
                    h = 720;
                    break;
                default:
                    w = 640;
                    h = 480;
            }
            mediaConstraints.video['width'] = { exact: w };
            mediaConstraints.video['height'] = { exact: h };
            //mediaConstraints.video['frameRate'] = { ideal: Number((<HTMLInputElement>document.getElementById('frameRate')).value) };
        }
        return mediaConstraints;
    };
    return OpenViduInternal;
}());
exports.OpenViduInternal = OpenViduInternal;
//# sourceMappingURL=OpenViduInternal.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/SessionInternal.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

exports.__esModule = true;
var Connection_1 = __webpack_require__("../../../../openvidu-browser/lib/OpenViduInternal/Connection.js");
var EventEmitter = __webpack_require__("../../../../openvidu-browser/node_modules/wolfy87-eventemitter/EventEmitter.js");
var SECRET_PARAM = '?secret=';
var RECORDER_PARAM = '&recorder=';
var SessionInternal = /** @class */ (function () {
    function SessionInternal(openVidu, sessionId) {
        this.openVidu = openVidu;
        this.ee = new EventEmitter();
        this.remoteStreams = {};
        this.participants = {};
        this.publishersSpeaking = [];
        this.connected = false;
        this.sessionId = this.getUrlWithoutSecret(sessionId);
        this.localParticipant = new Connection_1.Connection(this.openVidu, true, this);
        if (!this.openVidu.getWsUri() && !!sessionId) {
            this.processOpenViduUrl(sessionId);
        }
    }
    SessionInternal.prototype.processOpenViduUrl = function (url) {
        var secret = this.getSecretFromUrl(url);
        var recorder = this.getRecorderFromUrl(url);
        if (!(secret == null)) {
            this.openVidu.setSecret(secret);
        }
        if (!(recorder == null)) {
            this.openVidu.setRecorder(recorder);
        }
        this.openVidu.setWsUri(this.getFinalUrl(url));
    };
    SessionInternal.prototype.getSecretFromUrl = function (url) {
        var secret = '';
        if (url.indexOf(SECRET_PARAM) !== -1) {
            var endOfSecret = url.lastIndexOf(RECORDER_PARAM);
            if (endOfSecret !== -1) {
                secret = url.substring(url.lastIndexOf(SECRET_PARAM) + SECRET_PARAM.length, endOfSecret);
            }
            else {
                secret = url.substring(url.lastIndexOf(SECRET_PARAM) + SECRET_PARAM.length, url.length);
            }
        }
        return secret;
    };
    SessionInternal.prototype.getRecorderFromUrl = function (url) {
        var recorder = '';
        if (url.indexOf(RECORDER_PARAM) !== -1) {
            recorder = url.substring(url.lastIndexOf(RECORDER_PARAM) + RECORDER_PARAM.length, url.length);
        }
        return new Boolean(recorder).valueOf();
        ;
    };
    SessionInternal.prototype.getUrlWithoutSecret = function (url) {
        if (!url) {
            console.error('sessionId is not defined');
        }
        if (url.indexOf(SECRET_PARAM) !== -1) {
            url = url.substring(0, url.lastIndexOf(SECRET_PARAM));
        }
        return url;
    };
    SessionInternal.prototype.getFinalUrl = function (url) {
        url = this.getUrlWithoutSecret(url).substring(0, url.lastIndexOf('/')) + '/room';
        if (url.indexOf(".ngrok.io") !== -1) {
            // OpenVidu server URL referes to a ngrok IP: secure wss protocol and delete port of URL
            url = url.replace("ws://", "wss://");
            var regex = /\.ngrok\.io:\d+/;
            url = url.replace(regex, ".ngrok.io");
        }
        else if ((url.indexOf("localhost") !== -1) || (url.indexOf("127.0.0.1") != -1)) {
            // OpenVidu server URL referes to localhost IP
        }
        return url;
    };
    /* NEW METHODS */
    SessionInternal.prototype.connect = function (token, callback) {
        var _this = this;
        this.openVidu.connect(function (error) {
            if (error) {
                callback('ERROR CONNECTING TO OPENVIDU');
            }
            else {
                if (!token) {
                    token = _this.randomToken();
                }
                var joinParams = {
                    token: token,
                    session: _this.sessionId,
                    metadata: _this.options.metadata,
                    secret: _this.openVidu.getSecret(),
                    recorder: _this.openVidu.getRecorder(),
                    dataChannels: false
                };
                if (_this.localParticipant) {
                    if (Object.keys(_this.localParticipant.getStreams()).some(function (streamId) {
                        return _this.remoteStreams[streamId].isDataChannelEnabled();
                    })) {
                        joinParams.dataChannels = true;
                    }
                }
                _this.openVidu.sendRequest('joinRoom', joinParams, function (error, response) {
                    if (error) {
                        callback(error);
                    }
                    else {
                        _this.connected = true;
                        var exParticipants = response.value;
                        // IMPORTANT: Update connectionId with value send by server
                        _this.localParticipant.connectionId = response.id;
                        _this.participants[response.id] = _this.localParticipant;
                        var roomEvent = {
                            participants: new Array(),
                            streams: new Array()
                        };
                        var length_1 = exParticipants.length;
                        for (var i = 0; i < length_1; i++) {
                            var connection = new Connection_1.Connection(_this.openVidu, false, _this, exParticipants[i]);
                            connection.creationTime = new Date().getTime();
                            _this.participants[connection.connectionId] = connection;
                            roomEvent.participants.push(connection);
                            var streams = connection.getStreams();
                            for (var key in streams) {
                                roomEvent.streams.push(streams[key]);
                                if (_this.subscribeToStreams) {
                                    streams[key].subscribe();
                                }
                            }
                        }
                        // Update local Connection object properties with values returned by server
                        _this.localParticipant.data = response.metadata;
                        _this.localParticipant.creationTime = new Date().getTime();
                        // Updates the value of property 'connection' in Session object
                        _this.ee.emitEvent('update-connection-object', [{ connection: _this.localParticipant }]);
                        // Own connection created event
                        _this.ee.emitEvent('connectionCreated', [{ connection: _this.localParticipant }]);
                        // One connection created event for each existing connection in the session
                        for (var _i = 0, _a = roomEvent.participants; _i < _a.length; _i++) {
                            var part = _a[_i];
                            _this.ee.emitEvent('connectionCreated', [{ connection: part }]);
                        }
                        //if (this.subscribeToStreams) {
                        for (var _b = 0, _c = roomEvent.streams; _b < _c.length; _b++) {
                            var stream = _c[_b];
                            _this.ee.emitEvent('streamCreated', [{ stream: stream }]);
                            // Store the remote stream
                            _this.remoteStreams[stream.streamId] = stream;
                        }
                        callback(undefined);
                    }
                });
            }
        });
    };
    /* NEW METHODS */
    SessionInternal.prototype.configure = function (options) {
        this.options = options;
        this.id = options.sessionId;
        this.subscribeToStreams = options.subscribeToStreams == null ? true : options.subscribeToStreams;
        this.updateSpeakerInterval = options.updateSpeakerInterval || 1500;
        this.thresholdSpeaker = options.thresholdSpeaker || -50;
        this.activateUpdateMainSpeaker();
        if (!this.openVidu.getWsUri()) {
            this.processOpenViduUrl(options.sessionId);
        }
    };
    SessionInternal.prototype.getId = function () {
        return this.id;
    };
    SessionInternal.prototype.getSessionId = function () {
        return this.sessionId;
    };
    SessionInternal.prototype.activateUpdateMainSpeaker = function () {
        /*setInterval(() => {
            if (this.publishersSpeaking.length > 0) {
                this.ee.emitEvent('publisherStartSpeaking', [{
                    participantId: this.publishersSpeaking[this.publishersSpeaking.length - 1]
                }]);
            }
        }, this.updateSpeakerInterval);*/
    };
    SessionInternal.prototype.getLocalParticipant = function () {
        return this.localParticipant;
    };
    SessionInternal.prototype.addEventListener = function (eventName, listener) {
        this.ee.on(eventName, listener);
    };
    SessionInternal.prototype.addOnceEventListener = function (eventName, listener) {
        this.ee.once(eventName, listener);
    };
    SessionInternal.prototype.removeListener = function (eventName, listener) {
        this.ee.off(eventName, listener);
    };
    SessionInternal.prototype.removeEvent = function (eventName) {
        this.ee.removeEvent(eventName);
    };
    SessionInternal.prototype.emitEvent = function (eventName, eventsArray) {
        this.ee.emitEvent(eventName, eventsArray);
    };
    SessionInternal.prototype.subscribe = function (stream) {
        stream.subscribe();
    };
    SessionInternal.prototype.unsubscribe = function (stream) {
        console.info("Unsubscribing from " + stream.connection.connectionId);
        this.openVidu.sendRequest('unsubscribeFromVideo', {
            sender: stream.connection.connectionId
        }, function (error, response) {
            if (error) {
                console.error("Error unsubscribing from Subscriber", error);
            }
            else {
                console.info("Unsubscribed correctly from " + stream.connection.connectionId);
            }
            stream.dispose();
        });
    };
    SessionInternal.prototype.onParticipantPublished = function (response) {
        // Get the existing Connection created on 'onParticipantJoined' for
        // existing participants or create a new one for new participants
        var connection = this.participants[response.id];
        if (connection != null) {
            // Update existing Connection
            response.metadata = connection.data;
            connection.setOptions(response);
            connection.initRemoteStreams(response);
        }
        else {
            // Create new Connection
            connection = new Connection_1.Connection(this.openVidu, false, this, response);
        }
        var pid = connection.connectionId;
        if (!(pid in this.participants)) {
            console.debug("Remote Connection not found in connections list by its id [" + pid + "]");
        }
        else {
            console.debug("Remote Connection found in connections list by its id [" + pid + "]");
        }
        this.participants[pid] = connection;
        var streams = connection.getStreams();
        for (var key in streams) {
            var stream = streams[key];
            if (!this.remoteStreams[stream.streamId]) {
                // Avoid race condition between stream.subscribe() in "onParticipantPublished" and in "joinRoom" rpc callback
                // This condition is false if openvidu-server sends "participantPublished" event to a subscriber participant that has
                // already subscribed to certain stream in the callback of "joinRoom" method
                if (this.subscribeToStreams) {
                    stream.subscribe();
                }
                this.ee.emitEvent('streamCreated', [{ stream: stream }]);
                // Store the remote stream
                this.remoteStreams[stream.streamId] = stream;
            }
        }
    };
    SessionInternal.prototype.onParticipantUnpublished = function (msg) {
        var _this = this;
        var connection = this.participants[msg.name];
        if (connection !== undefined) {
            var streams = connection.getStreams();
            for (var key in streams) {
                this.ee.emitEvent('streamDestroyed', [{
                        stream: streams[key],
                        preventDefault: function () { _this.ee.removeEvent('stream-destroyed-default'); }
                    }]);
                this.ee.emitEvent('stream-destroyed-default', [{
                        stream: streams[key]
                    }]);
                // Deleting the remote stream
                var streamId = streams[key].streamId;
                var stream = this.remoteStreams[streamId];
                stream.dispose();
                delete this.remoteStreams[stream.streamId];
                connection.removeStream(stream.streamId);
            }
        }
        else {
            console.warn("Participant " + msg.name
                + " unknown. Participants: "
                + JSON.stringify(this.participants));
        }
    };
    SessionInternal.prototype.onParticipantJoined = function (response) {
        var connection = new Connection_1.Connection(this.openVidu, false, this, response);
        connection.creationTime = new Date().getTime();
        var pid = connection.connectionId;
        if (!(pid in this.participants)) {
            this.participants[pid] = connection;
        }
        else {
            //use existing so that we don't lose streams info
            console.warn("Connection already exists in connections list with " +
                "the same connectionId, old:", this.participants[pid], ", joined now:", connection);
            connection = this.participants[pid];
        }
        this.ee.emitEvent('participant-joined', [{
                connection: connection
            }]);
        this.ee.emitEvent('connectionCreated', [{
                connection: connection
            }]);
    };
    SessionInternal.prototype.onParticipantLeft = function (msg) {
        var _this = this;
        var connection = this.participants[msg.name];
        if (connection !== undefined) {
            this.ee.emitEvent('participant-left', [{
                    connection: connection
                }]);
            var streams = connection.getStreams();
            for (var key in streams) {
                this.ee.emitEvent('streamDestroyed', [{
                        stream: streams[key],
                        preventDefault: function () { _this.ee.removeEvent('stream-destroyed-default'); }
                    }]);
                this.ee.emitEvent('stream-destroyed-default', [{
                        stream: streams[key]
                    }]);
                // Deleting the remote stream
                var streamId = streams[key].streamId;
                delete this.remoteStreams[streamId];
            }
            connection.dispose();
            delete this.participants[msg.name];
            this.ee.emitEvent('connectionDestroyed', [{
                    connection: connection
                }]);
        }
        else {
            console.warn("Participant " + msg.name
                + " unknown. Participants: "
                + JSON.stringify(this.participants));
        }
    };
    ;
    SessionInternal.prototype.onParticipantEvicted = function (msg) {
        this.ee.emitEvent('participant-evicted', [{
                localParticipant: this.localParticipant
            }]);
    };
    ;
    SessionInternal.prototype.onNewMessage = function (msg) {
        console.info("New signal: " + JSON.stringify(msg));
        this.ee.emitEvent('signal', [{
                data: msg.data,
                from: this.participants[msg.from],
                type: msg.type
            }]);
        this.ee.emitEvent('signal:' + msg.type, [{
                data: msg.data,
                from: this.participants[msg.from],
                type: msg.type
            }]);
    };
    SessionInternal.prototype.recvIceCandidate = function (msg) {
        var candidate = {
            candidate: msg.candidate,
            sdpMid: msg.sdpMid,
            sdpMLineIndex: msg.sdpMLineIndex
        };
        var connection = this.participants[msg.endpointName];
        if (!connection) {
            console.error("Participant not found for endpoint " +
                msg.endpointName + ". Ice candidate will be ignored.", candidate);
            return;
        }
        var streams = connection.getStreams();
        var _loop_1 = function (key) {
            var stream = streams[key];
            stream.getWebRtcPeer().addIceCandidate(candidate, function (error) {
                if (error) {
                    console.error("Error adding candidate for " + key
                        + " stream of endpoint " + msg.endpointName
                        + ": " + error);
                }
            });
        };
        for (var key in streams) {
            _loop_1(key);
        }
    };
    SessionInternal.prototype.onRoomClosed = function (msg) {
        console.info("Session closed: " + JSON.stringify(msg));
        var room = msg.room;
        if (room !== undefined) {
            this.ee.emitEvent('room-closed', [{
                    room: room
                }]);
        }
        else {
            console.warn("Session undefined on session closed", msg);
        }
    };
    SessionInternal.prototype.onLostConnection = function () {
        if (!this.connected) {
            console.warn('Not connected to session: if you are not debugging, this is probably a certificate error');
            if (window.confirm('If you are not debugging, this is probably a certificate error at \"' + this.openVidu.getOpenViduServerURL() + '\"\n\nClick OK to navigate and accept it')) {
                location.assign(this.openVidu.getOpenViduServerURL() + '/accept-certificate');
            }
            ;
            return;
        }
        console.warn('Lost connection in Session ' + this.id);
        var room = this.id;
        if (room !== undefined) {
            this.ee.emitEvent('lost-connection', [{ room: room }]);
        }
        else {
            console.warn('Session undefined when lost connection');
        }
    };
    SessionInternal.prototype.onMediaError = function (params) {
        console.error("Media error: " + JSON.stringify(params));
        var error = params.error;
        if (error) {
            this.ee.emitEvent('error-media', [{
                    error: error
                }]);
        }
        else {
            console.warn("Received undefined media error. Params:", params);
        }
    };
    /*
     * forced means the user was evicted, no need to send the 'leaveRoom' request
     */
    SessionInternal.prototype.leave = function (forced, jsonRpcClient) {
        forced = !!forced;
        console.info("Leaving Session (forced=" + forced + ")");
        if (this.connected && !forced) {
            this.openVidu.sendRequest('leaveRoom', function (error, response) {
                if (error) {
                    console.error(error);
                }
                jsonRpcClient.close();
            });
        }
        else {
            jsonRpcClient.close();
        }
        this.connected = false;
        if (this.participants) {
            for (var pid in this.participants) {
                this.participants[pid].dispose();
                delete this.participants[pid];
            }
        }
    };
    SessionInternal.prototype.disconnect = function (stream) {
        var connection = stream.getParticipant();
        if (!connection) {
            console.error("Stream to disconnect has no participant", stream);
            return;
        }
        delete this.participants[connection.connectionId];
        connection.dispose();
        if (connection === this.localParticipant) {
            console.info("Unpublishing my media (I'm " + connection.connectionId + ")");
            delete this.localParticipant;
            this.openVidu.sendRequest('unpublishVideo', function (error, response) {
                if (error) {
                    console.error(error);
                }
                else {
                    console.info("Media unpublished correctly");
                }
            });
        }
        else {
            this.unsubscribe(stream);
        }
    };
    SessionInternal.prototype.unpublish = function (publisher) {
        var _this = this;
        var stream = publisher.stream;
        if (!stream.connection) {
            console.error("The associated Connection object of this Publisher is null", stream);
            return;
        }
        else if (stream.connection !== this.localParticipant) {
            console.error("The associated Connection object of this Publisher is not your local Connection." +
                "Only moderators can force unpublish on remote Streams via 'forceUnpublish' method", stream);
            return;
        }
        else {
            stream.dispose();
            console.info("Unpublishing local media (" + stream.connection.connectionId + ")");
            this.openVidu.sendRequest('unpublishVideo', function (error, response) {
                if (error) {
                    console.error(error);
                }
                else {
                    console.info("Media unpublished correctly");
                }
            });
            stream.isReadyToPublish = false;
            stream.isScreenRequestedReady = false;
            delete stream.connection.getStreams()[stream.streamId];
            publisher.ee.emitEvent('streamDestroyed', [{
                    stream: publisher.stream,
                    preventDefault: function () { _this.ee.removeEvent('stream-destroyed-default'); }
                }]);
            publisher.ee.emitEvent('stream-destroyed-default', [{
                    stream: publisher.stream
                }]);
        }
    };
    SessionInternal.prototype.getRemoteStreams = function () {
        return this.remoteStreams;
    };
    SessionInternal.prototype.addParticipantSpeaking = function (participantId) {
        this.publishersSpeaking.push(participantId);
        this.ee.emitEvent('publisherStartSpeaking', [{
                participantId: participantId
            }]);
    };
    SessionInternal.prototype.removeParticipantSpeaking = function (participantId) {
        var pos = -1;
        for (var i = 0; i < this.publishersSpeaking.length; i++) {
            if (this.publishersSpeaking[i] == participantId) {
                pos = i;
                break;
            }
        }
        if (pos != -1) {
            this.publishersSpeaking.splice(pos, 1);
            this.ee.emitEvent('publisherStopSpeaking', [{
                    participantId: participantId
                }]);
        }
    };
    SessionInternal.prototype.stringClientMetadata = function (metadata) {
        if (!(typeof metadata === 'string')) {
            return JSON.stringify(metadata);
        }
        else {
            return metadata;
        }
    };
    SessionInternal.prototype.randomToken = function () {
        return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    };
    return SessionInternal;
}());
exports.SessionInternal = SessionInternal;
//# sourceMappingURL=SessionInternal.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/Stream.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

exports.__esModule = true;
var OpenViduError_1 = __webpack_require__("../../../../openvidu-browser/lib/OpenViduInternal/OpenViduError.js");
var WebRtcStats_1 = __webpack_require__("../../../../openvidu-browser/lib/OpenViduInternal/WebRtcStats.js");
var EventEmitter = __webpack_require__("../../../../openvidu-browser/node_modules/wolfy87-eventemitter/EventEmitter.js");
var kurentoUtils = __webpack_require__("../../../../openvidu-browser/lib/KurentoUtils/kurento-utils-js/index.js");
var adapter = __webpack_require__("../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/adapter_core.js");
if (window) {
    window["adapter"] = adapter;
}
function jq(id) {
    return id.replace(/(@|:|\.|\[|\]|,)/g, "\\$1");
}
function show(id) {
    document.getElementById(jq(id)).style.display = 'block';
}
function hide(id) {
    document.getElementById(jq(id)).style.display = 'none';
}
var Stream = /** @class */ (function () {
    function Stream(openVidu, local, room, options) {
        var _this = this;
        this.openVidu = openVidu;
        this.local = local;
        this.room = room;
        this.ee = new EventEmitter();
        this.showMyRemote = false;
        this.localMirrored = false;
        this.chanId = 0;
        this.dataChannelOpened = false;
        this.isReadyToPublish = false;
        this.isPublisherPublished = false;
        this.isVideoELementCreated = false;
        this.accessIsAllowed = false;
        this.accessIsDenied = false;
        this.isScreenRequestedReady = false;
        this.isScreenRequested = false;
        if (options !== 'screen-options') {
            // Outbound stream (not screen share) or Inbound stream
            if ('id' in options) {
                this.inboundOptions = options;
            }
            else {
                this.outboundOptions = options;
            }
            this.streamId = (options.id != null) ? options.id : ((options.sendVideo) ? "CAMERA" : "MICRO");
            this.typeOfVideo = (options.typeOfVideo != null) ? options.typeOfVideo : '';
            if ('recvAudio' in options) {
                // Set Connection for an Inbound stream (for Outbound streams will be set on Session.Publish(Publisher))
                this.connection = options.connection;
            }
        }
        else {
            // Outbound stream for screen share
            this.isScreenRequested = true;
            this.typeOfVideo = 'SCREEN';
        }
        this.addEventListener('mediastream-updated', function () {
            if (_this.video)
                _this.video.srcObject = _this.mediaStream;
            console.debug("Video srcObject [" + _this.mediaStream + "] added to stream [" + _this.streamId + "]");
        });
    }
    Stream.prototype.emitStreamReadyEvent = function () {
        this.ee.emitEvent('stream-ready');
    };
    Stream.prototype.removeVideo = function (parentElement) {
        if (this.video) {
            if (typeof parentElement === "string") {
                document.getElementById(parentElement).removeChild(this.video);
                this.ee.emitEvent('video-removed');
            }
            else if (parentElement instanceof Element) {
                parentElement.removeChild(this.video);
                this.ee.emitEvent('video-removed');
            }
            else if (!parentElement) {
                if (document.getElementById(this.parentId)) {
                    document.getElementById(this.parentId).removeChild(this.video);
                    this.ee.emitEvent('video-removed');
                }
            }
            delete this.video;
        }
    };
    Stream.prototype.getVideoElement = function () {
        return this.video;
    };
    Stream.prototype.setVideoElement = function (video) {
        if (!!video)
            this.video = video;
    };
    Stream.prototype.getParentId = function () {
        return this.parentId;
    };
    Stream.prototype.getRecvVideo = function () {
        return this.inboundOptions.recvVideo;
    };
    Stream.prototype.getRecvAudio = function () {
        return this.inboundOptions.recvAudio;
    };
    Stream.prototype.getSendVideo = function () {
        return this.outboundOptions.sendVideo;
    };
    Stream.prototype.getSendAudio = function () {
        return this.outboundOptions.sendAudio;
    };
    Stream.prototype.subscribeToMyRemote = function () {
        this.showMyRemote = true;
    };
    Stream.prototype.displayMyRemote = function () {
        return this.showMyRemote;
    };
    Stream.prototype.mirrorLocalStream = function (wr) {
        this.showMyRemote = true;
        this.localMirrored = true;
        if (wr) {
            this.mediaStream = wr;
            this.ee.emitEvent('mediastream-updated');
        }
    };
    Stream.prototype.isLocalMirrored = function () {
        return this.localMirrored;
    };
    Stream.prototype.getChannelName = function () {
        return this.streamId + '_' + this.chanId++;
    };
    Stream.prototype.isDataChannelEnabled = function () {
        return this.outboundOptions.dataChannel;
    };
    Stream.prototype.isDataChannelOpened = function () {
        return this.dataChannelOpened;
    };
    Stream.prototype.onDataChannelOpen = function (event) {
        console.debug('Data channel is opened');
        this.dataChannelOpened = true;
    };
    Stream.prototype.onDataChannelClosed = function (event) {
        console.debug('Data channel is closed');
        this.dataChannelOpened = false;
    };
    Stream.prototype.sendData = function (data) {
        if (this.wp === undefined) {
            throw new Error('WebRTC peer has not been created yet');
        }
        if (!this.dataChannelOpened) {
            throw new Error('Data channel is not opened');
        }
        console.info("Sending through data channel: " + data);
        this.wp.send(data);
    };
    Stream.prototype.getMediaStream = function () {
        return this.mediaStream;
    };
    Stream.prototype.getWebRtcPeer = function () {
        return this.wp;
    };
    Stream.prototype.getRTCPeerConnection = function () {
        return this.wp.peerConnection;
    };
    Stream.prototype.addEventListener = function (eventName, listener) {
        this.ee.addListener(eventName, listener);
    };
    Stream.prototype.addOnceEventListener = function (eventName, listener) {
        this.ee.addOnceListener(eventName, listener);
    };
    Stream.prototype.removeListener = function (eventName) {
        this.ee.removeAllListeners(eventName);
    };
    Stream.prototype.showSpinner = function (spinnerParentId) {
        var progress = document.createElement('div');
        progress.id = 'progress-' + this.streamId;
        progress.style.background = "center transparent url('img/spinner.gif') no-repeat";
        var spinnerParent = document.getElementById(spinnerParentId);
        if (spinnerParent) {
            spinnerParent.appendChild(progress);
        }
    };
    Stream.prototype.hideSpinner = function (spinnerId) {
        spinnerId = (spinnerId === undefined) ? this.streamId : spinnerId;
        hide('progress-' + spinnerId);
    };
    Stream.prototype.playOnlyVideo = function (parentElement, thumbnailId) {
        var _this = this;
        if (!!parentElement) {
            this.video = document.createElement('video');
            this.video.id = (this.local ? 'local-' : 'remote-') + 'video-' + this.streamId;
            this.video.autoplay = true;
            this.video.controls = false;
            this.ee.emitEvent('mediastream-updated');
            if (this.local && !this.displayMyRemote()) {
                this.video.muted = true;
                this.video.onplaying = function () {
                    console.info("Local 'Stream' with id [" + _this.streamId + "] video is now playing");
                    _this.ee.emitEvent('video-is-playing', [{
                            element: _this.video
                        }]);
                };
            }
            else {
                this.video.title = this.streamId;
            }
            if (typeof parentElement === "string") {
                this.parentId = parentElement;
                var parentElementDom = document.getElementById(parentElement);
                if (parentElementDom) {
                    this.video = parentElementDom.appendChild(this.video);
                    this.ee.emitEvent('video-element-created-by-stream', [{
                            element: this.video
                        }]);
                    this.isVideoELementCreated = true;
                }
            }
            else {
                this.parentId = parentElement.id;
                this.video = parentElement.appendChild(this.video);
            }
            this.isReadyToPublish = true;
            return this.video;
        }
        return null;
    };
    Stream.prototype.playThumbnail = function (thumbnailId) {
        var container = document.createElement('div');
        container.className = "participant";
        container.id = this.streamId;
        var thumbnail = document.getElementById(thumbnailId);
        if (thumbnail) {
            thumbnail.appendChild(container);
        }
        var name = document.createElement('div');
        container.appendChild(name);
        var userName = this.streamId.replace('_webcam', '');
        if (userName.length >= 16) {
            userName = userName.substring(0, 16) + "...";
        }
        name.appendChild(document.createTextNode(userName));
        name.id = "name-" + this.streamId;
        name.className = "name";
        name.title = this.streamId;
        this.showSpinner(thumbnailId);
        return this.playOnlyVideo(container, thumbnailId);
    };
    Stream.prototype.getParticipant = function () {
        return this.connection;
    };
    Stream.prototype.requestCameraAccess = function (callback) {
        var _this = this;
        var constraints = this.outboundOptions.mediaConstraints;
        /*let constraints2 = {
            audio: true,
            video: {
                width: {
                    ideal: 1280
                },
                frameRate: {
                    ideal: 15
                }
            }
        };*/
        this.userMediaHasVideo(function (hasVideo) {
            if (!hasVideo) {
                if (_this.outboundOptions.sendVideo) {
                    callback(new OpenViduError_1.OpenViduError("NO_VIDEO_DEVICE" /* NO_VIDEO_DEVICE */, 'You have requested camera access but there is no video input device available. Trying to connect with an audio input device only'), _this);
                }
                if (!_this.outboundOptions.sendAudio) {
                    callback(new OpenViduError_1.OpenViduError("NO_INPUT_DEVICE" /* NO_INPUT_DEVICE */, 'You must init Publisher object with audio or video streams enabled'), undefined);
                }
                else {
                    constraints.video = false;
                    _this.outboundOptions.sendVideo = false;
                    _this.requestCameraAccesAux(constraints, callback);
                }
            }
            else {
                _this.requestCameraAccesAux(constraints, callback);
            }
        });
    };
    Stream.prototype.requestCameraAccesAux = function (constraints, callback) {
        var _this = this;
        console.log(constraints);
        navigator.mediaDevices.getUserMedia(constraints)
            .then(function (userStream) {
            _this.cameraAccessSuccess(userStream, callback);
        })["catch"](function (error) {
            _this.accessIsDenied = true;
            _this.accessIsAllowed = false;
            var errorName;
            var errorMessage = error.toString();
            ;
            if (!_this.isScreenRequested) {
                errorName = _this.outboundOptions.sendVideo ? "CAMERA_ACCESS_DENIED" /* CAMERA_ACCESS_DENIED */ : "MICROPHONE_ACCESS_DENIED" /* MICROPHONE_ACCESS_DENIED */;
            }
            else {
                errorName = "SCREEN_CAPTURE_DENIED" /* SCREEN_CAPTURE_DENIED */; // This code is only reachable for Firefox
            }
            callback(new OpenViduError_1.OpenViduError(errorName, errorMessage), undefined);
        });
    };
    Stream.prototype.cameraAccessSuccess = function (userStream, callback) {
        this.accessIsAllowed = true;
        this.accessIsDenied = false;
        this.ee.emitEvent('access-allowed-by-publisher');
        if (userStream.getAudioTracks()[0] != null) {
            userStream.getAudioTracks()[0].enabled = this.outboundOptions.activeAudio;
        }
        if (userStream.getVideoTracks()[0] != null) {
            userStream.getVideoTracks()[0].enabled = this.outboundOptions.activeVideo;
        }
        this.mediaStream = userStream;
        this.ee.emitEvent('mediastream-updated');
        callback(undefined, this);
    };
    Stream.prototype.userMediaHasVideo = function (callback) {
        // If the user is going to publish its screen there's a video source
        if (this.isScreenRequested) {
            callback(true);
            return;
        }
        else {
            // List all input devices and serach for a video kind
            navigator.mediaDevices.enumerateDevices().then(function (mediaDevices) {
                var videoInput = mediaDevices.filter(function (deviceInfo) {
                    return deviceInfo.kind === 'videoinput';
                })[0];
                callback(videoInput != null);
            });
        }
    };
    Stream.prototype.publishVideoCallback = function (error, sdpOfferParam, wp) {
        var _this = this;
        if (error) {
            return console.error("(publish) SDP offer error: "
                + JSON.stringify(error));
        }
        console.debug("Sending SDP offer to publish as "
            + this.streamId, sdpOfferParam);
        this.openVidu.sendRequest("publishVideo", {
            sdpOffer: sdpOfferParam,
            doLoopback: this.displayMyRemote() || false,
            audioActive: this.outboundOptions.sendAudio,
            videoActive: this.outboundOptions.sendVideo,
            typeOfVideo: ((this.outboundOptions.sendVideo) ? ((this.isScreenRequested) ? 'SCREEN' : 'CAMERA') : '')
        }, function (error, response) {
            if (error) {
                console.error("Error on publishVideo: " + JSON.stringify(error));
            }
            else {
                _this.processSdpAnswer(response.sdpAnswer);
                console.info("'Publisher' succesfully published to session");
            }
        });
    };
    Stream.prototype.startVideoCallback = function (error, sdpOfferParam, wp) {
        var _this = this;
        if (error) {
            return console.error("(subscribe) SDP offer error: "
                + JSON.stringify(error));
        }
        console.debug("Sending SDP offer to subscribe to "
            + this.streamId, sdpOfferParam);
        this.openVidu.sendRequest("receiveVideoFrom", {
            sender: this.streamId,
            sdpOffer: sdpOfferParam
        }, function (error, response) {
            if (error) {
                console.error("Error on recvVideoFrom: " + JSON.stringify(error));
            }
            else {
                _this.processSdpAnswer(response.sdpAnswer);
            }
        });
    };
    Stream.prototype.initWebRtcPeer = function (sdpOfferCallback) {
        var _this = this;
        if (this.local) {
            var userMediaConstraints = {
                audio: this.outboundOptions.sendAudio,
                video: this.outboundOptions.sendVideo
            };
            var options = {
                videoStream: this.mediaStream,
                mediaConstraints: userMediaConstraints,
                onicecandidate: this.connection.sendIceCandidate.bind(this.connection)
            };
            if (this.outboundOptions.dataChannel) {
                options.dataChannelConfig = {
                    id: this.getChannelName(),
                    onopen: this.onDataChannelOpen,
                    onclose: this.onDataChannelClosed
                };
                options.dataChannels = true;
            }
            if (this.displayMyRemote()) {
                this.wp = kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function (error) {
                    if (error) {
                        return console.error(error);
                    }
                    _this.wp.generateOffer(sdpOfferCallback.bind(_this));
                });
            }
            else {
                this.wp = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function (error) {
                    if (error) {
                        return console.error(error);
                    }
                    _this.wp.generateOffer(sdpOfferCallback.bind(_this));
                });
            }
            this.isPublisherPublished = true;
            this.ee.emitEvent('stream-created-by-publisher');
        }
        else {
            var offerConstraints = {
                audio: this.inboundOptions.recvAudio,
                video: this.inboundOptions.recvVideo
            };
            console.debug("'Session.subscribe(Stream)' called. Constraints of generate SDP offer", offerConstraints);
            var options = {
                onicecandidate: this.connection.sendIceCandidate.bind(this.connection),
                mediaConstraints: offerConstraints
            };
            this.wp = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function (error) {
                if (error) {
                    return console.error(error);
                }
                _this.wp.generateOffer(sdpOfferCallback.bind(_this));
            });
        }
        console.debug("Waiting for SDP offer to be generated ("
            + (this.local ? "local" : "remote") + " 'Stream': " + this.streamId + ")");
    };
    Stream.prototype.publish = function () {
        var _this = this;
        // FIXME: Throw error when stream is not local
        if (this.isReadyToPublish) {
            this.initWebRtcPeer(this.publishVideoCallback);
        }
        else {
            this.ee.once('stream-ready', function (streamEvent) {
                _this.publish();
            });
        }
        // FIXME: Now we have coupled connecting to a room and adding a
        // stream to this room. But in the new API, there are two steps.
        // This is the second step. For now, it do nothing.
    };
    Stream.prototype.subscribe = function () {
        // FIXME: In the current implementation all participants are subscribed
        // automatically to all other participants. We use this method only to
        // negotiate SDP
        this.initWebRtcPeer(this.startVideoCallback);
    };
    Stream.prototype.processSdpAnswer = function (sdpAnswer) {
        var _this = this;
        var answer = new RTCSessionDescription({
            type: 'answer',
            sdp: sdpAnswer
        });
        console.debug(this.streamId + ": set peer connection with recvd SDP answer", sdpAnswer);
        var participantId = this.streamId;
        var pc = this.wp.peerConnection;
        pc.setRemoteDescription(answer, function () {
            // Avoids to subscribe to your own stream remotely 
            // except when showMyRemote is true
            if (!_this.local || _this.displayMyRemote()) {
                _this.mediaStream = pc.getRemoteStreams()[0];
                console.debug("Peer remote stream", _this.mediaStream);
                if (_this.mediaStream != undefined) {
                    _this.ee.emitEvent('mediastream-updated');
                    if (_this.mediaStream.getAudioTracks()[0] != null) {
                        _this.speechEvent = kurentoUtils.WebRtcPeer.hark(_this.mediaStream, { threshold: _this.room.thresholdSpeaker });
                        _this.speechEvent.on('speaking', function () {
                            //this.room.addParticipantSpeaking(participantId);
                            _this.room.emitEvent('publisherStartSpeaking', [{
                                    connection: _this.connection,
                                    streamId: _this.streamId
                                }]);
                        });
                        _this.speechEvent.on('stopped_speaking', function () {
                            //this.room.removeParticipantSpeaking(participantId);
                            _this.room.emitEvent('publisherStopSpeaking', [{
                                    connection: _this.connection,
                                    streamId: _this.streamId
                                }]);
                        });
                    }
                }
                if (!!_this.video) {
                    // let thumbnailId = this.video.thumb;
                    _this.video.onplaying = function () {
                        if (_this.local && _this.displayMyRemote()) {
                            console.info("Your own remote 'Stream' with id [" + _this.streamId + "] video is now playing");
                            _this.ee.emitEvent('remote-video-is-playing', [{
                                    element: _this.video
                                }]);
                        }
                        else if (!_this.local && !_this.displayMyRemote()) {
                            console.info("Remote 'Stream' with id [" + _this.streamId + "] video is now playing");
                            _this.ee.emitEvent('video-is-playing', [{
                                    element: _this.video
                                }]);
                        }
                        //show(thumbnailId);
                        //this.hideSpinner(this.streamId);
                    };
                }
                _this.room.emitEvent('stream-subscribed', [{
                        stream: _this
                    }]);
            }
            _this.initWebRtcStats();
        }, function (error) {
            console.error(_this.streamId + ": Error setting SDP to the peer connection: "
                + JSON.stringify(error));
        });
    };
    Stream.prototype.unpublish = function () {
        if (this.wp) {
            this.wp.dispose();
        }
        else {
            if (this.mediaStream) {
                this.mediaStream.getAudioTracks().forEach(function (track) {
                    track.stop && track.stop();
                });
                this.mediaStream.getVideoTracks().forEach(function (track) {
                    track.stop && track.stop();
                });
            }
        }
        if (this.speechEvent) {
            this.speechEvent.stop();
        }
        console.info(this.streamId + ": Stream '" + this.streamId + "' unpublished");
    };
    Stream.prototype.dispose = function () {
        function disposeElement(element) {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }
        disposeElement("progress-" + this.streamId);
        if (this.wp) {
            this.wp.dispose();
        }
        else {
            if (this.mediaStream) {
                this.mediaStream.getAudioTracks().forEach(function (track) {
                    track.stop && track.stop();
                });
                this.mediaStream.getVideoTracks().forEach(function (track) {
                    track.stop && track.stop();
                });
            }
        }
        if (this.speechEvent) {
            this.speechEvent.stop();
        }
        this.stopWebRtcStats();
        console.info((this.local ? "Local " : "Remote ") + "'Stream' with id [" + this.streamId + "]' has been succesfully disposed");
    };
    Stream.prototype.configureScreenOptions = function (options) {
        this.outboundOptions = options;
        this.streamId = "SCREEN";
    };
    Stream.prototype.initWebRtcStats = function () {
        this.webRtcStats = new WebRtcStats_1.WebRtcStats(this);
        this.webRtcStats.initWebRtcStats();
    };
    Stream.prototype.stopWebRtcStats = function () {
        if (this.webRtcStats != null && this.webRtcStats.isEnabled()) {
            this.webRtcStats.stopWebRtcStats();
        }
    };
    return Stream;
}());
exports.Stream = Stream;
//# sourceMappingURL=Stream.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/OpenViduInternal/WebRtcStats.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

exports.__esModule = true;
var adapter = __webpack_require__("../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/adapter_core.js");
var WebRtcStats = /** @class */ (function () {
    function WebRtcStats(stream) {
        this.stream = stream;
        this.webRtcStatsEnabled = false;
        this.statsInterval = 1;
        this.stats = {
            "inbound": {
                "audio": {
                    "bytesReceived": 0,
                    "packetsReceived": 0,
                    "packetsLost": 0
                },
                "video": {
                    "bytesReceived": 0,
                    "packetsReceived": 0,
                    "packetsLost": 0,
                    "framesDecoded": 0,
                    "nackCount": 0
                }
            },
            "outbound": {
                "audio": {
                    "bytesSent": 0,
                    "packetsSent": 0
                },
                "video": {
                    "bytesSent": 0,
                    "packetsSent": 0,
                    "framesEncoded": 0,
                    "nackCount": 0
                }
            }
        };
    }
    WebRtcStats.prototype.isEnabled = function () {
        return this.webRtcStatsEnabled;
    };
    WebRtcStats.prototype.initWebRtcStats = function () {
        var _this = this;
        var elastestInstrumentation = localStorage.getItem('elastest-instrumentation');
        if (elastestInstrumentation) {
            // ElasTest instrumentation object found in local storage
            console.warn("WebRtc stats enabled for stream " + this.stream.streamId + " of connection " + this.stream.connection.connectionId);
            this.webRtcStatsEnabled = true;
            var instrumentation_1 = JSON.parse(elastestInstrumentation);
            this.statsInterval = instrumentation_1.webrtc.interval; // Interval in seconds
            console.warn("localStorage item: " + JSON.stringify(instrumentation_1));
            this.webRtcStatsIntervalId = setInterval(function () {
                _this.sendStatsToHttpEndpoint(instrumentation_1);
            }, this.statsInterval * 1000);
            return;
        }
        console.debug("WebRtc stats not enabled");
    };
    WebRtcStats.prototype.stopWebRtcStats = function () {
        if (this.webRtcStatsEnabled) {
            clearInterval(this.webRtcStatsIntervalId);
            console.warn("WebRtc stats stopped for disposed stream " + this.stream.streamId + " of connection " + this.stream.connection.connectionId);
        }
    };
    WebRtcStats.prototype.sendStatsToHttpEndpoint = function (instrumentation) {
        var _this = this;
        var sendPost = function (json) {
            var http = new XMLHttpRequest();
            var url = instrumentation.webrtc.httpEndpoint;
            http.open("POST", url, true);
            http.setRequestHeader("Content-type", "application/json");
            http.onreadystatechange = function () {
                if (http.readyState == 4 && http.status == 200) {
                    console.log("WebRtc stats succesfully sent to " + url + " for stream " + _this.stream.streamId + " of connection " + _this.stream.connection.connectionId);
                }
            };
            http.send(json);
        };
        var f = function (stats) {
            if (adapter.browserDetails.browser === 'firefox') {
                stats.forEach(function (stat) {
                    var json = {};
                    if ((stat.type === 'inbound-rtp') &&
                        (
                        // Avoid firefox empty outbound-rtp statistics
                        stat.nackCount != null &&
                            stat.isRemote === false &&
                            stat.id.startsWith('inbound') &&
                            stat.remoteId.startsWith('inbound'))) {
                        var metricId = 'webrtc_inbound_' + stat.mediaType + '_' + stat.ssrc;
                        var jitter = stat.jitter * 1000;
                        var metrics = {
                            "bytesReceived": (stat.bytesReceived - _this.stats.inbound[stat.mediaType].bytesReceived) / _this.statsInterval,
                            "jitter": jitter,
                            "packetsReceived": (stat.packetsReceived - _this.stats.inbound[stat.mediaType].packetsReceived) / _this.statsInterval,
                            "packetsLost": (stat.packetsLost - _this.stats.inbound[stat.mediaType].packetsLost) / _this.statsInterval
                        };
                        var units = {
                            "bytesReceived": "bytes",
                            "jitter": "ms",
                            "packetsReceived": "packets",
                            "packetsLost": "packets"
                        };
                        if (stat.mediaType === 'video') {
                            metrics['framesDecoded'] = (stat.framesDecoded - _this.stats.inbound.video.framesDecoded) / _this.statsInterval;
                            metrics['nackCount'] = (stat.nackCount - _this.stats.inbound.video.nackCount) / _this.statsInterval;
                            units['framesDecoded'] = "frames";
                            units['nackCount'] = "packets";
                            _this.stats.inbound.video.framesDecoded = stat.framesDecoded;
                            _this.stats.inbound.video.nackCount = stat.nackCount;
                        }
                        _this.stats.inbound[stat.mediaType].bytesReceived = stat.bytesReceived;
                        _this.stats.inbound[stat.mediaType].packetsReceived = stat.packetsReceived;
                        _this.stats.inbound[stat.mediaType].packetsLost = stat.packetsLost;
                        json = {
                            "@timestamp": new Date(stat.timestamp).toISOString(),
                            "exec": instrumentation.exec,
                            "component": instrumentation.component,
                            "stream": "webRtc",
                            "type": metricId,
                            "stream_type": "composed_metrics",
                            "units": units
                        };
                        json[metricId] = metrics;
                        sendPost(JSON.stringify(json));
                    }
                    else if ((stat.type === 'outbound-rtp') &&
                        (
                        // Avoid firefox empty inbound-rtp statistics
                        stat.isRemote === false &&
                            stat.id.toLowerCase().includes('outbound'))) {
                        var metricId = 'webrtc_outbound_' + stat.mediaType + '_' + stat.ssrc;
                        var metrics = {
                            "bytesSent": (stat.bytesSent - _this.stats.outbound[stat.mediaType].bytesSent) / _this.statsInterval,
                            "packetsSent": (stat.packetsSent - _this.stats.outbound[stat.mediaType].packetsSent) / _this.statsInterval
                        };
                        var units = {
                            "bytesSent": "bytes",
                            "packetsSent": "packets"
                        };
                        if (stat.mediaType === 'video') {
                            metrics['framesEncoded'] = (stat.framesEncoded - _this.stats.outbound.video.framesEncoded) / _this.statsInterval;
                            units['framesEncoded'] = "frames";
                            _this.stats.outbound.video.framesEncoded = stat.framesEncoded;
                        }
                        _this.stats.outbound[stat.mediaType].bytesSent = stat.bytesSent;
                        _this.stats.outbound[stat.mediaType].packetsSent = stat.packetsSent;
                        json = {
                            "@timestamp": new Date(stat.timestamp).toISOString(),
                            "exec": instrumentation.exec,
                            "component": instrumentation.component,
                            "stream": "webRtc",
                            "type": metricId,
                            "stream_type": "composed_metrics",
                            "units": units
                        };
                        json[metricId] = metrics;
                        sendPost(JSON.stringify(json));
                    }
                });
            }
            else if (adapter.browserDetails.browser === 'chrome') {
                for (var _i = 0, _a = Object.keys(stats); _i < _a.length; _i++) {
                    var key = _a[_i];
                    var stat = stats[key];
                    if (stat.type === 'ssrc') {
                        var json = {};
                        if ('bytesReceived' in stat && ((stat.mediaType === 'audio' && 'audioOutputLevel' in stat) ||
                            (stat.mediaType === 'video' && 'qpSum' in stat))) {
                            // inbound-rtp
                            var metricId = 'webrtc_inbound_' + stat.mediaType + '_' + stat.ssrc;
                            var metrics = {
                                "bytesReceived": (stat.bytesReceived - _this.stats.inbound[stat.mediaType].bytesReceived) / _this.statsInterval,
                                "jitter": stat.googJitterBufferMs,
                                "packetsReceived": (stat.packetsReceived - _this.stats.inbound[stat.mediaType].packetsReceived) / _this.statsInterval,
                                "packetsLost": (stat.packetsLost - _this.stats.inbound[stat.mediaType].packetsLost) / _this.statsInterval
                            };
                            var units = {
                                "bytesReceived": "bytes",
                                "jitter": "ms",
                                "packetsReceived": "packets",
                                "packetsLost": "packets"
                            };
                            if (stat.mediaType === 'video') {
                                metrics['framesDecoded'] = (stat.framesDecoded - _this.stats.inbound.video.framesDecoded) / _this.statsInterval;
                                metrics['nackCount'] = (stat.googNacksSent - _this.stats.inbound.video.nackCount) / _this.statsInterval;
                                units['framesDecoded'] = "frames";
                                units['nackCount'] = "packets";
                                _this.stats.inbound.video.framesDecoded = stat.framesDecoded;
                                _this.stats.inbound.video.nackCount = stat.googNacksSent;
                            }
                            _this.stats.inbound[stat.mediaType].bytesReceived = stat.bytesReceived;
                            _this.stats.inbound[stat.mediaType].packetsReceived = stat.packetsReceived;
                            _this.stats.inbound[stat.mediaType].packetsLost = stat.packetsLost;
                            json = {
                                "@timestamp": new Date(stat.timestamp).toISOString(),
                                "exec": instrumentation.exec,
                                "component": instrumentation.component,
                                "stream": "webRtc",
                                "type": metricId,
                                "stream_type": "composed_metrics",
                                "units": units
                            };
                            json[metricId] = metrics;
                            sendPost(JSON.stringify(json));
                        }
                        else if ('bytesSent' in stat) {
                            // outbound-rtp
                            var metricId = 'webrtc_outbound_' + stat.mediaType + '_' + stat.ssrc;
                            var metrics = {
                                "bytesSent": (stat.bytesSent - _this.stats.outbound[stat.mediaType].bytesSent) / _this.statsInterval,
                                "packetsSent": (stat.packetsSent - _this.stats.outbound[stat.mediaType].packetsSent) / _this.statsInterval
                            };
                            var units = {
                                "bytesSent": "bytes",
                                "packetsSent": "packets"
                            };
                            if (stat.mediaType === 'video') {
                                metrics['framesEncoded'] = (stat.framesEncoded - _this.stats.outbound.video.framesEncoded) / _this.statsInterval;
                                units['framesEncoded'] = "frames";
                                _this.stats.outbound.video.framesEncoded = stat.framesEncoded;
                            }
                            _this.stats.outbound[stat.mediaType].bytesSent = stat.bytesSent;
                            _this.stats.outbound[stat.mediaType].packetsSent = stat.packetsSent;
                            json = {
                                "@timestamp": new Date(stat.timestamp).toISOString(),
                                "exec": instrumentation.exec,
                                "component": instrumentation.component,
                                "stream": "webRtc",
                                "type": metricId,
                                "stream_type": "composed_metrics",
                                "units": units
                            };
                            json[metricId] = metrics;
                            sendPost(JSON.stringify(json));
                        }
                    }
                }
            }
        };
        this.getStatsAgnostic(this.stream.getRTCPeerConnection(), null, f, function (error) { console.log(error); });
    };
    WebRtcStats.prototype.standardizeReport = function (response) {
        if (adapter.browserDetails.browser === 'firefox') {
            return response;
        }
        var standardReport = {};
        response.result().forEach(function (report) {
            var standardStats = {
                id: report.id,
                timestamp: report.timestamp,
                type: report.type
            };
            report.names().forEach(function (name) {
                standardStats[name] = report.stat(name);
            });
            standardReport[standardStats.id] = standardStats;
        });
        return standardReport;
    };
    WebRtcStats.prototype.getStatsAgnostic = function (pc, selector, successCb, failureCb) {
        var _this = this;
        if (adapter.browserDetails.browser === 'firefox') {
            // getStats takes args in different order in Chrome and Firefox
            return pc.getStats(selector, function (response) {
                var report = _this.standardizeReport(response);
                successCb(report);
            }, failureCb);
        }
        else if (adapter.browserDetails.browser === 'chrome') {
            // In Chrome, the first two arguments are reversed
            return pc.getStats(function (response) {
                var report = _this.standardizeReport(response);
                successCb(report);
            }, selector, failureCb);
        }
    };
    return WebRtcStats;
}());
exports.WebRtcStats = WebRtcStats;
//# sourceMappingURL=WebRtcStats.js.map

/***/ }),

/***/ "../../../../openvidu-browser/lib/ScreenSharing/Screen-Capturing-Auto.js":
/***/ (function(module, exports) {

// Last time updated at Feb 16, 2017, 08:32:23
// Latest file can be found here: https://cdn.webrtc-experiment.com/getScreenId.js
// Muaz Khan         - www.MuazKhan.com
// MIT License       - www.WebRTC-Experiment.com/licence
// Documentation     - https://github.com/muaz-khan/getScreenId.
// ______________
// getScreenId.js
/*
getScreenId(function (error, sourceId, screen_constraints) {
    // error    == null || 'permission-denied' || 'not-installed' || 'installed-disabled' || 'not-chrome'
    // sourceId == null || 'string' || 'firefox'
    
    if(sourceId == 'firefox') {
        navigator.mozGetUserMedia(screen_constraints, onSuccess, onFailure);
    }
    else navigator.webkitGetUserMedia(screen_constraints, onSuccess, onFailure);
});
*/
window.getScreenId = function (callback) {
    // for Firefox:
    // sourceId == 'firefox'
    // screen_constraints = {...}
    if (!!navigator.mozGetUserMedia) {
        callback(null, 'firefox', {
            video: {
                mozMediaSource: 'window',
                mediaSource: 'window'
            }
        });
        return;
    }
    window.addEventListener('message', onIFrameCallback);
    function onIFrameCallback(event) {
        if (!event.data)
            return;
        if (event.data.chromeMediaSourceId) {
            if (event.data.chromeMediaSourceId === 'PermissionDeniedError') {
                callback('permission-denied');
            }
            else
                callback(null, event.data.chromeMediaSourceId, getScreenConstraints(null, event.data.chromeMediaSourceId));
        }
        if (event.data.chromeExtensionStatus) {
            callback(event.data.chromeExtensionStatus, null, getScreenConstraints(event.data.chromeExtensionStatus));
        }
        // this event listener is no more needed
        window.removeEventListener('message', onIFrameCallback);
    }
    setTimeout(postGetSourceIdMessage, 100);
};
function getScreenConstraints(error, sourceId) {
    var screen_constraints = {
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: error ? 'screen' : 'desktop',
                maxWidth: window.screen.width > 1920 ? window.screen.width : 1920,
                maxHeight: window.screen.height > 1080 ? window.screen.height : 1080
            },
            optional: []
        }
    };
    if (sourceId) {
        screen_constraints.video.mandatory.chromeMediaSourceId = sourceId;
    }
    return screen_constraints;
}
function postGetSourceIdMessage() {
    if (!iframe) {
        loadIFrame(postGetSourceIdMessage);
        return;
    }
    if (!iframe.isLoaded) {
        setTimeout(postGetSourceIdMessage, 100);
        return;
    }
    iframe.contentWindow.postMessage({
        captureSourceId: true
    }, '*');
}
var iframe;
// this function is used in RTCMultiConnection v3
window.getScreenConstraints = function (callback) {
    loadIFrame(function () {
        getScreenId(function (error, sourceId, screen_constraints) {
            callback(error, screen_constraints.video);
        });
    });
};
function loadIFrame(loadCallback) {
    if (iframe) {
        loadCallback();
        return;
    }
    iframe = document.createElement('iframe');
    iframe.onload = function () {
        iframe.isLoaded = true;
        loadCallback();
    };
    iframe.src = 'https://www.webrtc-experiment.com/getSourceId/'; // https://wwww.yourdomain.com/getScreenId.html
    iframe.style.display = 'none';
    (document.body || document.documentElement).appendChild(iframe);
}
window.getChromeExtensionStatus = function (callback) {
    // for Firefox:
    if (!!navigator.mozGetUserMedia) {
        callback('installed-enabled');
        return;
    }
    window.addEventListener('message', onIFrameCallback);
    function onIFrameCallback(event) {
        if (!event.data)
            return;
        if (event.data.chromeExtensionStatus) {
            callback(event.data.chromeExtensionStatus);
        }
        // this event listener is no more needed
        window.removeEventListener('message', onIFrameCallback);
    }
    setTimeout(postGetChromeExtensionStatusMessage, 100);
};
function postGetChromeExtensionStatusMessage() {
    if (!iframe) {
        loadIFrame(postGetChromeExtensionStatusMessage);
        return;
    }
    if (!iframe.isLoaded) {
        setTimeout(postGetChromeExtensionStatusMessage, 100);
        return;
    }
    iframe.contentWindow.postMessage({
        getChromeExtensionStatus: true
    }, '*');
}
exports.getScreenId = getScreenId;
exports.getChromeExtensionStatus = getChromeExtensionStatus;
//# sourceMappingURL=Screen-Capturing-Auto.js.map

/***/ }),

/***/ "../../../../openvidu-browser/node_modules/freeice/index.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* jshint node: true */


var normalice = __webpack_require__("../../../../openvidu-browser/node_modules/normalice/index.js");

/**
  # freeice

  The `freeice` module is a simple way of getting random STUN or TURN server
  for your WebRTC application.  The list of servers (just STUN at this stage)
  were sourced from this [gist](https://gist.github.com/zziuni/3741933).

  ## Example Use

  The following demonstrates how you can use `freeice` with
  [rtc-quickconnect](https://github.com/rtc-io/rtc-quickconnect):

  <<< examples/quickconnect.js

  As the `freeice` module generates ice servers in a list compliant with the
  WebRTC spec you will be able to use it with raw `RTCPeerConnection`
  constructors and other WebRTC libraries.

  ## Hey, don't use my STUN/TURN server!

  If for some reason your free STUN or TURN server ends up in the
  list of servers ([stun](https://github.com/DamonOehlman/freeice/blob/master/stun.json) or
  [turn](https://github.com/DamonOehlman/freeice/blob/master/turn.json))
  that is used in this module, you can feel
  free to open an issue on this repository and those servers will be removed
  within 24 hours (or sooner).  This is the quickest and probably the most
  polite way to have something removed (and provides us some visibility
  if someone opens a pull request requesting that a server is added).

  ## Please add my server!

  If you have a server that you wish to add to the list, that's awesome! I'm
  sure I speak on behalf of a whole pile of WebRTC developers who say thanks.
  To get it into the list, feel free to either open a pull request or if you
  find that process a bit daunting then just create an issue requesting
  the addition of the server (make sure you provide all the details, and if
  you have a Terms of Service then including that in the PR/issue would be
  awesome).

  ## I know of a free server, can I add it?

  Sure, if you do your homework and make sure it is ok to use (I'm currently
  in the process of reviewing the terms of those STUN servers included from
  the original list).  If it's ok to go, then please see the previous entry
  for how to add it.

  ## Current List of Servers

  * current as at the time of last `README.md` file generation

  ### STUN

  <<< stun.json

  ### TURN

  <<< turn.json

**/

var freeice = module.exports = function(opts) {
  // if a list of servers has been provided, then use it instead of defaults
  var servers = {
    stun: (opts || {}).stun || __webpack_require__("../../../../openvidu-browser/node_modules/freeice/stun.json"),
    turn: (opts || {}).turn || __webpack_require__("../../../../openvidu-browser/node_modules/freeice/turn.json")
  };

  var stunCount = (opts || {}).stunCount || 2;
  var turnCount = (opts || {}).turnCount || 0;
  var selected;

  function getServers(type, count) {
    var out = [];
    var input = [].concat(servers[type]);
    var idx;

    while (input.length && out.length < count) {
      idx = (Math.random() * input.length) | 0;
      out = out.concat(input.splice(idx, 1));
    }

    return out.map(function(url) {
        //If it's a not a string, don't try to "normalice" it otherwise using type:url will screw it up
        if ((typeof url !== 'string') && (! (url instanceof String))) {
            return url;
        } else {
            return normalice(type + ':' + url);
        }
    });
  }

  // add stun servers
  selected = [].concat(getServers('stun', stunCount));

  if (turnCount) {
    selected = selected.concat(getServers('turn', turnCount));
  }

  return selected;
};


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/freeice/stun.json":
/***/ (function(module, exports) {

module.exports = ["stun.l.google.com:19302","stun1.l.google.com:19302","stun2.l.google.com:19302","stun3.l.google.com:19302","stun4.l.google.com:19302","stun.ekiga.net","stun.ideasip.com","stun.schlund.de","stun.stunprotocol.org:3478","stun.voiparound.com","stun.voipbuster.com","stun.voipstunt.com","stun.voxgratia.org","stun.services.mozilla.com"]

/***/ }),

/***/ "../../../../openvidu-browser/node_modules/freeice/turn.json":
/***/ (function(module, exports) {

module.exports = []

/***/ }),

/***/ "../../../../openvidu-browser/node_modules/hark/hark.js":
/***/ (function(module, exports, __webpack_require__) {

var WildEmitter = __webpack_require__("../../../../openvidu-browser/node_modules/wildemitter/wildemitter.js");

function getMaxVolume (analyser, fftBins) {
  var maxVolume = -Infinity;
  analyser.getFloatFrequencyData(fftBins);

  for(var i=4, ii=fftBins.length; i < ii; i++) {
    if (fftBins[i] > maxVolume && fftBins[i] < 0) {
      maxVolume = fftBins[i];
    }
  };

  return maxVolume;
}


var audioContextType;
if (typeof window !== 'undefined') {
  audioContextType = window.AudioContext || window.webkitAudioContext;
}
// use a single audio context due to hardware limits
var audioContext = null;
module.exports = function(stream, options) {
  var harker = new WildEmitter();


  // make it not break in non-supported browsers
  if (!audioContextType) return harker;

  //Config
  var options = options || {},
      smoothing = (options.smoothing || 0.1),
      interval = (options.interval || 50),
      threshold = options.threshold,
      play = options.play,
      history = options.history || 10,
      running = true;

  //Setup Audio Context
  if (!audioContext) {
    audioContext = new audioContextType();
  }
  var sourceNode, fftBins, analyser;

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = smoothing;
  fftBins = new Float32Array(analyser.frequencyBinCount);

  if (stream.jquery) stream = stream[0];
  if (stream instanceof HTMLAudioElement || stream instanceof HTMLVideoElement) {
    //Audio Tag
    sourceNode = audioContext.createMediaElementSource(stream);
    if (typeof play === 'undefined') play = true;
    threshold = threshold || -50;
  } else {
    //WebRTC Stream
    sourceNode = audioContext.createMediaStreamSource(stream);
    threshold = threshold || -50;
  }

  sourceNode.connect(analyser);
  if (play) analyser.connect(audioContext.destination);

  harker.speaking = false;

  harker.setThreshold = function(t) {
    threshold = t;
  };

  harker.setInterval = function(i) {
    interval = i;
  };

  harker.stop = function() {
    running = false;
    harker.emit('volume_change', -100, threshold);
    if (harker.speaking) {
      harker.speaking = false;
      harker.emit('stopped_speaking');
    }
    analyser.disconnect();
    sourceNode.disconnect();
  };
  harker.speakingHistory = [];
  for (var i = 0; i < history; i++) {
      harker.speakingHistory.push(0);
  }

  // Poll the analyser node to determine if speaking
  // and emit events if changed
  var looper = function() {
    setTimeout(function() {

      //check if stop has been called
      if(!running) {
        return;
      }

      var currentVolume = getMaxVolume(analyser, fftBins);

      harker.emit('volume_change', currentVolume, threshold);

      var history = 0;
      if (currentVolume > threshold && !harker.speaking) {
        // trigger quickly, short history
        for (var i = harker.speakingHistory.length - 3; i < harker.speakingHistory.length; i++) {
          history += harker.speakingHistory[i];
        }
        if (history >= 2) {
          harker.speaking = true;
          harker.emit('speaking');
        }
      } else if (currentVolume < threshold && harker.speaking) {
        for (var i = 0; i < harker.speakingHistory.length; i++) {
          history += harker.speakingHistory[i];
        }
        if (history == 0) {
          harker.speaking = false;
          harker.emit('stopped_speaking');
        }
      }
      harker.speakingHistory.shift();
      harker.speakingHistory.push(0 + (currentVolume > threshold));

      looper();
    }, interval);
  };
  looper();


  return harker;
}


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/inherits/inherits_browser.js":
/***/ (function(module, exports) {

if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/merge/merge.js":
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(module) {/*!
 * @name JavaScript/NodeJS Merge v1.2.0
 * @author yeikos
 * @repository https://github.com/yeikos/js.merge

 * Copyright 2014 yeikos - MIT license
 * https://raw.github.com/yeikos/js.merge/master/LICENSE
 */

;(function(isNode) {

	/**
	 * Merge one or more objects 
	 * @param bool? clone
	 * @param mixed,... arguments
	 * @return object
	 */

	var Public = function(clone) {

		return merge(clone === true, false, arguments);

	}, publicName = 'merge';

	/**
	 * Merge two or more objects recursively 
	 * @param bool? clone
	 * @param mixed,... arguments
	 * @return object
	 */

	Public.recursive = function(clone) {

		return merge(clone === true, true, arguments);

	};

	/**
	 * Clone the input removing any reference
	 * @param mixed input
	 * @return mixed
	 */

	Public.clone = function(input) {

		var output = input,
			type = typeOf(input),
			index, size;

		if (type === 'array') {

			output = [];
			size = input.length;

			for (index=0;index<size;++index)

				output[index] = Public.clone(input[index]);

		} else if (type === 'object') {

			output = {};

			for (index in input)

				output[index] = Public.clone(input[index]);

		}

		return output;

	};

	/**
	 * Merge two objects recursively
	 * @param mixed input
	 * @param mixed extend
	 * @return mixed
	 */

	function merge_recursive(base, extend) {

		if (typeOf(base) !== 'object')

			return extend;

		for (var key in extend) {

			if (typeOf(base[key]) === 'object' && typeOf(extend[key]) === 'object') {

				base[key] = merge_recursive(base[key], extend[key]);

			} else {

				base[key] = extend[key];

			}

		}

		return base;

	}

	/**
	 * Merge two or more objects
	 * @param bool clone
	 * @param bool recursive
	 * @param array argv
	 * @return object
	 */

	function merge(clone, recursive, argv) {

		var result = argv[0],
			size = argv.length;

		if (clone || typeOf(result) !== 'object')

			result = {};

		for (var index=0;index<size;++index) {

			var item = argv[index],

				type = typeOf(item);

			if (type !== 'object') continue;

			for (var key in item) {

				var sitem = clone ? Public.clone(item[key]) : item[key];

				if (recursive) {

					result[key] = merge_recursive(result[key], sitem);

				} else {

					result[key] = sitem;

				}

			}

		}

		return result;

	}

	/**
	 * Get type of variable
	 * @param mixed input
	 * @return string
	 *
	 * @see http://jsperf.com/typeofvar
	 */

	function typeOf(input) {

		return ({}).toString.call(input).slice(8, -1).toLowerCase();

	}

	if (isNode) {

		module.exports = Public;

	} else {

		window[publicName] = Public;

	}

})(typeof module === 'object' && module && typeof module.exports === 'object' && module.exports);
/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__("./node_modules/webpack/buildin/module.js")(module)))

/***/ }),

/***/ "../../../../openvidu-browser/node_modules/normalice/index.js":
/***/ (function(module, exports) {

/**
  # normalice

  Normalize an ice server configuration object (or plain old string) into a format
  that is usable in all browsers supporting WebRTC.  Primarily this module is designed
  to help with the transition of the `url` attribute of the configuration object to
  the `urls` attribute.

  ## Example Usage

  <<< examples/simple.js

**/

var protocols = [
  'stun:',
  'turn:'
];

module.exports = function(input) {
  var url = (input || {}).url || input;
  var protocol;
  var parts;
  var output = {};

  // if we don't have a string url, then allow the input to passthrough
  if (typeof url != 'string' && (! (url instanceof String))) {
    return input;
  }

  // trim the url string, and convert to an array
  url = url.trim();

  // if the protocol is not known, then passthrough
  protocol = protocols[protocols.indexOf(url.slice(0, 5))];
  if (! protocol) {
    return input;
  }

  // now let's attack the remaining url parts
  url = url.slice(5);
  parts = url.split('@');

  output.username = input.username;
  output.credential = input.credential;
  // if we have an authentication part, then set the credentials
  if (parts.length > 1) {
    url = parts[1];
    parts = parts[0].split(':');

    // add the output credential and username
    output.username = parts[0];
    output.credential = (input || {}).credential || parts[1] || '';
  }

  output.url = protocol + url;
  output.urls = [ output.url ];

  return output;
};


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/rtcpeerconnection-shim/rtcpeerconnection.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*
 *  Copyright (c) 2017 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */


var SDPUtils = __webpack_require__("../../../../openvidu-browser/node_modules/sdp/sdp.js");

function writeMediaSection(transceiver, caps, type, stream, dtlsRole) {
  var sdp = SDPUtils.writeRtpDescription(transceiver.kind, caps);

  // Map ICE parameters (ufrag, pwd) to SDP.
  sdp += SDPUtils.writeIceParameters(
      transceiver.iceGatherer.getLocalParameters());

  // Map DTLS parameters to SDP.
  sdp += SDPUtils.writeDtlsParameters(
      transceiver.dtlsTransport.getLocalParameters(),
      type === 'offer' ? 'actpass' : dtlsRole || 'active');

  sdp += 'a=mid:' + transceiver.mid + '\r\n';

  if (transceiver.rtpSender && transceiver.rtpReceiver) {
    sdp += 'a=sendrecv\r\n';
  } else if (transceiver.rtpSender) {
    sdp += 'a=sendonly\r\n';
  } else if (transceiver.rtpReceiver) {
    sdp += 'a=recvonly\r\n';
  } else {
    sdp += 'a=inactive\r\n';
  }

  if (transceiver.rtpSender) {
    var trackId = transceiver.rtpSender._initialTrackId ||
        transceiver.rtpSender.track.id;
    transceiver.rtpSender._initialTrackId = trackId;
    // spec.
    var msid = 'msid:' + (stream ? stream.id : '-') + ' ' +
        trackId + '\r\n';
    sdp += 'a=' + msid;
    // for Chrome. Legacy should no longer be required.
    sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc +
        ' ' + msid;

    // RTX
    if (transceiver.sendEncodingParameters[0].rtx) {
      sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].rtx.ssrc +
          ' ' + msid;
      sdp += 'a=ssrc-group:FID ' +
          transceiver.sendEncodingParameters[0].ssrc + ' ' +
          transceiver.sendEncodingParameters[0].rtx.ssrc +
          '\r\n';
    }
  }
  // FIXME: this should be written by writeRtpDescription.
  sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc +
      ' cname:' + SDPUtils.localCName + '\r\n';
  if (transceiver.rtpSender && transceiver.sendEncodingParameters[0].rtx) {
    sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].rtx.ssrc +
        ' cname:' + SDPUtils.localCName + '\r\n';
  }
  return sdp;
}

// Edge does not like
// 1) stun: filtered after 14393 unless ?transport=udp is present
// 2) turn: that does not have all of turn:host:port?transport=udp
// 3) turn: with ipv6 addresses
// 4) turn: occurring muliple times
function filterIceServers(iceServers, edgeVersion) {
  var hasTurn = false;
  iceServers = JSON.parse(JSON.stringify(iceServers));
  return iceServers.filter(function(server) {
    if (server && (server.urls || server.url)) {
      var urls = server.urls || server.url;
      if (server.url && !server.urls) {
        console.warn('RTCIceServer.url is deprecated! Use urls instead.');
      }
      var isString = typeof urls === 'string';
      if (isString) {
        urls = [urls];
      }
      urls = urls.filter(function(url) {
        var validTurn = url.indexOf('turn:') === 0 &&
            url.indexOf('transport=udp') !== -1 &&
            url.indexOf('turn:[') === -1 &&
            !hasTurn;

        if (validTurn) {
          hasTurn = true;
          return true;
        }
        return url.indexOf('stun:') === 0 && edgeVersion >= 14393 &&
            url.indexOf('?transport=udp') === -1;
      });

      delete server.url;
      server.urls = isString ? urls[0] : urls;
      return !!urls.length;
    }
  });
}

// Determines the intersection of local and remote capabilities.
function getCommonCapabilities(localCapabilities, remoteCapabilities) {
  var commonCapabilities = {
    codecs: [],
    headerExtensions: [],
    fecMechanisms: []
  };

  var findCodecByPayloadType = function(pt, codecs) {
    pt = parseInt(pt, 10);
    for (var i = 0; i < codecs.length; i++) {
      if (codecs[i].payloadType === pt ||
          codecs[i].preferredPayloadType === pt) {
        return codecs[i];
      }
    }
  };

  var rtxCapabilityMatches = function(lRtx, rRtx, lCodecs, rCodecs) {
    var lCodec = findCodecByPayloadType(lRtx.parameters.apt, lCodecs);
    var rCodec = findCodecByPayloadType(rRtx.parameters.apt, rCodecs);
    return lCodec && rCodec &&
        lCodec.name.toLowerCase() === rCodec.name.toLowerCase();
  };

  localCapabilities.codecs.forEach(function(lCodec) {
    for (var i = 0; i < remoteCapabilities.codecs.length; i++) {
      var rCodec = remoteCapabilities.codecs[i];
      if (lCodec.name.toLowerCase() === rCodec.name.toLowerCase() &&
          lCodec.clockRate === rCodec.clockRate) {
        if (lCodec.name.toLowerCase() === 'rtx' &&
            lCodec.parameters && rCodec.parameters.apt) {
          // for RTX we need to find the local rtx that has a apt
          // which points to the same local codec as the remote one.
          if (!rtxCapabilityMatches(lCodec, rCodec,
              localCapabilities.codecs, remoteCapabilities.codecs)) {
            continue;
          }
        }
        rCodec = JSON.parse(JSON.stringify(rCodec)); // deepcopy
        // number of channels is the highest common number of channels
        rCodec.numChannels = Math.min(lCodec.numChannels,
            rCodec.numChannels);
        // push rCodec so we reply with offerer payload type
        commonCapabilities.codecs.push(rCodec);

        // determine common feedback mechanisms
        rCodec.rtcpFeedback = rCodec.rtcpFeedback.filter(function(fb) {
          for (var j = 0; j < lCodec.rtcpFeedback.length; j++) {
            if (lCodec.rtcpFeedback[j].type === fb.type &&
                lCodec.rtcpFeedback[j].parameter === fb.parameter) {
              return true;
            }
          }
          return false;
        });
        // FIXME: also need to determine .parameters
        //  see https://github.com/openpeer/ortc/issues/569
        break;
      }
    }
  });

  localCapabilities.headerExtensions.forEach(function(lHeaderExtension) {
    for (var i = 0; i < remoteCapabilities.headerExtensions.length;
         i++) {
      var rHeaderExtension = remoteCapabilities.headerExtensions[i];
      if (lHeaderExtension.uri === rHeaderExtension.uri) {
        commonCapabilities.headerExtensions.push(rHeaderExtension);
        break;
      }
    }
  });

  // FIXME: fecMechanisms
  return commonCapabilities;
}

// is action=setLocalDescription with type allowed in signalingState
function isActionAllowedInSignalingState(action, type, signalingState) {
  return {
    offer: {
      setLocalDescription: ['stable', 'have-local-offer'],
      setRemoteDescription: ['stable', 'have-remote-offer']
    },
    answer: {
      setLocalDescription: ['have-remote-offer', 'have-local-pranswer'],
      setRemoteDescription: ['have-local-offer', 'have-remote-pranswer']
    }
  }[type][action].indexOf(signalingState) !== -1;
}

function maybeAddCandidate(iceTransport, candidate) {
  // Edge's internal representation adds some fields therefore
  // not all fieldѕ are taken into account.
  var alreadyAdded = iceTransport.getRemoteCandidates()
      .find(function(remoteCandidate) {
        return candidate.foundation === remoteCandidate.foundation &&
            candidate.ip === remoteCandidate.ip &&
            candidate.port === remoteCandidate.port &&
            candidate.priority === remoteCandidate.priority &&
            candidate.protocol === remoteCandidate.protocol &&
            candidate.type === remoteCandidate.type;
      });
  if (!alreadyAdded) {
    iceTransport.addRemoteCandidate(candidate);
  }
  return !alreadyAdded;
}


function makeError(name, description) {
  var e = new Error(description);
  e.name = name;
  // legacy error codes from https://heycam.github.io/webidl/#idl-DOMException-error-names
  e.code = {
    NotSupportedError: 9,
    InvalidStateError: 11,
    InvalidAccessError: 15,
    TypeError: undefined,
    OperationError: undefined
  }[name];
  return e;
}

module.exports = function(window, edgeVersion) {
  // https://w3c.github.io/mediacapture-main/#mediastream
  // Helper function to add the track to the stream and
  // dispatch the event ourselves.
  function addTrackToStreamAndFireEvent(track, stream) {
    stream.addTrack(track);
    stream.dispatchEvent(new window.MediaStreamTrackEvent('addtrack',
        {track: track}));
  }

  function removeTrackFromStreamAndFireEvent(track, stream) {
    stream.removeTrack(track);
    stream.dispatchEvent(new window.MediaStreamTrackEvent('removetrack',
        {track: track}));
  }

  function fireAddTrack(pc, track, receiver, streams) {
    var trackEvent = new Event('track');
    trackEvent.track = track;
    trackEvent.receiver = receiver;
    trackEvent.transceiver = {receiver: receiver};
    trackEvent.streams = streams;
    window.setTimeout(function() {
      pc._dispatchEvent('track', trackEvent);
    });
  }

  var RTCPeerConnection = function(config) {
    var pc = this;

    var _eventTarget = document.createDocumentFragment();
    ['addEventListener', 'removeEventListener', 'dispatchEvent']
        .forEach(function(method) {
          pc[method] = _eventTarget[method].bind(_eventTarget);
        });

    this.canTrickleIceCandidates = null;

    this.needNegotiation = false;

    this.localStreams = [];
    this.remoteStreams = [];

    this.localDescription = null;
    this.remoteDescription = null;

    this.signalingState = 'stable';
    this.iceConnectionState = 'new';
    this.connectionState = 'new';
    this.iceGatheringState = 'new';

    config = JSON.parse(JSON.stringify(config || {}));

    this.usingBundle = config.bundlePolicy === 'max-bundle';
    if (config.rtcpMuxPolicy === 'negotiate') {
      throw(makeError('NotSupportedError',
          'rtcpMuxPolicy \'negotiate\' is not supported'));
    } else if (!config.rtcpMuxPolicy) {
      config.rtcpMuxPolicy = 'require';
    }

    switch (config.iceTransportPolicy) {
      case 'all':
      case 'relay':
        break;
      default:
        config.iceTransportPolicy = 'all';
        break;
    }

    switch (config.bundlePolicy) {
      case 'balanced':
      case 'max-compat':
      case 'max-bundle':
        break;
      default:
        config.bundlePolicy = 'balanced';
        break;
    }

    config.iceServers = filterIceServers(config.iceServers || [], edgeVersion);

    this._iceGatherers = [];
    if (config.iceCandidatePoolSize) {
      for (var i = config.iceCandidatePoolSize; i > 0; i--) {
        this._iceGatherers.push(new window.RTCIceGatherer({
          iceServers: config.iceServers,
          gatherPolicy: config.iceTransportPolicy
        }));
      }
    } else {
      config.iceCandidatePoolSize = 0;
    }

    this._config = config;

    // per-track iceGathers, iceTransports, dtlsTransports, rtpSenders, ...
    // everything that is needed to describe a SDP m-line.
    this.transceivers = [];

    this._sdpSessionId = SDPUtils.generateSessionId();
    this._sdpSessionVersion = 0;

    this._dtlsRole = undefined; // role for a=setup to use in answers.

    this._isClosed = false;
  };

  // set up event handlers on prototype
  RTCPeerConnection.prototype.onicecandidate = null;
  RTCPeerConnection.prototype.onaddstream = null;
  RTCPeerConnection.prototype.ontrack = null;
  RTCPeerConnection.prototype.onremovestream = null;
  RTCPeerConnection.prototype.onsignalingstatechange = null;
  RTCPeerConnection.prototype.oniceconnectionstatechange = null;
  RTCPeerConnection.prototype.onconnectionstatechange = null;
  RTCPeerConnection.prototype.onicegatheringstatechange = null;
  RTCPeerConnection.prototype.onnegotiationneeded = null;
  RTCPeerConnection.prototype.ondatachannel = null;

  RTCPeerConnection.prototype._dispatchEvent = function(name, event) {
    if (this._isClosed) {
      return;
    }
    this.dispatchEvent(event);
    if (typeof this['on' + name] === 'function') {
      this['on' + name](event);
    }
  };

  RTCPeerConnection.prototype._emitGatheringStateChange = function() {
    var event = new Event('icegatheringstatechange');
    this._dispatchEvent('icegatheringstatechange', event);
  };

  RTCPeerConnection.prototype.getConfiguration = function() {
    return this._config;
  };

  RTCPeerConnection.prototype.getLocalStreams = function() {
    return this.localStreams;
  };

  RTCPeerConnection.prototype.getRemoteStreams = function() {
    return this.remoteStreams;
  };

  // internal helper to create a transceiver object.
  // (which is not yet the same as the WebRTC 1.0 transceiver)
  RTCPeerConnection.prototype._createTransceiver = function(kind, doNotAdd) {
    var hasBundleTransport = this.transceivers.length > 0;
    var transceiver = {
      track: null,
      iceGatherer: null,
      iceTransport: null,
      dtlsTransport: null,
      localCapabilities: null,
      remoteCapabilities: null,
      rtpSender: null,
      rtpReceiver: null,
      kind: kind,
      mid: null,
      sendEncodingParameters: null,
      recvEncodingParameters: null,
      stream: null,
      associatedRemoteMediaStreams: [],
      wantReceive: true
    };
    if (this.usingBundle && hasBundleTransport) {
      transceiver.iceTransport = this.transceivers[0].iceTransport;
      transceiver.dtlsTransport = this.transceivers[0].dtlsTransport;
    } else {
      var transports = this._createIceAndDtlsTransports();
      transceiver.iceTransport = transports.iceTransport;
      transceiver.dtlsTransport = transports.dtlsTransport;
    }
    if (!doNotAdd) {
      this.transceivers.push(transceiver);
    }
    return transceiver;
  };

  RTCPeerConnection.prototype.addTrack = function(track, stream) {
    if (this._isClosed) {
      throw makeError('InvalidStateError',
          'Attempted to call addTrack on a closed peerconnection.');
    }

    var alreadyExists = this.transceivers.find(function(s) {
      return s.track === track;
    });

    if (alreadyExists) {
      throw makeError('InvalidAccessError', 'Track already exists.');
    }

    var transceiver;
    for (var i = 0; i < this.transceivers.length; i++) {
      if (!this.transceivers[i].track &&
          this.transceivers[i].kind === track.kind) {
        transceiver = this.transceivers[i];
      }
    }
    if (!transceiver) {
      transceiver = this._createTransceiver(track.kind);
    }

    this._maybeFireNegotiationNeeded();

    if (this.localStreams.indexOf(stream) === -1) {
      this.localStreams.push(stream);
    }

    transceiver.track = track;
    transceiver.stream = stream;
    transceiver.rtpSender = new window.RTCRtpSender(track,
        transceiver.dtlsTransport);
    return transceiver.rtpSender;
  };

  RTCPeerConnection.prototype.addStream = function(stream) {
    var pc = this;
    if (edgeVersion >= 15025) {
      stream.getTracks().forEach(function(track) {
        pc.addTrack(track, stream);
      });
    } else {
      // Clone is necessary for local demos mostly, attaching directly
      // to two different senders does not work (build 10547).
      // Fixed in 15025 (or earlier)
      var clonedStream = stream.clone();
      stream.getTracks().forEach(function(track, idx) {
        var clonedTrack = clonedStream.getTracks()[idx];
        track.addEventListener('enabled', function(event) {
          clonedTrack.enabled = event.enabled;
        });
      });
      clonedStream.getTracks().forEach(function(track) {
        pc.addTrack(track, clonedStream);
      });
    }
  };

  RTCPeerConnection.prototype.removeTrack = function(sender) {
    if (this._isClosed) {
      throw makeError('InvalidStateError',
          'Attempted to call removeTrack on a closed peerconnection.');
    }

    if (!(sender instanceof window.RTCRtpSender)) {
      throw new TypeError('Argument 1 of RTCPeerConnection.removeTrack ' +
          'does not implement interface RTCRtpSender.');
    }

    var transceiver = this.transceivers.find(function(t) {
      return t.rtpSender === sender;
    });

    if (!transceiver) {
      throw makeError('InvalidAccessError',
          'Sender was not created by this connection.');
    }
    var stream = transceiver.stream;

    transceiver.rtpSender.stop();
    transceiver.rtpSender = null;
    transceiver.track = null;
    transceiver.stream = null;

    // remove the stream from the set of local streams
    var localStreams = this.transceivers.map(function(t) {
      return t.stream;
    });
    if (localStreams.indexOf(stream) === -1 &&
        this.localStreams.indexOf(stream) > -1) {
      this.localStreams.splice(this.localStreams.indexOf(stream), 1);
    }

    this._maybeFireNegotiationNeeded();
  };

  RTCPeerConnection.prototype.removeStream = function(stream) {
    var pc = this;
    stream.getTracks().forEach(function(track) {
      var sender = pc.getSenders().find(function(s) {
        return s.track === track;
      });
      if (sender) {
        pc.removeTrack(sender);
      }
    });
  };

  RTCPeerConnection.prototype.getSenders = function() {
    return this.transceivers.filter(function(transceiver) {
      return !!transceiver.rtpSender;
    })
    .map(function(transceiver) {
      return transceiver.rtpSender;
    });
  };

  RTCPeerConnection.prototype.getReceivers = function() {
    return this.transceivers.filter(function(transceiver) {
      return !!transceiver.rtpReceiver;
    })
    .map(function(transceiver) {
      return transceiver.rtpReceiver;
    });
  };


  RTCPeerConnection.prototype._createIceGatherer = function(sdpMLineIndex,
      usingBundle) {
    var pc = this;
    if (usingBundle && sdpMLineIndex > 0) {
      return this.transceivers[0].iceGatherer;
    } else if (this._iceGatherers.length) {
      return this._iceGatherers.shift();
    }
    var iceGatherer = new window.RTCIceGatherer({
      iceServers: this._config.iceServers,
      gatherPolicy: this._config.iceTransportPolicy
    });
    Object.defineProperty(iceGatherer, 'state',
        {value: 'new', writable: true}
    );

    this.transceivers[sdpMLineIndex].bufferedCandidateEvents = [];
    this.transceivers[sdpMLineIndex].bufferCandidates = function(event) {
      var end = !event.candidate || Object.keys(event.candidate).length === 0;
      // polyfill since RTCIceGatherer.state is not implemented in
      // Edge 10547 yet.
      iceGatherer.state = end ? 'completed' : 'gathering';
      if (pc.transceivers[sdpMLineIndex].bufferedCandidateEvents !== null) {
        pc.transceivers[sdpMLineIndex].bufferedCandidateEvents.push(event);
      }
    };
    iceGatherer.addEventListener('localcandidate',
      this.transceivers[sdpMLineIndex].bufferCandidates);
    return iceGatherer;
  };

  // start gathering from an RTCIceGatherer.
  RTCPeerConnection.prototype._gather = function(mid, sdpMLineIndex) {
    var pc = this;
    var iceGatherer = this.transceivers[sdpMLineIndex].iceGatherer;
    if (iceGatherer.onlocalcandidate) {
      return;
    }
    var bufferedCandidateEvents =
      this.transceivers[sdpMLineIndex].bufferedCandidateEvents;
    this.transceivers[sdpMLineIndex].bufferedCandidateEvents = null;
    iceGatherer.removeEventListener('localcandidate',
      this.transceivers[sdpMLineIndex].bufferCandidates);
    iceGatherer.onlocalcandidate = function(evt) {
      if (pc.usingBundle && sdpMLineIndex > 0) {
        // if we know that we use bundle we can drop candidates with
        // ѕdpMLineIndex > 0. If we don't do this then our state gets
        // confused since we dispose the extra ice gatherer.
        return;
      }
      var event = new Event('icecandidate');
      event.candidate = {sdpMid: mid, sdpMLineIndex: sdpMLineIndex};

      var cand = evt.candidate;
      // Edge emits an empty object for RTCIceCandidateComplete‥
      var end = !cand || Object.keys(cand).length === 0;
      if (end) {
        // polyfill since RTCIceGatherer.state is not implemented in
        // Edge 10547 yet.
        if (iceGatherer.state === 'new' || iceGatherer.state === 'gathering') {
          iceGatherer.state = 'completed';
        }
      } else {
        if (iceGatherer.state === 'new') {
          iceGatherer.state = 'gathering';
        }
        // RTCIceCandidate doesn't have a component, needs to be added
        cand.component = 1;
        var serializedCandidate = SDPUtils.writeCandidate(cand);
        event.candidate = Object.assign(event.candidate,
            SDPUtils.parseCandidate(serializedCandidate));
        event.candidate.candidate = serializedCandidate;
      }

      // update local description.
      var sections = SDPUtils.getMediaSections(pc.localDescription.sdp);
      if (!end) {
        sections[event.candidate.sdpMLineIndex] +=
            'a=' + event.candidate.candidate + '\r\n';
      } else {
        sections[event.candidate.sdpMLineIndex] +=
            'a=end-of-candidates\r\n';
      }
      pc.localDescription.sdp =
          SDPUtils.getDescription(pc.localDescription.sdp) +
          sections.join('');
      var complete = pc.transceivers.every(function(transceiver) {
        return transceiver.iceGatherer &&
            transceiver.iceGatherer.state === 'completed';
      });

      if (pc.iceGatheringState !== 'gathering') {
        pc.iceGatheringState = 'gathering';
        pc._emitGatheringStateChange();
      }

      // Emit candidate. Also emit null candidate when all gatherers are
      // complete.
      if (!end) {
        pc._dispatchEvent('icecandidate', event);
      }
      if (complete) {
        pc._dispatchEvent('icecandidate', new Event('icecandidate'));
        pc.iceGatheringState = 'complete';
        pc._emitGatheringStateChange();
      }
    };

    // emit already gathered candidates.
    window.setTimeout(function() {
      bufferedCandidateEvents.forEach(function(e) {
        iceGatherer.onlocalcandidate(e);
      });
    }, 0);
  };

  // Create ICE transport and DTLS transport.
  RTCPeerConnection.prototype._createIceAndDtlsTransports = function() {
    var pc = this;
    var iceTransport = new window.RTCIceTransport(null);
    iceTransport.onicestatechange = function() {
      pc._updateIceConnectionState();
      pc._updateConnectionState();
    };

    var dtlsTransport = new window.RTCDtlsTransport(iceTransport);
    dtlsTransport.ondtlsstatechange = function() {
      pc._updateConnectionState();
    };
    dtlsTransport.onerror = function() {
      // onerror does not set state to failed by itself.
      Object.defineProperty(dtlsTransport, 'state',
          {value: 'failed', writable: true});
      pc._updateConnectionState();
    };

    return {
      iceTransport: iceTransport,
      dtlsTransport: dtlsTransport
    };
  };

  // Destroy ICE gatherer, ICE transport and DTLS transport.
  // Without triggering the callbacks.
  RTCPeerConnection.prototype._disposeIceAndDtlsTransports = function(
      sdpMLineIndex) {
    var iceGatherer = this.transceivers[sdpMLineIndex].iceGatherer;
    if (iceGatherer) {
      delete iceGatherer.onlocalcandidate;
      delete this.transceivers[sdpMLineIndex].iceGatherer;
    }
    var iceTransport = this.transceivers[sdpMLineIndex].iceTransport;
    if (iceTransport) {
      delete iceTransport.onicestatechange;
      delete this.transceivers[sdpMLineIndex].iceTransport;
    }
    var dtlsTransport = this.transceivers[sdpMLineIndex].dtlsTransport;
    if (dtlsTransport) {
      delete dtlsTransport.ondtlsstatechange;
      delete dtlsTransport.onerror;
      delete this.transceivers[sdpMLineIndex].dtlsTransport;
    }
  };

  // Start the RTP Sender and Receiver for a transceiver.
  RTCPeerConnection.prototype._transceive = function(transceiver,
      send, recv) {
    var params = getCommonCapabilities(transceiver.localCapabilities,
        transceiver.remoteCapabilities);
    if (send && transceiver.rtpSender) {
      params.encodings = transceiver.sendEncodingParameters;
      params.rtcp = {
        cname: SDPUtils.localCName,
        compound: transceiver.rtcpParameters.compound
      };
      if (transceiver.recvEncodingParameters.length) {
        params.rtcp.ssrc = transceiver.recvEncodingParameters[0].ssrc;
      }
      transceiver.rtpSender.send(params);
    }
    if (recv && transceiver.rtpReceiver && params.codecs.length > 0) {
      // remove RTX field in Edge 14942
      if (transceiver.kind === 'video'
          && transceiver.recvEncodingParameters
          && edgeVersion < 15019) {
        transceiver.recvEncodingParameters.forEach(function(p) {
          delete p.rtx;
        });
      }
      if (transceiver.recvEncodingParameters.length) {
        params.encodings = transceiver.recvEncodingParameters;
      } else {
        params.encodings = [{}];
      }
      params.rtcp = {
        compound: transceiver.rtcpParameters.compound
      };
      if (transceiver.rtcpParameters.cname) {
        params.rtcp.cname = transceiver.rtcpParameters.cname;
      }
      if (transceiver.sendEncodingParameters.length) {
        params.rtcp.ssrc = transceiver.sendEncodingParameters[0].ssrc;
      }
      transceiver.rtpReceiver.receive(params);
    }
  };

  RTCPeerConnection.prototype.setLocalDescription = function(description) {
    var pc = this;

    // Note: pranswer is not supported.
    if (['offer', 'answer'].indexOf(description.type) === -1) {
      return Promise.reject(makeError('TypeError',
          'Unsupported type "' + description.type + '"'));
    }

    if (!isActionAllowedInSignalingState('setLocalDescription',
        description.type, pc.signalingState) || pc._isClosed) {
      return Promise.reject(makeError('InvalidStateError',
          'Can not set local ' + description.type +
          ' in state ' + pc.signalingState));
    }

    var sections;
    var sessionpart;
    if (description.type === 'offer') {
      // VERY limited support for SDP munging. Limited to:
      // * changing the order of codecs
      sections = SDPUtils.splitSections(description.sdp);
      sessionpart = sections.shift();
      sections.forEach(function(mediaSection, sdpMLineIndex) {
        var caps = SDPUtils.parseRtpParameters(mediaSection);
        pc.transceivers[sdpMLineIndex].localCapabilities = caps;
      });

      pc.transceivers.forEach(function(transceiver, sdpMLineIndex) {
        pc._gather(transceiver.mid, sdpMLineIndex);
      });
    } else if (description.type === 'answer') {
      sections = SDPUtils.splitSections(pc.remoteDescription.sdp);
      sessionpart = sections.shift();
      var isIceLite = SDPUtils.matchPrefix(sessionpart,
          'a=ice-lite').length > 0;
      sections.forEach(function(mediaSection, sdpMLineIndex) {
        var transceiver = pc.transceivers[sdpMLineIndex];
        var iceGatherer = transceiver.iceGatherer;
        var iceTransport = transceiver.iceTransport;
        var dtlsTransport = transceiver.dtlsTransport;
        var localCapabilities = transceiver.localCapabilities;
        var remoteCapabilities = transceiver.remoteCapabilities;

        // treat bundle-only as not-rejected.
        var rejected = SDPUtils.isRejected(mediaSection) &&
            SDPUtils.matchPrefix(mediaSection, 'a=bundle-only').length === 0;

        if (!rejected && !transceiver.rejected) {
          var remoteIceParameters = SDPUtils.getIceParameters(
              mediaSection, sessionpart);
          var remoteDtlsParameters = SDPUtils.getDtlsParameters(
              mediaSection, sessionpart);
          if (isIceLite) {
            remoteDtlsParameters.role = 'server';
          }

          if (!pc.usingBundle || sdpMLineIndex === 0) {
            pc._gather(transceiver.mid, sdpMLineIndex);
            if (iceTransport.state === 'new') {
              iceTransport.start(iceGatherer, remoteIceParameters,
                  isIceLite ? 'controlling' : 'controlled');
            }
            if (dtlsTransport.state === 'new') {
              dtlsTransport.start(remoteDtlsParameters);
            }
          }

          // Calculate intersection of capabilities.
          var params = getCommonCapabilities(localCapabilities,
              remoteCapabilities);

          // Start the RTCRtpSender. The RTCRtpReceiver for this
          // transceiver has already been started in setRemoteDescription.
          pc._transceive(transceiver,
              params.codecs.length > 0,
              false);
        }
      });
    }

    pc.localDescription = {
      type: description.type,
      sdp: description.sdp
    };
    if (description.type === 'offer') {
      pc._updateSignalingState('have-local-offer');
    } else {
      pc._updateSignalingState('stable');
    }

    return Promise.resolve();
  };

  RTCPeerConnection.prototype.setRemoteDescription = function(description) {
    var pc = this;

    // Note: pranswer is not supported.
    if (['offer', 'answer'].indexOf(description.type) === -1) {
      return Promise.reject(makeError('TypeError',
          'Unsupported type "' + description.type + '"'));
    }

    if (!isActionAllowedInSignalingState('setRemoteDescription',
        description.type, pc.signalingState) || pc._isClosed) {
      return Promise.reject(makeError('InvalidStateError',
          'Can not set remote ' + description.type +
          ' in state ' + pc.signalingState));
    }

    var streams = {};
    pc.remoteStreams.forEach(function(stream) {
      streams[stream.id] = stream;
    });
    var receiverList = [];
    var sections = SDPUtils.splitSections(description.sdp);
    var sessionpart = sections.shift();
    var isIceLite = SDPUtils.matchPrefix(sessionpart,
        'a=ice-lite').length > 0;
    var usingBundle = SDPUtils.matchPrefix(sessionpart,
        'a=group:BUNDLE ').length > 0;
    pc.usingBundle = usingBundle;
    var iceOptions = SDPUtils.matchPrefix(sessionpart,
        'a=ice-options:')[0];
    if (iceOptions) {
      pc.canTrickleIceCandidates = iceOptions.substr(14).split(' ')
          .indexOf('trickle') >= 0;
    } else {
      pc.canTrickleIceCandidates = false;
    }

    sections.forEach(function(mediaSection, sdpMLineIndex) {
      var lines = SDPUtils.splitLines(mediaSection);
      var kind = SDPUtils.getKind(mediaSection);
      // treat bundle-only as not-rejected.
      var rejected = SDPUtils.isRejected(mediaSection) &&
          SDPUtils.matchPrefix(mediaSection, 'a=bundle-only').length === 0;
      var protocol = lines[0].substr(2).split(' ')[2];

      var direction = SDPUtils.getDirection(mediaSection, sessionpart);
      var remoteMsid = SDPUtils.parseMsid(mediaSection);

      var mid = SDPUtils.getMid(mediaSection) || SDPUtils.generateIdentifier();

      // Reject datachannels which are not implemented yet.
      if ((kind === 'application' && protocol === 'DTLS/SCTP') || rejected) {
        // TODO: this is dangerous in the case where a non-rejected m-line
        //     becomes rejected.
        pc.transceivers[sdpMLineIndex] = {
          mid: mid,
          kind: kind,
          rejected: true
        };
        return;
      }

      if (!rejected && pc.transceivers[sdpMLineIndex] &&
          pc.transceivers[sdpMLineIndex].rejected) {
        // recycle a rejected transceiver.
        pc.transceivers[sdpMLineIndex] = pc._createTransceiver(kind, true);
      }

      var transceiver;
      var iceGatherer;
      var iceTransport;
      var dtlsTransport;
      var rtpReceiver;
      var sendEncodingParameters;
      var recvEncodingParameters;
      var localCapabilities;

      var track;
      // FIXME: ensure the mediaSection has rtcp-mux set.
      var remoteCapabilities = SDPUtils.parseRtpParameters(mediaSection);
      var remoteIceParameters;
      var remoteDtlsParameters;
      if (!rejected) {
        remoteIceParameters = SDPUtils.getIceParameters(mediaSection,
            sessionpart);
        remoteDtlsParameters = SDPUtils.getDtlsParameters(mediaSection,
            sessionpart);
        remoteDtlsParameters.role = 'client';
      }
      recvEncodingParameters =
          SDPUtils.parseRtpEncodingParameters(mediaSection);

      var rtcpParameters = SDPUtils.parseRtcpParameters(mediaSection);

      var isComplete = SDPUtils.matchPrefix(mediaSection,
          'a=end-of-candidates', sessionpart).length > 0;
      var cands = SDPUtils.matchPrefix(mediaSection, 'a=candidate:')
          .map(function(cand) {
            return SDPUtils.parseCandidate(cand);
          })
          .filter(function(cand) {
            return cand.component === 1;
          });

      // Check if we can use BUNDLE and dispose transports.
      if ((description.type === 'offer' || description.type === 'answer') &&
          !rejected && usingBundle && sdpMLineIndex > 0 &&
          pc.transceivers[sdpMLineIndex]) {
        pc._disposeIceAndDtlsTransports(sdpMLineIndex);
        pc.transceivers[sdpMLineIndex].iceGatherer =
            pc.transceivers[0].iceGatherer;
        pc.transceivers[sdpMLineIndex].iceTransport =
            pc.transceivers[0].iceTransport;
        pc.transceivers[sdpMLineIndex].dtlsTransport =
            pc.transceivers[0].dtlsTransport;
        if (pc.transceivers[sdpMLineIndex].rtpSender) {
          pc.transceivers[sdpMLineIndex].rtpSender.setTransport(
              pc.transceivers[0].dtlsTransport);
        }
        if (pc.transceivers[sdpMLineIndex].rtpReceiver) {
          pc.transceivers[sdpMLineIndex].rtpReceiver.setTransport(
              pc.transceivers[0].dtlsTransport);
        }
      }
      if (description.type === 'offer' && !rejected) {
        transceiver = pc.transceivers[sdpMLineIndex] ||
            pc._createTransceiver(kind);
        transceiver.mid = mid;

        if (!transceiver.iceGatherer) {
          transceiver.iceGatherer = pc._createIceGatherer(sdpMLineIndex,
              usingBundle);
        }

        if (cands.length && transceiver.iceTransport.state === 'new') {
          if (isComplete && (!usingBundle || sdpMLineIndex === 0)) {
            transceiver.iceTransport.setRemoteCandidates(cands);
          } else {
            cands.forEach(function(candidate) {
              maybeAddCandidate(transceiver.iceTransport, candidate);
            });
          }
        }

        localCapabilities = window.RTCRtpReceiver.getCapabilities(kind);

        // filter RTX until additional stuff needed for RTX is implemented
        // in adapter.js
        if (edgeVersion < 15019) {
          localCapabilities.codecs = localCapabilities.codecs.filter(
              function(codec) {
                return codec.name !== 'rtx';
              });
        }

        sendEncodingParameters = transceiver.sendEncodingParameters || [{
          ssrc: (2 * sdpMLineIndex + 2) * 1001
        }];

        // TODO: rewrite to use http://w3c.github.io/webrtc-pc/#set-associated-remote-streams
        var isNewTrack = false;
        if (direction === 'sendrecv' || direction === 'sendonly') {
          isNewTrack = !transceiver.rtpReceiver;
          rtpReceiver = transceiver.rtpReceiver ||
              new window.RTCRtpReceiver(transceiver.dtlsTransport, kind);

          if (isNewTrack) {
            var stream;
            track = rtpReceiver.track;
            // FIXME: does not work with Plan B.
            if (remoteMsid && remoteMsid.stream === '-') {
              // no-op. a stream id of '-' means: no associated stream.
            } else if (remoteMsid) {
              if (!streams[remoteMsid.stream]) {
                streams[remoteMsid.stream] = new window.MediaStream();
                Object.defineProperty(streams[remoteMsid.stream], 'id', {
                  get: function() {
                    return remoteMsid.stream;
                  }
                });
              }
              Object.defineProperty(track, 'id', {
                get: function() {
                  return remoteMsid.track;
                }
              });
              stream = streams[remoteMsid.stream];
            } else {
              if (!streams.default) {
                streams.default = new window.MediaStream();
              }
              stream = streams.default;
            }
            if (stream) {
              addTrackToStreamAndFireEvent(track, stream);
              transceiver.associatedRemoteMediaStreams.push(stream);
            }
            receiverList.push([track, rtpReceiver, stream]);
          }
        } else if (transceiver.rtpReceiver && transceiver.rtpReceiver.track) {
          transceiver.associatedRemoteMediaStreams.forEach(function(s) {
            var nativeTrack = s.getTracks().find(function(t) {
              return t.id === transceiver.rtpReceiver.track.id;
            });
            if (nativeTrack) {
              removeTrackFromStreamAndFireEvent(nativeTrack, s);
            }
          });
          transceiver.associatedRemoteMediaStreams = [];
        }

        transceiver.localCapabilities = localCapabilities;
        transceiver.remoteCapabilities = remoteCapabilities;
        transceiver.rtpReceiver = rtpReceiver;
        transceiver.rtcpParameters = rtcpParameters;
        transceiver.sendEncodingParameters = sendEncodingParameters;
        transceiver.recvEncodingParameters = recvEncodingParameters;

        // Start the RTCRtpReceiver now. The RTPSender is started in
        // setLocalDescription.
        pc._transceive(pc.transceivers[sdpMLineIndex],
            false,
            isNewTrack);
      } else if (description.type === 'answer' && !rejected) {
        transceiver = pc.transceivers[sdpMLineIndex];
        iceGatherer = transceiver.iceGatherer;
        iceTransport = transceiver.iceTransport;
        dtlsTransport = transceiver.dtlsTransport;
        rtpReceiver = transceiver.rtpReceiver;
        sendEncodingParameters = transceiver.sendEncodingParameters;
        localCapabilities = transceiver.localCapabilities;

        pc.transceivers[sdpMLineIndex].recvEncodingParameters =
            recvEncodingParameters;
        pc.transceivers[sdpMLineIndex].remoteCapabilities =
            remoteCapabilities;
        pc.transceivers[sdpMLineIndex].rtcpParameters = rtcpParameters;

        if (cands.length && iceTransport.state === 'new') {
          if ((isIceLite || isComplete) &&
              (!usingBundle || sdpMLineIndex === 0)) {
            iceTransport.setRemoteCandidates(cands);
          } else {
            cands.forEach(function(candidate) {
              maybeAddCandidate(transceiver.iceTransport, candidate);
            });
          }
        }

        if (!usingBundle || sdpMLineIndex === 0) {
          if (iceTransport.state === 'new') {
            iceTransport.start(iceGatherer, remoteIceParameters,
                'controlling');
          }
          if (dtlsTransport.state === 'new') {
            dtlsTransport.start(remoteDtlsParameters);
          }
        }

        pc._transceive(transceiver,
            direction === 'sendrecv' || direction === 'recvonly',
            direction === 'sendrecv' || direction === 'sendonly');

        // TODO: rewrite to use http://w3c.github.io/webrtc-pc/#set-associated-remote-streams
        if (rtpReceiver &&
            (direction === 'sendrecv' || direction === 'sendonly')) {
          track = rtpReceiver.track;
          if (remoteMsid) {
            if (!streams[remoteMsid.stream]) {
              streams[remoteMsid.stream] = new window.MediaStream();
            }
            addTrackToStreamAndFireEvent(track, streams[remoteMsid.stream]);
            receiverList.push([track, rtpReceiver, streams[remoteMsid.stream]]);
          } else {
            if (!streams.default) {
              streams.default = new window.MediaStream();
            }
            addTrackToStreamAndFireEvent(track, streams.default);
            receiverList.push([track, rtpReceiver, streams.default]);
          }
        } else {
          // FIXME: actually the receiver should be created later.
          delete transceiver.rtpReceiver;
        }
      }
    });

    if (pc._dtlsRole === undefined) {
      pc._dtlsRole = description.type === 'offer' ? 'active' : 'passive';
    }

    pc.remoteDescription = {
      type: description.type,
      sdp: description.sdp
    };
    if (description.type === 'offer') {
      pc._updateSignalingState('have-remote-offer');
    } else {
      pc._updateSignalingState('stable');
    }
    Object.keys(streams).forEach(function(sid) {
      var stream = streams[sid];
      if (stream.getTracks().length) {
        if (pc.remoteStreams.indexOf(stream) === -1) {
          pc.remoteStreams.push(stream);
          var event = new Event('addstream');
          event.stream = stream;
          window.setTimeout(function() {
            pc._dispatchEvent('addstream', event);
          });
        }

        receiverList.forEach(function(item) {
          var track = item[0];
          var receiver = item[1];
          if (stream.id !== item[2].id) {
            return;
          }
          fireAddTrack(pc, track, receiver, [stream]);
        });
      }
    });
    receiverList.forEach(function(item) {
      if (item[2]) {
        return;
      }
      fireAddTrack(pc, item[0], item[1], []);
    });

    // check whether addIceCandidate({}) was called within four seconds after
    // setRemoteDescription.
    window.setTimeout(function() {
      if (!(pc && pc.transceivers)) {
        return;
      }
      pc.transceivers.forEach(function(transceiver) {
        if (transceiver.iceTransport &&
            transceiver.iceTransport.state === 'new' &&
            transceiver.iceTransport.getRemoteCandidates().length > 0) {
          console.warn('Timeout for addRemoteCandidate. Consider sending ' +
              'an end-of-candidates notification');
          transceiver.iceTransport.addRemoteCandidate({});
        }
      });
    }, 4000);

    return Promise.resolve();
  };

  RTCPeerConnection.prototype.close = function() {
    this.transceivers.forEach(function(transceiver) {
      /* not yet
      if (transceiver.iceGatherer) {
        transceiver.iceGatherer.close();
      }
      */
      if (transceiver.iceTransport) {
        transceiver.iceTransport.stop();
      }
      if (transceiver.dtlsTransport) {
        transceiver.dtlsTransport.stop();
      }
      if (transceiver.rtpSender) {
        transceiver.rtpSender.stop();
      }
      if (transceiver.rtpReceiver) {
        transceiver.rtpReceiver.stop();
      }
    });
    // FIXME: clean up tracks, local streams, remote streams, etc
    this._isClosed = true;
    this._updateSignalingState('closed');
  };

  // Update the signaling state.
  RTCPeerConnection.prototype._updateSignalingState = function(newState) {
    this.signalingState = newState;
    var event = new Event('signalingstatechange');
    this._dispatchEvent('signalingstatechange', event);
  };

  // Determine whether to fire the negotiationneeded event.
  RTCPeerConnection.prototype._maybeFireNegotiationNeeded = function() {
    var pc = this;
    if (this.signalingState !== 'stable' || this.needNegotiation === true) {
      return;
    }
    this.needNegotiation = true;
    window.setTimeout(function() {
      if (pc.needNegotiation) {
        pc.needNegotiation = false;
        var event = new Event('negotiationneeded');
        pc._dispatchEvent('negotiationneeded', event);
      }
    }, 0);
  };

  // Update the ice connection state.
  RTCPeerConnection.prototype._updateIceConnectionState = function() {
    var newState;
    var states = {
      'new': 0,
      closed: 0,
      checking: 0,
      connected: 0,
      completed: 0,
      disconnected: 0,
      failed: 0
    };
    this.transceivers.forEach(function(transceiver) {
      states[transceiver.iceTransport.state]++;
    });

    newState = 'new';
    if (states.failed > 0) {
      newState = 'failed';
    } else if (states.checking > 0) {
      newState = 'checking';
    } else if (states.disconnected > 0) {
      newState = 'disconnected';
    } else if (states.new > 0) {
      newState = 'new';
    } else if (states.connected > 0) {
      newState = 'connected';
    } else if (states.completed > 0) {
      newState = 'completed';
    }

    if (newState !== this.iceConnectionState) {
      this.iceConnectionState = newState;
      var event = new Event('iceconnectionstatechange');
      this._dispatchEvent('iceconnectionstatechange', event);
    }
  };

  // Update the connection state.
  RTCPeerConnection.prototype._updateConnectionState = function() {
    var newState;
    var states = {
      'new': 0,
      closed: 0,
      connecting: 0,
      connected: 0,
      completed: 0,
      disconnected: 0,
      failed: 0
    };
    this.transceivers.forEach(function(transceiver) {
      states[transceiver.iceTransport.state]++;
      states[transceiver.dtlsTransport.state]++;
    });
    // ICETransport.completed and connected are the same for this purpose.
    states.connected += states.completed;

    newState = 'new';
    if (states.failed > 0) {
      newState = 'failed';
    } else if (states.connecting > 0) {
      newState = 'connecting';
    } else if (states.disconnected > 0) {
      newState = 'disconnected';
    } else if (states.new > 0) {
      newState = 'new';
    } else if (states.connected > 0) {
      newState = 'connected';
    }

    if (newState !== this.connectionState) {
      this.connectionState = newState;
      var event = new Event('connectionstatechange');
      this._dispatchEvent('connectionstatechange', event);
    }
  };

  RTCPeerConnection.prototype.createOffer = function() {
    var pc = this;

    if (pc._isClosed) {
      return Promise.reject(makeError('InvalidStateError',
          'Can not call createOffer after close'));
    }

    var numAudioTracks = pc.transceivers.filter(function(t) {
      return t.kind === 'audio';
    }).length;
    var numVideoTracks = pc.transceivers.filter(function(t) {
      return t.kind === 'video';
    }).length;

    // Determine number of audio and video tracks we need to send/recv.
    var offerOptions = arguments[0];
    if (offerOptions) {
      // Reject Chrome legacy constraints.
      if (offerOptions.mandatory || offerOptions.optional) {
        throw new TypeError(
            'Legacy mandatory/optional constraints not supported.');
      }
      if (offerOptions.offerToReceiveAudio !== undefined) {
        if (offerOptions.offerToReceiveAudio === true) {
          numAudioTracks = 1;
        } else if (offerOptions.offerToReceiveAudio === false) {
          numAudioTracks = 0;
        } else {
          numAudioTracks = offerOptions.offerToReceiveAudio;
        }
      }
      if (offerOptions.offerToReceiveVideo !== undefined) {
        if (offerOptions.offerToReceiveVideo === true) {
          numVideoTracks = 1;
        } else if (offerOptions.offerToReceiveVideo === false) {
          numVideoTracks = 0;
        } else {
          numVideoTracks = offerOptions.offerToReceiveVideo;
        }
      }
    }

    pc.transceivers.forEach(function(transceiver) {
      if (transceiver.kind === 'audio') {
        numAudioTracks--;
        if (numAudioTracks < 0) {
          transceiver.wantReceive = false;
        }
      } else if (transceiver.kind === 'video') {
        numVideoTracks--;
        if (numVideoTracks < 0) {
          transceiver.wantReceive = false;
        }
      }
    });

    // Create M-lines for recvonly streams.
    while (numAudioTracks > 0 || numVideoTracks > 0) {
      if (numAudioTracks > 0) {
        pc._createTransceiver('audio');
        numAudioTracks--;
      }
      if (numVideoTracks > 0) {
        pc._createTransceiver('video');
        numVideoTracks--;
      }
    }

    var sdp = SDPUtils.writeSessionBoilerplate(pc._sdpSessionId,
        pc._sdpSessionVersion++);
    pc.transceivers.forEach(function(transceiver, sdpMLineIndex) {
      // For each track, create an ice gatherer, ice transport,
      // dtls transport, potentially rtpsender and rtpreceiver.
      var track = transceiver.track;
      var kind = transceiver.kind;
      var mid = transceiver.mid || SDPUtils.generateIdentifier();
      transceiver.mid = mid;

      if (!transceiver.iceGatherer) {
        transceiver.iceGatherer = pc._createIceGatherer(sdpMLineIndex,
            pc.usingBundle);
      }

      var localCapabilities = window.RTCRtpSender.getCapabilities(kind);
      // filter RTX until additional stuff needed for RTX is implemented
      // in adapter.js
      if (edgeVersion < 15019) {
        localCapabilities.codecs = localCapabilities.codecs.filter(
            function(codec) {
              return codec.name !== 'rtx';
            });
      }
      localCapabilities.codecs.forEach(function(codec) {
        // work around https://bugs.chromium.org/p/webrtc/issues/detail?id=6552
        // by adding level-asymmetry-allowed=1
        if (codec.name === 'H264' &&
            codec.parameters['level-asymmetry-allowed'] === undefined) {
          codec.parameters['level-asymmetry-allowed'] = '1';
        }

        // for subsequent offers, we might have to re-use the payload
        // type of the last offer.
        if (transceiver.remoteCapabilities &&
            transceiver.remoteCapabilities.codecs) {
          transceiver.remoteCapabilities.codecs.forEach(function(remoteCodec) {
            if (codec.name.toLowerCase() === remoteCodec.name.toLowerCase() &&
                codec.clockRate === remoteCodec.clockRate) {
              codec.preferredPayloadType = remoteCodec.payloadType;
            }
          });
        }
      });
      localCapabilities.headerExtensions.forEach(function(hdrExt) {
        var remoteExtensions = transceiver.remoteCapabilities &&
            transceiver.remoteCapabilities.headerExtensions || [];
        remoteExtensions.forEach(function(rHdrExt) {
          if (hdrExt.uri === rHdrExt.uri) {
            hdrExt.id = rHdrExt.id;
          }
        });
      });

      // generate an ssrc now, to be used later in rtpSender.send
      var sendEncodingParameters = transceiver.sendEncodingParameters || [{
        ssrc: (2 * sdpMLineIndex + 1) * 1001
      }];
      if (track) {
        // add RTX
        if (edgeVersion >= 15019 && kind === 'video' &&
            !sendEncodingParameters[0].rtx) {
          sendEncodingParameters[0].rtx = {
            ssrc: sendEncodingParameters[0].ssrc + 1
          };
        }
      }

      if (transceiver.wantReceive) {
        transceiver.rtpReceiver = new window.RTCRtpReceiver(
            transceiver.dtlsTransport, kind);
      }

      transceiver.localCapabilities = localCapabilities;
      transceiver.sendEncodingParameters = sendEncodingParameters;
    });

    // always offer BUNDLE and dispose on return if not supported.
    if (pc._config.bundlePolicy !== 'max-compat') {
      sdp += 'a=group:BUNDLE ' + pc.transceivers.map(function(t) {
        return t.mid;
      }).join(' ') + '\r\n';
    }
    sdp += 'a=ice-options:trickle\r\n';

    pc.transceivers.forEach(function(transceiver, sdpMLineIndex) {
      sdp += writeMediaSection(transceiver, transceiver.localCapabilities,
          'offer', transceiver.stream, pc._dtlsRole);
      sdp += 'a=rtcp-rsize\r\n';

      if (transceiver.iceGatherer && pc.iceGatheringState !== 'new' &&
          (sdpMLineIndex === 0 || !pc.usingBundle)) {
        transceiver.iceGatherer.getLocalCandidates().forEach(function(cand) {
          cand.component = 1;
          sdp += 'a=' + SDPUtils.writeCandidate(cand) + '\r\n';
        });

        if (transceiver.iceGatherer.state === 'completed') {
          sdp += 'a=end-of-candidates\r\n';
        }
      }
    });

    var desc = new window.RTCSessionDescription({
      type: 'offer',
      sdp: sdp
    });
    return Promise.resolve(desc);
  };

  RTCPeerConnection.prototype.createAnswer = function() {
    var pc = this;

    if (pc._isClosed) {
      return Promise.reject(makeError('InvalidStateError',
          'Can not call createAnswer after close'));
    }

    if (!(pc.signalingState === 'have-remote-offer' ||
        pc.signalingState === 'have-local-pranswer')) {
      return Promise.reject(makeError('InvalidStateError',
          'Can not call createAnswer in signalingState ' + pc.signalingState));
    }

    var sdp = SDPUtils.writeSessionBoilerplate(pc._sdpSessionId,
        pc._sdpSessionVersion++);
    if (pc.usingBundle) {
      sdp += 'a=group:BUNDLE ' + pc.transceivers.map(function(t) {
        return t.mid;
      }).join(' ') + '\r\n';
    }
    var mediaSectionsInOffer = SDPUtils.getMediaSections(
        pc.remoteDescription.sdp).length;
    pc.transceivers.forEach(function(transceiver, sdpMLineIndex) {
      if (sdpMLineIndex + 1 > mediaSectionsInOffer) {
        return;
      }
      if (transceiver.rejected) {
        if (transceiver.kind === 'application') {
          sdp += 'm=application 0 DTLS/SCTP 5000\r\n';
        } else if (transceiver.kind === 'audio') {
          sdp += 'm=audio 0 UDP/TLS/RTP/SAVPF 0\r\n' +
              'a=rtpmap:0 PCMU/8000\r\n';
        } else if (transceiver.kind === 'video') {
          sdp += 'm=video 0 UDP/TLS/RTP/SAVPF 120\r\n' +
              'a=rtpmap:120 VP8/90000\r\n';
        }
        sdp += 'c=IN IP4 0.0.0.0\r\n' +
            'a=inactive\r\n' +
            'a=mid:' + transceiver.mid + '\r\n';
        return;
      }

      // FIXME: look at direction.
      if (transceiver.stream) {
        var localTrack;
        if (transceiver.kind === 'audio') {
          localTrack = transceiver.stream.getAudioTracks()[0];
        } else if (transceiver.kind === 'video') {
          localTrack = transceiver.stream.getVideoTracks()[0];
        }
        if (localTrack) {
          // add RTX
          if (edgeVersion >= 15019 && transceiver.kind === 'video' &&
              !transceiver.sendEncodingParameters[0].rtx) {
            transceiver.sendEncodingParameters[0].rtx = {
              ssrc: transceiver.sendEncodingParameters[0].ssrc + 1
            };
          }
        }
      }

      // Calculate intersection of capabilities.
      var commonCapabilities = getCommonCapabilities(
          transceiver.localCapabilities,
          transceiver.remoteCapabilities);

      var hasRtx = commonCapabilities.codecs.filter(function(c) {
        return c.name.toLowerCase() === 'rtx';
      }).length;
      if (!hasRtx && transceiver.sendEncodingParameters[0].rtx) {
        delete transceiver.sendEncodingParameters[0].rtx;
      }

      sdp += writeMediaSection(transceiver, commonCapabilities,
          'answer', transceiver.stream, pc._dtlsRole);
      if (transceiver.rtcpParameters &&
          transceiver.rtcpParameters.reducedSize) {
        sdp += 'a=rtcp-rsize\r\n';
      }
    });

    var desc = new window.RTCSessionDescription({
      type: 'answer',
      sdp: sdp
    });
    return Promise.resolve(desc);
  };

  RTCPeerConnection.prototype.addIceCandidate = function(candidate) {
    var pc = this;
    var sections;
    if (candidate && !(candidate.sdpMLineIndex !== undefined ||
        candidate.sdpMid)) {
      return Promise.reject(new TypeError('sdpMLineIndex or sdpMid required'));
    }

    // TODO: needs to go into ops queue.
    return new Promise(function(resolve, reject) {
      if (!pc.remoteDescription) {
        return reject(makeError('InvalidStateError',
            'Can not add ICE candidate without a remote description'));
      } else if (!candidate || candidate.candidate === '') {
        for (var j = 0; j < pc.transceivers.length; j++) {
          if (pc.transceivers[j].rejected) {
            continue;
          }
          pc.transceivers[j].iceTransport.addRemoteCandidate({});
          sections = SDPUtils.getMediaSections(pc.remoteDescription.sdp);
          sections[j] += 'a=end-of-candidates\r\n';
          pc.remoteDescription.sdp =
              SDPUtils.getDescription(pc.remoteDescription.sdp) +
              sections.join('');
          if (pc.usingBundle) {
            break;
          }
        }
      } else {
        var sdpMLineIndex = candidate.sdpMLineIndex;
        if (candidate.sdpMid) {
          for (var i = 0; i < pc.transceivers.length; i++) {
            if (pc.transceivers[i].mid === candidate.sdpMid) {
              sdpMLineIndex = i;
              break;
            }
          }
        }
        var transceiver = pc.transceivers[sdpMLineIndex];
        if (transceiver) {
          if (transceiver.rejected) {
            return resolve();
          }
          var cand = Object.keys(candidate.candidate).length > 0 ?
              SDPUtils.parseCandidate(candidate.candidate) : {};
          // Ignore Chrome's invalid candidates since Edge does not like them.
          if (cand.protocol === 'tcp' && (cand.port === 0 || cand.port === 9)) {
            return resolve();
          }
          // Ignore RTCP candidates, we assume RTCP-MUX.
          if (cand.component && cand.component !== 1) {
            return resolve();
          }
          // when using bundle, avoid adding candidates to the wrong
          // ice transport. And avoid adding candidates added in the SDP.
          if (sdpMLineIndex === 0 || (sdpMLineIndex > 0 &&
              transceiver.iceTransport !== pc.transceivers[0].iceTransport)) {
            if (!maybeAddCandidate(transceiver.iceTransport, cand)) {
              return reject(makeError('OperationError',
                  'Can not add ICE candidate'));
            }
          }

          // update the remoteDescription.
          var candidateString = candidate.candidate.trim();
          if (candidateString.indexOf('a=') === 0) {
            candidateString = candidateString.substr(2);
          }
          sections = SDPUtils.getMediaSections(pc.remoteDescription.sdp);
          sections[sdpMLineIndex] += 'a=' +
              (cand.type ? candidateString : 'end-of-candidates')
              + '\r\n';
          pc.remoteDescription.sdp = sections.join('');
        } else {
          return reject(makeError('OperationError',
              'Can not add ICE candidate'));
        }
      }
      resolve();
    });
  };

  RTCPeerConnection.prototype.getStats = function() {
    var promises = [];
    this.transceivers.forEach(function(transceiver) {
      ['rtpSender', 'rtpReceiver', 'iceGatherer', 'iceTransport',
          'dtlsTransport'].forEach(function(method) {
            if (transceiver[method]) {
              promises.push(transceiver[method].getStats());
            }
          });
    });
    var fixStatsType = function(stat) {
      return {
        inboundrtp: 'inbound-rtp',
        outboundrtp: 'outbound-rtp',
        candidatepair: 'candidate-pair',
        localcandidate: 'local-candidate',
        remotecandidate: 'remote-candidate'
      }[stat.type] || stat.type;
    };
    return new Promise(function(resolve) {
      // shim getStats with maplike support
      var results = new Map();
      Promise.all(promises).then(function(res) {
        res.forEach(function(result) {
          Object.keys(result).forEach(function(id) {
            result[id].type = fixStatsType(result[id]);
            results.set(id, result[id]);
          });
        });
        resolve(results);
      });
    });
  };

  // legacy callback shims. Should be moved to adapter.js some days.
  var methods = ['createOffer', 'createAnswer'];
  methods.forEach(function(method) {
    var nativeMethod = RTCPeerConnection.prototype[method];
    RTCPeerConnection.prototype[method] = function() {
      var args = arguments;
      if (typeof args[0] === 'function' ||
          typeof args[1] === 'function') { // legacy
        return nativeMethod.apply(this, [arguments[2]])
        .then(function(description) {
          if (typeof args[0] === 'function') {
            args[0].apply(null, [description]);
          }
        }, function(error) {
          if (typeof args[1] === 'function') {
            args[1].apply(null, [error]);
          }
        });
      }
      return nativeMethod.apply(this, arguments);
    };
  });

  methods = ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate'];
  methods.forEach(function(method) {
    var nativeMethod = RTCPeerConnection.prototype[method];
    RTCPeerConnection.prototype[method] = function() {
      var args = arguments;
      if (typeof args[1] === 'function' ||
          typeof args[2] === 'function') { // legacy
        return nativeMethod.apply(this, arguments)
        .then(function() {
          if (typeof args[1] === 'function') {
            args[1].apply(null);
          }
        }, function(error) {
          if (typeof args[2] === 'function') {
            args[2].apply(null, [error]);
          }
        });
      }
      return nativeMethod.apply(this, arguments);
    };
  });

  // getStats is special. It doesn't have a spec legacy method yet we support
  // getStats(something, cb) without error callbacks.
  ['getStats'].forEach(function(method) {
    var nativeMethod = RTCPeerConnection.prototype[method];
    RTCPeerConnection.prototype[method] = function() {
      var args = arguments;
      if (typeof args[1] === 'function') {
        return nativeMethod.apply(this, arguments)
        .then(function() {
          if (typeof args[1] === 'function') {
            args[1].apply(null);
          }
        });
      }
      return nativeMethod.apply(this, arguments);
    };
  });

  return RTCPeerConnection;
};


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/sdp-transform/lib/grammar.js":
/***/ (function(module, exports) {

var grammar = module.exports = {
  v: [{
      name: 'version',
      reg: /^(\d*)$/
  }],
  o: [{ //o=- 20518 0 IN IP4 203.0.113.1
    // NB: sessionId will be a String in most cases because it is huge
    name: 'origin',
    reg: /^(\S*) (\d*) (\d*) (\S*) IP(\d) (\S*)/,
    names: ['username', 'sessionId', 'sessionVersion', 'netType', 'ipVer', 'address'],
    format: "%s %s %d %s IP%d %s"
  }],
  // default parsing of these only (though some of these feel outdated)
  s: [{ name: 'name' }],
  i: [{ name: 'description' }],
  u: [{ name: 'uri' }],
  e: [{ name: 'email' }],
  p: [{ name: 'phone' }],
  z: [{ name: 'timezones' }], // TODO: this one can actually be parsed properly..
  r: [{ name: 'repeats' }],   // TODO: this one can also be parsed properly
  //k: [{}], // outdated thing ignored
  t: [{ //t=0 0
    name: 'timing',
    reg: /^(\d*) (\d*)/,
    names: ['start', 'stop'],
    format: "%d %d"
  }],
  c: [{ //c=IN IP4 10.47.197.26
      name: 'connection',
      reg: /^IN IP(\d) (\S*)/,
      names: ['version', 'ip'],
      format: "IN IP%d %s"
  }],
  b: [{ //b=AS:4000
      push: 'bandwidth',
      reg: /^(TIAS|AS|CT|RR|RS):(\d*)/,
      names: ['type', 'limit'],
      format: "%s:%s"
  }],
  m: [{ //m=video 51744 RTP/AVP 126 97 98 34 31
      // NB: special - pushes to session
      // TODO: rtp/fmtp should be filtered by the payloads found here?
      reg: /^(\w*) (\d*) ([\w\/]*)(?: (.*))?/,
      names: ['type', 'port', 'protocol', 'payloads'],
      format: "%s %d %s %s"
  }],
  a: [
    { //a=rtpmap:110 opus/48000/2
      push: 'rtp',
      reg: /^rtpmap:(\d*) ([\w\-]*)(?:\s*\/(\d*)(?:\s*\/(\S*))?)?/,
      names: ['payload', 'codec', 'rate', 'encoding'],
      format: function (o) {
        return (o.encoding) ?
          "rtpmap:%d %s/%s/%s":
          o.rate ?
          "rtpmap:%d %s/%s":
          "rtpmap:%d %s";
      }
    },
    {
      //a=fmtp:108 profile-level-id=24;object=23;bitrate=64000
      //a=fmtp:111 minptime=10; useinbandfec=1
      push: 'fmtp',
      reg: /^fmtp:(\d*) ([\S| ]*)/,
      names: ['payload', 'config'],
      format: "fmtp:%d %s"
    },
    { //a=control:streamid=0
        name: 'control',
        reg: /^control:(.*)/,
        format: "control:%s"
    },
    { //a=rtcp:65179 IN IP4 193.84.77.194
      name: 'rtcp',
      reg: /^rtcp:(\d*)(?: (\S*) IP(\d) (\S*))?/,
      names: ['port', 'netType', 'ipVer', 'address'],
      format: function (o) {
        return (o.address != null) ?
          "rtcp:%d %s IP%d %s":
          "rtcp:%d";
      }
    },
    { //a=rtcp-fb:98 trr-int 100
      push: 'rtcpFbTrrInt',
      reg: /^rtcp-fb:(\*|\d*) trr-int (\d*)/,
      names: ['payload', 'value'],
      format: "rtcp-fb:%d trr-int %d"
    },
    { //a=rtcp-fb:98 nack rpsi
      push: 'rtcpFb',
      reg: /^rtcp-fb:(\*|\d*) ([\w-_]*)(?: ([\w-_]*))?/,
      names: ['payload', 'type', 'subtype'],
      format: function (o) {
        return (o.subtype != null) ?
          "rtcp-fb:%s %s %s":
          "rtcp-fb:%s %s";
      }
    },
    { //a=extmap:2 urn:ietf:params:rtp-hdrext:toffset
      //a=extmap:1/recvonly URI-gps-string
      push: 'ext',
      reg: /^extmap:([\w_\/]*) (\S*)(?: (\S*))?/,
      names: ['value', 'uri', 'config'], // value may include "/direction" suffix
      format: function (o) {
        return (o.config != null) ?
          "extmap:%s %s %s":
          "extmap:%s %s";
      }
    },
    {
      //a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:PS1uQCVeeCFCanVmcjkpPywjNWhcYD0mXXtxaVBR|2^20|1:32
      push: 'crypto',
      reg: /^crypto:(\d*) ([\w_]*) (\S*)(?: (\S*))?/,
      names: ['id', 'suite', 'config', 'sessionConfig'],
      format: function (o) {
        return (o.sessionConfig != null) ?
          "crypto:%d %s %s %s":
          "crypto:%d %s %s";
      }
    },
    { //a=setup:actpass
      name: 'setup',
      reg: /^setup:(\w*)/,
      format: "setup:%s"
    },
    { //a=mid:1
      name: 'mid',
      reg: /^mid:([^\s]*)/,
      format: "mid:%s"
    },
    { //a=msid:0c8b064d-d807-43b4-b434-f92a889d8587 98178685-d409-46e0-8e16-7ef0db0db64a
      name: 'msid',
      reg: /^msid:(.*)/,
      format: "msid:%s"
    },
    { //a=ptime:20
      name: 'ptime',
      reg: /^ptime:(\d*)/,
      format: "ptime:%d"
    },
    { //a=maxptime:60
      name: 'maxptime',
      reg: /^maxptime:(\d*)/,
      format: "maxptime:%d"
    },
    { //a=sendrecv
      name: 'direction',
      reg: /^(sendrecv|recvonly|sendonly|inactive)/
    },
    { //a=ice-lite
      name: 'icelite',
      reg: /^(ice-lite)/
    },
    { //a=ice-ufrag:F7gI
      name: 'iceUfrag',
      reg: /^ice-ufrag:(\S*)/,
      format: "ice-ufrag:%s"
    },
    { //a=ice-pwd:x9cml/YzichV2+XlhiMu8g
      name: 'icePwd',
      reg: /^ice-pwd:(\S*)/,
      format: "ice-pwd:%s"
    },
    { //a=fingerprint:SHA-1 00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33
      name: 'fingerprint',
      reg: /^fingerprint:(\S*) (\S*)/,
      names: ['type', 'hash'],
      format: "fingerprint:%s %s"
    },
    {
      //a=candidate:0 1 UDP 2113667327 203.0.113.1 54400 typ host
      //a=candidate:1162875081 1 udp 2113937151 192.168.34.75 60017 typ host generation 0
      //a=candidate:3289912957 2 udp 1845501695 193.84.77.194 60017 typ srflx raddr 192.168.34.75 rport 60017 generation 0
      //a=candidate:229815620 1 tcp 1518280447 192.168.150.19 60017 typ host tcptype active generation 0
      //a=candidate:3289912957 2 tcp 1845501695 193.84.77.194 60017 typ srflx raddr 192.168.34.75 rport 60017 tcptype passive generation 0
      push:'candidates',
      reg: /^candidate:(\S*) (\d*) (\S*) (\d*) (\S*) (\d*) typ (\S*)(?: raddr (\S*) rport (\d*))?(?: tcptype (\S*))?(?: generation (\d*))?/,
      names: ['foundation', 'component', 'transport', 'priority', 'ip', 'port', 'type', 'raddr', 'rport', 'tcptype', 'generation'],
      format: function (o) {
        var str = "candidate:%s %d %s %d %s %d typ %s";

        str += (o.raddr != null) ? " raddr %s rport %d" : "%v%v";

        // NB: candidate has three optional chunks, so %void middles one if it's missing
        str += (o.tcptype != null) ? " tcptype %s" : "%v";

        if (o.generation != null) {
          str += " generation %d";
        }
        return str;
      }
    },
    { //a=end-of-candidates (keep after the candidates line for readability)
      name: 'endOfCandidates',
      reg: /^(end-of-candidates)/
    },
    { //a=remote-candidates:1 203.0.113.1 54400 2 203.0.113.1 54401 ...
      name: 'remoteCandidates',
      reg: /^remote-candidates:(.*)/,
      format: "remote-candidates:%s"
    },
    { //a=ice-options:google-ice
      name: 'iceOptions',
      reg: /^ice-options:(\S*)/,
      format: "ice-options:%s"
    },
    { //a=ssrc:2566107569 cname:t9YU8M1UxTF8Y1A1
      push: "ssrcs",
      reg: /^ssrc:(\d*) ([\w_]*):(.*)/,
      names: ['id', 'attribute', 'value'],
      format: "ssrc:%d %s:%s"
    },
    { //a=ssrc-group:FEC 1 2
      push: "ssrcGroups",
      reg: /^ssrc-group:(\w*) (.*)/,
      names: ['semantics', 'ssrcs'],
      format: "ssrc-group:%s %s"
    },
    { //a=msid-semantic: WMS Jvlam5X3SX1OP6pn20zWogvaKJz5Hjf9OnlV
      name: "msidSemantic",
      reg: /^msid-semantic:\s?(\w*) (\S*)/,
      names: ['semantic', 'token'],
      format: "msid-semantic: %s %s" // space after ":" is not accidental
    },
    { //a=group:BUNDLE audio video
      push: 'groups',
      reg: /^group:(\w*) (.*)/,
      names: ['type', 'mids'],
      format: "group:%s %s"
    },
    { //a=rtcp-mux
      name: 'rtcpMux',
      reg: /^(rtcp-mux)/
    },
    { //a=rtcp-rsize
      name: 'rtcpRsize',
      reg: /^(rtcp-rsize)/
    },
    { // any a= that we don't understand is kepts verbatim on media.invalid
      push: 'invalid',
      names: ["value"]
    }
  ]
};

// set sensible defaults to avoid polluting the grammar with boring details
Object.keys(grammar).forEach(function (key) {
  var objs = grammar[key];
  objs.forEach(function (obj) {
    if (!obj.reg) {
      obj.reg = /(.*)/;
    }
    if (!obj.format) {
      obj.format = "%s";
    }
  });
});


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/sdp-transform/lib/index.js":
/***/ (function(module, exports, __webpack_require__) {

var parser = __webpack_require__("../../../../openvidu-browser/node_modules/sdp-transform/lib/parser.js");
var writer = __webpack_require__("../../../../openvidu-browser/node_modules/sdp-transform/lib/writer.js");

exports.write = writer;
exports.parse = parser.parse;
exports.parseFmtpConfig = parser.parseFmtpConfig;
exports.parsePayloads = parser.parsePayloads;
exports.parseRemoteCandidates = parser.parseRemoteCandidates;


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/sdp-transform/lib/parser.js":
/***/ (function(module, exports, __webpack_require__) {

var toIntIfInt = function (v) {
  return String(Number(v)) === v ? Number(v) : v;
};

var attachProperties = function (match, location, names, rawName) {
  if (rawName && !names) {
    location[rawName] = toIntIfInt(match[1]);
  }
  else {
    for (var i = 0; i < names.length; i += 1) {
      if (match[i+1] != null) {
        location[names[i]] = toIntIfInt(match[i+1]);
      }
    }
  }
};

var parseReg = function (obj, location, content) {
  var needsBlank = obj.name && obj.names;
  if (obj.push && !location[obj.push]) {
    location[obj.push] = [];
  }
  else if (needsBlank && !location[obj.name]) {
    location[obj.name] = {};
  }
  var keyLocation = obj.push ?
    {} :  // blank object that will be pushed
    needsBlank ? location[obj.name] : location; // otherwise, named location or root

  attachProperties(content.match(obj.reg), keyLocation, obj.names, obj.name);

  if (obj.push) {
    location[obj.push].push(keyLocation);
  }
};

var grammar = __webpack_require__("../../../../openvidu-browser/node_modules/sdp-transform/lib/grammar.js");
var validLine = RegExp.prototype.test.bind(/^([a-z])=(.*)/);

exports.parse = function (sdp) {
  var session = {}
    , media = []
    , location = session; // points at where properties go under (one of the above)

  // parse lines we understand
  sdp.split(/(\r\n|\r|\n)/).filter(validLine).forEach(function (l) {
    var type = l[0];
    var content = l.slice(2);
    if (type === 'm') {
      media.push({rtp: [], fmtp: []});
      location = media[media.length-1]; // point at latest media line
    }

    for (var j = 0; j < (grammar[type] || []).length; j += 1) {
      var obj = grammar[type][j];
      if (obj.reg.test(content)) {
        return parseReg(obj, location, content);
      }
    }
  });

  session.media = media; // link it up
  return session;
};

var fmtpReducer = function (acc, expr) {
  var s = expr.split('=');
  if (s.length === 2) {
    acc[s[0]] = toIntIfInt(s[1]);
  }
  return acc;
};

exports.parseFmtpConfig = function (str) {
  return str.split(/\;\s?/).reduce(fmtpReducer, {});
};

exports.parsePayloads = function (str) {
  return str.split(' ').map(Number);
};

exports.parseRemoteCandidates = function (str) {
  var candidates = [];
  var parts = str.split(' ').map(toIntIfInt);
  for (var i = 0; i < parts.length; i += 3) {
    candidates.push({
      component: parts[i],
      ip: parts[i + 1],
      port: parts[i + 2]
    });
  }
  return candidates;
};


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/sdp-transform/lib/writer.js":
/***/ (function(module, exports, __webpack_require__) {

var grammar = __webpack_require__("../../../../openvidu-browser/node_modules/sdp-transform/lib/grammar.js");

// customized util.format - discards excess arguments and can void middle ones
var formatRegExp = /%[sdv%]/g;
var format = function (formatStr) {
  var i = 1;
  var args = arguments;
  var len = args.length;
  return formatStr.replace(formatRegExp, function (x) {
    if (i >= len) {
      return x; // missing argument
    }
    var arg = args[i];
    i += 1;
    switch (x) {
      case '%%':
        return '%';
      case '%s':
        return String(arg);
      case '%d':
        return Number(arg);
      case '%v':
        return '';
    }
  });
  // NB: we discard excess arguments - they are typically undefined from makeLine
};

var makeLine = function (type, obj, location) {
  var str = obj.format instanceof Function ?
    (obj.format(obj.push ? location : location[obj.name])) :
    obj.format;

  var args = [type + '=' + str];
  if (obj.names) {
    for (var i = 0; i < obj.names.length; i += 1) {
      var n = obj.names[i];
      if (obj.name) {
        args.push(location[obj.name][n]);
      }
      else { // for mLine and push attributes
        args.push(location[obj.names[i]]);
      }
    }
  }
  else {
    args.push(location[obj.name]);
  }
  return format.apply(null, args);
};

// RFC specified order
// TODO: extend this with all the rest
var defaultOuterOrder = [
  'v', 'o', 's', 'i',
  'u', 'e', 'p', 'c',
  'b', 't', 'r', 'z', 'a'
];
var defaultInnerOrder = ['i', 'c', 'b', 'a'];


module.exports = function (session, opts) {
  opts = opts || {};
  // ensure certain properties exist
  if (session.version == null) {
    session.version = 0; // "v=0" must be there (only defined version atm)
  }
  if (session.name == null) {
    session.name = " "; // "s= " must be there if no meaningful name set
  }
  session.media.forEach(function (mLine) {
    if (mLine.payloads == null) {
      mLine.payloads = "";
    }
  });

  var outerOrder = opts.outerOrder || defaultOuterOrder;
  var innerOrder = opts.innerOrder || defaultInnerOrder;
  var sdp = [];

  // loop through outerOrder for matching properties on session
  outerOrder.forEach(function (type) {
    grammar[type].forEach(function (obj) {
      if (obj.name in session && session[obj.name] != null) {
        sdp.push(makeLine(type, obj, session));
      }
      else if (obj.push in session && session[obj.push] != null) {
        session[obj.push].forEach(function (el) {
          sdp.push(makeLine(type, obj, el));
        });
      }
    });
  });

  // then for each media line, follow the innerOrder
  session.media.forEach(function (mLine) {
    sdp.push(makeLine('m', grammar.m[0], mLine));

    innerOrder.forEach(function (type) {
      grammar[type].forEach(function (obj) {
        if (obj.name in mLine && mLine[obj.name] != null) {
          sdp.push(makeLine(type, obj, mLine));
        }
        else if (obj.push in mLine && mLine[obj.push] != null) {
          mLine[obj.push].forEach(function (el) {
            sdp.push(makeLine(type, obj, el));
          });
        }
      });
    });
  });

  return sdp.join('\r\n') + '\r\n';
};


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/sdp-translator/lib/array-equals.js":
/***/ (function(module, exports) {

/* Copyright @ 2015 Atlassian Pty Ltd
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

module.exports = function arrayEquals(array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time
    if (this.length != array.length)
        return false;

    for (var i = 0, l = this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!arrayEquals.apply(this[i], [array[i]]))
                return false;
        } else if (this[i] != array[i]) {
            // Warning - two different object instances will never be equal:
            // {x:20} != {x:20}
            return false;
        }
    }
    return true;
};



/***/ }),

/***/ "../../../../openvidu-browser/node_modules/sdp-translator/lib/index.js":
/***/ (function(module, exports, __webpack_require__) {

/* Copyright @ 2015 Atlassian Pty Ltd
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

exports.Interop = __webpack_require__("../../../../openvidu-browser/node_modules/sdp-translator/lib/interop.js");


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/sdp-translator/lib/interop.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* Copyright @ 2015 Atlassian Pty Ltd
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* global RTCSessionDescription */
/* global RTCIceCandidate */
/* jshint -W097 */


var transform = __webpack_require__("../../../../openvidu-browser/node_modules/sdp-translator/lib/transform.js");
var arrayEquals = __webpack_require__("../../../../openvidu-browser/node_modules/sdp-translator/lib/array-equals.js");

function Interop() {

    /**
     * This map holds the most recent Unified Plan offer/answer SDP that was
     * converted to Plan B, with the SDP type ('offer' or 'answer') as keys and
     * the SDP string as values.
     *
     * @type {{}}
     */
    this.cache = {
        mlB2UMap : {},
        mlU2BMap : {}
    };
}

module.exports = Interop;

/**
 * Changes the candidate args to match with the related Unified Plan
 */
Interop.prototype.candidateToUnifiedPlan = function(candidate) {
    var cand = new RTCIceCandidate(candidate);

    cand.sdpMLineIndex = this.cache.mlB2UMap[cand.sdpMLineIndex];
    /* TODO: change sdpMid to (audio|video)-SSRC */

    return cand;
};

/**
 * Changes the candidate args to match with the related Plan B
 */
Interop.prototype.candidateToPlanB = function(candidate) {
    var cand = new RTCIceCandidate(candidate);

    if (cand.sdpMid.indexOf('audio') === 0) {
      cand.sdpMid = 'audio';
    } else if (cand.sdpMid.indexOf('video') === 0) {
      cand.sdpMid = 'video';
    } else {
      throw new Error('candidate with ' + cand.sdpMid + ' not allowed');
    }

    cand.sdpMLineIndex = this.cache.mlU2BMap[cand.sdpMLineIndex];

    return cand;
};

/**
 * Returns the index of the first m-line with the given media type and with a
 * direction which allows sending, in the last Unified Plan description with
 * type "answer" converted to Plan B. Returns {null} if there is no saved
 * answer, or if none of its m-lines with the given type allow sending.
 * @param type the media type ("audio" or "video").
 * @returns {*}
 */
Interop.prototype.getFirstSendingIndexFromAnswer = function(type) {
    if (!this.cache.answer) {
        return null;
    }

    var session = transform.parse(this.cache.answer);
    if (session && session.media && Array.isArray(session.media)){
        for (var i = 0; i < session.media.length; i++) {
            if (session.media[i].type == type &&
                (!session.media[i].direction /* default to sendrecv */ ||
                    session.media[i].direction === 'sendrecv' ||
                    session.media[i].direction === 'sendonly')){
                return i;
            }
        }
    }

    return null;
};

/**
 * This method transforms a Unified Plan SDP to an equivalent Plan B SDP. A
 * PeerConnection wrapper transforms the SDP to Plan B before passing it to the
 * application.
 *
 * @param desc
 * @returns {*}
 */
Interop.prototype.toPlanB = function(desc) {
    var self = this;
    //#region Preliminary input validation.

    if (typeof desc !== 'object' || desc === null ||
        typeof desc.sdp !== 'string') {
        console.warn('An empty description was passed as an argument.');
        return desc;
    }

    // Objectify the SDP for easier manipulation.
    var session = transform.parse(desc.sdp);

    // If the SDP contains no media, there's nothing to transform.
    if (typeof session.media === 'undefined' ||
        !Array.isArray(session.media) || session.media.length === 0) {
        console.warn('The description has no media.');
        return desc;
    }

    // Try some heuristics to "make sure" this is a Unified Plan SDP. Plan B
    // SDP has a video, an audio and a data "channel" at most.
    if (session.media.length <= 3 && session.media.every(function(m) {
            return ['video', 'audio', 'data'].indexOf(m.mid) !== -1;
        })) {
        console.warn('This description does not look like Unified Plan.');
        return desc;
    }

    //#endregion

    // HACK https://bugzilla.mozilla.org/show_bug.cgi?id=1113443
    var sdp = desc.sdp;
    var rewrite = false;
    for (var i = 0; i < session.media.length; i++) {
        var uLine = session.media[i];
        uLine.rtp.forEach(function(rtp) {
            if (rtp.codec === 'NULL')
            {
                rewrite = true;
                var offer = transform.parse(self.cache.offer);
                rtp.codec = offer.media[i].rtp[0].codec;
            }
        });
    }
    if (rewrite) {
        sdp = transform.write(session);
    }

    // Unified Plan SDP is our "precious". Cache it for later use in the Plan B
    // -> Unified Plan transformation.
    this.cache[desc.type] = sdp;

    //#region Convert from Unified Plan to Plan B.

    // We rebuild the session.media array.
    var media = session.media;
    session.media = [];

    // Associative array that maps channel types to channel objects for fast
    // access to channel objects by their type, e.g. type2bl['audio']->channel
    // obj.
    var type2bl = {};

    // Used to build the group:BUNDLE value after the channels construction
    // loop.
    var types = [];

    media.forEach(function(uLine) {
        // rtcp-mux is required in the Plan B SDP.
        if ((typeof uLine.rtcpMux !== 'string' ||
            uLine.rtcpMux !== 'rtcp-mux') &&
            uLine.direction !== 'inactive') {
            throw new Error('Cannot convert to Plan B because m-lines ' +
                'without the rtcp-mux attribute were found.');
        }

        // If we don't have a channel for this uLine.type OR the selected is
        // inactive, then select this uLine as the channel basis.
        if (typeof type2bl[uLine.type] === 'undefined' ||
            type2bl[uLine.type].direction === 'inactive') {
            type2bl[uLine.type] = uLine;
        }

        if (uLine.protocol != type2bl[uLine.type].protocol) {
          throw new Error('Cannot convert to Plan B because m-lines ' +
              'have different protocols and this library does not have ' +
              'support for that');
        }

        if (uLine.payloads != type2bl[uLine.type].payloads) {
          throw new Error('Cannot convert to Plan B because m-lines ' +
              'have different payloads and this library does not have ' +
              'support for that');
        }

    });

    // Implode the Unified Plan m-lines/tracks into Plan B channels.
    media.forEach(function(uLine) {
        if (uLine.type === 'application') {
            session.media.push(uLine);
            types.push(uLine.mid);
            return;
        }

        // Add sources to the channel and handle a=msid.
        if (typeof uLine.sources === 'object') {
            Object.keys(uLine.sources).forEach(function(ssrc) {
                if (typeof type2bl[uLine.type].sources !== 'object')
                    type2bl[uLine.type].sources = {};

                // Assign the sources to the channel.
                type2bl[uLine.type].sources[ssrc] =
                    uLine.sources[ssrc];

                if (typeof uLine.msid !== 'undefined') {
                    // In Plan B the msid is an SSRC attribute. Also, we don't
                    // care about the obsolete label and mslabel attributes.
                    //
                    // Note that it is not guaranteed that the uLine will
                    // have an msid. recvonly channels in particular don't have
                    // one.
                    type2bl[uLine.type].sources[ssrc].msid =
                        uLine.msid;
                }
                // NOTE ssrcs in ssrc groups will share msids, as
                // draft-uberti-rtcweb-plan-00 mandates.
            });
        }

        // Add ssrc groups to the channel.
        if (typeof uLine.ssrcGroups !== 'undefined' &&
                Array.isArray(uLine.ssrcGroups)) {

            // Create the ssrcGroups array, if it's not defined.
            if (typeof type2bl[uLine.type].ssrcGroups === 'undefined' ||
                    !Array.isArray(type2bl[uLine.type].ssrcGroups)) {
                type2bl[uLine.type].ssrcGroups = [];
            }

            type2bl[uLine.type].ssrcGroups =
                type2bl[uLine.type].ssrcGroups.concat(
                    uLine.ssrcGroups);
        }

        if (type2bl[uLine.type] === uLine) {
            // Plan B mids are in ['audio', 'video', 'data']
            uLine.mid = uLine.type;

            // Plan B doesn't support/need the bundle-only attribute.
            delete uLine.bundleOnly;

            // In Plan B the msid is an SSRC attribute.
            delete uLine.msid;

	    if (uLine.type == media[0].type) {
	      types.unshift(uLine.type);
	      // Add the channel to the new media array.
	      session.media.unshift(uLine);
	    } else {
	      types.push(uLine.type);
	      // Add the channel to the new media array.
	      session.media.push(uLine);
	    }
        }
    });

    if (typeof session.groups !== 'undefined') {
      // We regenerate the BUNDLE group with the new mids.
      session.groups.some(function(group) {
	  if (group.type === 'BUNDLE') {
	      group.mids = types.join(' ');
	      return true;
	  }
      });
    }

    // msid semantic
    session.msidSemantic = {
        semantic: 'WMS',
        token: '*'
    };

    var resStr = transform.write(session);

    return new RTCSessionDescription({
        type: desc.type,
        sdp: resStr
    });

    //#endregion
};

/* follow rules defined in RFC4145 */
function addSetupAttr(uLine) {
    if (typeof uLine.setup === 'undefined') {
        return;
    }

    if (uLine.setup === "active") {
            uLine.setup = "passive";
    } else if (uLine.setup === "passive") {
        uLine.setup = "active";
    }
}

/**
 * This method transforms a Plan B SDP to an equivalent Unified Plan SDP. A
 * PeerConnection wrapper transforms the SDP to Unified Plan before passing it
 * to FF.
 *
 * @param desc
 * @returns {*}
 */
Interop.prototype.toUnifiedPlan = function(desc) {
    var self = this;
    //#region Preliminary input validation.

    if (typeof desc !== 'object' || desc === null ||
        typeof desc.sdp !== 'string') {
        console.warn('An empty description was passed as an argument.');
        return desc;
    }

    var session = transform.parse(desc.sdp);

    // If the SDP contains no media, there's nothing to transform.
    if (typeof session.media === 'undefined' ||
        !Array.isArray(session.media) || session.media.length === 0) {
        console.warn('The description has no media.');
        return desc;
    }

    // Try some heuristics to "make sure" this is a Plan B SDP. Plan B SDP has
    // a video, an audio and a data "channel" at most.
    if (session.media.length > 3 || !session.media.every(function(m) {
            return ['video', 'audio', 'data'].indexOf(m.mid) !== -1;
        })) {
        console.warn('This description does not look like Plan B.');
        return desc;
    }

    // Make sure this Plan B SDP can be converted to a Unified Plan SDP.
    var mids = [];
    session.media.forEach(function(m) {
        mids.push(m.mid);
    });

    var hasBundle = false;
    if (typeof session.groups !== 'undefined' &&
        Array.isArray(session.groups)) {
        hasBundle = session.groups.every(function(g) {
            return g.type !== 'BUNDLE' ||
                arrayEquals.apply(g.mids.sort(), [mids.sort()]);
        });
    }

    if (!hasBundle) {
        var mustBeBundle = false;

        session.media.forEach(function(m) {
            if (m.direction !== 'inactive') {
                mustBeBundle = true;
            }
        });

        if (mustBeBundle) {
            throw new Error("Cannot convert to Unified Plan because m-lines that" +
              " are not bundled were found.");
        }
    }

    //#endregion


    //#region Convert from Plan B to Unified Plan.

    // Unfortunately, a Plan B offer/answer doesn't have enough information to
    // rebuild an equivalent Unified Plan offer/answer.
    //
    // For example, if this is a local answer (in Unified Plan style) that we
    // convert to Plan B prior to handing it over to the application (the
    // PeerConnection wrapper called us, for instance, after a successful
    // createAnswer), we want to remember the m-line at which we've seen the
    // (local) SSRC. That's because when the application wants to do call the
    // SLD method, forcing us to do the inverse transformation (from Plan B to
    // Unified Plan), we need to know to which m-line to assign the (local)
    // SSRC. We also need to know all the other m-lines that the original
    // answer had and include them in the transformed answer as well.
    //
    // Another example is if this is a remote offer that we convert to Plan B
    // prior to giving it to the application, we want to remember the mid at
    // which we've seen the (remote) SSRC.
    //
    // In the iteration that follows, we use the cached Unified Plan (if it
    // exists) to assign mids to ssrcs.

    var type;
    if (desc.type === 'answer') {
        type = 'offer';
    } else if (desc.type === 'offer') {
        type = 'answer';
    } else {
        throw new Error("Type '" + desc.type + "' not supported.");
    }

    var cached;
    if (typeof this.cache[type] !== 'undefined') {
        cached = transform.parse(this.cache[type]);
    }

    var recvonlySsrcs = {
        audio: {},
        video: {}
    };

    // A helper map that sends mids to m-line objects. We use it later to
    // rebuild the Unified Plan style session.media array.
    var mid2ul = {};
    var bIdx = 0;
    var uIdx = 0;

    var sources2ul = {};

    var candidates;
    var iceUfrag;
    var icePwd;
    var fingerprint;
    var payloads = {};
    var rtcpFb = {};
    var rtp = {};

    session.media.forEach(function(bLine) {
        if ((typeof bLine.rtcpMux !== 'string' ||
            bLine.rtcpMux !== 'rtcp-mux') &&
            bLine.direction !== 'inactive') {
            throw new Error("Cannot convert to Unified Plan because m-lines " +
                "without the rtcp-mux attribute were found.");
        }

        if (bLine.type === 'application') {
            mid2ul[bLine.mid] = bLine;
            return;
        }

        // With rtcp-mux and bundle all the channels should have the same ICE
        // stuff.
        var sources = bLine.sources;
        var ssrcGroups = bLine.ssrcGroups;
        var port = bLine.port;

        /* Chrome adds different candidates even using bundle, so we concat the candidates list */
        if (typeof bLine.candidates != 'undefined') {
            if (typeof candidates != 'undefined') {
                candidates = candidates.concat(bLine.candidates);
            } else {
                candidates = bLine.candidates;
            }
        }

        if ((typeof iceUfrag != 'undefined') && (typeof bLine.iceUfrag != 'undefined') && (iceUfrag != bLine.iceUfrag)) {
            throw new Error("Only BUNDLE supported, iceUfrag must be the same for all m-lines.\n" +
                            "\tLast iceUfrag: " + iceUfrag + "\n" +
                            "\tNew iceUfrag: " + bLine.iceUfrag
            );
        }

        if (typeof bLine.iceUfrag != 'undefined') {
                iceUfrag = bLine.iceUfrag;
        }

        if ((typeof icePwd != 'undefined') && (typeof bLine.icePwd != 'undefined') && (icePwd != bLine.icePwd)) {
            throw new Error("Only BUNDLE supported, icePwd must be the same for all m-lines.\n" +
                            "\tLast icePwd: " + icePwd + "\n" +
                            "\tNew icePwd: " + bLine.icePwd
            );
        }

        if (typeof bLine.icePwd != 'undefined') {
                icePwd = bLine.icePwd;
        }

        if ((typeof fingerprint != 'undefined') && (typeof bLine.fingerprint != 'undefined') &&
            (fingerprint.type != bLine.fingerprint.type || fingerprint.hash != bLine.fingerprint.hash)) {
            throw new Error("Only BUNDLE supported, fingerprint must be the same for all m-lines.\n" +
                            "\tLast fingerprint: " + JSON.stringify(fingerprint) + "\n" +
                            "\tNew fingerprint: " + JSON.stringify(bLine.fingerprint)
            );
        }

        if (typeof bLine.fingerprint != 'undefined') {
                fingerprint = bLine.fingerprint;
        }

        payloads[bLine.type] = bLine.payloads;
        rtcpFb[bLine.type] = bLine.rtcpFb;
        rtp[bLine.type] = bLine.rtp;

        // inverted ssrc group map
        var ssrc2group = {};
        if (typeof ssrcGroups !== 'undefined' && Array.isArray(ssrcGroups)) {
            ssrcGroups.forEach(function (ssrcGroup) {
                // XXX This might brake if an SSRC is in more than one group
                // for some reason.
                if (typeof ssrcGroup.ssrcs !== 'undefined' &&
                    Array.isArray(ssrcGroup.ssrcs)) {
                    ssrcGroup.ssrcs.forEach(function (ssrc) {
                        if (typeof ssrc2group[ssrc] === 'undefined') {
                            ssrc2group[ssrc] = [];
                        }

                        ssrc2group[ssrc].push(ssrcGroup);
                    });
                }
            });
        }

        // ssrc to m-line index.
        var ssrc2ml = {};

        if (typeof sources === 'object') {

            // We'll use the "bLine" object as a prototype for each new "mLine"
            // that we create, but first we need to clean it up a bit.
            delete bLine.sources;
            delete bLine.ssrcGroups;
            delete bLine.candidates;
            delete bLine.iceUfrag;
            delete bLine.icePwd;
            delete bLine.fingerprint;
            delete bLine.port;
            delete bLine.mid;

            // Explode the Plan B channel sources with one m-line per source.
            Object.keys(sources).forEach(function(ssrc) {

                // The (unified) m-line for this SSRC. We either create it from
                // scratch or, if it's a grouped SSRC, we re-use a related
                // mline. In other words, if the source is grouped with another
                // source, put the two together in the same m-line.
                var uLine;

                // We assume here that we are the answerer in the O/A, so any
                // offers which we translate come from the remote side, while
                // answers are local. So the check below is to make that we
                // handle receive-only SSRCs in a special way only if they come
                // from the remote side.
                if (desc.type==='offer') {
                    // We want to detect SSRCs which are used by a remote peer
                    // in an m-line with direction=recvonly (i.e. they are
                    // being used for RTCP only).
                    // This information would have gotten lost if the remote
                    // peer used Unified Plan and their local description was
                    // translated to Plan B. So we use the lack of an MSID
                    // attribute to deduce a "receive only" SSRC.
                    if (!sources[ssrc].msid) {
                        recvonlySsrcs[bLine.type][ssrc] = sources[ssrc];
                        // Receive-only SSRCs must not create new m-lines. We
                        // will assign them to an existing m-line later.
                        return;
                    }
                }

                if (typeof ssrc2group[ssrc] !== 'undefined' &&
                    Array.isArray(ssrc2group[ssrc])) {
                    ssrc2group[ssrc].some(function (ssrcGroup) {
                        // ssrcGroup.ssrcs *is* an Array, no need to check
                        // again here.
                        return ssrcGroup.ssrcs.some(function (related) {
                            if (typeof ssrc2ml[related] === 'object') {
                                uLine = ssrc2ml[related];
                                return true;
                            }
                        });
                    });
                }

                if (typeof uLine === 'object') {
                    // the m-line already exists. Just add the source.
                    uLine.sources[ssrc] = sources[ssrc];
                    delete sources[ssrc].msid;
                } else {
                    // Use the "bLine" as a prototype for the "uLine".
                    uLine = Object.create(bLine);
                    ssrc2ml[ssrc] = uLine;

                    if (typeof sources[ssrc].msid !== 'undefined') {
                        // Assign the msid of the source to the m-line. Note
                        // that it is not guaranteed that the source will have
                        // msid. In particular "recvonly" sources don't have an
                        // msid. Note that "recvonly" is a term only defined
                        // for m-lines.
                        uLine.msid = sources[ssrc].msid;
                        delete sources[ssrc].msid;
                    }

                    // We assign one SSRC per media line.
                    uLine.sources = {};
                    uLine.sources[ssrc] = sources[ssrc];
                    uLine.ssrcGroups = ssrc2group[ssrc];

                    // Use the cached Unified Plan SDP (if it exists) to assign
                    // SSRCs to mids.
                    if (typeof cached !== 'undefined' &&
                        typeof cached.media !== 'undefined' &&
                        Array.isArray(cached.media)) {

                        cached.media.forEach(function (m) {
                            if (typeof m.sources === 'object') {
                                Object.keys(m.sources).forEach(function (s) {
                                    if (s === ssrc) {
                                        uLine.mid = m.mid;
                                    }
                                });
                            }
                        });
                    }

                    if (typeof uLine.mid === 'undefined') {

                        // If this is an SSRC that we see for the first time
                        // assign it a new mid. This is typically the case when
                        // this method is called to transform a remote
                        // description for the first time or when there is a
                        // new SSRC in the remote description because a new
                        // peer has joined the conference. Local SSRCs should
                        // have already been added to the map in the toPlanB
                        // method.
                        //
                        // Because FF generates answers in Unified Plan style,
                        // we MUST already have a cached answer with all the
                        // local SSRCs mapped to some m-line/mid.

                        uLine.mid = [bLine.type, '-', ssrc].join('');
                    }

                    // Include the candidates in the 1st media line.
                    uLine.candidates = candidates;
                    uLine.iceUfrag = iceUfrag;
                    uLine.icePwd = icePwd;
                    uLine.fingerprint = fingerprint;
                    uLine.port = port;

                    mid2ul[uLine.mid] = uLine;
                    sources2ul[uIdx] = uLine.sources;

                    self.cache.mlU2BMap[uIdx] = bIdx;
                    if (typeof self.cache.mlB2UMap[bIdx] === 'undefined') {
                      self.cache.mlB2UMap[bIdx] = uIdx;
                    }
                    uIdx++;
                }
            });
        } else {
          var uLine = bLine;

          uLine.candidates = candidates;
          uLine.iceUfrag = iceUfrag;
          uLine.icePwd = icePwd;
          uLine.fingerprint = fingerprint;
          uLine.port = port;

          mid2ul[uLine.mid] = uLine;

          self.cache.mlU2BMap[uIdx] = bIdx;
          if (typeof self.cache.mlB2UMap[bIdx] === 'undefined') {
            self.cache.mlB2UMap[bIdx] = uIdx;
          }
        }

        bIdx++;
    });

    // Rebuild the media array in the right order and add the missing mLines
    // (missing from the Plan B SDP).
    session.media = [];
    mids = []; // reuse

    if (desc.type === 'answer') {

        // The media lines in the answer must match the media lines in the
        // offer. The order is important too. Here we assume that Firefox is
        // the answerer, so we merely have to use the reconstructed (unified)
        // answer to update the cached (unified) answer accordingly.
        //
        // In the general case, one would have to use the cached (unified)
        // offer to find the m-lines that are missing from the reconstructed
        // answer, potentially grabbing them from the cached (unified) answer.
        // One has to be careful with this approach because inactive m-lines do
        // not always have an mid, making it tricky (impossible?) to find where
        // exactly and which m-lines are missing from the reconstructed answer.

        for (var i = 0; i < cached.media.length; i++) {
            var uLine = cached.media[i];

            delete uLine.msid;
            delete uLine.sources;
            delete uLine.ssrcGroups;

            if (typeof sources2ul[i] === 'undefined') {
              if (!uLine.direction
                  || uLine.direction === 'sendrecv')
                  uLine.direction = 'recvonly';
              else if (uLine.direction === 'sendonly')
                  uLine.direction = 'inactive';
            } else {
              if (!uLine.direction
                  || uLine.direction === 'sendrecv')
                  uLine.direction = 'sendrecv';
              else if (uLine.direction === 'recvonly')
                  uLine.direction = 'sendonly';
            }

            uLine.sources = sources2ul[i];
            uLine.candidates = candidates;
            uLine.iceUfrag = iceUfrag;
            uLine.icePwd = icePwd;
            uLine.fingerprint = fingerprint;

            uLine.rtp = rtp[uLine.type];
            uLine.payloads = payloads[uLine.type];
            uLine.rtcpFb = rtcpFb[uLine.type];

            session.media.push(uLine);

            if (typeof uLine.mid === 'string') {
                // inactive lines don't/may not have an mid.
                mids.push(uLine.mid);
            }
        }
    } else {

        // SDP offer/answer (and the JSEP spec) forbids removing an m-section
        // under any circumstances. If we are no longer interested in sending a
        // track, we just remove the msid and ssrc attributes and set it to
        // either a=recvonly (as the reofferer, we must use recvonly if the
        // other side was previously sending on the m-section, but we can also
        // leave the possibility open if it wasn't previously in use), or
        // a=inactive.

        if (typeof cached !== 'undefined' &&
            typeof cached.media !== 'undefined' &&
            Array.isArray(cached.media)) {
            cached.media.forEach(function(uLine) {
                mids.push(uLine.mid);
                if (typeof mid2ul[uLine.mid] !== 'undefined') {
                    session.media.push(mid2ul[uLine.mid]);
                } else {
                    delete uLine.msid;
                    delete uLine.sources;
                    delete uLine.ssrcGroups;

                    if (!uLine.direction
                        || uLine.direction === 'sendrecv') {
                        uLine.direction = 'sendonly';
                    }
                    if (!uLine.direction
                        || uLine.direction === 'recvonly') {
                        uLine.direction = 'inactive';
                    }

                    addSetupAttr (uLine);
                    session.media.push(uLine);
                }
            });
        }

        // Add all the remaining (new) m-lines of the transformed SDP.
        Object.keys(mid2ul).forEach(function(mid) {
            if (mids.indexOf(mid) === -1) {
                mids.push(mid);
                if (mid2ul[mid].direction === 'recvonly') {
                    // This is a remote recvonly channel. Add its SSRC to the
                    // appropriate sendrecv or sendonly channel.
                    // TODO(gp) what if we don't have sendrecv/sendonly
                    // channel?

                    var done = false;

                    session.media.some(function (uLine) {
                        if ((uLine.direction === 'sendrecv' ||
                            uLine.direction === 'sendonly') &&
                            uLine.type === mid2ul[mid].type) {
                            // mid2ul[mid] shouldn't have any ssrc-groups
                            Object.keys(mid2ul[mid].sources).forEach(
                                function (ssrc) {
                                uLine.sources[ssrc] =
                                    mid2ul[mid].sources[ssrc];
                            });

                            done = true;
                            return true;
                        }
                    });

                    if (!done) {
                        session.media.push(mid2ul[mid]);
                    }
                } else {
                    session.media.push(mid2ul[mid]);
                }
            }
        });
    }

    // After we have constructed the Plan Unified m-lines we can figure out
    // where (in which m-line) to place the 'recvonly SSRCs'.
    // Note: we assume here that we are the answerer in the O/A, so any offers
    // which we translate come from the remote side, while answers are local
    // (and so our last local description is cached as an 'answer').
    ["audio", "video"].forEach(function (type) {
        if (!session || !session.media || !Array.isArray(session.media))
            return;

        var idx = null;
        if (Object.keys(recvonlySsrcs[type]).length > 0) {
            idx = self.getFirstSendingIndexFromAnswer(type);
            if (idx === null){
                // If this is the first offer we receive, we don't have a
                // cached answer. Assume that we will be sending media using
                // the first m-line for each media type.

                for (var i = 0; i < session.media.length; i++) {
                    if (session.media[i].type === type) {
                        idx = i;
                        break;
                    }
                }
            }
        }

        if (idx && session.media.length > idx) {
            var mLine = session.media[idx];
            Object.keys(recvonlySsrcs[type]).forEach(function(ssrc) {
                if (mLine.sources && mLine.sources[ssrc]) {
                    console.warn("Replacing an existing SSRC.");
                }
                if (!mLine.sources) {
                    mLine.sources = {};
                }

                mLine.sources[ssrc] = recvonlySsrcs[type][ssrc];
            });
        }
    });

    if (typeof session.groups !== 'undefined') {
      // We regenerate the BUNDLE group (since we regenerated the mids)
      session.groups.some(function(group) {
	  if (group.type === 'BUNDLE') {
	      group.mids = mids.join(' ');
	      return true;
	  }
      });
    }

    // msid semantic
    session.msidSemantic = {
        semantic: 'WMS',
        token: '*'
    };

    var resStr = transform.write(session);

    // Cache the transformed SDP (Unified Plan) for later re-use in this
    // function.
    this.cache[desc.type] = resStr;

    return new RTCSessionDescription({
        type: desc.type,
        sdp: resStr
    });

    //#endregion
};


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/sdp-translator/lib/transform.js":
/***/ (function(module, exports, __webpack_require__) {

/* Copyright @ 2015 Atlassian Pty Ltd
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var transform = __webpack_require__("../../../../openvidu-browser/node_modules/sdp-transform/lib/index.js");

exports.write = function(session, opts) {

  if (typeof session !== 'undefined' &&
      typeof session.media !== 'undefined' &&
      Array.isArray(session.media)) {

    session.media.forEach(function (mLine) {
      // expand sources to ssrcs
      if (typeof mLine.sources !== 'undefined' &&
        Object.keys(mLine.sources).length !== 0) {
          mLine.ssrcs = [];
          Object.keys(mLine.sources).forEach(function (ssrc) {
            var source = mLine.sources[ssrc];
            Object.keys(source).forEach(function (attribute) {
              mLine.ssrcs.push({
                id: ssrc,
                attribute: attribute,
                value: source[attribute]
              });
            });
          });
          delete mLine.sources;
        }

      // join ssrcs in ssrc groups
      if (typeof mLine.ssrcGroups !== 'undefined' &&
        Array.isArray(mLine.ssrcGroups)) {
          mLine.ssrcGroups.forEach(function (ssrcGroup) {
            if (typeof ssrcGroup.ssrcs !== 'undefined' &&
                Array.isArray(ssrcGroup.ssrcs)) {
              ssrcGroup.ssrcs = ssrcGroup.ssrcs.join(' ');
            }
          });
        }
    });
  }

  // join group mids
  if (typeof session !== 'undefined' &&
      typeof session.groups !== 'undefined' && Array.isArray(session.groups)) {

    session.groups.forEach(function (g) {
      if (typeof g.mids !== 'undefined' && Array.isArray(g.mids)) {
        g.mids = g.mids.join(' ');
      }
    });
  }

  return transform.write(session, opts);
};

exports.parse = function(sdp) {
  var session = transform.parse(sdp);

  if (typeof session !== 'undefined' && typeof session.media !== 'undefined' &&
      Array.isArray(session.media)) {

    session.media.forEach(function (mLine) {
      // group sources attributes by ssrc
      if (typeof mLine.ssrcs !== 'undefined' && Array.isArray(mLine.ssrcs)) {
        mLine.sources = {};
        mLine.ssrcs.forEach(function (ssrc) {
          if (!mLine.sources[ssrc.id])
          mLine.sources[ssrc.id] = {};
        mLine.sources[ssrc.id][ssrc.attribute] = ssrc.value;
        });

        delete mLine.ssrcs;
      }

      // split ssrcs in ssrc groups
      if (typeof mLine.ssrcGroups !== 'undefined' &&
        Array.isArray(mLine.ssrcGroups)) {
          mLine.ssrcGroups.forEach(function (ssrcGroup) {
            if (typeof ssrcGroup.ssrcs === 'string') {
              ssrcGroup.ssrcs = ssrcGroup.ssrcs.split(' ');
            }
          });
        }
    });
  }
  // split group mids
  if (typeof session !== 'undefined' &&
      typeof session.groups !== 'undefined' && Array.isArray(session.groups)) {

    session.groups.forEach(function (g) {
      if (typeof g.mids === 'string') {
        g.mids = g.mids.split(' ');
      }
    });
  }

  return session;
};



/***/ }),

/***/ "../../../../openvidu-browser/node_modules/sdp/sdp.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";
 /* eslint-env node */


// SDP helpers.
var SDPUtils = {};

// Generate an alphanumeric identifier for cname or mids.
// TODO: use UUIDs instead? https://gist.github.com/jed/982883
SDPUtils.generateIdentifier = function() {
  return Math.random().toString(36).substr(2, 10);
};

// The RTCP CNAME used by all peerconnections from the same JS.
SDPUtils.localCName = SDPUtils.generateIdentifier();

// Splits SDP into lines, dealing with both CRLF and LF.
SDPUtils.splitLines = function(blob) {
  return blob.trim().split('\n').map(function(line) {
    return line.trim();
  });
};
// Splits SDP into sessionpart and mediasections. Ensures CRLF.
SDPUtils.splitSections = function(blob) {
  var parts = blob.split('\nm=');
  return parts.map(function(part, index) {
    return (index > 0 ? 'm=' + part : part).trim() + '\r\n';
  });
};

// returns the session description.
SDPUtils.getDescription = function(blob) {
  var sections = SDPUtils.splitSections(blob);
  return sections && sections[0];
};

// returns the individual media sections.
SDPUtils.getMediaSections = function(blob) {
  var sections = SDPUtils.splitSections(blob);
  sections.shift();
  return sections;
};

// Returns lines that start with a certain prefix.
SDPUtils.matchPrefix = function(blob, prefix) {
  return SDPUtils.splitLines(blob).filter(function(line) {
    return line.indexOf(prefix) === 0;
  });
};

// Parses an ICE candidate line. Sample input:
// candidate:702786350 2 udp 41819902 8.8.8.8 60769 typ relay raddr 8.8.8.8
// rport 55996"
SDPUtils.parseCandidate = function(line) {
  var parts;
  // Parse both variants.
  if (line.indexOf('a=candidate:') === 0) {
    parts = line.substring(12).split(' ');
  } else {
    parts = line.substring(10).split(' ');
  }

  var candidate = {
    foundation: parts[0],
    component: parseInt(parts[1], 10),
    protocol: parts[2].toLowerCase(),
    priority: parseInt(parts[3], 10),
    ip: parts[4],
    port: parseInt(parts[5], 10),
    // skip parts[6] == 'typ'
    type: parts[7]
  };

  for (var i = 8; i < parts.length; i += 2) {
    switch (parts[i]) {
      case 'raddr':
        candidate.relatedAddress = parts[i + 1];
        break;
      case 'rport':
        candidate.relatedPort = parseInt(parts[i + 1], 10);
        break;
      case 'tcptype':
        candidate.tcpType = parts[i + 1];
        break;
      case 'ufrag':
        candidate.ufrag = parts[i + 1]; // for backward compability.
        candidate.usernameFragment = parts[i + 1];
        break;
      default: // extension handling, in particular ufrag
        candidate[parts[i]] = parts[i + 1];
        break;
    }
  }
  return candidate;
};

// Translates a candidate object into SDP candidate attribute.
SDPUtils.writeCandidate = function(candidate) {
  var sdp = [];
  sdp.push(candidate.foundation);
  sdp.push(candidate.component);
  sdp.push(candidate.protocol.toUpperCase());
  sdp.push(candidate.priority);
  sdp.push(candidate.ip);
  sdp.push(candidate.port);

  var type = candidate.type;
  sdp.push('typ');
  sdp.push(type);
  if (type !== 'host' && candidate.relatedAddress &&
      candidate.relatedPort) {
    sdp.push('raddr');
    sdp.push(candidate.relatedAddress); // was: relAddr
    sdp.push('rport');
    sdp.push(candidate.relatedPort); // was: relPort
  }
  if (candidate.tcpType && candidate.protocol.toLowerCase() === 'tcp') {
    sdp.push('tcptype');
    sdp.push(candidate.tcpType);
  }
  if (candidate.ufrag) {
    sdp.push('ufrag');
    sdp.push(candidate.ufrag);
  }
  return 'candidate:' + sdp.join(' ');
};

// Parses an ice-options line, returns an array of option tags.
// a=ice-options:foo bar
SDPUtils.parseIceOptions = function(line) {
  return line.substr(14).split(' ');
}

// Parses an rtpmap line, returns RTCRtpCoddecParameters. Sample input:
// a=rtpmap:111 opus/48000/2
SDPUtils.parseRtpMap = function(line) {
  var parts = line.substr(9).split(' ');
  var parsed = {
    payloadType: parseInt(parts.shift(), 10) // was: id
  };

  parts = parts[0].split('/');

  parsed.name = parts[0];
  parsed.clockRate = parseInt(parts[1], 10); // was: clockrate
  // was: channels
  parsed.numChannels = parts.length === 3 ? parseInt(parts[2], 10) : 1;
  return parsed;
};

// Generate an a=rtpmap line from RTCRtpCodecCapability or
// RTCRtpCodecParameters.
SDPUtils.writeRtpMap = function(codec) {
  var pt = codec.payloadType;
  if (codec.preferredPayloadType !== undefined) {
    pt = codec.preferredPayloadType;
  }
  return 'a=rtpmap:' + pt + ' ' + codec.name + '/' + codec.clockRate +
      (codec.numChannels !== 1 ? '/' + codec.numChannels : '') + '\r\n';
};

// Parses an a=extmap line (headerextension from RFC 5285). Sample input:
// a=extmap:2 urn:ietf:params:rtp-hdrext:toffset
// a=extmap:2/sendonly urn:ietf:params:rtp-hdrext:toffset
SDPUtils.parseExtmap = function(line) {
  var parts = line.substr(9).split(' ');
  return {
    id: parseInt(parts[0], 10),
    direction: parts[0].indexOf('/') > 0 ? parts[0].split('/')[1] : 'sendrecv',
    uri: parts[1]
  };
};

// Generates a=extmap line from RTCRtpHeaderExtensionParameters or
// RTCRtpHeaderExtension.
SDPUtils.writeExtmap = function(headerExtension) {
  return 'a=extmap:' + (headerExtension.id || headerExtension.preferredId) +
      (headerExtension.direction && headerExtension.direction !== 'sendrecv'
          ? '/' + headerExtension.direction
          : '') +
      ' ' + headerExtension.uri + '\r\n';
};

// Parses an ftmp line, returns dictionary. Sample input:
// a=fmtp:96 vbr=on;cng=on
// Also deals with vbr=on; cng=on
SDPUtils.parseFmtp = function(line) {
  var parsed = {};
  var kv;
  var parts = line.substr(line.indexOf(' ') + 1).split(';');
  for (var j = 0; j < parts.length; j++) {
    kv = parts[j].trim().split('=');
    parsed[kv[0].trim()] = kv[1];
  }
  return parsed;
};

// Generates an a=ftmp line from RTCRtpCodecCapability or RTCRtpCodecParameters.
SDPUtils.writeFmtp = function(codec) {
  var line = '';
  var pt = codec.payloadType;
  if (codec.preferredPayloadType !== undefined) {
    pt = codec.preferredPayloadType;
  }
  if (codec.parameters && Object.keys(codec.parameters).length) {
    var params = [];
    Object.keys(codec.parameters).forEach(function(param) {
      params.push(param + '=' + codec.parameters[param]);
    });
    line += 'a=fmtp:' + pt + ' ' + params.join(';') + '\r\n';
  }
  return line;
};

// Parses an rtcp-fb line, returns RTCPRtcpFeedback object. Sample input:
// a=rtcp-fb:98 nack rpsi
SDPUtils.parseRtcpFb = function(line) {
  var parts = line.substr(line.indexOf(' ') + 1).split(' ');
  return {
    type: parts.shift(),
    parameter: parts.join(' ')
  };
};
// Generate a=rtcp-fb lines from RTCRtpCodecCapability or RTCRtpCodecParameters.
SDPUtils.writeRtcpFb = function(codec) {
  var lines = '';
  var pt = codec.payloadType;
  if (codec.preferredPayloadType !== undefined) {
    pt = codec.preferredPayloadType;
  }
  if (codec.rtcpFeedback && codec.rtcpFeedback.length) {
    // FIXME: special handling for trr-int?
    codec.rtcpFeedback.forEach(function(fb) {
      lines += 'a=rtcp-fb:' + pt + ' ' + fb.type +
      (fb.parameter && fb.parameter.length ? ' ' + fb.parameter : '') +
          '\r\n';
    });
  }
  return lines;
};

// Parses an RFC 5576 ssrc media attribute. Sample input:
// a=ssrc:3735928559 cname:something
SDPUtils.parseSsrcMedia = function(line) {
  var sp = line.indexOf(' ');
  var parts = {
    ssrc: parseInt(line.substr(7, sp - 7), 10)
  };
  var colon = line.indexOf(':', sp);
  if (colon > -1) {
    parts.attribute = line.substr(sp + 1, colon - sp - 1);
    parts.value = line.substr(colon + 1);
  } else {
    parts.attribute = line.substr(sp + 1);
  }
  return parts;
};

// Extracts the MID (RFC 5888) from a media section.
// returns the MID or undefined if no mid line was found.
SDPUtils.getMid = function(mediaSection) {
  var mid = SDPUtils.matchPrefix(mediaSection, 'a=mid:')[0];
  if (mid) {
    return mid.substr(6);
  }
}

SDPUtils.parseFingerprint = function(line) {
  var parts = line.substr(14).split(' ');
  return {
    algorithm: parts[0].toLowerCase(), // algorithm is case-sensitive in Edge.
    value: parts[1]
  };
};

// Extracts DTLS parameters from SDP media section or sessionpart.
// FIXME: for consistency with other functions this should only
//   get the fingerprint line as input. See also getIceParameters.
SDPUtils.getDtlsParameters = function(mediaSection, sessionpart) {
  var lines = SDPUtils.matchPrefix(mediaSection + sessionpart,
      'a=fingerprint:');
  // Note: a=setup line is ignored since we use the 'auto' role.
  // Note2: 'algorithm' is not case sensitive except in Edge.
  return {
    role: 'auto',
    fingerprints: lines.map(SDPUtils.parseFingerprint)
  };
};

// Serializes DTLS parameters to SDP.
SDPUtils.writeDtlsParameters = function(params, setupType) {
  var sdp = 'a=setup:' + setupType + '\r\n';
  params.fingerprints.forEach(function(fp) {
    sdp += 'a=fingerprint:' + fp.algorithm + ' ' + fp.value + '\r\n';
  });
  return sdp;
};
// Parses ICE information from SDP media section or sessionpart.
// FIXME: for consistency with other functions this should only
//   get the ice-ufrag and ice-pwd lines as input.
SDPUtils.getIceParameters = function(mediaSection, sessionpart) {
  var lines = SDPUtils.splitLines(mediaSection);
  // Search in session part, too.
  lines = lines.concat(SDPUtils.splitLines(sessionpart));
  var iceParameters = {
    usernameFragment: lines.filter(function(line) {
      return line.indexOf('a=ice-ufrag:') === 0;
    })[0].substr(12),
    password: lines.filter(function(line) {
      return line.indexOf('a=ice-pwd:') === 0;
    })[0].substr(10)
  };
  return iceParameters;
};

// Serializes ICE parameters to SDP.
SDPUtils.writeIceParameters = function(params) {
  return 'a=ice-ufrag:' + params.usernameFragment + '\r\n' +
      'a=ice-pwd:' + params.password + '\r\n';
};

// Parses the SDP media section and returns RTCRtpParameters.
SDPUtils.parseRtpParameters = function(mediaSection) {
  var description = {
    codecs: [],
    headerExtensions: [],
    fecMechanisms: [],
    rtcp: []
  };
  var lines = SDPUtils.splitLines(mediaSection);
  var mline = lines[0].split(' ');
  for (var i = 3; i < mline.length; i++) { // find all codecs from mline[3..]
    var pt = mline[i];
    var rtpmapline = SDPUtils.matchPrefix(
        mediaSection, 'a=rtpmap:' + pt + ' ')[0];
    if (rtpmapline) {
      var codec = SDPUtils.parseRtpMap(rtpmapline);
      var fmtps = SDPUtils.matchPrefix(
          mediaSection, 'a=fmtp:' + pt + ' ');
      // Only the first a=fmtp:<pt> is considered.
      codec.parameters = fmtps.length ? SDPUtils.parseFmtp(fmtps[0]) : {};
      codec.rtcpFeedback = SDPUtils.matchPrefix(
          mediaSection, 'a=rtcp-fb:' + pt + ' ')
        .map(SDPUtils.parseRtcpFb);
      description.codecs.push(codec);
      // parse FEC mechanisms from rtpmap lines.
      switch (codec.name.toUpperCase()) {
        case 'RED':
        case 'ULPFEC':
          description.fecMechanisms.push(codec.name.toUpperCase());
          break;
        default: // only RED and ULPFEC are recognized as FEC mechanisms.
          break;
      }
    }
  }
  SDPUtils.matchPrefix(mediaSection, 'a=extmap:').forEach(function(line) {
    description.headerExtensions.push(SDPUtils.parseExtmap(line));
  });
  // FIXME: parse rtcp.
  return description;
};

// Generates parts of the SDP media section describing the capabilities /
// parameters.
SDPUtils.writeRtpDescription = function(kind, caps) {
  var sdp = '';

  // Build the mline.
  sdp += 'm=' + kind + ' ';
  sdp += caps.codecs.length > 0 ? '9' : '0'; // reject if no codecs.
  sdp += ' UDP/TLS/RTP/SAVPF ';
  sdp += caps.codecs.map(function(codec) {
    if (codec.preferredPayloadType !== undefined) {
      return codec.preferredPayloadType;
    }
    return codec.payloadType;
  }).join(' ') + '\r\n';

  sdp += 'c=IN IP4 0.0.0.0\r\n';
  sdp += 'a=rtcp:9 IN IP4 0.0.0.0\r\n';

  // Add a=rtpmap lines for each codec. Also fmtp and rtcp-fb.
  caps.codecs.forEach(function(codec) {
    sdp += SDPUtils.writeRtpMap(codec);
    sdp += SDPUtils.writeFmtp(codec);
    sdp += SDPUtils.writeRtcpFb(codec);
  });
  var maxptime = 0;
  caps.codecs.forEach(function(codec) {
    if (codec.maxptime > maxptime) {
      maxptime = codec.maxptime;
    }
  });
  if (maxptime > 0) {
    sdp += 'a=maxptime:' + maxptime + '\r\n';
  }
  sdp += 'a=rtcp-mux\r\n';

  caps.headerExtensions.forEach(function(extension) {
    sdp += SDPUtils.writeExtmap(extension);
  });
  // FIXME: write fecMechanisms.
  return sdp;
};

// Parses the SDP media section and returns an array of
// RTCRtpEncodingParameters.
SDPUtils.parseRtpEncodingParameters = function(mediaSection) {
  var encodingParameters = [];
  var description = SDPUtils.parseRtpParameters(mediaSection);
  var hasRed = description.fecMechanisms.indexOf('RED') !== -1;
  var hasUlpfec = description.fecMechanisms.indexOf('ULPFEC') !== -1;

  // filter a=ssrc:... cname:, ignore PlanB-msid
  var ssrcs = SDPUtils.matchPrefix(mediaSection, 'a=ssrc:')
  .map(function(line) {
    return SDPUtils.parseSsrcMedia(line);
  })
  .filter(function(parts) {
    return parts.attribute === 'cname';
  });
  var primarySsrc = ssrcs.length > 0 && ssrcs[0].ssrc;
  var secondarySsrc;

  var flows = SDPUtils.matchPrefix(mediaSection, 'a=ssrc-group:FID')
  .map(function(line) {
    var parts = line.split(' ');
    parts.shift();
    return parts.map(function(part) {
      return parseInt(part, 10);
    });
  });
  if (flows.length > 0 && flows[0].length > 1 && flows[0][0] === primarySsrc) {
    secondarySsrc = flows[0][1];
  }

  description.codecs.forEach(function(codec) {
    if (codec.name.toUpperCase() === 'RTX' && codec.parameters.apt) {
      var encParam = {
        ssrc: primarySsrc,
        codecPayloadType: parseInt(codec.parameters.apt, 10),
        rtx: {
          ssrc: secondarySsrc
        }
      };
      encodingParameters.push(encParam);
      if (hasRed) {
        encParam = JSON.parse(JSON.stringify(encParam));
        encParam.fec = {
          ssrc: secondarySsrc,
          mechanism: hasUlpfec ? 'red+ulpfec' : 'red'
        };
        encodingParameters.push(encParam);
      }
    }
  });
  if (encodingParameters.length === 0 && primarySsrc) {
    encodingParameters.push({
      ssrc: primarySsrc
    });
  }

  // we support both b=AS and b=TIAS but interpret AS as TIAS.
  var bandwidth = SDPUtils.matchPrefix(mediaSection, 'b=');
  if (bandwidth.length) {
    if (bandwidth[0].indexOf('b=TIAS:') === 0) {
      bandwidth = parseInt(bandwidth[0].substr(7), 10);
    } else if (bandwidth[0].indexOf('b=AS:') === 0) {
      // use formula from JSEP to convert b=AS to TIAS value.
      bandwidth = parseInt(bandwidth[0].substr(5), 10) * 1000 * 0.95
          - (50 * 40 * 8);
    } else {
      bandwidth = undefined;
    }
    encodingParameters.forEach(function(params) {
      params.maxBitrate = bandwidth;
    });
  }
  return encodingParameters;
};

// parses http://draft.ortc.org/#rtcrtcpparameters*
SDPUtils.parseRtcpParameters = function(mediaSection) {
  var rtcpParameters = {};

  var cname;
  // Gets the first SSRC. Note that with RTX there might be multiple
  // SSRCs.
  var remoteSsrc = SDPUtils.matchPrefix(mediaSection, 'a=ssrc:')
      .map(function(line) {
        return SDPUtils.parseSsrcMedia(line);
      })
      .filter(function(obj) {
        return obj.attribute === 'cname';
      })[0];
  if (remoteSsrc) {
    rtcpParameters.cname = remoteSsrc.value;
    rtcpParameters.ssrc = remoteSsrc.ssrc;
  }

  // Edge uses the compound attribute instead of reducedSize
  // compound is !reducedSize
  var rsize = SDPUtils.matchPrefix(mediaSection, 'a=rtcp-rsize');
  rtcpParameters.reducedSize = rsize.length > 0;
  rtcpParameters.compound = rsize.length === 0;

  // parses the rtcp-mux attrіbute.
  // Note that Edge does not support unmuxed RTCP.
  var mux = SDPUtils.matchPrefix(mediaSection, 'a=rtcp-mux');
  rtcpParameters.mux = mux.length > 0;

  return rtcpParameters;
};

// parses either a=msid: or a=ssrc:... msid lines and returns
// the id of the MediaStream and MediaStreamTrack.
SDPUtils.parseMsid = function(mediaSection) {
  var parts;
  var spec = SDPUtils.matchPrefix(mediaSection, 'a=msid:');
  if (spec.length === 1) {
    parts = spec[0].substr(7).split(' ');
    return {stream: parts[0], track: parts[1]};
  }
  var planB = SDPUtils.matchPrefix(mediaSection, 'a=ssrc:')
  .map(function(line) {
    return SDPUtils.parseSsrcMedia(line);
  })
  .filter(function(parts) {
    return parts.attribute === 'msid';
  });
  if (planB.length > 0) {
    parts = planB[0].value.split(' ');
    return {stream: parts[0], track: parts[1]};
  }
};

// Generate a session ID for SDP.
// https://tools.ietf.org/html/draft-ietf-rtcweb-jsep-20#section-5.2.1
// recommends using a cryptographically random +ve 64-bit value
// but right now this should be acceptable and within the right range
SDPUtils.generateSessionId = function() {
  return Math.random().toString().substr(2, 21);
};

// Write boilder plate for start of SDP
// sessId argument is optional - if not supplied it will
// be generated randomly
// sessVersion is optional and defaults to 2
SDPUtils.writeSessionBoilerplate = function(sessId, sessVer) {
  var sessionId;
  var version = sessVer !== undefined ? sessVer : 2;
  if (sessId) {
    sessionId = sessId;
  } else {
    sessionId = SDPUtils.generateSessionId();
  }
  // FIXME: sess-id should be an NTP timestamp.
  return 'v=0\r\n' +
      'o=thisisadapterortc ' + sessionId + ' ' + version + ' IN IP4 127.0.0.1\r\n' +
      's=-\r\n' +
      't=0 0\r\n';
};

SDPUtils.writeMediaSection = function(transceiver, caps, type, stream) {
  var sdp = SDPUtils.writeRtpDescription(transceiver.kind, caps);

  // Map ICE parameters (ufrag, pwd) to SDP.
  sdp += SDPUtils.writeIceParameters(
      transceiver.iceGatherer.getLocalParameters());

  // Map DTLS parameters to SDP.
  sdp += SDPUtils.writeDtlsParameters(
      transceiver.dtlsTransport.getLocalParameters(),
      type === 'offer' ? 'actpass' : 'active');

  sdp += 'a=mid:' + transceiver.mid + '\r\n';

  if (transceiver.direction) {
    sdp += 'a=' + transceiver.direction + '\r\n';
  } else if (transceiver.rtpSender && transceiver.rtpReceiver) {
    sdp += 'a=sendrecv\r\n';
  } else if (transceiver.rtpSender) {
    sdp += 'a=sendonly\r\n';
  } else if (transceiver.rtpReceiver) {
    sdp += 'a=recvonly\r\n';
  } else {
    sdp += 'a=inactive\r\n';
  }

  if (transceiver.rtpSender) {
    // spec.
    var msid = 'msid:' + stream.id + ' ' +
        transceiver.rtpSender.track.id + '\r\n';
    sdp += 'a=' + msid;

    // for Chrome.
    sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc +
        ' ' + msid;
    if (transceiver.sendEncodingParameters[0].rtx) {
      sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].rtx.ssrc +
          ' ' + msid;
      sdp += 'a=ssrc-group:FID ' +
          transceiver.sendEncodingParameters[0].ssrc + ' ' +
          transceiver.sendEncodingParameters[0].rtx.ssrc +
          '\r\n';
    }
  }
  // FIXME: this should be written by writeRtpDescription.
  sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc +
      ' cname:' + SDPUtils.localCName + '\r\n';
  if (transceiver.rtpSender && transceiver.sendEncodingParameters[0].rtx) {
    sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].rtx.ssrc +
        ' cname:' + SDPUtils.localCName + '\r\n';
  }
  return sdp;
};

// Gets the direction from the mediaSection or the sessionpart.
SDPUtils.getDirection = function(mediaSection, sessionpart) {
  // Look for sendrecv, sendonly, recvonly, inactive, default to sendrecv.
  var lines = SDPUtils.splitLines(mediaSection);
  for (var i = 0; i < lines.length; i++) {
    switch (lines[i]) {
      case 'a=sendrecv':
      case 'a=sendonly':
      case 'a=recvonly':
      case 'a=inactive':
        return lines[i].substr(2);
      default:
        // FIXME: What should happen here?
    }
  }
  if (sessionpart) {
    return SDPUtils.getDirection(sessionpart);
  }
  return 'sendrecv';
};

SDPUtils.getKind = function(mediaSection) {
  var lines = SDPUtils.splitLines(mediaSection);
  var mline = lines[0].split(' ');
  return mline[0].substr(2);
};

SDPUtils.isRejected = function(mediaSection) {
  return mediaSection.split(' ', 2)[1] === '0';
};

SDPUtils.parseMLine = function(mediaSection) {
  var lines = SDPUtils.splitLines(mediaSection);
  var parts = lines[0].substr(2).split(' ');
  return {
    kind: parts[0],
    port: parseInt(parts[1], 10),
    protocol: parts[2],
    fmt: parts.slice(3).join(' ')
  };
};

SDPUtils.parseOLine = function(mediaSection) {
  var line = SDPUtils.matchPrefix(mediaSection, 'o=')[0];
  var parts = line.substr(2).split(' ');
  return {
    username: parts[0],
    sessionId: parts[1],
    sessionVersion: parseInt(parts[2], 10),
    netType: parts[3],
    addressType: parts[4],
    address: parts[5],
  };
}

// Expose public methods.
if (true) {
  module.exports = SDPUtils;
}


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/ua-parser-js/src/ua-parser.js":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_RESULT__;/**
 * UAParser.js v0.7.17
 * Lightweight JavaScript-based User-Agent string parser
 * https://github.com/faisalman/ua-parser-js
 *
 * Copyright © 2012-2016 Faisal Salman <fyzlman@gmail.com>
 * Dual licensed under GPLv2 & MIT
 */

(function (window, undefined) {

    'use strict';

    //////////////
    // Constants
    /////////////


    var LIBVERSION  = '0.7.17',
        EMPTY       = '',
        UNKNOWN     = '?',
        FUNC_TYPE   = 'function',
        UNDEF_TYPE  = 'undefined',
        OBJ_TYPE    = 'object',
        STR_TYPE    = 'string',
        MAJOR       = 'major', // deprecated
        MODEL       = 'model',
        NAME        = 'name',
        TYPE        = 'type',
        VENDOR      = 'vendor',
        VERSION     = 'version',
        ARCHITECTURE= 'architecture',
        CONSOLE     = 'console',
        MOBILE      = 'mobile',
        TABLET      = 'tablet',
        SMARTTV     = 'smarttv',
        WEARABLE    = 'wearable',
        EMBEDDED    = 'embedded';


    ///////////
    // Helper
    //////////


    var util = {
        extend : function (regexes, extensions) {
            var margedRegexes = {};
            for (var i in regexes) {
                if (extensions[i] && extensions[i].length % 2 === 0) {
                    margedRegexes[i] = extensions[i].concat(regexes[i]);
                } else {
                    margedRegexes[i] = regexes[i];
                }
            }
            return margedRegexes;
        },
        has : function (str1, str2) {
          if (typeof str1 === "string") {
            return str2.toLowerCase().indexOf(str1.toLowerCase()) !== -1;
          } else {
            return false;
          }
        },
        lowerize : function (str) {
            return str.toLowerCase();
        },
        major : function (version) {
            return typeof(version) === STR_TYPE ? version.replace(/[^\d\.]/g,'').split(".")[0] : undefined;
        },
        trim : function (str) {
          return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
        }
    };


    ///////////////
    // Map helper
    //////////////


    var mapper = {

        rgx : function (ua, arrays) {

            //var result = {},
            var i = 0, j, k, p, q, matches, match;//, args = arguments;

            /*// construct object barebones
            for (p = 0; p < args[1].length; p++) {
                q = args[1][p];
                result[typeof q === OBJ_TYPE ? q[0] : q] = undefined;
            }*/

            // loop through all regexes maps
            while (i < arrays.length && !matches) {

                var regex = arrays[i],       // even sequence (0,2,4,..)
                    props = arrays[i + 1];   // odd sequence (1,3,5,..)
                j = k = 0;

                // try matching uastring with regexes
                while (j < regex.length && !matches) {

                    matches = regex[j++].exec(ua);

                    if (!!matches) {
                        for (p = 0; p < props.length; p++) {
                            match = matches[++k];
                            q = props[p];
                            // check if given property is actually array
                            if (typeof q === OBJ_TYPE && q.length > 0) {
                                if (q.length == 2) {
                                    if (typeof q[1] == FUNC_TYPE) {
                                        // assign modified match
                                        this[q[0]] = q[1].call(this, match);
                                    } else {
                                        // assign given value, ignore regex match
                                        this[q[0]] = q[1];
                                    }
                                } else if (q.length == 3) {
                                    // check whether function or regex
                                    if (typeof q[1] === FUNC_TYPE && !(q[1].exec && q[1].test)) {
                                        // call function (usually string mapper)
                                        this[q[0]] = match ? q[1].call(this, match, q[2]) : undefined;
                                    } else {
                                        // sanitize match using given regex
                                        this[q[0]] = match ? match.replace(q[1], q[2]) : undefined;
                                    }
                                } else if (q.length == 4) {
                                        this[q[0]] = match ? q[3].call(this, match.replace(q[1], q[2])) : undefined;
                                }
                            } else {
                                this[q] = match ? match : undefined;
                            }
                        }
                    }
                }
                i += 2;
            }
            // console.log(this);
            //return this;
        },

        str : function (str, map) {

            for (var i in map) {
                // check if array
                if (typeof map[i] === OBJ_TYPE && map[i].length > 0) {
                    for (var j = 0; j < map[i].length; j++) {
                        if (util.has(map[i][j], str)) {
                            return (i === UNKNOWN) ? undefined : i;
                        }
                    }
                } else if (util.has(map[i], str)) {
                    return (i === UNKNOWN) ? undefined : i;
                }
            }
            return str;
        }
    };


    ///////////////
    // String map
    //////////////


    var maps = {

        browser : {
            oldsafari : {
                version : {
                    '1.0'   : '/8',
                    '1.2'   : '/1',
                    '1.3'   : '/3',
                    '2.0'   : '/412',
                    '2.0.2' : '/416',
                    '2.0.3' : '/417',
                    '2.0.4' : '/419',
                    '?'     : '/'
                }
            }
        },

        device : {
            amazon : {
                model : {
                    'Fire Phone' : ['SD', 'KF']
                }
            },
            sprint : {
                model : {
                    'Evo Shift 4G' : '7373KT'
                },
                vendor : {
                    'HTC'       : 'APA',
                    'Sprint'    : 'Sprint'
                }
            }
        },

        os : {
            windows : {
                version : {
                    'ME'        : '4.90',
                    'NT 3.11'   : 'NT3.51',
                    'NT 4.0'    : 'NT4.0',
                    '2000'      : 'NT 5.0',
                    'XP'        : ['NT 5.1', 'NT 5.2'],
                    'Vista'     : 'NT 6.0',
                    '7'         : 'NT 6.1',
                    '8'         : 'NT 6.2',
                    '8.1'       : 'NT 6.3',
                    '10'        : ['NT 6.4', 'NT 10.0'],
                    'RT'        : 'ARM'
                }
            }
        }
    };


    //////////////
    // Regex map
    /////////////


    var regexes = {

        browser : [[

            // Presto based
            /(opera\smini)\/([\w\.-]+)/i,                                       // Opera Mini
            /(opera\s[mobiletab]+).+version\/([\w\.-]+)/i,                      // Opera Mobi/Tablet
            /(opera).+version\/([\w\.]+)/i,                                     // Opera > 9.80
            /(opera)[\/\s]+([\w\.]+)/i                                          // Opera < 9.80
            ], [NAME, VERSION], [

            /(opios)[\/\s]+([\w\.]+)/i                                          // Opera mini on iphone >= 8.0
            ], [[NAME, 'Opera Mini'], VERSION], [

            /\s(opr)\/([\w\.]+)/i                                               // Opera Webkit
            ], [[NAME, 'Opera'], VERSION], [

            // Mixed
            /(kindle)\/([\w\.]+)/i,                                             // Kindle
            /(lunascape|maxthon|netfront|jasmine|blazer)[\/\s]?([\w\.]+)*/i,
                                                                                // Lunascape/Maxthon/Netfront/Jasmine/Blazer

            // Trident based
            /(avant\s|iemobile|slim|baidu)(?:browser)?[\/\s]?([\w\.]*)/i,
                                                                                // Avant/IEMobile/SlimBrowser/Baidu
            /(?:ms|\()(ie)\s([\w\.]+)/i,                                        // Internet Explorer

            // Webkit/KHTML based
            /(rekonq)\/([\w\.]+)*/i,                                            // Rekonq
            /(chromium|flock|rockmelt|midori|epiphany|silk|skyfire|ovibrowser|bolt|iron|vivaldi|iridium|phantomjs|bowser)\/([\w\.-]+)/i
                                                                                // Chromium/Flock/RockMelt/Midori/Epiphany/Silk/Skyfire/Bolt/Iron/Iridium/PhantomJS/Bowser
            ], [NAME, VERSION], [

            /(trident).+rv[:\s]([\w\.]+).+like\sgecko/i                         // IE11
            ], [[NAME, 'IE'], VERSION], [

            /(edge)\/((\d+)?[\w\.]+)/i                                          // Microsoft Edge
            ], [NAME, VERSION], [

            /(yabrowser)\/([\w\.]+)/i                                           // Yandex
            ], [[NAME, 'Yandex'], VERSION], [

            /(puffin)\/([\w\.]+)/i                                              // Puffin
            ], [[NAME, 'Puffin'], VERSION], [

            /((?:[\s\/])uc?\s?browser|(?:juc.+)ucweb)[\/\s]?([\w\.]+)/i
                                                                                // UCBrowser
            ], [[NAME, 'UCBrowser'], VERSION], [

            /(comodo_dragon)\/([\w\.]+)/i                                       // Comodo Dragon
            ], [[NAME, /_/g, ' '], VERSION], [

            /(micromessenger)\/([\w\.]+)/i                                      // WeChat
            ], [[NAME, 'WeChat'], VERSION], [

            /(QQ)\/([\d\.]+)/i                                                  // QQ, aka ShouQ
            ], [NAME, VERSION], [

            /m?(qqbrowser)[\/\s]?([\w\.]+)/i                                    // QQBrowser
            ], [NAME, VERSION], [

            /xiaomi\/miuibrowser\/([\w\.]+)/i                                   // MIUI Browser
            ], [VERSION, [NAME, 'MIUI Browser']], [

            /;fbav\/([\w\.]+);/i                                                // Facebook App for iOS & Android
            ], [VERSION, [NAME, 'Facebook']], [

            /headlesschrome(?:\/([\w\.]+)|\s)/i                                 // Chrome Headless
            ], [VERSION, [NAME, 'Chrome Headless']], [

            /\swv\).+(chrome)\/([\w\.]+)/i                                      // Chrome WebView
            ], [[NAME, /(.+)/, '$1 WebView'], VERSION], [

            /((?:oculus|samsung)browser)\/([\w\.]+)/i
            ], [[NAME, /(.+(?:g|us))(.+)/, '$1 $2'], VERSION], [                // Oculus / Samsung Browser

            /android.+version\/([\w\.]+)\s+(?:mobile\s?safari|safari)*/i        // Android Browser
            ], [VERSION, [NAME, 'Android Browser']], [

            /(chrome|omniweb|arora|[tizenoka]{5}\s?browser)\/v?([\w\.]+)/i
                                                                                // Chrome/OmniWeb/Arora/Tizen/Nokia
            ], [NAME, VERSION], [

            /(dolfin)\/([\w\.]+)/i                                              // Dolphin
            ], [[NAME, 'Dolphin'], VERSION], [

            /((?:android.+)crmo|crios)\/([\w\.]+)/i                             // Chrome for Android/iOS
            ], [[NAME, 'Chrome'], VERSION], [

            /(coast)\/([\w\.]+)/i                                               // Opera Coast
            ], [[NAME, 'Opera Coast'], VERSION], [

            /fxios\/([\w\.-]+)/i                                                // Firefox for iOS
            ], [VERSION, [NAME, 'Firefox']], [

            /version\/([\w\.]+).+?mobile\/\w+\s(safari)/i                       // Mobile Safari
            ], [VERSION, [NAME, 'Mobile Safari']], [

            /version\/([\w\.]+).+?(mobile\s?safari|safari)/i                    // Safari & Safari Mobile
            ], [VERSION, NAME], [

            /webkit.+?(gsa)\/([\w\.]+).+?(mobile\s?safari|safari)(\/[\w\.]+)/i  // Google Search Appliance on iOS
            ], [[NAME, 'GSA'], VERSION], [

            /webkit.+?(mobile\s?safari|safari)(\/[\w\.]+)/i                     // Safari < 3.0
            ], [NAME, [VERSION, mapper.str, maps.browser.oldsafari.version]], [

            /(konqueror)\/([\w\.]+)/i,                                          // Konqueror
            /(webkit|khtml)\/([\w\.]+)/i
            ], [NAME, VERSION], [

            // Gecko based
            /(navigator|netscape)\/([\w\.-]+)/i                                 // Netscape
            ], [[NAME, 'Netscape'], VERSION], [
            /(swiftfox)/i,                                                      // Swiftfox
            /(icedragon|iceweasel|camino|chimera|fennec|maemo\sbrowser|minimo|conkeror)[\/\s]?([\w\.\+]+)/i,
                                                                                // IceDragon/Iceweasel/Camino/Chimera/Fennec/Maemo/Minimo/Conkeror
            /(firefox|seamonkey|k-meleon|icecat|iceape|firebird|phoenix)\/([\w\.-]+)/i,
                                                                                // Firefox/SeaMonkey/K-Meleon/IceCat/IceApe/Firebird/Phoenix
            /(mozilla)\/([\w\.]+).+rv\:.+gecko\/\d+/i,                          // Mozilla

            // Other
            /(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|sleipnir)[\/\s]?([\w\.]+)/i,
                                                                                // Polaris/Lynx/Dillo/iCab/Doris/Amaya/w3m/NetSurf/Sleipnir
            /(links)\s\(([\w\.]+)/i,                                            // Links
            /(gobrowser)\/?([\w\.]+)*/i,                                        // GoBrowser
            /(ice\s?browser)\/v?([\w\._]+)/i,                                   // ICE Browser
            /(mosaic)[\/\s]([\w\.]+)/i                                          // Mosaic
            ], [NAME, VERSION]

            /* /////////////////////
            // Media players BEGIN
            ////////////////////////

            , [

            /(apple(?:coremedia|))\/((\d+)[\w\._]+)/i,                          // Generic Apple CoreMedia
            /(coremedia) v((\d+)[\w\._]+)/i
            ], [NAME, VERSION], [

            /(aqualung|lyssna|bsplayer)\/((\d+)?[\w\.-]+)/i                     // Aqualung/Lyssna/BSPlayer
            ], [NAME, VERSION], [

            /(ares|ossproxy)\s((\d+)[\w\.-]+)/i                                 // Ares/OSSProxy
            ], [NAME, VERSION], [

            /(audacious|audimusicstream|amarok|bass|core|dalvik|gnomemplayer|music on console|nsplayer|psp-internetradioplayer|videos)\/((\d+)[\w\.-]+)/i,
                                                                                // Audacious/AudiMusicStream/Amarok/BASS/OpenCORE/Dalvik/GnomeMplayer/MoC
                                                                                // NSPlayer/PSP-InternetRadioPlayer/Videos
            /(clementine|music player daemon)\s((\d+)[\w\.-]+)/i,               // Clementine/MPD
            /(lg player|nexplayer)\s((\d+)[\d\.]+)/i,
            /player\/(nexplayer|lg player)\s((\d+)[\w\.-]+)/i                   // NexPlayer/LG Player
            ], [NAME, VERSION], [
            /(nexplayer)\s((\d+)[\w\.-]+)/i                                     // Nexplayer
            ], [NAME, VERSION], [

            /(flrp)\/((\d+)[\w\.-]+)/i                                          // Flip Player
            ], [[NAME, 'Flip Player'], VERSION], [

            /(fstream|nativehost|queryseekspider|ia-archiver|facebookexternalhit)/i
                                                                                // FStream/NativeHost/QuerySeekSpider/IA Archiver/facebookexternalhit
            ], [NAME], [

            /(gstreamer) souphttpsrc (?:\([^\)]+\)){0,1} libsoup\/((\d+)[\w\.-]+)/i
                                                                                // Gstreamer
            ], [NAME, VERSION], [

            /(htc streaming player)\s[\w_]+\s\/\s((\d+)[\d\.]+)/i,              // HTC Streaming Player
            /(java|python-urllib|python-requests|wget|libcurl)\/((\d+)[\w\.-_]+)/i,
                                                                                // Java/urllib/requests/wget/cURL
            /(lavf)((\d+)[\d\.]+)/i                                             // Lavf (FFMPEG)
            ], [NAME, VERSION], [

            /(htc_one_s)\/((\d+)[\d\.]+)/i                                      // HTC One S
            ], [[NAME, /_/g, ' '], VERSION], [

            /(mplayer)(?:\s|\/)(?:(?:sherpya-){0,1}svn)(?:-|\s)(r\d+(?:-\d+[\w\.-]+){0,1})/i
                                                                                // MPlayer SVN
            ], [NAME, VERSION], [

            /(mplayer)(?:\s|\/|[unkow-]+)((\d+)[\w\.-]+)/i                      // MPlayer
            ], [NAME, VERSION], [

            /(mplayer)/i,                                                       // MPlayer (no other info)
            /(yourmuze)/i,                                                      // YourMuze
            /(media player classic|nero showtime)/i                             // Media Player Classic/Nero ShowTime
            ], [NAME], [

            /(nero (?:home|scout))\/((\d+)[\w\.-]+)/i                           // Nero Home/Nero Scout
            ], [NAME, VERSION], [

            /(nokia\d+)\/((\d+)[\w\.-]+)/i                                      // Nokia
            ], [NAME, VERSION], [

            /\s(songbird)\/((\d+)[\w\.-]+)/i                                    // Songbird/Philips-Songbird
            ], [NAME, VERSION], [

            /(winamp)3 version ((\d+)[\w\.-]+)/i,                               // Winamp
            /(winamp)\s((\d+)[\w\.-]+)/i,
            /(winamp)mpeg\/((\d+)[\w\.-]+)/i
            ], [NAME, VERSION], [

            /(ocms-bot|tapinradio|tunein radio|unknown|winamp|inlight radio)/i  // OCMS-bot/tap in radio/tunein/unknown/winamp (no other info)
                                                                                // inlight radio
            ], [NAME], [

            /(quicktime|rma|radioapp|radioclientapplication|soundtap|totem|stagefright|streamium)\/((\d+)[\w\.-]+)/i
                                                                                // QuickTime/RealMedia/RadioApp/RadioClientApplication/
                                                                                // SoundTap/Totem/Stagefright/Streamium
            ], [NAME, VERSION], [

            /(smp)((\d+)[\d\.]+)/i                                              // SMP
            ], [NAME, VERSION], [

            /(vlc) media player - version ((\d+)[\w\.]+)/i,                     // VLC Videolan
            /(vlc)\/((\d+)[\w\.-]+)/i,
            /(xbmc|gvfs|xine|xmms|irapp)\/((\d+)[\w\.-]+)/i,                    // XBMC/gvfs/Xine/XMMS/irapp
            /(foobar2000)\/((\d+)[\d\.]+)/i,                                    // Foobar2000
            /(itunes)\/((\d+)[\d\.]+)/i                                         // iTunes
            ], [NAME, VERSION], [

            /(wmplayer)\/((\d+)[\w\.-]+)/i,                                     // Windows Media Player
            /(windows-media-player)\/((\d+)[\w\.-]+)/i
            ], [[NAME, /-/g, ' '], VERSION], [

            /windows\/((\d+)[\w\.-]+) upnp\/[\d\.]+ dlnadoc\/[\d\.]+ (home media server)/i
                                                                                // Windows Media Server
            ], [VERSION, [NAME, 'Windows']], [

            /(com\.riseupradioalarm)\/((\d+)[\d\.]*)/i                          // RiseUP Radio Alarm
            ], [NAME, VERSION], [

            /(rad.io)\s((\d+)[\d\.]+)/i,                                        // Rad.io
            /(radio.(?:de|at|fr))\s((\d+)[\d\.]+)/i
            ], [[NAME, 'rad.io'], VERSION]

            //////////////////////
            // Media players END
            ////////////////////*/

        ],

        cpu : [[

            /(?:(amd|x(?:(?:86|64)[_-])?|wow|win)64)[;\)]/i                     // AMD64
            ], [[ARCHITECTURE, 'amd64']], [

            /(ia32(?=;))/i                                                      // IA32 (quicktime)
            ], [[ARCHITECTURE, util.lowerize]], [

            /((?:i[346]|x)86)[;\)]/i                                            // IA32
            ], [[ARCHITECTURE, 'ia32']], [

            // PocketPC mistakenly identified as PowerPC
            /windows\s(ce|mobile);\sppc;/i
            ], [[ARCHITECTURE, 'arm']], [

            /((?:ppc|powerpc)(?:64)?)(?:\smac|;|\))/i                           // PowerPC
            ], [[ARCHITECTURE, /ower/, '', util.lowerize]], [

            /(sun4\w)[;\)]/i                                                    // SPARC
            ], [[ARCHITECTURE, 'sparc']], [

            /((?:avr32|ia64(?=;))|68k(?=\))|arm(?:64|(?=v\d+;))|(?=atmel\s)avr|(?:irix|mips|sparc)(?:64)?(?=;)|pa-risc)/i
                                                                                // IA64, 68K, ARM/64, AVR/32, IRIX/64, MIPS/64, SPARC/64, PA-RISC
            ], [[ARCHITECTURE, util.lowerize]]
        ],

        device : [[

            /\((ipad|playbook);[\w\s\);-]+(rim|apple)/i                         // iPad/PlayBook
            ], [MODEL, VENDOR, [TYPE, TABLET]], [

            /applecoremedia\/[\w\.]+ \((ipad)/                                  // iPad
            ], [MODEL, [VENDOR, 'Apple'], [TYPE, TABLET]], [

            /(apple\s{0,1}tv)/i                                                 // Apple TV
            ], [[MODEL, 'Apple TV'], [VENDOR, 'Apple']], [

            /(archos)\s(gamepad2?)/i,                                           // Archos
            /(hp).+(touchpad)/i,                                                // HP TouchPad
            /(hp).+(tablet)/i,                                                  // HP Tablet
            /(kindle)\/([\w\.]+)/i,                                             // Kindle
            /\s(nook)[\w\s]+build\/(\w+)/i,                                     // Nook
            /(dell)\s(strea[kpr\s\d]*[\dko])/i                                  // Dell Streak
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /(kf[A-z]+)\sbuild\/[\w\.]+.*silk\//i                               // Kindle Fire HD
            ], [MODEL, [VENDOR, 'Amazon'], [TYPE, TABLET]], [
            /(sd|kf)[0349hijorstuw]+\sbuild\/[\w\.]+.*silk\//i                  // Fire Phone
            ], [[MODEL, mapper.str, maps.device.amazon.model], [VENDOR, 'Amazon'], [TYPE, MOBILE]], [

            /\((ip[honed|\s\w*]+);.+(apple)/i                                   // iPod/iPhone
            ], [MODEL, VENDOR, [TYPE, MOBILE]], [
            /\((ip[honed|\s\w*]+);/i                                            // iPod/iPhone
            ], [MODEL, [VENDOR, 'Apple'], [TYPE, MOBILE]], [

            /(blackberry)[\s-]?(\w+)/i,                                         // BlackBerry
            /(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|meizu|motorola|polytron)[\s_-]?([\w-]+)*/i,
                                                                                // BenQ/Palm/Sony-Ericsson/Acer/Asus/Dell/Meizu/Motorola/Polytron
            /(hp)\s([\w\s]+\w)/i,                                               // HP iPAQ
            /(asus)-?(\w+)/i                                                    // Asus
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [
            /\(bb10;\s(\w+)/i                                                   // BlackBerry 10
            ], [MODEL, [VENDOR, 'BlackBerry'], [TYPE, MOBILE]], [
                                                                                // Asus Tablets
            /android.+(transfo[prime\s]{4,10}\s\w+|eeepc|slider\s\w+|nexus 7|padfone)/i
            ], [MODEL, [VENDOR, 'Asus'], [TYPE, TABLET]], [

            /(sony)\s(tablet\s[ps])\sbuild\//i,                                  // Sony
            /(sony)?(?:sgp.+)\sbuild\//i
            ], [[VENDOR, 'Sony'], [MODEL, 'Xperia Tablet'], [TYPE, TABLET]], [
            /android.+\s([c-g]\d{4}|so[-l]\w+)\sbuild\//i
            ], [MODEL, [VENDOR, 'Sony'], [TYPE, MOBILE]], [

            /\s(ouya)\s/i,                                                      // Ouya
            /(nintendo)\s([wids3u]+)/i                                          // Nintendo
            ], [VENDOR, MODEL, [TYPE, CONSOLE]], [

            /android.+;\s(shield)\sbuild/i                                      // Nvidia
            ], [MODEL, [VENDOR, 'Nvidia'], [TYPE, CONSOLE]], [

            /(playstation\s[34portablevi]+)/i                                   // Playstation
            ], [MODEL, [VENDOR, 'Sony'], [TYPE, CONSOLE]], [

            /(sprint\s(\w+))/i                                                  // Sprint Phones
            ], [[VENDOR, mapper.str, maps.device.sprint.vendor], [MODEL, mapper.str, maps.device.sprint.model], [TYPE, MOBILE]], [

            /(lenovo)\s?(S(?:5000|6000)+(?:[-][\w+]))/i                         // Lenovo tablets
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /(htc)[;_\s-]+([\w\s]+(?=\))|\w+)*/i,                               // HTC
            /(zte)-(\w+)*/i,                                                    // ZTE
            /(alcatel|geeksphone|lenovo|nexian|panasonic|(?=;\s)sony)[_\s-]?([\w-]+)*/i
                                                                                // Alcatel/GeeksPhone/Lenovo/Nexian/Panasonic/Sony
            ], [VENDOR, [MODEL, /_/g, ' '], [TYPE, MOBILE]], [

            /(nexus\s9)/i                                                       // HTC Nexus 9
            ], [MODEL, [VENDOR, 'HTC'], [TYPE, TABLET]], [

            /d\/huawei([\w\s-]+)[;\)]/i,
            /(nexus\s6p)/i                                                      // Huawei
            ], [MODEL, [VENDOR, 'Huawei'], [TYPE, MOBILE]], [

            /(microsoft);\s(lumia[\s\w]+)/i                                     // Microsoft Lumia
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [

            /[\s\(;](xbox(?:\sone)?)[\s\);]/i                                   // Microsoft Xbox
            ], [MODEL, [VENDOR, 'Microsoft'], [TYPE, CONSOLE]], [
            /(kin\.[onetw]{3})/i                                                // Microsoft Kin
            ], [[MODEL, /\./g, ' '], [VENDOR, 'Microsoft'], [TYPE, MOBILE]], [

                                                                                // Motorola
            /\s(milestone|droid(?:[2-4x]|\s(?:bionic|x2|pro|razr))?(:?\s4g)?)[\w\s]+build\//i,
            /mot[\s-]?(\w+)*/i,
            /(XT\d{3,4}) build\//i,
            /(nexus\s6)/i
            ], [MODEL, [VENDOR, 'Motorola'], [TYPE, MOBILE]], [
            /android.+\s(mz60\d|xoom[\s2]{0,2})\sbuild\//i
            ], [MODEL, [VENDOR, 'Motorola'], [TYPE, TABLET]], [

            /hbbtv\/\d+\.\d+\.\d+\s+\([\w\s]*;\s*(\w[^;]*);([^;]*)/i            // HbbTV devices
            ], [[VENDOR, util.trim], [MODEL, util.trim], [TYPE, SMARTTV]], [

            /hbbtv.+maple;(\d+)/i
            ], [[MODEL, /^/, 'SmartTV'], [VENDOR, 'Samsung'], [TYPE, SMARTTV]], [

            /\(dtv[\);].+(aquos)/i                                              // Sharp
            ], [MODEL, [VENDOR, 'Sharp'], [TYPE, SMARTTV]], [

            /android.+((sch-i[89]0\d|shw-m380s|gt-p\d{4}|gt-n\d+|sgh-t8[56]9|nexus 10))/i,
            /((SM-T\w+))/i
            ], [[VENDOR, 'Samsung'], MODEL, [TYPE, TABLET]], [                  // Samsung
            /smart-tv.+(samsung)/i
            ], [VENDOR, [TYPE, SMARTTV], MODEL], [
            /((s[cgp]h-\w+|gt-\w+|galaxy\snexus|sm-\w[\w\d]+))/i,
            /(sam[sung]*)[\s-]*(\w+-?[\w-]*)*/i,
            /sec-((sgh\w+))/i
            ], [[VENDOR, 'Samsung'], MODEL, [TYPE, MOBILE]], [

            /sie-(\w+)*/i                                                       // Siemens
            ], [MODEL, [VENDOR, 'Siemens'], [TYPE, MOBILE]], [

            /(maemo|nokia).*(n900|lumia\s\d+)/i,                                // Nokia
            /(nokia)[\s_-]?([\w-]+)*/i
            ], [[VENDOR, 'Nokia'], MODEL, [TYPE, MOBILE]], [

            /android\s3\.[\s\w;-]{10}(a\d{3})/i                                 // Acer
            ], [MODEL, [VENDOR, 'Acer'], [TYPE, TABLET]], [

            /android.+([vl]k\-?\d{3})\s+build/i                                 // LG Tablet
            ], [MODEL, [VENDOR, 'LG'], [TYPE, TABLET]], [
            /android\s3\.[\s\w;-]{10}(lg?)-([06cv9]{3,4})/i                     // LG Tablet
            ], [[VENDOR, 'LG'], MODEL, [TYPE, TABLET]], [
            /(lg) netcast\.tv/i                                                 // LG SmartTV
            ], [VENDOR, MODEL, [TYPE, SMARTTV]], [
            /(nexus\s[45])/i,                                                   // LG
            /lg[e;\s\/-]+(\w+)*/i,
            /android.+lg(\-?[\d\w]+)\s+build/i
            ], [MODEL, [VENDOR, 'LG'], [TYPE, MOBILE]], [

            /android.+(ideatab[a-z0-9\-\s]+)/i                                  // Lenovo
            ], [MODEL, [VENDOR, 'Lenovo'], [TYPE, TABLET]], [

            /linux;.+((jolla));/i                                               // Jolla
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [

            /((pebble))app\/[\d\.]+\s/i                                         // Pebble
            ], [VENDOR, MODEL, [TYPE, WEARABLE]], [

            /android.+;\s(oppo)\s?([\w\s]+)\sbuild/i                            // OPPO
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [

            /crkey/i                                                            // Google Chromecast
            ], [[MODEL, 'Chromecast'], [VENDOR, 'Google']], [

            /android.+;\s(glass)\s\d/i                                          // Google Glass
            ], [MODEL, [VENDOR, 'Google'], [TYPE, WEARABLE]], [

            /android.+;\s(pixel c)\s/i                                          // Google Pixel C
            ], [MODEL, [VENDOR, 'Google'], [TYPE, TABLET]], [

            /android.+;\s(pixel xl|pixel)\s/i                                   // Google Pixel
            ], [MODEL, [VENDOR, 'Google'], [TYPE, MOBILE]], [

            /android.+(\w+)\s+build\/hm\1/i,                                    // Xiaomi Hongmi 'numeric' models
            /android.+(hm[\s\-_]*note?[\s_]*(?:\d\w)?)\s+build/i,               // Xiaomi Hongmi
            /android.+(mi[\s\-_]*(?:one|one[\s_]plus|note lte)?[\s_]*(?:\d\w)?)\s+build/i,    // Xiaomi Mi
            /android.+(redmi[\s\-_]*(?:note)?(?:[\s_]*[\w\s]+)?)\s+build/i      // Redmi Phones
            ], [[MODEL, /_/g, ' '], [VENDOR, 'Xiaomi'], [TYPE, MOBILE]], [
            /android.+(mi[\s\-_]*(?:pad)?(?:[\s_]*[\w\s]+)?)\s+build/i          // Mi Pad tablets
            ],[[MODEL, /_/g, ' '], [VENDOR, 'Xiaomi'], [TYPE, TABLET]], [
            /android.+;\s(m[1-5]\snote)\sbuild/i                                // Meizu Tablet
            ], [MODEL, [VENDOR, 'Meizu'], [TYPE, TABLET]], [

            /android.+a000(1)\s+build/i                                         // OnePlus
            ], [MODEL, [VENDOR, 'OnePlus'], [TYPE, MOBILE]], [

            /android.+[;\/]\s*(RCT[\d\w]+)\s+build/i                            // RCA Tablets
            ], [MODEL, [VENDOR, 'RCA'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(Venue[\d\s]*)\s+build/i                          // Dell Venue Tablets
            ], [MODEL, [VENDOR, 'Dell'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(Q[T|M][\d\w]+)\s+build/i                         // Verizon Tablet
            ], [MODEL, [VENDOR, 'Verizon'], [TYPE, TABLET]], [

            /android.+[;\/]\s+(Barnes[&\s]+Noble\s+|BN[RT])(V?.*)\s+build/i     // Barnes & Noble Tablet
            ], [[VENDOR, 'Barnes & Noble'], MODEL, [TYPE, TABLET]], [

            /android.+[;\/]\s+(TM\d{3}.*\b)\s+build/i                           // Barnes & Noble Tablet
            ], [MODEL, [VENDOR, 'NuVision'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(zte)?.+(k\d{2})\s+build/i                        // ZTE K Series Tablet
            ], [[VENDOR, 'ZTE'], MODEL, [TYPE, TABLET]], [

            /android.+[;\/]\s*(gen\d{3})\s+build.*49h/i                         // Swiss GEN Mobile
            ], [MODEL, [VENDOR, 'Swiss'], [TYPE, MOBILE]], [

            /android.+[;\/]\s*(zur\d{3})\s+build/i                              // Swiss ZUR Tablet
            ], [MODEL, [VENDOR, 'Swiss'], [TYPE, TABLET]], [

            /android.+[;\/]\s*((Zeki)?TB.*\b)\s+build/i                         // Zeki Tablets
            ], [MODEL, [VENDOR, 'Zeki'], [TYPE, TABLET]], [

            /(android).+[;\/]\s+([YR]\d{2}x?.*)\s+build/i,
            /android.+[;\/]\s+(Dragon[\-\s]+Touch\s+|DT)(.+)\s+build/i          // Dragon Touch Tablet
            ], [[VENDOR, 'Dragon Touch'], MODEL, [TYPE, TABLET]], [

            /android.+[;\/]\s*(NS-?.+)\s+build/i                                // Insignia Tablets
            ], [MODEL, [VENDOR, 'Insignia'], [TYPE, TABLET]], [

            /android.+[;\/]\s*((NX|Next)-?.+)\s+build/i                         // NextBook Tablets
            ], [MODEL, [VENDOR, 'NextBook'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(Xtreme\_?)?(V(1[045]|2[015]|30|40|60|7[05]|90))\s+build/i
            ], [[VENDOR, 'Voice'], MODEL, [TYPE, MOBILE]], [                    // Voice Xtreme Phones

            /android.+[;\/]\s*(LVTEL\-?)?(V1[12])\s+build/i                     // LvTel Phones
            ], [[VENDOR, 'LvTel'], MODEL, [TYPE, MOBILE]], [

            /android.+[;\/]\s*(V(100MD|700NA|7011|917G).*\b)\s+build/i          // Envizen Tablets
            ], [MODEL, [VENDOR, 'Envizen'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(Le[\s\-]+Pan)[\s\-]+(.*\b)\s+build/i             // Le Pan Tablets
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /android.+[;\/]\s*(Trio[\s\-]*.*)\s+build/i                         // MachSpeed Tablets
            ], [MODEL, [VENDOR, 'MachSpeed'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(Trinity)[\-\s]*(T\d{3})\s+build/i                // Trinity Tablets
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /android.+[;\/]\s*TU_(1491)\s+build/i                               // Rotor Tablets
            ], [MODEL, [VENDOR, 'Rotor'], [TYPE, TABLET]], [

            /android.+(KS(.+))\s+build/i                                        // Amazon Kindle Tablets
            ], [MODEL, [VENDOR, 'Amazon'], [TYPE, TABLET]], [

            /android.+(Gigaset)[\s\-]+(Q.+)\s+build/i                           // Gigaset Tablets
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /\s(tablet|tab)[;\/]/i,                                             // Unidentifiable Tablet
            /\s(mobile)(?:[;\/]|\ssafari)/i                                     // Unidentifiable Mobile
            ], [[TYPE, util.lowerize], VENDOR, MODEL], [

            /(android.+)[;\/].+build/i                                          // Generic Android Device
            ], [MODEL, [VENDOR, 'Generic']]


        /*//////////////////////////
            // TODO: move to string map
            ////////////////////////////

            /(C6603)/i                                                          // Sony Xperia Z C6603
            ], [[MODEL, 'Xperia Z C6603'], [VENDOR, 'Sony'], [TYPE, MOBILE]], [
            /(C6903)/i                                                          // Sony Xperia Z 1
            ], [[MODEL, 'Xperia Z 1'], [VENDOR, 'Sony'], [TYPE, MOBILE]], [

            /(SM-G900[F|H])/i                                                   // Samsung Galaxy S5
            ], [[MODEL, 'Galaxy S5'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-G7102)/i                                                       // Samsung Galaxy Grand 2
            ], [[MODEL, 'Galaxy Grand 2'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-G530H)/i                                                       // Samsung Galaxy Grand Prime
            ], [[MODEL, 'Galaxy Grand Prime'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-G313HZ)/i                                                      // Samsung Galaxy V
            ], [[MODEL, 'Galaxy V'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-T805)/i                                                        // Samsung Galaxy Tab S 10.5
            ], [[MODEL, 'Galaxy Tab S 10.5'], [VENDOR, 'Samsung'], [TYPE, TABLET]], [
            /(SM-G800F)/i                                                       // Samsung Galaxy S5 Mini
            ], [[MODEL, 'Galaxy S5 Mini'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-T311)/i                                                        // Samsung Galaxy Tab 3 8.0
            ], [[MODEL, 'Galaxy Tab 3 8.0'], [VENDOR, 'Samsung'], [TYPE, TABLET]], [

            /(T3C)/i                                                            // Advan Vandroid T3C
            ], [MODEL, [VENDOR, 'Advan'], [TYPE, TABLET]], [
            /(ADVAN T1J\+)/i                                                    // Advan Vandroid T1J+
            ], [[MODEL, 'Vandroid T1J+'], [VENDOR, 'Advan'], [TYPE, TABLET]], [
            /(ADVAN S4A)/i                                                      // Advan Vandroid S4A
            ], [[MODEL, 'Vandroid S4A'], [VENDOR, 'Advan'], [TYPE, MOBILE]], [

            /(V972M)/i                                                          // ZTE V972M
            ], [MODEL, [VENDOR, 'ZTE'], [TYPE, MOBILE]], [

            /(i-mobile)\s(IQ\s[\d\.]+)/i                                        // i-mobile IQ
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [
            /(IQ6.3)/i                                                          // i-mobile IQ IQ 6.3
            ], [[MODEL, 'IQ 6.3'], [VENDOR, 'i-mobile'], [TYPE, MOBILE]], [
            /(i-mobile)\s(i-style\s[\d\.]+)/i                                   // i-mobile i-STYLE
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [
            /(i-STYLE2.1)/i                                                     // i-mobile i-STYLE 2.1
            ], [[MODEL, 'i-STYLE 2.1'], [VENDOR, 'i-mobile'], [TYPE, MOBILE]], [

            /(mobiistar touch LAI 512)/i                                        // mobiistar touch LAI 512
            ], [[MODEL, 'Touch LAI 512'], [VENDOR, 'mobiistar'], [TYPE, MOBILE]], [

            /////////////
            // END TODO
            ///////////*/

        ],

        engine : [[

            /windows.+\sedge\/([\w\.]+)/i                                       // EdgeHTML
            ], [VERSION, [NAME, 'EdgeHTML']], [

            /(presto)\/([\w\.]+)/i,                                             // Presto
            /(webkit|trident|netfront|netsurf|amaya|lynx|w3m)\/([\w\.]+)/i,     // WebKit/Trident/NetFront/NetSurf/Amaya/Lynx/w3m
            /(khtml|tasman|links)[\/\s]\(?([\w\.]+)/i,                          // KHTML/Tasman/Links
            /(icab)[\/\s]([23]\.[\d\.]+)/i                                      // iCab
            ], [NAME, VERSION], [

            /rv\:([\w\.]+).*(gecko)/i                                           // Gecko
            ], [VERSION, NAME]
        ],

        os : [[

            // Windows based
            /microsoft\s(windows)\s(vista|xp)/i                                 // Windows (iTunes)
            ], [NAME, VERSION], [
            /(windows)\snt\s6\.2;\s(arm)/i,                                     // Windows RT
            /(windows\sphone(?:\sos)*)[\s\/]?([\d\.\s]+\w)*/i,                  // Windows Phone
            /(windows\smobile|windows)[\s\/]?([ntce\d\.\s]+\w)/i
            ], [NAME, [VERSION, mapper.str, maps.os.windows.version]], [
            /(win(?=3|9|n)|win\s9x\s)([nt\d\.]+)/i
            ], [[NAME, 'Windows'], [VERSION, mapper.str, maps.os.windows.version]], [

            // Mobile/Embedded OS
            /\((bb)(10);/i                                                      // BlackBerry 10
            ], [[NAME, 'BlackBerry'], VERSION], [
            /(blackberry)\w*\/?([\w\.]+)*/i,                                    // Blackberry
            /(tizen)[\/\s]([\w\.]+)/i,                                          // Tizen
            /(android|webos|palm\sos|qnx|bada|rim\stablet\sos|meego|contiki)[\/\s-]?([\w\.]+)*/i,
                                                                                // Android/WebOS/Palm/QNX/Bada/RIM/MeeGo/Contiki
            /linux;.+(sailfish);/i                                              // Sailfish OS
            ], [NAME, VERSION], [
            /(symbian\s?os|symbos|s60(?=;))[\/\s-]?([\w\.]+)*/i                 // Symbian
            ], [[NAME, 'Symbian'], VERSION], [
            /\((series40);/i                                                    // Series 40
            ], [NAME], [
            /mozilla.+\(mobile;.+gecko.+firefox/i                               // Firefox OS
            ], [[NAME, 'Firefox OS'], VERSION], [

            // Console
            /(nintendo|playstation)\s([wids34portablevu]+)/i,                   // Nintendo/Playstation

            // GNU/Linux based
            /(mint)[\/\s\(]?(\w+)*/i,                                           // Mint
            /(mageia|vectorlinux)[;\s]/i,                                       // Mageia/VectorLinux
            /(joli|[kxln]?ubuntu|debian|[open]*suse|gentoo|(?=\s)arch|slackware|fedora|mandriva|centos|pclinuxos|redhat|zenwalk|linpus)[\/\s-]?(?!chrom)([\w\.-]+)*/i,
                                                                                // Joli/Ubuntu/Debian/SUSE/Gentoo/Arch/Slackware
                                                                                // Fedora/Mandriva/CentOS/PCLinuxOS/RedHat/Zenwalk/Linpus
            /(hurd|linux)\s?([\w\.]+)*/i,                                       // Hurd/Linux
            /(gnu)\s?([\w\.]+)*/i                                               // GNU
            ], [NAME, VERSION], [

            /(cros)\s[\w]+\s([\w\.]+\w)/i                                       // Chromium OS
            ], [[NAME, 'Chromium OS'], VERSION],[

            // Solaris
            /(sunos)\s?([\w\.]+\d)*/i                                           // Solaris
            ], [[NAME, 'Solaris'], VERSION], [

            // BSD based
            /\s([frentopc-]{0,4}bsd|dragonfly)\s?([\w\.]+)*/i                   // FreeBSD/NetBSD/OpenBSD/PC-BSD/DragonFly
            ], [NAME, VERSION],[

            /(haiku)\s(\w+)/i                                                  // Haiku
            ], [NAME, VERSION],[

            /cfnetwork\/.+darwin/i,
            /ip[honead]+(?:.*os\s([\w]+)\slike\smac|;\sopera)/i                 // iOS
            ], [[VERSION, /_/g, '.'], [NAME, 'iOS']], [

            /(mac\sos\sx)\s?([\w\s\.]+\w)*/i,
            /(macintosh|mac(?=_powerpc)\s)/i                                    // Mac OS
            ], [[NAME, 'Mac OS'], [VERSION, /_/g, '.']], [

            // Other
            /((?:open)?solaris)[\/\s-]?([\w\.]+)*/i,                            // Solaris
            /(aix)\s((\d)(?=\.|\)|\s)[\w\.]*)*/i,                               // AIX
            /(plan\s9|minix|beos|os\/2|amigaos|morphos|risc\sos|openvms)/i,
                                                                                // Plan9/Minix/BeOS/OS2/AmigaOS/MorphOS/RISCOS/OpenVMS
            /(unix)\s?([\w\.]+)*/i                                              // UNIX
            ], [NAME, VERSION]
        ]
    };


    /////////////////
    // Constructor
    ////////////////
    /*
    var Browser = function (name, version) {
        this[NAME] = name;
        this[VERSION] = version;
    };
    var CPU = function (arch) {
        this[ARCHITECTURE] = arch;
    };
    var Device = function (vendor, model, type) {
        this[VENDOR] = vendor;
        this[MODEL] = model;
        this[TYPE] = type;
    };
    var Engine = Browser;
    var OS = Browser;
    */
    var UAParser = function (uastring, extensions) {

        if (typeof uastring === 'object') {
            extensions = uastring;
            uastring = undefined;
        }

        if (!(this instanceof UAParser)) {
            return new UAParser(uastring, extensions).getResult();
        }

        var ua = uastring || ((window && window.navigator && window.navigator.userAgent) ? window.navigator.userAgent : EMPTY);
        var rgxmap = extensions ? util.extend(regexes, extensions) : regexes;
        //var browser = new Browser();
        //var cpu = new CPU();
        //var device = new Device();
        //var engine = new Engine();
        //var os = new OS();

        this.getBrowser = function () {
            var browser = { name: undefined, version: undefined };
            mapper.rgx.call(browser, ua, rgxmap.browser);
            browser.major = util.major(browser.version); // deprecated
            return browser;
        };
        this.getCPU = function () {
            var cpu = { architecture: undefined };
            mapper.rgx.call(cpu, ua, rgxmap.cpu);
            return cpu;
        };
        this.getDevice = function () {
            var device = { vendor: undefined, model: undefined, type: undefined };
            mapper.rgx.call(device, ua, rgxmap.device);
            return device;
        };
        this.getEngine = function () {
            var engine = { name: undefined, version: undefined };
            mapper.rgx.call(engine, ua, rgxmap.engine);
            return engine;
        };
        this.getOS = function () {
            var os = { name: undefined, version: undefined };
            mapper.rgx.call(os, ua, rgxmap.os);
            return os;
        };
        this.getResult = function () {
            return {
                ua      : this.getUA(),
                browser : this.getBrowser(),
                engine  : this.getEngine(),
                os      : this.getOS(),
                device  : this.getDevice(),
                cpu     : this.getCPU()
            };
        };
        this.getUA = function () {
            return ua;
        };
        this.setUA = function (uastring) {
            ua = uastring;
            //browser = new Browser();
            //cpu = new CPU();
            //device = new Device();
            //engine = new Engine();
            //os = new OS();
            return this;
        };
        return this;
    };

    UAParser.VERSION = LIBVERSION;
    UAParser.BROWSER = {
        NAME    : NAME,
        MAJOR   : MAJOR, // deprecated
        VERSION : VERSION
    };
    UAParser.CPU = {
        ARCHITECTURE : ARCHITECTURE
    };
    UAParser.DEVICE = {
        MODEL   : MODEL,
        VENDOR  : VENDOR,
        TYPE    : TYPE,
        CONSOLE : CONSOLE,
        MOBILE  : MOBILE,
        SMARTTV : SMARTTV,
        TABLET  : TABLET,
        WEARABLE: WEARABLE,
        EMBEDDED: EMBEDDED
    };
    UAParser.ENGINE = {
        NAME    : NAME,
        VERSION : VERSION
    };
    UAParser.OS = {
        NAME    : NAME,
        VERSION : VERSION
    };
    //UAParser.Utils = util;

    ///////////
    // Export
    //////////


    // check js environment
    if (typeof(exports) !== UNDEF_TYPE) {
        // nodejs env
        if (typeof module !== UNDEF_TYPE && module.exports) {
            exports = module.exports = UAParser;
        }
        // TODO: test!!!!!!!!
        /*
        if (require && require.main === module && process) {
            // cli
            var jsonize = function (arr) {
                var res = [];
                for (var i in arr) {
                    res.push(new UAParser(arr[i]).getResult());
                }
                process.stdout.write(JSON.stringify(res, null, 2) + '\n');
            };
            if (process.stdin.isTTY) {
                // via args
                jsonize(process.argv.slice(2));
            } else {
                // via pipe
                var str = '';
                process.stdin.on('readable', function() {
                    var read = process.stdin.read();
                    if (read !== null) {
                        str += read;
                    }
                });
                process.stdin.on('end', function () {
                    jsonize(str.replace(/\n$/, '').split('\n'));
                });
            }
        }
        */
        exports.UAParser = UAParser;
    } else {
        // requirejs env (optional)
        if ("function" === FUNC_TYPE && __webpack_require__("./node_modules/webpack/buildin/amd-options.js")) {
            !(__WEBPACK_AMD_DEFINE_RESULT__ = (function () {
                return UAParser;
            }).call(exports, __webpack_require__, exports, module),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
        } else if (window) {
            // browser env
            window.UAParser = UAParser;
        }
    }

    // jQuery/Zepto specific (optional)
    // Note:
    //   In AMD env the global scope should be kept clean, but jQuery is an exception.
    //   jQuery always exports to global scope, unless jQuery.noConflict(true) is used,
    //   and we should catch that.
    var $ = window && (window.jQuery || window.Zepto);
    if (typeof $ !== UNDEF_TYPE) {
        var parser = new UAParser();
        $.ua = parser.getResult();
        $.ua.get = function () {
            return parser.getUA();
        };
        $.ua.set = function (uastring) {
            parser.setUA(uastring);
            var result = parser.getResult();
            for (var prop in result) {
                $.ua[prop] = result[prop];
            }
        };
    }

})(typeof window === 'object' ? window : this);


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/uuid/index.js":
/***/ (function(module, exports, __webpack_require__) {

var v1 = __webpack_require__("../../../../openvidu-browser/node_modules/uuid/v1.js");
var v4 = __webpack_require__("../../../../openvidu-browser/node_modules/uuid/v4.js");

var uuid = v4;
uuid.v1 = v1;
uuid.v4 = v4;

module.exports = uuid;


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/uuid/lib/bytesToUuid.js":
/***/ (function(module, exports) {

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  return bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

module.exports = bytesToUuid;


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/uuid/lib/rng-browser.js":
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {// Unique ID creation requires a high quality random # generator.  In the
// browser this is a little complicated due to unknown quality of Math.random()
// and inconsistent support for the `crypto` API.  We do the best we can via
// feature-detection
var rng;

var crypto = global.crypto || global.msCrypto; // for IE 11
if (crypto && crypto.getRandomValues) {
  // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
  var rnds8 = new Uint8Array(16); // eslint-disable-line no-undef
  rng = function whatwgRNG() {
    crypto.getRandomValues(rnds8);
    return rnds8;
  };
}

if (!rng) {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var rnds = new Array(16);
  rng = function() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return rnds;
  };
}

module.exports = rng;

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__("./node_modules/webpack/buildin/global.js")))

/***/ }),

/***/ "../../../../openvidu-browser/node_modules/uuid/v1.js":
/***/ (function(module, exports, __webpack_require__) {

var rng = __webpack_require__("../../../../openvidu-browser/node_modules/uuid/lib/rng-browser.js");
var bytesToUuid = __webpack_require__("../../../../openvidu-browser/node_modules/uuid/lib/bytesToUuid.js");

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

// random #'s we need to init node and clockseq
var _seedBytes = rng();

// Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
var _nodeId = [
  _seedBytes[0] | 0x01,
  _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
];

// Per 4.2.2, randomize (14 bit) clockseq
var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

// Previous uuid creation time
var _lastMSecs = 0, _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};

  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  var node = options.node || _nodeId;
  for (var n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }

  return buf ? buf : bytesToUuid(b);
}

module.exports = v1;


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/uuid/v4.js":
/***/ (function(module, exports, __webpack_require__) {

var rng = __webpack_require__("../../../../openvidu-browser/node_modules/uuid/lib/rng-browser.js");
var bytesToUuid = __webpack_require__("../../../../openvidu-browser/node_modules/uuid/lib/bytesToUuid.js");

function v4(options, buf, offset) {
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options == 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ++ii) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || bytesToUuid(rnds);
}

module.exports = v4;


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/adapter_core.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */



var adapterFactory = __webpack_require__("../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/adapter_factory.js");
module.exports = adapterFactory({window: global.window});

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__("./node_modules/webpack/buildin/global.js")))

/***/ }),

/***/ "../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/adapter_factory.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */



var utils = __webpack_require__("../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/utils.js");
// Shimming starts here.
module.exports = function(dependencies, opts) {
  var window = dependencies && dependencies.window;

  var options = {
    shimChrome: true,
    shimFirefox: true,
    shimEdge: true,
    shimSafari: true,
  };

  for (var key in opts) {
    if (hasOwnProperty.call(opts, key)) {
      options[key] = opts[key];
    }
  }

  // Utils.
  var logging = utils.log;
  var browserDetails = utils.detectBrowser(window);

  // Uncomment the line below if you want logging to occur, including logging
  // for the switch statement below. Can also be turned on in the browser via
  // adapter.disableLog(false), but then logging from the switch statement below
  // will not appear.
  // require('./utils').disableLog(false);

  // Browser shims.
  var chromeShim = __webpack_require__("../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/chrome/chrome_shim.js") || null;
  var edgeShim = __webpack_require__("../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/edge/edge_shim.js") || null;
  var firefoxShim = __webpack_require__("../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/firefox/firefox_shim.js") || null;
  var safariShim = __webpack_require__("../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/safari/safari_shim.js") || null;
  var commonShim = __webpack_require__("../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/common_shim.js") || null;

  // Export to the adapter global object visible in the browser.
  var adapter = {
    browserDetails: browserDetails,
    commonShim: commonShim,
    extractVersion: utils.extractVersion,
    disableLog: utils.disableLog,
    disableWarnings: utils.disableWarnings
  };

  // Shim browser if found.
  switch (browserDetails.browser) {
    case 'chrome':
      if (!chromeShim || !chromeShim.shimPeerConnection ||
          !options.shimChrome) {
        logging('Chrome shim is not included in this adapter release.');
        return adapter;
      }
      logging('adapter.js shimming chrome.');
      // Export to the adapter global object visible in the browser.
      adapter.browserShim = chromeShim;
      commonShim.shimCreateObjectURL(window);

      chromeShim.shimGetUserMedia(window);
      chromeShim.shimMediaStream(window);
      chromeShim.shimSourceObject(window);
      chromeShim.shimPeerConnection(window);
      chromeShim.shimOnTrack(window);
      chromeShim.shimAddTrackRemoveTrack(window);
      chromeShim.shimGetSendersWithDtmf(window);

      commonShim.shimRTCIceCandidate(window);
      commonShim.shimMaxMessageSize(window);
      commonShim.shimSendThrowTypeError(window);
      break;
    case 'firefox':
      if (!firefoxShim || !firefoxShim.shimPeerConnection ||
          !options.shimFirefox) {
        logging('Firefox shim is not included in this adapter release.');
        return adapter;
      }
      logging('adapter.js shimming firefox.');
      // Export to the adapter global object visible in the browser.
      adapter.browserShim = firefoxShim;
      commonShim.shimCreateObjectURL(window);

      firefoxShim.shimGetUserMedia(window);
      firefoxShim.shimSourceObject(window);
      firefoxShim.shimPeerConnection(window);
      firefoxShim.shimOnTrack(window);
      firefoxShim.shimRemoveStream(window);

      commonShim.shimRTCIceCandidate(window);
      commonShim.shimMaxMessageSize(window);
      commonShim.shimSendThrowTypeError(window);
      break;
    case 'edge':
      if (!edgeShim || !edgeShim.shimPeerConnection || !options.shimEdge) {
        logging('MS edge shim is not included in this adapter release.');
        return adapter;
      }
      logging('adapter.js shimming edge.');
      // Export to the adapter global object visible in the browser.
      adapter.browserShim = edgeShim;
      commonShim.shimCreateObjectURL(window);

      edgeShim.shimGetUserMedia(window);
      edgeShim.shimPeerConnection(window);
      edgeShim.shimReplaceTrack(window);

      // the edge shim implements the full RTCIceCandidate object.

      commonShim.shimMaxMessageSize(window);
      commonShim.shimSendThrowTypeError(window);
      break;
    case 'safari':
      if (!safariShim || !options.shimSafari) {
        logging('Safari shim is not included in this adapter release.');
        return adapter;
      }
      logging('adapter.js shimming safari.');
      // Export to the adapter global object visible in the browser.
      adapter.browserShim = safariShim;
      commonShim.shimCreateObjectURL(window);

      safariShim.shimRTCIceServerUrls(window);
      safariShim.shimCallbacksAPI(window);
      safariShim.shimLocalStreamsAPI(window);
      safariShim.shimRemoteStreamsAPI(window);
      safariShim.shimTrackEventTransceiver(window);
      safariShim.shimGetUserMedia(window);
      safariShim.shimCreateOfferLegacy(window);

      commonShim.shimRTCIceCandidate(window);
      commonShim.shimMaxMessageSize(window);
      commonShim.shimSendThrowTypeError(window);
      break;
    default:
      logging('Unsupported browser!');
      break;
  }

  return adapter;
};


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/chrome/chrome_shim.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */

var utils = __webpack_require__("../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/utils.js");
var logging = utils.log;

module.exports = {
  shimGetUserMedia: __webpack_require__("../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/chrome/getusermedia.js"),
  shimMediaStream: function(window) {
    window.MediaStream = window.MediaStream || window.webkitMediaStream;
  },

  shimOnTrack: function(window) {
    if (typeof window === 'object' && window.RTCPeerConnection && !('ontrack' in
        window.RTCPeerConnection.prototype)) {
      Object.defineProperty(window.RTCPeerConnection.prototype, 'ontrack', {
        get: function() {
          return this._ontrack;
        },
        set: function(f) {
          if (this._ontrack) {
            this.removeEventListener('track', this._ontrack);
          }
          this.addEventListener('track', this._ontrack = f);
        }
      });
      var origSetRemoteDescription =
          window.RTCPeerConnection.prototype.setRemoteDescription;
      window.RTCPeerConnection.prototype.setRemoteDescription = function() {
        var pc = this;
        if (!pc._ontrackpoly) {
          pc._ontrackpoly = function(e) {
            // onaddstream does not fire when a track is added to an existing
            // stream. But stream.onaddtrack is implemented so we use that.
            e.stream.addEventListener('addtrack', function(te) {
              var receiver;
              if (window.RTCPeerConnection.prototype.getReceivers) {
                receiver = pc.getReceivers().find(function(r) {
                  return r.track && r.track.id === te.track.id;
                });
              } else {
                receiver = {track: te.track};
              }

              var event = new Event('track');
              event.track = te.track;
              event.receiver = receiver;
              event.transceiver = {receiver: receiver};
              event.streams = [e.stream];
              pc.dispatchEvent(event);
            });
            e.stream.getTracks().forEach(function(track) {
              var receiver;
              if (window.RTCPeerConnection.prototype.getReceivers) {
                receiver = pc.getReceivers().find(function(r) {
                  return r.track && r.track.id === track.id;
                });
              } else {
                receiver = {track: track};
              }
              var event = new Event('track');
              event.track = track;
              event.receiver = receiver;
              event.transceiver = {receiver: receiver};
              event.streams = [e.stream];
              pc.dispatchEvent(event);
            });
          };
          pc.addEventListener('addstream', pc._ontrackpoly);
        }
        return origSetRemoteDescription.apply(pc, arguments);
      };
    } else if (!('RTCRtpTransceiver' in window)) {
      utils.wrapPeerConnectionEvent(window, 'track', function(e) {
        if (!e.transceiver) {
          e.transceiver = {receiver: e.receiver};
        }
        return e;
      });
    }
  },

  shimGetSendersWithDtmf: function(window) {
    // Overrides addTrack/removeTrack, depends on shimAddTrackRemoveTrack.
    if (typeof window === 'object' && window.RTCPeerConnection &&
        !('getSenders' in window.RTCPeerConnection.prototype) &&
        'createDTMFSender' in window.RTCPeerConnection.prototype) {
      var shimSenderWithDtmf = function(pc, track) {
        return {
          track: track,
          get dtmf() {
            if (this._dtmf === undefined) {
              if (track.kind === 'audio') {
                this._dtmf = pc.createDTMFSender(track);
              } else {
                this._dtmf = null;
              }
            }
            return this._dtmf;
          },
          _pc: pc
        };
      };

      // augment addTrack when getSenders is not available.
      if (!window.RTCPeerConnection.prototype.getSenders) {
        window.RTCPeerConnection.prototype.getSenders = function() {
          this._senders = this._senders || [];
          return this._senders.slice(); // return a copy of the internal state.
        };
        var origAddTrack = window.RTCPeerConnection.prototype.addTrack;
        window.RTCPeerConnection.prototype.addTrack = function(track, stream) {
          var pc = this;
          var sender = origAddTrack.apply(pc, arguments);
          if (!sender) {
            sender = shimSenderWithDtmf(pc, track);
            pc._senders.push(sender);
          }
          return sender;
        };

        var origRemoveTrack = window.RTCPeerConnection.prototype.removeTrack;
        window.RTCPeerConnection.prototype.removeTrack = function(sender) {
          var pc = this;
          origRemoveTrack.apply(pc, arguments);
          var idx = pc._senders.indexOf(sender);
          if (idx !== -1) {
            pc._senders.splice(idx, 1);
          }
        };
      }
      var origAddStream = window.RTCPeerConnection.prototype.addStream;
      window.RTCPeerConnection.prototype.addStream = function(stream) {
        var pc = this;
        pc._senders = pc._senders || [];
        origAddStream.apply(pc, [stream]);
        stream.getTracks().forEach(function(track) {
          pc._senders.push(shimSenderWithDtmf(pc, track));
        });
      };

      var origRemoveStream = window.RTCPeerConnection.prototype.removeStream;
      window.RTCPeerConnection.prototype.removeStream = function(stream) {
        var pc = this;
        pc._senders = pc._senders || [];
        origRemoveStream.apply(pc, [stream]);

        stream.getTracks().forEach(function(track) {
          var sender = pc._senders.find(function(s) {
            return s.track === track;
          });
          if (sender) {
            pc._senders.splice(pc._senders.indexOf(sender), 1); // remove sender
          }
        });
      };
    } else if (typeof window === 'object' && window.RTCPeerConnection &&
               'getSenders' in window.RTCPeerConnection.prototype &&
               'createDTMFSender' in window.RTCPeerConnection.prototype &&
               window.RTCRtpSender &&
               !('dtmf' in window.RTCRtpSender.prototype)) {
      var origGetSenders = window.RTCPeerConnection.prototype.getSenders;
      window.RTCPeerConnection.prototype.getSenders = function() {
        var pc = this;
        var senders = origGetSenders.apply(pc, []);
        senders.forEach(function(sender) {
          sender._pc = pc;
        });
        return senders;
      };

      Object.defineProperty(window.RTCRtpSender.prototype, 'dtmf', {
        get: function() {
          if (this._dtmf === undefined) {
            if (this.track.kind === 'audio') {
              this._dtmf = this._pc.createDTMFSender(this.track);
            } else {
              this._dtmf = null;
            }
          }
          return this._dtmf;
        }
      });
    }
  },

  shimSourceObject: function(window) {
    var URL = window && window.URL;

    if (typeof window === 'object') {
      if (window.HTMLMediaElement &&
        !('srcObject' in window.HTMLMediaElement.prototype)) {
        // Shim the srcObject property, once, when HTMLMediaElement is found.
        Object.defineProperty(window.HTMLMediaElement.prototype, 'srcObject', {
          get: function() {
            return this._srcObject;
          },
          set: function(stream) {
            var self = this;
            // Use _srcObject as a private property for this shim
            this._srcObject = stream;
            if (this.src) {
              URL.revokeObjectURL(this.src);
            }

            if (!stream) {
              this.src = '';
              return undefined;
            }
            this.src = URL.createObjectURL(stream);
            // We need to recreate the blob url when a track is added or
            // removed. Doing it manually since we want to avoid a recursion.
            stream.addEventListener('addtrack', function() {
              if (self.src) {
                URL.revokeObjectURL(self.src);
              }
              self.src = URL.createObjectURL(stream);
            });
            stream.addEventListener('removetrack', function() {
              if (self.src) {
                URL.revokeObjectURL(self.src);
              }
              self.src = URL.createObjectURL(stream);
            });
          }
        });
      }
    }
  },

  shimAddTrackRemoveTrackWithNative: function(window) {
    // shim addTrack/removeTrack with native variants in order to make
    // the interactions with legacy getLocalStreams behave as in other browsers.
    // Keeps a mapping stream.id => [stream, rtpsenders...]
    window.RTCPeerConnection.prototype.getLocalStreams = function() {
      var pc = this;
      this._shimmedLocalStreams = this._shimmedLocalStreams || {};
      return Object.keys(this._shimmedLocalStreams).map(function(streamId) {
        return pc._shimmedLocalStreams[streamId][0];
      });
    };

    var origAddTrack = window.RTCPeerConnection.prototype.addTrack;
    window.RTCPeerConnection.prototype.addTrack = function(track, stream) {
      if (!stream) {
        return origAddTrack.apply(this, arguments);
      }
      this._shimmedLocalStreams = this._shimmedLocalStreams || {};

      var sender = origAddTrack.apply(this, arguments);
      if (!this._shimmedLocalStreams[stream.id]) {
        this._shimmedLocalStreams[stream.id] = [stream, sender];
      } else if (this._shimmedLocalStreams[stream.id].indexOf(sender) === -1) {
        this._shimmedLocalStreams[stream.id].push(sender);
      }
      return sender;
    };

    var origAddStream = window.RTCPeerConnection.prototype.addStream;
    window.RTCPeerConnection.prototype.addStream = function(stream) {
      var pc = this;
      this._shimmedLocalStreams = this._shimmedLocalStreams || {};

      stream.getTracks().forEach(function(track) {
        var alreadyExists = pc.getSenders().find(function(s) {
          return s.track === track;
        });
        if (alreadyExists) {
          throw new DOMException('Track already exists.',
              'InvalidAccessError');
        }
      });
      var existingSenders = pc.getSenders();
      origAddStream.apply(this, arguments);
      var newSenders = pc.getSenders().filter(function(newSender) {
        return existingSenders.indexOf(newSender) === -1;
      });
      this._shimmedLocalStreams[stream.id] = [stream].concat(newSenders);
    };

    var origRemoveStream = window.RTCPeerConnection.prototype.removeStream;
    window.RTCPeerConnection.prototype.removeStream = function(stream) {
      this._shimmedLocalStreams = this._shimmedLocalStreams || {};
      delete this._shimmedLocalStreams[stream.id];
      return origRemoveStream.apply(this, arguments);
    };

    var origRemoveTrack = window.RTCPeerConnection.prototype.removeTrack;
    window.RTCPeerConnection.prototype.removeTrack = function(sender) {
      var pc = this;
      this._shimmedLocalStreams = this._shimmedLocalStreams || {};
      if (sender) {
        Object.keys(this._shimmedLocalStreams).forEach(function(streamId) {
          var idx = pc._shimmedLocalStreams[streamId].indexOf(sender);
          if (idx !== -1) {
            pc._shimmedLocalStreams[streamId].splice(idx, 1);
          }
          if (pc._shimmedLocalStreams[streamId].length === 1) {
            delete pc._shimmedLocalStreams[streamId];
          }
        });
      }
      return origRemoveTrack.apply(this, arguments);
    };
  },

  shimAddTrackRemoveTrack: function(window) {
    var browserDetails = utils.detectBrowser(window);
    // shim addTrack and removeTrack.
    if (window.RTCPeerConnection.prototype.addTrack &&
        browserDetails.version >= 65) {
      return this.shimAddTrackRemoveTrackWithNative(window);
    }

    // also shim pc.getLocalStreams when addTrack is shimmed
    // to return the original streams.
    var origGetLocalStreams = window.RTCPeerConnection.prototype
        .getLocalStreams;
    window.RTCPeerConnection.prototype.getLocalStreams = function() {
      var pc = this;
      var nativeStreams = origGetLocalStreams.apply(this);
      pc._reverseStreams = pc._reverseStreams || {};
      return nativeStreams.map(function(stream) {
        return pc._reverseStreams[stream.id];
      });
    };

    var origAddStream = window.RTCPeerConnection.prototype.addStream;
    window.RTCPeerConnection.prototype.addStream = function(stream) {
      var pc = this;
      pc._streams = pc._streams || {};
      pc._reverseStreams = pc._reverseStreams || {};

      stream.getTracks().forEach(function(track) {
        var alreadyExists = pc.getSenders().find(function(s) {
          return s.track === track;
        });
        if (alreadyExists) {
          throw new DOMException('Track already exists.',
              'InvalidAccessError');
        }
      });
      // Add identity mapping for consistency with addTrack.
      // Unless this is being used with a stream from addTrack.
      if (!pc._reverseStreams[stream.id]) {
        var newStream = new window.MediaStream(stream.getTracks());
        pc._streams[stream.id] = newStream;
        pc._reverseStreams[newStream.id] = stream;
        stream = newStream;
      }
      origAddStream.apply(pc, [stream]);
    };

    var origRemoveStream = window.RTCPeerConnection.prototype.removeStream;
    window.RTCPeerConnection.prototype.removeStream = function(stream) {
      var pc = this;
      pc._streams = pc._streams || {};
      pc._reverseStreams = pc._reverseStreams || {};

      origRemoveStream.apply(pc, [(pc._streams[stream.id] || stream)]);
      delete pc._reverseStreams[(pc._streams[stream.id] ?
          pc._streams[stream.id].id : stream.id)];
      delete pc._streams[stream.id];
    };

    window.RTCPeerConnection.prototype.addTrack = function(track, stream) {
      var pc = this;
      if (pc.signalingState === 'closed') {
        throw new DOMException(
          'The RTCPeerConnection\'s signalingState is \'closed\'.',
          'InvalidStateError');
      }
      var streams = [].slice.call(arguments, 1);
      if (streams.length !== 1 ||
          !streams[0].getTracks().find(function(t) {
            return t === track;
          })) {
        // this is not fully correct but all we can manage without
        // [[associated MediaStreams]] internal slot.
        throw new DOMException(
          'The adapter.js addTrack polyfill only supports a single ' +
          ' stream which is associated with the specified track.',
          'NotSupportedError');
      }

      var alreadyExists = pc.getSenders().find(function(s) {
        return s.track === track;
      });
      if (alreadyExists) {
        throw new DOMException('Track already exists.',
            'InvalidAccessError');
      }

      pc._streams = pc._streams || {};
      pc._reverseStreams = pc._reverseStreams || {};
      var oldStream = pc._streams[stream.id];
      if (oldStream) {
        // this is using odd Chrome behaviour, use with caution:
        // https://bugs.chromium.org/p/webrtc/issues/detail?id=7815
        // Note: we rely on the high-level addTrack/dtmf shim to
        // create the sender with a dtmf sender.
        oldStream.addTrack(track);

        // Trigger ONN async.
        Promise.resolve().then(function() {
          pc.dispatchEvent(new Event('negotiationneeded'));
        });
      } else {
        var newStream = new window.MediaStream([track]);
        pc._streams[stream.id] = newStream;
        pc._reverseStreams[newStream.id] = stream;
        pc.addStream(newStream);
      }
      return pc.getSenders().find(function(s) {
        return s.track === track;
      });
    };

    // replace the internal stream id with the external one and
    // vice versa.
    function replaceInternalStreamId(pc, description) {
      var sdp = description.sdp;
      Object.keys(pc._reverseStreams || []).forEach(function(internalId) {
        var externalStream = pc._reverseStreams[internalId];
        var internalStream = pc._streams[externalStream.id];
        sdp = sdp.replace(new RegExp(internalStream.id, 'g'),
            externalStream.id);
      });
      return new RTCSessionDescription({
        type: description.type,
        sdp: sdp
      });
    }
    function replaceExternalStreamId(pc, description) {
      var sdp = description.sdp;
      Object.keys(pc._reverseStreams || []).forEach(function(internalId) {
        var externalStream = pc._reverseStreams[internalId];
        var internalStream = pc._streams[externalStream.id];
        sdp = sdp.replace(new RegExp(externalStream.id, 'g'),
            internalStream.id);
      });
      return new RTCSessionDescription({
        type: description.type,
        sdp: sdp
      });
    }
    ['createOffer', 'createAnswer'].forEach(function(method) {
      var nativeMethod = window.RTCPeerConnection.prototype[method];
      window.RTCPeerConnection.prototype[method] = function() {
        var pc = this;
        var args = arguments;
        var isLegacyCall = arguments.length &&
            typeof arguments[0] === 'function';
        if (isLegacyCall) {
          return nativeMethod.apply(pc, [
            function(description) {
              var desc = replaceInternalStreamId(pc, description);
              args[0].apply(null, [desc]);
            },
            function(err) {
              if (args[1]) {
                args[1].apply(null, err);
              }
            }, arguments[2]
          ]);
        }
        return nativeMethod.apply(pc, arguments)
        .then(function(description) {
          return replaceInternalStreamId(pc, description);
        });
      };
    });

    var origSetLocalDescription =
        window.RTCPeerConnection.prototype.setLocalDescription;
    window.RTCPeerConnection.prototype.setLocalDescription = function() {
      var pc = this;
      if (!arguments.length || !arguments[0].type) {
        return origSetLocalDescription.apply(pc, arguments);
      }
      arguments[0] = replaceExternalStreamId(pc, arguments[0]);
      return origSetLocalDescription.apply(pc, arguments);
    };

    // TODO: mangle getStats: https://w3c.github.io/webrtc-stats/#dom-rtcmediastreamstats-streamidentifier

    var origLocalDescription = Object.getOwnPropertyDescriptor(
        window.RTCPeerConnection.prototype, 'localDescription');
    Object.defineProperty(window.RTCPeerConnection.prototype,
        'localDescription', {
          get: function() {
            var pc = this;
            var description = origLocalDescription.get.apply(this);
            if (description.type === '') {
              return description;
            }
            return replaceInternalStreamId(pc, description);
          }
        });

    window.RTCPeerConnection.prototype.removeTrack = function(sender) {
      var pc = this;
      if (pc.signalingState === 'closed') {
        throw new DOMException(
          'The RTCPeerConnection\'s signalingState is \'closed\'.',
          'InvalidStateError');
      }
      // We can not yet check for sender instanceof RTCRtpSender
      // since we shim RTPSender. So we check if sender._pc is set.
      if (!sender._pc) {
        throw new DOMException('Argument 1 of RTCPeerConnection.removeTrack ' +
            'does not implement interface RTCRtpSender.', 'TypeError');
      }
      var isLocal = sender._pc === pc;
      if (!isLocal) {
        throw new DOMException('Sender was not created by this connection.',
            'InvalidAccessError');
      }

      // Search for the native stream the senders track belongs to.
      pc._streams = pc._streams || {};
      var stream;
      Object.keys(pc._streams).forEach(function(streamid) {
        var hasTrack = pc._streams[streamid].getTracks().find(function(track) {
          return sender.track === track;
        });
        if (hasTrack) {
          stream = pc._streams[streamid];
        }
      });

      if (stream) {
        if (stream.getTracks().length === 1) {
          // if this is the last track of the stream, remove the stream. This
          // takes care of any shimmed _senders.
          pc.removeStream(pc._reverseStreams[stream.id]);
        } else {
          // relying on the same odd chrome behaviour as above.
          stream.removeTrack(sender.track);
        }
        pc.dispatchEvent(new Event('negotiationneeded'));
      }
    };
  },

  shimPeerConnection: function(window) {
    var browserDetails = utils.detectBrowser(window);

    // The RTCPeerConnection object.
    if (!window.RTCPeerConnection && window.webkitRTCPeerConnection) {
      window.RTCPeerConnection = function(pcConfig, pcConstraints) {
        // Translate iceTransportPolicy to iceTransports,
        // see https://code.google.com/p/webrtc/issues/detail?id=4869
        // this was fixed in M56 along with unprefixing RTCPeerConnection.
        logging('PeerConnection');
        if (pcConfig && pcConfig.iceTransportPolicy) {
          pcConfig.iceTransports = pcConfig.iceTransportPolicy;
        }

        return new window.webkitRTCPeerConnection(pcConfig, pcConstraints);
      };
      window.RTCPeerConnection.prototype =
          window.webkitRTCPeerConnection.prototype;
      // wrap static methods. Currently just generateCertificate.
      if (window.webkitRTCPeerConnection.generateCertificate) {
        Object.defineProperty(window.RTCPeerConnection, 'generateCertificate', {
          get: function() {
            return window.webkitRTCPeerConnection.generateCertificate;
          }
        });
      }
    } else {
      // migrate from non-spec RTCIceServer.url to RTCIceServer.urls
      var OrigPeerConnection = window.RTCPeerConnection;
      window.RTCPeerConnection = function(pcConfig, pcConstraints) {
        if (pcConfig && pcConfig.iceServers) {
          var newIceServers = [];
          for (var i = 0; i < pcConfig.iceServers.length; i++) {
            var server = pcConfig.iceServers[i];
            if (!server.hasOwnProperty('urls') &&
                server.hasOwnProperty('url')) {
              utils.deprecated('RTCIceServer.url', 'RTCIceServer.urls');
              server = JSON.parse(JSON.stringify(server));
              server.urls = server.url;
              newIceServers.push(server);
            } else {
              newIceServers.push(pcConfig.iceServers[i]);
            }
          }
          pcConfig.iceServers = newIceServers;
        }
        return new OrigPeerConnection(pcConfig, pcConstraints);
      };
      window.RTCPeerConnection.prototype = OrigPeerConnection.prototype;
      // wrap static methods. Currently just generateCertificate.
      Object.defineProperty(window.RTCPeerConnection, 'generateCertificate', {
        get: function() {
          return OrigPeerConnection.generateCertificate;
        }
      });
    }

    var origGetStats = window.RTCPeerConnection.prototype.getStats;
    window.RTCPeerConnection.prototype.getStats = function(selector,
        successCallback, errorCallback) {
      var pc = this;
      var args = arguments;

      // If selector is a function then we are in the old style stats so just
      // pass back the original getStats format to avoid breaking old users.
      if (arguments.length > 0 && typeof selector === 'function') {
        return origGetStats.apply(this, arguments);
      }

      // When spec-style getStats is supported, return those when called with
      // either no arguments or the selector argument is null.
      if (origGetStats.length === 0 && (arguments.length === 0 ||
          typeof arguments[0] !== 'function')) {
        return origGetStats.apply(this, []);
      }

      var fixChromeStats_ = function(response) {
        var standardReport = {};
        var reports = response.result();
        reports.forEach(function(report) {
          var standardStats = {
            id: report.id,
            timestamp: report.timestamp,
            type: {
              localcandidate: 'local-candidate',
              remotecandidate: 'remote-candidate'
            }[report.type] || report.type
          };
          report.names().forEach(function(name) {
            standardStats[name] = report.stat(name);
          });
          standardReport[standardStats.id] = standardStats;
        });

        return standardReport;
      };

      // shim getStats with maplike support
      var makeMapStats = function(stats) {
        return new Map(Object.keys(stats).map(function(key) {
          return [key, stats[key]];
        }));
      };

      if (arguments.length >= 2) {
        var successCallbackWrapper_ = function(response) {
          args[1](makeMapStats(fixChromeStats_(response)));
        };

        return origGetStats.apply(this, [successCallbackWrapper_,
          arguments[0]]);
      }

      // promise-support
      return new Promise(function(resolve, reject) {
        origGetStats.apply(pc, [
          function(response) {
            resolve(makeMapStats(fixChromeStats_(response)));
          }, reject]);
      }).then(successCallback, errorCallback);
    };

    // add promise support -- natively available in Chrome 51
    if (browserDetails.version < 51) {
      ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate']
          .forEach(function(method) {
            var nativeMethod = window.RTCPeerConnection.prototype[method];
            window.RTCPeerConnection.prototype[method] = function() {
              var args = arguments;
              var pc = this;
              var promise = new Promise(function(resolve, reject) {
                nativeMethod.apply(pc, [args[0], resolve, reject]);
              });
              if (args.length < 2) {
                return promise;
              }
              return promise.then(function() {
                args[1].apply(null, []);
              },
              function(err) {
                if (args.length >= 3) {
                  args[2].apply(null, [err]);
                }
              });
            };
          });
    }

    // promise support for createOffer and createAnswer. Available (without
    // bugs) since M52: crbug/619289
    if (browserDetails.version < 52) {
      ['createOffer', 'createAnswer'].forEach(function(method) {
        var nativeMethod = window.RTCPeerConnection.prototype[method];
        window.RTCPeerConnection.prototype[method] = function() {
          var pc = this;
          if (arguments.length < 1 || (arguments.length === 1 &&
              typeof arguments[0] === 'object')) {
            var opts = arguments.length === 1 ? arguments[0] : undefined;
            return new Promise(function(resolve, reject) {
              nativeMethod.apply(pc, [resolve, reject, opts]);
            });
          }
          return nativeMethod.apply(this, arguments);
        };
      });
    }

    // shim implicit creation of RTCSessionDescription/RTCIceCandidate
    ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate']
        .forEach(function(method) {
          var nativeMethod = window.RTCPeerConnection.prototype[method];
          window.RTCPeerConnection.prototype[method] = function() {
            arguments[0] = new ((method === 'addIceCandidate') ?
                window.RTCIceCandidate :
                window.RTCSessionDescription)(arguments[0]);
            return nativeMethod.apply(this, arguments);
          };
        });

    // support for addIceCandidate(null or undefined)
    var nativeAddIceCandidate =
        window.RTCPeerConnection.prototype.addIceCandidate;
    window.RTCPeerConnection.prototype.addIceCandidate = function() {
      if (!arguments[0]) {
        if (arguments[1]) {
          arguments[1].apply(null);
        }
        return Promise.resolve();
      }
      return nativeAddIceCandidate.apply(this, arguments);
    };
  }
};


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/chrome/getusermedia.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */

var utils = __webpack_require__("../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/utils.js");
var logging = utils.log;

// Expose public methods.
module.exports = function(window) {
  var browserDetails = utils.detectBrowser(window);
  var navigator = window && window.navigator;

  var constraintsToChrome_ = function(c) {
    if (typeof c !== 'object' || c.mandatory || c.optional) {
      return c;
    }
    var cc = {};
    Object.keys(c).forEach(function(key) {
      if (key === 'require' || key === 'advanced' || key === 'mediaSource') {
        return;
      }
      var r = (typeof c[key] === 'object') ? c[key] : {ideal: c[key]};
      if (r.exact !== undefined && typeof r.exact === 'number') {
        r.min = r.max = r.exact;
      }
      var oldname_ = function(prefix, name) {
        if (prefix) {
          return prefix + name.charAt(0).toUpperCase() + name.slice(1);
        }
        return (name === 'deviceId') ? 'sourceId' : name;
      };
      if (r.ideal !== undefined) {
        cc.optional = cc.optional || [];
        var oc = {};
        if (typeof r.ideal === 'number') {
          oc[oldname_('min', key)] = r.ideal;
          cc.optional.push(oc);
          oc = {};
          oc[oldname_('max', key)] = r.ideal;
          cc.optional.push(oc);
        } else {
          oc[oldname_('', key)] = r.ideal;
          cc.optional.push(oc);
        }
      }
      if (r.exact !== undefined && typeof r.exact !== 'number') {
        cc.mandatory = cc.mandatory || {};
        cc.mandatory[oldname_('', key)] = r.exact;
      } else {
        ['min', 'max'].forEach(function(mix) {
          if (r[mix] !== undefined) {
            cc.mandatory = cc.mandatory || {};
            cc.mandatory[oldname_(mix, key)] = r[mix];
          }
        });
      }
    });
    if (c.advanced) {
      cc.optional = (cc.optional || []).concat(c.advanced);
    }
    return cc;
  };

  var shimConstraints_ = function(constraints, func) {
    if (browserDetails.version >= 61) {
      return func(constraints);
    }
    constraints = JSON.parse(JSON.stringify(constraints));
    if (constraints && typeof constraints.audio === 'object') {
      var remap = function(obj, a, b) {
        if (a in obj && !(b in obj)) {
          obj[b] = obj[a];
          delete obj[a];
        }
      };
      constraints = JSON.parse(JSON.stringify(constraints));
      remap(constraints.audio, 'autoGainControl', 'googAutoGainControl');
      remap(constraints.audio, 'noiseSuppression', 'googNoiseSuppression');
      constraints.audio = constraintsToChrome_(constraints.audio);
    }
    if (constraints && typeof constraints.video === 'object') {
      // Shim facingMode for mobile & surface pro.
      var face = constraints.video.facingMode;
      face = face && ((typeof face === 'object') ? face : {ideal: face});
      var getSupportedFacingModeLies = browserDetails.version < 66;

      if ((face && (face.exact === 'user' || face.exact === 'environment' ||
                    face.ideal === 'user' || face.ideal === 'environment')) &&
          !(navigator.mediaDevices.getSupportedConstraints &&
            navigator.mediaDevices.getSupportedConstraints().facingMode &&
            !getSupportedFacingModeLies)) {
        delete constraints.video.facingMode;
        var matches;
        if (face.exact === 'environment' || face.ideal === 'environment') {
          matches = ['back', 'rear'];
        } else if (face.exact === 'user' || face.ideal === 'user') {
          matches = ['front'];
        }
        if (matches) {
          // Look for matches in label, or use last cam for back (typical).
          return navigator.mediaDevices.enumerateDevices()
          .then(function(devices) {
            devices = devices.filter(function(d) {
              return d.kind === 'videoinput';
            });
            var dev = devices.find(function(d) {
              return matches.some(function(match) {
                return d.label.toLowerCase().indexOf(match) !== -1;
              });
            });
            if (!dev && devices.length && matches.indexOf('back') !== -1) {
              dev = devices[devices.length - 1]; // more likely the back cam
            }
            if (dev) {
              constraints.video.deviceId = face.exact ? {exact: dev.deviceId} :
                                                        {ideal: dev.deviceId};
            }
            constraints.video = constraintsToChrome_(constraints.video);
            logging('chrome: ' + JSON.stringify(constraints));
            return func(constraints);
          });
        }
      }
      constraints.video = constraintsToChrome_(constraints.video);
    }
    logging('chrome: ' + JSON.stringify(constraints));
    return func(constraints);
  };

  var shimError_ = function(e) {
    return {
      name: {
        PermissionDeniedError: 'NotAllowedError',
        InvalidStateError: 'NotReadableError',
        DevicesNotFoundError: 'NotFoundError',
        ConstraintNotSatisfiedError: 'OverconstrainedError',
        TrackStartError: 'NotReadableError',
        MediaDeviceFailedDueToShutdown: 'NotReadableError',
        MediaDeviceKillSwitchOn: 'NotReadableError'
      }[e.name] || e.name,
      message: e.message,
      constraint: e.constraintName,
      toString: function() {
        return this.name + (this.message && ': ') + this.message;
      }
    };
  };

  var getUserMedia_ = function(constraints, onSuccess, onError) {
    shimConstraints_(constraints, function(c) {
      navigator.webkitGetUserMedia(c, onSuccess, function(e) {
        if (onError) {
          onError(shimError_(e));
        }
      });
    });
  };

  navigator.getUserMedia = getUserMedia_;

  // Returns the result of getUserMedia as a Promise.
  var getUserMediaPromise_ = function(constraints) {
    return new Promise(function(resolve, reject) {
      navigator.getUserMedia(constraints, resolve, reject);
    });
  };

  if (!navigator.mediaDevices) {
    navigator.mediaDevices = {
      getUserMedia: getUserMediaPromise_,
      enumerateDevices: function() {
        return new Promise(function(resolve) {
          var kinds = {audio: 'audioinput', video: 'videoinput'};
          return window.MediaStreamTrack.getSources(function(devices) {
            resolve(devices.map(function(device) {
              return {label: device.label,
                kind: kinds[device.kind],
                deviceId: device.id,
                groupId: ''};
            }));
          });
        });
      },
      getSupportedConstraints: function() {
        return {
          deviceId: true, echoCancellation: true, facingMode: true,
          frameRate: true, height: true, width: true
        };
      }
    };
  }

  // A shim for getUserMedia method on the mediaDevices object.
  // TODO(KaptenJansson) remove once implemented in Chrome stable.
  if (!navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia = function(constraints) {
      return getUserMediaPromise_(constraints);
    };
  } else {
    // Even though Chrome 45 has navigator.mediaDevices and a getUserMedia
    // function which returns a Promise, it does not accept spec-style
    // constraints.
    var origGetUserMedia = navigator.mediaDevices.getUserMedia.
        bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = function(cs) {
      return shimConstraints_(cs, function(c) {
        return origGetUserMedia(c).then(function(stream) {
          if (c.audio && !stream.getAudioTracks().length ||
              c.video && !stream.getVideoTracks().length) {
            stream.getTracks().forEach(function(track) {
              track.stop();
            });
            throw new DOMException('', 'NotFoundError');
          }
          return stream;
        }, function(e) {
          return Promise.reject(shimError_(e));
        });
      });
    };
  }

  // Dummy devicechange event methods.
  // TODO(KaptenJansson) remove once implemented in Chrome stable.
  if (typeof navigator.mediaDevices.addEventListener === 'undefined') {
    navigator.mediaDevices.addEventListener = function() {
      logging('Dummy mediaDevices.addEventListener called.');
    };
  }
  if (typeof navigator.mediaDevices.removeEventListener === 'undefined') {
    navigator.mediaDevices.removeEventListener = function() {
      logging('Dummy mediaDevices.removeEventListener called.');
    };
  }
};


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/common_shim.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*
 *  Copyright (c) 2017 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */


var SDPUtils = __webpack_require__("../../../../openvidu-browser/node_modules/sdp/sdp.js");
var utils = __webpack_require__("../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/utils.js");

module.exports = {
  shimRTCIceCandidate: function(window) {
    // foundation is arbitrarily chosen as an indicator for full support for
    // https://w3c.github.io/webrtc-pc/#rtcicecandidate-interface
    if (window.RTCIceCandidate && 'foundation' in
        window.RTCIceCandidate.prototype) {
      return;
    }

    var NativeRTCIceCandidate = window.RTCIceCandidate;
    window.RTCIceCandidate = function(args) {
      // Remove the a= which shouldn't be part of the candidate string.
      if (typeof args === 'object' && args.candidate &&
          args.candidate.indexOf('a=') === 0) {
        args = JSON.parse(JSON.stringify(args));
        args.candidate = args.candidate.substr(2);
      }

      // Augment the native candidate with the parsed fields.
      var nativeCandidate = new NativeRTCIceCandidate(args);
      var parsedCandidate = SDPUtils.parseCandidate(args.candidate);
      var augmentedCandidate = Object.assign(nativeCandidate,
          parsedCandidate);

      // Add a serializer that does not serialize the extra attributes.
      augmentedCandidate.toJSON = function() {
        return {
          candidate: augmentedCandidate.candidate,
          sdpMid: augmentedCandidate.sdpMid,
          sdpMLineIndex: augmentedCandidate.sdpMLineIndex,
          usernameFragment: augmentedCandidate.usernameFragment,
        };
      };
      return augmentedCandidate;
    };

    // Hook up the augmented candidate in onicecandidate and
    // addEventListener('icecandidate', ...)
    utils.wrapPeerConnectionEvent(window, 'icecandidate', function(e) {
      if (e.candidate) {
        Object.defineProperty(e, 'candidate', {
          value: new window.RTCIceCandidate(e.candidate),
          writable: 'false'
        });
      }
      return e;
    });
  },

  // shimCreateObjectURL must be called before shimSourceObject to avoid loop.

  shimCreateObjectURL: function(window) {
    var URL = window && window.URL;

    if (!(typeof window === 'object' && window.HTMLMediaElement &&
          'srcObject' in window.HTMLMediaElement.prototype &&
        URL.createObjectURL && URL.revokeObjectURL)) {
      // Only shim CreateObjectURL using srcObject if srcObject exists.
      return undefined;
    }

    var nativeCreateObjectURL = URL.createObjectURL.bind(URL);
    var nativeRevokeObjectURL = URL.revokeObjectURL.bind(URL);
    var streams = new Map(), newId = 0;

    URL.createObjectURL = function(stream) {
      if ('getTracks' in stream) {
        var url = 'polyblob:' + (++newId);
        streams.set(url, stream);
        utils.deprecated('URL.createObjectURL(stream)',
            'elem.srcObject = stream');
        return url;
      }
      return nativeCreateObjectURL(stream);
    };
    URL.revokeObjectURL = function(url) {
      nativeRevokeObjectURL(url);
      streams.delete(url);
    };

    var dsc = Object.getOwnPropertyDescriptor(window.HTMLMediaElement.prototype,
                                              'src');
    Object.defineProperty(window.HTMLMediaElement.prototype, 'src', {
      get: function() {
        return dsc.get.apply(this);
      },
      set: function(url) {
        this.srcObject = streams.get(url) || null;
        return dsc.set.apply(this, [url]);
      }
    });

    var nativeSetAttribute = window.HTMLMediaElement.prototype.setAttribute;
    window.HTMLMediaElement.prototype.setAttribute = function() {
      if (arguments.length === 2 &&
          ('' + arguments[0]).toLowerCase() === 'src') {
        this.srcObject = streams.get(arguments[1]) || null;
      }
      return nativeSetAttribute.apply(this, arguments);
    };
  },

  shimMaxMessageSize: function(window) {
    if (window.RTCSctpTransport || !window.RTCPeerConnection) {
      return;
    }
    var browserDetails = utils.detectBrowser(window);

    if (!('sctp' in window.RTCPeerConnection.prototype)) {
      Object.defineProperty(window.RTCPeerConnection.prototype, 'sctp', {
        get: function() {
          return typeof this._sctp === 'undefined' ? null : this._sctp;
        }
      });
    }

    var sctpInDescription = function(description) {
      var sections = SDPUtils.splitSections(description.sdp);
      sections.shift();
      return sections.some(function(mediaSection) {
        var mLine = SDPUtils.parseMLine(mediaSection);
        return mLine && mLine.kind === 'application'
            && mLine.protocol.indexOf('SCTP') !== -1;
      });
    };

    var getRemoteFirefoxVersion = function(description) {
      // TODO: Is there a better solution for detecting Firefox?
      var match = description.sdp.match(/mozilla...THIS_IS_SDPARTA-(\d+)/);
      if (match === null || match.length < 2) {
        return -1;
      }
      var version = parseInt(match[1], 10);
      // Test for NaN (yes, this is ugly)
      return version !== version ? -1 : version;
    };

    var getCanSendMaxMessageSize = function(remoteIsFirefox) {
      // Every implementation we know can send at least 64 KiB.
      // Note: Although Chrome is technically able to send up to 256 KiB, the
      //       data does not reach the other peer reliably.
      //       See: https://bugs.chromium.org/p/webrtc/issues/detail?id=8419
      var canSendMaxMessageSize = 65536;
      if (browserDetails.browser === 'firefox') {
        if (browserDetails.version < 57) {
          if (remoteIsFirefox === -1) {
            // FF < 57 will send in 16 KiB chunks using the deprecated PPID
            // fragmentation.
            canSendMaxMessageSize = 16384;
          } else {
            // However, other FF (and RAWRTC) can reassemble PPID-fragmented
            // messages. Thus, supporting ~2 GiB when sending.
            canSendMaxMessageSize = 2147483637;
          }
        } else {
          // Currently, all FF >= 57 will reset the remote maximum message size
          // to the default value when a data channel is created at a later
          // stage. :(
          // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1426831
          canSendMaxMessageSize =
            browserDetails.version === 57 ? 65535 : 65536;
        }
      }
      return canSendMaxMessageSize;
    };

    var getMaxMessageSize = function(description, remoteIsFirefox) {
      // Note: 65536 bytes is the default value from the SDP spec. Also,
      //       every implementation we know supports receiving 65536 bytes.
      var maxMessageSize = 65536;

      // FF 57 has a slightly incorrect default remote max message size, so
      // we need to adjust it here to avoid a failure when sending.
      // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1425697
      if (browserDetails.browser === 'firefox'
           && browserDetails.version === 57) {
        maxMessageSize = 65535;
      }

      var match = SDPUtils.matchPrefix(description.sdp, 'a=max-message-size:');
      if (match.length > 0) {
        maxMessageSize = parseInt(match[0].substr(19), 10);
      } else if (browserDetails.browser === 'firefox' &&
                  remoteIsFirefox !== -1) {
        // If the maximum message size is not present in the remote SDP and
        // both local and remote are Firefox, the remote peer can receive
        // ~2 GiB.
        maxMessageSize = 2147483637;
      }
      return maxMessageSize;
    };

    var origSetRemoteDescription =
        window.RTCPeerConnection.prototype.setRemoteDescription;
    window.RTCPeerConnection.prototype.setRemoteDescription = function() {
      var pc = this;
      pc._sctp = null;

      if (sctpInDescription(arguments[0])) {
        // Check if the remote is FF.
        var isFirefox = getRemoteFirefoxVersion(arguments[0]);

        // Get the maximum message size the local peer is capable of sending
        var canSendMMS = getCanSendMaxMessageSize(isFirefox);

        // Get the maximum message size of the remote peer.
        var remoteMMS = getMaxMessageSize(arguments[0], isFirefox);

        // Determine final maximum message size
        var maxMessageSize;
        if (canSendMMS === 0 && remoteMMS === 0) {
          maxMessageSize = Number.POSITIVE_INFINITY;
        } else if (canSendMMS === 0 || remoteMMS === 0) {
          maxMessageSize = Math.max(canSendMMS, remoteMMS);
        } else {
          maxMessageSize = Math.min(canSendMMS, remoteMMS);
        }

        // Create a dummy RTCSctpTransport object and the 'maxMessageSize'
        // attribute.
        var sctp = {};
        Object.defineProperty(sctp, 'maxMessageSize', {
          get: function() {
            return maxMessageSize;
          }
        });
        pc._sctp = sctp;
      }

      return origSetRemoteDescription.apply(pc, arguments);
    };
  },

  shimSendThrowTypeError: function(window) {
    // Note: Although Firefox >= 57 has a native implementation, the maximum
    //       message size can be reset for all data channels at a later stage.
    //       See: https://bugzilla.mozilla.org/show_bug.cgi?id=1426831

    var origCreateDataChannel =
      window.RTCPeerConnection.prototype.createDataChannel;
    window.RTCPeerConnection.prototype.createDataChannel = function() {
      var pc = this;
      var dataChannel = origCreateDataChannel.apply(pc, arguments);
      var origDataChannelSend = dataChannel.send;

      // Patch 'send' method
      dataChannel.send = function() {
        var dc = this;
        var data = arguments[0];
        var length = data.length || data.size || data.byteLength;
        if (length > pc.sctp.maxMessageSize) {
          throw new DOMException('Message too large (can send a maximum of ' +
            pc.sctp.maxMessageSize + ' bytes)', 'TypeError');
        }
        return origDataChannelSend.apply(dc, arguments);
      };

      return dataChannel;
    };
  }
};


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/edge/edge_shim.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */


var utils = __webpack_require__("../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/utils.js");
var shimRTCPeerConnection = __webpack_require__("../../../../openvidu-browser/node_modules/rtcpeerconnection-shim/rtcpeerconnection.js");

module.exports = {
  shimGetUserMedia: __webpack_require__("../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/edge/getusermedia.js"),
  shimPeerConnection: function(window) {
    var browserDetails = utils.detectBrowser(window);

    if (window.RTCIceGatherer) {
      // ORTC defines an RTCIceCandidate object but no constructor.
      // Not implemented in Edge.
      if (!window.RTCIceCandidate) {
        window.RTCIceCandidate = function(args) {
          return args;
        };
      }
      // ORTC does not have a session description object but
      // other browsers (i.e. Chrome) that will support both PC and ORTC
      // in the future might have this defined already.
      if (!window.RTCSessionDescription) {
        window.RTCSessionDescription = function(args) {
          return args;
        };
      }
      // this adds an additional event listener to MediaStrackTrack that signals
      // when a tracks enabled property was changed. Workaround for a bug in
      // addStream, see below. No longer required in 15025+
      if (browserDetails.version < 15025) {
        var origMSTEnabled = Object.getOwnPropertyDescriptor(
            window.MediaStreamTrack.prototype, 'enabled');
        Object.defineProperty(window.MediaStreamTrack.prototype, 'enabled', {
          set: function(value) {
            origMSTEnabled.set.call(this, value);
            var ev = new Event('enabled');
            ev.enabled = value;
            this.dispatchEvent(ev);
          }
        });
      }
    }

    // ORTC defines the DTMF sender a bit different.
    // https://github.com/w3c/ortc/issues/714
    if (window.RTCRtpSender && !('dtmf' in window.RTCRtpSender.prototype)) {
      Object.defineProperty(window.RTCRtpSender.prototype, 'dtmf', {
        get: function() {
          if (this._dtmf === undefined) {
            if (this.track.kind === 'audio') {
              this._dtmf = new window.RTCDtmfSender(this);
            } else if (this.track.kind === 'video') {
              this._dtmf = null;
            }
          }
          return this._dtmf;
        }
      });
    }

    window.RTCPeerConnection =
        shimRTCPeerConnection(window, browserDetails.version);
  },
  shimReplaceTrack: function(window) {
    // ORTC has replaceTrack -- https://github.com/w3c/ortc/issues/614
    if (window.RTCRtpSender &&
        !('replaceTrack' in window.RTCRtpSender.prototype)) {
      window.RTCRtpSender.prototype.replaceTrack =
          window.RTCRtpSender.prototype.setTrack;
    }
  }
};


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/edge/getusermedia.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */


// Expose public methods.
module.exports = function(window) {
  var navigator = window && window.navigator;

  var shimError_ = function(e) {
    return {
      name: {PermissionDeniedError: 'NotAllowedError'}[e.name] || e.name,
      message: e.message,
      constraint: e.constraint,
      toString: function() {
        return this.name;
      }
    };
  };

  // getUserMedia error shim.
  var origGetUserMedia = navigator.mediaDevices.getUserMedia.
      bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = function(c) {
    return origGetUserMedia(c).catch(function(e) {
      return Promise.reject(shimError_(e));
    });
  };
};


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/firefox/firefox_shim.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */


var utils = __webpack_require__("../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/utils.js");

module.exports = {
  shimGetUserMedia: __webpack_require__("../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/firefox/getusermedia.js"),
  shimOnTrack: function(window) {
    if (typeof window === 'object' && window.RTCPeerConnection && !('ontrack' in
        window.RTCPeerConnection.prototype)) {
      Object.defineProperty(window.RTCPeerConnection.prototype, 'ontrack', {
        get: function() {
          return this._ontrack;
        },
        set: function(f) {
          if (this._ontrack) {
            this.removeEventListener('track', this._ontrack);
            this.removeEventListener('addstream', this._ontrackpoly);
          }
          this.addEventListener('track', this._ontrack = f);
          this.addEventListener('addstream', this._ontrackpoly = function(e) {
            e.stream.getTracks().forEach(function(track) {
              var event = new Event('track');
              event.track = track;
              event.receiver = {track: track};
              event.transceiver = {receiver: event.receiver};
              event.streams = [e.stream];
              this.dispatchEvent(event);
            }.bind(this));
          }.bind(this));
        }
      });
    }
    if (typeof window === 'object' && window.RTCTrackEvent &&
        ('receiver' in window.RTCTrackEvent.prototype) &&
        !('transceiver' in window.RTCTrackEvent.prototype)) {
      Object.defineProperty(window.RTCTrackEvent.prototype, 'transceiver', {
        get: function() {
          return {receiver: this.receiver};
        }
      });
    }
  },

  shimSourceObject: function(window) {
    // Firefox has supported mozSrcObject since FF22, unprefixed in 42.
    if (typeof window === 'object') {
      if (window.HTMLMediaElement &&
        !('srcObject' in window.HTMLMediaElement.prototype)) {
        // Shim the srcObject property, once, when HTMLMediaElement is found.
        Object.defineProperty(window.HTMLMediaElement.prototype, 'srcObject', {
          get: function() {
            return this.mozSrcObject;
          },
          set: function(stream) {
            this.mozSrcObject = stream;
          }
        });
      }
    }
  },

  shimPeerConnection: function(window) {
    var browserDetails = utils.detectBrowser(window);

    if (typeof window !== 'object' || !(window.RTCPeerConnection ||
        window.mozRTCPeerConnection)) {
      return; // probably media.peerconnection.enabled=false in about:config
    }
    // The RTCPeerConnection object.
    if (!window.RTCPeerConnection) {
      window.RTCPeerConnection = function(pcConfig, pcConstraints) {
        if (browserDetails.version < 38) {
          // .urls is not supported in FF < 38.
          // create RTCIceServers with a single url.
          if (pcConfig && pcConfig.iceServers) {
            var newIceServers = [];
            for (var i = 0; i < pcConfig.iceServers.length; i++) {
              var server = pcConfig.iceServers[i];
              if (server.hasOwnProperty('urls')) {
                for (var j = 0; j < server.urls.length; j++) {
                  var newServer = {
                    url: server.urls[j]
                  };
                  if (server.urls[j].indexOf('turn') === 0) {
                    newServer.username = server.username;
                    newServer.credential = server.credential;
                  }
                  newIceServers.push(newServer);
                }
              } else {
                newIceServers.push(pcConfig.iceServers[i]);
              }
            }
            pcConfig.iceServers = newIceServers;
          }
        }
        return new window.mozRTCPeerConnection(pcConfig, pcConstraints);
      };
      window.RTCPeerConnection.prototype =
          window.mozRTCPeerConnection.prototype;

      // wrap static methods. Currently just generateCertificate.
      if (window.mozRTCPeerConnection.generateCertificate) {
        Object.defineProperty(window.RTCPeerConnection, 'generateCertificate', {
          get: function() {
            return window.mozRTCPeerConnection.generateCertificate;
          }
        });
      }

      window.RTCSessionDescription = window.mozRTCSessionDescription;
      window.RTCIceCandidate = window.mozRTCIceCandidate;
    }

    // shim away need for obsolete RTCIceCandidate/RTCSessionDescription.
    ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate']
        .forEach(function(method) {
          var nativeMethod = window.RTCPeerConnection.prototype[method];
          window.RTCPeerConnection.prototype[method] = function() {
            arguments[0] = new ((method === 'addIceCandidate') ?
                window.RTCIceCandidate :
                window.RTCSessionDescription)(arguments[0]);
            return nativeMethod.apply(this, arguments);
          };
        });

    // support for addIceCandidate(null or undefined)
    var nativeAddIceCandidate =
        window.RTCPeerConnection.prototype.addIceCandidate;
    window.RTCPeerConnection.prototype.addIceCandidate = function() {
      if (!arguments[0]) {
        if (arguments[1]) {
          arguments[1].apply(null);
        }
        return Promise.resolve();
      }
      return nativeAddIceCandidate.apply(this, arguments);
    };

    // shim getStats with maplike support
    var makeMapStats = function(stats) {
      var map = new Map();
      Object.keys(stats).forEach(function(key) {
        map.set(key, stats[key]);
        map[key] = stats[key];
      });
      return map;
    };

    var modernStatsTypes = {
      inboundrtp: 'inbound-rtp',
      outboundrtp: 'outbound-rtp',
      candidatepair: 'candidate-pair',
      localcandidate: 'local-candidate',
      remotecandidate: 'remote-candidate'
    };

    var nativeGetStats = window.RTCPeerConnection.prototype.getStats;
    window.RTCPeerConnection.prototype.getStats = function(
      selector,
      onSucc,
      onErr
    ) {
      return nativeGetStats.apply(this, [selector || null])
        .then(function(stats) {
          if (browserDetails.version < 48) {
            stats = makeMapStats(stats);
          }
          if (browserDetails.version < 53 && !onSucc) {
            // Shim only promise getStats with spec-hyphens in type names
            // Leave callback version alone; misc old uses of forEach before Map
            try {
              stats.forEach(function(stat) {
                stat.type = modernStatsTypes[stat.type] || stat.type;
              });
            } catch (e) {
              if (e.name !== 'TypeError') {
                throw e;
              }
              // Avoid TypeError: "type" is read-only, in old versions. 34-43ish
              stats.forEach(function(stat, i) {
                stats.set(i, Object.assign({}, stat, {
                  type: modernStatsTypes[stat.type] || stat.type
                }));
              });
            }
          }
          return stats;
        })
        .then(onSucc, onErr);
    };
  },

  shimRemoveStream: function(window) {
    if (!window.RTCPeerConnection ||
        'removeStream' in window.RTCPeerConnection.prototype) {
      return;
    }
    window.RTCPeerConnection.prototype.removeStream = function(stream) {
      var pc = this;
      utils.deprecated('removeStream', 'removeTrack');
      this.getSenders().forEach(function(sender) {
        if (sender.track && stream.getTracks().indexOf(sender.track) !== -1) {
          pc.removeTrack(sender);
        }
      });
    };
  }
};


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/firefox/getusermedia.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */


var utils = __webpack_require__("../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/utils.js");
var logging = utils.log;

// Expose public methods.
module.exports = function(window) {
  var browserDetails = utils.detectBrowser(window);
  var navigator = window && window.navigator;
  var MediaStreamTrack = window && window.MediaStreamTrack;

  var shimError_ = function(e) {
    return {
      name: {
        InternalError: 'NotReadableError',
        NotSupportedError: 'TypeError',
        PermissionDeniedError: 'NotAllowedError',
        SecurityError: 'NotAllowedError'
      }[e.name] || e.name,
      message: {
        'The operation is insecure.': 'The request is not allowed by the ' +
        'user agent or the platform in the current context.'
      }[e.message] || e.message,
      constraint: e.constraint,
      toString: function() {
        return this.name + (this.message && ': ') + this.message;
      }
    };
  };

  // getUserMedia constraints shim.
  var getUserMedia_ = function(constraints, onSuccess, onError) {
    var constraintsToFF37_ = function(c) {
      if (typeof c !== 'object' || c.require) {
        return c;
      }
      var require = [];
      Object.keys(c).forEach(function(key) {
        if (key === 'require' || key === 'advanced' || key === 'mediaSource') {
          return;
        }
        var r = c[key] = (typeof c[key] === 'object') ?
            c[key] : {ideal: c[key]};
        if (r.min !== undefined ||
            r.max !== undefined || r.exact !== undefined) {
          require.push(key);
        }
        if (r.exact !== undefined) {
          if (typeof r.exact === 'number') {
            r. min = r.max = r.exact;
          } else {
            c[key] = r.exact;
          }
          delete r.exact;
        }
        if (r.ideal !== undefined) {
          c.advanced = c.advanced || [];
          var oc = {};
          if (typeof r.ideal === 'number') {
            oc[key] = {min: r.ideal, max: r.ideal};
          } else {
            oc[key] = r.ideal;
          }
          c.advanced.push(oc);
          delete r.ideal;
          if (!Object.keys(r).length) {
            delete c[key];
          }
        }
      });
      if (require.length) {
        c.require = require;
      }
      return c;
    };
    constraints = JSON.parse(JSON.stringify(constraints));
    if (browserDetails.version < 38) {
      logging('spec: ' + JSON.stringify(constraints));
      if (constraints.audio) {
        constraints.audio = constraintsToFF37_(constraints.audio);
      }
      if (constraints.video) {
        constraints.video = constraintsToFF37_(constraints.video);
      }
      logging('ff37: ' + JSON.stringify(constraints));
    }
    return navigator.mozGetUserMedia(constraints, onSuccess, function(e) {
      onError(shimError_(e));
    });
  };

  // Returns the result of getUserMedia as a Promise.
  var getUserMediaPromise_ = function(constraints) {
    return new Promise(function(resolve, reject) {
      getUserMedia_(constraints, resolve, reject);
    });
  };

  // Shim for mediaDevices on older versions.
  if (!navigator.mediaDevices) {
    navigator.mediaDevices = {getUserMedia: getUserMediaPromise_,
      addEventListener: function() { },
      removeEventListener: function() { }
    };
  }
  navigator.mediaDevices.enumerateDevices =
      navigator.mediaDevices.enumerateDevices || function() {
        return new Promise(function(resolve) {
          var infos = [
            {kind: 'audioinput', deviceId: 'default', label: '', groupId: ''},
            {kind: 'videoinput', deviceId: 'default', label: '', groupId: ''}
          ];
          resolve(infos);
        });
      };

  if (browserDetails.version < 41) {
    // Work around http://bugzil.la/1169665
    var orgEnumerateDevices =
        navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
    navigator.mediaDevices.enumerateDevices = function() {
      return orgEnumerateDevices().then(undefined, function(e) {
        if (e.name === 'NotFoundError') {
          return [];
        }
        throw e;
      });
    };
  }
  if (browserDetails.version < 49) {
    var origGetUserMedia = navigator.mediaDevices.getUserMedia.
        bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = function(c) {
      return origGetUserMedia(c).then(function(stream) {
        // Work around https://bugzil.la/802326
        if (c.audio && !stream.getAudioTracks().length ||
            c.video && !stream.getVideoTracks().length) {
          stream.getTracks().forEach(function(track) {
            track.stop();
          });
          throw new DOMException('The object can not be found here.',
                                 'NotFoundError');
        }
        return stream;
      }, function(e) {
        return Promise.reject(shimError_(e));
      });
    };
  }
  if (!(browserDetails.version > 55 &&
      'autoGainControl' in navigator.mediaDevices.getSupportedConstraints())) {
    var remap = function(obj, a, b) {
      if (a in obj && !(b in obj)) {
        obj[b] = obj[a];
        delete obj[a];
      }
    };

    var nativeGetUserMedia = navigator.mediaDevices.getUserMedia.
        bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = function(c) {
      if (typeof c === 'object' && typeof c.audio === 'object') {
        c = JSON.parse(JSON.stringify(c));
        remap(c.audio, 'autoGainControl', 'mozAutoGainControl');
        remap(c.audio, 'noiseSuppression', 'mozNoiseSuppression');
      }
      return nativeGetUserMedia(c);
    };

    if (MediaStreamTrack && MediaStreamTrack.prototype.getSettings) {
      var nativeGetSettings = MediaStreamTrack.prototype.getSettings;
      MediaStreamTrack.prototype.getSettings = function() {
        var obj = nativeGetSettings.apply(this, arguments);
        remap(obj, 'mozAutoGainControl', 'autoGainControl');
        remap(obj, 'mozNoiseSuppression', 'noiseSuppression');
        return obj;
      };
    }

    if (MediaStreamTrack && MediaStreamTrack.prototype.applyConstraints) {
      var nativeApplyConstraints = MediaStreamTrack.prototype.applyConstraints;
      MediaStreamTrack.prototype.applyConstraints = function(c) {
        if (this.kind === 'audio' && typeof c === 'object') {
          c = JSON.parse(JSON.stringify(c));
          remap(c, 'autoGainControl', 'mozAutoGainControl');
          remap(c, 'noiseSuppression', 'mozNoiseSuppression');
        }
        return nativeApplyConstraints.apply(this, [c]);
      };
    }
  }
  navigator.getUserMedia = function(constraints, onSuccess, onError) {
    if (browserDetails.version < 44) {
      return getUserMedia_(constraints, onSuccess, onError);
    }
    // Replace Firefox 44+'s deprecation warning with unprefixed version.
    utils.deprecated('navigator.getUserMedia',
        'navigator.mediaDevices.getUserMedia');
    navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);
  };
};


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/safari/safari_shim.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

var utils = __webpack_require__("../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/utils.js");

module.exports = {
  shimLocalStreamsAPI: function(window) {
    if (typeof window !== 'object' || !window.RTCPeerConnection) {
      return;
    }
    if (!('getLocalStreams' in window.RTCPeerConnection.prototype)) {
      window.RTCPeerConnection.prototype.getLocalStreams = function() {
        if (!this._localStreams) {
          this._localStreams = [];
        }
        return this._localStreams;
      };
    }
    if (!('getStreamById' in window.RTCPeerConnection.prototype)) {
      window.RTCPeerConnection.prototype.getStreamById = function(id) {
        var result = null;
        if (this._localStreams) {
          this._localStreams.forEach(function(stream) {
            if (stream.id === id) {
              result = stream;
            }
          });
        }
        if (this._remoteStreams) {
          this._remoteStreams.forEach(function(stream) {
            if (stream.id === id) {
              result = stream;
            }
          });
        }
        return result;
      };
    }
    if (!('addStream' in window.RTCPeerConnection.prototype)) {
      var _addTrack = window.RTCPeerConnection.prototype.addTrack;
      window.RTCPeerConnection.prototype.addStream = function(stream) {
        if (!this._localStreams) {
          this._localStreams = [];
        }
        if (this._localStreams.indexOf(stream) === -1) {
          this._localStreams.push(stream);
        }
        var pc = this;
        stream.getTracks().forEach(function(track) {
          _addTrack.call(pc, track, stream);
        });
      };

      window.RTCPeerConnection.prototype.addTrack = function(track, stream) {
        if (stream) {
          if (!this._localStreams) {
            this._localStreams = [stream];
          } else if (this._localStreams.indexOf(stream) === -1) {
            this._localStreams.push(stream);
          }
        }
        return _addTrack.call(this, track, stream);
      };
    }
    if (!('removeStream' in window.RTCPeerConnection.prototype)) {
      window.RTCPeerConnection.prototype.removeStream = function(stream) {
        if (!this._localStreams) {
          this._localStreams = [];
        }
        var index = this._localStreams.indexOf(stream);
        if (index === -1) {
          return;
        }
        this._localStreams.splice(index, 1);
        var pc = this;
        var tracks = stream.getTracks();
        this.getSenders().forEach(function(sender) {
          if (tracks.indexOf(sender.track) !== -1) {
            pc.removeTrack(sender);
          }
        });
      };
    }
  },
  shimRemoteStreamsAPI: function(window) {
    if (typeof window !== 'object' || !window.RTCPeerConnection) {
      return;
    }
    if (!('getRemoteStreams' in window.RTCPeerConnection.prototype)) {
      window.RTCPeerConnection.prototype.getRemoteStreams = function() {
        return this._remoteStreams ? this._remoteStreams : [];
      };
    }
    if (!('onaddstream' in window.RTCPeerConnection.prototype)) {
      Object.defineProperty(window.RTCPeerConnection.prototype, 'onaddstream', {
        get: function() {
          return this._onaddstream;
        },
        set: function(f) {
          var pc = this;
          if (this._onaddstream) {
            this.removeEventListener('addstream', this._onaddstream);
            this.removeEventListener('track', this._onaddstreampoly);
          }
          this.addEventListener('addstream', this._onaddstream = f);
          this.addEventListener('track', this._onaddstreampoly = function(e) {
            e.streams.forEach(function(stream) {
              if (!pc._remoteStreams) {
                pc._remoteStreams = [];
              }
              if (pc._remoteStreams.indexOf(stream) >= 0) {
                return;
              }
              pc._remoteStreams.push(stream);
              var event = new Event('addstream');
              event.stream = stream;
              pc.dispatchEvent(event);
            });
          });
        }
      });
    }
  },
  shimCallbacksAPI: function(window) {
    if (typeof window !== 'object' || !window.RTCPeerConnection) {
      return;
    }
    var prototype = window.RTCPeerConnection.prototype;
    var createOffer = prototype.createOffer;
    var createAnswer = prototype.createAnswer;
    var setLocalDescription = prototype.setLocalDescription;
    var setRemoteDescription = prototype.setRemoteDescription;
    var addIceCandidate = prototype.addIceCandidate;

    prototype.createOffer = function(successCallback, failureCallback) {
      var options = (arguments.length >= 2) ? arguments[2] : arguments[0];
      var promise = createOffer.apply(this, [options]);
      if (!failureCallback) {
        return promise;
      }
      promise.then(successCallback, failureCallback);
      return Promise.resolve();
    };

    prototype.createAnswer = function(successCallback, failureCallback) {
      var options = (arguments.length >= 2) ? arguments[2] : arguments[0];
      var promise = createAnswer.apply(this, [options]);
      if (!failureCallback) {
        return promise;
      }
      promise.then(successCallback, failureCallback);
      return Promise.resolve();
    };

    var withCallback = function(description, successCallback, failureCallback) {
      var promise = setLocalDescription.apply(this, [description]);
      if (!failureCallback) {
        return promise;
      }
      promise.then(successCallback, failureCallback);
      return Promise.resolve();
    };
    prototype.setLocalDescription = withCallback;

    withCallback = function(description, successCallback, failureCallback) {
      var promise = setRemoteDescription.apply(this, [description]);
      if (!failureCallback) {
        return promise;
      }
      promise.then(successCallback, failureCallback);
      return Promise.resolve();
    };
    prototype.setRemoteDescription = withCallback;

    withCallback = function(candidate, successCallback, failureCallback) {
      var promise = addIceCandidate.apply(this, [candidate]);
      if (!failureCallback) {
        return promise;
      }
      promise.then(successCallback, failureCallback);
      return Promise.resolve();
    };
    prototype.addIceCandidate = withCallback;
  },
  shimGetUserMedia: function(window) {
    var navigator = window && window.navigator;

    if (!navigator.getUserMedia) {
      if (navigator.webkitGetUserMedia) {
        navigator.getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
      } else if (navigator.mediaDevices &&
          navigator.mediaDevices.getUserMedia) {
        navigator.getUserMedia = function(constraints, cb, errcb) {
          navigator.mediaDevices.getUserMedia(constraints)
          .then(cb, errcb);
        }.bind(navigator);
      }
    }
  },
  shimRTCIceServerUrls: function(window) {
    // migrate from non-spec RTCIceServer.url to RTCIceServer.urls
    var OrigPeerConnection = window.RTCPeerConnection;
    window.RTCPeerConnection = function(pcConfig, pcConstraints) {
      if (pcConfig && pcConfig.iceServers) {
        var newIceServers = [];
        for (var i = 0; i < pcConfig.iceServers.length; i++) {
          var server = pcConfig.iceServers[i];
          if (!server.hasOwnProperty('urls') &&
              server.hasOwnProperty('url')) {
            utils.deprecated('RTCIceServer.url', 'RTCIceServer.urls');
            server = JSON.parse(JSON.stringify(server));
            server.urls = server.url;
            delete server.url;
            newIceServers.push(server);
          } else {
            newIceServers.push(pcConfig.iceServers[i]);
          }
        }
        pcConfig.iceServers = newIceServers;
      }
      return new OrigPeerConnection(pcConfig, pcConstraints);
    };
    window.RTCPeerConnection.prototype = OrigPeerConnection.prototype;
    // wrap static methods. Currently just generateCertificate.
    if ('generateCertificate' in window.RTCPeerConnection) {
      Object.defineProperty(window.RTCPeerConnection, 'generateCertificate', {
        get: function() {
          return OrigPeerConnection.generateCertificate;
        }
      });
    }
  },
  shimTrackEventTransceiver: function(window) {
    // Add event.transceiver member over deprecated event.receiver
    if (typeof window === 'object' && window.RTCPeerConnection &&
        ('receiver' in window.RTCTrackEvent.prototype) &&
        // can't check 'transceiver' in window.RTCTrackEvent.prototype, as it is
        // defined for some reason even when window.RTCTransceiver is not.
        !window.RTCTransceiver) {
      Object.defineProperty(window.RTCTrackEvent.prototype, 'transceiver', {
        get: function() {
          return {receiver: this.receiver};
        }
      });
    }
  },

  shimCreateOfferLegacy: function(window) {
    var origCreateOffer = window.RTCPeerConnection.prototype.createOffer;
    window.RTCPeerConnection.prototype.createOffer = function(offerOptions) {
      var pc = this;
      if (offerOptions) {
        var audioTransceiver = pc.getTransceivers().find(function(transceiver) {
          return transceiver.sender.track &&
              transceiver.sender.track.kind === 'audio';
        });
        if (offerOptions.offerToReceiveAudio === false && audioTransceiver) {
          if (audioTransceiver.direction === 'sendrecv') {
            if (audioTransceiver.setDirection) {
              audioTransceiver.setDirection('sendonly');
            } else {
              audioTransceiver.direction = 'sendonly';
            }
          } else if (audioTransceiver.direction === 'recvonly') {
            if (audioTransceiver.setDirection) {
              audioTransceiver.setDirection('inactive');
            } else {
              audioTransceiver.direction = 'inactive';
            }
          }
        } else if (offerOptions.offerToReceiveAudio === true &&
            !audioTransceiver) {
          pc.addTransceiver('audio');
        }

        var videoTransceiver = pc.getTransceivers().find(function(transceiver) {
          return transceiver.sender.track &&
              transceiver.sender.track.kind === 'video';
        });
        if (offerOptions.offerToReceiveVideo === false && videoTransceiver) {
          if (videoTransceiver.direction === 'sendrecv') {
            videoTransceiver.setDirection('sendonly');
          } else if (videoTransceiver.direction === 'recvonly') {
            videoTransceiver.setDirection('inactive');
          }
        } else if (offerOptions.offerToReceiveVideo === true &&
            !videoTransceiver) {
          pc.addTransceiver('video');
        }
      }
      return origCreateOffer.apply(pc, arguments);
    };
  }
};


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/webrtc-adapter/src/js/utils.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */


var logDisabled_ = true;
var deprecationWarnings_ = true;

/**
 * Extract browser version out of the provided user agent string.
 *
 * @param {!string} uastring userAgent string.
 * @param {!string} expr Regular expression used as match criteria.
 * @param {!number} pos position in the version string to be returned.
 * @return {!number} browser version.
 */
function extractVersion(uastring, expr, pos) {
  var match = uastring.match(expr);
  return match && match.length >= pos && parseInt(match[pos], 10);
}

// Wraps the peerconnection event eventNameToWrap in a function
// which returns the modified event object.
function wrapPeerConnectionEvent(window, eventNameToWrap, wrapper) {
  if (!window.RTCPeerConnection) {
    return;
  }
  var proto = window.RTCPeerConnection.prototype;
  var nativeAddEventListener = proto.addEventListener;
  proto.addEventListener = function(nativeEventName, cb) {
    if (nativeEventName !== eventNameToWrap) {
      return nativeAddEventListener.apply(this, arguments);
    }
    var wrappedCallback = function(e) {
      cb(wrapper(e));
    };
    this._eventMap = this._eventMap || {};
    this._eventMap[cb] = wrappedCallback;
    return nativeAddEventListener.apply(this, [nativeEventName,
      wrappedCallback]);
  };

  var nativeRemoveEventListener = proto.removeEventListener;
  proto.removeEventListener = function(nativeEventName, cb) {
    if (nativeEventName !== eventNameToWrap || !this._eventMap
        || !this._eventMap[cb]) {
      return nativeRemoveEventListener.apply(this, arguments);
    }
    var unwrappedCb = this._eventMap[cb];
    delete this._eventMap[cb];
    return nativeRemoveEventListener.apply(this, [nativeEventName,
      unwrappedCb]);
  };

  Object.defineProperty(proto, 'on' + eventNameToWrap, {
    get: function() {
      return this['_on' + eventNameToWrap];
    },
    set: function(cb) {
      if (this['_on' + eventNameToWrap]) {
        this.removeEventListener(eventNameToWrap,
            this['_on' + eventNameToWrap]);
        delete this['_on' + eventNameToWrap];
      }
      if (cb) {
        this.addEventListener(eventNameToWrap,
            this['_on' + eventNameToWrap] = cb);
      }
    }
  });
}

// Utility methods.
module.exports = {
  extractVersion: extractVersion,
  wrapPeerConnectionEvent: wrapPeerConnectionEvent,
  disableLog: function(bool) {
    if (typeof bool !== 'boolean') {
      return new Error('Argument type: ' + typeof bool +
          '. Please use a boolean.');
    }
    logDisabled_ = bool;
    return (bool) ? 'adapter.js logging disabled' :
        'adapter.js logging enabled';
  },

  /**
   * Disable or enable deprecation warnings
   * @param {!boolean} bool set to true to disable warnings.
   */
  disableWarnings: function(bool) {
    if (typeof bool !== 'boolean') {
      return new Error('Argument type: ' + typeof bool +
          '. Please use a boolean.');
    }
    deprecationWarnings_ = !bool;
    return 'adapter.js deprecation warnings ' + (bool ? 'disabled' : 'enabled');
  },

  log: function() {
    if (typeof window === 'object') {
      if (logDisabled_) {
        return;
      }
      if (typeof console !== 'undefined' && typeof console.log === 'function') {
        console.log.apply(console, arguments);
      }
    }
  },

  /**
   * Shows a deprecation warning suggesting the modern and spec-compatible API.
   */
  deprecated: function(oldMethod, newMethod) {
    if (!deprecationWarnings_) {
      return;
    }
    console.warn(oldMethod + ' is deprecated, please use ' + newMethod +
        ' instead.');
  },

  /**
   * Browser detector.
   *
   * @return {object} result containing browser and version
   *     properties.
   */
  detectBrowser: function(window) {
    var navigator = window && window.navigator;

    // Returned result object.
    var result = {};
    result.browser = null;
    result.version = null;

    // Fail early if it's not a browser
    if (typeof window === 'undefined' || !window.navigator) {
      result.browser = 'Not a browser.';
      return result;
    }

    if (navigator.mozGetUserMedia) { // Firefox.
      result.browser = 'firefox';
      result.version = extractVersion(navigator.userAgent,
          /Firefox\/(\d+)\./, 1);
    } else if (navigator.webkitGetUserMedia) {
      // Chrome, Chromium, Webview, Opera.
      // Version matches Chrome/WebRTC version.
      result.browser = 'chrome';
      result.version = extractVersion(navigator.userAgent,
          /Chrom(e|ium)\/(\d+)\./, 2);
    } else if (navigator.mediaDevices &&
        navigator.userAgent.match(/Edge\/(\d+).(\d+)$/)) { // Edge.
      result.browser = 'edge';
      result.version = extractVersion(navigator.userAgent,
          /Edge\/(\d+).(\d+)$/, 2);
    } else if (navigator.mediaDevices &&
        navigator.userAgent.match(/AppleWebKit\/(\d+)\./)) { // Safari.
      result.browser = 'safari';
      result.version = extractVersion(navigator.userAgent,
          /AppleWebKit\/(\d+)\./, 1);
    } else { // Default fallthrough: not supported.
      result.browser = 'Not a supported browser.';
      return result;
    }

    return result;
  }
};


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/wildemitter/wildemitter.js":
/***/ (function(module, exports) {

/*
WildEmitter.js is a slim little event emitter by @henrikjoreteg largely based
on @visionmedia's Emitter from UI Kit.

Why? I wanted it standalone.

I also wanted support for wildcard emitters like this:

emitter.on('*', function (eventName, other, event, payloads) {

});

emitter.on('somenamespace*', function (eventName, payloads) {

});

Please note that callbacks triggered by wildcard registered events also get
the event name as the first argument.
*/

module.exports = WildEmitter;

function WildEmitter() { }

WildEmitter.mixin = function (constructor) {
    var prototype = constructor.prototype || constructor;

    prototype.isWildEmitter= true;

    // Listen on the given `event` with `fn`. Store a group name if present.
    prototype.on = function (event, groupName, fn) {
        this.callbacks = this.callbacks || {};
        var hasGroup = (arguments.length === 3),
            group = hasGroup ? arguments[1] : undefined,
            func = hasGroup ? arguments[2] : arguments[1];
        func._groupName = group;
        (this.callbacks[event] = this.callbacks[event] || []).push(func);
        return this;
    };

    // Adds an `event` listener that will be invoked a single
    // time then automatically removed.
    prototype.once = function (event, groupName, fn) {
        var self = this,
            hasGroup = (arguments.length === 3),
            group = hasGroup ? arguments[1] : undefined,
            func = hasGroup ? arguments[2] : arguments[1];
        function on() {
            self.off(event, on);
            func.apply(this, arguments);
        }
        this.on(event, group, on);
        return this;
    };

    // Unbinds an entire group
    prototype.releaseGroup = function (groupName) {
        this.callbacks = this.callbacks || {};
        var item, i, len, handlers;
        for (item in this.callbacks) {
            handlers = this.callbacks[item];
            for (i = 0, len = handlers.length; i < len; i++) {
                if (handlers[i]._groupName === groupName) {
                    //console.log('removing');
                    // remove it and shorten the array we're looping through
                    handlers.splice(i, 1);
                    i--;
                    len--;
                }
            }
        }
        return this;
    };

    // Remove the given callback for `event` or all
    // registered callbacks.
    prototype.off = function (event, fn) {
        this.callbacks = this.callbacks || {};
        var callbacks = this.callbacks[event],
            i;

        if (!callbacks) return this;

        // remove all handlers
        if (arguments.length === 1) {
            delete this.callbacks[event];
            return this;
        }

        // remove specific handler
        i = callbacks.indexOf(fn);
        callbacks.splice(i, 1);
        if (callbacks.length === 0) {
            delete this.callbacks[event];
        }
        return this;
    };

    /// Emit `event` with the given args.
    // also calls any `*` handlers
    prototype.emit = function (event) {
        this.callbacks = this.callbacks || {};
        var args = [].slice.call(arguments, 1),
            callbacks = this.callbacks[event],
            specialCallbacks = this.getWildcardCallbacks(event),
            i,
            len,
            item,
            listeners;

        if (callbacks) {
            listeners = callbacks.slice();
            for (i = 0, len = listeners.length; i < len; ++i) {
                if (!listeners[i]) {
                    break;
                }
                listeners[i].apply(this, args);
            }
        }

        if (specialCallbacks) {
            len = specialCallbacks.length;
            listeners = specialCallbacks.slice();
            for (i = 0, len = listeners.length; i < len; ++i) {
                if (!listeners[i]) {
                    break;
                }
                listeners[i].apply(this, [event].concat(args));
            }
        }

        return this;
    };

    // Helper for for finding special wildcard event handlers that match the event
    prototype.getWildcardCallbacks = function (eventName) {
        this.callbacks = this.callbacks || {};
        var item,
            split,
            result = [];

        for (item in this.callbacks) {
            split = item.split('*');
            if (item === '*' || (split.length === 2 && eventName.slice(0, split[0].length) === split[0])) {
                result = result.concat(this.callbacks[item]);
            }
        }
        return result;
    };

};

WildEmitter.mixin(WildEmitter);


/***/ }),

/***/ "../../../../openvidu-browser/node_modules/wolfy87-eventemitter/EventEmitter.js":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_RESULT__;/*!
 * EventEmitter v5.2.4 - git.io/ee
 * Unlicense - http://unlicense.org/
 * Oliver Caldwell - http://oli.me.uk/
 * @preserve
 */

;(function (exports) {
    'use strict';

    /**
     * Class for managing events.
     * Can be extended to provide event functionality in other classes.
     *
     * @class EventEmitter Manages event registering and emitting.
     */
    function EventEmitter() {}

    // Shortcuts to improve speed and size
    var proto = EventEmitter.prototype;
    var originalGlobalValue = exports.EventEmitter;

    /**
     * Finds the index of the listener for the event in its storage array.
     *
     * @param {Function[]} listeners Array of listeners to search through.
     * @param {Function} listener Method to look for.
     * @return {Number} Index of the specified listener, -1 if not found
     * @api private
     */
    function indexOfListener(listeners, listener) {
        var i = listeners.length;
        while (i--) {
            if (listeners[i].listener === listener) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Alias a method while keeping the context correct, to allow for overwriting of target method.
     *
     * @param {String} name The name of the target method.
     * @return {Function} The aliased method
     * @api private
     */
    function alias(name) {
        return function aliasClosure() {
            return this[name].apply(this, arguments);
        };
    }

    /**
     * Returns the listener array for the specified event.
     * Will initialise the event object and listener arrays if required.
     * Will return an object if you use a regex search. The object contains keys for each matched event. So /ba[rz]/ might return an object containing bar and baz. But only if you have either defined them with defineEvent or added some listeners to them.
     * Each property in the object response is an array of listener functions.
     *
     * @param {String|RegExp} evt Name of the event to return the listeners from.
     * @return {Function[]|Object} All listener functions for the event.
     */
    proto.getListeners = function getListeners(evt) {
        var events = this._getEvents();
        var response;
        var key;

        // Return a concatenated array of all matching events if
        // the selector is a regular expression.
        if (evt instanceof RegExp) {
            response = {};
            for (key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    response[key] = events[key];
                }
            }
        }
        else {
            response = events[evt] || (events[evt] = []);
        }

        return response;
    };

    /**
     * Takes a list of listener objects and flattens it into a list of listener functions.
     *
     * @param {Object[]} listeners Raw listener objects.
     * @return {Function[]} Just the listener functions.
     */
    proto.flattenListeners = function flattenListeners(listeners) {
        var flatListeners = [];
        var i;

        for (i = 0; i < listeners.length; i += 1) {
            flatListeners.push(listeners[i].listener);
        }

        return flatListeners;
    };

    /**
     * Fetches the requested listeners via getListeners but will always return the results inside an object. This is mainly for internal use but others may find it useful.
     *
     * @param {String|RegExp} evt Name of the event to return the listeners from.
     * @return {Object} All listener functions for an event in an object.
     */
    proto.getListenersAsObject = function getListenersAsObject(evt) {
        var listeners = this.getListeners(evt);
        var response;

        if (listeners instanceof Array) {
            response = {};
            response[evt] = listeners;
        }

        return response || listeners;
    };

    function isValidListener (listener) {
        if (typeof listener === 'function' || listener instanceof RegExp) {
            return true
        } else if (listener && typeof listener === 'object') {
            return isValidListener(listener.listener)
        } else {
            return false
        }
    }

    /**
     * Adds a listener function to the specified event.
     * The listener will not be added if it is a duplicate.
     * If the listener returns true then it will be removed after it is called.
     * If you pass a regular expression as the event name then the listener will be added to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to attach the listener to.
     * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addListener = function addListener(evt, listener) {
        if (!isValidListener(listener)) {
            throw new TypeError('listener must be a function');
        }

        var listeners = this.getListenersAsObject(evt);
        var listenerIsWrapped = typeof listener === 'object';
        var key;

        for (key in listeners) {
            if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {
                listeners[key].push(listenerIsWrapped ? listener : {
                    listener: listener,
                    once: false
                });
            }
        }

        return this;
    };

    /**
     * Alias of addListener
     */
    proto.on = alias('addListener');

    /**
     * Semi-alias of addListener. It will add a listener that will be
     * automatically removed after its first execution.
     *
     * @param {String|RegExp} evt Name of the event to attach the listener to.
     * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addOnceListener = function addOnceListener(evt, listener) {
        return this.addListener(evt, {
            listener: listener,
            once: true
        });
    };

    /**
     * Alias of addOnceListener.
     */
    proto.once = alias('addOnceListener');

    /**
     * Defines an event name. This is required if you want to use a regex to add a listener to multiple events at once. If you don't do this then how do you expect it to know what event to add to? Should it just add to every possible match for a regex? No. That is scary and bad.
     * You need to tell it what event names should be matched by a regex.
     *
     * @param {String} evt Name of the event to create.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.defineEvent = function defineEvent(evt) {
        this.getListeners(evt);
        return this;
    };

    /**
     * Uses defineEvent to define multiple events.
     *
     * @param {String[]} evts An array of event names to define.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.defineEvents = function defineEvents(evts) {
        for (var i = 0; i < evts.length; i += 1) {
            this.defineEvent(evts[i]);
        }
        return this;
    };

    /**
     * Removes a listener function from the specified event.
     * When passed a regular expression as the event name, it will remove the listener from all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to remove the listener from.
     * @param {Function} listener Method to remove from the event.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeListener = function removeListener(evt, listener) {
        var listeners = this.getListenersAsObject(evt);
        var index;
        var key;

        for (key in listeners) {
            if (listeners.hasOwnProperty(key)) {
                index = indexOfListener(listeners[key], listener);

                if (index !== -1) {
                    listeners[key].splice(index, 1);
                }
            }
        }

        return this;
    };

    /**
     * Alias of removeListener
     */
    proto.off = alias('removeListener');

    /**
     * Adds listeners in bulk using the manipulateListeners method.
     * If you pass an object as the first argument you can add to multiple events at once. The object should contain key value pairs of events and listeners or listener arrays. You can also pass it an event name and an array of listeners to be added.
     * You can also pass it a regular expression to add the array of listeners to all events that match it.
     * Yeah, this function does quite a bit. That's probably a bad thing.
     *
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add to multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to add.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addListeners = function addListeners(evt, listeners) {
        // Pass through to manipulateListeners
        return this.manipulateListeners(false, evt, listeners);
    };

    /**
     * Removes listeners in bulk using the manipulateListeners method.
     * If you pass an object as the first argument you can remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
     * You can also pass it an event name and an array of listeners to be removed.
     * You can also pass it a regular expression to remove the listeners from all events that match it.
     *
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to remove from multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to remove.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeListeners = function removeListeners(evt, listeners) {
        // Pass through to manipulateListeners
        return this.manipulateListeners(true, evt, listeners);
    };

    /**
     * Edits listeners in bulk. The addListeners and removeListeners methods both use this to do their job. You should really use those instead, this is a little lower level.
     * The first argument will determine if the listeners are removed (true) or added (false).
     * If you pass an object as the second argument you can add/remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
     * You can also pass it an event name and an array of listeners to be added/removed.
     * You can also pass it a regular expression to manipulate the listeners of all events that match it.
     *
     * @param {Boolean} remove True if you want to remove listeners, false if you want to add.
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add/remove from multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to add/remove.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.manipulateListeners = function manipulateListeners(remove, evt, listeners) {
        var i;
        var value;
        var single = remove ? this.removeListener : this.addListener;
        var multiple = remove ? this.removeListeners : this.addListeners;

        // If evt is an object then pass each of its properties to this method
        if (typeof evt === 'object' && !(evt instanceof RegExp)) {
            for (i in evt) {
                if (evt.hasOwnProperty(i) && (value = evt[i])) {
                    // Pass the single listener straight through to the singular method
                    if (typeof value === 'function') {
                        single.call(this, i, value);
                    }
                    else {
                        // Otherwise pass back to the multiple function
                        multiple.call(this, i, value);
                    }
                }
            }
        }
        else {
            // So evt must be a string
            // And listeners must be an array of listeners
            // Loop over it and pass each one to the multiple method
            i = listeners.length;
            while (i--) {
                single.call(this, evt, listeners[i]);
            }
        }

        return this;
    };

    /**
     * Removes all listeners from a specified event.
     * If you do not specify an event then all listeners will be removed.
     * That means every event will be emptied.
     * You can also pass a regex to remove all events that match it.
     *
     * @param {String|RegExp} [evt] Optional name of the event to remove all listeners for. Will remove from every event if not passed.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeEvent = function removeEvent(evt) {
        var type = typeof evt;
        var events = this._getEvents();
        var key;

        // Remove different things depending on the state of evt
        if (type === 'string') {
            // Remove all listeners for the specified event
            delete events[evt];
        }
        else if (evt instanceof RegExp) {
            // Remove all events matching the regex.
            for (key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    delete events[key];
                }
            }
        }
        else {
            // Remove all listeners in all events
            delete this._events;
        }

        return this;
    };

    /**
     * Alias of removeEvent.
     *
     * Added to mirror the node API.
     */
    proto.removeAllListeners = alias('removeEvent');

    /**
     * Emits an event of your choice.
     * When emitted, every listener attached to that event will be executed.
     * If you pass the optional argument array then those arguments will be passed to every listener upon execution.
     * Because it uses `apply`, your array of arguments will be passed as if you wrote them out separately.
     * So they will not arrive within the array on the other side, they will be separate.
     * You can also pass a regular expression to emit to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
     * @param {Array} [args] Optional array of arguments to be passed to each listener.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.emitEvent = function emitEvent(evt, args) {
        var listenersMap = this.getListenersAsObject(evt);
        var listeners;
        var listener;
        var i;
        var key;
        var response;

        for (key in listenersMap) {
            if (listenersMap.hasOwnProperty(key)) {
                listeners = listenersMap[key].slice(0);

                for (i = 0; i < listeners.length; i++) {
                    // If the listener returns true then it shall be removed from the event
                    // The function is executed either with a basic call or an apply if there is an args array
                    listener = listeners[i];

                    if (listener.once === true) {
                        this.removeListener(evt, listener.listener);
                    }

                    response = listener.listener.apply(this, args || []);

                    if (response === this._getOnceReturnValue()) {
                        this.removeListener(evt, listener.listener);
                    }
                }
            }
        }

        return this;
    };

    /**
     * Alias of emitEvent
     */
    proto.trigger = alias('emitEvent');

    /**
     * Subtly different from emitEvent in that it will pass its arguments on to the listeners, as opposed to taking a single array of arguments to pass on.
     * As with emitEvent, you can pass a regex in place of the event name to emit to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
     * @param {...*} Optional additional arguments to be passed to each listener.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.emit = function emit(evt) {
        var args = Array.prototype.slice.call(arguments, 1);
        return this.emitEvent(evt, args);
    };

    /**
     * Sets the current value to check against when executing listeners. If a
     * listeners return value matches the one set here then it will be removed
     * after execution. This value defaults to true.
     *
     * @param {*} value The new value to check for when executing listeners.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.setOnceReturnValue = function setOnceReturnValue(value) {
        this._onceReturnValue = value;
        return this;
    };

    /**
     * Fetches the current value to check against when executing listeners. If
     * the listeners return value matches this one then it should be removed
     * automatically. It will return true by default.
     *
     * @return {*|Boolean} The current value to check for or the default, true.
     * @api private
     */
    proto._getOnceReturnValue = function _getOnceReturnValue() {
        if (this.hasOwnProperty('_onceReturnValue')) {
            return this._onceReturnValue;
        }
        else {
            return true;
        }
    };

    /**
     * Fetches the events object and creates one if required.
     *
     * @return {Object} The events storage object.
     * @api private
     */
    proto._getEvents = function _getEvents() {
        return this._events || (this._events = {});
    };

    /**
     * Reverts the global {@link EventEmitter} to its previous value and returns a reference to this version.
     *
     * @return {Function} Non conflicting EventEmitter class.
     */
    EventEmitter.noConflict = function noConflict() {
        exports.EventEmitter = originalGlobalValue;
        return EventEmitter;
    };

    // Expose the class either via AMD, CommonJS or the global object
    if (true) {
        !(__WEBPACK_AMD_DEFINE_RESULT__ = (function () {
            return EventEmitter;
        }).call(exports, __webpack_require__, exports, module),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
    }
    else if (typeof module === 'object' && module.exports){
        module.exports = EventEmitter;
    }
    else {
        exports.EventEmitter = EventEmitter;
    }
}(this || {}));


/***/ }),

/***/ "./src/$$_lazy_route_resource lazy recursive":
/***/ (function(module, exports) {

function webpackEmptyAsyncContext(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncatched exception popping up in devtools
	return Promise.resolve().then(function() {
		throw new Error("Cannot find module '" + req + "'.");
	});
}
webpackEmptyAsyncContext.keys = function() { return []; };
webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
module.exports = webpackEmptyAsyncContext;
webpackEmptyAsyncContext.id = "./src/$$_lazy_route_resource lazy recursive";

/***/ }),

/***/ "./src/app/app.component.css":
/***/ (function(module, exports) {

module.exports = ""

/***/ }),

/***/ "./src/app/app.component.html":
/***/ (function(module, exports) {

module.exports = "<main>\n  <router-outlet></router-outlet>\n</main>"

/***/ }),

/***/ "./src/app/app.component.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AppComponent; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("./node_modules/@angular/core/esm5/core.js");
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};

var AppComponent = (function () {
    function AppComponent() {
    }
    AppComponent = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["n" /* Component */])({
            selector: 'app-root',
            template: __webpack_require__("./src/app/app.component.html"),
            styles: [__webpack_require__("./src/app/app.component.css")]
        })
    ], AppComponent);
    return AppComponent;
}());



/***/ }),

/***/ "./src/app/app.material.module.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AppMaterialModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("./node_modules/@angular/core/esm5/core.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_platform_browser_animations__ = __webpack_require__("./node_modules/@angular/platform-browser/esm5/animations.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__angular_material__ = __webpack_require__("./node_modules/@angular/material/esm5/material.es5.js");
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};



var AppMaterialModule = (function () {
    function AppMaterialModule() {
    }
    AppMaterialModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["K" /* NgModule */])({
            imports: [
                __WEBPACK_IMPORTED_MODULE_1__angular_platform_browser_animations__["a" /* BrowserAnimationsModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["a" /* MatButtonModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["f" /* MatIconModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["c" /* MatCheckboxModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["b" /* MatCardModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["g" /* MatInputModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["i" /* MatProgressSpinnerModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["k" /* MatTooltipModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["e" /* MatDialogModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["j" /* MatSlideToggleModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["h" /* MatListModule */]
            ],
            exports: [
                __WEBPACK_IMPORTED_MODULE_1__angular_platform_browser_animations__["a" /* BrowserAnimationsModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["a" /* MatButtonModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["f" /* MatIconModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["c" /* MatCheckboxModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["b" /* MatCardModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["g" /* MatInputModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["i" /* MatProgressSpinnerModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["k" /* MatTooltipModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["e" /* MatDialogModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["j" /* MatSlideToggleModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["h" /* MatListModule */]
            ],
        })
    ], AppMaterialModule);
    return AppMaterialModule;
}());



/***/ }),

/***/ "./src/app/app.module.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AppModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_platform_browser__ = __webpack_require__("./node_modules/@angular/platform-browser/esm5/platform-browser.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_flex_layout__ = __webpack_require__("./node_modules/@angular/flex-layout/esm5/flex-layout.es5.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__angular_core__ = __webpack_require__("./node_modules/@angular/core/esm5/core.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__angular_forms__ = __webpack_require__("./node_modules/@angular/forms/esm5/forms.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__angular_http__ = __webpack_require__("./node_modules/@angular/http/esm5/http.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_hammerjs__ = __webpack_require__("./node_modules/hammerjs/hammer.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_hammerjs___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_5_hammerjs__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__app_routing__ = __webpack_require__("./src/app/app.routing.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7_app_app_material_module__ = __webpack_require__("./src/app/app.material.module.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__services_info_service__ = __webpack_require__("./src/app/services/info.service.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__app_component__ = __webpack_require__("./src/app/app.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10__components_dashboard_dashboard_component__ = __webpack_require__("./src/app/components/dashboard/dashboard.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11__components_session_details_session_details_component__ = __webpack_require__("./src/app/components/session-details/session-details.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12__components_dashboard_credentials_dialog_component__ = __webpack_require__("./src/app/components/dashboard/credentials-dialog.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_13__components_layouts_layout_best_fit_layout_best_fit_component__ = __webpack_require__("./src/app/components/layouts/layout-best-fit/layout-best-fit.component.ts");
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};














var AppModule = (function () {
    function AppModule() {
    }
    AppModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_2__angular_core__["K" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_9__app_component__["a" /* AppComponent */],
                __WEBPACK_IMPORTED_MODULE_10__components_dashboard_dashboard_component__["a" /* DashboardComponent */],
                __WEBPACK_IMPORTED_MODULE_11__components_session_details_session_details_component__["a" /* SessionDetailsComponent */],
                __WEBPACK_IMPORTED_MODULE_12__components_dashboard_credentials_dialog_component__["a" /* CredentialsDialogComponent */],
                __WEBPACK_IMPORTED_MODULE_13__components_layouts_layout_best_fit_layout_best_fit_component__["a" /* LayoutBestFitComponent */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_0__angular_platform_browser__["a" /* BrowserModule */],
                __WEBPACK_IMPORTED_MODULE_3__angular_forms__["c" /* FormsModule */],
                __WEBPACK_IMPORTED_MODULE_4__angular_http__["a" /* HttpModule */],
                __WEBPACK_IMPORTED_MODULE_6__app_routing__["a" /* routing */],
                __WEBPACK_IMPORTED_MODULE_7_app_app_material_module__["a" /* AppMaterialModule */],
                __WEBPACK_IMPORTED_MODULE_1__angular_flex_layout__["a" /* FlexLayoutModule */]
            ],
            entryComponents: [
                __WEBPACK_IMPORTED_MODULE_12__components_dashboard_credentials_dialog_component__["a" /* CredentialsDialogComponent */],
            ],
            providers: [__WEBPACK_IMPORTED_MODULE_8__services_info_service__["a" /* InfoService */]],
            bootstrap: [__WEBPACK_IMPORTED_MODULE_9__app_component__["a" /* AppComponent */]]
        })
    ], AppModule);
    return AppModule;
}());



/***/ }),

/***/ "./src/app/app.routing.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return routing; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_router__ = __webpack_require__("./node_modules/@angular/router/esm5/router.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_app_components_dashboard_dashboard_component__ = __webpack_require__("./src/app/components/dashboard/dashboard.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_app_components_session_details_session_details_component__ = __webpack_require__("./src/app/components/session-details/session-details.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_app_components_layouts_layout_best_fit_layout_best_fit_component__ = __webpack_require__("./src/app/components/layouts/layout-best-fit/layout-best-fit.component.ts");




var appRoutes = [
    {
        path: '',
        component: __WEBPACK_IMPORTED_MODULE_1_app_components_dashboard_dashboard_component__["a" /* DashboardComponent */],
        pathMatch: 'full'
    },
    {
        path: 'session/:sessionId',
        component: __WEBPACK_IMPORTED_MODULE_2_app_components_session_details_session_details_component__["a" /* SessionDetailsComponent */],
        pathMatch: 'full'
    },
    {
        path: 'layout-best-fit/:sessionId/:secret',
        component: __WEBPACK_IMPORTED_MODULE_3_app_components_layouts_layout_best_fit_layout_best_fit_component__["a" /* LayoutBestFitComponent */],
        pathMatch: 'full'
    }
];
var routing = __WEBPACK_IMPORTED_MODULE_0__angular_router__["b" /* RouterModule */].forRoot(appRoutes, { useHash: true });


/***/ }),

/***/ "./src/app/components/dashboard/credentials-dialog.component.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CredentialsDialogComponent; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("./node_modules/@angular/core/esm5/core.js");
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};

var CredentialsDialogComponent = (function () {
    function CredentialsDialogComponent() {
    }
    CredentialsDialogComponent.prototype.testVideo = function () {
        this.myReference.close(this.secret);
    };
    CredentialsDialogComponent = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["n" /* Component */])({
            selector: 'app-credentials-dialog',
            template: "\n        <div>\n            <h1 mat-dialog-title>\n                Insert your secret\n            </h1>\n            <form #dialogForm (ngSubmit)=\"testVideo()\">\n                <mat-dialog-content>\n                    <mat-input-container>\n                        <input matInput name=\"secret\" type=\"password\" [(ngModel)]=\"secret\">\n                    </mat-input-container>\n                </mat-dialog-content>\n                <mat-dialog-actions>\n                    <button mat-button mat-dialog-close>CANCEL</button>\n                    <button mat-button id=\"join-btn\" type=\"submit\">TEST</button>\n                </mat-dialog-actions>\n            </form>\n        </div>\n    ",
            styles: ["\n        #quality-div {\n            margin-top: 20px;\n        }\n        #join-div {\n            margin-top: 25px;\n            margin-bottom: 20px;\n        }\n        #quality-tag {\n            display: block;\n        }\n        h5 {\n            margin-bottom: 10px;\n            text-align: left;\n        }\n        #joinWithVideo {\n            margin-right: 50px;\n        }\n        mat-dialog-actions {\n            display: block;\n        }\n        #join-btn {\n            float: right;\n        }\n    "],
        }),
        __metadata("design:paramtypes", [])
    ], CredentialsDialogComponent);
    return CredentialsDialogComponent;
}());



/***/ }),

/***/ "./src/app/components/dashboard/dashboard.component.css":
/***/ (function(module, exports) {

module.exports = "#dashboard-div {\n  padding: 20px;\n}\n\n#log {\n  height: 90%;\n}\n\n#log-content {\n  height: 90%;\n  font-family: Consolas, 'Liberation Mono', Menlo, Courier, monospace;\n  overflow-y: auto;\n  overflow-x: hidden\n}\n\nul {\n  margin: 0;\n}\n\n#test-btn {\n  text-transform: uppercase;\n  float: right;\n}\n\nmat-card-title button.blue {\n  color: #ffffff;\n  background-color: #0088aa;\n}\n\nmat-card-title button.yellow {\n  color: rgba(0, 0, 0, 0.87);\n  background-color: #ffcc00;\n}\n\nmat-spinner {\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  -webkit-transform: translate(-50%, -50%);\n          transform: translate(-50%, -50%);\n}\n\n#tick-div {\n  width: 100px;\n  height: 100px;\n  z-index: 1;\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  -webkit-transform: translate(-50%, -50%);\n          transform: translate(-50%, -50%);\n}\n\n#tooltip-tick {\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  z-index: 2;\n}\n\n.circ {\n  opacity: 0;\n  stroke-dasharray: 130;\n  stroke-dashoffset: 130;\n  -webkit-transition: all 1s;\n  transition: all 1s;\n}\n\n.tick {\n  stroke-dasharray: 50;\n  stroke-dashoffset: 50;\n  -webkit-transition: stroke-dashoffset 1s 0.5s ease-out;\n  transition: stroke-dashoffset 1s 0.5s ease-out;\n}\n\n.drawn+svg .path {\n  opacity: 1;\n  stroke-dashoffset: 0;\n}\n\n#mirrored-video {\n  position: relative;\n}\n\n/* Pure CSS loader */\n\n#loader {\n  width: 100px;\n  height: 100px;\n  z-index: 1;\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  -webkit-transform: translate(-50%, -50%);\n  transform: translate(-50%, -50%);\n}\n\n#loader * {\n  -webkit-box-sizing: border-box;\n  box-sizing: border-box;\n}\n\n#loader ::after {\n  -webkit-box-sizing: border-box;\n  box-sizing: border-box;\n}\n\n#loader ::before {\n  -webkit-box-sizing: border-box;\n  box-sizing: border-box;\n}\n\n.loader-1 {\n  height: 100px;\n  width: 100px;\n  -webkit-animation: loader-1-1 4.8s linear infinite;\n  animation: loader-1-1 4.8s linear infinite;\n}\n\n@-webkit-keyframes loader-1-1 {\n  0% {\n    -webkit-transform: rotate(0deg);\n  }\n  100% {\n    -webkit-transform: rotate(360deg);\n  }\n}\n\n@keyframes loader-1-1 {\n  0% {\n    -webkit-transform: rotate(0deg);\n            transform: rotate(0deg);\n  }\n  100% {\n    -webkit-transform: rotate(360deg);\n            transform: rotate(360deg);\n  }\n}\n\n.loader-1 span {\n  display: block;\n  position: absolute;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  right: 0;\n  margin: auto;\n  height: 100px;\n  width: 100px;\n  clip: rect(0, 100px, 100px, 50px);\n  -webkit-animation: loader-1-2 1.2s linear infinite;\n  animation: loader-1-2 1.2s linear infinite;\n}\n\n@-webkit-keyframes loader-1-2 {\n  0% {\n    -webkit-transform: rotate(0deg);\n  }\n  100% {\n    -webkit-transform: rotate(220deg);\n  }\n}\n\n@keyframes loader-1-2 {\n  0% {\n    -webkit-transform: rotate(0deg);\n            transform: rotate(0deg);\n  }\n  100% {\n    -webkit-transform: rotate(220deg);\n            transform: rotate(220deg);\n  }\n}\n\n.loader-1 span::after {\n  content: \"\";\n  position: absolute;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  right: 0;\n  margin: auto;\n  height: 100px;\n  width: 100px;\n  clip: rect(0, 100px, 100px, 50px);\n  border: 8px solid #4d4d4d;\n  border-radius: 50%;\n  -webkit-animation: loader-1-3 1.2s cubic-bezier(0.770, 0.000, 0.175, 1.000) infinite;\n  animation: loader-1-3 1.2s cubic-bezier(0.770, 0.000, 0.175, 1.000) infinite;\n}\n\n@-webkit-keyframes loader-1-3 {\n  0% {\n    -webkit-transform: rotate(-140deg);\n  }\n  50% {\n    -webkit-transform: rotate(-160deg);\n  }\n  100% {\n    -webkit-transform: rotate(140deg);\n  }\n}\n\n@keyframes loader-1-3 {\n  0% {\n    -webkit-transform: rotate(-140deg);\n            transform: rotate(-140deg);\n  }\n  50% {\n    -webkit-transform: rotate(-160deg);\n            transform: rotate(-160deg);\n  }\n  100% {\n    -webkit-transform: rotate(140deg);\n            transform: rotate(140deg);\n  }\n}"

/***/ }),

/***/ "./src/app/components/dashboard/dashboard.component.html":
/***/ (function(module, exports) {

module.exports = "<div id=\"dashboard-div\" fxLayout=\"row\" fxLayout.xs=\"column\" fxLayoutGap=\"20px\" fxFlexFill>\n\n  <div fxLayout=\"column\" fxFlex=\"66%\" fxFlexOrder=\"1\" fxFlexOrder.xs=\"2\">\n    <mat-card id=\"log\">\n      <mat-card-title>Server events\n        <mat-slide-toggle title=\"Lock Scroll\" [(ngModel)]=\"lockScroll\" style=\"float: right; margin-left: auto;\">\n          <mat-icon>lock_outline</mat-icon>\n        </mat-slide-toggle>\n      </mat-card-title>\n      <mat-divider></mat-divider>\n      <mat-card-content #scrollMe id=\"log-content\">\n        <ul>\n          <li *ngFor=\"let i of info\">\n            <p>{{i}}</p>\n          </li>\n        </ul>\n      </mat-card-content>\n    </mat-card>\n  </div>\n\n  <div fxLayout=\"column\" fxFlex=\"33%\" fxFlexOrder=\"2\" fxFlexOrder.xs=\"1\">\n    <mat-card id=\"video-loop\">\n      <mat-card-title>Test the connection\n        <button id=\"test-btn\" mat-raised-button [ngClass]=\"testStatus == 'DISCONNECTED' ? 'blue' : (testStatus == 'PLAYING' ? 'yellow' : 'disabled')\" (click)=\"toggleTestVideo()\" [disabled]=\"testStatus==='CONNECTING' || testStatus==='CONNECTED'\">{{testButton}}</button>\n      </mat-card-title>\n      <mat-card-content>\n        <div id=\"mirrored-video\">\n          <div *ngIf=\"showSpinner\" id=\"loader\">\n            <div class=\"loader-1 center\"><span></span></div>\n          </div>\n          <div *ngIf=\"session\" id=\"tick-div\">\n            <div id=\"tooltip-tick\" *ngIf=\"testStatus=='PLAYING'\" matTooltip=\"The connection is successful\" matTooltipPosition=\"below\"></div>\n            <div [ngClass]=\"testStatus=='PLAYING' ? 'trigger drawn' : 'trigger'\"></div>\n            <svg version=\"1.1\" id=\"tick\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\n              viewBox=\"-1 -1 39 39\" style=\"enable-background:new 0 0 37 37;\" xml:space=\"preserve\">\n              <path class=\"circ path\" style=\"fill:none;stroke:#06d362;stroke-width:4;stroke-linejoin:round;stroke-miterlimit:10;\" d=\"\n\tM30.5,6.5L30.5,6.5c6.6,6.6,6.6,17.4,0,24l0,0c-6.6,6.6-17.4,6.6-24,0l0,0c-6.6-6.6-6.6-17.4,0-24l0,0C13.1-0.2,23.9-0.2,30.5,6.5z\"\n              />\n              <polyline class=\"tick path\" style=\"fill:none;stroke:#06d362;stroke-width:4;stroke-linejoin:round;stroke-miterlimit:10;\" points=\"\n\t11.6,20 15.9,24.2 26.4,13.8 \" />\n            </svg>\n          </div>\n        </div>\n        <div id=\"msg-chain\"><p *ngFor=\"let msg of msgChain\">{{msg}}</p></div>\n      </mat-card-content>\n    </mat-card>\n  </div>\n</div>\n"

/***/ }),

/***/ "./src/app/components/dashboard/dashboard.component.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return DashboardComponent; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("./node_modules/@angular/core/esm5/core.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_material__ = __webpack_require__("./node_modules/@angular/material/esm5/material.es5.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__services_info_service__ = __webpack_require__("./src/app/services/info.service.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_openvidu_browser__ = __webpack_require__("../../../../openvidu-browser/lib/OpenVidu/index.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_openvidu_browser___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3_openvidu_browser__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__credentials_dialog_component__ = __webpack_require__("./src/app/components/dashboard/credentials-dialog.component.ts");
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};





var DashboardComponent = (function () {
    function DashboardComponent(infoService, dialog) {
        var _this = this;
        this.infoService = infoService;
        this.dialog = dialog;
        this.lockScroll = false;
        this.info = [];
        this.testStatus = 'DISCONNECTED';
        this.testButton = 'Test';
        this.tickClass = 'trigger';
        this.showSpinner = false;
        this.msgChain = [];
        // Subscription to info updated event raised by InfoService
        this.infoSubscription = this.infoService.newInfo$.subscribe(function (info) {
            _this.info.push(info);
            _this.scrollToBottom();
        });
    }
    DashboardComponent.prototype.ngOnInit = function () {
        var _this = this;
        var protocol = location.protocol.includes('https') ? 'wss://' : 'ws://';
        var port = (location.port) ? (':' + location.port) : '';
        this.websocket = new WebSocket(protocol + location.hostname + port + '/info');
        this.websocket.onopen = function (event) {
            console.log('Info websocket connected');
        };
        this.websocket.onclose = function (event) {
            console.log('Info websocket closed');
        };
        this.websocket.onerror = function (event) {
            console.log('Info websocket error');
        };
        this.websocket.onmessage = function (event) {
            console.log('Info websocket message');
            console.log(event.data);
            _this.infoService.updateInfo(event.data);
        };
    };
    DashboardComponent.prototype.beforeunloadHandler = function () {
        // On window closed leave test session and close info websocket
        if (this.session) {
            this.endTestVideo();
        }
        this.websocket.close();
    };
    DashboardComponent.prototype.ngOnDestroy = function () {
        // On component destroyed leave test session and close info websocket
        if (this.session) {
            this.endTestVideo();
        }
        this.websocket.close();
    };
    DashboardComponent.prototype.toggleTestVideo = function () {
        if (!this.session) {
            this.testVideo();
        }
        else {
            this.endTestVideo();
        }
    };
    DashboardComponent.prototype.testVideo = function () {
        var _this = this;
        var dialogRef;
        dialogRef = this.dialog.open(__WEBPACK_IMPORTED_MODULE_4__credentials_dialog_component__["a" /* CredentialsDialogComponent */]);
        dialogRef.componentInstance.myReference = dialogRef;
        dialogRef.afterClosed().subscribe(function (secret) {
            if (secret) {
                var port = (location.port) ? location.port : '8443';
                _this.connectToSession('wss://' + location.hostname + ':' + port + '/testSession?secret=' + secret);
            }
        });
    };
    DashboardComponent.prototype.connectToSession = function (mySessionId) {
        var _this = this;
        this.msgChain = [];
        var OV = new __WEBPACK_IMPORTED_MODULE_3_openvidu_browser__["OpenVidu"]();
        this.session = OV.initSession(mySessionId);
        this.testStatus = 'CONNECTING';
        this.testButton = 'Testing...';
        this.session.connect('token', function (error) {
            if (!error) {
                _this.testStatus = 'CONNECTED';
                var publisherRemote = OV.initPublisher('mirrored-video', {
                    audio: true,
                    video: true,
                    audioActive: true,
                    videoActive: true,
                    quality: 'MEDIUM'
                });
                publisherRemote.on('accessAllowed', function () {
                    _this.msgChain.push('Camera access allowed');
                });
                publisherRemote.on('accessDenied', function () {
                    _this.endTestVideo();
                    _this.msgChain.push('Camera access denied');
                });
                publisherRemote.on('videoElementCreated', function (video) {
                    _this.showSpinner = true;
                    _this.msgChain.push('Video element created');
                });
                publisherRemote.on('remoteVideoPlaying', function (video) {
                    _this.msgChain.push('Remote video playing');
                    _this.testButton = 'End test';
                    _this.testStatus = 'PLAYING';
                    _this.showSpinner = false;
                });
                publisherRemote.subscribeToRemote();
                _this.session.publish(publisherRemote);
            }
            else {
                if (error.code === 401) {
                    _this.endTestVideo();
                    var dialogRef = void 0;
                    dialogRef = _this.dialog.open(__WEBPACK_IMPORTED_MODULE_4__credentials_dialog_component__["a" /* CredentialsDialogComponent */]);
                    dialogRef.componentInstance.myReference = dialogRef;
                    dialogRef.afterClosed().subscribe(function (secret) {
                        if (secret) {
                            _this.connectToSession('wss://' + location.hostname + ':8443/testSession?secret=' + secret);
                        }
                    });
                }
                else {
                    console.error(error);
                }
            }
        });
    };
    DashboardComponent.prototype.endTestVideo = function () {
        this.session.disconnect();
        this.session = null;
        this.testStatus = 'DISCONNECTED';
        this.testButton = 'Test';
        this.showSpinner = false;
        this.info = [];
        this.msgChain = [];
    };
    DashboardComponent.prototype.scrollToBottom = function () {
        try {
            if (!this.lockScroll) {
                this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
            }
        }
        catch (err) {
            console.error('[Error]:' + err.toString());
        }
    };
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_12" /* ViewChild */])('scrollMe'),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_0__angular_core__["u" /* ElementRef */])
    ], DashboardComponent.prototype, "myScrollContainer", void 0);
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["A" /* HostListener */])('window:beforeunload'),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], DashboardComponent.prototype, "beforeunloadHandler", null);
    DashboardComponent = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["n" /* Component */])({
            selector: 'app-dashboard',
            template: __webpack_require__("./src/app/components/dashboard/dashboard.component.html"),
            styles: [__webpack_require__("./src/app/components/dashboard/dashboard.component.css")],
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_2__services_info_service__["a" /* InfoService */], __WEBPACK_IMPORTED_MODULE_1__angular_material__["d" /* MatDialog */]])
    ], DashboardComponent);
    return DashboardComponent;
}());



/***/ }),

/***/ "./src/app/components/layouts/layout-best-fit/layout-best-fit.component.css":
/***/ (function(module, exports) {

module.exports = ".bounds {\n  background-color: black;\n  overflow: hidden;\n  cursor: none !important;\n  position: absolute;\n  left: 0;\n  right: 0;\n  top: 0;\n  bottom: 0;\n}\n\nvideo {\n  -o-object-fit: cover;\n  object-fit: cover;\n  display: block;\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  color: #ffffff;\n  margin: 0;\n  padding: 0;\n  border: 0;\n  font-size: 100%;\n  font-family: Arial, Helvetica, sans-serif;\n}\n\n/*!\n * Copyright (c) 2017 TokBox, Inc.\n * Released under the MIT license\n * http://opensource.org/licenses/MIT\n */\n\n.custom-class {\n  min-height: 0px !important;\n}\n\n/**\n * OT Base styles\n */\n\n/* Root OT object, this is where our CSS reset happens */\n\n.OT_root,\n.OT_root * {\n  color: #ffffff;\n  margin: 0;\n  padding: 0;\n  border: 0;\n  font-size: 100%;\n  font-family: Arial, Helvetica, sans-serif;\n  vertical-align: baseline;\n}\n\n.OT_dialog-centering {\n  display: table;\n  width: 100%;\n  height: 100%;\n}\n\n.OT_dialog-centering-child {\n  display: table-cell;\n  vertical-align: middle;\n}\n\n.OT_dialog {\n  position: relative;\n\n  -webkit-box-sizing: border-box;\n\n          box-sizing: border-box;\n  max-width: 576px;\n  margin-right: auto;\n  margin-left: auto;\n  padding: 36px;\n  text-align: center; /* centers all the inline content */\n\n  background-color: #363636;\n  color: #fff;\n  -webkit-box-shadow: 2px 4px 6px #999;\n          box-shadow: 2px 4px 6px #999;\n  font-family: 'Didact Gothic', sans-serif;\n  font-size: 13px;\n  line-height: 1.4;\n}\n\n.OT_dialog * {\n  font-family: inherit;\n  -webkit-box-sizing: inherit;\n          box-sizing: inherit;\n}\n\n.OT_closeButton {\n  color: #999999;\n  cursor: pointer;\n  font-size: 32px;\n  line-height: 36px;\n  position: absolute;\n  right: 18px;\n  top: 0;\n}\n\n.OT_dialog-messages {\n  text-align: center;\n}\n\n.OT_dialog-messages-main {\n  margin-bottom: 36px;\n  line-height: 36px;\n\n  font-weight: 300;\n  font-size: 24px;\n}\n\n.OT_dialog-messages-minor {\n  margin-bottom: 18px;\n\n  font-size: 13px;\n  line-height: 18px;\n  color: #A4A4A4;\n}\n\n.OT_dialog-messages-minor strong {\n  color: #ffffff;\n}\n\n.OT_dialog-actions-card {\n  display: inline-block;\n}\n\n.OT_dialog-button-title {\n  margin-bottom: 18px;\n  line-height: 18px;\n\n  font-weight: 300;\n  text-align: center;\n  font-size: 14px;\n  color: #999999;\n}\n\n.OT_dialog-button-title label {\n  color: #999999;\n}\n\n.OT_dialog-button-title a,\n.OT_dialog-button-title a:link,\n.OT_dialog-button-title a:active {\n  color: #02A1DE;\n}\n\n.OT_dialog-button-title strong {\n  color: #ffffff;\n  font-weight: 100;\n  display: block;\n}\n\n.OT_dialog-button {\n  display: inline-block;\n\n  margin-bottom: 18px;\n  padding: 0 1em;\n\n  background-color: #1CA3DC;\n  text-align: center;\n  cursor: pointer;\n}\n\n.OT_dialog-button:disabled {\n  cursor: not-allowed;\n  opacity: 0.5;\n}\n\n.OT_dialog-button-large {\n  line-height: 36px;\n  padding-top: 9px;\n  padding-bottom: 9px;\n\n  font-weight: 100;\n  font-size: 24px;\n}\n\n.OT_dialog-button-small {\n  line-height: 18px;\n  padding-top: 9px;\n  padding-bottom: 9px;\n\n  background-color: #444444;\n  color: #999999;\n  font-size: 16px;\n}\n\n.OT_dialog-progress-bar {\n  display: inline-block; /* prevents margin collapse */\n  width: 100%;\n  margin-top: 5px;\n  margin-bottom: 41px;\n\n  border: 1px solid #4E4E4E;\n  height: 8px;\n}\n\n.OT_dialog-progress-bar-fill {\n  height: 100%;\n\n  background-color: #29A4DA;\n}\n\n.OT_dialog-plugin-upgrading .OT_dialog-plugin-upgrade-percentage {\n  line-height: 54px;\n\n  font-size: 48px;\n  font-weight: 100;\n}\n\n/* Helpers */\n\n.OT_centered {\n  position: fixed;\n  left: 50%;\n  top: 50%;\n  margin: 0;\n}\n\n.OT_dialog-hidden {\n  display: none;\n}\n\n.OT_dialog-button-block {\n  display: block;\n}\n\n.OT_dialog-no-natural-margin {\n  margin-bottom: 0;\n}\n\n/* Publisher and Subscriber styles */\n\n.OT_publisher, .OT_subscriber {\n  position: relative;\n  min-width: 48px;\n  min-height: 48px;\n}\n\n.OT_publisher .OT_video-element,\n.OT_subscriber .OT_video-element {\n  display: block;\n  position: absolute;\n  width: 100%;\n  height: 100%;\n\n  -webkit-transform-origin: 0 0;\n\n          transform-origin: 0 0;\n}\n\n/* Styles that are applied when the video element should be mirrored */\n\n.OT_publisher.OT_mirrored .OT_video-element {\n  -webkit-transform: scale(-1, 1);\n          transform: scale(-1, 1);\n  -webkit-transform-origin: 50% 50%;\n          transform-origin: 50% 50%;\n}\n\n.OT_subscriber_error {\n  background-color: #000;\n  color: #fff;\n  text-align: center;\n}\n\n.OT_subscriber_error > p {\n  padding: 20px;\n}\n\n/* The publisher/subscriber name/mute background */\n\n.OT_publisher .OT_bar,\n.OT_subscriber .OT_bar,\n.OT_publisher .OT_name,\n.OT_subscriber .OT_name,\n.OT_publisher .OT_archiving,\n.OT_subscriber .OT_archiving,\n.OT_publisher .OT_archiving-status,\n.OT_subscriber .OT_archiving-status,\n.OT_publisher .OT_archiving-light-box,\n.OT_subscriber .OT_archiving-light-box {\n  -webkit-box-sizing: border-box;\n  -ms-box-sizing: border-box;\n  box-sizing: border-box;\n  top: 0;\n  left: 0;\n  right: 0;\n  display: block;\n  height: 34px;\n  position: absolute;\n}\n\n.OT_publisher .OT_bar,\n.OT_subscriber .OT_bar {\n  background: rgba(0, 0, 0, 0.4);\n}\n\n.OT_publisher .OT_edge-bar-item,\n.OT_subscriber .OT_edge-bar-item {\n  z-index: 1; /* required to get audio level meter underneath */\n}\n\n/* The publisher/subscriber name panel/archiving status bar */\n\n.OT_publisher .OT_name,\n.OT_subscriber .OT_name {\n  background-color: transparent;\n  color: #ffffff;\n  font-size: 15px;\n  line-height: 34px;\n  font-weight: normal;\n  padding: 0 4px 0 36px;\n}\n\n.OT_publisher .OT_archiving-status,\n.OT_subscriber .OT_archiving-status {\n  background: rgba(0, 0, 0, 0.4);\n  top: auto;\n  bottom: 0;\n  left: 34px;\n  padding: 0 4px;\n  color: rgba(255, 255, 255, 0.8);\n  font-size: 15px;\n  line-height: 34px;\n  font-weight: normal;\n}\n\n.OT_micro .OT_archiving-status,\n.OT_micro:hover .OT_archiving-status,\n.OT_mini .OT_archiving-status,\n.OT_mini:hover .OT_archiving-status {\n  display: none;\n}\n\n.OT_publisher .OT_archiving-light-box,\n.OT_subscriber .OT_archiving-light-box {\n  background: rgba(0, 0, 0, 0.4);\n  top: auto;\n  bottom: 0;\n  right: auto;\n  width: 34px;\n  height: 34px;\n}\n\n.OT_archiving-light {\n  width: 7px;\n  height: 7px;\n  border-radius: 30px;\n  position: absolute;\n  top: 14px;\n  left: 14px;\n  background-color: #575757;\n  -webkit-box-shadow: 0 0 5px 1px #575757;\n  box-shadow: 0 0 5px 1px #575757;\n}\n\n.OT_archiving-light.OT_active {\n  background-color: #970d13;\n  animation: OT_pulse 1.3s ease-in;\n  -webkit-animation: OT_pulse 1.3s ease-in;\n  -moz-animation: OT_pulse 1.3s ease-in;\n  -webkit-animation: OT_pulse 1.3s ease-in;\n  animation-iteration-count: infinite;\n  -webkit-animation-iteration-count: infinite;\n  -moz-animation-iteration-count: infinite;\n  -webkit-animation-iteration-count: infinite;\n}\n\n@-webkit-keyframes OT_pulse {\n  0% {\n    -webkit-box-shadow: 0 0 0px 0px #c70019;\n    box-shadow: 0 0 0px 0px #c70019;\n  }\n\n  30% {\n    -webkit-box-shadow: 0 0 5px 1px #c70019;\n    box-shadow: 0 0 5px 1px #c70019;\n  }\n\n  50% {\n    -webkit-box-shadow: 0 0 5px 1px #c70019;\n    box-shadow: 0 0 5px 1px #c70019;\n  }\n\n  80% {\n    -webkit-box-shadow: 0 0 0px 0px #c70019;\n    box-shadow: 0 0 0px 0px #c70019;\n  }\n\n  100% {\n    -webkit-box-shadow: 0 0 0px 0px #c70019;\n    box-shadow: 0 0 0px 0px #c70019;\n  }\n}\n\n@-webkit-keyframes OT_pulse {\n  0% {\n    -webkit-box-shadow: 0 0 0px 0px #c70019;\n    box-shadow: 0 0 0px 0px #c70019;\n  }\n\n  30% {\n    -webkit-box-shadow: 0 0 5px 1px #c70019;\n    box-shadow: 0 0 5px 1px #c70019;\n  }\n\n  50% {\n    -webkit-box-shadow: 0 0 5px 1px #c70019;\n    box-shadow: 0 0 5px 1px #c70019;\n  }\n\n  80% {\n    -webkit-box-shadow: 0 0 0px 0px #c70019;\n    box-shadow: 0 0 0px 0px #c70019;\n  }\n\n  100% {\n    -webkit-box-shadow: 0 0 0px 0px #c70019;\n    box-shadow: 0 0 0px 0px #c70019;\n  }\n}\n\n.OT_mini .OT_bar,\n.OT_bar.OT_mode-mini,\n.OT_bar.OT_mode-mini-auto {\n  bottom: 0;\n  height: auto;\n}\n\n.OT_mini .OT_name.OT_mode-off,\n.OT_mini .OT_name.OT_mode-on,\n.OT_mini .OT_name.OT_mode-auto,\n.OT_mini:hover .OT_name.OT_mode-auto {\n  display: none;\n}\n\n.OT_publisher .OT_name,\n.OT_subscriber .OT_name {\n    left: 10px;\n    right: 37px;\n    height: 34px;\n    padding-left: 0;\n}\n\n.OT_publisher .OT_mute,\n.OT_subscriber .OT_mute {\n    border: none;\n    cursor: pointer;\n    display: block;\n    position: absolute;\n    text-align: center;\n    text-indent: -9999em;\n    background-color: transparent;\n    background-repeat: no-repeat;\n}\n\n.OT_publisher .OT_mute,\n.OT_subscriber .OT_mute {\n  right: 0;\n  top: 0;\n  border-left: 1px solid rgba(255, 255, 255, 0.2);\n  height: 36px;\n  width: 37px;\n}\n\n.OT_mini .OT_mute,\n.OT_publisher.OT_mini .OT_mute.OT_mode-auto.OT_mode-on-hold,\n.OT_subscriber.OT_mini .OT_mute.OT_mode-auto.OT_mode-on-hold {\n  top: 50%;\n  left: 50%;\n  right: auto;\n  margin-top: -18px;\n  margin-left: -18.5px;\n  border-left: none;\n}\n\n.OT_publisher .OT_mute {\n  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAcCAMAAAC02HQrAAAA1VBMVEUAAAD3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pn3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pn3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj39/j3+Pj3+Pn4+Pk/JRMlAAAAQ3RSTlMABAUHCQoLDhAQERwdHiAjLjAxOD9ASFBRVl1mbnZ6fH2LjI+QkaWqrrC1uLzAwcXJycrL1NXj5Ofo6u3w9fr7/P3+d4M3+QAAAQBJREFUGBlVwYdCglAABdCLlr5Unijm3hMUtBzlBLSr//9JgUToOQgVJgceJgU8aHgMeA38K50ZOpcQmTPwcyXn+JM8M3JJIqQypiIkeXelTyIkGZPwKS1NMia1lgKTVkaE3oQQGYsmHNqSMWnTgUFbMiZtGlD2dpaxrL1XgM0i4ZK8MeAmFhsAs29MGZniawagS63oMOQUNXYB5D0D1RMDpyoMLw/fiE2og/V+PVDR5AiBl0/2Uwik+vx4xV3a5G5Ye68Nd1czjUjZckm6VhmPciRzeCZICjwTJAViQq+3e+St167rAoHK8sLYZVkBYPCZAZ/eGa+2R5LH7Wrc0YFf/O9J3yBDFaoAAAAASUVORK5CYII=);\n  background-position: 9px 5px;\n}\n\n.OT_publisher .OT_mute.OT_active {\n  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAdCAYAAABFRCf7AAADcElEQVRIiaWVXWhcRRTHf7NNd2aDtUKMIjTpg4ufFIuiUOmDEWm0Vi3VYhXRqIggQh4sWJFSig9+oOhTKSpIRUWMIBIr2kptoTbgU6ooxCiIjR+14kcJmf9sNceHnd3ebnc3Uv9wuXfOzPzmnDMz5zozGwdWAbc65w5RUJQ8cC2wDJgFJioh/MJCMrNxq2vOzK4HmIvRRemxKP0RJWt53o7S+d2Yzsx6gQ+AIUDAnUqpBLzXZd4RYFUlhB/bdZacc3PAOmAcCMC7wfvFwLNdoAPAyx09bXyYWRl4E7gDmAdGlNKFwLYu8GolhO9O87RJd64GbMrgEvB68P4osMWdXLtVV7czlooNpVRWSs8DO7NpR/B+3rBHsvetCgtCMTxwQCm9BbyQrc8F7/uBex3uRCeXO0PrUZ4NfKyUPgWeyj3bg/crDNsIRGwBaJQGorQ3Svdn2wHgc2BUKb0DPJHtjwfvbwRucc7tz+N+i9LFUdoXpfVN36I0CVwBTFI/q9e1LPxT8P4qYEdu70q12mYzWw1MYQzjeJF6zq+shHC4B7jklOBPP/TzSunh4P0DwKvAfb5c9krpe+CcwsEoZdbhEvBM9wxRAl5RShcA9wAngE3B+8tLpdLuwrhp4MNmK0pfRWkySr7NXS8+L5nZbWZWy/Vin1IaitJnUTqvwevJ71lgSSWEFKUfHG7Q2m/xqFJaGry/GXgfGPLl8mJgrXPur2JoUC8Qy3OpG+sAbGhEKT0ErAWOA6uBPWbW1wr9BOgFbgKezot0kAPYqJQA1gC/A9cA+82svzksSn1R+jNKX0SpnM/e1x3yqig92JhrZivM7FjO8bSZLSuCR/Ok16K0KMNHojQWpYko7Y7S1igN5PE3ROl4lNaZ2UVmNpPBU01orvZvZPCeKFXbBR+lEKVtUapFaSZKg9njqpl9aWYTrmXCImA7sCWb9lK/jj9TrwkrgA1AH3AQuKsSwkzbrLfxpgpsBtYDxf/R3xm2ExirhNCuHHZXTsmRwiat+S/zSt06eysVA/4pmGr/G3qm6ik28v29FKgCg8BS6pvS0KNRGgZ+Bb4FpsxsOkfUlMuwDcBWYOUZOHYM2AU8WQmhBifDv70O7PjX7KZ+4G7g3FM8zd6uBIaBy4AqxnIcZwFLCovPAhE4Sj38b4BDwEeVEFKD9S94Khjn486v3QAAAABJRU5ErkJggg==);\n  background-position: 9px 4px;\n}\n\n.OT_subscriber .OT_mute {\n  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAATCAYAAAB7u5a2AAABx0lEQVQ4jaWUv48NURiGn3ONmCs32ZBd28ht1gqyZAkF21ylQkEiSp2ehpDlD1BoFGqqVdJohYKI7MaPxMoVNghCWMF+7ybLUewnOXfcMWO9yeQ857zne8+XmZOBGjJpr0kvTIomvTZpS526UCO4DUwD64FjwCFgqZnnR+oc8LfgzKQ73vGsr42ZtGjSQFV9o8KfBCacZwCaef4YmAf2rzjcpN3A2WSpm/AssKcqPDNpDBjs410CViXzTwk/A7b1C4wxDgOngAsZcAXY2buDfp/6S4F3lDS8DjgBzDWAjX/Y/e/QgYS/AhsKHa+OMQ6GEJ4Cj4BOAxgq6aCowyZtdf4OtAr+FHDO+R4wWnVbihr3cQnICt4boO38GWj9a/icjwOACt4m4K3zEPA+AxaAtTWCnwN3lzHkEL8V/OPAGud9wK2GF9XR1Wae/1zG2AI+pGYI4VUIoRtjHAc2A9cz4LRPevYCZ+i9/4sJt4GXJU10gaPAzdI2TTro/5Tfz8XEe2LSZGmxq/SDNvP8BnA5WRrx4BwYBe6vONx1EnjovGvBLAAd4Adwuyq8UiaNmDTvr+a8SQ9MuvbfwckBHZPe+QEfTdpep+4XZmPBHiHgz74AAAAASUVORK5CYII=);\n  background-position: 8px 7px;\n}\n\n.OT_subscriber .OT_mute.OT_active {\n  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAUCAYAAACXtf2DAAACtklEQVQ4jZ2VSYiURxTHf+/T9Nc9iRrBuYySmIsXUU9iFMEFERRBvAjJLUQi5ioiHvSScfTmgqC4XAT1ZIgLuJHkICaaQAgKI2hAUBT30bjUq7bbv4eukXK029F3+eqtv/fqK6qQdEnSNUmT6CDB/bvgfjO4N9zj2RD8007xg1IABkwEzkma0qb4PGAPMBZYLtSD8eNwAEjqTlNI0gNJM4YU7w7ut4O7gvuhZFsR3C8NC5BBLiTIY0mzM8AvqbiC++pk+zLpE95XuwAws3vAQuBPYDRwWtL84P4tsDSLv5oaug4EYOawAMF9jMdoLxqNZcDvQA04UVYqL4G/svj7AF21mhJscrvCksYBFO7xc2AAGGg2mrdjvf4rcAyomNn+slLZmUEGBgsYdh945xZJmgvckDSrEJpK6ySBgV6q12O8ABwGPjGzfWWlsjdN9rpjoSfA+DYDXARGAksK4Is3XC1Ub4z1f4CDQGFmu6tleQSYk0U+p7WVeefLJc00s4fAeWB6Qeunvj0m2ugx9gO7kmlrtSxvBfcy6fXUZS6rgG/S+jLQUwCVNmMC9HqM14EtSe+rluWazN8YEv8IqKZ1E1qnaIDO0ucx3gX6kv6TpM3AM+D/IbGjgP60/gq4WQA33gMA2OQxPgHWJX1ttSwL4FAeZGYLgB2SasBs4A8L7qOBf9M0uXQB3a+TMYSmVctyDrA9mfcBK82smSdKWgCcAaa1bTm4fxbc/8uuCQX3RanAD5Ka6Wo5IGnE0HxJPZ03pQX5Org3MsD3AO5xXLPZXJ9BjkrqdFg6QjZkgG3Jtsw93pG0VFI9QU5K6voYQBHcTydAfwheBI9HgvvPAJIWS3qeIL9JGvUxkO7gfi1BrqTvwkG/pPmSnibIqTzXPgAyEVgBjAEu1qrVPbk/PVTHgb/NbPGg/RVIzOQqzSTBaQAAAABJRU5ErkJggg==);\n  background-position: 7px 7px;\n}\n\n/**\n * Styles for display modes\n *\n * Note: It's important that these completely control the display and opacity\n * attributes, no other selectors should atempt to change them.\n */\n\n/* Default display mode transitions for various chrome elements */\n\n.OT_publisher .OT_edge-bar-item,\n.OT_subscriber .OT_edge-bar-item {\n  -webkit-transition-property: top, bottom, opacity;\n  transition-property: top, bottom, opacity;\n  -webkit-transition-duration: 0.5s;\n          transition-duration: 0.5s;\n  -webkit-transition-timing-function: ease-in;\n          transition-timing-function: ease-in;\n}\n\n.OT_publisher .OT_edge-bar-item.OT_mode-off,\n.OT_subscriber .OT_edge-bar-item.OT_mode-off,\n.OT_publisher .OT_edge-bar-item.OT_mode-auto,\n.OT_subscriber .OT_edge-bar-item.OT_mode-auto,\n.OT_publisher .OT_edge-bar-item.OT_mode-mini-auto,\n.OT_subscriber .OT_edge-bar-item.OT_mode-mini-auto {\n  top: -25px;\n  opacity: 0;\n}\n\n.OT_publisher .OT_edge-bar-item.OT_mode-off,\n.OT_subscriber .OT_edge-bar-item.OT_mode-off {\n  display: none;\n}\n\n.OT_mini .OT_mute.OT_mode-auto,\n.OT_publisher .OT_mute.OT_mode-mini-auto,\n.OT_subscriber .OT_mute.OT_mode-mini-auto {\n  top: 50%;\n}\n\n.OT_publisher .OT_edge-bar-item.OT_edge-bottom.OT_mode-off,\n.OT_subscriber .OT_edge-bar-item.OT_edge-bottom.OT_mode-off,\n.OT_publisher .OT_edge-bar-item.OT_edge-bottom.OT_mode-auto,\n.OT_subscriber .OT_edge-bar-item.OT_edge-bottom.OT_mode-auto,\n.OT_publisher .OT_edge-bar-item.OT_edge-bottom.OT_mode-mini-auto,\n.OT_subscriber .OT_edge-bar-item.OT_edge-bottom.OT_mode-mini-auto {\n  top: auto;\n  bottom: -25px;\n}\n\n.OT_publisher .OT_edge-bar-item.OT_mode-on,\n.OT_subscriber .OT_edge-bar-item.OT_mode-on,\n.OT_publisher .OT_edge-bar-item.OT_mode-auto.OT_mode-on-hold,\n.OT_subscriber .OT_edge-bar-item.OT_mode-auto.OT_mode-on-hold,\n.OT_publisher:hover .OT_edge-bar-item.OT_mode-auto,\n.OT_subscriber:hover .OT_edge-bar-item.OT_mode-auto,\n.OT_publisher:hover .OT_edge-bar-item.OT_mode-mini-auto,\n.OT_subscriber:hover .OT_edge-bar-item.OT_mode-mini-auto {\n  top: 0;\n  opacity: 1;\n}\n\n.OT_mini .OT_mute.OT_mode-on,\n.OT_mini:hover .OT_mute.OT_mode-auto,\n.OT_mute.OT_mode-mini,\n.OT_root:hover .OT_mute.OT_mode-mini-auto {\n  top: 50%;\n}\n\n.OT_publisher .OT_edge-bar-item.OT_edge-bottom.OT_mode-on,\n.OT_subscriber .OT_edge-bar-item.OT_edge-bottom.OT_mode-on,\n.OT_publisher:hover .OT_edge-bar-item.OT_edge-bottom.OT_mode-auto,\n.OT_subscriber:hover .OT_edge-bar-item.OT_edge-bottom.OT_mode-auto {\n  top: auto;\n  bottom: 0;\n  opacity: 1;\n}\n\n/* Contains the video element, used to fix video letter-boxing */\n\n.OT_widget-container {\n  width: 100%;\n  height: 100%;\n  position: absolute;\n  background-color: #000000;\n  overflow: hidden;\n}\n\n/* Load animation */\n\n.OT_root .OT_video-loading {\n  position: absolute;\n  z-index: 1;\n  width: 100%;\n  height: 100%;\n  display: none;\n\n  background-color: rgba(0, 0, 0, .75);\n}\n\n.OT_root .OT_video-loading .OT_video-loading-spinner {\n  background: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0yMCAtMjAgMjQwIDI0MCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJhIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZiIgc3RvcC1vcGFjaXR5PSIwIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZmZmIiBzdG9wLW9wYWNpdHk9IjAiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iYiIgeDE9IjEiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZmIiBzdG9wLW9wYWNpdHk9IjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNmZmYiIHN0b3Atb3BhY2l0eT0iLjA4Ii8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImMiIHgxPSIxIiB4Mj0iMCIgeTE9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZiIgc3RvcC1vcGFjaXR5PSIuMDgiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNmZmYiIHN0b3Atb3BhY2l0eT0iLjE2Ii8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImQiIHgyPSIwIiB5MT0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZmIiBzdG9wLW9wYWNpdHk9Ii4xNiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI2ZmZiIgc3RvcC1vcGFjaXR5PSIuMzMiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iZSIgeDI9IjEiIHkxPSIxIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiNmZmYiIHN0b3Atb3BhY2l0eT0iLjMzIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZmZmIiBzdG9wLW9wYWNpdHk9Ii42NiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJmIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZiIgc3RvcC1vcGFjaXR5PSIuNjYiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNmZmYiLz48L2xpbmVhckdyYWRpZW50PjxtYXNrIGlkPSJnIj48ZyBmaWxsPSJub25lIiBzdHJva2Utd2lkdGg9IjQwIj48cGF0aCBzdHJva2U9InVybCgjYSkiIGQ9Ik04Ni42LTUwYTEwMCAxMDAgMCAwIDEgMCAxMDAiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEwMCAxMDApIi8+PHBhdGggc3Ryb2tlPSJ1cmwoI2IpIiBkPSJNODYuNiA1MEExMDAgMTAwIDAgMCAxIDAgMTAwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMDAgMTAwKSIvPjxwYXRoIHN0cm9rZT0idXJsKCNjKSIgZD0iTTAgMTAwYTEwMCAxMDAgMCAwIDEtODYuNi01MCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTAwIDEwMCkiLz48cGF0aCBzdHJva2U9InVybCgjZCkiIGQ9Ik0tODYuNiA1MGExMDAgMTAwIDAgMCAxIDAtMTAwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMDAgMTAwKSIvPjxwYXRoIHN0cm9rZT0idXJsKCNlKSIgZD0iTS04Ni42LTUwQTEwMCAxMDAgMCAwIDEgMC0xMDAiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEwMCAxMDApIi8+PHBhdGggc3Ryb2tlPSJ1cmwoI2YpIiBkPSJNMC0xMDBhMTAwIDEwMCAwIDAgMSA4Ni42IDUwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMDAgMTAwKSIvPjwvZz48L21hc2s+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHg9Ii0yMCIgeT0iLTIwIiBtYXNrPSJ1cmwoI2cpIiBmaWxsPSIjZmZmIi8+PC9zdmc+) no-repeat;\n  position: absolute;\n  width: 32px;\n  height: 32px;\n  left: 50%;\n  top: 50%;\n  margin-left: -16px;\n  margin-top: -16px;\n  -webkit-animation: OT_spin 2s linear infinite;\n  animation: OT_spin 2s linear infinite;\n}\n\n@-webkit-keyframes OT_spin {\n  100% {\n    -webkit-transform: rotate(360deg);\n  }\n}\n\n@keyframes OT_spin {\n  100% {\n    -webkit-transform: rotate(360deg);\n            transform: rotate(360deg);\n  }\n}\n\n.OT_publisher.OT_loading .OT_video-loading,\n.OT_subscriber.OT_loading .OT_video-loading {\n  display: block;\n}\n\n.OT_video-centering {\n  display: table;\n  width: 100%;\n  height: 100%;\n}\n\n.OT_video-container {\n  display: table-cell;\n  vertical-align: middle;\n}\n\n.OT_video-poster {\n  position: absolute;\n  z-index: 1;\n  width: 100%;\n  height: 100%;\n  display: none;\n\n  opacity: .25;\n\n  background-repeat: no-repeat;\n  background-image: url(data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNDcxIDQ2NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSI2Ni42NiUiIHN0b3AtY29sb3I9IiNmZmYiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNmZmYiIHN0b3Atb3BhY2l0eT0iMCIvPjwvbGluZWFyR3JhZGllbnQ+PHBhdGggZmlsbD0idXJsKCNhKSIgZD0iTTc5IDMwOGMxNC4yNS02LjUgNTQuMjUtMTkuNzUgNzEtMjkgOS0zLjI1IDI1LTIxIDI1LTIxczMuNzUtMTMgMy0yMmMtMS43NS02Ljc1LTE1LTQzLTE1LTQzLTIuNSAzLTQuNzQxIDMuMjU5LTcgMS0zLjI1LTcuNS0yMC41LTQ0LjUtMTYtNTcgMS4yNS03LjUgMTAtNiAxMC02LTExLjI1LTMzLjc1LTgtNjctOC02N3MuMDczLTcuMzQ2IDYtMTVjLTMuNDguNjM3LTkgNC05IDQgMi41NjMtMTEuNzI3IDE1LTIxIDE1LTIxIC4xNDgtLjMxMi0xLjMyMS0xLjQ1NC0xMCAxIDEuNS0yLjc4IDE2LjY3NS04LjY1NCAzMC0xMSAzLjc4Ny05LjM2MSAxMi43ODItMTcuMzk4IDIyLTIyLTIuMzY1IDMuMTMzLTMgNi0zIDZzMTUuNjQ3LTguMDg4IDQxLTZjLTE5Ljc1IDItMjQgNi0yNCA2czc0LjUtMTAuNzUgMTA0IDM3YzcuNSA5LjUgMjQuNzUgNTUuNzUgMTAgODkgMy43NS0xLjUgNC41LTQuNSA5IDEgLjI1IDE0Ljc1LTExLjUgNjMtMTkgNjItMi43NSAxLTQtMy00LTMtMTAuNzUgMjkuNS0xNCAzOC0xNCAzOC0yIDQuMjUtMy43NSAxOC41LTEgMjIgMS4yNSA0LjUgMjMgMjMgMjMgMjNsMTI3IDUzYzM3IDM1IDIzIDEzNSAyMyAxMzVMMCA0NjRzLTMtOTYuNzUgMTQtMTIwYzUuMjUtNi4yNSAyMS43NS0xOS43NSA2NS0zNnoiLz48L3N2Zz4=);\n  background-size: auto 76%;\n}\n\n.OT_fit-mode-cover .OT_video-element {\n  -o-object-fit: cover;\n     object-fit: cover;\n}\n\n/* Workaround for iOS freezing issue when cropping videos */\n\n/* https://bugs.webkit.org/show_bug.cgi?id=176439 */\n\n@media only screen\n  and (orientation: portrait) {\n  .OT_subscriber.OT_ForceContain.OT_fit-mode-cover .OT_video-element {\n    -o-object-fit: contain !important;\n       object-fit: contain !important;\n  }\n}\n\n.OT_fit-mode-contain .OT_video-element {\n  -o-object-fit: contain;\n     object-fit: contain;\n}\n\n.OT_fit-mode-cover .OT_video-poster {\n  background-position: center bottom;\n}\n\n.OT_fit-mode-contain .OT_video-poster {\n  background-position: center;\n}\n\n.OT_audio-level-meter {\n  position: absolute;\n  width: 25%;\n  max-width: 224px;\n  min-width: 21px;\n  top: 0;\n  right: 0;\n  overflow: hidden;\n}\n\n.OT_audio-level-meter:before {\n  /* makes the height of the container equals its width */\n  content: '';\n  display: block;\n  padding-top: 100%;\n}\n\n.OT_audio-level-meter__bar {\n  position: absolute;\n  width: 192%; /* meter value can overflow of 8% */\n  height: 192%;\n  top: -96% /* half of the size */;\n  right: -96%;\n  border-radius: 50%;\n\n  background-color: rgba(0, 0, 0, .8);\n}\n\n.OT_audio-level-meter__audio-only-img {\n  position: absolute;\n  top: 22%;\n  right: 15%;\n  width: 40%;\n\n  opacity: .7;\n\n  background: url(data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzkgODYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0iI2ZmZiI+PHBhdGggZD0iTTkuNzU3IDQwLjkyNGMzLjczOC01LjE5MSAxMi43MTEtNC4zMDggMTIuNzExLTQuMzA4IDIuMjIzIDMuMDE0IDUuMTI2IDI0LjU4NiAzLjYyNCAyOC43MTgtMS40MDEgMS4zMDEtMTEuNjExIDEuNjI5LTEzLjM4LTEuNDM2LTEuMjI2LTguODA0LTIuOTU1LTIyLjk3NS0yLjk1NS0yMi45NzV6bTU4Ljc4NSAwYy0zLjczNy01LjE5MS0xMi43MTEtNC4zMDgtMTIuNzExLTQuMzA4LTIuMjIzIDMuMDE0LTUuMTI2IDI0LjU4Ni0zLjYyNCAyOC43MTggMS40MDEgMS4zMDEgMTEuNjExIDEuNjI5IDEzLjM4LTEuNDM2IDEuMjI2LTguODA0IDIuOTU1LTIyLjk3NSAyLjk1NS0yMi45NzV6Ii8+PHBhdGggZD0iTTY4LjY0NyA1OC42Yy43MjktNC43NTMgMi4zOC05LjU2MSAyLjM4LTE0LjgwNCAwLTIxLjQxMi0xNC4xMTUtMzguNzctMzEuNTI4LTM4Ljc3LTE3LjQxMiAwLTMxLjUyNyAxNy4zNTgtMzEuNTI3IDM4Ljc3IDAgNC41NDEuNTE1IDguOTM2IDEuODAyIDEyLjk1IDEuNjk4IDUuMjk1LTUuNTQyIDYuOTkxLTYuNjE2IDIuMDczQzIuNDEgNTUuMzk0IDAgNTEuNzg3IDAgNDguMTAzIDAgMjEuNTM2IDE3LjY4NSAwIDM5LjUgMCA2MS4zMTYgMCA3OSAyMS41MzYgNzkgNDguMTAzYzAgLjcxOC0yLjg5OSA5LjY5My0zLjI5MiAxMS40MDgtLjc1NCAzLjI5My03Ljc1MSAzLjU4OS03LjA2MS0uOTEyeiIvPjxwYXRoIGQ9Ik01LjA4NCA1MS4zODVjLS44MDQtMy43ODIuNTY5LTcuMzM1IDMuMTM0LTcuOTIxIDIuNjM2LS42MDMgNS40ODUgMi4xNSA2LjI4OSA2LjEzMi43OTcgMy45NDgtLjc1MiA3LjQ1Ny0zLjM4OCA3Ljg1OS0yLjU2Ni4zOTEtNS4yMzctMi4zMTgtNi4wMzQtNi4wN3ptNjguODM0IDBjLjgwNC0zLjc4Mi0uNTY4LTcuMzM1LTMuMTMzLTcuOTIxLTIuNjM2LS42MDMtNS40ODUgMi4xNS02LjI4OSA2LjEzMi0uNzk3IDMuOTQ4Ljc1MiA3LjQ1NyAzLjM4OSA3Ljg1OSAyLjU2NS4zOTEgNS4yMzctMi4zMTggNi4wMzQtNi4wN3ptLTIuMDM4IDguMjg4Yy0uOTI2IDE5LjY1OS0xNS4xMTIgMjQuNzU5LTI1Ljg1OSAyMC40NzUtNS40MDUtLjYwNi0zLjAzNCAxLjI2Mi0zLjAzNCAxLjI2MiAxMy42NjEgMy41NjIgMjYuMTY4IDMuNDk3IDMxLjI3My0yMC41NDktLjU4NS00LjUxMS0yLjM3OS0xLjE4Ny0yLjM3OS0xLjE4N3oiLz48cGF0aCBkPSJNNDEuNjYyIDc4LjQyMmw3LjU1My41NWMxLjE5Mi4xMDcgMi4xMiAxLjE1MyAyLjA3MiAyLjMzNWwtLjEwOSAyLjczOGMtLjA0NyAxLjE4Mi0xLjA1MSAyLjA1NC0yLjI0MyAxLjk0NmwtNy41NTMtLjU1Yy0xLjE5MS0uMTA3LTIuMTE5LTEuMTUzLTIuMDcyLTIuMzM1bC4xMDktMi43MzdjLjA0Ny0xLjE4MiAxLjA1Mi0yLjA1NCAyLjI0My0xLjk0N3oiLz48L2c+PC9zdmc+) no-repeat center;\n}\n\n.OT_audio-level-meter__audio-only-img:before {\n  /* makes the height of the container equals its width */\n  content: '';\n  display: block;\n  padding-top: 100%;\n}\n\n.OT_audio-level-meter__value {\n  position: absolute;\n  border-radius: 50%;\n  background-image: radial-gradient(circle, rgba(151, 206, 0, 1) 0%, rgba(151, 206, 0, 0) 100%);\n}\n\n.OT_audio-level-meter.OT_mode-off {\n    display: none;\n}\n\n.OT_audio-level-meter.OT_mode-on,\n.OT_audio-only .OT_audio-level-meter.OT_mode-auto {\n  display: block;\n}\n\n.OT_audio-only.OT_publisher .OT_video-element,\n.OT_audio-only.OT_subscriber .OT_video-element {\n  display: none;\n}\n\n.OT_video-disabled-indicator {\n  opacity: 1;\n  border: none;\n  display: none;\n  position: absolute;\n  background-color: transparent;\n  background-repeat: no-repeat;\n  background-position: bottom right;\n  pointer-events: none;\n  top: 0;\n  left: 0;\n  bottom: 3px;\n  right: 3px;\n}\n\n.OT_video-disabled {\n  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFIAAAAoCAYAAABtla08AAAINUlEQVR42u2aaUxUVxTHcRBmAAEBRVTK4sKwDIsg+wCK7CqIw1CN1YobbbS2qYlJ06Qx1UpdqMbYWq2pSzWmH6ytNbXWJY1Lq7VuqBERtW64V0XFLYae0/xvcp3MMAMzDz6IyT/ge2ce5/7ucpY3Ts3NzZ1ygF57AJ0gO0G2jyZPmdbFyclJSAV1EeoEaUUSLGdSV5KLLFxzFmA7QVqGqDqjixhWkxCVeyRVl38wM6bwj6yYItYK47BAuu9B0gCqs6Ng2r494KQtkj/Dz2jHraw6qw2fdSE4rNmcCPCvZONP8iF1I6kdBdMaQJWZLeJqRWa2kPJAxXY+GxE+zxLI03GRh8lGSwoi9WCY8FWlCEh+8JOnT7MfPGjMuXX7Tt61hoaCi/9cKmKdv3BxeEtim/UbNpnbQiqF4MmT7kqrbr4lkMcTo46TTSpJB5g+8NHuVWnWuaampvhmO/7duHmrGluoO4C6OsJZGRrkDIld43ZqUOTnlkDSmXmabAoBU0vqBf+6KgFSxQ9++uzZ8rZApM81TJ8xM5me0Z/UF7PuBmdVdkGEb5gYDeQmyZNW3SJLIP9Kj64lGyMpmxRN6sOfIbkoAhKOdnv2/PmB1kB88eLFo+olyyrps3rSINIAzLonnqlqK8R9w+L86vtrt5L2nhug3Vc3ULu/Liz8AOuXESlZZONH6kmr7gtLIA9lRNeRzVukAvj3BslLnJNKgfScO69K+/Lly0ZbQW7e8tNK+pwBjqaSIjDrXgJkW1ciAZvbQjQ+RDahpBBKd5ZZsqN758hmImk4KQHnpDd8UwSkCyJarx07d4+3BeKJmlMHyX4qaRxpBCmNFE4KENvHDpAutVERn1kCVBMfeRRgYvZnx62wZPdnZkw92VQA5GClQXYRBze2S+iJmpPVVoJLA9l9QKokjcWKTCT1R5rhLg70NuSsziT16diIKkuAjibrTpJNDkn/e17CahtAjlAWJAYkb29Sb1LE9Rs391kILk8mVkyuIpuZcLKUlEmKkra1WuSTNuesEPzwoEploSVAh9Oiz+BIyd9dOHhtx4OEpFpVg6gbNK3yXX1j48N6U5Dz5i/gc/FDrMY3sTLiSMEkXxGxzUEUAGnbxlPaksMlHUXWAlHS8URCPseSohZbCSLjSSU7ixLXdzhIWVKq4Y7t2a/2bN0qGeKly1fYsVmk6RgIDz4J0bonyUOcjeYqm/8hRoYbWkigV2NH9CHAS60EkUkkw47hSRs6FqT1LR5AVcsrueXlK1d5AO+RpmBrZZEiefByytPCanRGNLZY0uF52gNDYr9sCRB8MHY0SJu2OJWKS2WQV65e4y31DmkCImEi0hBfufRime0RIhpbKen0/Ny9OYNW2ghyYytABjNIaxNuKttAWk6HPLn0k0FevdZwFinPWFIuKZbUV16NVko6jbWSDoPO3pOf8K0jQWLSQ0S9bdpkYck+m7vfWpAiHfKgBsZiGSSt0FqcTeU8WETqAHE2CgcAVd3Gkm4MD3xXYeI6B4NMItvKbcUpQ9gP+KMWnSsW+TaYJtoo+avBWLoKoK0CCSDud+7eXWQGZAXqV3YoQjQCfixJ8+fzj9ta3JHhlUeJ8wJOY2ws6eRKpPS3oqTvHAESEz9ya0naXL5WH6pt3FqSOhTHkTcKEXc6k1POh4Q9YJu/03TT4a8PoGMFI4i2EqSbOZAYaBkpCyD92RkG6KCSbjI/H0HEISBnlOZPFdcEzI2GTO4KBZICGKyAKLTEmJOB2txf5MbgohBINCl4FTqmpJMB2W+HiRn1Q2l6lXyPmiEP6VVE2TfGoaMYrHyPdtAnyI0jEOn9RLWmNEhvBBE7SjpFQZaShtLK+1S+T12lRwxUvrZlVPp8jE1PikeO7C/nyEqBDCB1t7+kUx4kKUWclea0yZC5BIGpiJSNSD9QgFR0RQKkL6KxHSWdsiARHJNYewoGrzG1/bk4dTPSunL2EyDjcbb7MQ+lQfZmkKiN7SjpFAM5CWAyGcwyY84YsZ1lUcbRNNtQMAdtQWGvQ0DyVjzYAKQfQFodeAeC1C8vzymXIZqD+ZEh/2OyLSalS/3VbnJZ+VqDXGjMrTCFuK4s66vVZUNfqaDolcbjOcb899sLpEE+I20GifywXe2QR3KElu99PzqjGufhREqB1pjCnG3IL3fY1v733r2FMsiGhutn0LAoJWWIGbPxjKwgjUbF0m52mPhigrpdXOecEq9pR6MkHbu2LOtrcZ9y3d0ODTb15y9MePz48aF79+8fvXnr9sljx2u2I7KNxDuaMPGVECoRs7mC4eT7SIruFNfNHK15MKuM2evwNq+4qjxvGnd5CHwNNynawW4cOlUZdG8b55IIJHmkItwrZHH6QxB3OSL9kTtAGpIvZiQB3Z4SKBfXQtEE9sashWAW87Bt3sYZNR6zn4uzJwWDKUKXfaKCdqUoBpLxSjYe9nqGiwWRBGipuGZ3Qm76itYLbbJI/PEhUApfw73uOIy9xfse3M9F9BuFJHcYrseSouGkHtCVtkuGTTikI8XgZzhg9SeF4VqcvSWiaSvNHQ8JwkNjIfEHemCmNLD1RaEfLs18mlgNuN6PFALHo7CyU5W2g00gFAQF4ozvibH04muwDbWraSFAyt/AAMzewgGR8uCeWn77xzBxPxgzPRCDDMZ14bQ/3jqGKGoHf2Hjgx3kw5LbaJDYWb52t9FMgw4AuWNWukNeuOYqOsmQi2jgws4PA/DD/z0B2x0/veCs4naw0cgybezid7X9jV3rX2RSs0wfLkll4pBGcgifg+NYxe1kJ2ycTaRq66uG/wBOl0vjcw70xwAAAABJRU5ErkJggg==);\n  background-size: 33px auto;\n}\n\n.OT_video-disabled-warning {\n  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFIAAAAoCAYAAABtla08AAAGMElEQVR4Ae2aA7D0yBaAc7oH12vbRmlLaxYWb23btm3btm2899a2bWuYtPZ01cmtU9lJrib315yqr9I3Oem/5/s7acwEnehEJzoxCcX2O+wEeIgRBDDaGjAZOgQ6ihRpLklHZDJIXK1WWymMIhGGkVBKCWMM+Iv/f/b5t7faYtM/sGgIS7j8RNLjceUVl41GvGN1BFiHy9sgtRWaYbhvuVQ6o1VOvV5/tLe3dyssKoZuh8xClkDEi2MMS6ZjR0cScxdK/+HgnJsmLccYOx0e/PUGUqfTJDEHkV5go9lcMQoj4R8RpSIRRUr4a9baTJFCCNfqESKJ7RYJibK0xoi05EhFRTxMi1Rit6xHAuLaKRLwEVi6q1x+EhlVpd3d3Wfh4VQkQhRhxthYLg7SRGqdLlIp7UVOHf+JhEhEMscUolVje3p63saeeOFoKsT7fjj++BNuw2I/0ouUENmGaQcQEilQvUU6xuWC0kqmVWCt8df6kG7WLoFA20VSCOyNh0RKPT+SyrTWtQsvuvTYCy84z3+oAdbgAiLGIvHjTz6bFuu/B3lKKfVkFKknwih6EnnipZdfXQZzepAupXSGSCfwUGZtkrx3t/0dSQGnnXbmdocdetArQoj+4VR23wMP3bj/vnv9Sv/rBmkish09ca655thHSrlWq4TFF1vkNDxsgjiUnPqZnHPABIq47jx7pPMcecShfz7x1DO7D6eit99576X1113nVd8rqLGAuDaNitJonTGIqHgQGQjDsJglMrUH5iDSEQbRa6y2yrNvv/PuWVmV/PTzLz8steTit1B9FtGJeZrJksmWdBzBMcami4xUkaY1A1Qe94WIaPGBApJhaERrLrXkElf8+NPPz6YMLs1DDjn0Wn9PnI/UiQadM4jNEkhzVsEGE8nIHESM1j5/KqRX+/IEiOQ/yifNBlEkpnb00cccesbpp13T3983H88/48xzrrvm6it/8U5JXgX5G6nSvSq1R5LATR7aYGkwMG1RSwkWABH+4jUb3vT/uJ1Z0xpjraTBRltrxUQhksIRmgTJyy69+Pv99tv3qYX6FxgU+fU33352xGEHf5wisU7nNWJpZRMkAjZ6aIN1mwV7h29Jo2wCHlveu/GV169z65E+T6koexCh6c+EEiky3lnxQKFjUeVyOeI5AOBzIiayRhJryd7YYnkIHgvB0qk9Tdql6N3XH4bRUIOIIIKJSiRb0hkSEpZKRd1CpEq8GxtIyCVmDSgFl94GacTgaJw1rUlYhYng0c4ewaUsmKRIJjpiqMSOCh9QeI+UYECmtQIsxEu6OorEcv6Rl0gu0woh8MhFkmSCTXVI4pC704WCFRJvSRNJSzrMMEZO2iKZTCHAZYnmvXCny7ed5vfZK3viHSBdIFCKEFj2+nt+73nw8m2uedcLJlktA++VNMEPaR45aYukcKnnCfY3/DFbZS8t7eHxNgsPM0N1hXhJJwwM1QbpoQFlog2R13a/zBxEYHAQEUYUM6qiVwEyBYoM6JFNF2kFLelI5KQf+fVI4dJFCguDS7oAyx2R6SFQJKRedSDj/cMg/RXQ6ZE05GSIDAaXdCi1I3L021SQWNJ1RLY5OiIdL4/yvuw8ADfWPFrSciaMyH8tEQPwf1uGG54g5+KlJGTmsrxsQdl5PKidnPFe2QS///7Hu+VS6WX/HYnf0sevGL7lXydwod2/9DykZq0s5yff0sgSWCigNOH7TPHL7ufj+/TH8P/+qYpL4HkBDiRYpEXeM8/89/9zzjn7EtY64dfd1nqccM7Bs8+9MKy8555/8TnKS+5MufH6EZVASkgPzf+mJXroet17JirU0ALST3nT0y5ONyLpeo1y64ih+vuQfsoTOeRFSJXa+SvyB90TUmdw49EjLaKpMQ0mzEeTzkWsd/oI6fzfiKM8gWg6X6OjpXstu5ZHnmIb0GFiu29MIUfUewkmVrEN3RqVQ/bY8FzNcquMBv/pCNUZ5pHHem01KdN/I/DG66/lLhKSvTO5M84kav5C5z2ZfyAivi9i9VGd45RH7UWJbjwGG/7NYsRECt7jiOToHedKAui8SW4CsxyRc54mKH/8f7ELhCCACyNcIl/wI+FaAJyc8yzRtinQPzWzuFZrFHq/AAAAAElFTkSuQmCC);\n  background-size: 33px auto;\n}\n\n.OT_video-disabled-indicator.OT_active {\n  display: block;\n}\n\n.OT_audio-blocked-indicator {\n  opacity: 1;\n  border: none;\n  display: none;\n  position: absolute;\n  background-color: transparent;\n  background-repeat: no-repeat;\n  background-position: center;\n  pointer-events: none;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  right: 0;\n}\n\n.OT_audio-blocked {\n  background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMTUwIiBoZWlnaHQ9IjkwIj48ZGVmcz48cGF0aCBkPSJNNjcgMTJMNi40NDggNzIuNTUyIDAgMzFWMThMMjYgMGw0MSAxMnptMyA3bDYgNDctMjkgMTgtMzUuNTAyLTYuNDk4TDcwIDE5eiIgaWQ9ImEiLz48L2RlZnM+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSI5MCIgcng9IjM1IiByeT0iNDUiIG9wYWNpdHk9Ii41Ii8+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzNikiPjxtYXNrIGlkPSJiIiBmaWxsPSIjZmZmIj48dXNlIHhsaW5rOmhyZWY9IiNhIi8+PC9tYXNrPjxwYXRoIGQ9Ik0zOS4yNDkgNTEuMzEyYy42OTcgMTAuMzcgMi43ODUgMTcuODk3IDUuMjUxIDE3Ljg5NyAzLjAzOCAwIDUuNS0xMS40MTcgNS41LTI1LjVzLTIuNDYyLTI1LjUtNS41LTI1LjVjLTIuNTEgMC00LjYyOCA3Ljc5Ny01LjI4NyAxOC40NTNBOC45ODkgOC45ODkgMCAwIDEgNDMgNDRhOC45ODggOC45ODggMCAwIDEtMy43NTEgNy4zMTJ6TTIwLjk4NSAzMi4yMjRsMTUuNzQ2LTE2Ljg3N2E3LjM4NSA3LjM4NSAwIDAgMSAxMC4zNzQtLjQyQzUxLjcwMiAxOS4xMTQgNTQgMjkuMjA4IDU0IDQ1LjIwOGMwIDE0LjUyNy0yLjM0MyAyMy44OC03LjAzIDI4LjA1OGE3LjI4IDcuMjggMCAwIDEtMTAuMTY4LS40NjhMMjAuNDA1IDU1LjIyNEgxMmE1IDUgMCAwIDEtNS01di0xM2E1IDUgMCAwIDEgNS01aDguOTg1eiIgZmlsbD0iI0ZGRiIgbWFzaz0idXJsKCNiKSIvPjwvZz48cGF0aCBkPSJNMTA2LjUgMTMuNUw0NC45OTggNzUuMDAyIiBzdHJva2U9IiNGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9nPjwvc3ZnPg==);\n  background-size: 90px auto;\n}\n\n.OT_container-audio-blocked {\n  cursor: pointer;\n}\n\n.OT_container-audio-blocked.OT_mini .OT_edge-bar-item {\n  display: none;\n}\n\n.OT_container-audio-blocked .OT_mute {\n  display: none;\n}\n\n.OT_audio-blocked-indicator.OT_active {\n  display: block;\n}\n\n.OT_video-unsupported {\n  opacity: 1;\n  border: none;\n  display: none;\n  position: absolute;\n  background-color: transparent;\n  background-repeat: no-repeat;\n  background-position: center;\n  background-image: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTciIGhlaWdodD0iOTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPjxkZWZzPjxwYXRoIGQ9Ik03MCAxMkw5LjQ0OCA3Mi41NTIgMCA2MmwzLTQ0TDI5IDBsNDEgMTJ6bTggMmwxIDUyLTI5IDE4LTM1LjUwMi02LjQ5OEw3OCAxNHoiIGlkPSJhIi8+PC9kZWZzPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoOCAzKSI+PG1hc2sgaWQ9ImIiIGZpbGw9IiNmZmYiPjx1c2UgeGxpbms6aHJlZj0iI2EiLz48L21hc2s+PHBhdGggZD0iTTkuMTEgMjAuOTY4SDQ4LjFhNSA1IDAgMCAxIDUgNVY1OC4xOGE1IDUgMCAwIDEtNSA1SDkuMTFhNSA1IDAgMCAxLTUtNVYyNS45N2E1IDUgMCAwIDEgNS01em00Ny4wOCAxMy4zOTRjMC0uMzQ1IDUuNDcyLTMuMTU5IDE2LjQxNS04LjQ0M2EzIDMgMCAwIDEgNC4zMDQgMi43MDJ2MjYuODM1YTMgMyAwIDAgMS00LjMwNSAyLjcwMWMtMTAuOTQyLTUuMjg2LTE2LjQxMy04LjEtMTYuNDEzLTguNDQ2VjM0LjM2MnoiIGZpbGw9IiNGRkYiIG1hc2s9InVybCgjYikiLz48L2c+PHBhdGggZD0iTTgxLjUgMTYuNUwxOS45OTggNzguMDAyIiBzdHJva2U9IiNGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9nPjwvc3ZnPg==);\n  background-size: 58px auto;\n  pointer-events: none;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  right: 0;\n  margin-top: -30px;\n}\n\n.OT_video-unsupported-bar {\n  display: none;\n  position: absolute;\n  width: 192%; /* copy the size of the audio meter bar for symmetry */\n  height: 192%;\n  top: -96% /* half of the size */;\n  left: -96%;\n  border-radius: 50%;\n\n  background-color: rgba(0, 0, 0, .8);\n}\n\n.OT_video-unsupported-img {\n  display: none;\n  position: absolute;\n  top: 11%;\n  left: 15%;\n  width: 70%;\n  opacity: .7;\n  background-image: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTciIGhlaWdodD0iOTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPjxkZWZzPjxwYXRoIGQ9Ik03MCAxMkw5LjQ0OCA3Mi41NTIgMCA2MmwzLTQ0TDI5IDBsNDEgMTJ6bTggMmwxIDUyLTI5IDE4LTM1LjUwMi02LjQ5OEw3OCAxNHoiIGlkPSJhIi8+PC9kZWZzPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoOCAzKSI+PG1hc2sgaWQ9ImIiIGZpbGw9IiNmZmYiPjx1c2UgeGxpbms6aHJlZj0iI2EiLz48L21hc2s+PHBhdGggZD0iTTkuMTEgMjAuOTY4SDQ4LjFhNSA1IDAgMCAxIDUgNVY1OC4xOGE1IDUgMCAwIDEtNSA1SDkuMTFhNSA1IDAgMCAxLTUtNVYyNS45N2E1IDUgMCAwIDEgNS01em00Ny4wOCAxMy4zOTRjMC0uMzQ1IDUuNDcyLTMuMTU5IDE2LjQxNS04LjQ0M2EzIDMgMCAwIDEgNC4zMDQgMi43MDJ2MjYuODM1YTMgMyAwIDAgMS00LjMwNSAyLjcwMWMtMTAuOTQyLTUuMjg2LTE2LjQxMy04LjEtMTYuNDEzLTguNDQ2VjM0LjM2MnoiIGZpbGw9IiNGRkYiIG1hc2s9InVybCgjYikiLz48L2c+PHBhdGggZD0iTTgxLjUgMTYuNUwxOS45OTggNzguMDAyIiBzdHJva2U9IiNGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9nPjwvc3ZnPg==);\n  background-repeat: no-repeat;\n  background-position: center;\n  background-size: 100% auto;\n}\n\n.OT_video-unsupported-img:before {\n  /* makes the height of the container 93% of its width (90/97 px) */\n  content: '';\n  display: block;\n  padding-top: 93%;\n}\n\n.OT_video-unsupported-text {\n  display: -webkit-box;\n  display: -ms-flexbox;\n  display: flex;\n  -webkit-box-pack: center;\n      -ms-flex-pack: center;\n          justify-content: center;\n  -webkit-box-align: center;\n      -ms-flex-align: center;\n          align-items: center;\n  text-align: center;\n  height: 100%;\n  margin-top: 40px;\n}\n"

/***/ }),

/***/ "./src/app/components/layouts/layout-best-fit/layout-best-fit.component.html":
/***/ (function(module, exports) {

module.exports = "<div id=\"layout\" class=\"bounds\">\n  <div *ngFor=\"let s of streams\" class=\"OT_root OT_publisher custom-class\">\n    <div class=\"OT_widget-container\">\n      <video [id]=\"'native-video-' + s.streamId\" autoplay=\"true\" [srcObject]=\"s.getMediaStream()\" (playing)=\"onVideoPlaying($event)\"></video>\n    </div>\n  </div>\n</div>\n"

/***/ }),

/***/ "./src/app/components/layouts/layout-best-fit/layout-best-fit.component.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return LayoutBestFitComponent; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("./node_modules/@angular/core/esm5/core.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_router__ = __webpack_require__("./node_modules/@angular/router/esm5/router.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_openvidu_browser__ = __webpack_require__("../../../../openvidu-browser/lib/OpenVidu/index.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_openvidu_browser___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_openvidu_browser__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__openvidu_layout__ = __webpack_require__("./src/app/components/layouts/openvidu-layout.ts");
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};




var LayoutBestFitComponent = (function () {
    function LayoutBestFitComponent(route, appRef) {
        var _this = this;
        this.route = route;
        this.appRef = appRef;
        this.streams = [];
        this.route.params.subscribe(function (params) {
            _this.sessionId = params.sessionId;
            _this.secret = params.secret;
        });
    }
    LayoutBestFitComponent.prototype.beforeunloadHandler = function () {
        this.leaveSession();
    };
    LayoutBestFitComponent.prototype.sizeChange = function (event) {
        var _this = this;
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(function () {
            _this.openviduLayout.updateLayout();
        }, 20);
    };
    LayoutBestFitComponent.prototype.ngOnDestroy = function () {
        this.leaveSession();
    };
    LayoutBestFitComponent.prototype.ngOnInit = function () {
        var _this = this;
        var OV = new __WEBPACK_IMPORTED_MODULE_2_openvidu_browser__["OpenVidu"]();
        var fullSessionId = 'wss://' + location.hostname + ':8443/' + this.sessionId + '?secret=' + this.secret + '&recorder=true';
        this.session = OV.initSession(fullSessionId);
        this.session.on('streamCreated', function (event) {
            var subscriber = _this.session.subscribe(event.stream, '');
            _this.addRemoteStream(event.stream);
        });
        this.session.on('streamDestroyed', function (event) {
            event.preventDefault();
            _this.deleteRemoteStream(event.stream);
            _this.openviduLayout.updateLayout();
        });
        this.session.connect(null, function (error) {
            if (error) {
                console.error(error);
            }
        });
        this.openviduLayout = new __WEBPACK_IMPORTED_MODULE_3__openvidu_layout__["a" /* OpenViduLayout */]();
        this.openviduLayout.initLayoutContainer(document.getElementById('layout'), {
            maxRatio: 3 / 2,
            minRatio: 9 / 16,
            fixedRatio: false,
            bigClass: 'OV_big',
            bigPercentage: 0.8,
            bigFixedRatio: false,
            bigMaxRatio: 3 / 2,
            bigMinRatio: 9 / 16,
            bigFirst: true,
            animate: true // Whether you want to animate the transitions
        });
    };
    LayoutBestFitComponent.prototype.addRemoteStream = function (stream) {
        this.streams.push(stream);
        this.appRef.tick();
    };
    LayoutBestFitComponent.prototype.deleteRemoteStream = function (stream) {
        var index = this.streams.indexOf(stream, 0);
        if (index > -1) {
            this.streams.splice(index, 1);
        }
        this.appRef.tick();
    };
    LayoutBestFitComponent.prototype.leaveSession = function () {
        if (this.session) {
            this.session.disconnect();
        }
        ;
        this.streams = [];
        this.session = null;
    };
    LayoutBestFitComponent.prototype.onVideoPlaying = function (event) {
        var video = event.target;
        video.parentElement.parentElement.classList.remove('custom-class');
        this.openviduLayout.updateLayout();
    };
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["A" /* HostListener */])('window:beforeunload'),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], LayoutBestFitComponent.prototype, "beforeunloadHandler", null);
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["A" /* HostListener */])('window:resize', ['$event']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object]),
        __metadata("design:returntype", void 0)
    ], LayoutBestFitComponent.prototype, "sizeChange", null);
    LayoutBestFitComponent = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["n" /* Component */])({
            selector: 'app-layout-best-fit',
            template: __webpack_require__("./src/app/components/layouts/layout-best-fit/layout-best-fit.component.html"),
            styles: [__webpack_require__("./src/app/components/layouts/layout-best-fit/layout-best-fit.component.css")],
            encapsulation: __WEBPACK_IMPORTED_MODULE_0__angular_core__["_15" /* ViewEncapsulation */].None
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1__angular_router__["a" /* ActivatedRoute */], __WEBPACK_IMPORTED_MODULE_0__angular_core__["g" /* ApplicationRef */]])
    ], LayoutBestFitComponent);
    return LayoutBestFitComponent;
}());



/***/ }),

/***/ "./src/app/components/layouts/openvidu-layout.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return OpenViduLayout; });
var OpenViduLayout = (function () {
    function OpenViduLayout() {
    }
    OpenViduLayout.prototype.fixAspectRatio = function (elem, width) {
        var sub = elem.querySelector('.OT_root');
        if (sub) {
            // If this is the parent of a subscriber or publisher then we need
            // to force the mutation observer on the publisher or subscriber to
            // trigger to get it to fix it's layout
            var oldWidth = sub.style.width;
            sub.style.width = width + 'px';
            // sub.style.height = height + 'px';
            sub.style.width = oldWidth || '';
        }
    };
    OpenViduLayout.prototype.positionElement = function (elem, x, y, width, height, animate) {
        var _this = this;
        var targetPosition = {
            left: x + 'px',
            top: y + 'px',
            width: width + 'px',
            height: height + 'px'
        };
        this.fixAspectRatio(elem, width);
        if (animate && $) {
            $(elem).stop();
            $(elem).animate(targetPosition, animate.duration || 200, animate.easing || 'swing', function () {
                _this.fixAspectRatio(elem, width);
                if (animate.complete) {
                    animate.complete.call(_this);
                }
            });
        }
        else {
            $(elem).css(targetPosition);
        }
        this.fixAspectRatio(elem, width);
    };
    OpenViduLayout.prototype.getVideoRatio = function (elem) {
        if (!elem) {
            return 3 / 4;
        }
        var video = elem.querySelector('video');
        if (video && video.videoHeight && video.videoWidth) {
            return video.videoHeight / video.videoWidth;
        }
        else if (elem.videoHeight && elem.videoWidth) {
            return elem.videoHeight / elem.videoWidth;
        }
        return 3 / 4;
    };
    OpenViduLayout.prototype.getCSSNumber = function (elem, prop) {
        var cssStr = $(elem).css(prop);
        return cssStr ? parseInt(cssStr, 10) : 0;
    };
    // Really cheap UUID function
    OpenViduLayout.prototype.cheapUUID = function () {
        return (Math.random() * 100000000).toFixed(0);
    };
    OpenViduLayout.prototype.getHeight = function (elem) {
        var heightStr = $(elem).css('height');
        return heightStr ? parseInt(heightStr, 10) : 0;
    };
    OpenViduLayout.prototype.getWidth = function (elem) {
        var widthStr = $(elem).css('width');
        return widthStr ? parseInt(widthStr, 10) : 0;
    };
    OpenViduLayout.prototype.getBestDimensions = function (minR, maxR, count, WIDTH, HEIGHT, targetHeight) {
        var maxArea, targetCols, targetRows, targetWidth, tWidth, tHeight, tRatio;
        // Iterate through every possible combination of rows and columns
        // and see which one has the least amount of whitespace
        for (var i = 1; i <= count; i++) {
            var colsAux = i;
            var rowsAux = Math.ceil(count / colsAux);
            // Try taking up the whole height and width
            tHeight = Math.floor(HEIGHT / rowsAux);
            tWidth = Math.floor(WIDTH / colsAux);
            tRatio = tHeight / tWidth;
            if (tRatio > maxR) {
                // We went over decrease the height
                tRatio = maxR;
                tHeight = tWidth * tRatio;
            }
            else if (tRatio < minR) {
                // We went under decrease the width
                tRatio = minR;
                tWidth = tHeight / tRatio;
            }
            var area = (tWidth * tHeight) * count;
            // If this width and height takes up the most space then we're going with that
            if (maxArea === undefined || (area > maxArea)) {
                maxArea = area;
                targetHeight = tHeight;
                targetWidth = tWidth;
                targetCols = colsAux;
                targetRows = rowsAux;
            }
        }
        return {
            maxArea: maxArea,
            targetCols: targetCols,
            targetRows: targetRows,
            targetHeight: targetHeight,
            targetWidth: targetWidth,
            ratio: targetHeight / targetWidth
        };
    };
    ;
    OpenViduLayout.prototype.arrange = function (children, WIDTH, HEIGHT, offsetLeft, offsetTop, fixedRatio, minRatio, maxRatio, animate) {
        var targetHeight;
        var count = children.length;
        var dimensions;
        if (!fixedRatio) {
            dimensions = this.getBestDimensions(minRatio, maxRatio, count, WIDTH, HEIGHT, targetHeight);
        }
        else {
            // Use the ratio of the first video element we find to approximate
            var ratio = this.getVideoRatio(children.length > 0 ? children[0] : null);
            dimensions = this.getBestDimensions(ratio, ratio, count, WIDTH, HEIGHT, targetHeight);
        }
        // Loop through each stream in the container and place it inside
        var x = 0, y = 0;
        var rows = [];
        var row;
        // Iterate through the children and create an array with a new item for each row
        // and calculate the width of each row so that we know if we go over the size and need
        // to adjust
        for (var i = 0; i < children.length; i++) {
            if (i % dimensions.targetCols === 0) {
                // This is a new row
                row = {
                    children: [],
                    width: 0,
                    height: 0
                };
                rows.push(row);
            }
            var elem = children[i];
            row.children.push(elem);
            var targetWidth = dimensions.targetWidth;
            targetHeight = dimensions.targetHeight;
            // If we're using a fixedRatio then we need to set the correct ratio for this element
            if (fixedRatio) {
                targetWidth = targetHeight / this.getVideoRatio(elem);
            }
            row.width += targetWidth;
            row.height = targetHeight;
        }
        // Calculate total row height adjusting if we go too wide
        var totalRowHeight = 0;
        var remainingShortRows = 0;
        for (var i = 0; i < rows.length; i++) {
            row = rows[i];
            if (row.width > WIDTH) {
                // Went over on the width, need to adjust the height proportionally
                row.height = Math.floor(row.height * (WIDTH / row.width));
                row.width = WIDTH;
            }
            else if (row.width < WIDTH) {
                remainingShortRows += 1;
            }
            totalRowHeight += row.height;
        }
        if (totalRowHeight < HEIGHT && remainingShortRows > 0) {
            // We can grow some of the rows, we're not taking up the whole height
            var remainingHeightDiff = HEIGHT - totalRowHeight;
            totalRowHeight = 0;
            for (var i = 0; i < rows.length; i++) {
                row = rows[i];
                if (row.width < WIDTH) {
                    // Evenly distribute the extra height between the short rows
                    var extraHeight = remainingHeightDiff / remainingShortRows;
                    if ((extraHeight / row.height) > ((WIDTH - row.width) / row.width)) {
                        // We can't go that big or we'll go too wide
                        extraHeight = Math.floor(((WIDTH - row.width) / row.width) * row.height);
                    }
                    row.width += Math.floor((extraHeight / row.height) * row.width);
                    row.height += extraHeight;
                    remainingHeightDiff -= extraHeight;
                    remainingShortRows -= 1;
                }
                totalRowHeight += row.height;
            }
        }
        // vertical centering
        y = ((HEIGHT - (totalRowHeight)) / 2);
        // Iterate through each row and place each child
        for (var i = 0; i < rows.length; i++) {
            row = rows[i];
            // center the row
            var rowMarginLeft = ((WIDTH - row.width) / 2);
            x = rowMarginLeft;
            for (var j = 0; j < row.children.length; j++) {
                var elem = row.children[j];
                var targetWidth = dimensions.targetWidth;
                targetHeight = row.height;
                // If we're using a fixedRatio then we need to set the correct ratio for this element
                if (fixedRatio) {
                    targetWidth = Math.floor(targetHeight / this.getVideoRatio(elem));
                }
                elem.style.position = 'absolute';
                // $(elem).css('position', 'absolute');
                var actualWidth = targetWidth - this.getCSSNumber(elem, 'paddingLeft') -
                    this.getCSSNumber(elem, 'paddingRight') -
                    this.getCSSNumber(elem, 'marginLeft') -
                    this.getCSSNumber(elem, 'marginRight') -
                    this.getCSSNumber(elem, 'borderLeft') -
                    this.getCSSNumber(elem, 'borderRight');
                var actualHeight = targetHeight - this.getCSSNumber(elem, 'paddingTop') -
                    this.getCSSNumber(elem, 'paddingBottom') -
                    this.getCSSNumber(elem, 'marginTop') -
                    this.getCSSNumber(elem, 'marginBottom') -
                    this.getCSSNumber(elem, 'borderTop') -
                    this.getCSSNumber(elem, 'borderBottom');
                this.positionElement(elem, x + offsetLeft, y + offsetTop, actualWidth, actualHeight, animate);
                x += targetWidth;
            }
            y += targetHeight;
        }
    };
    OpenViduLayout.prototype.filterDisplayNone = function (element) {
        return element.style.display !== 'none';
    };
    OpenViduLayout.prototype.updateLayout = function () {
        if (this.layoutContainer.style.display === 'none') {
            return;
        }
        var id = this.layoutContainer.id;
        if (!id) {
            id = 'OT_' + this.cheapUUID();
            this.layoutContainer.id = id;
        }
        var HEIGHT = this.getHeight(this.layoutContainer) -
            this.getCSSNumber(this.layoutContainer, 'borderTop') -
            this.getCSSNumber(this.layoutContainer, 'borderBottom');
        var WIDTH = this.getWidth(this.layoutContainer) -
            this.getCSSNumber(this.layoutContainer, 'borderLeft') -
            this.getCSSNumber(this.layoutContainer, 'borderRight');
        var availableRatio = HEIGHT / WIDTH;
        var offsetLeft = 0;
        var offsetTop = 0;
        var bigOffsetTop = 0;
        var bigOffsetLeft = 0;
        var bigOnes = Array.prototype.filter.call(this.layoutContainer.querySelectorAll('#' + id + '>.' + this.opts.bigClass), this.filterDisplayNone);
        var smallOnes = Array.prototype.filter.call(this.layoutContainer.querySelectorAll('#' + id + '>*:not(.' + this.opts.bigClass + ')'), this.filterDisplayNone);
        if (bigOnes.length > 0 && smallOnes.length > 0) {
            var bigWidth = void 0, bigHeight = void 0;
            if (availableRatio > this.getVideoRatio(bigOnes[0])) {
                // We are tall, going to take up the whole width and arrange small
                // guys at the bottom
                bigWidth = WIDTH;
                bigHeight = Math.floor(HEIGHT * this.opts.bigPercentage);
                offsetTop = bigHeight;
                bigOffsetTop = HEIGHT - offsetTop;
            }
            else {
                // We are wide, going to take up the whole height and arrange the small
                // guys on the right
                bigHeight = HEIGHT;
                bigWidth = Math.floor(WIDTH * this.opts.bigPercentage);
                offsetLeft = bigWidth;
                bigOffsetLeft = WIDTH - offsetLeft;
            }
            if (this.opts.bigFirst) {
                this.arrange(bigOnes, bigWidth, bigHeight, 0, 0, this.opts.bigFixedRatio, this.opts.bigMinRatio, this.opts.bigMaxRatio, this.opts.animate);
                this.arrange(smallOnes, WIDTH - offsetLeft, HEIGHT - offsetTop, offsetLeft, offsetTop, this.opts.fixedRatio, this.opts.minRatio, this.opts.maxRatio, this.opts.animate);
            }
            else {
                this.arrange(smallOnes, WIDTH - offsetLeft, HEIGHT - offsetTop, 0, 0, this.opts.fixedRatio, this.opts.minRatio, this.opts.maxRatio, this.opts.animate);
                this.arrange(bigOnes, bigWidth, bigHeight, bigOffsetLeft, bigOffsetTop, this.opts.bigFixedRatio, this.opts.bigMinRatio, this.opts.bigMaxRatio, this.opts.animate);
            }
        }
        else if (bigOnes.length > 0 && smallOnes.length === 0) {
            this.
                // We only have one bigOne just center it
                arrange(bigOnes, WIDTH, HEIGHT, 0, 0, this.opts.bigFixedRatio, this.opts.bigMinRatio, this.opts.bigMaxRatio, this.opts.animate);
        }
        else {
            this.arrange(smallOnes, WIDTH - offsetLeft, HEIGHT - offsetTop, offsetLeft, offsetTop, this.opts.fixedRatio, this.opts.minRatio, this.opts.maxRatio, this.opts.animate);
        }
    };
    OpenViduLayout.prototype.initLayoutContainer = function (container, opts) {
        this.opts = {
            maxRatio: (opts.maxRatio != null) ? opts.maxRatio : 3 / 2,
            minRatio: (opts.minRatio != null) ? opts.minRatio : 9 / 16,
            fixedRatio: (opts.fixedRatio != null) ? opts.fixedRatio : false,
            animate: (opts.animate != null) ? opts.animate : false,
            bigClass: (opts.bigClass != null) ? opts.bigClass : 'OT_big',
            bigPercentage: (opts.bigPercentage != null) ? opts.bigPercentage : 0.8,
            bigFixedRatio: (opts.bigFixedRatio != null) ? opts.bigFixedRatio : false,
            bigMaxRatio: (opts.bigMaxRatio != null) ? opts.bigMaxRatio : 3 / 2,
            bigMinRatio: (opts.bigMinRatio != null) ? opts.bigMinRatio : 9 / 16,
            bigFirst: (opts.bigFirst != null) ? opts.bigFirst : true
        };
        this.layoutContainer = typeof (container) === 'string' ? $(container) : container;
    };
    OpenViduLayout.prototype.setLayoutOptions = function (options) {
        this.opts = options;
    };
    return OpenViduLayout;
}());



/***/ }),

/***/ "./src/app/components/session-details/session-details.component.css":
/***/ (function(module, exports) {

module.exports = ""

/***/ }),

/***/ "./src/app/components/session-details/session-details.component.html":
/***/ (function(module, exports) {

module.exports = "<p>\n  session-details works!\n</p>\n"

/***/ }),

/***/ "./src/app/components/session-details/session-details.component.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return SessionDetailsComponent; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("./node_modules/@angular/core/esm5/core.js");
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};

var SessionDetailsComponent = (function () {
    function SessionDetailsComponent() {
    }
    SessionDetailsComponent.prototype.ngOnInit = function () {
    };
    SessionDetailsComponent = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["n" /* Component */])({
            selector: 'app-session-details',
            template: __webpack_require__("./src/app/components/session-details/session-details.component.html"),
            styles: [__webpack_require__("./src/app/components/session-details/session-details.component.css")]
        }),
        __metadata("design:paramtypes", [])
    ], SessionDetailsComponent);
    return SessionDetailsComponent;
}());



/***/ }),

/***/ "./src/app/services/info.service.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return InfoService; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("./node_modules/@angular/core/esm5/core.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_rxjs_Subject__ = __webpack_require__("./node_modules/rxjs/_esm5/Subject.js");
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};


var InfoService = (function () {
    function InfoService() {
        this.newInfo$ = new __WEBPACK_IMPORTED_MODULE_1_rxjs_Subject__["a" /* Subject */]();
    }
    InfoService.prototype.getInfo = function () {
        return this.info;
    };
    InfoService.prototype.updateInfo = function (info) {
        this.info = info;
        this.newInfo$.next(info);
    };
    InfoService = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["C" /* Injectable */])(),
        __metadata("design:paramtypes", [])
    ], InfoService);
    return InfoService;
}());



/***/ }),

/***/ "./src/environments/environment.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return environment; });
// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.
var environment = {
    production: false
};


/***/ }),

/***/ "./src/main.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("./node_modules/@angular/core/esm5/core.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_platform_browser_dynamic__ = __webpack_require__("./node_modules/@angular/platform-browser-dynamic/esm5/platform-browser-dynamic.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__app_app_module__ = __webpack_require__("./src/app/app.module.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__environments_environment__ = __webpack_require__("./src/environments/environment.ts");




if (__WEBPACK_IMPORTED_MODULE_3__environments_environment__["a" /* environment */].production) {
    Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_18" /* enableProdMode */])();
}
Object(__WEBPACK_IMPORTED_MODULE_1__angular_platform_browser_dynamic__["a" /* platformBrowserDynamic */])().bootstrapModule(__WEBPACK_IMPORTED_MODULE_2__app_app_module__["a" /* AppModule */]);


/***/ }),

/***/ 0:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__("./src/main.ts");


/***/ })

},[0]);
//# sourceMappingURL=main.bundle.js.map