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
import { StreamManager } from './StreamManager';
import { SubscriberProperties } from '../OpenViduInternal/Interfaces/Public/SubscriberProperties';
import { OpenViduLogger } from '../OpenViduInternal/Logger/OpenViduLogger';

/**
 * @hidden
 */
const logger: OpenViduLogger = OpenViduLogger.getInstance();

/**
 * Packs remote media streams. Participants automatically receive them when others publish their streams. Initialized with [[Session.subscribe]] method
 * 
 * See available event listeners at [[StreamManagerEventMap]].
 */
export class Subscriber extends StreamManager {

    /**
     * @hidden
     */
    properties: SubscriberProperties;

    /**
     * @hidden
     */
    constructor(stream: Stream, targEl: string | HTMLElement, properties: SubscriberProperties) {
        super(stream, targEl);
        this.element = this.targetElement;
        this.stream = stream;
        this.properties = properties;
    }

    /**
     * Subscribe or unsubscribe from the audio stream (if available). Calling this method twice in a row passing same value will have no effect
     * @param value `true` to subscribe to the audio stream, `false` to unsubscribe from it
     */
    subscribeToAudio(value: boolean): Subscriber {
        this.stream.getMediaStream().getAudioTracks().forEach((track) => {
            track.enabled = value;
        });
        this.stream.audioActive = value;
        logger.info("'Subscriber' has " + (value ? 'subscribed to' : 'unsubscribed from') + ' its audio stream');
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
        this.stream.videoActive = value;
        logger.info("'Subscriber' has " + (value ? 'subscribed to' : 'unsubscribed from') + ' its video stream');
        return this;
    }

    /* Hidden methods */

    /**
     * @hidden
     */
    async replaceTrackInMediaStream(track: MediaStreamTrack, updateLastConstraints: boolean): Promise<void> {
        const mediaStream: MediaStream = this.stream.getMediaStream();
        let removedTrack: MediaStreamTrack;
        if (track.kind === 'video') {
            removedTrack = mediaStream.getVideoTracks()[0];
            if (updateLastConstraints) {
                this.stream.lastVideoTrackConstraints = track.getConstraints();
            }
        } else {
            removedTrack = mediaStream.getAudioTracks()[0];
        }
        mediaStream.removeTrack(removedTrack);
        removedTrack.stop();
        mediaStream.addTrack(track);
    }

}