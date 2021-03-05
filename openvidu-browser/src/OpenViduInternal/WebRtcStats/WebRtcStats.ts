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

interface JSONStatsResponse {
    '@timestamp': string,
    participant_id: string,
    session_id: string,
    platform: string,
    platform_description: string,
    stream: string,
    webrtc_stats: IWebrtcStats
}

interface IWebrtcStats {
    inbound: {
        audio: {
            bytesReceived: number,
            packetsReceived: number,
            packetsLost: number,
            jitter: number,
            delayMs: number
        } | {},
        video: {
            bytesReceived: number,
            packetsReceived: number,
            packetsLost: number,
            framesDecoded: number,
            nackCount: number
        } | {}
    } | {},
    outbound: {
        audio: {
            bytesSent: number,
            packetsSent: number,
        } | {},
        video: {
            bytesSent: number,
            packetsSent: number,
            framesEncoded: number,
            nackCount: number
        } | {}
    } | {}
};

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
            // webrtc object found in local storage
            logger.warn('WebRtc stats enabled for stream ' + this.stream.streamId + ' of connection ' + this.stream.connection.connectionId);
            logger.warn('localStorage item: ' + JSON.stringify(webrtcStatsConfig));

            this.POST_URL = webrtcStatsConfig.httpEndpoint;
            this.statsInterval = webrtcStatsConfig.interval;  // Interval in seconds

            this.webRtcStatsIntervalId = setInterval(async () => {
                await this.sendStatsToHttpEndpoint();
            }, this.statsInterval * 1000);

        }else {
            logger.debug('WebRtc stats not enabled');
        }
    }

    // Used in test-app
    public getSelectedIceCandidateInfo(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getStats().then(
                (stats) => {
                    if (platform.isChromeBrowser() || platform.isChromeMobileBrowser() || platform.isOperaBrowser() || platform.isOperaMobileBrowser()) {
                        let localCandidateId, remoteCandidateId, googCandidatePair;
                        const localCandidates = {};
                        const remoteCandidates = {};
                        for (const key in stats) {
                            const stat = stats[key];
                            if (stat.type === 'localcandidate') {
                                localCandidates[stat.id] = stat;
                            } else if (stat.type === 'remotecandidate') {
                                remoteCandidates[stat.id] = stat;
                            } else if (stat.type === 'googCandidatePair' && (stat.googActiveConnection === 'true')) {
                                googCandidatePair = stat;
                                localCandidateId = stat.localCandidateId;
                                remoteCandidateId = stat.remoteCandidateId;
                            }
                        }
                        let finalLocalCandidate = localCandidates[localCandidateId];
                        if (!!finalLocalCandidate) {
                            const candList = this.stream.getLocalIceCandidateList();
                            const cand = candList.filter((c: RTCIceCandidate) => {
                                return (!!c.candidate &&
                                    c.candidate.indexOf(finalLocalCandidate.ipAddress) >= 0 &&
                                    c.candidate.indexOf(finalLocalCandidate.portNumber) >= 0 &&
                                    c.candidate.indexOf(finalLocalCandidate.priority) >= 0);
                            });
                            finalLocalCandidate.raw = !!cand[0] ? cand[0].candidate : 'ERROR: Cannot find local candidate in list of sent ICE candidates';
                        } else {
                            finalLocalCandidate = 'ERROR: No active local ICE candidate. Probably ICE-TCP is being used';
                        }

                        let finalRemoteCandidate = remoteCandidates[remoteCandidateId];
                        if (!!finalRemoteCandidate) {
                            const candList = this.stream.getRemoteIceCandidateList();
                            const cand = candList.filter((c: RTCIceCandidate) => {
                                return (!!c.candidate &&
                                    c.candidate.indexOf(finalRemoteCandidate.ipAddress) >= 0 &&
                                    c.candidate.indexOf(finalRemoteCandidate.portNumber) >= 0 &&
                                    c.candidate.indexOf(finalRemoteCandidate.priority) >= 0);
                            });
                            finalRemoteCandidate.raw = !!cand[0] ? cand[0].candidate : 'ERROR: Cannot find remote candidate in list of received ICE candidates';
                        } else {
                            finalRemoteCandidate = 'ERROR: No active remote ICE candidate. Probably ICE-TCP is being used';
                        }

                        resolve({
                            googCandidatePair,
                            localCandidate: finalLocalCandidate,
                            remoteCandidate: finalRemoteCandidate
                        });
                    } else {
                        reject('Selected ICE candidate info only available for Chrome');
                    }
                }).catch((error) => {
                    reject(error);
                });
        });
    }

    public stopWebRtcStats() {
        if (this.webRtcStatsEnabled) {
            clearInterval(this.webRtcStatsIntervalId);
            logger.warn('WebRtc stats stopped for disposed stream ' + this.stream.streamId + ' of connection ' + this.stream.connection.connectionId);
        }
    }

    private async sendStats(url: string, response: JSONStatsResponse): Promise<void> {
        try {
            const configuration: RequestInit = {
                headers: {
                    'Content-type': 'application/json'
                },
                body: JSON.stringify(response),
                method: 'POST',
            };
            await fetch(url, configuration);

        } catch (error) {
            logger.error(error);
        }
    }

    private async sendStatsToHttpEndpoint(): Promise<void> {
        try {
            const webrtcStats: IWebrtcStats = await this.getStats();
            const response = this.generateJSONStatsResponse(webrtcStats);
            await this.sendStats(this.POST_URL, response);
        } catch (error) {
            logger.log(error);
        }
    }

    private async getStats(): Promise<IWebrtcStats> {

        return new Promise(async (resolve, reject) => {
            if (platform.isChromeBrowser() || platform.isChromeMobileBrowser() || platform.isOperaBrowser() || platform.isOperaMobileBrowser()) {

                const pc: any = this.stream.getRTCPeerConnection();
                pc.getStats((statsReport) => {
                    const stats = statsReport.result().filter((stat) => stat.type === 'ssrc');
                    const response = this.initWebRtcStatsResponse();

                    stats.forEach(stat => {
                        const valueNames: string[] = stat.names();
                        const mediaType = stat.stat("mediaType");
                        const isAudio = mediaType === 'audio' && valueNames.includes('audioOutputLevel');
                        const isVideo = mediaType === 'video' && valueNames.includes('qpSum');
                        const isIndoundRtp = valueNames.includes('bytesReceived') && (isAudio || isVideo);
                        const isOutboundRtp = valueNames.includes('bytesSent');

                        if(isIndoundRtp){
                            response.inbound[mediaType].bytesReceived = Number(stat.stat('bytesReceived'));
                            response.inbound[mediaType].packetsReceived = Number(stat.stat('packetsReceived'));
                            response.inbound[mediaType].packetsLost = Number(stat.stat('packetsLost'));
                            response.inbound[mediaType].jitter = Number(stat.stat('googJitterBufferMs'));
                            response.inbound[mediaType].delayMs = Number(stat.stat('googCurrentDelayMs'));
                            if(mediaType === 'video'){
                                response.inbound['video'].framesDecoded = Number(stat.stat('framesDecoded'));
                                response.inbound['video'].nackCount = Number(stat.stat('nackCount'));
                            }

                        } else if(isOutboundRtp) {
                            response.outbound[mediaType].bytesSent = Number(stat.stat('bytesSent'));
                            response.outbound[mediaType].packetsSent = Number(stat.stat('packetsSent'));
                            if(mediaType === 'video'){
                                response.outbound['video'].framesEncoded = Number(stat.stat('framesEncoded'));
                                response.outbound['video'].nackCount = Number(stat.stat('nackCount'));
                            }
                        }
                    });
                    resolve(response);

                });
            } else {
                const statsReport:any = await this.stream.getRTCPeerConnection().getStats(null);
                const response = this.initWebRtcStatsResponse();
                statsReport.forEach((stat: any) => {

                    const mediaType = stat.mediaType;
                    // isRemote property has been deprecated from Firefox 66 https://blog.mozilla.org/webrtc/getstats-isremote-66/
                    switch (stat.type) {
                        case "outbound-rtp":
                            response.outbound[mediaType].bytesSent = Number(stat.bytesSent);
                            response.outbound[mediaType].packetsSent = Number(stat.packetsSent);
                            if(mediaType === 'video'){
                                response.outbound[mediaType].framesEncoded = Number(stat.framesEncoded);
                            }
                            break;
                        case "inbound-rtp":
                            response.inbound[mediaType].bytesReceived = Number(stat.bytesReceived);
                            response.inbound[mediaType].packetsReceived = Number(stat.packetsReceived);
                            response.inbound[mediaType].packetsLost = Number(stat.packetsLost);
                            response.inbound[mediaType].jitter = Number(stat.jitter);
                            if (mediaType === 'video') {
                                response.inbound[mediaType].framesDecoded = Number(stat.framesDecoded);
                                response.inbound[mediaType].nackCount = Number(stat.nackCount);
                            }
                            break;
                    }
                });

                return resolve(response);
            }

        });

    }

    private generateJSONStatsResponse(stats: IWebrtcStats): JSONStatsResponse {
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

    private initWebRtcStatsResponse(): IWebrtcStats {

        return {
            inbound: {
                audio: {},
                video: {}
            },
            outbound: {
                audio: {},
                video: {}
            }
        };

    }

}