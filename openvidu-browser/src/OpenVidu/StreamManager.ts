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
import { EventDispatcher } from '../OpenViduInternal/Interfaces/Public/EventDispatcher';
import { StreamManagerVideo } from '../OpenViduInternal/Interfaces/Public/StreamManagerVideo';
import { Event } from '../OpenViduInternal/Events/Event';
import { StreamManagerEvent } from '../OpenViduInternal/Events/StreamManagerEvent';
import { VideoElementEvent } from '../OpenViduInternal/Events/VideoElementEvent';
import { VideoInsertMode } from '../OpenViduInternal/Enums/VideoInsertMode';

import EventEmitter = require('wolfy87-eventemitter');
import platform = require('platform');

/**
 * Interface in charge of displaying the media streams in the HTML DOM. This wraps any [[Publisher]] and [[Subscriber]] object.
 * You can insert as many video players fo the same Stream as you want by calling [[StreamManager.addVideoElement]] or
 * [[StreamManager.createVideoElement]].
 *
 * The use of StreamManager wrapper is particularly useful when you don't need to differentiate between Publisher or Subscriber streams or just
 * want to directly manage your own video elements (even more than one video element per Stream). This scenario is pretty common in
 * declarative, MVC frontend frameworks such as Angular, React or Vue.js
 */
export class StreamManager implements EventDispatcher {

    /**
     * The Stream represented in the DOM by the Publisher/Subscriber
     */
    stream: Stream;

    /**
     * All the videos displaying the Stream of this Publisher/Subscriber
     */
    videos: StreamManagerVideo[] = [];

    /**
     * Whether the Stream represented in the DOM is local or remote
     * - `false` for [[Publisher]]
     * - `true` for [[Subscriber]]
     */
    remote: boolean;

    /**
     * The DOM HTMLElement assigned as target element when creating the video for the Publisher/Subscriber. This property is only defined if:
     * - [[Publisher]] has been initialized by calling method [[OpenVidu.initPublisher]] with a valid `targetElement` parameter
     * - [[Subscriber]] has been initialized by calling method [[Session.subscribe]] with a valid `targetElement` parameter
     */
    targetElement: HTMLElement;

    /**
     * `id` attribute of the DOM video element displaying the Publisher/Subscriber's stream. This property is only defined if:
     * - [[Publisher]] has been initialized by calling method [[OpenVidu.initPublisher]] with a valid `targetElement` parameter
     * - [[Subscriber]] has been initialized by calling method [[Session.subscribe]] with a valid `targetElement` parameter
     */
    id: string;

    /**
     * @hidden
     */
    firstVideoElement: StreamManagerVideo;
    /**
     * @hidden
     */
    lazyLaunchVideoElementCreatedEvent = false;
    /**
     * @hidden
     */
    element: HTMLElement;
    /**
     * @hidden
     */
    ee = new EventEmitter();
    /**
     * @hidden
     */
    protected canPlayListener: EventListener;


    /**
     * @hidden
     */
    constructor(stream: Stream, targetElement?: HTMLElement | string) {
        this.stream = stream;
        this.stream.streamManager = this;
        this.remote = !this.stream.isLocal();

        if (!!targetElement) {
            let targEl;
            if (typeof targetElement === 'string') {
                targEl = document.getElementById(targetElement);
            } else if (targetElement instanceof HTMLElement) {
                targEl = targetElement;
            }

            if (!!targEl) {
                this.firstVideoElement = {
                    targetElement: targEl,
                    video: document.createElement('video'),
                    id: '',
                    canplayListenerAdded: false
                };
                if (platform.name === 'Safari') {
                    this.firstVideoElement.video.setAttribute('playsinline', 'true');
                }
                this.targetElement = targEl;
                this.element = targEl;
            }
        }

        this.canPlayListener = () => {
            if (this.stream.isLocal()) {
                if (!this.stream.displayMyRemote()) {
                    console.info("Your local 'Stream' with id [" + this.stream.streamId + '] video is now playing');
                    this.ee.emitEvent('videoPlaying', [new VideoElementEvent(this.videos[0].video, this, 'videoPlaying')]);
                } else {
                    console.info("Your own remote 'Stream' with id [" + this.stream.streamId + '] video is now playing');
                    this.ee.emitEvent('remoteVideoPlaying', [new VideoElementEvent(this.videos[0].video, this, 'remoteVideoPlaying')]);
                }
            } else {
                console.info("Remote 'Stream' with id [" + this.stream.streamId + '] video is now playing');
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent(this.videos[0].video, this, 'videoPlaying')]);
            }
            this.ee.emitEvent('streamPlaying', [new StreamManagerEvent(this, 'streamPlaying', undefined)]);
        };
    }

    /**
     * See [[EventDispatcher.on]]
     */
    on(type: string, handler: (event: Event) => void): EventDispatcher {
        this.ee.on(type, event => {
            if (event) {
                console.info("Event '" + type + "' triggered by '" + (this.remote ? 'Subscriber' : 'Publisher') + "'", event);
            } else {
                console.info("Event '" + type + "' triggered by '" + (this.remote ? 'Subscriber' : 'Publisher') + "'");
            }
            handler(event);
        });
        if (type === 'videoElementCreated') {
            if (!!this.stream && this.lazyLaunchVideoElementCreatedEvent) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent(this.videos[0].video, this, 'videoElementCreated')]);
                this.lazyLaunchVideoElementCreatedEvent = false;
            }
        }
        if (type === 'streamPlaying' || type === 'videoPlaying') {
            if (this.videos[0] && this.videos[0].video &&
                this.videos[0].video.currentTime > 0 &&
                this.videos[0].video.paused === false &&
                this.videos[0].video.ended === false &&
                this.videos[0].video.readyState === 4) {
                this.ee.emitEvent('streamPlaying', [new StreamManagerEvent(this, 'streamPlaying', undefined)]);
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent(this.videos[0].video, this, 'videoPlaying')]);
            }
        }
        if (type === 'streamAudioVolumeChange' && this.stream.hasAudio) {
            this.stream.enableVolumeChangeEvent();
        }
        return this;
    }

    /**
     * See [[EventDispatcher.once]]
     */
    once(type: string, handler: (event: Event) => void): StreamManager {
        this.ee.once(type, event => {
            if (event) {
                console.info("Event '" + type + "' triggered once", event);
            } else {
                console.info("Event '" + type + "' triggered once");
            }
            handler(event);
        });
        if (type === 'videoElementCreated') {
            if (!!this.stream && this.lazyLaunchVideoElementCreatedEvent) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent(this.videos[0].video, this, 'videoElementCreated')]);
            }
        }
        if (type === 'streamPlaying' || type === 'videoPlaying') {
            if (this.videos[0] && this.videos[0].video &&
                this.videos[0].video.currentTime > 0 &&
                this.videos[0].video.paused === false &&
                this.videos[0].video.ended === false &&
                this.videos[0].video.readyState === 4) {
                this.ee.emitEvent('streamPlaying', [new StreamManagerEvent(this, 'streamPlaying', undefined)]);
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent(this.videos[0].video, this, 'videoPlaying')]);
            }
        }
        if (type === 'streamAudioVolumeChange' && this.stream.hasAudio) {
            this.stream.enableOnceVolumeChangeEvent();
        }
        return this;
    }

    /**
     * See [[EventDispatcher.off]]
     */
    off(type: string, handler?: (event: Event) => void): StreamManager {
        if (!handler) {
            this.ee.removeAllListeners(type);
        } else {
            this.ee.off(type, handler);
        }

        if (type === 'streamAudioVolumeChange') {
            this.stream.disableVolumeChangeEvent();
        }

        return this;
    }

    /**
     * Makes `video` element parameter display this [[stream]]. This is useful when you are
     * [managing the video elements on your own](/docs/how-do-i/manage-videos/#you-take-care-of-the-video-players)
     *
     * Calling this method with a video already added to other Publisher/Subscriber will cause the video element to be
     * disassociated from that previous Publisher/Subscriber and to be associated to this one.
     *
     * @returns 1 if the video wasn't associated to any other Publisher/Subscriber and has been successfully added to this one.
     * 0 if the video was already added to this Publisher/Subscriber. -1 if the video was previously associated to any other
     * Publisher/Subscriber and has been successfully disassociated from that one and properly added to this one.
     */
    addVideoElement(video: HTMLVideoElement): number {

        this.initializeVideoProperties(video);

        if (this.stream.isLocal() && this.stream.displayMyRemote()) {
            if (video.srcObject !== this.stream.getMediaStream()) {
                video.srcObject = this.stream.getMediaStream();
            }
        }

        // If the video element is already part of this StreamManager do nothing
        for (const v of this.videos) {
            if (v.video === video) {
                return 0;
            }
        }

        let returnNumber = 1;

        for (const streamManager of this.stream.session.streamManagers) {
            if (streamManager.disassociateVideo(video)) {
                returnNumber = -1;
                break;
            }
        }

        this.stream.session.streamManagers.forEach(streamManager => {
            streamManager.disassociateVideo(video);
        });

        this.pushNewStreamManagerVideo({
            video,
            id: video.id,
            canplayListenerAdded: false
        });

        console.info('New video element associated to ', this);

        return returnNumber;
    }

    /**
     * Creates a new video element displaying this [[stream]]. This allows you to have multiple video elements displaying the same media stream.
     *
     * #### Events dispatched
     *
     * The Publisher/Subscriber object will dispatch a `videoElementCreated` event once the HTML video element has been added to DOM. See [[VideoElementEvent]]
     *
     * @param targetElement HTML DOM element (or its `id` attribute) in which the video element of the Publisher/Subscriber will be inserted
     * @param insertMode How the video element will be inserted accordingly to `targetElemet`
     *
     * @returns The created HTMLVideoElement
     */
    createVideoElement(targetElement?: string | HTMLElement, insertMode?: VideoInsertMode): HTMLVideoElement {
        let targEl;
        if (typeof targetElement === 'string') {
            targEl = document.getElementById(targetElement);
            if (!targEl) {
                throw new Error("The provided 'targetElement' couldn't be resolved to any HTML element: " + targetElement);
            }
        } else if (targetElement instanceof HTMLElement) {
            targEl = targetElement;
        } else {
            throw new Error("The provided 'targetElement' couldn't be resolved to any HTML element: " + targetElement);
        }

        const video = document.createElement('video');
        this.initializeVideoProperties(video);

        let insMode = !!insertMode ? insertMode : VideoInsertMode.APPEND;
        switch (insMode) {
            case VideoInsertMode.AFTER:
                targEl.parentNode!!.insertBefore(video, targEl.nextSibling);
                break;
            case VideoInsertMode.APPEND:
                targEl.appendChild(video);
                break;
            case VideoInsertMode.BEFORE:
                targEl.parentNode!!.insertBefore(video, targEl);
                break;
            case VideoInsertMode.PREPEND:
                targEl.insertBefore(video, targEl.childNodes[0]);
                break;
            case VideoInsertMode.REPLACE:
                targEl.parentNode!!.replaceChild(video, targEl);
                break;
            default:
                insMode = VideoInsertMode.APPEND;
                targEl.appendChild(video);
                break;
        }

        const v: StreamManagerVideo = {
            targetElement: targEl,
            video,
            insertMode: insMode,
            id: video.id,
            canplayListenerAdded: false
        };
        this.pushNewStreamManagerVideo(v);

        this.ee.emitEvent('videoElementCreated', [new VideoElementEvent(v.video, this, 'videoElementCreated')]);
        this.lazyLaunchVideoElementCreatedEvent = !!this.firstVideoElement;

        return video;
    }

    /**
     * @hidden
     */
    initializeVideoProperties(video: HTMLVideoElement): void {
        if (!(this.stream.isLocal() && this.stream.displayMyRemote())) {
            // Avoid setting the MediaStream into the srcObject if remote subscription before publishing
            if (video.srcObject !== this.stream.getMediaStream()) {
                // If srcObject already set don't do it again
                video.srcObject = this.stream.getMediaStream();
            }
        }
        video.autoplay = true;
        video.controls = false;

        if (platform.name === 'Safari') {
            video.setAttribute('playsinline', 'true');
        }

        if (!video.id) {
            video.id = (this.remote ? 'remote-' : 'local-') + 'video-' + this.stream.streamId;
            // DEPRECATED property: assign once the property id if the user provided a valid targetElement	
            if (!this.id && !!this.targetElement) {
                this.id = video.id;
            }
        }

        if (!this.remote && !this.stream.displayMyRemote()) {
            video.muted = true;
            if (video.style.transform === 'rotateY(180deg)' && !this.stream.outboundStreamOpts.publisherProperties.mirror) {
                // If the video was already rotated and now is set to not mirror
                this.removeMirrorVideo(video);
            } else if (this.stream.outboundStreamOpts.publisherProperties.mirror && !this.stream.isSendScreen()) {
                this.mirrorVideo(video);
            }
        }
    }

    /**
     * @hidden
     */
    removeAllVideos(): void {
        for (let i = this.stream.session.streamManagers.length - 1; i >= 0; --i) {
            if (this.stream.session.streamManagers[i] === this) {
                this.stream.session.streamManagers.splice(i, 1);
            }
        }

        this.videos.forEach(streamManagerVideo => {
            // Remove oncanplay event listener (only OpenVidu browser listener, not the user ones)
            streamManagerVideo.video.removeEventListener('canplay', this.canPlayListener);
            streamManagerVideo.canplayListenerAdded = false;
            if (!!streamManagerVideo.targetElement) {
                // Only remove from DOM videos created by OpenVidu Browser (those generated by passing a valid targetElement in OpenVidu.initPublisher
                // and Session.subscribe or those created by StreamManager.createVideoElement). All this videos triggered a videoElementCreated event
                streamManagerVideo.video.parentNode!.removeChild(streamManagerVideo.video);
                this.ee.emitEvent('videoElementDestroyed', [new VideoElementEvent(streamManagerVideo.video, this, 'videoElementDestroyed')]);
            }
            // Remove srcObject from the video
            streamManagerVideo.video.srcObject = null;
            // Remove from collection of videos every video managed by OpenVidu Browser
            this.videos.filter(v => !v.targetElement);
        });
    }

    /**
     * @hidden
     */
    disassociateVideo(video: HTMLVideoElement): boolean {
        let disassociated = false;
        for (let i = 0; i < this.videos.length; i++) {
            if (this.videos[i].video === video) {
                this.videos[i].video.removeEventListener('canplay', this.canPlayListener);
                this.videos.splice(i, 1);
                disassociated = true;
                console.info('Video element disassociated from ', this);
                break;
            }
        }
        return disassociated;
    }

    /**
     * @hidden
     */
    addPlayEventToFirstVideo() {
        if ((!!this.videos[0]) && (!!this.videos[0].video) && (!this.videos[0].canplayListenerAdded)) {
            this.videos[0].video.addEventListener('canplay', this.canPlayListener);
            this.videos[0].canplayListenerAdded = true;
        }
    }

    /**
     * @hidden
     */
    updateMediaStream(mediaStream: MediaStream) {
        this.videos.forEach(streamManagerVideo => {
            streamManagerVideo.video.srcObject = mediaStream;
            if (platform['isIonicIos']) {
                // iOS Ionic. LIMITATION: must reinsert the video in the DOM for
                // the media stream to be updated
                const vParent = streamManagerVideo.video.parentElement;
                const newVideo = streamManagerVideo.video;
                vParent!!.replaceChild(newVideo, streamManagerVideo.video);
                streamManagerVideo.video = newVideo;
            }
        });
    }

    /**
     * @hidden
     */
    emitEvent(type: string, eventArray: any[]): void {
        this.ee.emitEvent(type, eventArray);
    }

    private pushNewStreamManagerVideo(streamManagerVideo: StreamManagerVideo) {
        this.videos.push(streamManagerVideo);
        this.addPlayEventToFirstVideo();
        if (this.stream.session.streamManagers.indexOf(this) === -1) {
            this.stream.session.streamManagers.push(this);
        }
    }

    private mirrorVideo(video): void {
        if (!platform['isIonicIos']) {
            video.style.transform = 'rotateY(180deg)';
            video.style.webkitTransform = 'rotateY(180deg)';
        }
    }

    private removeMirrorVideo(video): void {
        video.style.transform = 'unset';
        video.style.webkitTransform = 'unset';
    }

}