import { SessionProperties } from './SessionProperties';
import { TokenOptions } from './TokenOptions';
export declare class Session {
    private hostname;
    private port;
    private basicAuth;
    private static readonly API_SESSIONS;
    private static readonly API_TOKENS;
    private sessionId;
    private properties;
    constructor(hostname: string, port: number, basicAuth: string, properties?: SessionProperties);
    getSessionId(): Promise<string>;
    generateToken(tokenOptions?: TokenOptions): Promise<string>;
    getProperties(): SessionProperties;
}
