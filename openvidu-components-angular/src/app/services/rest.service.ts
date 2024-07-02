import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RecordingDeleteRequestedEvent, RecordingInfo, RecordingStopRequestedEvent } from 'openvidu-components-angular';
import { catchError, lastValueFrom } from 'rxjs';

@Injectable({
	providedIn: 'root'
})
export class RestService {
	private baseHref: string;
	private headers: HttpHeaders;
	private USER = 'admin';
	private PASSWORD = 'admin';

	constructor(private http: HttpClient) {
		this.baseHref = '/' + (!!window.location.pathname.split('/')[1] ? window.location.pathname.split('/')[1] + '/' : '');
		this.headers = new HttpHeaders({
			'Content-Type': 'application/json',
			Authorization: 'Basic ' + btoa(this.USER + ':' + this.PASSWORD)
		});
	}

	async getTokenFromBackend(roomName: string, participantName: string): Promise<{ token: string }> {
		try {
			const body = { roomName, participantName };
			const options = { headers: this.headers };
			return lastValueFrom(this.http.post<any>(this.baseHref + 'call/api/rooms', body, options));
		} catch (error) {
			if (error.status === 404) {
				throw { status: error.status, message: 'Cannot connect with backend. ' + error.url + ' not found' };
			}
			throw error;
		}
	}

	async startRecording(roomName: string) {
		try {
			const body = { roomName };
			const options = { headers: this.headers };

			return lastValueFrom(this.http.post<any>(this.baseHref + 'call/api/recordings', body, options));
		} catch (error) {
			if (error.status === 404) {
				throw { status: error.status, message: 'Cannot connect with backend. ' + error.url + ' not found' };
			}
			throw error;
		}
	}

	async startBroadcasting(broadcastUrl: string) {
		try {
			const body = { broadcastUrl };
			const options = { headers: this.headers };
			return lastValueFrom(this.http.post<any>(this.baseHref + 'api/broadcasts/start', body, options));
		} catch (error) {
			if (error.status === 404) {
				throw { status: error.status, message: 'Cannot connect with backend. ' + error.url + ' not found' };
			}
			throw error.error;
		}
	}

	async stopRecording(event: RecordingStopRequestedEvent) {
		try {
			const options = { headers: this.headers };
			const url = `${this.baseHref}call/api/recordings/${event.recordingId}`;
			return lastValueFrom(this.http.put<any>(url, {}, options));
		} catch (error) {
			if (error.status === 404) {
				throw { status: error.status, message: 'Cannot connect with backend. ' + error.url + ' not found' };
			}
			throw error;
		}
	}

	async deleteRecording(recordingInfo: RecordingDeleteRequestedEvent): Promise<any[]> {
		try {
			const options = { headers: this.headers };

			return lastValueFrom(this.http.delete<any>(`${this.baseHref}call/api/recordings/${recordingInfo.recordingId}`, options));
		} catch (error) {
			console.log(error);
			if (error.status === 404) {
				throw { status: error.status, message: 'Cannot connect with backend. ' + error.url + ' not found' };
			}
			throw error;
		}
	}

	async deleteRecordingByAdmin(recordingId: string): Promise<any[]> {
		try {
			const options = { headers: this.headers };

			return lastValueFrom(this.http.delete<any>(`${this.baseHref}call/api/admin/recordings/${recordingId}`, options));
		} catch (error) {
			console.log(error);
			if (error.status === 404) {
				throw { status: error.status, message: 'Cannot connect with backend. ' + error.url + ' not found' };
			}
			throw error;
		}
	}

	async stopBroadcasting() {
		try {
			return lastValueFrom(this.http.delete<any>(`${this.baseHref}api/broadcasts/stop`));
		} catch (error) {
			if (error.status === 404) {
				throw { status: error.status, message: 'Cannot connect with backend. ' + error.url + ' not found' };
			}
			throw error;
		}
	}

	async login(credentials: { username: string; password: string }): Promise<any[]> {
		try {
			const options = { headers: this.headers };

			return lastValueFrom(this.http.post<any>(`${this.baseHref}call/api/admin/login`, credentials, options));
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
			return lastValueFrom(this.http.post<any>(`${this.baseHref}api/auth/admin/logout`, {}));
		} catch (error) {
			console.log(error);
			if (error.status === 404) {
				throw { status: error.status, message: 'Cannot connect with backend. ' + error.url + ' not found' };
			}
			throw error;
		}
	}

	getRecordings(continuationToken?: string): Promise<{ recordings: RecordingInfo[]; continuationToken: string }> {
		const options = { headers: this.headers };
		let path = `${this.baseHref}call/api/admin/recordings`;
		if (continuationToken) {
			path += `?continuationToken=${continuationToken}`;
		}
		return lastValueFrom(this.http.get<any>(path, options));
	}

	// getRecording(recordingId: string) {
	// 	try {
	// 		return lastValueFrom(
	// 			this.http.get(`${this.baseHref}api/recordings/${recordingId}`, {
	// 				responseType: 'blob'
	// 			})
	// 		);
	// 	} catch (error) {
	// 		if (error.status === 404) {
	// 			throw { status: error.status, message: 'Cannot connect with backend. ' + error.url + ' not found' };
	// 		}
	// 		throw error;
	// 	}
	// }
}
