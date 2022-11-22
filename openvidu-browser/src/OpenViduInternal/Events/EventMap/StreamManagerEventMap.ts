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
import { PublisherSpeakingEvent } from '../PublisherSpeakingEvent';
import { StreamManagerEvent } from '../StreamManagerEvent';
import { StreamPropertyChangedEvent } from '../StreamPropertyChangedEvent';
import { VideoElementEvent } from '../VideoElementEvent';

/**
 * Events dispatched by {@link StreamManager} object. Manage event listeners with
 * {@link StreamManager.on}, {@link StreamManager.once} and {@link StreamManager.off} methods.
 *
 * Example:
 *
 * ```javascript
 * streamManager.on('videoElementCreated', (event) => {
 *      console.log('New video element created:', event.element);
 * }
 *
 * streamManager.off('videoElementCreated');
 * ```
 */
export interface StreamManagerEventMap extends EventMap {
    /**
     * Event dispatched when a new HTML video element has been inserted into DOM by OpenVidu Browser library. See
     * [Manage video players](/en/stable/cheatsheet/manage-videos) section.
     */
    videoElementCreated: VideoElementEvent;

    /**
     * Event dispatched when an HTML video element has been removed from DOM by OpenVidu Browser library. See
     * [Manage video players](/en/stable/cheatsheet/manage-videos) section.
     */
    videoElementDestroyed: VideoElementEvent;

    /**
     * Event dispatched when the media stream starts playing (one of its videos has media and has begun to play).
     * This event will be dispatched when these 3 conditions are met:
     *   1. The StreamManager has no video associated in the DOM.
     *   2. It is associated to one video.
     *   3. That video starts playing. Internally the expected Web API event is [HTMLMediaElement.canplay](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/canplay_event).
     */
    streamPlaying: StreamManagerEvent;

    /**
     * Event dispatched when the volume of the media stream's audio track changes. Only applies if {@link Stream.hasAudio} is `true`.
     * The frequency this event is fired with is defined by property `interval` of
     * {@link OpenViduAdvancedConfiguration.publisherSpeakingEventsOptions} (default 100ms)
     */
    streamAudioVolumeChange: StreamManagerEvent;

    /**
     * Event dispatched when a Stream undergoes any change in any of its mutable properties
     * (see {@link StreamPropertyChangedEvent.changedProperty}).
     */
    streamPropertyChanged: StreamPropertyChangedEvent;

    /**
     * Event dispatched when the user owning the stream has started speaking.
     *
     * Extra information:
     * - This event will only be triggered for **streams that have audio tracks** ({@link Stream.hasAudio} must be true).
     * - Further configuration can be applied on how the event is dispatched by setting property `publisherSpeakingEventsOptions` in the call of {@link OpenVidu.setAdvancedConfiguration}.
     */
    publisherStartSpeaking: PublisherSpeakingEvent;

    /**
     * Event dispatched when the user owning the stream has stopped speaking.
     *
     * Extra information:
     * - This event will only be triggered for **streams that have audio tracks** ({@link Stream.hasAudio} must be true).
     * - Further configuration can be applied on how the event is dispatched by setting property `publisherSpeakingEventsOptions` in the call of {@link OpenVidu.setAdvancedConfiguration}.
     */
    publisherStopSpeaking: PublisherSpeakingEvent;
}
