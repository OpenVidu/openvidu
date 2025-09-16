import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToolbarMediaButtonsComponent } from './toolbar-media-buttons.component';

describe('ToolbarMediaButtonsComponent', () => {
  let component: ToolbarMediaButtonsComponent;
  let fixture: ComponentFixture<ToolbarMediaButtonsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ToolbarMediaButtonsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ToolbarMediaButtonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
