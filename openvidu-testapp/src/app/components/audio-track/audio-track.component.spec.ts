import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AudioTrackComponent } from './audio-track.component';

describe('AudioTrackComponent', () => {
  let component: AudioTrackComponent;
  let fixture: ComponentFixture<AudioTrackComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AudioTrackComponent]
    });
    fixture = TestBed.createComponent(AudioTrackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
