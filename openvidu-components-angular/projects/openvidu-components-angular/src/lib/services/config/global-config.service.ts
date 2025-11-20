
import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ParticipantFactoryFunction, OpenViduComponentsConfig } from '../../config/openvidu-components-angular.config';

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class GlobalConfigService {
	private configuration: OpenViduComponentsConfig;

	constructor(
		@Inject('OPENVIDU_COMPONENTS_CONFIG') config: OpenViduComponentsConfig,
		@Inject(DOCUMENT) private document: Document
	) {
		this.configuration = config;
		if (this.isProduction()) console.log('OpenVidu Angular Production Mode');
	}

	/**
	 * Retrieves the base href of the application.
	 *
	 * @returns The base href of the application as a string.
	 */
	getBaseHref(): string {
		const base = this.document.getElementsByTagName('base');
		if (!base || base.length === 0) {
			return '/';
		}

		const baseHref = base[0].href;
		if (baseHref) {
			return baseHref;
		}
		return '/';
	}

	hasParticipantFactory(): boolean {
		return typeof this.getConfig().participantFactory === 'function';
	}

	getParticipantFactory(): ParticipantFactoryFunction {
		return this.getConfig().participantFactory;
	}

	getConfig(): OpenViduComponentsConfig {
		return this.configuration;
	}
	isProduction(): boolean {
		return this.configuration?.production || false;
	}
}
