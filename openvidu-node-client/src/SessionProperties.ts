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

import { MediaMode } from './MediaMode';
import { RecordingProperties } from './RecordingProperties';
import { RecordingMode } from './RecordingMode';
import { VideoCodec } from './VideoCodec';

/**
 * See {@link OpenVidu.createSession}
 */
export interface SessionProperties {
    /**
     * How the media streams will be sent and received by your clients: routed through OpenVidu Media Node
     * (`MediaMode.ROUTED`) or attempting direct p2p connections (`MediaMode.RELAYED`, _not available yet_)
     *
     * Default to {@link MediaMode.ROUTED}
     */
    mediaMode?: MediaMode;

    /**
     * Whether the Session will be automatically recorded (`RecordingMode.ALWAYS`) or not (`RecordingMode.MANUAL`)
     *
     * Default to {@link RecordingMode.MANUAL}
     */
    recordingMode?: RecordingMode;

    /**
     * Default recording properties of this session. You can easily override this value later when starting a
     * {@link Recording} by providing new {@link RecordingProperties}
     *
     * Default values defined in {@link RecordingProperties} class
     */
    defaultRecordingProperties?: RecordingProperties;

    /**
     * Fix the sessionId that will be assigned to the session with this parameter. You can take advantage of this property
     * to facilitate the mapping between OpenVidu Server 'session' entities and your own 'session' entities.
     * If this parameter is undefined or an empty string, OpenVidu Server will generate a random sessionId for you.
     */
    customSessionId?: string;

    /**
     * **This feature is part of OpenVidu
     * <a href="https://docs.openvidu.io/en/2.23.0/openvidu-pro/" style="display: inline-block; background-color: rgb(0, 136, 170); color: white; font-weight: bold; padding: 0px 5px; margin: 0 2px 0 2px; border-radius: 3px; font-size: 13px; line-height:21px; text-decoration: none; font-family: Montserrat, sans-serif">PRO</a>
     * and
     * <a href="https://docs.openvidu.io/en/2.23.0/openvidu-enterprise/" style="display: inline-block; background-color: rgb(156, 39, 176); color: white; font-weight: bold; padding: 0px 5px; margin: 0 2px 0 2px; border-radius: 3px; font-size: 13px; line-height:21px; text-decoration: none; font-family: Montserrat, sans-serif">ENTERPRISE</a>
     * editions**
     *
     * The Media Node where to host the session. The default option if this property is not defined is the less loaded
     * Media Node at the moment the first user joins the session. This object defines the following properties as Media Node selector:
     * - `id`: Media Node unique identifier
     */
    mediaNode?: {
        id: string;
    };

    /**
     * Define which video codec will be forcibly used for this session.
     * This forces all browsers/clients to use the same codec, which would
     * avoid transcoding in the media server (Kurento only). If
     * <code>forcedVideoCodec</code> is set to NONE, no codec will be forced.
     *
     * If the browser/client is not compatible with the specified codec, and
     * {@link allowTranscoding} is <code>false</code>, an exception will occur.
     *
     * If defined here, this parameter has prevalence over
     * OPENVIDU_STREAMS_FORCED_VIDEO_CODEC.
     *
     * Default is {@link VideoCodec.MEDIA_SERVER_PREFERRED}.
     */
    forcedVideoCodec?: VideoCodec;

    /**
     * It defines if you want to allow transcoding in the media server or not
     * when {@link forcedVideoCodec} is not compatible with the browser/client.
     *
     * If defined here, this parameter has prevalence over OPENVIDU_STREAMS_ALLOW_TRANSCODING.
     * OPENVIDU_STREAMS_ALLOW_TRANSCODING default is 'false'
     */
    allowTranscoding?: boolean;
}
