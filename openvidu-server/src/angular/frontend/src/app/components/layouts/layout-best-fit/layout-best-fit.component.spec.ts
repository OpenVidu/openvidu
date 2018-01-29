import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LayoutBestFitComponent } from './layout-best-fit.component';

describe('SessionDetailsComponent', () => {
  let component: LayoutBestFitComponent;
  let fixture: ComponentFixture<LayoutBestFitComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LayoutBestFitComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LayoutBestFitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
