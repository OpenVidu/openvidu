import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivitiesPanelComponent } from './activities-panel.component';

describe('ActivitiesPanelComponent', () => {
  let component: ActivitiesPanelComponent;
  let fixture: ComponentFixture<ActivitiesPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ActivitiesPanelComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivitiesPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
