import { TestBed } from '@angular/core/testing';
import { LoggerService } from '../logger/logger.service';
import { LoggerServiceMock } from '../logger/logger.service.mock';

import { LocalUserService } from '../local-user/local-user.service';
import { LocalUserServiceMock } from '../local-user/local-user.service.mock';
import { OpenViduService } from './openvidu.service';
import { PlatformService } from '../platform/platform.service';
import { PlatformServiceMock } from '../platform/platform.service.mock';
import { LibraryConfigService } from '../library-config/library-config.service';
import { LibraryConfigServiceMock } from '../library-config/library-config.service.mock';


describe('OpenViduService', () => {
	let service: OpenViduService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				{ provide: LoggerService, useClass: LoggerServiceMock },
				{ provide: LocalUserService, useClass: LocalUserServiceMock },
				{ provide: PlatformService, useClass: PlatformServiceMock },
				{ provide: LibraryConfigService, useClass: LibraryConfigServiceMock }
			]
		});
		service = TestBed.inject(OpenViduService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
