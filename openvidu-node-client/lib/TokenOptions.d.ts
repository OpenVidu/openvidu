import { OpenViduRole } from './OpenViduRole';
/**
 * See [[Session.generateToken]]
 */
export interface TokenOptions {
    /**
     * Secure (server-side) data associated to this token. Every client will receive this data in property `Connection.data`. Object `Connection` can be retrieved by subscribing to event `connectionCreated` of Session object.
     * - If you have provided no data in your clients when calling method `Session.connect(TOKEN, DATA)` (`DATA` not defined), then `Connection.data` will only have this [[TokenOptions.data]] property.
     * - If you have provided some data when calling `Session.connect(TOKEN, DATA)` (`DATA` defined), then `Connection.data` will have the following structure: `"CLIENT_DATA%/%SERVER_DATA"`, being `CLIENT_DATA` the second
     * parameter passed in OpenVidu Browser in method `Session.connect` and `SERVER_DATA` this [[TokenOptions.data]] property.
     */
    data?: string;
    /**
     * The role assigned to this token
     */
    role?: OpenViduRole;
    /**
     * **WARNING**: experimental option. This interface may change in the near future
     *
     * Some advanced properties setting the configuration that the WebRTC streams of the user owning the token will have in Kurento Media Server.
     * You can adjust:
     * - `videoMaxRecvBandwidth`: maximum number of Kbps that the client owning the token will be able to receive from Kurento Media Server. 0 means unconstrained. Giving a value to this property will override
     * the global configuration set in [OpenVidu Server configuration](https://openvidu.io/docs/reference-docs/openvidu-server-params/#list-of-configuration-parameters-when-launching-openvidu-server)
     * (parameter `openvidu.streams.video.max-recv-bandwidth`) for every incoming stream of the user owning the token.
     * _**WARNING**: the lower value set to this property limits every other bandwidth of the WebRTC pipeline this server-to-client stream belongs to. This includes the user publishing the stream and every other user subscribed to the stream_
     * - `videoMinRecvBandwidth`: minimum number of Kbps that the client owning the token will try to receive from Kurento Media Server. 0 means unconstrained. Giving a value to this property will override
     * the global configuration set in [OpenVidu Server configuration](https://openvidu.io/docs/reference-docs/openvidu-server-params/#list-of-configuration-parameters-when-launching-openvidu-server)
     * (parameter `openvidu.streams.video.min-recv-bandwidth`) for every incoming stream of the user owning the token
     * - `videoMaxSendBandwidth`: maximum number of Kbps that the client owning the token will be able to send to Kurento Media Server. 0 means unconstrained. Giving a value to this property will override
     * the global configuration set in [OpenVidu Server configuration](https://openvidu.io/docs/reference-docs/openvidu-server-params/#list-of-configuration-parameters-when-launching-openvidu-server)
     * (parameter `openvidu.streams.video.max-send-bandwidth`) for every outgoing stream of the user owning the token.
     * _**WARNING**: this value limits every other bandwidth of the WebRTC pipeline this client-to-server stream belongs to. This includes every other user subscribed to the stream_
     * - `videoMinSendBandwidth`: minimum number of Kbps that the client owning the token will try to send to Kurento Media Server. 0 means unconstrained. Giving a value to this property will override
     * the global configuration set in [OpenVidu Server configuration](https://openvidu.io/docs/reference-docs/openvidu-server-params/#list-of-configuration-parameters-when-launching-openvidu-server)
     * (parameter `openvidu.streams.video.min-send-bandwidth`) for every outgoing stream of the user owning the token
     * - `allowedFilters`: names of the filters the user owning the token will be able to apply. See [Voice and video filters](https://openvidu.io/docs/advanced-features/filters/)
     */
    kurentoOptions?: {
        videoMaxRecvBandwidth?: number;
        videoMinRecvBandwidth?: number;
        videoMaxSendBandwidth?: number;
        videoMinSendBandwidth?: number;
        allowedFilters?: string[];
    };
}
