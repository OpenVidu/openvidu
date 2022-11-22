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

import { Event } from './Event';
import { StreamManager } from '../../OpenVidu/StreamManager';

/**
 * Triggered by:
 * - {@link StreamManagerEventMap.streamPlaying}
 * - {@link StreamManagerEventMap.streamAudioVolumeChange}
 */
export class StreamManagerEvent extends Event {
    /**
     * For `streamAudioVolumeChange` event:
     * - `{newValue: number, oldValue: number}`: new and old audio volume values. These values are between -100 (silence) and 0 (loudest possible volume).
     * They are not exact and depend on how the browser is managing the audio track, but -100 and 0 can be taken as limit values.
     *
     * For `streamPlaying` event undefined
     */
    value: Object | undefined;

    /**
     * @hidden
     */
    constructor(target: StreamManager, type: string, value: Object | undefined) {
        super(false, target, type);
        this.value = value;
    }

    /**
     * @hidden
     */
    // tslint:disable-next-line:no-empty
    callDefaultBehavior() {}
}
