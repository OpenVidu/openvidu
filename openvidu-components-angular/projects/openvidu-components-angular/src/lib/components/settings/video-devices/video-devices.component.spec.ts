import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoDevicesComponent } from './video-devices.component';

describe('VideoDevicesComponent', () => {
  let component: VideoDevicesComponent;
  let fixture: ComponentFixture<VideoDevicesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VideoDevicesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VideoDevicesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
