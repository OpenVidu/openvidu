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

import { Stream } from './Stream';
import { Subscriber } from './Subscriber';
import { EventDispatcher } from './EventDispatcher';
import { StreamManagerVideo } from '../OpenViduInternal/Interfaces/Public/StreamManagerVideo';
import { StreamManagerEventMap } from '../OpenViduInternal/Events/EventMap/StreamManagerEventMap';
import { StreamManagerEvent } from '../OpenViduInternal/Events/StreamManagerEvent';
import { VideoElementEvent } from '../OpenViduInternal/Events/VideoElementEvent';
import { ExceptionEvent, ExceptionEventName } from '../OpenViduInternal/Events/ExceptionEvent';
import { VideoInsertMode } from '../OpenViduInternal/Enums/VideoInsertMode';
import { OpenViduLogger } from '../OpenViduInternal/Logger/OpenViduLogger';
import { PlatformUtils } from '../OpenViduInternal/Utils/Platform';

/**
 * @hidden
 */
const logger: OpenViduLogger = OpenViduLogger.getInstance();

/**
 * @hidden
 */
let platform: PlatformUtils;

/**
 * Interface in charge of displaying the media streams in the HTML DOM. This wraps any {@link Publisher} and {@link Subscriber} object.
 * You can insert as many video players fo the same Stream as you want by calling {@link StreamManager.addVideoElement} or
 * {@link StreamManager.createVideoElement}.
 * The use of StreamManager wrapper is particularly useful when you don't need to differentiate between Publisher or Subscriber streams or just
 * want to directly manage your own video elements (even more than one video element per Stream). This scenario is pretty common in
 * declarative, MVC frontend frameworks such as Angular, React or Vue.js
 *
 * See available event listeners at {@link StreamManagerEventMap}.
 */
export abstract class StreamManager extends EventDispatcher {
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
     * - `false` for {@link Publisher}
     * - `true` for {@link Subscriber}
     */
    remote: boolean;

    /**
     * The DOM HTMLElement assigned as target element when creating the video for the Publisher/Subscriber. This property is only defined if:
     * - {@link Publisher} has been initialized by calling method {@link OpenVidu.initPublisher} with a valid `targetElement` parameter
     * - {@link Subscriber} has been initialized by calling method {@link Session.subscribe} with a valid `targetElement` parameter
     */
    targetElement: HTMLElement;

    /**
     * `id` attribute of the DOM video element displaying the Publisher/Subscriber's stream. This property is only defined if:
     * - {@link Publisher} has been initialized by calling method {@link OpenVidu.initPublisher} with a valid `targetElement` parameter
     * - {@link Subscriber} has been initialized by calling method {@link Session.subscribe} with a valid `targetElement` parameter
     */
    id: string;

    /**
     * @hidden
     */
    protected firstVideoElement?: StreamManagerVideo;
    /**
     * @hidden
     */
    protected element: HTMLElement;
    /**
     * @hidden
     */
    protected canPlayListener: EventListener;
    /**
     * @hidden
     */
    private streamPlayingEventExceptionTimeout?: NodeJS.Timeout;
    /**
     * @hidden
     */
    private lazyLaunchVideoElementCreatedEvent = false;

    /**
     * @hidden
     */
    constructor(stream: Stream, targetElement?: HTMLElement | string) {
        super();
        platform = PlatformUtils.getInstance();
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
                if (
                    platform.isSafariBrowser() ||
                    (platform.isIPhoneOrIPad() &&
                        (platform.isChromeMobileBrowser() ||
                            platform.isEdgeMobileBrowser() ||
                            platform.isOperaMobileBrowser() ||
                            platform.isFirefoxMobileBrowser()))
                ) {
                    this.firstVideoElement.video.playsInline = true;
                }
                this.targetElement = targEl;
                this.element = targEl;
            }
        }

        this.canPlayListener = () => {
            this.deactivateStreamPlayingEventExceptionTimeout();
            this.ee.emitEvent('streamPlaying', [new StreamManagerEvent(this, 'streamPlaying', undefined)]);
        };
    }

    /**
     * See {@link EventDispatcher.on}
     */
    on<K extends keyof StreamManagerEventMap>(type: K, handler: (event: StreamManagerEventMap[K]) => void): this {
        super.onAux(type, "Event '" + type + "' triggered by '" + (this.remote ? 'Subscriber' : 'Publisher') + "'", handler);

        if (type === 'videoElementCreated') {
            if (!!this.stream && this.lazyLaunchVideoElementCreatedEvent) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent(this.videos[0].video, this, 'videoElementCreated')]);
                this.lazyLaunchVideoElementCreatedEvent = false;
            }
        }
        if (type === 'streamPlaying') {
            if (
                this.videos[0] &&
                this.videos[0].video &&
                this.videos[0].video.currentTime > 0 &&
                this.videos[0].video.paused === false &&
                this.videos[0].video.ended === false &&
                this.videos[0].video.readyState === 4
            ) {
                this.ee.emitEvent('streamPlaying', [new StreamManagerEvent(this, 'streamPlaying', undefined)]);
            }
        }
        if (this.stream.hasAudio) {
            if (type === 'publisherStartSpeaking') {
                this.stream.enableHarkSpeakingEvent();
            }
            if (type === 'publisherStopSpeaking') {
                this.stream.enableHarkStoppedSpeakingEvent();
            }
            if (type === 'streamAudioVolumeChange') {
                this.stream.enableHarkVolumeChangeEvent(false);
            }
        }
        return this;
    }

    /**
     * See {@link EventDispatcher.once}
     */
    once<K extends keyof StreamManagerEventMap>(type: K, handler: (event: StreamManagerEventMap[K]) => void): this {
        super.onceAux(type, "Event '" + type + "' triggered once by '" + (this.remote ? 'Subscriber' : 'Publisher') + "'", handler);

        if (type === 'videoElementCreated') {
            if (!!this.stream && this.lazyLaunchVideoElementCreatedEvent) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent(this.videos[0].video, this, 'videoElementCreated')]);
            }
        }
        if (type === 'streamPlaying') {
            if (
                this.videos[0] &&
                this.videos[0].video &&
                this.videos[0].video.currentTime > 0 &&
                this.videos[0].video.paused === false &&
                this.videos[0].video.ended === false &&
                this.videos[0].video.readyState === 4
            ) {
                this.ee.emitEvent('streamPlaying', [new StreamManagerEvent(this, 'streamPlaying', undefined)]);
            }
        }
        if (this.stream.hasAudio) {
            if (type === 'publisherStartSpeaking') {
                this.stream.enableOnceHarkSpeakingEvent();
            }
            if (type === 'publisherStopSpeaking') {
                this.stream.enableOnceHarkStoppedSpeakingEvent();
            }
            if (type === 'streamAudioVolumeChange') {
                this.stream.enableOnceHarkVolumeChangeEvent(false);
            }
        }
        return this;
    }

    /**
     * See {@link EventDispatcher.off}
     */
    off<K extends keyof StreamManagerEventMap>(type: K, handler?: (event: StreamManagerEventMap[K]) => void): this {
        super.offAux(type, handler);

        if (type === 'publisherStartSpeaking') {
            // Both StreamManager and Session can have "publisherStartSpeaking" event listeners
            const remainingStartSpeakingEventListeners =
                this.ee.getListeners(type).length + this.stream.session.ee.getListeners(type).length;
            if (remainingStartSpeakingEventListeners === 0) {
                this.stream.disableHarkSpeakingEvent(false);
            }
        }
        if (type === 'publisherStopSpeaking') {
            // Both StreamManager and Session can have "publisherStopSpeaking" event listeners
            const remainingStopSpeakingEventListeners =
                this.ee.getListeners(type).length + this.stream.session.ee.getListeners(type).length;
            if (remainingStopSpeakingEventListeners === 0) {
                this.stream.disableHarkStoppedSpeakingEvent(false);
            }
        }
        if (type === 'streamAudioVolumeChange') {
            // Only StreamManager can have "streamAudioVolumeChange" event listeners
            const remainingVolumeEventListeners = this.ee.getListeners(type).length;
            if (remainingVolumeEventListeners === 0) {
                this.stream.disableHarkVolumeChangeEvent(false);
            }
        }

        return this;
    }

    /**
     * Makes `video` element parameter display this {@link stream}. This is useful when you are
     * [managing the video elements on your own](/en/stable/cheatsheet/manage-videos/#you-take-care-of-the-video-players)
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

        if (!this.remote && this.stream.displayMyRemote()) {
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

        this.stream.session.streamManagers.forEach((streamManager) => {
            streamManager.disassociateVideo(video);
        });

        this.pushNewStreamManagerVideo({
            video,
            id: video.id,
            canplayListenerAdded: false
        });

        logger.info('New video element associated to ', this);

        return returnNumber;
    }

    /**
     * Creates a new video element displaying this {@link stream}. This allows you to have multiple video elements displaying the same media stream.
     *
     * #### Events dispatched
     *
     * The Publisher/Subscriber object will dispatch a `videoElementCreated` event once the HTML video element has been added to DOM. See {@link VideoElementEvent}
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

        const video = this.createVideo();
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
     * Updates the current configuration for the {@link PublisherSpeakingEvent} feature and the [StreamManagerEvent.streamAudioVolumeChange](/en/stable/api/openvidu-browser/classes/StreamManagerEvent.html) feature for this specific
     * StreamManager audio stream, overriding the global options set with {@link OpenVidu.setAdvancedConfiguration}. This way you can customize the audio events options
     * for each specific StreamManager and change them dynamically.
     *
     * @param publisherSpeakingEventsOptions New options to be applied to this StreamManager's audio stream. It is an object which includes the following optional properties:
     * - `interval`: (number) how frequently the analyser polls the audio stream to check if speaking has started/stopped or audio volume has changed. Default **100** (ms)
     * - `threshold`: (number) the volume at which _publisherStartSpeaking_, _publisherStopSpeaking_ events will be fired. Default **-50** (dB)
     */
    updatePublisherSpeakingEventsOptions(publisherSpeakingEventsOptions: { interval?: number; threshold?: number }): void {
        const currentHarkOptions = !!this.stream.harkOptions
            ? this.stream.harkOptions
            : this.stream.session.openvidu.advancedConfiguration.publisherSpeakingEventsOptions || {};
        const newInterval =
            typeof publisherSpeakingEventsOptions.interval === 'number'
                ? publisherSpeakingEventsOptions.interval
                : typeof currentHarkOptions.interval === 'number'
                ? currentHarkOptions.interval
                : 100;
        const newThreshold =
            typeof publisherSpeakingEventsOptions.threshold === 'number'
                ? publisherSpeakingEventsOptions.threshold
                : typeof currentHarkOptions.threshold === 'number'
                ? currentHarkOptions.threshold
                : -50;
        this.stream.harkOptions = {
            interval: newInterval,
            threshold: newThreshold
        };
        if (!!this.stream.speechEvent) {
            this.stream.speechEvent.setInterval(newInterval);
            this.stream.speechEvent.setThreshold(newThreshold);
        }
    }

    /* Hidden methods */

    /**
     * @hidden
     */
    initializeVideoProperties(video: HTMLVideoElement): void {
        if (!(!this.remote && this.stream.displayMyRemote())) {
            // Avoid setting the MediaStream into the srcObject if remote subscription before publishing
            if (video.srcObject !== this.stream.getMediaStream()) {
                // If srcObject already set don't do it again
                video.srcObject = this.stream.getMediaStream();
            }
        }
        video.autoplay = true;
        video.controls = false;

        if (
            platform.isSafariBrowser() ||
            (platform.isIPhoneOrIPad() &&
                (platform.isChromeMobileBrowser() ||
                    platform.isEdgeMobileBrowser() ||
                    platform.isOperaMobileBrowser() ||
                    platform.isFirefoxMobileBrowser()))
        ) {
            video.playsInline = true;
        }

        if (!video.id) {
            video.id = (this.remote ? 'remote-' : 'local-') + 'video-' + this.stream.streamId;
            // DEPRECATED property: assign once the property id if the user provided a valid targetElement
            if (!this.id && !!this.targetElement) {
                this.id = video.id;
            }
        }

        if (this.remote && this.isMirroredVideo(video)) {
            // Subscriber video associated to a previously mirrored video element
            this.removeMirrorVideo(video);
        } else if (!this.remote && !this.stream.displayMyRemote()) {
            // Publisher video
            video.muted = true;
            if (this.isMirroredVideo(video) && !this.stream.outboundStreamOpts.publisherProperties.mirror) {
                // If the video was already rotated and now is set to not mirror
                this.removeMirrorVideo(video);
            } else if (this.stream.outboundStreamOpts.publisherProperties.mirror && !this.stream.isSendScreen()) {
                // If the video is now set to mirror and is not screen share
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

        this.videos.forEach((streamManagerVideo) => {
            // Remove oncanplay event listener (only OpenVidu browser listener, not the user ones)
            if (!!streamManagerVideo.video && !!streamManagerVideo.video.removeEventListener) {
                streamManagerVideo.video.removeEventListener('canplay', this.canPlayListener);
            }
            streamManagerVideo.canplayListenerAdded = false;
            if (!!streamManagerVideo.targetElement) {
                // Only remove from DOM videos created by OpenVidu Browser (those generated by passing a valid targetElement in OpenVidu.initPublisher
                // and Session.subscribe or those created by StreamManager.createVideoElement). All this videos triggered a videoElementCreated event
                streamManagerVideo.video.parentNode!.removeChild(streamManagerVideo.video);
                this.ee.emitEvent('videoElementDestroyed', [
                    new VideoElementEvent(streamManagerVideo.video, this, 'videoElementDestroyed')
                ]);
            }
            // Remove srcObject from the video
            this.removeSrcObject(streamManagerVideo);
            // Remove from collection of videos every video managed by OpenVidu Browser
            this.videos.filter((v) => !v.targetElement);
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
                logger.info('Video element disassociated from ', this);
                break;
            }
        }
        return disassociated;
    }

    /**
     * @hidden
     */
    addPlayEventToFirstVideo() {
        if (!!this.videos[0] && !!this.videos[0].video && !this.videos[0].canplayListenerAdded) {
            this.activateStreamPlayingEventExceptionTimeout();
            this.videos[0].video.addEventListener('canplay', this.canPlayListener);
            this.videos[0].canplayListenerAdded = true;
        }
    }

    /**
     * @hidden
     */
    updateMediaStream(mediaStream: MediaStream) {
        this.videos.forEach((streamManagerVideo) => {
            streamManagerVideo.video.srcObject = mediaStream;
            if (platform.isIonicIos()) {
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

    /**
     * @hidden
     */
    createVideo(): HTMLVideoElement {
        return document.createElement('video');
    }

    /**
     * @hidden
     */
    removeSrcObject(streamManagerVideo: StreamManagerVideo) {
        streamManagerVideo.video.srcObject = null;
        this.deactivateStreamPlayingEventExceptionTimeout();
    }

    /**
     * @hidden
     */
    abstract replaceTrackInMediaStream(track: MediaStreamTrack, updateLastConstraints: boolean): void;

    /* Private methods */

    protected pushNewStreamManagerVideo(streamManagerVideo: StreamManagerVideo) {
        this.videos.push(streamManagerVideo);
        this.addPlayEventToFirstVideo();
        if (this.stream.session.streamManagers.indexOf(this) === -1) {
            this.stream.session.streamManagers.push(this);
        }
    }

    private mirrorVideo(video: HTMLVideoElement): void {
        if (!platform.isIonicIos()) {
            video.style.transform = 'rotateY(180deg)';
            video.style.webkitTransform = 'rotateY(180deg)';
        }
    }

    private removeMirrorVideo(video: HTMLVideoElement): void {
        video.style.transform = 'unset';
        video.style.webkitTransform = 'unset';
    }

    private isMirroredVideo(video: HTMLVideoElement): boolean {
        return video.style.transform === 'rotateY(180deg)' || video.style.webkitTransform === 'rotateY(180deg)';
    }

    private activateStreamPlayingEventExceptionTimeout() {
        if (!this.remote) {
            // ExceptionEvent NO_STREAM_PLAYING_EVENT is only for subscribers
            return;
        }
        if (this.streamPlayingEventExceptionTimeout != null) {
            // The timeout is already activated
            return;
        }
        // Trigger ExceptionEvent NO_STREAM_PLAYING_EVENT if after timeout there is no 'canplay' event
        const msTimeout = this.stream.session.openvidu.advancedConfiguration.noStreamPlayingEventExceptionTimeout || 4000;
        this.streamPlayingEventExceptionTimeout = setTimeout(() => {
            const msg =
                'StreamManager of Stream ' +
                this.stream.streamId +
                ' (' +
                (this.remote ? 'Subscriber' : 'Publisher') +
                ') did not trigger "streamPlaying" event in ' +
                msTimeout +
                ' ms';
            logger.warn(msg);
            this.stream.session.emitEvent('exception', [
                new ExceptionEvent(this.stream.session, ExceptionEventName.NO_STREAM_PLAYING_EVENT, (<any>this) as Subscriber, msg)
            ]);
            delete this.streamPlayingEventExceptionTimeout;
        }, msTimeout);
    }

    private deactivateStreamPlayingEventExceptionTimeout() {
        clearTimeout(this.streamPlayingEventExceptionTimeout as any);
        delete this.streamPlayingEventExceptionTimeout;
    }
}
