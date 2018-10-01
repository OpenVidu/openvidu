"use strict";
/*
 * (C) Copyright 2017-2018 OpenVidu (https://openvidu.io/)
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
exports.__esModule = true;
var StreamPropertyChangedEvent_1 = require("../OpenViduInternal/Events/StreamPropertyChangedEvent");
var OpenViduError_1 = require("../OpenViduInternal/Enums/OpenViduError");
/**
 * **WARNING**: experimental option. This interface may change in the near future
 *
 * Video/audio filter applied to a Stream. See [[Stream.applyFilter]]
 */
var Filter = /** @class */ (function () {
    /**
     * @hidden
     */
    function Filter(type, options) {
        /**
         * @hidden
         */
        this.handlers = {};
        this.type = type;
        this.options = options;
    }
    /**
     * Executes a filter method. Available methods are specific for each filter
     *
     * @param method Name of the method
     * @param params Parameters of the method
     */
    Filter.prototype.execMethod = function (method, params) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            console.info('Executing filter method to stream ' + _this.stream.streamId);
            var stringParams;
            if (typeof params !== 'string') {
                try {
                    stringParams = JSON.stringify(params);
                }
                catch (error) {
                    var errorMsg = "'params' property must be a JSON formatted object";
                    console.error(errorMsg);
                    reject(errorMsg);
                }
            }
            else {
                stringParams = params;
            }
            _this.stream.session.openvidu.sendRequest('execFilterMethod', { streamId: _this.stream.streamId, method: method, params: stringParams }, function (error, response) {
                if (error) {
                    console.error('Error executing filter method for Stream ' + _this.stream.streamId, error);
                    if (error.code === 401) {
                        reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.OPENVIDU_PERMISSION_DENIED, "You don't have permissions to execute a filter method"));
                    }
                    else {
                        reject(error);
                    }
                }
                else {
                    console.info('Filter method successfully executed on Stream ' + _this.stream.streamId);
                    var oldValue = Object.assign({}, _this.stream.filter);
                    _this.stream.filter.lastExecMethod = { method: method, params: JSON.parse(stringParams) };
                    _this.stream.session.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this.stream.session, _this.stream, 'filter', _this.stream.filter, oldValue, 'execFilterMethod')]);
                    _this.stream.streamManager.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent_1.StreamPropertyChangedEvent(_this.stream.streamManager, _this.stream, 'filter', _this.stream.filter, oldValue, 'execFilterMethod')]);
                    resolve();
                }
            });
        });
    };
    /**
     * Subscribe to certain filter event. Available events are specific for each filter
     *
     * @param eventType Event to which subscribe to.
     * @param handler Function to execute upon event dispatched. It receives as parameter a [[FilterEvent]] object
     *
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the event listener was successfully attached to the filter and rejected with an Error object if not
     */
    Filter.prototype.addEventListener = function (eventType, handler) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            console.info('Adding filter event listener to event ' + eventType + ' to stream ' + _this.stream.streamId);
            _this.stream.session.openvidu.sendRequest('addFilterEventListener', { streamId: _this.stream.streamId, eventType: eventType }, function (error, response) {
                if (error) {
                    console.error('Error adding filter event listener to event ' + eventType + 'for Stream ' + _this.stream.streamId, error);
                    if (error.code === 401) {
                        reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.OPENVIDU_PERMISSION_DENIED, "You don't have permissions to add a filter event listener"));
                    }
                    else {
                        reject(error);
                    }
                }
                else {
                    _this.handlers[eventType] = handler;
                    console.info('Filter event listener to event ' + eventType + ' successfully applied on Stream ' + _this.stream.streamId);
                    resolve();
                }
            });
        });
    };
    /**
     * Removes certain filter event listener previously set.
     *
     * @param eventType Event to unsubscribe from.
     *
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the event listener was successfully removed from the filter and rejected with an Error object in other case
     */
    Filter.prototype.removeEventListener = function (eventType) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            console.info('Removing filter event listener to event ' + eventType + ' to stream ' + _this.stream.streamId);
            _this.stream.session.openvidu.sendRequest('removeFilterEventListener', { streamId: _this.stream.streamId, eventType: eventType }, function (error, response) {
                if (error) {
                    console.error('Error removing filter event listener to event ' + eventType + 'for Stream ' + _this.stream.streamId, error);
                    if (error.code === 401) {
                        reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.OPENVIDU_PERMISSION_DENIED, "You don't have permissions to add a filter event listener"));
                    }
                    else {
                        reject(error);
                    }
                }
                else {
                    delete _this.handlers[eventType];
                    console.info('Filter event listener to event ' + eventType + ' successfully removed on Stream ' + _this.stream.streamId);
                    resolve();
                }
            });
        });
    };
    return Filter;
}());
exports.Filter = Filter;
//# sourceMappingURL=Filter.js.map