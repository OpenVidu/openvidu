import { Connection } from '../../../OpenVidu/Connection';
export interface InboundStreamOptions {
    id: string;
    connection: Connection;
    frameRate: number;
    recvAudio: boolean;
    recvVideo: boolean;
    typeOfVideo: string;
}
