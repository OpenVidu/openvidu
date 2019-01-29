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

import { MediaMode } from './MediaMode';
import { Recording } from './Recording';
import { RecordingLayout } from './RecordingLayout';
import { RecordingMode } from './RecordingMode';

/**
 * See [[OpenVidu.createSession]]
 */
export interface SessionProperties {

    /**
     * How the media streams will be sent and received by your clients: routed through OpenVidu Media Server
     * (`MediaMode.ROUTED`) or attempting direct p2p connections (`MediaMode.RELAYED`, _not available yet_)
     */
    mediaMode?: MediaMode;

    /**
     * Whether the Session will be automatically recorded (`RecordingMode.ALWAYS`) or not (`RecordingMode.MANUAL`)
     */
    recordingMode?: RecordingMode;

    /**
     * Default value used to initialize property [[RecordingProperties.outputMode]] of every recording of this session.
     *
     * You can easily override this value later by setting [[RecordingProperties.outputMode]] to any other value
     */
    defaultOutputMode?: Recording.OutputMode;

    /**
     * Default value used to initialize property [[RecordingProperties.recordingLayout]] of every recording of this session.
     *
     * You can easily override this value later by setting [[RecordingProperties.recordingLayout]] to any other value
     */
    defaultRecordingLayout?: RecordingLayout;

    /**
     * Default value used to initialize property [[RecordingProperties.customLayout]] of every recording of this session.
     * This property can only be defined if [[SessionProperties.defaultRecordingLayout]] is set to [[RecordingLayout.CUSTOM]].
     *
     * You can easily override this value later by setting [[RecordingProperties.customLayout]] to any other value
     */
    defaultCustomLayout?: string;

    /**
     * Fix the sessionId that will be assigned to the session with this parameter. You can take advantage of this property
     * to facilitate the mapping between OpenVidu Server 'session' entities and your own 'session' entities.
     * If this parameter is undefined or an empty string, OpenVidu Server will generate a random sessionId for you.
     */
    customSessionId?: string;
}
