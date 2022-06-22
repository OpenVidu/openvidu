import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, lastValueFrom } from 'rxjs';
import { throwError as observableThrowError } from 'rxjs/internal/observable/throwError';
import { RecordingInfo } from 'openvidu-angular';

@Injectable({
	providedIn: 'root'
})
export class RestService {
	private baseHref: string;

	constructor(private http: HttpClient) {
		this.baseHref = '/' + (!!window.location.pathname.split('/')[1] ? window.location.pathname.split('/')[1] + '/' : '');
	}
	async getToken(sessionId: string, openviduServerUrl?: string, openviduSecret?: string): Promise<string> {
		if (!!openviduServerUrl && !!openviduSecret) {
			const _sessionId = await this.createSession(sessionId, openviduServerUrl, openviduSecret);
			return await this.createToken(_sessionId, openviduServerUrl, openviduSecret);
		}
	}
	async getTokensFromBackend(sessionId: string): Promise<{ cameraToken: string; screenToken: string; recordings?: RecordingInfo[] }> {
		try {
			return lastValueFrom(this.http.post<any>(this.baseHref + 'sessions', { sessionId }));
		} catch (error) {
			if (error.status === 404) {
				throw { status: error.status, message: 'Cannot connect with backend. ' + error.url + ' not found' };
			}
			throw error;
		}
	}

	async startRecording(sessionId: string) {
		try {
			return lastValueFrom(this.http.post<any>(this.baseHref + 'recordings/start', { sessionId }));
		} catch (error) {
			if (error.status === 404) {
				throw { status: error.status, message: 'Cannot connect with backend. ' + error.url + ' not found' };
			}
			throw error;
		}
	}

	async stopRecording(sessionId: string) {
		try {
			return lastValueFrom(this.http.post<any>(this.baseHref + 'recordings/stop', { sessionId }));
		} catch (error) {
			if (error.status === 404) {
				throw { status: error.status, message: 'Cannot connect with backend. ' + error.url + ' not found' };
			}
			throw error;
		}
	}

	async login(password: string): Promise<any[]> {
		try {
			return lastValueFrom(
				this.http.post<any>(`${this.baseHref}admin/login`, {
					password
				})
			);
		} catch (error) {
			console.log(error);
			if (error.status === 404) {
				throw { status: error.status, message: 'Cannot connect with backend. ' + error.url + ' not found' };
			}
			throw error;
		}
	}

	async logout(): Promise<void> {
		try {
			return lastValueFrom(
				this.http.post<any>(`${this.baseHref}admin/logout`, {})
			);
		} catch (error) {
			console.log(error);
			if (error.status === 404) {
				throw { status: error.status, message: 'Cannot connect with backend. ' + error.url + ' not found' };
			}
			throw error;
		}
	}


	async deleteRecording(id: string): Promise<any[]> {
		try {
			return lastValueFrom(this.http.delete<any>(`${this.baseHref}recordings/delete/${id}`));
		} catch (error) {
			console.log(error);
			if (error.status === 404) {
				throw { status: error.status, message: 'Cannot connect with backend. ' + error.url + ' not found' };
			}
			throw error;
		}
	}

	getRecordings(): Promise<any[]> {
		return lastValueFrom(
			this.http.get<any>(`${this.baseHref}recordings`)
		);
	}

	getRecording(recordingId: string) {
		try {
			return lastValueFrom(
				this.http.get(`${this.baseHref}recordings/${recordingId}`, {
					responseType: 'blob'
				})
			);
		} catch (error) {
			if (error.status === 404) {
				throw { status: error.status, message: 'Cannot connect with backend. ' + error.url + ' not found' };
			}
			throw error;
		}
	}

	getRecording2(recordingId: string) {
		try {
			return lastValueFrom(
				this.http.get(`${this.baseHref}recordings/${recordingId}`,{
					responseType: 'blob'
				})
			);
		} catch (error) {
			if (error.status === 404) {
				throw { status: error.status, message: 'Cannot connect with backend. ' + error.url + ' not found' };
			}
			throw error;
		}
	}

	/**
	 *
	 * * WARNING: This is why this tutorial is an insecure application.
	 * * We need to ask OpenVidu Server for a user token in order to connect to our session.
	 * * This process should entirely take place in our server-side
	 */
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
					console.warn(response);

					resolve(response.token);
				});
		});
	}
}
