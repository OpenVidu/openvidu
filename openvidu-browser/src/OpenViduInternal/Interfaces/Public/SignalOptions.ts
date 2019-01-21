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

import { Connection } from '../../../OpenVidu/Connection';

/**
 * See [[Session.signal]]
 */
export interface SignalOptions {

    /**
     * The actual message of the signal.
     */
    data?: string;

    /**
     * The participants to whom to send the signal. They will only receive it if they are subscribed to
     * event `Session.on('signal')`. If empty or undefined, the signal will be send to all participants.
     */
    to?: Connection[];

    /**
     * The type of the signal. Participants subscribed to event `Session.on('signal:type')` will
     * receive it. Participants subscribed to `Session.on('signal')` will receive all signals.
     */
    type?: string;
}