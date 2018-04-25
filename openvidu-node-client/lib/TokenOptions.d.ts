import { OpenViduRole } from './OpenViduRole';
export interface TokenOptions {
    /**
     * Secure (server-side) data associated to this token. Every client will receive this data in property `Connection.data`. Object `Connection` can be retrieved by subscribing to event `connectionCreated` of Session object.
     * - If you have provided no data in your clients when calling method `Session.connect(TOKEN, DATA)` (`DATA` not defined), then `Connection.data` will only have this [[TokenOptions.data]] property.
     * - If you have provided some data when calling `Session.connect(TOKEN, DATA)` (`DATA` defined), then `Connection.data` will have the following structure: `"CLIENT_DATA%/%SERVER_DATA"`, being `CLIENT_DATA` the second
     * parameter passed in OpenVidu Browser in method `Session.connect` and `SERVER_DATA` this [[TokenOptions.data]] property.
     */
    data: string;
    /**
     * The role assigned to this token
     */
    role: OpenViduRole;
}
