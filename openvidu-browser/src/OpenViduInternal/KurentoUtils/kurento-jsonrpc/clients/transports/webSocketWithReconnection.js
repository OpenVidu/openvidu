/*
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

"use strict";
/**
 * GLOBAL VARIABLES:
 *
 * Logger function.
 */
var Logger = console;

/**
 * Max reconnect timeout.
 *
 * @type {number} max reconnect timeout.
 */
var MAX_RETRY_TIME_MS = 10000;

/**
 * Web socket ready state connecting.
 *
 * @type {number} connecting state.
 */
var CONNECTING = 0;

/**
 * Web socket ready state open.
 *
 * @type {number} open state.
 */
var OPEN = 1;

/**
 * Web socket ready state closing.
 *
 * @type {number} closing state.
 */
var CLOSING = 2;

/**
 * Web socket ready state closed.
 *
 * @type {number} closed state.
 */
var CLOSED = 3;

/**
 *
 * Web socket decorator with reconnection.
 *
 config = {
		uri : wsUri,
		useSockJS : true (use SockJS) / false (use WebSocket) by default,
		onconnected : callback method to invoke when connection is successful,
		ondisconnect : callback method to invoke when the connection is lost,
		onreconnecting : callback method to invoke when the client is reconnecting,
		onreconnected : callback method to invoke when the client successfully reconnects,
	};
 */
function WebSocketWithReconnection(config) {

  /**
   *  Num of total retries.
   *
   * @type {number}
   */
  var totalNumRetries = 1;

  /**
   * Register web socket message handler for registring message handler from RPC.
   */
  var registerMessageHandler;

  /**
   *  Web socket in reconnection process.
   *
   * @type {boolean} reconnection in progress if value is true.
   */
  var reconnecting = false;

  /**
   * Web socket instance.
   */
  var ws;

  /**
   * Handles web socket open event.
   */
  function onOpen() {
    ws.addEventListener("close", onClose);
    if (reconnecting === true) {
      registerMessageHandler();
      if (config.onreconnected) {
        config.onreconnected();
      }
      reconnecting = false;
    } else {
      if (config.onconnected) {
        config.onconnected();
      }
    }
    totalNumRetries = 1;
  }

  /**
   * Handles wWeb socket close event.
   *
   * @param event CloseEvent instance.
   */
  function onClose(event) {
    removeAllListeners();
    Logger.log(
      "Close Web Socket code: " + event.code + " reason: " + event.reason);
    if (event.code > 4000) {
      if (config.onerror) {
        config.onerror(event.reason);
      }
      return;
    }

    if (reconnecting === false) {
      reconnecting = true;
      reconnect(500 * totalNumRetries)
    }
  }

  /**
   * Handles web socket error event.
   *
   * @param event ErrorEvent instance.
   */
  function onError(event) {
    removeAllListeners();
    if (config.onerror) {
      config.onerror("Web socket establishing error");
    }
    reconnect(500 * totalNumRetries);
  }

  /**
   * Init new instance of Web socket.
   *
   * @param config Web socket configuration.
   *
   * @returns {WebSocket | SockJS} new web socket instance.
   */
  function resetWebSocket(config) {
    var newWS;
    if (config.useSockJS) {
      newWS = new SockJS(config.uri);
    } else {
      newWS = new WebSocket(config.uri);
    }

    newWS.addEventListener("open", onOpen);
    newWS.addEventListener("error", onError);
    return newWS;
  }

  /**
   *  Removes all Web socket event listeners.
   */
  function removeAllListeners() {
    ws.removeEventListener("open", onOpen);
    ws.removeEventListener("error", onError);
    ws.removeEventListener("close", onClose);
  }

  /**
   *  Reconnects web socket with timeout.
   *
   * @param reconnectInterval reconnection timeout.
   */
  function reconnect(reconnectInterval) {
    if (reconnectInterval > MAX_RETRY_TIME_MS) {
      if (config.onerror) {
        config.onerror("Server is not responding")
      }
      return;
    }
    if (config.onreconnecting) {
      config.onreconnecting();
    }
    setTimeout(function () {
      totalNumRetries++;
      ws = resetWebSocket(config);

    }, reconnectInterval)
  }

  // init new web-socket instance.
  ws = resetWebSocket(config);

  /**
   * Closes web-socket connection.
   */
  this.close = function (code, reason) {
    if (ws.readyState < CLOSING) {
      ws.close(code, reason);
    }
  };

  /**
   * This method is only for testing. Simulate closing of web-socket connection.
   *
   * @param millis timeout in millis
   */
  this.forceClose = function (millis) {
    Logger.debug("Testing: Force WebSocket close");

    if (millis) {
      Logger.log("Testing: Change wsUri for " + millis
        + " millis to simulate net failure");
      setTimeout(function () {
        ws.close(1000, "Test close for reconnect with timeout");

      }, millis);
    } else {
      ws.close(1000, "Test close for reconnect");
    }

  };

  /**
   * Closes web-socket for reconnection.
   */
  this.reconnectWs = function () {
    Logger.log("reconnectWs");
    ws.close(1000, "Close Web socket for reconnection")
  };

  /**
   * Sends message within websocket.
   *
   * @param message some text message.
   */
  this.send = function (message) {
    ws.send(message);
  };

  /**
   * Adds some event listener.
   *
   * @param type      event type
   * @param callback  event callback.
   */
  this.addEventListener = function (type, callback) {
    registerMessageHandler = function () {
      ws.addEventListener(type, callback);
    };

    registerMessageHandler();
  };
}

module.exports = WebSocketWithReconnection;
