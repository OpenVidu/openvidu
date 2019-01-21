/*
 * (C) Copyright 2017-2019 OpenVidu (https://openvidu.io/)
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

import { Stream } from './Stream';
import { FilterEvent } from '../OpenViduInternal/Events/FilterEvent';
import { StreamPropertyChangedEvent } from '../OpenViduInternal/Events/StreamPropertyChangedEvent';
import { OpenViduError, OpenViduErrorName } from '../OpenViduInternal/Enums/OpenViduError';
import { ObjMap } from '../OpenViduInternal/Interfaces/Private/ObjMap';


/**
 * **WARNING**: experimental option. This interface may change in the near future
 *
 * Video/audio filter applied to a Stream. See [[Stream.applyFilter]]
 */
export class Filter {

    /**
     * Type of filter applied. This is the name of the remote class identifying the filter to apply in Kurento Media Server.
     * For example: `"FaceOverlayFilter"`, `"GStreamerFilter"`.
     *
     * You can get this property in `*.kmd.json` files defining the Kurento filters. For example, for GStreamerFilter that's
     * [here](https://github.com/Kurento/kms-filters/blob/53a452fac71d61795952e3d2202156c6b00f6d65/src/server/interface/filters.GStreamerFilter.kmd.json#L4)
     */
    type: string;

    /**
     * Parameters used to initialize the filter.
     * These correspond to the constructor parameters used in the filter in Kurento Media Server (except for `mediaPipeline` parameter, which is never needed).
     *
     * For example: for `filter.type = "GStreamerFilter"` could be `filter.options = {"command": "videobalance saturation=0.0"}`
     *
     * You can get this property in `*.kmd.json` files defining the Kurento filters. For example, for GStreamerFilter that's
     * [here](https://github.com/Kurento/kms-filters/blob/53a452fac71d61795952e3d2202156c6b00f6d65/src/server/interface/filters.GStreamerFilter.kmd.json#L13-L31)
     */
    options: Object;

    /**
     * Value passed the last time [[Filter.execMethod]] was called. If `undefined` this method has not been called yet.
     *
     * You can use this value to know the current status of any applied filter
     */
    lastExecMethod?: {
        method: string, params: Object
    };

    /**
     * @hidden
     */
    handlers: ObjMap<(event: FilterEvent) => void> = {};

    /**
     * @hidden
     */
    stream: Stream;


    /**
     * @hidden
     */
    constructor(type: string, options: Object) {
        this.type = type;
        this.options = options;
    }


    /**
     * Executes a filter method. Available methods are specific for each filter
     *
     * @param method Name of the method
     * @param params Parameters of the method
     */
    execMethod(method: string, params: Object): Promise<any> {
        return new Promise((resolve, reject) => {
            console.info('Executing filter method to stream ' + this.stream.streamId);
            let stringParams;
            if (typeof params !== 'string') {
                try {
                    stringParams = JSON.stringify(params);
                } catch (error) {
                    const errorMsg = "'params' property must be a JSON formatted object";
                    console.error(errorMsg);
                    reject(errorMsg);
                }
            } else {
                stringParams = <string>params;
            }
            this.stream.session.openvidu.sendRequest(
                'execFilterMethod',
                { streamId: this.stream.streamId, method, params: stringParams },
                (error, response) => {
                    if (error) {
                        console.error('Error executing filter method for Stream ' + this.stream.streamId, error);
                        if (error.code === 401) {
                            reject(new OpenViduError(OpenViduErrorName.OPENVIDU_PERMISSION_DENIED, "You don't have permissions to execute a filter method"));
                        } else {
                            reject(error);
                        }
                    } else {
                        console.info('Filter method successfully executed on Stream ' + this.stream.streamId);
                        const oldValue = (<any>Object).assign({}, this.stream.filter);
                        this.stream.filter.lastExecMethod = { method, params: JSON.parse(stringParams) };
                        this.stream.session.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent(this.stream.session, this.stream, 'filter', this.stream.filter, oldValue, 'execFilterMethod')]);
                        this.stream.streamManager.emitEvent('streamPropertyChanged', [new StreamPropertyChangedEvent(this.stream.streamManager, this.stream, 'filter', this.stream.filter, oldValue, 'execFilterMethod')]);
                        resolve();
                    }
                }
            );
        });
    }


    /**
     * Subscribe to certain filter event. Available events are specific for each filter
     *
     * @param eventType Event to which subscribe to.
     * @param handler Function to execute upon event dispatched. It receives as parameter a [[FilterEvent]] object
     *
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the event listener was successfully attached to the filter and rejected with an Error object if not
     */
    addEventListener(eventType: string, handler: (event: FilterEvent) => void): Promise<any> {
        return new Promise((resolve, reject) => {
            console.info('Adding filter event listener to event ' + eventType + ' to stream ' + this.stream.streamId);
            this.stream.session.openvidu.sendRequest(
                'addFilterEventListener',
                { streamId: this.stream.streamId, eventType },
                (error, response) => {
                    if (error) {
                        console.error('Error adding filter event listener to event ' + eventType + 'for Stream ' + this.stream.streamId, error);
                        if (error.code === 401) {
                            reject(new OpenViduError(OpenViduErrorName.OPENVIDU_PERMISSION_DENIED, "You don't have permissions to add a filter event listener"));
                        } else {
                            reject(error);
                        }
                    } else {
                        this.handlers[eventType] = handler;
                        console.info('Filter event listener to event ' + eventType + ' successfully applied on Stream ' + this.stream.streamId);
                        resolve();
                    }
                }
            );
        });
    }


    /**
     * Removes certain filter event listener previously set.
     *
     * @param eventType Event to unsubscribe from.
     *
     * @returns A Promise (to which you can optionally subscribe to) that is resolved if the event listener was successfully removed from the filter and rejected with an Error object in other case
     */
    removeEventListener(eventType: string): Promise<any> {
        return new Promise((resolve, reject) => {
            console.info('Removing filter event listener to event ' + eventType + ' to stream ' + this.stream.streamId);
            this.stream.session.openvidu.sendRequest(
                'removeFilterEventListener',
                { streamId: this.stream.streamId, eventType },
                (error, response) => {
                    if (error) {
                        console.error('Error removing filter event listener to event ' + eventType + 'for Stream ' + this.stream.streamId, error);
                        if (error.code === 401) {
                            reject(new OpenViduError(OpenViduErrorName.OPENVIDU_PERMISSION_DENIED, "You don't have permissions to add a filter event listener"));
                        } else {
                            reject(error);
                        }
                    } else {
                        delete this.handlers[eventType];
                        console.info('Filter event listener to event ' + eventType + ' successfully removed on Stream ' + this.stream.streamId);
                        resolve();
                    }
                }
            );
        });
    }

}