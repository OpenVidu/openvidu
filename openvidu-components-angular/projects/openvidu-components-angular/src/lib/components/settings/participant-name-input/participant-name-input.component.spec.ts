import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParticipantNameInputComponent } from './participant-name-input.component';

describe('ParticipantNameInputComponent', () => {
  let component: ParticipantNameInputComponent;
  let fixture: ComponentFixture<ParticipantNameInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ParticipantNameInputComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ParticipantNameInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
