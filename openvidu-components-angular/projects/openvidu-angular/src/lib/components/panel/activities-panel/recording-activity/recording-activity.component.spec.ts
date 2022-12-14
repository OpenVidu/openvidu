import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecordingActivityComponent } from './recording-activity.component';

describe('RecordingActivityComponent', () => {
  let component: RecordingActivityComponent;
  let fixture: ComponentFixture<RecordingActivityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RecordingActivityComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RecordingActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
