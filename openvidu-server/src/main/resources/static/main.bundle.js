webpackJsonp([1,4],{

/***/ 112:
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

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(9)))

/***/ }),

/***/ 113:
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
var EventEmitter = __webpack_require__(91).EventEmitter;
var inherits = __webpack_require__(92);
var packers = __webpack_require__(267);
var Mapper = __webpack_require__(261);
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
var clients = __webpack_require__(262);
var transports = __webpack_require__(264);
RpcBuilder.clients = clients;
RpcBuilder.clients.transports = transports;
RpcBuilder.packers = packers;


/***/ }),

/***/ 114:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var EventEmitter = __webpack_require__(32);
var Publisher = /** @class */ (function () {
    function Publisher(stream, parentId) {
        var _this = this;
        this.ee = new EventEmitter();
        this.accessAllowed = false;
        this.stream = stream;
        this.stream.addEventListener('camera-access-changed', function (event) {
            _this.accessAllowed = event.accessAllowed;
            if (_this.accessAllowed) {
                _this.ee.emitEvent('accessAllowed');
            }
            else {
                _this.ee.emitEvent('accessDenied');
            }
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
                this.stream.addOnceEventListener('video-is-playing', function (element) {
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
                this.stream.addOnceEventListener('remote-video-is-playing', function (element) {
                    _this.ee.emitEvent('remoteVideoPlaying', [{
                            element: element.element
                        }]);
                });
            }
        }
        if (eventName == 'streamCreated') {
            if (this.stream.isReady) {
                this.ee.emitEvent('streamCreated', [{ stream: this.stream }]);
            }
            else {
                this.stream.addEventListener('stream-created-by-publisher', function () {
                    console.warn('Publisher emitting streamCreated');
                    _this.ee.emitEvent('streamCreated', [{ stream: _this.stream }]);
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


/***/ }),

/***/ 115:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var Subscriber_1 = __webpack_require__(116);
var EventEmitter = __webpack_require__(32);
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
            for (var _i = 0, _a = _this.openVidu.openVidu.getRemoteStreams(); _i < _a.length; _i++) {
                s = _a[_i];
                s.removeVideo();
            }
            if (_this.connection) {
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
        publisher.session = this;
        publisher.stream.publish();
    };
    Session.prototype.unpublish = function (publisher) {
        this.session.unpublish(publisher.stream);
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
        this.session.unsuscribe(subscriber.stream);
        subscriber.stream.removeVideo();
    };
    /* Shortcut event API */
    Session.prototype.onStreamCreated = function (callback) {
        this.session.addEventListener("streamCreated", function (streamEvent) {
            callback(streamEvent.stream);
        });
    };
    Session.prototype.onStreamDestroyed = function (callback) {
        this.session.addEventListener("streamDestroyed", function (streamEvent) {
            callback(streamEvent.stream);
        });
    };
    Session.prototype.onParticipantJoined = function (callback) {
        this.session.addEventListener("participant-joined", function (participantEvent) {
            callback(participantEvent.connection);
        });
    };
    Session.prototype.onParticipantLeft = function (callback) {
        this.session.addEventListener("participant-left", function (participantEvent) {
            callback(participantEvent.connection);
        });
    };
    Session.prototype.onParticipantPublished = function (callback) {
        this.session.addEventListener("participant-published", function (participantEvent) {
            callback(participantEvent.connection);
        });
    };
    Session.prototype.onParticipantEvicted = function (callback) {
        this.session.addEventListener("participant-evicted", function (participantEvent) {
            callback(participantEvent.connection);
        });
    };
    Session.prototype.onRoomClosed = function (callback) {
        this.session.addEventListener("room-closed", function (roomEvent) {
            callback(roomEvent.room);
        });
    };
    Session.prototype.onLostConnection = function (callback) {
        this.session.addEventListener("lost-connection", function (roomEvent) {
            callback(roomEvent.room);
        });
    };
    Session.prototype.onMediaError = function (callback) {
        this.session.addEventListener("error-media", function (errorEvent) {
            callback(errorEvent.error);
        });
    };
    return Session;
}());
exports.Session = Session;


/***/ }),

/***/ 116:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var EventEmitter = __webpack_require__(32);
var Subscriber = /** @class */ (function () {
    function Subscriber(stream, parentId) {
        this.ee = new EventEmitter();
        this.stream = stream;
        if (document.getElementById(parentId) != null) {
            this.element = document.getElementById(parentId);
        }
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
                    console.warn("Subscriber emitting videoElementCreated");
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


/***/ }),

/***/ 117:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var Stream_1 = __webpack_require__(72);
var Connection = /** @class */ (function () {
    function Connection(openVidu, local, room, options) {
        this.openVidu = openVidu;
        this.local = local;
        this.room = room;
        this.options = options;
        this.streams = {};
        this.streamsOpts = [];
        console.info("'Connection' created (" + (local ? "local" : "remote") + ")" + (local ? "" : ", with 'connectionId' [" + (options ? options.id : '') + "] "));
        if (options) {
            this.connectionId = options.id;
            this.data = options.metadata;
            if (options.streams) {
                this.initStreams(options);
            }
        }
    }
    Connection.prototype.addStream = function (stream) {
        this.streams[stream.getIdInParticipant()] = stream;
        this.room.getStreams()[stream.getIdInParticipant()] = stream;
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
    Connection.prototype.initStreams = function (options) {
        for (var _i = 0, _a = options.streams; _i < _a.length; _i++) {
            var streamOptions = _a[_i];
            var streamOpts = {
                id: streamOptions.id,
                connection: this,
                sendAudio: streamOptions.sendAudio,
                sendVideo: streamOptions.sendVideo,
                recvAudio: (streamOptions.audioActive == undefined ? true : streamOptions.audioActive),
                recvVideo: (streamOptions.videoActive == undefined ? true : streamOptions.videoActive),
                activeAudio: streamOptions.activeAudio,
                activeVideo: streamOptions.activeVideo,
                data: streamOptions.data,
                mediaConstraints: streamOptions.mediaConstraints
            };
            var stream = new Stream_1.Stream(this.openVidu, false, this.room, streamOpts);
            this.addStream(stream);
            this.streamsOpts.push(streamOpts);
        }
        console.info("Remote 'Connection' with 'connectionId' [" + this.connectionId + "] is now configured for receiving Streams with options: ", this.streamsOpts);
    };
    return Connection;
}());
exports.Connection = Connection;


/***/ }),

/***/ 119:
/***/ (function(module, exports) {

function webpackEmptyContext(req) {
	throw new Error("Cannot find module '" + req + "'.");
}
webpackEmptyContext.keys = function() { return []; };
webpackEmptyContext.resolve = webpackEmptyContext;
module.exports = webpackEmptyContext;
webpackEmptyContext.id = 119;


/***/ }),

/***/ 120:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_platform_browser_dynamic__ = __webpack_require__(126);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__app_app_module__ = __webpack_require__(131);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__environments_environment__ = __webpack_require__(133);




if (__WEBPACK_IMPORTED_MODULE_3__environments_environment__["a" /* environment */].production) {
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["a" /* enableProdMode */])();
}
__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__angular_platform_browser_dynamic__["a" /* platformBrowserDynamic */])().bootstrapModule(__WEBPACK_IMPORTED_MODULE_2__app_app_module__["a" /* AppModule */]);
//# sourceMappingURL=main.js.map

/***/ }),

/***/ 129:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_app_services_info_service__ = __webpack_require__(43);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AppComponent; });
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};


var AppComponent = (function () {
    function AppComponent(infoService) {
        this.infoService = infoService;
    }
    AppComponent.prototype.ngOnInit = function () {
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
    AppComponent.prototype.ngOnDestroy = function () {
        this.websocket.close();
    };
    AppComponent.prototype.beforeUnloadHander = function (event) {
        console.warn('Closing info websocket');
        this.websocket.close();
    };
    return AppComponent;
}());
__decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_13" /* HostListener */])('window:beforeunload', ['$event']),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AppComponent.prototype, "beforeUnloadHander", null);
AppComponent = __decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_5" /* Component */])({
        selector: 'app-root',
        template: __webpack_require__(198),
        styles: [__webpack_require__(188)]
    }),
    __metadata("design:paramtypes", [typeof (_a = typeof __WEBPACK_IMPORTED_MODULE_1_app_services_info_service__["a" /* InfoService */] !== "undefined" && __WEBPACK_IMPORTED_MODULE_1_app_services_info_service__["a" /* InfoService */]) === "function" && _a || Object])
], AppComponent);

var _a;
//# sourceMappingURL=app.component.js.map

/***/ }),

/***/ 130:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_platform_browser_animations__ = __webpack_require__(127);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__angular_material__ = __webpack_require__(75);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AppMaterialModule; });
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};



var AppMaterialModule = (function () {
    function AppMaterialModule() {
    }
    return AppMaterialModule;
}());
AppMaterialModule = __decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["b" /* NgModule */])({
        imports: [
            __WEBPACK_IMPORTED_MODULE_1__angular_platform_browser_animations__["a" /* BrowserAnimationsModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["a" /* MdButtonModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["b" /* MdIconModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["c" /* MdCheckboxModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["d" /* MdCardModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["e" /* MdInputModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["f" /* MdProgressSpinnerModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["g" /* MdTooltipModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["h" /* MdDialogModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["i" /* MdSlideToggleModule */]
        ],
        exports: [
            __WEBPACK_IMPORTED_MODULE_1__angular_platform_browser_animations__["a" /* BrowserAnimationsModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["a" /* MdButtonModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["b" /* MdIconModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["c" /* MdCheckboxModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["d" /* MdCardModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["e" /* MdInputModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["f" /* MdProgressSpinnerModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["g" /* MdTooltipModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["h" /* MdDialogModule */],
            __WEBPACK_IMPORTED_MODULE_2__angular_material__["i" /* MdSlideToggleModule */]
        ],
    })
], AppMaterialModule);

//# sourceMappingURL=app.material.module.js.map

/***/ }),

/***/ 131:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_platform_browser__ = __webpack_require__(13);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_flex_layout__ = __webpack_require__(125);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__angular_core__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__angular_forms__ = __webpack_require__(73);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__angular_http__ = __webpack_require__(74);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_hammerjs__ = __webpack_require__(192);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_hammerjs___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_5_hammerjs__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__app_routing__ = __webpack_require__(132);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7_app_app_material_module__ = __webpack_require__(130);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__services_info_service__ = __webpack_require__(43);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__app_component__ = __webpack_require__(129);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10__components_dashboard_dashboard_component__ = __webpack_require__(77);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11__components_session_details_session_details_component__ = __webpack_require__(78);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12__components_dashboard_credentials_dialog_component__ = __webpack_require__(76);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AppModule; });
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};













var AppModule = (function () {
    function AppModule() {
    }
    return AppModule;
}());
AppModule = __decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2__angular_core__["b" /* NgModule */])({
        declarations: [
            __WEBPACK_IMPORTED_MODULE_9__app_component__["a" /* AppComponent */],
            __WEBPACK_IMPORTED_MODULE_10__components_dashboard_dashboard_component__["a" /* DashboardComponent */],
            __WEBPACK_IMPORTED_MODULE_11__components_session_details_session_details_component__["a" /* SessionDetailsComponent */],
            __WEBPACK_IMPORTED_MODULE_12__components_dashboard_credentials_dialog_component__["a" /* CredentialsDialogComponent */],
        ],
        imports: [
            __WEBPACK_IMPORTED_MODULE_0__angular_platform_browser__["a" /* BrowserModule */],
            __WEBPACK_IMPORTED_MODULE_3__angular_forms__["a" /* FormsModule */],
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

//# sourceMappingURL=app.module.js.map

/***/ }),

/***/ 132:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_router__ = __webpack_require__(128);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_app_components_dashboard_dashboard_component__ = __webpack_require__(77);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_app_components_session_details_session_details_component__ = __webpack_require__(78);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return routing; });



var appRoutes = [
    {
        path: '',
        component: __WEBPACK_IMPORTED_MODULE_1_app_components_dashboard_dashboard_component__["a" /* DashboardComponent */]
    },
    {
        path: 'session/:id',
        component: __WEBPACK_IMPORTED_MODULE_2_app_components_session_details_session_details_component__["a" /* SessionDetailsComponent */]
    }
];
var routing = __WEBPACK_IMPORTED_MODULE_0__angular_router__["a" /* RouterModule */].forRoot(appRoutes);
//# sourceMappingURL=app.routing.js.map

/***/ }),

/***/ 133:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return environment; });
// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.
// The file contents for the current environment will overwrite these during build.
var environment = {
    production: false
};
//# sourceMappingURL=environment.js.map

/***/ }),

/***/ 188:
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(21)(false);
// imports


// module
exports.push([module.i, "", ""]);

// exports


/*** EXPORTS FROM exports-loader ***/
module.exports = module.exports.toString();

/***/ }),

/***/ 189:
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(21)(false);
// imports


// module
exports.push([module.i, "#dashboard-div {\n  padding: 20px;\n}\n\n#log {\n  height: 90%;\n}\n\n#log-content {\n  height: 90%;\n  font-family: Consolas, 'Liberation Mono', Menlo, Courier, monospace;\n  overflow-y: auto;\n  overflow-x: hidden\n}\n\nul {\n  margin: 0;\n}\n\nbutton.mat-raised-button {\n  text-transform: uppercase;\n  float: right;\n}\n\nmd-card-title button.blue {\n  color: #ffffff;\n  background-color: #0088aa;\n}\n\nmd-card-title button.yellow {\n  color: rgba(0, 0, 0, 0.87);\n  background-color: #ffcc00;\n}\n\nmd-spinner {\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  -webkit-transform: translate(-50%, -50%);\n          transform: translate(-50%, -50%);\n}\n\n#tick-div {\n  width: 100px;\n  height: 100px;\n  z-index: 1;\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  -webkit-transform: translate(-50%, -50%);\n          transform: translate(-50%, -50%);\n}\n\n#tooltip-tick {\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  z-index: 2;\n}\n\n.circ {\n  opacity: 0;\n  stroke-dasharray: 130;\n  stroke-dashoffset: 130;\n  transition: all 1s;\n}\n\n.tick {\n  stroke-dasharray: 50;\n  stroke-dashoffset: 50;\n  transition: stroke-dashoffset 1s 0.5s ease-out;\n}\n\n.drawn+svg .path {\n  opacity: 1;\n  stroke-dashoffset: 0;\n}\n\n#mirrored-video {\n  position: relative;\n}\n\n\n/* Pure CSS loader */\n\n#loader {\n  width: 100px;\n  height: 100px;\n  z-index: 1;\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  -webkit-transform: translate(-50%, -50%);\n  transform: translate(-50%, -50%);\n}\n\n#loader * {\n  box-sizing: border-box;\n}\n\n#loader ::after {\n  box-sizing: border-box;\n}\n\n#loader ::before {\n  box-sizing: border-box;\n}\n\n.loader-1 {\n  height: 100px;\n  width: 100px;\n  -webkit-animation: loader-1-1 4.8s linear infinite;\n  animation: loader-1-1 4.8s linear infinite;\n}\n\n@-webkit-keyframes loader-1-1 {\n  0% {\n    -webkit-transform: rotate(0deg);\n  }\n  100% {\n    -webkit-transform: rotate(360deg);\n  }\n}\n\n@keyframes loader-1-1 {\n  0% {\n    -webkit-transform: rotate(0deg);\n            transform: rotate(0deg);\n  }\n  100% {\n    -webkit-transform: rotate(360deg);\n            transform: rotate(360deg);\n  }\n}\n\n.loader-1 span {\n  display: block;\n  position: absolute;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  right: 0;\n  margin: auto;\n  height: 100px;\n  width: 100px;\n  clip: rect(0, 100px, 100px, 50px);\n  -webkit-animation: loader-1-2 1.2s linear infinite;\n  animation: loader-1-2 1.2s linear infinite;\n}\n\n@-webkit-keyframes loader-1-2 {\n  0% {\n    -webkit-transform: rotate(0deg);\n  }\n  100% {\n    -webkit-transform: rotate(220deg);\n  }\n}\n\n@keyframes loader-1-2 {\n  0% {\n    -webkit-transform: rotate(0deg);\n            transform: rotate(0deg);\n  }\n  100% {\n    -webkit-transform: rotate(220deg);\n            transform: rotate(220deg);\n  }\n}\n\n.loader-1 span::after {\n  content: \"\";\n  position: absolute;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  right: 0;\n  margin: auto;\n  height: 100px;\n  width: 100px;\n  clip: rect(0, 100px, 100px, 50px);\n  border: 8px solid #4d4d4d;\n  border-radius: 50%;\n  -webkit-animation: loader-1-3 1.2s cubic-bezier(0.770, 0.000, 0.175, 1.000) infinite;\n  animation: loader-1-3 1.2s cubic-bezier(0.770, 0.000, 0.175, 1.000) infinite;\n}\n\n@-webkit-keyframes loader-1-3 {\n  0% {\n    -webkit-transform: rotate(-140deg);\n  }\n  50% {\n    -webkit-transform: rotate(-160deg);\n  }\n  100% {\n    -webkit-transform: rotate(140deg);\n  }\n}\n\n@keyframes loader-1-3 {\n  0% {\n    -webkit-transform: rotate(-140deg);\n            transform: rotate(-140deg);\n  }\n  50% {\n    -webkit-transform: rotate(-160deg);\n            transform: rotate(-160deg);\n  }\n  100% {\n    -webkit-transform: rotate(140deg);\n            transform: rotate(140deg);\n  }\n}", ""]);

// exports


/*** EXPORTS FROM exports-loader ***/
module.exports = module.exports.toString();

/***/ }),

/***/ 190:
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(21)(false);
// imports


// module
exports.push([module.i, "", ""]);

// exports


/*** EXPORTS FROM exports-loader ***/
module.exports = module.exports.toString();

/***/ }),

/***/ 198:
/***/ (function(module, exports) {

module.exports = "<main>\n  <router-outlet></router-outlet>\n</main>"

/***/ }),

/***/ 199:
/***/ (function(module, exports) {

module.exports = "<div id=\"dashboard-div\" fxLayout=\"row\" fxLayout.xs=\"column\" fxLayoutGap=\"20px\" fxFlexFill>\n\n  <div fxLayout=\"column\" fxFlex=\"66%\" fxFlexOrder=\"1\" fxFlexOrder.xs=\"2\">\n    <md-card id=\"log\">\n      <md-card-title>Server events\n        <md-slide-toggle title=\"Lock Scroll\" [(ngModel)]=\"lockScroll\" style=\"float: right; margin-left: auto;\">\n          <md-icon>lock_outline</md-icon>\n        </md-slide-toggle>\n      </md-card-title>\n      <md-divider></md-divider>\n      <md-card-content #scrollMe id=\"log-content\">\n        <ul>\n          <li *ngFor=\"let i of info\">\n            <p>{{i}}</p>\n          </li>\n        </ul>\n      </md-card-content>\n    </md-card>\n  </div>\n\n  <div fxLayout=\"column\" fxFlex=\"33%\" fxFlexOrder=\"2\" fxFlexOrder.xs=\"1\">\n    <md-card id=\"video-loop\">\n      <md-card-title>Test the connection\n        <button [class]=\"testStatus == 'DISCONNECTED' ? 'blue' : (testStatus == 'PLAYING' ? 'yellow' : 'disabled')\" md-raised-button\n          (click)=\"toggleTestVideo()\" [disabled]=\"testStatus==='CONNECTING' || testStatus==='CONNECTED'\">{{testButton}}</button></md-card-title>\n      <md-card-content>\n        <div id=\"mirrored-video\">\n          <div *ngIf=\"showSpinner\" id=\"loader\">\n            <div class=\"loader-1 center\"><span></span></div>\n          </div>\n          <!--<md-spinner *ngIf=\"showSpinner\" [color]=\"color\"></md-spinner>-->\n          <div *ngIf=\"session\" id=\"tick-div\">\n            <div id=\"tooltip-tick\" *ngIf=\"testStatus=='PLAYING'\" mdTooltip=\"The connection is successful\" mdTooltipPosition=\"below\"></div>\n            <div [class]=\"testStatus=='PLAYING' ? 'trigger drawn' : 'trigger'\"></div>\n            <svg version=\"1.1\" id=\"tick\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\n              viewBox=\"-1 -1 39 39\" style=\"enable-background:new 0 0 37 37;\" xml:space=\"preserve\">\n              <path class=\"circ path\" style=\"fill:none;stroke:#06d362;stroke-width:4;stroke-linejoin:round;stroke-miterlimit:10;\" d=\"\n\tM30.5,6.5L30.5,6.5c6.6,6.6,6.6,17.4,0,24l0,0c-6.6,6.6-17.4,6.6-24,0l0,0c-6.6-6.6-6.6-17.4,0-24l0,0C13.1-0.2,23.9-0.2,30.5,6.5z\"\n              />\n              <polyline class=\"tick path\" style=\"fill:none;stroke:#06d362;stroke-width:4;stroke-linejoin:round;stroke-miterlimit:10;\" points=\"\n\t11.6,20 15.9,24.2 26.4,13.8 \" />\n            </svg>\n          </div>\n        </div>\n        <div id=\"msg-chain\"><p *ngFor=\"let msg of msgChain\">{{msg}}</p></div>\n      </md-card-content>\n    </md-card>\n  </div>\n\n</div>\n"

/***/ }),

/***/ 200:
/***/ (function(module, exports) {

module.exports = "<p>\n  session-details works!\n</p>\n"

/***/ }),

/***/ 261:
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


/***/ }),

/***/ 262:
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
var JsonRpcClient = __webpack_require__(263);
exports.JsonRpcClient = JsonRpcClient;


/***/ }),

/***/ 263:
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
var RpcBuilder = __webpack_require__(113);
var WebSocketWithReconnection = __webpack_require__(112);
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


/***/ }),

/***/ 264:
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
var WebSocketWithReconnection = __webpack_require__(112);
exports.WebSocketWithReconnection = WebSocketWithReconnection;


/***/ }),

/***/ 265:
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


/***/ }),

/***/ 266:
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


/***/ }),

/***/ 267:
/***/ (function(module, exports, __webpack_require__) {

var JsonRPC = __webpack_require__(265);
var XmlRPC = __webpack_require__(266);
exports.JsonRPC = JsonRPC;
exports.XmlRPC = XmlRPC;


/***/ }),

/***/ 268:
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
var freeice = __webpack_require__(191);
var inherits = __webpack_require__(92);
var UAParser = __webpack_require__(275);
var uuid = __webpack_require__(277);
var hark = __webpack_require__(193);
var EventEmitter = __webpack_require__(91).EventEmitter;
var recursive = __webpack_require__(196).recursive.bind(undefined, true);
var sdpTranslator = __webpack_require__(258);
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
                    break;
                }
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


/***/ }),

/***/ 269:
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
var WebRtcPeer = __webpack_require__(268);
exports.WebRtcPeer = WebRtcPeer;


/***/ }),

/***/ 270:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
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
var OpenViduInternal_1 = __webpack_require__(272);
var Session_1 = __webpack_require__(115);
var Publisher_1 = __webpack_require__(114);
var adapter = __webpack_require__(118);
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
            if (cameraOptions != null) {
                var cameraOptionsAux = {
                    sendAudio: cameraOptions.audio != null ? cameraOptions.audio : true,
                    sendVideo: cameraOptions.video != null ? cameraOptions.video : true,
                    activeAudio: cameraOptions.activeAudio != null ? cameraOptions.activeAudio : true,
                    activeVideo: cameraOptions.activeVideo != null ? cameraOptions.activeVideo : true,
                    data: true,
                    mediaConstraints: this.openVidu.generateMediaConstraints(cameraOptions)
                };
                cameraOptions = cameraOptionsAux;
            }
            else {
                cameraOptions = {
                    sendAudio: true,
                    sendVideo: true,
                    activeAudio: true,
                    activeVideo: true,
                    data: true,
                    mediaConstraints: {
                        audio: true,
                        video: { width: { ideal: 1280 } }
                    }
                };
            }
            var publisher = new Publisher_1.Publisher(this.openVidu.initPublisherTagged(parentId, cameraOptions, callback), parentId);
            console.info("'Publisher' initialized");
            return publisher;
        }
        else {
            alert("Browser not supported");
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
        }).catch(function (error) {
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
    return OpenVidu;
}());
exports.OpenVidu = OpenVidu;


/***/ }),

/***/ 271:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(__webpack_require__(270));
__export(__webpack_require__(115));
__export(__webpack_require__(114));
__export(__webpack_require__(116));
__export(__webpack_require__(72));
__export(__webpack_require__(117));


/***/ }),

/***/ 272:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
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
var SessionInternal_1 = __webpack_require__(273);
var Stream_1 = __webpack_require__(72);
var RpcBuilder = __webpack_require__(113);
var OpenViduInternal = /** @class */ (function () {
    function OpenViduInternal() {
        this.remoteStreams = [];
    }
    ;
    /* NEW METHODS */
    OpenViduInternal.prototype.initSession = function (sessionId) {
        console.info("'Session' initialized with 'sessionId' [" + sessionId + "]");
        this.session = new SessionInternal_1.SessionInternal(this, sessionId);
        return this.session;
    };
    OpenViduInternal.prototype.initPublisherTagged = function (parentId, cameraOptions, callback) {
        var _this = this;
        this.getCamera(cameraOptions);
        if (callback == null) {
            this.camera.requestCameraAccess(function (error, camera) {
                if (error) {
                    console.error("Error accessing the camera", error);
                }
                else {
                    _this.camera.setVideoElement(_this.cameraReady(camera, parentId));
                }
            });
            return this.camera;
        }
        else {
            this.camera.requestCameraAccess(function (error, camera) {
                if (error) {
                    callback(error);
                }
                else {
                    _this.camera.setVideoElement(_this.cameraReady(camera, parentId));
                    callback(undefined);
                }
            });
            return this.camera;
        }
    };
    OpenViduInternal.prototype.cameraReady = function (camera, parentId) {
        this.camera = camera;
        var videoElement = this.camera.playOnlyVideo(parentId, null);
        this.camera.emitStreamReadyEvent();
        return videoElement;
    };
    OpenViduInternal.prototype.initPublisher = function (cameraOptions, callback) {
        this.getCamera(cameraOptions);
        this.camera.requestCameraAccess(function (error, camera) {
            if (error)
                callback(error);
            else
                callback(undefined);
        });
    };
    OpenViduInternal.prototype.getLocalStream = function () {
        return this.camera;
    };
    OpenViduInternal.prototype.getRemoteStreams = function () {
        return this.remoteStreams;
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
                participantUnpublished: this.onParticipantLeft.bind(this),
                participantLeft: this.onParticipantLeft.bind(this),
                participantEvicted: this.onParticipantEvicted.bind(this),
                sendMessage: this.onNewMessage.bind(this),
                iceCandidate: this.iceCandidateEvent.bind(this),
                mediaError: this.onMediaError.bind(this),
                custonNotification: this.customNotification.bind(this)
            }
        };
        this.jsonRpcClient = new RpcBuilder.clients.JsonRpcClient(config);
    };
    OpenViduInternal.prototype.customNotification = function (params) {
        if (this.isRoomAvailable()) {
            this.session.emitEvent("custom-message-received", [{ params: params }]);
        }
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
            console.warn('Room instance not found');
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
    OpenViduInternal.prototype.getCamera = function (options) {
        if (this.camera) {
            return this.camera;
        }
        options = options || {
            sendAudio: true,
            sendVideo: true,
            activeAudio: true,
            activeVideo: true,
            data: true,
            mediaConstraints: {
                audio: true,
                video: { width: { ideal: 1280 } }
            }
        };
        options.connection = this.session.getLocalParticipant();
        this.camera = new Stream_1.Stream(this, true, this.session, options);
        return this.camera;
    };
    ;
    //CHAT
    OpenViduInternal.prototype.sendMessage = function (room, user, message) {
        this.sendRequest('sendMessage', {
            message: message,
            userMessage: user,
            roomMessage: room
        }, function (error, response) {
            if (error) {
                console.error(error);
            }
        });
    };
    ;
    OpenViduInternal.prototype.sendCustomRequest = function (params, callback) {
        this.sendRequest('customRequest', params, callback);
    };
    ;
    OpenViduInternal.prototype.toggleLocalVideoTrack = function (activate) {
        this.getCamera().getWebRtcPeer().videoEnabled = activate;
    };
    OpenViduInternal.prototype.toggleLocalAudioTrack = function (activate) {
        this.getCamera().getWebRtcPeer().audioEnabled = activate;
    };
    OpenViduInternal.prototype.publishLocalVideoAudio = function () {
        this.toggleLocalVideoTrack(true);
        this.toggleLocalAudioTrack(true);
    };
    OpenViduInternal.prototype.unpublishLocalVideoAudio = function () {
        this.toggleLocalVideoTrack(false);
        this.toggleLocalAudioTrack(false);
    };
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


/***/ }),

/***/ 273:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var Connection_1 = __webpack_require__(117);
var EventEmitter = __webpack_require__(32);
var SECRET_PARAM = '?secret=';
var SessionInternal = /** @class */ (function () {
    function SessionInternal(openVidu, sessionId) {
        this.openVidu = openVidu;
        this.ee = new EventEmitter();
        this.streams = {};
        this.participants = {};
        this.participantsSpeaking = [];
        this.connected = false;
        this.sessionId = this.getUrlWithoutSecret(sessionId);
        this.localParticipant = new Connection_1.Connection(this.openVidu, true, this);
        if (!this.openVidu.getWsUri()) {
            this.processOpenViduUrl(sessionId);
        }
    }
    SessionInternal.prototype.processOpenViduUrl = function (url) {
        this.openVidu.setSecret(this.getSecretFromUrl(url));
        this.openVidu.setWsUri(this.getFinalUrl(url));
    };
    SessionInternal.prototype.getSecretFromUrl = function (url) {
        var secret = '';
        if (url.indexOf(SECRET_PARAM) !== -1) {
            secret = url.substring(url.lastIndexOf(SECRET_PARAM) + SECRET_PARAM.length, url.length);
        }
        return secret;
    };
    SessionInternal.prototype.getUrlWithoutSecret = function (url) {
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
                    dataChannels: false
                };
                if (_this.localParticipant) {
                    if (Object.keys(_this.localParticipant.getStreams()).some(function (streamId) {
                        return _this.streams[streamId].isDataChannelEnabled();
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
                            // Adding the remote stream to the OpenVidu object
                            _this.openVidu.getRemoteStreams().push(stream);
                        }
                        //}
                        callback(undefined);
                    }
                });
            }
        });
    };
    SessionInternal.prototype.publish = function () {
        this.openVidu.getCamera().publish();
    };
    /* NEW METHODS */
    SessionInternal.prototype.configure = function (options) {
        this.options = options;
        this.id = options.sessionId;
        this.subscribeToStreams = options.subscribeToStreams == null ? true : options.subscribeToStreams;
        this.updateSpeakerInterval = options.updateSpeakerInterval || 1500;
        this.thresholdSpeaker = options.thresholdSpeaker || -50;
        this.activateUpdateMainSpeaker();
    };
    SessionInternal.prototype.getId = function () {
        return this.id;
    };
    SessionInternal.prototype.getSessionId = function () {
        return this.sessionId;
    };
    SessionInternal.prototype.activateUpdateMainSpeaker = function () {
        var _this = this;
        setInterval(function () {
            if (_this.participantsSpeaking.length > 0) {
                _this.ee.emitEvent('update-main-speaker', [{
                        participantId: _this.participantsSpeaking[_this.participantsSpeaking.length - 1]
                    }]);
            }
        }, this.updateSpeakerInterval);
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
    SessionInternal.prototype.unsuscribe = function (stream) {
        console.info("Unsubscribing from " + stream.getId());
        this.openVidu.sendRequest('unsubscribeFromVideo', {
            sender: stream.getId()
        }, function (error, response) {
            if (error) {
                console.error("Error unsubscribing from Subscriber", error);
            }
            else {
                console.info("Unsubscribed correctly from " + stream.getId());
            }
        });
    };
    SessionInternal.prototype.onParticipantPublished = function (options) {
        // Get the existing Connection created on 'onParticipantJoined' for
        // existing participants or create a new one for new participants
        var connection = this.participants[options.id];
        if (connection) {
            // Update existing Connection
            options.metadata = connection.data;
            connection.options = options;
            connection.initStreams(options);
        }
        else {
            // Create new Connection
            connection = new Connection_1.Connection(this.openVidu, false, this, options);
        }
        var pid = connection.connectionId;
        if (!(pid in this.participants)) {
            console.debug("Remote Connection not found in connections list by its id [" + pid + "]");
        }
        else {
            console.debug("Remote Connection found in connections list by its id [" + pid + "]");
        }
        this.participants[pid] = connection;
        this.ee.emitEvent('participant-published', [{ connection: connection }]);
        var streams = connection.getStreams();
        for (var key in streams) {
            var stream = streams[key];
            if (this.subscribeToStreams) {
                stream.subscribe();
            }
            this.ee.emitEvent('streamCreated', [{ stream: stream }]);
            // Adding the remote stream to the OpenVidu object
            this.openVidu.getRemoteStreams().push(stream);
        }
    };
    SessionInternal.prototype.onParticipantJoined = function (msg) {
        var connection = new Connection_1.Connection(this.openVidu, false, this, msg);
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
            delete this.participants[msg.name];
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
                // Deleting the removed stream from the OpenVidu object
                var index = this.openVidu.getRemoteStreams().indexOf(streams[key]);
                this.openVidu.getRemoteStreams().splice(index, 1);
            }
            connection.dispose();
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
        console.info("New message: " + JSON.stringify(msg));
        var room = msg.room;
        var user = msg.user;
        var message = msg.message;
        if (user !== undefined) {
            this.ee.emitEvent('newMessage', [{
                    room: room,
                    user: user,
                    message: message
                }]);
        }
        else {
            console.warn("User undefined in new message:", msg);
        }
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
        console.info("Room closed: " + JSON.stringify(msg));
        var room = msg.room;
        if (room !== undefined) {
            this.ee.emitEvent('room-closed', [{
                    room: room
                }]);
        }
        else {
            console.warn("Room undefined in on room closed", msg);
        }
    };
    SessionInternal.prototype.onLostConnection = function () {
        if (!this.connected) {
            console.warn('Not connected to room: if you are not debugging, this is probably a certificate error');
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
            console.warn('Room undefined when lost connection');
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
            this.unsuscribe(stream);
        }
    };
    SessionInternal.prototype.unpublish = function (stream) {
        var connection = stream.getParticipant();
        if (!connection) {
            console.error("Stream to disconnect has no participant", stream);
            return;
        }
        if (connection === this.localParticipant) {
            delete this.participants[connection.connectionId];
            connection.dispose();
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
    };
    SessionInternal.prototype.getStreams = function () {
        return this.streams;
    };
    SessionInternal.prototype.addParticipantSpeaking = function (participantId) {
        this.participantsSpeaking.push(participantId);
    };
    SessionInternal.prototype.removeParticipantSpeaking = function (participantId) {
        var pos = -1;
        for (var i = 0; i < this.participantsSpeaking.length; i++) {
            if (this.participantsSpeaking[i] == participantId) {
                pos = i;
                break;
            }
        }
        if (pos != -1) {
            this.participantsSpeaking.splice(pos, 1);
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


/***/ }),

/***/ 291:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(120);


/***/ }),

/***/ 43:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_rxjs_Subject__ = __webpack_require__(20);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_rxjs_Subject___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_rxjs_Subject__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return InfoService; });
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
        this.newInfo$ = new __WEBPACK_IMPORTED_MODULE_1_rxjs_Subject__["Subject"]();
    }
    InfoService.prototype.getInfo = function () {
        return this.info;
    };
    InfoService.prototype.updateInfo = function (info) {
        this.info = info;
        this.newInfo$.next(info);
    };
    return InfoService;
}());
InfoService = __decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["c" /* Injectable */])(),
    __metadata("design:paramtypes", [])
], InfoService);

//# sourceMappingURL=info.service.js.map

/***/ }),

/***/ 72:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var EventEmitter = __webpack_require__(32);
var kurentoUtils = __webpack_require__(269);
var adapter = __webpack_require__(118);
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
        this.videoElements = [];
        this.elements = [];
        this.showMyRemote = false;
        this.localMirrored = false;
        this.chanId = 0;
        this.dataChannelOpened = false;
        this.activeAudio = true;
        this.activeVideo = true;
        this.isReady = false;
        this.isVideoELementCreated = false;
        this.accessIsAllowed = false;
        this.accessIsDenied = false;
        if (options.id) {
            this.id = options.id;
        }
        else {
            this.id = "webcam";
        }
        this.connection = options.connection;
        this.recvVideo = options.recvVideo || false;
        this.recvAudio = options.recvAudio || false;
        this.sendVideo = options.sendVideo;
        this.sendAudio = options.sendAudio;
        this.activeAudio = options.activeAudio;
        this.activeVideo = options.activeVideo;
        this.dataChannel = options.data || false;
        this.mediaConstraints = options.mediaConstraints;
        this.addEventListener('src-added', function (srcEvent) {
            _this.videoSrcObject = srcEvent.srcObject;
            if (_this.video)
                _this.video.srcObject = srcEvent.srcObject;
            console.debug("Video srcObject [" + srcEvent.srcObject + "] added to stream [" + _this.getId() + "]");
        });
    }
    Stream.prototype.emitSrcEvent = function (wrstream) {
        this.ee.emitEvent('src-added', [{
                srcObject: wrstream
            }]);
    };
    Stream.prototype.emitStreamReadyEvent = function () {
        this.ee.emitEvent('stream-ready'), [{}];
    };
    Stream.prototype.getVideoSrcObject = function () {
        return this.videoSrcObject;
    };
    Stream.prototype.removeVideo = function (parentElement) {
        if (typeof parentElement === "string") {
            document.getElementById(parentElement).removeChild(this.video);
        }
        else if (parentElement instanceof Element) {
            parentElement.removeChild(this.video);
        }
        else if (!parentElement) {
            if (document.getElementById(this.parentId)) {
                document.getElementById(this.parentId).removeChild(this.video);
            }
        }
    };
    Stream.prototype.getVideoElement = function () {
        return this.video;
    };
    Stream.prototype.setVideoElement = function (video) {
        this.video = video;
    };
    Stream.prototype.getRecvVideo = function () {
        return this.recvVideo;
    };
    Stream.prototype.getRecvAudio = function () {
        return this.recvAudio;
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
            this.wrStream = wr;
            this.emitSrcEvent(this.wrStream);
        }
    };
    Stream.prototype.isLocalMirrored = function () {
        return this.localMirrored;
    };
    Stream.prototype.getChannelName = function () {
        return this.getId() + '_' + this.chanId++;
    };
    Stream.prototype.isDataChannelEnabled = function () {
        return this.dataChannel;
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
    Stream.prototype.getWrStream = function () {
        return this.wrStream;
    };
    Stream.prototype.getWebRtcPeer = function () {
        return this.wp;
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
        progress.id = 'progress-' + this.getId();
        progress.style.background = "center transparent url('img/spinner.gif') no-repeat";
        var spinnerParent = document.getElementById(spinnerParentId);
        if (spinnerParent) {
            spinnerParent.appendChild(progress);
        }
    };
    Stream.prototype.hideSpinner = function (spinnerId) {
        spinnerId = (spinnerId === undefined) ? this.getId() : spinnerId;
        hide('progress-' + spinnerId);
    };
    Stream.prototype.playOnlyVideo = function (parentElement, thumbnailId) {
        // TO-DO: check somehow if the stream is audio only, so the element created is <audio> instead of <video>
        var _this = this;
        this.video = document.createElement('video');
        this.video.id = (this.local ? 'local-' : 'remote-') + 'video-' + this.getId();
        this.video.autoplay = true;
        this.video.controls = false;
        this.video.srcObject = this.videoSrcObject;
        this.videoElements.push({
            thumb: thumbnailId,
            video: this.video
        });
        if (this.local && !this.displayMyRemote()) {
            this.video.muted = true;
            this.video.onplaying = function () {
                console.info("Local 'Stream' with id [" + _this.getId() + "] video is now playing");
                _this.ee.emitEvent('video-is-playing', [{
                        element: _this.video
                    }]);
            };
        }
        else {
            this.video.title = this.getId();
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
        this.ee.emitEvent('stream-created-by-publisher');
        this.isReady = true;
        return this.video;
    };
    Stream.prototype.playThumbnail = function (thumbnailId) {
        var container = document.createElement('div');
        container.className = "participant";
        container.id = this.getId();
        var thumbnail = document.getElementById(thumbnailId);
        if (thumbnail) {
            thumbnail.appendChild(container);
        }
        this.elements.push(container);
        var name = document.createElement('div');
        container.appendChild(name);
        var userName = this.getId().replace('_webcam', '');
        if (userName.length >= 16) {
            userName = userName.substring(0, 16) + "...";
        }
        name.appendChild(document.createTextNode(userName));
        name.id = "name-" + this.getId();
        name.className = "name";
        name.title = this.getId();
        this.showSpinner(thumbnailId);
        return this.playOnlyVideo(container, thumbnailId);
    };
    Stream.prototype.getIdInParticipant = function () {
        return this.id;
    };
    Stream.prototype.getParticipant = function () {
        return this.connection;
    };
    Stream.prototype.getId = function () {
        return this.connection.connectionId + "_" + this.id;
    };
    Stream.prototype.getRTCPeerConnection = function () {
        return this.getWebRtcPeer().peerConnection;
    };
    Stream.prototype.requestCameraAccess = function (callback) {
        var _this = this;
        this.connection.addStream(this);
        var constraints = this.mediaConstraints;
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
                constraints.video = false;
                _this.sendVideo = false;
                _this.requestCameraAccesAux(constraints, callback);
            }
            else {
                _this.requestCameraAccesAux(constraints, callback);
            }
        });
    };
    Stream.prototype.requestCameraAccesAux = function (constraints, callback) {
        var _this = this;
        navigator.mediaDevices.getUserMedia(constraints)
            .then(function (userStream) {
            _this.cameraAccessSuccess(userStream, callback);
        })
            .catch(function (error) {
            /*//  Try to ask for microphone only
            navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                .then(userStream => {
                    constraints.video = false;
                    this.sendVideo = false;
                    this.sendAudio = true;
                    this.cameraAccessSuccess(userStream, callback);
                })
                .catch(error => {*/
            _this.accessIsDenied = true;
            _this.accessIsAllowed = false;
            _this.ee.emitEvent('access-denied-by-publisher');
            console.error("Access denied", error);
            callback(error, _this);
        });
    };
    Stream.prototype.cameraAccessSuccess = function (userStream, callback) {
        this.accessIsAllowed = true;
        this.accessIsDenied = false;
        this.ee.emitEvent('access-allowed-by-publisher');
        if (userStream.getAudioTracks()[0] != null) {
            userStream.getAudioTracks()[0].enabled = this.activeAudio;
        }
        if (userStream.getVideoTracks()[0] != null) {
            userStream.getVideoTracks()[0].enabled = this.activeVideo;
        }
        this.wrStream = userStream;
        this.emitSrcEvent(this.wrStream);
        callback(undefined, this);
    };
    Stream.prototype.userMediaHasVideo = function (callback) {
        navigator.mediaDevices.enumerateDevices().then(function (mediaDevices) {
            var videoInput = mediaDevices.filter(function (deviceInfo) {
                return deviceInfo.kind === 'videoinput';
            })[0];
            callback(videoInput != null);
        });
    };
    Stream.prototype.publishVideoCallback = function (error, sdpOfferParam, wp) {
        var _this = this;
        if (error) {
            return console.error("(publish) SDP offer error: "
                + JSON.stringify(error));
        }
        console.debug("Sending SDP offer to publish as "
            + this.getId(), sdpOfferParam);
        this.openVidu.sendRequest("publishVideo", {
            sdpOffer: sdpOfferParam,
            doLoopback: this.displayMyRemote() || false,
            audioActive: this.sendAudio,
            videoActive: this.sendVideo
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
            + this.getId(), sdpOfferParam);
        this.openVidu.sendRequest("receiveVideoFrom", {
            sender: this.getId(),
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
                audio: this.sendAudio,
                video: this.sendVideo
            };
            var options = {
                videoStream: this.wrStream,
                mediaConstraints: userMediaConstraints,
                onicecandidate: this.connection.sendIceCandidate.bind(this.connection),
            };
            if (this.dataChannel) {
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
        }
        else {
            var offerConstraints = {
                audio: this.recvAudio,
                video: this.recvVideo
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
            + (this.local ? "local" : "remote") + " 'Stream': " + this.getId() + ")");
    };
    Stream.prototype.publish = function () {
        var _this = this;
        // FIXME: Throw error when stream is not local
        if (this.isReady) {
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
            sdp: sdpAnswer,
        });
        console.debug(this.getId() + ": set peer connection with recvd SDP answer", sdpAnswer);
        var participantId = this.getId();
        var pc = this.wp.peerConnection;
        pc.setRemoteDescription(answer, function () {
            // Avoids to subscribe to your own stream remotely 
            // except when showMyRemote is true
            if (!_this.local || _this.displayMyRemote()) {
                _this.wrStream = pc.getRemoteStreams()[0];
                console.debug("Peer remote stream", _this.wrStream);
                if (_this.wrStream != undefined) {
                    _this.emitSrcEvent(_this.wrStream);
                    if (_this.wrStream.getAudioTracks()[0] != null) {
                        _this.speechEvent = kurentoUtils.WebRtcPeer.hark(_this.wrStream, { threshold: _this.room.thresholdSpeaker });
                        _this.speechEvent.on('speaking', function () {
                            _this.room.addParticipantSpeaking(participantId);
                            _this.room.emitEvent('stream-speaking', [{
                                    participantId: participantId
                                }]);
                        });
                        _this.speechEvent.on('stopped_speaking', function () {
                            _this.room.removeParticipantSpeaking(participantId);
                            _this.room.emitEvent('stream-stopped-speaking', [{
                                    participantId: participantId
                                }]);
                        });
                    }
                }
                for (var _i = 0, _a = _this.videoElements; _i < _a.length; _i++) {
                    var videoElement = _a[_i];
                    var thumbnailId = videoElement.thumb;
                    var video = videoElement.video;
                    video.srcObject = _this.wrStream;
                    video.onplaying = function () {
                        if (_this.local && _this.displayMyRemote()) {
                            console.info("Your own remote 'Stream' with id [" + _this.getId() + "] video is now playing");
                            _this.ee.emitEvent('remote-video-is-playing', [{
                                    element: _this.video
                                }]);
                        }
                        else if (!_this.local && !_this.displayMyRemote()) {
                            console.info("Remote 'Stream' with id [" + _this.getId() + "] video is now playing");
                            _this.ee.emitEvent('video-is-playing', [{
                                    element: _this.video
                                }]);
                        }
                        //show(thumbnailId);
                        //this.hideSpinner(this.getId());
                    };
                }
                _this.room.emitEvent('stream-subscribed', [{
                        stream: _this
                    }]);
            }
        }, function (error) {
            console.error(_this.getId() + ": Error setting SDP to the peer connection: "
                + JSON.stringify(error));
        });
    };
    Stream.prototype.unpublish = function () {
        if (this.wp) {
            this.wp.dispose();
        }
        else {
            if (this.wrStream) {
                this.wrStream.getAudioTracks().forEach(function (track) {
                    track.stop && track.stop();
                });
                this.wrStream.getVideoTracks().forEach(function (track) {
                    track.stop && track.stop();
                });
            }
        }
        if (this.speechEvent) {
            this.speechEvent.stop();
        }
        console.info(this.getId() + ": Stream '" + this.id + "' unpublished");
    };
    Stream.prototype.dispose = function () {
        function disposeElement(element) {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }
        this.elements.forEach(function (e) { return disposeElement(e); });
        //this.videoElements.forEach(ve => disposeElement(ve.video));
        disposeElement("progress-" + this.getId());
        if (this.wp) {
            this.wp.dispose();
        }
        else {
            if (this.wrStream) {
                this.wrStream.getAudioTracks().forEach(function (track) {
                    track.stop && track.stop();
                });
                this.wrStream.getVideoTracks().forEach(function (track) {
                    track.stop && track.stop();
                });
            }
        }
        if (this.speechEvent) {
            this.speechEvent.stop();
        }
        console.info((this.local ? "Local " : "Remote ") + "'Stream' with id [" + this.getId() + "]' has been succesfully disposed");
    };
    return Stream;
}());
exports.Stream = Stream;


/***/ }),

/***/ 76:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(2);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CredentialsDialogComponent; });
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
    return CredentialsDialogComponent;
}());
CredentialsDialogComponent = __decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_5" /* Component */])({
        selector: 'app-credentials-dialog',
        template: "\n        <div>\n            <h1 md-dialog-title>\n                Insert your secret\n            </h1>\n            <form #dialogForm (ngSubmit)=\"testVideo()\">\n                <md-dialog-content>\n                    <md-input-container>\n                        <input mdInput name=\"secret\" type=\"password\" [(ngModel)]=\"secret\">\n                    </md-input-container>\n                </md-dialog-content>\n                <md-dialog-actions>\n                    <button md-button md-dialog-close>CANCEL</button>\n                    <button md-button id=\"join-btn\" type=\"submit\">TEST</button>\n                </md-dialog-actions>\n            </form>\n        </div>\n    ",
        styles: ["\n        #quality-div {\n            margin-top: 20px;\n        }\n        #join-div {\n            margin-top: 25px;\n            margin-bottom: 20px;\n        }\n        #quality-tag {\n            display: block;\n        }\n        h5 {\n            margin-bottom: 10px;\n            text-align: left;\n        }\n        #joinWithVideo {\n            margin-right: 50px;\n        }\n        md-dialog-actions {\n            display: block;\n        }\n        #join-btn {\n            float: right;\n        }\n    "],
    }),
    __metadata("design:paramtypes", [])
], CredentialsDialogComponent);

//# sourceMappingURL=credentials-dialog.component.js.map

/***/ }),

/***/ 77:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_material__ = __webpack_require__(75);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__services_info_service__ = __webpack_require__(43);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_openvidu_browser__ = __webpack_require__(271);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_openvidu_browser___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3_openvidu_browser__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__credentials_dialog_component__ = __webpack_require__(76);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return DashboardComponent; });
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
    };
    DashboardComponent.prototype.beforeunloadHandler = function () {
        // On window closed leave test session
        if (this.session) {
            this.endTestVideo();
        }
    };
    DashboardComponent.prototype.ngOnDestroy = function () {
        // On component destroyed leave test session
        if (this.session) {
            this.endTestVideo();
        }
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
                _this.connectToSession('wss://' + location.hostname + ':8443/testSession?secret=' + secret);
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
    return DashboardComponent;
}());
__decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_8" /* ViewChild */])('scrollMe'),
    __metadata("design:type", typeof (_a = typeof __WEBPACK_IMPORTED_MODULE_0__angular_core__["l" /* ElementRef */] !== "undefined" && __WEBPACK_IMPORTED_MODULE_0__angular_core__["l" /* ElementRef */]) === "function" && _a || Object)
], DashboardComponent.prototype, "myScrollContainer", void 0);
__decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_13" /* HostListener */])('window:beforeunload'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DashboardComponent.prototype, "beforeunloadHandler", null);
DashboardComponent = __decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_5" /* Component */])({
        selector: 'app-dashboard',
        template: __webpack_require__(199),
        styles: [__webpack_require__(189)],
    }),
    __metadata("design:paramtypes", [typeof (_b = typeof __WEBPACK_IMPORTED_MODULE_2__services_info_service__["a" /* InfoService */] !== "undefined" && __WEBPACK_IMPORTED_MODULE_2__services_info_service__["a" /* InfoService */]) === "function" && _b || Object, typeof (_c = typeof __WEBPACK_IMPORTED_MODULE_1__angular_material__["j" /* MdDialog */] !== "undefined" && __WEBPACK_IMPORTED_MODULE_1__angular_material__["j" /* MdDialog */]) === "function" && _c || Object])
], DashboardComponent);

var _a, _b, _c;
//# sourceMappingURL=dashboard.component.js.map

/***/ }),

/***/ 78:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(2);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return SessionDetailsComponent; });
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
    return SessionDetailsComponent;
}());
SessionDetailsComponent = __decorate([
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_5" /* Component */])({
        selector: 'app-session-details',
        template: __webpack_require__(200),
        styles: [__webpack_require__(190)]
    }),
    __metadata("design:paramtypes", [])
], SessionDetailsComponent);

//# sourceMappingURL=session-details.component.js.map

/***/ })

},[291]);
//# sourceMappingURL=main.bundle.js.map