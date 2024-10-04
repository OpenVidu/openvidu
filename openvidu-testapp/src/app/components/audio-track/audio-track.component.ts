import { Component } from '@angular/core';
import { LocalTrack } from 'livekit-client';
import { TrackComponent } from '../track/track.component';

@Component({
  selector: 'app-audio-track',
  templateUrl: './audio-track.component.html',
  styleUrls: ['./audio-track.component.css'],
})
export class AudioTrackComponent extends TrackComponent {
  muteAudioIcon: string = 'mic';

  async muteUnmuteAudio() {
    if (this._track?.isMuted) {
      this.muteAudioIcon = 'mic';
      await (this._track as LocalTrack).unmute();
    } else {
      this.muteAudioIcon = 'mic_off';
      await (this._track as LocalTrack).mute();
    }
  }
}
