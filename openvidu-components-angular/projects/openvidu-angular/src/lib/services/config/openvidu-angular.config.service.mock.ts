import { Injectable } from '@angular/core';
import { OpenViduAngularConfig } from '../../config/openvidu-angular.config';

@Injectable()
export class OpenViduAngularConfigServiceMock {

  private configuration: OpenViduAngularConfig;

	constructor() {
    	this.configuration = {production: false};
	}

	getConfig(): OpenViduAngularConfig {
		return this.configuration;
	}
	isProduction(): boolean {
		return this.configuration?.production;
	}
}
