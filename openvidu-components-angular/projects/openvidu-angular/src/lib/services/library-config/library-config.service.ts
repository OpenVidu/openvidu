import { Inject, Injectable } from '@angular/core';
import { LibConfig } from '../../config/lib.config';

// import { version } from '../../../../package.json';

@Injectable()
export class LibraryConfigService {

	private configuration: LibConfig;

	constructor(@Inject('LIB_CONFIG') config: LibConfig) {
		this.configuration = config;
		console.log(this.configuration);
		if(this.isProduction()) console.log('Production Mode');
		// console.log(version)
	}

	getConfig(): LibConfig {
		return this.configuration;
	}
	isProduction(): boolean {
		return this.configuration?.environment?.production;
	}

	isCustomComponentDefined(component: string): boolean {
		return !!this.configuration?.environment?.customComponents && !!this.configuration.environment.customComponents[component];
	}

	getCustomComponent(component: string){
		return this.configuration.environment.customComponents[component];
	}
}
