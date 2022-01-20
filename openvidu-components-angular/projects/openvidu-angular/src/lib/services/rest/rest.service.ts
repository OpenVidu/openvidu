import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { Buffer} from 'buffer';

@Injectable({
	providedIn: 'root'
})
export class RestService {
	constructor(private http: HttpClient) {}

	async getToken(sessionId: string, openviduServerUrl: string, openviduSecret: string): Promise<string> {
		if (!!openviduServerUrl && !!openviduSecret) {
			const _sessionId = await this.createSession(sessionId, openviduServerUrl, openviduSecret);
			return await this.createToken(_sessionId, openviduServerUrl, openviduSecret);
		} else {
      return Promise.reject(`Error requesting a token to ${openviduServerUrl} with session id: ${sessionId}`);
    }
	}

	private createSession(sessionId: string, openviduServerUrl: string, openviduSecret: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const body = JSON.stringify({ customSessionId: sessionId });
			const options = {
				headers: new HttpHeaders({
					Authorization: 'Basic ' + this.btoa('OPENVIDUAPP:' + openviduSecret),
					'Content-Type': 'application/json'
				})
			};
			return this.http
				.post<any>(openviduServerUrl + '/openvidu/api/sessions', body, options)
				.pipe(
					catchError((error) => {
						if (error.status === 409) {
							resolve(sessionId);
						}
						if (error.statusText === 'Unknown Error') {
							reject({ status: 401, message: 'ERR_CERT_AUTHORITY_INVALID' });
						}
						return throwError(() => new Error(error));
					})
				)
				.subscribe((response) => {
					resolve(response.id);
				});
		});
	}

	private createToken(sessionId: string, openviduServerUrl: string, openviduSecret: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const body = JSON.stringify({});
			const options = {
				headers: new HttpHeaders({
					Authorization: 'Basic ' + this.btoa('OPENVIDUAPP:' + openviduSecret),
					'Content-Type': 'application/json'
				})
			};
			return this.http
				.post<any>(openviduServerUrl + '/openvidu/api/sessions/' + sessionId + '/connection', body, options)
				.pipe(
					catchError((error) => {
						reject(error);
						return throwError(() => new Error(error));
					})
				)
				.subscribe((response) => {
					resolve(response.token);
				});
		});
	}

	private btoa(str: string): string {
		return Buffer.from(str).toString('base64');
	}
}
