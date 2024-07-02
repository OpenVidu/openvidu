import { Injectable } from '@angular/core';
import { OpenViduComponentsConfig } from '../../config/openvidu-components-angular.config';

@Injectable()
export class OpenViduAngularConfigServiceMock {
	private configuration: OpenViduComponentsConfig;

	constructor() {
		this.configuration = { production: false };
	}

	getConfig(): OpenViduComponentsConfig {
		return this.configuration;
	}
	isProduction(): boolean {
		return this.configuration?.production;
	}
}
