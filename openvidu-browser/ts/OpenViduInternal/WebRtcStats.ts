import { Stream } from './Stream';
import * as adapter from 'webrtc-adapter';

export class WebRtcStats {

    private webRtcStatsEnabled: boolean = false;
    private webRtcStatsIntervalId: number;
    private statsInterval: number = 1;
    private stats: any = {
        "inbound": {
            "audio": {
                "bytesReceived": 0,
                "packetsReceived": 0,
                "packetsLost": 0
            },
            "video": {
                "bytesReceived": 0,
                "packetsReceived": 0,
                "packetsLost": 0,
                "framesDecoded": 0,
                "nackCount": 0
            }
        },
        "outbound": {
            "audio": {
                "bytesSent": 0,
                "packetsSent": 0,
            },
            "video": {
                "bytesSent": 0,
                "packetsSent": 0,
                "framesEncoded": 0,
                "nackCount": 0
            }
        }
    }

    constructor(private stream: Stream) { }

    public isEnabled(): boolean {
        return this.webRtcStatsEnabled;
    }

    public initWebRtcStats(): void {

        let elastestInstrumentation = localStorage.getItem('elastest-instrumentation');

        if (elastestInstrumentation) {
            // ElasTest instrumentation object found in local storage

            console.warn("WebRtc stats enabled for stream " + this.stream.streamId + " of connection " + this.stream.connection.connectionId);

            this.webRtcStatsEnabled = true;

            let instrumentation = JSON.parse(elastestInstrumentation);
            this.statsInterval = instrumentation.webrtc.interval;  // Interval in seconds

            console.warn("localStorage item: " + JSON.stringify(instrumentation));

            this.webRtcStatsIntervalId = setInterval(() => {
                this.sendStatsToHttpEndpoint(instrumentation);
            }, this.statsInterval * 1000);

            return;
        }

        console.debug("WebRtc stats not enabled");
    }

    public stopWebRtcStats() {
        if (this.webRtcStatsEnabled) {
            clearInterval(this.webRtcStatsIntervalId);
            console.warn("WebRtc stats stopped for disposed stream " + this.stream.streamId + " of connection " + this.stream.connection.connectionId);
        }
    }

    private sendStatsToHttpEndpoint(instrumentation): void {

        let sendPost = (json) => {
            let http: XMLHttpRequest = new XMLHttpRequest();
            let url: string = instrumentation.webrtc.httpEndpoint;
            http.open("POST", url, true);

            http.setRequestHeader("Content-type", "application/json");
            
            http.onreadystatechange = () => { // Call a function when the state changes.
                if (http.readyState == 4 && http.status == 200) {
                    console.log("WebRtc stats succesfully sent to " + url + " for stream " + this.stream.streamId + " of connection " + this.stream.connection.connectionId);
                }
            }
            http.send(JSON.stringify(json));
        }

        let f = (stats) => {

            if (adapter.browserDetails.browser === 'firefox') {
                stats.forEach((stat) => {

                    let json = {};

                    if ((stat.type === 'inbound-rtp') &&
                        (
                            // Avoid firefox empty outbound-rtp statistics
                            stat.nackCount != null &&
                            stat.isRemote === false &&
                            stat.id.startsWith('inbound') &&
                            stat.remoteId.startsWith('inbound')
                        )) {

                        let metricId = 'webrtc_inbound_' + stat.mediaType + '_' + stat.ssrc;
                        let jitter = stat.jitter * 1000;

                        let metrics = {
                            "bytesReceived": (stat.bytesReceived - this.stats.inbound[stat.mediaType].bytesReceived) / this.statsInterval,
                            "jitter": jitter,
                            "packetsReceived": (stat.packetsReceived - this.stats.inbound[stat.mediaType].packetsReceived) / this.statsInterval,
                            "packetsLost": (stat.packetsLost - this.stats.inbound[stat.mediaType].packetsLost) / this.statsInterval
                        };
                        let units = {
                            "bytesReceived": "bytes",
                            "jitter": "ms",
                            "packetsReceived": "packets",
                            "packetsLost": "packets"
                        };
                        if (stat.mediaType === 'video') {
                            metrics['framesDecoded'] = (stat.framesDecoded - this.stats.inbound.video.framesDecoded) / this.statsInterval;
                            metrics['nackCount'] = (stat.nackCount - this.stats.inbound.video.nackCount) / this.statsInterval;
                            units['framesDecoded'] = "frames";
                            units['nackCount'] = "packets";

                            this.stats.inbound.video.framesDecoded = stat.framesDecoded;
                            this.stats.inbound.video.nackCount = stat.nackCount;
                        }

                        this.stats.inbound[stat.mediaType].bytesReceived = stat.bytesReceived;
                        this.stats.inbound[stat.mediaType].packetsReceived = stat.packetsReceived;
                        this.stats.inbound[stat.mediaType].packetsLost = stat.packetsLost;

                        json = {
                            "@timestamp": new Date(stat.timestamp).toISOString(),
                            "exec": instrumentation.exec,
                            "component": instrumentation.component,
                            "type": metricId,
                            "stream_type": "composed_metric",
                            "units": units
                        }
                        json[metricId] = metrics;

                        sendPost(JSON.stringify(json));

                    } else if ((stat.type === 'outbound-rtp') &&
                        (
                            // Avoid firefox empty inbound-rtp statistics
                            stat.isRemote === false &&
                            stat.id.toLowerCase().includes('outbound')
                        )) {

                        let metricId = 'webrtc_outbound_' + stat.mediaType + '_' + stat.ssrc;

                        let metrics = {
                            "bytesSent": (stat.bytesSent - this.stats.outbound[stat.mediaType].bytesSent) / this.statsInterval,
                            "packetsSent": (stat.packetsSent - this.stats.outbound[stat.mediaType].packetsSent) / this.statsInterval
                        };
                        let units = {
                            "bytesSent": "bytes",
                            "packetsSent": "packets"
                        };
                        if (stat.mediaType === 'video') {
                            metrics['framesEncoded'] = (stat.framesEncoded - this.stats.outbound.video.framesEncoded) / this.statsInterval;
                            units['framesEncoded'] = "frames";

                            this.stats.outbound.video.framesEncoded = stat.framesEncoded;
                        }

                        this.stats.outbound[stat.mediaType].bytesSent = stat.bytesSent;
                        this.stats.outbound[stat.mediaType].packetsSent = stat.packetsSent;

                        json = {
                            "@timestamp": new Date(stat.timestamp).toISOString(),
                            "exec": instrumentation.exec,
                            "component": instrumentation.component,
                            "type": metricId,
                            "stream_type": "composed_metric",
                            "units": units
                        }
                        json[metricId] = metrics;

                        sendPost(JSON.stringify(json));
                    }
                });
            } else if (adapter.browserDetails.browser === 'chrome') {
                for (let key of Object.keys(stats)) {
                    let stat = stats[key];
                    if (stat.type === 'ssrc') {

                        let json = {};

                        if ('bytesReceived' in stat && (
                            (stat.mediaType === 'audio' && 'audioOutputLevel' in stat) ||
                            (stat.mediaType === 'video' && 'qpSum' in stat)
                        )) {
                            // inbound-rtp
                            let metricId = 'webrtc_inbound_' + stat.mediaType + '_' + stat.ssrc;

                            let metrics = {
                                "bytesReceived": (stat.bytesReceived - this.stats.inbound[stat.mediaType].bytesReceived) / this.statsInterval,
                                "jitter": stat.googJitterBufferMs,
                                "packetsReceived": (stat.packetsReceived - this.stats.inbound[stat.mediaType].packetsReceived) / this.statsInterval,
                                "packetsLost": (stat.packetsLost - this.stats.inbound[stat.mediaType].packetsLost) / this.statsInterval
                            };
                            let units = {
                                "bytesReceived": "bytes",
                                "jitter": "ms",
                                "packetsReceived": "packets",
                                "packetsLost": "packets"
                            };
                            if (stat.mediaType === 'video') {
                                metrics['framesDecoded'] = (stat.framesDecoded - this.stats.inbound.video.framesDecoded) / this.statsInterval;
                                metrics['nackCount'] = (stat.googNacksSent - this.stats.inbound.video.nackCount) / this.statsInterval;
                                units['framesDecoded'] = "frames";
                                units['nackCount'] = "packets";

                                this.stats.inbound.video.framesDecoded = stat.framesDecoded;
                                this.stats.inbound.video.nackCount = stat.googNacksSent;
                            }

                            this.stats.inbound[stat.mediaType].bytesReceived = stat.bytesReceived;
                            this.stats.inbound[stat.mediaType].packetsReceived = stat.packetsReceived;
                            this.stats.inbound[stat.mediaType].packetsLost = stat.packetsLost;

                            json = {
                                "@timestamp": new Date(stat.timestamp).toISOString(),
                                "exec": instrumentation.exec,
                                "component": instrumentation.component,
                                "type": metricId,
                                "stream_type": "composed_metric",
                                "units": units
                            }
                            json[metricId] = metrics;

                            sendPost(JSON.stringify(json));
                        } else if ('bytesSent' in stat) {
                            // outbound-rtp
                            let metricId = 'webrtc_outbound_' + stat.mediaType + '_' + stat.ssrc;

                            let metrics = {
                                "bytesSent": (stat.bytesSent - this.stats.outbound[stat.mediaType].bytesSent) / this.statsInterval,
                                "packetsSent": (stat.packetsSent - this.stats.outbound[stat.mediaType].packetsSent) / this.statsInterval
                            };
                            let units = {
                                "bytesSent": "bytes",
                                "packetsSent": "packets"
                            };
                            if (stat.mediaType === 'video') {
                                metrics['framesEncoded'] = (stat.framesEncoded - this.stats.outbound.video.framesEncoded) / this.statsInterval;
                                units['framesEncoded'] = "frames";

                                this.stats.outbound.video.framesEncoded = stat.framesEncoded;
                            }

                            this.stats.outbound[stat.mediaType].bytesSent = stat.bytesSent;
                            this.stats.outbound[stat.mediaType].packetsSent = stat.packetsSent;

                            json = {
                                "@timestamp": new Date(stat.timestamp).toISOString(),
                                "exec": instrumentation.exec,
                                "component": instrumentation.component,
                                "type": metricId,
                                "stream_type": "composed_metric",
                                "units": units
                            }
                            json[metricId] = metrics;

                            sendPost(JSON.stringify(json));
                        }
                    }
                }
            }
        };

        this.getStatsAgnostic(this.stream.getRTCPeerConnection(), null, f, (error) => { console.log(error) });
    }

    private standardizeReport(response) {
        if (adapter.browserDetails.browser === 'firefox') {
            return response;
        }

        var standardReport = {};
        response.result().forEach(function (report) {
            var standardStats = {
                id: report.id,
                timestamp: report.timestamp,
                type: report.type
            };
            report.names().forEach(function (name) {
                standardStats[name] = report.stat(name);
            });
            standardReport[standardStats.id] = standardStats;
        });

        return standardReport;
    }

    private getStatsAgnostic(pc, selector, successCb, failureCb) {
        if (adapter.browserDetails.browser === 'firefox') {
            // getStats takes args in different order in Chrome and Firefox
            return pc.getStats(selector, (response) => {
                var report = this.standardizeReport(response);
                successCb(report);
            }, failureCb);
        } else if (adapter.browserDetails.browser === 'chrome') {
            // In Chrome, the first two arguments are reversed
            return pc.getStats((response) => {
                var report = this.standardizeReport(response);
                successCb(report);
            }, selector, failureCb);
        }
    }

}