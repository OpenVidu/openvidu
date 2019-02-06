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

import { Filter } from '../../OpenVidu/Filter';
import { StreamManager } from '../../OpenVidu/StreamManager';
import { Session } from '../../OpenVidu/Session';
import { Stream } from '../../OpenVidu/Stream';

export abstract class Event {

    /**
     * Whether the event has a default behavior that may be prevented by calling [[Event.preventDefault]]
     */
    cancelable: boolean;

    /**
     * The object that dispatched the event
     */
    target: Session | StreamManager | Filter;

    /**
     * The type of event. This is the same string you pass as first parameter when calling method `on()` of any object implementing [[EventDispatcher]] interface
     */
    type: string;

    /**
     * @hidden
     */
    hasBeenPrevented = false;

    /**
     * @hidden
     */
    constructor(cancelable: boolean, target: Session | StreamManager | Filter, type: string) {
        this.cancelable = cancelable;
        this.target = target;
        this.type = type;
    }

    /**
     * Whether the default beahivour of the event has been prevented or not. Call [[Event.preventDefault]] to prevent it
     */
    isDefaultPrevented(): boolean {
        return this.hasBeenPrevented;
    }

    /**
     * Prevents the default behavior of the event. The following events have a default behavior:
     *
     * - `sessionDisconnected`: dispatched by [[Session]] object, automatically unsubscribes the leaving participant from every Subscriber object of the session (this includes closing the WebRTCPeer connection and disposing all MediaStreamTracks)
     * and also deletes any HTML video element associated to each Subscriber (only those created by OpenVidu Browser, either by passing a valid parameter as `targetElement` in method [[Session.subscribe]] or
     * by calling [[Subscriber.createVideoElement]]). For every video removed, each Subscriber object will also dispatch a `videoElementDestroyed` event.
     *
     * - `streamDestroyed`:
     *   - If dispatched by a [[Publisher]] (*you* have unpublished): automatically stops all media tracks and deletes any HTML video element associated to it (only those created by OpenVidu Browser, either by passing a valid parameter as `targetElement`
     * in method [[OpenVidu.initPublisher]] or by calling [[Publisher.createVideoElement]]). For every video removed, the Publisher object will also dispatch a `videoElementDestroyed` event.
     *   - If dispatched by [[Session]] (*other user* has unpublished): automatically unsubscribes the proper Subscriber object from the session (this includes closing the WebRTCPeer connection and disposing all MediaStreamTracks)
     * and also deletes any HTML video element associated to that Subscriber (only those created by OpenVidu Browser, either by passing a valid parameter as `targetElement` in method [[Session.subscribe]] or
     * by calling [[Subscriber.createVideoElement]]). For every video removed, the Subscriber object will also dispatch a `videoElementDestroyed` event.
     */
    preventDefault() {
        // tslint:disable-next-line:no-empty
        this.callDefaultBehavior = () => { };
        this.hasBeenPrevented = true;
    }

    /**
     * @hidden
     */
    abstract callDefaultBehavior();

}