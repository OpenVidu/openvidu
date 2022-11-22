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

import { Session } from '../../OpenVidu/Session';
import { Stream } from '../../OpenVidu/Stream';
import { Subscriber } from '../../OpenVidu/Subscriber';
import { Event } from './Event';

/**
 * Defines property {@link ExceptionEvent.name}
 */
export enum ExceptionEventName {
    /**
     * There was an unexpected error on the server-side processing an ICE candidate generated and sent by the client-side.
     *
     * {@link ExceptionEvent} objects with this {@link ExceptionEvent.name} will have as {@link ExceptionEvent.origin} property a {@link Session} object.
     */
    ICE_CANDIDATE_ERROR = 'ICE_CANDIDATE_ERROR',

    /**
     * The [ICE connection state](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceConnectionState)
     * of an [RTCPeerConnection](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection) reached `failed` status.
     *
     * This is a terminal error that won't have any kind of possible recovery. If the client is still connected to OpenVidu Server,
     * then an automatic reconnection process of the media stream is immediately performed. If the ICE connection has broken due to
     * a total network drop, then no automatic reconnection process will be possible.
     *
     * {@link ExceptionEvent} objects with this {@link ExceptionEvent.name} will have as {@link ExceptionEvent.origin} property a {@link Stream} object.
     */
    ICE_CONNECTION_FAILED = 'ICE_CONNECTION_FAILED',

    /**
     * The [ICE connection state](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceConnectionState)
     * of an [RTCPeerConnection](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection) reached `disconnected` status.
     *
     * This is not a terminal error, and it is possible for the ICE connection to be reconnected. If the client is still connected to
     * OpenVidu Server and after certain timeout the ICE connection has not reached a success or terminal status, then an automatic
     * reconnection process of the media stream is performed. If the ICE connection has broken due to a total network drop, then no
     * automatic reconnection process will be possible.
     *
     * You can customize the timeout for the reconnection attempt with property {@link OpenViduAdvancedConfiguration.iceConnectionDisconnectedExceptionTimeout},
     * which by default is 4000 milliseconds.
     *
     * {@link ExceptionEvent} objects with this {@link ExceptionEvent.name} will have as {@link ExceptionEvent.origin} property a {@link Stream} object.
     */
    ICE_CONNECTION_DISCONNECTED = 'ICE_CONNECTION_DISCONNECTED',

    /**
     * A {@link Subscriber} object has not fired event `streamPlaying` after certain timeout. `streamPlaying` event belongs to {@link StreamManagerEvent}
     * category. It wraps Web API native event [canplay](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/canplay_event).
     *
     * OpenVidu Browser can take care of the video players (see [here](/en/stable/cheatsheet/manage-videos/#let-openvidu-take-care-of-the-video-players)),
     * or you can take care of video players on your own (see [here](/en/stable/cheatsheet/manage-videos/#you-take-care-of-the-video-players)).
     * Either way, whenever a {@link Subscriber} object is commanded to attach its {@link Stream} to a video element, it is supposed to fire `streamPlaying`
     * event shortly after. If it does not, then we can safely assume that something wrong has happened while playing the remote video and the
     * application may be notified through this specific ExceptionEvent.
     *
     * The timeout can be configured with property {@link OpenViduAdvancedConfiguration.noStreamPlayingEventExceptionTimeout}. By default it is 4000 milliseconds.
     *
     * This is just an informative exception. It only means that a remote Stream that is supposed to be playing by a video player has not done so
     * in a reasonable time. But the lack of the event can be caused by multiple reasons. If a Subscriber is not playing its Stream, the origin
     * of the problem could be located at the Publisher side. Or may be caused by a transient network problem. But it also could be a problem with
     * autoplay permissions. Bottom line, the cause can be very varied, and depending on the application the lack of the event could even be expected.
     *
     * {@link ExceptionEvent} objects with this {@link ExceptionEvent.name} will have as {@link ExceptionEvent.origin} property a {@link Subscriber} object.
     */
    NO_STREAM_PLAYING_EVENT = 'NO_STREAM_PLAYING_EVENT',

    /**
     * There has been a server-side disconnection of the Speech To Text module. From the moment this exception is fired to the moment method
     * {@link Session.subscribeToSpeechToText} is called again, the transcription of the audio stream will not be available and no {@link SpeechToTextEvent}
     * will be fired.
     *
     * {@link ExceptionEvent} objects with this {@link ExceptionEvent.name} will have as {@link ExceptionEvent.origin} property a {@link Session} object.
     */
    SPEECH_TO_TEXT_DISCONNECTED = 'SPEECH_TO_TEXT_DISCONNECTED',
}

/**
 * Triggered by {@link SessionEventMap.exception}
 */
export class ExceptionEvent extends Event {
    /**
     * Name of the exception
     */
    name: ExceptionEventName;

    /**
     * Object affected by the exception. Depending on the {@link ExceptionEvent.name} property:
     * - {@link Session}: `ICE_CANDIDATE_ERROR`
     * - {@link Stream}: `ICE_CONNECTION_FAILED`, `ICE_CONNECTION_DISCONNECTED`
     * - {@link Subscriber}: `NO_STREAM_PLAYING_EVENT`
     */
    origin: Session | Stream | Subscriber;

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
    constructor(session: Session, name: ExceptionEventName, origin: Session | Stream | Subscriber, message: string, data?: any) {
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
