/*
 * (C) Copyright 2017-2022 OpenVidu (https://openvidu.io)
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

import { Event } from '../OpenViduInternal/Events/Event';
import { EventMap } from '../OpenViduInternal/Events/EventMap/EventMap';
import { OpenViduLogger } from '../OpenViduInternal/Logger/OpenViduLogger';

import EventEmitter = require('wolfy87-eventemitter');

/**
 * @hidden
 */
const logger: OpenViduLogger = OpenViduLogger.getInstance();

export abstract class EventDispatcher {
    /**
     * @hidden
     */
    userHandlerArrowHandler: WeakMap<(event: Event) => void, (event: Event) => void> = new WeakMap();
    /**
     * @hidden
     */
    ee = new EventEmitter();

    /**
     * Adds function `handler` to handle event `type`
     *
     * @returns The EventDispatcher object
     */
    abstract on<K extends keyof EventMap>(type: K, handler: (event: EventMap[K]) => void): this;

    /**
     * Adds function `handler` to handle event `type` just once. The handler will be automatically removed after first execution
     *
     * @returns The object that dispatched the event
     */
    abstract once<K extends keyof EventMap>(type: K, handler: (event: EventMap[K]) => void): this;

    /**
     * Removes a `handler` from event `type`. If no handler is provided, all handlers will be removed from the event
     *
     * @returns The object that dispatched the event
     */
    abstract off<K extends keyof EventMap>(type: K, handler?: (event: EventMap[K]) => void): this;

    /**
     * @hidden
     */
    onAux(type: string, message: string, handler: (event: Event) => void): EventDispatcher {
        const arrowHandler = (event) => {
            if (event) {
                logger.debug(message, event);
            } else {
                logger.debug(message);
            }
            handler(event);
        };
        this.userHandlerArrowHandler.set(handler, arrowHandler);
        this.ee.on(type, arrowHandler);
        return this;
    }

    /**
     * @hidden
     */
    onceAux(type: string, message: string, handler: (event: Event) => void): EventDispatcher {
        const arrowHandler = (event) => {
            if (event) {
                logger.debug(message, event);
            } else {
                logger.debug(message);
            }
            handler(event);
            // Remove handler from map after first and only execution
            this.userHandlerArrowHandler.delete(handler);
        };
        this.userHandlerArrowHandler.set(handler, arrowHandler);
        this.ee.once(type, arrowHandler);
        return this;
    }

    /**
     * @hidden
     */
    offAux(type: string, handler?: (event: Event) => void): EventDispatcher {
        if (!handler) {
            this.ee.removeAllListeners(type);
        } else {
            // Must remove internal arrow function handler paired with user handler
            const arrowHandler = this.userHandlerArrowHandler.get(handler);
            if (!!arrowHandler) {
                this.ee.off(type, arrowHandler);
            }
            this.userHandlerArrowHandler.delete(handler);
        }
        return this;
    }
}
