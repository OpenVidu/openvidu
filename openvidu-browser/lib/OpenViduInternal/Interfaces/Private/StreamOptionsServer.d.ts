import { Filter } from '../../../OpenVidu/Filter';
export interface StreamOptionsServer {
    id: string;
    hasAudio: boolean;
    hasVideo: boolean;
    audioActive: boolean;
    videoActive: boolean;
    typeOfVideo: string;
    frameRate: number;
    videoDimensions: string;
    filter: Filter;
}
