"use strict";
/*
 * (C) Copyright 2017-2018 OpenVidu (https://openvidu.io/)
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
exports.__esModule = true;
var platform = require("platform");
var WebRtcStats = /** @class */ (function () {
    function WebRtcStats(stream) {
        this.stream = stream;
        this.webRtcStatsEnabled = false;
        this.statsInterval = 1;
        this.stats = {
            inbound: {
                audio: {
                    bytesReceived: 0,
                    packetsReceived: 0,
                    packetsLost: 0
                },
                video: {
                    bytesReceived: 0,
                    packetsReceived: 0,
                    packetsLost: 0,
                    framesDecoded: 0,
                    nackCount: 0
                }
            },
            outbound: {
                audio: {
                    bytesSent: 0,
                    packetsSent: 0
                },
                video: {
                    bytesSent: 0,
                    packetsSent: 0,
                    framesEncoded: 0,
                    nackCount: 0
                }
            }
        };
    }
    WebRtcStats.prototype.isEnabled = function () {
        return this.webRtcStatsEnabled;
    };
    WebRtcStats.prototype.initWebRtcStats = function () {
        var _this = this;
        var elastestInstrumentation = localStorage.getItem('elastest-instrumentation');
        if (!!elastestInstrumentation) {
            // ElasTest instrumentation object found in local storage
            console.warn('WebRtc stats enabled for stream ' + this.stream.streamId + ' of connection ' + this.stream.connection.connectionId);
            this.webRtcStatsEnabled = true;
            var instrumentation_1 = JSON.parse(elastestInstrumentation);
            this.statsInterval = instrumentation_1.webrtc.interval; // Interval in seconds
            console.warn('localStorage item: ' + JSON.stringify(instrumentation_1));
            this.webRtcStatsIntervalId = setInterval(function () {
                _this.sendStatsToHttpEndpoint(instrumentation_1);
            }, this.statsInterval * 1000);
            return;
        }
        console.debug('WebRtc stats not enabled');
    };
    WebRtcStats.prototype.stopWebRtcStats = function () {
        if (this.webRtcStatsEnabled) {
            clearInterval(this.webRtcStatsIntervalId);
            console.warn('WebRtc stats stopped for disposed stream ' + this.stream.streamId + ' of connection ' + this.stream.connection.connectionId);
        }
    };
    WebRtcStats.prototype.getSelectedIceCandidateInfo = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.getStatsAgnostic(_this.stream.getRTCPeerConnection(), function (stats) {
                if ((platform.name.indexOf('Chrome') !== -1) || (platform.name.indexOf('Opera') !== -1)) {
                    var localCandidateId = void 0, remoteCandidateId = void 0, googCandidatePair = void 0;
                    var localCandidates = {};
                    var remoteCandidates = {};
                    for (var key in stats) {
                        var stat = stats[key];
                        if (stat.type === 'localcandidate') {
                            localCandidates[stat.id] = stat;
                        }
                        else if (stat.type === 'remotecandidate') {
                            remoteCandidates[stat.id] = stat;
                        }
                        else if (stat.type === 'googCandidatePair' && (stat.googActiveConnection === 'true')) {
                            googCandidatePair = stat;
                            localCandidateId = stat.localCandidateId;
                            remoteCandidateId = stat.remoteCandidateId;
                        }
                    }
                    var finalLocalCandidate_1 = localCandidates[localCandidateId];
                    if (!!finalLocalCandidate_1) {
                        var candList = _this.stream.getLocalIceCandidateList();
                        var cand = candList.filter(function (c) {
                            return (!!c.candidate &&
                                c.candidate.indexOf(finalLocalCandidate_1.ipAddress) >= 0 &&
                                c.candidate.indexOf(finalLocalCandidate_1.portNumber) >= 0 &&
                                c.candidate.indexOf(finalLocalCandidate_1.priority) >= 0);
                        });
                        finalLocalCandidate_1.raw = !!cand[0] ? cand[0].candidate : 'ERROR: Cannot find local candidate in list of sent ICE candidates';
                    }
                    else {
                        finalLocalCandidate_1 = 'ERROR: No active local ICE candidate. Probably ICE-TCP is being used';
                    }
                    var finalRemoteCandidate_1 = remoteCandidates[remoteCandidateId];
                    if (!!finalRemoteCandidate_1) {
                        var candList = _this.stream.getRemoteIceCandidateList();
                        var cand = candList.filter(function (c) {
                            return (!!c.candidate &&
                                c.candidate.indexOf(finalRemoteCandidate_1.ipAddress) >= 0 &&
                                c.candidate.indexOf(finalRemoteCandidate_1.portNumber) >= 0 &&
                                c.candidate.indexOf(finalRemoteCandidate_1.priority) >= 0);
                        });
                        finalRemoteCandidate_1.raw = !!cand[0] ? cand[0].candidate : 'ERROR: Cannot find remote candidate in list of received ICE candidates';
                    }
                    else {
                        finalRemoteCandidate_1 = 'ERROR: No active remote ICE candidate. Probably ICE-TCP is being used';
                    }
                    resolve({
                        googCandidatePair: googCandidatePair,
                        localCandidate: finalLocalCandidate_1,
                        remoteCandidate: finalRemoteCandidate_1
                    });
                }
                else {
                    reject('Selected ICE candidate info only available for Chrome');
                }
            }, function (error) {
                reject(error);
            });
        });
    };
    WebRtcStats.prototype.sendStatsToHttpEndpoint = function (instrumentation) {
        var _this = this;
        var sendPost = function (json) {
            var http = new XMLHttpRequest();
            var url = instrumentation.webrtc.httpEndpoint;
            http.open('POST', url, true);
            http.setRequestHeader('Content-type', 'application/json');
            http.onreadystatechange = function () {
                if (http.readyState === 4 && http.status === 200) {
                    console.log('WebRtc stats successfully sent to ' + url + ' for stream ' + _this.stream.streamId + ' of connection ' + _this.stream.connection.connectionId);
                }
            };
            http.send(json);
        };
        var f = function (stats) {
            if (platform.name.indexOf('Firefox') !== -1) {
                stats.forEach(function (stat) {
                    var json = {};
                    if ((stat.type === 'inbound-rtp') &&
                        (
                        // Avoid firefox empty outbound-rtp statistics
                        stat.nackCount !== null &&
                            stat.isRemote === false &&
                            stat.id.startsWith('inbound') &&
                            stat.remoteId.startsWith('inbound'))) {
                        var metricId = 'webrtc_inbound_' + stat.mediaType + '_' + stat.ssrc;
                        var jit = stat.jitter * 1000;
                        var metrics = {
                            bytesReceived: (stat.bytesReceived - _this.stats.inbound[stat.mediaType].bytesReceived) / _this.statsInterval,
                            jitter: jit,
                            packetsReceived: (stat.packetsReceived - _this.stats.inbound[stat.mediaType].packetsReceived) / _this.statsInterval,
                            packetsLost: (stat.packetsLost - _this.stats.inbound[stat.mediaType].packetsLost) / _this.statsInterval
                        };
                        var units = {
                            bytesReceived: 'bytes',
                            jitter: 'ms',
                            packetsReceived: 'packets',
                            packetsLost: 'packets'
                        };
                        if (stat.mediaType === 'video') {
                            metrics['framesDecoded'] = (stat.framesDecoded - _this.stats.inbound.video.framesDecoded) / _this.statsInterval;
                            metrics['nackCount'] = (stat.nackCount - _this.stats.inbound.video.nackCount) / _this.statsInterval;
                            units['framesDecoded'] = 'frames';
                            units['nackCount'] = 'packets';
                            _this.stats.inbound.video.framesDecoded = stat.framesDecoded;
                            _this.stats.inbound.video.nackCount = stat.nackCount;
                        }
                        _this.stats.inbound[stat.mediaType].bytesReceived = stat.bytesReceived;
                        _this.stats.inbound[stat.mediaType].packetsReceived = stat.packetsReceived;
                        _this.stats.inbound[stat.mediaType].packetsLost = stat.packetsLost;
                        json = {
                            '@timestamp': new Date(stat.timestamp).toISOString(),
                            'exec': instrumentation.exec,
                            'component': instrumentation.component,
                            'stream': 'webRtc',
                            'type': metricId,
                            'stream_type': 'composed_metrics',
                            'units': units
                        };
                        json[metricId] = metrics;
                        sendPost(JSON.stringify(json));
                    }
                    else if ((stat.type === 'outbound-rtp') &&
                        (
                        // Avoid firefox empty inbound-rtp statistics
                        stat.isRemote === false &&
                            stat.id.toLowerCase().includes('outbound'))) {
                        var metricId = 'webrtc_outbound_' + stat.mediaType + '_' + stat.ssrc;
                        var metrics = {
                            bytesSent: (stat.bytesSent - _this.stats.outbound[stat.mediaType].bytesSent) / _this.statsInterval,
                            packetsSent: (stat.packetsSent - _this.stats.outbound[stat.mediaType].packetsSent) / _this.statsInterval
                        };
                        var units = {
                            bytesSent: 'bytes',
                            packetsSent: 'packets'
                        };
                        if (stat.mediaType === 'video') {
                            metrics['framesEncoded'] = (stat.framesEncoded - _this.stats.outbound.video.framesEncoded) / _this.statsInterval;
                            units['framesEncoded'] = 'frames';
                            _this.stats.outbound.video.framesEncoded = stat.framesEncoded;
                        }
                        _this.stats.outbound[stat.mediaType].bytesSent = stat.bytesSent;
                        _this.stats.outbound[stat.mediaType].packetsSent = stat.packetsSent;
                        json = {
                            '@timestamp': new Date(stat.timestamp).toISOString(),
                            'exec': instrumentation.exec,
                            'component': instrumentation.component,
                            'stream': 'webRtc',
                            'type': metricId,
                            'stream_type': 'composed_metrics',
                            'units': units
                        };
                        json[metricId] = metrics;
                        sendPost(JSON.stringify(json));
                    }
                });
            }
            else if ((platform.name.indexOf('Chrome') !== -1) || (platform.name.indexOf('Opera') !== -1)) {
                for (var _i = 0, _a = Object.keys(stats); _i < _a.length; _i++) {
                    var key = _a[_i];
                    var stat = stats[key];
                    if (stat.type === 'ssrc') {
                        var json = {};
                        if ('bytesReceived' in stat && ((stat.mediaType === 'audio' && 'audioOutputLevel' in stat) ||
                            (stat.mediaType === 'video' && 'qpSum' in stat))) {
                            // inbound-rtp
                            var metricId = 'webrtc_inbound_' + stat.mediaType + '_' + stat.ssrc;
                            var metrics = {
                                bytesReceived: (stat.bytesReceived - _this.stats.inbound[stat.mediaType].bytesReceived) / _this.statsInterval,
                                jitter: stat.googJitterBufferMs,
                                packetsReceived: (stat.packetsReceived - _this.stats.inbound[stat.mediaType].packetsReceived) / _this.statsInterval,
                                packetsLost: (stat.packetsLost - _this.stats.inbound[stat.mediaType].packetsLost) / _this.statsInterval
                            };
                            var units = {
                                bytesReceived: 'bytes',
                                jitter: 'ms',
                                packetsReceived: 'packets',
                                packetsLost: 'packets'
                            };
                            if (stat.mediaType === 'video') {
                                metrics['framesDecoded'] = (stat.framesDecoded - _this.stats.inbound.video.framesDecoded) / _this.statsInterval;
                                metrics['nackCount'] = (stat.googNacksSent - _this.stats.inbound.video.nackCount) / _this.statsInterval;
                                units['framesDecoded'] = 'frames';
                                units['nackCount'] = 'packets';
                                _this.stats.inbound.video.framesDecoded = stat.framesDecoded;
                                _this.stats.inbound.video.nackCount = stat.googNacksSent;
                            }
                            _this.stats.inbound[stat.mediaType].bytesReceived = stat.bytesReceived;
                            _this.stats.inbound[stat.mediaType].packetsReceived = stat.packetsReceived;
                            _this.stats.inbound[stat.mediaType].packetsLost = stat.packetsLost;
                            json = {
                                '@timestamp': new Date(stat.timestamp).toISOString(),
                                'exec': instrumentation.exec,
                                'component': instrumentation.component,
                                'stream': 'webRtc',
                                'type': metricId,
                                'stream_type': 'composed_metrics',
                                'units': units
                            };
                            json[metricId] = metrics;
                            sendPost(JSON.stringify(json));
                        }
                        else if ('bytesSent' in stat) {
                            // outbound-rtp
                            var metricId = 'webrtc_outbound_' + stat.mediaType + '_' + stat.ssrc;
                            var metrics = {
                                bytesSent: (stat.bytesSent - _this.stats.outbound[stat.mediaType].bytesSent) / _this.statsInterval,
                                packetsSent: (stat.packetsSent - _this.stats.outbound[stat.mediaType].packetsSent) / _this.statsInterval
                            };
                            var units = {
                                bytesSent: 'bytes',
                                packetsSent: 'packets'
                            };
                            if (stat.mediaType === 'video') {
                                metrics['framesEncoded'] = (stat.framesEncoded - _this.stats.outbound.video.framesEncoded) / _this.statsInterval;
                                units['framesEncoded'] = 'frames';
                                _this.stats.outbound.video.framesEncoded = stat.framesEncoded;
                            }
                            _this.stats.outbound[stat.mediaType].bytesSent = stat.bytesSent;
                            _this.stats.outbound[stat.mediaType].packetsSent = stat.packetsSent;
                            json = {
                                '@timestamp': new Date(stat.timestamp).toISOString(),
                                'exec': instrumentation.exec,
                                'component': instrumentation.component,
                                'stream': 'webRtc',
                                'type': metricId,
                                'stream_type': 'composed_metrics',
                                'units': units
                            };
                            json[metricId] = metrics;
                            sendPost(JSON.stringify(json));
                        }
                    }
                }
            }
        };
        this.getStatsAgnostic(this.stream.getRTCPeerConnection(), f, function (error) { console.log(error); });
    };
    WebRtcStats.prototype.standardizeReport = function (response) {
        console.log(response);
        var standardReport = {};
        if (platform.name.indexOf('Firefox') !== -1) {
            Object.keys(response).forEach(function (key) {
                console.log(response[key]);
            });
            return response;
        }
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
    };
    WebRtcStats.prototype.getStatsAgnostic = function (pc, successCb, failureCb) {
        var _this = this;
        if (platform.name.indexOf('Firefox') !== -1) {
            // getStats takes args in different order in Chrome and Firefox
            return pc.getStats(null).then(function (response) {
                var report = _this.standardizeReport(response);
                successCb(report);
            })["catch"](failureCb);
        }
        else if ((platform.name.indexOf('Chrome') !== -1) || (platform.name.indexOf('Opera') !== -1)) {
            // In Chrome, the first two arguments are reversed
            return pc.getStats(function (response) {
                var report = _this.standardizeReport(response);
                successCb(report);
            }, null, failureCb);
        }
    };
    return WebRtcStats;
}());
exports.WebRtcStats = WebRtcStats;
//# sourceMappingURL=WebRtcStats.js.map