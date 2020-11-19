/*
 * (C) Copyright 2017-2020 OpenVidu (https://openvidu.io)
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
     * How the media streams will be sent and received by your clients: routed through OpenVidu Media Node
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

    /**
     * **This feature is part of OpenVidu Pro tier** <a href="https://docs.openvidu.io/en/stable/openvidu-pro/" target="_blank" style="display: inline-block; background-color: rgb(0, 136, 170); color: white; font-weight: bold; padding: 0px 5px; margin-right: 5px; border-radius: 3px; font-size: 13px; line-height:21px; font-family: Montserrat, sans-serif">PRO</a> 
     * 
     * The Media Node where to host the session. The default option if this property is not defined is the less loaded
     * Media Node at the moment the first user joins the session. This object defines the following properties as Media Node selector:
     * - `id`: Media Node unique identifier
     */
    mediaNode?: {
        id: string;
    }

    /**
     * It defines which video codec do you want to be forcibly used for this session.
     * This allows browsers/clients to use the same codec avoiding transcoding in the media server.
     * If the browser/client is not compatible with the specified codec and [[allowTranscoding]]
     * is <code>false</code> and exception will occur.
     *
     * If forcedVideoCodec is set to NONE, no codec will be forced.
     */
    forcedVideoCodec?: string;

    /**
     * It defines if you want to allow transcoding in the media server or not
     * when [[forcedVideoCodec]] is not compatible with the browser/client.
     */
    allowTranscoding?: boolean;

}
