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

import { EventMap } from './EventMap';
import { ConnectionEvent } from '../ConnectionEvent';
import { ConnectionPropertyChangedEvent } from '../ConnectionPropertyChangedEvent';
import { ExceptionEvent } from '../ExceptionEvent';
import { NetworkQualityLevelChangedEvent } from '../NetworkQualityLevelChangedEvent';
import { PublisherSpeakingEvent } from '../PublisherSpeakingEvent';
import { RecordingEvent } from '../RecordingEvent';
import { SessionDisconnectedEvent } from '../SessionDisconnectedEvent';
import { SignalEvent } from '../SignalEvent';
import { StreamEvent } from '../StreamEvent';
import { StreamPropertyChangedEvent } from '../StreamPropertyChangedEvent';

/**
 * Events dispatched by [[Session]] object. Manage event listeners with
 * [[Session.on]], [[Session.once]] and [[Session.off]] methods.
 */
export interface SessionEventMap extends EventMap {

    /**
     * Event dispatched when a new user has connected to the session.
     *
     * It is fired for both the local user and remote users.
     */
    connectionCreated: ConnectionEvent;

    /**
     * Event dispatched when a remote user has left the session.
     *
     * For the local user see [[sessionDisconnected]].
     */
    connectionDestroyed: ConnectionEvent;

    /**
     * **This feature is part of OpenVidu Pro tier** <a href="https://docs.openvidu.io/en/stable/openvidu-pro/" style="display: inline-block; background-color: rgb(0, 136, 170); color: white; font-weight: bold; padding: 0px 5px; margin-right: 5px; border-radius: 3px; font-size: 13px; line-height:21px; font-family: Montserrat, sans-serif">PRO</a>
     *
     * Event dispatched when a property of the local [[Connection]] object changes.
     *
     * It is fired only for the local user.
     *
     * The properties that may change are [[Connection.role]] and [[Connection.record]].
     * The only way the Connection properties may change is by updating them through:
     *
     * - [API REST](/en/stable/reference-docs/REST-API/#patch-connection)
     * - [openvidu-java-client](/en/stable/reference-docs/openvidu-java-client/#update-a-connection)
     * - [openvidu-node-client](/en/stable/reference-docs/openvidu-node-client/#update-a-connection)<br><br>
     */
    connectionPropertyChanged: ConnectionPropertyChangedEvent;

    /**
     * Event dispatched when the local user has left the session.
     *
     * For remote users see [[connectionDestroyed]].
     */
    sessionDisconnected: SessionDisconnectedEvent;

    /**
     * Event dispatched when a user has started publishing media to the session (see [[Session.publish]]).
     *
     * It is fired for both the local user and remote users.
     */
    streamCreated: StreamEvent;

    /**
     * Event dispatched when a user stops publishing media to the session.
     *
     * It is fired for both the local user and remote users.
     */
    streamDestroyed: StreamEvent;

    /**
     * Event dispatched when a Stream undergoes any change in any of its mutable properties
     * (see [[StreamPropertyChangedEvent.changedProperty]]).
     *
     * It is fired for both remote streams (owned by a [[Subscriber]]) or local streams (owned by a [[Publisher]]).
     */
    streamPropertyChanged: StreamPropertyChangedEvent;

    /**
     * Event dispatched when a user has started speaking.
     *
     * It is fired for both the local user and remote users.
     *
     * Extra information:
     * - This event will only be triggered for **streams that have audio tracks** ([[Stream.hasAudio]] must be true).
     * - Further configuration can be applied on how the event is dispatched by setting property `publisherSpeakingEventsOptions` in the call of [[OpenVidu.setAdvancedConfiguration]].
     */
    publisherStartSpeaking: PublisherSpeakingEvent;

    /**
     * Event dispatched when a user has stopped speaking.
     *
     * It is fired for both the local user and remote users.
     *
     * Extra information:
     * - This event will only be triggered for **streams that have audio tracks** ([[Stream.hasAudio]] must be true).
     * - Further configuration can be applied on how the event is dispatched by setting property `publisherSpeakingEventsOptions` in the call of [[OpenVidu.setAdvancedConfiguration]].
     */
    publisherStopSpeaking: PublisherSpeakingEvent;

    /**
     * @hidden
     */
    [key: `signal:${string}`]: SignalEvent;

    /**
     * Event dispatched when a signal is received (see [Send text messages between users](/en/stable/cheatsheet/send-messages)).
     *
     * If the listener is added as **`signal:TYPE`**, only signals of type **`TYPE`** will trigger the event.
     */
    signal: SignalEvent;

    /**
     * Event dispatched when the session has started being recorded.
     *
     * Property **`OPENVIDU_RECORDING_NOTIFICATION`** of [OpenVidu Server configuration](/en/stable/reference-docs/openvidu-config/)
     * defines which users should receive this events (by default, only users with role `PUBLISHER` or `MODERATOR`)
     */
    recordingStarted: RecordingEvent;

    /**
     * Event dispatched when the session has stopped being recorded.
     *
     * Property **`OPENVIDU_RECORDING_NOTIFICATION`** of [OpenVidu Server configuration](/en/stable/reference-docs/openvidu-config/)
     * defines which users should receive this events (by default, only users with role `PUBLISHER` or `MODERATOR`)
     */
    recordingStopped: RecordingEvent;

    /**
     * **This feature is part of OpenVidu Pro tier** <a href="https://docs.openvidu.io/en/stable/openvidu-pro/" style="display: inline-block; background-color: rgb(0, 136, 170); color: white; font-weight: bold; padding: 0px 5px; margin-right: 5px; border-radius: 3px; font-size: 13px; line-height:21px; font-family: Montserrat, sans-serif">PRO</a>
     *
     * Event dispatched when the network quality level of a [[Connection]] changes. See [network quality](/en/stable/advanced-features/network-quality/).
     */
    networkQualityLevelChanged: NetworkQualityLevelChangedEvent;

    /**
     * Event dispatched when the local user has lost its connection to the session, and starts the automatic reconnection process.
     *
     * See [Reconnection events](/en/stable/advanced-features/automatic-reconnection/#reconnection-events).
     */
    reconnecting: never;

    /**
     * Event dispatched when the local user has successfully recovered its connection to the session after losing it.
     *
     * If the connection was recovered but OpenVidu Server already evicted the user due to timeout, then this event will
     * not be dispatched. A [[sessionDisconnected]] event with reason `networkDisconnect` will be triggered instead.
     *
     * See [Reconnection events](/en/stable/advanced-features/automatic-reconnection/#reconnection-events).
     */
    reconnected: never;

    /**
     * This event acts as a global handler for asynchronous errors that may be triggered for multiple reasons and from multiple origins.
     * To see the different types of exceptions go to [[ExceptionEventName]].
     */
    exception: ExceptionEvent;
}
