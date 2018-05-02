import { Connection } from '../../..';
export interface InboundStreamOptions {
    id: string;
    connection: Connection;
    frameRate: number;
    recvAudio: boolean;
    recvVideo: boolean;
    typeOfVideo: string;
}
