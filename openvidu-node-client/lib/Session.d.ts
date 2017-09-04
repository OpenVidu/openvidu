import { TokenOptions } from './TokenOptions';
export declare class Session {
    private urlOpenViduServer;
    private secret;
    private sessionIdURL;
    private tokenURL;
    private sessionId;
    private hostname;
    private port;
    constructor(urlOpenViduServer: string, secret: string);
    getSessionId(callback: Function): void;
    generateToken(callback: Function): any;
    generateToken(tokenOptions: TokenOptions, callback: Function): any;
    private getBasicAuth();
    private setHostnameAndPort();
}
