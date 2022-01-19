import { Injectable } from '@angular/core';

@Injectable()
export class TokenServiceMock {

	constructor() {}

	setWebcamToken(token: string) {}

	setScreenToken(token: string) {}

	getWebcamToken(): string {
		return '';
	}

	getScreenToken(): string {
		return '';
	}
}
