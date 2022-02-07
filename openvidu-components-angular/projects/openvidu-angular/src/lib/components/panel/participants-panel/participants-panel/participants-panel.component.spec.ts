import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParticipantsPanelComponent } from './participants-panel.component';

describe('ParticipantsPanelComponent', () => {
  let component: ParticipantsPanelComponent;
  let fixture: ComponentFixture<ParticipantsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ParticipantsPanelComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ParticipantsPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
