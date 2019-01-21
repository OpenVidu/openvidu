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

import { Event as Event } from '../../Events/Event';

export interface EventDispatcher {

    /**
     * Adds function `handler` to handle event `type`
     *
     * @returns The EventDispatcher object
     */
    on(type: string, handler: (event: Event) => void): EventDispatcher;

    /**
     * Adds function `handler` to handle event `type` just once. The handler will be automatically removed after first execution
     *
     * @returns The object that dispatched the event
     */
    once(type: string, handler: (event: Event) => void): Object;

    /**
     * Removes a `handler` from event `type`. If no handler is provided, all handlers will be removed from the event
     *
     * @returns The object that dispatched the event
     */
    off(type: string, handler?: (event: Event) => void): Object;

}