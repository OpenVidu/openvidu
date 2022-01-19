import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParticipantTestComponent } from './participant-test.component';

describe('ParticipantTestComponent', () => {
  let component: ParticipantTestComponent;
  let fixture: ComponentFixture<ParticipantTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ParticipantTestComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ParticipantTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
