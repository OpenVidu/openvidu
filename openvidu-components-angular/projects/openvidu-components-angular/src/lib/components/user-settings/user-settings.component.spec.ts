import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionService } from '../../services/action/action.service';
import { ActionServiceMock } from '../../services/action/action.service.mock';
import { DeviceService } from '../../services/device/device.service';

import { DeviceServiceMock } from '../../services/device/device.service.mock';
import { LocalUserService } from '../../services/local-user/local-user.service';
import { LocalUserServiceMock } from '../../services/local-user/local-user.service.mock';
import { LoggerService } from '../../services/logger/logger.service';
import { LoggerServiceMock } from '../../services/logger/logger.service.mock';
import { StorageService } from '../../services/storage/storage.service';
import { WebrtcService } from '../../services/webrtc/webrtc.service';
import { StorageServiceMock } from '../../services/storage/storage.service.mock';

import { WebrtcServiceMock } from '../../services/webrtc/webrtc.service.mock';

import { UserSettingsComponent } from './user-settings.component';

describe('UserSettingsComponent', () => {
  let component: UserSettingsComponent;
  let fixture: ComponentFixture<UserSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UserSettingsComponent ],
      providers: [
        { provide: LoggerService, useClass: LoggerServiceMock },
          { provide: ActionService, useClass: ActionServiceMock },
          { provide: LocalUserService, useClass: LocalUserServiceMock },
          { provide: WebrtcService, useClass: WebrtcServiceMock },
          { provide: DeviceService, useClass: DeviceServiceMock },
          { provide: StorageService, useClass: StorageServiceMock }
        ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UserSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
