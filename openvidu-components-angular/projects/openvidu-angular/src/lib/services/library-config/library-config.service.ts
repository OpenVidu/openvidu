import { Inject, Injectable } from '@angular/core';
import { LibConfig } from '../../config/lib.config';

// import { version } from '../../../../package.json';

@Injectable()
export class LibraryConfigService {
	private configuration: LibConfig;

	constructor(@Inject('LIB_CONFIG') config: LibConfig) {
		this.configuration = config;
		console.log(this.configuration);
		this.isUsingProLibrary() ? console.log('Using PRO library') : console.log('Using CE library');
		if(this.isProduction()) console.log('Production Mode');
		// console.log(version)
	}

	getConfig(): LibConfig {
		return this.configuration;
	}
	isProduction(): boolean {
		return this.configuration?.environment?.production;
	}

	isUsingProLibrary(): boolean {
		return !!this.configuration?.environment?.useProdLibrary;
	}
}
