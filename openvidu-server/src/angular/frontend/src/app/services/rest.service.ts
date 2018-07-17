import { Injectable } from '@angular/core';

@Injectable()
export class RestService {

    private openviduPublicUrl: string;

    getOpenViduPublicUrl(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!!this.openviduPublicUrl) {
                resolve(this.openviduPublicUrl);
            } else {
                const url = location.protocol + '//' + location.hostname + ((!!location.port) ? (':' + location.port) : '') +
                    '/config/openvidu-publicurl';
                const http = new XMLHttpRequest();

                http.onreadystatechange = () => {
                    if (http.readyState === 4) {
                        if (http.status === 200) {
                            this.openviduPublicUrl = http.responseText;
                            resolve(http.responseText);
                        } else {
                            reject('Error getting OpenVidu publicurl');
                        }
                    };
                }
                http.open('GET', url, true);
                http.send();
            }
        });
    }

    getOpenViduToken(secret: string): Promise<string> {
        if (!this.openviduPublicUrl) {
            this.getOpenViduPublicUrl().then(() => {
                return this.getOpenViduToken(secret);
            });
        } else {
            return new Promise((resolve, reject) => {
                const url1 = 'https://OPENVIDUAPP:' + secret + '@' + this.openviduPublicUrl.split('://')[1] + 'api/sessions';
                const http1 = new XMLHttpRequest();
                const data1 = {};
                data1['mediaMode'] = 'ROUTED';
                data1['recordingMode'] = 'MANUAL';
                data1['RECORDING_LAYOUT'] = 'BEST_FIT';
                const json1 = JSON.stringify(data1);

                http1.onreadystatechange = () => {
                    if (http1.status === 401) {
                        reject(401);
                    } else if (http1.readyState === 4) {
                        if (http1.status === 200) {
                            const sessionId = JSON.parse(http1.responseText).id;

                            const url2 = this.openviduPublicUrl + 'api/tokens';
                            const http2 = new XMLHttpRequest();
                            const data2 = {};
                            data2['session'] = sessionId;
                            const json2 = JSON.stringify(data2);

                            http2.onreadystatechange = () => {
                                if (http2.readyState === 4) {
                                    if (http2.status === 200) {
                                        resolve(JSON.parse(http2.responseText).id);
                                    } else {
                                        reject(http2.status);
                                    }
                                };
                            }
                            http2.open('POST', url2, true);
                            http2.setRequestHeader('Content-type', 'application/json');
                            http2.setRequestHeader('Authorization', 'Basic ' + btoa('OPENVIDUAPP:' + secret));
                            http2.send(json2);
                        } else {
                            reject(http1.status);
                        }
                    };
                }
                http1.open('POST', url1, true);
                http1.setRequestHeader('Content-type', 'application/json');
                http1.send(json1);
            });
        }
    }

}
