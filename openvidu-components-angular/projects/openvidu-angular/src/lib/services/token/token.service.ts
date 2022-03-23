import { Injectable } from '@angular/core';

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class TokenService {
	private webcamToken = '';
	private screenToken = '';

	constructor() {}

	setWebcamToken(token: string) {
		this.webcamToken = token;
	}

	setScreenToken(token: string) {
		this.screenToken = token;
	}

	getWebcamToken(): string {
		return this.webcamToken;
	}

	getScreenToken(): string {
		return this.screenToken;
	}
}
