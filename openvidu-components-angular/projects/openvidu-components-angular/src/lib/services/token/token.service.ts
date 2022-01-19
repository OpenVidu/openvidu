import { Injectable } from '@angular/core';
import { ILogger } from '../../models/logger.model';
import { LoggerService } from '../logger/logger.service';

@Injectable({
	providedIn: 'root'
})
export class TokenService {
	private webcamToken = '';
	private screenToken = '';
	private sessionId = '';
	private log: ILogger;

	constructor(private loggerSrv: LoggerService) {
		this.log = this.loggerSrv.get('TokenService');
	}


	setWebcamToken(token: string){
		this.webcamToken = token;
	}

	setScreenToken(token: string){
		this.screenToken = token;
	}

	getWebcamToken(): string {
		return this.webcamToken;
	}

	getScreenToken(): string {
		return this.screenToken;
	}
}
