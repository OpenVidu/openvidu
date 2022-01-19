import { Injectable } from '@angular/core';
import { LibConfig } from '../../config/lib.config';

@Injectable()
export class LibraryConfigServiceMock {

  private configuration: LibConfig;

	constructor() {
    	this.configuration = {environment: {production: false}};
	}

	getConfig(): LibConfig {
		return this.configuration;
	}
	isProduction(): boolean {
		return this.configuration?.environment?.production;
	}
}
