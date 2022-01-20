import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoconferenceComponent } from './videoconference.component';

describe('VideoconferenceComponent', () => {
  let component: VideoconferenceComponent;
  let fixture: ComponentFixture<VideoconferenceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VideoconferenceComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VideoconferenceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
