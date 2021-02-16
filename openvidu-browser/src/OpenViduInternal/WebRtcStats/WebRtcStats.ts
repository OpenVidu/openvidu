/*
 * (C) Copyright 2017-2020 OpenVidu (https://openvidu.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

// tslint:disable:no-string-literal

import { Stream } from '../../OpenVidu/Stream';
import { OpenViduLogger } from '../Logger/OpenViduLogger';
import { PlatformUtils } from '../Utils/Platform';
/**
 * @hidden
 */
const logger: OpenViduLogger = OpenViduLogger.getInstance();
/**
 * @hidden
 */
let platform: PlatformUtils;

interface WebrtcStatsConfig {
    interval: number,
    httpEndpoint: string
}

interface JSONStats {
    '@timestamp': string,
    participant_id: string,
    session_id: string,
    platform: string,
    platform_description: string,
    stream: string,
    webrtc_stats: RTCStatsReport
}

export class WebRtcStats {

    private readonly STATS_ITEM_NAME = 'webrtc-stats-config';

    private webRtcStatsEnabled = false;
    private webRtcStatsIntervalId: NodeJS.Timer;
    private statsInterval = 1;
    private POST_URL: string;

    constructor(private stream: Stream) {
        platform = PlatformUtils.getInstance();
    }

    public isEnabled(): boolean {
        return this.webRtcStatsEnabled;
    }

    public initWebRtcStats(): void {

        const webrtcObj = localStorage.getItem(this.STATS_ITEM_NAME);

        if (!!webrtcObj) {

            this.webRtcStatsEnabled = true;
            const webrtcStatsConfig: WebrtcStatsConfig = JSON.parse(webrtcObj);
            this.POST_URL = webrtcStatsConfig.httpEndpoint;
            this.statsInterval = webrtcStatsConfig.interval;  // Interval in seconds

            // webrtc object found in local storage
            logger.warn('WebRtc stats enabled for stream ' + this.stream.streamId + ' of connection ' + this.stream.connection.connectionId);
            logger.warn('localStorage item: ' + JSON.stringify(webrtcStatsConfig));

            this.webRtcStatsIntervalId = setInterval(async () => {
                await this.sendStatsToHttpEndpoint();
            }, this.statsInterval * 1000);

        }else {
            logger.debug('WebRtc stats not enabled');
        }
    }

    public stopWebRtcStats() {
        if (this.webRtcStatsEnabled) {
            clearInterval(this.webRtcStatsIntervalId);
            logger.warn('WebRtc stats stopped for disposed stream ' + this.stream.streamId + ' of connection ' + this.stream.connection.connectionId);
        }
    }

    private async sendStats(url: string, json: JSONStats): Promise<void> {
        try {
            const configuration: RequestInit = {
                headers: {
                    'Content-type': 'application/json'
                },
                body: JSON.stringify(json),
                method: 'POST',
            };
            await fetch(url, configuration);

        } catch (error) {
            logger.error(error);
        }
    }

    private async sendStatsToHttpEndpoint(): Promise<void> {
        try {
            const stats: RTCStatsReport = await this.getStats();
            const json = this.generateJSONStats(stats);
            // this.parseAndSendStats(stats);
            await this.sendStats(this.POST_URL, json);
        } catch (error) {
            logger.log(error);
        }
    }

    private async getStats(): Promise<any> {

        return new Promise(async (resolve, reject) => {
            if (platform.isChromeBrowser() || platform.isChromeMobileBrowser() || platform.isOperaBrowser() || platform.isOperaMobileBrowser()) {

                const pc: any = this.stream.getRTCPeerConnection();
                pc.getStats((statsReport) => {
                    resolve(this.standardizeReport(statsReport));
                });
            } else {
                const statsReport = await this.stream.getRTCPeerConnection().getStats();
                resolve(this.standardizeReport(statsReport));
            }

        });

    }

    private generateJSONStats(stats: RTCStatsReport): JSONStats {
        return {
            '@timestamp': new Date().toISOString(),
            participant_id: this.stream.connection.data,
            session_id: this.stream.session.sessionId,
            platform: platform.getName(),
            platform_description: platform.getDescription(),
            stream: 'webRTC',
            webrtc_stats: stats
        };
    }

    private standardizeReport(response: RTCStatsReport | any) {
        let standardReport = {};

        if (platform.isChromeBrowser() || platform.isChromeMobileBrowser() || platform.isOperaBrowser() || platform.isOperaMobileBrowser()) {
            response.result().forEach(report => {
                const standardStats = {
                    id: report.id,
                    timestamp: report.timestamp,
                    type: report.type
                };
                report.names().forEach((name) => {
                    standardStats[name] = report.stat(name);
                });
                standardReport[standardStats.id] = standardStats;
            });

            return standardReport;
        }

        // Others platforms
        response.forEach((values) => {
            let standardStats: any = {};
            Object.keys(values).forEach((value: any) => {
                standardStats[value] = values[value];
            });
           standardReport[standardStats.id] = standardStats
        });

        return standardReport;
    }
}