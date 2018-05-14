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

import { Stream } from './Stream';
import { SubscriberProperties } from '../OpenViduInternal/Interfaces/Public/SubscriberProperties';
import { EventDispatcher } from '../OpenViduInternal/Interfaces/Public/EventDispatcher';
import { VideoElementEvent } from '../OpenViduInternal/Events/VideoElementEvent';
import EventEmitter = require('wolfy87-eventemitter');


/**
 * Packs remote media streams. Participants automatically receive them when others publish their streams. Initialized with [[Session.subscribe]] method
 */
export class Subscriber implements EventDispatcher {

    /**
     * HTML DOM element in which the Subscriber's video has been inserted
     */
    element: HTMLElement;

    /**
     * DOM id of the Subscriber's video element
     */
    id: string;

    /**
     * The [[Stream]] to which you are subscribing
     */
    stream: Stream;

    private ee = new EventEmitter();

    private properties: SubscriberProperties;

    /**
     * @hidden
     */
    constructor(stream: Stream, targetElement: string | HTMLElement, properties: SubscriberProperties) {
        this.stream = stream;
        this.properties = properties;

        if (typeof targetElement === 'string') {
            const e = document.getElementById(targetElement);
            if (!!e) {
                this.element = e;
            }
        } else if (targetElement instanceof HTMLElement) {
            this.element = targetElement;
        }

        this.stream.once('video-removed', (element: HTMLVideoElement) => {
            this.ee.emitEvent('videoElementDestroyed', [new VideoElementEvent(element, this, 'videoElementDestroyed')]);
        });
    }

    /**
     * Subscribe or unsubscribe from the audio stream (if available). Calling this method twice in a row passing same value will have no effect
     * @param value `true` to subscribe to the audio stream, `false` to unsubscribe from it
     */
    subscribeToAudio(value: boolean): Subscriber {
        this.stream.getMediaStream().getAudioTracks().forEach((track) => {
            track.enabled = value;
        });
        console.info("'Subscriber' has " + (value ? 'subscribed to' : 'unsubscribed from') + ' its audio stream');
        return this;
    }

    /**
     * Subscribe or unsubscribe from the video stream (if available). Calling this method twice in a row passing same value will have no effect
     * @param value `true` to subscribe to the video stream, `false` to unsubscribe from it
     */
    subscribeToVideo(value: boolean): Subscriber {
        this.stream.getMediaStream().getVideoTracks().forEach((track) => {
            track.enabled = value;
        });
        console.info("'Subscriber' has " + (value ? 'subscribed to' : 'unsubscribed from') + ' its video stream');
        return this;
    }


    /**
     * See [[EventDispatcher.on]]
     */
    on(type: string, handler: (event: VideoElementEvent) => void): EventDispatcher {
        this.ee.on(type, event => {
            if (event) {
                console.info("Event '" + type + "' triggered by 'Subscriber'", event);
            } else {
                console.info("Event '" + type + "' triggered by 'Subscriber'");
            }
            handler(event);
        });

        if (type === 'videoElementCreated') {
            if (this.stream.isVideoELementCreated) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent(this.stream.getVideoElement(), this, 'videoElementCreated')]);
            } else {
                this.stream.once('video-element-created-by-stream', element => {
                    this.id = element.id;
                    this.ee.emitEvent('videoElementCreated', [new VideoElementEvent(element, this, 'videoElementCreated')]);
                });
            }
        }
        if (type === 'videoPlaying') {
            const video = this.stream.getVideoElement();
            if (!this.stream.displayMyRemote() && video &&
                video.currentTime > 0 &&
                video.paused === false &&
                video.ended === false &&
                video.readyState === 4) {
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent(this.stream.getVideoElement(), this, 'videoPlaying')]);
            } else {
                this.stream.once('video-is-playing', (element) => {
                    this.ee.emitEvent('videoPlaying', [new VideoElementEvent(element.element, this, 'videoPlaying')]);
                });
            }
        }

        return this;
    }


    /**
     * See [[EventDispatcher.once]]
     */
    once(type: string, handler: (event: VideoElementEvent) => void): Subscriber {
        this.ee.once(type, event => {
            if (event) {
                console.info("Event '" + type + "' triggered once by 'Subscriber'", event);
            } else {
                console.info("Event '" + type + "' triggered once by 'Subscriber'");
            }
            handler(event);
        });

        if (type === 'videoElementCreated') {
            if (this.stream.isVideoELementCreated) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent(this.stream.getVideoElement(), this, 'videoElementCreated')]);
            } else {
                this.stream.once('video-element-created-by-stream', element => {
                    this.id = element.id;
                    this.ee.emitEvent('videoElementCreated', [new VideoElementEvent(element, this, 'videoElementCreated')]);
                });
            }
        }
        if (type === 'videoPlaying') {
            const video = this.stream.getVideoElement();
            if (!this.stream.displayMyRemote() && video &&
                video.currentTime > 0 &&
                video.paused === false &&
                video.ended === false &&
                video.readyState === 4) {
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent(this.stream.getVideoElement(), this, 'videoPlaying')]);
            } else {
                this.stream.once('video-is-playing', (element) => {
                    this.ee.emitEvent('videoPlaying', [new VideoElementEvent(element.element, this, 'videoPlaying')]);
                });
            }
        }

        return this;
    }


    /**
     * See [[EventDispatcher.off]]
     */
    off(type: string, handler?: (event: VideoElementEvent) => void): Subscriber {
        if (!handler) {
            this.ee.removeAllListeners(type);
        } else {
            this.ee.off(type, handler);
        }
        return this;
    }

}