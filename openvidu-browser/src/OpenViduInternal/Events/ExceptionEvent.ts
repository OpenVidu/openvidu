/*
 * (C) Copyright 2017-2020 OpenVidu (https://openvidu.io)
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

import { Session } from '../../OpenVidu/Session';
import { Stream } from '../../OpenVidu/Stream';
import { Event } from './Event';


/**
 * Defines property [[ExceptionEvent.name]]
 */
export enum ExceptionEventName {

    /**
     * There was an unexpected error on the server-side processing an ICE candidate generated and sent by the client-side.
     * 
     * [[ExceptionEvent]] objects with this [[ExceptionEvent.name]] will have as [[ExceptionEvent.origin]] property a [[Session]] object.
     */
    ICE_CANDIDATE_ERROR = 'ICE_CANDIDATE_ERROR',

    /**
     * The [ICE connection state](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceConnectionState)
     * of an [RTCPeerConnection](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection) reached `failed` status.
     * 
     * This is a terminal error that won't have any kind of possible recovery.
     * 
     * [[ExceptionEvent]] objects with this [[ExceptionEvent.name]] will have as [[ExceptionEvent.origin]] property a [[Stream]] object.
     */
    ICE_CONNECTION_FAILED = 'ICE_CONNECTION_FAILED',

    /**
     * The [ICE connection state](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceConnectionState)
     * of an [RTCPeerConnection](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection) reached `disconnected` status.
     * 
     * This is not a terminal error, and it is possible for the ICE connection to be reconnected.
     * 
     * [[ExceptionEvent]] objects with this [[ExceptionEvent.name]] will have as [[ExceptionEvent.origin]] property a [[Stream]] object.
     */
    ICE_CONNECTION_DISCONNECTED = 'ICE_CONNECTION_DISCONNECTED'

}

/**
 * Defines event `exception` dispatched by [[Session]] object.
 * 
 * This event acts as a global handler for asynchronous errors that may be triggered for multiple reasons and from multiple origins.
 */
export class ExceptionEvent extends Event {

    /**
     * Name of the exception
     */
    name: ExceptionEventName;

    /**
     * Object affected by the exception. Depending on the [[ExceptionEvent.name]] property:
     * - [[Session]]: `ICE_CANDIDATE_ERROR`
     * - [[Stream]]: `ICE_CONNECTION_FAILED`, `ICE_CONNECTION_DISCONNECTED`
     */
    origin: Session | Stream;

    /**
     * Informative description of the exception
     */
    message: string;

    /**
     * Any extra information associated to the exception
     */
    data?: any;

    /**
     * @hidden
     */
    constructor(session: Session, name: ExceptionEventName, origin: Session | Stream, message: string, data?: any) {
        super(false, session, 'exception');
        this.name = name;
        this.origin = origin;
        this.message = message;
        this.data = data;
    }

    /**
     * @hidden
     */
    // tslint:disable-next-line:no-empty
    callDefaultBehavior() { }

}