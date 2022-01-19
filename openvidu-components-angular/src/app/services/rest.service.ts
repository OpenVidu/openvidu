import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, lastValueFrom } from 'rxjs';
import { throwError as observableThrowError } from 'rxjs/internal/observable/throwError';

@Injectable({
	providedIn: 'root'
})
export class RestService {
	private baseHref: string;

	constructor(private http: HttpClient) {
		this.baseHref = '/' + (!!window.location.pathname.split('/')[1] ? window.location.pathname.split('/')[1] + '/' : '');
	}
	async getToken(sessionId: string, openviduServerUrl?: string, openviduSecret?: string): Promise<string> {
		// if (!!openviduServerUrl && !!openviduSecret) {
		// 	const _sessionId = await this.createSession(sessionId, openviduServerUrl, openviduSecret);
		// 	return await this.createToken(_sessionId, openviduServerUrl, openviduSecret);
		// }
		try {
			return lastValueFrom(this.http.post<any>(this.baseHref + 'call', { sessionId }));
		} catch (error) {
			if (error.status === 404) {
				throw { status: error.status, message: 'Cannot connect with backend. ' + error.url + ' not found' };
			}
			throw error;
		}
	}

	private createSession(sessionId: string, openviduServerUrl: string, openviduSecret: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const body = JSON.stringify({ customSessionId: sessionId });
			const options = {
				headers: new HttpHeaders({
					Authorization: 'Basic ' + btoa('OPENVIDUAPP:' + openviduSecret),
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
						return observableThrowError(error);
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
					Authorization: 'Basic ' + btoa('OPENVIDUAPP:' + openviduSecret),
					'Content-Type': 'application/json'
				})
			};
			return this.http
				.post<any>(openviduServerUrl + '/openvidu/api/sessions/' + sessionId + '/connection', body, options)
				.pipe(
					catchError((error) => {
						reject(error);
						return observableThrowError(error);
					})
				)
				.subscribe((response) => {
					resolve(response.token);
				});
		});
	}
}
