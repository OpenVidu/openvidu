import { Connection } from '../../../OpenVidu/Connection';
import { Filter } from '../../../OpenVidu/Filter';
export interface InboundStreamOptions {
    id: string;
    connection: Connection;
    hasAudio: boolean;
    hasVideo: boolean;
    audioActive: boolean;
    videoActive: boolean;
    typeOfVideo: string;
    frameRate: number;
    videoDimensions: {
        width: number;
        height: number;
    };
    filter?: Filter;
}
