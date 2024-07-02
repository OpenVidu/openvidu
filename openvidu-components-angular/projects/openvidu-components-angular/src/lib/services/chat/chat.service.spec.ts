import { TestBed } from '@angular/core/testing';
import { ActionService } from '../action/action.service';
import { ActionServiceMock } from '../action/action.service.mock';
import { LocalUserService } from '../local-user/local-user.service';
import { LocalUserServiceMock } from '../local-user/local-user.service.mock';
import { LoggerService } from '../logger/logger.service';
import { LoggerServiceMock } from '../logger/logger.service.mock';
import { WebrtcService } from '../webrtc/webrtc.service';
import { WebrtcServiceMock } from '../webrtc/webrtc.service.mock';

import { ChatService } from './chat.service';

describe('ChatService', () => {
	let service: ChatService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				{ provide: LoggerService, useClass: LoggerServiceMock },
				{ provide: WebrtcService, useClass: WebrtcServiceMock },
				{ provide: LocalUserService, useClass: LocalUserServiceMock },
				{ provide: ActionService, useClass: ActionServiceMock }
			]
		});
		service = TestBed.inject(ChatService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
