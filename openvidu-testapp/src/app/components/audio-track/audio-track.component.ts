import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { LocalTrack, AudioTrack, AudioCaptureOptions } from 'livekit-client';
import { TrackComponent } from '../track/track.component';

@Component({
  selector: 'app-audio-track',
  templateUrl: './audio-track.component.html',
  styleUrls: ['./audio-track.component.css']
})
export class AudioTrackComponent extends TrackComponent {

  @ViewChild('audioElement') elementRef: ElementRef;
  elementRefId: string = '';

  muteAudioIcon: string = 'mic';

  private _audioTrack: AudioTrack | undefined;

  private audioCaptureOptions: AudioCaptureOptions;

  @Input() set audioTrack(audioTrack: AudioTrack | undefined) {
    this._audioTrack = audioTrack;
    this.track = this._audioTrack;

    this.setupTrackEventListeners();

    let id = '';
    id = `${this.getTrackOrigin()}--audio--${this._audioTrack?.source}--${this._audioTrack?.sid}`;
    if (this._audioTrack?.sid !== this._audioTrack?.mediaStreamID) {
      id += `--${this._audioTrack?.mediaStreamID}`;
    }
    id = id.replace(/[^0-9a-z-A-Z_-]+/g, '');
    this.elementRefId = id;

    if (this.elementRef && !this.localParticipant) {
      this._audioTrack?.attach(this.elementRef.nativeElement);
    }
  }

  ngAfterViewInit() {
    if (!this.localParticipant) {
      this._audioTrack?.attach(this.elementRef.nativeElement);
    }
  }

  ngOnDestroy() {
    this._audioTrack?.detach(this.elementRef.nativeElement);
  }

  async muteUnmuteAudio() {
    if (this._audioTrack?.isMuted) {
      this.muteAudioIcon = 'mic';
      await (this._audioTrack as LocalTrack).unmute();
    } else {
      this.muteAudioIcon = 'mic_off';
      await (this._audioTrack as LocalTrack).mute();
    }
  }

}
