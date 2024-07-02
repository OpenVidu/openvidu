import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BackgroundEffectsPanelComponent } from './background-effects-panel.component';

describe('BackgroundEffectsPanelComponent', () => {
  let component: BackgroundEffectsPanelComponent;
  let fixture: ComponentFixture<BackgroundEffectsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BackgroundEffectsPanelComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BackgroundEffectsPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
