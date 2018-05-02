import { SessionProperties } from './SessionProperties';
import { TokenOptions } from './TokenOptions';
export declare class Session {
    private hostname;
    private port;
    private basicAuth;
    private static readonly API_SESSIONS;
    private static readonly API_TOKENS;
    sessionId: string;
    properties: SessionProperties;
    constructor(hostname: string, port: number, basicAuth: string, properties?: SessionProperties);
    /**
     * Gets the unique identifier of the Session
     */
    getSessionId(): string;
    /**
     * Gets a new token associated to Session object
     *
     * @returns A Promise that is resolved to the _token_ if success and rejected with an Error object if not
     */
    generateToken(tokenOptions?: TokenOptions): Promise<string>;
    /**
     * @hidden
     */
    getSessionIdHttp(): Promise<string>;
}
