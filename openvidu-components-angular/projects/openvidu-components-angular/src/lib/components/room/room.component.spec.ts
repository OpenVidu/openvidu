import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionService } from '../../services/action/action.service';
import { ActionServiceMock } from '../../services/action/action.service.mock';

import { ChatService } from '../../services/chat/chat.service';
import { ChatServiceMock } from '../../services/chat/chat.service.mock';

import { LoggerService } from '../../services/logger/logger.service';
import { LoggerServiceMock } from '../../services/logger/logger.service.mock';
import { PlatformService } from '../../services/platform/platform.service';
import { PlatformServiceMock } from '../../services/platform/platform.service.mock';
import { TokenService } from '../../services/token/token.service';
import { TokenServiceMock } from '../../services/token/token.service.mock';
import { WebrtcService } from '../../services/webrtc/webrtc.service';
import { WebrtcServiceMock } from '../../services/webrtc/webrtc.service.mock';
import { ParticipantService } from '../../services/participant/participant.service';
import { ParticipantServiceMock } from '../../services/participant/participant.service.mock';

import { RoomComponent } from './room.component';

describe('RoomComponent', () => {
  let component: RoomComponent;
  let fixture: ComponentFixture<RoomComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RoomComponent ],
      providers: [
      { provide: LoggerService, useClass: LoggerServiceMock },
				{ provide: ActionService, useClass: ActionServiceMock },
				{ provide: ParticipantService, useClass: ParticipantServiceMock },
				{ provide: WebrtcService, useClass: WebrtcServiceMock },
				{ provide: ChatService, useClass: ChatServiceMock },
        { provide: PlatformService, useClass: PlatformServiceMock },
        { provide: TokenService, useClass: TokenServiceMock }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RoomComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
