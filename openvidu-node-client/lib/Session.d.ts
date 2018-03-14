import { TokenOptions } from './TokenOptions';
import { SessionProperties } from './SessionProperties';
export declare class Session {
    private hostname;
    private port;
    private basicAuth;
    private static readonly API_SESSIONS;
    private static readonly API_TOKENS;
    private sessionId;
    private properties;
    constructor(hostname: string, port: number, basicAuth: string, properties?: SessionProperties);
    getSessionId(callback: Function): void;
    generateToken(callback: Function): any;
    generateToken(tokenOptions: TokenOptions, callback: Function): any;
    getProperties(): SessionProperties;
}
