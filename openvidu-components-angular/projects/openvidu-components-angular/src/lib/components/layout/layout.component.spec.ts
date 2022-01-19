import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RemoteUserService, LocalUserService } from '../../../public-api';
import { ChatService } from '../../services/chat/chat.service';
import { ChatServiceMock } from '../../services/chat/chat.service.mock';
import { LayoutService } from '../../services/layout/layout.service';
import { LocalUserServiceMock } from '../../services/local-user/local-user.service.mock';
import { RemoteUserServiceMock } from '../../services/remote-user/remote-user.service.mock';

import { LayoutComponent } from './layout.component';

describe('LayoutComponent', () => {
  let component: LayoutComponent;
  let fixture: ComponentFixture<LayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LayoutComponent ],
      providers: [
          { provide: RemoteUserService, useClass: RemoteUserServiceMock },
          { provide: LocalUserService, useClass: LocalUserServiceMock },
          { provide: ChatService, useClass: ChatServiceMock },
          { provide: LayoutService, useClass: LayoutService }
        ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
