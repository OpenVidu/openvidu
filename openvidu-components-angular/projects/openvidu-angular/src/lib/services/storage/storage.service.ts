import { Injectable } from '@angular/core';
import { ILogger } from '../../models/logger.model';
import { LoggerService } from '../logger/logger.service';

@Injectable({
	providedIn: 'root'
})
export class StorageService {
	public storage = window.localStorage;
	public log: ILogger;

	constructor(private loggerSrv: LoggerService) {
		this.log = this.loggerSrv.get('StorageService');
	}

	public set(key: string, item: any) {
		const value = JSON.stringify({ item: item });
		// this.log.d('Storing on localStorage "' + key + '" with value "' + value + '"');
		this.storage.setItem(key, value);
	}
	public get(key: string): any {
		const value = JSON.parse(this.storage.getItem(key));
		return value?.item ? value.item : null;
	}
	public clear() {
		this.log.d('Clearing localStorage');
		this.storage.clear();
	}
}
