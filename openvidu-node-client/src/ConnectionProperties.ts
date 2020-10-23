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

import { ConnectionType } from './ConnectionType';
import { OpenViduRole } from './OpenViduRole';

export interface ConnectionProperties {

    /**
     * Type of Connection. The [[ConnectionType]] dictates what properties will have effect:
     * 
     * - **[[ConnectionType.WEBRTC]]**: [[data]], [[record]], [[role]], [[kurentoOptions]]
     * - **[[ConnectionType.IPCAM]]**: [[data]], [[record]], [[rtspUri]], [[adaptativeBitrate]], [[onlyPlayWithSubscribers]], [[networkCache]]
     * 
     * @default WEBRTC
     */
    type?: ConnectionType;

    /**
     * Secure (server-side) data associated to this Connection. Every client will receive this data in property `Connection.data`. Object `Connection` can be retrieved by subscribing to event `connectionCreated` of Session object.
     * - If you have provided no data in your clients when calling method `Session.connect(TOKEN, DATA)` (`DATA` not defined), then `Connection.data` will only have this [[ConnectionProperties.data]] property.
     * - If you have provided some data when calling `Session.connect(TOKEN, DATA)` (`DATA` defined), then `Connection.data` will have the following structure: `"CLIENT_DATA%/%SERVER_DATA"`, being `CLIENT_DATA` the second
     * parameter passed in OpenVidu Browser in method `Session.connect` and `SERVER_DATA` this [[ConnectionProperties.data]] property.
     */
    data?: string;

    /**
     * **This feature is part of OpenVidu Pro tier** <a href="https://docs.openvidu.io/en/stable/openvidu-pro/" target="_blank" style="display: inline-block; background-color: rgb(0, 136, 170); color: white; font-weight: bold; padding: 0px 5px; margin-right: 5px; border-radius: 3px; font-size: 13px; line-height:21px; font-family: Montserrat, sans-serif">PRO</a> 
     * 
     * Whether to record the streams published by this Connection or not. This only affects [INDIVIDUAL recording](/en/stable/advanced-features/recording#selecting-streams-to-be-recorded)
     * 
     * @default true
     */
    record?: boolean;

    /**
     * The role assigned to this Connection
     * 
     * **Only for [[ConnectionType.WEBRTC]]**
     * 
     * @default PUBLISHER
     */
    role?: OpenViduRole;

    /**
     * **WARNING**: experimental option. This interface may change in the near future
     *
     * Some advanced properties setting the configuration that the WebRTC streams of the Connection will have in Kurento Media Server.
     * You can adjust:
     * - `videoMaxRecvBandwidth`: maximum number of Kbps that the Connection will be able to receive from Kurento Media Server. 0 means unconstrained. Giving a value to this property will override
     * the global configuration set in [OpenVidu Server configuration](/en/stable/reference-docs/openvidu-config/)
     * (parameter `OPENVIDU_STREAMS_VIDEO_MAX_RECV_BANDWIDTH`) for every incoming stream of the Connection.
     * _**WARNING**: the lower value set to this property limits every other bandwidth of the WebRTC pipeline this server-to-client stream belongs to. This includes the user publishing the stream and every other user subscribed to the stream_
     * - `videoMinRecvBandwidth`: minimum number of Kbps that the cConnection will try to receive from Kurento Media Server. 0 means unconstrained. Giving a value to this property will override
     * the global configuration set in [OpenVidu Server configuration](/en/stable/reference-docs/openvidu-config/)
     * (parameter `OPENVIDU_STREAMS_VIDEO_MIN_RECV_BANDWIDTH`) for every incoming stream of the Connection.
     * - `videoMaxSendBandwidth`: maximum number of Kbps that the Connection will be able to send to Kurento Media Server. 0 means unconstrained. Giving a value to this property will override
     * the global configuration set in [OpenVidu Server configuration](/en/stable/reference-docs/openvidu-config/)
     * (parameter `OPENVIDU_STREAMS_VIDEO_MAX_SEND_BANDWIDTH`) for every outgoing stream of the Connection.
     * _**WARNING**: this value limits every other bandwidth of the WebRTC pipeline this client-to-server stream belongs to. This includes every other user subscribed to the stream_
     * - `videoMinSendBandwidth`: minimum number of Kbps that the Connection will try to send to Kurento Media Server. 0 means unconstrained. Giving a value to this property will override
     * the global configuration set in [OpenVidu Server configuration](/en/stable/reference-docs/openvidu-config/)
     * (parameter `OPENVIDU_STREAMS_VIDEO_MIN_SEND_BANDWIDTH`) for every outgoing stream of the Connection.
     * - `allowedFilters`: names of the filters the Connection will be able to apply. See [Voice and video filters](/en/stable/advanced-features/filters/)
     * 
     * **Only for [[ConnectionType.WEBRTC]]**
     */
    kurentoOptions?: {
        videoMaxRecvBandwidth?: number,
        videoMinRecvBandwidth?: number,
        videoMaxSendBandwidth?: number,
        videoMinSendBandwidth?: number,
        allowedFilters?: string[]
    };

    /**
     * RTSP URI of an IP camera. For example: `rtsp://your.camera.ip:7777/path`
     * 
     * **Only for [[ConnectionType.IPCAM]]** 
     */
    rtspUri?: string;

    /**
     * Whether to use adaptative bitrate (and therefore adaptative quality) or not. For local network connections
     * that do not require media transcoding this can be disabled to save CPU power. If you are not sure if transcoding
     * might be necessary, setting this property to false **may result in media connections not being established**.
     * 
     * **Only for [[ConnectionType.IPCAM]]**
     * 
     * @default true
     */
    adaptativeBitrate?: boolean;

    /**
     * Whether to enable the IP camera stream only when some user is subscribed to it, or not. This allows you to reduce
     * power consumption and network bandwidth in your server while nobody is asking to receive the camera's video.
     * On the counterpart, first user subscribing to the IP camera stream will take a little longer to receive its video.
     * 
     * **Only for [[ConnectionType.IPCAM]]**
     * 
     * @default true
     */
    onlyPlayWithSubscribers?: boolean;

    /**
     * Size of the buffer of the endpoint receiving the IP camera's stream, in milliseconds. The smaller it is, the less
     * delay the signal will have, but more problematic will be in unstable networks. Use short buffers only if there is
     * a quality connection between the IP camera and OpenVidu Server.
     * 
     * **Only for [[ConnectionType.IPCAM]]**
     * 
     * @default 2000
     */
    networkCache?: number;

}