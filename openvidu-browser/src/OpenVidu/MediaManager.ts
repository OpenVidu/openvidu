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
import { EventDispatcher } from '../OpenViduInternal/Interfaces/Public/EventDispatcher';
import { Event } from '../OpenViduInternal/Events/Event';
import { VideoElementEvent } from '../OpenViduInternal/Events/VideoElementEvent';
import { VideoInsertMode } from '../OpenViduInternal/Enums/VideoInsertMode';

import EventEmitter = require('wolfy87-eventemitter');


/**
 * Interface in charge of displaying the media streams in the HTML DOM. This wraps any Publisher and Subscriber object, as well as
 * any extra representation in the DOM you assign to some Stream by calling [[Stream.addVideoElement]].
 *
 * The use of this interface is useful when you don't need to differentiate between streams and just want to directly manage videos
 */
export class MediaManager implements EventDispatcher {

    /**
     * The Stream represented in the DOM by the MediaManager
     */
    stream: Stream;

    /**
     * Whether the MediaManager is representing in the DOM a local Stream ([[Publisher]]) or a remote Stream ([[Subscriber]])
     */
    remote: boolean;

    /**
     * The DOM HTMLElement assigned as target element when initializing the MediaManager. This property is defined when [[OpenVidu.initPublisher]]
     * or [[Session.subscribe]] methods have been called passing a valid `targetElement` parameter. It is undefined when [[OpenVidu.initPublisher]]
     * or [[Session.subscribe]] methods have been called passing *null* or *undefined* as `targetElement` parameter or when the MediaManager hass been
     * created by calling [[Stream.addVideoElement]]
     */
    targetElement?: HTMLElement;

    /**
     * The DOM HTMLVideoElement displaying the MediaManager's stream
     */
    video: HTMLVideoElement;

    /**
     * `id` attribute of the DOM HTMLVideoElement displaying the MediaManager's stream
     */
    id: string;

    /**
     * @hidden
     */
    isVideoElementCreated = false;

    protected ee = new EventEmitter();
    protected customEe = new EventEmitter();


    /**
     * @hidden
     */
    constructor(stream: Stream, targetElement?: HTMLElement | string) {
        this.stream = stream;
        this.stream.mediaManagers.push(this);
        if (typeof targetElement === 'string') {
            const e = document.getElementById(targetElement);
            if (!!e) {
                this.targetElement = e;
            }
        } else if (targetElement instanceof HTMLElement) {
            this.targetElement = targetElement;
        } else if (!!this.targetElement) {
            console.warn("The provided 'targetElement' couldn't be resolved to any HTML element: " + targetElement);
        }

        this.customEe.on('video-removed', (element: HTMLVideoElement) => {
            this.ee.emitEvent('videoElementDestroyed', [new VideoElementEvent(element, this, 'videoElementDestroyed')]);
        });
    }

    /**
     * See [[EventDispatcher.on]]
     */
    on(type: string, handler: (event: Event) => void): EventDispatcher {
        this.ee.on(type, event => {
            if (event) {
                console.info("Event '" + type + "' triggered", event);
            } else {
                console.info("Event '" + type + "' triggered");
            }
            handler(event);
        });
        if (type === 'videoElementCreated') {
            if (!!this.stream && this.isVideoElementCreated) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent(this.video, this, 'videoElementCreated')]);
            } else {
                this.customEe.on('video-element-created', element => {
                    this.id = element.id;
                    this.ee.emitEvent('videoElementCreated', [new VideoElementEvent(element.element, this, 'videoElementCreated')]);
                });
            }
        }
        if (type === 'videoPlaying') {
            if (!this.stream.displayMyRemote() && !!this.video &&
                this.video.currentTime > 0 &&
                this.video.paused === false &&
                this.video.ended === false &&
                this.video.readyState === 4) {
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent(this.video, this, 'videoPlaying')]);
            } else {
                this.customEe.once('video-is-playing', (element) => {
                    this.ee.emitEvent('videoPlaying', [new VideoElementEvent(element.element, this, 'videoPlaying')]);
                });
            }
        }
        return this;
    }

    /**
     * See [[EventDispatcher.once]]
     */
    once(type: string, handler: (event: Event) => void): MediaManager {
        this.ee.once(type, event => {
            if (event) {
                console.info("Event '" + type + "' triggered once", event);
            } else {
                console.info("Event '" + type + "' triggered once");
            }
            handler(event);
        });
        if (type === 'videoElementCreated') {
            if (!!this.stream && this.isVideoElementCreated) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent(this.video, this, 'videoElementCreated')]);
            } else {
                this.customEe.once('video-element-created', element => {
                    this.id = element.id;
                    this.ee.emitEvent('videoElementCreated', [new VideoElementEvent(element.element, this, 'videoElementCreated')]);
                });
            }
        }
        if (type === 'videoPlaying') {
            if (!this.stream.displayMyRemote() && this.video &&
                this.video.currentTime > 0 &&
                this.video.paused === false &&
                this.video.ended === false &&
                this.video.readyState === 4) {
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent(this.video, this, 'videoPlaying')]);
            } else {
                this.customEe.once('video-is-playing', (element) => {
                    this.ee.emitEvent('videoPlaying', [new VideoElementEvent(element.element, this, 'videoPlaying')]);
                });
            }
        }
        return this;
    }

    /**
     * See [[EventDispatcher.off]]
     */
    off(type: string, handler?: (event: Event) => void): MediaManager {
        if (!handler) {
            this.ee.removeAllListeners(type);
        } else {
            this.ee.off(type, handler);
        }
        return this;
    }


    /**
     * @hidden
     */
    insertVideo(targetElement?: HTMLElement, insertMode?: VideoInsertMode): HTMLVideoElement {
        if (!!targetElement) {

            this.video = document.createElement('video');

            this.video.id = (this.stream.isLocal() ? 'local-' : 'remote-') + 'video-' + this.stream.streamId;
            this.video.autoplay = true;
            this.video.controls = false;
            this.video.srcObject = this.stream.getMediaStream();

            if (this.stream.isLocal() && !this.stream.displayMyRemote()) {
                this.video.muted = true;

                if (this.stream.outboundStreamOpts.publisherProperties.mirror) {
                    this.mirrorVideo();
                }

                this.video.oncanplay = () => {
                    console.info("Local 'Stream' with id [" + this.stream.streamId + '] video is now playing');
                    this.customEe.emitEvent('video-is-playing', [{
                        element: this.video
                    }]);
                };
            } else {
                this.video.title = this.stream.streamId;
            }

            this.targetElement = targetElement;

            const insMode = !!insertMode ? insertMode : VideoInsertMode.APPEND;

            this.insertVideoWithMode(insMode);

            this.customEe.emitEvent('video-element-created', [{
                element: this.video
            }]);

            this.isVideoElementCreated = true;
        }

        if (this.stream.isLocal()) {
            this.stream.isLocalStreamReadyToPublish = true;
            this.stream.emitEvent('stream-ready-to-publish', []);
        }

        return this.video;
    }

    /**
     * @hidden
     */
    insertVideoWithMode(insertMode: VideoInsertMode): void {
        if (!!this.targetElement) {
            switch (insertMode) {
                case VideoInsertMode.AFTER:
                    this.targetElement.parentNode!!.insertBefore(this.video, this.targetElement.nextSibling);
                    break;
                case VideoInsertMode.APPEND:
                    this.targetElement.appendChild(this.video);
                    break;
                case VideoInsertMode.BEFORE:
                    this.targetElement.parentNode!!.insertBefore(this.video, this.targetElement);
                    break;
                case VideoInsertMode.PREPEND:
                    this.targetElement.insertBefore(this.video, this.targetElement.childNodes[0]);
                    break;
                case VideoInsertMode.REPLACE:
                    this.targetElement.parentNode!!.replaceChild(this.video, this.targetElement);
                    break;
                default:
                    this.insertVideoWithMode(VideoInsertMode.APPEND);
            }
        }
    }

    /**
     * @hidden
     */
    removeVideo(): void {
        if (!!this.video) {
            this.video.parentNode!.removeChild(this.video);
            this.customEe.emitEvent('video-removed', [this.video]);
            delete this.video;
        }
    }

    /**
     * @hidden
     */
    addOnCanPlayEvent() {
        if (!!this.video) {
            // let thumbnailId = this.video.thumb;
            this.video.oncanplay = () => {
                if (this.stream.isLocal() && this.stream.displayMyRemote()) {
                    console.info("Your own remote 'Stream' with id [" + this.stream.streamId + '] video is now playing');
                    this.customEe.emitEvent('remote-video-is-playing', [{
                        element: this.video
                    }]);
                } else if (!this.stream.isLocal() && !this.stream.displayMyRemote()) {
                    console.info("Remote 'Stream' with id [" + this.stream.streamId + '] video is now playing');
                    this.customEe.emitEvent('video-is-playing', [{
                        element: this.video
                    }]);
                }
                // show(thumbnailId);
                // this.hideSpinner(this.streamId);
            };
        }
    }


    private mirrorVideo(): void {
        this.video.style.transform = 'rotateY(180deg)';
        this.video.style.webkitTransform = 'rotateY(180deg)';
    }

}