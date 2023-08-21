/*
 * (C) Copyright 2017-2022 OpenVidu (https://openvidu.io)
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
    interval: number;
    httpEndpoint: string;
}

interface JSONStatsResponse {
    '@timestamp': string;
    participant_id: string;
    session_id: string;
    platform: string;
    platform_description: string;
    stream: string;
    webrtc_stats: IWebrtcStats;
}

/**
 * Common WebRtcSTats for latest Chromium and Firefox versions
 */
interface IWebrtcStats {
    inbound?: {
        audio:
            | {
                  bytesReceived: number;
                  packetsReceived: number;
                  packetsLost: number;
                  jitter: number;
              }
            | {};
        video:
            | {
                  bytesReceived: number;
                  packetsReceived: number;
                  packetsLost: number;
                  jitter?: number; // Firefox
                  jitterBufferDelay?: number; // Chrome
                  framesDecoded: number;
                  firCount: number;
                  nackCount: number;
                  pliCount: number;
                  frameHeight?: number; // Chrome
                  frameWidth?: number; // Chrome
                  framesDropped?: number; // Chrome
                  framesReceived?: number; // Chrome
              }
            | {};
    };
    outbound?: {
        audio:
            | {
                  bytesSent: number;
                  packetsSent: number;
              }
            | {};
        video:
            | {
                  bytesSent: number;
                  packetsSent: number;
                  firCount: number;
                  framesEncoded: number;
                  nackCount: number;
                  pliCount: number;
                  qpSum: number;
                  frameHeight?: number; // Chrome
                  frameWidth?: number; // Chrome
                  framesSent?: number; // Chrome
              }
            | {};
    };
    candidatepair?: {
        currentRoundTripTime?: number; // Chrome
        availableOutgoingBitrate?: number; //Chrome
        // availableIncomingBitrate?: number // No support for any browsers (https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidatePairStats/availableIncomingBitrate)
    };
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
        let webrtcObj;
        // When cross-site (aka third-party) cookies are blocked by the browser,
        // accessing localStorage in a third-party iframe throws a DOMException.
        try {
            webrtcObj = localStorage.getItem(this.STATS_ITEM_NAME);
        }
        catch(e){}

        if (!!webrtcObj) {
            this.webRtcStatsEnabled = true;
            const webrtcStatsConfig: WebrtcStatsConfig = JSON.parse(webrtcObj);
            // webrtc object found in local storage
            logger.warn(
                'WebRtc stats enabled for stream ' + this.stream.streamId + ' of connection ' + this.stream.connection.connectionId
            );
            logger.warn('localStorage item: ' + JSON.stringify(webrtcStatsConfig));

            this.POST_URL = webrtcStatsConfig.httpEndpoint;
            this.statsInterval = webrtcStatsConfig.interval; // Interval in seconds

            this.webRtcStatsIntervalId = setInterval(async () => {
                await this.sendStatsToHttpEndpoint();
            }, this.statsInterval * 1000);
        } else {
            logger.debug('WebRtc stats not enabled');
        }
    }

    // {
    // "localCandidate": {
    //     "id": "RTCIceCandidate_/r4P1y2Q",
    //     "timestamp": 1616080155617,
    //     "type": "local-candidate",
    //     "transportId": "RTCTransport_0_1",
    //     "isRemote": false,
    //     "networkType": "wifi",
    //     "ip": "123.45.67.89",
    //     "port": 63340,
    //     "protocol": "udp",
    //     "candidateType": "srflx",
    //     "priority": 1686052607,
    //     "deleted": false,
    //     "raw": [
    //     "candidate:3345412921 1 udp 1686052607 123.45.67.89 63340 typ srflx raddr 192.168.1.31 rport 63340 generation 0 ufrag 0ZtT network-id 1 network-cost 10",
    //     "candidate:58094482 1 udp 41885695 98.76.54.32 44431 typ relay raddr 123.45.67.89 rport 63340 generation 0 ufrag 0ZtT network-id 1 network-cost 10"
    //     ]
    // },
    // "remoteCandidate": {
    //     "id": "RTCIceCandidate_1YO18gph",
    //     "timestamp": 1616080155617,
    //     "type": "remote-candidate",
    //     "transportId": "RTCTransport_0_1",
    //     "isRemote": true,
    //     "ip": "12.34.56.78",
    //     "port": 64989,
    //     "protocol": "udp",
    //     "candidateType": "srflx",
    //     "priority": 1679819263,
    //     "deleted": false,
    //     "raw": [
    //     "candidate:16 1 UDP 1679819263 12.34.56.78 64989 typ srflx raddr 172.19.0.1 rport 64989",
    //     "candidate:16 1 UDP 1679819263 12.34.56.78 64989 typ srflx raddr 172.19.0.1 rport 64989"
    //     ]
    // }
    // }
    // Have been tested in:
    //   - Linux Desktop:
    //       - Chrome 89.0.4389.90
    //       - Opera 74.0.3911.218
    //       - Firefox 86
    //       - Microsoft Edge 91.0.825.0
    //       - Electron 11.3.0 (Chromium 87.0.4280.141)
    //   - Windows Desktop:
    //       - Chrome 89.0.4389.90
    //       - Opera 74.0.3911.232
    //       - Firefox 86.0.1
    //       - Microsoft Edge 89.0.774.54
    //       - Electron 11.3.0 (Chromium 87.0.4280.141)
    //   - MacOS Desktop:
    //       - Chrome 89.0.4389.90
    //       - Firefox 87.0
    //       - Opera 75.0.3969.93
    //       - Microsoft Edge 89.0.774.57
    //       - Safari 14.0 (14610.1.28.1.9)
    //       - Electron 11.3.0 (Chromium 87.0.4280.141)
    //   - Android:
    //       - Chrome Mobile 89.0.4389.90
    //       - Opera 62.3.3146.57763
    //       - Firefox Mobile 86.6.1
    //       - Microsoft Edge Mobile 46.02.4.5147
    //       - Ionic 5
    //       - React Native 0.64
    //   - iOS:
    //       - Safari Mobile
    //       - ¿Ionic?
    //       - ¿React Native?
    public getSelectedIceCandidateInfo(): Promise<any> {
        return new Promise(async (resolve, reject) => {
            const statsReport: any = await this.stream.getRTCPeerConnection().getStats();
            let transportStat;
            const candidatePairs: Map<string, any> = new Map();
            const localCandidates: Map<string, any> = new Map();
            const remoteCandidates: Map<string, any> = new Map();
            statsReport.forEach((stat: any) => {
                if (stat.type === 'transport' && (platform.isChromium() || platform.isSafariBrowser() || platform.isReactNative())) {
                    transportStat = stat;
                }
                switch (stat.type) {
                    case 'candidate-pair':
                        candidatePairs.set(stat.id, stat);
                        break;
                    case 'local-candidate':
                        localCandidates.set(stat.id, stat);
                        break;
                    case 'remote-candidate':
                        remoteCandidates.set(stat.id, stat);
                        break;
                }
            });
            let selectedCandidatePair;
            if (transportStat != null) {
                const selectedCandidatePairId = transportStat.selectedCandidatePairId;
                selectedCandidatePair = candidatePairs.get(selectedCandidatePairId);
            } else {
                // This is basically Firefox
                const length = candidatePairs.size;
                const iterator = candidatePairs.values();
                for (let i = 0; i < length; i++) {
                    const candidatePair = iterator.next().value;
                    if (candidatePair['selected']) {
                        selectedCandidatePair = candidatePair;
                        break;
                    }
                }
            }
            const localCandidateId = selectedCandidatePair.localCandidateId;
            const remoteCandidateId = selectedCandidatePair.remoteCandidateId;
            let finalLocalCandidate = localCandidates.get(localCandidateId);
            if (!!finalLocalCandidate) {
                const candList = this.stream.getLocalIceCandidateList();
                const cand = candList.filter((c: RTCIceCandidate) => {
                    return (
                        !!c.candidate &&
                        (c.candidate.indexOf(finalLocalCandidate.ip) >= 0 || c.candidate.indexOf(finalLocalCandidate.address) >= 0) &&
                        c.candidate.indexOf(finalLocalCandidate.port) >= 0
                    );
                });
                finalLocalCandidate.raw = [];
                for (let c of cand) {
                    finalLocalCandidate.raw.push(c.candidate);
                }
            } else {
                finalLocalCandidate = 'ERROR: No active local ICE candidate. Probably ICE-TCP is being used';
            }

            let finalRemoteCandidate = remoteCandidates.get(remoteCandidateId);
            if (!!finalRemoteCandidate) {
                const candList = this.stream.getRemoteIceCandidateList();
                const cand = candList.filter((c: RTCIceCandidate) => {
                    return (
                        !!c.candidate &&
                        (c.candidate.indexOf(finalRemoteCandidate.ip) >= 0 || c.candidate.indexOf(finalRemoteCandidate.address) >= 0) &&
                        c.candidate.indexOf(finalRemoteCandidate.port) >= 0
                    );
                });
                finalRemoteCandidate.raw = [];
                for (let c of cand) {
                    finalRemoteCandidate.raw.push(c.candidate);
                }
            } else {
                finalRemoteCandidate = 'ERROR: No active remote ICE candidate. Probably ICE-TCP is being used';
            }

            return resolve({
                localCandidate: finalLocalCandidate,
                remoteCandidate: finalRemoteCandidate
            });
        });
    }

    public stopWebRtcStats() {
        if (this.webRtcStatsEnabled) {
            clearInterval(this.webRtcStatsIntervalId);
            logger.warn(
                'WebRtc stats stopped for disposed stream ' + this.stream.streamId + ' of connection ' + this.stream.connection.connectionId
            );
        }
    }

    private async sendStats(url: string, response: JSONStatsResponse): Promise<void> {
        try {
            const configuration: RequestInit = {
                headers: {
                    'Content-type': 'application/json'
                },
                body: JSON.stringify(response),
                method: 'POST'
            };
            await fetch(url, configuration);
        } catch (error) {
            logger.error(`sendStats error: ${JSON.stringify(error)}`);
        }
    }

    private async sendStatsToHttpEndpoint(): Promise<void> {
        try {
            const webrtcStats: IWebrtcStats = await this.getCommonStats();
            const response = this.generateJSONStatsResponse(webrtcStats);
            await this.sendStats(this.POST_URL, response);
        } catch (error) {
            logger.log(error);
        }
    }

    // Have been tested in:
    //   - Linux Desktop:
    //       - Chrome 89.0.4389.90
    //       - Opera 74.0.3911.218
    //       - Firefox 86
    //       - Microsoft Edge 91.0.825.0
    //       - Electron 11.3.0 (Chromium 87.0.4280.141)
    //   - Windows Desktop:
    //       - Chrome 89.0.4389.90
    //       - Opera 74.0.3911.232
    //       - Firefox 86.0.1
    //       - Microsoft Edge 89.0.774.54
    //       - Electron 11.3.0 (Chromium 87.0.4280.141)
    //   - MacOS Desktop:
    //       - Chrome 89.0.4389.90
    //       - Opera 75.0.3969.93
    //       - Firefox 87.0
    //       - Microsoft Edge 89.0.774.57
    //       - Safari 14.0 (14610.1.28.1.9)
    //       - Electron 11.3.0 (Chromium 87.0.4280.141)
    //   - Android:
    //       - Chrome Mobile 89.0.4389.90
    //       - Opera 62.3.3146.57763
    //       - Firefox Mobile 86.6.1
    //       - Microsoft Edge Mobile 46.02.4.5147
    //       - Ionic 5
    //       - React Native 0.64
    //   - iOS:
    //       - Safari Mobile
    //       - ¿Ionic?
    //       - ¿React Native?
    public async getCommonStats(): Promise<IWebrtcStats> {
        return new Promise(async (resolve, reject) => {
            try {
                const statsReport: any = await this.stream.getRTCPeerConnection().getStats();
                const response: IWebrtcStats = this.getWebRtcStatsResponseOutline();
                const videoTrackStats = ['framesReceived', 'framesDropped', 'framesSent', 'frameHeight', 'frameWidth'];
                const candidatePairStats = ['availableOutgoingBitrate', 'currentRoundTripTime'];

                statsReport.forEach((stat: any) => {
                    let mediaType = stat.mediaType != null ? stat.mediaType : stat.kind;
                    const addStat = (direction: string, key: string): void => {
                        if (stat[key] != null && response[direction] != null) {
                            if (!mediaType && videoTrackStats.indexOf(key) > -1) {
                                mediaType = 'video';
                            }
                            if (direction != null && mediaType != null && key != null && response[direction][mediaType] != null) {
                                response[direction][mediaType][key] = Number(stat[key]);
                            } else if (direction != null && key != null && candidatePairStats.includes(key)) {
                                // candidate-pair-stats
                                response[direction][key] = Number(stat[key]);
                            }
                        }
                    };

                    switch (stat.type) {
                        case 'outbound-rtp':
                            addStat('outbound', 'bytesSent');
                            addStat('outbound', 'packetsSent');
                            addStat('outbound', 'framesEncoded');
                            addStat('outbound', 'nackCount');
                            addStat('outbound', 'firCount');
                            addStat('outbound', 'pliCount');
                            addStat('outbound', 'qpSum');
                            break;
                        case 'inbound-rtp':
                            addStat('inbound', 'bytesReceived');
                            addStat('inbound', 'packetsReceived');
                            addStat('inbound', 'packetsLost');
                            addStat('inbound', 'jitter');
                            addStat('inbound', 'framesDecoded');
                            addStat('inbound', 'nackCount');
                            addStat('inbound', 'firCount');
                            addStat('inbound', 'pliCount');
                            break;
                        case 'track':
                            addStat('inbound', 'jitterBufferDelay');
                            addStat('inbound', 'framesReceived');
                            addStat('outbound', 'framesDropped');
                            addStat('outbound', 'framesSent');
                            addStat(this.stream.isLocal() ? 'outbound' : 'inbound', 'frameHeight');
                            addStat(this.stream.isLocal() ? 'outbound' : 'inbound', 'frameWidth');
                            break;
                        case 'candidate-pair':
                            addStat('candidatepair', 'currentRoundTripTime');
                            addStat('candidatepair', 'availableOutgoingBitrate');
                            break;
                    }
                });

                // Delete candidatepair from response if null
                if (!response?.candidatepair || Object.keys(<Object>response.candidatepair).length === 0) {
                    delete response.candidatepair;
                }

                return resolve(response);
            } catch (error) {
                logger.error('Error getting common stats: ', error);
                return reject(error);
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

    private getWebRtcStatsResponseOutline(): IWebrtcStats {
        if (this.stream.isLocal()) {
            return {
                outbound: {
                    audio: {},
                    video: {}
                },
                candidatepair: {}
            };
        } else {
            return {
                inbound: {
                    audio: {},
                    video: {}
                }
            };
        }
    }
}
