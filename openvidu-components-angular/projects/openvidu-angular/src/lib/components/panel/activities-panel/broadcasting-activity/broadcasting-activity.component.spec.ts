import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BroadcastingActivityComponent } from './broadcasting-activity.component';

describe('BroadcastingActivityComponent', () => {
  let component: BroadcastingActivityComponent;
  let fixture: ComponentFixture<BroadcastingActivityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BroadcastingActivityComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BroadcastingActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
