import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionService } from '../../services/action/action.service';
import { ActionServiceMock } from '../../services/action/action.service.mock';
import { ChatService } from '../../services/chat/chat.service';
import { ChatServiceMock } from '../../services/chat/chat.service.mock';
import { DeviceService } from '../../services/device/device.service';
import { DeviceServiceMock } from '../../services/device/device.service.mock';
import { DocumentService } from '../../services/document/document.service';
import { DocumentServiceMock } from '../../services/document/document.service.mock';
import { LocalUserService } from '../../services/local-user/local-user.service';
import { LocalUserServiceMock } from '../../services/local-user/local-user.service.mock';

import { LoggerService } from '../../services/logger/logger.service';
import { LoggerServiceMock } from '../../services/logger/logger.service.mock';

import { WebrtcService } from '../../services/webrtc/webrtc.service';
import { WebrtcServiceMock } from '../../services/webrtc/webrtc.service.mock';

import { ToolbarComponent } from './toolbar.component';

describe('ToolbarComponent', () => {
  let component: ToolbarComponent;
  let fixture: ComponentFixture<ToolbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ToolbarComponent ],
      providers: [
				{ provide: ActionService, useClass: ActionServiceMock },
				{ provide: ChatService, useClass: ChatServiceMock },
				{ provide: LocalUserService, useClass: LocalUserServiceMock },
				{ provide: DocumentService, useClass: DocumentServiceMock },
        { provide: LoggerService, useClass: LoggerServiceMock },
        { provide: DeviceService, useClass: DeviceServiceMock },
        { provide: WebrtcService, useClass: WebrtcServiceMock }

			]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
