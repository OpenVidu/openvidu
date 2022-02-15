import { Inject, Injectable } from '@angular/core';
import { OpenViduAngularConfig, ParticipantFactoryFunction } from '../../config/openvidu-angular.config';

// import { version } from '../../../../package.json';

@Injectable()
export class OpenViduAngularConfigService {
	private configuration: OpenViduAngularConfig;

	constructor(@Inject('OPENVIDU_ANGULAR_CONFIG') config: OpenViduAngularConfig) {
		this.configuration = config;
		console.log(this.configuration);
		if(this.isProduction()) console.log('OpenVidu Angular Production Mode');
		// console.log(version)
	}

	getConfig(): OpenViduAngularConfig {
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
