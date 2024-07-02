import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CaptionsComponent } from './captions.component';

describe('CaptionsComponent', () => {
  let component: CaptionsComponent;
  let fixture: ComponentFixture<CaptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CaptionsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CaptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
