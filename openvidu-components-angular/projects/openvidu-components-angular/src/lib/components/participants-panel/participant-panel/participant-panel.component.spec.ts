import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParticipantPanelComponent } from './participant-panel.component';

describe('ParticipantPanelComponent', () => {
  let component: ParticipantPanelComponent;
  let fixture: ComponentFixture<ParticipantPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ParticipantPanelComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ParticipantPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
