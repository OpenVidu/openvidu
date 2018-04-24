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
     * Gets the unique identifier of the Session. This translates into a new request to OpenVidu Server if this Session has no `sessionId` yet
     * or simply returns the existing value if it has already been retrieved
     *
     * @returns A Promise that is resolved to the _sessionId_ if success and rejected with an Error object if not (due to a `400 (Bad Request)` error in OpenVidu Server)
     */
    getSessionId(): Promise<string>;
    /**
     * Gets a new token associated to Session object. This translates into a new request to OpenVidu Server
     *
     * @returns A Promise that is resolved to the _token_ if success and rejected with an Error object if not (due to a `400 (Bad Request)` error in OpenVidu Server)
     */
    generateToken(tokenOptions?: TokenOptions): Promise<string>;
}
