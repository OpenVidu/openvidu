import { Injectable, Inject, Injector, Type, Optional } from '@angular/core';
import { LayoutService } from '../layout/layout.service';
import { OpenViduComponentsConfig } from '../../config/openvidu-components-angular.config';

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class ServiceConfigService {
	private configuration: OpenViduComponentsConfig;

	constructor(
		@Optional() private injector: Injector,
		@Inject('OPENVIDU_COMPONENTS_CONFIG') config: OpenViduComponentsConfig
	) {
		this.configuration = config;
	}

	getLayoutService(): LayoutService {
		return this.getServiceSafely<LayoutService>('LayoutService', LayoutService);
	}

	private getService<T>(key: string): T {
		const service = this.configuration.services ? this.configuration.services[key] : null;
		if (!service) {
			throw new Error(`No service registered with key ${key}`);
		}
		return this.injector.get(service) as T;
	}

	private getServiceSafely<T>(key: string, fallback: new (...args: any[]) => T): T {
		try {
			return this.getService<T>(key);
		} catch {
			return this.injector.get(fallback);
		}
	}
}
