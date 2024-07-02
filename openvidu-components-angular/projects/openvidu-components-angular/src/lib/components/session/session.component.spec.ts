import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionService } from '../../services/action/action.service';
import { ActionServiceMock } from '../../services/action/action.service.mock';

import { ChatService } from '../../services/chat/chat.service';
import { ChatServiceMock } from '../../services/chat/chat.service.mock';

import { LoggerService } from '../../services/logger/logger.service';
import { LoggerServiceMock } from '../../services/logger/logger.service.mock';
import { ParticipantService } from '../../services/participant/participant.service';
import { ParticipantServiceMock } from '../../services/participant/participant.service.mock';
import { PlatformService } from '../../services/platform/platform.service';
import { PlatformServiceMock } from '../../services/platform/platform.service.mock';

import { SessionComponent } from './session.component';

describe('SessionComponent', () => {
	let component: SessionComponent;
	let fixture: ComponentFixture<SessionComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [SessionComponent],
			providers: [
				{ provide: LoggerService, useClass: LoggerServiceMock },
				{ provide: ActionService, useClass: ActionServiceMock },
				{ provide: ParticipantService, useClass: ParticipantServiceMock },
				{ provide: ChatService, useClass: ChatServiceMock },
				{ provide: PlatformService, useClass: PlatformServiceMock }
			]
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(SessionComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
