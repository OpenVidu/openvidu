import { Stream } from '../..';
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
    private sendStatsToHttpEndpoint(instrumentation);
    private standardizeReport(response);
    private getStatsAgnostic(pc, successCb, failureCb);
}
