import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Room } from 'livekit-client';

import { ParticipantComponent } from './participant.component';

describe('ParticipantComponent', () => {
  let component: ParticipantComponent;
  let fixture: ComponentFixture<ParticipantComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ParticipantComponent]
    });
    fixture = TestBed.createComponent(ParticipantComponent);
    component = fixture.componentInstance;
    const room = new Room();
    fixture.componentRef.setInput('room', room);
    fixture.componentRef.setInput('participant', room.localParticipant);
    fixture.componentRef.setInput('index', 0);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
