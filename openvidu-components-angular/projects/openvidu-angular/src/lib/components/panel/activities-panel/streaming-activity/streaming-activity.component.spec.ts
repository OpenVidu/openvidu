import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StreamingActivityComponent } from './streaming-activity.component';

describe('StreamingActivityComponent', () => {
  let component: StreamingActivityComponent;
  let fixture: ComponentFixture<StreamingActivityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StreamingActivityComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StreamingActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
