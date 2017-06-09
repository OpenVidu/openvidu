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
    getSessionId(callback: Function): string;
    generateToken(tokenOptions: TokenOptions, callback: Function): void;
    private getBasicAuth();
    private setHostnameAndPort();
}
