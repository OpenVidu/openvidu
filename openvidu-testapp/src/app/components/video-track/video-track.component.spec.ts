import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoTrackComponent } from './video-track.component';

describe('VideoTrackComponent', () => {
  let component: VideoTrackComponent;
  let fixture: ComponentFixture<VideoTrackComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [VideoTrackComponent]
    });
    fixture = TestBed.createComponent(VideoTrackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
