import { Component } from '@angular/core';
import { NgClass } from '@angular/common';
import { LocalTrack } from 'livekit-client';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TrackComponent } from '../track/track.component';

@Component({
    selector: 'app-audio-track',
    templateUrl: './audio-track.component.html',
    styleUrl: './audio-track.component.css',
    imports: [NgClass, MatIconModule, MatTooltipModule],
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
