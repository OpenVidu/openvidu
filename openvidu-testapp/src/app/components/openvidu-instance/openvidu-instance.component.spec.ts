import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoomConf } from '../test-sessions/test-sessions.component';
import { OpenviduInstanceComponent } from './openvidu-instance.component';

describe('OpenviduInstanceComponent', () => {
  let component: OpenviduInstanceComponent;
  let fixture: ComponentFixture<OpenviduInstanceComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OpenviduInstanceComponent]
    });
    fixture = TestBed.createComponent(OpenviduInstanceComponent);
    component = fixture.componentInstance;
    const roomConf: RoomConf = {
      uid: 0,
      subscriber: true,
      publisher: true,
      startSession: false,
    };
    fixture.componentRef.setInput('roomConf', roomConf);
    fixture.componentRef.setInput('index', 0);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
