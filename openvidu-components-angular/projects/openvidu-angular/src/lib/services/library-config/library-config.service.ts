import { Inject, Injectable } from '@angular/core';
import { LibConfig, ParticipantFactoryFunction } from '../../config/lib.config';

// import { version } from '../../../../package.json';

@Injectable()
export class LibraryConfigService {
	private configuration: LibConfig;

	constructor(@Inject('LIB_CONFIG') config: LibConfig) {
		this.configuration = config;
		console.log(this.configuration);
		if(this.isProduction()) console.log('OpenVidu Angular Production Mode');
		// console.log(version)
	}

	getConfig(): LibConfig {
		return this.configuration;
	}
	isProduction(): boolean {
		return this.configuration?.production;
	}

	hasParticipantFactory(): boolean {
		return typeof this.getConfig().participantFactory === "function";
	}

	getParticipantFactory(): ParticipantFactoryFunction {
		return this.getConfig().participantFactory;
	}
}
