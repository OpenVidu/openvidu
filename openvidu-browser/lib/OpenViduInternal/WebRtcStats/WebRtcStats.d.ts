import { Stream } from '../../OpenVidu/Stream';
export declare class WebRtcStats {
    private stream;
    private webRtcStatsEnabled;
    private webRtcStatsIntervalId;
    private statsInterval;
    private stats;
    constructor(stream: Stream);
    isEnabled(): boolean;
    initWebRtcStats(): void;
    stopWebRtcStats(): void;
    getSelectedIceCandidateInfo(): Promise<any>;
    private sendStatsToHttpEndpoint;
    private standardizeReport;
    private getStatsAgnostic;
}
