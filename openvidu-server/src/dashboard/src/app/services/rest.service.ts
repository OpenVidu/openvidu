import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Injectable()
export class RestService {

    private openviduPublicUrl: string;
    private API_PATH: string = 'openvidu/api';

    constructor(private httpClient: HttpClient) { }

    getOpenViduPublicUrl(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!!this.openviduPublicUrl) {
                resolve(this.openviduPublicUrl);
            } else {
                this.httpClient.get(location.protocol + '//' + location.hostname + ((!!location.port) ? (':' + location.port) : '') +
                    '/' + this.API_PATH + '/config/openvidu-publicurl', { responseType: 'text' }).pipe(
                        catchError(error => {
                            reject(error);
                            return throwError(error);
                        })
                    )
                    .subscribe(response => {
                        this.openviduPublicUrl = response;
                        resolve(response);
                    });
            }
        });
    }

    async getToken(secret: string): Promise<string> {
        const sessionId: string = await this.createSession(secret);
        return await this.createToken(sessionId, secret);
    }

    createSession(secret: String): Promise<string> {
        return new Promise((resolve, reject) => {
            const body = JSON.stringify({});
            const options = {
                headers: new HttpHeaders({
                    'Authorization': 'Basic ' + btoa('OPENVIDUAPP:' + secret),
                    'Content-Type': 'application/json'
                })
            };
            this.httpClient.post(this.openviduPublicUrl + this.API_PATH + '/sessions', body, options)
                .pipe(
                    catchError(error => {
                        reject(error);
                        return throwError(error);
                    })
                )
                .subscribe(response => {
                    resolve(response['id']);
                });
        });
    }

    createToken(session, secret): Promise<string> {
        return new Promise((resolve, reject) => {
            const body = {};
            const options = {
                headers: new HttpHeaders({
                    'Authorization': 'Basic ' + btoa('OPENVIDUAPP:' + secret),
                    'Content-Type': 'application/json'
                })
            };
            this.httpClient.post(this.openviduPublicUrl + this.API_PATH + '/sessions/' + session + '/connection', body, options)
                .pipe(
                    catchError(error => {
                        reject(error);
                        return throwError(error);
                    })
                )
                .subscribe(response => {
                    resolve(response['token']);
                });
        });
    }

}
