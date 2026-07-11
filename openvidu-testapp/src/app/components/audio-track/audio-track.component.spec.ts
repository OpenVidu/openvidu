import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrackPublication } from 'livekit-client';

import { AudioTrackComponent } from './audio-track.component';

describe('AudioTrackComponent', () => {
  let component: AudioTrackComponent;
  let fixture: ComponentFixture<AudioTrackComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AudioTrackComponent]
    });
    fixture = TestBed.createComponent(AudioTrackComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('trackPublication', {
      source: 'microphone',
    } as unknown as TrackPublication);
    fixture.componentRef.setInput('index', 0);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
