/*
 * (C) Copyright 2013-2015 Kurento (http://kurento.org/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var OpenViduLogger = require('../../../../Logger/OpenViduLogger').OpenViduLogger;
var Logger = OpenViduLogger.getInstance();

var MAX_RETRIES = 2000; // Forever...
var RETRY_TIME_MS = 3000; // FIXME: Implement exponential wait times...

var CONNECTING = 0;
var OPEN = 1;
var CLOSING = 2;
var CLOSED = 3;

/*
config = {
uri : wsUri,
onconnected : callback method to invoke when connection is successful,
ondisconnect : callback method to invoke when the connection is lost (max retries for reconnecting reached),
onreconnecting : callback method to invoke when the client is reconnecting,
onreconnected : callback method to invoke when the client successfully reconnects,
};
*/
function WebSocketWithReconnection(config) {
    var closing = false;
    var registerMessageHandler;
    var wsUri = config.uri;
    var reconnecting = false;

    var ws = new WebSocket(wsUri);

    ws.onopen = () => {
        Logger.debug('WebSocket connected to ' + wsUri);
        if (config.onconnected) {
            config.onconnected();
        }
    };

    ws.onerror = (error) => {
        Logger.error('Could not connect to ' + wsUri + ' (invoking onerror if defined)', error);
        if (config.onerror) {
            config.onerror(error);
        }
    };

    var reconnectionOnClose = () => {
        if (ws.readyState === CLOSED) {
            if (closing) {
                Logger.debug('Connection closed by user');
            } else {
                if (config.ismasternodecrashed()) {
                    Logger.error('Master Node has crashed. Stopping reconnection process');
                } else {
                    Logger.debug('Connection closed unexpectedly. Reconnecting...');
                    reconnect(MAX_RETRIES, 1);
                }
            }
        } else {
            Logger.debug('Close callback from previous websocket. Ignoring it');
        }
    };

    ws.onclose = reconnectionOnClose;

    function reconnect(maxRetries, numRetries) {
        Logger.debug('reconnect (attempt #' + numRetries + ', max=' + maxRetries + ')');
        if (numRetries === 1) {
            if (reconnecting) {
                Logger.warn('Trying to reconnect when already reconnecting... Ignoring this reconnection.');
                return;
            } else {
                reconnecting = true;
            }
            if (config.onreconnecting) {
                config.onreconnecting();
            }
        }
        reconnectAux(maxRetries, numRetries);
    }

    function addReconnectionQueryParamsIfMissing(uriString) {
        var searchParams = new URLSearchParams(new URL(uriString).search);
        if (!searchParams.has('reconnect')) {
            uriString = Array.from(searchParams).length > 0 ? uriString + '&reconnect=true' : uriString + '?reconnect=true';
        }
        return uriString;
    }

    function reconnectAux(maxRetries, numRetries) {
        Logger.debug('Reconnection attempt #' + numRetries);
        ws.close(4104, 'Connection closed for reconnection');

        wsUri = addReconnectionQueryParamsIfMissing(wsUri);
        ws = new WebSocket(wsUri);

        ws.onopen = () => {
            Logger.debug('Reconnected to ' + wsUri + ' after ' + numRetries + ' attempts...');
            reconnecting = false;
            registerMessageHandler();
            if (config.onreconnected) {
                config.onreconnected();
            }
            ws.onclose = reconnectionOnClose;
        };

        ws.onerror = (error) => {
            Logger.warn('Reconnection error: ', error);
            if (numRetries === maxRetries) {
                if (config.ondisconnect) {
                    config.ondisconnect();
                }
            } else {
                setTimeout(() => {
                    reconnect(maxRetries, numRetries + 1);
                }, RETRY_TIME_MS);
            }
        };
    }

    this.close = (code, reason) => {
        closing = true;
        ws.close(code, reason);
    };

    this.reconnectWs = () => {
        Logger.debug('reconnectWs');
        reconnect(MAX_RETRIES, 1);
    };

    this.send = (message) => {
        ws.send(message);
    };

    this.addEventListener = (type, callback) => {
        registerMessageHandler = () => {
            ws.addEventListener(type, callback);
        };
        registerMessageHandler();
    };

    this.getReadyState = () => {
        return ws.readyState;
    };
}

module.exports = WebSocketWithReconnection;
