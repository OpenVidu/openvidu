import { TokenOptions } from './TokenOptions';
import { SessionProperties } from './SessionProperties';
export declare class Session {
    private urlOpenViduServer;
    private secret;
    private sessionIdURL;
    private tokenURL;
    private sessionId;
    private properties;
    private hostname;
    private port;
    constructor(urlOpenViduServer: string, secret: string, properties?: SessionProperties);
    getSessionId(callback: Function): void;
    generateToken(callback: Function): any;
    generateToken(tokenOptions: TokenOptions, callback: Function): any;
    getProperties(): SessionProperties;
    private getBasicAuth();
    private setHostnameAndPort();
}
