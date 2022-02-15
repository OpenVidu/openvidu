import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParticipantPanelItemComponent } from './participant-panel-item.component';

describe('ParticipantPanelItemComponent', () => {
  let component: ParticipantPanelItemComponent;
  let fixture: ComponentFixture<ParticipantPanelItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ParticipantPanelItemComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ParticipantPanelItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
