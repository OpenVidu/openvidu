import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

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

}
