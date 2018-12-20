import { Session } from './Session';
import { Stream } from './Stream';
import { ConnectionOptions } from '../OpenViduInternal/Interfaces/Private/ConnectionOptions';
import { StreamOptionsServer } from '../OpenViduInternal/Interfaces/Private/StreamOptionsServer';
/**
 * Represents each one of the user's connection to the session (the local one and other user's connections).
 * Therefore each [[Session]] and [[Stream]] object has an attribute of type Connection
 */
export declare class Connection {
    private session;
    /**
     * Unique identifier of the connection
     */
    connectionId: string;
    /**
     * RPC session ID.
     */
    rpcSessionId: string;
    /**
     * Time when this connection was created (UTC milliseconds)
     */
    creationTime: number;
    /**
     * Data associated to this connection (and therefore to certain user). This is an important field:
     * it allows you to broadcast all the information you want for each user (a username, for example)
     */
    data: string;
    /**
     * @hidden
     */
    stream: Stream;
    /**
     * @hidden
     */
    options: ConnectionOptions | undefined;
    /**
     * @hidden
     */
    disposed: boolean;
    /**
     * @hidden
     */
    constructor(session: Session, opts?: ConnectionOptions);
    /**
     * @hidden
     */
    sendIceCandidate(candidate: RTCIceCandidate): void;
    /**
     * @hidden
     */
    initRemoteStreams(options: StreamOptionsServer[]): void;
    /**
     * @hidden
     */
    addStream(stream: Stream): void;
    /**
     * @hidden
     */
    removeStream(streamId: string): void;
    /**
     * @hidden
     */
    dispose(): void;
}
